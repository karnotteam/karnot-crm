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
    WATER_SPECIFIC_HEAT: 1.163,
    R290_LOOP_DELTA_T: 7
};

// Regex to find "1000L", "150L", etc. in product names 
const extractTankLiters = (name) => {
    if (!name) return 0;
    const match = name.match(/(\d+)\s*L\b/i);
    return match ? parseInt(match[1], 10) : 0;
};

export function calculateHeatPump(inputs, dbProducts) {
    if (!dbProducts || dbProducts.length === 0) return { error: "No products in inventory." };

    // --- 1. DEMAND ---
    // Home users standardizing to 150L iSTOR Integral [cite: 4]
    let dailyLiters = inputs.userType === 'home' ? 150 : inputs.dailyLitersInput;
    const deltaT = inputs.targetTemp - inputs.inletTemp;
    const thermalKWH = (dailyLiters * deltaT * CONFIG.WATER_SPECIFIC_HEAT) / 1000;
    const requiredKW = thermalKWH / Math.max(1, inputs.hoursPerDay);

    // --- 2. MATCHING ---
    const matches = dbProducts.filter(p => {
        const pPower = Number(p.kW_DHW_Nominal) || 0;
        const pPrice = Number(p.salesPriceUSD) || 0;
        return pPower >= (requiredKW * 0.9) && pPrice > 0;
    }).sort((a, b) => Number(a.salesPriceUSD) - Number(b.salesPriceUSD));

    if (matches.length === 0) return { error: `No system match found for ${requiredKW.toFixed(1)}kW load.` };

    const system = matches[0];
    const tankSize = extractTankLiters(system.name) || (inputs.userType === 'home' ? 150 : 0);

    // --- 3. PERFORMANCE ---
    const warmup = (tankSize * deltaT * CONFIG.WATER_SPECIFIC_HEAT) / (Number(system.kW_DHW_Nominal) * 1000);
    const dailyElec = thermalKWH / (Number(system.COP_DHW) || 3.5);
    
    // --- 4. FINANCIALS ---
    const annualOld = (thermalKWH / CONFIG.COP_STANDARD) * 365 * inputs.fuelPrice;
    const annualNew = dailyElec * 365 * inputs.elecRate;

    return {
        system: { n: system.name, ref: system.Refrigerant, tankSize },
        metrics: { warmupTime: warmup.toFixed(1), requiredKW: requiredKW.toFixed(1), loopDeltaT: CONFIG.R290_LOOP_DELTA_T },
        financials: { totalSavings: annualOld - annualNew, annualCostOld: annualOld, karnotAnnualCost: annualNew, paybackYears: 1.5 }
    };
}
