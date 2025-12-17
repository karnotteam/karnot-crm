import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; 
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from "firebase/auth";
import { calculateHeatPump, CONFIG } from '../utils/heatPumpLogic'; 
import { Card, Section, Input, Button } from '../data/constants.jsx'; 
import { Save, Calculator, RefreshCw, Printer, X, Check, Snowflake } from 'lucide-react';

const HeatPumpCalculator = ({ leadId }) => {  
  const [inputs, setInputs] = useState({
    currency: 'PHP', userType: 'home', occupants: 4, dailyLitersInput: 500,
    mealsPerDay: 0, roomsOccupied: 0, hoursPerDay: 12, heatingType: 'electric',
    fuelPrice: 12.25, tankSize: 11, elecRate: 12.25, ambientTemp: 30,
    inletTemp: 15, targetTemp: 55, systemType: 'grid-only', sunHours: 5.5,
    heatPumpType: 'all', includeCooling: false
  });

  const [result, setResult] = useState(null);
  const [dbProducts, setDbProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [fixtureInputs, setFixtureInputs] = useState({ showers: 0, basins: 0, sinks: 0, people: 0, hours: 8 });

  useEffect(() => {
    const fetchProducts = async () => {
        const auth = getAuth();
        if (!auth.currentUser) return;
        const snap = await getDocs(collection(db, "users", auth.currentUser.uid, "products"));
        setDbProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    if (!loading && dbProducts.length > 0) {
        setResult(calculateHeatPump(inputs, dbProducts));
    }
  }, [inputs, dbProducts, loading]);

  const handleChange = (field, isNumber = false) => (e) => {
    let val = isNumber ? parseFloat(e.target.value) || 0 : e.target.value;
    if (field === 'includeCooling') val = (e.target.value === 'true');
    setInputs(prev => ({ ...prev, [field]: val }));
  };

  const fmt = n => (+n).toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <Card className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
            <h2 className="text-2xl font-black text-orange-600 uppercase tracking-tighter flex items-center gap-2">
                <Calculator size={24}/> Heat Pump ROI
            </h2>
            {loading && <RefreshCw size={16} className="animate-spin text-gray-400"/>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Section title="1. Demand">
                <div className="space-y-4">
                    <label className="text-xs font-black uppercase text-gray-400 tracking-widest">User Type</label>
                    <select className="w-full border-2 p-3 rounded-xl font-bold" value={inputs.userType} onChange={handleChange('userType')}>
                        <option value="home">Residential Home</option>
                        <option value="restaurant">Restaurant / F&B</option>
                        <option value="resort">Hotels & Resorts</option>
                        <option value="spa">Spa / Fitness</option>
                    </select>
                    {inputs.userType === 'home' && <Input label="Occupants" type="number" value={inputs.occupants} onChange={handleChange('occupants', true)} />}
                    {['office','school','spa'].includes(inputs.userType) && <Input label="Daily Liters" type="number" value={inputs.dailyLitersInput} onChange={handleChange('dailyLitersInput', true)} />}
                </div>
            </Section>

            <Section title="2. Energy Costs">
                <div className="space-y-4">
                    <label className="text-xs font-black uppercase text-gray-400 tracking-widest">Current Fuel</label>
                    <select className="w-full border-2 p-3 rounded-xl font-bold" value={inputs.heatingType} onChange={handleChange('heatingType')}>
                        <option value="electric">Electric Geyser</option>
                        <option value="propane">LPG / Propane</option>
                        <option value="diesel">Diesel Boiler</option>
                    </select>
                    <Input label="Fuel Unit Price" type="number" value={inputs.fuelPrice} onChange={handleChange('fuelPrice', true)} />
                    <Input label="Electricity Rate / kWh" type="number" value={inputs.elecRate} onChange={handleChange('elecRate', true)} />
                </div>
            </Section>

            <Section title="3. Technology">
                <div className="space-y-4">
                    <label className="text-xs font-black uppercase text-gray-400 tracking-widest">HP Refrigerant</label>
                    <select className="w-full border-2 p-3 rounded-xl font-bold" value={inputs.heatPumpType} onChange={handleChange('heatPumpType')}>
                        <option value="all">Best Price Choice</option>
                        <option value="r32">R32 Models</option>
                        <option value="r290">R290 (Propane)</option>
                        <option value="co2">CO2 (High Temp)</option>
                    </select>
                    <label className="text-xs font-black uppercase text-gray-400 tracking-widest">Require Free Cooling?</label>
                    <select className="w-full border-2 p-3 rounded-xl font-bold" value={inputs.includeCooling.toString()} onChange={handleChange('includeCooling')}>
                        <option value="false">No (Heating Only)</option>
                        <option value="true">Yes (Reversible)</option>
                    </select>
                </div>
            </Section>
        </div>

        {result && !result.error && (
            <div className="mt-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-slate-900 text-white p-8 rounded-3xl relative overflow-hidden shadow-2xl">
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-orange-500 mb-1">{result.system.n}</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Optimized for {fmt(result.metrics.adjFlowLhr)} L/hr Output</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Annual Savings</p>
                            <div className="text-5xl font-black text-white">{result.financials.symbol}{fmt(result.financials.totalSavings)}</div>
                        </div>
                    </div>

                    {/* COOLING BONUS BOX */}
                    {inputs.includeCooling && result.financials.coolSavings > 0 && (
                        <div className="mt-6 bg-blue-500/20 border border-blue-400/30 p-4 rounded-2xl flex items-center gap-4">
                            <div className="bg-blue-500 p-2 rounded-xl"><Snowflake size={20}/></div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-blue-300">Cooling Benefit Included</p>
                                <p className="text-sm font-bold">This reversible unit provides {result.financials.symbol}{fmt(result.financials.coolSavings)} of free cooling value annually.</p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-center">
                            <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Payback</p>
                            <p className="text-xl font-bold">{result.financials.paybackYears} Yrs</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-center">
                            <p className="text-[10px] font-black uppercase text-slate-500 mb-1">CO₂ Reduction</p>
                            <p className="text-xl font-bold text-green-400">{fmt(result.metrics.emissionsSaved)}kg</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-center">
                            <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Solar Offset</p>
                            <p className="text-xl font-bold text-amber-400">{result.metrics.panels} Panels</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-center">
                            <p className="text-[10px] font-black uppercase text-slate-500 mb-1">System Cost</p>
                            <p className="text-xl font-bold">{result.financials.symbol}{fmt(result.financials.capex.total)}</p>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </Card>
  );
};

export default HeatPumpCalculator;
