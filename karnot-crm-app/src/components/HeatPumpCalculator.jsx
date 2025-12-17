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

// Consistently Named Categories matching your Product Manager
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
  // 1. Full State Initialization
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

  // 2. Real-time Firebase Inventory Sync
  useEffect(() => {
    const auth = getAuth();
    if (!auth.currentUser) return;
    const unsub = onSnapshot(collection(db, "users", auth.currentUser.uid, "products"), (snap) => {
      setDbProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // 3. Category Filtering
  const filteredInventory = useMemo(() => {
    return dbProducts.filter(p => p.category === activeCategory || activeCategory === 'ALL');
  }, [dbProducts, activeCategory]);

  // 4. Real-time ROI Calculation
  useEffect(() => {
    if (!loading && filteredInventory.length > 0) {
      setResult(calculateHeatPump(inputs, filteredInventory));
    }
  }, [inputs, filteredInventory, loading]);

  // 5. Firebase Persistence
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
      alert("Successfully saved to Leads!");
    } catch (e) { alert("Error: " + e.message); }
  };

  // 6. Professional PDF Generation
  const handlePrint = () => {
    if (!result) return;
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Karnot ROI Report</title>
      <style>
        body { font-family: sans-serif; padding: 50px; color: #1d1d1f; }
        .header { border-bottom: 5px solid #F56600; padding-bottom: 20px; margin-bottom: 40px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
        .val { font-size: 32px; font-weight: 900; color: #F56600; margin-top: 10px; }
        table { width: 100%; margin-top: 40px; border-collapse: collapse; }
        td { padding: 15px; border-bottom: 1px solid #ddd; }
      </style></head><body>
      <div class="header">
        <h1>Karnot Savings & ROI Report</h1>
        <p>Lead: <strong>${inputs.customerName || 'N/A'}</strong> | Company: <strong>${inputs.companyName || 'N/A'}</strong></p>
      </div>
      <h2>System Recommendation: ${result.system.n}</h2>
      <div class="grid">
        <div style="background:#f4f4f7;padding:20px;border-radius:15px;">Annual Savings<div class="val">${result.financials.symbol}${result.financials.totalSavings.toLocaleString()}</div></div>
        <div style="background:#f4f4f7;padding:20px;border-radius:15px;">ROI Payback<div class="val">${result.financials.paybackYears} Years</div></div>
      </div>
      <table>
        <tr><td>Daily Hot Water Load</td><td>${result.metrics.dailyLiters} Liters</td></tr>
        <tr><td>Solar Offset Setup</td><td>${result.metrics.panelCount} Panels</td></tr>
        <tr><td>Investment Capex</td><td><strong>${result.financials.symbol}${result.financials.capex.toLocaleString()}</strong></td></tr>
      </table>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  const sym = CONFIG.SYMBOLS[inputs.currency];

  return (
    <div className="w-full pb-20 space-y-10 font-sans">
      
      {/* 📊 CATEGORY SELECTOR BADGES */}
      <div className="flex flex-wrap gap-4 mb-8">
        <StatBadge icon={Filter} label="All Hardware" count={dbProducts.length} color="gray" active={activeCategory === 'ALL'} onClick={() => setActiveCategory('ALL')} />
        {Object.keys(CATEGORY_MAP).map(cat => (
          <StatBadge key={cat} icon={CATEGORY_MAP[cat].icon} label={cat} count={dbProducts.filter(p => p.category === cat).length} color={CATEGORY_MAP[cat].color} active={activeCategory === cat} onClick={() => setActiveCategory(cat)} />
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
        
        {/* 🛠 INPUT SIDEBAR (Matched to Screenshot Sidebar) */}
        <div className="w-full lg:w-[400px] space-y-8">
          <Card className="p-8 shadow-2xl border-none bg-white rounded-[2.5rem]">
            
            <Section title="Lead Details">
              <div className="space-y-4">
                <Input label="Customer Name" value={inputs.customerName} onChange={e=>setInputs({...inputs, customerName: e.target.value})} icon={<User size={16}/>} />
                <Input label="Company Name" value={inputs.companyName} onChange={e=>setInputs({...inputs, companyName: e.target.value})} icon={<Building size={16}/>} />
              </div>
            </Section>

            <Section title="Step 1: Water Demand">
              <select className="w-full p-4 border-2 border-slate-100 rounded-2xl font-black bg-slate-50 mb-6 outline-none focus:border-orange-500 transition-all" value={inputs.userType} onChange={e=>setInputs({...inputs, userType: e.target.value})}>
                <option value="home">Residential Villa</option>
                <option value="restaurant">Restaurant / Café</option>
                <option value="resort">Hotel / Resort</option>
                <option value="office">Commercial / Office</option>
              </select>
              
              <div className="space-y-4">
                {inputs.userType === 'restaurant' && <Input label="Average Meals / Day" type="number" value={inputs.mealsPerDay} onChange={e=>setInputs({...inputs, mealsPerDay: +e.target.value})} />}
                {inputs.userType === 'home' && <Input label="Occupants" type="number" value={inputs.occupants} onChange={e=>setInputs({...inputs, occupants: +e.target.value})} />}
                {inputs.userType === 'office' && (
                  <div>
                    <Input label="Liters / Day" type="number" value={inputs.dailyLitersInput} onChange={e=>setInputs({...inputs, dailyLitersInput: +e.target.value})} />
                    <button onClick={()=>setShowModal(true)} className="text-[10px] font-bold text-blue-600 underline mt-2 uppercase tracking-widest italic">Estimate via Fixtures</button>
                  </div>
                )}
                <Input label="Operating Hours/Day" type="number" value={inputs.hoursPerDay} onChange={e=>setInputs({...inputs, hoursPerDay: +e.target.value})} />
              </div>
            </Section>

            <Section title="Step 2: Market Rates">
              <div className="flex gap-2 mb-6">
                <select className="flex-1 p-3 border rounded-xl font-bold" value={inputs.currency} onChange={e=>setInputs({...inputs, currency: e.target.value})}>
                  {Object.keys(CONFIG.FX).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select className="flex-1 p-3 border rounded-xl font-bold" value={inputs.heatingType} onChange={e=>setInputs({...inputs, heatingType: e.target.value})}>
                  <option value="electric">Electric</option>
                  <option value="propane">Propane (LPG)</option>
                  <option value="diesel">Diesel</option>
                </select>
              </div>
              <Input label="Unit Price" type="number" value={inputs.fuelPrice} onChange={e=>setInputs({...inputs, fuelPrice: +e.target.value})} />
              {inputs.heatingType === 'propane' && <Input label="Tank Size (kg)" type="number" value={inputs.tankSize} onChange={e=>setInputs({...inputs, tankSize: +e.target.value})} />}
            </Section>
          </Card>

          <div className="space-y-4">
             <Button onClick={handleSaveToLead} className="w-full py-5 bg-green-600 text-white flex justify-center gap-3 shadow-xl"><Save size={20}/> Save result to Lead</Button>
             <Button onClick={handlePrint} variant="secondary" className="w-full py-5 flex justify-center gap-3 shadow-xl"><Printer size={20} /> Export Quote PDF</Button>
          </div>
        </div>

        {/* 🚀 MAIN DASHBOARD RESULTS (Matched to Screenshot Card) */}
        <div className="flex-1 space-y-10">
          {result && !result.error ? (
            <div className="animate-in fade-in slide-in-from-right duration-500 space-y-10">
              
              <div className="bg-[#101827] rounded-[3.5rem] p-12 text-white shadow-2xl relative overflow-hidden border-b-[15px] border-[#F56600]">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-10">
                  <div className="space-y-6">
                    <div className="bg-[#F56600] inline-block px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] italic">Karnot Certified Recommendation</div>
                    <h2 className="text-6xl font-black italic uppercase tracking-tighter leading-[0.9] max-w-sm">{result.system.n}</h2>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">For: {inputs.customerName || 'Lead'}</p>
                  </div>
                  
                  <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-10 text-center min-w-[320px] shadow-inner relative">
                    <div className="text-7xl font-black text-[#4ade80] drop-shadow-[0_0_25px_rgba(74,222,128,0.4)] tracking-tighter leading-none">
                        {result.financials.symbol}${result.financials.totalSavings.toLocaleString()}
                    </div>
                    <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] mt-4">Projected Annual Savings</p>
                  </div>
                </div>
                {/* Decorative Blur */}
                <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-[#F56600]/10 blur-[120px] rounded-full"></div>
              </div>

              {/* KPI GRID */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <MetricBox icon={<TrendingUp className="text-orange-500"/>} label="ROI Payback" value={`${result.financials.paybackYears} Yrs`} />
                <MetricBox icon={<Zap className="text-blue-500"/>} label="Power KW" value={`${result.metrics.powerKW}`} />
                <MetricBox icon={<Sun className="text-amber-500"/>} label="Solar Support" value={`${result.metrics.panelCount} Panels`} />
                <MetricBox icon={<CheckCircle className="text-green-500"/>} label="CO2 Reduction" value={`${result.metrics.co2Saved} kg`} />
              </div>

              <Card className="p-10 rounded-[3rem]">
                <div className="flex justify-between items-end border-t-4 border-slate-50 pt-8 mt-4">
                  <div>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Total Project Capex</p>
                    <h4 className="text-4xl font-black uppercase tracking-tighter italic text-slate-900">Estimated Investment</h4>
                  </div>
                  <div className="text-5xl font-black text-[#F56600] tracking-tighter">
                    {result.financials.symbol}${result.financials.capex.toLocaleString()}
                  </div>
                </div>
              </Card>

            </div>
          ) : (
            <div className="h-[500px] border-8 border-dashed border-slate-200 rounded-[4rem] flex flex-col items-center justify-center p-20 text-center opacity-40">
              <h3 className="text-3xl font-black text-slate-300 uppercase italic tracking-tighter">Adjust inputs to calculate ROI</h3>
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
              <Input label="Industrial Sinks" type="number" value={fixtures.sinks} onChange={e=>setFixtures({...fixtures, sinks: +e.target.value})} />
              <Input label="Occupants" type="number" value={fixtures.people} onChange={e=>setFixtures({...fixtures, people: +e.target.value})} />
              <Input label="Basins" type="number" value={fixtures.basins} onChange={e=>setFixtures({...fixtures, basins: +e.target.value})} />
            </div>
            <Button onClick={()=>{
                const total = Math.round((50 * fixtures.showers * 0.4) + (284 * fixtures.people * 0.15 * 0.25 * 0.4) + (20 * fixtures.basins * 0.4) + (114 * fixtures.sinks * 0.3 * fixtures.hours * 0.4));
                setInputs({...inputs, dailyLitersInput: total, userType: 'office'});
                setShowModal(false);
            }} className="w-full mt-12 py-6 bg-[#F56600] rounded-3xl font-black uppercase italic text-white text-xl tracking-widest shadow-2xl">Apply Demand Settings</Button>
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
