import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; 
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from "firebase/auth";
import { calculateHeatPump, CONFIG } from '../utils/heatPumpLogic'; 
import { Card, Section, Input, Button } from '../data/constants.jsx'; 
import { Save, Calculator, RefreshCw, Printer, X, Check, Droplets, Gauge } from 'lucide-react';

const HeatPumpCalculator = ({ leadId }) => {  
  
  // --- 1. FULL STATE RESTORATION ---
  const [inputs, setInputs] = useState({
    currency: 'PHP',
    userType: 'home',
    occupants: 4,
    dailyLitersInput: 150, // Standardized for Home use with iSTOR Integral 150L
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
  const [fixtureInputs, setFixtureInputs] = useState({
      showers: 0, basins: 0, sinks: 0, people: 0, hours: 8
  });
  const [result, setResult] = useState(null);
  const [dbProducts, setDbProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // CRITICAL GUARD: Safely get symbol to prevent white screen
  const symbol = CONFIG?.SYMBOLS?.[inputs.currency] || '$';

  // --- 2. FETCH PRODUCTS ---
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
            console.error("Inventory Fetch Error:", error);
        } finally {
            setLoading(false);
        }
    };
    fetchProducts();
  }, []);

  // --- 3. AUTO-CALCULATE & SYNC ---
  useEffect(() => {
    if (inputs.userType === 'home' && inputs.dailyLitersInput !== 150) {
        setInputs(prev => ({ ...prev, dailyLitersInput: 150 }));
    }
    
    if (!loading && dbProducts.length > 0) {
        try {
            const res = calculateHeatPump(inputs, dbProducts);
            setResult(res);
        } catch (err) {
            console.error("Logic Error:", err);
        }
    }
  }, [inputs, dbProducts, loading]);

  // --- 4. HANDLERS ---
  const handleChange = (field, isNumber = false) => (e) => {
    const val = isNumber ? parseFloat(e.target.value) || 0 : e.target.value;
    
    if (field === 'currency') {
        const defaults = CONFIG?.defaultRate?.[val];
        if (!defaults) return; 
        setInputs(prev => ({ 
            ...prev, currency: val, fuelPrice: defaults.grid, elecRate: defaults.grid 
        }));
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
          (50 * showers * 0.4) + (284 * people * 0.15 * 0.25 * 0.4) + (20 * basins * 0.4) + (114 * sinks * 0.3 * hours * 0.4)
      );
      setInputs(prev => ({ ...prev, dailyLitersInput: totalLiters }));
      setShowModal(false);
  };

  // --- 5. PDF REPORT GENERATOR (RESTORED) ---
  const fmt = n => (+n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

  const generateReport = () => {
      if (!result || result.error || !result.financials) return;
      const q = result;
      const reportHTML = `<html><body style="font-family: sans-serif; padding: 40px;">
            <h1 style="color: #F56600;">Karnot ROI Report</h1>
            <p><strong>System Match:</strong> ${q.system?.n || 'N/A'}</p>
            <p><strong>Tank Size:</strong> ${q.system?.tankSize || 0}L</p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <tr style="border-bottom: 1px solid #eee;"><td>Baseline Cost</td><td>${symbol}${fmt(q.financials.annualCostOld)}</td></tr>
                <tr style="border-bottom: 10px solid #fff;"><td>New Annual Cost</td><td>${symbol}${fmt(q.financials.karnotAnnualCost)}</td></tr>
                <tr style="font-weight:bold; font-size: 1.2em;"><td>Total Savings</td><td>${symbol}${fmt(q.financials.totalSavings)}</td></tr>
            </table>
        </body></html>`;
      const win = window.open("", "_blank");
      win.document.write(reportHTML);
  };

  const handleSave = async () => {
    if (!result || result.error) return;
    try {
        setIsSaving(true);
        const user = getAuth().currentUser;
        const path = leadId ? `users/${user.uid}/leads/${leadId}/calculations` : `users/${user.uid}/calculations`;
        await addDoc(collection(db, path), { type: 'heat-pump-roi-v3', inputs, results: result, createdAt: serverTimestamp() });
        alert("Calculation Saved!");
    } catch (err) { alert("Error saving: " + err.message); } finally { setIsSaving(false); }
  };

  // --- 6. RENDER ---
  return (
    <Card>
        <div className="flex justify-between items-center mb-6 border-b pb-4">
            <h2 className="text-2xl font-bold text-orange-600 flex items-center gap-2">
                <Calculator size={24}/> ROI Calculator
            </h2>
            {loading && <RefreshCw size={12} className="animate-spin text-gray-400"/>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Section title="1. Your Demand">
                <div className="space-y-4">
                    <select className="w-full border p-2 rounded" value={inputs.userType} onChange={handleChange('userType')}>
                        <option value="home">Home (150L Standard)</option>
                        <option value="restaurant">Restaurant</option>
                        <option value="resort">Hotels & Resorts</option>
                    </select>
                    {inputs.userType === 'home' ? (
                        <div className="bg-orange-50 p-3 rounded text-xs text-orange-800 border border-orange-200">
                          Residential: Using 150L iSTOR Integral Tank setup.
                        </div>
                    ) : (
                        <div>
                          <Input label="Liters / Day" type="number" value={inputs.dailyLitersInput} onChange={handleChange('dailyLitersInput', true)} />
                          <button onClick={() => setShowModal(true)} className="text-xs text-blue-600 underline mt-1">Estimate via Fixtures</button>
                        </div>
                    )}
                </div>
            </Section>

            <Section title="2. Costs & Currency">
                <div className="space-y-4">
                    <select className="w-full border p-2 rounded mb-2" value={inputs.currency} onChange={handleChange('currency')}>
                        <option value="PHP">₱ PHP</option><option value="USD">$ USD</option>
                        <option value="GBP">£ GBP</option><option value="EUR">€ EUR</option>
                    </select>
                    <Input label={`Fuel Price (${symbol})`} type="number" value={inputs.fuelPrice} onChange={handleChange('fuelPrice', true)} />
                    <Input label={`Elec Rate (${symbol}/kWh)`} type="number" value={inputs.elecRate} onChange={handleChange('elecRate', true)} />
                </div>
            </Section>
            
            <Section title="3. Technology Selection">
                <div className="space-y-4">
                    <select className="w-full border p-2 rounded" value={inputs.heatPumpType} onChange={handleChange('heatPumpType')}>
                        <option value="all">Any Refrigerant</option>
                        <option value="R290">R290 Models</option>
                        <option value="R744">CO2 (R744)</option>
                    </select>
                    <select className="w-full border p-2 rounded" value={inputs.systemType} onChange={handleChange('systemType')}>
                        <option value="grid-only">Grid Only</option>
                        <option value="grid-solar">Grid + Solar Offset</option>
                    </select>
                </div>
            </Section>
        </div>

        <div className="mt-8">
            <Button onClick={() => setResult(calculateHeatPump(inputs, dbProducts))} variant="primary">Calculate Savings</Button>
        </div>

        {/* RESULTS AREA - Defensive rendering */}
        {result && !result.error && result.financials && (
            <div className="mt-8 bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-inner">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-orange-600">{result.system?.n || 'Matched System'}</h3>
                        <p className="text-xs font-bold text-gray-500 uppercase">Ref: {result.system?.ref || '-'}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold text-green-600">{symbol}{fmt(result.financials.totalSavings)}</div>
                        <p className="text-xs font-bold text-gray-400 uppercase">Annual Savings</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-lg border flex items-center gap-3 shadow-sm">
                        <Droplets className="text-blue-500" size={24}/>
                        <div>
                            <p className="text-xs text-gray-400 font-bold uppercase">Detected Tank Size</p>
                            <p className="text-lg font-bold">
                              {/* Pulls 1000L from your Screenshot titles */}
                              {result.system?.tankSize || 150} Liters
                            </p>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border flex items-center gap-3 shadow-sm">
                        <Gauge className="text-orange-500" size={24}/>
                        <div>
                            <p className="text-xs text-gray-400 font-bold uppercase">Estimated Warm-up</p>
                            <p className="text-lg font-bold">{result.metrics?.warmupTime || 0} Hours</p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button onClick={generateReport} variant="secondary"><Printer size={18} className="mr-2"/> Report</Button>
                    <Button onClick={handleSave} variant="success" disabled={isSaving}><Save size={18} className="mr-2"/> {isSaving ? 'Saving...' : 'Save'}</Button>
                </div>
            </div>
        )}

        {result?.error && <div className="mt-6 p-4 bg-red-50 text-red-600 rounded border border-red-200 text-sm italic">{result.error}</div>}

        {showModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-lg shadow-2xl max-w-md w-full">
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 className="text-lg font-bold">Estimate Hot Water Use</h3>
                        <button onClick={() => setShowModal(false)}><X size={20}/></button>
                    </div>
                    <div className="space-y-4">
                        <Input label="Showers (50L)" type="number" value={fixtureInputs.showers} onChange={handleFixtureChange('showers')} />
                        <Input label="Basins (20L)" type="number" value={fixtureInputs.basins} onChange={handleFixtureChange('basins')} />
                        <Input label="Kitchen Sinks (114L)" type="number" value={fixtureInputs.sinks} onChange={handleFixtureChange('sinks')} />
                        <Input label="Occupants" type="number" value={fixtureInputs.people} onChange={handleFixtureChange('people')} />
                        <Input label="Operating Hours" type="number" value={fixtureInputs.hours} onChange={handleFixtureChange('hours')} />
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                        <Button onClick={() => setShowModal(false)} variant="secondary">Cancel</Button>
                        <Button onClick={applyFixtureCalculation} variant="primary"><Check size={16} className="mr-2"/> Apply</Button>
                    </div>
                </div>
            </div>
        )}
    </Card>
  );
};

export default HeatPumpCalculator;
