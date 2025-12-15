// src/utils/heatPumpLogic.js

export const CONFIG = {
    FX: { PHP: 58.5, USD: 1, GBP: 0.79, EUR: 0.92 },
    SYMBOLS: { PHP: "₱", USD: "$", GBP: "£", EUR: "€" },
    KWH_PER_KG_LPG: 13.8, 
    DIESEL_KWH_PER_LITER: 10.7,
    COP_STANDARD: 1,
    SOLAR_PANEL_KW_RATED: 0.425, 
    SOLAR_PANEL_COST_USD: 200, 
    INVERTER_COST_PER_WATT_USD: 0.30,
    COOLING_COP: 2.6
    // Note: HEAT_PUMP_SYSTEMS is removed here because we inject it from Firebase
};

/**
 * Calculates ROI based on inputs and a list of products from the DB.
 * @param {Object} inputs - The form inputs from the UI
 * @param {Array} dbProducts - The array of products fetched from Firebase
 */
export function calculateHeatPump(inputs, dbProducts) {
    if (!dbProducts || dbProducts.length === 0) return { error: "Loading products..." };

    // 1. Determine Daily Volume
    let dailyLiters = 0;
    if (inputs.userType === 'home') dailyLiters = inputs.occupants * 50;
    else if (inputs.userType === 'restaurant') dailyLiters = inputs.mealsPerDay * 7;
    else if (inputs.userType === 'resort') dailyLiters = (inputs.roomsOccupied * 50) + (inputs.mealsPerDay * 7);
    else dailyLiters = inputs.dailyLitersInput;

    if (dailyLiters <= 0) return { error: "Please enter valid demand inputs." };

    // 2. Physics: Calculate Energy Required (kWh)
    const kwhPerLiter = ((inputs.targetTemp - inputs.inletTemp) * 1.163) / 1000;
    const dailyThermalEnergyKWH = dailyLiters * kwhPerLiter;

    // 3. Baseline Cost (Old System)
    let currentRateKWH = 0;
    if (inputs.heatingType === 'propane') {
        currentRateKWH = (inputs.fuelPrice / inputs.tankSize) / CONFIG.KWH_PER_KG_LPG;
    } else if (inputs.heatingType === 'diesel') {
        currentRateKWH = inputs.fuelPrice / CONFIG.DIESEL_KWH_PER_LITER;
    } else {
        currentRateKWH = inputs.fuelPrice; 
    }
    const annualCostOld = (dailyThermalEnergyKWH / CONFIG.COP_STANDARD) * 365 * currentRateKWH;

    // 4. Find Best Model (Using Live DB Data)
    const actualLiftC = Math.max(1, inputs.targetTemp - inputs.inletTemp);
    const performanceFactor = (40 / actualLiftC) * (1 + ((inputs.ambientTemp - 20) * 0.015)); 
    
    // Filter DB Products
    let candidates = dbProducts.filter(m => inputs.heatPumpType === 'all' || m.type === inputs.heatPumpType);
    if (inputs.includeCooling) candidates = candidates.filter(m => m.isReversible);

    const peakLitersPerHour = dailyLiters / inputs.hoursPerDay;
    
    // Match capacity logic
    const suitable = candidates.filter(m => {
        // Handle potentially missing fields in DB data with defaults
        const baseLHR = Number(m.base_lhr) || 0;
        const maxTemp = Number(m.max_temp_c) || 60;
        const priceUSD = Number(m.priceUSD || m.salesPriceUSD || 0); // Check multiple price field names

        const adjustedLHR = baseLHR * performanceFactor;
        const adjustedDaily = m.base_daily_L ? m.base_daily_L * performanceFactor : 999999;

        // Ensure product has a price and meets capacity
        return (priceUSD > 0) && (inputs.targetTemp <= maxTemp) && (dailyLiters <= adjustedDaily) && (peakLitersPerHour <= adjustedLHR);
    });

    // Sort by Price (Cheapest First)
    suitable.sort((a, b) => {
        const priceA = Number(a.priceUSD || a.salesPriceUSD || 0);
        const priceB = Number(b.priceUSD || b.salesPriceUSD || 0);
        return priceA - priceB;
    });

    if (suitable.length === 0) return { error: "No suitable model found in inventory." };

    const selectedSystem = suitable[0];
    const fx = CONFIG.FX[inputs.currency];
    const symbol = CONFIG.SYMBOLS[inputs.currency];
    const systemPriceUSD = Number(selectedSystem.priceUSD || selectedSystem.salesPriceUSD || 0);

    // 5. New System Costs
    const heatPumpCost = systemPriceUSD * fx;
    const heatPumpCOP = Number(selectedSystem.cop) || 3.5;
    const karnotDailyElecKwh = dailyThermalEnergyKWH / heatPumpCOP;
    const powerDrawKw = karnotDailyElecKwh / inputs.hoursPerDay;
    
    let karnotAnnualCost = 0, solarCost = 0, inverterCost = 0, panelCount = 0;

    if (inputs.systemType === 'grid-only') {
        karnotAnnualCost = karnotDailyElecKwh * 365 * inputs.elecRate; 
    } else {
        const solarHours = Math.min(inputs.hoursPerDay, inputs.sunHours);
        const gridHours = Math.max(0, inputs.hoursPerDay - solarHours);
        karnotAnnualCost = (powerDrawKw * gridHours) * 365 * inputs.elecRate;
        panelCount = Math.ceil(powerDrawKw / CONFIG.SOLAR_PANEL_KW_RATED);
        solarCost = panelCount * CONFIG.SOLAR_PANEL_COST_USD * fx;
        inverterCost = (panelCount * CONFIG.SOLAR_PANEL_KW_RATED * 1000 * CONFIG.INVERTER_COST_PER_WATT_USD) * fx;
    }

    let coolSavings = 0;
    if (inputs.includeCooling && selectedSystem.isReversible) {
        const dailyCoolingKwh = (dailyThermalEnergyKWH / heatPumpCOP) * CONFIG.COOLING_COP;
        coolSavings = dailyCoolingKwh * 365 * inputs.elecRate;
    }

    const totalCapex = heatPumpCost + solarCost + inverterCost;
    const totalSavings = (annualCostOld - karnotAnnualCost) + coolSavings;
    const payback = totalSavings > 0 ? totalCapex / totalSavings : 0;

    return {
        system: selectedSystem,
        metrics: { dailyLiters, panelCount },
        financials: {
            symbol, annualCostOld, karnotAnnualCost, totalSavings, coolSavings,
            paybackYears: payback.toFixed(1),
            capex: { heatPump: heatPumpCost, solar: solarCost, inverter: inverterCost, total: totalCapex }
        }
    };
}
