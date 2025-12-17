export const CONFIG = {
    FX: { PHP: 58.5, USD: 1, GBP: 0.79, EUR: 0.92 },
    SYMBOLS: { PHP: "₱", USD: "$", GBP: "£", EUR: "€" },
    defaultRate: {
        PHP: { grid: 12.25, lpgPrice: 950, lpgSize: 11, diesel: 60.0 },
        USD: { grid: 0.21, lpgPrice: 25, lpgSize: 9, diesel: 1.00 },
        GBP: { grid: 0.17, lpgPrice: 20, lpgSize: 13, diesel: 1.30 },
        EUR: { grid: 0.19, lpgPrice: 22, lpgSize: 11, diesel: 1.40 },
    },
    KWH_PER_KG_LPG: 13.8, 
    DIESEL_KWH_PER_LITER: 10.7,
    SOLAR_PANEL_KW_RATED: 0.425, 
    SOLAR_PANEL_COST_USD: 200, 
    INVERTER_COST_PER_WATT_USD: 0.30,
    COOLING_COP: 2.6, 
    RATED_AMBIENT_C: 20, 
    RATED_LIFT_C: 40 
};

export function calculateHeatPump(inputs, dbProducts) {
    if (!dbProducts || dbProducts.length === 0) return { error: "Inventory empty." };

    // --- 1. STABILIZED DEMAND CALCULATIONS ---
    let dailyLiters = 0;
    const userType = inputs.userType || 'home';
    
    if (userType === 'home') {
        dailyLiters = (inputs.occupants || 0) * 50;
    } else if (userType === 'restaurant') {
        // 7 Liters per meal is the industry standard for F&B ROI
        dailyLiters = (inputs.mealsPerDay || 0) * 7;
    } else if (userType === 'resort') {
        dailyLiters = ((inputs.roomsOccupied || 0) * 50) + ((inputs.mealsPerDay || 0) * 7);
    } else {
        dailyLiters = inputs.dailyLitersInput || 0;
    }

    if (dailyLiters <= 0) return { error: "Liters required" };

    const hours = Math.max(1, inputs.hoursPerDay || 12);
    const deltaT = Math.max(1, (inputs.targetTemp || 55) - (inputs.inletTemp || 15));

    const kwhPerLiter = (deltaT * 1.163) / 1000;
    const dailyThermalEnergyKWH = dailyLiters * kwhPerLiter;
    const requiredThermalPowerKW = dailyThermalEnergyKWH / hours;

    // --- 2. BASELINE COSTS ---
    let rateKWH = inputs.elecRate || 12;
    if (inputs.heatingType === 'propane') {
        rateKWH = ((inputs.fuelPrice || 950) / (inputs.tankSize || 11)) / CONFIG.KWH_PER_KG_LPG;
    } else if (inputs.heatingType === 'diesel') {
        rateKWH = (inputs.fuelPrice || 60) / CONFIG.DIESEL_KWH_PER_LITER;
    }
    const annualCostOld = dailyThermalEnergyKWH * 365 * rateKWH;

    // --- 3. PERFORMANCE FACTOR ---
    const ambient = inputs.ambientTemp || 30;
    const perfFactor = (CONFIG.RATED_LIFT_C / deltaT) * (1 + ((ambient - CONFIG.RATED_AMBIENT_C) * 0.015));

    // --- 4. SELECTION ---
    let availableModels = dbProducts.filter(p => {
        const pRefrig = (p.Refrigerant || '').toUpperCase();
        if (inputs.heatPumpType !== 'all' && !pRefrig.includes(inputs.heatPumpType.toUpperCase())) return false;
        if (inputs.includeCooling && !p.isReversible) return false;
        if (inputs.targetTemp > (p.max_temp_c || 65)) return false;

        const nominalKW = parseFloat(p.kW_DHW_Nominal) || 0;
        return requiredThermalPowerKW <= (nominalKW * perfFactor);
    });

    availableModels.sort((a, b) => (parseFloat(a.salesPriceUSD) || 0) - (parseFloat(b.salesPriceUSD) || 0));

    if (availableModels.length === 0) return { error: "No model fits these specs" };
    const system = availableModels[0];

    // --- 5. FINANCIALS ---
    const fx = CONFIG.FX[inputs.currency] || 1;
    const sysPriceLocal = (parseFloat(system.salesPriceUSD) || 0) * fx;
    const sysCop = parseFloat(system.COP_DHW) || 3.8;
    
    const karnotDailyKwh = dailyThermalEnergyKWH / sysCop;
    const karnotPowerDrawKw = karnotDailyKwh / hours;
    
    let karnotAnnualCost = 0, solarCost = 0, inverterCost = 0, panelCount = 0;
    
    if (inputs.systemType === 'grid-only') {
        karnotAnnualCost = karnotDailyKwh * 365 * (inputs.elecRate || 12);
    } else {
        const sunHours = inputs.sunHours || 5.5;
        const gridHours = Math.max(0, hours - sunHours);
        karnotAnnualCost = (karnotPowerDrawKw * gridHours) * 365 * (inputs.elecRate || 12);
        panelCount = Math.ceil(karnotPowerDrawKw / CONFIG.SOLAR_PANEL_KW_RATED);
        solarCost = panelCount * CONFIG.SOLAR_PANEL_COST_USD * fx;
        inverterCost = (panelCount * CONFIG.SOLAR_PANEL_KW_RATED * 1000 * CONFIG.INVERTER_COST_PER_WATT_USD) * fx;
    }

    const coolSavings = (inputs.includeCooling) ? (karnotDailyKwh * CONFIG.COOLING_COP * 365 * (inputs.elecRate || 12)) : 0;
    const totalCapex = sysPriceLocal + solarCost + inverterCost;
    const totalSavings = (annualCostOld - karnotAnnualCost) + coolSavings;

    return {
        system: { n: system.name, refrig: system.Refrigerant },
        metrics: { dailyLiters, powerKW: karnotPowerDrawKw.toFixed(2), panelCount, co2Saved: (dailyThermalEnergyKWH * 365 * 0.5).toFixed(0) },
        financials: {
            symbol: CONFIG.SYMBOLS[inputs.currency],
            annualCostOld, karnotAnnualCost, coolSavings, totalSavings,
            paybackYears: totalSavings > 0 ? (totalCapex / totalSavings).toFixed(1) : "N/A",
            capex: { system: sysPriceLocal, solar: solarCost, inverter: inverterCost, total: totalCapex }
        }
    };
}
