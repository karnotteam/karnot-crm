import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; 
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from "firebase/auth";
import { calculateHeatPump, CONFIG } from '../utils/heatPumpLogic'; 
import { Card, Section, Input, Button } from '../data/constants.jsx'; 
import { Save, Calculator, RefreshCw, Printer, X, Check } from 'lucide-react';

const HeatPumpCalculator = ({ leadId }) => {  
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
    lpgSize: 11, // Added for parity with HTML
    elecRate: 12.25,
    ambientTemp: 30,
    inletTemp: 15,
    targetTemp: 55,
    systemType: 'grid-solar',
    sunHours: 5.5,
    heatPumpType: 'all',
    includeCooling: false
  });

  const [showModal, setShowModal] = useState(false);
  const [fixtureInputs, setFixtureInputs] = useState({ showers: 0, basins: 0, sinks: 0, people: 0, hours: 8 });
  const [result, setResult] = useState(null);
  const [dbProducts, setDbProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) { setLoading(false); return; }
        try {
            const querySnapshot = await getDocs(collection(db, "users", user.uid, "products"));
            const products = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setDbProducts(products);
        } catch (error) { console.error("Error fetching inventory:", error); }
        finally { setLoading(false); }
    };
    fetchProducts();
  }, []);

  // Sync Rates with Currency
  useEffect(() => {
    const defaults = CONFIG.defaultRate[inputs.currency];
    if (defaults) {
      setInputs(prev => ({
        ...prev,
        elecRate: defaults.grid,
        fuelPrice: prev.heatingType === 'propane' ? defaults.lpgPrice : 
                   (prev.heatingType === 'diesel' ? defaults.diesel : 
                   (prev.heatingType === 'gas' ? defaults.gas : defaults.grid)),
        lpgSize: defaults.lpgSize || 11
      }));
    }
  }, [inputs.currency]);

  // Run Calculation
  const runCalculation = () => {
    if (dbProducts.length === 0) {
        alert("Inventory is empty. Please add products in Product Manager first.");
        return;
    }
    const res = calculateHeatPump(inputs, dbProducts);
    setResult(res);
  };

  const handleChange = (field, isNumber = false) => (e) => {
    let val = isNumber ? parseFloat(e.target.value) || 0 : e.target.value;
    if (field === 'includeCooling') val = e.target.value === 'true';
    
    setInputs(prev => ({ ...prev, [field]: val }));
  };

  const applyFixtureCalculation = () => {
      const { showers, basins, sinks, people, hours } = fixtureInputs;
      const totalLiters = Math.round((50 * showers * 0.4) + (284 * people * 0.15 * 0.25 * 0.4) + (20 * basins * 0.4) + (114 * sinks * 0.3 * hours * 0.4));
      setInputs(prev => ({ ...prev, dailyLitersInput: totalLiters }));
      setShowModal(false);
  };

  const symbol = CONFIG.SYMBOLS[inputs.currency] || '$';
  const fmt = n => (+n).toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <Card>
        <div className="flex justify-between items-center mb-6 border-b pb-4">
            <h2 className="text-2xl font-bold text-orange-600 flex items-center gap-2">
                <Calculator size={24}/> Heat Pump ROI Calculator
            </h2>
            {loading && <span className="text-sm text-gray-500 flex items-center gap-1"><RefreshCw size={12} className="animate-spin"/> Syncing Inventory...</span>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Section title="1. Your Demand">
                <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700">User Type</label>
                    <select className="w-full border p-2 rounded" value={inputs.userType} onChange={handleChange('userType')}>
                        <option value="home">Home</option>
                        <option value="restaurant">Restaurant</option>
                        <option value="resort">Hotels & Resorts</option>
                        <option value="spa">Spa / Clinic</option>
                        <option value="school">Schools</option>
                        <option value="office">Office</option>
                    </select>
                    {inputs.userType === 'home' && <Input label="Occupants" type="number" value={inputs.occupants} onChange={handleChange('occupants', true)} />}
                    {['office','school','spa'].includes(inputs.userType) && (
                        <div>
                            <Input label="Liters / Day" type="number" value={inputs.dailyLitersInput} onChange={handleChange('dailyLitersInput', true)} />
                            <button onClick={() => setShowModal(true)} className="text-xs text-blue-600 underline mt-1">Estimate via Fixtures</button>
                        </div>
                    )}
                    {['restaurant','resort'].includes(inputs.userType) && <Input label="Meals / Day" type="number" value={inputs.mealsPerDay} onChange={handleChange('mealsPerDay', true)} />}
                    {inputs.userType === 'resort' && <Input label="Rooms / Day" type="number" value={inputs.roomsOccupied} onChange={handleChange('roomsOccupied', true)} />}
                    <Input label="Operating Hours" type="number" value={inputs.hoursPerDay} onChange={handleChange('hoursPerDay', true)} />
                </div>
            </Section>

            <Section title="2. Your Costs">
                <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700">Currency</label>
                    <select className="w-full border p-2 rounded" value={inputs.currency} onChange={handleChange('currency')}>
                        <option value="PHP">₱ PHP</option><option value="USD">$ USD</option><option value="GBP">£ GBP</option><option value="EUR">€ EUR</option>
                    </select>
                    <label className="block text-sm font-medium text-gray-700">Current Heating</label>
                    <select className="w-full border p-2 rounded" value={inputs.heatingType} onChange={handleChange('heatingType')}>
                        <option value="electric">Electric</option><option value="gas">Gas</option><option value="propane">LPG</option><option value="diesel">Diesel</option>
                    </select>
                    <Input label={`Fuel Price (${symbol})`} type="number" value={inputs.fuelPrice} onChange={handleChange('fuelPrice', true)} />
                    {inputs.heatingType === 'propane' && <Input label="Tank Size (kg)" type="number" value={inputs.lpgSize} onChange={handleChange('lpgSize', true)} />}
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
                    <label className="block text-sm font-medium text-gray-700">System Type</label>
                    <select className="w-full border p-2 rounded" value={inputs.systemType} onChange={handleChange('systemType')}>
                        <option value="grid-only">Grid Only</option>
                        <option value="grid-solar">Grid + Solar</option>
                    </select>
                    {inputs.systemType === 'grid-solar' && <Input label="Sun Hours" type="number" value={inputs.sunHours} onChange={handleChange('sunHours', true)} />}
                    <label className="block text-sm font-medium text-gray-700">HP Type</label>
                    <select className="w-full border p-2 rounded" value={inputs.heatPumpType} onChange={handleChange('heatPumpType')}>
                        <option value="all">Best Price (All)</option>
                        <option value="r32">R32</option><option value="r290">R290</option><option value="co2">CO2</option>
                    </select>
                    <label className="block text-sm font-medium text-gray-700">Free Cooling?</label>
                    <select className="w-full border p-2 rounded" value={inputs.includeCooling.toString()} onChange={handleChange('includeCooling')}>
                        <option value="false">No</option><option value="true">Yes</option>
                    </select>
                </div>
            </Section>
        </div>

        <div className="mt-8 flex justify-center">
            <Button onClick={runCalculation} variant="primary" className="px-12 py-4 text-lg">Calculate Savings</Button>
        </div>

        {result?.error && <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">{result.error}</div>}

        {result && !result.error && (
            <div className="mt-8 bg-slate-50 p-6 rounded-xl border border-slate-200">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-orange-600 uppercase">{result.system.name}</h3>
                        <p className="text-sm text-gray-500 font-bold uppercase">Max Output: {fmt(result.metrics.adjFlowLhr)} L/hr</p>
                    </div>
                    <div className="text-right">
                        <div className="text-4xl font-black text-green-600">{symbol}{fmt(result.financials.totalSavings)}</div>
                        <p className="text-[10px] uppercase font-black text-gray-400">Total Annual Savings</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-xl border text-center">
                        <div className="text-[10px] uppercase font-black text-slate-400">Payback</div>
                        <div className="text-xl font-black text-orange-600">{result.financials.paybackYears} Yrs</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border text-center">
                        <div className="text-[10px] uppercase font-black text-slate-400">CO₂ Saved</div>
                        <div className="text-xl font-black text-green-600">{fmt(result.metrics.emissionsSaved)} kg</div>
                    </div>
                    {result.metrics.panels > 0 && (
                        <div className="bg-white p-4 rounded-xl border text-center">
                            <div className="text-[10px] uppercase font-black text-slate-400">Solar Panels</div>
                            <div className="text-xl font-black text-amber-500">{result.metrics.panels}</div>
                        </div>
                    )}
                    <div className="bg-white p-4 rounded-xl border text-center">
                        <div className="text-[10px] uppercase font-black text-slate-400">Total Capex</div>
                        <div className="text-xl font-black text-slate-700">{symbol}{fmt(result.financials.capex.total)}</div>
                    </div>
                </div>

                {result.financials.coolSavings > 0 && (
                    <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded text-blue-800">
                        <p className="font-bold">Free Cooling Bonus!</p>
                        <p className="text-sm">This system provides free cooling worth approximately {symbol}{fmt(result.financials.coolSavings)} per year.</p>
                    </div>
                )}

                <div className="flex justify-end gap-3">
                    <Button onClick={() => window.print()} variant="secondary"><Printer size={16} className="mr-2"/> Print Results</Button>
                    <Button onClick={() => alert("Logic to save lead here")} variant="primary"><Save size={16} className="mr-2"/> Save to Lead</Button>
                </div>
            </div>
        )}

        {showModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-lg max-w-md w-full">
                    <h3 className="text-lg font-bold mb-4">Fixture Use Estimate</h3>
                    <div className="space-y-3">
                        <Input label="Showers" type="number" value={fixtureInputs.showers} onChange={(e) => setFixtureInputs(p => ({...p, showers: +e.target.value}))} />
                        <Input label="Occupants" type="number" value={fixtureInputs.people} onChange={(e) => setFixtureInputs(p => ({...p, people: +e.target.value}))} />
                        <Button onClick={applyFixtureCalculation} className="w-full">Apply Values</Button>
                        <Button onClick={() => setShowModal(false)} variant="secondary" className="w-full">Cancel</Button>
                    </div>
                </div>
            </div>
        )}
    </Card>
  );
};

export default HeatPumpCalculator;
