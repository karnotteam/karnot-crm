import React, { useState, useEffect, useMemo } from 'react';
import { 
    Zap, Flame, Droplets, Globe, DollarSign, 
    ArrowRight, Activity, TrendingUp, AlertTriangle, 
    CheckCircle, BatteryCharging 
} from 'lucide-react';
import { Card, Button, Input, Section } from '../data/constants.jsx';

const REGIONAL_DEFAULTS = {
    UK: {
        currency: '£',
        currencyCode: 'GBP',
        gridPeak: 0.29,    // Standard/Peak
        gridOffPeak: 0.12, // Octopus Cosy/Go
        gasPrice: 0.07,    // per kWh
        upgradeCost: 0,    // Usually 240V standard
        avgGroundWater: 10, // Celsius
        targetTemp: 60,
        volumeUnit: 'Liters'
    },
    PH: {
        currency: '₱',
        currencyCode: 'PHP',
        gridPeak: 14.00,
        gridOffPeak: 14.00, // Flat rate usually, unless industrial
        gasPrice: 6.50,     // LPG equiv per kWh
        upgradeCost: 0,     // 220V standard
        avgGroundWater: 26,
        targetTemp: 60,
        volumeUnit: 'Liters'
    },
    CA: {
        currency: '$',
        currencyCode: 'CAD',
        gridPeak: 0.14,
        gridOffPeak: 0.14, // BC/QC Hydro often flat or tiered
        gasPrice: 0.05,    // Cheap natural gas
        upgradeCost: 1500, // Panel/Wiring upgrade 120->240V
        avgGroundWater: 8,
        targetTemp: 60,
        volumeUnit: 'Gallons'
    },
    MX: {
        currency: '$',
        currencyCode: 'MXN',
        gridPeak: 5.50,    // DAC Rate (High consumption)
        gridOffPeak: 1.00, // Subsidized (Low consumption)
        gasPrice: 2.00,    // Natural gas/LPG mix
        upgradeCost: 6000, // Wiring upgrade
        avgGroundWater: 18,
        targetTemp: 60,
        volumeUnit: 'Gallons'
    }
};

const COMPETITORS = {
    electric: { name: 'Standard Electric (Rheem/A.O. Smith)', efficiency: 0.95, type: 'electric' },
    gas: { name: 'Natural Gas / LPG (Standard)', efficiency: 0.65, type: 'gas' },
    gasHigh: { name: 'Gas Condensing / Tankless', efficiency: 0.90, type: 'gas' },
    hybrid: { name: 'Hybrid Heat Pump (Generic)', efficiency: 3.0, type: 'electric_hybrid' } // Often fails to run purely off-peak
};

const AquaHeroCalculator = ({ onBack }) => {
    // --- STATE ---
    const [region, setRegion] = useState('UK');
    const [inputs, setInputs] = useState({
        people: 4,
        dailyVolume: 200, // Liters default
        competitorType: 'gas',
        smartStrategy: true, // "The Karnot Strategy"
        needsElectricalUpgrade: false,
        karnotUnitCost: 2500, // Hardware cost
        competitorUnitCost: 1200 // Replacement cost of competitor
    });
    
    // Load defaults on region change
    const [financials, setFinancials] = useState(REGIONAL_DEFAULTS['UK']);

    useEffect(() => {
        const defaults = REGIONAL_DEFAULTS[region];
        setFinancials(prev => ({ ...defaults }));
        // Auto-set upgrade need for NA
        setInputs(prev => ({
            ...prev,
            needsElectricalUpgrade: (region === 'CA' || region === 'MX'),
            dailyVolume: region === 'UK' || region === 'PH' ? 200 : 60 // 200L vs 60 Gal
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
        
        // 1. Energy Demand Calculation
        // Q = m * c * deltaT
        // Water specific heat = 4.186 kJ/kg°C = 0.001163 kWh/kg°C
        
        let volumeLiters = inputs.dailyVolume;
        if (region === 'CA' || region === 'MX') {
            volumeLiters = inputs.dailyVolume * 3.785; // Gallons to Liters
        }

        const deltaT = financials.targetTemp - financials.avgGroundWater;
        const dailyEnergyKWh = volumeLiters * deltaT * 0.001163;
        const annualEnergyKWh = dailyEnergyKWh * 365;

        // 2. Competitor Running Costs
        const compSpecs = COMPETITORS[inputs.competitorType];
        let compAnnualCost = 0;

        if (compSpecs.type === 'gas') {
            // Gas Price / Efficiency
            compAnnualCost = (annualEnergyKWh / compSpecs.efficiency) * financials.gasPrice;
        } else {
            // Electric Price (Usually Peak/Standard for on-demand)
            // Hybrids often run element during high demand, lowering effective COP
            const effectiveCOP = compSpecs.efficiency;
            compAnnualCost = (annualEnergyKWh / effectiveCOP) * financials.gridPeak;
        }

        // 3. Karnot AquaHERO Costs
        // Karnot R290 High Temp COP Assumption (Conservative annual avg)
        const karnotCOP = 3.2; 
        
        // THE STRATEGY:
        // If SmartStrategy is ON, we assume 90% of charging happens at Off-Peak rates (Storage logic)
        // If OFF, we assume standard mix (mostly peak usage)
        const effectiveRate = inputs.smartStrategy 
            ? (financials.gridOffPeak * 0.9) + (financials.gridPeak * 0.1) 
            : financials.gridPeak;

        const karnotAnnualCost = (annualEnergyKWh / karnotCOP) * effectiveRate;

        // 4. ROI Logic
        const annualSavings = compAnnualCost - karnotAnnualCost;
        
        // Upgrade Costs (CAPEX)
        const electricalAdder = inputs.needsElectricalUpgrade ? financials.upgradeCost : 0;
        const totalKarnotCapex = parseFloat(inputs.karnotUnitCost) + electricalAdder;
        const netCapexDelta = totalKarnotCapex - parseFloat(inputs.competitorUnitCost);
        
        const paybackYears = annualSavings > 0 ? netCapexDelta / annualSavings : 0;
        const fiveYearSavings = (annualSavings * 5) - netCapexDelta;

        return {
            dailyEnergyKWh,
            annualEnergyKWh,
            compAnnualCost,
            karnotAnnualCost,
            annualSavings,
            paybackYears,
            netCapexDelta,
            totalKarnotCapex,
            fiveYearSavings
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
                        <p className="text-blue-200 font-medium">Global Water Heating ROI & Grid Arbitrage Calculator</p>
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
                
                {/* STRATEGY TOGGLE OVERLAY */}
                <div className="absolute -bottom-8 right-8 bg-white p-2 rounded-2xl shadow-xl border border-blue-100 flex items-center gap-4 pr-6">
                    <div className={`p-3 rounded-xl ${inputs.smartStrategy ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        <BatteryCharging size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-gray-400">Karnot Strategy</p>
                        <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${inputs.smartStrategy ? 'text-green-600' : 'text-gray-500'}`}>
                                {inputs.smartStrategy ? 'Smart Storage Active' : 'Standard Demand'}
                            </span>
                            <div 
                                className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${inputs.smartStrategy ? 'bg-green-500' : 'bg-gray-300'}`}
                                onClick={() => handleInput('smartStrategy', !inputs.smartStrategy)}
                            >
                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${inputs.smartStrategy ? 'left-6' : 'left-1'}`} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-8 mt-6">
                
                {/* COL 1: INPUTS */}
                <div className="space-y-8">
                    <Section title="1. Usage Profile">
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Current System</label>
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

                            {(region === 'CA' || region === 'MX') && (
                                <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle size={16} className="text-orange-500"/>
                                            <span className="text-xs font-black text-orange-700 uppercase">120V Infrastructure</span>
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            checked={inputs.needsElectricalUpgrade}
                                            onChange={(e) => handleInput('needsElectricalUpgrade', e.target.checked)}
                                            className="w-5 h-5 accent-orange-500"
                                        />
                                    </div>
                                    <p className="text-[10px] text-orange-600 mb-2">Requires 240V panel/wiring upgrade?</p>
                                    {inputs.needsElectricalUpgrade && (
                                        <Input 
                                            label={`Upgrade Cost (${financials.currencyCode})`}
                                            type="number"
                                            value={financials.upgradeCost}
                                            onChange={(e) => handleFinancial('upgradeCost', e.target.value)}
                                            className="bg-white"
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    </Section>

                    <Section title="2. Grid & Energy Rates">
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <Input 
                                    label={`Peak Grid (${financials.currency})`} 
                                    type="number" 
                                    step="0.01"
                                    value={financials.gridPeak} 
                                    onChange={(e) => handleFinancial('gridPeak', e.target.value)} 
                                />
                                <Input 
                                    label={`Off-Peak (${financials.currency})`} 
                                    type="number" 
                                    step="0.01"
                                    value={financials.gridOffPeak} 
                                    onChange={(e) => handleFinancial('gridOffPeak', e.target.value)} 
                                />
                            </div>
                            <div className="p-3 bg-blue-50 rounded-xl text-xs text-blue-800">
                                <strong>Strategy Note:</strong> With "Smart Storage" active, AquaHERO targets the {financials.currency}{financials.gridOffPeak} rate by overheating water during off-peak windows.
                            </div>
                            <Input 
                                label={`Gas/LPG Price (${financials.currency}/kWh)`} 
                                type="number" 
                                step="0.01"
                                value={financials.gasPrice} 
                                onChange={(e) => handleFinancial('gasPrice', e.target.value)} 
                            />
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

                        <div className="bg-white border-2 border-gray-100 p-6 rounded-3xl">
                            <p className="text-gray-400 text-xs font-black uppercase tracking-widest mb-1">Payback Period</p>
                            <h3 className={`text-4xl font-black ${results.paybackYears < 3 ? 'text-green-600' : 'text-orange-500'}`}>
                                {results.paybackYears < 0 ? 'Immediate' : `${results.paybackYears.toFixed(1)} Yrs`}
                            </h3>
                            <p className="text-xs text-gray-400 mt-2">Based on {financials.currency}{results.netCapexDelta.toLocaleString()} net difference</p>
                        </div>

                        <div className="bg-white border-2 border-gray-100 p-6 rounded-3xl">
                            <p className="text-gray-400 text-xs font-black uppercase tracking-widest mb-1">5-Year Value</p>
                            <h3 className="text-4xl font-black text-blue-600">
                                {financials.currency} {results.fiveYearSavings.toLocaleString(undefined, {maximumFractionDigits:0})}
                            </h3>
                            <p className="text-xs text-gray-400 mt-2">Net savings after hardware ROI</p>
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
                                    Base Baseline
                                </div>
                            </div>
                        </div>

                        {/* Karnot Bar */}
                        <div>
                            <div className="flex justify-between text-xs font-bold text-gray-500 mb-2">
                                <span>Karnot AquaHERO (R290)</span>
                                <span className="text-blue-600">{financials.currency} {results.karnotAnnualCost.toFixed(0)} / yr</span>
                            </div>
                            <div className="h-12 w-full bg-gray-100 rounded-xl overflow-hidden relative">
                                <div 
                                    className="h-full bg-gradient-to-r from-blue-500 to-green-400 flex items-center px-4 text-white font-bold transition-all duration-1000"
                                    style={{ width: `${(results.karnotAnnualCost / results.compAnnualCost) * 100}%` }}
                                >
                                    {((results.karnotAnnualCost / results.compAnnualCost) * 100).toFixed(0)}% Cost
                                </div>
                            </div>
                        </div>

                        {/* Strategy Note */}
                        {inputs.smartStrategy && (
                            <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-100 flex items-start gap-3">
                                <Activity className="text-green-600 mt-1" size={18} />
                                <div>
                                    <h5 className="text-xs font-black text-green-700 uppercase">Strategy Winner</h5>
                                    <p className="text-xs text-green-800 mt-1">
                                        By utilizing the R290 high-temp capability (75°C) to supercharge thermal storage during the 
                                        {financials.gridOffPeak} {financials.currency} window, we avoid peak pricing entirely. 
                                        Competitor hybrids often fallback to resistive heating during morning/evening peaks.
                                    </p>
                                </div>
                            </div>
                        )}
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
