import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    Thermometer, Sun, Wind, Layout, Printer, 
    Save, Plus, Trash2, Globe, DollarSign, 
    Activity, ArrowRight, Zap, Battery, CheckCircle, Database, AlertCircle, Search
} from 'lucide-react';
import { Card, Button, Input, Section } from '../data/constants.jsx';

// --- FIREBASE IMPORTS ---
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { getAuth } from "firebase/auth"; 

// --- CONSTANTS ---
const CLIMATE_DATA = {
    manila: { name: "Manila, Philippines", highC: 34, lowC: 21, country: 'PH' },
    baguio: { name: "Baguio, Philippines", highC: 24, lowC: 12, country: 'PH' },
    london: { name: "London, UK", highC: 30, lowC: -2, country: 'UK' },
    edinburgh: { name: "Edinburgh, UK", highC: 22, lowC: -5, country: 'UK' },
    vancouver: { name: "Vancouver, Canada", highC: 26, lowC: -5, country: 'CA' },
    toronto: { name: "Toronto, Canada", highC: 30, lowC: -15, country: 'CA' },
    mexicocity: { name: "Mexico City, Mexico", highC: 28, lowC: 5, country: 'MX' },
    hermosillo: { name: "Hermosillo, Mexico", highC: 42, lowC: 5, country: 'MX' },
};

const INSULATION_PRESETS = {
    poor:     { wall: 1.5, roof: 1.2, glass: 5.0, label: "Poor (Pre-1980s)" },
    average:  { wall: 0.6, roof: 0.4, glass: 2.8, label: "Average (1980s-2000s)" },
    good:     { wall: 0.3, roof: 0.2, glass: 1.8, label: "Good (Post-2010)" },
    newbuild: { wall: 0.18, roof: 0.12, glass: 1.1, label: "High Performance (New)" }
};

const CONFIG = {
    SAFETY_FACTOR: 1.15,
    INTERNAL_GAIN_W_M2: 35, 
    CEILING_HEIGHT: 3.0, 
    INSIDE_TEMP_C: 22,
    LITHIUM_EFFICIENCY: 0.90,
    DEFAULT_HEATING_COP: 3.8,
    DEFAULT_COOLING_EER: 3.5,
    DEFAULT_COST_LITHIUM_KWH: 115,
    DEFAULT_COST_SOLAR_WATT: 0.70
};

// HELPER: Extract kW from Product Name if DB field is missing
const extractKwFromName = (name) => {
    if (!name) return 0;
    // Looks for "12kW", "12.5 kW", "12-kW"
    const match = name.match(/(\d+(\.\d+)?)\s*k[Ww]/i);
    if (match) return parseFloat(match[1]);
    
    // Fallback: Look for "10HP" (Approx 2.8kW thermal per HP for rough sizing fallback)
    const hpMatch = name.match(/(\d+(\.\d+)?)\s*HP/i);
    if (hpMatch) return parseFloat(hpMatch[1]) * 2.8; 
    
    return 0;
};

const OfficeHVACCalculator = ({ user: propUser }) => {
    // --- STATE ---
    const [dbProducts, setDbProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [showDebug, setShowDebug] = useState(false);

    const [project, setProject] = useState({ name: 'New Office Project', location: 'manila' });
    const [units, setUnits] = useState('metric'); 
    const [building, setBuilding] = useState({
        insulation: 'good',
        glazingRatio: 40, 
        airChanges: 0.8, 
        highTemp: 34,
        lowTemp: 21
    });
    const [zones, setZones] = useState([{ id: 1, area: 100 }]); 
    const [financials, setFinancials] = useState({
        systemType: 'on-grid',
        heatPumpType: 'all', // 'all', 'r32', 'r290', 'co2'
        gridPeak: 0.22,
        gridOffPeak: 0.12,
        vat: 12,
        freight: 0,
        operatingHours: 10,
        batteryHours: 4,
        sunHours: 5.5
    });

    // --- EFFECT: FETCH PRODUCTS ---
    useEffect(() => {
        const auth = getAuth();
        const currentUser = propUser || auth.currentUser;

        if (!currentUser) {
            setLoadingProducts(false);
            return;
        }

        const unsub = onSnapshot(collection(db, "users", currentUser.uid, "products"), (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setDbProducts(list);
            setLoadingProducts(false);
        }, (error) => {
            console.error("Error fetching products:", error);
            setLoadingProducts(false);
        });

        return () => unsub();
    }, [propUser]);

    // --- EFFECT: Update Temps on Location Change ---
    useEffect(() => {
        const climate = CLIMATE_DATA[project.location];
        if (climate) {
            setBuilding(prev => ({
                ...prev,
                highTemp: climate.highC,
                lowTemp: climate.lowC
            }));
        }
    }, [project.location]);

    // --- HELPERS ---
    const toF = (c) => (c * 9/5) + 32;
    const toM2 = (sqft) => sqft / 10.764;
    const toSqFt = (m2) => m2 * 10.764;
    const toBtu = (kw) => kw * 3412;
    
    // --- CALCULATION ENGINE ---
    const results = useMemo(() => {
        // 1. Loads Calculation
        const { insulation, glazingRatio, airChanges, highTemp, lowTemp } = building;
        const u = INSULATION_PRESETS[insulation];
        const deltaHeat = Math.max(0, CONFIG.INSIDE_TEMP_C - lowTemp);
        const deltaCool = Math.max(0, highTemp - CONFIG.INSIDE_TEMP_C);

        let totalHeatingW = 0;
        let totalCoolingW = 0;
        let totalAreaM2 = 0;

        const zoneAnalysis = zones.map(z => {
            const area = z.area; 
            totalAreaM2 += area;
            const perimeter = Math.sqrt(area) * 4; 
            const wallAreaTotal = perimeter * CONFIG.CEILING_HEIGHT;
            const glassArea = wallAreaTotal * (glazingRatio / 100);
            const opaqueWallArea = wallAreaTotal - glassArea;
            const roofArea = area;
            const volume = area * CONFIG.CEILING_HEIGHT;

            const qTransHeat = (opaqueWallArea * u.wall + roofArea * u.roof + glassArea * u.glass) * deltaHeat;
            const qVentHeat = (volume * airChanges / 3600) * 1210 * deltaHeat;
            const heatLoad = qTransHeat + qVentHeat;

            const qTransCool = (opaqueWallArea * u.wall + roofArea * u.roof + glassArea * u.glass) * deltaCool;
            const qVentCool = (volume * airChanges / 3600) * 1210 * deltaCool;
            const qInternal = area * CONFIG.INTERNAL_GAIN_W_M2;
            const coolLoad = qTransCool + qVentCool + qInternal;

            return { ...z, heatLoadW: heatLoad, coolLoadW: coolLoad };
        });

        zoneAnalysis.forEach(z => {
            totalHeatingW += z.heatLoadW;
            totalCoolingW += z.coolLoadW;
        });

        const totalHeatKW = (totalHeatingW / 1000) * CONFIG.SAFETY_FACTOR;
        const totalCoolKW = (totalCoolingW / 1000) * CONFIG.SAFETY_FACTOR;
        
        const peakLoadKW = Math.max(totalHeatKW, totalCoolKW);
        const peakSeason = totalHeatKW > totalCoolKW ? 'Heating (Winter)' : 'Cooling (Summer)';

        // 2. DYNAMIC EQUIPMENT SELECTION (FROM DB)
        
        // Step A: Find relevant products (Loose matching)
        let candidateHPs = dbProducts.filter(p => {
            const str = ((p.category || '') + ' ' + (p.name || '')).toLowerCase();
            return str.includes('iheat') || str.includes('icool') || str.includes('heat pump') || str.includes('heatpump');
        });

        // Step B: Filter by Refrigerant Type if specified
        if (financials.heatPumpType !== 'all') {
            candidateHPs = candidateHPs.filter(p => {
                const ref = (p.Refrigerant || '').toLowerCase();
                const target = financials.heatPumpType.toLowerCase();
                
                // Special handling for CO2 which is often labeled R744
                if (target === 'co2') {
                    return ref.includes('co2') || ref.includes('r744');
                }
                
                return ref.includes(target);
            });
        }

        // Step C: Select Best Heat Pump Logic with Fallback Extraction
        let selectedPlant = { units: 0, model: null, cost: Infinity, capacity: 0 };
        let debugMatchCount = 0;
        let debugList = [];

        if (candidateHPs.length > 0) {
            candidateHPs.forEach(model => {
                // Determine capacity based on Season
                let capacity = 0;
                let source = "DB";
                
                if (peakSeason.includes('Heating')) {
                    capacity = parseFloat(model.kW_Heating_Nominal) || parseFloat(model.kW_DHW_Nominal) || 0;
                } else {
                    capacity = parseFloat(model.kW_Cooling_Nominal) || 0;
                }

                // Fallback: Parse from Name if DB fields are 0/missing
                if (capacity <= 0) {
                    capacity = extractKwFromName(model.name);
                    source = "Name Parse";
                }

                if (capacity <= 0) {
                    debugList.push({ name: model.name, status: 'Skipped (0 Capacity)', cap: 0 });
                    return;
                }
                
                debugMatchCount++;
                const price = parseFloat(model.salesPriceUSD) || 99999;
                
                // Sizing Logic
                const unitsNeeded = Math.ceil(peakLoadKW / capacity);
                const totalCost = unitsNeeded * price;
                
                debugList.push({ name: model.name, status: 'Valid Candidate', cap: capacity, src: source, cost: totalCost });

                if (totalCost < selectedPlant.cost) {
                    selectedPlant = {
                        units: unitsNeeded,
                        model: model,
                        cost: totalCost,
                        capacity: unitsNeeded * capacity
                    };
                }
            });
        } 
        
        if (selectedPlant.cost === Infinity) {
            selectedPlant.model = { name: "No Matching Products Found" };
            selectedPlant.cost = 0;
        }

        // 3. Off-Grid / Financials
        let batteryCost = 0;
        let solarCost = 0;
        let storageSpecs = null;

        let avgSolarPricePerWatt = CONFIG.DEFAULT_COST_SOLAR_WATT;
        let avgBatteryPricePerKWh = CONFIG.DEFAULT_COST_LITHIUM_KWH;

        // Try to find pricing from iVOLT products
        const solarProducts = dbProducts.filter(p => ((p.category||'').toLowerCase().includes('panel') || (p.name||'').toLowerCase().includes('panel')));
        const batteryProducts = dbProducts.filter(p => ((p.category||'').toLowerCase().includes('battery') || (p.name||'').toLowerCase().includes('battery')));

        if (solarProducts.length > 0) {
            const valid = solarProducts.filter(p => p.salesPriceUSD > 0 && p.pv_Watt_Rated > 0);
            if (valid.length > 0) {
                const totalPerWatt = valid.reduce((acc, p) => acc + (p.salesPriceUSD / p.pv_Watt_Rated), 0);
                avgSolarPricePerWatt = totalPerWatt / valid.length;
            }
        }

        if (batteryProducts.length > 0) {
            const valid = batteryProducts.filter(p => p.salesPriceUSD > 0 && p.bat_kWh_Nominal > 0);
            if (valid.length > 0) {
                const totalPerKWh = valid.reduce((acc, p) => acc + (p.salesPriceUSD / p.bat_kWh_Nominal), 0);
                avgBatteryPricePerKWh = totalPerKWh / valid.length;
            }
        }

        if (financials.systemType === 'off-grid') {
            const efficiency = peakSeason.includes('Heating') 
                ? (parseFloat(selectedPlant.model?.COP_DHW) || CONFIG.DEFAULT_HEATING_COP)
                : 3.0; 

            const peakElecLoad = peakLoadKW / efficiency;
            const batteryKWh = (peakElecLoad * financials.batteryHours) / CONFIG.LITHIUM_EFFICIENCY;
            const directEnergy = peakElecLoad * Math.max(0, financials.operatingHours - financials.batteryHours);
            const totalEnergy = directEnergy + batteryKWh;
            const solarKW = (totalEnergy / financials.sunHours) * 1.3; 

            batteryCost = batteryKWh * avgBatteryPricePerKWh;
            solarCost = solarKW * 1000 * avgSolarPricePerWatt;
            
            storageSpecs = { 
                batteryKWh, solarKW, solarRate: avgSolarPricePerWatt, batRate: avgBatteryPricePerKWh 
            };
        }

        const equipmentSubtotal = selectedPlant.cost + batteryCost + solarCost;
        const cif = equipmentSubtotal + financials.freight;
        const duties = cif * 0.05; 
        const vatBase = cif + duties + 450; 
        const vat = vatBase * (financials.vat / 100);
        const landedCost = vatBase + vat;

        return {
            zones: zoneAnalysis,
            totalAreaM2,
            loads: { heatKW: totalHeatKW, coolKW: totalCoolKW, peakKW: peakLoadKW, season: peakSeason },
            plant: selectedPlant,
            offgrid: { batteryCost, solarCost, specs: storageSpecs },
            financials: { equipmentSubtotal, landedCost, vat, duties },
            debug: { candidates: candidateHPs.length, validMatches: debugMatchCount, dbTotal: dbProducts.length, list: debugList }
        };

    }, [building, zones, financials, project.location, dbProducts]);

    // --- HANDLERS ---
    const handleZoneChange = (id, val) => {
        const area = parseFloat(val) || 0;
        const m2 = units === 'metric' ? area : toM2(area);
        setZones(prev => prev.map(z => z.id === id ? { ...z, area: m2 } : z));
    };

    const addZone = () => {
        setZones(prev => [...prev, { id: prev.length + 1, area: 100 }]);
    };

    const removeZone = (id) => {
        setZones(prev => prev.filter(z => z.id !== id));
    };

    const printRef = useRef();
    const handlePrint = () => {
        const content = printRef.current.innerHTML;
        const printWindow = window.open('', '', 'height=800,width=1000');
        printWindow.document.write('<html><head><title>Karnot Quote</title>');
        printWindow.document.write('<script src="https://cdn.tailwindcss.com"></script>');
        printWindow.document.write('</head><body class="p-10">');
        printWindow.document.write(content);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.onload = () => printWindow.print();
    };

    return (
        <Card className="max-w-7xl mx-auto shadow-2xl border-0 rounded-3xl overflow-hidden bg-gray-50">
            {/* HEADER */}
            <div className="bg-gradient-to-r from-blue-900 to-blue-700 p-8 text-white flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Thermometer className="text-blue-300" size={32} />
                        <h2 className="text-3xl font-black uppercase tracking-tighter">Office HVAC Estimator</h2>
                    </div>
                    <div className="flex items-center gap-2 text-blue-200 text-xs font-medium">
                        {loadingProducts ? (
                            <><span className="animate-spin">⏳</span> Connecting...</>
                        ) : (
                            <>
                                <Database size={12} className="text-green-400" /> DB: {results.debug.dbTotal} | 
                                Candidates: {results.debug.candidates} | 
                                Valid Cap: {results.debug.validMatches}
                            </>
                        )}
                    </div>
                </div>
                <div className="flex gap-2 bg-blue-800/50 p-1 rounded-lg">
                    <button 
                        onClick={() => setUnits('metric')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${units === 'metric' ? 'bg-white text-blue-900 shadow' : 'text-blue-300'}`}
                    >Metric (m², °C)</button>
                    <button 
                        onClick={() => setUnits('imperial')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${units === 'imperial' ? 'bg-white text-blue-900 shadow' : 'text-blue-300'}`}
                    >Imperial (ft², °F)</button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-8">
                
                {/* --- LEFT: INPUTS --- */}
                <div className="space-y-6">
                    
                    <Section title="1. Project & Climate">
                        <Input label="Project Name" value={project.name} onChange={(e) => setProject({...project, name: e.target.value})} />
                        
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Location</label>
                            <select 
                                className="w-full p-3 bg-white rounded-xl border-2 border-gray-100 font-bold text-gray-700"
                                value={project.location}
                                onChange={(e) => setProject({...project, location: e.target.value})}
                            >
                                {Object.entries(CLIMATE_DATA).map(([key, data]) => (
                                    <option key={key} value={key}>{data.name}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                                <label className="flex items-center gap-1 text-[10px] font-black text-red-600 uppercase mb-1">
                                    <Sun size={10}/> Summer High
                                </label>
                                <div className="text-lg font-black text-gray-800">
                                    {units === 'metric' ? building.highTemp : toF(building.highTemp).toFixed(1)}°
                                </div>
                            </div>
                            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                                <label className="flex items-center gap-1 text-[10px] font-black text-blue-600 uppercase mb-1">
                                    <Wind size={10}/> Winter Low
                                </label>
                                <div className="text-lg font-black text-gray-800">
                                    {units === 'metric' ? building.lowTemp : toF(building.lowTemp).toFixed(1)}°
                                </div>
                            </div>
                        </div>
                    </Section>

                    <Section title="2. Building Specs">
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Insulation Standard</label>
                            <select 
                                className="w-full p-3 bg-white rounded-xl border-2 border-gray-100 font-bold text-gray-700"
                                value={building.insulation}
                                onChange={(e) => setBuilding({...building, insulation: e.target.value})}
                            >
                                {Object.entries(INSULATION_PRESETS).map(([key, val]) => (
                                    <option key={key} value={key}>{val.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input 
                                label="Glazing %" 
                                type="number" 
                                value={building.glazingRatio} 
                                onChange={(e) => setBuilding({...building, glazingRatio: parseFloat(e.target.value)})}
                            />
                            <Input 
                                label="Air Changes (ACH)" 
                                type="number" 
                                value={building.airChanges} 
                                onChange={(e) => setBuilding({...building, airChanges: parseFloat(e.target.value)})}
                            />
                        </div>
                    </Section>

                    <Section title="3. Zones">
                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                            {zones.map((zone, idx) => (
                                <div key={zone.id} className="flex items-end gap-2 bg-white p-3 rounded-xl border border-gray-100">
                                    <div className="flex-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">
                                            Zone {idx + 1} Area ({units === 'metric' ? 'm²' : 'ft²'})
                                        </label>
                                        <input 
                                            type="number" 
                                            className="w-full font-bold text-gray-700 outline-none border-b border-gray-200 focus:border-blue-500"
                                            value={units === 'metric' ? zone.area : toSqFt(zone.area).toFixed(0)}
                                            onChange={(e) => handleZoneChange(zone.id, e.target.value)}
                                        />
                                    </div>
                                    {zones.length > 1 && (
                                        <button onClick={() => removeZone(zone.id)} className="text-red-400 hover:text-red-600 p-2">
                                            <Trash2 size={16}/>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <Button onClick={addZone} variant="secondary" className="w-full mt-4 py-2 text-xs">
                            <Plus size={14} className="mr-1"/> Add Another Zone
                        </Button>
                    </Section>

                    <Section title="4. System Config">
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Configuration</label>
                            <select 
                                className="w-full p-3 bg-white rounded-xl border-2 border-gray-100 font-bold text-gray-700 mb-4"
                                value={financials.systemType}
                                onChange={(e) => setFinancials({...financials, systemType: e.target.value})}
                            >
                                <option value="on-grid">On-Grid (Standard)</option>
                                <option value="off-grid">Off-Grid (Solar + Battery)</option>
                            </select>
                        </div>

                        <div className="mb-4">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Refrigerant / Tech</label>
                            <select 
                                className="w-full p-3 bg-white rounded-xl border-2 border-gray-100 font-bold text-gray-700"
                                value={financials.heatPumpType}
                                onChange={(e) => setFinancials({...financials, heatPumpType: e.target.value})}
                            >
                                <option value="all">Auto-Select Best Value</option>
                                <option value="r32">R32 (Standard)</option>
                                <option value="r290">R290 (Natural / High Temp)</option>
                                <option value="co2">CO2 (R744 / Industrial)</option>
                            </select>
                        </div>
                        
                        {financials.systemType === 'off-grid' && (
                            <div className="grid grid-cols-2 gap-4 bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                                <Input label="Operating Hrs" type="number" value={financials.operatingHours} onChange={(e) => setFinancials({...financials, operatingHours: e.target.value})} />
                                <Input label="Battery Hrs" type="number" value={financials.batteryHours} onChange={(e) => setFinancials({...financials, batteryHours: e.target.value})} />
                            </div>
                        )}
                    </Section>
                </div>

                {/* --- MIDDLE: TECHNICAL RESULTS --- */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm h-full">
                        <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight mb-6">Load Analysis</h3>
                        
                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className={`p-4 rounded-2xl border-2 ${results.loads.season.includes('Cooling') ? 'bg-blue-50 border-blue-500' : 'bg-gray-50 border-gray-100 opacity-70'}`}>
                                <div className="text-xs font-bold text-gray-500 uppercase mb-1">Summer Cooling Load</div>
                                <div className="text-2xl font-black text-gray-800">
                                    {units === 'metric' ? results.loads.coolKW.toFixed(1) + ' kW' : toBtu(results.loads.coolKW).toLocaleString(undefined, {maximumFractionDigits:0}) + ' BTU'}
                                </div>
                            </div>
                            <div className={`p-4 rounded-2xl border-2 ${results.loads.season.includes('Heating') ? 'bg-red-50 border-red-500' : 'bg-gray-50 border-gray-100 opacity-70'}`}>
                                <div className="text-xs font-bold text-gray-500 uppercase mb-1">Winter Heating Load</div>
                                <div className="text-2xl font-black text-gray-800">
                                    {units === 'metric' ? results.loads.heatKW.toFixed(1) + ' kW' : toBtu(results.loads.heatKW).toLocaleString(undefined, {maximumFractionDigits:0}) + ' BTU'}
                                </div>
                            </div>
                        </div>

                        <div className="mb-6">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Zone Breakdown</h4>
                            <div className="space-y-2">
                                {results.zones.map((z, i) => (
                                    <div key={i} className="flex justify-between text-xs border-b border-gray-50 pb-2">
                                        <span className="font-bold text-gray-700">Zone {z.id} ({units === 'metric' ? z.area.toFixed(0) : toSqFt(z.area).toFixed(0)} {units === 'metric' ? 'm²' : 'ft²'})</span>
                                        <span className="text-gray-500">
                                            {units === 'metric' ? (z.coolLoadW/1000).toFixed(1) : toBtu(z.coolLoadW/1000).toFixed(0)} / 
                                            {units === 'metric' ? (z.heatLoadW/1000).toFixed(1) : toBtu(z.heatLoadW/1000).toFixed(0)} 
                                            {units === 'metric' ? ' kW' : ' BTU'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-blue-900 text-white p-6 rounded-2xl">
                            <p className="text-blue-300 text-[10px] font-bold uppercase tracking-widest mb-2">Recommended Plant (From Inventory)</p>
                            <h4 className="text-xl font-bold mb-1">
                                {results.plant.units} x {results.plant.model?.name || "No Matching Product Found"}
                            </h4>
                            <div className="flex justify-between items-end mt-4">
                                <div className="text-xs text-blue-200">
                                    Sizing Basis: Peak {results.loads.season}<br/>
                                    Unit Cap: {results.plant.capacity / Math.max(1, results.plant.units)} kW
                                </div>
                                <Activity className="text-green-400" />
                            </div>
                        </div>

                        {financials.systemType === 'off-grid' && (
                            <div className="mt-4 bg-yellow-50 p-4 rounded-2xl border border-yellow-200">
                                <h5 className="text-xs font-black text-yellow-800 uppercase mb-2 flex items-center gap-2">
                                    <Zap size={14}/> Off-Grid Specs (iVOLT)
                                </h5>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="block text-[10px] text-yellow-600 uppercase">Solar Array</span>
                                        <span className="font-bold">{results.offgrid.specs.solarKW.toFixed(1)} kW</span>
                                        <span className="block text-[9px] text-yellow-500">@ ${results.offgrid.specs.solarRate.toFixed(2)}/W</span>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] text-yellow-600 uppercase">Battery Storage</span>
                                        <span className="font-bold">{results.offgrid.specs.batteryKWh.toFixed(1)} kWh</span>
                                        <span className="block text-[9px] text-yellow-500">@ ${results.offgrid.specs.batRate.toFixed(0)}/kWh</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Warning if falling back to defaults */}
                        {financials.systemType === 'off-grid' && results.offgrid.specs.solarRate === CONFIG.DEFAULT_COST_SOLAR_WATT && (
                            <div className="mt-2 flex items-center gap-2 text-[10px] text-orange-600">
                                <AlertCircle size={10} /> Using default solar/battery pricing (No iVOLT products found).
                            </div>
                        )}

                        {/* DEBUG TOGGLE */}
                        <div className="mt-4 border-t pt-2">
                            <button 
                                onClick={() => setShowDebug(!showDebug)} 
                                className="text-[10px] text-gray-400 underline hover:text-blue-500"
                            >
                                {showDebug ? "Hide Candidate Analysis" : "Show Candidate Analysis"}
                            </button>
                            {showDebug && (
                                <div className="mt-2 h-40 overflow-y-auto bg-gray-50 border p-2 text-[9px] font-mono">
                                    <table className="w-full text-left">
                                        <thead><tr><th>Product</th><th>Cap</th><th>Src</th><th>Status</th></tr></thead>
                                        <tbody>
                                            {results.debug.list.map((item, i) => (
                                                <tr key={i} className={item.cap > 0 ? "text-green-700" : "text-red-400"}>
                                                    <td>{item.name.substring(0,20)}...</td>
                                                    <td>{item.cap.toFixed(1)}kW</td>
                                                    <td>{item.src}</td>
                                                    <td>{item.status}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- RIGHT: QUOTE GENERATION --- */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm h-full flex flex-col">
                        <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight mb-6 flex items-center gap-2">
                            <DollarSign size={20} className="text-green-600"/> Estimate
                        </h3>

                        <div className="space-y-3 flex-1">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Equipment Subtotal</span>
                                <span className="font-bold">${results.financials.equipmentSubtotal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Freight & Logistics</span>
                                <span className="font-bold">${financials.freight.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Duties & Import Fees</span>
                                <span className="font-bold">${results.financials.duties.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm border-b border-gray-100 pb-3">
                                <span className="text-gray-500">VAT ({financials.vat}%)</span>
                                <span className="font-bold">${results.financials.vat.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-lg pt-2 text-blue-900">
                                <span className="font-black uppercase">Landed Cost</span>
                                <span className="font-black">${results.financials.landedCost.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-100">
                             <div className="grid grid-cols-2 gap-2">
                                <Input label="Freight ($)" type="number" value={financials.freight} onChange={(e) => setFinancials({...financials, freight: parseFloat(e.target.value)})} />
                                <Input label="VAT (%)" type="number" value={financials.vat} onChange={(e) => setFinancials({...financials, vat: parseFloat(e.target.value)})} />
                            </div>
                            <Button onClick={handlePrint} variant="primary" className="w-full mt-4 flex items-center justify-center gap-2">
                                <Printer size={16}/> Generate Quote PDF
                            </Button>
                        </div>
                    </div>
                </div>

            </div>

            {/* --- HIDDEN PRINT TEMPLATE --- */}
            <div className="hidden">
                <div ref={printRef} className="max-w-[800px] mx-auto bg-white p-10 font-sans text-gray-900">
                    {/* Header */}
                    <div className="flex justify-between items-end border-b-4 border-orange-500 pb-6 mb-8">
                        <div>
                            <h1 className="text-4xl font-black text-gray-800 tracking-tighter">KARNOT</h1>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Energy as a Service</p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-xl font-bold text-gray-700">HVAC EQUIPMENT QUOTE</h2>
                            <p className="text-sm text-gray-500">Date: {new Date().toLocaleDateString()}</p>
                        </div>
                    </div>

                    {/* Project Info */}
                    <div className="grid grid-cols-2 gap-8 mb-10 bg-gray-50 p-6 rounded-lg">
                        <div>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Project</h3>
                            <p className="font-bold text-lg">{project.name}</p>
                            <p className="text-sm text-gray-600">{CLIMATE_DATA[project.location].name}</p>
                        </div>
                        <div className="text-right">
                             <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">System Type</h3>
                            <p className="font-bold text-lg">{financials.systemType === 'off-grid' ? 'Off-Grid (Solar + Battery)' : 'On-Grid Standard'}</p>
                            <p className="text-sm text-gray-600">Reversible Heat Pump</p>
                        </div>
                    </div>

                    {/* Technical Spec */}
                    <div className="mb-10">
                        <h3 className="text-lg font-bold text-blue-900 border-b border-gray-200 pb-2 mb-4">1. Technical Specification</h3>
                        <div className="grid grid-cols-2 gap-8 mb-6">
                            <div>
                                <p className="text-sm text-gray-500">Design Condition (Summer)</p>
                                <p className="font-bold">{building.highTemp}°C / {toF(building.highTemp).toFixed(1)}°F</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Design Condition (Winter)</p>
                                <p className="font-bold">{building.lowTemp}°C / {toF(building.lowTemp).toFixed(1)}°F</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Total Peak Load ({results.loads.season})</p>
                                <p className="font-bold text-blue-600">{results.loads.peakKW.toFixed(1)} kW</p>
                            </div>
                             <div>
                                <p className="text-sm text-gray-500">Conditioned Area</p>
                                <p className="font-bold">{results.totalAreaM2.toFixed(0)} m²</p>
                            </div>
                        </div>
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-gray-100 text-gray-600">
                                <tr><th className="p-2">Zone</th><th className="p-2">Area</th><th className="p-2">Heating Load</th><th className="p-2">Cooling Load</th></tr>
                            </thead>
                            <tbody>
                                {results.zones.map(z => (
                                    <tr key={z.id} className="border-b border-gray-100">
                                        <td className="p-2">Zone {z.id}</td>
                                        <td className="p-2">{z.area.toFixed(0)} m²</td>
                                        <td className="p-2">{(z.heatLoadW/1000).toFixed(1)} kW</td>
                                        <td className="p-2">{(z.coolLoadW/1000).toFixed(1)} kW</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Commercial */}
                    <div className="mb-10">
                        <h3 className="text-lg font-bold text-blue-900 border-b border-gray-200 pb-2 mb-4">2. Commercial Proposal</h3>
                        <table className="w-full text-sm">
                            <tbody>
                                <tr className="border-b border-gray-100">
                                    <td className="py-3 font-bold">Heat Pump Plant: {results.plant.units} x {results.plant.model?.name}</td>
                                    <td className="py-3 text-right font-bold">${results.plant.cost.toLocaleString()}</td>
                                </tr>
                                {financials.systemType === 'off-grid' && (
                                    <>
                                     <tr className="border-b border-gray-100">
                                        <td className="py-3">Lithium Storage ({results.offgrid.specs.batteryKWh.toFixed(1)} kWh)</td>
                                        <td className="py-3 text-right">${results.offgrid.batteryCost.toLocaleString()}</td>
                                    </tr>
                                    <tr className="border-b border-gray-100">
                                        <td className="py-3">Solar Array ({results.offgrid.specs.solarKW.toFixed(1)} kW)</td>
                                        <td className="py-3 text-right">${results.offgrid.solarCost.toLocaleString()}</td>
                                    </tr>
                                    </>
                                )}
                                <tr>
                                    <td className="py-2 text-gray-500 pt-4">Freight & Logistics</td>
                                    <td className="py-2 text-right text-gray-500 pt-4">${financials.freight.toLocaleString()}</td>
                                </tr>
                                <tr>
                                    <td className="py-2 text-gray-500">Duties & Import Fees</td>
                                    <td className="py-2 text-right text-gray-500">${results.financials.duties.toLocaleString()}</td>
                                </tr>
                                <tr>
                                    <td className="py-2 text-gray-500">VAT ({financials.vat}%)</td>
                                    <td className="py-2 text-right text-gray-500">${results.financials.vat.toLocaleString()}</td>
                                </tr>
                                <tr className="text-xl text-blue-900 border-t-2 border-black">
                                    <td className="py-4 font-black">TOTAL LANDED COST</td>
                                    <td className="py-4 text-right font-black">${results.financials.landedCost.toLocaleString()}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Footer */}
                    <div className="text-xs text-gray-400 mt-10 text-center">
                        <p>This is a budgetary estimate generated by Karnot CRM. Prices valid for 30 days.</p>
                    </div>
                </div>
            </div>
        </Card>
    );
};

export default OfficeHVACCalculator;
