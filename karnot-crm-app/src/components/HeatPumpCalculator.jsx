import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; 
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from "firebase/auth";
import { calculateHeatPump, CONFIG } from '../utils/heatPumpLogic'; 
import { Card, Section, Input, Button } from '../data/constants.jsx'; 
import { Save, Calculator, RefreshCw, Printer, X, Check } from 'lucide-react';

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

  // --- 1. FETCH PRODUCTS ---
  useEffect(() => {
    const fetchProducts = async () => {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) { setLoading(false); return; }
        try {
            const querySnapshot = await getDocs(collection(db, "users", user.uid, "products"));
            setDbProducts(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) { console.error("Error fetching inventory:", error); }
        finally { setLoading(false); }
    };
    fetchProducts();
  }, []);

  // --- 2. CURRENCY SYNC ---
  // When currency changes, update the default rates to match local market prices
  useEffect(() => {
      const defaults = CONFIG.defaultRate[inputs.currency];
      if (defaults) {
          let newFuelPrice = inputs.heatingType === 'propane' ? defaults.lpgPrice : 
                             (inputs.heatingType === 'diesel' ? defaults.diesel : 
                             (inputs.heatingType === 'gas' ? defaults.gas : defaults.grid));
          setInputs(prev => ({ 
              ...prev, 
              elecRate: defaults.grid, 
              fuelPrice: newFuelPrice,
              tankSize: defaults.lpgSize || 11
          }));
      }
  }, [inputs.currency]);

  // --- 3. AUTO CALCULATE ---
  useEffect(() => {
    if (!loading && dbProducts.length > 0) {
        setResult(calculateHeatPump(inputs, dbProducts));
    }
  }, [inputs, dbProducts, loading]);

  const handleChange = (field, isNumber = false) => (e) => {
    const val = isNumber ? parseFloat(e.target.value) || 0 : e.target.value;
    if (field === 'heatingType') {
        const defaults = CONFIG.defaultRate[inputs.currency];
        let newFuelPrice = val === 'propane' ? defaults.lpgPrice : (val === 'diesel' ? defaults.diesel : (val === 'gas' ? defaults.gas : defaults.grid));
        setInputs(prev => ({ ...prev, [field]: val, fuelPrice: newFuelPrice }));
    } else {
        setInputs(prev => ({ ...prev, [field]: val }));
    }
  };

  const applyFixtureCalculation = () => {
      const { showers, basins, sinks, people, hours } = fixtureInputs;
      const totalLiters = Math.round((50 * showers * 0.4) + (284 * people * 0.15 * 0.25 * 0.4) + (20 * basins * 0.4) + (114 * sinks * 0.3 * hours * 0.4));
      setInputs(prev => ({ ...prev, dailyLitersInput: totalLiters }));
      setShowModal(false);
  };

  const symbol = CONFIG.SYMBOLS[inputs.currency] || '$';
  const fmt = n => (+n).toLocaleString(undefined, { maximumFractionDigits: 0 });

  const generateReport = () => {
      if (!result || result.error) return;
      const q = result;
      const coolSavingsRow = q.financials.coolSavings > 0 ? `<tr><td>Annual Free Cooling Savings</td><td style="color:#007aff">${q.financials.symbol}${fmt(q.financials.coolSavings)}</td></tr>` : '';
      const reportHTML = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Report</title><style>body{font-family:Inter,sans-serif;padding:40px;color:#1d1d1f}.report-container{max-width:800px;margin:auto}.header{text-align:center;border-bottom:2px solid #F56600;padding-bottom:20px;margin-bottom:30px}h1{color:#F56600;margin:0}h2{font-size:22px;border-bottom:1px solid #d2d2d7;padding-bottom:10px;margin-top:40px}.summary-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;text-align:center;margin:30px 0}.metric .value{font-size:28px;font-weight:700;color:#F56600}.details-table{width:100%;border-collapse:collapse;font-size:16px}.details-table td{padding:12px 0;border-bottom:1px solid #d2d2d7}.details-table td:last-child{text-align:right;font-weight:600}</style></head><body><div class="report-container"><div class="header"><h1>Karnot Savings Report</h1><p>Internal Estimate for ${q.system.n}</p></div><h2>Recommendation: <strong>${q.system.n}</strong></h2><div class="summary-grid"><div class="metric"><div class="value">${q.financials.symbol}${fmt(q.financials.totalSavings)}</div><div>Total Annual Savings</div></div><div class="metric"><div class="value">${q.financials.paybackYears} Yrs</div><div>Estimated Payback</div></div><div class="metric"><div class="value">${fmt(q.metrics.dailyLiters)} L</div><div>Daily Demand</div></div></div><h2>Financial Breakdown</h2><table class="details-table"><tr><td>Annual Cost (Old System)</td><td>${q.financials.symbol}${fmt(q.financials.annualCostOld)}</td></tr><tr><td>Annual Cost (New HP)</td><td>${q.financials.symbol}${fmt(q.financials.karnotAnnualCost)}</td></tr>${coolSavingsRow}<tr><td>Total Annual Savings</td><td style="color:#28a754">${q.financials.symbol}${fmt(q.financials.totalSavings)}</td></tr></table><p>Assumes system cost of ${q.financials.symbol}${fmt(q.financials.capex.total)}.</p></div></body></html>`;
      window.open("").document.write(reportHTML);
  };

  const handleSave = async () => {
    if (!result || result.error) return;
    try {
        setIsSaving(true);
        const auth = getAuth();
        const path = leadId ? `users/${auth.currentUser.uid}/leads/${leadId}/calculations` : `users/${auth.currentUser.uid}/calculations`;
        await addDoc(collection(db, path), { type: 'heat-pump-roi', inputs, results: result, createdAt: serverTimestamp() });
        alert("Calculation Saved!");
    } catch (err) { alert("Error: " + err.message); }
    finally { setIsSaving(false); }
  };

  return (
    <Card>
        <div className="flex justify-between items-center mb-6 border-b pb-4">
            <h2 className="text-2xl font-bold text-orange-600 flex items-center gap-2"><Calculator size={24}/> ROI Calculator</h2>
            {loading && <RefreshCw size={16} className="animate-spin text-gray-400"/>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Section title="1. Your Demand">
                <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700">User Type</label>
                    <select className="w-full border p-2 rounded" value={inputs.userType} onChange={handleChange('userType')}>
                        <option value="home">Home</option><option value="restaurant">Restaurant</option><option value="resort">Hotels & Resorts</option><option value="school">Schools</option><option value="office">Office</option><option value="spa">Spa</option>
                    </select>
                    {['home'].includes(inputs.userType) && <Input label="Occupants" type="number" value={inputs.occupants} onChange={handleChange('occupants', true)} />}
                    {['office','school','spa'].includes(inputs.userType) && (
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
                    <label className="block text-sm font-medium text-gray-700">Currency</label>
                    <select className="w-full border p-2 rounded" value={inputs.currency} onChange={handleChange('currency')}>
                        <option value="PHP">₱ PHP</option><option value="USD">$ USD</option><option value="GBP">£ GBP</option><option value="EUR">€ EUR</option>
                    </select>
                    <label className="block text-sm font-medium text-gray-700">Current Heating</label>
                    <select className="w-full border p-2 rounded" value={inputs.heatingType} onChange={handleChange('heatingType')}>
                        <option value="electric">Electric</option><option value="gas">Natural Gas</option><option value="propane">LPG</option><option value="diesel">Diesel</option>
                    </select>
                    <Input label={getRateLabel(inputs.heatingType, symbol)} type="number" value={inputs.fuelPrice} onChange={handleChange('fuelPrice', true)} />
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
                    <select className="w-full border p-2 rounded" value={inputs.heatPumpType} onChange={handleChange('heatPumpType')}>
                        <option value="all">All Refrigerants</option><option value="R290">R290 Only</option><option value="R744">CO2 (R744)</option><option value="R32">R32 Only</option>
                    </select>
                </div>
            </Section>
        </div>

        {result && !result.error && (
            <div className="mt-8 bg-slate-50 p-6 rounded-xl border">
                <div className="flex justify-between items-end mb-4">
                    <h3 className="text-xl font-bold text-orange-600 uppercase">{result.system.n}</h3>
                    <div className="text-right">
                        <div className="text-3xl font-black text-green-600">{symbol}{fmt(result.financials.totalSavings)}</div>
                        <p className="text-xs font-bold text-gray-400">TOTAL ANNUAL SAVINGS</p>
                    </div>
                </div>
                <div className="flex justify-end gap-3">
                    <Button onClick={generateReport} variant="secondary"><Printer size={16} className="mr-2"/>Print Report</Button>
                    <Button onClick={handleSave} variant="success" disabled={isSaving}><Save size={16} className="mr-2"/>{isSaving ? 'Saving...' : 'Save Calculation'}</Button>
                </div>
            </div>
        )}

        {showModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white p-6 rounded-lg max-w-sm w-full relative shadow-2xl">
                    <button onClick={() => setShowModal(false)} className="absolute top-2 right-2 text-gray-400"><X size={20}/></button>
                    <h3 className="font-bold mb-4 uppercase text-orange-600">Fixture Estimator</h3>
                    <div className="space-y-3">
                        <Input label="Showers" type="number" value={fixtureInputs.showers} onChange={(e) => setFixtureInputs(p => ({...p, showers: +e.target.value}))} />
                        <Input label="People" type="number" value={fixtureInputs.people} onChange={(e) => setFixtureInputs(p => ({...p, people: +e.target.value}))} />
                        <Button onClick={applyFixtureCalculation} className="w-full bg-orange-600 text-white py-3">Apply Liters</Button>
                    </div>
                </div>
            </div>
        )}
    </Card>
  );
};

export default HeatPumpCalculator;
