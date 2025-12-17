// src/utils/heatPumpLogic.js

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
    RATED_AMBIENT_C: 20, 
    RATED_LIFT_C: 40 
};

export function calculateHeatPump(inputs, dbProducts) {
    if (!dbProducts || dbProducts.length === 0) return { error: "Inventory empty." };

    // --- 1. DEMAND CALCULATIONS ---
    let dailyLiters = 0;
    if (inputs.userType === 'home') dailyLiters = inputs.occupants * 50;
    else if (inputs.userType === 'restaurant') dailyLiters = inputs.mealsPerDay * 7;
    else if (inputs.userType === 'resort') dailyLiters = (inputs.roomsOccupied * 50) + (inputs.mealsPerDay * 7);
    else dailyLiters = inputs.dailyLitersInput;

    if (dailyLiters <= 0) return { error: "Please enter valid demand (Liters/Day)." };

    const hoursPerDay = Math.max(1, inputs.hoursPerDay);
    const deltaT = Math.max(1, inputs.targetTemp - inputs.inletTemp);

    // Required Thermal Energy (Energy Out)
    const kwhPerLiter = (deltaT * 1.163) / 1000;
    const dailyThermalEnergyKWH = dailyLiters * kwhPerLiter;
    const requiredThermalPowerKW = dailyThermalEnergyKWH / hoursPerDay;

    // --- 2. BASELINE COSTS (In chosen currency) ---
    let rateKWH = 0;
    if (inputs.heatingType === 'propane') {
        rateKWH = (inputs.fuelPrice / (inputs.tankSize || 11)) / CONFIG.KWH_PER_KG_LPG;
    } else if (inputs.heatingType === 'diesel') {
        rateKWH = inputs.fuelPrice / CONFIG.DIESEL_KWH_PER_LITER;
    } else {
        rateKWH = inputs.fuelPrice; 
    }
    const annualCostOld = dailyThermalEnergyKWH * 365 * rateKWH;

    // --- 3. SELECTION LOGIC (AquaHERO Storage vs Monoblock Flow) ---
    const perfFactor = (1 + ((inputs.ambientTemp - CONFIG.RATED_AMBIENT_C) * 0.015));
    
    let availableModels = dbProducts.filter(p => {
        const pName = (p.name || '').toLowerCase();
        const pCat = (p.category || '').toLowerCase();
        const pRefrig = (p.Refrigerant || '').toUpperCase();
        
        // tech filters
        if (inputs.heatPumpType !== 'all') {
            const search = inputs.heatPumpType.toUpperCase();
            if (search === 'CO2' || search === 'R744') {
                if (!pRefrig.includes('CO2') && !pRefrig.includes('R744')) return false;
            } else if (!pRefrig.includes(search)) return false;
        }

        if (inputs.includeCooling && !p.isReversible) return false;

        // Selection: AquaHERO Storage Units
        if (pCat.includes('aquahero') || pName.includes('aquahero')) {
            const tank = pName.includes('300l') ? 300 : 200;
            return inputs.targetTemp <= (p.max_temp_c || 75) && dailyLiters <= (tank * 3 * perfFactor);
        }
        
        // Selection: Monoblock iHEAT Units
        const nominalKW = parseFloat(p.kW_DHW_Nominal) || 0;
        return inputs.targetTemp <= (p.max_temp_c || 65) && requiredThermalPowerKW <= (nominalKW * perfFactor);
    }).sort((a, b) => (parseFloat(a.salesPriceUSD) || 99999) - (parseFloat(b.salesPriceUSD) || 99999));

    if (availableModels.length === 0) return { error: "No suitable models found for this load." };
    const system = availableModels[0];

    // --- 4. HARDWARE & FINANCIAL OUTPUTS ---
    const fx = CONFIG.FX[inputs.currency] || 1;
    const sysPriceLocal = (parseFloat(system.salesPriceUSD) || 0) * fx;
    const sysCop = parseFloat(system.COP_DHW) || 3.8;
    
    const karnotDailyKwh = dailyThermalEnergyKWH / sysCop;
    const karnotPowerDrawKw = karnotDailyKwh / hoursPerDay;
    
    let karnotAnnualCost = 0, solarCost = 0, inverterCost = 0, panelCount = 0;
    
    if (inputs.systemType === 'grid-only') {
        karnotAnnualCost = karnotDailyKwh * 365 * inputs.elecRate;
    } else {
        const sunHours = inputs.sunHours || 5.5;
        const gridHours = Math.max(0, hoursPerDay - sunHours);
        karnotAnnualCost = (karnotPowerDrawKw * gridHours) * 365 * inputs.elecRate;
        
        // SOLAR CALCS
        panelCount = Math.ceil(karnotPowerDrawKw / CONFIG.SOLAR_PANEL_KW_RATED);
        solarCost = panelCount * CONFIG.SOLAR_PANEL_COST_USD * fx;
        inverterCost = (panelCount * CONFIG.SOLAR_PANEL_KW_RATED * 1000 * CONFIG.INVERTER_COST_PER_WATT_USD) * fx;
    }

    let coolSavings = (inputs.includeCooling && system.isReversible) ? (karnotDailyKwh * CONFIG.COOLING_COP * 365 * inputs.elecRate) : 0;
    const totalCapex = sysPriceLocal + solarCost + inverterCost;
    const totalSavings = (annualCostOld - karnotAnnualCost) + coolSavings;

    return {
        system: { n: system.name, id: system.id, refrig: system.Refrigerant },
        metrics: { 
            dailyLiters, 
            powerKW: karnotPowerDrawKw.toFixed(2), 
            panelCount, 
            co2Saved: (dailyThermalEnergyKWH * 365 * 0.5).toFixed(0)
        },
        financials: {
            symbol: CONFIG.SYMBOLS[inputs.currency],
            annualCostOld, karnotAnnualCost, coolSavings, totalSavings,
            paybackYears: totalSavings > 0 ? (totalCapex / totalSavings).toFixed(1) : "N/A",
            capex: { system: sysPriceLocal, solar: solarCost, inverter: inverterCost, total: totalCapex }
        }
    };
}
