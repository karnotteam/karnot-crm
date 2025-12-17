import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; 
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from "firebase/auth";
import { calculateHeatPump, CONFIG } from '../utils/heatPumpLogic'; 
import { Card, Section, Input, Button } from '../data/constants.jsx'; 
import { Save, Calculator, RefreshCw, Printer, X, Check, snowflake } from 'lucide-react';

const HeatPumpCalculator = ({ leadId }) => {  
  
  // --- MAIN STATE ---
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
    systemType: 'grid-only',
    sunHours: 5.5,
    // RESTORED FIELDS
    heatPumpType: 'all',
    includeCooling: false
  });

  // --- MODAL & RESULT STATE ---
  const [showModal, setShowModal] = useState(false);
  const [fixtureInputs, setFixtureInputs] = useState({
      showers: 0,
      basins: 0,
      sinks: 0,
      people: 0,
      hours: 8
  });
  const [result, setResult] = useState(null);
  const [dbProducts, setDbProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // --- 1. FETCH PRODUCTS ---
  useEffect(() => {
    const fetchProducts = async () => {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) { setLoading(false); return; }
        
        try {
            const querySnapshot = await getDocs(collection(db, "users", user.uid, "products"));
            const products = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setDbProducts(products);
        } catch (error) {
            console.error("Error fetching inventory:", error);
        } finally {
            setLoading(false);
        }
    };
    fetchProducts();
  }, []);

  // --- 2. AUTO-UPDATE RATES WHEN CURRENCY CHANGES ---
  useEffect(() => {
    const currency = inputs.currency;
    const defaults = CONFIG.defaultRate[currency];
    
    if (defaults) {
      setInputs(prev => ({
        ...prev,
        elecRate: defaults.grid,
        fuelPrice: prev.heatingType === 'propane' ? defaults.lpgPrice : 
                   (prev.heatingType === 'diesel' ? defaults.diesel : 
                   (prev.heatingType === 'gas' ? defaults.gas : defaults.grid))
      }));
    }
  }, [inputs.currency]);

  // --- 3. AUTO CALCULATE ---
  useEffect(() => {
    if (!loading && dbProducts.length > 0) {
        const res = calculateHeatPump(inputs, dbProducts);
        setResult(res);
    }
  }, [inputs, dbProducts, loading]);

  // --- HANDLERS ---
  const handleChange = (field, isNumber = false) => (e) => {
    const val = isNumber ? parseFloat(e.target.value) || 0 : e.target.value;
    
    // Custom logic for cooling (converting string from select to boolean)
    if (field === 'includeCooling') {
        setInputs(prev => ({ ...prev, [field]: e.target.value === 'true' }));
        return;
    }

    if (field === 'heatingType') {
        const currency = inputs.currency;
        const defaults = CONFIG.defaultRate[currency];
        let newFuelPrice = val === 'propane' ? defaults.lpgPrice : (val === 'diesel' ? defaults.diesel : (val === 'gas' ? defaults.gas : defaults.grid));
        setInputs(prev => ({ ...prev, [field]: val, fuelPrice: newFuelPrice }));
    } else {
        setInputs(prev => ({ ...prev, [field]: val }));
    }
  };

  const handleFixtureChange = (field) => (e) => {
      setFixtureInputs(prev => ({ ...prev, [field]: parseFloat(e.target.value) || 0 }));
  };

  const applyFixtureCalculation = () => {
      const { showers, basins, sinks, people, hours } = fixtureInputs;
      const totalLiters = Math.round(
          (50 * showers * 0.4) + 
          (284 * people * 0.15 * 0.25 * 0.4) + 
          (20 * basins * 0.4) + 
          (114 * sinks * 0.3 * hours * 0.4)
      );
      setInputs(prev => ({ ...prev, dailyLitersInput: totalLiters }));
      setShowModal(false);
  };
  
  const isShowerFieldVisible = ['office','school','spa'].includes(inputs.userType);
  const isMealFieldVisible = ['restaurant','resort'].includes(inputs.userType);
  const isRoomFieldVisible = inputs.userType === 'resort';
  const isOccupantFieldVisible = inputs.userType === 'home';
  const isSunHoursVisible = inputs.systemType === 'grid-solar';
  
  const getRateLabel = (type, symbol) => {
      if (type === 'electric') return `Electricity Rate (${symbol}/kWh)`;
      if (type === 'gas') return `Natural Gas Rate (${symbol}/kWh)`;
      if (type === 'propane') return `Propane/LPG Cylinder Price (${symbol})`;
      if (type === 'diesel') return `Diesel Price per Liter (${symbol})`;
      return `Rate (${symbol})`;
  };

  const symbol = CONFIG.SYMBOLS[inputs.currency] || '$';
  const fmt = n => (+n).toLocaleString(undefined, { maximumFractionDigits: 0 });

  const generateReport = () => {
      if (!result || result.error) return;
      const q = result;
      
      const reportHTML = `
        <!DOCTYPE html><html><head><title>Karnot Savings Report</title>
        <style> body { font-family: sans-serif; padding: 40px; color: #1d1d1f; } .header { text-align: center; border-bottom: 2px solid #F56600; padding-bottom: 20px; margin-bottom: 30px; } h1 { color: #F56600; } .summary { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; text-align: center; margin: 30px 0; } .metric-val { font-size: 24px; font-weight: bold; color: #F56600; } .details { width: 100%; border-collapse: collapse; } .details td { padding: 12px; border-bottom: 1px solid #eee; } </style>
        </head><body><div class="header"><h1>Karnot Savings Report</h1><p>Internal Estimate for ${q.system.n}</p></div>
        <h2>System Recommendation: ${q.system.n}</h2>
        <div class="summary">
            <div><div class="metric-val">${q.financials.symbol}${fmt(q.financials.totalSavings)}</div><div>Annual Savings</div></div>
            <div><div class="metric-val">${q.financials.paybackYears} Yrs</div><div>Payback Period</div></div>
            <div><div class="metric-val">${fmt(q.metrics.emissionsSaved)} kg</div><div>CO₂ Reduction</div></div>
        </div>
        <table class="details">
            <tr><td>Annual Cost (Old System)</td><td align="right">${q.financials.symbol}${fmt(q.financials.annualCostOld)}</td></tr>
            <tr><td>Annual Cost (New HP)</td><td align="right">${q.financials.symbol}${fmt(q.financials.annualKarnotCost)}</td></tr>
            <tr><td><b>Total Annual Savings</b></td><td align="right"><b>${q.financials.symbol}${fmt(q.financials.totalSavings)}</b></td></tr>
        </table>
        </body></html>`;
      
      const win = window.open("", "_blank");
      win.document.write(reportHTML);
  };

  const handleSave = async () => {
    if (!result || result.error) return;
    try {
        setIsSaving(true);
        const auth = getAuth();
        const user = auth.currentUser;
        const path = leadId ? `users/${user.uid}/leads/${leadId}/calculations` : `users/${user.uid}/calculations`;
        await addDoc(collection(db, path), {
            type: 'heat-pump-roi',
            inputs,
            results: result,
            createdAt: serverTimestamp()
        });
        alert("Calculation Saved!");
    } catch (err) {
        alert("Error saving: " + err.message);
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <Card>
        <div className="flex justify-between items-center mb-6 border-b pb-4">
            <h2 className="text-2xl font-bold text-orange-600 flex items-center gap-2">
                <Calculator size={24}/> Heat Pump ROI Calculator
            </h2>
            {loading && <span className="text-sm text-gray-500 flex items-center gap-1"><RefreshCw size={12} className="animate-spin"/> Syncing...</span>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* COLUMN 1 */}
            <Section title="1. Your Demand">
                <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">User Type</label>
                    <select className="w-full border p-2 rounded" value={inputs.userType} onChange={handleChange('userType')}>
                        <option value="home">Home</option>
                        <option value="restaurant">Restaurant</option>
                        <option value="resort">Hotels & Resorts</option>
                        <option value="school">Schools</option>
                        <option value="office">Office</option>
                        <option value="spa">Spa</option>
                    </select>
                    {isOccupantFieldVisible && <Input label="Occupants" type="number" value={inputs.occupants} onChange={handleChange('occupants', true)} />}
                    {isShowerFieldVisible && <div><Input label="Liters / Day" type="number" value={inputs.dailyLitersInput} onChange={handleChange('dailyLitersInput', true)} /><button onClick={() => setShowModal(true)} className="mt-2 text-sm text-blue-600 underline">Estimate via Fixtures</button></div>}
                    {isMealFieldVisible && <Input label="Meals / Day" type="number" value={inputs.mealsPerDay} onChange={handleChange('mealsPerDay', true)} />}
                    {isRoomFieldVisible && <Input label="Rooms / Day" type="number" value={inputs.roomsOccupied} onChange={handleChange('roomsOccupied', true)} />}
                    <Input label="Operating Hours" type="number" value={inputs.hoursPerDay} onChange={handleChange('hoursPerDay', true)} />
                </div>
            </Section>

            {/* COLUMN 2 */}
            <Section title="2. Your Costs">
                <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                    <select className="w-full border p-2 rounded" value={inputs.currency} onChange={handleChange('currency')}>
                        <option value="PHP">₱ PHP</option><option value="USD">$ USD</option><option value="GBP">£ GBP</option><option value="EUR">€ EUR</option>
                    </select>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Heating</label>
                    <select className="w-full border p-2 rounded" value={inputs.heatingType} onChange={handleChange('heatingType')}>
                        <option value="electric">Electric</option><option value="gas">Gas</option><option value="propane">LPG</option><option value="diesel">Diesel</option>
                    </select>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{getRateLabel(inputs.heatingType, symbol)}</label>
                    <Input type="number" value={inputs.fuelPrice} onChange={handleChange('fuelPrice', true)} />
                    <Input label={`HP Elec Rate (${symbol}/kWh)`} type="number" value={inputs.elecRate} onChange={handleChange('elecRate', true)} />
                </div>
            </Section>
            
            {/* COLUMN 3 */}
            <Section title="3. Conditions & Options">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                        <Input label="Air Temp (°C)" type="number" value={inputs.ambientTemp} onChange={handleChange('ambientTemp', true)} />
                        <Input label="Inlet Temp (°C)" type="number" value={inputs.inletTemp} onChange={handleChange('inletTemp', true)} />
                    </div>
                    <Input label="Target Water Temp (°C)" type="number" value={inputs.targetTemp} onChange={handleChange('targetTemp', true)} />
                    
                    <label className="block text-sm font-medium text-gray-700 mb-1">System Type</label>
                    <select className="w-full border p-2 rounded" value={inputs.systemType} onChange={handleChange('systemType')}>
                        <option value="grid-only">Grid Only</option>
                        <option value="grid-solar">Grid + Solar</option>
                    </select>

                    {/* RESTORED SELECTION FOR REFRIGERANT TYPE */}
                    <label className="block text-sm font-medium text-gray-700 mb-1">Heat Pump Type</label>
                    <select className="w-full border p-2 rounded" value={inputs.heatPumpType} onChange={handleChange('heatPumpType')}>
                        <option value="all">Best Price (All Models)</option>
                        <option value="r32">R32 Models Only</option>
                        <option value="r290">R290 Models Only</option>
                        <option value="co2">CO2 Models Only</option>
                    </select>

                    {/* RESTORED COOLING TOGGLE */}
                    <label className="block text-sm font-medium text-gray-700 mb-1">Require Free Cooling?</label>
                    <select className="w-full border p-2 rounded" value={inputs.includeCooling.toString()} onChange={handleChange('includeCooling')}>
                        <option value="false">No</option>
                        <option value="true">Yes</option>
                    </select>
                </div>
            </Section>
        </div>

        <div className="mt-8 flex justify-center">
            <Button onClick={() => setResult(calculateHeatPump(inputs, dbProducts))} variant="primary" className="px-12 py-4 text-lg">Calculate Savings</Button>
        </div>

        {result && !result.error && (
            <div className="mt-8 bg-slate-50 p-6 rounded-xl border border-slate-200">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-orange-600 uppercase tracking-tight">{result.system.n}</h3>
                        <p className="text-sm text-gray-500 font-bold uppercase">Estimated Flow: {fmt(result.metrics.adjFlowLhr)} L/hr</p>
                    </div>
                    <div className="text-right">
                        <div className="text-4xl font-black text-green-600">{result.financials.symbol}{fmt(result.financials.totalSavings)}</div>
                        <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Total Annual Savings</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-xl border text-center shadow-sm">
                        <div className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Payback</div>
                        <div className="text-xl font-black text-orange-600">{result.financials.paybackYears} Yrs</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border text-center shadow-sm">
                        <div className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">CO₂ Saved</div>
                        <div className="text-xl font-black text-green-600">{fmt(result.metrics.emissionsSaved)} kg</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border text-center shadow-sm">
                        <div className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Solar Panels</div>
                        <div className="text-xl font-black text-amber-500">{result.metrics.panels}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border text-center shadow-sm">
                        <div className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Total Capex</div>
                        <div className="text-xl font-black text-slate-700">{result.financials.symbol}{fmt(result.financials.capex.total)}</div>
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <Button onClick={generateReport} variant="secondary"><Printer size={16} className="mr-2"/> Printable Report</Button>
                    <Button onClick={handleSave} variant="primary" disabled={isSaving}><Save size={16} className="mr-2"/> Save to Lead</Button>
                </div>
            </div>
        )}

        {showModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-lg max-w-md w-full">
                    <h3 className="text-lg font-bold mb-4">Fixture Use Estimate</h3>
                    <div className="space-y-3">
                        <Input label="Showers" type="number" value={fixtureInputs.showers} onChange={handleFixtureChange('showers')} />
                        <Input label="Lavatory Basins" type="number" value={fixtureInputs.basins} onChange={handleFixtureChange('basins')} />
                        <Input label="Kitchen Sinks" type="number" value={fixtureInputs.sinks} onChange={handleFixtureChange('sinks')} />
                        <Input label="Occupants / People" type="number" value={fixtureInputs.people} onChange={handleFixtureChange('people')} />
                        <Input label="Operating Hours" type="number" value={fixtureInputs.hours} onChange={handleFixtureChange('hours')} />
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                        <Button onClick={() => setShowModal(false)} variant="secondary">Cancel</Button>
                        <Button onClick={applyFixtureCalculation} variant="primary">Apply Liters</Button>
                    </div>
                </div>
            </div>
        )}
    </Card>
  );
};

export default HeatPumpCalculator;
