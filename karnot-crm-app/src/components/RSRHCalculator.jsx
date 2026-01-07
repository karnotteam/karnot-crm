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
  const [liveWeightPrice, setLiveWeightPrice] = useState(189); // ₱ per kg (~$3.20/kg at ₱59)
  const [dailyYield, setDailyYield] = useState(2500); // kg wet fodder per day per unit (ACTUAL: 2-3 metric tons/day per HydroGreen spec)
  
  // Partnership Structure
  const [karnotShare, setKarnotShare] = useState(80); // % FIXED: Karnot gets 80%
  const [contractYears, setContractYears] = useState(5);
  
  // Financing
  const [financeAmount, setFinanceAmount] = useState(100); // % of CapEx to finance
  const [interestRate, setInterestRate] = useState(12); // % annual interest
  const [loanTermYears, setLoanTermYears] = useState(5);
  
  // Calculated Results
  const [results, setResults] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState('PHP');
  
  // Console viewer for iPad debugging
  const [showConsole, setShowConsole] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState([]);
  
  // Capture console logs for debugging
  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    
    console.log = (...args) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      setConsoleLogs(prev => [...prev.slice(-100), { 
        type: 'log', 
        message, 
        time: new Date().toLocaleTimeString() 
      }]);
      originalLog.apply(console, args);
    };
    
    console.error = (...args) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      setConsoleLogs(prev => [...prev.slice(-100), { 
        type: 'error', 
        message, 
        time: new Date().toLocaleTimeString() 
      }]);
      originalError.apply(console, args);
    };
    
    console.warn = (...args) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      setConsoleLogs(prev => [...prev.slice(-100), { 
        type: 'warn', 
        message, 
        time: new Date().toLocaleTimeString() 
      }]);
      originalWarn.apply(console, args);
    };
    
    console.log('Console logger initialized');
    
    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  // ==================== CONSTANTS ====================
  const CLIMATE_DATA = {
    pangasinan: { name: 'Pangasinan', lowC: 24, highC: 34, hr_low_gr_lb: 120, hr_high_gr_lb: 180 },
    bulacan: { name: 'Bulacan', lowC: 23, highC: 35, hr_low_gr_lb: 115, hr_high_gr_lb: 185 },
    pampanga: { name: 'Pampanga', lowC: 23, highC: 36, hr_low_gr_lb: 115, hr_high_gr_lb: 190 }
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
    },
    THERMAL: {
      INSIDE_TEMP_F: 70, // 21°C target
      INSIDE_RH_PERCENT: 75, // 75% RH target (CRITICAL!)
      HEATING_COP: 3.5,
      COOLING_COP: 2.8,
      SAFETY_FACTOR: 1.1,
      HRV_EFFICIENCY: 0.75, // Heat recovery
      U_VALUE_WALLS_BTU: 0.042, // Well-insulated
      U_VALUE_CEILING_BTU: 0.042,
      AIR_CHANGES_PER_HOUR: 0.5
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
      { name: "Karnot iHEAT R290 - 11.5kW", kw: 11.5, cost: 4100, id: 'hp2' },
      { name: "Karnot iHEAT R290 - 15.5kW", kw: 15.5, cost: 5140, id: 'hp3' },
      { name: "Karnot iHEAT R290 - 18.5kW", kw: 18.5, cost: 5434, id: 'hp4' },
      { name: "Karnot iHEAT R290 - 25kW", kw: 25, cost: 6500, id: 'hp5' },
      { name: "Karnot iHEAT R290 - 30kW", kw: 30, cost: 7500, id: 'hp6' }
    ];
  };

  // ==================== PSYCHROMETRIC CALCULATIONS ====================
  const getPsat_F = (T_F) => {
    // Antoine equation for saturation pressure
    const T_C = (T_F - 32) * 5 / 9;
    const P_mmHg = Math.pow(10, 8.07131 - (1730.63 / (233.426 + T_C)));
    return P_mmHg / 51.715; // Convert mmHg to psi
  };

  const getW_gr_lb = (T_F, RH_percent) => {
    // Calculate humidity ratio in grains/lb at given temp and RH
    const P_atm_psi = 14.696;
    const P_sat = getPsat_F(T_F);
    const P_v = P_sat * (RH_percent / 100);
    if (P_v >= P_atm_psi) return getW_gr_lb(T_F, 99.9);
    const W_lb_lb = 0.622 * (P_v / (P_atm_psi - P_v));
    return W_lb_lb * 7000; // Convert to grains/lb
  };

  const C_to_F = (c) => (c * 9 / 5) + 32;
  const F_to_C = (f) => (f - 32) * 5 / 9;

  // ==================== ENGINEERING CALCULATIONS ====================
  const calculateHeatLoad = () => {
    const W = buildingWidth;
    const L = buildingLength;
    const H = buildingHeight;
    
    // Convert to imperial for calculations (industry standard)
    const W_ft = W * 3.28084;
    const L_ft = L * 3.28084;
    const H_ft = H * 3.28084;
    
    // Surface areas
    const wallArea_ft2 = (L_ft * H_ft * 2) + (W_ft * H_ft * 2);
    const roofArea_ft2 = L_ft * W_ft;
    const volume_ft3 = L_ft * W_ft * H_ft;
    
    // Temperature differentials (°F)
    const insideTemp_F = SPECS.THERMAL.INSIDE_TEMP_F;
    const lowTemp_F = C_to_F(lowTemp);
    const highTemp_F = C_to_F(highTemp);
    const deltaT_heat = insideTemp_F - lowTemp_F;
    const deltaT_cool = highTemp_F - insideTemp_F;
    
    // HEATING LOAD CALCULATION
    // 1. Conduction through walls/roof
    const conductionHeat_BTUhr = (wallArea_ft2 * SPECS.THERMAL.U_VALUE_WALLS_BTU + 
                                   roofArea_ft2 * SPECS.THERMAL.U_VALUE_CEILING_BTU) * deltaT_heat;
    
    // 2. Fresh air ventilation (sensible)
    const freshAirCFM = (volume_ft3 * SPECS.THERMAL.AIR_CHANGES_PER_HOUR) / 60;
    const ventHeatLoad_BTUhr = freshAirCFM * 1.08 * deltaT_heat * (1 - SPECS.THERMAL.HRV_EFFICIENCY);
    
    // 3. Total heating load
    const totalHeatLoad_BTUhr = (conductionHeat_BTUhr + ventHeatLoad_BTUhr) * SPECS.THERMAL.SAFETY_FACTOR;
    const totalHeatLoad_kW = totalHeatLoad_BTUhr * 0.000293071;
    
    // COOLING LOAD CALCULATION
    // 1. Sensible cooling (conduction + ventilation + internal gains)
    const conductionCool_BTUhr = (wallArea_ft2 * SPECS.THERMAL.U_VALUE_WALLS_BTU + 
                                   roofArea_ft2 * SPECS.THERMAL.U_VALUE_CEILING_BTU) * deltaT_cool;
    
    const ventCoolLoad_BTUhr = freshAirCFM * 1.08 * deltaT_cool * (1 - SPECS.THERMAL.HRV_EFFICIENCY);
    
    // Internal gains from HydroGreen process (~21,000 BTU/hr)
    const processGain_BTUhr = dgsUnits * 21327;
    
    const sensibleCoolLoad_BTUhr = conductionCool_BTUhr + ventCoolLoad_BTUhr + processGain_BTUhr;
    
    // 2. LATENT COOLING (Dehumidification)
    // Get humidity ratios
    const insideW_gr_lb = getW_gr_lb(insideTemp_F, SPECS.THERMAL.INSIDE_RH_PERCENT);
    const climate = CLIMATE_DATA[location];
    const outdoorW_high_gr_lb = climate.hr_high_gr_lb || 180; // Summer humidity
    const outdoorW_low_gr_lb = climate.hr_low_gr_lb || 120; // Winter humidity
    
    // Latent load = CFM × 0.68 × ΔW (grains/lb)
    const latentCoolLoad_BTUhr = freshAirCFM * 0.68 * Math.max(0, outdoorW_high_gr_lb - insideW_gr_lb);
    
    // 3. Total cooling load
    const totalCoolLoad_BTUhr = (sensibleCoolLoad_BTUhr + latentCoolLoad_BTUhr) * SPECS.THERMAL.SAFETY_FACTOR;
    const totalCoolLoad_kW = totalCoolLoad_BTUhr * 0.000293071;
    const totalCoolLoad_Tons = totalCoolLoad_BTUhr / 12000;
    
    // HUMIDIFICATION LOAD (Winter)
    const humidification_lbs_hr = (freshAirCFM * 4.5 * Math.max(0, insideW_gr_lb - outdoorW_low_gr_lb)) / 7000;
    
    // DEHUMIDIFICATION LOAD (Summer)
    const dehumidification_lbs_hr = (freshAirCFM * 4.5 * Math.max(0, outdoorW_high_gr_lb - insideW_gr_lb)) / 7000;
    
    return {
      totalKW_heating: totalHeatLoad_kW,
      totalKW_cooling: totalCoolLoad_kW,
      totalTons_cooling: totalCoolLoad_Tons,
      totalBTUhr_heating: totalHeatLoad_BTUhr,
      totalBTUhr_cooling: totalCoolLoad_BTUhr,
      sensibleBTUhr: sensibleCoolLoad_BTUhr,
      latentBTUhr: latentCoolLoad_BTUhr,
      conductionKW_heat: conductionHeat_BTUhr * 0.000293071,
      ventilationKW_heat: ventHeatLoad_BTUhr * 0.000293071,
      conductionKW_cool: conductionCool_BTUhr * 0.000293071,
      ventilationKW_cool: ventCoolLoad_BTUhr * 0.000293071,
      freshAirCFM,
      humidification_lbs_hr,
      dehumidification_lbs_hr,
      insideW_gr_lb,
      outdoorW_high_gr_lb,
      outdoorW_low_gr_lb
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
    
    // Auto-select: Find most economical solution
    const targetUnitSize = loadKW / 3; // Prefer 3-unit systems
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
    // 1. Heat Load & Equipment Selection
    const heatLoad = calculateHeatLoad();
    
    // Heat pumps are REVERSIBLE - size for the larger load
    const peakLoad = Math.max(heatLoad.totalKW_heating, heatLoad.totalKW_cooling);
    
    // Standard Karnot configuration: 4 units total (2+2 for redundancy)
    const hpSystem = selectHeatPump(peakLoad);
    
    // 2. CapEx
    const capExMachine = dgsUnits * machineCostUSD * fxRate;
    const capExHP = hpSystem.totalUnits * hpSystem.model.cost * fxRate; // Single system!
    const capExAnc = dgsUnits * (SPECS.ANCILLARY.AHU + SPECS.ANCILLARY.RingMain + 
                                  SPECS.ANCILLARY.Dehum + SPECS.ANCILLARY.CO2) * fxRate;
    const capExBuilding = (buildingWidth * buildingLength) * buildCost;
    const capExLogistics = dgsUnits * 250000; // ₱250k per unit shipping/install
    const totalCapEx = capExMachine + capExHP + capExAnc + capExBuilding + capExLogistics;
    
    // 3. Cattle Performance (calculate early, needed for OpEx)
    const cattlePerf = calculateCattlePerformance();
    
    // 4. OpEx Calculation (needed to calculate working capital requirement)
    const annualFodderKg = dailyYield * 365 * dgsUnits;
    const annualGrainKg = annualFodderKg * 0.16; // 16% grain input
    const annualGrainCost = annualGrainKg * grainCost;
    
    // Electrical load
    const processLoadKW = Object.values(SPECS.LOADS).reduce((a, b) => a + b) * dgsUnits;
    
    // HVAC electrical load - use the LARGER of heating or cooling (can't run both simultaneously)
    const hvacHeatingLoadKW = heatLoad.totalKW_heating / SPECS.THERMAL.HEATING_COP;
    const hvacCoolingLoadKW = heatLoad.totalKW_cooling / SPECS.THERMAL.COOLING_COP;
    const peakHVACLoadKW = Math.max(hvacHeatingLoadKW, hvacCoolingLoadKW);
    
    const totalKW = processLoadKW + peakHVACLoadKW;
    const annualElecCost = totalKW * 24 * 365 * elecRate;
    
    const annualLaborCost = laborCost * 12;
    const annualOpExBeforeDebt = annualGrainCost + annualElecCost + annualLaborCost;
    
    // 5. Financing Structure (CapEx + 12 months working capital)
    const workingCapital = annualOpExBeforeDebt; // 12 months of operating costs
    const totalProjectCost = totalCapEx + workingCapital;
    const financedAmount = totalProjectCost * (financeAmount / 100);
    const equityAmount = totalProjectCost - financedAmount;
    
    // Loan repayment over 3 years from revenue (not standard amortization)
    const loanRepaymentYears = 3;
    const annualLoanRepayment = financedAmount / loanRepaymentYears;
    const annualInterestCost = financedAmount * (interestRate / 100) * 0.5; // Average over 3 years
    const annualDebtService = annualLoanRepayment + annualInterestCost;
    
    const totalOpEx = annualOpExBeforeDebt + annualDebtService;
    
    // 6. Revenue Calculation - SELLING FODDER (not cattle!)
    // Your revenue is FIXED by production capacity, not herd size
    const annualFodderProduced = dailyYield * 365 * dgsUnits; // kg/year
    const fodderSalePrice = feedPrice; // Price per kg (set by user)
    const annualRevenue = annualFodderProduced * fodderSalePrice;
    
    // 7. Cattle metrics (for reference only - doesn't affect revenue)
    const dailyFeedPerHead = 12; // kg fresh fodder per head per day
    const maxCattleCapacity = Math.floor((dailyYield * dgsUnits) / dailyFeedPerHead);
    
    // Show what % of production capacity is being used
    const dailyFeedNeeded = herdSize * dailyFeedPerHead;
    const dailyProduction = dailyYield * dgsUnits;
    const utilizationRate = Math.min(100, (dailyFeedNeeded / dailyProduction) * 100);
    
    // 8. Net Profit (AFTER all costs including debt service)
    const grossProfit = annualRevenue - annualOpExBeforeDebt;
    const netProfit = grossProfit - annualDebtService;
    
    // 9. ROI
    const paybackYears = equityAmount / netProfit;
    const annualROI = (netProfit / equityAmount) * 100;
    
    // 10. Partnership Split - FIXED: Karnot gets 80%
    const karnotAnnualShare = netProfit * (karnotShare / 100);
    const rsrhAnnualShare = netProfit * ((100 - karnotShare) / 100);
    
    const calculatedResults = {
      heatLoad,
      hpSystem, // Single reversible system
      peakLoad,
      capEx: {
        machine: capExMachine,
        heatPumps: capExHP, // Single system cost
        ancillary: capExAnc,
        building: capExBuilding,
        logistics: capExLogistics,
        total: totalCapEx
      },
      financing: {
        totalCapEx,
        workingCapital,
        totalProjectCost,
        financedAmount,
        equityAmount,
        interestRate,
        loanRepaymentYears,
        annualLoanRepayment,
        annualInterestCost,
        annualDebtService
      },
      cattlePerf,
      opEx: {
        grain: annualGrainCost,
        electricity: annualElecCost,
        labor: annualLaborCost,
        debtService: annualDebtService,
        total: totalOpEx
      },
      revenue: {
        annualFodderProduced,
        fodderSalePrice,
        totalAnnual: annualRevenue,
        maxCattleCapacity,
        currentHerdSize: herdSize,
        utilizationRate
      },
      profitability: {
        feedCostPerHead,
        grossProfit,
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

  // ==================== PDF EXPORT ====================
  const generatePDF = () => {
    if (!results) {
      console.error('PDF Error: No results available');
      alert('Please run calculations first before generating PDF');
      return;
    }
    
    try {
      const d = results;
      
      // Validate all required data exists
      if (!d.hpSystem) {
        console.error('PDF Error: Missing hpSystem in results');
        alert('Error: Heat pump system data missing');
        return;
      }
      if (!d.cattlePerf) {
        console.error('PDF Error: Missing cattlePerf in results');
        alert('Error: Cattle performance data missing');
        return;
      }
      
      const projectInfo = {
        name: projectName,
        date: new Date().toLocaleDateString('en-PH'),
        location: CLIMATE_DATA[location].name,
        currency: getCurrencyLabel()
      };
      
      console.log('Generating PDF with data:', {
        hpSystem: d.hpSystem.model.name,
        peakLoad: d.peakLoad,
        cattlePerf: d.cattlePerf.hydrogreen.daysToMarket
      });
    
    const proposalHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>RSRH Joint Venture Proposal - ${projectInfo.name}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; padding: 40px; max-width: 900px; margin: 0 auto; }
    .header { border-bottom: 4px solid #00695c; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; }
    h1 { color: #00695c; margin: 0; font-size: 2.2em; }
    .header-right { text-align: right; }
    .summary-box { background: #e0f2f1; border-left: 5px solid #00695c; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .summary-box h3 { color: #00695c; margin-top: 0; }
    .big-number { font-size: 2.5em; font-weight: bold; color: #00695c; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; border-bottom: 1px solid #ddd; text-align: left; }
    th { background: #f5f5f5; font-weight: 600; color: #00695c; }
    .total-row { background: #e0f2f1; font-weight: bold; border-top: 2px solid #00695c; }
    .section { margin: 40px 0; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .comparison { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; }
    .advantage { background: #d4edda; border: 1px solid #28a745; padding: 15px; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>KARNOT</h1>
      <p style="color: #666; margin: 5px 0;">Energy Solutions Inc.</p>
    </div>
    <div class="header-right">
      <p><strong>Date:</strong> ${projectInfo.date}</p>
      <p><strong>Project:</strong> ${projectInfo.name}</p>
      <p><strong>Location:</strong> ${projectInfo.location}</p>
    </div>
  </div>

  <div class="summary-box">
    <h3>Executive Summary</h3>
    <p>Joint venture proposal for HydroGreen fodder production to support RSRH Livestock Corporation's cattle finishing operations at ${projectInfo.location}.</p>
    <div class="grid-2" style="margin-top: 20px;">
      <div>
        <div style="color: #666; font-size: 0.9em;">Total Investment Required</div>
        <div class="big-number">${fmtCurrency(d.financing.totalCapEx)}</div>
      </div>
      <div>
        <div style="color: #666; font-size: 0.9em;">Annual Net Profit (After Debt Service)</div>
        <div class="big-number">${fmtCurrency(d.profitability.netProfit)}</div>
      </div>
    </div>
    <div class="grid-2" style="margin-top: 20px;">
      <div>
        <div style="color: #666; font-size: 0.9em;">Payback Period</div>
        <div style="font-size: 1.8em; font-weight: bold;">${fmt(d.profitability.paybackYears, 1)} Years</div>
      </div>
      <div>
        <div style="color: #666; font-size: 0.9em;">Annual ROI</div>
        <div style="font-size: 1.8em; font-weight: bold;">${fmt(d.profitability.annualROI, 1)}%</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Investment Breakdown</h2>
    <table>
      <thead>
        <tr><th>Item</th><th style="text-align: right;">Amount (${projectInfo.currency})</th></tr>
      </thead>
      <tbody>
        <tr><td>HydroGreen Fodder Systems (${dgsUnits} units)</td><td align="right">${fmtCurrency(d.capEx.machine)}</td></tr>
        <tr><td>Karnot R290 Heat Pumps - Reversible (${d.hpSystem.totalUnits}x ${d.hpSystem.model.name})</td><td align="right">${fmtCurrency(d.capEx.heatPumps)}</td></tr>
        <tr><td>Mechanical Ancillaries & Controls</td><td align="right">${fmtCurrency(d.capEx.ancillary)}</td></tr>
        <tr><td>Building Construction</td><td align="right">${fmtCurrency(d.capEx.building)}</td></tr>
        <tr><td>Logistics & Installation</td><td align="right">${fmtCurrency(d.capEx.logistics)}</td></tr>
        <tr class="total-row"><td><strong>TOTAL CAPITAL EXPENDITURE</strong></td><td align="right"><strong>${fmtCurrency(d.capEx.total)}</strong></td></tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Thermal Load Analysis</h2>
    <div class="grid-2">
      <div class="comparison">
        <h4 style="margin-top: 0; color: #c62828;">🔥 Heating Requirements</h4>
        <p><strong>Total Heating Load:</strong> ${fmt(d.heatLoad.totalKW_heating, 1)} kW (${fmt(d.heatLoad.totalBTUhr_heating, 0)} BTU/hr)</p>
        <p style="margin-left: 15px; font-size: 0.9em;">• Conduction Loss: ${fmt(d.heatLoad.conductionKW_heat, 1)} kW</p>
        <p style="margin-left: 15px; font-size: 0.9em;">• Ventilation Load: ${fmt(d.heatLoad.ventilationKW_heat, 1)} kW</p>
      </div>
      <div class="advantage">
        <h4 style="margin-top: 0; color: #1565c0;">❄️ Cooling Requirements</h4>
        <p><strong>Total Cooling Load:</strong> ${fmt(d.heatLoad.totalKW_cooling, 1)} kW (${fmt(d.heatLoad.totalTons_cooling, 1)} Tons)</p>
        <p style="margin-left: 15px; font-size: 0.9em;">• Sensible Load: ${fmt(d.heatLoad.sensibleBTUhr * 0.000293071, 1)} kW</p>
        <p style="margin-left: 15px; font-size: 0.9em;">• Latent Load: ${fmt(d.heatLoad.latentBTUhr * 0.000293071, 1)} kW</p>
      </div>
    </div>
    <div style="margin-top: 15px; padding: 15px; background: #e8f5e9; border-radius: 8px;">
      <p style="margin: 0;"><strong>Heat Pump System (Reversible R290):</strong> ${d.hpSystem.totalUnits}x ${d.hpSystem.model.name}</p>
      <p style="margin: 5px 0 0 0; font-size: 0.9em;">Sized for peak load: ${fmt(d.peakLoad, 1)} kW | Standard Karnot 4-unit configuration (2+2 redundancy)</p>
    </div>
    <p style="font-size: 0.9em; margin-top: 15px; color: #666;">
      <strong>Climate Control:</strong> Target conditions 70°F (21°C) @ 75% RH | 
      Fresh Air: ${fmt(d.heatLoad.freshAirCFM, 0)} CFM with heat recovery
    </p>
  </div>

  <div class="section">
    <h2>Financing Structure</h2>
    <table>
      <tbody>
        <tr><td>Total Investment</td><td align="right">${fmtCurrency(d.financing.totalCapEx)}</td></tr>
        <tr><td>Financed Amount (${financeAmount}%)</td><td align="right">${fmtCurrency(d.financing.financedAmount)}</td></tr>
        <tr><td>Equity Required (${100 - financeAmount}%)</td><td align="right">${fmtCurrency(d.financing.equityAmount)}</td></tr>
        <tr><td>Interest Rate</td><td align="right">${interestRate}% per annum</td></tr>
        <tr><td>Loan Term</td><td align="right">${loanTermYears} years</td></tr>
        <tr class="total-row"><td><strong>Annual Debt Service</strong></td><td align="right"><strong>${fmtCurrency(d.financing.annualDebtService)}</strong></td></tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Annual Operating Performance</h2>
    <table>
      <thead>
        <tr><th>Metric</th><th style="text-align: right;">Value</th></tr>
      </thead>
      <tbody>
        <tr><td>Annual Fodder Production</td><td align="right">${fmt(d.revenue.annualFodderProduced, 0)} kg</td></tr>
        <tr><td>Fodder Sale Price</td><td align="right">${fmtCurrency(d.revenue.fodderSalePrice, 2)}/kg</td></tr>
        <tr><td>Maximum Cattle Capacity</td><td align="right">${fmt(d.revenue.maxCattleCapacity, 0)} heads (at 12kg/day)</td></tr>
        <tr class="total-row"><td><strong>Gross Annual Revenue</strong></td><td align="right"><strong>${fmtCurrency(d.revenue.totalAnnual)}</strong></td></tr>
      </tbody>
    </table>
    
    <h3 style="margin-top: 30px;">Operating Costs</h3>
    <table>
      <tbody>
        <tr><td>Grain Input Costs</td><td align="right">${fmtCurrency(d.opEx.grain)}</td></tr>
        <tr><td>Electricity</td><td align="right">${fmtCurrency(d.opEx.electricity)}</td></tr>
        <tr><td>Labor & Operations</td><td align="right">${fmtCurrency(d.opEx.labor)}</td></tr>
        <tr><td>Debt Service</td><td align="right">${fmtCurrency(d.opEx.debtService)}</td></tr>
        <tr class="total-row"><td><strong>Total Operating Costs</strong></td><td align="right"><strong>${fmtCurrency(d.opEx.total)}</strong></td></tr>
        <tr style="background: #d4edda;"><td><strong>NET ANNUAL PROFIT</strong></td><td align="right"><strong>${fmtCurrency(d.profitability.netProfit)}</strong></td></tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Partnership Structure</h2>
    <div class="grid-2">
      <div class="advantage">
        <h4 style="margin-top: 0; color: #00695c;">Karnot Energy Solutions (${karnotShare}%)</h4>
        <p><strong>Provides:</strong></p>
        <ul style="font-size: 0.9em; margin-left: 20px;">
          <li>Land & Facility (Cosmos Farm, Pangasinan)</li>
          <li>HydroGreen Equipment & Technology</li>
          <li>Climate Control (Karnot HVAC)</li>
          <li>Daily Operations & Management</li>
          <li>Working Capital</li>
        </ul>
        <p><strong>Annual Share:</strong> ${fmtCurrency(d.profitability.karnotShare)}</p>
        <p><strong>${contractYears}-Year Total:</strong> ${fmtCurrency(d.profitability.karnotShare * contractYears)}</p>
      </div>
      <div class="comparison">
        <h4 style="margin-top: 0; color: #856404;">RSRH Livestock (${100 - karnotShare}%)</h4>
        <p><strong>Receives:</strong></p>
        <ul style="font-size: 0.9em; margin-left: 20px;">
          <li>Daily fresh vacuum-packed fodder</li>
          <li>Delivery to feedlots (Bulacan region)</li>
          <li>Cattle management optimization</li>
          <li><strong>NO capital investment</strong></li>
          <li><strong>20% profit from Day 1</strong></li>
        </ul>
        <p><strong>Annual Share:</strong> ${fmtCurrency(d.profitability.rsrhShare)}</p>
        <p><strong>${contractYears}-Year Total:</strong> ${fmtCurrency(d.profitability.rsrhShare * contractYears)}</p>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Cattle Performance: Traditional vs HydroGreen</h2>
    <table>
      <thead>
        <tr><th>Metric</th><th>Traditional Feed</th><th>HydroGreen Supplemented</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>Days to Market</td>
          <td>${d.cattlePerf.traditional.daysToMarket} days</td>
          <td>${d.cattlePerf.hydrogreen.daysToMarket} days</td>
        </tr>
        <tr>
          <td>Cycles per Year</td>
          <td>${d.cattlePerf.traditional.cyclesPerYear} cycles</td>
          <td>${d.cattlePerf.hydrogreen.cyclesPerYear} cycles</td>
        </tr>
        <tr>
          <td>Annual Throughput</td>
          <td>${fmt(d.cattlePerf.traditional.annualHeads)} heads</td>
          <td>${fmt(d.cattlePerf.hydrogreen.annualHeads)} heads</td>
        </tr>
        <tr class="total-row">
          <td><strong>Advantage</strong></td>
          <td colspan="2"><strong>${d.cattlePerf.hydrogreen.annualHeads - d.cattlePerf.traditional.annualHeads} MORE heads finished per year</strong></td>
        </tr>
      </tbody>
    </table>
  </div>

  <div style="margin-top: 60px; padding: 20px; background: #f5f5f5; border-radius: 8px; text-align: center;">
    <p style="margin: 0; color: #666; font-size: 0.9em;">
      This proposal is valid for 60 days from issue date.<br>
      For inquiries: Stuart Cox, CEO | stuart@karnot.energy | +63 917 123 4567
    </p>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 500);
    };
  </script>
</body>
</html>`;
    
    try {
      const win = window.open('', '_blank');
      if (!win) {
        alert('Popup blocked! Please allow popups for this site.');
        console.error('PDF Error: Popup was blocked');
        return;
      }
      
      win.document.write(proposalHTML);
      win.document.close();
      console.log('PDF generated successfully');
      
    } catch (pdfError) {
      console.error('PDF Generation Error:', pdfError);
      alert(`Error generating PDF: ${pdfError.message}\n\nPlease check console for details.`);
    }
    
    } catch (error) {
      console.error('Fatal PDF Error:', error);
      console.error('Error stack:', error.stack);
      alert(`Unable to generate PDF: ${error.message}\n\nError details logged to console.`);
    }
  };

  // ==================== HELPER FUNCTIONS ====================
  const fmt = (num, decimals = 0) => {
    if (num === null || num === undefined || isNaN(num)) return '0';
    return Number(num).toLocaleString('en-PH', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  const fmtCurrency = (numPHP) => {
    if (displayCurrency === 'USD') {
      const numUSD = numPHP / fxRate;
      return `$${fmt(numUSD, 0)}`;
    }
    return `₱${fmt(numPHP, 0)}`;
  };
  
  const getCurrencyLabel = () => {
    return displayCurrency === 'USD' ? 'USD' : 'PHP';
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
          <div className="flex gap-4 items-center flex-wrap">
            <label className="text-sm font-medium">Display Currency:</label>
            <select 
              value={displayCurrency}
              onChange={(e) => setDisplayCurrency(e.target.value)}
              className="border rounded px-3 py-1 font-bold"
            >
              <option value="PHP">Philippine Peso (₱)</option>
              <option value="USD">US Dollar ($)</option>
            </select>
            <label className="text-sm font-medium">FX Rate (USD→PHP):</label>
            <input
              type="number"
              value={fxRate}
              onChange={(e) => setFxRate(parseFloat(e.target.value))}
              className="border rounded px-3 py-1 w-20"
              step="0.01"
            />
            <button
              onClick={() => setShowConsole(!showConsole)}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700 transition"
            >
              {showConsole ? '✖ Hide' : '🐛 Debug'} Console
            </button>
          </div>
        </div>
      </div>

      {/* Console Viewer */}
      {showConsole && (
        <div className="bg-black text-green-400 rounded-lg shadow-lg p-4 font-mono text-xs max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center mb-2 border-b border-green-700 pb-2">
            <div className="text-white font-bold">📱 Debug Console ({consoleLogs.length} logs)</div>
            <button 
              onClick={() => setConsoleLogs([])}
              className="bg-red-600 text-white px-3 py-1 rounded text-xs"
            >
              Clear
            </button>
          </div>
          <div className="space-y-1">
            {consoleLogs.length === 0 ? (
              <div className="text-gray-500">No logs yet...</div>
            ) : (
              consoleLogs.slice().reverse().map((log, i) => (
                <div 
                  key={i} 
                  className={`py-1 border-b border-gray-800 ${
                    log.type === 'error' ? 'text-red-400' : 
                    log.type === 'warn' ? 'text-yellow-400' : 
                    'text-green-400'
                  }`}
                >
                  <span className="text-gray-500">[{log.time}]</span> 
                  <span className="ml-2">{log.type.toUpperCase()}:</span> 
                  <span className="ml-2 whitespace-pre-wrap">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Main Input Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        
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
            4. Cattle Performance
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
              <p className="text-xs text-gray-500 mt-1">
                Current: ₱{liveWeightPrice}/kg ≈ ${fmt(liveWeightPrice / fxRate, 2)}/kg
              </p>
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
          </div>
        </div>

        {/* Financing & Partnership */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-teal-600 mb-4 border-b-2 border-teal-200 pb-2">
            5. Financing & Deal Structure
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Finance (% of CapEx)
              </label>
              <input
                type="number"
                value={financeAmount}
                onChange={(e) => setFinanceAmount(parseFloat(e.target.value))}
                className="w-full border rounded px-3 py-2"
                min="0"
                max="100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Interest Rate (% p.a.)
              </label>
              <input
                type="number"
                value={interestRate}
                onChange={(e) => setInterestRate(parseFloat(e.target.value))}
                className="w-full border rounded px-3 py-2"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Loan Term (years)
              </label>
              <input
                type="number"
                value={loanTermYears}
                onChange={(e) => setLoanTermYears(parseInt(e.target.value))}
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
                className="w-full border rounded px-3 py-2 bg-teal-50"
                min="0"
                max="100"
                readOnly
              />
              <p className="text-xs text-gray-500 mt-1">
                RSRH gets {100 - karnotShare}% (land, operations, cattle management)
              </p>
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

          {/* Thermal Load Breakdown */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
              🌡️ Thermal Load Analysis (Per DGS 66 System)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Heating Load */}
              <div className="bg-red-50 rounded-lg p-4 border-2 border-red-200">
                <h4 className="text-lg font-bold text-red-800 mb-3 flex items-center">
                  🔥 Heating Requirements
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Total Heating Load:</span>
                    <span className="font-bold text-red-700">
                      {fmt(results.heatLoad.totalKW_heating, 1)} kW ({fmt(results.heatLoad.totalBTUhr_heating, 0)} BTU/hr)
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-red-200 pt-2">
                    <span className="text-gray-600">• Conduction Loss:</span>
                    <span className="font-semibold">{fmt(results.heatLoad.conductionKW_heat, 1)} kW</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">• Ventilation Load:</span>
                    <span className="font-semibold">{fmt(results.heatLoad.ventilationKW_heat, 1)} kW</span>
                  </div>
                </div>
              </div>

              {/* Cooling Load */}
              <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                <h4 className="text-lg font-bold text-blue-800 mb-3 flex items-center">
                  ❄️ Cooling Requirements
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Total Cooling Load:</span>
                    <span className="font-bold text-blue-700">
                      {fmt(results.heatLoad.totalKW_cooling, 1)} kW ({fmt(results.heatLoad.totalTons_cooling, 1)} Tons)
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-blue-200 pt-2">
                    <span className="text-gray-600">• Sensible Load:</span>
                    <span className="font-semibold">{fmt(results.heatLoad.sensibleBTUhr * 0.000293071, 1)} kW</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">• Latent Load (Dehumid):</span>
                    <span className="font-semibold">{fmt(results.heatLoad.latentBTUhr * 0.000293071, 1)} kW</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">• Conduction Gain:</span>
                    <span className="font-semibold">{fmt(results.heatLoad.conductionKW_cool, 1)} kW</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">• Fresh Air Ventilation:</span>
                    <span className="font-semibold">{fmt(results.heatLoad.ventilationKW_cool, 1)} kW</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Heat Pump System - Single Reversible System */}
            <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-teal-50 rounded-lg border-2 border-green-300">
              <h4 className="font-bold text-green-800 mb-3">🔄 Karnot R290 Reversible Heat Pump System:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-700">Heat Pump Configuration:</div>
                  <div className="font-bold text-green-800">{results.hpSystem.totalUnits}x {results.hpSystem.model.name}</div>
                  <div className="text-xs text-gray-600 mt-1">Standard 4-unit setup (2+2 redundancy)</div>
                </div>
                <div>
                  <div className="text-gray-700">Sized For Peak Load:</div>
                  <div className="font-bold text-green-800">{fmt(results.peakLoad, 1)} kW</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {results.heatLoad.totalKW_heating > results.heatLoad.totalKW_cooling ? 'Heating dominant' : 'Cooling dominant'}
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-green-200 text-xs text-gray-600">
                <strong>Reversible Operation:</strong> Same units handle heating in winter, cooling in summer. 
                Proprietary R290 (propane) refrigerant - PFAS-free, natural, low-GWP.
              </div>
            </div>

            {/* Additional Climate Control Info */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-bold text-gray-800 mb-2">Climate Control Details:</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Fresh Air Rate:</div>
                  <div className="font-semibold">{fmt(results.heatLoad.freshAirCFM, 0)} CFM</div>
                </div>
                <div>
                  <div className="text-gray-600">Target: 70°F / 21°C</div>
                  <div className="font-semibold">@ 75% RH</div>
                </div>
                <div>
                  <div className="text-gray-600">Humidification:</div>
                  <div className="font-semibold">{fmt(results.heatLoad.humidification_lbs_hr, 1)} lbs/hr</div>
                </div>
                <div>
                  <div className="text-gray-600">Dehumidification:</div>
                  <div className="font-semibold">{fmt(results.heatLoad.dehumidification_lbs_hr, 1)} lbs/hr</div>
                </div>
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
                      🔄 Karnot R290 Heat Pumps (Reversible)<br/>
                      <span className="text-xs text-gray-500">
                        {results.hpSystem.totalUnits}x {results.hpSystem.model.name} | 4-unit standard config
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
                <strong>Thermal Engineering:</strong> {fmt(results.heatLoad.totalKW_heating, 1)} kW Heating / {fmt(results.heatLoad.totalKW_cooling, 1)} kW Cooling<br/>
                <strong>Heat Pumps:</strong> {results.hpSystem.totalUnits}x {results.hpSystem.model.name} (Reversible, sized for {fmt(results.peakLoad, 1)} kW peak)
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
                      Gross Revenue (Fodder Sales)<br/>
                      <span className="text-xs text-gray-500 font-normal">
                        {fmt(results.revenue.annualFodderProduced, 0)} kg/year × {fmtCurrency(results.revenue.fodderSalePrice, 2)}/kg
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
              <h4 className="font-bold text-blue-800 mb-3">The HydroGreen Advantage for RSRH:</h4>
              
              <div className="space-y-3 text-sm text-blue-900">
                <div>
                  <strong className="text-blue-800">🎯 Solving the "450kg Target" Problem:</strong>
                  <ul className="list-disc ml-6 mt-1 space-y-1">
                    <li><strong>{results.cattlePerf.traditional.daysToMarket - results.cattlePerf.hydrogreen.daysToMarket} days faster</strong> to 450kg target weight</li>
                    <li>ADG maintained at <strong>1.4-1.6 kg/day</strong> even in Philippine heat (35°C)</li>
                    <li><strong>90% moisture content</strong> keeps cattle eating during heat stress when dry feed fails</li>
                    <li>Acts as digestive catalyst - improves grain/hay utilization by <strong>15-20%</strong></li>
                  </ul>
                </div>

                <div className="pt-2 border-t border-blue-200">
                  <strong className="text-blue-800">💰 Hidden Profit: Liver Health & Carcass Quality:</strong>
                  <ul className="list-disc ml-6 mt-1 space-y-1">
                    <li><strong>Dramatically reduced liver abscesses</strong> (high-grain finishing causes 30% condemnation)</li>
                    <li>Healthy liver = <strong>faster growth in critical final 30 days</strong></li>
                    <li><strong>Higher hot carcass weight (HCW)</strong> and dressing percentage</li>
                    <li><strong>Improved marbling scores</strong> = premium pricing for RSRH retail</li>
                    <li><strong>Larger ribeye area (REA)</strong> = more saleable meat per head</li>
                  </ul>
                </div>

                <div className="pt-2 border-t border-blue-200">
                  <strong className="text-blue-800">📊 RSRH Operational Benefits:</strong>
                  <ul className="list-disc ml-6 mt-1 space-y-1">
                    <li><strong>{results.cattlePerf.hydrogreen.annualHeads - results.cattlePerf.traditional.annualHeads} more heads</strong> finished per year (faster turnover)</li>
                    <li><strong>Narrower weight spreads</strong> entering slaughter = better planning</li>
                    <li><strong>Reduced trim losses</strong> and carcass downgrades</li>
                    <li><strong>Supply consistency</strong> regardless of drought/weather</li>
                    <li><strong>Better FCR</strong> = {fmt(((results.cattlePerf.traditional.feedPerHead - results.cattlePerf.hydrogreen.feedPerHead) / results.cattlePerf.traditional.feedPerHead * 100), 1)}% less feed per kg gain</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Partnership Summary */}
          <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-lg shadow-lg p-6 text-white">
            <h3 className="text-2xl font-bold mb-4">Joint Venture Partnership Structure</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <div>
                <h4 className="font-semibold text-teal-100 mb-2">Karnot Energy Solutions ({karnotShare}%)</h4>
                <div className="space-y-2 text-sm">
                  <div><strong>Provides:</strong></div>
                  <ul className="list-disc ml-4 space-y-1">
                    <li>Land & Facility (Cosmos Farm, Pangasinan)</li>
                    <li>HydroGreen Equipment & Technology</li>
                    <li>Climate Control Systems (Karnot HVAC)</li>
                    <li>Daily Operations & Production Management</li>
                    <li>Working Capital</li>
                  </ul>
                  <div className="mt-3 pt-3 border-t border-teal-400">
                    <div>Annual Share: <span className="text-2xl font-bold">{fmtCurrency(results.profitability.karnotShare)}</span></div>
                    <div>Over {contractYears} years: <span className="font-bold">{fmtCurrency(results.profitability.karnotShare * contractYears)}</span></div>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-teal-100 mb-2">RSRH Livestock Corporation ({100 - karnotShare}%)</h4>
                <div className="space-y-2 text-sm">
                  <div><strong>Receives:</strong></div>
                  <ul className="list-disc ml-4 space-y-1">
                    <li>Daily vacuum-packed fresh HydroGreen fodder</li>
                    <li>Delivery to feedlots (3-4 hour radius to Bulacan)</li>
                    <li>Cattle management & finishing optimization</li>
                    <li><strong>NO capital investment required</strong></li>
                    <li><strong>20% profit share from Day 1</strong></li>
                  </ul>
                  <div className="mt-3 pt-3 border-t border-teal-400">
                    <div>Annual Share: <span className="text-2xl font-bold">{fmtCurrency(results.profitability.rsrhShare)}</span></div>
                    <div>Over {contractYears} years: <span className="font-bold">{fmtCurrency(results.profitability.rsrhShare * contractYears)}</span></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="border-t border-teal-500 pt-4 mt-4">
              <h4 className="font-semibold text-teal-100 mb-2">Financing Structure</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-teal-200 text-xs">Total Investment</div>
                  <div className="font-bold">{fmtCurrency(results.financing.totalCapEx)}</div>
                </div>
                <div>
                  <div className="text-teal-200 text-xs">Financed ({financeAmount}%)</div>
                  <div className="font-bold">{fmtCurrency(results.financing.financedAmount)}</div>
                </div>
                <div>
                  <div className="text-teal-200 text-xs">Interest Rate</div>
                  <div className="font-bold">{interestRate}% p.a.</div>
                </div>
                <div>
                  <div className="text-teal-200 text-xs">Annual Debt Service</div>
                  <div className="font-bold">{fmtCurrency(results.financing.annualDebtService)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={generatePDF}
                className="bg-gray-700 hover:bg-gray-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                🖨️ Export PDF Proposal
              </button>
              <button
                onClick={() => window.print()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                🖨️ Print Results
              </button>
              <button
                onClick={() => setShowResults(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                ← Back to Inputs
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RSRHCalculator;
