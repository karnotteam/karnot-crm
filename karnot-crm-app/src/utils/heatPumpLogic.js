export const CONFIG = {
    FX: { PHP: 58.5, USD: 1, GBP: 0.79, EUR: 0.92 },
    SYMBOLS: { PHP: "₱", USD: "$", GBP: "£", EUR: "€" },
    defaultRate: {
        PHP: { grid: 12.25, lpgPrice: 950, lpgSize: 11, gas: 7.0, diesel: 60.0 },
        USD: { grid: 0.21, lpgPrice: 25, lpgSize: 9, gas: 0.05, diesel: 1.00 },
        GBP: { grid: 0.17, lpgPrice: 20, lpgSize: 13, gas: 0.07, diesel: 1.30 },
        EUR: { grid: 0.19, lpgPrice: 22, lpgSize: 11, gas: 0.11, diesel: 1.40 },
    },
    RATED_AMBIENT_C: 20, 
    RATED_LIFT_C: 40,
    EM_FACTOR: { electric_grid: 0.7, electric_solar: 0.12, propane: 0.23, gas: 0.20, diesel: 0.25 },
    KWH_PER_KG_LPG: 13.8, 
    DIESEL_KWH_PER_LITER: 10.7,
    COP_STANDARD: 1,
    SOLAR_PANEL_KW_RATED: 0.425, 
    SOLAR_PANEL_COST_USD: 200, 
    INVERTER_COST_PER_WATT_USD: 0.30,
    COOLING_COP_RATIO: 2.6 // Ratio used in HTML for free cooling estimation
};

export function calculateHeatPump(inputs, dbProducts) {
    if (!dbProducts || dbProducts.length === 0) return { error: "No products loaded from database." };

    // 1. Demand Calculation (Liters)
    let dailyLiters = 0;
    if (inputs.userType === 'home') dailyLiters = inputs.occupants * 50;
    else if (inputs.userType === 'restaurant') dailyLiters = inputs.mealsPerDay * 7;
    else if (inputs.userType === 'resort') dailyLiters = (inputs.roomsOccupied * 50) + (inputs.mealsPerDay * 7);
    else dailyLiters = inputs.dailyLitersInput;

    if (dailyLiters <= 0) return { error: "Please enter valid demand values." };

    // 2. Physics & Performance Factors
    const actualLiftC = Math.max(1, inputs.targetTemp - inputs.inletTemp);
    const performanceFactor = (CONFIG.RATED_LIFT_C / actualLiftC) * (1 + ((inputs.ambientTemp - CONFIG.RATED_AMBIENT_C) * 0.015));
    const kwhPerLiter = (actualLiftC * 1.163) / 1000;
    const dailyThermalEnergyKWH = dailyLiters * kwhPerLiter;
    const peakLitersPerHour = dailyLiters / Math.max(1, inputs.hoursPerDay);

    // 3. Baseline Costs
    let currentRateKWH = inputs.elecRate;
    if (inputs.heatingType === 'propane') {
        currentRateKWH = (inputs.fuelPrice / inputs.tankSize) / CONFIG.KWH_PER_KG_LPG;
    } else if (inputs.heatingType === 'diesel') {
        currentRateKWH = inputs.fuelPrice / CONFIG.DIESEL_KWH_PER_LITER;
    }
    const annualCostOld = (dailyThermalEnergyKWH / CONFIG.COP_STANDARD) * 365 * currentRateKWH;

    // 4. Database Selection (R290, CO2, R32 + Performance Scaling)
    let suitableModels = dbProducts.filter(p => {
        const nominalLhr = Number(p.base_lhr) || (Number(p.kW_DHW_Nominal) * 1000 / (CONFIG.RATED_LIFT_C * 1.163));
        const adjLhr = nominalLhr * performanceFactor;
        const maxT = Number(p.max_temp_c) || 60;

        const matchesType = inputs.heatPumpType === 'all' || 
                           (p.Refrigerant || '').toLowerCase() === inputs.heatPumpType.toLowerCase();
        const matchesCooling = !inputs.includeCooling || p.isReversible;
        const canHandleLoad = adjLhr >= peakLitersPerHour;
        const canReachTemp = inputs.targetTemp <= maxT;

        return matchesType && matchesCooling && canHandleLoad && canReachTemp;
    }).sort((a, b) => Number(a.salesPriceUSD) - Number(b.salesPriceUSD));

    if (suitableModels.length === 0) return { error: "No suitable models found for these conditions." };
    const system = suitableModels[0];

    // 5. Financials & Solar
    const fx = CONFIG.FX[inputs.currency] || 1;
    const hpCOP = Number(system.COP_DHW) || 3.8;
    const karnotDailyElecKwh = dailyThermalEnergyKWH / hpCOP;
    const karnotPowerDrawKw = karnotDailyElecKwh / inputs.hoursPerDay;
    
    const hpCost = Number(system.salesPriceUSD) * fx;
    let annualKarnotCost = 0, solarCost = 0, invCost = 0, panels = 0;

    if (inputs.systemType === 'grid-only') {
        annualKarnotCost = karnotDailyElecKwh * 365 * inputs.elecRate;
    } else {
        const solarHrs = Math.min(inputs.hoursPerDay, inputs.sunHours);
        const gridHrs = Math.max(0, inputs.hoursPerDay - solarHrs);
        annualKarnotCost = (karnotPowerDrawKw * gridHrs) * 365 * inputs.elecRate;
        panels = Math.ceil(karnotPowerDrawKw / CONFIG.SOLAR_PANEL_KW_RATED);
        solarCost = panels * CONFIG.SOLAR_PANEL_COST_USD * fx;
        invCost = (panels * CONFIG.SOLAR_PANEL_KW_RATED * 1000 * CONFIG.INVERTER_COST_PER_WATT_USD) * fx;
    }

    // 6. Free Cooling ROI
    let coolSavings = 0;
    if (inputs.includeCooling && system.isReversible) {
        const dailyCoolingKwh = (dailyThermalEnergyKWH / hpCOP) * CONFIG.COOLING_COP_RATIO;
        coolSavings = dailyCoolingKwh * 365 * inputs.elecRate;
    }

    const totalCapex = hpCost + solarCost + invCost;
    const totalSavings = (annualCostOld - annualKarnotCost) + coolSavings;

    return {
        system: { n: system.name, type: system.Refrigerant, adjLhr: (Number(system.base_lhr) || 100) * performanceFactor },
        financials: {
            symbol: CONFIG.SYMBOLS[inputs.currency],
            annualCostOld, annualKarnotCost, totalSavings, coolSavings,
            paybackYears: totalSavings > 1 ? (totalCapex / totalSavings).toFixed(1) : "N/A",
            capex: { hp: hpCost, solar: solarCost, inv: invCost, total: totalCapex }
        },
        env: {
            co2Saved: (dailyThermalEnergyKWH * 365 * CONFIG.EM_FACTOR[inputs.heatingType === 'electric' ? 'electric_grid' : inputs.heatingType]) - (karnotDailyElecKwh * 365 * CONFIG.EM_FACTOR.electric_grid)
        }
    };
}
