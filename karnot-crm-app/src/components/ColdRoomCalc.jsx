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
    KW_TO_TR: 3.517,
    KW_TO_HP: 1.341,
    DIESEL_LHV_KWH_L: 9.9,
    DIESEL_CO2_KG_PER_L: 2.68,
    GRID_CO2_KG_PER_KWH: 0.7,
    FX_USD_PHP: 58.5,
    SAFETY_FACTOR: 1.10,
    DEFAULT_COP: 2.5,
    
    // Heat Recovery Constants
    WATER_SPECIFIC_HEAT_KJ_KGK: 4.186,
    HEAT_RECOVERY_EFFICIENCY: 0.70, // 70% of condenser heat recoverable
    WATER_DENSITY_KG_L: 1.0,
    
    // Fuel Heating Values (kWh per unit)
    LPG_KWH_PER_L: 6.9, // ~6.9 kWh per liter of LPG
    DIESEL_KWH_PER_L: 10.0, // ~10 kWh per liter of diesel
    NATURAL_GAS_KWH_PER_M3: 10.55, // ~10.55 kWh per m³ natural gas
    
    // CO2 Emissions (kg CO2 per unit)
    LPG_CO2_KG_PER_L: 1.51,
    DIESEL_CO2_KG_PER_L: 2.68,
    NATURAL_GAS_CO2_KG_PER_M3: 1.98,
    
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
        enableHeatRecovery: true, // Auto-enabled if unit supports it
        hotWaterUsage_L_day: 1000, // Daily hot water requirement
        hotWaterInletTemp: 20, // Incoming water temperature
        hotWaterOutletTemp: 60, // Target hot water temperature
        // Alternative Heating Systems for Comparison
        currentHeatingSystem: 'electric', // electric, lpg, diesel, natural_gas
        lpgPrice: 60.00, // ₱/L
        dieselPrice: 65.00, // ₱/L
        naturalGasPrice: 45.00, // ₱/m³
        lpgEfficiency: 85, // %
        dieselEfficiency: 80, // %
        naturalGasEfficiency: 90, // %
        electricHeaterEfficiency: 95 // %
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
        
        // Conversions
        const totalWithSafety_TR = totalWithSafety_kW / CONFIG.KW_TO_TR;
        const requiredElectrical_kW = totalWithSafety_kW / CONFIG.DEFAULT_COP;
        const requiredElectrical_HP = requiredElectrical_kW * CONFIG.KW_TO_HP;

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

        // --- HEAT RECOVERY DETECTION & CALCULATIONS ---
        const hasHeatRecoveryPort = 
            (selectedICool.name || '').toLowerCase().includes('heat recovery') ||
            (selectedICool.name || '').toLowerCase().includes('hr') ||
            (selectedICool.specs || '').toLowerCase().includes('heat recovery port: yes') ||
            parseFloat(selectedICool.kW_DHW_Nominal || 0) > 0;

        let heatRecovery = null;
        
        if (hasHeatRecoveryPort && inputs.enableHeatRecovery) {
            // Calculate total heat rejection from refrigeration
            const cooling_kW = getCoolingKWFromName(selectedICool);
            const electrical_input_kW = cooling_kW / CONFIG.DEFAULT_COP;
            const total_heat_rejection_kW = cooling_kW + electrical_input_kW;
            
            // Recoverable heat (70% efficiency)
            const recoverable_heat_kW = total_heat_rejection_kW * CONFIG.HEAT_RECOVERY_EFFICIENCY;
            
            // Use product's DHW rating if available, otherwise use calculated
            const hr_capacity_kW = parseFloat(selectedICool.kW_DHW_Nominal || 0) > 0 
                ? parseFloat(selectedICool.kW_DHW_Nominal)
                : recoverable_heat_kW;
            
            // Hot water production calculations
            const temp_rise_K = inputs.hotWaterOutletTemp - inputs.hotWaterInletTemp;
            const max_hot_water_L_hour = (hr_capacity_kW * 3600) / 
                (CONFIG.WATER_SPECIFIC_HEAT_KJ_KGK * temp_rise_K * CONFIG.WATER_DENSITY_KG_L);
            
            // Daily hot water production (based on operating hours)
            const daily_hot_water_production_L = max_hot_water_L_hour * operatingHoursPerDay;
            
            // Actual hot water utilized (min of production and demand)
            const actual_hot_water_utilized_L_day = Math.min(
                daily_hot_water_production_L,
                inputs.hotWaterUsage_L_day
            );
            
            // Energy value of hot water produced
            // Convert kJ to kWh: divide by 3600 (1 kWh = 3600 kJ)
            const energy_per_liter_kWh = (CONFIG.WATER_SPECIFIC_HEAT_KJ_KGK * temp_rise_K) / 3600;
            const daily_hr_energy_kWh = actual_hot_water_utilized_L_day * energy_per_liter_kWh;
            const annual_hr_energy_kWh = daily_hr_energy_kWh * 365;
            
            // Cost savings from heat recovery - COMPREHENSIVE FUEL COMPARISON
            
            // 1. vs Electric water heater
            const electric_eff = inputs.electricHeaterEfficiency / 100;
            const annual_electric_kWh = annual_hr_energy_kWh / electric_eff;
            const annual_electric_cost = annual_electric_kWh * electricityTariff;
            const electric_co2_kg = annual_electric_kWh * CONFIG.GRID_CO2_KG_PER_KWH;
            
            // 2. vs LPG water heater
            const lpg_eff = inputs.lpgEfficiency / 100;
            const lpg_energy_needed_kWh = annual_hr_energy_kWh / lpg_eff;
            const lpg_required_L = lpg_energy_needed_kWh / CONFIG.LPG_KWH_PER_L;
            const annual_lpg_cost = lpg_required_L * inputs.lpgPrice;
            const lpg_co2_kg = lpg_required_L * CONFIG.LPG_CO2_KG_PER_L;
            
            // 3. vs Diesel water heater
            const diesel_eff = inputs.dieselEfficiency / 100;
            const diesel_energy_needed_kWh = annual_hr_energy_kWh / diesel_eff;
            const diesel_required_L = diesel_energy_needed_kWh / CONFIG.DIESEL_KWH_PER_L;
            const annual_diesel_cost = diesel_required_L * inputs.dieselPrice;
            const diesel_co2_kg = diesel_required_L * CONFIG.DIESEL_CO2_KG_PER_L;
            
            // 4. vs Natural Gas water heater
            const ng_eff = inputs.naturalGasEfficiency / 100;
            const ng_energy_needed_kWh = annual_hr_energy_kWh / ng_eff;
            const ng_required_m3 = ng_energy_needed_kWh / CONFIG.NATURAL_GAS_KWH_PER_M3;
            const annual_ng_cost = ng_required_m3 * inputs.naturalGasPrice;
            const ng_co2_kg = ng_required_m3 * CONFIG.NATURAL_GAS_CO2_KG_PER_M3;
            
            // Select comparison based on current heating system
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
            
            // Payback improvement
            const hr_payback_years = totalCapex / Math.max(1, primaryComparison.annualCost);
            const hr_payback_months = hr_payback_years * 12;
            
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
                savings: {
                    vs_electric: annual_electric_cost,
                    vs_lpg: annual_lpg_cost,
                    vs_diesel: annual_diesel_cost,
                    vs_naturalGas: annual_ng_cost,
                    co2_avoided_kg: primaryComparison.co2_kg
                },
                payback_years: hr_payback_years,
                payback_months: hr_payback_months,
                outlet_temp: inputs.hotWaterOutletTemp,
                inlet_temp: inputs.hotWaterInletTemp,
                // NESTLE-STYLE ENTERPRISE ROI METRICS
                enterpriseMetrics: {
                    simplePayback_months: hr_payback_months,
                    simplePayback_years: hr_payback_years,
                    roi_percent: (primaryComparison.annualCost / totalCapex) * 100,
                    roi_percent_annual: ((primaryComparison.annualCost * projectLifespan) / totalCapex) * 100,
                    // NPV Calculation
                    npv: (() => {
                        let npv = -totalCapex;
                        for (let year = 1; year <= projectLifespan; year++) {
                            npv += primaryComparison.annualCost / Math.pow(1 + (discountRate / 100), year);
                        }
                        return npv;
                    })(),
                    // IRR Calculation
                    irr: calculateIRR(totalCapex, primaryComparison.annualCost, projectLifespan),
                    // Benefit-Cost Ratio
                    bcr: (() => {
                        let totalBenefits = 0;
                        for (let year = 1; year <= projectLifespan; year++) {
                            totalBenefits += primaryComparison.annualCost / Math.pow(1 + (discountRate / 100), year);
                        }
                        return totalBenefits / totalCapex;
                    })(),
                    // Cumulative Savings over project life
                    cumulativeSavings_10yr: primaryComparison.annualCost * projectLifespan,
                    cumulativeSavings_10yr_USD: (primaryComparison.annualCost * projectLifespan) / CONFIG.FX_USD_PHP,
                    // Year-by-year cash flow
                    cashFlow: (() => {
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
                        return cashFlow;
                    })()
                }
            };
        } else {
            heatRecovery = {
                hasCapability: hasHeatRecoveryPort,
                enabled: false,
                message: hasHeatRecoveryPort 
                    ? 'Heat recovery available but not enabled in inputs' 
                    : 'Selected unit does not have heat recovery capability'
            };
        }

        // --- OPERATING COSTS (ADJUSTED FOR HEAT RECOVERY) ---
        // --- OPERATING COSTS (ADJUSTED FOR HEAT RECOVERY) ---
        const annualOperatingHours = operatingHoursPerDay * 365;
        const annualElectricity_kWh = requiredElectrical_kW * annualOperatingHours;
        const annualElectricityCost = annualElectricity_kWh * electricityTariff;
        const annualCO2_kg = annualElectricity_kWh * CONFIG.GRID_CO2_KG_PER_KWH;
        
        // NET operating cost (after heat recovery savings)
        const heatRecoverySavings = heatRecovery?.primaryComparison?.annualCost || 0;
        const netAnnualCost = annualElectricityCost - heatRecoverySavings;
        const effectivePayback = totalCapex / Math.max(1, Math.abs(netAnnualCost));

        // --- ROI CALCULATIONS ---
        // Note: For cold rooms, "savings" come from avoiding alternative cooling methods
        // or preventing product spoilage. We'll show TCO instead.
        const annualTCO = annualElectricityCost;
        
        let totalPV = 0;
        for (let year = 1; year <= projectLifespan; year++) {
            totalPV += annualTCO / Math.pow(1 + (discountRate / 100), year);
        }
        
        const totalLifetimeCost = totalCapex + totalPV;

        // --- ENTERPRISE ROI (if enabled) ---
        let enterpriseROI = null;
        if (inputs.enableEnterpriseROI) {
            // For cold rooms, calculate as cost avoidance vs. product loss
            const productValue_per_kg = 200; // PHP (adjustable)
            const spoilageRate_without_cooling = 0.15; // 15% loss without proper cooling
            const annualProductValue = (dailyTurnover * 365 * productValue_per_kg);
            const annualSpoilageCost = annualProductValue * spoilageRate_without_cooling;
            const annualNetBenefit = annualSpoilageCost - annualTCO;

            let npv_enterprise = -totalCapex;
            for (let year = 1; year <= projectLifespan; year++) {
                npv_enterprise += annualNetBenefit / Math.pow(1 + inputs.enterpriseWACC, year);
            }

            const irr = calculateIRR(totalCapex, annualNetBenefit, projectLifespan);
            
            const csvScore = 7.5; // Placeholder - cold storage is critical for food safety
            const csvMultiplier = 1 + (csvScore / 20);
            const strategicROI = irr * csvMultiplier;

            enterpriseROI = {
                financial: {
                    npv: npv_enterprise,
                    irr: irr,
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
                annualElectricity_kWh: annualElectricity_kWh,
                annualCost: annualElectricityCost,
                annualCO2_kg: annualCO2_kg,
                netAnnualCost: netAnnualCost,
                heatRecoverySavings: heatRecoverySavings
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
            enterpriseROI: enterpriseROI
        });

        console.log('=== Results object created successfully ===');
        console.log('Setting showReport to true...');
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

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        onClick={() => setActiveView('calculatorsHub')}
                        variant="secondary"
                        className="flex items-center gap-2"
                    >
                        <ArrowLeft size={16} />
                        Back
                    </Button>
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                            <Snowflake className="text-blue-600" />
                            Cold Room Calculator
                        </h2>
                        <p className="text-gray-600 mt-1">Karnot iCOOL CO₂ system sizing for refrigerated storage</p>
                    </div>
                </div>
            </div>

            {/* Results Report */}
            {showReport && results && (
                <div className="bg-white rounded-xl shadow-lg border-2 border-blue-500 p-8 mb-6">
                    <h3 className="text-2xl font-bold text-center text-gray-800 mb-6 border-b-2 border-blue-500 pb-3">
                        Cold Room Cooling Proposal
                    </h3>

                    {/* System Summary */}
                    <div className="mb-6">
                        <h4 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <Calculator size={20} className="text-blue-600" />
                            1. Recommended System & Cooling Loads
                        </h4>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <table className="w-full">
                                <tbody>
                                    <tr className="border-b">
                                        <th className="text-left py-3 text-gray-600">Selected iCOOL Unit</th>
                                        <td className="text-right py-3 font-bold text-gray-900">
                                            {results.selection.icool.name}
                                        </td>
                                    </tr>
                                    <tr className="border-b">
                                        <th className="text-left py-3 text-gray-600">Cooling Capacity</th>
                                        <td className="text-right py-3 font-bold text-blue-600">
                                            {fmt(results.selection.cooling_kW, 1)} kW / {fmt(results.loads.totalWithSafety_TR, 1)} TR
                                        </td>
                                    </tr>
                                    <tr className="border-b">
                                        <th className="text-left py-3 text-gray-600">Total Thermal Load (with safety)</th>
                                        <td className="text-right py-3">
                                            {fmt(results.loads.totalWithSafety_kW, 1)} kW
                                        </td>
                                    </tr>
                                    <tr className="border-b">
                                        <th className="text-left py-3 text-gray-600">Est. Compressor Power</th>
                                        <td className="text-right py-3">
                                            {fmt(results.loads.requiredElectrical_HP, 1)} HP
                                        </td>
                                    </tr>
                                    <tr>
                                        <th className="text-left py-3 text-gray-600">Est. Annual CO₂ Emissions</th>
                                        <td className="text-right py-3 font-bold text-orange-600">
                                            {fmt(results.operating.annualCO2_kg, 0)} kg CO₂
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Load Breakdown */}
                    {showCalculations && (
                        <div className="mb-6 bg-blue-50 p-4 rounded-lg">
                            <h5 className="font-semibold text-gray-800 mb-3">Detailed Load Breakdown</h5>
                            <table className="w-full text-sm">
                                <tbody>
                                    <tr className="border-b">
                                        <td className="py-2">Transmission Loss (Walls/Ceiling/Floor)</td>
                                        <td className="text-right font-semibold">{fmt(results.loads.transmission_kW, 2)} kW</td>
                                    </tr>
                                    <tr className="border-b">
                                        <td className="py-2">Product Load (Pull-down & Respiration)</td>
                                        <td className="text-right font-semibold">{fmt(results.loads.product_kW, 2)} kW</td>
                                    </tr>
                                    <tr className="border-b">
                                        <td className="py-2">Internal Loads (People, Lights, Motors)</td>
                                        <td className="text-right font-semibold">{fmt(results.loads.internal_kW, 2)} kW</td>
                                    </tr>
                                    <tr className="border-b">
                                        <td className="py-2">Infiltration (Air Changes)</td>
                                        <td className="text-right font-semibold">{fmt(results.loads.infiltration_kW, 2)} kW</td>
                                    </tr>
                                    <tr className="border-b">
                                        <td className="py-2">Door Openings</td>
                                        <td className="text-right font-semibold">{fmt(results.loads.door_kW, 2)} kW</td>
                                    </tr>
                                    <tr className="border-t-2 border-blue-300 font-bold">
                                        <td className="py-2">Subtotal + 10% Safety Factor</td>
                                        <td className="text-right text-blue-600">{fmt(results.loads.totalWithSafety_kW, 2)} kW</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}

                    <Button 
                        variant="secondary" 
                        onClick={() => setShowCalculations(!showCalculations)}
                        className="w-full mb-6 flex items-center justify-center gap-2"
                    >
                        {showCalculations ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
                        {showCalculations ? 'Hide' : 'Show'} Load Breakdown
                    </Button>

                    {/* Financial Summary */}
                    <div className="mb-6">
                        <h4 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <DollarSign size={20} className="text-blue-600" />
                            2. Financial Summary & Total Cost of Ownership
                        </h4>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <table className="w-full">
                                <tbody>
                                    <tr className="border-b">
                                        <th className="text-left py-3 text-gray-600">iCOOL Unit Price</th>
                                        <td className="text-right py-3">₱ {fmt(results.capex.icool)}</td>
                                    </tr>
                                    <tr className="border-b">
                                        <th className="text-left py-3 text-gray-600">Installation & Commissioning</th>
                                        <td className="text-right py-3">₱ {fmt(results.capex.installation)}</td>
                                    </tr>
                                    <tr className="border-b-2 border-blue-500">
                                        <th className="text-left py-3 font-bold text-gray-900">Total Project Investment (CAPEX)</th>
                                        <td className="text-right py-3 font-bold text-blue-600 text-lg">₱ {fmt(results.capex.total)}</td>
                                    </tr>
                                    <tr className="border-b">
                                        <th className="text-left py-3 text-gray-600">Annual Operating Cost (Electricity)</th>
                                        <td className="text-right py-3 font-bold text-orange-600">₱ {fmt(results.operating.annualCost)}</td>
                                    </tr>
                                    <tr className="border-b">
                                        <th className="text-left py-3 text-gray-600">10-Year Total Cost of Ownership</th>
                                        <td className="text-right py-3 font-bold text-purple-600">₱ {fmt(results.tco.lifetime)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* HEAT RECOVERY SECTION */}
                    {results.heatRecovery && results.heatRecovery.hasCapability && (
                        <div className="mb-6 bg-gradient-to-br from-orange-50 to-red-50 p-6 rounded-xl border-2 border-orange-300">
                            <div className="flex items-center gap-2 mb-4">
                                <Thermometer className="text-orange-600" size={28}/>
                                <h3 className="text-2xl font-bold text-orange-900">🔥 Heat Recovery System</h3>
                            </div>

                            {results.heatRecovery.enabled === false ? (
                                <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-4 mb-4">
                                    <p className="text-yellow-800 font-semibold">
                                        ⚠️ This unit has heat recovery capability but it's not enabled in your inputs. 
                                        Enable it to see FREE hot water production and cost savings!
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="bg-white p-4 rounded-lg mb-4 border-2 border-green-300">
                                        <p className="text-green-800 font-bold text-lg mb-2">
                                            ✅ FREE Hot Water Production: {fmt(results.heatRecovery.utilized_L_day)} liters/day @ {results.heatRecovery.outlet_temp}°C
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            System recovers waste heat from refrigeration to heat water from {results.heatRecovery.inlet_temp}°C to {results.heatRecovery.outlet_temp}°C
                                        </p>
                                        <p className="text-sm text-orange-600 font-semibold mt-2">
                                            💰 Replaces: {results.heatRecovery.primaryComparison.name} ({results.heatRecovery.primaryComparison.annualFuel}/year @ {results.heatRecovery.primaryComparison.efficiency}% efficiency)
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                        <div className="bg-white p-4 rounded-lg border-2 border-orange-200 shadow-sm">
                                            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Heat Recovery Capacity</p>
                                            <p className="text-2xl font-bold text-orange-600">{fmt(results.heatRecovery.capacity_kW, 1)} kW</p>
                                            <p className="text-xs text-gray-500 mt-1">({fmt(results.heatRecovery.max_production_L_hour)} L/hour max)</p>
                                        </div>
                                        <div className="bg-white p-4 rounded-lg border-2 border-orange-200 shadow-sm">
                                            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Daily Hot Water</p>
                                            <p className="text-2xl font-bold text-orange-600">{fmt(results.heatRecovery.utilized_L_day)} L</p>
                                            <p className="text-xs text-gray-500 mt-1">({fmt(results.heatRecovery.utilization_pct, 0)}% of capacity)</p>
                                        </div>
                                        <div className="bg-white p-4 rounded-lg border-2 border-green-200 shadow-sm">
                                            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Annual Energy Recovered</p>
                                            <p className="text-2xl font-bold text-green-600">{fmt(results.heatRecovery.annual_energy_kWh)} kWh</p>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-lg p-4 mb-4">
                                        <h5 className="font-semibold text-gray-800 mb-3">💰 Annual Savings vs Alternative Heating Systems</h5>
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b-2 border-gray-300">
                                                    <th className="text-left py-2 text-gray-700">Heating System</th>
                                                    <th className="text-right py-2 text-gray-700">Annual Cost (PHP)</th>
                                                    <th className="text-right py-2 text-gray-700">Annual Cost (USD)</th>
                                                    <th className="text-right py-2 text-gray-700">CO₂ Emissions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr className="border-b hover:bg-gray-50">
                                                    <td className="py-2 text-gray-600">
                                                        {results.heatRecovery.allComparisons.electric.name}
                                                        <br/>
                                                        <span className="text-xs text-gray-400">
                                                            {results.heatRecovery.allComparisons.electric.annualFuel} @ {results.heatRecovery.allComparisons.electric.fuelPrice}
                                                        </span>
                                                    </td>
                                                    <td className="text-right font-bold text-red-600">₱ {fmt(results.heatRecovery.allComparisons.electric.annualCost)}</td>
                                                    <td className="text-right font-bold text-red-600">$ {fmt(results.heatRecovery.allComparisons.electric.annualCostUSD)}</td>
                                                    <td className="text-right text-gray-600">{fmt(results.heatRecovery.allComparisons.electric.co2_kg)} kg</td>
                                                </tr>
                                                <tr className="border-b hover:bg-gray-50">
                                                    <td className="py-2 text-gray-600">
                                                        {results.heatRecovery.allComparisons.lpg.name}
                                                        <br/>
                                                        <span className="text-xs text-gray-400">
                                                            {results.heatRecovery.allComparisons.lpg.annualFuel} @ {results.heatRecovery.allComparisons.lpg.fuelPrice}
                                                        </span>
                                                    </td>
                                                    <td className="text-right font-bold text-red-600">₱ {fmt(results.heatRecovery.allComparisons.lpg.annualCost)}</td>
                                                    <td className="text-right font-bold text-red-600">$ {fmt(results.heatRecovery.allComparisons.lpg.annualCostUSD)}</td>
                                                    <td className="text-right text-gray-600">{fmt(results.heatRecovery.allComparisons.lpg.co2_kg)} kg</td>
                                                </tr>
                                                <tr className="border-b hover:bg-gray-50">
                                                    <td className="py-2 text-gray-600">
                                                        {results.heatRecovery.allComparisons.diesel.name}
                                                        <br/>
                                                        <span className="text-xs text-gray-400">
                                                            {results.heatRecovery.allComparisons.diesel.annualFuel} @ {results.heatRecovery.allComparisons.diesel.fuelPrice}
                                                        </span>
                                                    </td>
                                                    <td className="text-right font-bold text-red-600">₱ {fmt(results.heatRecovery.allComparisons.diesel.annualCost)}</td>
                                                    <td className="text-right font-bold text-red-600">$ {fmt(results.heatRecovery.allComparisons.diesel.annualCostUSD)}</td>
                                                    <td className="text-right text-gray-600">{fmt(results.heatRecovery.allComparisons.diesel.co2_kg)} kg</td>
                                                </tr>
                                                <tr className="border-b hover:bg-gray-50">
                                                    <td className="py-2 text-gray-600">
                                                        {results.heatRecovery.allComparisons.naturalGas.name}
                                                        <br/>
                                                        <span className="text-xs text-gray-400">
                                                            {results.heatRecovery.allComparisons.naturalGas.annualFuel} @ {results.heatRecovery.allComparisons.naturalGas.fuelPrice}
                                                        </span>
                                                    </td>
                                                    <td className="text-right font-bold text-red-600">₱ {fmt(results.heatRecovery.allComparisons.naturalGas.annualCost)}</td>
                                                    <td className="text-right font-bold text-red-600">$ {fmt(results.heatRecovery.allComparisons.naturalGas.annualCostUSD)}</td>
                                                    <td className="text-right text-gray-600">{fmt(results.heatRecovery.allComparisons.naturalGas.co2_kg)} kg</td>
                                                </tr>
                                                <tr className="bg-green-50 border-t-2 border-green-400 font-bold">
                                                    <td className="py-3 text-green-800">
                                                        🔥 With Heat Recovery (FREE)
                                                    </td>
                                                    <td className="text-right text-green-700 text-lg">₱ 0</td>
                                                    <td className="text-right text-green-700 text-lg">$ 0</td>
                                                    <td className="text-right text-green-700">0 kg</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* NESTLE-STYLE ENTERPRISE ROI ANALYSIS */}
                                    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-xl border-2 border-purple-300 mb-4">
                                        <h5 className="font-bold text-purple-900 text-lg mb-4 flex items-center gap-2">
                                            <Target size={20} className="text-purple-600"/>
                                            Enterprise Financial Analysis - Heat Recovery ROI
                                        </h5>
                                        
                                        {/* Key Metrics Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                            <div className="bg-white p-4 rounded-lg border-2 border-green-300 shadow-sm">
                                                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Simple Payback</p>
                                                <p className="text-3xl font-bold text-green-600">{fmt(results.heatRecovery.enterpriseMetrics.simplePayback_months, 1)}</p>
                                                <p className="text-xs text-gray-500 mt-1">months ({fmt(results.heatRecovery.enterpriseMetrics.simplePayback_years, 2)} years)</p>
                                            </div>
                                            <div className="bg-white p-4 rounded-lg border-2 border-blue-300 shadow-sm">
                                                <p className="text-xs font-bold text-gray-500 uppercase mb-1">ROI (Annual)</p>
                                                <p className="text-3xl font-bold text-blue-600">{fmt(results.heatRecovery.enterpriseMetrics.roi_percent, 1)}%</p>
                                                <p className="text-xs text-gray-500 mt-1">First year return</p>
                                            </div>
                                            <div className="bg-white p-4 rounded-lg border-2 border-indigo-300 shadow-sm">
                                                <p className="text-xs font-bold text-gray-500 uppercase mb-1">NPV @ {inputs.discountRate}%</p>
                                                <p className="text-2xl font-bold text-indigo-600">₱{fmt(results.heatRecovery.enterpriseMetrics.npv)}</p>
                                                <p className="text-xs text-gray-500 mt-1">${fmt(results.heatRecovery.enterpriseMetrics.npv / CONFIG.FX_USD_PHP)} USD</p>
                                            </div>
                                            <div className="bg-white p-4 rounded-lg border-2 border-purple-300 shadow-sm">
                                                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Internal Rate of Return</p>
                                                <p className="text-3xl font-bold text-purple-600">{fmt(results.heatRecovery.enterpriseMetrics.irr, 1)}%</p>
                                                <p className="text-xs text-gray-500 mt-1">IRR over {inputs.projectLifespan} years</p>
                                            </div>
                                        </div>

                                        {/* Additional Metrics */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                                                <p className="text-sm font-bold text-gray-600 mb-1">Benefit-Cost Ratio (BCR)</p>
                                                <p className="text-2xl font-bold text-green-600">{fmt(results.heatRecovery.enterpriseMetrics.bcr, 2)}:1</p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {results.heatRecovery.enterpriseMetrics.bcr > 2 ? "Excellent" : results.heatRecovery.enterpriseMetrics.bcr > 1.5 ? "Very Good" : "Good"} investment
                                                </p>
                                            </div>
                                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                                                <p className="text-sm font-bold text-gray-600 mb-1">{inputs.projectLifespan}-Year Cumulative Savings</p>
                                                <p className="text-xl font-bold text-orange-600">₱{fmt(results.heatRecovery.enterpriseMetrics.cumulativeSavings_10yr)}</p>
                                                <p className="text-xs text-gray-500 mt-1">${fmt(results.heatRecovery.enterpriseMetrics.cumulativeSavings_10yr_USD)} USD</p>
                                            </div>
                                        </div>

                                        {/* Cash Flow Table */}
                                        <div className="bg-white rounded-lg p-4">
                                            <h6 className="font-semibold text-gray-800 mb-3">Year-by-Year Cash Flow Analysis</h6>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="border-b-2 border-gray-300">
                                                            <th className="text-left py-2 text-gray-700">Year</th>
                                                            <th className="text-right py-2 text-gray-700">Investment</th>
                                                            <th className="text-right py-2 text-gray-700">Annual Savings</th>
                                                            <th className="text-right py-2 text-gray-700">Cash Flow</th>
                                                            <th className="text-right py-2 text-gray-700">Cumulative</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {results.heatRecovery.enterpriseMetrics.cashFlow.map((row, idx) => (
                                                            <tr key={idx} className={`border-b ${row.cumulative >= 0 && idx > 0 ? 'bg-green-50' : ''}`}>
                                                                <td className="py-2 font-semibold text-gray-700">{row.year}</td>
                                                                <td className="text-right text-red-600">
                                                                    {row.investment < 0 ? `(₱${fmt(Math.abs(row.investment))})` : '-'}
                                                                </td>
                                                                <td className="text-right text-green-600">
                                                                    {row.savings > 0 ? `₱${fmt(row.savings)}` : '-'}
                                                                </td>
                                                                <td className={`text-right font-semibold ${row.cashFlow < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                                    {row.cashFlow < 0 ? `(₱${fmt(Math.abs(row.cashFlow))})` : `₱${fmt(row.cashFlow)}`}
                                                                </td>
                                                                <td className={`text-right font-bold ${row.cumulative < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                                    {row.cumulative < 0 ? `(₱${fmt(Math.abs(row.cumulative))})` : `₱${fmt(row.cumulative)}`}
                                                                    {row.cumulative >= 0 && idx > 0 && results.heatRecovery.enterpriseMetrics.cashFlow[idx-1].cumulative < 0 && (
                                                                        <span className="ml-2 text-xs bg-green-600 text-white px-2 py-1 rounded">BREAKEVEN</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        <div className="mt-4 bg-blue-50 p-3 rounded border border-blue-200">
                                            <p className="text-xs text-gray-700">
                                                <strong>📊 Investment Recommendation:</strong> {
                                                    results.heatRecovery.enterpriseMetrics.irr > 25 
                                                        ? "STRONGLY RECOMMENDED - Excellent returns with payback under 4 years"
                                                        : results.heatRecovery.enterpriseMetrics.irr > 15
                                                        ? "RECOMMENDED - Good returns with reasonable payback period"
                                                        : "ACCEPTABLE - Positive returns, consider strategic value"
                                                }
                                            </p>
                                        </div>
                                    </div>

                                    <div className="bg-gradient-to-r from-green-100 to-emerald-100 p-4 rounded-lg border-2 border-green-400">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-bold text-gray-600 uppercase mb-1">NET Annual Operating Cost</p>
                                                <p className="text-sm text-gray-600">
                                                    Electricity: ₱{fmt(results.operating.annualCost)} 
                                                    <span className="text-green-600 font-bold"> - Heat Recovery Savings: ₱{fmt(results.operating.heatRecoverySavings)}</span>
                                                </p>
                                                <p className="text-3xl font-bold text-green-700 mt-2">
                                                    = ₱ {fmt(results.operating.netAnnualCost)}
                                                    {results.operating.netAnnualCost < 0 && (
                                                        <span className="text-base ml-2 text-green-800">(PROFIT!)</span>
                                                    )}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-bold text-gray-600 uppercase mb-1">Effective Payback</p>
                                                <p className="text-3xl font-bold text-blue-600">
                                                    {fmt(results.tco.effectivePayback, 1)} years
                                                </p>
                                                <p className="text-xs text-gray-600 mt-1">({fmt(results.tco.effectivePayback * 12, 0)} months)</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 bg-blue-50 p-3 rounded border border-blue-200">
                                        <p className="text-xs text-gray-700">
                                            <strong>💡 Use Cases:</strong> Perfect for food processing plants (CIP cleaning water), 
                                            hotels (laundry + guest facilities), commercial kitchens (sanitation), 
                                            dairy processing, or any facility needing hot water @ {results.heatRecovery.outlet_temp}°C
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Enterprise ROI */}
                    {results.enterpriseROI && (
                        <div className="mb-6 bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-xl border-2 border-purple-300">
                            <div className="flex items-center gap-2 mb-4">
                                <Target className="text-purple-600" size={28}/>
                                <h3 className="text-2xl font-bold text-purple-900">Enterprise ROI Analysis</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div className="bg-white p-4 rounded-lg border-2 border-purple-200 shadow-sm">
                                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">NPV @ {(inputs.enterpriseWACC * 100).toFixed(1)}%</p>
                                    <p className="text-2xl font-bold text-green-600">₱{fmt(results.enterpriseROI.financial.npv)}</p>
                                </div>
                                <div className="bg-white p-4 rounded-lg border-2 border-purple-200 shadow-sm">
                                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">Internal Rate of Return</p>
                                    <p className="text-2xl font-bold text-blue-600">{results.enterpriseROI.financial.irr.toFixed(1)}%</p>
                                </div>
                                <div className="bg-white p-4 rounded-lg border-2 border-indigo-200 shadow-sm">
                                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">Payback Period</p>
                                    <p className="text-2xl font-bold text-indigo-600">{results.enterpriseROI.financial.paybackYears.toFixed(1)} yrs</p>
                                </div>
                            </div>
                        </div>
                    )}

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
                    {/* Enterprise Toggle */}
                    <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Award className="text-purple-600" size={24}/>
                                <div>
                                    <h3 className="font-bold text-gray-800">Enterprise ROI Mode</h3>
                                    <p className="text-xs text-gray-600">NPV, IRR, and strategic value analysis</p>
                                </div>
                            </div>
                            <label className="flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={inputs.enableEnterpriseROI}
                                    onChange={(e) => setInputs(prev => ({ ...prev, enableEnterpriseROI: e.target.checked }))}
                                    className="sr-only peer"
                                />
                                <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                            </label>
                        </div>

                        {inputs.enableEnterpriseROI && (
                            <div className="mt-4 pt-4 border-t border-purple-200">
                                <InputField 
                                    label="WACC / Discount Rate (%)" 
                                    value={inputs.enterpriseWACC * 100} 
                                    onChange={(e) => setInputs(prev => ({ ...prev, enterpriseWACC: parseFloat(e.target.value) / 100 || 0.07 }))}
                                    step="0.1"
                                />
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Section 1: Room Dimensions */}
                        <div className="bg-gray-50 rounded-lg p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b-2 border-blue-500 pb-2">
                                1. Room Dimensions & Construction
                            </h3>
                            <div className="space-y-4">
                                <InputField label="Room Length (m)" value={inputs.roomL} 
                                    onChange={(e) => handleInputChange('roomL', parseFloat(e.target.value))} />
                                <InputField label="Room Width (m)" value={inputs.roomW} 
                                    onChange={(e) => handleInputChange('roomW', parseFloat(e.target.value))} />
                                <InputField label="Room Height (m)" value={inputs.roomH} 
                                    onChange={(e) => handleInputChange('roomH', parseFloat(e.target.value))} />
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Panel Type</label>
                                    <select
                                        value={inputs.panelType}
                                        onChange={(e) => handleInputChange('panelType', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        {Object.entries(CONFIG.PANEL_TYPES).map(([key, panel]) => (
                                            <option key={key} value={key}>
                                                {panel.name} (U={panel.uValue} W/m²·K)
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <InputField label="Ambient Temperature (°C)" value={inputs.ambientTemp} 
                                    onChange={(e) => handleInputChange('ambientTemp', parseFloat(e.target.value))} />
                                <InputField label="Target Room Temperature (°C)" value={inputs.roomTemp} 
                                    onChange={(e) => handleInputChange('roomTemp', parseFloat(e.target.value))} />
                            </div>
                        </div>

                        {/* Section 2: Product Load */}
                        <div className="bg-gray-50 rounded-lg p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b-2 border-blue-500 pb-2">
                                2. Product Load
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Product Type</label>
                                    <select
                                        value={inputs.productType}
                                        onChange={(e) => handleInputChange('productType', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        {Object.entries(CONFIG.PRODUCT_DATA).map(([key, product]) => (
                                            <option key={key} value={key}>{product.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <InputField label="Daily Turnover (kg)" value={inputs.dailyTurnover} 
                                    onChange={(e) => handleInputChange('dailyTurnover', parseFloat(e.target.value))} />
                                <InputField label="Incoming Product Temp (°C)" value={inputs.incomingTemp} 
                                    onChange={(e) => handleInputChange('incomingTemp', parseFloat(e.target.value))} />
                            </div>
                        </div>

                        {/* Section 3: Internal Loads */}
                        <div className="bg-gray-50 rounded-lg p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b-2 border-blue-500 pb-2">
                                3. Internal Loads
                            </h3>
                            <div className="space-y-4">
                                <InputField label="People (working 8h/day)" value={inputs.people} 
                                    onChange={(e) => handleInputChange('people', parseFloat(e.target.value))} />
                                <InputField label="Lighting (Watts)" value={inputs.lightingWatts} 
                                    onChange={(e) => handleInputChange('lightingWatts', parseFloat(e.target.value))} />
                                <InputField label="Motors/Fans (Watts)" value={inputs.motorsWatts} 
                                    onChange={(e) => handleInputChange('motorsWatts', parseFloat(e.target.value))} />
                                <InputField label="Door Openings per Day" value={inputs.doorOpenings} 
                                    onChange={(e) => handleInputChange('doorOpenings', parseFloat(e.target.value))} />
                            </div>
                        </div>

                        {/* Section 4: Financials */}
                        <div className="bg-gray-50 rounded-lg p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b-2 border-blue-500 pb-2">
                                4. Financial Parameters
                            </h3>
                            <div className="space-y-4">
                                <InputField label="Electricity Tariff (₱/kWh)" value={inputs.electricityTariff} step="0.01"
                                    onChange={(e) => handleInputChange('electricityTariff', parseFloat(e.target.value))} />
                                <InputField label="Installation Cost (₱)" value={inputs.installationCost} 
                                    onChange={(e) => handleInputChange('installationCost', parseFloat(e.target.value))} />
                                <InputField label="Operating Hours per Day" value={inputs.operatingHoursPerDay} 
                                    onChange={(e) => handleInputChange('operatingHoursPerDay', parseFloat(e.target.value))} />
                                <InputField label="Project Lifespan (Years)" value={inputs.projectLifespan} 
                                    onChange={(e) => handleInputChange('projectLifespan', parseFloat(e.target.value))} />
                                <InputField label="Annual Discount Rate (%)" value={inputs.discountRate} step="0.5"
                                    onChange={(e) => handleInputChange('discountRate', parseFloat(e.target.value))} />
                            </div>
                        </div>

                        {/* Section 5: Heat Recovery Parameters */}
                        <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-6 border-2 border-orange-300">
                            <h3 className="text-lg font-bold text-gray-800 mb-2 border-b-2 border-orange-500 pb-2 flex items-center gap-2">
                                <Thermometer className="text-orange-600" size={20} />
                                5. Heat Recovery Configuration 🔥
                            </h3>
                            <p className="text-xs text-gray-600 mb-4">
                                If your selected iCOOL unit has heat recovery capability, enable it to see FREE hot water production and cost savings
                            </p>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 bg-white p-3 rounded border border-orange-200">
                                    <input
                                        type="checkbox"
                                        checked={inputs.enableHeatRecovery}
                                        onChange={(e) => handleInputChange('enableHeatRecovery', e.target.checked)}
                                        className="w-5 h-5 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                                    />
                                    <label className="font-semibold text-gray-800">
                                        Enable Heat Recovery (if available)
                                    </label>
                                </div>
                                
                                {inputs.enableHeatRecovery && (
                                    <>
                                        <InputField 
                                            label="Daily Hot Water Requirement (Liters)" 
                                            value={inputs.hotWaterUsage_L_day} 
                                            onChange={(e) => handleInputChange('hotWaterUsage_L_day', parseFloat(e.target.value))} 
                                        />
                                        <InputField 
                                            label="Inlet Water Temperature (°C)" 
                                            value={inputs.hotWaterInletTemp} 
                                            onChange={(e) => handleInputChange('hotWaterInletTemp', parseFloat(e.target.value))} 
                                        />
                                        <InputField 
                                            label="Target Hot Water Temperature (°C)" 
                                            value={inputs.hotWaterOutletTemp} 
                                            onChange={(e) => handleInputChange('hotWaterOutletTemp', parseFloat(e.target.value))} 
                                        />
                                        
                                        <div className="border-t-2 border-orange-300 pt-4 mt-4">
                                            <h4 className="font-semibold text-gray-800 mb-3">Current Heating System (for Comparison)</h4>
                                            
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Select Current Water Heating Method</label>
                                                <select
                                                    value={inputs.currentHeatingSystem}
                                                    onChange={(e) => handleInputChange('currentHeatingSystem', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 mb-3"
                                                >
                                                    <option value="electric">Electric Water Heater</option>
                                                    <option value="lpg">LPG Water Heater</option>
                                                    <option value="diesel">Diesel Water Heater</option>
                                                    <option value="natural_gas">Natural Gas Water Heater</option>
                                                </select>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-3">
                                                <InputField 
                                                    label="LPG Price (₱/L)" 
                                                    value={inputs.lpgPrice} 
                                                    step="0.1"
                                                    onChange={(e) => handleInputChange('lpgPrice', parseFloat(e.target.value))} 
                                                />
                                                <InputField 
                                                    label="LPG Efficiency (%)" 
                                                    value={inputs.lpgEfficiency} 
                                                    onChange={(e) => handleInputChange('lpgEfficiency', parseFloat(e.target.value))} 
                                                />
                                                <InputField 
                                                    label="Diesel Price (₱/L)" 
                                                    value={inputs.dieselPrice} 
                                                    step="0.1"
                                                    onChange={(e) => handleInputChange('dieselPrice', parseFloat(e.target.value))} 
                                                />
                                                <InputField 
                                                    label="Diesel Efficiency (%)" 
                                                    value={inputs.dieselEfficiency} 
                                                    onChange={(e) => handleInputChange('dieselEfficiency', parseFloat(e.target.value))} 
                                                />
                                                <InputField 
                                                    label="Natural Gas Price (₱/m³)" 
                                                    value={inputs.naturalGasPrice} 
                                                    step="0.1"
                                                    onChange={(e) => handleInputChange('naturalGasPrice', parseFloat(e.target.value))} 
                                                />
                                                <InputField 
                                                    label="Natural Gas Efficiency (%)" 
                                                    value={inputs.naturalGasEfficiency} 
                                                    onChange={(e) => handleInputChange('naturalGasEfficiency', parseFloat(e.target.value))} 
                                                />
                                                <InputField 
                                                    label="Electric Heater Efficiency (%)" 
                                                    value={inputs.electricHeaterEfficiency} 
                                                    onChange={(e) => handleInputChange('electricHeaterEfficiency', parseFloat(e.target.value))} 
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="bg-blue-50 p-3 rounded border border-blue-200">
                                            <p className="text-xs text-gray-700">
                                                <strong>💡 Typical Applications:</strong><br/>
                                                • Food Processing: CIP cleaning (60°C)<br/>
                                                • Hotels: Laundry & guest bathrooms (50-60°C)<br/>
                                                • Commercial Kitchens: Dishwashing & sanitation (60°C)<br/>
                                                • Dairy Processing: Equipment washing (55-65°C)
                                            </p>
                                        </div>
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
                            className="w-full py-4 text-lg font-bold bg-blue-600 hover:bg-blue-700"
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

export default ColdRoomCalc;
