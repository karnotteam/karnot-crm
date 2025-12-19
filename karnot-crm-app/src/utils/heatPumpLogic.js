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
    },
    // Coincidence factors - % of fixtures used simultaneously during peak
    COINCIDENCE_FACTORS: {
        home: { factor: 1.0, peakDuration: 1.0 },
        restaurant: { factor: 0.5, peakDuration: 3.0 },
        resort: { factor: 0.4, peakDuration: 2.0 },
        spa: { factor: 0.6, peakDuration: 2.0 },
        school: { factor: 0.3, peakDuration: 1.5 },
        office: { factor: 0.4, peakDuration: 2.0 }
    },
    // Enterprise ROI settings (Nestlé-aligned)
    ENTERPRISE: {
        DEFAULT_WACC: 0.07, // 7% Weighted Average Cost of Capital
        WACC_RANGE: { min: 0.06, max: 0.08 },
        PROJECT_LIFETIME: 15, // Standard equipment lifespan
        CSV_MAX_WEIGHT: 0.5, // Max 50% boost from sustainability
        HURDLE_RATE: 0.12, // Minimum acceptable IRR (12%)
        // Sustainability impact scoring weights
        CSV_WEIGHTS: {
            carbon: 0.35,      // 35% - Carbon reduction
            water: 0.15,       // 15% - Water efficiency
            energy: 0.30,      // 30% - Energy efficiency
            reliability: 0.10, // 10% - System uptime/reliability
            innovation: 0.10   // 10% - Technology leadership
        }
    }
};

// Extract tank size from product name
const extractTankLiters = (name) => {
    if (!name) return 0;
    const match = name.match(/(\d+)\s*L\b/i);
    return match ? parseInt(match[1], 10) : 0;
};

// Extract kW rating from product name
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

// Check if product is reversible
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

// Calculate current heating cost
export const calculateCurrentCost = (heatingType, inputs, dailyThermalKWH) => {
    let currentRateKWH;
    switch(heatingType) {
        case 'propane':
            currentRateKWH = (inputs.lpgPrice / inputs.lpgSize) / CONFIG.KWH_PER_KG_LPG;
            break;
        case 'diesel':
            currentRateKWH = inputs.dieselPrice / CONFIG.DIESEL_KWH_PER_LITER;
            break;
        case 'gas':
            currentRateKWH = inputs.gasRate;
            break;
        default:
            currentRateKWH = inputs.elecRate;
    }
    return {
        rateKWH: currentRateKWH,
        annualCost: (dailyThermalKWH / CONFIG.COP_STANDARD) * 365 * currentRateKWH
    };
};

// Calculate recovery rate and required tank size
const calculateTankSizing = (heatPumpKW, deltaT, dailyLiters, userType, hoursPerDay) => {
    const recoveryRateLph = (heatPumpKW * 1000) / (deltaT * CONFIG.WATER_SPEC_HEAT);
    const coincidence = CONFIG.COINCIDENCE_FACTORS[userType] || { factor: 0.5, peakDuration: 2.0 };
    const peakDrawRateLph = (dailyLiters / hoursPerDay) * coincidence.factor / (coincidence.factor * 0.5);
    const gapLph = Math.max(0, peakDrawRateLph - recoveryRateLph);
    
    const method1_GapBased = gapLph * coincidence.peakDuration;
    const method2_PeakBuffer = peakDrawRateLph * 0.65;
    const method3_DailyReserve = dailyLiters * 0.35;
    
    const requiredTankSize = Math.max(method1_GapBased, method2_PeakBuffer, method3_DailyReserve);
    const recommendedTankSize = Math.ceil(requiredTankSize / 50) * 50;
    
    return {
        recoveryRateLph,
        peakDrawRateLph,
        gapLph,
        coincidenceFactor: coincidence.factor,
        peakDuration: coincidence.peakDuration,
        method1_GapBased,
        method2_PeakBuffer,
        method3_DailyReserve,
        requiredTankSize,
        recommendedTankSize
    };
};

// Calculate NPV (Net Present Value)
const calculateNPV = (initialInvestment, annualCashFlow, years, discountRate) => {
    let npv = -initialInvestment;
    for (let year = 1; year <= years; year++) {
        npv += annualCashFlow / Math.pow(1 + discountRate, year);
    }
    return npv;
};

// Calculate IRR (Internal Rate of Return) using Newton-Raphson method
const calculateIRR = (initialInvestment, annualCashFlow, years) => {
    let irr = 0.1; // Start with 10% guess
    const maxIterations = 100;
    const tolerance = 0.0001;
    
    for (let i = 0; i < maxIterations; i++) {
        let npv = -initialInvestment;
        let derivative = 0;
        
        for (let year = 1; year <= years; year++) {
            const factor = Math.pow(1 + irr, year);
            npv += annualCashFlow / factor;
            derivative -= year * annualCashFlow / (factor * (1 + irr));
        }
        
        const newIrr = irr - npv / derivative;
        if (Math.abs(newIrr - irr) < tolerance) {
            return newIrr;
        }
        irr = newIrr;
    }
    return irr;
};

// Calculate CSV (Creating Shared Value) Score
const calculateCSVScore = (emissions, energyEfficiency, waterSavings, reliability, innovation) => {
    const weights = CONFIG.ENTERPRISE.CSV_WEIGHTS;
    
    // Normalize each metric to 0-10 scale
    const carbonScore = Math.min(10, (emissions.annualSaved / 10000) * 10); // 10k kg = perfect
    const energyScore = Math.min(10, (energyEfficiency / 0.7) * 10); // 70% efficiency = perfect
    const waterScore = waterSavings || 5; // User-provided or default
    const reliabilityScore = reliability || 8; // Default high for heat pumps
    const innovationScore = innovation || 7; // R290/CO2 scores higher
    
    const totalScore = 
        (carbonScore * weights.carbon) +
        (energyScore * weights.energy) +
        (waterScore * weights.water) +
        (reliabilityScore * weights.reliability) +
        (innovationScore * weights.innovation);
    
    return {
        totalScore,
        breakdown: {
            carbon: carbonScore,
            energy: energyScore,
            water: waterScore,
            reliability: reliabilityScore,
            innovation: innovationScore
        }
    };
};

// Enterprise ROI calculation (Nestlé-aligned)
const calculateEnterpriseROI = (financials, emissions, inputs, systemLifetime = 15) => {
    const discountRate = inputs.enterpriseWACC || CONFIG.ENTERPRISE.DEFAULT_WACC;
    const initialInvestment = financials.totalCapex;
    const annualCashFlow = financials.totalAnnualSavings;
    
    // 1. Standard Financial Metrics
    const npv = calculateNPV(initialInvestment, annualCashFlow, systemLifetime, discountRate);
    const irr = calculateIRR(initialInvestment, annualCashFlow, systemLifetime);
    const simpleROI = ((annualCashFlow * systemLifetime - initialInvestment) / initialInvestment) * 100;
    
    // 2. CSV Score Calculation
    const energyEfficiency = (financials.currentAnnualCost - financials.newAnnualCost) / financials.currentAnnualCost;
    const csvScore = calculateCSVScore(
        emissions,
        energyEfficiency,
        inputs.waterSavingsScore || 5,
        inputs.reliabilityScore || 8,
        inputs.innovationScore || 7
    );
    
    // 3. Strategic ROI (CSV-weighted)
    const csvMultiplier = 1 + (csvScore.totalScore / 10) * CONFIG.ENTERPRISE.CSV_MAX_WEIGHT;
    const strategicROI = simpleROI * csvMultiplier;
    
    // 4. UTOP Margin Impact (for manufacturing facilities)
    const annualRevenueImpact = inputs.annualRevenue || 0;
    const marginImprovement = annualRevenueImpact > 0 
        ? (annualCashFlow / annualRevenueImpact) * 100 
        : 0;
    
    // 5. Viability Assessment
    const meetsHurdleRate = irr >= CONFIG.ENTERPRISE.HURDLE_RATE;
    const positiveNPV = npv > 0;
    const strategicallyViable = strategicROI > 15 && csvScore.totalScore > 7;
    const isViable = positiveNPV || (meetsHurdleRate && strategicallyViable);
    
    return {
        financial: {
            npv,
            irr: irr * 100, // Convert to percentage
            simpleROI,
            paybackYears: initialInvestment / annualCashFlow,
            discountRate: discountRate * 100
        },
        csv: {
            score: csvScore.totalScore,
            breakdown: csvScore.breakdown,
            multiplier: csvMultiplier,
            strategicROI
        },
        utop: {
            marginImprovement,
            annualCostReduction: annualCashFlow
        },
        viability: {
            isViable,
            meetsHurdleRate,
            positiveNPV,
            strategicallyViable,
            recommendation: isViable 
                ? "Approved: Meets financial and strategic criteria"
                : positiveNPV 
                    ? "Review: Positive NPV but below hurdle rate"
                    : "Rejected: Negative NPV and insufficient strategic value"
        }
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
    const avgDrawRateLph = dailyLiters / Math.max(1, inputs.hoursPerDay);
    
    // --- 2. CALCULATE CURRENT SYSTEM COST ---
    const currentSystem = calculateCurrentCost(inputs.heatingType, inputs, dailyThermalKWH);

    // --- 3. PERFORMANCE ADJUSTMENTS ---
    const actualLiftC = Math.max(1, deltaT);
    const performanceFactor = (CONFIG.RATED_LIFT_C / actualLiftC) * 
                            (1 + ((inputs.ambientTemp - CONFIG.RATED_AMBIENT_C) * 0.015));

    // --- 4. FILTER AND ADJUST PRODUCTS ---
    let availableProducts = dbProducts.map(p => {
        const integralTankSize = extractTankLiters(p.name);
        const kW = Number(p.kW_DHW_Nominal) || extractKW(p.name);
        const cop = Number(p.COP_DHW) || 3.5;
        const maxTemp = Number(p.max_temp_c) || 60;
        const reversible = isReversible(p);
        const adjustedKW = kW * performanceFactor;
        const recoveryRateLph = (adjustedKW * 1000) / (deltaT * CONFIG.WATER_SPEC_HEAT);
        
        return {
            ...p,
            integralTankSize,
            kW,
            cop,
            maxTemp,
            reversible,
            adjustedKW,
            recoveryRateLph
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

    const suitableProducts = availableProducts.filter(p => {
        const tempOK = inputs.targetTemp <= p.maxTemp;
        const capacityOK = p.recoveryRateLph >= (avgDrawRateLph * 0.7);
        return tempOK && capacityOK;
    });

    if (suitableProducts.length === 0) {
        const filterMsg = inputs.heatPumpType !== 'all' ? ` with ${inputs.heatPumpType} refrigerant` : '';
        const coolMsg = inputs.includeCooling ? ' and cooling capability' : '';
        return { 
            error: `No system found for ${avgDrawRateLph.toFixed(0)} L/hr average demand at ${inputs.targetTemp}°C${filterMsg}${coolMsg}.` 
        };
    }

    suitableProducts.sort((a, b) => {
        const priceA = Number(a.salesPriceUSD) || Infinity;
        const priceB = Number(b.salesPriceUSD) || Infinity;
        return priceA - priceB;
    });

    const selectedProduct = suitableProducts[0];

    // --- 5. CALCULATE REQUIRED TANK SIZE ---
    const tankSizing = calculateTankSizing(
        selectedProduct.adjustedKW,
        deltaT,
        dailyLiters,
        inputs.userType,
        inputs.hoursPerDay
    );

    const finalTankSize = selectedProduct.integralTankSize || tankSizing.recommendedTankSize;
    const needsExternalTank = !selectedProduct.integralTankSize;

    // --- 6. CALCULATE NEW SYSTEM COSTS ---
    const fxRate = CONFIG.FX[inputs.currency] || 1;
    const symbol = CONFIG.SYMBOLS[inputs.currency];
    
    const heatPumpCOP = selectedProduct.cop;
    const dailyElecKwh = dailyThermalKWH / heatPumpCOP;
    const avgPowerDrawKW = dailyElecKwh / inputs.hoursPerDay;

    const heatPumpCost = (Number(selectedProduct.salesPriceUSD) || 0) * fxRate;
    
    let annualElecCost = 0, solarCost = 0, inverterCost = 0, panelCount = 0;
    const sunHours = Number(inputs.sunHours) || 5.5;

    if (inputs.systemType === 'grid-only') {
        annualElecCost = dailyElecKwh * 365 * inputs.elecRate;
    } else {
        const solarHours = Math.min(inputs.hoursPerDay, sunHours);
        const gridHours = Math.max(0, inputs.hoursPerDay - solarHours);
        annualElecCost = (avgPowerDrawKW * gridHours) * 365 * inputs.elecRate;
        
        panelCount = Math.ceil(avgPowerDrawKW / CONFIG.SOLAR_PANEL_KW_RATED);
        solarCost = panelCount * CONFIG.SOLAR_PANEL_COST_USD * fxRate;
        inverterCost = (panelCount * CONFIG.SOLAR_PANEL_KW_RATED * 1000 * 
                       CONFIG.INVERTER_COST_PER_WATT_USD) * fxRate;
    }

    // --- 7. COOLING CALCULATIONS ---
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

    // --- 8. EMISSIONS CALCULATIONS ---
    const emFactorKey = inputs.heatingType === 'electric' ? 'electric_grid' : inputs.heatingType;
    const emFactorOld = CONFIG.EM_FACTOR[emFactorKey] || 0.7;
    const emFactorNew = CONFIG.EM_FACTOR[inputs.systemType === 'grid-solar' ? 'electric_solar' : 'electric_grid'];
    const emissionsSaved = ((dailyThermalKWH / CONFIG.COP_STANDARD) * 365 * emFactorOld) - 
                          (dailyElecKwh * 365 * emFactorNew);

    // --- 9. WARM-UP TIME ---
    const warmupTime = (finalTankSize * deltaT * CONFIG.WATER_SPEC_HEAT) / 
                       (selectedProduct.adjustedKW * 1000);

    // --- 10. FINANCIAL SUMMARY ---
    const totalCapex = heatPumpCost + solarCost + inverterCost;
    const heatingSavings = currentSystem.annualCost - annualElecCost;
    const coolingSavings = coolingData ? coolingData.annualSavings : 0;
    const totalAnnualSavings = heatingSavings + coolingSavings;
    const paybackYears = totalAnnualSavings > 0 && totalCapex > 0 
        ? (totalCapex / totalAnnualSavings).toFixed(1) 
        : "N/A";

    const financials = {
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
    };

    const emissions = {
        annualSaved: emissionsSaved,
        lifetimeSaved: emissionsSaved * 15
    };

    // --- 11. ENTERPRISE ROI (if enabled) ---
    let enterpriseROI = null;
    if (inputs.enableEnterpriseROI) {
        enterpriseROI = calculateEnterpriseROI(financials, emissions, inputs);
    }

    return {
        system: {
            name: selectedProduct.name,
            refrigerant: selectedProduct.Refrigerant,
            tankSize: finalTankSize,
            integralTank: selectedProduct.integralTankSize,
            needsExternalTank,
            kW: selectedProduct.kW,
            adjustedKW: selectedProduct.adjustedKW,
            cop: selectedProduct.cop,
            reversible: selectedProduct.reversible,
            maxTemp: selectedProduct.maxTemp,
            recoveryRate: selectedProduct.recoveryRateLph
        },
        tankSizing: {
            ...tankSizing,
            finalTankSize,
            avgDrawRate: avgDrawRateLph
        },
        metrics: {
            dailyLiters,
            avgDrawRate: avgDrawRateLph.toFixed(1),
            peakDrawRate: tankSizing.peakDrawRateLph.toFixed(1),
            warmupTime: warmupTime.toFixed(1),
            panelCount,
            avgPowerDrawKW: avgPowerDrawKW.toFixed(2),
            performanceFactor: performanceFactor.toFixed(2)
        },
        financials,
        cooling: coolingData,
        emissions,
        enterpriseROI,
        inputs
    };
}
