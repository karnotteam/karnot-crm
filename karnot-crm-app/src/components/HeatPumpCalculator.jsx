import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; 
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from "firebase/auth";
import { calculateHeatPump, CONFIG } from '../utils/heatPumpLogic'; 
import { Calculator, Snowflake, Printer, Save, Info } from 'lucide-react';

const HeatPumpCalculator = ({ leadId }) => {  
  const [inputs, setInputs] = useState({
    currency: 'PHP', userType: 'home', occupants: 4, dailyLitersInput: 500,
    mealsPerDay: 0, roomsOccupied: 0, hoursPerDay: 12, heatingType: 'electric',
    fuelPrice: 12.25, tankSize: 11, elecRate: 12.25, ambientTemp: 30,
    inletTemp: 15, targetTemp: 55, systemType: 'grid-solar', sunHours: 5.5,
    heatPumpType: 'all', includeCooling: false
  });

  const [result, setResult] = useState(null);
  const [dbProducts, setDbProducts] = useState([]);
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
    if (!loading && dbProducts.length > 0) setResult(calculateHeatPump(inputs, dbProducts));
  }, [inputs, dbProducts, loading]);

  const handleChange = (f, isNum = false) => (e) => {
    let val = isNum ? parseFloat(e.target.value) || 0 : e.target.value;
    if (f === 'includeCooling') val = (e.target.value === 'true');
    setInputs(prev => ({ ...prev, [f]: val }));
  };

  const fmt = n => (+n).toLocaleString(undefined, { maximumFractionDigits: 0 });
  const symbol = CONFIG.SYMBOLS[inputs.currency];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <h2 className="text-3xl font-bold text-[#F56600] text-center mb-10">Karnot Heat Pump Calculator</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* SECTION 1 */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold border-b-2 border-[#F56600] pb-2 mb-4">1. Your Demand</h3>
            <label className="text-sm font-semibold text-gray-500 block">User Type</label>
            <select className="w-full p-3 bg-gray-50 border rounded-xl font-medium" value={inputs.userType} onChange={handleChange('userType')}>
              <option value="home">Home</option>
              <option value="restaurant">Restaurant</option>
              <option value="spa">Spa / Clinic</option>
              <option value="resort">Hotels & Resorts</option>
              <option value="school">Schools & Colleges</option>
              <option value="office">Office</option>
            </select>
            {inputs.userType === 'home' && (
              <>
                <label className="text-sm font-semibold text-gray-500 block">Number of Occupants</label>
                <input type="number" className="w-full p-3 bg-gray-50 border rounded-xl" value={inputs.occupants} onChange={handleChange('occupants', true)} />
              </>
            )}
            <label className="text-sm font-semibold text-gray-500 block">Daily Operating Hours</label>
            <input type="number" className="w-full p-3 bg-gray-50 border rounded-xl" value={inputs.hoursPerDay} onChange={handleChange('hoursPerDay', true)} />
          </div>

          {/* SECTION 2 */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold border-b-2 border-[#F56600] pb-2 mb-4">2. Your Costs</h3>
            <label className="text-sm font-semibold text-gray-500 block">Select Currency</label>
            <select className="w-full p-3 bg-gray-50 border rounded-xl font-medium" value={inputs.currency} onChange={handleChange('currency')}>
              <option value="PHP">₱ PHP</option><option value="USD">$ USD</option><option value="GBP">£ GBP</option><option value="EUR">€ EUR</option>
            </select>
            <label className="text-sm font-semibold text-gray-500 block">Current Heating Type</label>
            <select className="w-full p-3 bg-gray-50 border rounded-xl font-medium" value={inputs.heatingType} onChange={handleChange('heatingType')}>
              <option value="electric">Electric</option><option value="gas">Natural Gas</option><option value="propane">Propane (LPG)</option><option value="diesel">Diesel</option>
            </select>
            <label className="text-sm font-semibold text-gray-500 block">Energy Rate ({symbol})</label>
            <input type="number" className="w-full p-3 bg-gray-50 border rounded-xl" value={inputs.fuelPrice} onChange={handleChange('fuelPrice', true)} />
          </div>

          {/* SECTION 3 */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold border-b-2 border-[#F56600] pb-2 mb-4">3. Conditions & Options</h3>
            <label className="text-sm font-semibold text-gray-500 block">Heat Pump Type</label>
            <select className="w-full p-3 bg-gray-50 border rounded-xl font-medium" value={inputs.heatPumpType} onChange={handleChange('heatPumpType')}>
              <option value="all">Best Price (All Models)</option>
              <option value="r32">R32 Models Only</option>
              <option value="r290">R290 Models Only</option>
              <option value="co2">CO2 Models Only</option>
            </select>
            <label className="text-sm font-semibold text-gray-500 block">Require Cooling?</label>
            <select className="w-full p-3 bg-gray-50 border rounded-xl font-medium" value={inputs.includeCooling.toString()} onChange={handleChange('includeCooling')}>
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
            <label className="text-sm font-semibold text-gray-500 block">Target Hot Water Temp (°C)</label>
            <input type="number" className="w-full p-3 bg-gray-50 border rounded-xl" value={inputs.targetTemp} onChange={handleChange('targetTemp', true)} />
          </div>
        </div>
      </div>

      {result && !result.error && (
        <div className="bg-white p-8 rounded-3xl shadow-lg border-2 border-[#F56600] animate-in fade-in zoom-in duration-300">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-50 p-6 rounded-2xl text-center">
              <p className="text-xs font-bold text-gray-400 uppercase mb-2">Annual Savings</p>
              <p className="text-2xl font-black text-[#F56600]">{symbol}{fmt(result.financials.totalSavings)}</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-2xl text-center">
              <p className="text-xs font-bold text-gray-400 uppercase mb-2">Payback</p>
              <p className="text-2xl font-black text-[#F56600]">{result.financials.paybackYears} Yrs</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-2xl text-center">
              <p className="text-xs font-bold text-gray-400 uppercase mb-2">CO₂ Reduction</p>
              <p className="text-2xl font-black text-[#F56600]">{fmt(result.metrics.emissionsSaved)}kg</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-2xl text-center">
              <p className="text-xs font-bold text-gray-400 uppercase mb-2">System Cost</p>
              <p className="text-2xl font-black text-[#F56600]">{symbol}{fmt(result.financials.capex.total)}</p>
            </div>
          </div>

          {inputs.includeCooling && result.financials.coolSavings > 0 && (
            <div className="mb-6 p-5 bg-blue-50 border-l-4 border-blue-500 rounded-r-2xl flex items-center gap-4">
              <Snowflake className="text-blue-500" size={32} />
              <div>
                <p className="text-blue-800 font-bold">Free Cooling Bonus!</p>
                <p className="text-sm text-blue-600 font-medium">This unit provides {symbol}{fmt(result.financials.coolSavings)} in free cooling value annually.</p>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center bg-orange-50 p-6 rounded-2xl">
             <div>
                <p className="text-sm font-bold text-orange-800">Recommended System</p>
                <p className="text-xl font-black text-orange-900 uppercase tracking-tighter">{result.system.n}</p>
             </div>
             <button className="bg-[#F56600] text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-orange-700 transition-colors">
               <Printer size={18} /> Generate Report
             </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HeatPumpCalculator;
