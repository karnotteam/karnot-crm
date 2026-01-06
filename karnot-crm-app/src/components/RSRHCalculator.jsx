import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';

const RSRHCalculator = () => {
  // ==================== STATE MANAGEMENT ====================
  const [products, setProducts] = useState([]);
  const [selectedHP, setSelectedHP] = useState('auto');
  const [currency, setCurrency] = useState('₱');
  const [fxRate, setFxRate] = useState(59);
  
  // Project Inputs
  const [projectName, setProjectName] = useState('RSRH Pangasinan Pilot');
  const [dgsUnits, setDgsUnits] = useState(1);
  const [machineCostUSD, setMachineCostUSD] = useState(75000);
  
  // Climate & Location
  const [location, setLocation] = useState('pangasinan');
  const [lowTemp, setLowTemp] = useState(24); // °C
  const [highTemp, setHighTemp] = useState(34); // °C
  const [targetTemp, setTargetTemp] = useState(21); // °C
  const [buildingWidth, setBuildingWidth] = useState(12); // meters
  const [buildingLength, setBuildingLength] = useState(21); // meters
  const [buildingHeight, setBuildingHeight] = useState(5); // meters
  
  // Economics (Philippines Peso)
  const [feedPrice, setFeedPrice] = useState(16); // ₱ per kg
  const [elecRate, setElecRate] = useState(12); // ₱ per kWh
  const [grainCost, setGrainCost] = useState(15); // ₱ per kg
  const [laborCost, setLaborCost] = useState(25000); // ₱ monthly
  const [buildCost, setBuildCost] = useState(8000); // ₱ per sqm
  
  // Cattle Performance
  const [herdSize, setHerdSize] = useState(200); // heads per cycle
  const [targetWeightGain, setTargetWeightGain] = useState(110); // kg per head
  const [liveWeightPrice, setLiveWeightPrice] = useState(220); // ₱ per kg
  const [dailyYield, setDailyYield] = useState(850); // kg wet fodder per day per unit
  
  // Partnership Structure
  const [karnotShare, setKarnotShare] = useState(20); // %
  const [contractYears, setContractYears] = useState(10);
  
  // Calculated Results
  const [results, setResults] = useState(null);
  const [showResults, setShowResults] = useState(false);

  // ==================== CONSTANTS ====================
  const CLIMATE_DATA = {
    pangasinan: { name: 'Pangasinan', lowC: 24, highC: 34 },
    bulacan: { name: 'Bulacan', lowC: 23, highC: 35 },
    pampanga: { name: 'Pampanga', lowC: 23, highC: 36 }
  };

  const CATTLE_PERFORMANCE = {
    // Feed Conversion Ratio (kg feed per kg gain)
    traditional: { fcr: 9.0, adg: 1.1 }, // Avg Daily Gain kg/day
    hydrogreen: { fcr: 7.5, adg: 1.4 }
  };

  const SPECS = {
    ANCILLARY: { 
      AHU: 5000, 
      RingMain: 3000, 
      Dehum: 2400, 
      CO2: 1600 
    },
    LOADS: { // kW per system
      HG: 3.6,
      Fans: 2.4, 
      Lights: 0.48,
      Auger: 0.96,
      Pumps: 3.36,
      Misc: 1.2
    }
  };

  // ==================== FIREBASE INTEGRATION ====================
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const productsRef = collection(db, 'products');
      const q = query(productsRef, where('category', '==', 'Heat Pump'));
      const snapshot = await getDocs(q);
      const productList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(productList);
    } catch (error) {
      console.error('Error loading products:', error);
      // Fallback to hardcoded data
      setProducts(getDefaultHeatPumps());
    }
  };

  const getDefaultHeatPumps = () => {
    return [
      { name: "Karnot iHEAT R290 - 9.5kW", kw: 9.5, cost: 3944, id: 'hp1' },
      { name: "Karnot iHEAT R290 - 15.5kW", kw: 15.5, cost: 5140, id: 'hp2' },
      { name: "Karnot iHEAT R290 - 18.5kW", kw: 18.5, cost: 5434, id: 'hp3' },
      { name: "Karnot iHEAT R290 25kW", kw: 25, cost: 5492, id: 'hp4' },
      { name: "Karnot iHEAT R290 30kW", kw: 30, cost: 6856, id: 'hp5' },
      { name: "Karnot iHEAT R290 50kW", kw: 50, cost: 10300, id: 'hp6' },
      { name: "Karnot iHEAT ClimaPro R32 - 35kW", kw: 35, cost: 7680, id: 'hp7' }
    ];
  };

  // ==================== ENGINEERING CALCULATIONS ====================
  const calculateHeatLoad = () => {
    const W = buildingWidth;
    const L = buildingLength;
    const H = buildingHeight;
    
    // Surface area
    const wallArea = (L * H * 2) + (W * H * 2);
    const roofArea = L * W;
    const totalArea = wallArea + roofArea;
    
    // Temperature differential
    const deltaT = targetTemp - lowTemp;
    
    // Conduction load (simplified)
    // U-value assumed ~0.3 W/m²K for insulated structure
    const conductionLoadW = totalArea * 0.3 * deltaT * 1.2; // 20% safety factor
    
    // Ventilation load
    const cfmFresh = dgsUnits * 500; // CFM per unit
    const m3hFresh = cfmFresh * 1.699; // Convert to m³/h
    const ventLoadW = (m3hFresh / 3.6) * 1.2 * 1005 * deltaT; // Air density * Cp * deltaT
    
    // Internal gains (offset)
    const processGainW = dgsUnits * 6000; // ~20,000 BTU/hr = 6kW
    
    // Net heating load
    const totalHeatLoadW = Math.max(0, (conductionLoadW + ventLoadW) - (processGainW * 0.5));
    const totalHeatLoadKW = totalHeatLoadW / 1000;
    
    return {
      totalKW: totalHeatLoadKW,
      conductionKW: conductionLoadW / 1000,
      ventilationKW: ventLoadW / 1000
    };
  };

  const selectHeatPump = (loadKW) => {
    const heatPumps = products.length > 0 ? products : getDefaultHeatPumps();
    
    if (selectedHP !== 'auto') {
      const selected = heatPumps.find(hp => hp.id === selectedHP);
      if (selected) {
        const activeUnits = Math.ceil(loadKW / selected.kw);
        const standbyUnits = Math.ceil(activeUnits / 3) || 1;
        return {
          model: selected,
          activeUnits,
          standbyUnits,
          totalUnits: activeUnits + standbyUnits
        };
      }
    }
    
    // Auto-select: N+1 redundancy, 3 active units
    const targetUnitSize = loadKW / 3;
    const selected = heatPumps.find(hp => hp.kw >= targetUnitSize) || heatPumps[heatPumps.length - 1];
    
    const activeUnits = Math.max(3, Math.ceil(loadKW / selected.kw));
    const standbyUnits = Math.ceil(activeUnits / 3);
    
    return {
      model: selected,
      activeUnits,
      standbyUnits,
      totalUnits: activeUnits + standbyUnits
    };
  };

  // ==================== CATTLE PERFORMANCE CALCULATIONS ====================
  const calculateCattlePerformance = () => {
    const tradFCR = CATTLE_PERFORMANCE.traditional.fcr;
    const tradADG = CATTLE_PERFORMANCE.traditional.adg;
    const hydroFCR = CATTLE_PERFORMANCE.hydrogreen.fcr;
    const hydroADG = CATTLE_PERFORMANCE.hydrogreen.adg;
    
    // Time to market
    const tradDays = Math.ceil(targetWeightGain / tradADG);
    const hydroDays = Math.ceil(targetWeightGain / hydroADG);
    
    // Cycles per year
    const tradCycles = Math.floor(365 / tradDays);
    const hydroCycles = Math.floor(365 / hydroDays);
    
    // Annual throughput
    const tradHeads = herdSize * tradCycles;
    const hydroHeads = herdSize * hydroCycles;
    
    // Feed required per head
    const tradFeedKg = targetWeightGain * tradFCR;
    const hydroFeedKg = targetWeightGain * hydroFCR;
    
    return {
      traditional: {
        daysToMarket: tradDays,
        cyclesPerYear: tradCycles,
        annualHeads: tradHeads,
        feedPerHead: tradFeedKg
      },
      hydrogreen: {
        daysToMarket: hydroDays,
        cyclesPerYear: hydroCycles,
        annualHeads: hydroHeads,
        feedPerHead: hydroFeedKg
      }
    };
  };

  // ==================== FINANCIAL CALCULATIONS ====================
  const runCalculation = () => {
    // 1. Heat Load & Equipment
    const heatLoad = calculateHeatLoad();
    const hpSelection = selectHeatPump(heatLoad.totalKW);
    
    // 2. CapEx
    const capExMachine = dgsUnits * machineCostUSD * fxRate;
    const capExHP = hpSelection.totalUnits * hpSelection.model.cost * fxRate;
    const capExAnc = dgsUnits * (SPECS.ANCILLARY.AHU + SPECS.ANCILLARY.RingMain + 
                                  SPECS.ANCILLARY.Dehum + SPECS.ANCILLARY.CO2) * fxRate;
    const capExBuilding = (buildingWidth * buildingLength) * buildCost;
    const capExLogistics = dgsUnits * 250000; // ₱250k per unit shipping/install
    const totalCapEx = capExMachine + capExHP + capExAnc + capExBuilding + capExLogistics;
    
    // 3. Cattle Performance
    const cattlePerf = calculateCattlePerformance();
    
    // 4. OpEx Calculation
    const annualFodderKg = dailyYield * 365 * dgsUnits;
    const annualGrainKg = annualFodderKg * 0.16; // 16% grain input
    const annualGrainCost = annualGrainKg * grainCost;
    
    // Electrical load
    const processLoadKW = Object.values(SPECS.LOADS).reduce((a, b) => a + b) * dgsUnits;
    const hvacLoadKW = heatLoad.totalKW / 3.5; // Assume COP 3.5
    const totalKW = processLoadKW + hvacLoadKW;
    const annualElecCost = totalKW * 24 * 365 * elecRate;
    
    const annualLaborCost = laborCost * 12;
    const totalOpEx = annualGrainCost + annualElecCost + annualLaborCost;
    
    // 5. Revenue Calculation (HydroGreen scenario)
    const hydroHeads = cattlePerf.hydrogreen.annualHeads;
    const saleValuePerHead = targetWeightGain * liveWeightPrice;
    const annualRevenue = hydroHeads * saleValuePerHead;
    
    // 6. Cost per head (feed only)
    const fodderCostPerKg = totalOpEx / annualFodderKg;
    const feedCostPerHead = (cattlePerf.hydrogreen.feedPerHead * 0.7 * fodderCostPerKg) + 
                            (cattlePerf.hydrogreen.feedPerHead * 0.3 * grainCost);
    
    // 7. Net Profit
    const totalFeedCost = feedCostPerHead * hydroHeads;
    const netProfit = annualRevenue - totalFeedCost - totalOpEx;
    
    // 8. ROI
    const paybackYears = totalCapEx / netProfit;
    const annualROI = (netProfit / totalCapEx) * 100;
    
    // 9. Partnership Split
    const karnotAnnualShare = netProfit * (karnotShare / 100);
    const rsrhAnnualShare = netProfit * ((100 - karnotShare) / 100);
    
    const calculatedResults = {
      heatLoad,
      hpSelection,
      capEx: {
        machine: capExMachine,
        heatPumps: capExHP,
        ancillary: capExAnc,
        building: capExBuilding,
        logistics: capExLogistics,
        total: totalCapEx
      },
      cattlePerf,
      opEx: {
        grain: annualGrainCost,
        electricity: annualElecCost,
        labor: annualLaborCost,
        total: totalOpEx
      },
      revenue: {
        annualHeads: hydroHeads,
        salePerHead: saleValuePerHead,
        totalAnnual: annualRevenue
      },
      profitability: {
        feedCostPerHead,
        netProfit,
        paybackYears,
        annualROI,
        karnotShare: karnotAnnualShare,
        rsrhShare: rsrhAnnualShare
      }
    };
    
    setResults(calculatedResults);
    setShowResults(true);
  };

  // ==================== SAVE TO FIREBASE ====================
  const saveCalculation = async () => {
    if (!results) return;
    
    try {
      await addDoc(collection(db, 'rsrhCalculations'), {
        projectName,
        timestamp: new Date(),
        inputs: {
          dgsUnits, herdSize, targetWeightGain, liveWeightPrice,
          fxRate, karnotShare, contractYears
        },
        results,
        status: 'draft'
      });
      alert('Calculation saved successfully!');
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error saving calculation');
    }
  };

  // ==================== HELPER FUNCTIONS ====================
  const fmt = (num, decimals = 0) => {
    return num.toLocaleString('en-PH', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  const fmtCurrency = (num) => {
    return `${currency}${fmt(num, 0)}`;
  };

  // ==================== RENDER ====================
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-teal-700 mb-2">
          RSRH Cattle Finishing Calculator
        </h1>
        <p className="text-gray-600">
          Joint Venture: HydroGreen Fodder Production for Pre-Slaughter Cattle Conditioning
        </p>
      </div>

      {/* Control Panel */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-700">Project Settings</h3>
          <div className="flex gap-4 items-center">
            <label className="text-sm font-medium">Currency:</label>
            <select 
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="border rounded px-3 py-1"
            >
              <option value="₱">Philippine Peso (₱)</option>
              <option value="$">US Dollar ($)</option>
            </select>
            <label className="text-sm font-medium">FX Rate (USD→PHP):</label>
            <input
              type="number"
              value={fxRate}
              onChange={(e) => setFxRate(parseFloat(e.target.value))}
              className="border rounded px-3 py-1 w-20"
              step="0.01"
            />
          </div>
        </div>
      </div>

      {/* Main Input Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Project Basics */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-teal-600 mb-4 border-b-2 border-teal-200 pb-2">
            1. Project Basics
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Name
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                DGS 66 Units
              </label>
              <input
                type="number"
                value={dgsUnits}
                onChange={(e) => setDgsUnits(parseInt(e.target.value))}
                className="w-full border rounded px-3 py-2"
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Machine Cost (USD)
              </label>
              <input
                type="number"
                value={machineCostUSD}
                onChange={(e) => setMachineCostUSD(parseFloat(e.target.value))}
                className="w-full border rounded px-3 py-2 border-l-4 border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Heat Pump
              </label>
              <select
                value={selectedHP}
                onChange={(e) => setSelectedHP(e.target.value)}
                className="w-full border rounded px-3 py-2 border-l-4 border-orange-500"
              >
                <option value="auto">✨ Auto-Engineer Best Fit</option>
                {(products.length > 0 ? products : getDefaultHeatPumps()).map(hp => (
                  <option key={hp.id} value={hp.id}>
                    {hp.name} [${hp.cost}]
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Location & Climate */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-teal-600 mb-4 border-b-2 border-teal-200 pb-2">
            2. Location & Climate
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Site Location
              </label>
              <select
                value={location}
                onChange={(e) => {
                  const loc = e.target.value;
                  setLocation(loc);
                  if (loc !== 'custom') {
                    setLowTemp(CLIMATE_DATA[loc].lowC);
                    setHighTemp(CLIMATE_DATA[loc].highC);
                  }
                }}
                className="w-full border rounded px-3 py-2"
              >
                <option value="pangasinan">Pangasinan (Cosmos Farm)</option>
                <option value="bulacan">Bulacan</option>
                <option value="pampanga">Pampanga</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Low Temp (°C)
                </label>
                <input
                  type="number"
                  value={lowTemp}
                  onChange={(e) => setLowTemp(parseFloat(e.target.value))}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  High Temp (°C)
                </label>
                <input
                  type="number"
                  value={highTemp}
                  onChange={(e) => setHighTemp(parseFloat(e.target.value))}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Building: W × L × H (m)
              </label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  value={buildingWidth}
                  onChange={(e) => setBuildingWidth(parseFloat(e.target.value))}
                  className="border rounded px-2 py-2"
                  placeholder="W"
                />
                <input
                  type="number"
                  value={buildingLength}
                  onChange={(e) => setBuildingLength(parseFloat(e.target.value))}
                  className="border rounded px-2 py-2"
                  placeholder="L"
                />
                <input
                  type="number"
                  value={buildingHeight}
                  onChange={(e) => setBuildingHeight(parseFloat(e.target.value))}
                  className="border rounded px-2 py-2"
                  placeholder="H"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Indoor Temp (°C)
              </label>
              <input
                type="number"
                value={targetTemp}
                onChange={(e) => setTargetTemp(parseFloat(e.target.value))}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* Economics */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-teal-600 mb-4 border-b-2 border-teal-200 pb-2">
            3. Economics (PHP)
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Feed Price (₱/kg)
              </label>
              <input
                type="number"
                value={feedPrice}
                onChange={(e) => setFeedPrice(parseFloat(e.target.value))}
                className="w-full border rounded px-3 py-2 border-l-4 border-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Electricity Rate (₱/kWh)
              </label>
              <input
                type="number"
                value={elecRate}
                onChange={(e) => setElecRate(parseFloat(e.target.value))}
                className="w-full border rounded px-3 py-2 border-l-4 border-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grain Cost (₱/kg)
              </label>
              <input
                type="number"
                value={grainCost}
                onChange={(e) => setGrainCost(parseFloat(e.target.value))}
                className="w-full border rounded px-3 py-2 border-l-4 border-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Building Cost (₱/sqm)
              </label>
              <input
                type="number"
                value={buildCost}
                onChange={(e) => setBuildCost(parseFloat(e.target.value))}
                className="w-full border rounded px-3 py-2 border-l-4 border-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Labor Cost (₱/month)
              </label>
              <input
                type="number"
                value={laborCost}
                onChange={(e) => setLaborCost(parseFloat(e.target.value))}
                className="w-full border rounded px-3 py-2 border-l-4 border-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Cattle & Partnership */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-teal-600 mb-4 border-b-2 border-teal-200 pb-2">
            4. Cattle & Partnership
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Herd Size (heads/cycle)
              </label>
              <input
                type="number"
                value={herdSize}
                onChange={(e) => setHerdSize(parseInt(e.target.value))}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Weight Gain (kg)
              </label>
              <input
                type="number"
                value={targetWeightGain}
                onChange={(e) => setTargetWeightGain(parseFloat(e.target.value))}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Live Weight Price (₱/kg)
              </label>
              <input
                type="number"
                value={liveWeightPrice}
                onChange={(e) => setLiveWeightPrice(parseFloat(e.target.value))}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Daily Yield (kg/unit)
              </label>
              <input
                type="number"
                value={dailyYield}
                onChange={(e) => setDailyYield(parseFloat(e.target.value))}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Karnot Profit Share (%)
              </label>
              <input
                type="number"
                value={karnotShare}
                onChange={(e) => setKarnotShare(parseFloat(e.target.value))}
                className="w-full border rounded px-3 py-2"
                min="0"
                max="100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contract Term (years)
              </label>
              <input
                type="number"
                value={contractYears}
                onChange={(e) => setContractYears(parseInt(e.target.value))}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Calculate Button */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <button
          onClick={runCalculation}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 px-6 rounded-lg text-lg transition-colors"
        >
          🚀 GENERATE RSRH BUSINESS CASE
        </button>
      </div>

      {/* Results Section */}
      {showResults && results && (
        <>
          {/* ROI Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg shadow-md p-6 border-2 border-teal-200">
              <div className="text-sm font-medium text-teal-700 uppercase tracking-wide mb-2">
                Payback Period
              </div>
              <div className="text-4xl font-bold text-teal-800">
                {fmt(results.profitability.paybackYears, 1)} Years
              </div>
              <div className="text-sm text-teal-600 mt-2">
                {fmt(results.profitability.annualROI, 1)}% Annual ROI
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow-md p-6 border-2 border-orange-200">
              <div className="text-sm font-medium text-orange-700 uppercase tracking-wide mb-2">
                Annual Net Profit
              </div>
              <div className="text-4xl font-bold text-orange-800">
                {fmtCurrency(results.profitability.netProfit)}
              </div>
              <div className="text-sm text-orange-600 mt-2">
                Karnot Share: {fmtCurrency(results.profitability.karnotShare)}
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-md p-6 border-2 border-blue-200">
              <div className="text-sm font-medium text-blue-700 uppercase tracking-wide mb-2">
                Total Investment
              </div>
              <div className="text-4xl font-bold text-blue-800">
                {fmtCurrency(results.capEx.total)}
              </div>
              <div className="text-sm text-blue-600 mt-2">
                Machine + Building + HVAC
              </div>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* CapEx Breakdown */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
                Capital Expenditure (CapEx)
              </h3>
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left py-3 px-2 font-semibold text-gray-700">Item</th>
                    <th className="text-right py-3 px-2 font-semibold text-gray-700">Cost</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  <tr className="border-b">
                    <td className="py-3 px-2">Fodder Machines (USD Converted)</td>
                    <td className="py-3 px-2 text-right">{fmtCurrency(results.capEx.machine)}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-2">
                      Karnot HVAC System<br/>
                      <span className="text-xs text-gray-500">
                        {results.hpSelection.totalUnits}x {results.hpSelection.model.name}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">{fmtCurrency(results.capEx.heatPumps)}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-2">Ancillaries & Controls</td>
                    <td className="py-3 px-2 text-right">{fmtCurrency(results.capEx.ancillary)}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-2">Building Construction</td>
                    <td className="py-3 px-2 text-right">{fmtCurrency(results.capEx.building)}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-2">Logistics & Installation</td>
                    <td className="py-3 px-2 text-right">{fmtCurrency(results.capEx.logistics)}</td>
                  </tr>
                  <tr className="bg-teal-50 font-bold">
                    <td className="py-3 px-2 text-teal-800">TOTAL CAPEX</td>
                    <td className="py-3 px-2 text-right text-teal-800">{fmtCurrency(results.capEx.total)}</td>
                  </tr>
                </tbody>
              </table>
              <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-600">
                <strong>HVAC Engineering:</strong> {fmt(results.heatLoad.totalKW, 1)} kW Peak Load<br/>
                <strong>Configuration:</strong> {results.hpSelection.activeUnits} Active + {results.hpSelection.standbyUnits} Standby
              </div>
            </div>

            {/* OpEx & Revenue */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
                Operating Costs & Revenue
              </h3>
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left py-3 px-2 font-semibold text-gray-700">Item</th>
                    <th className="text-right py-3 px-2 font-semibold text-gray-700">Annual Cost</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  <tr className="border-b">
                    <td className="py-3 px-2">Electricity</td>
                    <td className="py-3 px-2 text-right">{fmtCurrency(results.opEx.electricity)}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-2">Grain Input</td>
                    <td className="py-3 px-2 text-right">{fmtCurrency(results.opEx.grain)}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-2">Labor & Operations</td>
                    <td className="py-3 px-2 text-right">{fmtCurrency(results.opEx.labor)}</td>
                  </tr>
                  <tr className="border-b font-semibold">
                    <td className="py-3 px-2">Total OpEx</td>
                    <td className="py-3 px-2 text-right">{fmtCurrency(results.opEx.total)}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-2"></td>
                    <td className="py-3 px-2 text-right"></td>
                  </tr>
                  <tr className="border-b text-green-700 font-semibold">
                    <td className="py-3 px-2">
                      Gross Revenue (Feed Sales)<br/>
                      <span className="text-xs text-gray-500 font-normal">
                        {fmt(results.revenue.annualHeads)} heads/year × {fmtCurrency(results.revenue.salePerHead)}/head
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">{fmtCurrency(results.revenue.totalAnnual)}</td>
                  </tr>
                  <tr className="bg-green-50 font-bold">
                    <td className="py-3 px-2 text-green-800">NET ANNUAL PROFIT</td>
                    <td className="py-3 px-2 text-right text-green-800">{fmtCurrency(results.profitability.netProfit)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Cattle Performance Comparison */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
              Cattle Performance: Traditional vs HydroGreen
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Traditional */}
              <div className="border-2 border-yellow-300 rounded-lg p-4 bg-yellow-50">
                <h4 className="font-bold text-yellow-800 mb-3">Traditional Feed</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Time to Market:</span>
                    <span className="font-semibold">{results.cattlePerf.traditional.daysToMarket} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cycles per Year:</span>
                    <span className="font-semibold">{results.cattlePerf.traditional.cyclesPerYear} cycles</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Annual Throughput:</span>
                    <span className="font-semibold">{fmt(results.cattlePerf.traditional.annualHeads)} heads</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Feed per Head:</span>
                    <span className="font-semibold">{fmt(results.cattlePerf.traditional.feedPerHead, 0)} kg</span>
                  </div>
                </div>
              </div>

              {/* HydroGreen */}
              <div className="border-2 border-green-400 rounded-lg p-4 bg-green-50">
                <h4 className="font-bold text-green-800 mb-3">HydroGreen Supplemented</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Time to Market:</span>
                    <span className="font-semibold">{results.cattlePerf.hydrogreen.daysToMarket} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cycles per Year:</span>
                    <span className="font-semibold">{results.cattlePerf.hydrogreen.cyclesPerYear} cycles</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Annual Throughput:</span>
                    <span className="font-semibold">{fmt(results.cattlePerf.hydrogreen.annualHeads)} heads</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Feed per Head:</span>
                    <span className="font-semibold">{fmt(results.cattlePerf.hydrogreen.feedPerHead, 0)} kg</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Advantage Summary */}
            <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
              <h4 className="font-bold text-blue-800 mb-2">The HydroGreen Advantage:</h4>
              <ul className="text-sm text-blue-900 space-y-1">
                <li>✓ <strong>{results.cattlePerf.traditional.daysToMarket - results.cattlePerf.hydrogreen.daysToMarket} days faster</strong> to market per head</li>
                <li>✓ <strong>{results.cattlePerf.hydrogreen.annualHeads - results.cattlePerf.traditional.annualHeads} more heads</strong> finished annually</li>
                <li>✓ <strong>{fmt(((results.cattlePerf.traditional.feedPerHead - results.cattlePerf.hydrogreen.feedPerHead) / results.cattlePerf.traditional.feedPerHead * 100), 1)}% better</strong> feed conversion ratio</li>
                <li>✓ Improved cattle health, reduced stress, better meat quality</li>
              </ul>
            </div>
          </div>

          {/* Partnership Summary */}
          <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-lg shadow-lg p-6 text-white">
            <h3 className="text-2xl font-bold mb-4">Joint Venture Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-teal-100 mb-2">Karnot Energy Solutions</h4>
                <div className="space-y-2 text-sm">
                  <div>Provides: Equipment, Technology, Training</div>
                  <div>Annual Share: <span className="text-2xl font-bold">{fmtCurrency(results.profitability.karnotShare)}</span></div>
                  <div>Percentage: {karnotShare}% of net profit</div>
                  <div>Term: {contractYears} years</div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-teal-100 mb-2">RSRH Livestock Corporation</h4>
                <div className="space-y-2 text-sm">
                  <div>Provides: Land, Operations, Cattle Management</div>
                  <div>Annual Share: <span className="text-2xl font-bold">{fmtCurrency(results.profitability.rsrhShare)}</span></div>
                  <div>Percentage: {100 - karnotShare}% of net profit</div>
                  <div>Total Investment: {fmtCurrency(results.capEx.total)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex gap-4">
              <button
                onClick={saveCalculation}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                💾 Save Calculation
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 bg-gray-700 hover:bg-gray-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                🖨️ Print Proposal
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RSRHCalculator;
