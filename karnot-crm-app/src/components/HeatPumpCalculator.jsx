import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; 
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from "firebase/auth";
import { calculateHeatPump, CONFIG } from '../utils/heatPumpLogic'; 
import { Card, Section, Input, Button } from '../data/constants.jsx'; 
import { Save, Calculator, RefreshCw, Printer, X, Check, Droplets, Gauge, Sun } from 'lucide-react';

const HeatPumpCalculator = ({ leadId }) => {  
  const [inputs, setInputs] = useState({
    currency: 'PHP', userType: 'home', occupants: 4, dailyLitersInput: 150,
    hoursPerDay: 12, heatingType: 'electric', fuelPrice: 12.25, tankSize: 11,
    elecRate: 12.25, ambientTemp: 30, inletTemp: 15, targetTemp: 55,
    systemType: 'grid-solar', sunHours: 5.5, heatPumpType: 'all', includeCooling: false
  });

  const [showModal, setShowModal] = useState(false);
  const [fixtureInputs, setFixtureInputs] = useState({ showers: 0, basins: 0, sinks: 0, people: 0, hours: 8 });
  const [result, setResult] = useState(null);
  const [dbProducts, setDbProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const symbol = CONFIG?.SYMBOLS?.[inputs.currency] || '$';

  useEffect(() => {
    const fetchInventory = async () => {
        const user = getAuth().currentUser;
        if (!user) { setLoading(false); return; }
        try {
            const snap = await getDocs(collection(db, "users", user.uid, "products"));
            setDbProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    fetchInventory();
  }, []);

  useEffect(() => {
    if (inputs.userType === 'home' && inputs.dailyLitersInput !== 150) {
        setInputs(p => ({ ...p, dailyLitersInput: 150 }));
    }
    if (!loading && dbProducts.length > 0) {
        setResult(calculateHeatPump(inputs, dbProducts));
    }
  }, [inputs, dbProducts, loading]);

  const handleChange = (field, isNumber = false) => (e) => {
    const val = isNumber ? parseFloat(e.target.value) || 0 : e.target.value;
    if (field === 'currency') {
        const rates = CONFIG.defaultRate[val];
        setInputs(p => ({ ...p, currency: val, fuelPrice: rates.grid, elecRate: rates.grid }));
    } else {
        setInputs(p => ({ ...p, [field]: val }));
    }
  };

  const applyFixture = () => {
      const { showers, basins, sinks, people, hours } = fixtureInputs;
      const liters = Math.round((50*showers*0.4) + (284*people*0.015) + (20*basins*0.4) + (114*sinks*0.3*hours*0.4));
      setInputs(p => ({ ...p, dailyLitersInput: liters }));
      setShowModal(false);
  };

  const fmt = n => (+n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <Card>
        <div className="flex justify-between items-center mb-6 border-b pb-4">
            <h2 className="text-2xl font-bold text-orange-600 flex items-center gap-2"><Calculator/> ROI Calculator</h2>
            {loading && <RefreshCw className="animate-spin text-gray-400"/>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Section title="1. Demand">
                <select className="w-full border p-2 rounded mb-3" value={inputs.userType} onChange={handleChange('userType')}>
                    <option value="home">Home (150L iSTOR)</option>
                    <option value="restaurant">Restaurant</option>
                    <option value="resort">Hotels</option>
                </select>
                <Input label="Liters / Day" type="number" value={inputs.dailyLitersInput} onChange={handleChange('dailyLitersInput', true)} disabled={inputs.userType === 'home'} />
                <button onClick={() => setShowModal(true)} className="text-xs text-blue-600 underline">Fixture Estimator</button>
            </Section>

            <Section title="2. Energy & Costs">
                <select className="w-full border p-2 rounded mb-3" value={inputs.currency} onChange={handleChange('currency')}>
                    {Object.keys(CONFIG.FX).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <Input label={`Current Fuel Rate (${symbol})`} type="number" value={inputs.fuelPrice} onChange={handleChange('fuelPrice', true)} />
                <Input label={`Elec Rate (${symbol}/kWh)`} type="number" value={inputs.elecRate} onChange={handleChange('elecRate', true)} />
            </Section>

            <Section title="3. Technology">
                <select className="w-full border p-2 rounded mb-3" value={inputs.heatPumpType} onChange={handleChange('heatPumpType')}>
                    <option value="all">Best Price (Any)</option>
                    <option value="R290">R290 Only</option>
                    <option value="R744">CO2 Only</option>
                    <option value="R32">R32 Only</option>
                </select>
                <select className="w-full border p-2 rounded mb-3" value={inputs.systemType} onChange={handleChange('systemType')}>
                    <option value="grid-only">Grid Only</option>
                    <option value="grid-solar">Grid + Solar Offset</option>
                </select>
                {inputs.systemType === 'grid-solar' && <Input label="Avg Sun Hours" type="number" value={inputs.sunHours} onChange={handleChange('sunHours', true)} />}
            </Section>
        </div>

        {result && !result.error && result.financials && (
            <div className="mt-8 bg-slate-50 p-6 rounded-xl border border-slate-200">
                <div className="flex justify-between items-end mb-6">
                    <div><h3 className="text-xl font-bold text-orange-600">{result.system.n}</h3><p className="text-xs font-bold text-gray-500 uppercase">Ref: {result.system.ref}</p></div>
                    <div className="text-right"><div className="text-3xl font-bold text-green-600">{symbol}{fmt(result.financials.totalSavings)}</div><p className="text-xs font-bold text-gray-400 uppercase">Annual Savings</p></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white p-4 rounded border flex items-center gap-3 shadow-sm"><Droplets className="text-blue-500"/><div><p className="text-xs text-gray-400 font-bold uppercase">Tank Size</p><p className="text-lg font-bold">{result.system.tankSize} L</p></div></div>
                    <div className="bg-white p-4 rounded border flex items-center gap-3 shadow-sm"><Gauge className="text-orange-500"/><div><p className="text-xs text-gray-400 font-bold uppercase">Warm-up</p><p className="text-lg font-bold">{result.metrics.warmupTime} Hrs</p></div></div>
                    <div className="bg-white p-4 rounded border flex items-center gap-3 shadow-sm"><Sun className="text-yellow-500"/><div><p className="text-xs text-gray-400 font-bold uppercase">Solar Panels</p><p className="text-lg font-bold">{result.metrics.panelCount || 0}</p></div></div>
                </div>

                <table className="w-full text-sm bg-white border rounded overflow-hidden">
                    <tbody className="divide-y">
                        <tr className="bg-gray-50"><td className="p-3">Baseline Annual Cost</td><td className="p-3 text-right">{symbol}{fmt(result.financials.annualCostOld)}</td></tr>
                        <tr><td className="p-3">Heat Pump System (Capex)</td><td className="p-3 text-right">{symbol}{fmt(result.financials.capex.heatPump)}</td></tr>
                        {result.metrics.panelCount > 0 && <tr><td className="p-3">Solar + Inverter (Capex)</td><td className="p-3 text-right">{symbol}{fmt(result.financials.capex.solar + result.financials.capex.inverter)}</td></tr>}
                        <tr className="font-bold text-orange-600"><td className="p-3">Estimated Payback</td><td className="p-3 text-right">{result.financials.paybackYears} Years</td></tr>
                    </tbody>
                </table>

                <div className="flex justify-end gap-3 mt-6">
                    <Button onClick={generateReport} variant="secondary"><Printer size={18} className="mr-2"/> Report</Button>
                    <Button onClick={handleSave} variant="success" disabled={isSaving}><Save size={18} className="mr-2"/> Save</Button>
                </div>
            </div>
        )}

        {result?.error && <div className="mt-6 p-4 bg-red-50 text-red-600 rounded border border-red-200 text-sm italic">{result.error}</div>}

        {showModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white p-6 rounded-lg max-w-md w-full shadow-2xl">
                    <h3 className="text-lg font-bold mb-4">Estimate Water Use</h3>
                    <div className="space-y-4">
                        <Input label="Showers" type="number" value={fixtureInputs.showers} onChange={(e)=>setFixtureInputs(p=>({...p, showers:e.target.value}))} />
                        <Input label="Sinks" type="number" value={fixtureInputs.sinks} onChange={(e)=>setFixtureInputs(p=>({...p, sinks:e.target.value}))} />
                        <Input label="Lavatory Basins" type="number" value={fixtureInputs.basins} onChange={(e)=>setFixtureInputs(p=>({...p, basins:e.target.value}))} />
                    </div>
                    <div className="mt-6 flex justify-end gap-2"><Button onClick={()=>setShowModal(false)} variant="secondary">Cancel</Button><Button onClick={applyFixture} variant="primary">Apply</Button></div>
                </div>
            </div>
        )}
    </Card>
  );
};

export default HeatPumpCalculator;
