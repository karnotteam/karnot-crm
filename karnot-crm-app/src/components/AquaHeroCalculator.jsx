import React, { useState, useEffect, useMemo } from 'react';
import { 
    Zap, Flame, Droplets, Globe, DollarSign, 
    ArrowRight, Activity, TrendingUp, AlertTriangle, 
    CheckCircle, BatteryCharging, Sun, Leaf, Trash2
} from 'lucide-react';
import { Card, Button, Input, Section } from '../data/constants.jsx';

const REGIONAL_DEFAULTS = {
    UK: {
        currency: '£',
        currencyCode: 'GBP',
        gridPeak: 0.28,    // Standard/Peak
        gridOffPeak: 0.12, // Octopus Cosy/Go (Visible now!)
        gasPrice: 0.06,    // 6p per kWh
        gasStandingCharge: 128, // £ per year
        upgradeCost: 0,    
        avgGroundWater: 10, 
        targetTemp: 60,
        volumeUnit: 'Liters',
        co2Grid: 0.21,     
        co2Gas: 0.21       
    },
    PH: {
        currency: '₱',
        currencyCode: 'PHP',
        gridPeak: 14.00,
        gridOffPeak: 14.00, 
        gasPrice: 6.50,     
        gasStandingCharge: 0, 
        upgradeCost: 0,     
        avgGroundWater: 26,
        targetTemp: 60,
        volumeUnit: 'Liters',
        co2Grid: 0.70,     
        co2Gas: 0.23
    },
    CA: {
        currency: '$',
        currencyCode: 'CAD',
        gridPeak: 0.14,
        gridOffPeak: 0.14, 
        gasPrice: 0.05,    
        gasStandingCharge: 150, 
        upgradeCost: 1500, 
        avgGroundWater: 8,
        targetTemp: 60,
        volumeUnit: 'Gallons',
        co2Grid: 0.03,     
        co2Gas: 0.18
    },
    MX: {
        currency: '$',
        currencyCode: 'MXN',
        gridPeak: 5.50,    
        gridOffPeak: 1.00, 
        gasPrice: 2.00,    
        gasStandingCharge: 0, 
        upgradeCost: 6000, 
        avgGroundWater: 18,
        targetTemp: 60,
        volumeUnit: 'Gallons',
        co2Grid: 0.45,
        co2Gas: 0.20
    }
};

const COMPETITORS = {
    electric: { name: 'Standard Electric (Rheem/A.O. Smith)', efficiency: 0.95, type: 'electric' },
    gas: { name: 'Natural Gas / LPG (Standard)', efficiency: 0.65, type: 'gas' },
    gasHigh: { name: 'Gas Condensing / Tankless', efficiency: 0.90, type: 'gas' },
    hybrid: { name: 'Hybrid Heat Pump (Generic)', efficiency: 3.0, type: 'electric_hybrid' } 
};

const AquaHeroCalculator = ({ onBack }) => {
    // --- STATE ---
    const [region, setRegion] = useState('UK');
    const [inputs, setInputs] = useState({
        people: 4,
        dailyVolume: 200, 
        competitorType: 'gas',
        smartStrategy: true, 
        solarAssist: false, 
        removeGasMeter: false, 
        needsElectricalUpgrade: false,
        karnotUnitCost: 2500, 
        competitorUnitCost: 1200 
    });
    
    // Load defaults on region change
    const [financials, setFinancials] = useState(REGIONAL_DEFAULTS['UK']);

    useEffect(() => {
        const defaults = REGIONAL_DEFAULTS[region];
        setFinancials(prev => ({ ...defaults }));
        setInputs(prev => ({
            ...prev,
            needsElectricalUpgrade: (region === 'CA' || region === 'MX'),
            dailyVolume: region === 'UK' || region === 'PH' ? 200 : 60,
            removeGasMeter: false,
            solarAssist: false
        }));
    }, [region]);

    const handleInput = (field, value) => {
        setInputs(prev => ({ ...prev, [field]: value }));
    };

    const handleFinancial = (field, value) => {
        setFinancials(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
    };

    // --- CALCULATIONS ---
    const results = useMemo(() => {
        const { currency } = financials;
        
        // 1. Energy Demand
        let volumeLiters = inputs.dailyVolume;
        if (region === 'CA' || region === 'MX') {
            volumeLiters = inputs.dailyVolume * 3.785; 
        }

        const deltaT = financials.targetTemp - financials.avgGroundWater;
        const dailyEnergyKWh = volumeLiters * deltaT * 0.001163;
        const annualEnergyKWh = dailyEnergyKWh * 365;

        // 2. Competitor Costs & CO2
        const compSpecs = COMPETITORS[inputs.competitorType];
        let compAnnualCost = 0;
        let compAnnualCO2 = 0; 

        if (compSpecs.type === 'gas') {
            const gasKWh = annualEnergyKWh / compSpecs.efficiency;
            compAnnualCost = gasKWh * financials.gasPrice;
            compAnnualCO2 = gasKWh * financials.co2Gas;
            
            if (financials.gasStandingCharge > 0) {
                compAnnualCost += financials.gasStandingCharge; 
            }
        } else {
            const eleKWh = annualEnergyKWh / compSpecs.efficiency;
            compAnnualCost = eleKWh * financials.gridPeak; // Competitor pays peak
            compAnnualCO2 = eleKWh * financials.co2Grid;
        }

        // 3. Karnot AquaHERO Costs & CO2
        const karnotCOP = 3.2; 
        const karnotTotalKWh = annualEnergyKWh / karnotCOP;
        
        // --- SOLAR & STRATEGY LOGIC ---
        let chargeableKWh = karnotTotalKWh;
        let solarSavingsKWh = 0;

        if (inputs.solarAssist) {
            const solarFraction = 0.30; // 30% Free
            solarSavingsKWh = karnotTotalKWh * solarFraction;
            chargeableKWh = karnotTotalKWh - solarSavingsKWh;
        }

        // EFFECTIVE RATE CALCULATION (Crucial fix for your Smart Strategy)
        const effectiveRate = inputs.smartStrategy 
            ? (financials.gridOffPeak * 0.9) + (financials.gridPeak * 0.1) // 90% Off-Peak
            : financials.gridPeak;

        let karnotAnnualCost = chargeableKWh * effectiveRate;
        
        // Add standing charge if applicable (if they keep gas meter)
        if (compSpecs.type === 'gas' && !inputs.removeGasMeter && financials.gasStandingCharge > 0) {
            karnotAnnualCost += financials.gasStandingCharge;
        }

        const karnotAnnualCO2 = chargeableKWh * financials.co2Grid;

        // 4. ROI Logic
        const annualSavings = compAnnualCost - karnotAnnualCost;
        const electricalAdder = inputs.needsElectricalUpgrade ? financials.upgradeCost : 0;
        const totalKarnotCapex = parseFloat(inputs.karnotUnitCost) + electricalAdder;
        const netCapexDelta = totalKarnotCapex - parseFloat(inputs.competitorUnitCost);
        const paybackYears = annualSavings > 0 ? netCapexDelta / annualSavings : 0;
        const fiveYearSavings = (annualSavings * 5) - netCapexDelta;
        const co2SavedTons = (compAnnualCO2 - karnotAnnualCO2) / 1000;

        return {
            compAnnualCost,
            karnotAnnualCost,
            annualSavings,
            paybackYears,
            netCapexDelta,
            fiveYearSavings,
            co2SavedTons,
            solarSavingsKWh
        };
    }, [inputs, financials, region]);

    return (
        <Card className="max-w-6xl mx-auto shadow-2xl border-0 rounded-3xl overflow-hidden">
            {/* HEADER */}
            <div className="bg-gradient-to-r from-blue-900 to-blue-700 p-8 text-white relative">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Droplets className="text-blue-300" size={32} />
                            <h2 className="text-3xl font-black uppercase tracking-tighter">Karnot AquaHERO</h2>
                        </div>
                        <p className="text-blue-200 font-medium">Global Water Heating & Emissions Calculator</p>
                    </div>
                    <div className="flex gap-2">
                        {Object.keys(REGIONAL_DEFAULTS).map(r => (
                            <button
                                key={r}
                                onClick={() => setRegion(r)}
                                className={`px-4 py-2 rounded-xl font-black text-xs transition-all ${
                                    region === r 
                                    ? 'bg-white text-blue-900 shadow-lg scale-105' 
                                    : 'bg-blue-800/50 text-blue-300 hover:bg-blue-800'
                                }`}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-8 mt-6">
                
                {/* COL 1: INPUTS */}
                <div className="space-y-8">
                    <Section title="1. Strategy & Setup">
                        <div className="space-y-4">
                            {/* SMART STRATEGY TOGGLE */}
                            <div className={`p-4 rounded-xl border transition-all ${inputs.smartStrategy ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <BatteryCharging size={20} className={inputs.smartStrategy ? 'text-green-600' : 'text-gray-400'}/>
                                        <span className={`text-xs font-black uppercase ${inputs.smartStrategy ? 'text-green-700' : 'text-gray-500'}`}>Smart Storage</span>
                                    </div>
                                    <input type="checkbox" checked={inputs.smartStrategy} onChange={(e) => handleInput('smartStrategy', e.target.checked)} className="w-5 h-5 accent-green-600"/>
                                </div>
                                <p className="text-[10px] text-gray-500">Prioritize off-peak grid charging (Thermal Battery logic).</p>
                            </div>

                            {/* SOLAR TOGGLE */}
                            <div className={`p-4 rounded-xl border transition-all ${inputs.solarAssist ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Sun size={20} className={inputs.solarAssist ? 'text-yellow-600' : 'text-gray-400'}/>
                                        <span className={`text-xs font-black uppercase ${inputs.solarAssist ? 'text-yellow-700' : 'text-gray-500'}`}>Solar Assist</span>
                                    </div>
                                    <input type="checkbox" checked={inputs.solarAssist} onChange={(e) => handleInput('solarAssist', e.target.checked)} className="w-5 h-5 accent-yellow-500"/>
                                </div>
                                <p className="text-[10px] text-gray-500">2 hours of free solar boost during daytime.</p>
                            </div>

                             {/* GAS REMOVAL TOGGLE */}
                             {COMPETITORS[inputs.competitorType].type === 'gas' && financials.gasStandingCharge > 0 && (
                                <div className={`p-4 rounded-xl border transition-all ${inputs.removeGasMeter ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <Trash2 size={20} className={inputs.removeGasMeter ? 'text-red-500' : 'text-gray-400'}/>
                                            <span className={`text-xs font-black uppercase ${inputs.removeGasMeter ? 'text-red-600' : 'text-gray-500'}`}>Remove Gas Meter</span>
                                        </div>
                                        <input type="checkbox" checked={inputs.removeGasMeter} onChange={(e) => handleInput('removeGasMeter', e.target.checked)} className="w-5 h-5 accent-red-500"/>
                                    </div>
                                    <p className="text-[10px] text-gray-500">Save {financials.currency}{financials.gasStandingCharge} yearly standing charge.</p>
                                </div>
                            )}
                        </div>
                    </Section>

                    <Section title="2. Usage & Rates">
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Comparison</label>
                                <select 
                                    className="w-full p-3 bg-gray-50 rounded-xl border-2 border-gray-100 font-bold text-gray-700 outline-none focus:border-blue-500"
                                    value={inputs.competitorType}
                                    onChange={(e) => handleInput('competitorType', e.target.value)}
                                >
                                    {Object.entries(COMPETITORS).map(([key, val]) => (
                                        <option key={key} value={key}>{val.name}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <Input 
                                label={`Daily Usage (${financials.volumeUnit})`} 
                                type="number" 
                                value={inputs.dailyVolume} 
                                onChange={(e) => handleInput('dailyVolume', parseFloat(e.target.value))} 
                            />

                            {/* GRID PRICES - NOW WITH OFF-PEAK */}
                            <div className="grid grid-cols-2 gap-4">
                                <Input 
                                    label={`Std Rate (${financials.currency}/kWh)`} 
                                    type="number" 
                                    step="0.01"
                                    value={financials.gridPeak} 
                                    onChange={(e) => handleFinancial('gridPeak', e.target.value)} 
                                />
                                <Input 
                                    label={`Off-Peak (${financials.currency}/kWh)`} 
                                    type="number" 
                                    step="0.01"
                                    value={financials.gridOffPeak} 
                                    onChange={(e) => handleFinancial('gridOffPeak', e.target.value)} 
                                    className={inputs.smartStrategy ? "border-green-400 bg-green-50" : ""}
                                />
                            </div>
                            {inputs.smartStrategy && (
                                <p className="text-[10px] text-green-600 font-bold text-right -mt-2">
                                    Targeting Off-Peak Rate for 90% of load
                                </p>
                            )}
                        </div>
                    </Section>
                </div>

                {/* COL 2: RESULTS VISUALIZATION */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gray-900 text-white p-6 rounded-3xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <DollarSign size={100} />
                            </div>
                            <p className="text-gray-400 text-xs font-black uppercase tracking-widest mb-1">Annual Savings</p>
                            <h3 className="text-4xl font-black text-green-400">
                                {financials.currency} {results.annualSavings.toLocaleString(undefined, {maximumFractionDigits:0})}
                            </h3>
                            <p className="text-xs text-gray-400 mt-2">vs {COMPETITORS[inputs.competitorType].name}</p>
                        </div>

                        <div className="bg-green-600 text-white p-6 rounded-3xl relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Leaf size={100} />
                            </div>
                            <p className="text-green-200 text-xs font-black uppercase tracking-widest mb-1">CO2 Reduction</p>
                            <h3 className="text-4xl font-black text-white">
                                {results.co2SavedTons.toFixed(2)} t
                            </h3>
                            <p className="text-xs text-green-100 mt-2">Tons per year</p>
                        </div>

                        <div className="bg-white border-2 border-gray-100 p-6 rounded-3xl">
                            <p className="text-gray-400 text-xs font-black uppercase tracking-widest mb-1">Payback Period</p>
                            <h3 className={`text-4xl font-black ${results.paybackYears < 3 ? 'text-green-600' : 'text-orange-500'}`}>
                                {results.paybackYears < 0 ? 'Immediate' : `${results.paybackYears.toFixed(1)} Yrs`}
                            </h3>
                            <p className="text-xs text-gray-400 mt-2">Based on {financials.currency}{results.netCapexDelta.toLocaleString()} net difference</p>
                        </div>
                    </div>

                    {/* COMPARISON CHART */}
                    <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                        <h4 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-6">Annual Operating Cost Comparison</h4>
                        
                        {/* Competitor Bar */}
                        <div className="mb-6">
                            <div className="flex justify-between text-xs font-bold text-gray-500 mb-2">
                                <span>{COMPETITORS[inputs.competitorType].name}</span>
                                <span>{financials.currency} {results.compAnnualCost.toFixed(0)} / yr</span>
                            </div>
                            <div className="h-12 w-full bg-gray-100 rounded-xl overflow-hidden relative">
                                <div className="h-full bg-gray-400 w-full flex items-center px-4 text-white font-bold opacity-80">
                                    Baseline Cost
                                </div>
                            </div>
                        </div>

                        {/* Karnot Bar */}
                        <div>
                            <div className="flex justify-between text-xs font-bold text-gray-500 mb-2">
                                <div className="flex gap-2">
                                    <span>Karnot AquaHERO</span>
                                    {inputs.solarAssist && <span className="text-yellow-600 flex items-center gap-1 text-[10px]"><Sun size={10}/> Solar Boost</span>}
                                    {inputs.removeGasMeter && <span className="text-red-600 flex items-center gap-1 text-[10px]"><Trash2 size={10}/> No Meter</span>}
                                </div>
                                <span className="text-blue-600">{financials.currency} {results.karnotAnnualCost.toFixed(0)} / yr</span>
                            </div>
                            <div className="h-12 w-full bg-gray-100 rounded-xl overflow-hidden relative">
                                <div 
                                    className="h-full bg-gradient-to-r from-blue-500 to-green-400 flex items-center px-4 text-white font-bold transition-all duration-1000"
                                    style={{ width: `${Math.min((results.karnotAnnualCost / results.compAnnualCost) * 100, 100)}%` }}
                                >
                                    {((results.karnotAnnualCost / results.compAnnualCost) * 100).toFixed(0)}%
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* CAPEX ADJUSTMENT */}
                    <div className="bg-gray-50 p-6 rounded-3xl border border-gray-200">
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Project Capex Assumptions</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <Input 
                                label="Karnot Unit Price" 
                                type="number" 
                                value={inputs.karnotUnitCost} 
                                onChange={(e) => handleInput('karnotUnitCost', e.target.value)} 
                            />
                            <Input 
                                label="Competitor Replacement Cost" 
                                type="number" 
                                value={inputs.competitorUnitCost} 
                                onChange={(e) => handleInput('competitorUnitCost', e.target.value)} 
                            />
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
};

export default AquaHeroCalculator;
