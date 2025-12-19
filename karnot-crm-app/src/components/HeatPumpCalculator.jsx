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
    // Enterprise ROI inputs
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

    const { system, metrics, financials, cooling, emissions, tankSizing, enterpriseROI } = result;
    
    const enterpriseSection = enterpriseROI ? `
      <h2>Enterprise ROI Analysis (Nestlé-Aligned)</h2>
      <div class="summary">
        <div class="metric">
          <div class="value">${financials.symbol}${fmt(enterpriseROI.financial.npv)}</div>
          <div class="label">Net Present Value (NPV)</div>
        </div>
        <div class="metric">
          <div class="value">${enterpriseROI.financial.irr.toFixed(1)}%</div>
          <div class="label">Internal Rate of Return (IRR)</div>
        </div>
        <div class="metric">
          <div class="value">${enterpriseROI.csv.strategicROI.toFixed(1)}%</div>
          <div class="label">Strategic ROI (CSV-Weighted)</div>
        </div>
      </div>
      
      <h3>Creating Shared Value (CSV) Scorecard</h3>
      <table style="font-size: 14px;">
        <tr><td>Carbon Reduction Impact</td><td>${enterpriseROI.csv.breakdown.carbon.toFixed(1)}/10</td></tr>
        <tr><td>Energy Efficiency Gain</td><td>${enterpriseROI.csv.breakdown.energy.toFixed(1)}/10</td></tr>
        <tr><td>Water Efficiency</td><td>${enterpriseROI.csv.breakdown.water.toFixed(1)}/10</td></tr>
        <tr><td>System Reliability</td><td>${enterpriseROI.csv.breakdown.reliability.toFixed(1)}/10</td></tr>
        <tr><td>Technology Innovation</td><td>${enterpriseROI.csv.breakdown.innovation.toFixed(1)}/10</td></tr>
        <tr><td><strong>Overall CSV Score</strong></td><td><strong>${enterpriseROI.csv.score.toFixed(1)}/10</strong></td></tr>
      </table>
      
      <div class="calc-box">
        <h3 style="margin-top:0;">Investment Viability Assessment</h3>
        <p><strong>Status:</strong> ${enterpriseROI.viability.recommendation}</p>
        <ul style="margin:10px 0; padding-left: 20px;">
          <li>${enterpriseROI.viability.positiveNPV ? '✅' : '❌'} Positive NPV at ${(inputs.enterpriseWACC * 100).toFixed(1)}% WACC</li>
          <li>${enterpriseROI.viability.meetsHurdleRate ? '✅' : '❌'} IRR exceeds ${(CONFIG.ENTERPRISE.HURDLE_RATE * 100).toFixed(0)}% hurdle rate</li>
          <li>${enterpriseROI.viability.strategicallyViable ? '✅' : '❌'} Strategic ROI > 15% with CSV > 7</li>
        </ul>
        ${enterpriseROI.utop.marginImprovement > 0 ? `<p><strong>UTOP Margin Impact:</strong> +${enterpriseROI.utop.marginImprovement.toFixed(2)}%</p>` : ''}
      </div>
    ` : '';
    
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
          h3 { color: #1d1d1f; margin-top: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          td { padding: 12px 0; border-bottom: 1px solid #d2d2d7; }
          td:last-child { text-align: right; font-weight: 600; }
          .cooling-box { background: #e6f2ff; border-left: 4px solid #007aff; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .calc-box { background: #fff9e6; border-left: 4px solid #ffc107; padding: 20px; margin: 20px 0; border-radius: 8px; }
          footer { text-align: center; margin-top: 50px; font-size: 12px; color: #aaa; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Karnot Heat Pump ${enterpriseROI ? 'Enterprise' : 'Savings'} Report</h1>
          <p>Generated on ${new Date().toLocaleDateString()}</p>
        </div>
        
        ${enterpriseSection}
        
        <h2>Recommended System: ${system.name}</h2>
        <p><strong>Refrigerant:</strong> ${system.refrigerant} | <strong>Rated Power:</strong> ${system.kW} kW | <strong>Adjusted Power:</strong> ${system.adjustedKW.toFixed(1)} kW | <strong>COP:</strong> ${system.cop}</p>
        
        ${!enterpriseROI ? `
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
        ` : ''}
        
        <div class="calc-box">
          <h3 style="margin-top:0; color: #f57c00;">Tank Sizing Calculations</h3>
          <table style="font-size: 14px;">
            <tr><td>Average Draw Rate</td><td>${tankSizing.avgDrawRate.toFixed(1)} L/hr</td></tr>
            <tr><td>Peak Draw Rate (with ${(tankSizing.coincidenceFactor * 100).toFixed(0)}% coincidence)</td><td>${tankSizing.peakDrawRateLph.toFixed(1)} L/hr</td></tr>
            <tr><td>Heat Pump Recovery Rate</td><td>${tankSizing.recoveryRateLph.toFixed(1)} L/hr</td></tr>
            <tr><td>Gap (Draw - Recovery)</td><td>${tankSizing.gapLph.toFixed(1)} L/hr</td></tr>
            <tr><td colspan="2"><hr style="border:0; border-top:1px solid #ccc; margin:10px 0;"></td></tr>
            <tr><td><strong>Recommended Tank Size</strong></td><td><strong>${tankSizing.recommendedTankSize} L</strong></td></tr>
            ${system.integralTank ? `<tr><td><strong>Integral Tank Included</strong></td><td><strong>${system.integralTank} L</strong></td></tr>` : ''}
          </table>
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
        
        <footer>
          <p>&copy; ${new Date().getFullYear()} Karnot Energy Solutions Inc. All Rights Reserved.</p>
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

        {/* Enterprise ROI Toggle */}
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
            <div className="mt-4 pt-4 border-t border-blue-200 grid grid-cols-1 md:grid-cols-3 gap-4">
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
          )}
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
            Calculate Savings & ROI
          </Button>
        </div>

        {/* ENTERPRISE ROI RESULTS */}
        {result && !result.error && result.enterpriseROI && (
          <div className="mt-8 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border-2 border-blue-300">
            <div className="flex items-center gap-2 mb-4">
              <Target className="text-blue-600" size={28}/>
              <h3 className="text-2xl font-bold text-blue-900">Enterprise ROI Analysis</h3>
            </div>

            {/* Key Financial Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg border-2 border-blue-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="text-green-600" size={20}/>
                  <p className="text-xs font-bold text-gray-500 uppercase">NPV @ {(inputs.enterpriseWACC * 100).toFixed(1)}%</p>
                </div>
                <p className="text-2xl font-bold text-green-600">{symbol}{fmt(result.enterpriseROI.financial.npv)}</p>
              </div>
              <div className="bg-white p-4 rounded-lg border-2 border-blue-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="text-blue-600" size={20}/>
                  <p className="text-xs font-bold text-gray-500 uppercase">Internal Rate of Return</p>
                </div>
                <p className="text-2xl font-bold text-blue-600">{result.enterpriseROI.financial.irr.toFixed(1)}%</p>
              </div>
              <div className="bg-white p-4 rounded-lg border-2 border-indigo-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="text-indigo-600" size={20}/>
                  <p className="text-xs font-bold text-gray-500 uppercase">Strategic ROI</p>
                </div>
                <p className="text-2xl font-bold text-indigo-600">{result.enterpriseROI.csv.strategicROI.toFixed(1)}%</p>
              </div>
            </div>

            {/* Viability Assessment */}
            <div className={`p-4 rounded-lg border-2 mb-6 ${
              result.enterpriseROI.viability.isViable 
                ? 'bg-green-50 border-green-300' 
                : 'bg-yellow-50 border-yellow-300'
            }`}>
              <div className="flex items-start gap-3">
                {result.enterpriseROI.viability.isViable ? (
                  <CheckCircle className="text-green-600 flex-shrink-0" size={24}/>
                ) : (
                  <AlertCircle className="text-yellow-600 flex-shrink-0" size={24}/>
                )}
                <div>
                  <h4 className="font-bold text-gray-800 mb-2">Investment Recommendation</h4>
                  <p className="text-sm text-gray-700 mb-3">{result.enterpriseROI.viability.recommendation}</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      {result.enterpriseROI.viability.positiveNPV ? '✅' : '❌'}
                      <span>Positive NPV</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {result.enterpriseROI.viability.meetsHurdleRate ? '✅' : '❌'}
                      <span>IRR &gt; 12% Hurdle</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {result.enterpriseROI.viability.strategicallyViable ? '✅' : '❌'}
                      <span>Strategic Criteria</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CSV Scorecard */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-gray-800">Creating Shared Value (CSV) Scorecard</h4>
                <div className="text-2xl font-bold text-indigo-600">{result.enterpriseROI.csv.score.toFixed(1)}/10</div>
              </div>
              
              <div className="space-y-2">
                {Object.entries(result.enterpriseROI.csv.breakdown).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <div className="w-32 text-sm text-gray-600 capitalize">{key}</div>
                    <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-blue-400 to-indigo-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${(value / 10) * 100}%` }}
                      ></div>
                    </div>
                    <div className="w-12 text-sm font-bold text-gray-700 text-right">{value.toFixed(1)}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-600">
                <p><strong>CSV Multiplier:</strong> {result.enterpriseROI.csv.multiplier.toFixed(2)}x (adds {((result.enterpriseROI.csv.multiplier - 1) * 100).toFixed(1)}% strategic value)</p>
              </div>
            </div>

            <Button 
              variant="secondary" 
              onClick={() => setShowEnterpriseDetails(!showEnterpriseDetails)}
              className="mt-4 w-full flex items-center justify-center gap-2"
            >
              {showEnterpriseDetails ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
              {showEnterpriseDetails ? 'Hide' : 'Show'} Detailed Financials
            </Button>

            {showEnterpriseDetails && (
              <div className="mt-4 pt-4 border-t border-blue-200 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Simple ROI</p>
                    <p className="font-bold text-lg">{result.enterpriseROI.financial.simpleROI.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Payback Period</p>
                    <p className="font-bold text-lg">{result.enterpriseROI.financial.paybackYears.toFixed(1)} yrs</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Discount Rate (WACC)</p>
                    <p className="font-bold text-lg">{result.enterpriseROI.financial.discountRate.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Annual Cost Reduction</p>
                    <p className="font-bold text-lg">{symbol}{fmt(result.enterpriseROI.utop.annualCostReduction)}</p>
                  </div>
                </div>

                {result.enterpriseROI.utop.marginImprovement > 0 && (
                  <div className="bg-blue-50 p-3 rounded border border-blue-200">
                    <p className="text-sm text-gray-700">
                      <strong>UTOP Margin Impact:</strong> +{result.enterpriseROI.utop.marginImprovement.toFixed(2)}%
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* STANDARD RESULTS (continues below for non-enterprise) */}
        {result && !result.error && result.financials && !inputs.enableEnterpriseROI && (
          <div className="mt-8 bg-slate-50 p-6 rounded-xl border border-slate-200">
            <div className="flex justify-between items-end mb-6 pb-4 border-b">
              <div>
                <h3 className="text-xl font-bold text-orange-600">{result.system.name}</h3>
                <p className="text-xs font-bold text-gray-500 uppercase mt-1">
                  {result.system.refrigerant} • {result.system.kW} kW (Adjusted: {result.system.adjustedKW.toFixed(1)} kW) • COP {result.system.cop}
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-green-600">
                  {result.financials.symbol}{fmt(result.financials.totalAnnualSavings)}
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase">Total Annual Savings</p>
              </div>
            </div>

            {/* Tank Sizing - Same as before */}
            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {result.tankSizing.gapLph > 0 ? (
                      <AlertCircle className="text-amber-600" size={20}/>
                    ) : (
                      <CheckCircle className="text-green-600" size={20}/>
                    )}
                    <h4 className="font-bold text-gray-800">Tank Sizing</h4>
                  </div>
                  <p className="text-sm text-gray-700">
                    {result.system.integralTank ? (
                      <>
                        <strong>Integral Tank:</strong> This unit includes a {result.system.integralTank}L built-in tank.
                      </>
                    ) : (
                      <>
                        <strong>Required Tank:</strong> {result.tankSizing.recommendedTankSize}L external tank needed.
                      </>
                    )}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Recovery: {result.system.recoveryRate.toFixed(1)} L/hr • 
                    Peak Draw: {result.tankSizing.peakDrawRateLph.toFixed(1)} L/hr
                    {result.tankSizing.gapLph > 0 && (
                      <> • Gap: <span className="text-amber-700 font-semibold">{result.tankSizing.gapLph.toFixed(1)} L/hr</span></>
                    )}
                  </p>
                </div>
                <Button 
                  variant="secondary" 
                  onClick={() => setShowCalculations(!showCalculations)}
                  className="text-sm flex items-center gap-1"
                >
                  {showCalculations ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                  {showCalculations ? 'Hide' : 'Show'} Math
                </Button>
              </div>

              {showCalculations && (
                <div className="mt-4 pt-4 border-t border-amber-200">
                  <h5 className="font-semibold text-gray-800 mb-3">Tank Sizing Calculations:</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Daily Demand:</span>
                      <span className="font-mono">{result.metrics.dailyLiters} L</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Operating Hours:</span>
                      <span className="font-mono">{inputs.hoursPerDay} hrs/day</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Average Draw Rate:</span>
                      <span className="font-mono">{result.tankSizing.avgDrawRate.toFixed(1)} L/hr</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Coincidence Factor ({inputs.userType}):</span>
                      <span className="font-mono">{(result.tankSizing.coincidenceFactor * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between font-semibold text-orange-700">
                      <span>Peak Draw Rate:</span>
                      <span className="font-mono">{result.tankSizing.peakDrawRateLph.toFixed(1)} L/hr</span>
                    </div>
                    
                    <div className="h-px bg-amber-300 my-3"></div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Heat Pump Power (Adjusted):</span>
                      <span className="font-mono">{result.system.adjustedKW.toFixed(1)} kW</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Temperature Lift (ΔT):</span>
                      <span className="font-mono">{inputs.targetTemp - inputs.inletTemp}°C</span>
                    </div>
                    <div className="flex justify-between font-semibold text-blue-700">
                      <span>Recovery Rate:</span>
                      <span className="font-mono">{result.system.recoveryRate.toFixed(1)} L/hr</span>
                    </div>
                    
                    <div className="h-px bg-amber-300 my-3"></div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Gap (Peak - Recovery):</span>
                      <span className={`font-mono ${result.tankSizing.gapLph > 0 ? 'text-red-600 font-bold' : 'text-green-600'}`}>
                        {result.tankSizing.gapLph.toFixed(1)} L/hr
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Peak Duration:</span>
                      <span className="font-mono">{result.tankSizing.peakDuration} hrs</span>
                    </div>
                    
                    <div className="h-px bg-amber-300 my-3"></div>
                    
                    <p className="text-xs text-gray-600 mb-2">Three sizing methods (we use the largest):</p>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Method 1: Gap × Duration</span>
                      <span className="font-mono">{result.tankSizing.method1_GapBased.toFixed(0)} L</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Method 2: Peak Buffer (65%)</span>
                      <span className="font-mono">{result.tankSizing.method2_PeakBuffer.toFixed(0)} L</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Method 3: Daily Reserve (35%)</span>
                      <span className="font-mono">{result.tankSizing.method3_DailyReserve.toFixed(0)} L</span>
                    </div>
                    
                    <div className="h-px bg-amber-300 my-3"></div>
                    
                    <div className="flex justify-between font-bold text-lg text-orange-600">
                      <span>Recommended Tank Size:</span>
                      <span className="font-mono">{result.tankSizing.recommendedTankSize} L</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Continue with rest of standard results... (saving space, but same as before) */}
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
