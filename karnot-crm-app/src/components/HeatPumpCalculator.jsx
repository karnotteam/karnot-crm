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
    heatPumpType: 'all', // 'all', 'R290', 'R744', 'R32'
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

  // --- 2. AUTO CALCULATE ---
  useEffect(() => {
    if (!loading && dbProducts.length > 0) {
        const res = calculateHeatPump(inputs, dbProducts);
        setResult(res);
    }
  }, [inputs, dbProducts, loading]);

  // --- HANDLERS ---
  const handleChange = (field, isNumber = false) => (e) => {
    const val = isNumber ? parseFloat(e.target.value) || 0 : e.target.value;
    
    // UPDATED: Proper currency and heating type switching logic
    if (field === 'currency') {
        const defaults = CONFIG.defaultRate[val];
        const hType = inputs.heatingType;
        // Reset local rates to the new currency defaults
        let newFuelPrice = hType === 'propane' ? defaults.lpgPrice : (hType === 'diesel' ? defaults.diesel : (hType === 'gas' ? defaults.gas : defaults.grid));
        setInputs(prev => ({ 
            ...prev, 
            currency: val, 
            fuelPrice: newFuelPrice, 
            elecRate: defaults.grid 
        }));
    } else if (field === 'heatingType') {
        const defaults = CONFIG.defaultRate[inputs.currency];
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

  // --- REPORT GENERATION ---
  const fmt = n => (+n).toLocaleString(undefined, { maximumFractionDigits: 0 });

  const generateReport = () => {
      if (!result || result.error) return;
      const q = result;
      const coolSavingsRow = q.financials.coolSavings > 0 
          ? `<tr><td>Annual Free Cooling Savings</td><td class="cooling-details">${q.financials.symbol}${fmt(q.financials.coolSavings)}</td></tr>` 
          : '';

      const reportHTML = `
        <!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Karnot Savings Report</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style> 
        body { font-family: 'Inter', sans-serif; margin: 0; padding: 40px; color: #1d1d1f; } .report-container { max-width: 800px; margin: auto; } .header { text-align: center; border-bottom: 2px solid #F56600; padding-bottom: 20px; margin-bottom: 30px; } .header h1 { color: #F56600; font-size: 32px; margin: 0; } .header p { font-size: 16px; color: #6e6e73; margin: 5px 0 0 0; } h2 { font-size: 22px; color: #1d1d1f; border-bottom: 1px solid #d2d2d7; padding-bottom: 10px; margin-top: 40px; } .summary-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; text-align: center; margin: 30px 0; } .metric .value { font-size: 28px; font-weight: 700; color: #F56600; } .metric .label { font-size: 14px; color: #6e6e73; } .details-table { width: 100%; border-collapse: collapse; font-size: 16px; } .details-table td { padding: 12px 0; border-bottom: 1px solid #d2d2d7; } .details-table td:last-child { text-align: right; font-weight: 600; } .cooling-details { color: #007aff; } footer { text-align: center; margin-top: 50px; font-size: 12px; color: #aaa; } 
        </style>
        </head><body><div class="report-container">
            <div class="header"><h1>Karnot Savings Report</h1><p>Internal Estimate for ${q.system.n}</p></div>
            <h2>System Recommendation: <strong>${q.system.n}</strong></h2>
            <div class="summary-grid"> 
                <div class="metric"><div class="value">${q.financials.symbol}${fmt(q.financials.totalSavings)}</div><div class="label">Total Annual Savings</div></div> 
                <div class="metric"><div class="value">${q.financials.paybackYears} Yrs</div><div class="label">Estimated Payback</div></div> 
                <div class="metric"><div class="value">Active</div><div class="label">Emission Reduction</div></div> 
            </div>
            <h2>Financial Breakdown</h2>
            <table class="details-table"> 
                <tr><td>Annual Cost (Current Heating)</td><td>${q.financials.symbol}${fmt(q.financials.annualCostOld)}</td></tr> 
                <tr><td>Annual Cost (New Heat Pump)</td><td>${q.financials.symbol}${fmt(q.financials.karnotAnnualCost)}</td></tr> 
                ${coolSavingsRow}
                <tr><td>Total Annual Savings</td><td>${q.financials.symbol}${fmt(q.financials.totalSavings)}</td></tr>
            </table>
            <p>This report assumes a system cost of ${q.financials.symbol}${fmt(q.financials.capex.total)} and an estimated payback period of ${q.financials.paybackYears} years.</p>
            <footer><p>&copy; ${new Date().getFullYear()} Karnot. All Rights Reserved. This is a preliminary estimate.</p></footer>
        </div></body></html>`;
      
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
        console.error(err);
        alert("Error saving: " + err.message);
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <Card>
        <div className="flex justify-between items-center mb-6 border-b pb-4">
            <h2 className="text-2xl font-bold text-orange-600 flex items-center gap-2">
                <Calculator size={24}/> ROI Calculator
            </h2>
            {loading && <span className="text-sm text-gray-500 flex items-center gap-1"><RefreshCw size={12} className="animate-spin"/> Syncing...</span>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Section title="1. Your Demand">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">User Type</label>
                        <select className="w-full border p-2 rounded" value={inputs.userType} onChange={handleChange('userType')}>
                            <option value="home">Home</option>
                            <option value="restaurant">Restaurant</option>
                            <option value="resort">Hotels & Resorts</option>
                            <option value="school">Schools & Colleges</option>
                            <option value="office">Office</option>
                            <option value="spa">Spa / Clinic</option>
                        </select>
                    </div>

                    {isOccupantFieldVisible && (
                        <Input label="Number of Occupants" type="number" value={inputs.occupants} onChange={handleChange('occupants', true)} />
                    )}

                    {isShowerFieldVisible && (
                        <div>
                            <Input label="Liters of Hot Water / Day" type="number" value={inputs.dailyLitersInput} onChange={handleChange('dailyLitersInput', true)} />
                            <button onClick={() => setShowModal(true)} className="mt-2 text-sm text-blue-600 underline">Estimate via Fixtures</button>
                        </div>
                    )}

                    {isMealFieldVisible && (
                        <Input label="Meals Served / Day" type="number" value={inputs.mealsPerDay} onChange={handleChange('mealsPerDay', true)} />
                    )}

                    {isRoomFieldVisible && (
                        <Input label="Rooms Occupied / Day" type="number" value={inputs.roomsOccupied} onChange={handleChange('roomsOccupied', true)} />
                    )}

                    <Input label="Daily Operating Hours" type="number" value={inputs.hoursPerDay} onChange={handleChange('hoursPerDay', true)} />
                </div>
            </Section>

            <Section title="2. Your Costs">
                <div className="space-y-4">
                    <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">Select Currency</label>
                    <select id="currency" className="w-full border p-2 rounded mb-2" value={inputs.currency} onChange={handleChange('currency')}>
                        <option value="PHP">₱ PHP</option>
                        <option value="USD">$ USD</option>
                        <option value="GBP">£ GBP</option>
                        <option value="EUR">€ EUR</option>
                    </select>

                    <label htmlFor="heatingType" className="block text-sm font-medium text-gray-700 mb-1">Current Heating Type</label>
                    <select id="heatingType" className="w-full border p-2 rounded mb-2" value={inputs.heatingType} onChange={handleChange('heatingType')}>
                        <option value="electric">Electric</option>
                        <option value="gas">Natural Gas</option>
                        <option value="propane">LPG (Propane)</option>
                        <option value="diesel">Diesel</option>
                    </select>

                    <label htmlFor="fuelPrice" className="block text-sm font-medium text-gray-700 mb-1">{getRateLabel(inputs.heatingType, symbol)}</label>
                    {inputs.heatingType === 'propane' ? (
                        <div className="flex gap-2 items-center">
                            <Input type="number" value={inputs.fuelPrice} onChange={handleChange('fuelPrice', true)} />
                            <span className="text-sm text-gray-500">for a</span>
                            <Input type="number" value={inputs.tankSize} onChange={handleChange('tankSize', true)} />
                            <span className="text-sm text-gray-500">kg tank</span>
                        </div>
                    ) : (
                        <Input type="number" value={inputs.fuelPrice} onChange={handleChange('fuelPrice', true)} />
                    )}
                    
                    <Input label={`Grid Electricity Rate (For HP - ${symbol}/kWh)`} type="number" value={inputs.elecRate} onChange={handleChange('elecRate', true)} />
                </div>
            </Section>
            
            <Section title="3. Conditions & Options">
                <div className="space-y-4">
                    <Input label="Average Ambient Air Temp (°C)" type="number" value={inputs.ambientTemp} onChange={handleChange('ambientTemp', true)} />
                    <Input label="Cold Water Inlet Temp (°C)" type="number" value={inputs.inletTemp} onChange={handleChange('inletTemp', true)} />
                    <Input label="Target Hot Water Temp (°C)" type="number" value={inputs.targetTemp} onChange={handleChange('targetTemp', true)} />

                    <label htmlFor="systemType" className="block text-sm font-medium text-gray-700 mb-1">System Type</label>
                    <select id="systemType" className="w-full border p-2 rounded mb-2" value={inputs.systemType} onChange={handleChange('systemType')}>
                        <option value="grid-only">Grid Only</option>
                        <option value="grid-solar">Grid + Solar (Offset)</option>
                    </select>
                    
                    {isSunHoursVisible && (
                        <Input label="Average Daily Sun Hours" type="number" value={inputs.sunHours} onChange={handleChange('sunHours', true)} />
                    )}
                    
                    <label htmlFor="heatPumpType" className="block text-sm font-medium text-gray-700 mb-1">Heat Pump Type / Refrigerant</label>
                    <select id="heatPumpType" className="w-full border p-2 rounded mb-2" value={inputs.heatPumpType} onChange={handleChange('heatPumpType')}>
                        <option value="all">Best Price (All Models)</option>
                        <option value="R290">R290 Models Only</option>
                        <option value="R744">CO2 (R744) Models Only</option>
                        <option value="R32">R32 Models Only</option>
                    </select>
                    
                    <label htmlFor="includeCooling" className="block text-sm font-medium text-gray-700 mb-1">Require Cooling?</label>
                    <select id="includeCooling" className="w-full border p-2 rounded" value={inputs.includeCooling ? 'yes' : 'no'} onChange={(e) => setInputs(p => ({...p, includeCooling: e.target.value === 'yes'}))}>
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                    </select>
                </div>
            </Section>
        </div>

        <div className="mt-8">
            <Button id="calcBtn" onClick={() => setResult(calculateHeatPump(inputs, dbProducts))} variant="primary">Calculate Savings</Button>
        </div>

        {result && !result.error && (
            <div className="mt-8 bg-slate-50 p-6 rounded-xl border border-slate-200">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-orange-600">{result.system.n}</h3>
                        <p className="text-sm text-gray-500">Required Load: {result.metrics.requiredThermalPowerKW} kW</p>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold text-green-600">
                            {result.financials.symbol}{fmt(result.financials.totalSavings)}
                        </div>
                        <p className="text-xs uppercase font-bold text-gray-400">Annual Savings</p>
                    </div>
                </div>

                {result.financials.coolSavings > 0 && (
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                        <h4 className="text-blue-700 font-bold text-sm">Free Cooling Bonus!</h4>
                        <p className="text-sm text-blue-900">Your system saves an additional <strong>{result.financials.symbol}{fmt(result.financials.coolSavings)}</strong> annually!</p>
                    </div>
                )}

                <div className="bg-white rounded-lg border overflow-hidden mb-6">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-100 text-gray-600">
                            <tr>
                                <th className="p-3 text-left">Metric</th>
                                <th className="p-3 text-right">Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td className="p-3 border-b">Annual Cost (Old System)</td><td className="p-3 border-b text-right">{result.financials.symbol}{fmt(result.financials.annualCostOld)}</td></tr>
                            <tr><td className="p-3 border-b">Annual Cost (New HP)</td><td className="p-3 border-b text-right">{result.financials.symbol}{fmt(result.financials.karnotAnnualCost)}</td></tr>
                            <tr className="font-bold bg-gray-50"><td className="p-3">Total Annual Savings</td><td className="p-3 text-right text-green-600">{result.financials.symbol}{fmt(result.financials.totalSavings)}</td></tr>
                            <tr className="font-bold"><td className="p-3">Estimated Payback</td><td className="p-3 text-right text-orange-600">{result.financials.paybackYears} Yrs</td></tr>
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-end gap-3">
                    <Button onClick={generateReport} variant="secondary">
                        <Printer className="mr-2" size={18}/> Generate PDF Report
                    </Button>
                    <Button onClick={handleSave} variant="success" disabled={isSaving}>
                        <Save className="mr-2" size={18}/> {isSaving ? 'Saving...' : 'Save Calculation'}
                    </Button>
                </div>
            </div>
        )}

        {result && result.error && (
            <div className="mt-6 p-4 bg-red-50 text-red-600 rounded border border-red-200">
                <strong>Calculation Info:</strong> {result.error}
            </div>
        )}

        {showModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold">Estimate Hot Water Use</h3>
                        <button onClick={() => setShowModal(false)}><X size={20} className="text-gray-500"/></button>
                    </div>
                    <div className="space-y-3">
                        <Input label="Number of Showers (50L/day)" type="number" value={fixtureInputs.showers} onChange={handleFixtureChange('showers')} />
                        <Input label="Lavatory Basins (20L/day)" type="number" value={fixtureInputs.basins} onChange={handleFixtureChange('basins')} />
                        <Input label="Kitchen Sinks (114L/day)" type="number" value={fixtureInputs.sinks} onChange={handleFixtureChange('sinks')} />
                        <Input label="Occupants (284L/day est.)" type="number" value={fixtureInputs.people} onChange={handleFixtureChange('people')} />
                        <Input label="Hours per Day" type="number" value={fixtureInputs.hours} onChange={handleFixtureChange('hours')} />
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                        <Button onClick={() => setShowModal(false)} variant="secondary">Cancel</Button>
                        <Button onClick={applyFixtureCalculation} variant="primary"><Check size={16} className="mr-2"/> Use Values</Button>
                    </div>
                </div>
            </div>
        )}
    </Card>
  );
};

export default HeatPumpCalculator;
