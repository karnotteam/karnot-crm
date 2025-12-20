import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Button } from '../data/constants.jsx';
import { ArrowLeft, Calculator, Flame, AlertCircle, CheckCircle, Download, TrendingUp, DollarSign, Leaf, Award, Target, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';

const CONFIG = {
    AIR_DENSITY_KG_M3: 1.2,
    AIR_SPECIFIC_HEAT_KJ_KGK: 1.006,
    DIESEL_LHV_KWH_L: 9.9,
    DIESEL_CO2_KG_PER_L: 2.68,
    GRID_CO2_KG_PER_KWH: 0.7,
    REQUIRED_WATER_TEMP_C: 65,
    TANK_SIZING_L_PER_KW: 20,
    PV_DERATE_FACTOR: 0.80,
    WEEKEND_SUN_DAYS: 2,
    BATTERY_DOD: 0.80,
    SOLAR_PANEL_COST_USD: 200,
    SOLAR_PANEL_KW_RATED: 0.425,
    INVERTER_COST_PER_WATT_USD: 0.30,
    FX: {
        PHP: 58.5,
        USD: 1.0,
        GBP: 0.79,
        EUR: 0.92,
        CAD: 1.43,
        AUD: 1.57,
    },
    SYMBOLS: {
        PHP: '₱',
        USD: '$',
        GBP: '£',
        EUR: '€',
        CAD: 'C$',
        AUD: 'A$',
    },
    EFFICIENCY_BREAKDOWN: [
        { id: "combustionEff", label: 'Initial Combustion Efficiency', value: 83.0, isLoss: false },
        { id: "steamLeaks", label: 'Steam Leaks', value: 2.0, isLoss: true },
        { id: "radConvLoss", label: 'Radiation / Convection Loss', value: 5.0, isLoss: true },
        { id: "purgeLoss", label: 'Purge Loss (Cycling)', value: 3.0, isLoss: true },
        { id: "o2Loss", label: 'O2 Control at Low Loads', value: 2.0, isLoss: true },
        { id: "ventLoss", label: 'Vent Loss (Feed Water)', value: 2.0, isLoss: true },
        { id: "trapLoss", label: 'Steam Trap Leaks', value: 5.0, isLoss: true },
        { id: "pipeLoss", label: 'Un-Insulated Pipe Loss', value: 3.0, isLoss: true },
        { id: "wetSteamLoss", label: 'Wet Steam Loss', value: 1.0, isLoss: true },
        { id: "scaleLoss\", label: 'Scale Deposit Loss', value: 10.0, isLoss: true },
    ]
};

const WarmRoomCalc = ({ setActiveView, user }) => {
    // Product data from Firebase
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form inputs
    const [inputs, setInputs] = useState({
        currency: 'PHP',
        roomL: 11.5,
        roomW: 6,
        roomH: 6,
        uValue: 0.40,
        ambientTemp: 20,
        setpointTemp: 47,
        duration: 63,
        doorOpenings: 20,
        airExchange: 50,
        ach: 1.0,
        refrigerantType: 'all',
        hpCOP: 2.84,
        electricityTariff: 12.00,
        dieselPrice: 60.00,
        installationCost: 150000,
        projectLifespan: 10,
        discountRate: 8,
        implementationDelay: 6,
        systemType: 'grid-solar',
        storageType: 'battery',
        psh: 4.5,
        solarInstallCost: 15000,
        batteryCost: 11700,
        pcmCost: 4388,
        standbyFuel: 0.6,
        condensateReturn: 40,
        enableEnterpriseROI: false,
        enterpriseWACC: 0.07,
        annualRevenue: 0,
        waterSavingsScore: 5,
        reliabilityScore: 8,
        innovationScore: 7
    });

    // Efficiency breakdown state
    const [efficiencyValues, setEfficiencyValues] = useState(
        CONFIG.EFFICIENCY_BREAKDOWN.reduce((acc, item) => {
            acc[item.id] = item.value;
            return acc;
        }, {})
    );

    const [systemEfficiency, setSystemEfficiency] = useState(50);
    const [results, setResults] = useState(null);
    const [showReport, setShowReport] = useState(false);
    const [showCalculations, setShowCalculations] = useState(false);
    const [showEnterpriseDetails, setShowEnterpriseDetails] = useState(false);

    // Load products from Firebase
    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const unsub = onSnapshot(
            collection(db, "users", user.uid, "products"),
            (snapshot) => {
                const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                setProducts(list);
                
                // Debug logging
                console.log('=== Warm Room Calc: Products Loaded ===');
                console.log('Total products:', list.length);
                
                // Group by category
                const byCategory = {};
                list.forEach(p => {
                    const cat = p.category || 'Uncategorized';
                    byCategory[cat] = (byCategory[cat] || 0) + 1;
                });
                console.log('Products by category:', byCategory);
                
                // Count products with kW in name
                const withKW = list.filter(p => /\d+(\.\d+)?\s*kW/i.test(p.name || '')).length;
                console.log('Products with kW in name:', withKW);
                
                // Count products with L in name (tanks)
                const withL = list.filter(p => /\d+\s*L/i.test(p.name || '')).length;
                console.log('Products with L in name (tanks):', withL);
                
                setLoading(false);
            },
            (error) => {
                console.error("Error loading products:", error);
                setLoading(false);
            }
        );

        return () => unsub();
    }, [user]);

    // Update system efficiency when breakdown changes
    useEffect(() => {
        updateBoilerEfficiency();
    }, [efficiencyValues]);

    const updateBoilerEfficiency = () => {
        let totalLosses = 0;
        const combustionEff = efficiencyValues.combustionEff || 83;
        
        CONFIG.EFFICIENCY_BREAKDOWN.forEach(item => {
            if (item.isLoss) {
                totalLosses += efficiencyValues[item.id] || 0;
            }
        });
        
        const finalEfficiency = Math.max(0, combustionEff - totalLosses);
        setSystemEfficiency(finalEfficiency);
    };

    // Helper functions to extract kW and Liters from product names
    const getPeakKwFromName = (name) => {
        if (!name) return 0;
        const match = name.match(/(\d+(\.\d+)?)\s?kW/i);
        return match ? parseFloat(match[1]) : 0;
    };

    const getTankLitersFromName = (name) => {
        if (!name) return 0;
        const match = name.match(/(\d+)\s?L/i);
        return match ? parseInt(match[1], 10) : 0;
    };

    // Extract refrigerant type from product name
    const getRefrigerantFromName = (name) => {
        if (!name) return '';
        const nameLower = name.toLowerCase();
        
        if (nameLower.includes('r290') || nameLower.includes('propane')) return 'R290';
        if (nameLower.includes('r32')) return 'R32';
        if (nameLower.includes('r744') || nameLower.includes('co2') || nameLower.includes('co₂')) return 'R744';
        if (nameLower.includes('r410')) return 'R410';
        
        return '';
    };

    // Currency conversion helper
    const convertCurrency = (usdAmount) => {
        const rate = CONFIG.FX[inputs.currency] || 1;
        return usdAmount * rate;
    };

    const getCurrencySymbol = () => {
        return CONFIG.SYMBOLS[inputs.currency] || '$';
    };

    const handleInputChange = (field, value) => {
        setInputs(prev => ({ ...prev, [field]: value }));
    };

    const handleEfficiencyChange = (field, value) => {
        setEfficiencyValues(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
    };

    const calculate = () => {
        // --- READ INPUTS ---
        const {
            roomL, roomW, roomH, uValue, ambientTemp, setpointTemp,
            duration, doorOpenings, airExchange, ach,
            electricityTariff, dieselPrice, hpCOP, refrigerantType,
            installationCost, projectLifespan, discountRate, implementationDelay,
            systemType, storageType, psh, solarInstallCost, batteryCost, pcmCost, standbyFuel
        } = inputs;

        // --- CALCULATE LOADS ---
        const roomVolume_m3 = roomL * roomW * roomH;
        const surfaceArea_m2 = (2 * roomL * roomH) + (2 * roomW * roomH) + (roomL * roomW);
        const deltaT = Math.max(0, setpointTemp - ambientTemp);
        
        const steadyLoad_kW = ((uValue * surfaceArea_m2 * deltaT) / 1000) + 
            ((roomVolume_m3 * ach * CONFIG.AIR_DENSITY_KG_M3 * CONFIG.AIR_SPECIFIC_HEAT_KJ_KGK * deltaT) / 3600);
        
        const doorEnergy_perOpening_kWh = (roomVolume_m3 * (airExchange / 100) * CONFIG.AIR_DENSITY_KG_M3 * 
            CONFIG.AIR_SPECIFIC_HEAT_KJ_KGK * deltaT) / 3600;
        
        const warmUpEnergy_kWh = (roomVolume_m3 * CONFIG.AIR_DENSITY_KG_M3 * 
            CONFIG.AIR_SPECIFIC_HEAT_KJ_KGK * deltaT) / 3600;
        
        const peakLoad_kW = warmUpEnergy_kWh + steadyLoad_kW;
        const totalThermalLoad_kWh = (steadyLoad_kW * duration) + (doorEnergy_perOpening_kWh * doorOpenings);
        
        // --- BOILER ANALYSIS ---
        const diesel_for_heat_L = systemEfficiency > 0 ? 
            totalThermalLoad_kWh / (CONFIG.DIESEL_LHV_KWH_L * (systemEfficiency / 100)) : 0;
        const boiler_diesel_standby_L = standbyFuel * duration;
        const total_diesel_L = diesel_for_heat_L + boiler_diesel_standby_L;
        const boiler_cost = total_diesel_L * dieselPrice;
        const boiler_co2_kg = total_diesel_L * CONFIG.DIESEL_CO2_KG_PER_L;
        
        // --- HEAT PUMP SELECTION FROM FIREBASE ---
        // Filter products that are heat pumps (iHEAT or AquaHERO) with kW rating
        const allHeatPumps = products
            .filter(p => {
                const category = (p.category || '').trim().toLowerCase();
                const name = (p.name || '').toLowerCase();
                const isHeatPump = category.includes('iheat') || category.includes('aquahero') || 
                                   name.includes('iheat') || name.includes('aquahero');
                const hasKW = getPeakKwFromName(p.name) > 0;
                return isHeatPump && hasKW;
            });
        
        // Filter by refrigerant type if specified
        let availableHeatPumps = allHeatPumps;
        if (refrigerantType !== 'all') {
            availableHeatPumps = allHeatPumps.filter(hp => {
                const hpRefrigerant = getRefrigerantFromName(hp.name);
                return hpRefrigerant === refrigerantType;
            });
        }
        
        // Sort by kW capacity
        availableHeatPumps.sort((a, b) => getPeakKwFromName(a.name) - getPeakKwFromName(b.name));
        
        console.log('=== Heat Pump Selection ===');
        console.log('Refrigerant filter:', refrigerantType);
        console.log('Total heat pumps in database:', allHeatPumps.length);
        console.log('After refrigerant filter:', availableHeatPumps.length);
        console.log('Peak load required:', peakLoad_kW.toFixed(1), 'kW');
        
        // Find heat pump that meets capacity requirement
        let candidateHeatPumps = availableHeatPumps.filter(hp => getPeakKwFromName(hp.name) >= peakLoad_kW);
        
        let selectedHeatPump = null;
        
        if (refrigerantType === 'all') {
            // Best price mode: find cheapest among candidates
            if (candidateHeatPumps.length > 0) {
                selectedHeatPump = candidateHeatPumps.reduce((cheapest, current) => {
                    const cheapestPrice = cheapest.salesPriceUSD || Infinity;
                    const currentPrice = current.salesPriceUSD || Infinity;
                    return currentPrice < cheapestPrice ? current : cheapest;
                });
                console.log('Best price selection:', selectedHeatPump.name, '- $' + selectedHeatPump.salesPriceUSD);
            }
        } else {
            // Specific refrigerant: pick smallest that meets requirement
            selectedHeatPump = candidateHeatPumps[0];
        }
        
        // Fallback to largest available if none meet requirement
        if (!selectedHeatPump && availableHeatPumps.length > 0) {
            selectedHeatPump = availableHeatPumps[availableHeatPumps.length - 1];
            console.log('⚠️ No heat pump meets peak load requirement. Using largest available:', selectedHeatPump.name);
        }
        
        if (!selectedHeatPump) {
            const refrigerantMsg = refrigerantType === 'all' ? 'any refrigerant type' : refrigerantType;
            alert(`No suitable heat pump found in database for ${refrigerantMsg}!\n\nPlease check:\n1. Products exist with "iHEAT" or "AquaHERO" in name/category\n2. Product names include refrigerant type (R290, R32, CO2)\n3. Product names include "kW" (e.g., "30kW")\n4. salesPriceUSD is set\n\nFound ${products.length} total products in database.\nFound ${allHeatPumps.length} heat pump products.\n${refrigerantType !== 'all' ? `Found ${availableHeatPumps.length} with ${refrigerantType} refrigerant.` : ''}`);
            return;
        }
        
        console.log('✅ Selected:', selectedHeatPump.name, '(' + getPeakKwFromName(selectedHeatPump.name).toFixed(1) + ' kW)');

        // Temperature compatibility check
        const detectedRefrigerant = getRefrigerantFromName(selectedHeatPump.name);
        let compatibility = { isCompatible: true, message: "System is suitable for the required temperature." };
        
        if ((detectedRefrigerant === 'R32' && CONFIG.REQUIRED_WATER_TEMP_C > 60) || 
            (detectedRefrigerant === 'R290' && CONFIG.REQUIRED_WATER_TEMP_C > 80)) {
            compatibility.isCompatible = false;
            compatibility.message = `Warning: ${detectedRefrigerant} heat pumps may not be suitable for ${CONFIG.REQUIRED_WATER_TEMP_C}°C water temperature.`;
        }

        // --- TANK SELECTION FROM FIREBASE ---
        const requiredTankSizeL = getPeakKwFromName(selectedHeatPump.name) * CONFIG.TANK_SIZING_L_PER_KW;
        const availableTanks = products
            .filter(p => {
                const catLower = (p.category || '').toLowerCase();
                return catLower.includes('istor') || catLower.includes('storage') || catLower.includes('tank');
            })
            .filter(p => getTankLitersFromName(p.name) > 0)
            .sort((a, b) => getTankLitersFromName(a.name) - getTankLitersFromName(b.name));
        
        let selectedTank = availableTanks.find(t => getTankLitersFromName(t.name) >= requiredTankSizeL) || 
            availableTanks[availableTanks.length - 1];
        
        console.log('Available tanks:', availableTanks.length);
        console.log('Required tank size:', requiredTankSizeL, 'L');

        // --- FAN COIL SELECTION FROM FIREBASE ---
        const requiredFanCoilKw = peakLoad_kW / 2; // Split between 2 units
        
        // Helper to get fan coil heating capacity from either field or name
        const getFanCoilHeatingKw = (product) => {
            // Try the dedicated heating field first (for new fan coils)
            if (product.kW_Heating_Nominal && product.kW_Heating_Nominal > 0) {
                return product.kW_Heating_Nominal;
            }
            // Fallback to DHW field (for older products)
            if (product.kW_DHW_Nominal && product.kW_DHW_Nominal > 0) {
                return product.kW_DHW_Nominal;
            }
            // Last resort: parse from name
            return getPeakKwFromName(product.name);
        };
        
        const availableFanCoils = products
            .filter(p => {
                const nameLower = (p.name || '').toLowerCase();
                const categoryLower = (p.category || '').toLowerCase();
                const isFanCoil = nameLower.includes('izone') || nameLower.includes('fcu') || 
                                  nameLower.includes('fan coil') || categoryLower.includes('fan coil') ||
                                  categoryLower.includes('izone');
                const hasCapacity = getFanCoilHeatingKw(p) > 0;
                return isFanCoil && hasCapacity;
            })
            .sort((a, b) => getFanCoilHeatingKw(a) - getFanCoilHeatingKw(b));
        
        console.log('Available fan coils:', availableFanCoils.length);
        console.log('Required fan coil capacity:', requiredFanCoilKw.toFixed(1), 'kW each');
        console.log('Sample fan coils:', availableFanCoils.slice(0, 3).map(f => ({ 
            name: f.name, 
            heatingKw: getFanCoilHeatingKw(f) 
        })));
        
        let selectedFanCoil = availableFanCoils.find(f => getFanCoilHeatingKw(f) >= requiredFanCoilKw) || 
            availableFanCoils[availableFanCoils.length - 1];
        
        console.log('✅ Selected fan coil:', selectedFanCoil?.name, 
            selectedFanCoil ? `(${getFanCoilHeatingKw(selectedFanCoil).toFixed(1)} kW)` : 'NONE');

        // --- CAPEX CALCULATION ---
        const fxRate = CONFIG.FX[currency] || CONFIG.FX.PHP;
        const heatPumpSalePrice = selectedHeatPump ? (selectedHeatPump.salesPriceUSD * fxRate) : 0;
        const tankSalePrice = selectedTank ? (selectedTank.salesPriceUSD * fxRate) : 0;
        const fanCoilSalePrice = selectedFanCoil ? (selectedFanCoil.salesPriceUSD * fxRate * 2) : 0;
        
        // --- HP & SOLAR ANALYSIS ---
        const hp_total_electric_kWh = totalThermalLoad_kWh / hpCOP;
        let hp_grid_import_kWh = hp_total_electric_kWh;
        let pvHardwareCostPHP = 0, pvInstallCostPHP = 0, storageCostPHP = 0, requiredPV_kWp = 0;
        let storage = { type: 'N/A', requiredSize: 0, units: '' };

        if (systemType === 'grid-solar') {
            requiredPV_kWp = getPeakKwFromName(selectedHeatPump.name) / hpCOP;
            const weekendPV_kWh = requiredPV_kWp * psh * CONFIG.PV_DERATE_FACTOR * CONFIG.WEEKEND_SUN_DAYS;
            const totalSunHours = psh * CONFIG.WEEKEND_SUN_DAYS;
            const daytimeRatio = Math.min(1, totalSunHours / duration);
            const hp_daytime_electric_kWh = hp_total_electric_kWh * daytimeRatio;
            const hp_nighttime_electric_kWh = hp_total_electric_kWh * (1 - daytimeRatio);
            const excessPV_kWh = Math.max(0, weekendPV_kWh - hp_daytime_electric_kWh);
            
            if (storageType === 'none') {
                storage.type = 'None (Grid Backup)';
                hp_grid_import_kWh = Math.max(0, hp_daytime_electric_kWh - weekendPV_kWh) + hp_nighttime_electric_kWh;
            } else if (storageType === 'battery') {
                storage.type = 'Lithium Battery';
                const energyFromBattery = Math.min(hp_nighttime_electric_kWh, excessPV_kWh);
                hp_grid_import_kWh = Math.max(0, hp_daytime_electric_kWh - weekendPV_kWh) + 
                    (hp_nighttime_electric_kWh - energyFromBattery);
                storage.requiredSize = hp_nighttime_electric_kWh / CONFIG.BATTERY_DOD;
                storage.units = 'kWh';
                storageCostPHP = storage.requiredSize * batteryCost;
            } else if (storageType === 'pcm') {
                storage.type = 'Thermal (PCM) Storage';
                const nighttime_thermal_kWh = totalThermalLoad_kWh * (1 - daytimeRatio);
                storage.requiredSize = nighttime_thermal_kWh;
                storage.units = 'kWh (thermal)';
                storageCostPHP = storage.requiredSize * pcmCost;
                const pcm_charge_electric_kWh = nighttime_thermal_kWh / hpCOP;
                const total_daytime_demand_kWh = hp_daytime_electric_kWh + pcm_charge_electric_kWh;
                hp_grid_import_kWh = Math.max(0, total_daytime_demand_kWh - weekendPV_kWh);
            }

            const numPanels = Math.ceil(requiredPV_kWp / CONFIG.SOLAR_PANEL_KW_RATED);
            const solarHardwareUSD = (numPanels * CONFIG.SOLAR_PANEL_COST_USD) + 
                (requiredPV_kWp * 1000 * CONFIG.INVERTER_COST_PER_WATT_USD);
            pvHardwareCostPHP = solarHardwareUSD * fxRate;
            pvInstallCostPHP = requiredPV_kWp * solarInstallCost;
        }
        
        const hp_cost = hp_grid_import_kWh * electricityTariff;
        const hp_co2_kg = hp_grid_import_kWh * CONFIG.GRID_CO2_KG_PER_KWH;
        
        // --- FINAL CAPEX & ROI ---
        const totalCapex = heatPumpSalePrice + tankSalePrice + fanCoilSalePrice + installationCost + 
            pvHardwareCostPHP + pvInstallCostPHP + storageCostPHP;
        const weekend_savings = boiler_cost - hp_cost;
        const annualSavings = weekend_savings * 52;
        const simplePayback = totalCapex > 0 && annualSavings > 0 ? totalCapex / annualSavings : 0;
        
        const weekend_co2_savings_kg = boiler_co2_kg - hp_co2_kg;
        const annual_co2_savings_kg = weekend_co2_savings_kg * 52;

        let total_pv_of_savings = 0;
        for (let year = 1; year <= projectLifespan; year++) {
            total_pv_of_savings += annualSavings / Math.pow(1 + (discountRate / 100), year);
        }
        const npv = total_pv_of_savings - totalCapex;
        const costOfDelay = npv - (npv / Math.pow(1 + (discountRate / 100), implementationDelay / 12));
        
        // --- ENTERPRISE ROI CALCULATIONS ---
        let enterpriseROI = null;
        if (inputs.enableEnterpriseROI) {
            // Calculate IRR (simplified iterative approach)
            const calculateIRR = (cashFlows, initialGuess = 0.1) => {
                const maxIterations = 100;
                const tolerance = 0.0001;
                let irr = initialGuess;
                
                for (let i = 0; i < maxIterations; i++) {
                    let npvAtRate = -totalCapex;
                    let derivative = 0;
                    
                    for (let year = 1; year <= projectLifespan; year++) {
                        npvAtRate += annualSavings / Math.pow(1 + irr, year);
                        derivative -= year * annualSavings / Math.pow(1 + irr, year + 1);
                    }
                    
                    if (Math.abs(npvAtRate) < tolerance) break;
                    irr = irr - npvAtRate / derivative;
                }
                
                return irr;
            };
            
            const irr = calculateIRR() * 100;
            
            // Calculate NPV with enterprise WACC
            let npv_enterprise = -totalCapex;
            for (let year = 1; year <= projectLifespan; year++) {
                npv_enterprise += annualSavings / Math.pow(1 + inputs.enterpriseWACC, year);
            }
            
            // CSV Scoring (Creating Shared Value)
            const carbonScore = Math.min(10, (annual_co2_savings_kg / 10000) * 10); // 10k kg = 10/10
            const energyScore = Math.min(10, ((boiler_cost - hp_cost) / boiler_cost) * 10); // % savings
            const waterScore = inputs.waterSavingsScore || 5;
            const reliabilityScore = inputs.reliabilityScore || 8;
            const innovationScore = inputs.innovationScore || 7;
            
            const csvScore = (carbonScore + energyScore + waterScore + reliabilityScore + innovationScore) / 5;
            const csvMultiplier = 1 + (csvScore / 20); // Max 1.5x multiplier
            const strategicROI = (irr * csvMultiplier);
            
            // Viability checks
            const positiveNPV = npv_enterprise > 0;
            const meetsHurdleRate = irr > 12; // 12% hurdle rate
            const strategicallyViable = csvScore >= 6.0;
            const isViable = positiveNPV && (meetsHurdleRate || strategicallyViable);
            
            let recommendation = '';
            if (isViable && meetsHurdleRate && strategicallyViable) {
                recommendation = '✅ STRONG APPROVAL: Project meets all financial and strategic criteria. High NPV, IRR exceeds hurdle rate, and strong CSV alignment.';
            } else if (isViable && positiveNPV) {
                recommendation = '✅ CONDITIONAL APPROVAL: Positive NPV with strategic value. Consider as part of sustainability roadmap even if IRR is below hurdle.';
            } else if (positiveNPV && strategicallyViable) {
                recommendation = '⚠️ STRATEGIC CONSIDERATION: Below financial hurdle but strong strategic value. May warrant approval for ESG/sustainability goals.';
            } else {
                recommendation = '❌ NOT RECOMMENDED: Project does not meet minimum financial or strategic thresholds at current assumptions.';
            }
            
            enterpriseROI = {
                financial: {
                    npv: npv_enterprise,
                    irr: irr,
                    simpleROI: ((total_pv_of_savings - totalCapex) / totalCapex) * 100,
                    paybackYears: simplePayback
                },
                csv: {
                    score: csvScore,
                    breakdown: {
                        carbon: carbonScore,
                        energy: energyScore,
                        water: waterScore,
                        reliability: reliabilityScore,
                        innovation: innovationScore
                    },
                    multiplier: csvMultiplier,
                    strategicROI: strategicROI
                },
                viability: {
                    isViable,
                    positiveNPV,
                    meetsHurdleRate,
                    strategicallyViable,
                    recommendation
                }
            };
        }
        
        // Store results
        setResults({
            loads: { peakLoad_kW, steadyLoad_kW, totalThermalLoad_kWh, warmUpEnergy_kWh },
            hp: { selection: selectedHeatPump, compatibility },
            tank: { selection: selectedTank, requiredSize: requiredTankSizeL },
            fanCoil: { selection: selectedFanCoil, requiredKw: requiredFanCoilKw },
            boiler: { total_diesel_L, cost: boiler_cost, co2_kg: boiler_co2_kg },
            heatPump: { total_electric_kWh: hp_total_electric_kWh, grid_import_kWh: hp_grid_import_kWh, cost: hp_cost, co2_kg: hp_co2_kg },
            savings: { 
                weekend: weekend_savings,
                annual: annualSavings, 
                weekend_co2_kg: weekend_co2_savings_kg,
                annual_co2_kg: annual_co2_savings_kg 
            },
            roi: { payback: simplePayback, npv, costOfDelay },
            capex: { 
                total: totalCapex, 
                hp: heatPumpSalePrice, 
                tank: tankSalePrice, 
                fanCoil: fanCoilSalePrice, 
                install: installationCost, 
                pvHardware: pvHardwareCostPHP, 
                pvInstall: pvInstallCostPHP, 
                storage: storageCostPHP 
            },
            solar: { storage, requiredPV_kWp },
            enterpriseROI: enterpriseROI
        });
        
        setShowReport(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const fmt = (n, decimals = 0) => {
        if (n === null || n === undefined || isNaN(n)) return '0';
        return Number(n).toLocaleString(undefined, { 
            minimumFractionDigits: decimals, 
            maximumFractionDigits: decimals 
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading product database...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        onClick={() => setActiveView('calculators')}
                        variant="secondary"
                        className="flex items-center gap-2"
                    >
                        <ArrowLeft size={16} />
                        Back
                    </Button>
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                            <Flame className="text-red-600" />
                            Warm Room Heating Calculator
                        </h2>
                        <p className="text-gray-600 mt-1">Industrial heat pump sizing for temperature-controlled rooms</p>
                    </div>
                </div>
            </div>

            {/* Results Report */}
            {showReport && results && (
                <div className="bg-white rounded-xl shadow-lg border-2 border-orange-500 p-8 mb-6">
                    <h3 className="text-2xl font-bold text-center text-gray-800 mb-6 border-b-2 border-orange-500 pb-3">
                        Project Proposal: Warm Room Electrification
                    </h3>

                    {/* Compatibility Status */}
                    <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
                        results.hp.compatibility.isCompatible 
                            ? 'bg-green-50 border-2 border-green-500' 
                            : 'bg-yellow-50 border-2 border-yellow-500'
                    }`}>
                        {results.hp.compatibility.isCompatible ? (
                            <CheckCircle className="text-green-600 flex-shrink-0" size={24} />
                        ) : (
                            <AlertCircle className="text-yellow-600 flex-shrink-0" size={24} />
                        )}
                        <div>
                            <p className={`font-semibold ${
                                results.hp.compatibility.isCompatible ? 'text-green-800' : 'text-yellow-800'
                            }`}>
                                {results.hp.compatibility.message}
                            </p>
                        </div>
                    </div>

                    {/* ENTERPRISE ROI RESULTS */}
                    {results.enterpriseROI && (
                        <div className="mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border-2 border-blue-300">
                            <div className="flex items-center gap-2 mb-4">
                                <Target className="text-blue-600" size={28}/>
                                <h3 className="text-2xl font-bold text-blue-900">Enterprise ROI Analysis</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div className="bg-white p-4 rounded-lg border-2 border-blue-200 shadow-sm">
                                    <div className="flex items-center gap-2 mb-2">
                                        <TrendingUp className="text-green-600" size={20}/>
                                        <p className="text-xs font-bold text-gray-500 uppercase">NPV @ {(inputs.enterpriseWACC * 100).toFixed(1)}%</p>
                                    </div>
                                    <p className="text-2xl font-bold text-green-600">{getCurrencySymbol()}{fmt(results.enterpriseROI.financial.npv)}</p>
                                </div>
                                <div className="bg-white p-4 rounded-lg border-2 border-blue-200 shadow-sm">
                                    <div className="flex items-center gap-2 mb-2">
                                        <BarChart3 className="text-blue-600" size={20}/>
                                        <p className="text-xs font-bold text-gray-500 uppercase">Internal Rate of Return</p>
                                    </div>
                                    <p className="text-2xl font-bold text-blue-600">{results.enterpriseROI.financial.irr.toFixed(1)}%</p>
                                </div>
                                <div className="bg-white p-4 rounded-lg border-2 border-indigo-200 shadow-sm">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Award className="text-indigo-600" size={20}/>
                                        <p className="text-xs font-bold text-gray-500 uppercase">Strategic ROI</p>
                                    </div>
                                    <p className="text-2xl font-bold text-indigo-600">{results.enterpriseROI.csv.strategicROI.toFixed(1)}%</p>
                                </div>
                            </div>

                            <div className={`p-4 rounded-lg border-2 mb-6 ${
                                results.enterpriseROI.viability.isViable 
                                    ? 'bg-green-50 border-green-300' 
                                    : 'bg-yellow-50 border-yellow-300'
                            }`}>
                                <div className="flex items-start gap-3">
                                    {results.enterpriseROI.viability.isViable ? (
                                        <CheckCircle className="text-green-600 flex-shrink-0" size={24}/>
                                    ) : (
                                        <AlertCircle className="text-yellow-600 flex-shrink-0" size={24}/>
                                    )}
                                    <div>
                                        <h4 className="font-bold text-gray-800 mb-2">Investment Recommendation</h4>
                                        <p className="text-sm text-gray-700 mb-3">{results.enterpriseROI.viability.recommendation}</p>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                                            <div className="flex items-center gap-1">
                                                {results.enterpriseROI.viability.positiveNPV ? '✅' : '❌'}
                                                <span>Positive NPV</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {results.enterpriseROI.viability.meetsHurdleRate ? '✅' : '❌'}
                                                <span>IRR &gt; 12% Hurdle</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {results.enterpriseROI.viability.strategicallyViable ? '✅' : '❌'}
                                                <span>Strategic Criteria</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-bold text-gray-800">Creating Shared Value (CSV) Scorecard</h4>
                                    <div className="text-2xl font-bold text-indigo-600">{results.enterpriseROI.csv.score.toFixed(1)}/10</div>
                                </div>
                                
                                <div className="space-y-2">
                                    {Object.entries(results.enterpriseROI.csv.breakdown).map(([key, value]) => (
                                        <div key={key} className="flex items-center gap-2">
                                            <div className="w-32 text-sm text-gray-600 capitalize">{key}</div>
                                            <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                                                <div 
                                                    className="bg-gradient-to-r from-blue-400 to-indigo-500 h-full rounded-full transition-all duration-500"
                                                    style={{ width: `${(value / 10) * 100}%` }}
                                                ></div>
                                            </div>
                                            <div className="w-12 text-sm font-bold text-gray-700 text-right">{value.toFixed(1)}</div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-600">
                                    <p><strong>CSV Multiplier:</strong> {results.enterpriseROI.csv.multiplier.toFixed(2)}x (adds {((results.enterpriseROI.csv.multiplier - 1) * 100).toFixed(1)}% strategic value)</p>
                                </div>
                            </div>

                            <Button 
                                variant="secondary" 
                                onClick={() => setShowEnterpriseDetails(!showEnterpriseDetails)}
                                className="w-full flex items-center justify-center gap-2"
                            >
                                {showEnterpriseDetails ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
                                {showEnterpriseDetails ? 'Hide' : 'Show'} Detailed Financials
                            </Button>

                            {showEnterpriseDetails && (
                                <div className="mt-4 pt-4 border-t border-blue-200 space-y-4">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-gray-600">Simple ROI</p>
                                            <p className="font-bold text-lg">{results.enterpriseROI.financial.simpleROI.toFixed(1)}%</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600">Payback Period</p>
                                            <p className="font-bold text-lg">{results.enterpriseROI.financial.paybackYears.toFixed(1)} yrs</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* System Summary */}
                    <div className="mb-6">
                        <h4 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <Calculator size={20} className="text-orange-600" />
                            1. Recommended System & Heating Loads
                        </h4>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    <table className="w-full">
                                        <tbody>
                                            <tr className="border-b">
                                                <th className="text-left py-3 text-gray-600">Selected Heat Pump</th>
                                                <td className="text-right py-3 font-bold text-gray-900">
                                                    {results.hp.selection?.name || 'N/A'}
                                                </td>
                                            </tr>
                                            <tr className="border-b">
                                                <th className="text-left py-3 text-gray-600">Peak Heating Load (Warm-up)</th>
                                                <td className="text-right py-3 font-bold text-orange-600">
                                                    {fmt(results.loads.peakLoad_kW, 1)} kW
                                                </td>
                                            </tr>
                                            <tr className="border-b">
                                                <th className="text-left py-3 text-gray-600">Steady-State Load</th>
                                                <td className="text-right py-3">
                                                    {fmt(results.loads.steadyLoad_kW, 1)} kW
                                                </td>
                                            </tr>
                                            <tr className="border-b">
                                                <th className="text-left py-3 text-gray-600">Total Weekend Thermal Energy</th>
                                                <td className="text-right py-3">
                                                    {fmt(results.loads.totalThermalLoad_kWh, 0)} kWh
                                                </td>
                                            </tr>
                                            <tr>
                                                <th className="text-left py-3 text-gray-600">Est. Weekend Carbon Reduction</th>
                                                <td className="text-right py-3 font-bold text-green-600">
                                                    {fmt(results.savings.weekend_co2_kg, 1)} kg CO₂
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <Button 
                                    variant="secondary" 
                                    onClick={() => setShowCalculations(!showCalculations)}
                                    className="ml-4 text-sm flex items-center gap-1"
                                >
                                    {showCalculations ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                                    {showCalculations ? 'Hide' : 'Show'} Math
                                </Button>
                            </div>

                            {showCalculations && (
                                <div className="mt-4 pt-4 border-t border-gray-300 bg-white p-4 rounded-lg">
                                    <h5 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                        <Calculator size={18} className="text-orange-600"/>
                                        Thermal Load Calculations
                                    </h5>
                                    <div className="space-y-3 text-sm">
                                        <div className="bg-blue-50 p-3 rounded">
                                            <p className="font-semibold text-blue-900 mb-2">Room Geometry:</p>
                                            <div className="space-y-1 text-gray-700">
                                                <div className="flex justify-between">
                                                    <span>Volume:</span>
                                                    <span className="font-mono">{inputs.roomL} × {inputs.roomW} × {inputs.roomH} = {(inputs.roomL * inputs.roomW * inputs.roomH).toFixed(1)} m³</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Surface Area:</span>
                                                    <span className="font-mono">{((2 * inputs.roomL * inputs.roomH) + (2 * inputs.roomW * inputs.roomH) + (inputs.roomL * inputs.roomW)).toFixed(1)} m²</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Temperature Lift (ΔT):</span>
                                                    <span className="font-mono">{inputs.setpointTemp} - {inputs.ambientTemp} = {inputs.setpointTemp - inputs.ambientTemp}°C</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-orange-50 p-3 rounded">
                                            <p className="font-semibold text-orange-900 mb-2">Steady-State Heat Loss:</p>
                                            <div className="space-y-1 text-gray-700">
                                                <div className="flex justify-between">
                                                    <span>Conduction Loss:</span>
                                                    <span className="font-mono">U × A × ΔT = {results.loads.steadyLoad_kW.toFixed(2)} kW</span>
                                                </div>
                                                <div className="flex justify-between text-xs text-gray-600">
                                                    <span>Formula:</span>
                                                    <span className="font-mono">{inputs.uValue} W/m²K × {((2 * inputs.roomL * inputs.roomH) + (2 * inputs.roomW * inputs.roomH) + (inputs.roomL * inputs.roomW)).toFixed(1)} m² × {inputs.setpointTemp - inputs.ambientTemp}°C ÷ 1000</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-green-50 p-3 rounded">
                                            <p className="font-semibold text-green-900 mb-2">Warm-up Energy:</p>
                                            <div className="space-y-1 text-gray-700">
                                                <div className="flex justify-between">
                                                    <span>Air Mass:</span>
                                                    <span className="font-mono">{(inputs.roomL * inputs.roomW * inputs.roomH * CONFIG.AIR_DENSITY_KG_M3).toFixed(1)} kg</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Warm-up Energy Required:</span>
                                                    <span className="font-mono font-bold text-green-700">{results.loads.warmUpEnergy_kWh.toFixed(1)} kWh</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-purple-50 p-3 rounded">
                                            <p className="font-semibold text-purple-900 mb-2">Door Opening Losses:</p>
                                            <div className="space-y-1 text-gray-700">
                                                <div className="flex justify-between">
                                                    <span>Energy per Opening:</span>
                                                    <span className="font-mono">{((inputs.roomL * inputs.roomW * inputs.roomH * (inputs.airExchange/100) * CONFIG.AIR_DENSITY_KG_M3 * CONFIG.AIR_SPECIFIC_HEAT_KJ_KGK * (inputs.setpointTemp - inputs.ambientTemp)) / 3600).toFixed(2)} kWh</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Number of Openings:</span>
                                                    <span className="font-mono">{inputs.doorOpenings}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Total Door Loss:</span>
                                                    <span className="font-mono font-bold text-purple-700">{(((inputs.roomL * inputs.roomW * inputs.roomH * (inputs.airExchange/100) * CONFIG.AIR_DENSITY_KG_M3 * CONFIG.AIR_SPECIFIC_HEAT_KJ_KGK * (inputs.setpointTemp - inputs.ambientTemp)) / 3600) * inputs.doorOpenings).toFixed(1)} kWh</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="h-px bg-gray-300 my-3"></div>

                                        <div className="bg-gradient-to-r from-orange-100 to-red-100 p-4 rounded-lg border-2 border-orange-500">
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-base">
                                                    <span className="font-bold text-gray-800">Peak Load (Warm-up + Steady):</span>
                                                    <span className="font-mono font-bold text-orange-600 text-lg">{fmt(results.loads.peakLoad_kW, 1)} kW</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="font-bold text-gray-800">Total Weekend Energy:</span>
                                                    <span className="font-mono font-bold text-orange-600 text-lg">{fmt(results.loads.totalThermalLoad_kWh, 0)} kWh</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="mb-6">
                        <h4 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <DollarSign size={20} className="text-orange-600" />
                            2. Financial Summary & ROI
                        </h4>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <table className="w-full">
                                <tbody>
                                    <tr className="border-b">
                                        <th className="text-left py-3 text-gray-600">
                                            Heat Pump ({results.hp.selection?.name})
                                        </th>
                                        <td className="text-right py-3">{getCurrencySymbol()} {fmt(results.capex.hp)}</td>
                                    </tr>
                                    <tr className="border-b">
                                        <th className="text-left py-3 text-gray-600">
                                            Fan Coil Units (2 × {results.fanCoil.selection?.name || 'N/A'})
                                        </th>
                                        <td className="text-right py-3">{getCurrencySymbol()} {fmt(results.capex.fanCoil)}</td>
                                    </tr>
                                    <tr className="border-b">
                                        <th className="text-left py-3 text-gray-600">
                                            Thermal Storage Tank ({results.tank.selection?.name || 'N/A'})
                                        </th>
                                        <td className="text-right py-3">{getCurrencySymbol()} {fmt(results.capex.tank)}</td>
                                    </tr>
                                    <tr className="border-b">
                                        <th className="text-left py-3 text-gray-600">Installation & Commissioning</th>
                                        <td className="text-right py-3">{getCurrencySymbol()} {fmt(results.capex.install)}</td>
                                    </tr>
                                    {results.capex.pvHardware > 0 && (
                                        <>
                                            <tr className="border-b">
                                                <th className="text-left py-3 text-gray-600">
                                                    Solar PV Hardware ({fmt(results.solar.requiredPV_kWp, 1)} kWp)
                                                </th>
                                                <td className="text-right py-3">{getCurrencySymbol()} {fmt(results.capex.pvHardware)}</td>
                                            </tr>
                                            <tr className="border-b">
                                                <th className="text-left py-3 text-gray-600">Solar PV Installation</th>
                                                <td className="text-right py-3">{getCurrencySymbol()} {fmt(results.capex.pvInstall)}</td>
                                            </tr>
                                        </>
                                    )}
                                    {results.capex.storage > 0 && (
                                        <tr className="border-b">
                                            <th className="text-left py-3 text-gray-600">
                                                {results.solar.storage.type} ({fmt(results.solar.storage.requiredSize, 1)} {results.solar.storage.units})
                                            </th>
                                            <td className="text-right py-3">{getCurrencySymbol()} {fmt(results.capex.storage)}</td>
                                        </tr>
                                    )}
                                    <tr className="border-b-2 border-orange-500">
                                        <th className="text-left py-3 font-bold text-gray-900">
                                            Total Project Investment (CAPEX)
                                        </th>
                                        <td className="text-right py-3 font-bold text-orange-600 text-lg">
                                            {getCurrencySymbol()} {fmt(results.capex.total)}
                                        </td>
                                    </tr>
                                    <tr className="border-b">
                                        <th className="text-left py-3 text-gray-600">Estimated Annual Savings</th>
                                        <td className="text-right py-3 font-bold text-green-600">
                                            {getCurrencySymbol()} {fmt(results.savings.annual)}
                                        </td>
                                    </tr>
                                    <tr className="border-b">
                                        <th className="text-left py-3 text-gray-600">Estimated Annual Carbon Savings</th>
                                        <td className="text-right py-3 font-bold text-green-600">
                                            {fmt(results.savings.annual_co2_kg, 0)} kg CO₂
                                        </td>
                                    </tr>
                                    <tr className="border-b">
                                        <th className="text-left py-3 text-gray-600">Simple Payback Period</th>
                                        <td className="text-right py-3 font-bold text-blue-600">
                                            {fmt(results.roi.payback, 1)} Years
                                        </td>
                                    </tr>
                                    <tr>
                                        <th className="text-left py-3 text-gray-600">Net Present Value (NPV)</th>
                                        <td className="text-right py-3 font-bold text-purple-600">
                                            {getCurrencySymbol()} {fmt(results.roi.npv)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Cost of Delay */}
                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-500 rounded-lg p-6 text-center">
                        <h4 className="text-xl font-semibold text-gray-800 mb-2 flex items-center justify-center gap-2">
                            <TrendingUp className="text-yellow-600" size={24} />
                            The Cost of Delay
                        </h4>
                        <p className="text-gray-700 mb-4">
                            A delay in project approval will result in lost savings, reducing the project's total value.
                        </p>
                        <div className="text-4xl font-bold text-orange-600">
                            {getCurrencySymbol()} {fmt(results.roi.costOfDelay)}
                        </div>
                        <p className="text-sm text-gray-600 mt-2">
                            Lost project value over {inputs.implementationDelay} months delay
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-6 flex gap-3 justify-end">
                        <Button
                            onClick={() => window.print()}
                            variant="secondary"
                            className="flex items-center gap-2"
                        >
                            <Download size={16} />
                            Print / Save PDF
                        </Button>
                        <Button
                            onClick={() => setShowReport(false)}
                            variant="primary"
                        >
                            Edit Inputs
                        </Button>
                    </div>
                </div>
            )}

            {/* Input Form */}
            {!showReport && (
                <div className="bg-white rounded-xl shadow-lg p-8">
                    {/* ENTERPRISE ROI TOGGLE */}
                    <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Award className="text-blue-600" size={24}/>
                                <div>
                                    <h3 className="font-bold text-gray-800">Enterprise ROI Mode</h3>
                                    <p className="text-xs text-gray-600">Nestlé-aligned metrics: NPV, IRR, CSV scoring</p>
                                </div>
                            </div>
                            <label className="flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={inputs.enableEnterpriseROI}
                                    onChange={(e) => setInputs(prev => ({ ...prev, enableEnterpriseROI: e.target.checked }))}
                                    className="sr-only peer"
                                />
                                <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                        {inputs.enableEnterpriseROI && (
                            <div className="mt-4 pt-4 border-t border-blue-200">
                                <div className="bg-white p-4 rounded-lg border border-blue-200 mb-4">
                                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                        <AlertCircle size={18} className="text-blue-600"/>
                                        WACC Reference Guide
                                    </h4>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b-2 border-gray-300">
                                                    <th className="text-left py-2 pr-4 font-semibold text-gray-700">Company Type</th>
                                                    <th className="text-left py-2 pr-4 font-semibold text-gray-700">Typical WACC</th>
                                                    <th className="text-left py-2 font-semibold text-gray-700">Why?</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-gray-600">
                                                <tr className="border-b border-gray-200">
                                                    <td className="py-2 pr-4 font-medium">Large Corps (Nestlé, P&G)</td>
                                                    <td className="py-2 pr-4 text-blue-600 font-semibold">6-8%</td>
                                                    <td className="py-2">Low risk, cheap debt, stable</td>
                                                </tr>
                                                <tr className="border-b border-gray-200">
                                                    <td className="py-2 pr-4 font-medium">Mid-size Manufacturing</td>
                                                    <td className="py-2 pr-4 text-blue-600 font-semibold">8-12%</td>
                                                    <td className="py-2">Moderate risk</td>
                                                </tr>
                                                <tr className="border-b border-gray-200">
                                                    <td className="py-2 pr-4 font-medium">Startups</td>
                                                    <td className="py-2 pr-4 text-orange-600 font-semibold">15-25%+</td>
                                                    <td className="py-2">High risk, expensive equity</td>
                                                </tr>
                                                <tr>
                                                    <td className="py-2 pr-4 font-medium">Your customers (SMEs)</td>
                                                    <td className="py-2 pr-4 text-green-600 font-semibold">10-15%</td>
                                                    <td className="py-2">Bank loans at 8-12% + owner equity expectations</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-3 italic">
                                        💡 WACC = Weighted Average Cost of Capital. Use your customer's WACC to calculate NPV in their language.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <InputField 
                                        label="WACC / Discount Rate (%)" 
                                        value={inputs.enterpriseWACC * 100} 
                                        onChange={(e) => setInputs(prev => ({ ...prev, enterpriseWACC: parseFloat(e.target.value) / 100 || 0.07 }))}
                                        step="0.1"
                                    />
                                    <InputField 
                                        label="Annual Facility Revenue (optional)" 
                                        value={inputs.annualRevenue} 
                                        onChange={(e) => setInputs(prev => ({ ...prev, annualRevenue: parseFloat(e.target.value) || 0 }))}
                                    />
                                    <InputField 
                                        label="Water Savings Score (1-10)" 
                                        value={inputs.waterSavingsScore} 
                                        onChange={(e) => setInputs(prev => ({ ...prev, waterSavingsScore: parseFloat(e.target.value) || 5 }))}
                                        min="1"
                                        max="10"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* CURRENCY SELECTOR */}
                    <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <DollarSign className="text-green-600" size={18}/>
                            Display Currency
                        </label>
                        <select
                            value={inputs.currency}
                            onChange={(e) => setInputs(prev => ({ ...prev, currency: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                        >
                            <option value="PHP">🇵🇭 Philippine Peso (₱)</option>
                            <option value="USD">🇺🇸 US Dollar ($)</option>
                            <option value="GBP">🇬🇧 British Pound (£)</option>
                            <option value="CAD">🇨🇦 Canadian Dollar (C$)</option>
                            <option value="EUR">🇪🇺 Euro (€)</option>
                            <option value="AUD">🇦🇺 Australian Dollar (A$)</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-2">All prices and costs will be displayed in {inputs.currency}. Products are stored in USD and converted using live FX rates.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Section 1: Room & Environment */}
                        <div className="bg-gray-50 rounded-lg p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b-2 border-orange-500 pb-2">
                                1. Room & Environment
                            </h3>
                            <div className="space-y-4">
                                <InputField label="Room Length (m)" value={inputs.roomL} 
                                    onChange={(e) => handleInputChange('roomL', parseFloat(e.target.value))} />
                                <InputField label="Room Width (m)" value={inputs.roomW} 
                                    onChange={(e) => handleInputChange('roomW', parseFloat(e.target.value))} />
                                <InputField label="Room Height (m)" value={inputs.roomH} 
                                    onChange={(e) => handleInputChange('roomH', parseFloat(e.target.value))} />
                                <InputField label="Panel U-Value (W/m²·K)" value={inputs.uValue} step="0.01"
                                    onChange={(e) => handleInputChange('uValue', parseFloat(e.target.value))} />
                                <InputField label="Worst-Case Ambient Temp (°C)" value={inputs.ambientTemp} 
                                    onChange={(e) => handleInputChange('ambientTemp', parseFloat(e.target.value))} />
                                <InputField label="Room Setpoint Temp (°C)" value={inputs.setpointTemp} 
                                    onChange={(e) => handleInputChange('setpointTemp', parseFloat(e.target.value))} />
                            </div>
                        </div>

                        {/* Section 2: Operating Profile */}
                        <div className="bg-gray-50 rounded-lg p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b-2 border-orange-500 pb-2">
                                2. Operating Profile (Weekend)
                            </h3>
                            <div className="space-y-4">
                                <InputField label="Operating Duration (hours)" value={inputs.duration} 
                                    onChange={(e) => handleInputChange('duration', parseFloat(e.target.value))} />
                                <InputField label="Number of Door Openings" value={inputs.doorOpenings} 
                                    onChange={(e) => handleInputChange('doorOpenings', parseFloat(e.target.value))} />
                                <InputField label="Air Exchange per Opening (%)" value={inputs.airExchange} 
                                    onChange={(e) => handleInputChange('airExchange', parseFloat(e.target.value))} />
                                <InputField label="Background Air Changes per Hour (ACH)" value={inputs.ach} step="0.1"
                                    onChange={(e) => handleInputChange('ach', parseFloat(e.target.value))} />
                            </div>
                        </div>

                        {/* Section 3: Steam Boiler Inefficiencies */}
                        <div className="bg-gray-50 rounded-lg p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b-2 border-orange-500 pb-2">
                                3. Steam Boiler Inefficiencies
                            </h3>
                            <div className="space-y-3">
                                {CONFIG.EFFICIENCY_BREAKDOWN.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between gap-3">
                                        <label className="text-sm text-gray-700 flex-1">{item.label}</label>
                                        <input
                                            type="number"
                                            value={efficiencyValues[item.id]}
                                            onChange={(e) => handleEfficiencyChange(item.id, e.target.value)}
                                            step="0.5"
                                            className="w-20 px-2 py-1 text-right border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        />
                                    </div>
                                ))}
                                <div className="pt-3 border-t-2 border-gray-300">
                                    <div className="flex items-center justify-between font-bold">
                                        <label className="text-gray-800">Overall Steam System Efficiency (%)</label>
                                        <input
                                            type="number"
                                            value={systemEfficiency.toFixed(1)}
                                            disabled
                                            className="w-20 px-2 py-1 text-right bg-gray-200 border border-gray-400 rounded font-bold text-orange-600"
                                        />
                                    </div>
                                </div>
                                <InputField label="Boiler Standby Fuel Burn (L/hr)" value={inputs.standbyFuel} step="0.1"
                                    onChange={(e) => handleInputChange('standbyFuel', parseFloat(e.target.value))} />
                                <InputField label="Condensate Return (%)" value={inputs.condensateReturn} 
                                    onChange={(e) => handleInputChange('condensateReturn', parseFloat(e.target.value))} />
                            </div>
                        </div>

                        {/* Section 4: Proposed System & Financials */}
                        <div className="bg-gray-50 rounded-lg p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b-2 border-orange-500 pb-2">
                                4. Proposed System & Financials
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Refrigerant Type
                                    </label>
                                    <select
                                        value={inputs.refrigerantType}
                                        onChange={(e) => handleInputChange('refrigerantType', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    >
                                        <option value="all">Best Price (Any)</option>
                                        <option value="R290">R290 Only</option>
                                        <option value="R32">R32 Only</option>
                                        <option value="R744">CO₂ (R744)</option>
                                    </select>
                                </div>
                                <InputField label="Heat Pump COP (at 65°C Water)" value={inputs.hpCOP} step="0.01"
                                    onChange={(e) => handleInputChange('hpCOP', parseFloat(e.target.value))} />
                                <InputField label={`Electricity Tariff (${getCurrencySymbol()}/kWh)`} value={inputs.electricityTariff} step="0.01"
                                    onChange={(e) => handleInputChange('electricityTariff', parseFloat(e.target.value))} />
                                <InputField label={`Diesel Price (${getCurrencySymbol()}/Liter)`} value={inputs.dieselPrice} step="0.01"
                                    onChange={(e) => handleInputChange('dieselPrice', parseFloat(e.target.value))} />
                                <InputField label={`Installation Cost (${getCurrencySymbol()})`} value={inputs.installationCost} 
                                    onChange={(e) => handleInputChange('installationCost', parseFloat(e.target.value))} />
                                <InputField label="Project Lifespan (Years)" value={inputs.projectLifespan} 
                                    onChange={(e) => handleInputChange('projectLifespan', parseFloat(e.target.value))} />
                                <InputField label="Annual Discount Rate (%)" value={inputs.discountRate} step="0.5"
                                    onChange={(e) => handleInputChange('discountRate', parseFloat(e.target.value))} />
                                <InputField label="Implementation Delay (Months)" value={inputs.implementationDelay} 
                                    onChange={(e) => handleInputChange('implementationDelay', parseFloat(e.target.value))} />
                            </div>
                        </div>

                        {/* Section 5: Power System Configuration */}
                        <div className="bg-gray-50 rounded-lg p-6 lg:col-span-2">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b-2 border-orange-500 pb-2">
                                5. Power System Configuration
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Select Power System
                                    </label>
                                    <select
                                        value={inputs.systemType}
                                        onChange={(e) => handleInputChange('systemType', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    >
                                        <option value="grid-only">Grid Only</option>
                                        <option value="grid-solar">Grid + Solar</option>
                                    </select>
                                </div>

                                {inputs.systemType === 'grid-solar' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Energy Storage for Night Hours
                                            </label>
                                            <select
                                                value={inputs.storageType}
                                                onChange={(e) => handleInputChange('storageType', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                            >
                                                <option value="none">None (Grid Backup)</option>
                                                <option value="battery">Lithium Battery</option>
                                                <option value="pcm">Thermal (PCM) Storage</option>
                                            </select>
                                        </div>
                                        <InputField label="Peak Sun Hours per Day (PSH)" value={inputs.psh} step="0.1"
                                            onChange={(e) => handleInputChange('psh', parseFloat(e.target.value))} />
                                        <InputField label={`Solar Installation Cost (${getCurrencySymbol()}/kWp)`} value={inputs.solarInstallCost} 
                                            onChange={(e) => handleInputChange('solarInstallCost', parseFloat(e.target.value))} />
                                        <InputField label={`Battery Cost (${getCurrencySymbol()}/kWh)`} value={inputs.batteryCost} 
                                            onChange={(e) => handleInputChange('batteryCost', parseFloat(e.target.value))} />
                                        <InputField label={`PCM Thermal Storage Cost (${getCurrencySymbol()}/kWh)`} value={inputs.pcmCost} 
                                            onChange={(e) => handleInputChange('pcmCost', parseFloat(e.target.value))} />
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Calculate Button */}
                    <div className="mt-8">
                        <Button
                            onClick={calculate}
                            variant="primary"
                            className="w-full py-4 text-lg font-bold"
                        >
                            <Calculator size={20} className="mr-2" />
                            Generate Proposal
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper Input Component
const InputField = ({ label, value, onChange, type = "number", step = "1", disabled = false }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <input
            type={type}
            value={value}
            onChange={onChange}
            step={step}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-200 disabled:text-gray-600"
        />
    </div>
);

export default WarmRoomCalc;
