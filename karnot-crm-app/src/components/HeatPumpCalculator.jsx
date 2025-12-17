import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; 
import { collection, getDocs } from 'firebase/firestore';
import { getAuth } from "firebase/auth";
import { calculateHeatPump, CONFIG } from '../utils/heatPumpLogic'; 
import { Card, Section, Input, Button } from '../data/constants.jsx'; 
import { 
  Calculator, Printer, Sun, Zap, TrendingUp, CheckCircle, 
  Droplets, Snowflake, X, Fuel, RefreshCw, Layers 
} from 'lucide-react';

const HeatPumpCalculator = () => {
  // 1. STATE INITIALIZATION (All original HTML inputs preserved)
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
  const [showModal, setShowModal] = useState(false);
  const [fixtures, setFixtures] = useState({ showers: 0, basins: 0, sinks: 0, people: 0, hours: 8 });

  // 2. FETCH INVENTORY FROM FIREBASE
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const auth = getAuth();
        if (!auth.currentUser) return;
        const snap = await getDocs(collection(db, "users", auth.currentUser.uid, "products"));
        const products = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setDbProducts(products);
        setLoading(false);
      } catch (err) {
        console.error("Firebase fetch error:", err);
        setLoading(false);
      }
    };
    fetchInventory();
  }, []);

  // 3. CURRENCY & FUEL DEFAULTS (Syncs values when currency changes)
  useEffect(() => {
    const defaults = CONFIG.defaultRate[inputs.currency];
    if (defaults) {
      setInputs(prev => ({
        ...prev,
        elecRate: defaults.grid,
        fuelPrice: inputs.heatingType === 'propane' ? defaults.lpgPrice : (inputs.heatingType === 'diesel' ? defaults.diesel : defaults.grid),
        tankSize: defaults.lpgSize || 11
      }));
    }
  }, [inputs.currency, inputs.heatingType]);

  // 4. REAL-TIME CALCULATION TRIGGER
  useEffect(() => {
    if (!loading && dbProducts.length > 0) {
      setResult(calculateHeatPump(inputs, dbProducts));
    }
  }, [inputs, dbProducts, loading]);

  // 5. FIXTURE ESTIMATOR LOGIC
  const applyFixtures = () => {
    // Formula derived from Karnot engineering standards for fixture flow
    const total = Math.round(
      (50 * fixtures.showers * 0.4) + 
      (284 * fixtures.people * 0.15 * 0.25 * 0.4) + 
      (20 * fixtures.basins * 0.4) + 
      (114 * fixtures.sinks * 0.3 * fixtures.hours * 0.4)
    );
    setInputs(prev => ({ ...prev, dailyLitersInput: total, userType: 'office' }));
    setShowModal(false);
  };

  // 6. PROFESSIONAL PRINT / PDF EXPORT
  const handlePrint = () => {
    if (!result || result.error) return;
    const win = window.open('', '_blank');
    const html = `
      <html>
        <head>
          <title>Karnot ROI Report</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #1d1d1f; }
            .header { border-bottom: 5px solid #F56600; padding-bottom: 20px; margin-bottom: 40px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
            .card { background: #f4f4f7; padding: 25px; border-radius: 15px; }
            .val { font-size: 36px; font-weight: 900; color: #F56600; margin-top: 10px; }
            table { width: 100%; margin-top: 40px; border-collapse: collapse; }
            td { padding: 15px; border-bottom: 1px solid #ddd; }
            .total { font-size: 20px; font-weight: bold; background: #eee; }
          </style>
        </head>
        <body>
          <div class="header"><h1>Karnot Savings & ROI Report</h1><p>Recommended: <strong>${result.system.n}</strong></p></div>
          <div class="grid">
            <div class="card"><strong>Annual Savings</strong><div class="val">${result.financials.symbol}${result.financials.totalSavings.toLocaleString()}</div></div>
            <div class="card"><strong>Payback Time</strong><div class="val">${result.financials.paybackYears} Years</div></div>
          </div>
          <table>
            <tr><td>Daily Demand</td><td>${result.metrics.dailyLiters} Liters</td></tr>
            <tr><td>Solar PV Offset</td><td>${result.metrics.panelCount} Panels</td></tr>
            <tr><td>Heat Pump Investment</td><td>${result.financials.symbol}${result.financials.capex.system.toLocaleString()}</td></tr>
            <tr class="total"><td>TOTAL ESTIMATED CAPEX</td><td>${result.financials.symbol}${result.financials.capex.total.toLocaleString()}</td></tr>
          </table>
          <p style="margin-top:50px; font-size:12px; color:#666;">&copy; 2025 Karnot. Estimations based on local energy rates.</p>
        </body>
      </html>
    `;
    win.document.write(html);
    win.document.close();
    win.print();
  };

  const fmt = n => (+n).toLocaleString(undefined, { maximumFractionDigits: 0 });
  const sym = CONFIG.SYMBOLS[inputs.currency];

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-10 space-y-10 bg-slate-50 min-h-screen">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b-4 border-orange-600 pb-8">
        <div>
          <h1 className="text-5xl md:text-6xl font-black italic tracking-tighter uppercase text-slate-900 flex items-center gap-4">
            <Calculator size={56} className="text-orange-600" /> Karnot CRM
          </h1>
          <p className="font-bold text-slate-400 uppercase tracking-widest text-xs mt-3">Professional Sizing & ROI Calculator</p>
        </div>
        <Button onClick={handlePrint} className="bg-slate-900 text-white rounded-full px-10 py-6 font-black italic uppercase tracking-widest flex gap-3 shadow-xl hover:scale-105 transition-transform">
          <Printer size={20} /> Export PDF Report
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* INPUT PANEL */}
        <div className="lg:col-span-4 space-y-8">
          <Card className="p-8 shadow-2xl rounded-[2.5rem] bg-white border-none">
            
            <Section title="Step 1: Water Demand">
              <select className="w-full p-4 border-2 rounded-2xl bg-slate-50 font-black text-slate-700 mb-6 outline-none focus:border-orange-500 transition-all" value={inputs.userType} onChange={e => setInputs({...inputs, userType: e.target.value})}>
                <option value="home">Residential Villa</option>
                <option value="restaurant">Restaurant / Café</option>
                <option value="resort">Hotel & Resort</option>
                <option value="office">Office / Commercial</option>
              </select>

              <div className="space-y-4">
                {inputs.userType === 'home' && (
                  <Input label="Number of Occupants" type="number" value={inputs.occupants} onChange={e => setInputs({...inputs, occupants: +e.target.value})} />
                )}
                {(inputs.userType === 'restaurant' || inputs.userType === 'resort') && (
                  <Input label="Average Meals / Day" type="number" value={inputs.mealsPerDay} onChange={e => setInputs({...inputs, mealsPerDay: +e.target.value})} />
                )}
                {inputs.userType === 'resort' && (
                  <Input label="Rooms Occupied" type="number" value={inputs.roomsOccupied} onChange={e => setInputs({...inputs, roomsOccupied: +e.target.value})} />
                )}
                {inputs.userType === 'office' && (
                  <div>
                    <Input label="Liters Required / Day" type="number" value={inputs.dailyLitersInput} onChange={e => setInputs({...inputs, dailyLitersInput: +e.target.value})} />
                    <button onClick={() => setShowModal(true)} className="flex items-center gap-2 text-[10px] font-black uppercase text-blue-600 underline tracking-widest italic mt-2">
                      <Droplets size={12}/> Estimate via Fixture Count
                    </button>
                  </div>
                )}
                <Input label="Operating Hours/Day" type="number" value={inputs.hoursPerDay} onChange={e => setInputs({...inputs, hoursPerDay: +e.target.value})} />
              </div>
            </Section>

            <Section title="Step 2: Market Rates">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <select className="p-4 border-2 rounded-2xl bg-white font-bold" value={inputs.currency} onChange={e => setInputs({...inputs, currency: e.target.value})}>
                  {Object.keys(CONFIG.FX).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select className="p-4 border-2 rounded-2xl bg-white font-bold" value={inputs.heatingType} onChange={e => setInputs({...inputs, heatingType: e.target.value})}>
                  <option value="electric">Electric Grid</option>
                  <option value="propane">Propane (LPG)</option>
                  <option value="diesel">Diesel Fuel</option>
                </select>
              </div>
              <div className="space-y-4">
                <Input label={`Current Fuel Rate (${sym})`} type="number" value={inputs.fuelPrice} onChange={e => setInputs({...inputs, fuelPrice: +e.target.value})} />
                {inputs.heatingType === 'propane' && <Input label="Tank Size (kg)" type="number" value={inputs.tankSize} onChange={e => setInputs({...inputs, tankSize: +e.target.value})} />}
                <Input label={`Electric Rate (${sym}/kWh)`} type="number" value={inputs.elecRate} onChange={e => setInputs({...inputs, elecRate: +e.target.value})} />
              </div>
            </Section>

            <Section title="Step 3: Local Environment">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <Input label="Air Temp °C" type="number" value={inputs.ambientTemp} onChange={e => setInputs({...inputs, ambientTemp: +e.target.value})} />
                <Input label="Target °C" type="number" value={inputs.targetTemp} onChange={e => setInputs({...inputs, targetTemp: +e.target.value})} />
              </div>
              <div className="space-y-6">
                <select className="w-full p-4 border-2 rounded-2xl font-black bg-white" value={inputs.heatPumpType} onChange={e => setInputs({...inputs, heatPumpType: e.target.value})}>
                  <option value="all">⭐ Optimal Selection (Best Price)</option>
                  <option value="R32">R32 Performance Series</option>
                  <option value="R290">R290 Natural Propane (High Temp)</option>
                  <option value="CO2">CO2 Industrial Extreme Series</option>
                </select>
                <label className="flex items-center gap-4 p-5 bg-orange-50 rounded-2xl cursor-pointer border-2 border-orange-100 group transition-all">
                  <input type="checkbox" className="w-6 h-6 accent-orange-600" checked={inputs.includeCooling} onChange={e => setInputs({...inputs, includeCooling: e.target.checked})} />
                  <span className="font-black text-orange-700 uppercase tracking-tighter italic">Include Free Cooling Output</span>
                </label>
              </div>
            </Section>
          </Card>
        </div>

        {/* RESULTS PANEL */}
        <div className="lg:col-span-8 space-y-8">
          {result && !result.error ? (
            <div className="space-y-8">
              
              {/* RECOMMENDED MODEL HERO CARD */}
              <div className="bg-slate-900 rounded-[3.5rem] p-12 text-white shadow-2xl border-b-[15px] border-orange-600 relative overflow-hidden">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10 relative z-10">
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 bg-orange-600 px-4 py-1 rounded-full font-black uppercase text-[10px] tracking-widest italic">Karnot Certified Recommendation</div>
                    <h2 className="text-6xl font-black italic tracking-tighter uppercase leading-none">{result.system.n}</h2>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Technology: {result.system.refrig} Refrigerant System</p>
                  </div>
                  <div className="text-left md:text-right bg-white/10 p-8 rounded-[2.5rem] border border-white/20 backdrop-blur-lg">
                    <div className="text-7xl font-black text-green-400 tracking-tighter leading-none">{sym}{fmt(result.financials.totalSavings)}</div>
                    <p className="text-slate-300 font-black uppercase text-[11px] tracking-widest mt-4">Projected Annual Savings</p>
                  </div>
                </div>
              </div>

              {/* KPI CARDS */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <MetricBox icon={<TrendingUp size={34} className="text-orange-500" />} label="ROI Payback" value={`${result.financials.paybackYears} Yrs`} />
                <MetricBox icon={<Zap size={34} className="text-blue-500" />} label="Power Draw" value={`${result.metrics.powerKW} kW`} />
                <MetricBox icon={<Sun size={34} className="text-amber-500" />} label="Solar Offset" value={`${result.metrics.panelCount} Panels`} />
                <MetricBox icon={<CheckCircle size={34} className="text-green-500" />} label="CO2 Reduced" value={`${fmt(result.metrics.co2Saved)} kg`} />
              </div>

              {/* FINANCIAL BREAKDOWN */}
              <div className="bg-white rounded-[3rem] p-12 border-2 border-slate-200 shadow-sm">
                <h3 className="font-black text-slate-300 uppercase tracking-widest text-xs border-b pb-6 mb-8 flex items-center gap-3">
                  <Layers size={16} /> Complete Investment Breakdown
                </h3>
                <div className="space-y-6">
                  <Row label="Current System Annual Operating Cost" value={`${sym}${fmt(result.financials.annualCostOld)}`} />
                  <Row label="Karnot System Annual Operating Cost" value={`${sym}${fmt(result.financials.karnotAnnualCost)}`} isGreen />
                  {result.financials.coolSavings > 0 && (
                    <Row label="Value of Recovered Free Cooling" value={`${sym}${fmt(result.financials.coolSavings)}`} isGreen />
                  )}
                  <div className="pt-8 border-t-4 border-slate-50 mt-8 flex justify-between items-end">
                    <div>
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic">Total Estimated System Capex</p>
                      <h4 className="text-4xl font-black uppercase tracking-tighter italic text-slate-900">Project Total</h4>
                    </div>
                    <div className="text-5xl font-black text-orange-600 tracking-tighter">{sym}{fmt(result.financials.capex.total)}</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full border-8 border-dashed border-slate-200 rounded-[4rem] flex flex-col items-center justify-center p-20 text-center opacity-50">
              <RefreshCw size={80} className="text-slate-200 animate-spin-slow mb-8" />
              <h3 className="text-3xl font-black text-slate-300 uppercase italic tracking-tighter">
                {result?.error || "Adjust inputs to calculate ROI"}
              </h3>
            </div>
          )}
        </div>
      </div>

      {/* FIXTURE ESTIMATOR MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[999] flex items-center justify-center p-6">
          <div className="bg-white p-12 md:p-16 rounded-[4rem] max-w-2xl w-full relative shadow-2xl border-4 border-orange-500">
            <button onClick={() => setShowModal(false)} className="absolute top-12 right-12 text-slate-300 hover:text-orange-600 transition-all">
              <X size={48} />
            </button>
            <div className="text-center mb-12">
              <Droplets className="mx-auto mb-6 text-blue-500" size={80} />
              <h3 className="text-5xl font-black uppercase italic tracking-tighter">Demand Profiler</h3>
              <p className="text-slate-400 font-bold mt-2 uppercase tracking-widest text-xs">Estimate hot water demand via fixtures</p>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <Input label="Shower Count" type="number" value={fixtures.showers} onChange={e => setFixtures({...fixtures, showers: +e.target.value})} />
              <Input label="Industrial Sinks" type="number" value={fixtures.sinks} onChange={e => setFixtures({...fixtures, sinks: +e.target.value})} />
              <Input label="Lavatory Basins" type="number" value={fixtures.basins} onChange={e => setFixtures({...fixtures, basins: +e.target.value})} />
              <Input label="Total People" type="number" value={fixtures.people} onChange={e => setFixtures({...fixtures, people: +e.target.value})} />
            </div>
            <Button onClick={applyFixtures} className="w-full mt-12 py-6 bg-orange-600 rounded-3xl font-black uppercase italic text-white text-xl shadow-2xl hover:scale-105 transition-transform tracking-widest">
              Apply Demand Settings
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// HELPER COMPONENTS FOR SCANNABILITY
const MetricBox = ({ icon, label, value }) => (
  <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm text-center flex flex-col items-center group hover:border-orange-200 transition-all">
    <div className="mb-4 p-4 bg-slate-50 rounded-full group-hover:scale-110 transition-transform">{icon}</div>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{label}</p>
    <p className="text-3xl font-black text-slate-800">{value}</p>
  </div>
);

const Row = ({ label, value, isGreen = false }) => (
  <div className="flex justify-between items-center py-4 border-b border-slate-100 last:border-0">
    <span className="font-bold text-slate-500 text-base">{label}</span>
    <span className={`font-black text-xl ${isGreen ? 'text-green-600' : 'text-slate-900'}`}>{value}</span>
  </div>
);

export default HeatPumpCalculator;
