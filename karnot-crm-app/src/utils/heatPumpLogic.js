/**
 * KARNOT CRM - FULL PHYSICS & ROI UTILITY
 * Handles: Thermal Load, Ambient Derating, Fuel Conversions, and Solar Sizing.
 */
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
    SOLAR_PANEL_KW_RATED: 0.425, 
    SOLAR_PANEL_COST_USD: 200, 
    INVERTER_COST_PER_WATT_USD: 0.30,
    COOLING_COP: 2.6, 
    RATED_AMBIENT_C: 20, 
    RATED_LIFT_C: 40 
};

export function calculateHeatPump(inputs, dbProducts) {
    if (!dbProducts || dbProducts.length === 0) return { error: "Inventory empty." };

    // 1. Demand Calculation (Residential, Restaurant, Resort, Commercial)
    let dailyLiters = 0;
    if (inputs.userType === 'home') dailyLiters = (parseFloat(inputs.occupants) || 0) * 50;
    else if (inputs.userType === 'restaurant') dailyLiters = (parseFloat(inputs.mealsPerDay) || 0) * 7;
    else if (inputs.userType === 'resort') dailyLiters = ((parseFloat(inputs.roomsOccupied) || 0) * 50) + ((parseFloat(inputs.mealsPerDay) || 0) * 7);
    else dailyLiters = parseFloat(inputs.dailyLitersInput) || 0;

    if (dailyLiters <= 0) return { error: "Liters required" };

    const hours = Math.max(1, parseFloat(inputs.hoursPerDay) || 12);
    const deltaT = Math.max(1, (parseFloat(inputs.targetTemp) || 55) - (parseFloat(inputs.inletTemp) || 15));

    const kwhPerLiter = (deltaT * 1.163) / 1000;
    const dailyThermalEnergyKWH = dailyLiters * kwhPerLiter;
    const requiredPowerKW = dailyThermalEnergyKWH / hours;

    // 2. Baseline Costs (Including LPG/Diesel math)
    let rateKWH = parseFloat(inputs.elecRate) || 12.25;
    if (inputs.heatingType === 'propane') {
        const pricePerKg = (parseFloat(inputs.fuelPrice) || 950) / (parseFloat(inputs.tankSize) || 11);
        rateKWH = pricePerKg / CONFIG.KWH_PER_KG_LPG;
    } else if (inputs.heatingType === 'diesel') {
        rateKWH = (parseFloat(inputs.fuelPrice) || 60) / CONFIG.DIESEL_KWH_PER_LITER;
    }
    const annualCostOld = dailyThermalEnergyKWH * 365 * rateKWH;

    // 3. Performance Scaling (Performance Derating)
    const perfFactor = (CONFIG.RATED_LIFT_C / deltaT) * (1 + (((parseFloat(inputs.ambientTemp) || 30) - CONFIG.RATED_AMBIENT_C) * 0.015));

    // 4. Model Selection (Prioritizing by Refrigerant and Price)
    let available = dbProducts.filter(p => {
        const pRefrig = (p.Refrigerant || '').toUpperCase();
        if (inputs.heatPumpType !== 'all' && !pRefrig.includes(inputs.heatPumpType.toUpperCase())) return false;
        if (inputs.includeCooling && !p.isReversible) return false;
        if (parseFloat(inputs.targetTemp) > (p.max_temp_c || 65)) return false;

        const nominalKW = parseFloat(p.kW_DHW_Nominal) || 0;
        return requiredPowerKW <= (nominalKW * perfFactor);
    }).sort((a, b) => (parseFloat(a.salesPriceUSD) || 0) - (parseFloat(b.salesPriceUSD) || 0));

    if (available.length === 0) return { error: "No suitable models" };
    const system = available[0];

    // 5. Financials, ROI, and Solar PV Sizing
    const fx = CONFIG.FX[inputs.currency] || 1;
    const sysPrice = (parseFloat(system.salesPriceUSD) || 0) * fx;
    const sysCop = parseFloat(system.COP_DHW) || 3.8;
    
    const karnotDailyKwh = dailyThermalEnergyKWH / sysCop;
    const gridHours = Math.max(0, hours - (inputs.systemType === 'grid-solar' ? (parseFloat(inputs.sunHours) || 5.5) : 0));
    const karnotAnnualCost = (karnotDailyKwh / hours * gridHours) * 365 * (parseFloat(inputs.elecRate) || 12.25);

    const coolSavings = (inputs.includeCooling) ? (karnotDailyKwh * CONFIG.COOLING_COP * 365 * (parseFloat(inputs.elecRate) || 12.25)) : 0;
    const totalSavings = (annualCostOld - karnotAnnualCost) + coolSavings;
    const panelCount = Math.ceil((karnotDailyKwh / hours) / CONFIG.SOLAR_PANEL_KW_RATED);
    const totalCapex = sysPrice + (inputs.systemType === 'grid-solar' ? (panelCount * CONFIG.SOLAR_PANEL_COST_USD * fx * 1.5) : 0);

    return {
        system: { n: system.name, refrig: system.Refrigerant, cop: sysCop },
        metrics: { dailyLiters: Math.round(dailyLiters), powerKW: (karnotDailyKwh / hours).toFixed(2), panelCount, co2Saved: (dailyThermalEnergyKWH * 365 * 0.52).toFixed(0) },
        financials: { symbol: CONFIG.SYMBOLS[inputs.currency], totalSavings, paybackYears: totalSavings > 0 ? (totalCapex / totalSavings).toFixed(1) : "N/A", capex: totalCapex }
    };
}
