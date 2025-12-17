import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; 
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from "firebase/auth";
import { calculateHeatPump, CONFIG } from '../utils/heatPumpLogic'; 
import { Card, Section, Input, Button } from '../data/constants.jsx'; 
import { Calculator, RefreshCw, X, Printer, Save, Sun, Zap, TrendingUp, CheckCircle, Droplets } from 'lucide-react';

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
        const querySnapshot = await getDocs(collection(db, "users", auth.currentUser.uid, "products"));
        setDbProducts(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
    };
    fetch();
  }, []);

  // CURRENCY SYNC: Critical for ROI correctness
  useEffect(() => {
      const defaults = CONFIG.defaultRate[inputs.currency];
      if (defaults) {
          const newFuel = inputs.heatingType === 'propane' ? defaults.lpgPrice : (inputs.heatingType === 'diesel' ? defaults.diesel : defaults.grid);
          setInputs(p => ({ ...p, elecRate: defaults.grid, fuelPrice: newFuel, tankSize: defaults.lpgSize || 11 }));
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

  return (
    <div className="space-y-6 pb-24">
        <Card>
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h2 className="text-2xl font-black text-orange-600 flex items-center gap-2 uppercase tracking-tighter"><Calculator size={28}/> ROI Calculator</h2>
                {loading && <RefreshCw className="animate-spin text-gray-400" size={18}/>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Section title="1. Your Demand">
                    <div className="space-y-4">
                        <select className="w-full border p-3 rounded-lg bg-white shadow-sm font-bold" value={inputs.userType} onChange={e=>setInputs(p=>({...p, userType:e.target.value}))}>
                            <option value="home">Home / Villa</option><option value="restaurant">Restaurant / F&B</option><option value="resort">Hotels & Resorts</option><option value="school">Schools</option><option value="office">Offices</option><option value="spa">Spa / Clinics</option>
                        </select>
                        {['school','office','spa'].includes(inputs.userType) && (
                            <div>
                                <Input label="Liters Required / Day" type="number" value={inputs.dailyLitersInput} onChange={e=>setInputs(p=>({...p, dailyLitersInput:+e.target.value}))} />
                                <button onClick={()=>setShowModal(true)} className="flex items-center gap-1 text-xs text-blue-600 font-black uppercase mt-2 italic underline"><Droplets size={12}/> Estimate via Fixtures</button>
                            </div>
                        )}
                        {inputs.userType === 'home' && <Input label="Occupants" type="number" value={inputs.occupants} onChange={e=>setInputs(p=>({...p, occupants:+e.target.value}))} />}
                        {['restaurant','resort'].includes(inputs.userType) && <Input label="Meals Served / Day" type="number" value={inputs.mealsPerDay} onChange={e=>setInputs(p=>({...p, mealsPerDay:+e.target.value}))} />}
                        <Input label="Operating Hours" type="number" value={inputs.hoursPerDay} onChange={e=>setInputs(p=>({...p, hoursPerDay:+e.target.value}))} />
                    </div>
                </Section>

                <Section title="2. Market Costs">
                    <div className="space-y-4">
                        <select className="w-full border p-3 rounded-lg bg-white shadow-sm font-bold" value={inputs.currency} onChange={e=>setInputs(p=>({...p, currency:e.target.value}))}>
                            <option value="PHP">₱ PHP</option><option value="USD">$ USD</option><option value="GBP">£ GBP</option>
                        </select>
                        <select className="w-full border p-3 rounded-lg bg-white shadow-sm font-bold" value={inputs.heatingType} onChange={e=>setInputs(p=>({...p, heatingType:e.target.value}))}>
                            <option value="electric">Electric</option><option value="propane">LPG</option><option value="diesel">Diesel</option>
                        </select>
                        <Input label={`Fuel Rate (${sym})`} type="number" value={inputs.fuelPrice} onChange={e=>setInputs(p=>({...p, fuelPrice:+e.target.value}))} />
                        <Input label={`Elec Rate (${sym}/kWh)`} type="number" value={inputs.elecRate} onChange={e=>setInputs(p=>({...p, elecRate:+e.target.value}))} />
                    </div>
                </Section>
                
                <Section title="3. Local Environment">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Air Temp (°C)" type="number" value={inputs.ambientTemp} onChange={e=>setInputs(p=>({...p, ambientTemp:+e.target.value}))} />
                            <Input label="Inlet Temp (°C)" type="number" value={inputs.inletTemp} onChange={e=>setInputs(p=>({...p, inletTemp:+e.target.value}))} />
                        </div>
                        <Input label="Target Temp (°C)" type="number" value={inputs.targetTemp} onChange={e=>setInputs(p=>({...p, targetTemp:+e.target.value}))} />
                        <select className="w-full border p-3 rounded-lg bg-white shadow-sm font-bold" value={inputs.systemType} onChange={e=>setInputs(p=>({...p, systemType:e.target.value}))}>
                            <option value="grid-only">Grid Only</option><option value="grid-solar">Grid + Solar</option>
                        </select>
                        {inputs.systemType === 'grid-solar' && <Input label="Peak Sun Hours" type="number" value={inputs.sunHours} onChange={e=>setInputs(p=>({...p, sunHours:+e.target.value}))} />}
                    </div>
                </Section>
            </div>

            {result && !result.error && (
                <div className="mt-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="bg-slate-50 p-10 rounded-[2.5rem] border border-slate-200 shadow-2xl">
                        <div className="flex justify-between items-end mb-10 border-b pb-6">
                            <div>
                                <h3 className="text-3xl font-black text-orange-600 uppercase italic tracking-tighter">{result.system.n}</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Optimal Selection ({result.system.refrig})</p>
                            </div>
                            <div className="text-right">
                                <div className="text-6xl font-black text-green-600 tracking-tighter">{sym}{fmt(result.financials.totalSavings)}</div>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Projected Annual Savings</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                            <div className="bg-white p-6 rounded-2xl border shadow-sm text-center">
                                <TrendingUp className="mx-auto mb-3 text-orange-500" size={32}/>
                                <div className="text-[10px] font-black text-slate-400 uppercase mb-1">Payback</div>
                                <div className="text-3xl font-black text-slate-800">{result.financials.paybackYears} <span className="text-xs font-bold text-slate-400">Yrs</span></div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border shadow-sm text-center">
                                <Sun className="mx-auto mb-3 text-amber-500" size={32}/>
                                <div className="text-[10px] font-black text-slate-400 uppercase mb-1">Solar Panels</div>
                                <div className="text-3xl font-black text-slate-800">{result.metrics.panelCount} <span className="text-xs font-bold text-slate-400">Units</span></div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border shadow-sm text-center">
                                <Zap className="mx-auto mb-3 text-blue-500" size={32}/>
                                <div className="text-[10px] font-black text-slate-400 uppercase mb-1">Avg Power</div>
                                <div className="text-3xl font-black text-slate-800">{result.metrics.powerKW} <span className="text-xs font-bold text-slate-400">kW</span></div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border shadow-sm text-center">
                                <CheckCircle className="mx-auto mb-3 text-green-500" size={32}/>
                                <div className="text-[10px] font-black text-slate-400 uppercase mb-1">CO2 Savings</div>
                                <div className="text-3xl font-black text-slate-800">-{fmt(result.metrics.co2Saved)} <span className="text-xs font-bold text-slate-400">kg</span></div>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl border p-10 space-y-4 shadow-sm">
                            <h4 className="font-black text-slate-300 uppercase text-xs mb-6 tracking-widest border-b pb-3">Investment Breakdown</h4>
                            <div className="flex justify-between items-center text-slate-600 font-bold"><span>Heat Pump Main Unit:</span><span className="text-xl font-black">{sym}{fmt(result.financials.capex.system)}</span></div>
                            {result.metrics.panelCount > 0 && (
                                <>
                                    <div className="flex justify-between items-center text-slate-600 font-bold"><span>Solar PV System ({result.metrics.panelCount} Panels):</span><span className="text-xl font-black">{sym}{fmt(result.financials.capex.solar)}</span></div>
                                    <div className="flex justify-between items-center text-slate-600 font-bold"><span>Inverter & Intelligent BOS:</span><span className="text-xl font-black">{sym}{fmt(result.financials.capex.inverter)}</span></div>
                                </>
                            )}
                            <div className="flex justify-between items-center text-3xl font-black border-t-2 border-slate-100 pt-6 mt-6 text-slate-900 uppercase">
                                <span>TOTAL ESTIMATED CAPEX:</span>
                                <span className="text-orange-600 tracking-tighter">{sym}{fmt(result.financials.capex.total)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Card>

        {showModal && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[999] p-4">
                <div className="bg-white p-12 rounded-[2.5rem] max-w-lg w-full relative shadow-2xl animate-in zoom-in-95 border border-slate-100">
                    <button onClick={()=>setShowModal(false)} className="absolute top-10 right-10 text-slate-300 hover:text-orange-600 transition-colors"><X size={36}/></button>
                    <div className="text-center mb-10">
                        <Droplets className="mx-auto mb-6 text-blue-500" size={64}/>
                        <h3 className="text-4xl font-black text-slate-800 uppercase tracking-tighter">Usage Profiler</h3>
                    </div>
                    <div className="space-y-6">
                        <Input label="Shower Units" type="number" value={fixtures.showers} onChange={e=>setFixtures(p=>({...p, showers:+e.target.value}))} />
                        <Input label="Industrial Sinks" type="number" value={fixtures.sinks} onChange={e=>setFixtures(p=>({...p, sinks:+e.target.value}))} />
                        <Input label="Basins" type="number" value={fixtures.basins} onChange={e=>setFixtures(p=>({...p, basins:+e.target.value}))} />
                        <Input label="Daily Occupants" type="number" value={fixtures.people} onChange={e=>setFixtures(p=>({...p, people:+e.target.value}))} />
                        <Button onClick={applyFixtures} className="w-full bg-orange-600 text-white py-6 rounded-2xl font-black uppercase tracking-widest shadow-2xl mt-10">Apply Profiler Data</Button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default HeatPumpCalculator;
