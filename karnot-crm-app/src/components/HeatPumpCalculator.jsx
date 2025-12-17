import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; 
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from "firebase/auth";
import { calculateHeatPump, CONFIG } from '../utils/heatPumpLogic'; 
import { Card, Section, Input, Button } from '../data/constants.jsx'; 
import { Save, Calculator, RefreshCw, Printer, X, Check } from 'lucide-react';

const HeatPumpCalculator = ({ leadId }) => {  
  const [inputs, setInputs] = useState({
    currency: 'PHP', userType: 'home', occupants: 4, dailyLitersInput: 500, mealsPerDay: 0,
    roomsOccupied: 0, hoursPerDay: 12, heatingType: 'electric', fuelPrice: 12.25, tankSize: 11,
    elecRate: 12.25, ambientTemp: 30, inletTemp: 15, targetTemp: 55, systemType: 'grid-solar',
    sunHours: 5.5, heatPumpType: 'all', includeCooling: false
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
            setDbProducts(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } finally { setLoading(false); }
    };
    fetchProducts();
  }, []);

  // CURRENCY SYNC: Critical fix for ROI calculation
  useEffect(() => {
      const defaults = CONFIG.defaultRate[inputs.currency];
      if (defaults) {
          const newFuel = inputs.heatingType === 'propane' ? defaults.lpgPrice : 
                          (inputs.heatingType === 'diesel' ? defaults.diesel : 
                          (inputs.heatingType === 'gas' ? defaults.gas : defaults.grid));
          setInputs(prev => ({ 
              ...prev, 
              elecRate: defaults.grid, 
              fuelPrice: newFuel,
              tankSize: defaults.lpgSize || 11 
          }));
      }
  }, [inputs.currency]);

  useEffect(() => {
    if (!loading && dbProducts.length > 0) {
        setResult(calculateHeatPump(inputs, dbProducts));
    }
  }, [inputs, dbProducts, loading]);

  const handleChange = (field, isNumber = false) => (e) => {
    const val = isNumber ? parseFloat(e.target.value) || 0 : e.target.value;
    setInputs(prev => ({ ...prev, [field]: val }));
  };

  const applyFixtureCalculation = () => {
      const { showers, basins, sinks, people, hours } = fixtureInputs;
      const total = Math.round((50 * showers * 0.4) + (284 * people * 0.15 * 0.25 * 0.4) + (20 * basins * 0.4) + (114 * sinks * 0.3 * hours * 0.4));
      setInputs(prev => ({ ...prev, dailyLitersInput: total }));
      setShowModal(false);
  };

  const fmt = n => (+n).toLocaleString(undefined, { maximumFractionDigits: 0 });
  const symbol = CONFIG.SYMBOLS[inputs.currency];

  return (
    <Card>
        <div className="flex justify-between items-center mb-6 border-b pb-4">
            <h2 className="text-2xl font-bold text-orange-600 flex items-center gap-2"><Calculator size={24}/> Heat Pump ROI</h2>
            {loading && <RefreshCw size={16} className="animate-spin text-gray-400"/>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Section title="1. Your Demand">
                <div className="space-y-4">
                    <select className="w-full border p-2 rounded bg-white" value={inputs.userType} onChange={handleChange('userType')}>
                        <option value="home">Home</option>
                        <option value="restaurant">Restaurant</option>
                        <option value="resort">Hotels & Resorts</option>
                        <option value="school">Schools</option>
                        <option value="office">Office</option>
                        <option value="spa">Spa</option>
                    </select>
                    {['home'].includes(inputs.userType) && <Input label="Occupants" type="number" value={inputs.occupants} onChange={handleChange('occupants', true)} />}
                    {['school','office','spa'].includes(inputs.userType) && (
                        <div>
                            <Input label="Liters / Day" type="number" value={inputs.dailyLitersInput} onChange={handleChange('dailyLitersInput', true)} />
                            <button onClick={() => setShowModal(true)} className="text-xs text-blue-600 underline">Estimate via Fixtures</button>
                        </div>
                    )}
                    {['restaurant','resort'].includes(inputs.userType) && <Input label="Meals / Day" type="number" value={inputs.mealsPerDay} onChange={handleChange('mealsPerDay', true)} />}
                    <Input label="Operating Hours" type="number" value={inputs.hoursPerDay} onChange={handleChange('hoursPerDay', true)} />
                </div>
            </Section>

            <Section title="2. Your Costs">
                <div className="space-y-4">
                    <select className="w-full border p-2 rounded bg-white" value={inputs.currency} onChange={handleChange('currency')}>
                        <option value="PHP">₱ PHP</option><option value="USD">$ USD</option><option value="GBP">£ GBP</option><option value="EUR">€ EUR</option>
                    </select>
                    <select className="w-full border p-2 rounded bg-white" value={inputs.heatingType} onChange={handleChange('heatingType')}>
                        <option value="electric">Electric</option><option value="gas">Natural Gas</option><option value="propane">LPG</option><option value="diesel">Diesel</option>
                    </select>
                    <Input label={`Fuel Rate (${symbol})`} type="number" value={inputs.fuelPrice} onChange={handleChange('fuelPrice', true)} />
                    <Input label={`Electricity Rate (${symbol}/kWh)`} type="number" value={inputs.elecRate} onChange={handleChange('elecRate', true)} />
                </div>
            </Section>
            
            <Section title="3. Conditions">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                        <Input label="Air Temp (°C)" type="number" value={inputs.ambientTemp} onChange={handleChange('ambientTemp', true)} />
                        <Input label="Inlet Temp (°C)" type="number" value={inputs.inletTemp} onChange={handleChange('inletTemp', true)} />
                    </div>
                    <Input label="Target Temp (°C)" type="number" value={inputs.targetTemp} onChange={handleChange('targetTemp', true)} />
                    <select className="w-full border p-2 rounded bg-white" value={inputs.heatPumpType} onChange={handleChange('heatPumpType')}>
                        <option value="all">All Models</option><option value="R290">R290 Only</option><option value="R32">R32 Only</option>
                    </select>
                </div>
            </Section>
        </div>

        {result && !result.error && (
            <div className="mt-8 bg-slate-50 p-6 rounded-xl border border-slate-200">
                <div className="flex justify-between items-end mb-4">
                    <h3 className="text-xl font-bold text-orange-600 uppercase tracking-tight">{result.system.n}</h3>
                    <div className="text-right text-4xl font-black text-green-600">{symbol}{fmt(result.financials.totalSavings)}</div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded border text-center">
                        <div className="text-[10px] font-bold text-gray-400 uppercase">Payback</div>
                        <div className="text-xl font-bold">{result.financials.paybackYears} Yrs</div>
                    </div>
                    <div className="bg-white p-4 rounded border text-center">
                        <div className="text-[10px] font-bold text-gray-400 uppercase">Capex</div>
                        <div className="text-xl font-bold">{symbol}{fmt(result.financials.capex.total)}</div>
                    </div>
                </div>
            </div>
        )}

        {showModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white p-8 rounded-lg max-w-sm w-full relative">
                    <button onClick={() => setShowModal(false)} className="absolute top-2 right-2"><X size={20}/></button>
                    <h3 className="font-bold mb-4 uppercase text-orange-600">Fixture Estimator</h3>
                    <div className="space-y-3">
                        <Input label="Showers" type="number" value={fixtureInputs.showers} onChange={e => setFixtureInputs(p => ({...p, showers: +e.target.value}))} />
                        <Input label="People" type="number" value={fixtureInputs.people} onChange={e => setFixtureInputs(p => ({...p, people: +e.target.value}))} />
                        <Button onClick={applyFixtureCalculation} className="w-full bg-orange-600 text-white py-3">Apply Liters</Button>
                    </div>
                </div>
            </div>
        )}
    </Card>
  );
};

export default HeatPumpCalculator;
