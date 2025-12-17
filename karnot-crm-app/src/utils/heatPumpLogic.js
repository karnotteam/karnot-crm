export const CONFIG = {
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
    SOLAR_PANEL_COST_USD: 200,
    INVERTER_COST_PER_WATT_USD: 0.30,
    EM_FACTOR: { electric: 0.7, propane: 0.23, gas: 0.20, diesel: 0.25 }
};

export const calculateHeatPump = (inputs, products = []) => {
    try {
        const { 
            userType, occupants, dailyLitersInput, mealsPerDay, roomsOccupied, 
            hoursPerDay, heatingType, fuelPrice, lpgSize, elecRate, 
            ambientTemp, inletTemp, targetTemp, systemType, sunHours,
            heatPumpType, includeCooling, currency 
        } = inputs;

        // 1. Calculate Daily Liters
        let dailyLiters = 0;
        if (userType === 'home') dailyLiters = occupants * 50;
        else if (userType === 'restaurant') dailyLiters = mealsPerDay * 7;
        else if (userType === 'resort') dailyLiters = (roomsOccupied * 50) + (mealsPerDay * 7);
        else dailyLiters = dailyLitersInput;

        if (dailyLiters <= 0) throw new Error("Please enter valid demand inputs.");

        // 2. Baseline Energy
        const kwhPerLiter = ((targetTemp - inletTemp) * 1.163) / 1000;
        const dailyThermalEnergyKWH = dailyLiters * kwhPerLiter;

        let currentRateKWH = fuelPrice;
        if (heatingType === 'propane') currentRateKWH = (fuelPrice / (lpgSize || 11)) / 13.8;
        else if (heatingType === 'diesel') currentRateKWH = fuelPrice / 10.7;
        
        const annualCostOld = dailyThermalEnergyKWH * 365 * currentRateKWH;

        // 3. Model Performance & Filtering
        const actualLiftC = Math.max(1, targetTemp - inletTemp);
        const performanceFactor = (CONFIG.RATED_LIFT_C / actualLiftC) * (1 + ((ambientTemp - CONFIG.RATED_AMBIENT_C) * 0.015));
        const peakLitersPerHour = dailyLiters / hoursPerDay;

        let availableModels = products.filter(p => {
            const matchesType = heatPumpType === 'all' || p.type?.toLowerCase() === heatPumpType.toLowerCase();
            const matchesCooling = !includeCooling || p.isReversible === true;
            const canReachTemp = targetTemp <= (p.max_temp_c || 60);
            const canHandleFlow = peakLitersPerHour <= ((p.base_lhr || 0) * performanceFactor);
            return matchesType && matchesCooling && canReachTemp && canHandleFlow;
        });

        if (availableModels.length === 0) throw new Error("No suitable models found for these requirements.");
        
        // Sort by price (SalesPriceUSD)
        const system = availableModels.sort((a, b) => a.salesPriceUSD - b.salesPriceUSD)[0];

        // 4. Karnot Operation Costs
        const heatPumpCOP = system.COP_DHW || 3.8;
        const karnotDailyElecKwh = dailyThermalEnergyKWH / heatPumpCOP;
        const karnotPowerDrawKw = (dailyThermalEnergyKWH / heatPumpCOP) / hoursPerDay;
        
        let annualKarnotCost = 0;
        let panels = 0;
        let solarCapexUSD = 0;

        if (systemType === 'grid-only') {
            annualKarnotCost = karnotDailyElecKwh * 365 * elecRate;
        } else {
            const solarPoweredHours = Math.min(hoursPerDay, sunHours || 5.5);
            const gridPoweredHours = Math.max(0, hoursPerDay - solarPoweredHours);
            annualKarnotCost = (karnotPowerDrawKw * gridPoweredHours) * 365 * elecRate;
            
            panels = Math.ceil(karnotPowerDrawKw / CONFIG.SOLAR_PANEL_KW_RATED);
            solarCapexUSD = (panels * CONFIG.SOLAR_PANEL_COST_USD) + 
                             (panels * CONFIG.SOLAR_PANEL_KW_RATED * 1000 * CONFIG.INVERTER_COST_PER_WATT_USD);
        }

        // 5. Cooling Savings
        let coolSavings = 0;
        if (includeCooling && system.isReversible) {
            const dailyCoolingKwh = (dailyThermalEnergyKWH / heatPumpCOP) * CONFIG.COOLING_COP;
            coolSavings = dailyCoolingKwh * 365 * elecRate;
        }

        const totalSavings = (annualCostOld - annualKarnotCost) + coolSavings;
        const fx = currency === 'PHP' ? 58.5 : 1; // Simplification or use a state-based FX
        const totalCapexLocal = (system.salesPriceUSD + solarCapexUSD) * fx;

        return {
            system,
            financials: {
                symbol: CONFIG.SYMBOLS[currency],
                annualCostOld,
                annualKarnotCost,
                coolSavings,
                totalSavings,
                paybackYears: totalSavings > 0 ? (totalCapexLocal / totalSavings).toFixed(1) : "N/A",
                capex: { total: totalCapexLocal }
            },
            metrics: {
                adjFlowLhr: (system.base_lhr || 0) * performanceFactor,
                emissionsSaved: (dailyThermalEnergyKWH * 365 * CONFIG.EM_FACTOR[heatingType || 'electric']),
                panels
            }
        };
    } catch (e) {
        return { error: e.message };
    }
};
