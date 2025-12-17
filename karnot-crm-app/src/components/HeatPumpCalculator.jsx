import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; 
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from "firebase/auth";
import { calculateHeatPump, CONFIG } from '../utils/heatPumpLogic'; 
import { Card, Section, Input, Button } from '../data/constants.jsx'; 
import { Save, Calculator, RefreshCw, Printer, X, Check, Sun, Zap, TrendingUp, CheckCircle } from 'lucide-react';

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

  useEffect(() => {
      const defaults = CONFIG.defaultRate[inputs.currency];
      if (defaults) setInputs(p => ({ ...prev, elecRate: defaults.grid, fuelPrice: defaults.grid }));
  }, [inputs.currency]);

  useEffect(() => {
    if (!loading && dbProducts.length > 0) {
        setResult(calculateHeatPump(inputs, dbProducts));
    }
  }, [inputs, dbProducts, loading]);

  const handleChange = (field, isNumber = false) => (e) => {
    const val = isNumber ? parseFloat(e.target.value) || 0 : e.target.value;
    setInputs(prev => ({ ...prev, [field]: val }));
  };

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
        alert("Saved to CRM!");
    } finally { setIsSaving(false); }
  };

  return (
    <div className="space-y-6 pb-24">
        <Card>
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h2 className="text-2xl font-bold text-orange-600 flex items-center gap-2"><Calculator size={28}/> Karnot ROI Calculator</h2>
                {loading && <RefreshCw className="animate-spin text-gray-400"/>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Section title="1. Your Demand">
                    <div className="space-y-4">
                        <select className="w-full border p-2 rounded bg-white shadow-sm" value={inputs.userType} onChange={handleChange('userType')}>
                            <option value="home">Home</option><option value="restaurant">Restaurant</option><option value="resort">Hotels & Resorts</option><option value="school">Schools</option><option value="office">Office</option><option value="spa">Spa</option>
                        </select>
                        {['school','office','spa'].includes(inputs.userType) && (
                            <div>
                                <Input label="Liters / Day" type="number" value={inputs.dailyLitersInput} onChange={handleChange('dailyLitersInput', true)} />
                                <button onClick={()=>setShowModal(true)} className="text-xs text-blue-600 underline font-semibold mt-1">Estimate via Fixtures</button>
                            </div>
                        )}
                        {inputs.userType === 'home' && <Input label="Occupants" type="number" value={inputs.occupants} onChange={handleChange('occupants', true)} />}
                        {['restaurant','resort'].includes(inputs.userType) && <Input label="Meals / Day" type="number" value={inputs.mealsPerDay} onChange={handleChange('mealsPerDay', true)} />}
                        {inputs.userType === 'resort' && <Input label="Rooms Occupied" type="number" value={inputs.roomsOccupied} onChange={handleChange('roomsOccupied', true)} />}
                        <Input label="Operating Hours" type="number" value={inputs.hoursPerDay} onChange={handleChange('hoursPerDay', true)} />
                    </div>
                </Section>

                <Section title="2. Your Costs">
                    <div className="space-y-4">
                        <select className="w-full border p-2 rounded bg-white shadow-sm" value={inputs.currency} onChange={handleChange('currency')}>
                            <option value="PHP">₱ PHP</option><option value="USD">$ USD</option><option value="GBP">£ GBP</option><option value="EUR">€ EUR</option>
                        </select>
                        <select className="w-full border p-2 rounded bg-white shadow-sm" value={inputs.heatingType} onChange={handleChange('heatingType')}>
                            <option value="electric">Electric</option><option value="gas">Natural Gas</option><option value="propane">LPG</option><option value="diesel">Diesel</option>
                        </select>
                        <Input label={`Fuel Price (${sym})`} type="number" value={inputs.fuelPrice} onChange={handleChange('fuelPrice', true)} />
                        <Input label={`Elec Rate (${sym}/kWh)`} type="number" value={inputs.elecRate} onChange={handleChange('elecRate', true)} />
                    </div>
                </Section>
                
                <Section title="3. Conditions">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Air Temp (°C)" type="number" value={inputs.ambientTemp} onChange={handleChange('ambientTemp', true)} />
                            <Input label="Inlet Temp (°C)" type="number" value={inputs.inletTemp} onChange={handleChange('inletTemp', true)} />
                        </div>
                        <Input label="Target Temp (°C)" type="number" value={inputs.targetTemp} onChange={handleChange('targetTemp', true)} />
                        <select className="w-full border p-2 rounded bg-white shadow-sm" value={inputs.systemType} onChange={handleChange('systemType')}>
                            <option value="grid-only">Grid Only</option><option value="grid-solar">Grid + Solar</option>
                        </select>
                        {inputs.systemType === 'grid-solar' && <Input label="Sun Hours" type="number" value={inputs.sunHours} onChange={handleChange('sunHours', true)} />}
                    </div>
                </Section>
            </div>

            {result && !result.error && (
                <div className="mt-12 space-y-8 animate-in fade-in slide-in-from-bottom-4">
                    <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 shadow-inner">
                        <div className="flex justify-between items-end mb-8 border-b pb-6">
                            <div>
                                <h3 className="text-2xl font-black text-orange-600 uppercase italic tracking-tighter">{result.system.n}</h3>
                                <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Recommended Karnot System</p>
                            </div>
                            <div className="text-right">
                                <div className="text-5xl font-black text-green-600 tracking-tighter">{sym}{fmt(result.financials.totalSavings)}</div>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Est. Annual Savings</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
                            <div className="bg-white p-6 rounded-2xl border shadow-sm text-center border-orange-100">
                                <TrendingUp className="mx-auto mb-3 text-orange-500" size={24}/>
                                <div className="text-[10px] font-black text-slate-400 uppercase mb-1">Payback</div>
                                <div className="text-2xl font-black text-slate-700">{result.financials.paybackYears} Yrs</div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border shadow-sm text-center border-amber-100">
                                <Sun className="mx-auto mb-3 text-amber-500" size={24}/>
                                <div className="text-[10px] font-black text-slate-400 uppercase mb-1">Solar Panels</div>
                                <div className="text-2xl font-black text-slate-700">{result.metrics.panelCount} Panels</div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border shadow-sm text-center border-blue-100">
                                <Zap className="mx-auto mb-3 text-blue-500" size={24}/>
                                <div className="text-[10px] font-black text-slate-400 uppercase mb-1">Power Draw</div>
                                <div className="text-2xl font-black text-slate-700">{result.metrics.powerKW} kW</div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border shadow-sm text-center border-green-100">
                                <CheckCircle className="mx-auto mb-3 text-green-500" size={24}/>
                                <div className="text-[10px] font-black text-slate-400 uppercase mb-1">CO2 Saved</div>
                                <div className="text-2xl font-black text-slate-700">{fmt(result.metrics.co2Saved)} kg</div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border p-8 space-y-4 shadow-sm">
                            <h4 className="font-black text-slate-400 uppercase text-xs mb-4 tracking-widest border-b pb-3">Investment Breakdown ({inputs.currency})</h4>
                            <div className="flex justify-between text-base"><span>Heat Pump System Price:</span><span className="font-bold">{sym}{fmt(result.financials.capex.system)}</span></div>
                            {result.metrics.panelCount > 0 && (
                                <>
                                    <div className="flex justify-between text-base"><span>Solar PV System ({result.metrics.panelCount} Panels):</span><span className="font-bold">{sym}{fmt(result.financials.capex.solar)}</span></div>
                                    <div className="flex justify-between text-base"><span>Inverter & Smart Controls:</span><span className="font-bold">{sym}{fmt(result.financials.capex.inverter)}</span></div>
                                </>
                            )}
                            <div className="flex justify-between text-xl font-black border-t pt-5 mt-4 text-slate-800">
                                <span>TOTAL ESTIMATED CAPEX:</span>
                                <span className="text-orange-600">{sym}{fmt(result.financials.capex.total)}</span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-4 mt-8">
                            <Button onClick={()=>window.print()} variant="secondary" className="px-6 py-3"><Printer size={20} className="mr-2"/>Print Detailed Report</Button>
                            <Button onClick={handleSave} variant="primary" disabled={isSaving} className="px-6 py-3 bg-orange-600 text-white font-black"><Save size={20} className="mr-2"/>{isSaving ? 'Saving...' : 'Save to CRM'}</Button>
                        </div>
                    </div>
                </div>
            )}
        </Card>

        {showModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[999] p-4">
                <div className="bg-white p-10 rounded-3xl max-w-md w-full relative shadow-2xl border border-slate-100 animate-in zoom-in-95">
                    <button onClick={()=>setShowModal(false)} className="absolute top-6 right-6 text-slate-300 hover:text-slate-600 transition-colors"><X size={28}/></button>
                    <h3 className="text-2xl font-black mb-8 text-orange-600 uppercase tracking-tighter border-b pb-4">Fixture Water Estimator</h3>
                    <div className="space-y-5">
                        <Input label="Number of Showers" type="number" value={fixtures.showers} onChange={e=>setFixtures(p=>({...p, showers:+e.target.value}))} />
                        <Input label="Kitchen Sinks" type="number" value={fixtures.sinks} onChange={e=>setFixtures(p=>({...p, sinks:+e.target.value}))} />
                        <Input label="Lavatory Basins" type="number" value={fixtures.basins} onChange={e=>setFixtures(p=>({...p, basins:+e.target.value}))} />
                        <Input label="People / Occupants" type="number" value={fixtures.people} onChange={e=>setFixtures(p=>({...p, people:+e.target.value}))} />
                        <Button onClick={applyFixtures} className="w-full bg-orange-600 text-white py-5 font-black uppercase tracking-widest shadow-xl hover:bg-orange-700 transition-all mt-6">Apply Liters to Demand</Button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default HeatPumpCalculator;
