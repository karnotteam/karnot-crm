export const CONFIG = {
    FX: { PHP: 58.5, USD: 1, GBP: 0.79, EUR: 0.92 },
    SYMBOLS: { PHP: "₱", USD: "$", GBP: "£", EUR: "€" },
    EM_FACTOR: { electric: 0.7, solar: 0.12, propane: 0.23, gas: 0.20, diesel: 0.25 },
    KWH_PER_KG_LPG: 13.8, 
    DIESEL_KWH_PER_LITER: 10.7,
    COP_STANDARD_HEATING: 1, 
    COP_STANDARD_AC: 2.1, 
    SOLAR_PANEL_KW_RATED: 0.425, 
    SOLAR_PANEL_COST_USD: 200, 
    RATED_LIFT_C: 40,
    RATED_AMBIENT_C: 20
};

export function calculateHeatPump(inputs, dbProducts) {
    if (!dbProducts || dbProducts.length === 0) return { error: "No products loaded." };

    // 1. Demand Calculation
    let dailyLiters = inputs.userType === 'home' ? inputs.occupants * 50 :
                      inputs.userType === 'restaurant' ? inputs.mealsPerDay * 7 :
                      inputs.userType === 'resort' ? (inputs.roomsOccupied * 50) + (inputs.mealsPerDay * 7) :
                      Number(inputs.dailyLitersInput);

    const actualLift = Math.max(1, inputs.targetTemp - inputs.inletTemp);
    const dailyThermalEnergyKWH = (dailyLiters * actualLift * 1.163) / 1000;
    const requiredThermalPowerKW = dailyThermalEnergyKWH / Math.max(1, inputs.hoursPerDay);

    // 2. Performance Adjustment
    const ambientAdjustment = 1 + ((inputs.ambientTemp - CONFIG.RATED_AMBIENT_C) * 0.015);
    const fx = CONFIG.FX[inputs.currency] || 1;

    // 3. Baseline Comparison (Old System)
    let fuelKwhPrice = inputs.heatingType === 'propane' ? (inputs.fuelPrice / inputs.tankSize) / CONFIG.KWH_PER_KG_LPG :
                       inputs.heatingType === 'diesel' ? inputs.fuelPrice / CONFIG.DIESEL_KWH_PER_LITER :
                       inputs.fuelPrice;
    const annualCostOldHeating = (dailyThermalEnergyKWH / CONFIG.COP_STANDARD_HEATING) * 365 * fuelKwhPrice;

    // 4. Database Search & Refrigerant Filtering
    let availableModels = dbProducts.filter(p => {
        const pwr = Number(p.kW_DHW_Nominal) || 0;
        const maxT = Number(p.max_temp_c) || 60;
        
        // Match Refrigerant Type
        const refMatch = inputs.heatPumpType === 'all' || 
                        (p.Refrigerant && p.Refrigerant.toUpperCase().includes(inputs.heatPumpType.toUpperCase()));

        if (pwr === 0 || inputs.targetTemp > maxT) return false;
        if (inputs.includeCooling && !p.isReversible) return false;
        
        return refMatch && (pwr * ambientAdjustment >= (requiredThermalPowerKW * 0.95));
    }).sort((a, b) => Number(a.salesPriceUSD) - Number(b.salesPriceUSD));

    if (availableModels.length === 0) return { error: "No suitable model found." };
    const system = availableModels[0];

    // 5. Cooling Savings Calculation
    let coolingSavings = 0;
    if (inputs.includeCooling && system.isReversible) {
        const dailyCoolingKwh = Number(inputs.coolingLoadKW) * Number(inputs.coolingHours);
        const oldACCost = (dailyCoolingKwh / CONFIG.COP_STANDARD_AC) * 365 * inputs.elecRate;
        const newCoolingCost = (dailyCoolingKwh / (Number(system.COP_Cooling) || 3.0)) * 365 * inputs.elecRate;
        coolingSavings = Math.max(0, oldACCost - newCoolingCost);
    }

    // 6. Final Financials
    const hpCOP = Number(system.COP_DHW) || 3.5;
    const dailyKarnotKwh = dailyThermalEnergyKWH / hpCOP;
    const hpCost = Number(system.salesPriceUSD) * fx;
    
    let annualKarnotHeatingCost = dailyKarnotKwh * 365 * inputs.elecRate;
    let solarCost = 0, panels = 0;

    if (inputs.systemType === 'hybrid-solar') {
        const solarFraction = Math.min(1, (Number(inputs.sunHours) || 5.5) / inputs.hoursPerDay);
        annualKarnotHeatingCost *= (1 - solarFraction);
        panels = Math.ceil((dailyKarnotKwh / inputs.hoursPerDay) / CONFIG.SOLAR_PANEL_KW_RATED);
        solarCost = panels * CONFIG.SOLAR_PANEL_COST_USD * fx;
    }

    const totalSavings = (annualCostOldHeating - annualKarnotHeatingCost) + coolingSavings;
    const totalCapex = hpCost + solarCost;

    return {
        system: { name: system.name, refrigerant: system.Refrigerant, power: system.kW_DHW_Nominal },
        financials: {
            symbol: CONFIG.SYMBOLS[inputs.currency],
            annualHeatingSavings: annualCostOldHeating - annualKarnotHeatingCost,
            coolingSavings,
            totalSavings,
            paybackYears: totalSavings > 10 ? (totalCapex / totalSavings).toFixed(1) : "N/A",
            capex: { heatPump: hpCost, solar: solarCost, total: totalCapex }
        }
    };
}
