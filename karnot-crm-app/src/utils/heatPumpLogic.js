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

    // --- 1. DEMAND CALCULATIONS (Full Restaurant & Resort Logic) ---
    let dailyLiters = 0;
    const type = inputs.userType;
    
    if (type === 'home') {
        dailyLiters = (parseFloat(inputs.occupants) || 0) * 50;
    } else if (type === 'restaurant') {
        // Industry standard: 7 Liters of hot water per meal served
        dailyLiters = (parseFloat(inputs.mealsPerDay) || 0) * 7;
    } else if (type === 'resort') {
        // Combination of guest rooms (50L) and meals (7L)
        dailyLiters = ((parseFloat(inputs.roomsOccupied) || 0) * 50) + ((parseFloat(inputs.mealsPerDay) || 0) * 7);
    } else {
        dailyLiters = parseFloat(inputs.dailyLitersInput) || 0;
    }

    if (dailyLiters <= 0) return { error: "Please enter valid demand (Liters/Day)." };

    const hoursPerDay = Math.max(1, parseFloat(inputs.hoursPerDay) || 12);
    const deltaT = Math.max(1, (parseFloat(inputs.targetTemp) || 55) - (parseFloat(inputs.inletTemp) || 15));

    // Required Thermal Energy (The actual heat work needed in kWh)
    const kwhPerLiter = (deltaT * 1.163) / 1000;
    const dailyThermalEnergyKWH = dailyLiters * kwhPerLiter;
    const requiredThermalPowerKW = dailyThermalEnergyKWH / hoursPerDay;

    // --- 2. BASELINE COSTS (LPG, Diesel, and Electric Grid) ---
    let currentRateKWH = 0;
    if (inputs.heatingType === 'propane') {
        // Math: (Price per Tank / kg per Tank) / Energy density of LPG
        const pricePerKg = (parseFloat(inputs.fuelPrice) || 950) / (parseFloat(inputs.tankSize) || 11);
        currentRateKWH = pricePerKg / CONFIG.KWH_PER_KG_LPG;
    } else if (inputs.heatingType === 'diesel') {
        // Math: Price per Liter / Energy density of Diesel
        currentRateKWH = (parseFloat(inputs.fuelPrice) || 60) / CONFIG.DIESEL_KWH_PER_LITER;
    } else {
        // Standard Grid Rate
        currentRateKWH = parseFloat(inputs.elecRate) || 12.25;
    }
    const annualCostOld = dailyThermalEnergyKWH * 365 * currentRateKWH;

    // --- 3. PERFORMANCE FACTOR (Derating based on environment) ---
    // Sizing factor: Boosts or cuts HP capacity based on lift and air temp
    const ambient = parseFloat(inputs.ambientTemp) || 30;
    const performanceFactor = (CONFIG.RATED_LIFT_C / deltaT) * (1 + ((ambient - CONFIG.RATED_AMBIENT_C) * 0.015));

    // --- 4. SELECTION LOGIC (R32, R290, CO2 Priority) ---
    let availableModels = dbProducts.filter(p => {
        const pRefrig = (p.Refrigerant || '').toUpperCase();
        
        // Technology Filter
        if (inputs.heatPumpType !== 'all') {
            const search = inputs.heatPumpType.toUpperCase();
            if (!pRefrig.includes(search)) return false;
        }

        // Feature Filters
        if (inputs.includeCooling && !p.isReversible) return false;
        if (parseFloat(inputs.targetTemp) > (p.max_temp_c || 65)) return false;

        // Sizing Filter: Nominal kW vs Environmental Adjusted Load
        const nominalKW = parseFloat(p.kW_DHW_Nominal) || 0;
        return requiredThermalPowerKW <= (nominalKW * performanceFactor);
    });

    // Sort by Price (Cheapest model that fits the load comes first)
    availableModels.sort((a, b) => (parseFloat(a.salesPriceUSD) || 0) - (parseFloat(b.salesPriceUSD) || 0));

    if (availableModels.length === 0) return { error: "No suitable models found for this load/temp." };
    const system = availableModels[0];

    // --- 5. FINANCIALS, SOLAR & SAVINGS ---
    const fx = CONFIG.FX[inputs.currency] || 1;
    const sysPriceLocal = (parseFloat(system.salesPriceUSD) || 0) * fx;
    const sysCop = parseFloat(system.COP_DHW) || 3.8;
    
    const karnotDailyKwh = dailyThermalEnergyKWH / sysCop;
    const karnotPowerDrawKw = karnotDailyKwh / hoursPerDay;
    
    let karnotAnnualCost = 0, solarCost = 0, inverterCost = 0, panelCount = 0;
    
    if (inputs.systemType === 'grid-only') {
        karnotAnnualCost = karnotDailyKwh * 365 * (parseFloat(inputs.elecRate) || 12.25);
    } else {
        // Grid + Solar Logic
        const sunHours = parseFloat(inputs.sunHours) || 5.5;
        const gridHours = Math.max(0, hoursPerDay - sunHours);
        karnotAnnualCost = (karnotPowerDrawKw * gridHours) * 365 * (parseFloat(inputs.elecRate) || 12.25);
        
        // Solar Sizing
        panelCount = Math.ceil(karnotPowerDrawKw / CONFIG.SOLAR_PANEL_KW_RATED);
        solarCost = panelCount * CONFIG.SOLAR_PANEL_COST_USD * fx;
        inverterCost = (panelCount * CONFIG.SOLAR_PANEL_KW_RATED * 1000 * CONFIG.INVERTER_COST_PER_WATT_USD) * fx;
    }

    // Free Cooling Bonus Math
    const coolSavings = (inputs.includeCooling) ? (karnotDailyKwh * CONFIG.COOLING_COP * 365 * (parseFloat(inputs.elecRate) || 12.25)) : 0;
    
    const totalCapex = sysPriceLocal + solarCost + inverterCost;
    const totalSavings = (annualCostOld - karnotAnnualCost) + coolSavings;

    return {
        system: { 
            n: system.name, 
            refrig: system.Refrigerant,
            cop: sysCop
        },
        metrics: { 
            dailyLiters: Math.round(dailyLiters), 
            powerKW: karnotPowerDrawKw.toFixed(2), 
            panelCount, 
            co2Saved: (dailyThermalEnergyKWH * 365 * 0.52).toFixed(0) // Carbon offset logic
        },
        financials: {
            symbol: CONFIG.SYMBOLS[inputs.currency],
            annualCostOld,
            karnotAnnualCost,
            coolSavings,
            totalSavings,
            paybackYears: totalSavings > 0 ? (totalCapex / totalSavings).toFixed(1) : "N/A",
            capex: { system: sysPriceLocal, solar: solarCost, inverter: inverterCost, total: totalCapex }
        }
    };
}
