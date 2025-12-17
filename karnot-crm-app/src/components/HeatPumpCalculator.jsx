import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; 
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from "firebase/auth";
import { calculateHeatPump, CONFIG } from '../utils/heatPumpLogic'; 
import { Card, Section, Input, Button } from '../data/constants.jsx'; 
import { Save, Calculator, RefreshCw, X, Printer, Sun, Zap, TrendingUp, CheckCircle, Droplets, Snowflake } from 'lucide-react';

const HeatPumpCalculator = ({ leadId }) => {  
  const [inputs, setInputs] = useState({
    currency: 'PHP', userType: 'home', occupants: 4, dailyLitersInput: 500, mealsPerDay: 0,
    roomsOccupied: 0, hoursPerDay: 12, heatingType: 'electric', fuelPrice: 12.25, tankSize: 11,
    elecRate: 12.25, ambientTemp: 30, inletTemp: 15, targetTemp: 55, systemType: 'grid-solar',
    sunHours: 5.5, heatPumpType: 'all', includeCooling: false
  });

  const [showModal, setShowModal] = useState(false);
  const [fixtures, setFixtures] = useState({ showers: 0, basins: 0, sinks: 0, people: 0, hours: 8 });
  const [result, setResult] = useState(null);
  const [dbProducts, setDbProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
        const auth = getAuth();
        if (!auth.currentUser) return;
        try {
            const querySnapshot = await getDocs(collection(db, "users", auth.currentUser.uid, "products"));
            setDbProducts(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } finally { setLoading(false); }
    };
    fetch();
  }, []);

  useEffect(() => {
      const defaults = CONFIG.defaultRate[inputs.currency];
      if (defaults) {
          const newFuel = inputs.heatingType === 'propane' ? defaults.lpgPrice : (inputs.heatingType === 'diesel' ? defaults.diesel : (inputs.heatingType === 'gas' ? defaults.gas : defaults.grid));
          setInputs(prev => ({ ...prev, elecRate: defaults.grid, fuelPrice: newFuel, tankSize: defaults.lpgSize || 11 }));
      }
  }, [inputs.currency, inputs.heatingType]);

  useEffect(() => {
    if (!loading && dbProducts.length > 0) {
        setResult(calculateHeatPump(inputs, dbProducts));
    }
  }, [inputs, dbProducts, loading]);

  const applyFixtures = () => {
      const total = Math.round((50 * fixtures.showers * 0.4) + (284 * fixtures.people * 0.15 * 0.25 * 0.4) + (20 * fixtures.basins * 0.4) + (114 * fixtures.sinks * 0.3 * fixtures.hours * 0.4));
      setInputs(p => ({ ...p, dailyLitersInput: total }));
      setShowModal(false);
  };

  const fmt = n => (+n).toLocaleString(undefined, { maximumFractionDigits: 0 });
  const sym = CONFIG.SYMBOLS[inputs.currency];

  const handleSave = async () => {
    if (!result || result.error) return;
    try {
        setIsSaving(true);
        const auth = getAuth();
        const path = leadId ? `users/${auth.currentUser.uid}/leads/${leadId}/calculations` : `users/${auth.currentUser.uid}/calculations`;
        await addDoc(collection(db, path), { type: 'heat-pump-roi', inputs, result, createdAt: serverTimestamp() });
        alert("ROI Analysis Saved Successfully!");
    } finally { setIsSaving(false); }
  };

  return (
    <div className="space-y-6 pb-24">
        <Card>
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h2 className="text-2xl font-black text-orange-600 flex items-center gap-2 uppercase tracking-tighter"><Calculator size={28}/> Karnot Heat Pump ROI Analysis</h2>
                {loading && <RefreshCw className="animate-spin text-gray-400" size={18}/>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Section title="1. Your Demand">
                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-slate-400">User Type</label>
                        <select className="w-full border p-3 rounded-lg bg-white shadow-sm font-bold" value={inputs.userType} onChange={e => setInputs(p=>({...p, userType:e.target.value}))}>
                            <option value="home">Home</option><option value="restaurant">Restaurant</option><option value="resort">Hotels & Resorts</option><option value="school">Schools</option><option value="office">Office</option><option value="spa">Spa</option>
                        </select>
                        {['school','office','spa'].includes(inputs.userType) && (
                            <div>
                                <Input label="Daily Liters" type="number" value={inputs.dailyLitersInput} onChange={e => setInputs(p=>({...p, dailyLitersInput:+e.target.value}))} />
                                <button onClick={()=>setShowModal(true)} className="flex items-center gap-1 text-xs text-blue-600 font-black uppercase mt-2 italic underline"><Droplets size={12}/> Estimate via Fixtures</button>
                            </div>
                        )}
                        {inputs.userType === 'home' && <Input label="Occupants" type="number" value={inputs.occupants} onChange={e => setInputs(p=>({...p, occupants:+e.target.value}))} />}
                        {['restaurant','resort'].includes(inputs.userType) && <Input label="Meals / Day" type="number" value={inputs.mealsPerDay} onChange={e => setInputs(p=>({...p, mealsPerDay:+e.target.value}))} />}
                        {inputs.userType === 'resort' && <Input label="Rooms Occupied" type="number" value={inputs.roomsOccupied} onChange={e => setInputs(p=>({...p, roomsOccupied:+e.target.value}))} />}
                        <Input label="Daily Operating Hours" type="number" value={inputs.hoursPerDay} onChange={e => setInputs(p=>({...p, hoursPerDay:+e.target.value}))} />
                    </div>
                </Section>

                <Section title="2. Your Costs">
                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-slate-400">Select Currency</label>
                        <select className="w-full border p-3 rounded-lg bg-white shadow-sm font-bold" value={inputs.currency} onChange={e => setInputs(p=>({...p, currency:e.target.value}))}>
                            <option value="PHP">₱ PHP</option><option value="USD">$ USD</option><option value="GBP">£ GBP</option><option value="EUR">€ EUR</option>
                        </select>
                        <label className="text-[10px] font-black uppercase text-slate-400">Heating Type</label>
                        <select className="w-full border p-3 rounded-lg bg-white shadow-sm font-bold" value={inputs.heatingType} onChange={e => setInputs(p=>({...p, heatingType:e.target.value}))}>
                            <option value="electric">Electric</option><option value="gas">Natural Gas</option><option value="propane">Propane (LPG)</option><option value="diesel">Diesel</option>
                        </select>
                        <Input label={`Fuel Price (${sym})`} type="number" value={inputs.fuelPrice} onChange={e => setInputs(p=>({...p, fuelPrice:+e.target.value}))} />
                        <Input label={`Elec Rate (${sym}/kWh)`} type="number" value={inputs.elecRate} onChange={e => setInputs(p=>({...p, elecRate:+e.target.value}))} />
                    </div>
                </Section>
                
                <Section title="3. Conditions & Technology">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Air Temp (°C)" type="number" value={inputs.ambientTemp} onChange={e => setInputs(p=>({...p, ambientTemp:+e.target.value}))} />
                            <Input label="Inlet Temp (°C)" type="number" value={inputs.inletTemp} onChange={e => setInputs(p=>({...p, inletTemp:+e.target.value}))} />
                        </div>
                        <Input label="Target Temp (°C)" type="number" value={inputs.targetTemp} onChange={e => setInputs(p=>({...p, targetTemp:+e.target.value}))} />
                        <label className="text-[10px] font-black uppercase text-slate-400">HP Technology</label>
                        <select className="w-full border p-3 rounded-lg bg-white shadow-sm font-bold" value={inputs.heatPumpType} onChange={e => setInputs(p=>({...p, heatPumpType:e.target.value}))}>
                            <option value="all">Best Price (All Models)</option>
                            <option value="R290">R290 Models Only</option>
                            <option value="R744">CO2 (R744) Only</option>
                            <option value="R32">R32 Models Only</option>
                        </select>
                        <label className="text-[10px] font-black uppercase text-slate-400">System Type</label>
                        <select className="w-full border p-3 rounded-lg bg-white shadow-sm font-bold" value={inputs.systemType} onChange={e => setInputs(p=>({...p, systemType:e.target.value}))}>
                            <option value="grid-only">Grid Only</option>
                            <option value="grid-solar">Grid + Solar</option>
                        </select>
                        <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2">Require Cooling? {inputs.includeCooling && <Snowflake size={12} className="text-blue-500 animate-pulse"/>}</label>
                        <select className="w-full border p-3 rounded-lg bg-white shadow-sm font-bold" value={inputs.includeCooling ? 'yes' : 'no'} onChange={e => setInputs(p=>({...p, includeCooling:e.target.value==='yes'}))}>
                            <option value="no">No</option><option value="yes">Yes</option>
                        </select>
                    </div>
                </Section>
            </div>

            {result && !result.error && (
                <div className="mt-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-slate-50 p-10 rounded-[2.5rem] border border-slate-200 shadow-2xl relative overflow-hidden">
                        <div className="flex justify-between items-end mb-10 border-b pb-8 relative z-10">
                            <div>
                                <h3 className="text-3xl font-black text-orange-600 uppercase italic tracking-tighter">{result.system.n}</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Recommended Selection</p>
                            </div>
                            <div className="text-right">
                                <div className="text-6xl font-black text-green-600 tracking-tighter">{sym}{fmt(result.financials.totalSavings)}</div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Estimated Annual Savings</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12 relative z-10">
                            <div className="bg-white p-6 rounded-3xl border shadow-sm text-center">
                                <TrendingUp className="mx-auto mb-3 text-orange-500" size={32}/>
                                <div className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Payback</div>
                                <div className="text-3xl font-black text-slate-800">{result.financials.paybackYears} <span className="text-xs">Yrs</span></div>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border shadow-sm text-center">
                                <Sun className="mx-auto mb-3 text-amber-500" size={32}/>
                                <div className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Solar Panels</div>
                                <div className="text-3xl font-black text-slate-800">{result.metrics.panelCount} <span className="text-xs">Units</span></div>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border shadow-sm text-center">
                                <Zap className="mx-auto mb-3 text-blue-500" size={32}/>
                                <div className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Power Draw</div>
                                <div className="text-3xl font-black text-slate-800">{result.metrics.powerKW} <span className="text-xs">kW</span></div>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border shadow-sm text-center">
                                <CheckCircle className="mx-auto mb-3 text-green-500" size={32}/>
                                <div className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">CO2 Saved</div>
                                <div className="text-3xl font-black text-slate-800">{fmt(result.metrics.co2Saved)} <span className="text-xs">kg</span></div>
                            </div>
                        </div>

                        <div className="bg-white rounded-[2rem] border p-10 space-y-5 shadow-sm">
                            <h4 className="font-black text-slate-300 uppercase text-xs mb-6 tracking-[0.4em] border-b pb-4">Investment Breakdown</h4>
                            <div className="flex justify-between items-center text-slate-600 font-bold"><span>Heat Pump System Price:</span><span className="text-xl font-black">{sym}{fmt(result.financials.capex.system)}</span></div>
                            {result.metrics.panelCount > 0 && (
                                <>
                                    <div className="flex justify-between items-center text-slate-600 font-bold"><span>Solar PV Hardware ({result.metrics.panelCount} Panels):</span><span className="text-xl font-black">{sym}{fmt(result.financials.capex.solar)}</span></div>
                                    <div className="flex justify-between items-center text-slate-600 font-bold"><span>Inverter & Smart Controls:</span><span className="text-xl font-black">{sym}{fmt(result.financials.capex.inverter)}</span></div>
                                </>
                            )}
                            <div className="flex justify-between items-center text-3xl font-black border-t-4 border-slate-50 pt-8 mt-6 text-slate-900">
                                <span>TOTAL ESTIMATED CAPEX:</span>
                                <span className="text-orange-600 tracking-tighter">{sym}{fmt(result.financials.capex.total)}</span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-5 mt-10">
                            <Button onClick={()=>window.print()} variant="secondary" className="px-10 py-5 font-black uppercase text-xs tracking-[0.2em] shadow-lg"><Printer size={20} className="mr-2"/>Print Detailed Report</Button>
                            <Button onClick={handleSave} variant="primary" disabled={isSaving} className="px-10 py-5 bg-orange-600 text-white font-black uppercase text-xs tracking-[0.2em] shadow-2xl hover:scale-105 transition-transform"><Save size={20} className="mr-2"/>{isSaving ? 'Processing...' : 'Save to Lead CRM'}</Button>
                        </div>
                    </div>
                </div>
            )}
            
            {result?.error && (
                <div className="mt-8 p-8 bg-red-50 border-2 border-red-100 rounded-3xl flex items-center gap-6 text-red-700 font-black uppercase text-sm tracking-widest shadow-inner">
                    <X className="bg-red-600 text-white rounded-full p-2" size={40}/>
                    Selection Alert: {result.error}
                </div>
            )}
        </Card>

        {showModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-[999] p-6">
                <div className="bg-white p-12 rounded-[3rem] max-w-lg w-full relative shadow-[0_0_150px_rgba(0,0,0,0.3)] animate-in zoom-in-95 duration-300 border border-slate-100">
                    <button onClick={()=>setShowModal(false)} className="absolute top-10 right-10 text-slate-300 hover:text-orange-600 transition-colors"><X size={36}/></button>
                    
                    <div className="text-center mb-12">
                        <Droplets className="mx-auto mb-6 text-blue-500 drop-shadow-lg" size={64}/>
                        <h3 className="text-4xl font-black text-slate-800 uppercase tracking-tighter">Usage Profiler</h3>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.3em] mt-3">Calculate demand by fixture count</p>
                    </div>

                    <div className="space-y-6">
                        <Input label="Shower Units" type="number" value={fixtures.showers} onChange={e=>setFixtures(p=>({...p, showers:+e.target.value}))} />
                        <Input label="Kitchen / Food Prep Sinks" type="number" value={fixtures.sinks} onChange={e=>setFixtures(p=>({...p, sinks:+e.target.value}))} />
                        <Input label="Lavatory Basins" type="number" value={fixtures.basins} onChange={e=>setFixtures(p=>({...p, basins:+e.target.value}))} />
                        <Input label="Total Daily Occupants" type="number" value={fixtures.people} onChange={e=>setFixtures(p=>({...p, people:+e.target.value}))} />
                        <Button onClick={applyFixtures} className="w-full bg-orange-600 text-white py-8 rounded-[2rem] font-black uppercase text-lg tracking-[0.2em] shadow-2xl hover:bg-orange-700 transition-all mt-10">Apply Profiler Data</Button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default HeatPumpCalculator;
