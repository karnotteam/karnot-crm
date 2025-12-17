export const CONFIG = {
    SYMBOLS: { PHP: "₱", USD: "$", GBP: "£", EUR: "€" },
    defaultRate: {
        PHP: { grid: 12.25, lpgPrice: 950, lpgSize: 11, gas: 7.0, diesel: 60.0 },
        USD: { grid: 0.21, lpgPrice: 25, lpgSize: 9, gas: 0.05, diesel: 1.00 },
        GBP: { grid: 0.17, lpgPrice: 20, lpgSize: 13, gas: 0.07, diesel: 1.30 },
        EUR: { grid: 0.19, lpgPrice: 22, lpgSize: 11, gas: 0.11, diesel: 1.40 },
    },
    RATED_AMBIENT_C: 20,
    RATED_LIFT_C: 40,
    COOLING_COP: 2.6
};

export const calculateHeatPump = (inputs, products = []) => {
    const { 
        userType, occupants, dailyLitersInput, mealsPerDay, roomsOccupied, 
        hoursPerDay, heatingType, fuelPrice, tankSize, elecRate, 
        ambientTemp, inletTemp, targetTemp, systemType, sunHours,
        heatPumpType, includeCooling 
    } = inputs;

    let dailyLiters = 0;
    if (userType === 'home') dailyLiters = occupants * 50;
    else if (userType === 'restaurant') dailyLiters = mealsPerDay * 7;
    else if (userType === 'resort') dailyLiters = (roomsOccupied * 50) + (mealsPerDay * 7);
    else dailyLiters = dailyLitersInput;

    const kwhPerLiter = ((targetTemp - inletTemp) * 1.163) / 1000;
    const dailyThermalEnergyKWH = dailyLiters * kwhPerLiter;

    let currentRateKWH = elecRate;
    if (heatingType === 'propane') currentRateKWH = (fuelPrice / tankSize) / 13.8;
    else if (heatingType === 'diesel') currentRateKWH = fuelPrice / 10.7;
    const annualCostOld = dailyThermalEnergyKWH * 365 * currentRateKWH;

    let availableModels = products;
    if (heatPumpType !== 'all') {
        availableModels = availableModels.filter(p => p.type?.toLowerCase() === heatPumpType.toLowerCase());
    }
    if (includeCooling) {
        availableModels = availableModels.filter(p => p.isReversible === true);
    }

    const actualLiftC = Math.max(1, targetTemp - inletTemp);
    const performanceFactor = (CONFIG.RATED_LIFT_C / actualLiftC) * (1 + ((ambientTemp - CONFIG.RATED_AMBIENT_C) * 0.015));
    const peakLitersPerHour = dailyLiters / hoursPerDay;

    const suitable = availableModels.filter(m => {
        const adjLhr = (m.base_lhr || 0) * performanceFactor;
        return targetTemp <= (m.max_temp_c || 60) && peakLitersPerHour <= adjLhr;
    }).sort((a, b) => (a.price || 99999) - (b.price || 99999));

    if (suitable.length === 0) return { error: "No suitable models found." };
    const system = suitable[0];

    const karnotDailyElecKwh = dailyThermalEnergyKWH / (system.cop || 3.8);
    const karnotPowerDrawKw = karnotDailyElecKwh / hoursPerDay;
    
    let annualKarnotCost = (systemType === 'grid-only') 
        ? (karnotDailyElecKwh * 365 * elecRate)
        : (karnotPowerDrawKw * Math.max(0, hoursPerDay - sunHours) * 365 * elecRate);

    let coolSavings = 0;
    if (includeCooling && system.isReversible) {
        coolSavings = (karnotDailyElecKwh * CONFIG.COOLING_COP) * 365 * elecRate;
    }

    const totalSavings = (annualCostOld - annualKarnotCost) + coolSavings;
    return {
        system,
        financials: {
            symbol: CONFIG.SYMBOLS[inputs.currency],
            annualCostOld, annualKarnotCost, coolSavings, totalSavings,
            paybackYears: totalSavings > 0 ? (system.price / totalSavings).toFixed(1) : "N/A",
            capex: { total: system.price || 0 }
        },
        metrics: {
            adjFlowLhr: (system.base_lhr * performanceFactor),
            emissionsSaved: (dailyThermalEnergyKWH * 365 * 0.5),
            panels: Math.ceil(karnotPowerDrawKw / 0.425)
        }
    };
};
