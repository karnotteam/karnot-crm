import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; 
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from "firebase/auth";
import { calculateHeatPump, calculateFixtureDemand, CONFIG } from '../utils/heatPumpLogic'; 
import { Card, Section, Input, Button } from '../data/constants.jsx'; 
import { Save, Calculator, RefreshCw, FileText, X, ChevronDown, ChevronUp, AlertCircle, CheckCircle, TrendingUp, Award, Target, BarChart3 } from 'lucide-react';

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
    includeCooling: false,
    enableEnterpriseROI: false,
    enterpriseWACC: 0.07,
    annualRevenue: 0,
    waterSavingsScore: 5,
    reliabilityScore: 8,
    innovationScore: 7
  });

  const [showFixtureModal, setShowFixtureModal] = useState(false);
  const [showCalculations, setShowCalculations] = useState(false);
  const [showEnterpriseDetails, setShowEnterpriseDetails] = useState(false);
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

  useEffect(() => {
    if (!loading && dbProducts.length > 0) {
      setResult(calculateHeatPump(inputs, dbProducts));
    }
  }, [inputs, dbProducts, loading]);

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

  const fmt = n => (+n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

  const generatePDFReport = () => {
    if (!result || result.error) {
      alert('Please run a valid calculation first.');
      return;
    }

    const { system, metrics, financials, cooling, emissions, tankSizing, enterpriseROI } = result;
    const isEnterprise = inputs.enableEnterpriseROI && enterpriseROI;

    const reportHTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Karnot Report</title>
<style>
@page { size: A4; margin: 20mm; }
body { font-family: Arial, sans-serif; font-size: 10pt; color: #1d1d1f; max-width: 210mm; margin: 0 auto; padding: 20mm; }
.header { text-align: center; border-bottom: 3px solid #F56600; padding-bottom: 15px; margin-bottom: 25px; }
h1 { color: #F56600; font-size: 24pt; margin: 0; }
h2 { color: #1d1d1f; font-size: 14pt; border-bottom: 2px solid #d2d2d7; padding-bottom: 8px; margin-top: 25px; }
table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 9pt; }
td { padding: 10px 8px; border-bottom: 1px solid #d2d2d7; }
td:last-child { text-align: right; font-weight: bold; }
.metric-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 20px 0; }
.metric-box { background: #f5f5f7; padding: 15px; border-radius: 8px; text-align: center; }
.metric-value { font-size: 18pt; font-weight: bold; color: #F56600; }
.metric-label { font-size: 9pt; color: #6e6e73; margin-top: 5px; }
.info-box { background: #fff9e6; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; }
.footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #d2d2d7; font-size: 8pt; color: #8e8e93; }
@media print { .page-break { page-break-before: always; } }
</style>
</head>
<body>
<div class="header">
<h1>Karnot Energy Solutions</h1>
<p>${isEnterprise ? 'Enterprise ROI Analysis' : 'Heat Pump Savings Report'}</p>
<p>${new Date().toLocaleDateString()}</p>
</div>

<h2>System: ${system.name}</h2>
<p><strong>Refrigerant:</strong> ${system.refrigerant} | <strong>Power:</strong> ${system.kW} kW | <strong>COP:</strong> ${system.cop}</p>

<div class="metric-grid">
<div class="metric-box">
<div class="metric-value">${financials.symbol}${fmt(financials.totalAnnualSavings)}</div>
<div class="metric-label">Annual Savings</div>
</div>
<div class="metric-box">
<div class="metric-value">${financials.paybackYears} Yrs</div>
<div class="metric-label">Payback</div>
</div>
<div class="metric-box">
<div class="metric-value">${fmt(emissions.annualSaved)} kg</div>
<div class="metric-label">CO₂ Reduction</div>
</div>
</div>

<h2>Financial Summary</h2>
<table>
<tr><td>Current Annual Cost</td><td>${financials.symbol}${fmt(financials.currentAnnualCost)}</td></tr>
<tr><td>New Annual Cost</td><td>${financials.symbol}${fmt(financials.newAnnualCost)}</td></tr>
<tr><td>Annual Savings</td><td>${financials.symbol}${fmt(financials.totalAnnualSavings)}</td></tr>
</table>

<div class="info-box">
<h3 style="margin-top:0;">Tank Sizing</h3>
<table>
<tr><td>Daily Demand</td><td>${metrics.dailyLiters} L</td></tr>
<tr><td>Peak Draw Rate</td><td>${tankSizing.peakDrawRateLph.toFixed(1)} L/hr</td></tr>
<tr><td>Recovery Rate</td><td>${tankSizing.recoveryRateLph.toFixed(1)} L/hr</td></tr>
<tr><td>Recommended Tank</td><td>${tankSizing.recommendedTankSize} L</td></tr>
</table>
</div>

<div class="footer">
<p><strong>Karnot Energy Solutions Inc.</strong></p>
<p>© ${new Date().getFullYear()} All Rights Reserved</p>
</div>
</body>
</html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(reportHTML);
      printWindow.document.close();
      printWindow.onload = () => {
        setTimeout(() => printWindow.print(), 250);
      };
    } else {
      alert('Please allow pop-ups to generate PDF reports.');
    }
  };

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

        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Award className="text-blue-600" size={24}/>
              <div>
                <h3 className="font-bold text-gray-800">Enterprise ROI Mode</h3>
                <p className="text-xs text-gray-600">Nestlé-aligned metrics: NPV, IRR, CSV scoring</p>
              </div>
            </div>
            <label className="flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={inputs.enableEnterpriseROI}
                onChange={(e) => setInputs(prev => ({ ...prev, enableEnterpriseROI: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {inputs.enableEnterpriseROI && (
            <>
              <div className="mt-4 pt-4 border-t border-blue-200">
                <div className="bg-white p-4 rounded-lg border border-blue-200 mb-4">
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <AlertCircle size={18} className="text-blue-600"/>
                    WACC Reference Guide
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-gray-300">
                          <th className="text-left py-2 pr-4 font-semibold text-gray-700">Company Type</th>
                          <th className="text-left py-2 pr-4 font-semibold text-gray-700">Typical WACC</th>
                          <th className="text-left py-2 font-semibold text-gray-700">Why?</th>
                        </tr>
                      </thead>
                      <tbody className="text-gray-600">
                        <tr className="border-b border-gray-200">
                          <td className="py-2 pr-4 font-medium">Large Corps (Nestlé, P&G)</td>
                          <td className="py-2 pr-4 text-blue-600 font-semibold">6-8%</td>
                          <td className="py-2">Low risk, cheap debt, stable</td>
                        </tr>
                        <tr className="border-b border-gray-200">
                          <td className="py-2 pr-4 font-medium">Mid-size Manufacturing</td>
                          <td className="py-2 pr-4 text-blue-600 font-semibold">8-12%</td>
                          <td className="py-2">Moderate risk</td>
                        </tr>
                        <tr className="border-b border-gray-200">
                          <td className="py-2 pr-4 font-medium">Startups</td>
                          <td className="py-2 pr-4 text-orange-600 font-semibold">15-25%+</td>
                          <td className="py-2">High risk, expensive equity</td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-4 font-medium">Your customers (SMEs)</td>
                          <td className="py-2 pr-4 text-green-600 font-semibold">10-15%</td>
                          <td className="py-2">Bank loans at 8-12% + owner equity expectations</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-500 mt-3 italic">
                    💡 WACC = Weighted Average Cost of Capital. Use your customer's WACC to calculate NPV in their language.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input 
                    label="WACC / Discount Rate (%)" 
                    type="number" 
                    value={inputs.enterpriseWACC * 100} 
                    onChange={(e) => setInputs(prev => ({ ...prev, enterpriseWACC: parseFloat(e.target.value) / 100 || 0.07 }))}
                    step="0.1"
                  />
                  <Input 
                    label="Annual Facility Revenue (optional)" 
                    type="number" 
                    value={inputs.annualRevenue} 
                    onChange={handleChange('annualRevenue', true)}
                  />
                  <Input 
                    label="Water Savings Score (1-10)" 
                    type="number" 
                    value={inputs.waterSavingsScore} 
                    onChange={handleChange('waterSavingsScore', true)}
                    min="1"
                    max="10"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            Calculate Savings & ROI
          </Button>
        </div>

        {result && !result.error && result.financials && (
          <div className="mt-8 bg-slate-50 p-6 rounded-xl border border-slate-200">
            <div className="flex justify-between items-end mb-6 pb-4 border-b">
              <div>
                <h3 className="text-xl font-bold text-orange-600">{result.system.name}</h3>
                <p className="text-xs font-bold text-gray-500 uppercase mt-1">
                  {result.system.refrigerant} • {result.system.kW} kW • COP {result.system.cop}
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-green-600">
                  {result.financials.symbol}{fmt(result.financials.totalAnnualSavings)}
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase">Total Annual Savings</p>
              </div>
            </div>

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
          </div>
        )}
      </Card>

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
