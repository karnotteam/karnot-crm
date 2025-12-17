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

        // 1. Calculate Daily Demand
        let dailyLiters = 0;
        if (userType === 'home') dailyLiters = occupants * 50;
        else if (userType === 'restaurant') dailyLiters = mealsPerDay * 7;
        else if (userType === 'resort') dailyLiters = (roomsOccupied * 50) + (mealsPerDay * 7);
        else dailyLiters = dailyLitersInput;

        // 2. Thermodynamic Calculations
        const deltaT = Math.max(1, targetTemp - inletTemp);
        const specificHeatWater = 4.187; // kJ/kg°C
        const kwhPerLiter = (deltaT * 1.163) / 1000;
        const dailyThermalEnergyKWH = dailyLiters * kwhPerLiter;

        // 3. Baseline Costs
        let currentRateKWH = elecRate;
        if (heatingType === 'propane') currentRateKWH = (fuelPrice / (tankSize || 11)) / 13.8;
        else if (heatingType === 'diesel') currentRateKWH = fuelPrice / 10.7;
        const annualCostOld = dailyThermalEnergyKWH * 365 * currentRateKWH;

        // 4. Model Filtering with Mapping
        const peakLitersPerHour = dailyLiters / hoursPerDay;

        let availableModels = products.filter(p => {
            const pType = (p.Refrigerant || p.type || '').toLowerCase();
            const matchesType = heatPumpType === 'all' || pType.includes(heatPumpType.toLowerCase());
            const matchesCooling = !includeCooling || p.isReversible === true;
            
            // Dynamic Flow: (kW * 3600) / (4.187 * deltaT)
            const nominalKW = parseFloat(p.kW_DHW_Nominal) || 0;
            const calculatedLhr = (nominalKW * 3600) / (specificHeatWater * deltaT);
            
            // Adjust for Ambient Temp performance (1.5% per degree from 20C)
            const adjLhr = calculatedLhr * (1 + ((ambientTemp - CONFIG.RATED_AMBIENT_C) * 0.015));

            return matchesType && 
                   matchesCooling && 
                   targetTemp <= (p.max_temp_c || 60) && 
                   peakLitersPerHour <= adjLhr &&
                   nominalKW > 0;
        });

        if (availableModels.length === 0) {
            return { error: "No suitable models found. Try reducing Target Temp or increasing Operating Hours." };
        }

        // Sort by salesPriceUSD
        const suitable = availableModels.sort((a, b) => (parseFloat(a.salesPriceUSD) || 999999) - (parseFloat(b.salesPriceUSD) || 999999));
        const system = suitable[0];

        // 5. Karnot Operation Costs
        const sysCop = parseFloat(system.COP_DHW) || 3.8;
        const sysPrice = parseFloat(system.salesPriceUSD) || 0;
        
        const karnotDailyElecKwh = dailyThermalEnergyKWH / sysCop;
        const karnotPowerDrawKw = karnotDailyElecKwh / hoursPerDay;
        
        let annualKarnotCost = 0;
        if (systemType === 'grid-only') {
            annualKarnotCost = karnotDailyElecKwh * 365 * elecRate;
        } else {
            const solarPoweredHours = Math.min(hoursPerDay, sunHours || 5.5);
            const gridPoweredHours = Math.max(0, hoursPerDay - solarPoweredHours);
            annualKarnotCost = (karnotPowerDrawKw * gridPoweredHours) * 365 * elecRate;
        }

        // 6. Savings & ROI
        let coolSavings = 0;
        if (includeCooling && system.isReversible) {
            const dailyCoolingKwh = (dailyThermalEnergyKWH / sysCop) * CONFIG.COOLING_COP;
            coolSavings = dailyCoolingKwh * 365 * elecRate;
        }

        const totalSavings = (annualCostOld - annualKarnotCost) + coolSavings;

        return {
            system,
            financials: {
                symbol: CONFIG.SYMBOLS[currency] || '$',
                annualCostOld,
                annualKarnotCost,
                coolSavings,
                totalSavings,
                paybackYears: totalSavings > 0 ? (sysPrice / totalSavings).toFixed(1) : "N/A",
                capex: { total: sysPrice }
            },
            metrics: {
                adjFlowLhr: (parseFloat(system.kW_DHW_Nominal) * 3600 / (specificHeatWater * deltaT)) * (1 + ((ambientTemp - CONFIG.RATED_AMBIENT_C) * 0.015)),
                emissionsSaved: (dailyThermalEnergyKWH * 365 * 0.5), 
                panels: Math.ceil(karnotPowerDrawKw / 0.425)
            }
        };
    } catch (e) {
        return { error: e.message };
    }
};
