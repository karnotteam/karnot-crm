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
    COOLING_COP: 2.6, 
    RATED_AMBIENT_C: 20, 
    RATED_LIFT_C: 40 
};

export function calculateHeatPump(inputs, dbProducts) {
    if (!dbProducts || dbProducts.length === 0) return { error: "Inventory empty." };

    // --- 1. DEMAND MATH ---
    let dailyLiters = 0;
    if (inputs.userType === 'home') dailyLiters = inputs.occupants * 50;
    else if (inputs.userType === 'restaurant') dailyLiters = inputs.mealsPerDay * 7;
    else if (inputs.userType === 'resort') dailyLiters = (inputs.roomsOccupied * 50) + (inputs.mealsPerDay * 7);
    else dailyLiters = inputs.dailyLitersInput;

    const deltaT = Math.max(1, inputs.targetTemp - inputs.inletTemp);
    const dailyThermalEnergyKWH = (dailyLiters * deltaT * 1.163) / 1000;
    const peakPowerRequired = dailyThermalEnergyKWH / Math.max(1, inputs.hoursPerDay);

    // --- 2. OLD SYSTEM COST ---
    let rateKWH = 0;
    if (inputs.heatingType === 'propane') rateKWH = (inputs.fuelPrice / (inputs.tankSize || 11)) / CONFIG.KWH_PER_KG_LPG;
    else if (inputs.heatingType === 'diesel') rateKWH = inputs.fuelPrice / CONFIG.DIESEL_KWH_PER_LITER;
    else rateKWH = inputs.fuelPrice; 
    
    const annualCostOld = (dailyThermalEnergyKWH / CONFIG.COP_STANDARD) * 365 * rateKWH;

    // --- 3. SELECTION ---
    const perfFactor = (1 + ((inputs.ambientTemp - CONFIG.RATED_AMBIENT_C) * 0.015));
    let suitable = dbProducts.filter(p => {
        const pName = (p.name || '').toLowerCase();
        const pRefrig = (p.Refrigerant || '').toUpperCase();
        const matchesType = inputs.heatPumpType === 'all' || pRefrig.includes(inputs.heatPumpType.toUpperCase());
        const matchesCooling = !inputs.includeCooling || p.isReversible;
        
        // AquaHERO Storage Logic
        if (p.category === 'AquaHERO' || pName.includes('aquahero')) {
            const tank = parseFloat(p.integral_storage_L) || (pName.includes('300l') ? 300 : 200);
            return matchesType && inputs.targetTemp <= (p.max_temp_c || 70) && dailyLiters <= (tank * 3 * perfFactor);
        }
        
        // Monoblock Logic
        const nominalKW = parseFloat(p.kW_DHW_Nominal) || 0;
        const adjKW = nominalKW * perfFactor;
        return matchesType && matchesCooling && inputs.targetTemp <= (p.max_temp_c || 60) && peakPowerRequired <= adjKW;
    }).sort((a, b) => (parseFloat(a.salesPriceUSD) || 999) - (parseFloat(b.salesPriceUSD) || 999));

    if (suitable.length === 0) return { error: "No matching model found." };
    const system = suitable[0];

    // --- 4. NEW SYSTEM MATH ---
    const fx = CONFIG.FX[inputs.currency];
    const sysCop = parseFloat(system.COP_DHW) || 3.8;
    const sysPriceLocal = (parseFloat(system.salesPriceUSD) || 0) * fx;
    
    const karnotDailyKwh = dailyThermalEnergyKWH / sysCop;
    let karnotAnnualCost = 0;
    
    if (inputs.systemType === 'grid-only') {
        karnotAnnualCost = karnotDailyKwh * 365 * inputs.elecRate;
    } else {
        const solarHours = Math.min(inputs.hoursPerDay, inputs.sunHours || 5.5);
        const gridHours = Math.max(0, inputs.hoursPerDay - solarHours);
        const powerDraw = karnotDailyKwh / inputs.hoursPerDay;
        karnotAnnualCost = (powerDraw * gridHours) * 365 * inputs.elecRate;
    }

    let coolSavings = (inputs.includeCooling && system.isReversible) ? (dailyThermalEnergyKWH / sysCop) * CONFIG.COOLING_COP * 365 * inputs.elecRate : 0;
    const totalSavings = (annualCostOld - karnotAnnualCost) + coolSavings;

    return {
        system: { n: system.name },
        metrics: { dailyLiters, requiredPower: peakPowerRequired.toFixed(1) },
        financials: {
            symbol: CONFIG.SYMBOLS[inputs.currency],
            annualCostOld, karnotAnnualCost, coolSavings, totalSavings,
            paybackYears: totalSavings > 0 ? (sysPriceLocal / totalSavings).toFixed(1) : "N/A",
            capex: { total: sysPriceLocal }
        }
    };
}
