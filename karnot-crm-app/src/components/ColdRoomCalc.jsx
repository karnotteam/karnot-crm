import React, { useState, useEffect, useMemo } from 'react';
import { Eye, Plus, Trash2, Save, Search, Check, Briefcase, Grid, List, PlusCircle, Truck } from 'lucide-react';
import { Card, Button, Input, Textarea, Checkbox, Section, PRICING_TIERS } from '../data/constants.jsx';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { ArrowLeft, Calculator, Snowflake, AlertCircle, CheckCircle, Download, TrendingUp, DollarSign, Leaf, Award, Target, BarChart3, ChevronDown, ChevronUp, Thermometer } from 'lucide-react';

// ==========================================
// CONFIGURATION & CONSTANTS
// ==========================================
const CONFIG = {
    AIR_DENSITY_KG_M3: 1.2,
    AIR_SPECIFIC_HEAT_KJ_KGK: 1.006,
    KW_TO_TR: 3.517, // 1 TR = 3.517 kW
    KW_TO_HP: 1.341,
    DIESEL_LHV_KWH_L: 9.9,
    DIESEL_CO2_KG_PER_L: 2.68,
    GRID_CO2_KG_PER_KWH: 0.7,
    FX_USD_PHP: 58.5,
    SAFETY_FACTOR: 1.10,
    DEFAULT_COP: 2.5, // CO₂ inverter system COP
    
    // Heat Recovery Constants
    WATER_SPEC_HEAT: 1.163, // Wh/L/°C (same as heat pump calc)
    HEAT_RECOVERY_EFFICIENCY: 0.70, // 70% of condenser heat recoverable
    
    // Fuel Heating Values
    LPG_KWH_PER_L: 6.9,
    DIESEL_KWH_PER_L: 10.0,
    NATURAL_GAS_KWH_PER_M3: 10.55,
    
    // CO2 Emissions
    LPG_CO2_KG_PER_L: 1.51,
    NATURAL_GAS_CO2_KG_PER_M3: 1.98,
    
    // Baseline systems for comparison
    BASELINE_R22_COP: 2.0, // Old R22/R507/R404A systems
    BASELINE_R290_COP: 2.3, // Modern R290 systems
    BASELINE_NH3_COP: 2.2, // Ammonia systems
    
    // Product-specific heat and latent heat data
    PRODUCT_DATA: {
        'meat_frozen': { 
            name: 'Meat (to be Frozen)',
            specificHeat: 3.2, 
            latentHeat: 230, 
            freezingPoint: -2,
            specificHeatFrozen: 1.6
        },
        'fish': { 
            name: 'Fish (to be Frozen)',
            specificHeat: 3.18, 
            latentHeat: 250, 
            freezingPoint: -2.2,
            specificHeatFrozen: 1.59
        },
        'general': { 
            name: 'General Goods',
            specificHeat: 2.0, 
            latentHeat: 0, 
            freezingPoint: -100,
            specificHeatFrozen: 2.0
        },
        'fruits': { 
            name: 'Fruits/Vegetables',
            specificHeat: 3.8, 
            latentHeat: 280, 
            freezingPoint: -1.5,
            specificHeatFrozen: 1.9
        },
        'meat_chilled': { 
            name: 'Fresh Meat (Chilled)',
            specificHeat: 3.2, 
            latentHeat: 230, 
            freezingPoint: -2,
            specificHeatFrozen: 1.6
        },
        'dairy': {
            name: 'Dairy Products',
            specificHeat: 3.5,
            latentHeat: 270,
            freezingPoint: -1,
            specificHeatFrozen: 1.75
        },
        'ice_cream': {
            name: 'Ice Cream',
            specificHeat: 2.9,
            latentHeat: 260,
            freezingPoint: -5,
            specificHeatFrozen: 1.45
        }
    },
    
    // U-Values for different panel types (W/m²·K)
    PANEL_TYPES: {
        'pur_120mm': { name: '120mm PUR', uValue: 0.21 },
        'pur_150mm': { name: '150mm PUR', uValue: 0.18 },
        'pur_200mm': { name: '200mm PUR', uValue: 0.14 },
        'pir_120mm': { name: '120mm PIR', uValue: 0.19 },
        'pir_150mm': { name: '150mm PIR', uValue: 0.16 }
    }
};

// Helper Input Component
const InputField = ({ label, value, onChange, type = "number", step = "1", disabled = false, min, max }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <input
            type={type}
            value={value}
            onChange={onChange}
            step={step}
            disabled={disabled}
            min={min}
            max={max}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-200 disabled:text-gray-600"
        />
    </div>
);

const ColdRoomCalc = ({ setActiveView, user }) => {
    // --- STATE ---
    const [products, setProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
    
    const [inputs, setInputs] = useState({
        roomL: 10,
        roomW: 8,
        roomH: 4,
        panelType: 'pur_120mm',
        ambientTemp: 32,
        roomTemp: -18,
        productType: 'meat_frozen',
        dailyTurnover: 1000,
        incomingTemp: 4,
        people: 2,
        lightingWatts: 500,
        motorsWatts: 1500,
        doorOpenings: 20,
        electricityTariff: 12.00,
        dieselPrice: 60.00,
        installationCost: 250000,
        projectLifespan: 10,
        discountRate: 8,
        implementationDelay: 6,
        enableEnterpriseROI: false,
        enterpriseWACC: 0.07,
        operatingHoursPerDay: 24,
        // Heat Recovery Inputs
        enableHeatRecovery: true,
        hotWaterUsage_L_day: 1000,
        hotWaterInletTemp: 20,
        hotWaterOutletTemp: 60,
        // Alternative Heating Systems
        currentHeatingSystem: 'electric',
        lpgPrice: 60.00,
        dieselPrice: 65.00,
        naturalGasPrice: 45.00,
        lpgEfficiency: 85,
        dieselEfficiency: 80,
        naturalGasEfficiency: 90,
        electricHeaterEfficiency: 95,
        // Baseline refrigeration system
        baselineSystemType: 'r22', // r22, r290, nh3
        baselineSystemCOP: 2.0
    });
    
    const [results, setResults] = useState(null);
    const [showReport, setShowReport] = useState(false);
    const [showCalculations, setShowCalculations] = useState(false);
    const [showEnterpriseDetails, setShowEnterpriseDetails] = useState(false);

    // --- FETCH PRODUCTS ---
    useEffect(() => {
        const fetchProducts = async () => {
            const auth = getAuth();
            const authUser = auth.currentUser;
            if (!authUser) return;

            try {
                const querySnapshot = await getDocs(collection(db, "users", authUser.uid, "products"));
                const productsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                // Filter for iCOOL products only
                const icoolProducts = productsList.filter(p => {
                    const category = (p.category || '').toLowerCase();
                    const name = (p.name || '').toLowerCase();
                    return category.includes('icool') || name.includes('icool');
                });
                
                // Sort by cooling capacity
                icoolProducts.sort((a, b) => {
                    const aKW = parseFloat(a.kW_Cooling_Nominal || 0);
                    const bKW = parseFloat(b.kW_Cooling_Nominal || 0);
                    return aKW - bKW;
                });

                setProducts(icoolProducts);
                console.log('=== Cold Room Calc: iCOOL Products Loaded ===');
                console.log('Total iCOOL products:', icoolProducts.length);
            } catch (error) {
                console.error("Error fetching products:", error);
            } finally {
                setLoadingProducts(false);
            }
        };

        fetchProducts();
    }, []);

    // --- HELPER FUNCTIONS ---
    const getHPFromName = (name) => {
        const match = (name || '').match(/(\d+)\s*hp/i);
        return match ? parseInt(match[1]) : 0;
    };

    const getCoolingKWFromName = (product) => {
        return parseFloat(product.kW_Cooling_Nominal || 0);
    };

    const handleInputChange = (field, value) => {
        setInputs(prev => ({ ...prev, [field]: value }));
    };

    // --- CALCULATION ENGINE ---
    const calculate = () => {
        console.log('=== CALCULATE FUNCTION STARTED ===');
        console.log('Products available:', products.length);
        
        try {
            const {
                roomL, roomW, roomH, panelType, ambientTemp, roomTemp,
                productType, dailyTurnover, incomingTemp,
                people, lightingWatts, motorsWatts, doorOpenings,
                electricityTariff, dieselPrice, installationCost,
                projectLifespan, discountRate, implementationDelay, operatingHoursPerDay
            } = inputs;

            console.log('Inputs extracted successfully');

            // --- BASIC CALCS ---
            const roomVolume_m3 = roomL * roomW * roomH;
            const surfaceArea_m2 = (2 * roomL * roomH) + (2 * roomW * roomH) + (roomL * roomW);
            const tempDiff = Math.abs(ambientTemp - roomTemp);
            const panelInfo = CONFIG.PANEL_TYPES[panelType];
            const uValue = panelInfo.uValue;
            
            const pullDownTimeSeconds = 24 * 3600; // 24 hours

            console.log('Basic calcs done. Room volume:', roomVolume_m3);

            // --- 1. TRANSMISSION LOAD ---
            const transmissionLoad_W = surfaceArea_m2 * uValue * tempDiff * 1000; // Convert to Watts
            const transmissionLoad_kW = transmissionLoad_W / 1000;

            // --- 2. PRODUCT LOAD ---
            const product = CONFIG.PRODUCT_DATA[productType];
            let productLoad_W = 0;
            
            if (dailyTurnover > 0 && incomingTemp > roomTemp) {
                // Sensible heat above freezing point
                let sensibleAbove_kJ = 0;
                if (incomingTemp > product.freezingPoint) {
                    sensibleAbove_kJ = dailyTurnover * product.specificHeat * (incomingTemp - product.freezingPoint);
                }
                
                // Latent heat of freezing
                let latent_kJ = 0;
                if (roomTemp < product.freezingPoint && incomingTemp > product.freezingPoint) {
                    latent_kJ = dailyTurnover * product.latentHeat;
                }
                
                // Sensible heat below freezing point
                let sensibleBelow_kJ = 0;
                if (roomTemp < product.freezingPoint) {
                    const startTemp = Math.min(incomingTemp, product.freezingPoint);
                    sensibleBelow_kJ = dailyTurnover * product.specificHeatFrozen * (startTemp - roomTemp);
                }
                
                const totalProduct_kJ = sensibleAbove_kJ + latent_kJ + sensibleBelow_kJ;
                productLoad_W = (totalProduct_kJ * 1000) / pullDownTimeSeconds;
            }
            
            const productLoad_kW = productLoad_W / 1000;

            // --- 3. INTERNAL LOADS ---
            const peopleLoad_W = people * 120; // 120W per person
            const internalLoad_W = peopleLoad_W + lightingWatts + motorsWatts;
            const internalLoad_kW = internalLoad_W / 1000;

            // --- 4. INFILTRATION LOAD (Air Changes) ---
            const airChangesPerDay = roomTemp > 0 ? 10 : 6;
            const infiltrationLoad_W = (roomVolume_m3 * airChangesPerDay * CONFIG.AIR_DENSITY_KG_M3 * 
                CONFIG.AIR_SPECIFIC_HEAT_KJ_KGK * tempDiff * 1000) / pullDownTimeSeconds;
            const infiltrationLoad_kW = infiltrationLoad_W / 1000;

            // --- 5. DOOR OPENINGS LOAD ---
            const doorLoad_perOpening_kWh = (roomVolume_m3 * 0.3 * CONFIG.AIR_DENSITY_KG_M3 * 
                CONFIG.AIR_SPECIFIC_HEAT_KJ_KGK * tempDiff) / 3600;
            const doorLoad_kW = (doorLoad_perOpening_kWh * doorOpenings) / 24; // Average over 24h

            // --- TOTAL THERMAL LOAD ---
            const totalThermalLoad_kW = transmissionLoad_kW + productLoad_kW + internalLoad_kW + 
                infiltrationLoad_kW + doorLoad_kW;
            const totalWithSafety_kW = totalThermalLoad_kW * CONFIG.SAFETY_FACTOR;
            
            // Conversions - FIXED TR CALCULATION
            const totalWithSafety_TR = totalWithSafety_kW / CONFIG.KW_TO_TR; // Divide not multiply!
            const requiredElectrical_kW = totalWithSafety_kW / CONFIG.DEFAULT_COP;
            const requiredElectrical_HP = requiredElectrical_kW * CONFIG.KW_TO_HP;

            console.log(`Load: ${totalWithSafety_kW.toFixed(1)} kW = ${totalWithSafety_TR.toFixed(1)} TR`);

            // --- ICOOL SELECTION ---
            let selectedICool = null;
            
            // Find suitable iCOOL unit
            const suitableUnits = products.filter(p => getCoolingKWFromName(p) >= totalWithSafety_kW);
            
            if (suitableUnits.length > 0) {
                // Pick cheapest suitable unit
                selectedICool = suitableUnits.reduce((cheapest, current) => {
                    const cheapestPrice = cheapest.salesPriceUSD || Infinity;
                    const currentPrice = current.salesPriceUSD || Infinity;
                    return currentPrice < cheapestPrice ? current : cheapest;
                });
            } else if (products.length > 0) {
                // Use largest available
                selectedICool = products[products.length - 1];
                console.log('⚠️ No unit meets load requirement. Using largest available.');
            }

            if (!selectedICool) {
                alert('No iCOOL products found in database!\n\nPlease add Karnot iCOOL products with:\n1. Category or name containing "iCOOL"\n2. kW_Cooling_Nominal field set\n3. salesPriceUSD set');
                return;
            }

            // --- CAPEX (MUST BE CALCULATED BEFORE HEAT RECOVERY) ---
            const icoolSalePrice = selectedICool.salesPriceUSD * CONFIG.FX_USD_PHP;
            const totalCapex = icoolSalePrice + installationCost;

            // --- OPERATING COSTS ---
            const annualOperatingHours = operatingHoursPerDay * 365;
            
            // Karnot iCOOL CO₂ System
            const icool_annual_kWh = requiredElectrical_kW * annualOperatingHours;
            const icool_annual_cost = icool_annual_kWh * electricityTariff;
            const icool_annual_co2 = icool_annual_kWh * CONFIG.GRID_CO2_KG_PER_KWH;
            
            // Baseline System (R22/R507/R404A)
            const baseline_cop = inputs.baselineSystemCOP;
            const baseline_electrical_kW = totalWithSafety_kW / baseline_cop;
            const baseline_annual_kWh = baseline_electrical_kW * annualOperatingHours;
            const baseline_annual_cost = baseline_annual_kWh * electricityTariff;
            
            // Refrigeration Savings
            const refrig_savings_kWh = baseline_annual_kWh - icool_annual_kWh;
            const refrig_savings_cost = refrig_savings_kWh * electricityTariff;
            const refrig_savings_pct = (refrig_savings_kWh / baseline_annual_kWh) * 100;

            // --- HEAT RECOVERY DETECTION & CALCULATIONS ---
            const hasHeatRecoveryPort = 
                (selectedICool.name || '').toLowerCase().includes('heat recovery') ||
                (selectedICool.name || '').toLowerCase().includes('hr') ||
                (selectedICool.name || '').toLowerCase().includes('w/ hr') ||
                parseFloat(selectedICool.kW_DHW_Nominal || 0) > 0;

            let heatRecovery = null;
            
            if (hasHeatRecoveryPort && inputs.enableHeatRecovery) {
                // Use product's DHW rating if available
                const hr_capacity_kW = parseFloat(selectedICool.kW_DHW_Nominal || 0);
                
                if (hr_capacity_kW > 0) {
                    // Temperature rise
                    const deltaT = inputs.hotWaterOutletTemp - inputs.hotWaterInletTemp;
                    
                    // Max production using proper formula from heat pump calc
                    const max_hot_water_L_hour = (hr_capacity_kW * 1000) / (deltaT * CONFIG.WATER_SPEC_HEAT);
                    const daily_hot_water_production_L = max_hot_water_L_hour * operatingHoursPerDay;
                    
                    // Actual utilized
                    const actual_hot_water_utilized_L_day = Math.min(
                        daily_hot_water_production_L,
                        inputs.hotWaterUsage_L_day
                    );
                    
                    // Energy calculation - SIMPLIFIED AND CORRECT
                    const daily_hr_energy_kWh = (actual_hot_water_utilized_L_day * deltaT * CONFIG.WATER_SPEC_HEAT) / 1000;
                    const annual_hr_energy_kWh = daily_hr_energy_kWh * 365;
                    
                    console.log('=== HEAT RECOVERY CALCULATION ===');
                    console.log('HR Capacity:', hr_capacity_kW, 'kW');
                    console.log('Max production:', max_hot_water_L_hour, 'L/hour');
                    console.log('Daily utilized:', actual_hot_water_utilized_L_day, 'L');
                    console.log('Delta T:', deltaT, '°C');
                    console.log('Daily energy:', daily_hr_energy_kWh, 'kWh');
                    console.log('Annual energy:', annual_hr_energy_kWh, 'kWh');
                    
                    // Cost savings - ALL FUEL TYPES
                    // Electric
                    const electric_eff = inputs.electricHeaterEfficiency / 100;
                    const annual_electric_kWh = annual_hr_energy_kWh / electric_eff;
                    const annual_electric_cost = annual_electric_kWh * electricityTariff;
                    const electric_co2_kg = annual_electric_kWh * CONFIG.GRID_CO2_KG_PER_KWH;
                    
                    // LPG
                    const lpg_eff = inputs.lpgEfficiency / 100;
                    const lpg_energy_kWh = annual_hr_energy_kWh / lpg_eff;
                    const lpg_required_L = lpg_energy_kWh / CONFIG.LPG_KWH_PER_L;
                    const annual_lpg_cost = lpg_required_L * inputs.lpgPrice;
                    const lpg_co2_kg = lpg_required_L * CONFIG.LPG_CO2_KG_PER_L;
                    
                    // Diesel
                    const diesel_eff = inputs.dieselEfficiency / 100;
                    const diesel_energy_kWh = annual_hr_energy_kWh / diesel_eff;
                    const diesel_required_L = diesel_energy_kWh / CONFIG.DIESEL_KWH_PER_L;
                    const annual_diesel_cost = diesel_required_L * inputs.dieselPrice;
                    const diesel_co2_kg = diesel_required_L * CONFIG.DIESEL_CO2_KG_PER_L;
                    
                    // Natural Gas
                    const ng_eff = inputs.naturalGasEfficiency / 100;
                    const ng_energy_kWh = annual_hr_energy_kWh / ng_eff;
                    const ng_required_m3 = ng_energy_kWh / CONFIG.NATURAL_GAS_KWH_PER_M3;
                    const annual_ng_cost = ng_required_m3 * inputs.naturalGasPrice;
                    const ng_co2_kg = ng_required_m3 * CONFIG.NATURAL_GAS_CO2_KG_PER_M3;
                    
                    // Select primary comparison
                    let primaryComparison = {
                        name: 'Electric Water Heater',
                        annualCost: annual_electric_cost,
                        annualFuel: `${Math.round(annual_electric_kWh).toLocaleString()} kWh`,
                        co2_kg: electric_co2_kg,
                        efficiency: inputs.electricHeaterEfficiency
                    };
                    
                    if (inputs.currentHeatingSystem === 'lpg') {
                        primaryComparison = {
                            name: 'LPG Water Heater',
                            annualCost: annual_lpg_cost,
                            annualFuel: `${Math.round(lpg_required_L).toLocaleString()} L`,
                            co2_kg: lpg_co2_kg,
                            efficiency: inputs.lpgEfficiency
                        };
                    } else if (inputs.currentHeatingSystem === 'diesel') {
                        primaryComparison = {
                            name: 'Diesel Water Heater',
                            annualCost: annual_diesel_cost,
                            annualFuel: `${Math.round(diesel_required_L).toLocaleString()} L`,
                            co2_kg: diesel_co2_kg,
                            efficiency: inputs.dieselEfficiency
                        };
                    } else if (inputs.currentHeatingSystem === 'natural_gas') {
                        primaryComparison = {
                            name: 'Natural Gas Water Heater',
                            annualCost: annual_ng_cost,
                            annualFuel: `${Math.round(ng_required_m3).toLocaleString()} m³`,
                            co2_kg: ng_co2_kg,
                            efficiency: inputs.naturalGasEfficiency
                        };
                    }

                    // Enterprise metrics
                    const hr_payback_years = totalCapex / Math.max(1, primaryComparison.annualCost);
                    const hr_payback_months = hr_payback_years * 12;
                    
                    // NPV Calculation
                    let npv = -totalCapex;
                    for (let year = 1; year <= projectLifespan; year++) {
                        npv += primaryComparison.annualCost / Math.pow(1 + (discountRate / 100), year);
                    }
                    
                    // IRR Calculation
                    const irr = calculateIRR(totalCapex, primaryComparison.annualCost, projectLifespan);
                    
                    // BCR
                    let totalBenefits = 0;
                    for (let year = 1; year <= projectLifespan; year++) {
                        totalBenefits += primaryComparison.annualCost / Math.pow(1 + (discountRate / 100), year);
                    }
                    const bcr = totalBenefits / totalCapex;
                    
                    // Cash flow
                    const cashFlow = [];
                    let cumulative = -totalCapex;
                    cashFlow.push({
                        year: 0,
                        investment: -totalCapex,
                        savings: 0,
                        cashFlow: -totalCapex,
                        cumulative: cumulative
                    });
                    for (let year = 1; year <= projectLifespan; year++) {
                        const yearSavings = primaryComparison.annualCost;
                        cumulative += yearSavings;
                        cashFlow.push({
                            year: year,
                            investment: 0,
                            savings: yearSavings,
                            cashFlow: yearSavings,
                            cumulative: cumulative
                        });
                    }
                    
                    heatRecovery = {
                        hasCapability: true,
                        enabled: true,
                        capacity_kW: hr_capacity_kW,
                        max_production_L_hour: max_hot_water_L_hour,
                        daily_production_L: daily_hot_water_production_L,
                        utilized_L_day: actual_hot_water_utilized_L_day,
                        utilization_pct: (actual_hot_water_utilized_L_day / daily_hot_water_production_L) * 100,
                        annual_energy_kWh: annual_hr_energy_kWh,
                        primaryComparison: primaryComparison,
                        allComparisons: {
                            electric: {
                                name: 'Electric Water Heater',
                                annualCost: annual_electric_cost,
                                annualCostUSD: annual_electric_cost / CONFIG.FX_USD_PHP,
                                annualFuel: `${Math.round(annual_electric_kWh).toLocaleString()} kWh`,
                                fuelPrice: `₱${electricityTariff.toFixed(2)}/kWh`,
                                co2_kg: electric_co2_kg,
                                efficiency: inputs.electricHeaterEfficiency
                            },
                            lpg: {
                                name: 'LPG Water Heater',
                                annualCost: annual_lpg_cost,
                                annualCostUSD: annual_lpg_cost / CONFIG.FX_USD_PHP,
                                annualFuel: `${Math.round(lpg_required_L).toLocaleString()} L`,
                                fuelPrice: `₱${inputs.lpgPrice.toFixed(2)}/L`,
                                co2_kg: lpg_co2_kg,
                                efficiency: inputs.lpgEfficiency
                            },
                            diesel: {
                                name: 'Diesel Water Heater',
                                annualCost: annual_diesel_cost,
                                annualCostUSD: annual_diesel_cost / CONFIG.FX_USD_PHP,
                                annualFuel: `${Math.round(diesel_required_L).toLocaleString()} L`,
                                fuelPrice: `₱${inputs.dieselPrice.toFixed(2)}/L`,
                                co2_kg: diesel_co2_kg,
                                efficiency: inputs.dieselEfficiency
                            },
                            naturalGas: {
                                name: 'Natural Gas Water Heater',
                                annualCost: annual_ng_cost,
                                annualCostUSD: annual_ng_cost / CONFIG.FX_USD_PHP,
                                annualFuel: `${Math.round(ng_required_m3).toLocaleString()} m³`,
                                fuelPrice: `₱${inputs.naturalGasPrice.toFixed(2)}/m³`,
                                co2_kg: ng_co2_kg,
                                efficiency: inputs.naturalGasEfficiency
                            }
                        },
                        outlet_temp: inputs.hotWaterOutletTemp,
                        inlet_temp: inputs.hotWaterInletTemp,
                        enterpriseMetrics: {
                            simplePayback_months: hr_payback_months,
                            simplePayback_years: hr_payback_years,
                            roi_percent: (primaryComparison.annualCost / totalCapex) * 100,
                            npv: npv,
                            irr: irr,
                            bcr: bcr,
                            cumulativeSavings_10yr: primaryComparison.annualCost * projectLifespan,
                            cumulativeSavings_10yr_USD: (primaryComparison.annualCost * projectLifespan) / CONFIG.FX_USD_PHP,
                            cashFlow: cashFlow
                        }
                    };
                } else {
                    heatRecovery = {
                        hasCapability: true,
                        enabled: false,
                        message: 'Heat recovery port detected but no kW_DHW_Nominal rating found'
                    };
                }
            } else {
                heatRecovery = {
                    hasCapability: hasHeatRecoveryPort,
                    enabled: false,
                    message: hasHeatRecoveryPort 
                        ? 'Heat recovery available but not enabled in inputs' 
                        : 'Selected unit does not have heat recovery capability'
                };
            }

            // NET operating cost (cooling + heat recovery)
            const heatRecoverySavings = heatRecovery?.primaryComparison?.annualCost || 0;
            const totalAnnualSavings = refrig_savings_cost + heatRecoverySavings;
            const netAnnualCost = icool_annual_cost - totalAnnualSavings;
            const effectivePayback = totalCapex / Math.max(1, totalAnnualSavings);

            // --- ROI CALCULATIONS ---
            const annualTCO = icool_annual_cost;
            
            let totalPV = 0;
            for (let year = 1; year <= projectLifespan; year++) {
                totalPV += annualTCO / Math.pow(1 + (discountRate / 100), year);
            }
            
            const totalLifetimeCost = totalCapex + totalPV;

            // --- ENTERPRISE ROI (if enabled) ---
            let enterpriseROI = null;
            if (inputs.enableEnterpriseROI) {
                const productValue_per_kg = 200;
                const spoilageRate_without_cooling = 0.15;
                const annualProductValue = (dailyTurnover * 365 * productValue_per_kg);
                const annualSpoilageCost = annualProductValue * spoilageRate_without_cooling;
                const annualNetBenefit = annualSpoilageCost - annualTCO;

                let npv_enterprise = -totalCapex;
                for (let year = 1; year <= projectLifespan; year++) {
                    npv_enterprise += annualNetBenefit / Math.pow(1 + inputs.enterpriseWACC, year);
                }

                const irr_ent = calculateIRR(totalCapex, annualNetBenefit, projectLifespan);
                
                const csvScore = 7.5;
                const csvMultiplier = 1 + (csvScore / 20);
                const strategicROI = irr_ent * csvMultiplier;

                enterpriseROI = {
                    financial: {
                        npv: npv_enterprise,
                        irr: irr_ent,
                        annualBenefit: annualNetBenefit,
                        paybackYears: totalCapex / Math.max(1, annualNetBenefit)
                    },
                    csv: {
                        score: csvScore,
                        multiplier: csvMultiplier,
                        strategicROI: strategicROI
                    }
                };
            }

            // --- STORE RESULTS ---
            setResults({
                loads: {
                    transmission_kW: transmissionLoad_kW,
                    product_kW: productLoad_kW,
                    internal_kW: internalLoad_kW,
                    infiltration_kW: infiltrationLoad_kW,
                    door_kW: doorLoad_kW,
                    total_kW: totalThermalLoad_kW,
                    totalWithSafety_kW: totalWithSafety_kW,
                    totalWithSafety_TR: totalWithSafety_TR,
                    requiredElectrical_HP: requiredElectrical_HP
                },
                selection: {
                    icool: selectedICool,
                    cooling_kW: getCoolingKWFromName(selectedICool),
                    hp: getHPFromName(selectedICool.name)
                },
                operating: {
                    icool_kWh: icool_annual_kWh,
                    icool_cost: icool_annual_cost,
                    icool_co2: icool_annual_co2,
                    baseline_kWh: baseline_annual_kWh,
                    baseline_cost: baseline_annual_cost,
                    refrig_savings_kWh: refrig_savings_kWh,
                    refrig_savings_cost: refrig_savings_cost,
                    refrig_savings_pct: refrig_savings_pct,
                    heatRecoverySavings: heatRecoverySavings,
                    totalAnnualSavings: totalAnnualSavings,
                    netAnnualCost: netAnnualCost
                },
                heatRecovery: heatRecovery,
                capex: {
                    icool: icoolSalePrice,
                    installation: installationCost,
                    total: totalCapex
                },
                tco: {
                    lifetime: totalLifetimeCost,
                    annualTCO: annualTCO,
                    effectivePayback: effectivePayback
                },
                enterpriseROI: enterpriseROI,
                baselineSystem: {
                    type: inputs.baselineSystemType,
                    cop: baseline_cop,
                    name: inputs.baselineSystemType === 'r22' ? 'R22/R507/R404A' : 
                          inputs.baselineSystemType === 'r290' ? 'R290 (Propane)' : 'Ammonia (NH3)'
                }
            });

            console.log('=== Results object created successfully ===');
            setShowReport(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            console.log('=== CALCULATE FUNCTION COMPLETED ===');
            
        } catch (error) {
            console.error('=== ERROR IN CALCULATE FUNCTION ===');
            console.error('Error:', error);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            alert(`Calculation Error: ${error.message}\n\nPlease check the browser console for details.`);
        }
    };

    // Simple IRR calculator
    const calculateIRR = (initialInvestment, annualCashFlow, years) => {
        let irr = 0.1;
        for (let i = 0; i < 100; i++) {
            let npv = -initialInvestment;
            let derivative = 0;
            for (let year = 1; year <= years; year++) {
                npv += annualCashFlow / Math.pow(1 + irr, year);
                derivative -= year * annualCashFlow / Math.pow(1 + irr, year + 1);
            }
            if (Math.abs(npv) < 0.01) break;
            irr = irr - npv / derivative;
        }
        return irr * 100;
    };

    const fmt = (n, decimals = 0) => {
        if (n === null || n === undefined || isNaN(n)) return '0';
        return Number(n).toLocaleString(undefined, { 
            minimumFractionDigits: decimals, 
            maximumFractionDigits: decimals 
        });
    };

    if (loadingProducts) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading iCOOL product database...</p>
                </div>
            </div>
        );
    }

    // [REST OF THE COMPONENT - I'll continue in next message due to length]
