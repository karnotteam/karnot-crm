import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { getAuth } from "firebase/auth";
import { calculateHeatPump, CONFIG } from '../utils/heatPumpLogic';
import { Card, Section, Input, Button } from '../data/constants';
import { 
  Calculator, Printer, Sun, Zap, TrendingUp, CheckCircle, 
  Droplets, Snowflake, X, Thermometer, Box, Package, Filter, Fuel
} from 'lucide-react';

const CATEGORY_MAP = {
  'Heat Pump': { icon: Thermometer, color: 'orange' },
  'iCOOL CO2 Refrigeration': { icon: Box, color: 'purple' },
  'iSTOR Storage (non-PCM)': { icon: Package, color: 'teal' },
};

const StatBadge = ({ icon: Icon, label, count, color, active, onClick }) => (
  <div onClick={onClick} className={`cursor-pointer flex-1 min-w-[200px] p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 ${active ? `bg-${color}-100 border-${color}-500 ring-2 ring-${color}-400` : 'bg-white border-gray-200 hover:border-orange-300 hover:shadow-md'}`}>
    <div className={`p-2 rounded-full bg-${color}-100 text-${color}-600`}><Icon size={20} /></div>
    <div className="text-right">
      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{label}</p>
      <p className="text-lg font-black text-gray-800">{count}</p>
    </div>
  </div>
);

const HeatPumpCalculator = () => {
  const [inputs, setInputs] = useState({
    currency: 'PHP', userType: 'restaurant', occupants: 4, dailyLitersInput: 500, mealsPerDay: 200,
    roomsOccupied: 0, hoursPerDay: 12, heatingType: 'electric', fuelPrice: 12.25, tankSize: 11,
    elecRate: 12.25, ambientTemp: 30, inletTemp: 15, targetTemp: 55, systemType: 'grid-solar',
    sunHours: 5.5, heatPumpType: 'all', includeCooling: false
  });

  const [dbProducts, setDbProducts] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('Heat Pump');
  const [showModal, setShowModal] = useState(false);
  const [fixtures, setFixtures] = useState({ showers: 0, basins: 0, sinks: 0, people: 0, hours: 8 });

  useEffect(() => {
    const auth = getAuth();
    if (!auth.currentUser) return;
    const unsub = onSnapshot(collection(db, "users", auth.currentUser.uid, "products"), (snap) => {
      setDbProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredInventory = useMemo(() => {
    return dbProducts.filter(p => p.category === activeCategory || activeCategory === 'ALL');
  }, [dbProducts, activeCategory]);

  useEffect(() => {
    if (!loading && filteredInventory.length > 0) {
      setResult(calculateHeatPump(inputs, filteredInventory));
    }
  }, [inputs, filteredInventory, loading]);

  const applyFixtures = () => {
    const total = Math.round((50 * fixtures.showers * 0.4) + (284 * fixtures.people * 0.15 * 0.25 * 0.4) + (20 * fixtures.basins * 0.4) + (114 * fixtures.sinks * 0.3 * fixtures.hours * 0.4));
    setInputs({...inputs, dailyLitersInput: total, userType: 'commercial'});
    setShowModal(false);
  };

  const fmt = n => (+n).toLocaleString(undefined, { maximumFractionDigits: 0 });
  const sym = CONFIG.SYMBOLS[inputs.currency];

  return (
    <div className="w-full pb-20 space-y-10">
      {/* 📊 SYNCED STAT BADGES */}
      <div className="flex flex-wrap gap-4">
        <StatBadge icon={Filter} label="Total Inventory" count={dbProducts.length} color="gray" active={activeCategory === 'ALL'} onClick={() => setActiveCategory('ALL')} />
        {Object.keys(CATEGORY_MAP).map(cat => (
          <StatBadge key={cat} icon={CATEGORY_MAP[cat].icon} label={cat} count={dbProducts.filter(p => p.category === cat).length} color={CATEGORY_MAP[cat].color} active={activeCategory === cat} onClick={() => setActiveCategory(cat)} />
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
        {/* 🛠 INPUT SIDEBAR */}
        <div className="w-full lg:w-[400px] space-y-8">
          <Card className="p-8 shadow-2xl border-none bg-white rounded-[2.5rem]">
            <Section title="1. Demand Profile">
              <select className="w-full p-4 border-2 border-slate-100 rounded-2xl font-black bg-slate-50 mb-6 outline-none focus:border-orange-500 transition-all" value={inputs.userType} onChange={e=>setInputs({...inputs, userType: e.target.value})}>
                <option value="home">Residential Villa</option>
                <option value="restaurant">Restaurant / Café</option>
                <option value="resort">Hotel / Resort</option>
                <option value="commercial">Commercial / Office</option>
              </select>
              <div className="space-y-4">
                {inputs.userType === 'home' && <Input label="Occupants" type="number" value={inputs.occupants} onChange={e=>setInputs({...inputs, occupants: +e.target.value})} />}
                {(inputs.userType === 'restaurant' || inputs.userType === 'resort') && <Input label="Meals Served / Day" type="number" value={inputs.mealsPerDay} onChange={e=>setInputs({...inputs, mealsPerDay: +e.target.value})} />}
                {inputs.userType === 'resort' && <Input label="Rooms Occupied" type="number" value={inputs.roomsOccupied} onChange={e=>setInputs({...inputs, roomsOccupied: +e.target.value})} />}
                {inputs.userType === 'commercial' && (
                  <div>
                    <Input label="Liters / Day" type="number" value={inputs.dailyLitersInput} onChange={e=>setInputs({...inputs, dailyLitersInput: +e.target.value})} />
                    <button onClick={()=>setShowModal(true)} className="text-[10px] font-black text-blue-600 underline mt-2 uppercase tracking-widest italic">Estimate via Fixtures</button>
                  </div>
                )}
                <Input label="Operating Hours/Day" type="number" value={inputs.hoursPerDay} onChange={e=>setInputs({...inputs, hoursPerDay: +e.target.value})} />
              </div>
            </Section>

            <Section title="2. Market & Conditions">
              <div className="flex gap-2 mb-6">
                <select className="flex-1 p-3 border rounded-xl font-bold" value={inputs.currency} onChange={e=>setInputs({...inputs, currency: e.target.value})}>
                  {Object.keys(CONFIG.FX).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select className="flex-1 p-3 border rounded-xl font-bold" value={inputs.heatingType} onChange={e=>setInputs({...inputs, heatingType: e.target.value})}>
                  <option value="electric">Electric</option>
                  <option value="propane">Propane (LPG)</option>
                  <option value="diesel">Diesel Fuel</option>
                </select>
              </div>
              <Input label="Fuel/Electric Price" type="number" value={inputs.fuelPrice} onChange={e=>setInputs({...inputs, fuelPrice: +e.target.value})} />
              {inputs.heatingType === 'propane' && <Input label="Tank Size (kg)" type="number" value={inputs.tankSize} onChange={e=>setInputs({...inputs, tankSize: +e.target.value})} />}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <Input label="Air Temp °C" type="number" value={inputs.ambientTemp} onChange={e=>setInputs({...inputs, ambientTemp: +e.target.value})} />
                <Input label="Target °C" type="number" value={inputs.targetTemp} onChange={e=>setInputs({...inputs, targetTemp: +e.target.value})} />
              </div>
            </Section>

            <label className="flex items-center gap-4 p-5 bg-orange-50 rounded-2xl cursor-pointer border-2 border-orange-100 mt-6 transition-all group">
              <input type="checkbox" className="w-6 h-6 accent-orange-600" checked={inputs.includeCooling} onChange={e=>setInputs({...inputs, includeCooling: e.target.checked})} />
              <span className="font-black text-orange-700 uppercase tracking-tighter italic">Enable Free Cooling Output</span>
            </label>
          </Card>
          <Button onClick={() => window.print()} variant="secondary" className="w-full py-5 shadow-xl flex justify-center gap-3"><Printer size={20} /> Generate Professional Report</Button>
        </div>

        {/* 🚀 SCREENSHOT-STYLE RESULTS */}
        <div className="flex-1 space-y-10">
          {result && !result.error ? (
            <div className="animate-in fade-in slide-in-from-right duration-500 space-y-10">
              {/* HERO DARK CARD */}
              <div className="bg-[#101827] rounded-[3.5rem] p-12 text-white shadow-2xl relative overflow-hidden border-b-[15px] border-[#F56600]">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-10">
                  <div className="space-y-6">
                    <div className="bg-[#F56600] inline-block px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] italic">Karnot Certified Recommendation</div>
                    <h2 className="text-6xl font-black italic uppercase tracking-tighter leading-[0.9] max-w-sm">{result.system.n}</h2>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Technology: {result.system.refrig} Refrigerant System</p>
                  </div>
                  <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-10 min-w-[320px] text-center shadow-inner relative">
                    <div className="text-7xl font-black text-[#4ade80] drop-shadow-[0_0_25px_rgba(74,222,128,0.4)] tracking-tighter leading-none">{sym}{fmt(result.financials.totalSavings)}</div>
                    <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] mt-4">Projected Annual Savings</p>
                  </div>
                </div>
                <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-[#F56600]/10 blur-[120px] rounded-full"></div>
              </div>

              {/* KPI GRID */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <MetricBox icon={<TrendingUp className="text-orange-500"/>} label="ROI Payback" value={`${result.financials.paybackYears} Yrs`} />
                <MetricBox icon={<Zap className="text-blue-500"/>} label="Power KW" value={`${result.metrics.powerKW}`} />
                <MetricBox icon={<Sun className="text-amber-500"/>} label="Solar Support" value={`${result.metrics.panelCount} Panels`} />
                <MetricBox icon={<CheckCircle className="text-green-500"/>} label="CO2 Reduction" value={`${fmt(result.metrics.co2Saved)} kg`} />
              </div>

              <Card className="p-10 rounded-[3rem]">
                <div className="flex justify-between items-end border-t-4 border-slate-50 pt-8 mt-4">
                  <div>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Total Project Capex</p>
                    <h4 className="text-4xl font-black uppercase tracking-tighter italic text-slate-900">Estimated Investment</h4>
                  </div>
                  <div className="text-5xl font-black text-[#F56600] tracking-tighter">{sym}{fmt(result.financials.capex)}</div>
                </div>
              </Card>
            </div>
          ) : (
            <div className="h-[500px] border-8 border-dashed border-slate-200 rounded-[4rem] flex flex-col items-center justify-center p-20 text-center opacity-40">
              <h3 className="text-3xl font-black text-slate-300 uppercase italic tracking-tighter">{result?.error || "Adjust inputs to see ROI report"}</h3>
            </div>
          )}
        </div>
      </div>

      {/* FIXTURE ESTIMATOR MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[999] flex items-center justify-center p-6">
          <div className="bg-white p-16 rounded-[4rem] max-w-2xl w-full relative shadow-2xl border-4 border-[#F56600]">
            <button onClick={() => setShowModal(false)} className="absolute top-12 right-12 text-slate-300 hover:text-[#F56600] transition-all"><X size={48} /></button>
            <div className="text-center mb-12">
              <Droplets className="mx-auto mb-6 text-blue-500" size={80} />
              <h3 className="text-5xl font-black uppercase italic tracking-tighter">Demand Profiler</h3>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <Input label="Showers" type="number" value={fixtures.showers} onChange={e=>setFixtures({...fixtures, showers: +e.target.value})} />
              <Input label="Sinks" type="number" value={fixtures.sinks} onChange={e=>setFixtures({...fixtures, sinks: +e.target.value})} />
              <Input label="Occupants" type="number" value={fixtures.people} onChange={e=>setFixtures({...fixtures, people: +e.target.value})} />
              <Input label="Basins" type="number" value={fixtures.basins} onChange={e=>setFixtures({...fixtures, basins: +e.target.value})} />
            </div>
            <Button onClick={applyFixtures} className="w-full mt-12 py-6 bg-[#F56600] rounded-3xl font-black uppercase italic text-white text-xl tracking-widest shadow-2xl">Apply Demand Settings</Button>
          </div>
        </div>
      )}
    </div>
  );
};

const MetricBox = ({ icon, label, value }) => (
  <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-50 shadow-sm text-center flex flex-col items-center hover:scale-105 transition-all">
    <div className="mb-4 bg-slate-50 p-4 rounded-full">{icon}</div>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
    <p className="text-3xl font-black text-slate-800 tracking-tighter">{value}</p>
  </div>
);

export default HeatPumpCalculator;
