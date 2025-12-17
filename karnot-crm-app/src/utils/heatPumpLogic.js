export const CONFIG = {
    FX: { PHP: 58.5, USD: 1, GBP: 0.79, EUR: 0.92 },
    SYMBOLS: { PHP: "₱", USD: "$", GBP: "£", EUR: "€" },
    defaultRate: {
        PHP: { grid: 12.25, lpgPrice: 950, lpgSize: 11, gas: 7.0, diesel: 60.0 },
        USD: { grid: 0.21, lpgPrice: 25, lpgSize: 9, gas: 0.05, diesel: 1.00 },
        GBP: { grid: 0.17, lpgPrice: 20, lpgSize: 13, gas: 0.07, diesel: 1.30 },
        EUR: { grid: 0.19, lpgPrice: 22, lpgSize: 11, gas: 0.11, diesel: 1.40 },
    },
    RATED_AMBIENT_C: 20, RATED_LIFT_C: 40,
    EM_FACTOR: { electric_grid: 0.7, propane: 0.23, gas: 0.20, diesel: 0.25 },
    KWH_PER_KG_LPG: 13.8, DIESEL_KWH_PER_LITER: 10.7,
    COP_STANDARD: 1,
    COOLING_COP_RATIO: 2.6
};

export function calculateHeatPump(inputs, dbProducts) {
    if (!dbProducts || dbProducts.length === 0) return { error: "No products loaded from database." }; //

    // 1. Demand Calculation (HTML logic)
    let dailyLiters = inputs.userType === 'home' ? inputs.occupants * 50 :
                      inputs.userType === 'restaurant' ? inputs.mealsPerDay * 7 :
                      inputs.userType === 'resort' ? (inputs.roomsOccupied * 50) + (inputs.mealsPerDay * 7) :
                      inputs.dailyLitersInput;

    const actualLiftC = Math.max(1, inputs.targetTemp - inputs.inletTemp);
    const performanceFactor = (CONFIG.RATED_LIFT_C / actualLiftC) * (1 + ((inputs.ambientTemp - CONFIG.RATED_AMBIENT_C) * 0.015)); //
    const dailyThermalEnergyKWH = (dailyLiters * actualLiftC * 1.163) / 1000;
    const peakLitersPerHour = dailyLiters / Math.max(1, inputs.hoursPerDay);

    // 2. Baseline Costs
    let currentRateKWH = inputs.elecRate;
    if (inputs.heatingType === 'propane') currentRateKWH = (inputs.fuelPrice / inputs.tankSize) / CONFIG.KWH_PER_KG_LPG;
    else if (inputs.heatingType === 'diesel') currentRateKWH = inputs.fuelPrice / CONFIG.DIESEL_KWH_PER_LITER;
    
    const annualCostOld = (dailyThermalEnergyKWH / CONFIG.COP_STANDARD) * 365 * currentRateKWH;

    // 3. Find Best Model from Database
    let availableModels = dbProducts.filter(p => {
        const nominalLhr = Number(p.base_lhr) || (Number(p.kW_DHW_Nominal) * 1000 / (CONFIG.RATED_LIFT_C * 1.163));
        const adjLhr = nominalLhr * performanceFactor;
        const matchesType = inputs.heatPumpType === 'all' || (p.Refrigerant || '').toLowerCase() === inputs.heatPumpType.toLowerCase();
        return matchesType && adjLhr >= peakLitersPerHour && inputs.targetTemp <= (Number(p.max_temp_c) || 60);
    }).sort((a, b) => Number(a.salesPriceUSD) - Number(b.salesPriceUSD));

    if (availableModels.length === 0) return { error: "No suitable model found." };
    const system = availableModels[0];

    // 4. ROI
    const fx = CONFIG.FX[inputs.currency] || 1;
    const karnotDailyElecKwh = dailyThermalEnergyKWH / (Number(system.COP_DHW) || 3.8);
    const annualKarnotCost = karnotDailyElecKwh * 365 * inputs.elecRate;
    const totalCapex = Number(system.salesPriceUSD) * fx;
    const totalSavings = annualCostOld - annualKarnotCost;

    return {
        system: { n: system.name, type: system.Refrigerant, adjLhr: (Number(system.base_lhr) || 100) * performanceFactor },
        financials: {
            symbol: CONFIG.SYMBOLS[inputs.currency],
            totalSavings,
            paybackYears: totalSavings > 1 ? (totalCapex / totalSavings).toFixed(1) : "N/A",
            capex: { total: totalCapex }
        }
    };
}
