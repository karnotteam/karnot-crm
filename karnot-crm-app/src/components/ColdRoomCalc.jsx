import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { ArrowLeft, Calculator, Snowflake, AlertCircle, CheckCircle, Download, TrendingUp, DollarSign, Target, BarChart3, ChevronDown, ChevronUp, Thermometer, Award } from 'lucide-react';

// ==========================================
// CONFIGURATION & CONSTANTS
// ==========================================
const CONFIG = {
    AIR_DENSITY_KG_M3: 1.2,
    AIR_SPECIFIC_HEAT_KJ_KGK: 1.006,
    KW_TO_TR: 3.517,
    KW_TO_HP: 1.341,
    GRID_CO2_KG_PER_KWH: 0.7,
    FX_USD_PHP: 58.5,
    SAFETY_FACTOR: 1.10,
    
    // U-Values for different panel types (W/m²·K)
    PANEL_TYPES: {
        'pur_120mm': { name: '120mm PUR', uValue: 0.21 },
        'pur_150mm': { name: '150mm PUR', uValue: 0.18 },
        'pur_200mm': { name: '200mm PUR', uValue: 0.14 },
        'pir_120mm': { name: '120mm PIR', uValue: 0.19 },
        'pir_150mm': { name: '150mm PIR', uValue: 0.16 }
    },

    // Product Data
    PRODUCT_DATA: {
        'meat_frozen': { name: 'Meat (to be Frozen)', specificHeat: 3.2, latentHeat: 230, freezingPoint: -2, specificHeatFrozen: 1.6 },
        'fish': { name: 'Fish (to be Frozen)', specificHeat: 3.18, latentHeat: 250, freezingPoint: -2.2, specificHeatFrozen: 1.59 },
        'general': { name: 'General Goods', specificHeat: 2.0, latentHeat: 0, freezingPoint: -100, specificHeatFrozen: 2.0 },
        'fruits': { name: 'Fruits/Vegetables', specificHeat: 3.8, latentHeat: 280, freezingPoint: -1.5, specificHeatFrozen: 1.9 },
        'meat_chilled': { name: 'Fresh Meat (Chilled)', specificHeat: 3.2, latentHeat: 230, freezingPoint: -2, specificHeatFrozen: 1.6 },
        'dairy': { name: 'Dairy Products', specificHeat: 3.5, latentHeat: 270, freezingPoint: -1, specificHeatFrozen: 1.75 },
        'ice_cream': { name: 'Ice Cream', specificHeat: 2.9, latentHeat: 260, freezingPoint: -5, specificHeatFrozen: 1.45 }
    }
};

// --- DATASHEET PHYSICS ENGINE ---
// Derived directly from iCOOL 15HP HTML Datasheet
const calculateCO2Performance = (Te, Ta) => {
    // Reference Point from Datasheet (-30°C / 32°C)
    const ref = { 
        te: -30, 
        ta: 32, 
        maxCap: 8.675, 
        maxPower: 7.579 
    };

    // Capacity Factors (Linear Approximation from script)
    const teFactor = 1 + (Te - ref.te) * 0.03; 
    const taFactor = 1 - (Ta - ref.ta) * 0.025;
    
    // Power Factors
    const tePowerFactor = 1 - (Te - ref.te) * 0.005;
    const taPowerFactor = 1 + (Ta - ref.ta) * 0.015;

    // Calculate Reference Unit Performance at Current Conditions
    const currentCapacity = ref.maxCap * teFactor * taFactor;
    const currentPower = ref.maxPower * tePowerFactor * taPowerFactor;

    // Avoid division by zero or negative results in extreme edge cases
    if (currentPower <= 0 || currentCapacity <= 0) return 1.0;

    // COP = Output (kW) / Input (kW)
    return currentCapacity / currentPower;
};

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
        enableHeatRecovery: true,
        hotWaterUsage_L_day: 1000,
        hotWaterInletTemp: 20,
        hotWaterOutletTemp: 60,
        currentHeatingSystem: 'electric',
        lpgPrice: 60.00,
        dieselPrice: 65.00,
        naturalGasPrice: 45.00,
        lpgEfficiency: 85,
        dieselEfficiency: 80,
        naturalGasEfficiency: 90,
        electricHeaterEfficiency: 95
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
                
                const icoolProducts = productsList.filter(p => {
                    const category = (p.category || '').toLowerCase();
                    const name = (p.name || '').toLowerCase();
                    return category.includes('icool') || name.includes('icool');
                });
                
                icoolProducts.sort((a, b) => {
                    const aKW = parseFloat(a.kW_Cooling_Nominal || 0);
                    const bKW = parseFloat(b.kW_Cooling_Nominal || 0);
                    return aKW - bKW;
                });

                setProducts(icoolProducts);
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

    // --- MAIN CALCULATION ENGINE ---
    const calculate = () => {
        const {
            roomL, roomW, roomH, panelType, ambientTemp, roomTemp,
            productType, dailyTurnover, incomingTemp,
            people, lightingWatts, motorsWatts, doorOpenings,
            electricityTariff, installationCost,
            projectLifespan, discountRate, operatingHoursPerDay
        } = inputs;

        // --- 1. THERMAL LOAD PHYSICS ---
        const roomVolume_m3 = roomL * roomW * roomH;
        const surfaceArea_m2 = (2 * roomL * roomH) + (2 * roomW * roomH) + (roomL * roomW);
        const tempDiff = Math.abs(ambientTemp - roomTemp);
        const uValue = CONFIG.PANEL_TYPES[panelType].uValue;
        const pullDownTimeSeconds = 24 * 3600; 

        // A. Transmission Load (Watts)
        const transmissionLoad_W = surfaceArea_m2 * uValue * tempDiff; 
        const transmissionLoad_kW = transmissionLoad_W / 1000;

        // B. Product Load
        const product = CONFIG.PRODUCT_DATA[productType];
        let productLoad_W = 0;
        
        if (dailyTurnover > 0 && incomingTemp > roomTemp) {
            let sensibleAbove_kJ = 0;
            let latent_kJ = 0;
            let sensibleBelow_kJ = 0;

            if (incomingTemp > product.freezingPoint) {
                const endTemp = Math.max(roomTemp, product.freezingPoint);
                sensibleAbove_kJ = dailyTurnover * product.specificHeat * (incomingTemp - endTemp);
            }
            
            if (roomTemp < product.freezingPoint && incomingTemp > product.freezingPoint) {
                latent_kJ = dailyTurnover * product.latentHeat;
            }
            
            if (roomTemp < product.freezingPoint) {
                const startTemp = Math.min(incomingTemp, product.freezingPoint);
                sensibleBelow_kJ = dailyTurnover * product.specificHeatFrozen * (startTemp - roomTemp);
            }
            
            const totalProduct_kJ = sensibleAbove_kJ + latent_kJ + sensibleBelow_kJ;
            productLoad_W = (totalProduct_kJ * 1000) / pullDownTimeSeconds;
        }
        const productLoad_kW = productLoad_W / 1000;

        // C. Internal Loads
        const heatPerPersonW = roomTemp < 0 ? 250 : 150;
        const internalLoad_W = (people * heatPerPersonW) + lightingWatts + motorsWatts;
        const internalLoad_kW = internalLoad_W / 1000;

        // D. Infiltration Load
        const airChangesPerDay = roomTemp > 0 ? 10 : 8; 
        const infiltrationLoad_W = (roomVolume_m3 * airChangesPerDay * CONFIG.AIR_DENSITY_KG_M3 * CONFIG.AIR_SPECIFIC_HEAT_KJ_KGK * tempDiff * 1000) / (24 * 3600);
        const infiltrationLoad_kW = infiltrationLoad_W / 1000;

        // E. Door Load
        const doorLoad_perOpening_kJ = (roomVolume_m3 * 0.3 * CONFIG.AIR_DENSITY_KG_M3 * CONFIG.AIR_SPECIFIC_HEAT_KJ_KGK * tempDiff);
        const doorLoad_kW = (doorLoad_perOpening_kJ * doorOpenings) / (24 * 3600); 

        // TOTAL LOAD
        const totalThermalLoad_kW = transmissionLoad_kW + productLoad_kW + internalLoad_kW + infiltrationLoad_kW + doorLoad_kW;
        const totalWithSafety_kW = totalThermalLoad_kW * CONFIG.SAFETY_FACTOR;
        const totalWithSafety_TR = totalWithSafety_kW / CONFIG.KW_TO_TR;

        // --- 2. EQUIPMENT & EFFICIENCY (Using Datasheet Logic) ---
        // Evaporating Temp assumption: Room Temp - 7K (typical for CO2)
        const evapTemp = roomTemp - 7; 
        const estimatedCOP = calculateCO2Performance(evapTemp, ambientTemp);
        
        // Electrical Demand
        const requiredElectrical_kW = totalWithSafety_kW / estimatedCOP;
        const requiredElectrical_HP = requiredElectrical_kW * CONFIG.KW_TO_HP;

        // Baseline Comparison (Old R404A/Freon) - typically 30% less efficient than optimized CO2
        const baselineCOP = estimatedCOP * 0.75; 
        const baselineElectrical_kW = totalWithSafety_kW / baselineCOP;

        // --- 3. SELECTION LOGIC ---
        const suitableUnits = products.filter(p => getCoolingKWFromName(p) >= totalWithSafety_kW);
        let selectedICool = null;
        
        if (suitableUnits.length > 0) {
             selectedICool = suitableUnits.reduce((cheapest, current) => {
                return (current.salesPriceUSD || Infinity) < (cheapest.salesPriceUSD || Infinity) ? current : cheapest;
            });
        } else if (products.length > 0) {
            selectedICool = products[products.length - 1];
        }

        if (!selectedICool) {
            alert('No iCOOL products found in database!');
            return;
        }

        // --- 4. FINANCIALS: OPEX ---
        const annualOperatingHours = operatingHoursPerDay * 365;
        const icool_annual_kWh = requiredElectrical_kW * annualOperatingHours;
        const icool_annual_cost = icool_annual_kWh * electricityTariff;
        const icool_annual_co2 = icool_annual_kWh * CONFIG.GRID_CO2_KG_PER_KWH;

        const baseline_annual_kWh = baselineElectrical_kW * annualOperatingHours;
        const baseline_annual_cost = baseline_annual_kWh * electricityTariff;
        const baseline_annual_co2 = baseline_annual_kWh * CONFIG.GRID_CO2_KG_PER_KWH;

        // Savings Sources
        const savings_refrig_cost = baseline_annual_cost - icool_annual_cost;

        // --- 5. HEAT RECOVERY SAVINGS ---
        let heatRecovery = null;
        let savings_hr_cost = 0;
        
        const hasHeatRecoveryPort = (selectedICool.name || '').toLowerCase().includes('heat recovery') || 
                                  (selectedICool.name || '').toLowerCase().includes('hr') ||
                                  parseFloat(selectedICool.kW_DHW_Nominal || 0) > 0;

        if (hasHeatRecoveryPort && inputs.enableHeatRecovery) {
            // Recoverable Heat = Cooling Load + Compressor Power Input
            const total_heat_rejection_kW = totalWithSafety_kW + requiredElectrical_kW;
            const recoverable_kW = total_heat_rejection_kW * 0.65; // 65% efficiency

            const waterTempRise = inputs.hotWaterOutletTemp - inputs.hotWaterInletTemp;
            const max_L_per_hour = (recoverable_kW * 1000) / (waterTempRise * 1.163);
            
            const daily_production_L = max_L_per_hour * operatingHoursPerDay;
            const utilized_L_day = Math.min(daily_production_L, inputs.hotWaterUsage_L_day);
            
            const daily_hr_energy_kWh = (utilized_L_day * waterTempRise * 1.163) / 1000;
            const annual_hr_energy_kWh = daily_hr_energy_kWh * 365;
            
            // Calculate savings based on replacement fuel
            let comparisonCost = 0;
            let comparisonName = '';
            
            if (inputs.currentHeatingSystem === 'electric') {
                comparisonCost = (annual_hr_energy_kWh / (inputs.electricHeaterEfficiency/100)) * electricityTariff;
                comparisonName = 'Electric Water Heater';
            } else if (inputs.currentHeatingSystem === 'lpg') {
                const lpg_kWh = annual_hr_energy_kWh / (inputs.lpgEfficiency/100);
                comparisonCost = (lpg_kWh / 6.9) * inputs.lpgPrice; // ~6.9 kWh/L LPG
                comparisonName = 'LPG Water Heater';
            } else if (inputs.currentHeatingSystem === 'diesel') {
                const diesel_kWh = annual_hr_energy_kWh / (inputs.dieselEfficiency/100);
                comparisonCost = (diesel_kWh / 10.0) * inputs.dieselPrice; // ~10 kWh/L Diesel
                comparisonName = 'Diesel Water Heater';
            }

            savings_hr_cost = comparisonCost;

            heatRecovery = {
                hasCapability: true,
                enabled: true,
                capacity_kW: recoverable_kW,
                utilized_L_day: utilized_L_day,
                annual_energy_kWh: annual_hr_energy_kWh,
                primaryComparison: {
                     name: comparisonName,
                     annualCost: savings_hr_cost
                }
            };
        }

        // --- 6. SPOILAGE SAVINGS (Enterprise Mode) ---
        let savings_spoilage_cost = 0;
        if (inputs.enableEnterpriseROI) {
            const valPerKg = 200; // Default placeholder
            const riskFactor = 0.15; // 15% risk without reliable cooling
            savings_spoilage_cost = (dailyTurnover * 365 * valPerKg) * riskFactor;
        }

        // --- 7. ROI & TCO ---
        const total_annual_benefit = savings_refrig_cost + savings_hr_cost + savings_spoilage_cost;
        const totalCapex = (selectedICool.salesPriceUSD * CONFIG.FX_USD_PHP) + installationCost;
        
        const simplePaybackYears = totalCapex / total_annual_benefit;

        let totalPV = 0;
        for (let year = 1; year <= projectLifespan; year++) {
            totalPV += total_annual_benefit / Math.pow(1 + (discountRate / 100), year);
        }
        const npv = totalPV - totalCapex;
        const totalLifetimeCost = totalCapex + (icool_annual_cost * projectLifespan); 

        // --- 8. RESULTS ---
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
                icool_annual_cost, icool_annual_kWh, icool_annual_co2,
                baseline_annual_cost, baseline_annual_kWh, baseline_annual_co2,
                baseline_cop: baselineCOP, 
                savings_refrig_cost,
                savings_hr_cost,
                savings_spoilage_cost,
                total_annual_benefit
            },
            heatRecovery,
            capex: {
                icool: selectedICool.salesPriceUSD * CONFIG.FX_USD_PHP,
                installation: installationCost,
                total: totalCapex
            },
            tco: {
                lifetime: totalLifetimeCost,
                annualTCO: icool_annual_cost,
                effectivePayback: simplePaybackYears
            },
            estimatedCOP: estimatedCOP,
            enterpriseROI: inputs.enableEnterpriseROI ? {
                financial: {
                    npv: npv,
                    irr: calculateIRR(totalCapex, total_annual_benefit, projectLifespan),
                    annualBenefit: total_annual_benefit,
                    paybackYears: simplePaybackYears
                },
                csv: { score: 8.5, multiplier: 1.2, strategicROI: 0 } 
            } : null
        });

        setShowReport(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Helper: Simple IRR Calculation
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

    // Formatter
    const fmt = (n, decimals = 0) => {
        if (n === null || n === undefined || isNaN(n)) return '0';
        return Number(n).toLocaleString(undefined, { 
            minimumFractionDigits: decimals, 
            maximumFractionDigits: decimals 
        });
    };

    // Helper Input Component (Internal)
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
                    <Button onClick={() => setActiveView('calculatorsHub')} variant="secondary" className="flex items-center gap-2">
                        <ArrowLeft size={16} /> Back
                    </Button>
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                            <Snowflake className="text-blue-600" /> Cold Room Calculator
                        </h2>
                        <p className="text-gray-600 mt-1">Panasonic iCOOL system sizing with Datasheet-Accurate Performance</p>
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
                            1. Recommended System & Performance
                        </h4>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <table className="w-full">
                                <tbody>
                                    <tr className="border-b">
                                        <th className="text-left py-3 text-gray-600">Selected iCOOL Unit</th>
                                        <td className="text-right py-3 font-bold text-gray-900">{results.selection.icool.name}</td>
                                    </tr>
                                    <tr className="border-b">
                                        <th className="text-left py-3 text-gray-600">Total Thermal Load</th>
                                        <td className="text-right py-3 font-bold text-blue-600">{fmt(results.loads.totalWithSafety_kW, 2)} kW</td>
                                    </tr>
                                    <tr className="border-b">
                                        <th className="text-left py-3 text-gray-600">Dynamic COP (@ {inputs.roomTemp}°C)</th>
                                        <td className="text-right py-3 font-bold text-green-600">{results.estimatedCOP.toFixed(2)} (Datasheet derived)</td>
                                    </tr>
                                    <tr>
                                        <th className="text-left py-3 text-gray-600">Est. Compressor Power</th>
                                        <td className="text-right py-3">{fmt(results.loads.requiredElectrical_HP, 1)} HP</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Detailed Load Breakdown */}
                    {showCalculations && (
                        <div className="mb-6 bg-blue-50 p-4 rounded-lg">
                            <h5 className="font-semibold text-gray-800 mb-3">Load Breakdown</h5>
                            <table className="w-full text-sm">
                                <tbody>
                                    <tr><td>Transmission</td><td className="text-right">{fmt(results.loads.transmission_kW, 2)} kW</td></tr>
                                    <tr><td>Product Load</td><td className="text-right">{fmt(results.loads.product_kW, 2)} kW</td></tr>
                                    <tr><td>Internal Load</td><td className="text-right">{fmt(results.loads.internal_kW, 2)} kW</td></tr>
                                    <tr><td>Infiltration</td><td className="text-right">{fmt(results.loads.infiltration_kW, 2)} kW</td></tr>
                                    <tr className="font-bold text-blue-700 border-t border-blue-200">
                                        <td>Total (inc. Safety)</td><td className="text-right">{fmt(results.loads.totalWithSafety_kW, 2)} kW</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                    
                    <Button variant="secondary" onClick={() => setShowCalculations(!showCalculations)} className="w-full mb-6">
                        {showCalculations ? 'Hide' : 'Show'} Load Breakdown
                    </Button>

                    {/* Financials & ROI */}
                    <div className="mb-6">
                        <h4 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <DollarSign size={20} className="text-blue-600" />
                            2. Financial Summary & Payback
                        </h4>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <table className="w-full">
                                <tbody>
                                    <tr className="border-b"><th className="text-left py-3">Total Investment (CAPEX)</th><td className="text-right font-bold">₱ {fmt(results.capex.total)}</td></tr>
                                    <tr className="border-b"><th className="text-left py-3">Annual Electricity Cost</th><td className="text-right font-bold text-orange-600">₱ {fmt(results.operating.icool_annual_cost)}</td></tr>
                                    <tr className="border-b"><th className="text-left py-3">Total Annual Savings</th><td className="text-right font-bold text-green-600">₱ {fmt(results.operating.total_annual_benefit)}</td></tr>
                                    <tr className="border-b"><th className="text-left py-3">Simple Payback</th><td className="text-right font-bold text-blue-600">{results.tco.effectivePayback.toFixed(1)} Years</td></tr>
                                    <tr><th className="text-left py-3">10-Year TCO</th><td className="text-right font-bold text-purple-600">₱ {fmt(results.tco.lifetime)}</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-6 flex gap-3 justify-end">
                        <Button onClick={() => window.print()} variant="secondary" className="flex items-center gap-2"><Download size={16} /> Print PDF</Button>
                        <Button onClick={() => setShowReport(false)} variant="primary">Edit Inputs</Button>
                    </div>
                </div>
            )}

            {/* Input Form */}
            {!showReport && (
                <div className="bg-white rounded-xl shadow-lg p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Section 1: Dimensions & Temp */}
                        <div className="bg-gray-50 rounded-lg p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b-2 border-blue-500 pb-2">1. Room Configuration</h3>
                            <div className="space-y-4">
                                <InputField label="Length (m)" value={inputs.roomL} onChange={(e) => handleInputChange('roomL', parseFloat(e.target.value))} />
                                <InputField label="Width (m)" value={inputs.roomW} onChange={(e) => handleInputChange('roomW', parseFloat(e.target.value))} />
                                <InputField label="Height (m)" value={inputs.roomH} onChange={(e) => handleInputChange('roomH', parseFloat(e.target.value))} />
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Panel Type</label>
                                    <select value={inputs.panelType} onChange={(e) => handleInputChange('panelType', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                                        {Object.entries(CONFIG.PANEL_TYPES).map(([key, panel]) => (
                                            <option key={key} value={key}>{panel.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <InputField label="Ambient Temp (°C)" value={inputs.ambientTemp} onChange={(e) => handleInputChange('ambientTemp', parseFloat(e.target.value))} />
                                <InputField label="Room Temp (°C)" value={inputs.roomTemp} onChange={(e) => handleInputChange('roomTemp', parseFloat(e.target.value))} />
                            </div>
                        </div>

                        {/* Section 2: Product & Usage */}
                        <div className="bg-gray-50 rounded-lg p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b-2 border-blue-500 pb-2">2. Product & Usage</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Product Type</label>
                                    <select value={inputs.productType} onChange={(e) => handleInputChange('productType', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                                        {Object.entries(CONFIG.PRODUCT_DATA).map(([key, product]) => (
                                            <option key={key} value={key}>{product.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <InputField label="Daily Turnover (kg)" value={inputs.dailyTurnover} onChange={(e) => handleInputChange('dailyTurnover', parseFloat(e.target.value))} />
                                <InputField label="Incoming Temp (°C)" value={inputs.incomingTemp} onChange={(e) => handleInputChange('incomingTemp', parseFloat(e.target.value))} />
                                <InputField label="Electricity Rate (₱/kWh)" value={inputs.electricityTariff} onChange={(e) => handleInputChange('electricityTariff', parseFloat(e.target.value))} step="0.01" />
                            </div>
                        </div>
                    </div>

                    <div className="mt-8">
                        <Button onClick={calculate} variant="primary" className="w-full py-4 text-lg font-bold bg-blue-600 hover:bg-blue-700">
                            <Calculator size={20} className="mr-2" /> Generate Proposal
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ColdRoomCalc;
