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

const extractTankLiters = (name) => {
    if (!name) return 0;
    const match = name.match(/(\d+)\s*L\b/i);
    return match ? parseInt(match[1], 10) : 0;
};

export function calculateHeatPump(inputs, dbProducts) {
    if (!dbProducts || dbProducts.length === 0) return { error: "No products loaded." };

    // --- 1. DEMAND ---
    let dailyLiters = inputs.userType === 'home' ? 150 : inputs.dailyLitersInput;
    const deltaT = inputs.targetTemp - inputs.inletTemp;
    const thermalKWH = (dailyLiters * deltaT * CONFIG.WATER_SPECIFIC_HEAT) / 1000;
    const requiredKW = thermalKWH / Math.max(1, inputs.hoursPerDay);

    // --- 2. MATCHING ---
    const matches = dbProducts.filter(p => {
        const power = Number(p.kW_DHW_Nominal) || 0;
        const price = Number(p.salesPriceUSD) || 0;
        if (power === 0 || price === 0) return false;

        if (inputs.heatPumpType !== 'all') {
            const pRef = (p.Refrigerant || '').toUpperCase();
            const reqRef = inputs.heatPumpType.toUpperCase();
            if (reqRef === 'R744' && !(pRef === 'R744' || pRef === 'CO2')) return false;
            if (reqRef !== 'R744' && pRef !== reqRef) return false;
        }
        return power >= (requiredKW * 0.95);
    }).sort((a, b) => Number(a.salesPriceUSD) - Number(b.salesPriceUSD));

    if (matches.length === 0) return { error: `No ${inputs.heatPumpType} model found for ${requiredKW.toFixed(1)}kW load.` };

    const system = matches[0];
    const tankSize = extractTankLiters(system.name) || (inputs.userType === 'home' ? 150 : 0);
    const fxRate = CONFIG.FX[inputs.currency] || 1;

    // --- 3. PERFORMANCE & WARMUP ---
    const warmup = (tankSize * deltaT * CONFIG.WATER_SPECIFIC_HEAT) / (Number(system.kW_DHW_Nominal) * 1000);
    const hpCOP = Number(system.COP_DHW) || 3.5;
    const dailyElecKwh = thermalKWH / hpCOP;
    const avgDrawKW = dailyElecKwh / inputs.hoursPerDay;

    // --- 4. SOLAR & COSTS ---
    let annualElecCost = 0, solarCost = 0, inverterCost = 0, panelCount = 0;
    if (inputs.systemType === 'grid-only') {
        annualElecCost = dailyElecKwh * 365 * inputs.elecRate;
    } else {
        const sunHours = Number(inputs.sunHours) || 5.5;
        const gridHours = Math.max(0, inputs.hoursPerDay - sunHours);
        annualElecCost = (avgDrawKW * gridHours) * 365 * inputs.elecRate;
        panelCount = Math.ceil(avgDrawKW / CONFIG.SOLAR_PANEL_KW_RATED);
        solarCost = panelCount * CONFIG.SOLAR_PANEL_COST_USD * fxRate;
        inverterCost = (panelCount * CONFIG.SOLAR_PANEL_KW_RATED * 1000 * CONFIG.INVERTER_COST_PER_WATT_USD) * fxRate;
    }

    const annualOld = (thermalKWH / CONFIG.COP_STANDARD) * 365 * inputs.fuelPrice;
    const hpCost = Number(system.salesPriceUSD) * fxRate;
    const totalCapex = hpCost + solarCost + inverterCost;
    const savings = annualOld - annualElecCost;

    return {
        system: { n: system.name, ref: system.Refrigerant, tankSize },
        metrics: { warmupTime: warmup.toFixed(1), requiredKW: requiredKW.toFixed(1), panelCount },
        financials: {
            symbol: CONFIG.SYMBOLS[inputs.currency],
            annualCostOld: annualOld,
            karnotAnnualCost: annualElecCost,
            totalSavings: savings,
            paybackYears: savings > 0 ? (totalCapex / savings).toFixed(1) : "N/A",
            capex: { total: totalCapex, heatPump: hpCost, solar: solarCost, inverter: inverterCost }
        }
    };
}
