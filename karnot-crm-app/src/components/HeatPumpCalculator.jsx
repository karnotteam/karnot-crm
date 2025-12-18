import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; 
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from "firebase/auth";
import { calculateHeatPump, CONFIG } from '../utils/heatPumpLogic'; 
import { Card, Section, Input, Button } from '../data/constants.jsx'; 
import { Save, Calculator, RefreshCw, Printer, X, Check, Droplets, Gauge } from 'lucide-react';

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

  // CRITICAL FIX: Guard against undefined SYMBOLS 
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

  // Force recalculation when inputs or products change
  useEffect(() => {
    if (!loading && dbProducts.length > 0) {
        const res = calculateHeatPump(inputs, dbProducts);
        setResult(res);
    }
  }, [inputs, dbProducts, loading]);

  const handleChange = (field, isNumber = false) => (e) => {
    const val = isNumber ? parseFloat(e.target.value) || 0 : e.target.value;
    setInputs(prev => ({ ...prev, [field]: val }));
  };

  const applyFixtureCalc = () => {
      const { showers, basins, sinks, people, hours } = fixtureInputs;
      const liters = Math.round((50*showers*0.4) + (284*people*0.015) + (20*basins*0.4) + (114*sinks*0.3*hours*0.4));
      setInputs(prev => ({ ...prev, dailyLitersInput: liters }));
      setShowModal(false);
  };

  if (loading) return <div className="p-10 text-center"><RefreshCw className="animate-spin inline mr-2"/> Synchronizing Inventory...</div>;

  return (
    <Card>
        <div className="flex justify-between items-center mb-6 border-b pb-4">
            <h2 className="text-2xl font-bold text-orange-600 flex items-center gap-2"><Calculator/> ROI Calculator</h2>
            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">{dbProducts.length} Products Active</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Section title="1. Demand">
                <select className="w-full border p-2 rounded mb-4" value={inputs.userType} onChange={handleChange('userType')}>
                    <option value="home">Home (150L iSTOR)</option>
                    <option value="restaurant">Restaurant</option>
                    <option value="resort">Hotels</option>
                </select>
                <Input label="Liters / Day" type="number" value={inputs.dailyLitersInput} onChange={handleChange('dailyLitersInput', true)} disabled={inputs.userType === 'home'} />
                <button onClick={() => setShowModal(true)} className="text-xs text-blue-600 underline">Estimate Fixtures</button>
            </Section>

            <Section title="2. Costs">
                <select className="w-full border p-2 rounded mb-4" value={inputs.currency} onChange={handleChange('currency')}>
                    {Object.keys(CONFIG.FX).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <Input label={`Fuel Rate (${symbol})`} type="number" value={inputs.fuelPrice} onChange={handleChange('fuelPrice', true)} />
                <Input label={`Grid Rate (${symbol})`} type="number" value={inputs.elecRate} onChange={handleChange('elecRate', true)} />
            </Section>

            <Section title="3. Conditions">
                <Input label="Inlet Temp °C" type="number" value={inputs.inletTemp} onChange={handleChange('inletTemp', true)} />
                <Input label="Target Temp °C" type="number" value={inputs.targetTemp} onChange={handleChange('targetTemp', true)} />
            </Section>
        </div>

        {/* RESULTS AREA [cite: 1, 4] */}
        {result && !result.error && result.financials && (
            <div className="mt-8 bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-inner">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-orange-600">{result.system.n}</h3>
                        <p className="text-sm text-gray-500 uppercase font-bold tracking-widest">Ref: {result.system.ref}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold text-green-600">{symbol}{(result.financials.totalSavings || 0).toLocaleString()}</div>
                        <p className="text-xs font-bold text-gray-400 uppercase">Annual Savings</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-lg border flex items-center gap-3">
                        <Droplets className="text-blue-500"/>
                        <div><p className="text-xs text-gray-400 font-bold uppercase">Tank Size</p><p className="text-lg font-bold">{result.system.tankSize} Liters</p></div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border flex items-center gap-3">
                        <Gauge className="text-orange-500"/>
                        <div><p className="text-xs text-gray-400 font-bold uppercase">Warm-up Time</p><p className="text-lg font-bold">{result.metrics.warmupTime} Hours</p></div>
                    </div>
                </div>
            </div>
        )}

        {result?.error && <div className="mt-6 p-4 bg-red-50 text-red-600 rounded border border-red-200 text-sm italic">{result.error}</div>}

        {showModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white p-6 rounded-lg max-w-md w-full shadow-2xl">
                    <h3 className="text-lg font-bold mb-4">Hot Water Fixtures</h3>
                    <div className="space-y-4">
                        <Input label="Showers" type="number" value={fixtureInputs.showers} onChange={(e)=>setFixtureInputs(p=>({...p, showers:e.target.value}))} />
                        <Input label="Kitchen Sinks" type="number" value={fixtureInputs.sinks} onChange={(e)=>setFixtureInputs(p=>({...p, sinks:e.target.value}))} />
                        <Input label="Basins" type="number" value={fixtureInputs.basins} onChange={(e)=>setFixtureInputs(p=>({...p, basins:e.target.value}))} />
                    </div>
                    <div className="mt-6 flex justify-end gap-2"><Button onClick={()=>setShowModal(false)} variant="secondary">Cancel</Button><Button onClick={applyFixtureCalc} variant="primary">Apply</Button></div>
                </div>
            </div>
        )}
    </Card>
  );
};

export default HeatPumpCalculator;
