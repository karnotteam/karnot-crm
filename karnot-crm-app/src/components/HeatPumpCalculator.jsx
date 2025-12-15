import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; 
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from "firebase/auth";
import { calculateHeatPump } from '../utils/heatPumpLogic';
// Reusing the same UI components you use in QuoteCalculator
import { Card, Section, Input, Button } from '../data/constants.jsx'; 
import { Save, Calculator, RefreshCw } from 'lucide-react';

const HeatPumpCalculator = ({ leadId }) => { 
  
  // --- STATE ---
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

  const [result, setResult] = useState(null);
  const [dbProducts, setDbProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // --- 1. FETCH PRODUCTS (Uses your existing Firebase setup) ---
  useEffect(() => {
    const fetchProducts = async () => {
        const auth = getAuth();
        const user = auth.currentUser;
        
        // If no user is logged in, we can't fetch private data
        if (!user) {
            setLoading(false);
            return;
        }
        
        try {
            // Fetching from the same place QuoteCalculator does
            const querySnapshot = await getDocs(collection(db, "users", user.uid, "products"));
            const products = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setDbProducts(products);
        } catch (error) {
            console.error("Error fetching inventory for calculator:", error);
        } finally {
            setLoading(false);
        }
    };
    fetchProducts();
  }, []);

  // --- 2. AUTO CALCULATE ---
  useEffect(() => {
    // Only calculate if we have products loaded
    if (!loading && dbProducts.length > 0) {
        const res = calculateHeatPump(inputs, dbProducts);
        setResult(res);
    }
  }, [inputs, dbProducts, loading]);

  // --- HANDLERS ---
  const handleChange = (field, isNumber = false) => (e) => {
    const val = isNumber ? parseFloat(e.target.value) : e.target.value;
    setInputs(prev => ({ ...prev, [field]: val }));
  };

  const handleSave = async () => {
    if (!result || result.error) return;
    try {
        setIsSaving(true);
        const auth = getAuth();
        const user = auth.currentUser;
        
        // If we have a leadId, save it inside that lead. Otherwise, save to general calculations.
        const path = leadId 
            ? `users/${user.uid}/leads/${leadId}/calculations` 
            : `users/${user.uid}/calculations`;
            
        await addDoc(collection(db, path), {
            type: 'heat-pump-roi',
            inputs,
            results: result,
            createdAt: serverTimestamp() // Uses Firebase server time
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Section title="1. Usage Profile">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">User Type</label>
                        <select className="w-full border p-2 rounded" value={inputs.userType} onChange={handleChange('userType')}>
                            <option value="home">Home</option>
                            <option value="restaurant">Restaurant</option>
                            <option value="resort">Resort/Hotel</option>
                        </select>
                    </div>
                    {inputs.userType === 'home' && (
                        <Input label="Occupants" type="number" value={inputs.occupants} onChange={handleChange('occupants', true)} />
                    )}
                    <Input label="Operating Hours/Day" type="number" value={inputs.hoursPerDay} onChange={handleChange('hoursPerDay', true)} />
                    <Input label="Target Temp (°C)" type="number" value={inputs.targetTemp} onChange={handleChange('targetTemp', true)} />
                </div>
            </Section>

            <Section title="2. Energy Costs">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Current Fuel</label>
                        <select className="w-full border p-2 rounded" value={inputs.heatingType} onChange={handleChange('heatingType')}>
                            <option value="electric">Electric</option>
                            <option value="propane">LPG</option>
                            <option value="diesel">Diesel</option>
                        </select>
                    </div>
                    <Input 
                        label={inputs.heatingType === 'propane' ? 'Price per Tank' : 'Price per Unit'} 
                        type="number" value={inputs.fuelPrice} onChange={handleChange('fuelPrice', true)} 
                    />
                    <Input label="Grid Elec Rate (for HP)" type="number" value={inputs.elecRate} onChange={handleChange('elecRate', true)} />
                </div>
            </Section>
        </div>

        {/* --- RESULTS AREA --- */}
        {result && !result.error && (
            <div className="mt-8 bg-slate-50 p-6 rounded-xl border border-slate-200">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">{result.system.name}</h3>
                        <p className="text-sm text-gray-500">Est. Daily Load: {Math.round(result.metrics.dailyLiters)} L</p>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold text-green-600">
                            {result.financials.symbol}{Math.round(result.financials.totalSavings).toLocaleString()}
                        </div>
                        <p className="text-xs uppercase font-bold text-gray-400">Annual Savings</p>
                    </div>
                </div>

                <div className="bg-white rounded-lg border overflow-hidden mb-6">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-100 text-gray-600">
                            <tr>
                                <th className="p-3 text-left">Item</th>
                                <th className="p-3 text-right">Est. Cost</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="p-3 border-b">Heat Pump Unit</td>
                                <td className="p-3 border-b text-right font-medium">{result.financials.symbol}{Math.round(result.financials.capex.heatPump).toLocaleString()}</td>
                            </tr>
                            {inputs.systemType !== 'grid-only' && (
                                <tr>
                                    <td className="p-3 border-b">Solar PV + Inverter</td>
                                    <td className="p-3 border-b text-right font-medium">{result.financials.symbol}{Math.round(result.financials.capex.solar + result.financials.capex.inverter).toLocaleString()}</td>
                                </tr>
                            )}
                            <tr className="bg-orange-50 font-bold text-gray-800">
                                <td className="p-3">Total Hardware CAPEX</td>
                                <td className="p-3 text-right">{result.financials.symbol}{Math.round(result.financials.capex.total).toLocaleString()}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-between">
                    <div className="text-lg font-semibold text-gray-700">
                        Payback Period: <span className="text-blue-600 font-bold">{result.financials.paybackYears} Years</span>
                    </div>
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
    </Card>
  );
};

export default HeatPumpCalculator;
