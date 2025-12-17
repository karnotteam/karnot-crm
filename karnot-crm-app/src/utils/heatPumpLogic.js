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
    COOLING_COP: 2.6,
    SOLAR_PANEL_KW_RATED: 0.425,
    COP_STANDARD: 1,
    KWH_PER_KG_LPG: 13.8,
    DIESEL_KWH_PER_LITER: 10.7
};

export const calculateHeatPump = (inputs, dbProducts = []) => {
    const { 
        currency, heatingType, userType, systemType, heatPumpType, fuelPrice, tankSize,
        elecRate, occupants, dailyLitersInput, mealsPerDay, roomsOccupied,
        hoursPerDay, ambientTemp, inletTemp, targetTemp, sunHours, includeCooling 
    } = inputs;

    // 1. Demand Calculation (HTML logic)
    let dailyLiters = 0;
    if(userType === 'home') dailyLiters = occupants * 50;
    else if (userType === 'restaurant') dailyLiters = mealsPerDay * 7;
    else if (userType === 'resort') dailyLiters = (roomsOccupied * 50) + (mealsPerDay * 7);
    else dailyLiters = dailyLitersInput;

    if (dailyLiters <= 0) return { error: "Demand missing" };

    // 2. Baseline Energy
    const kwhPerLiter = ((targetTemp - inletTemp) * 1.163) / 1000;
    const dailyThermalEnergyKWH = dailyLiters * kwhPerLiter;
    
    let currentRateKWH = fuelPrice;
    if (heatingType === 'propane') currentRateKWH = (fuelPrice / tankSize) / CONFIG.KWH_PER_KG_LPG;
    else if (heatingType === 'diesel') currentRateKWH = fuelPrice / CONFIG.DIESEL_KWH_PER_LITER;
    const annualCostOld = dailyThermalEnergyKWH * 365 * currentRateKWH;

    // 3. Selection Logic (USING PRODUCT MANAGER FIELDS)
    const actualLiftC = Math.max(1, targetTemp - inletTemp);
    const performanceFactor = (CONFIG.RATED_LIFT_C / actualLiftC) * (1 + ((ambientTemp - CONFIG.RATED_AMBIENT_C) * 0.015));
    const peakLitersPerHour = dailyLiters / hoursPerDay;

    // Filter DB products by category and refrigerant
    let availableModels = dbProducts.filter(p => p.category === 'Heat Pump');
    
    if (heatPumpType !== 'all') {
        availableModels = availableModels.filter(p => p.Refrigerant?.toLowerCase() === heatPumpType.toLowerCase());
    }
    
    // Filter for Reversible units if cooling requested
    if (includeCooling) {
        availableModels = availableModels.filter(p => p.isReversible === true);
    }

    const suitable = availableModels.filter(s => {
        // base_lhr in your DB usually maps to the capacity calculation
        const lhrOutput = (Number(s.kW_DHW_Nominal) * 860) / actualLiftC; 
        return (targetTemp <= (Number(s.max_temp_c) || 65)) && (peakLitersPerHour <= lhrOutput);
    }).sort((a, b) => (Number(a.salesPriceUSD) || 0) - (Number(b.salesPriceUSD) || 0));

    if (suitable.length === 0) return { error: "No suitable inventory found." };
    const system = suitable[0];

    // 4. Financials
    const fxRate = CONFIG.FX[currency];
    const systemCOP = Number(system.COP_DHW) || 3.8;
    const karnotDailyElecKwh = dailyThermalEnergyKWH / systemCOP;
    
    let annualKarnotCost = (systemType === 'grid-only') 
        ? (karnotDailyElecKwh * 365 * elecRate)
        : ((karnotDailyElecKwh / hoursPerDay) * Math.max(0, hoursPerDay - sunHours) * 365 * elecRate);

    let coolSavings = 0;
    if (includeCooling && system.isReversible) {
        coolSavings = (karnotDailyElecKwh * CONFIG.COOLING_COP) * 365 * elecRate;
    }

    const heatPumpCost = Number(system.salesPriceUSD) * fxRate;
    const totalAnnualSavings = (annualCostOld - annualKarnotCost) + coolSavings;

    return {
        system,
        financials: {
            symbol: CONFIG.SYMBOLS[currency],
            annualCostOld, annualKarnotCost, coolSavings, totalAnnualSavings,
            paybackYears: totalAnnualSavings > 0 ? (heatPumpCost / totalAnnualSavings).toFixed(1) : "N/A",
            capex: { total: heatPumpCost }
        },
        metrics: {
            dailyLiters,
            panels: Math.ceil((karnotDailyElecKwh / hoursPerDay) / CONFIG.SOLAR_PANEL_KW_RATED)
        }
    };
};
