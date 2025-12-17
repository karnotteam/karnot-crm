export const CONFIG = {
    FX: { PHP: 58.5, USD: 1, GBP: 0.79, EUR: 0.92 },
    SYMBOLS: { PHP: "₱", USD: "$", GBP: "£", EUR: "€" },
    defaultRate: {
        PHP: { grid: 12.25, lpgPrice: 950, lpgSize: 11, gas: 7.0, diesel: 60.0 },
        USD: { grid: 0.21, lpgPrice: 25, lpgSize: 9, gas: 0.05, diesel: 1.00 },
        GBP: { grid: 0.17, lpgPrice: 20, lpgSize: 13, gas: 0.07, diesel: 1.30 },
        EUR: { grid: 0.19, lpgPrice: 22, lpgSize: 11, gas: 0.11, diesel: 1.40 },
    },
    EM_FACTOR: { electric: 0.7, solar: 0.12, propane: 0.23, gas: 0.20, diesel: 0.25 },
    KWH_PER_KG_LPG: 13.8, 
    DIESEL_KWH_PER_LITER: 10.7,
    COP_STANDARD_HEATING: 1, 
    COP_STANDARD_AC: 2.1, // Baseline for old AC units
    SOLAR_PANEL_KW_RATED: 0.425, 
    SOLAR_PANEL_COST_USD: 200, 
    INVERTER_COST_PER_WATT_USD: 0.30,
    RATED_LIFT_C: 40,
    RATED_AMBIENT_C: 20
};

export function calculateHeatPump(inputs, dbProducts) {
    if (!dbProducts || dbProducts.length === 0) return { error: "No products loaded." };

    // 1. Demand & Power
    let dailyLiters = inputs.userType === 'home' ? inputs.occupants * 50 :
                      inputs.userType === 'restaurant' ? inputs.mealsPerDay * 7 :
                      inputs.userType === 'resort' ? (inputs.roomsOccupied * 50) + (inputs.mealsPerDay * 7) :
                      inputs.dailyLitersInput;

    const actualLift = Math.max(1, inputs.targetTemp - inputs.inletTemp);
    const kwhPerLiter = (actualLift * 1.163) / 1000;
    const dailyThermalEnergyKWH = dailyLiters * kwhPerLiter;
    const requiredThermalPowerKW = dailyThermalEnergyKWH / Math.max(1, inputs.hoursPerDay);

    // 2. Adjustments
    const ambientAdjustment = 1 + ((inputs.ambientTemp - CONFIG.RATED_AMBIENT_C) * 0.015);
    const fx = CONFIG.FX[inputs.currency] || 1;

    // 3. Baseline Heating
    let fuelKwhPrice = inputs.heatingType === 'propane' ? (inputs.fuelPrice / inputs.tankSize) / CONFIG.KWH_PER_KG_LPG :
                       inputs.heatingType === 'diesel' ? inputs.fuelPrice / CONFIG.DIESEL_KWH_PER_LITER :
                       inputs.fuelPrice;
    const annualHeatingCostOld = (dailyThermalEnergyKWH / CONFIG.COP_STANDARD_HEATING) * 365 * fuelKwhPrice;

    // 4. Filtering (Best Price + Refrigerant Type)
    let availableModels = dbProducts.filter(p => {
        const pwr = Number(p.kW_DHW_Nominal) || 0;
        const maxT = Number(p.max_temp_c) || 60;
        
        // Match Refrigerant (R290, CO2, R32, or All)
        const refMatch = inputs.heatPumpType === 'all' || 
                        (p.Refrigerant && p.Refrigerant.toUpperCase().includes(inputs.heatPumpType.toUpperCase()));
        
        // If user wants "Best Price", we effectively ignore refrigerant type in filter but sort later
        const filterType = inputs.selectionMode === 'best-price' ? true : refMatch;

        if (pwr === 0 || inputs.targetTemp > maxT) return false;
        if (inputs.includeCooling && !p.isReversible) return false;
        
        return filterType && (pwr * ambientAdjustment >= (requiredThermalPowerKW * 0.95));
    }).sort((a, b) => Number(a.salesPriceUSD) - Number(b.salesPriceUSD));

    if (availableModels.length === 0) return { error: "No suitable model found. Try reducing Target Temp or changing Refrigerant type." };
    
    const system = availableModels[0];

    // 5. Cooling Calculations (The "Lost" Feature)
    let coolingSavings = 0;
    if (inputs.includeCooling && system.isReversible) {
        const coolingLoadKwhDaily = inputs.coolingLoadKW * inputs.coolingHours;
        const oldACCost = (coolingLoadKwhDaily / CONFIG.COP_STANDARD_AC) * 365 * inputs.elecRate;
        const newCoolingCost = (coolingLoadKwhDaily / (Number(system.COP_Cooling) || 3.0)) * 365 * inputs.elecRate;
        coolingSavings = Math.max(0, oldACCost - newCoolingCost);
    }

    // 6. Final Financials
    const hpCOP = Number(system.COP_DHW) || 3.5;
    const dailyKarnotKwh = dailyThermalEnergyKWH / hpCOP;
    const hpCost = Number(system.salesPriceUSD) * fx;
    
    let annualKarnotHeatingCost = dailyKarnotKwh * 365 * inputs.elecRate;
    let solarCost = 0, panels = 0;

    if (inputs.systemType === 'hybrid-solar') {
        const sun = Number(inputs.sunHours) || 5.5;
        const solarFraction = Math.min(1, sun / inputs.hoursPerDay);
        annualKarnotHeatingCost *= (1 - solarFraction);
        panels = Math.ceil((dailyKarnotKwh / inputs.hoursPerDay) / CONFIG.SOLAR_PANEL_KW_RATED);
        solarCost = panels * CONFIG.SOLAR_PANEL_COST_USD * fx;
    }

    const totalSavings = (annualHeatingCostOld - annualKarnotHeatingCost) + coolingSavings;
    const totalCapex = hpCost + solarCost;

    return {
        system: { 
            name: system.name, 
            refrigerant: system.Refrigerant,
            isReversible: system.isReversible 
        },
        financials: {
            symbol: CONFIG.SYMBOLS[inputs.currency],
            totalSavings,
            coolingSavings,
            heatingSavings: (annualHeatingCostOld - annualKarnotHeatingCost),
            paybackYears: totalSavings > 10 ? (totalCapex / totalSavings).toFixed(1) : "N/A",
            capex: { heatPump: hpCost, solar: solarCost, total: totalCapex }
        }
    };
}
