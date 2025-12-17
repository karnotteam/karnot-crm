import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; 
import { collection, getDocs } from 'firebase/firestore';
import { getAuth } from "firebase/auth";
import { calculateHeatPump, CONFIG } from '../utils/heatPumpLogic'; 
import { Card, Section, Input, Button } from '../data/constants.jsx'; 
import { Calculator, Printer, Sun, Zap, TrendingUp, CheckCircle, Droplets, Snowflake } from 'lucide-react';

const HeatPumpCalculator = () => {
  const [inputs, setInputs] = useState({
    currency: 'PHP', userType: 'home', occupants: 4, dailyLitersInput: 500, mealsPerDay: 0,
    roomsOccupied: 0, hoursPerDay: 12, heatingType: 'electric', fuelPrice: 12.25, tankSize: 11,
    elecRate: 12.25, ambientTemp: 30, inletTemp: 15, targetTemp: 55, systemType: 'grid-solar',
    sunHours: 5.5, heatPumpType: 'all', includeCooling: false
  });

  const [dbProducts, setDbProducts] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const auth = getAuth();
      if (!auth.currentUser) return;
      const snap = await getDocs(collection(db, "users", auth.currentUser.uid, "products"));
      setDbProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    };
    fetch();
  }, []);

  useEffect(() => {
    if (!loading && dbProducts.length > 0) {
      setResult(calculateHeatPump(inputs, dbProducts));
    }
  }, [inputs, dbProducts, loading]);

  // --- WORKING PRINT FUNCTION ---
  const handlePrint = () => {
    if (!result || result.error) return alert("Please complete calculation first");
    
    const printWindow = window.open('', '_blank');
    const content = `
      <html>
        <head>
          <title>Karnot ROI Report - ${result.system.n}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            .header { border-bottom: 4px solid #F56600; padding-bottom: 20px; margin-bottom: 30px; }
            .orange { color: #F56600; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .card { background: #f9f9f9; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
            .big { font-size: 24px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            td { padding: 10px; border-bottom: 1px solid #eee; }
            .footer { margin-top: 50px; font-size: 12px; color: #999; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Karnot <span class="orange">ROI Report</span></h1>
            <p>System Recommendation: <strong>${result.system.n}</strong></p>
          </div>
          <div class="grid">
            <div class="card">
              <p>Annual Savings</p>
              <div class="big orange">${result.financials.symbol}${result.financials.totalSavings.toLocaleString()}</div>
            </div>
            <div class="card">
              <p>Payback Period</p>
              <div class="big">${result.financials.paybackYears} Years</div>
            </div>
          </div>
          <h3>Investment Breakdown</h3>
          <table>
            <tr><td>Equipment Cost</td><td>${result.financials.symbol}${result.financials.capex.system.toLocaleString()}</td></tr>
            <tr><td>Solar PV (${result.metrics.panelCount} panels)</td><td>${result.financials.symbol}${result.financials.capex.solar.toLocaleString()}</td></tr>
            <tr><td>Total Project Capex</td><td><strong>${result.financials.symbol}${result.financials.capex.total.toLocaleString()}</strong></td></tr>
          </table>
          <div class="footer">Generated via Karnot CRM - ${new Date().toLocaleDateString()}</div>
        </body>
      </html>
    `;
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
  };

  const sym = CONFIG.SYMBOLS[inputs.currency];
  const fmt = n => (+n).toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-black text-orange-600 uppercase italic tracking-tighter">Karnot ROI CRM</h1>
        <Button onClick={handlePrint} className="bg-slate-900 text-white gap-2 rounded-full px-6">
          <Printer size={18} /> Print Report
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-6">
          <Card className="p-6 space-y-6">
            <Section title="1. Demand Info">
              <select className="w-full p-3 border rounded-xl font-bold bg-slate-50" value={inputs.userType} onChange={e=>setInputs({...inputs, userType: e.target.value})}>
                <option value="home">Home / Residential</option>
                <option value="restaurant">Restaurant / F&B</option>
                <option value="resort">Hotel / Resort</option>
              </select>

              {/* RESTAURANT MEALS FIELD */}
              {(inputs.userType === 'restaurant' || inputs.userType === 'resort') && (
                <Input label="Meals Served / Day" type="number" value={inputs.mealsPerDay} onChange={e=>setInputs({...inputs, mealsPerDay: +e.target.value})} />
              )}
              
              {inputs.userType === 'home' && (
                <Input label="Occupants" type="number" value={inputs.occupants} onChange={e=>setInputs({...inputs, occupants: +e.target.value})} />
              )}

              {inputs.userType === 'resort' && (
                <Input label="Rooms Occupied" type="number" value={inputs.roomsOccupied} onChange={e=>setInputs({...inputs, roomsOccupied: +e.target.value})} />
              )}
            </Section>

            <Section title="2. System Type">
               <select className="w-full p-3 border rounded-xl font-bold mb-4" value={inputs.heatPumpType} onChange={e=>setInputs({...inputs, heatPumpType: e.target.value})}>
                 <option value="all">Best Price (Any)</option>
                 <option value="R290">R290 Series</option>
                 <option value="R32">R32 Series</option>
                 <option value="CO2">CO2 Series</option>
               </select>
               <label className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl cursor-pointer">
                 <input type="checkbox" className="w-5 h-5" checked={inputs.includeCooling} onChange={e=>setInputs({...inputs, includeCooling: e.target.checked})} />
                 <span className="font-bold text-blue-700">Include Cooling?</span>
               </label>
            </Section>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {result && !result.error ? (
            <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border">
              <div className="bg-slate-900 p-10 text-white flex justify-between items-center">
                <div>
                  <h2 className="text-4xl font-black italic uppercase tracking-tighter">{result.system.n}</h2>
                  <p className="text-orange-500 font-bold uppercase tracking-widest text-xs mt-2">Recommended for {fmt(result.metrics.dailyLiters)}L Daily Demand</p>
                </div>
                <div className="text-right">
                  <div className="text-5xl font-black text-green-400">{sym}{fmt(result.financials.totalSavings)}</div>
                  <p className="text-[10px] font-black opacity-50 uppercase tracking-widest">Projected Annual Savings</p>
                </div>
              </div>

              <div className="p-10 grid grid-cols-2 md:grid-cols-4 gap-6">
                <Metric label="Payback" val={`${result.financials.paybackYears} Yrs`} icon={<TrendingUp color="#f97316"/>} />
                <Metric label="Power" val={`${result.metrics.powerKW} kW`} icon={<Zap color="#3b82f6"/>} />
                <Metric label="Solar" val={`${result.metrics.panelCount} Panels`} icon={<Sun color="#eab308"/>} />
                <Metric label="CO2 saved" val={`${fmt(result.metrics.co2Saved)} kg`} icon={<CheckCircle color="#22c55e"/>} />
              </div>
            </div>
          ) : (
            <div className="h-full border-4 border-dashed rounded-[2.5rem] flex items-center justify-center p-20 text-slate-300 font-black uppercase italic tracking-tighter">
              {result?.error || "Check inputs"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Metric = ({ label, val, icon }) => (
  <div className="bg-slate-50 p-6 rounded-2xl border text-center">
    <div className="flex justify-center mb-3">{icon}</div>
    <div className="text-[10px] font-black text-slate-400 uppercase mb-1">{label}</div>
    <div className="text-2xl font-black text-slate-800">{val}</div>
  </div>
);

export default HeatPumpCalculator;
