// src/utils/heatPumpLogic.js

// CONFIGURATION CONSTANTS (Standardized data from your original HTML)
export const CONFIG = {
    FX: { PHP: 58.5, USD: 1, GBP: 0.79, EUR: 0.92 },
    SYMBOLS: { PHP: "₱", USD: "$", GBP: "£", EUR: "€" },
    KWH_PER_KG_LPG: 13.8, 
    DIESEL_KWH_PER_LITER: 10.7,
    COP_STANDARD: 1,
    SOLAR_PANEL_KW_RATED: 0.425, 
    SOLAR_PANEL_COST_USD: 200, 
    INVERTER_COST_PER_WATT_USD: 0.30,
    COOLING_COP: 2.6,
    RATED_AMBIENT_C: 20, 
    RATED_LIFT_C: 40, // Assuming 40C rise (15C to 55C) is the test point
};

export function calculateHeatPump(inputs, dbProducts) {
    if (!dbProducts || dbProducts.length === 0) return { error: "No products loaded from inventory." };

    // --- 1. DEMAND & REQUIRED POWER CALCULATION ---
    let dailyLiters = 0;
    if (inputs.userType === 'home') dailyLiters = inputs.occupants * 50;
    else if (inputs.userType === 'restaurant') dailyLiters = inputs.mealsPerDay * 7;
    else if (inputs.userType === 'resort') dailyLiters = (inputs.roomsOccupied * 50) + (inputs.mealsPerDay * 7);
    else dailyLiters = inputs.dailyLitersInput;

    if (dailyLiters <= 0) return { error: "Please enter valid demand inputs." };

    const hoursPerDay = Math.max(1, inputs.hoursPerDay);
    const deltaT = inputs.targetTemp - inputs.inletTemp;
    
    if (deltaT <= 0) return { error: "Target Temp must be higher than Inlet Temp." };

    // Required Thermal Energy (Energy Out)
    const kwhPerLiter = (deltaT * 1.163) / 1000;
    const dailyThermalEnergyKWH = dailyLiters * kwhPerLiter;

    // Required Thermal Power (kW) based on DeltaT (Liters/Day * kwh/Liters / Hours/Day)
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

    // --- 3. FIND BEST HEAT PUMP (Using kW fields) ---
    
    // We adjust the nominal power based on the required temperature lift (deltaT) 
    // to find the minimum *Nominal Rated kW* capacity needed to meet the demand.
    const ratedDeltaT = CONFIG.RATED_LIFT_C; // 40C test lift
    const powerAdjustmentFactor = deltaT / ratedDeltaT; 
    
    // The target nominal power is the required power scaled by the required lift ratio.
    // We target a nominal machine kW that is roughly equal to or greater than the demand kW,
    // assuming the machine's performance holds up across temp ranges.
    const targetNominalPowerKW = requiredThermalPowerKW * powerAdjustmentFactor;

    // Filter, Adjust, and Select
    let availableModels = dbProducts
        // 1. Filter out non-heating accessories (kW_DHW_Nominal must be > 0) and filter by Type
        .filter(p => {
            const nominalDHWPower = Number(p.kW_DHW_Nominal) || 0;
            const price = Number(p.salesPriceUSD) || 0;
            const category = (p.category || '').toLowerCase();

            if (nominalDHWPower === 0 || price === 0) return false;
            
            // Filter by selected Heat Pump Type
            if (inputs.heatPumpType !== 'all') {
                const typeMap = {
                    'r32': 'r32',
                    'r290': 'r290',
                    'co2': 'co2'
                };
                const requiredType = typeMap[inputs.heatPumpType];
                if (!category.includes(requiredType)) return false;
            }

            // Filter if cooling is required
            if (inputs.includeCooling && !p.isReversible) return false;

            return true;
        })
        
        // 2. Select Suitable Models
        .filter(m => {
            const nominalDHWPower = Number(m.kW_DHW_Nominal) || 0;
            const maxTemp = Number(m.max_temp_c) || 60;

            // Match 1: Max Temperature must be sufficient.
            if (inputs.targetTemp > maxTemp) return false;

            // Match 2: Nominal Power must be equal to or greater than the required capacity.
            // We use a 95% tolerance (i.e., allowing a small shortfall if it's the next best model)
            return nominalDHWPower >= (requiredThermalPowerKW * 0.95); 
        })
        
        // 3. Sort by Price (Cheapest first)
        .sort((a, b) => Number(a.salesPriceUSD) - Number(b.salesPriceUSD));


    if (availableModels.length === 0) { 
        return { error: `No suitable model found in inventory. Required heating capacity: ${requiredThermalPowerKW.toFixed(1)} kW.` }; 
    }
    
    const heatPumpSystem = availableModels[0];
    
    // --- 4. FINANCIAL CALCULATIONS ---
    const fxRate = CONFIG.FX[inputs.currency];
    const symbol = CONFIG.SYMBOLS[inputs.currency];
    
    // Read the correct fields from the selected product
    const heatPumpCOP = Number(heatPumpSystem.COP_DHW) || 3.5;
    
    // Energy In = Energy Out / COP
    const karnotDailyElecKwh = dailyThermalEnergyKWH / heatPumpCOP; 
    const karnotPowerDrawKw = karnotDailyElecKwh / hoursPerDay;

    const heatPumpCost = Number(heatPumpSystem.salesPriceUSD) * fxRate;
    let karnotAnnualCost = 0, solarCost = 0, inverterCost = 0, karnotPanelCount = 0;

    // Solar Offset Logic (Retained from original calculator)
    if (inputs.systemType === 'grid-only') {
        karnotAnnualCost = karnotDailyElecKwh * 365 * inputs.elecRate;
    } else { // Grid + Solar
        const sunHours = Number(inputs.sunHours) || 5.5;
        const solarPoweredHours = Math.min(hoursPerDay, sunHours);
        const gridPoweredHours = Math.max(0, hoursPerDay - solarPoweredHours);
        karnotAnnualCost = (karnotPowerDrawKw * gridPoweredHours) * 365 * inputs.elecRate;
        
        karnotPanelCount = Math.ceil(karnotPowerDrawKw / CONFIG.SOLAR_PANEL_KW_RATED);
        solarCost = karnotPanelCount * CONFIG.SOLAR_PANEL_COST_USD * fxRate;
        inverterCost = (karnotPanelCount * CONFIG.SOLAR_PANEL_KW_RATED * 1000 * CONFIG.INVERTER_COST_PER_WATT_USD) * fxRate;
    }

    // Free Cooling Savings
    let coolSavings = 0;
    if (inputs.includeCooling && heatPumpSystem.isReversible) {
        // Estimate cooling capacity needed roughly equal to heating capacity
        const nominalCoolingPower = Number(heatPumpSystem.kW_Cooling_Nominal) || heatPumpSystem.kW_DHW_Nominal * 1.2;
        // Daily Cooling kWh is estimated based on nominal cooling power * operating hours
        const dailyCoolingKwh = nominalCoolingPower * hoursPerDay;
        // Savings = Cooling Energy * Cooling COP (for savings vs old AC) * Cost
        coolSavings = dailyCoolingKwh * 365 * inputs.elecRate * CONFIG.COOLING_COP;
    }
    
    const totalCapex = heatPumpCost + solarCost + inverterCost;
    const totalAnnualSavings = (annualCostOld - karnotAnnualCost) + coolSavings;
    const paybackYears = totalAnnualSavings > 0 && totalCapex > 0 ? (totalCapex / totalAnnualSavings).toFixed(1) : "N/A";

    return {
        system: { n: heatPumpSystem.name },
        metrics: { 
            dailyLiters, 
            panelCount: karnotPanelCount,
            requiredThermalPowerKW: requiredThermalPowerKW.toFixed(1),
            selectedNominalPowerKW: heatPumpSystem.kW_DHW_Nominal,
            adjustedHourlyOutput: (heatPumpSystem.kW_DHW_Nominal / kwhPerLiter).toFixed(1), // L/hr output
        },
        financials: {
            symbol, annualCostOld, karnotAnnualCost, totalSavings: totalAnnualSavings, coolSavings,
            paybackYears,
            capex: { heatPump: heatPumpCost, solar: solarCost, inverter: inverterCost, total: totalCapex }
        }
    };
}
