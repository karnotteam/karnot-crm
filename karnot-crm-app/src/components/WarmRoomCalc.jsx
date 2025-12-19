import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Button } from '../data/constants.jsx';
import { ArrowLeft, Calculator, Flame, AlertCircle, CheckCircle, Download, TrendingUp, DollarSign, Leaf } from 'lucide-react';

const CONFIG = {
    AIR_DENSITY_KG_M3: 1.2,
    AIR_SPECIFIC_HEAT_KJ_KGK: 1.006,
    DIESEL_LHV_KWH_L: 9.9,
    DIESEL_CO2_KG_PER_L: 2.68,
    GRID_CO2_KG_PER_KWH: 0.7,
    FX_USD_PHP: 58.5,
    REQUIRED_WATER_TEMP_C: 65,
    TANK_SIZING_L_PER_KW: 20,
    PV_DERATE_FACTOR: 0.80,
    WEEKEND_SUN_DAYS: 2,
    BATTERY_DOD: 0.80,
    SOLAR_PANEL_COST_USD: 200,
    SOLAR_PANEL_KW_RATED: 0.425,
    INVERTER_COST_PER_WATT_USD: 0.30,
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
        { id: "scaleLoss", label: 'Scale Deposit Loss', value: 10.0, isLoss: true },
    ]
};

const WarmRoomCalc = ({ setActiveView, user }) => {
    // Product data from Firebase
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form inputs
    const [inputs, setInputs] = useState({
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
        refrigerantType: 'iHEAT (R290)',
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
        const availableHeatPumps = products
            .filter(p => p.category === refrigerantType && getPeakKwFromName(p.name) > 0)
            .sort((a, b) => getPeakKwFromName(a.name) - getPeakKwFromName(b.name));
        
        let selectedHeatPump = availableHeatPumps.find(hp => getPeakKwFromName(hp.name) >= peakLoad_kW) || 
            availableHeatPumps[availableHeatPumps.length - 1];
        
        if (!selectedHeatPump) {
            alert("No suitable heat pump found in database for selected refrigerant type!");
            return;
        }

        // Temperature compatibility check
        let compatibility = { isCompatible: true, message: "System is suitable for the required temperature." };
        if ((refrigerantType.includes('R32') && CONFIG.REQUIRED_WATER_TEMP_C > 60) || 
            (refrigerantType.includes('R290') && CONFIG.REQUIRED_WATER_TEMP_C > 80)) {
            compatibility.isCompatible = false;
            compatibility.message = `Warning: The selected heat pump range may not be suitable for ${CONFIG.REQUIRED_WATER_TEMP_C}°C water temperature.`;
        }

        // --- TANK SELECTION FROM FIREBASE ---
        const requiredTankSizeL = getPeakKwFromName(selectedHeatPump.name) * CONFIG.TANK_SIZING_L_PER_KW;
        const availableTanks = products
            .filter(p => p.category && p.category.includes('iSTOR'))
            .sort((a, b) => getTankLitersFromName(a.name) - getTankLitersFromName(b.name));
        
        let selectedTank = availableTanks.find(t => getTankLitersFromName(t.name) >= requiredTankSizeL) || 
            availableTanks[availableTanks.length - 1];

        // --- FAN COIL SELECTION FROM FIREBASE ---
        const requiredFanCoilKw = peakLoad_kW / 2; // Split between 2 units
        const availableFanCoils = products
            .filter(p => p.name && p.name.includes('iZONE FCU'))
            .sort((a, b) => getPeakKwFromName(a.name) - getPeakKwFromName(b.name));
        
        let selectedFanCoil = availableFanCoils.find(f => getPeakKwFromName(f.name) >= requiredFanCoilKw) || 
            availableFanCoils[availableFanCoils.length - 1];

        // --- CAPEX CALCULATION ---
        const heatPumpSalePrice = selectedHeatPump ? (selectedHeatPump.salesPriceUSD * CONFIG.FX_USD_PHP) : 0;
        const tankSalePrice = selectedTank ? (selectedTank.salesPriceUSD * CONFIG.FX_USD_PHP) : 0;
        const fanCoilSalePrice = selectedFanCoil ? (selectedFanCoil.salesPriceUSD * CONFIG.FX_USD_PHP * 2) : 0;
        
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
            pvHardwareCostPHP = solarHardwareUSD * CONFIG.FX_USD_PHP;
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
            solar: { storage, requiredPV_kWp }
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

                    {/* System Summary */}
                    <div className="mb-6">
                        <h4 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <Calculator size={20} className="text-orange-600" />
                            1. Recommended System & Heating Loads
                        </h4>
                        <div className="bg-gray-50 rounded-lg p-4">
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
                                        <td className="text-right py-3">₱ {fmt(results.capex.hp)}</td>
                                    </tr>
                                    <tr className="border-b">
                                        <th className="text-left py-3 text-gray-600">
                                            Fan Coil Units (2 × {results.fanCoil.selection?.name || 'N/A'})
                                        </th>
                                        <td className="text-right py-3">₱ {fmt(results.capex.fanCoil)}</td>
                                    </tr>
                                    <tr className="border-b">
                                        <th className="text-left py-3 text-gray-600">
                                            Thermal Storage Tank ({results.tank.selection?.name || 'N/A'})
                                        </th>
                                        <td className="text-right py-3">₱ {fmt(results.capex.tank)}</td>
                                    </tr>
                                    <tr className="border-b">
                                        <th className="text-left py-3 text-gray-600">Installation & Commissioning</th>
                                        <td className="text-right py-3">₱ {fmt(results.capex.install)}</td>
                                    </tr>
                                    {results.capex.pvHardware > 0 && (
                                        <>
                                            <tr className="border-b">
                                                <th className="text-left py-3 text-gray-600">
                                                    Solar PV Hardware ({fmt(results.solar.requiredPV_kWp, 1)} kWp)
                                                </th>
                                                <td className="text-right py-3">₱ {fmt(results.capex.pvHardware)}</td>
                                            </tr>
                                            <tr className="border-b">
                                                <th className="text-left py-3 text-gray-600">Solar PV Installation</th>
                                                <td className="text-right py-3">₱ {fmt(results.capex.pvInstall)}</td>
                                            </tr>
                                        </>
                                    )}
                                    {results.capex.storage > 0 && (
                                        <tr className="border-b">
                                            <th className="text-left py-3 text-gray-600">
                                                {results.solar.storage.type} ({fmt(results.solar.storage.requiredSize, 1)} {results.solar.storage.units})
                                            </th>
                                            <td className="text-right py-3">₱ {fmt(results.capex.storage)}</td>
                                        </tr>
                                    )}
                                    <tr className="border-b-2 border-orange-500">
                                        <th className="text-left py-3 font-bold text-gray-900">
                                            Total Project Investment (CAPEX)
                                        </th>
                                        <td className="text-right py-3 font-bold text-orange-600 text-lg">
                                            ₱ {fmt(results.capex.total)}
                                        </td>
                                    </tr>
                                    <tr className="border-b">
                                        <th className="text-left py-3 text-gray-600">Estimated Annual Savings</th>
                                        <td className="text-right py-3 font-bold text-green-600">
                                            ₱ {fmt(results.savings.annual)}
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
                                            ₱ {fmt(results.roi.npv)}
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
                            ₱ {fmt(results.roi.costOfDelay)}
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
                                        Select Heat Pump Range
                                    </label>
                                    <select
                                        value={inputs.refrigerantType}
                                        onChange={(e) => handleInputChange('refrigerantType', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    >
                                        <option value="iHEAT (R290)">iHEAT (R290)</option>
                                        <option value="iHEAT (CO₂)">iHEAT (CO₂)</option>
                                        <option value="iHEAT Pro (R32)">iHEAT Pro (R32)</option>
                                        <option value="iHEAT Clima (R32)">iHEAT Clima (R32)</option>
                                    </select>
                                </div>
                                <InputField label="Heat Pump COP (at 65°C Water)" value={inputs.hpCOP} step="0.01"
                                    onChange={(e) => handleInputChange('hpCOP', parseFloat(e.target.value))} />
                                <InputField label="Electricity Tariff (₱/kWh)" value={inputs.electricityTariff} step="0.01"
                                    onChange={(e) => handleInputChange('electricityTariff', parseFloat(e.target.value))} />
                                <InputField label="Diesel Price (₱/Liter)" value={inputs.dieselPrice} step="0.01"
                                    onChange={(e) => handleInputChange('dieselPrice', parseFloat(e.target.value))} />
                                <InputField label="Installation Cost (₱)" value={inputs.installationCost} 
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
                                        <InputField label="Solar Installation Cost (₱/kWp)" value={inputs.solarInstallCost} 
                                            onChange={(e) => handleInputChange('solarInstallCost', parseFloat(e.target.value))} />
                                        <InputField label="Battery Cost (₱/kWh)" value={inputs.batteryCost} 
                                            onChange={(e) => handleInputChange('batteryCost', parseFloat(e.target.value))} />
                                        <InputField label="PCM Thermal Storage Cost (₱/kWh)" value={inputs.pcmCost} 
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
