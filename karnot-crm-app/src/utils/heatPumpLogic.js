// src/utils/heatPumpLogic.js

export const CONFIG = {
    FX: { PHP: 58.5, USD: 1, GBP: 0.79, EUR: 0.92 },
    SYMBOLS: { PHP: "₱", USD: "$", GBP: "£", EUR: "€" },
    defaultRate: {
        PHP: { grid: 12.25, lpgPrice: 950, lpgSize: 11, gas: 7.0, diesel: 60.0 },
        USD: { grid: 0.21, lpgPrice: 25, lpgSize: 9, gas: 0.05, diesel: 1.00 },
    },
    KWH_PER_KG_LPG: 13.8, 
    DIESEL_KWH_PER_LITER: 10.7,
    COP_STANDARD: 1,
    SOLAR_PANEL_KW_RATED: 0.425, 
    COOLING_COP: 2.6, // Re-integrated from your HTML tool
    RATED_AMBIENT_C: 20, 
    RATED_LIFT_C: 40,
};

export function calculateHeatPump(inputs, dbProducts) {
    if (!dbProducts || dbProducts.length === 0) return { error: "Syncing inventory..." };

    const { 
        currency, heatingType, userType, systemType, heatPumpType, fuelPrice, tankSize,
        elecRate, occupants, dailyLitersInput, mealsPerDay, roomsOccupied,
        hoursPerDay, ambientTemp, inletTemp, targetTemp, sunHours, includeCooling 
    } = inputs;

    // 1. Demand Calculation (HTML logic restored)
    let dailyLiters = 0;
    if(userType === 'home') dailyLiters = occupants * 50;
    else if (userType === 'restaurant') dailyLiters = mealsPerDay * 7;
    else if (userType === 'resort') dailyLiters = (roomsOccupied * 50) + (mealsPerDay * 7);
    else dailyLiters = dailyLitersInput;

    if (dailyLiters <= 0) return { error: "Please enter demand values." };

    // 2. Energy Demand & Baseline Cost
    const deltaT = targetTemp - inletTemp;
    const kwhPerLiter = (deltaT * 1.163) / 1000;
    const dailyThermalEnergyKWH = dailyLiters * kwhPerLiter;
    const requiredThermalPowerKW = dailyThermalEnergyKWH / hoursPerDay;

    let currentRateKWH = fuelPrice;
    if (heatingType === 'propane') currentRateKWH = (fuelPrice / tankSize) / CONFIG.KWH_PER_KG_LPG;
    else if (heatingType === 'diesel') currentRateKWH = fuelPrice / CONFIG.DIESEL_KWH_PER_LITER;
    
    const annualCostOld = (dailyThermalEnergyKWH / CONFIG.COP_STANDARD) * 365 * currentRateKWH;

    // 3. System Selection (PULLING FROM PRODUCT MANAGER FIELDS)
    const actualLiftC = Math.max(1, deltaT);
    const performanceFactor = (CONFIG.RATED_LIFT_C / actualLiftC) * (1 + ((ambientTemp - CONFIG.RATED_AMBIENT_C) * 0.015));
    const peakLitersPerHour = dailyLiters / hoursPerDay;

    let availableModels = dbProducts.filter(p => p.category === 'Heat Pump');
    
    if (heatPumpType !== 'all') {
        availableModels = availableModels.filter(p => p.Refrigerant?.toLowerCase() === heatPumpType.toLowerCase());
    }
    if (includeCooling) {
        availableModels = availableModels.filter(p => p.isReversible === true);
    }

    const suitable = availableModels.filter(s => {
        const lhrOutput = (Number(s.kW_DHW_Nominal) * 860) / actualLiftC; 
        return (targetTemp <= (Number(s.max_temp_c) || 65)) && (peakLitersPerHour <= lhrOutput);
    }).sort((a, b) => (Number(a.salesPriceUSD) || 0) - (Number(b.salesPriceUSD) || 0));

    if (suitable.length === 0) return { error: "No matching inventory found in Product Manager." };
    const system = suitable[0];

    // 4. ROI Financials
    const fxRate = CONFIG.FX[currency];
    const systemCOP = Number(system.COP_DHW) || 3.8;
    const karnotDailyElecKwh = dailyThermalEnergyKWH / systemCOP;
    const karnotPowerDrawKw = karnotDailyElecKwh / hoursPerDay;
    
    let annualKarnotCost = (systemType === 'grid-only') 
        ? (karnotDailyElecKwh * 365 * elecRate)
        : (karnotPowerDrawKw * Math.max(0, hoursPerDay - sunHours) * 365 * elecRate);

    // 5. FREE COOLING MATH
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
            adjFlowLhr: (Number(system.kW_DHW_Nominal) * 860) / actualLiftC,
            emissionsSaved: (dailyThermalEnergyKWH * 365 * 0.5),
            panelCount: Math.ceil(karnotPowerDrawKw / CONFIG.SOLAR_PANEL_KW_RATED)
        }
    };
}
