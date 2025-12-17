import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase'; 
import { collection, getDocs } from 'firebase/firestore';
import { getAuth } from "firebase/auth";
import { calculateHeatPump, CONFIG } from '../utils/heatPumpLogic'; 
import { Card, Section, Input, Button } from '../data/constants.jsx'; 
import { Calculator, RefreshCw, Printer, AlertCircle, CheckCircle } from 'lucide-react';

const HeatPumpCalculator = ({ leadId }) => {  
  const [inputs, setInputs] = useState({
    currency: 'PHP', userType: 'restaurant', occupants: 4, dailyLitersInput: 500, mealsPerDay: 200,
    roomsOccupied: 0, hoursPerDay: 12, heatingType: 'electric', fuelPrice: 12.25, tankSize: 11,
    elecRate: 12.25, ambientTemp: 30, inletTemp: 15, targetTemp: 55, systemType: 'grid-solar',
    sunHours: 5.5, heatPumpType: 'all', includeCooling: false
  });

  const [result, setResult] = useState(null);
  const [dbProducts, setDbProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;
        try {
            const querySnapshot = await getDocs(collection(db, "users", user.uid, "products"));
            setDbProducts(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } finally { setLoading(false); }
    };
    fetchProducts();
  }, []);

  // --- DATA INTEGRITY CHECK ---
  const invalidProducts = useMemo(() => {
      return dbProducts.filter(p => p.category === 'Heat Pump' && (!p.kW_DHW_Nominal || !p.Refrigerant || !p.salesPriceUSD));
  }, [dbProducts]);

  const handleCalculate = () => {
    const res = calculateHeatPump(inputs, dbProducts);
    setResult(res);
  };

  const handleChange = (field, isNumber = false) => (e) => {
    let val = isNumber ? parseFloat(e.target.value) || 0 : e.target.value;
    if (field === 'includeCooling') val = e.target.value === 'true';
    setInputs(prev => ({ ...prev, [field]: val }));
  };

  const fmt = n => (+n).toLocaleString(undefined, { maximumFractionDigits: 0 });
  const symbol = CONFIG.SYMBOLS[inputs.currency] || '$';

  return (
    <div className="space-y-6">
        <Card>
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h2 className="text-2xl font-bold text-orange-600 flex items-center gap-2">
                    <Calculator size={24}/> Heat Pump ROI Calculator
                </h2>
                {loading && <RefreshCw size={16} className="animate-spin text-gray-400"/>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Section title="1. Your Demand">
                    <div className="space-y-4">
                        <label className="text-xs font-bold text-gray-500 uppercase">User Type</label>
                        <select className="w-full border p-2 rounded" value={inputs.userType} onChange={handleChange('userType')}>
                            <option value="home">Home</option>
                            <option value="restaurant">Restaurant</option>
                            <option value="resort">Hotels & Resorts</option>
                        </select>
                        {inputs.userType === 'restaurant' && <Input label="Meals / Day" type="number" value={inputs.mealsPerDay} onChange={handleChange('mealsPerDay', true)} />}
                        <Input label="Operating Hours" type="number" value={inputs.hoursPerDay} onChange={handleChange('hoursPerDay', true)} />
                    </div>
                </Section>

                <Section title="2. Your Costs">
                    <div className="space-y-4">
                        <label className="text-xs font-bold text-gray-500 uppercase">Currency</label>
                        <select className="w-full border p-2 rounded" value={inputs.currency} onChange={handleChange('currency')}>
                            <option value="PHP">₱ PHP</option><option value="USD">$ USD</option>
                        </select>
                        <Input label={`Fuel Price (${symbol})`} type="number" value={inputs.fuelPrice} onChange={handleChange('fuelPrice', true)} />
                        <Input label={`HP Elec Rate (${symbol}/kWh)`} type="number" value={inputs.elecRate} onChange={handleChange('elecRate', true)} />
                    </div>
                </Section>
                
                <Section title="3. Conditions & Options">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                            <Input label="Air Temp (°C)" type="number" value={inputs.ambientTemp} onChange={handleChange('ambientTemp', true)} />
                            <Input label="Inlet Temp (°C)" type="number" value={inputs.inletTemp} onChange={handleChange('inletTemp', true)} />
                        </div>
                        <Input label="Target Water Temp (°C)" type="number" value={inputs.targetTemp} onChange={handleChange('targetTemp', true)} />
                        <label className="text-xs font-bold text-gray-500 uppercase">HP Type Filter</label>
                        <select className="w-full border p-2 rounded" value={inputs.heatPumpType} onChange={handleChange('heatPumpType')}>
                            <option value="all">All Models</option>
                            <option value="r290">R290 Only</option>
                            <option value="r32">R32 Only</option>
                        </select>
                    </div>
                </Section>
            </div>

            <div className="mt-8 flex justify-center">
                <Button onClick={handleCalculate} className="px-12 py-4 text-lg bg-orange-600 text-white rounded-lg hover:bg-orange-700">Calculate Savings</Button>
            </div>

            {result?.error && <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-lg text-center border border-red-200">{result.error}</div>}

            {result && !result.error && (
                <div className="mt-8 bg-slate-50 p-6 rounded-xl border border-slate-200">
                    <div className="flex justify-between items-end mb-6">
                        <div>
                            <h3 className="text-xl font-bold text-orange-600 uppercase">{result.system.name}</h3>
                            <p className="text-sm text-gray-500 font-bold uppercase">Flow at {inputs.targetTemp}°C: {fmt(result.metrics.adjFlowLhr)} L/hr</p>
                        </div>
                        <div className="text-right">
                            <div className="text-4xl font-black text-green-600">{symbol}{fmt(result.financials.totalSavings)}</div>
                            <p className="text-[10px] uppercase font-black text-gray-400">Total Annual Savings</p>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button variant="secondary" onClick={() => window.print()}><Printer size={16} className="mr-2"/>Print Report</Button>
                    </div>
                </div>
            )}
        </Card>

        {/* --- INVENTORY HEALTH ALERT SECTION --- */}
        {invalidProducts.length > 0 && (
            <Card className="bg-amber-50 border-amber-200">
                <div className="flex items-center gap-2 text-amber-800 font-bold mb-2">
                    <AlertCircle size={20}/> Database Health Alert: {invalidProducts.length} Products Missing Specs
                </div>
                <p className="text-sm text-amber-700 mb-4">The following products won't show in calculations until you add their <b>kW_DHW_Nominal</b>, <b>Refrigerant</b>, and <b>Price</b> in the Product Manager:</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {invalidProducts.map(p => (
                        <div key={p.id} className="text-[10px] bg-white border border-amber-200 p-2 rounded shadow-sm text-gray-600 italic">
                            {p.name}
                        </div>
                    ))}
                </div>
            </Card>
        )}
        {invalidProducts.length === 0 && !loading && (
             <div className="flex items-center justify-center gap-2 text-[10px] text-green-600 font-bold uppercase tracking-widest">
                <CheckCircle size={12}/> Inventory Data Integrity Verified
             </div>
        )}
    </div>
  );
};

export default HeatPumpCalculator;
