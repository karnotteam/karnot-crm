import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from "firebase/auth";
import { calculateHeatPump, CONFIG } from '../utils/heatPumpLogic';
import { Card, Section, Input, Button } from '../data/constants';
import { 
  Calculator, Printer, Sun, Zap, TrendingUp, CheckCircle, 
  Droplets, Snowflake, X, Thermometer, Box, Package, Filter, User, Building, Save
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
    customerName: '', companyName: '',
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

  const handleSaveToLead = async () => {
    const auth = getAuth();
    if (!auth.currentUser || !result) return;
    try {
      await addDoc(collection(db, "users", auth.currentUser.uid, "leads"), {
        ...inputs,
        recommendation: result.system.n,
        annualSavings: result.financials.totalSavings,
        payback: result.financials.paybackYears,
        capex: result.financials.capex,
        timestamp: serverTimestamp()
      });
      alert("ROI saved to Leads!");
    } catch (e) { alert("Error: " + e.message); }
  };

  const handlePrint = () => {
    if (!result) return;
    const win = window.open('', '_blank');
    win.document.write(`<html><body style="font-family:sans-serif;padding:50px;">
      <h1>Karnot Professional ROI Report</h1>
      <p>Client: ${inputs.customerName} | Company: ${inputs.companyName}</p><hr>
      <h2>Recommended: ${result.system.n}</h2>
      <h3>Annual Savings: ${result.financials.symbol}${result.financials.totalSavings.toLocaleString()}</h3>
      <p>Investment: ${result.financials.symbol}${result.financials.capex.toLocaleString()}</p>
      </body></html>`);
    win.document.close();
    win.print();
  };

  const fmt = n => (+n).toLocaleString(undefined, { maximumFractionDigits: 0 });
  const sym = CONFIG.SYMBOLS[inputs.currency];

  return (
    <div className="w-full pb-20 space-y-10">
      <div className="flex flex-wrap gap-4 mb-8">
        <StatBadge icon={Filter} label="Inventory" count={dbProducts.length} color="gray" active={activeCategory === 'ALL'} onClick={() => setActiveCategory('ALL')} />
        {Object.keys(CATEGORY_MAP).map(cat => (
          <StatBadge key={cat} icon={CATEGORY_MAP[cat].icon} label={cat} count={dbProducts.filter(p => p.category === cat).length} color={CATEGORY_MAP[cat].color} active={activeCategory === cat} onClick={() => setActiveCategory(cat)} />
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
        <div className="w-full lg:w-[400px] space-y-8">
          <Card className="p-8 shadow-2xl border-none bg-white rounded-[2.5rem]">
            <Section title="Lead Details">
              <div className="space-y-4">
                <Input label="Customer Name" value={inputs.customerName} onChange={e=>setInputs({...inputs, customerName: e.target.value})} icon={<User size={16}/>} />
                <Input label="Company Name" value={inputs.companyName} onChange={e=>setInputs({...inputs, companyName: e.target.value})} icon={<Building size={16}/>} />
              </div>
            </Section>

            <Section title="1. Demand Profile">
              <select className="w-full p-4 border-2 border-slate-100 rounded-2xl font-black bg-slate-50 mb-6 outline-none focus:border-orange-500" value={inputs.userType} onChange={e=>setInputs({...inputs, userType: e.target.value})}>
                <option value="home">Residential Villa</option>
                <option value="restaurant">Restaurant / Café</option>
                <option value="resort">Hotel / Resort</option>
                <option value="commercial">Commercial / Office</option>
              </select>
              <div className="space-y-4">
                {(inputs.userType === 'restaurant' || inputs.userType === 'resort') && <Input label="Average Meals / Day" type="number" value={inputs.mealsPerDay} onChange={e=>setInputs({...inputs, mealsPerDay: +e.target.value})} />}
                {inputs.userType === 'home' && <Input label="Occupants" type="number" value={inputs.occupants} onChange={e=>setInputs({...inputs, occupants: +e.target.value})} />}
                <Input label="Operating Hours/Day" type="number" value={inputs.hoursPerDay} onChange={e=>setInputs({...inputs, hoursPerDay: +e.target.value})} />
              </div>
            </Section>

            <Section title="2. Market Rates">
              <div className="flex gap-2 mb-6">
                <select className="flex-1 p-3 border rounded-xl font-bold" value={inputs.currency} onChange={e=>setInputs({...inputs, currency: e.target.value})}>
                  {Object.keys(CONFIG.FX).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select className="flex-1 p-3 border rounded-xl font-bold" value={inputs.heatingType} onChange={e=>setInputs({...inputs, heatingType: e.target.value})}>
                  <option value="electric">Electric</option>
                  <option value="propane">Propane (LPG)</option>
                </select>
              </div>
              <Input label="Fuel/Energy Price" type="number" value={inputs.fuelPrice} onChange={e=>setInputs({...inputs, fuelPrice: +e.target.value})} />
            </Section>
          </Card>
          <div className="space-y-4">
            <Button onClick={handleSaveToLead} className="w-full py-5 bg-green-600 text-white flex justify-center gap-3 shadow-xl hover:scale-105 transition-transform"><Save size={20}/> Save result to Lead</Button>
            <Button onClick={handlePrint} variant="secondary" className="w-full py-5 flex justify-center gap-3 shadow-xl hover:scale-105 transition-transform"><Printer size={20} /> Export Quote PDF</Button>
          </div>
        </div>

        <div className="flex-1 space-y-10">
          {result && !result.error ? (
            <div className="animate-in fade-in slide-in-from-right duration-500 space-y-10">
              <div className="bg-[#101827] rounded-[3.5rem] p-12 text-white shadow-2xl relative overflow-hidden border-b-[15px] border-[#F56600]">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-10">
                  <div className="space-y-6">
                    <div className="bg-[#F56600] inline-block px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] italic text-white">Karnot Certified Recommendation</div>
                    <h2 className="text-6xl font-black italic uppercase tracking-tighter leading-[0.9] max-w-sm">{result.system.n}</h2>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">For: {inputs.customerName || 'Lead'}</p>
                  </div>
                  <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-10 text-center min-w-[320px] shadow-inner">
                    <div className="text-7xl font-black text-[#4ade80] drop-shadow-[0_0_25px_rgba(74,222,128,0.4)] tracking-tighter leading-none">{result.financials.symbol}${Math.round(result.financials.totalSavings).toLocaleString()}</div>
                    <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] mt-4">Projected Annual Savings</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <MetricBox icon={<TrendingUp className="text-orange-500"/>} label="ROI Payback" value={`${result.financials.paybackYears} Yrs`} />
                <MetricBox icon={<Zap className="text-blue-500"/>} label="Power KW" value={`${result.metrics.powerKW}`} />
                <MetricBox icon={<Sun className="text-amber-500"/>} label="Solar Support" value={`${result.metrics.panelCount} Panels`} />
                <MetricBox icon={<CheckCircle className="text-green-500"/>} label="CO2 Reduction" value={`${result.metrics.co2Saved} kg`} />
              </div>
            </div>
          ) : (
            <div className="h-[500px] border-8 border-dashed border-slate-200 rounded-[4rem] flex items-center justify-center p-20 text-slate-300 font-black uppercase italic tracking-tighter text-3xl opacity-50">Adjust inputs to calculate</div>
          )}
        </div>
      </div>

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
            <Button onClick={()=>{
                const total = Math.round((50 * fixtures.showers * 0.4) + (284 * fixtures.people * 0.15 * 0.25 * 0.4) + (20 * fixtures.basins * 0.4) + (114 * fixtures.sinks * 0.3 * fixtures.hours * 0.4));
                setInputs({...inputs, dailyLitersInput: total, userType: 'commercial'});
                setShowModal(false);
            }} className="w-full mt-12 py-6 bg-[#F56600] rounded-3xl font-black uppercase italic text-white text-xl shadow-2xl">Apply Demand Settings</Button>
          </div>
        </div>
      )}
    </div>
  );
};

const MetricBox = ({ icon, label, value }) => (
  <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-50 shadow-sm text-center flex flex-col items-center hover:scale-105 transition-all duration-300 group">
    <div className="mb-4 bg-slate-50 p-4 rounded-full group-hover:bg-slate-100 transition-colors">{icon}</div>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
    <p className="text-3xl font-black text-slate-800 tracking-tighter leading-none">{value}</p>
  </div>
);

export default HeatPumpCalculator;
