// CONFIGURATION CONSTANTS
export const CONFIG = {
    FX: { PHP: 58.5, USD: 1, GBP: 0.79, EUR: 0.92 },
    SYMBOLS: { PHP: "₱", USD: "$", GBP: "£", EUR: "€" },
    defaultRate: {
        PHP: { grid: 12.25, lpgPrice: 950, lpgSize: 11, gas: 7.0, diesel: 60.0 },
        USD: { grid: 0.21, lpgPrice: 25, lpgSize: 9, gas: 0.05, diesel: 1.00 },
        GBP: { grid: 0.17, lpgPrice: 20, lpgSize: 13, gas: 0.07, diesel: 1.30 },
        EUR: { grid: 0.19, lpgPrice: 22, lpgSize: 11, gas: 0.11, diesel: 1.40 },
    },
    KWH_PER_KG_LPG: 13.8, 
    DIESEL_KWH_PER_LITER: 10.7,
    COP_STANDARD: 1, 
    SOLAR_PANEL_KW_RATED: 0.425, 
    SOLAR_PANEL_COST_USD: 200, 
    INVERTER_COST_PER_WATT_USD: 0.30,
    COOLING_COP: 2.6, 
    WATER_SPECIFIC_HEAT: 1.163, // Wh/L/°C
    // Tank logic constants for R290/R32
    R290_LOOP_DELTA_T: 7, 
    COIL_APPROACH_DELTA_T: 10
};

/**
 * Extracts numeric Liter value from strings like "Karnot iSTOR Stainless Steel Tank - 1000L"
 */
const extractTankLiters = (name) => {
    if (!name) return 0;
    const match = name.match(/(\d+)\s*L\b/i);
    return match ? parseInt(match[1], 10) : 0;
};

export function calculateHeatPump(inputs, dbProducts) {
    if (!dbProducts || dbProducts.length === 0) return { error: "No products loaded from inventory." };

    // --- 1. DEMAND & REQUIRED POWER CALCULATION ---
    let dailyLiters = 0;
    if (inputs.userType === 'home') dailyLiters = inputs.occupants * 50;
    else if (inputs.userType === 'restaurant') dailyLiters = inputs.mealsPerDay * 7;
    else if (inputs.userType === 'resort') dailyLiters = (inputs.roomsOccupied * 50) + (inputs.mealsPerDay * 7);
    else dailyLiters = inputs.dailyLitersInput;

    if (dailyLiters <= 0) return { error: "Please enter valid demand inputs (Liters/Day)." };

    const hoursPerDay = Math.max(1, inputs.hoursPerDay);
    const deltaT = inputs.targetTemp - inputs.inletTemp;
    
    if (deltaT <= 0) return { error: "Target Temp must be higher than Inlet Temp." };

    const dailyThermalEnergyKWH = (dailyLiters * deltaT * CONFIG.WATER_SPECIFIC_HEAT) / 1000;
    const requiredThermalPowerKW = dailyThermalEnergyKWH / hoursPerDay;

    // --- 2. BASELINE (OLD SYSTEM) COST ---
    let currentRateKWH = 0;
    if (inputs.heatingType === 'propane') {
        currentRateKWH = (inputs.fuelPrice / inputs.tankSize) / CONFIG.KWH_PER_KG_LPG;
    } else if (inputs.heatingType === 'diesel') {
        currentRateKWH = inputs.fuelPrice / CONFIG.DIESEL_KWH_PER_LITER;
    } else {
        currentRateKWH = inputs.fuelPrice; 
    }
    const annualCostOld = (dailyThermalEnergyKWH / CONFIG.COP_STANDARD) * 365 * currentRateKWH;

    // --- 3. FIND BEST HEAT PUMP & EXTRACT TANK DATA ---
    let availableModels = dbProducts
        .filter(p => {
            const nominalDHWPower = Number(p.kW_DHW_Nominal) || 0;
            const priceUSD = Number(p.salesPriceUSD) || 0;
            if (nominalDHWPower === 0 || priceUSD === 0) return false;
            
            if (inputs.heatPumpType !== 'all') {
                const productRef = (p.Refrigerant || '').toUpperCase();
                const requiredRef = inputs.heatPumpType.toUpperCase();
                if (requiredRef === 'R744') {
                     if (productRef !== 'R744' && productRef !== 'CO2') return false;
                } else if (productRef !== requiredRef) {
                    return false;
                }
            }
            if (inputs.includeCooling && !p.isReversible) return false;
            return true;
        })
        .filter(m => {
            const nominalDHWPower = Number(m.kW_DHW_Nominal) || 0;
            const maxTemp = Number(m.max_temp_c) || 60;
            if (inputs.targetTemp > maxTemp) return false;
            // Match based on makeup power
            return nominalDHWPower >= (requiredThermalPowerKW * 0.95); 
        })
        .sort((a, b) => Number(a.salesPriceUSD) - Number(b.salesPriceUSD));

    if (availableModels.length === 0) { 
        const refFilter = inputs.heatPumpType !== 'all' ? ` (Filtered by ${inputs.heatPumpType})` : '';
        return { error: `No suitable model found in inventory${refFilter}. Required heating capacity: ${requiredThermalPowerKW.toFixed(1)} kW.` }; 
    }
    
    const heatPumpSystem = availableModels[0];
    const isR290orR32 = ['R290', 'R32'].includes(heatPumpSystem.Refrigerant?.toUpperCase());
    const tankVolume = extractTankLiters(heatPumpSystem.name);

    // --- 4. TANK WARMUP & THERMODYNAMIC CALCS ---
    // Warmup time for the specific tank found in the title
    let warmupTime = 0;
    if (tankVolume > 0) {
        warmupTime = (tankVolume * deltaT * CONFIG.WATER_SPECIFIC_HEAT) / (Number(heatPumpSystem.kW_DHW_Nominal) * 1000);
    }

    // --- 5. FINANCIAL CALCULATIONS ---
    const fxRate = CONFIG.FX[inputs.currency] || 1;
    const symbol = CONFIG.SYMBOLS[inputs.currency];
    
    const heatPumpCOP = Number(heatPumpSystem.COP_DHW) || 3.5;
    const karnotDailyElecKwh = dailyThermalEnergyKWH / heatPumpCOP; 
    const karnotPowerDrawKw = karnotDailyElecKwh / hoursPerDay;

    const heatPumpCostConverted = Number(heatPumpSystem.salesPriceUSD) * fxRate;
    
    let karnotAnnualCost = 0, solarCost = 0, inverterCost = 0, karnotPanelCount = 0;

    if (inputs.systemType === 'grid-only') {
        karnotAnnualCost = karnotDailyElecKwh * 365 * inputs.elecRate;
    } else { 
        const sunHours = Number(inputs.sunHours) || 5.5;
        const solarPoweredHours = Math.min(hoursPerDay, sunHours);
        const gridPoweredHours = Math.max(0, hoursPerDay - solarPoweredHours);
        karnotAnnualCost = (karnotPowerDrawKw * gridPoweredHours) * 365 * inputs.elecRate;
        
        karnotPanelCount = Math.ceil(karnotPowerDrawKw / CONFIG.SOLAR_PANEL_KW_RATED);
        solarCost = karnotPanelCount * CONFIG.SOLAR_PANEL_COST_USD * fxRate;
        inverterCost = (karnotPanelCount * CONFIG.SOLAR_PANEL_KW_RATED * 1000 * CONFIG.INVERTER_COST_PER_WATT_USD) * fxRate;
    }

    let coolSavings = 0;
    if (inputs.includeCooling && heatPumpSystem.isReversible) {
        const nominalCoolingPower = Number(heatPumpSystem.kW_Cooling_Nominal) || heatPumpSystem.kW_DHW_Nominal * 1.2;
        const dailyCoolingKwh = nominalCoolingPower * hoursPerDay;
        coolSavings = dailyCoolingKwh * 365 * inputs.elecRate * CONFIG.COOLING_COP;
    }
    
    const totalCapex = heatPumpCostConverted + solarCost + inverterCost;
    const totalAnnualSavings = (annualCostOld - karnotAnnualCost) + coolSavings;
    const paybackYears = totalAnnualSavings > 0 && totalCapex > 0 ? (totalCapex / totalAnnualSavings).toFixed(1) : "N/A";

    return {
        system: { 
            n: heatPumpSystem.name,
            ref: heatPumpSystem.Refrigerant,
            tankSize: tankVolume
        },
        metrics: { 
            dailyLiters, 
            panelCount: karnotPanelCount,
            requiredThermalPowerKW: requiredThermalPowerKW.toFixed(1),
            selectedNominalPowerKW: heatPumpSystem.kW_DHW_Nominal,
            warmupTime: warmupTime.toFixed(1),
            loopDeltaT: isR290orR32 ? CONFIG.R290_LOOP_DELTA_T : deltaT,
            coilApproach: isR290orR32 ? CONFIG.COIL_APPROACH_DELTA_T : 0
        },
        financials: {
            symbol, annualCostOld, karnotAnnualCost, totalSavings: totalAnnualSavings, coolSavings,
            paybackYears,
            capex: { heatPump: heatPumpCostConverted, solar: solarCost, inverter: inverterCost, total: totalCapex }
        }
    };
}
