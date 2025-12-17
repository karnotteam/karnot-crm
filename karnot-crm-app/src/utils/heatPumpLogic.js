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
    // EMISSION FACTORS (kg CO2 per kWh)
    EM_FACTOR: { electric: 0.7, solar: 0.12, propane: 0.23, gas: 0.20, diesel: 0.25 },
    KWH_PER_KG_LPG: 13.8, 
    DIESEL_KWH_PER_LITER: 10.7,
    COP_STANDARD: 1, 
    SOLAR_PANEL_KW_RATED: 0.425, 
    SOLAR_PANEL_COST_USD: 200, 
    INVERTER_COST_PER_WATT_USD: 0.30,
    COOLING_COP: 2.6, 
    RATED_LIFT_C: 40, // Base test lift (e.g. 15C to 55C)
    RATED_AMBIENT_C: 20 // Base test ambient temp
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

    // 2. Performance Factor (Old HTML Logic)
    // Adjusts capacity based on ambient air temp and temp lift
    const ambientAdjustment = 1 + ((inputs.ambientTemp - CONFIG.RATED_AMBIENT_C) * 0.015);
    const liftAdjustment = CONFIG.RATED_LIFT_C / actualLift;
    const performanceFactor = liftAdjustment * ambientAdjustment;

    // 3. Baseline Costs & Emissions
    let fuelKwhPrice = inputs.heatingType === 'propane' ? (inputs.fuelPrice / inputs.tankSize) / CONFIG.KWH_PER_KG_LPG :
                       inputs.heatingType === 'diesel' ? inputs.fuelPrice / CONFIG.DIESEL_KWH_PER_LITER :
                       inputs.fuelPrice;
    
    const annualCostOld = (dailyThermalEnergyKWH / CONFIG.COP_STANDARD) * 365 * fuelKwhPrice;
    const annualEmissionsOld = (dailyThermalEnergyKWH / CONFIG.COP_STANDARD) * 365 * CONFIG.EM_FACTOR[inputs.heatingType === 'electric' ? 'electric' : inputs.heatingType];

    // 4. Find Best Model
    let availableModels = dbProducts.filter(p => {
        const pwr = Number(p.kW_DHW_Nominal) || 0;
        const maxT = Number(p.max_temp_c) || 60;
        if (pwr === 0 || inputs.targetTemp > maxT) return false;
        if (inputs.heatPumpType !== 'all' && (p.Refrigerant || '').toUpperCase() !== inputs.heatPumpType.toUpperCase()) return false;
        if (inputs.includeCooling && !p.isReversible) return false;
        return pwr * ambientAdjustment >= (requiredThermalPowerKW * 0.95);
    }).sort((a, b) => Number(a.salesPriceUSD) - Number(b.salesPriceUSD));

    if (availableModels.length === 0) return { error: "No suitable model found for these conditions." };
    const system = availableModels[0];

    // 5. Financials & CO2
    const fx = CONFIG.FX[inputs.currency] || 1;
    const hpCOP = Number(system.COP_DHW) || 3.5;
    const dailyKarnotKwh = dailyThermalEnergyKWH / hpCOP;
    
    const hpCost = Number(system.salesPriceUSD) * fx;
    let annualKarnotCost = 0, solarCost = 0, invCost = 0, panels = 0, emissionsNew = 0;

    if (inputs.systemType === 'grid-only') {
        annualKarnotCost = dailyKarnotKwh * 365 * inputs.elecRate;
        emissionsNew = dailyKarnotKwh * 365 * CONFIG.EM_FACTOR.electric;
    } else {
        const sun = Number(inputs.sunHours) || 5.5;
        const solarHrs = Math.min(inputs.hoursPerDay, sun);
        const gridHrs = Math.max(0, inputs.hoursPerDay - solarHrs);
        
        annualKarnotCost = ((dailyKarnotKwh / inputs.hoursPerDay) * gridHrs) * 365 * inputs.elecRate;
        panels = Math.ceil((dailyKarnotKwh / inputs.hoursPerDay) / CONFIG.SOLAR_PANEL_KW_RATED);
        solarCost = panels * CONFIG.SOLAR_PANEL_COST_USD * fx;
        invCost = (panels * CONFIG.SOLAR_PANEL_KW_RATED * 1000 * CONFIG.INVERTER_COST_PER_WATT_USD) * fx;
        
        const solarKwh = (dailyKarnotKwh / inputs.hoursPerDay) * solarHrs * 365;
        const gridKwh = (dailyKarnotKwh / inputs.hoursPerDay) * gridHrs * 365;
        emissionsNew = (solarKwh * CONFIG.EM_FACTOR.solar) + (gridKwh * CONFIG.EM_FACTOR.electric);
    }

    // Adjusted Flow Rate (L/hr)
    const adjFlowLhr = (Number(system.kW_DHW_Nominal) * 1000 / (CONFIG.RATED_LIFT_C * 1.163)) * performanceFactor;

    const totalSavings = (annualCostOld - annualKarnotCost);
    const totalCapex = hpCost + solarCost + invCost;

    return {
        system: { n: system.name },
        metrics: { 
            dailyLiters, adjFlowLhr, panels,
            emissionsSaved: Math.max(0, annualEmissionsOld - emissionsNew)
        },
        financials: {
            symbol: CONFIG.SYMBOLS[inputs.currency],
            annualCostOld, annualKarnotCost, totalSavings,
            paybackYears: totalSavings > 1 ? (totalCapex / totalSavings).toFixed(1) : "N/A",
            capex: { heatPump: hpCost, solar: solarCost, inverter: invCost, total: totalCapex }
        }
    };
}
