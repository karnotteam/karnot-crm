import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; 
import { collection, onSnapshot } from 'firebase/firestore';
import { calculateHeatPump, CONFIG } from '../utils/heatPumpLogic'; 
import { Card, Section, Input, Button } from '../data/constants.jsx'; 
import { Calculator, Snowflake, RefreshCw, Printer, AlertCircle } from 'lucide-react';

const HeatPumpCalculator = ({ user }) => {  
  const [inputs, setInputs] = useState({
    currency: 'PHP', userType: 'home', heatingType: 'electric', systemType: 'grid-solar', heatPumpType: 'all',
    fuelPrice: 12.25, tankSize: 11, elecRate: 12.25, occupants: 4, dailyLitersInput: 500, mealsPerDay: 0,
    roomsOccupied: 0, hoursPerDay: 12, ambientTemp: 30, inletTemp: 15, targetTemp: 55, sunHours: 5.5, includeCooling: false
  });

  const [dbProducts, setDbProducts] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- REAL-TIME DB LINK ---
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, "users", user.uid, "products"), (snap) => {
        setDbProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (dbProducts.length > 0) {
        setResult(calculateHeatPump(inputs, dbProducts));
    }
  }, [inputs, dbProducts]);

  const handleChange = (f, isNum = false) => (e) => {
    let val = isNum ? parseFloat(e.target.value) || 0 : e.target.value;
    if (f === 'includeCooling') val = (e.target.value === 'true');
    setInputs(prev => ({ ...prev, [f]: val }));
  };

  const fmt = n => (+n).toLocaleString(undefined, { maximumFractionDigits: 0 });

  if (loading) return <div className="p-20 text-center font-bold text-orange-500 uppercase animate-pulse">Syncing with Product Manager...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <Card className="p-8 shadow-2xl border-t-4 border-orange-500">
        <div className="flex items-center gap-3 mb-8">
            <div className="bg-orange-100 p-3 rounded-2xl text-orange-600"><Calculator size={32}/></div>
            <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Heat Pump ROI Engine</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <Section title="1. Site Demand">
            <select className="w-full border-2 p-3 rounded-xl font-bold mb-4 bg-gray-50" value={inputs.userType} onChange={handleChange('userType')}>
                <option value="home">Home / Villa</option><option value="restaurant">F&B / Kitchen</option><option value="resort">Hotels / Resort</option>
            </select>
            <Input label="Occupants / Units" type="number" value={inputs.occupants} onChange={handleChange('occupants', true)} />
          </Section>

          <Section title="2. Local Utility Costs">
             <select className="w-full border-2 p-3 rounded-xl font-bold mb-4 bg-gray-50" value={inputs.currency} onChange={handleChange('currency')}>
                <option value="PHP">₱ PHP</option><option value="USD">$ USD</option>
             </select>
             <Input label="Electricity Rate / kWh" type="number" value={inputs.elecRate} onChange={handleChange('elecRate', true)} />
          </Section>

          <Section title="3. Technology Choice">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Database Filter</label>
            <select className="w-full border-2 p-3 rounded-xl font-bold mb-4" value={inputs.heatPumpType} onChange={handleChange('heatPumpType')}>
                <option value="all">Best Price (Any Refrigerant)</option>
                <option value="r32">R32 Models Only</option>
                <option value="r290">R290 Models Only</option>
                <option value="co2">CO2 Models Only</option>
            </select>
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Enable Free Cooling?</label>
            <select className="w-full border-2 p-3 rounded-xl font-bold" value={inputs.includeCooling.toString()} onChange={handleChange('includeCooling')}>
                <option value="false">No (Heating Only)</option><option value="true">Yes (Reversible)</option>
            </select>
          </Section>
        </div>
      </Card>

      {result?.error ? (
          <div className="bg-red-50 border-2 border-red-200 p-6 rounded-3xl flex items-center gap-4 text-red-700 font-bold">
              <AlertCircle /> {result.error} (Check Product Manager)
          </div>
      ) : result && (
        <Card className="p-8 border-2 border-orange-500 bg-white overflow-hidden relative">
            <div className="flex justify-between items-start mb-8 border-b pb-6">
                <div>
                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">Recommended from Product Manager</p>
                    <h3 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">{result.system.name}</h3>
                    <p className="text-xs font-bold text-gray-400 uppercase">HP Ref: {result.system.Refrigerant || 'N/A'}</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Estimated Annual Savings</p>
                    <p className="text-5xl font-black text-green-600">{result.financials.symbol}{fmt(result.financials.totalAnnualSavings)}</p>
                </div>
            </div>

            {inputs.includeCooling && result.financials.coolSavings > 0 && (
                <div className="mb-8 p-6 bg-blue-50 border-l-8 border-blue-500 rounded-r-3xl flex items-center gap-6 animate-pulse">
                    <Snowflake className="text-blue-500" size={40} />
                    <div>
                        <p className="text-blue-800 font-black uppercase text-sm">Free Cooling Bonus Activated</p>
                        <p className="text-blue-600 font-bold text-lg">Value Added: {result.financials.symbol}{fmt(result.financials.coolSavings)} / Year</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-6 rounded-2xl border text-center">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">ROI Payback</p>
                    <p className="text-2xl font-black text-orange-600">{result.financials.paybackYears} Yrs</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border text-center">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Carbon Saved</p>
                    <p className="text-2xl font-black text-green-600">{fmt(result.metrics.emissionsSaved)}kg</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border text-center">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Solar Offset</p>
                    <p className="text-2xl font-black text-amber-500">{result.metrics.panelCount} Panels</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border text-center">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">System Capex</p>
                    <p className="text-2xl font-black text-slate-800">{result.financials.symbol}{fmt(result.financials.capex.total)}</p>
                </div>
            </div>

            <div className="mt-10 flex justify-end">
                <Button variant="primary" className="px-10 py-4 text-lg font-black uppercase tracking-widest"><Printer size={20} className="mr-2"/> Generate ROI Report</Button>
            </div>
        </Card>
      )}
    </div>
  );
};

export default HeatPumpCalculator;
