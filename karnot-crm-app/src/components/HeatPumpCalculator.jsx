import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; 
import { collection, getDocs } from 'firebase/firestore';
import { getAuth } from "firebase/auth";
import { calculateHeatPump, CONFIG } from '../utils/heatPumpLogic'; 
import { Card, Section, Input, Button } from '../data/constants.jsx'; 
import { 
  Calculator, RefreshCw, X, Printer, Sun, Zap, 
  TrendingUp, CheckCircle, Droplets, Snowflake, ShieldCheck 
} from 'lucide-react';

const HeatPumpCalculator = () => {
  // 1. Initial State
  const [inputs, setInputs] = useState({
    currency: 'PHP',
    userType: 'home',
    occupants: 4,
    dailyLitersInput: 500,
    mealsPerDay: 0,
    roomsOccupied: 0,
    hoursPerDay: 12,
    heatingType: 'electric',
    fuelPrice: 12.25,
    tankSize: 11,
    elecRate: 12.25,
    ambientTemp: 30,
    inletTemp: 15,
    targetTemp: 55,
    systemType: 'grid-solar',
    sunHours: 5.5,
    heatPumpType: 'all',
    includeCooling: false
  });

  const [dbProducts, setDbProducts] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFixtureModal, setShowFixtureModal] = useState(false);
  const [fixtures, setFixtures] = useState({ showers: 0, basins: 0, sinks: 0, people: 0, hours: 8 });

  // 2. Load Inventory from Firebase
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const auth = getAuth();
        if (!auth.currentUser) return;
        const snap = await getDocs(collection(db, "users", auth.currentUser.uid, "products"));
        setDbProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      } catch (err) {
        console.error("Inventory load failed:", err);
        setLoading(false);
      }
    };
    fetchInventory();
  }, []);

  // 3. Currency/Fuel Default Sync
  useEffect(() => {
    const defaults = CONFIG.defaultRate[inputs.currency];
    if (defaults) {
      setInputs(prev => ({
        ...prev,
        elecRate: defaults.grid,
        fuelPrice: inputs.heatingType === 'propane' ? defaults.lpgPrice : (inputs.heatingType === 'diesel' ? defaults.diesel : defaults.grid)
      }));
    }
  }, [inputs.currency, inputs.heatingType]);

  // 4. Real-time Calculation
  useEffect(() => {
    if (!loading && dbProducts.length > 0) {
      const calcResult = calculateHeatPump(inputs, dbProducts);
      setResult(calcResult);
    }
  }, [inputs, dbProducts, loading]);

  // 5. Fixture Estimator Logic
  const applyFixtures = () => {
    const total = Math.round(
      (50 * fixtures.showers * 0.4) + 
      (284 * fixtures.people * 0.15 * 0.25 * 0.4) + 
      (20 * fixtures.basins * 0.4) + 
      (114 * fixtures.sinks * 0.3 * fixtures.hours * 0.4)
    );
    setInputs(prev => ({ ...prev, dailyLitersInput: total, userType: 'office' }));
    setShowFixtureModal(false);
  };

  const fmt = n => (+n).toLocaleString(undefined, { maximumFractionDigits: 0 });
  const sym = CONFIG.SYMBOLS[inputs.currency];

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 min-h-screen bg-slate-50">
      
      {/* HEADER */}
      <div className="flex justify-between items-end border-b-4 border-orange-600 pb-6">
        <div>
          <h1 className="text-5xl font-black text-slate-900 italic tracking-tighter uppercase flex items-center gap-4">
            <Calculator size={48} className="text-orange-600" /> Karnot ROI
          </h1>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-2">Professional CRM Sizing & Savings Tool</p>
        </div>
        <div className="hidden md:block">
           <Button variant="outline" className="rounded-full px-8 border-2 font-black italic uppercase tracking-widest flex gap-2">
             <Printer size={18} /> Print Report
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: INPUTS */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="p-6 border-2 border-slate-200 shadow-xl bg-white rounded-[2rem]">
            <Section title="1. Demand Profile">
              <select 
                className="w-full p-4 border-2 rounded-2xl bg-slate-50 font-black text-slate-700 mb-4 outline-none focus:border-orange-500 transition-all"
                value={inputs.userType} 
                onChange={e => setInputs({...inputs, userType: e.target.value})}
              >
                <option value="home">Private Villa / Home</option>
                <option value="restaurant">Restaurant / F&B</option>
                <option value="resort">Hotel / Resort</option>
                <option value="office">Commercial Office</option>
              </select>

              {inputs.userType === 'home' && (
                <Input label="Number of Occupants" type="number" value={inputs.occupants} onChange={e => setInputs({...inputs, occupants: +e.target.value})} />
              )}
              {inputs.userType !== 'home' && (
                <div className="space-y-4">
                  <Input label="Liters Required / Day" type="number" value={inputs.dailyLitersInput} onChange={e => setInputs({...inputs, dailyLitersInput: +e.target.value})} />
                  <button 
                    onClick={() => setShowFixtureModal(true)}
                    className="flex items-center gap-2 text-[10px] font-black uppercase text-blue-600 underline tracking-widest italic"
                  >
                    <Droplets size={12}/> Use Fixture Profiler
                  </button>
                </div>
              )}
              <Input label="Operating Hours (per day)" type="number" value={inputs.hoursPerDay} onChange={e => setInputs({...inputs, hoursPerDay: +e.target.value})} />
            </Section>

            <Section title="2. Market & Costs">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <select className="p-4 border-2 rounded-2xl bg-white font-bold" value={inputs.currency} onChange={e => setInputs({...inputs, currency: e.target.value})}>
                  {Object.keys(CONFIG.FX).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select className="p-4 border-2 rounded-2xl bg-white font-bold" value={inputs.heatingType} onChange={e => setInputs({...inputs, heatingType: e.target.value})}>
                  <option value="electric">Electric</option>
                  <option value="propane">LPG / Gas</option>
                  <option value="diesel">Diesel</option>
                </select>
              </div>
              <Input label={`Current Fuel Rate (${sym})`} type="number" value={inputs.fuelPrice} onChange={e => setInputs({...inputs, fuelPrice: +e.target.value})} />
              <Input label={`Electric Rate (${sym}/kWh)`} type="number" value={inputs.elecRate} onChange={e => setInputs({...inputs, elecRate: +e.target.value})} />
            </Section>

            <Section title="3. Local Environment">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Air Temp °C" type="number" value={inputs.ambientTemp} onChange={e => setInputs({...inputs, ambientTemp: +e.target.value})} />
                <Input label="Target °C" type="number" value={inputs.targetTemp} onChange={e => setInputs({...inputs, targetTemp: +e.target.value})} />
              </div>
              <div className="mt-6 space-y-4">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Heat Pump Tech Selection</label>
                <select 
                  className="w-full p-4 border-2 rounded-2xl font-black bg-white" 
                  value={inputs.heatPumpType} 
                  onChange={e => setInputs({...inputs, heatPumpType: e.target.value})}
                >
                  <option value="all">⭐ Best Price Option</option>
                  <option value="R32">R32 Series (Efficient)</option>
                  <option value="R290">R290 Series (Propane / High Temp)</option>
                  <option value="CO2">CO2 Series (Extreme Performance)</option>
                </select>
                <label className="flex items-center gap-3 p-4 border-2 rounded-2xl cursor-pointer hover:bg-slate-50 transition-colors">
                  <input type="checkbox" className="w-5 h-5 accent-orange-600" checked={inputs.includeCooling} onChange={e => setInputs({...inputs, includeCooling: e.target.checked})} />
                  <span className="font-bold text-slate-700">Include Free Cooling</span>
                </label>
              </div>
            </Section>
          </Card>
        </div>

        {/* RIGHT COLUMN: RESULTS */}
        <div className="lg:col-span-8">
          {result && !result.error ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-10 duration-500">
              
              {/* HERO CARD */}
              <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden border-b-8 border-orange-600">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                  <div>
                    <div className="flex items-center gap-2 text-orange-500 font-black uppercase tracking-[0.3em] text-[10px] mb-2">
                       <ShieldCheck size={14} /> Karnot Certified Recommendation
                    </div>
                    <h2 className="text-5xl font-black italic tracking-tighter uppercase leading-none">{result.system.n}</h2>
                    <p className="text-slate-400 font-bold mt-2 uppercase tracking-widest text-sm">Category: {result.system.refrig} Refrigerant</p>
                  </div>
                  <div className="text-left md:text-right bg-white/5 p-6 rounded-3xl backdrop-blur-md border border-white/10">
                    <div className="text-6xl font-black text-green-400 tracking-tighter leading-none">{sym}{fmt(result.financials.totalSavings)}</div>
                    <p className="text-slate-300 font-black uppercase text-[10px] tracking-[0.2em] mt-2">Estimated Annual Savings</p>
                  </div>
                </div>
              </div>

              {/* METRIC GRID */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <ResultCard icon={<TrendingUp size={32} className="text-orange-500"/>} label="ROI Payback" value={`${result.financials.paybackYears} Yrs`} />
                <ResultCard icon={<Sun size={32} className="text-amber-500"/>} label="Solar Offset" value={`${result.metrics.panelCount} Panels`} />
                <ResultCard icon={<Zap size={32} className="text-blue-500"/>} label="Avg Power Draw" value={`${result.metrics.powerKW} kW`} />
                <ResultCard icon={<CheckCircle size={32} className="text-green-500"/>} label="Carbon Saved" value={`${fmt(result.metrics.co2Saved)} kg`} />
              </div>

              {/* DETAILED BREAKDOWN */}
              <div className="bg-white rounded-[2.5rem] border-2 border-slate-200 p-10 shadow-sm">
                 <h3 className="font-black text-slate-300 uppercase tracking-[0.2em] text-xs border-b pb-4 mb-6">Investment & Operational Breakdown</h3>
                 <div className="space-y-4">
                    <DetailRow label="Baseline Annual Cost (Current System)" value={`${sym}${fmt(result.financials.annualCostOld)}`} />
                    <DetailRow label="New Operational Cost (Karnot)" value={`${sym}${fmt(result.financials.karnotAnnualCost)}`} isGreen />
                    {result.financials.coolSavings > 0 && (
                      <DetailRow label="Value of Free Cooling (Offset)" value={`${sym}${fmt(result.financials.coolSavings)}`} isGreen />
                    )}
                    <div className="pt-6 border-t-2 border-slate-100 mt-6">
                       <div className="flex justify-between items-end">
                          <div>
                            <p className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Total Estimated System Capex</p>
                            <p className="text-3xl font-black text-slate-900 uppercase">Project Investment</p>
                          </div>
                          <div className="text-4xl font-black text-orange-600 tracking-tighter">
                            {sym}{fmt(result.financials.capex.total)}
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center border-4 border-dashed border-slate-200 rounded-[3rem] p-20 text-center">
               <div>
                <RefreshCw size={64} className="mx-auto text-slate-200 animate-spin-slow mb-6" />
                <h3 className="text-2xl font-black text-slate-300 uppercase italic tracking-tighter">
                  {result?.error || "Adjust inputs to generate ROI"}
                </h3>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* FIXTURE MODAL */}
      {showFixtureModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] p-10 max-w-xl w-full shadow-2xl relative border-2 border-orange-500">
            <button onClick={() => setShowFixtureModal(false)} className="absolute top-8 right-8 text-slate-300 hover:text-orange-600 transition-colors">
              <X size={32} />
            </button>
            <div className="text-center mb-8">
              <Droplets size={48} className="mx-auto text-blue-500 mb-4" />
              <h3 className="text-3xl font-black uppercase italic tracking-tighter">Demand Profiler</h3>
              <p className="text-slate-400 font-bold text-sm">Estimate water usage based on building fixtures</p>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <Input label="Showers" type="number" value={fixtures.showers} onChange={e => setFixtures({...fixtures, showers: +e.target.value})} />
              <Input label="Kitchen Sinks" type="number" value={fixtures.sinks} onChange={e => setFixtures({...fixtures, sinks: +e.target.value})} />
              <Input label="Wash Basins" type="number" value={fixtures.basins} onChange={e => setFixtures({...fixtures, basins: +e.target.value})} />
              <Input label="Occupancy" type="number" value={fixtures.people} onChange={e => setFixtures({...fixtures, people: +e.target.value})} />
            </div>
            <Button onClick={applyFixtures} className="w-full mt-8 py-5 rounded-2xl bg-orange-600 font-black uppercase italic tracking-widest text-white shadow-xl">
              Calculate & Apply
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// HELPER COMPONENTS
const ResultCard = ({ icon, label, value }) => (
  <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm text-center flex flex-col items-center hover:scale-105 transition-transform duration-300">
    <div className="mb-4 bg-slate-50 p-4 rounded-full">{icon}</div>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
    <p className="text-2xl font-black text-slate-900">{value}</p>
  </div>
);

const DetailRow = ({ label, value, isGreen = false }) => (
  <div className="flex justify-between items-center py-2 border-b border-slate-50">
    <span className="font-bold text-slate-500 text-sm">{label}</span>
    <span className={`font-black text-lg ${isGreen ? 'text-green-600' : 'text-slate-800'}`}>{value}</span>
  </div>
);

export default HeatPumpCalculator;
