import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; 
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from "firebase/auth";
import { calculateHeatPump, CONFIG } from '../utils/heatPumpLogic'; 
import { Card, Section, Input, Button } from '../data/constants.jsx'; 
import { Calculator, RefreshCw, Printer, Save } from 'lucide-react';

const HeatPumpCalculator = ({ leadId }) => {  
  const [inputs, setInputs] = useState({
    currency: 'PHP',
    userType: 'restaurant',
    occupants: 4,
    dailyLitersInput: 500,
    mealsPerDay: 200,
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
            const products = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setDbProducts(products);
        } finally { setLoading(false); }
    };
    fetchProducts();
  }, []);

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
                    <label className="text-sm font-bold text-gray-600">User Type</label>
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
                    <label className="text-sm font-bold text-gray-600">Currency</label>
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
                    <label className="text-sm font-bold text-gray-600">HP Type</label>
                    <select className="w-full border p-2 rounded" value={inputs.heatPumpType} onChange={handleChange('heatPumpType')}>
                        <option value="all">All Models</option>
                        <option value="r290">R290 Models</option>
                        <option value="r32">R32 Models</option>
                    </select>
                </div>
            </Section>
        </div>

        <div className="mt-8 flex justify-center">
            <Button onClick={handleCalculate} variant="primary" className="px-12 py-4 text-lg bg-orange-600 text-white rounded-lg">Calculate Savings</Button>
        </div>

        {result?.error && <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-lg text-center font-medium border border-red-200">{result.error}</div>}

        {result && !result.error && (
            <div className="mt-8 bg-slate-50 p-6 rounded-xl border border-slate-200">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-orange-600 uppercase tracking-tight">{result.system.name}</h3>
                        <p className="text-sm text-gray-500 font-bold uppercase">Estimated Flow: {fmt(result.metrics.adjFlowLhr)} L/hr</p>
                    </div>
                    <div className="text-right">
                        <div className="text-4xl font-black text-green-600">{symbol}{fmt(result.financials.totalSavings)}</div>
                        <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Total Annual Savings</p>
                    </div>
                </div>
                {/* Result metrics grid... */}
                <div className="flex justify-end gap-3 mt-6">
                    <Button variant="secondary" onClick={() => window.print()}><Printer size={16} className="mr-2"/>Print Report</Button>
                    <Button variant="primary" className="bg-orange-600 text-white"><Save size={16} className="mr-2"/>Save to CRM</Button>
                </div>
            </div>
        )}
    </Card>
  );
};

export default HeatPumpCalculator;
