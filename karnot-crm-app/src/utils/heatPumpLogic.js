/**
 * Karnot CRM - Heat Pump ROI & Sizing Logic
 * Handles thermal physics, ambient derating, and model prioritization.
 */

export const CONFIG = {
    FX: { PHP: 58.5, USD: 1, GBP: 0.79, EUR: 0.92 },
    SYMBOLS: { PHP: "₱", USD: "$", GBP: "£", EUR: "€" },
    defaultRate: {
        PHP: { grid: 12.25, lpgPrice: 950, lpgSize: 11, diesel: 60.0 },
        USD: { grid: 0.21, lpgPrice: 25, lpgSize: 9, diesel: 1.00 },
        GBP: { grid: 0.17, lpgPrice: 20, lpgSize: 13, diesel: 1.30 },
        EUR: { grid: 0.19, lpgPrice: 22, lpgSize: 11, diesel: 1.40 },
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

    // --- 1. DEMAND CALCULATIONS ---
    let dailyLiters = 0;
    if (inputs.userType === 'home') {
        dailyLiters = inputs.occupants * 50;
    } else if (inputs.userType === 'restaurant') {
        dailyLiters = inputs.mealsPerDay * 7;
    } else if (inputs.userType === 'resort') {
        dailyLiters = (inputs.roomsOccupied * 50) + (inputs.mealsPerDay * 7);
    } else {
        dailyLiters = inputs.dailyLitersInput;
    }

    if (dailyLiters <= 0) return { error: "Please enter valid demand (Liters/Day)." };

    const hoursPerDay = Math.max(1, inputs.hoursPerDay);
    const deltaT = Math.max(1, inputs.targetTemp - inputs.inletTemp);

    // Required Thermal Energy (The actual heat work needed)
    // Formula: (Liters * DeltaT * 1.163) / 1000 = kWh
    const kwhPerLiter = (deltaT * 1.163) / 1000;
    const dailyThermalEnergyKWH = dailyLiters * kwhPerLiter;
    const requiredThermalPowerKW = dailyThermalEnergyKWH / hoursPerDay;

    // --- 2. BASELINE COSTS (Current System) ---
    let rateKWH = 0;
    if (inputs.heatingType === 'propane') {
        rateKWH = (inputs.fuelPrice / (inputs.tankSize || 11)) / CONFIG.KWH_PER_KG_LPG;
    } else if (inputs.heatingType === 'diesel') {
        rateKWH = inputs.fuelPrice / CONFIG.DIESEL_KWH_PER_LITER;
    } else {
        rateKWH = inputs.fuelPrice; // Electric Grid rate
    }
    const annualCostOld = dailyThermalEnergyKWH * 365 * rateKWH;

    // --- 3. PERFORMANCE DERATING (Ambient & Lift) ---
    // Capacity drops as air gets colder or target temp gets higher
    const perfFactor = (CONFIG.RATED_LIFT_C / deltaT) * (1 + ((inputs.ambientTemp - CONFIG.RATED_AMBIENT_C) * 0.015));

    // --- 4. SELECTION LOGIC ---
    let availableModels = dbProducts.filter(p => {
        const pRefrig = (p.Refrigerant || '').toUpperCase();
        
        // Filter by technology selection (R290, R32, CO2 or All)
        if (inputs.heatPumpType !== 'all') {
            const search = inputs.heatPumpType.toUpperCase();
            if (!pRefrig.includes(search)) return false;
        }

        // Filter by reversible capability
        if (inputs.includeCooling && !p.isReversible) return false;

        // Temperature limit check
        if (inputs.targetTemp > (p.max_temp_c || 65)) return false;

        // Capacity Sizing Check
        const nominalKW = parseFloat(p.kW_DHW_Nominal) || 0;
        return requiredThermalPowerKW <= (nominalKW * perfFactor);
    });

    // Sort by Sales Price to find the "Best Price" option in the category
    availableModels.sort((a, b) => (parseFloat(a.salesPriceUSD) || 999999) - (parseFloat(b.salesPriceUSD) || 999999));

    if (availableModels.length === 0) return { error: "No suitable models found for this load/temp." };
    const system = availableModels[0];

    // --- 5. FINANCIAL & ROI OUTPUTS ---
    const fx = CONFIG.FX[inputs.currency] || 1;
    const sysPriceLocal = (parseFloat(system.salesPriceUSD) || 0) * fx;
    const sysCop = parseFloat(system.COP_DHW) || 3.8;
    
    const karnotDailyKwh = dailyThermalEnergyKWH / sysCop;
    const karnotPowerDrawKw = karnotDailyKwh / hoursPerDay;
    
    let karnotAnnualCost = 0, solarCost = 0, inverterCost = 0, panelCount = 0;
    
    if (inputs.systemType === 'grid-only') {
        karnotAnnualCost = karnotDailyKwh * 365 * inputs.elecRate;
    } else {
        const sunHours = inputs.sunHours || 5.5;
        const gridHours = Math.max(0, hoursPerDay - sunHours);
        karnotAnnualCost = (karnotPowerDrawKw * gridHours) * 365 * inputs.elecRate;
        
        // Solar Sizing
        panelCount = Math.ceil(karnotPowerDrawKw / CONFIG.SOLAR_PANEL_KW_RATED);
        solarCost = panelCount * CONFIG.SOLAR_PANEL_COST_USD * fx;
        inverterCost = (panelCount * CONFIG.SOLAR_PANEL_KW_RATED * 1000 * CONFIG.INVERTER_COST_PER_WATT_USD) * fx;
    }

    const coolSavings = (inputs.includeCooling) ? (karnotDailyKwh * CONFIG.COOLING_COP * 365 * inputs.elecRate) : 0;
    const totalCapex = sysPriceLocal + solarCost + inverterCost;
    const totalSavings = (annualCostOld - karnotAnnualCost) + coolSavings;

    return {
        system: { 
            n: system.name, 
            id: system.id, 
            refrig: system.Refrigerant,
            cop: sysCop
        },
        metrics: { 
            dailyLiters: Math.round(dailyLiters), 
            powerKW: karnotPowerDrawKw.toFixed(2), 
            panelCount, 
            co2Saved: (dailyThermalEnergyKWH * 365 * 0.5).toFixed(0) 
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
