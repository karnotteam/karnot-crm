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
    COP_STANDARD: 1, 
    SOLAR_PANEL_KW_RATED: 0.425, 
    SOLAR_PANEL_COST_USD: 200, 
    INVERTER_COST_PER_WATT_USD: 0.30,
    COOLING_COP: 2.6,
    WATER_SPEC_HEAT: 1.163, // Wh/L/°C
    RATED_AMBIENT_C: 20,
    RATED_LIFT_C: 40,
    EM_FACTOR: { 
        electric_grid: 0.7, 
        electric_solar: 0.12, 
        propane: 0.23, 
        gas: 0.20, 
        diesel: 0.25 
    }
};

// Extract tank size from product name (e.g., "200L" -> 200)
const extractTankLiters = (name) => {
    if (!name) return 0;
    const match = name.match(/(\d+)\s*L\b/i);
    return match ? parseInt(match[1], 10) : 0;
};

// Extract kW rating from product name (e.g., "6kW" -> 6)
const extractKW = (name) => {
    if (!name) return 0;
    const match = name.match(/(\d+\.?\d*)\s*kW/i);
    return match ? parseFloat(match[1]) : 0;
};

// Check if refrigerant matches filter
const matchesRefrigerant = (productRef, filterType) => {
    if (filterType === 'all') return true;
    
    const pRef = (productRef || '').toUpperCase().trim();
    const reqRef = filterType.toUpperCase();
    
    if (reqRef === 'R744' || reqRef === 'CO2') {
        return pRef === 'R744' || pRef === 'CO2';
    }
    
    return pRef === reqRef;
};

// Check if product is reversible (can provide cooling)
const isReversible = (product) => {
    const name = (product.name || '').toUpperCase();
    return name.includes('IHEAT') || name.includes('REVERSIBLE');
};

// Calculate daily water demand based on user type
export const calculateDailyLiters = (userType, inputs) => {
    switch(userType) {
        case 'home':
            return inputs.homeOccupants * 50;
        case 'restaurant':
            return inputs.mealsPerDay * 7;
        case 'resort':
            return (inputs.roomsPerDay * 50) + (inputs.mealsPerDay * 7);
        case 'office':
        case 'spa':
        case 'school':
            return inputs.dailyLitersInput;
        default:
            return 0;
    }
};

// Calculate fixture-based hot water demand
export const calculateFixtureDemand = (fixtures) => {
    const { showers, basins, sinks, people, hours } = fixtures;
    const showerDemand = 50 * showers * 0.4;
    const basinDemand = 20 * basins * 0.4;
    const sinkDemand = 114 * sinks * 0.3 * hours * 0.4;
    const peopleDemand = 284 * people * 0.15 * 0.25 * 0.4;
    return Math.round(showerDemand + basinDemand + sinkDemand + peopleDemand);
};

// Calculate current heating cost based on fuel type
export const calculateCurrentCost = (heatingType, inputs, dailyThermalKWH) => {
    let currentRateKWH;
    
    switch(heatingType) {
        case 'propane':
            const lpgKWH = (inputs.lpgPrice / inputs.lpgSize) / CONFIG.KWH_PER_KG_LPG;
            currentRateKWH = lpgKWH;
            break;
        case 'diesel':
            currentRateKWH = inputs.dieselPrice / CONFIG.DIESEL_KWH_PER_LITER;
            break;
        case 'gas':
            currentRateKWH = inputs.gasRate;
            break;
        default: // electric
            currentRateKWH = inputs.elecRate;
    }
    
    return {
        rateKWH: currentRateKWH,
        annualCost: (dailyThermalKWH / CONFIG.COP_STANDARD) * 365 * currentRateKWH
    };
};

export function calculateHeatPump(inputs, dbProducts) {
    if (!dbProducts || dbProducts.length === 0) {
        return { error: "Inventory empty. Please add products to your database." };
    }

    // --- 1. CALCULATE DEMAND ---
    const dailyLiters = calculateDailyLiters(inputs.userType, inputs);
    if (dailyLiters <= 0) {
        return { error: "Please enter valid demand values for your user type." };
    }

    const deltaT = inputs.targetTemp - inputs.inletTemp;
    const dailyThermalKWH = (dailyLiters * deltaT * CONFIG.WATER_SPEC_HEAT) / 1000;
    const peakHourlyLiters = dailyLiters / Math.max(1, inputs.hoursPerDay);
    
    // --- 2. CALCULATE CURRENT SYSTEM COST ---
    const currentSystem = calculateCurrentCost(inputs.heatingType, inputs, dailyThermalKWH);

    // --- 3. PERFORMANCE ADJUSTMENTS ---
    const actualLiftC = Math.max(1, deltaT);
    const performanceFactor = (CONFIG.RATED_LIFT_C / actualLiftC) * 
                            (1 + ((inputs.ambientTemp - CONFIG.RATED_AMBIENT_C) * 0.015));

    // --- 4. FILTER AND ADJUST PRODUCTS ---
    let availableProducts = dbProducts.map(p => {
        const tankSize = extractTankLiters(p.name);
        const kW = Number(p.kW_DHW_Nominal) || extractKW(p.name);
        const cop = Number(p.COP_DHW) || 3.5;
        const maxTemp = Number(p.max_temp_c) || 60;
        const reversible = isReversible(p);
        
        // Calculate adjusted capacity
        const adjustedKW = kW * performanceFactor;
        const adjustedHourlyLiters = (adjustedKW * 1000) / (deltaT * CONFIG.WATER_SPEC_HEAT);
        
        return {
            ...p,
            tankSize,
            kW,
            cop,
            maxTemp,
            reversible,
            adjustedKW,
            adjustedHourlyLiters
        };
    });

    // Apply filters
    if (inputs.heatPumpType !== 'all') {
        availableProducts = availableProducts.filter(p => 
            matchesRefrigerant(p.Refrigerant, inputs.heatPumpType)
        );
    }

    if (inputs.includeCooling) {
        availableProducts = availableProducts.filter(p => p.reversible);
    }

    // Filter by capacity and temperature
    const suitableProducts = availableProducts.filter(p => {
        const tempOK = inputs.targetTemp <= p.maxTemp;
        const capacityOK = p.adjustedHourlyLiters >= peakHourlyLiters;
        const tankOK = !p.tankSize || p.tankSize >= (dailyLiters * 0.3); // Tank should hold at least 30% of daily demand
        
        return tempOK && capacityOK && tankOK;
    });

    if (suitableProducts.length === 0) {
        const filterMsg = inputs.heatPumpType !== 'all' 
            ? ` with ${inputs.heatPumpType} refrigerant` 
            : '';
        const coolMsg = inputs.includeCooling ? ' and cooling capability' : '';
        return { 
            error: `No system found for ${peakHourlyLiters.toFixed(0)} L/hr peak demand at ${inputs.targetTemp}°C${filterMsg}${coolMsg}.` 
        };
    }

    // Sort by price (prefer products with valid USD prices)
    suitableProducts.sort((a, b) => {
        const priceA = Number(a.salesPriceUSD) || Infinity;
        const priceB = Number(b.salesPriceUSD) || Infinity;
        return priceA - priceB;
    });

    const selectedProduct = suitableProducts[0];

    // --- 5. CALCULATE NEW SYSTEM COSTS ---
    const fxRate = CONFIG.FX[inputs.currency] || 1;
    const symbol = CONFIG.SYMBOLS[inputs.currency];
    
    const heatPumpCOP = selectedProduct.cop;
    const dailyElecKwh = dailyThermalKWH / heatPumpCOP;
    const avgDrawKW = dailyElecKwh / inputs.hoursPerDay;

    const heatPumpCost = (Number(selectedProduct.salesPriceUSD) || 0) * fxRate;
    
    let annualElecCost = 0, solarCost = 0, inverterCost = 0, panelCount = 0;
    const sunHours = Number(inputs.sunHours) || 5.5;

    if (inputs.systemType === 'grid-only') {
        annualElecCost = dailyElecKwh * 365 * inputs.elecRate;
    } else {
        const solarHours = Math.min(inputs.hoursPerDay, sunHours);
        const gridHours = Math.max(0, inputs.hoursPerDay - solarHours);
        annualElecCost = (avgDrawKW * gridHours) * 365 * inputs.elecRate;
        
        panelCount = Math.ceil(avgDrawKW / CONFIG.SOLAR_PANEL_KW_RATED);
        solarCost = panelCount * CONFIG.SOLAR_PANEL_COST_USD * fxRate;
        inverterCost = (panelCount * CONFIG.SOLAR_PANEL_KW_RATED * 1000 * 
                       CONFIG.INVERTER_COST_PER_WATT_USD) * fxRate;
    }

    // --- 6. COOLING CALCULATIONS ---
    let coolingData = null;
    if (inputs.includeCooling && selectedProduct.reversible) {
        const dailyCoolingKwh = dailyThermalKWH / selectedProduct.cop * CONFIG.COOLING_COP;
        const coolingKW = dailyCoolingKwh / inputs.hoursPerDay;
        const coolingSavings = dailyCoolingKwh * 365 * inputs.elecRate;
        
        coolingData = {
            dailyKwh: dailyCoolingKwh,
            coolingKW: coolingKW,
            annualSavings: coolingSavings
        };
    }

    // --- 7. EMISSIONS CALCULATIONS ---
    const emFactorKey = inputs.heatingType === 'electric' ? 'electric_grid' : inputs.heatingType;
    const emFactorOld = CONFIG.EM_FACTOR[emFactorKey] || 0.7;
    const emFactorNew = CONFIG.EM_FACTOR[inputs.systemType === 'grid-solar' ? 'electric_solar' : 'electric_grid'];
    const emissionsSaved = ((dailyThermalKWH / CONFIG.COP_STANDARD) * 365 * emFactorOld) - 
                          (dailyElecKwh * 365 * emFactorNew);

    // --- 8. WARM-UP TIME ---
    const tankSize = selectedProduct.tankSize || (dailyLiters * 0.5);
    const warmupTime = (tankSize * deltaT * CONFIG.WATER_SPEC_HEAT) / 
                       (selectedProduct.kW * 1000);

    // --- 9. FINANCIAL SUMMARY ---
    const totalCapex = heatPumpCost + solarCost + inverterCost;
    const heatingSavings = currentSystem.annualCost - annualElecCost;
    const coolingSavings = coolingData ? coolingData.annualSavings : 0;
    const totalAnnualSavings = heatingSavings + coolingSavings;
    const paybackYears = totalAnnualSavings > 0 && totalCapex > 0 
        ? (totalCapex / totalAnnualSavings).toFixed(1) 
        : "N/A";

    return {
        system: {
            name: selectedProduct.name,
            refrigerant: selectedProduct.Refrigerant,
            tankSize: tankSize,
            kW: selectedProduct.kW,
            cop: selectedProduct.cop,
            reversible: selectedProduct.reversible,
            maxTemp: selectedProduct.maxTemp
        },
        metrics: {
            dailyLiters,
            peakHourlyLiters: peakHourlyLiters.toFixed(1),
            warmupTime: warmupTime.toFixed(1),
            adjustedCapacity: selectedProduct.adjustedHourlyLiters.toFixed(1),
            panelCount,
            avgDrawKW: avgDrawKW.toFixed(2)
        },
        financials: {
            symbol,
            currency: inputs.currency,
            heatPumpCost,
            solarCost,
            inverterCost,
            totalCapex,
            currentAnnualCost: currentSystem.annualCost,
            newAnnualCost: annualElecCost,
            heatingSavings,
            coolingSavings,
            totalAnnualSavings,
            paybackYears
        },
        cooling: coolingData,
        emissions: {
            annualSaved: emissionsSaved,
            lifetimeSaved: emissionsSaved * 15 // Assuming 15-year lifespan
        },
        inputs // Include inputs for report generation
    };
}
