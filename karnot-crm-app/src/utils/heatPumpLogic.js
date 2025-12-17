export const CONFIG = {
    SYMBOLS: { PHP: "₱", USD: "$", GBP: "£", EUR: "€" },
    defaultRate: {
        PHP: { grid: 12.25, lpgPrice: 950, lpgSize: 11, gas: 7.0, diesel: 60.0 },
        USD: { grid: 0.21, lpgPrice: 25, lpgSize: 9, gas: 0.05, diesel: 1.00 },
        GBP: { grid: 0.17, lpgPrice: 20, lpgSize: 13, gas: 0.07, diesel: 1.30 },
        EUR: { grid: 0.19, lpgPrice: 22, lpgSize: 11, gas: 0.11, diesel: 1.40 },
    },
    RATED_AMBIENT_C: 20,
    COOLING_COP: 2.6 
};

export const calculateHeatPump = (inputs, products = []) => {
    try {
        const { 
            userType, occupants, dailyLitersInput, mealsPerDay, roomsOccupied, 
            hoursPerDay, heatingType, fuelPrice, tankSize, elecRate, 
            ambientTemp, inletTemp, targetTemp, systemType, sunHours,
            heatPumpType, includeCooling, currency 
        } = inputs;

        // 1. Calculate Daily Liters (Supports all HTML tool types)
        let dailyLiters = 0;
        if (userType === 'home') dailyLiters = occupants * 50;
        else if (userType === 'restaurant') dailyLiters = mealsPerDay * 7;
        else if (userType === 'resort') dailyLiters = (roomsOccupied * 50) + (mealsPerDay * 7);
        else dailyLiters = dailyLitersInput;

        // 2. Thermodynamic Math (Delta T)
        const deltaT = Math.max(1, targetTemp - inletTemp);
        const specificHeatWater = 4.187; // kJ/kg°C
        const dailyThermalEnergyKWH = (dailyLiters * deltaT * 1.163) / 1000;

        // 3. Baseline Costs (Electric, LPG, or Diesel)
        let currentRateKWH = elecRate;
        if (heatingType === 'propane') currentRateKWH = (fuelPrice / (tankSize || 11)) / 13.8;
        else if (heatingType === 'diesel') currentRateKWH = fuelPrice / 10.7;
        const annualCostOld = dailyThermalEnergyKWH * 365 * currentRateKWH;

        // 4. Filtering with Storage Detection (AquaHERO vs Monoblock)
        const peakLitersPerHour = dailyLiters / hoursPerDay;
        const perfFactor = (1 + ((ambientTemp - CONFIG.RATED_AMBIENT_C) * 0.015));

        let availableModels = products.filter(p => {
            const pName = (p.name || '').toLowerCase();
            const pCat = (p.category || '').toLowerCase();
            const pRefrig = (p.Refrigerant || '').toLowerCase();
            
            const matchesType = heatPumpType === 'all' || pRefrig.includes(heatPumpType.toLowerCase());
            const matchesCooling = !includeCooling || p.isReversible === true;

            // AquaHERO Logic: Uses Tank Storage
            if (pCat.includes('aquahero') || pName.includes('aquahero')) {
                let storageL = parseFloat(p.integral_storage_L) || (pName.includes('300l') ? 300 : 200);
                const dailyCap = storageL * 3 * perfFactor; // Cycles tank 3x per day
                return matchesType && targetTemp <= (p.max_temp_c || 70) && dailyLiters <= dailyCap;
            }

            // Monoblock Logic: Uses Flow Rate
            const nominalKW = parseFloat(p.kW_DHW_Nominal) || 0;
            const calculatedLhr = (nominalKW * 3600) / (specificHeatWater * deltaT);
            return matchesType && matchesCooling && targetTemp <= (p.max_temp_c || 60) && peakLitersPerHour <= (calculatedLhr * perfFactor);
        });

        if (availableModels.length === 0) return { error: "No suitable models found." };

        const system = availableModels.sort((a, b) => (parseFloat(a.salesPriceUSD) || 999999) - (parseFloat(b.salesPriceUSD) || 999999))[0];

        // 5. Final ROI Results
        const sysCop = parseFloat(system.COP_DHW) || 3.8;
        const sysPrice = parseFloat(system.salesPriceUSD) || 0;
        const karnotDailyElecKwh = dailyThermalEnergyKWH / sysCop;
        const karnotPowerDrawKw = karnotDailyElecKwh / hoursPerDay;
        
        let annualKarnotCost = (systemType === 'grid-only') 
            ? karnotDailyElecKwh * 365 * elecRate 
            : (karnotPowerDrawKw * Math.max(0, hoursPerDay - (sunHours || 5.5))) * 365 * elecRate;

        const totalSavings = (annualCostOld - annualKarnotCost);

        return {
            system,
            financials: {
                symbol: CONFIG.SYMBOLS[currency] || '$',
                annualCostOld, totalSavings,
                paybackYears: totalSavings > 0 ? (sysPrice / totalSavings).toFixed(1) : "N/A",
                capex: { total: sysPrice }
            },
            metrics: {
                adjFlowLhr: (parseFloat(system.kW_DHW_Nominal) * 3600 / (specificHeatWater * deltaT)) * perfFactor,
                emissionsSaved: (dailyThermalEnergyKWH * 365 * 0.5), 
                panels: Math.ceil(karnotPowerDrawKw / 0.425)
            }
        };
    } catch (e) { return { error: e.message }; }
};
