import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; 
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from "firebase/auth";
import { calculateHeatPump, calculateFixtureDemand, CONFIG } from '../utils/heatPumpLogic'; 
import { Card, Section, Input, Button } from '../data/constants.jsx'; 
import { Save, Calculator, RefreshCw, Printer, Droplets, Gauge, Sun, Thermometer, Zap, DollarSign, TrendingDown, FileText, X } from 'lucide-react';

const HeatPumpCalculator = () => {  
  const [inputs, setInputs] = useState({
    currency: 'PHP',
    userType: 'home',
    homeOccupants: 4,
    dailyLitersInput: 500,
    mealsPerDay: 0,
    roomsPerDay: 0,
    hoursPerDay: 12,
    heatingType: 'electric',
    fuelPrice: 12.25,
    elecRate: 12.25,
    gasRate: 7.0,
    lpgPrice: 950,
    lpgSize: 11,
    dieselPrice: 60,
    ambientTemp: 30,
    inletTemp: 15,
    targetTemp: 55,
    systemType: 'grid-solar',
    sunHours: 5.5,
    heatPumpType: 'all',
    includeCooling: false
  });

  const [showFixtureModal, setShowFixtureModal] = useState(false);
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
  const [saving, setSaving] = useState(false);

  const symbol = CONFIG?.SYMBOLS?.[inputs.currency] || '$';

  // Fetch products from Firebase
  useEffect(() => {
    const fetchInventory = async () => {
      const user = getAuth().currentUser;
      if (!user) { 
        setLoading(false); 
        return; 
      }
      try {
        const snap = await getDocs(collection(db, "users", user.uid, "products"));
        setDbProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) { 
        console.error('Error fetching products:', e); 
      } finally { 
        setLoading(false); 
      }
    };
    fetchInventory();
  }, []);

  // Auto-calculate when inputs change
  useEffect(() => {
    if (!loading && dbProducts.length > 0) {
      setResult(calculateHeatPump(inputs, dbProducts));
    }
  }, [inputs, dbProducts, loading]);

  // Update rates when currency changes
  useEffect(() => {
    const rates = CONFIG.defaultRate[inputs.currency];
    if (rates) {
      setInputs(prev => ({
        ...prev,
        elecRate: rates.grid,
        gasRate: rates.gas,
        lpgPrice: rates.lpgPrice,
        lpgSize: rates.lpgSize,
        dieselPrice: rates.diesel
      }));
    }
  }, [inputs.currency]);

  const handleChange = (field, isNumber = false) => (e) => {
    const val = isNumber ? parseFloat(e.target.value) || 0 : e.target.value;
    setInputs(prev => ({ ...prev, [field]: val }));
  };

  const handleFixtureChange = (field) => (e) => {
    setFixtureInputs(prev => ({ 
      ...prev, 
      [field]: parseInt(e.target.value) || 0 
    }));
  };

  const applyFixtureCalculation = () => {
    const calculatedLiters = calculateFixtureDemand(fixtureInputs);
    setInputs(prev => ({ ...prev, dailyLitersInput: calculatedLiters }));
    setShowFixtureModal(false);
  };

  const handleSave = async () => {
    if (!result || result.error) {
      alert('Please run a valid calculation first.');
      return;
    }

    const user = getAuth().currentUser;
    if (!user) {
      alert('Please sign in to save calculations.');
      return;
    }

    setSaving(true);
    try {
      await addDoc(collection(db, "users", user.uid, "calculations"), {
        inputs,
        result,
        timestamp: serverTimestamp(),
        type: 'heat_pump_roi'
      });
      alert('Calculation saved successfully!');
    } catch (error) {
      console.error('Error saving:', error);
      alert('Failed to save calculation.');
    } finally {
      setSaving(false);
    }
  };

  const generatePDFReport = () => {
    if (!result || result.error) {
      alert('Please run a valid calculation first.');
      return;
    }

    const { system, metrics, financials, cooling, emissions } = result;
    
    const reportHTML = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Karnot Heat Pump Report - ${system.name}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Inter', sans-serif; margin: 40px; color: #1d1d1f; }
          .header { text-align: center; border-bottom: 3px solid #F56600; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { color: #F56600; font-size: 32px; margin: 0; }
          .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 30px 0; text-align: center; }
          .metric { background: #f5f5f7; padding: 20px; border-radius: 12px; }
          .metric .value { font-size: 28px; font-weight: 700; color: #F56600; }
          .metric .label { font-size: 14px; color: #6e6e73; margin-top: 8px; }
          h2 { color: #1d1d1f; border-bottom: 2px solid #d2d2d7; padding-bottom: 10px; margin-top: 30px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          td { padding: 12px 0; border-bottom: 1px solid #d2d2d7; }
          td:last-child { text-align: right; font-weight: 600; }
          .cooling-box { background: #e6f2ff; border-left: 4px solid #007aff; padding: 20px; margin: 20px 0; }
          footer { text-align: center; margin-top: 50px; font-size: 12px; color: #aaa; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Karnot Heat Pump Savings Report</h1>
          <p>Generated on ${new Date().toLocaleDateString()}</p>
        </div>
        
        <h2>Recommended System: ${system.name}</h2>
        <p><strong>Refrigerant:</strong> ${system.refrigerant} | <strong>Tank Size:</strong> ${system.tankSize}L | <strong>COP:</strong> ${system.cop}</p>
        
        <div class="summary">
          <div class="metric">
            <div class="value">${financials.symbol}${fmt(financials.totalAnnualSavings)}</div>
            <div class="label">Total Annual Savings</div>
          </div>
          <div class="metric">
            <div class="value">${financials.paybackYears} Years</div>
            <div class="label">Payback Period</div>
          </div>
          <div class="metric">
            <div class="value">${fmt(emissions.annualSaved)} kg</div>
            <div class="label">Annual CO₂ Reduction</div>
          </div>
        </div>
        
        <h2>Financial Breakdown</h2>
        <table>
          <tr><td>Current Annual Heating Cost</td><td>${financials.symbol}${fmt(financials.currentAnnualCost)}</td></tr>
          <tr><td>New Annual Operating Cost</td><td>${financials.symbol}${fmt(financials.newAnnualCost)}</td></tr>
          <tr><td>Annual Heating Savings</td><td>${financials.symbol}${fmt(financials.heatingSavings)}</td></tr>
          ${cooling ? `<tr><td>Annual Cooling Savings (Bonus)</td><td>${financials.symbol}${fmt(cooling.annualSavings)}</td></tr>` : ''}
          <tr><td><strong>Total Annual Savings</strong></td><td><strong>${financials.symbol}${fmt(financials.totalAnnualSavings)}</strong></td></tr>
        </table>
        
        ${cooling ? `
        <div class="cooling-box">
          <h3 style="margin-top:0; color: #007aff;">Free Cooling Bonus!</h3>
          <p>Your reversible heat pump provides <strong>${cooling.coolingKW.toFixed(1)} kW</strong> of cooling capacity, saving an additional <strong>${financials.symbol}${fmt(cooling.annualSavings)}</strong> annually on air conditioning costs.</p>
        </div>
        ` : ''}
        
        <h2>System Specifications</h2>
        <table>
          <tr><td>Daily Hot Water Demand</td><td>${metrics.dailyLiters} Liters</td></tr>
          <tr><td>Peak Hourly Demand</td><td>${metrics.peakHourlyLiters} L/hr</td></tr>
          <tr><td>Warm-up Time (Full Tank)</td><td>${metrics.warmupTime} Hours</td></tr>
          <tr><td>Average Power Draw</td><td>${metrics.avgDrawKW} kW</td></tr>
          ${inputs.systemType === 'grid-solar' ? `<tr><td>Solar Panels Required</td><td>${metrics.panelCount} panels</td></tr>` : ''}
        </table>
        
        <footer>
          <p>&copy; ${new Date().getFullYear()} Karnot. All Rights Reserved.</p>
          <p>This is a preliminary estimate. Contact us for a detailed quotation.</p>
        </footer>
      </body>
      </html>
    `;

    const win = window.open('', '_blank');
    win.document.write(reportHTML);
    win.document.close();
  };

  const fmt = n => (+n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

  const showLitersInput = ['office', 'spa', 'school'].includes(inputs.userType);
  const showMealsInput = ['restaurant', 'resort'].includes(inputs.userType);
  const showRoomsInput = inputs.userType === 'resort';
  const showOccupantsInput = inputs.userType === 'home';

  return (
    <>
      <Card>
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h2 className="text-2xl font-bold text-orange-600 flex items-center gap-2">
            <Calculator/> Heat Pump ROI Calculator
          </h2>
          {loading && <RefreshCw className="animate-spin text-gray-400"/>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* SECTION 1: DEMAND */}
          <Section title="1. Your Demand">
            <label className="block text-sm font-semibold text-gray-600 mb-2">User Type</label>
            <select 
              className="w-full border p-2 rounded mb-3" 
              value={inputs.userType} 
              onChange={handleChange('userType')}
            >
              <option value="home">Home</option>
              <option value="restaurant">Restaurant</option>
              <option value="resort">Hotels & Resorts</option>
              <option value="spa">Spa / Clinic</option>
              <option value="school">Schools & Colleges</option>
              <option value="office">Office</option>
            </select>

            {showOccupantsInput && (
              <Input 
                label="Number of Occupants" 
                type="number" 
                value={inputs.homeOccupants} 
                onChange={handleChange('homeOccupants', true)} 
              />
            )}

            {showLitersInput && (
              <div>
                <Input 
                  label="Liters of Hot Water / Day" 
                  type="number" 
                  value={inputs.dailyLitersInput} 
                  onChange={handleChange('dailyLitersInput', true)} 
                />
                <Button 
                  variant="secondary" 
                  onClick={() => setShowFixtureModal(true)}
                  className="mt-2 w-full"
                >
                  Estimate via Fixtures
                </Button>
              </div>
            )}

            {showMealsInput && (
              <Input 
                label="Meals Served / Day" 
                type="number" 
                value={inputs.mealsPerDay} 
                onChange={handleChange('mealsPerDay', true)} 
              />
            )}

            {showRoomsInput && (
              <Input 
                label="Rooms Occupied / Day" 
                type="number" 
                value={inputs.roomsPerDay} 
                onChange={handleChange('roomsPerDay', true)} 
              />
            )}

            <Input 
              label="Daily Operating Hours" 
              type="number" 
              value={inputs.hoursPerDay} 
              onChange={handleChange('hoursPerDay', true)} 
            />
          </Section>

          {/* SECTION 2: COSTS */}
          <Section title="2. Your Costs">
            <label className="block text-sm font-semibold text-gray-600 mb-2">Currency</label>
            <select 
              className="w-full border p-2 rounded mb-3" 
              value={inputs.currency} 
              onChange={handleChange('currency')}
            >
              {Object.keys(CONFIG.FX).map(c => (
                <option key={c} value={c}>{CONFIG.SYMBOLS[c]} {c}</option>
              ))}
            </select>

            <label className="block text-sm font-semibold text-gray-600 mb-2">Current Heating Type</label>
            <select 
              className="w-full border p-2 rounded mb-3" 
              value={inputs.heatingType} 
              onChange={handleChange('heatingType')}
            >
              <option value="electric">Electric</option>
              <option value="gas">Natural Gas</option>
              <option value="propane">Propane (LPG)</option>
              <option value="diesel">Diesel</option>
            </select>

            {inputs.heatingType === 'electric' && (
              <Input 
                label={`Electricity Rate (${symbol}/kWh)`} 
                type="number" 
                value={inputs.elecRate} 
                onChange={handleChange('elecRate', true)} 
                step="0.01"
              />
            )}

            {inputs.heatingType === 'gas' && (
              <Input 
                label={`Natural Gas Rate (${symbol}/kWh)`} 
                type="number" 
                value={inputs.gasRate} 
                onChange={handleChange('gasRate', true)} 
                step="0.01"
              />
            )}

            {inputs.heatingType === 'propane' && (
              <>
                <div className="flex gap-2 items-end">
                  <Input 
                    label={`LPG Price (${symbol})`} 
                    type="number" 
                    value={inputs.lpgPrice} 
                    onChange={handleChange('lpgPrice', true)} 
                  />
                  <Input 
                    label="Tank Size (kg)" 
                    type="number" 
                    value={inputs.lpgSize} 
                    onChange={handleChange('lpgSize', true)} 
                  />
                </div>
              </>
            )}

            {inputs.heatingType === 'diesel' && (
              <Input 
                label={`Diesel Price (${symbol}/L)`} 
                type="number" 
                value={inputs.dieselPrice} 
                onChange={handleChange('dieselPrice', true)} 
                step="0.01"
              />
            )}
          </Section>

          {/* SECTION 3: CONDITIONS & OPTIONS */}
          <Section title="3. Conditions & Options">
            <div className="flex gap-2">
              <Input 
                label="Inlet Temp (°C)" 
                type="number" 
                value={inputs.inletTemp} 
                onChange={handleChange('inletTemp', true)} 
              />
              <Input 
                label="Target Temp (°C)" 
                type="number" 
                value={inputs.targetTemp} 
                onChange={handleChange('targetTemp', true)} 
              />
            </div>

            <Input 
              label="Ambient Air Temp (°C)" 
              type="number" 
              value={inputs.ambientTemp} 
              onChange={handleChange('ambientTemp', true)} 
            />

            <label className="block text-sm font-semibold text-gray-600 mb-2">System Type</label>
            <select 
              className="w-full border p-2 rounded mb-3" 
              value={inputs.systemType} 
              onChange={handleChange('systemType')}
            >
              <option value="grid-only">Grid Only</option>
              <option value="grid-solar">Grid + Solar Offset</option>
            </select>

            {inputs.systemType === 'grid-solar' && (
              <>
                <Input 
                  label="Avg Daily Sun Hours" 
                  type="number" 
                  value={inputs.sunHours} 
                  onChange={handleChange('sunHours', true)} 
                  step="0.1"
                />
                <Input 
                  label={`Grid Electricity Rate (${symbol}/kWh)`} 
                  type="number" 
                  value={inputs.elecRate} 
                  onChange={handleChange('elecRate', true)} 
                  step="0.01"
                />
              </>
            )}

            <label className="block text-sm font-semibold text-gray-600 mb-2">Refrigerant Type</label>
            <select 
              className="w-full border p-2 rounded mb-3" 
              value={inputs.heatPumpType} 
              onChange={handleChange('heatPumpType')}
            >
              <option value="all">Best Price (Any)</option>
              <option value="R290">R290 Only</option>
              <option value="R32">R32 Only</option>
              <option value="R744">CO2 (R744)</option>
            </select>

            <label className="block text-sm font-semibold text-gray-600 mb-2">Require Cooling?</label>
            <select 
              className="w-full border p-2 rounded" 
              value={inputs.includeCooling ? 'yes' : 'no'} 
              onChange={(e) => setInputs(prev => ({ ...prev, includeCooling: e.target.value === 'yes' }))}
            >
              <option value="no">No</option>
              <option value="yes">Yes (Reversible Only)</option>
            </select>
          </Section>
        </div>

        <div className="mt-8">
          <Button 
            onClick={() => setResult(calculateHeatPump(inputs, dbProducts))} 
            variant="primary"
            className="w-full"
          >
            Calculate Savings
          </Button>
        </div>

        {/* RESULTS */}
        {result && !result.error && result.financials && (
          <div className="mt-8 bg-slate-50 p-6 rounded-xl border border-slate-200">
            <div className="flex justify-between items-end mb-6 pb-4 border-b">
              <div>
                <h3 className="text-xl font-bold text-orange-600">{result.system.name}</h3>
                <p className="text-xs font-bold text-gray-500 uppercase mt-1">
                  {result.system.refrigerant} • {result.system.tankSize}L Tank • COP {result.system.cop}
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-green-600">
                  {result.financials.symbol}{fmt(result.financials.totalAnnualSavings)}
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase">Total Annual Savings</p>
              </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-4 rounded border flex items-center gap-3 shadow-sm">
                <DollarSign className="text-green-600"/>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase">Payback</p>
                  <p className="text-lg font-bold">{result.financials.paybackYears} Yrs</p>
                </div>
              </div>
              <div className="bg-white p-4 rounded border flex items-center gap-3 shadow-sm">
                <Droplets className="text-blue-500"/>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase">Peak Demand</p>
                  <p className="text-lg font-bold">{result.metrics.peakHourlyLiters} L/hr</p>
                </div>
              </div>
              <div className="bg-white p-4 rounded border flex items-center gap-3 shadow-sm">
                <Gauge className="text-orange-500"/>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase">Warm-up</p>
                  <p className="text-lg font-bold">{result.metrics.warmupTime} Hrs</p>
                </div>
              </div>
              <div className="bg-white p-4 rounded border flex items-center gap-3 shadow-sm">
                <TrendingDown className="text-green-600"/>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase">CO₂ Saved</p>
                  <p className="text-lg font-bold">{fmt(result.emissions.annualSaved)} kg</p>
                </div>
              </div>
            </div>

            {inputs.systemType === 'grid-solar' && result.metrics.panelCount > 0 && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                <div className="flex items-center gap-2">
                  <Sun className="text-yellow-600"/>
                  <p className="text-sm">
                    <strong>Solar Offset:</strong> Requires {result.metrics.panelCount} solar panels 
                    ({(result.metrics.panelCount * 0.425).toFixed(1)} kW system)
                  </p>
                </div>
              </div>
            )}

            {result.cooling && (
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                <h4 className="font-bold text-blue-900 mb-2">🎉 Free Cooling Bonus!</h4>
                <p className="text-sm text-blue-800">
                  Your reversible heat pump provides <strong>{result.cooling.coolingKW.toFixed(1)} kW</strong> of 
                  cooling capacity, saving an additional <strong>{result.financials.symbol}{fmt(result.cooling.annualSavings)}</strong> 
                  annually on air conditioning costs!
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={generatePDFReport}>
                <FileText size={18} className="mr-2"/> PDF Report
              </Button>
              <Button variant="success" onClick={handleSave} disabled={saving}>
                {saving ? <RefreshCw size={18} className="mr-2 animate-spin"/> : <Save size={18} className="mr-2"/>}
                Save
              </Button>
            </div>
          </div>
        )}

        {result?.error && (
          <div className="mt-6 p-4 bg-red-50 text-red-700 rounded border border-red-200">
            <p className="font-semibold">⚠️ {result.error}</p>
            <p className="text-sm mt-2">Try adjusting your inputs or selecting a different refrigerant type.</p>
          </div>
        )}
      </Card>

      {/* FIXTURE CALCULATOR MODAL */}
      {showFixtureModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Estimate via Fixtures</h3>
              <button 
                onClick={() => setShowFixtureModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24}/>
              </button>
            </div>

            <div className="space-y-4">
              <Input 
                label="Number of Showers" 
                type="number" 
                value={fixtureInputs.showers} 
                onChange={handleFixtureChange('showers')} 
              />
              <Input 
                label="Lavatory Basins" 
                type="number" 
                value={fixtureInputs.basins} 
                onChange={handleFixtureChange('basins')} 
              />
              <Input 
                label="Kitchen Sinks" 
                type="number" 
                value={fixtureInputs.sinks} 
                onChange={handleFixtureChange('sinks')} 
              />
              <Input 
                label="Number of Occupants" 
                type="number" 
                value={fixtureInputs.people} 
                onChange={handleFixtureChange('people')} 
              />
              <Input 
                label="Hours per Day" 
                type="number" 
                value={fixtureInputs.hours} 
                onChange={handleFixtureChange('hours')} 
              />
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="secondary" onClick={() => setShowFixtureModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button variant="primary" onClick={applyFixtureCalculation} className="flex-1">
                Use These Values
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HeatPumpCalculator;
