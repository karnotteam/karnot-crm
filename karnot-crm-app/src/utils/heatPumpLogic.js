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

        // 1. Calculate Daily Liters (Restored User Types)
        let dailyLiters = 0;
        if (userType === 'home') dailyLiters = occupants * 50;
        else if (userType === 'restaurant') dailyLiters = mealsPerDay * 7;
        else if (userType === 'resort') dailyLiters = (roomsOccupied * 50) + (mealsPerDay * 7);
        else dailyLiters = dailyLitersInput;

        // 2. Thermal Math
        const deltaT = Math.max(1, targetTemp - inletTemp);
        const specificHeatWater = 4.187; 
        const kwhPerLiter = (deltaT * 1.163) / 1000;
        const dailyThermalEnergyKWH = dailyLiters * kwhPerLiter;

        // 3. Baseline Costs
        let currentRateKWH = elecRate;
        if (heatingType === 'propane') currentRateKWH = (fuelPrice / (tankSize || 11)) / 13.8;
        else if (heatingType === 'diesel') currentRateKWH = fuelPrice / 10.7;
        const annualCostOld = dailyThermalEnergyKWH * 365 * currentRateKWH;

        // 4. Advanced Model Filtering (Storage vs Flow)
        const peakLitersPerHour = dailyLiters / hoursPerDay;
        const perfFactor = (1 + ((ambientTemp - CONFIG.RATED_AMBIENT_C) * 0.015));

        let availableModels = products.filter(p => {
            const pType = (p.Refrigerant || p.type || '').toLowerCase();
            const matchesType = heatPumpType === 'all' || pType.includes(heatPumpType.toLowerCase());
            const matchesCooling = !includeCooling || p.isReversible === true;
            
            // Delta-T Performance Logic
            const nominalKW = parseFloat(p.kW_DHW_Nominal) || 0;
            const calculatedLhr = (nominalKW * 3600) / (specificHeatWater * deltaT);
            const adjLhr = calculatedLhr * perfFactor;

            // AquaHERO Storage Logic: If unit has a tank, check daily capacity
            // We assume a storage unit can handle 3x its tank volume per day
            if (p.category === 'AquaHERO' || p.integral_storage_L) {
                const tankSize = parseFloat(p.integral_storage_L) || 200;
                const dailyCapacity = tankSize * 3 * perfFactor; 
                return matchesType && targetTemp <= (p.max_temp_c || 70) && dailyLiters <= dailyCapacity;
            }

            // Standard Unit: Check hourly flow
            return matchesType && matchesCooling && targetTemp <= (p.max_temp_c || 60) && peakLitersPerHour <= adjLhr && nominalKW > 0;
        });

        if (availableModels.length === 0) return { error: "No suitable models found." };

        const system = availableModels.sort((a, b) => (parseFloat(a.salesPriceUSD) || 999999) - (parseFloat(b.salesPriceUSD) || 999999))[0];

        // 5. ROI Math
        const sysCop = parseFloat(system.COP_DHW) || 3.8;
        const karnotDailyElecKwh = dailyThermalEnergyKWH / sysCop;
        const karnotPowerDrawKw = karnotDailyElecKwh / hoursPerDay;
        
        let annualKarnotCost = (systemType === 'grid-only') 
            ? karnotDailyElecKwh * 365 * elecRate 
            : (karnotPowerDrawKw * Math.max(0, hoursPerDay - (sunHours || 5.5))) * 365 * elecRate;

        let coolSavings = (includeCooling && system.isReversible) 
            ? (dailyThermalEnergyKWH / sysCop) * CONFIG.COOLING_COP * 365 * elecRate 
            : 0;

        return {
            system,
            financials: {
                symbol: CONFIG.SYMBOLS[currency] || '$',
                annualCostOld, annualKarnotCost, coolSavings,
                totalSavings: (annualCostOld - annualKarnotCost) + coolSavings,
                paybackYears: ((annualCostOld - annualKarnotCost) + coolSavings) > 0 ? (parseFloat(system.salesPriceUSD) / ((annualCostOld - annualKarnotCost) + coolSavings)).toFixed(1) : "N/A",
                capex: { total: parseFloat(system.salesPriceUSD) }
            },
            metrics: {
                adjFlowLhr: (parseFloat(system.kW_DHW_Nominal) * 3600 / (specificHeatWater * deltaT)) * perfFactor,
                emissionsSaved: (dailyThermalEnergyKWH * 365 * 0.5), 
                panels: Math.ceil(karnotPowerDrawKw / 0.425)
            }
        };
    } catch (e) { return { error: e.message }; }
};
