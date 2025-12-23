import React, { useState, useMemo, useEffect } from 'react';
import { Card, Button, Input } from '../data/constants.jsx'; 
import { 
    PieChart, TrendingUp, DollarSign, Activity, 
    Briefcase, Users, Archive, ArrowRight, Calendar,
    FileText, Target, BarChart3, Globe, UserCheck, Wallet, AlertCircle
} from 'lucide-react';
import { db } from '../firebase'; 
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, orderBy } from "firebase/firestore";

const ManagementAccounts = ({ quotes = [], ledgerEntries = [], opportunities = [], user }) => {
    const [activeTab, setActiveTab] = useState('Overview');
    const [currency, setCurrency] = useState('PHP'); // PHP, GBP, USD
    
    // DATA STATES
    const [equityEntries, setEquityEntries] = useState([]);
    const [assetEntries, setAssetEntries] = useState([]);
    const [payrollEntries, setPayrollEntries] = useState([]); // NEW: Real Payroll Data
    
    // Form States
    const [newCapital, setNewCapital] = useState({ partner: '', amount: '', type: 'CASH' });
    const [newAsset, setNewAsset] = useState({ name: '', value: '', type: 'EQUIPMENT' });

    // Exchange Rates (Real-time would be better, but using typical rates)
    const FX_RATES = {
        PHP: 1,
        GBP: 0.014, // 1 PHP = ~0.014 GBP
        USD: 0.017  // 1 PHP = ~0.017 USD (58.5 PHP per USD)
    };

    // --- BUDGET DATA (FY 2026) ---
    const MONTHLY_BUDGETS_2026 = {
        'Jan': { revenue: 14786, cogs: 12615, opex: 15115 },
        'Feb': { revenue: 19353, cogs: 13676, opex: 15115 },
        'Mar': { revenue: 30379, cogs: 20170, opex: 15115 },
        'Apr': { revenue: 18024, cogs: 12966, opex: 15115 },
        'May': { revenue: 56215, cogs: 33440, opex: 15117 },
        'Jun': { revenue: 114901, cogs: 65735, opex: 15117 },
        'Jul': { revenue: 116233, cogs: 65729, opex: 16898 },
        'Aug': { revenue: 255827, cogs: 137114, opex: 16898 },
        'Sep': { revenue: 246002, cogs: 130539, opex: 16898 },
        'Oct': { revenue: 261639, cogs: 138656, opex: 17748 },
        'Nov': { revenue: 217253, cogs: 115174, opex: 17748 },
        'Dec': { revenue: 218699, cogs: 116046, opex: 17748 }
    };

    const BUDGET_2026_JAN = {
        revenue: { total: 14786 },
        directCosts: { total: 12615 },
        personnel: { total: 15115 },
        fixedAssets: { coreITServer: 17500, officeFurniture: 14462, demoUnits: 8264, total: 40226 },
        equity: { paidInCapital: 380500, retainedEarnings: -53742 }
    };

    // --- 1. FETCH DATA ---
    useEffect(() => {
        if (!user) return;
        
        // Equity
        const unsubEquity = onSnapshot(query(collection(db, "users", user.uid, "equity_log")), (snap) => {
            setEquityEntries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // Assets
        const unsubAssets = onSnapshot(query(collection(db, "users", user.uid, "asset_register")), (snap) => {
            setAssetEntries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // NEW: Fetch Payroll Log (Real Cash Disbursed)
        // This replaces the Manpower Log connection
        const unsubPayroll = onSnapshot(query(collection(db, "users", user.uid, "payroll_log"), orderBy('createdAt', 'desc')), (snap) => {
            setPayrollEntries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => { unsubEquity(); unsubAssets(); unsubPayroll(); };
    }, [user]);

    // --- 2. CALCULATE P&L (UPDATED LOGIC) ---
    const profitLoss = useMemo(() => {
        const rate = 58.5; // PHP per USD
        
        // REVENUE
        const boiRevenue = quotes
            .filter(q => ['WON', 'INVOICED', 'PAID'].includes(q.status) && q.boiActivity !== false)
            .reduce((sum, q) => {
                const quoteRate = q.costing?.forexRate || rate;
                return sum + (Number(q.finalSalesPrice) * quoteRate);
            }, 0);

        const nonBoiRevenue = 0; // TODO: Pull from future Service Invoice module
        const totalRevenue = boiRevenue + nonBoiRevenue;

        // --- EXPENSE CLASSIFICATION ENGINE ---
        
        // 1. Direct Labor (From PAYROLL, type = DIRECT)
        // This is actual salaries paid to technicians/engineers
        const directLabor = payrollEntries
            .filter(p => p.type === 'DIRECT')
            .reduce((sum, p) => sum + Number(p.amount), 0);

        // 2. Direct Materials & Project Costs (From Ledger)
        const directMaterials = ledgerEntries
            .filter(e => {
                const cat = (e.category || '').toLowerCase();
                const subCat = (e.subCategory || '').toLowerCase();
                // Check if explicitly linked to a project
                if (e.projectId && e.projectId.trim() !== '') return true;
                // Check categories
                return [
                    'cost of goods sold', 'project materials', 'direct materials', 
                    'equipment', 'import duties', 'freight', 'customs', 'logistics'
                ].some(k => cat.includes(k) || subCat.includes(k));
            })
            .reduce((sum, e) => sum + Number(e.amountPHP || 0), 0);

        const cogs = directLabor + directMaterials;

        // 3. Admin Salaries (From PAYROLL, type = ADMIN)
        // This is actual salaries paid to office staff/management
        const adminSalaries = payrollEntries
            .filter(p => p.type === 'ADMIN')
            .reduce((sum, p) => sum + Number(p.amount), 0);

        // 4. Other Operating Expenses (From Ledger)
        // Total Ledger Spend MINUS what we already counted as Direct Materials
        const totalLedgerSpend = ledgerEntries.reduce((sum, e) => sum + Number(e.amountPHP || 0), 0);
        const otherOpex = totalLedgerSpend - directMaterials;
        
        const totalOpex = otherOpex + adminSalaries;

        // Budget Variance
        const budgetRevenue = BUDGET_2026_JAN.revenue.total * rate;
        const budgetCOGS = BUDGET_2026_JAN.directCosts.total * rate;
        const budgetOpEx = BUDGET_2026_JAN.personnel.total * rate;

        return {
            // Revenue Split
            boiRevenue,
            nonBoiRevenue,
            revenue: totalRevenue,
            boiPercentage: totalRevenue > 0 ? (boiRevenue / totalRevenue) * 100 : 0,
            nonBoiPercentage: totalRevenue > 0 ? (nonBoiRevenue / totalRevenue) * 100 : 0,
            
            // P&L Lines
            directLabor,
            directMaterials,
            cogs,
            grossProfit: totalRevenue - cogs,
            
            adminSalaries,
            otherOpex,
            opex: totalOpex,
            
            netIncome: totalRevenue - cogs - totalOpex,
            margin: totalRevenue > 0 ? ((totalRevenue - cogs - totalOpex) / totalRevenue) * 100 : 0,
            
            // Budget comparison
            budgetRevenue,
            budgetCOGS,
            budgetOpEx,
            budgetNetIncome: budgetRevenue - budgetCOGS - budgetOpEx,
            revenueVariance: totalRevenue - budgetRevenue,
            cogsVariance: cogs - budgetCOGS,
            opexVariance: totalOpex - budgetOpEx,
            netIncomeVariance: (totalRevenue - cogs - totalOpex) - (budgetRevenue - budgetCOGS - budgetOpEx)
        };
    }, [quotes, ledgerEntries, payrollEntries]);

    // --- 3. CALCULATE BALANCE SHEET ---
    const balanceSheet = useMemo(() => {
        const rate = 58.5;
        
        // ASSETS
        const currentAssets_Cash = equityEntries.reduce((sum, e) => sum + Number(e.amount || 0), 0) + profitLoss.netIncome;
        
        const currentAssets_AR = quotes
            .filter(q => q.status === 'INVOICED')
            .reduce((sum, q) => sum + (Number(q.finalSalesPrice || 0) * (q.costing?.forexRate || rate)), 0);

        const fixedAssets = assetEntries.reduce((sum, a) => sum + Number(a.value || 0), 0);
        
        const totalAssets = currentAssets_Cash + currentAssets_AR + fixedAssets;

        // LIABILITIES
        const currentLiabilities = 0; // To be linked to AP module later

        // EQUITY
        const totalEquity = equityEntries.reduce((sum, e) => sum + Number(e.amount || 0), 0);
        const retainedEarnings = profitLoss.netIncome;

        // Budget comparison
        const budgetCash = 286532 * rate;
        const budgetFixedAssets = BUDGET_2026_JAN.fixedAssets.total * rate;
        const budgetEquity = BUDGET_2026_JAN.equity.paidInCapital * rate;
        const budgetRetainedEarnings = BUDGET_2026_JAN.equity.retainedEarnings * rate;

        return {
            cash: currentAssets_Cash,
            ar: currentAssets_AR,
            fixedAssets,
            totalAssets,
            liabilities: currentLiabilities,
            equity: totalEquity,
            retainedEarnings,
            // Budget
            budgetCash,
            budgetFixedAssets,
            budgetEquity,
            budgetRetainedEarnings,
            cashVariance: currentAssets_Cash - budgetCash,
            fixedAssetsVariance: fixedAssets - budgetFixedAssets,
            equityVariance: totalEquity - budgetEquity
        };
    }, [profitLoss, equityEntries, assetEntries, quotes]);

    // --- 4. CASH FLOW FORECAST ---
    const forecast = useMemo(() => {
        const pipelineInflow = opportunities.reduce((sum, opp) => {
            const prob = opp.probability || 0;
            const val = opp.estimatedValue || 0;
            return sum + (val * (prob / 100) * 58.5);
        }, 0);

        const monthlyBurn = profitLoss.opex / 12; // Averaged over year for forecast
        
        return {
            currentCash: balanceSheet.cash,
            pipelineInflow,
            monthlyBurn,
            runway: monthlyBurn > 0 ? (balanceSheet.cash / monthlyBurn).toFixed(1) : '∞',
            budgetedBurn: (BUDGET_2026_JAN.personnel.total + BUDGET_2026_JAN.directCosts.total) * 58.5 / 12
        };
    }, [balanceSheet, opportunities, profitLoss]);

    // --- CURRENCY CONVERSION ---
    const convertCurrency = (phpAmount) => {
        const amount = phpAmount * FX_RATES[currency];
        return amount;
    };

    const formatMoney = (phpAmount) => {
        const amount = convertCurrency(phpAmount);
        const symbols = { PHP: '₱', GBP: '£', USD: '$' };
        const decimals = currency === 'PHP' ? 2 : 2;
        
        return `${symbols[currency]}${Math.abs(amount).toLocaleString(undefined, {
            minimumFractionDigits: decimals, 
            maximumFractionDigits: decimals
        })}`;
    };

    const formatPercentage = (value) => {
        return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
    };

    // --- HANDLERS ---
    const handleAddCapital = async () => {
        if (!newCapital.partner || !newCapital.amount) return;
        await addDoc(collection(db, "users", user.uid, "equity_log"), {
            ...newCapital, 
            createdAt: serverTimestamp()
        });
        setNewCapital({ partner: '', amount: '', type: 'CASH' });
    };

    const handleAddAsset = async () => {
        if (!newAsset.name || !newAsset.value) return;
        await addDoc(collection(db, "users", user.uid, "asset_register"), {
            ...newAsset, 
            createdAt: serverTimestamp()
        });
        setNewAsset({ name: '', value: '', type: 'EQUIPMENT' });
    };

    // --- VARIANCE INDICATOR COMPONENT ---
    const VarianceIndicator = ({ actual, budget, inverse = false }) => {
        const variance = actual - budget;
        const percentVar = budget !== 0 ? (variance / budget) * 100 : 0;
        const isGood = inverse ? variance < 0 : variance > 0;
        
        return (
            <div className={`text-xs font-bold ${isGood ? 'text-green-600' : 'text-red-600'}`}>
                {variance >= 0 ? '+' : ''}{formatMoney(variance)}
                <span className="ml-1 text-[10px]">({percentVar >= 0 ? '+' : ''}{percentVar.toFixed(1)}%)</span>
            </div>
        );
    };

    return (
        <div className="pb-20 space-y-8">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-[30px] shadow-sm border border-gray-100 gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
                        <Activity size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Management Accounts</h1>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                            BIR-Compliant Financial Reporting • BOI-SIPP Registered • FYE: Dec 31
                        </p>
                    </div>
                </div>
                
                {/* CURRENCY TOGGLE + TAB NAVIGATION */}
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    {/* Currency Selector */}
                    <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl border border-gray-200">
                        <Globe size={14} className="text-gray-400 ml-2" />
                        {['PHP', 'GBP', 'USD'].map(curr => (
                            <button 
                                key={curr}
                                onClick={() => setCurrency(curr)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                                    currency === curr 
                                        ? 'bg-white text-indigo-600 shadow-sm' 
                                        : 'text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                {curr}
                            </button>
                        ))}
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex gap-2 bg-gray-50 p-1 rounded-xl border border-gray-200 overflow-x-auto">
                        {['Overview', 'Payroll Summary', 'Monthly Breakdown', 'Budget vs Actual', 'Balance Sheet', 'BIR Report', 'Funding & Assets'].map(tab => (
                            <button 
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                                    activeTab === tab 
                                        ? 'bg-white text-indigo-600 shadow-sm' 
                                        : 'text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* EXCHANGE RATE NOTICE */}
            {currency !== 'PHP' && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
                    <span className="font-bold">FX Rates:</span> 1 USD = ₱58.50 • 1 GBP = ₱72.00 • 
                    <span className="ml-2 text-blue-500">Displaying in {currency} for reference only. BIR reports use PHP.</span>
                </div>
            )}

            {/* TAB CONTENT */}
            
            {/* 1. OVERVIEW (P&L + FORECAST) */}
            {activeTab === 'Overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* PROFIT & LOSS CARD */}
                    <Card className="p-6 border-t-4 border-indigo-500 shadow-lg">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-black text-indigo-800 uppercase tracking-widest text-xs">
                                Profit & Loss Statement (YTD)
                            </h3>
                            <PieChart className="text-indigo-200" size={20}/>
                        </div>
                        
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500 font-medium">Total Revenue</span>
                                <span className="font-black text-gray-800">{formatMoney(profitLoss.revenue)}</span>
                            </div>
                            
                            {/* NEW: DIRECT LABOR FROM PAYROLL */}
                            <div className="flex justify-between">
                                <span className="text-gray-500 font-medium">Direct Labor (Payroll)</span>
                                <span className="font-bold text-red-400">({formatMoney(profitLoss.directLabor)})</span>
                            </div>
                            
                            <div className="flex justify-between">
                                <span className="text-gray-500 font-medium">Direct Materials & Projects</span>
                                <span className="font-bold text-red-400">({formatMoney(profitLoss.directMaterials)})</span>
                            </div>
                            <div className="border-t border-gray-100 my-2 pt-2 flex justify-between">
                                <span className="text-gray-600 font-bold">Gross Profit</span>
                                <span className="font-black text-gray-800">{formatMoney(profitLoss.grossProfit)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-400">
                                <span>Gross Margin</span>
                                <span className="font-bold">
                                    {profitLoss.revenue > 0 
                                        ? ((profitLoss.grossProfit / profitLoss.revenue) * 100).toFixed(1) 
                                        : '0.0'}%
                                </span>
                            </div>
                            
                            {/* NEW: ADMIN SALARIES FROM PAYROLL */}
                            <div className="flex justify-between mt-4">
                                <span className="text-gray-500 font-medium">Admin & Staff Salaries</span>
                                <span className="font-bold text-red-400">({formatMoney(profitLoss.adminSalaries)})</span>
                            </div>
                            
                            <div className="flex justify-between">
                                <span className="text-gray-500 font-medium">Other Operating Expenses</span>
                                <span className="font-bold text-red-400">({formatMoney(profitLoss.otherOpex)})</span>
                            </div>
                            
                            <div className="mt-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                                <div className="flex justify-between items-center">
                                    <span className="font-black text-indigo-700 uppercase text-xs">Net Income (Loss)</span>
                                    <span className={`text-xl font-black ${profitLoss.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatMoney(profitLoss.netIncome)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center mt-2 pt-2 border-t border-indigo-200">
                                    <span className="text-[10px] text-indigo-600 font-bold uppercase">Net Margin</span>
                                    <span className={`text-sm font-black ${profitLoss.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatPercentage(profitLoss.margin)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* CASH FLOW FORECAST */}
                    <Card className="p-6 border-t-4 border-emerald-500 shadow-lg">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-black text-emerald-800 uppercase tracking-widest text-xs">Cash Flow Forecast</h3>
                            <TrendingUp className="text-emerald-200" size={20}/>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="p-4 bg-gray-50 rounded-xl text-center">
                                <p className="text-[10px] uppercase font-bold text-gray-400">Current Cash</p>
                                <p className="text-lg font-black text-gray-800">{formatMoney(forecast.currentCash)}</p>
                            </div>
                            <div className="p-4 bg-emerald-50 rounded-xl text-center">
                                <p className="text-[10px] uppercase font-bold text-emerald-600">Weighted Pipeline</p>
                                <p className="text-lg font-black text-emerald-700">+{formatMoney(forecast.pipelineInflow)}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-50 rounded-lg text-red-500"><Activity size={16}/></div>
                                <div className="flex-1">
                                    <p className="text-xs font-bold text-gray-600">Monthly Burn Rate (Actual)</p>
                                    <p className="text-[10px] text-gray-400">Including Payroll</p>
                                </div>
                                <span className="font-black text-red-600">{formatMoney(forecast.monthlyBurn)}</span>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 rounded-lg text-blue-500"><TrendingUp size={16}/></div>
                                <div className="flex-1">
                                    <p className="text-xs font-bold text-gray-600">Estimated Runway</p>
                                    <p className="text-[10px] text-gray-400">Months of cash remaining</p>
                                </div>
                                <span className="font-black text-blue-600 text-lg">{forecast.runway} Mo.</span>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* 2. PAYROLL SUMMARY (NEW TAB) */}
            {activeTab === 'Payroll Summary' && (
                <Card className="p-6 border-0 shadow-xl">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                            <UserCheck className="text-blue-600" />
                            <h3 className="font-black text-gray-800 uppercase tracking-widest text-sm">Payroll Disbursement Log</h3>
                        </div>
                        <div className="bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
                            <span className="text-[10px] font-bold text-blue-600 uppercase">
                                Total Paid: {formatMoney(profitLoss.directLabor + profitLoss.adminSalaries)}
                            </span>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-gray-50 border-b font-black text-gray-500 uppercase">
                                <tr>
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Staff Name</th>
                                    <th className="p-4">Role</th>
                                    <th className="p-4">Classification</th>
                                    <th className="p-4 text-right">Amount</th>
                                    <th className="p-4 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {payrollEntries.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="p-8 text-center text-gray-400 italic">
                                            No payroll entries found. Go to Payroll Manager to process salaries.
                                        </td>
                                    </tr>
                                )}
                                {payrollEntries.map(p => (
                                    <tr key={p.id}>
                                        <td className="p-4 text-gray-500">{new Date(p.date).toLocaleDateString()}</td>
                                        <td className="p-4 font-bold text-gray-800">{p.staffName}</td>
                                        <td className="p-4 text-gray-600">{p.role}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${
                                                p.type === 'DIRECT' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                                            }`}>
                                                {p.type === 'DIRECT' ? 'Direct Labor' : 'Admin Staff'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right font-mono font-bold text-gray-800">{formatMoney(p.amount)}</td>
                                        <td className="p-4 text-center">
                                            <span className="text-green-600 font-bold flex items-center justify-center gap-1">
                                                <UserCheck size={12} /> Paid
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="mt-6 p-4 bg-gray-50 border border-gray-100 rounded-xl flex items-start gap-3">
                        <AlertCircle className="text-gray-400 mt-0.5" size={16} />
                        <p className="text-xs text-gray-500">
                            <strong>Note:</strong> This is a read-only view of processed payroll. To add new salary payments, calculate tax withholding, or manage employees, please use the dedicated <strong>Payroll Manager</strong> module.
                        </p>
                    </div>
                </Card>
            )}

            {/* 3. MONTHLY BREAKDOWN */}
            {activeTab === 'Monthly Breakdown' && (
                <div className="space-y-6">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-black text-blue-800 text-sm uppercase">Financial Year 2026</h3>
                                <p className="text-xs text-blue-600 mt-1">Monthly Performance Tracking • Jan - Dec 2026</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-blue-600 font-bold">Current Month</p>
                                <p className="text-lg font-black text-blue-800">{new Date().toLocaleString('default', { month: 'short' })} 2026</p>
                            </div>
                        </div>
                    </div>

                    {/* Monthly Comparison Table */}
                    <Card className="p-6 border-0 shadow-xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b-2 border-gray-200">
                                        <th className="text-left py-3 px-2 font-black text-gray-600 uppercase">Month</th>
                                        <th className="text-right py-3 px-2 font-black text-gray-600 uppercase" colSpan="2">Revenue</th>
                                        <th className="text-right py-3 px-2 font-black text-gray-600 uppercase" colSpan="2">COGS</th>
                                        <th className="text-right py-3 px-2 font-black text-gray-600 uppercase" colSpan="2">OpEx</th>
                                        <th className="text-right py-3 px-2 font-black text-gray-600 uppercase" colSpan="2">Net Income</th>
                                    </tr>
                                    <tr className="border-b border-gray-100 bg-gray-50 text-[10px]">
                                        <th className="py-2 px-2"></th>
                                        <th className="text-right py-2 px-2 text-blue-600 font-bold">Budget</th>
                                        <th className="text-right py-2 px-2 text-green-600 font-bold">Actual</th>
                                        <th className="text-right py-2 px-2 text-blue-600 font-bold">Budget</th>
                                        <th className="text-right py-2 px-2 text-red-600 font-bold">Actual</th>
                                        <th className="text-right py-2 px-2 text-blue-600 font-bold">Budget</th>
                                        <th className="text-right py-2 px-2 text-red-600 font-bold">Actual</th>
                                        <th className="text-right py-2 px-2 text-blue-600 font-bold">Budget</th>
                                        <th className="text-right py-2 px-2 text-green-600 font-bold">Actual</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {Object.entries(MONTHLY_BUDGETS_2026).map(([month, budget]) => {
                                        // Placeholder for monthly filtering logic (will be activated with Bank Reconciliation)
                                        const monthlyRevenue = 0; 
                                        const monthlyCOGS = 0;    
                                        const monthlyOpEx = 0;    
                                        const budgetNetIncome = (budget.revenue - budget.cogs - budget.opex) * 58.5;
                                        const actualNetIncome = (monthlyRevenue - monthlyCOGS - monthlyOpEx);
                                        
                                        return (
                                            <tr key={month} className="hover:bg-gray-50">
                                                <td className="py-3 px-2 font-bold text-gray-700">{month} 2026</td>
                                                
                                                {/* Revenue */}
                                                <td className="text-right py-3 px-2 text-blue-600 font-mono text-[11px]">
                                                    {formatMoney(budget.revenue * 58.5)}
                                                </td>
                                                <td className="text-right py-3 px-2 text-gray-800 font-mono font-bold">
                                                    {monthlyRevenue > 0 ? formatMoney(monthlyRevenue) : <span className="text-gray-300">—</span>}
                                                </td>
                                                
                                                {/* COGS */}
                                                <td className="text-right py-3 px-2 text-blue-600 font-mono text-[11px]">
                                                    {formatMoney(budget.cogs * 58.5)}
                                                </td>
                                                <td className="text-right py-3 px-2 text-gray-800 font-mono font-bold">
                                                    {monthlyCOGS > 0 ? formatMoney(monthlyCOGS) : <span className="text-gray-300">—</span>}
                                                </td>
                                                
                                                {/* OpEx */}
                                                <td className="text-right py-3 px-2 text-blue-600 font-mono text-[11px]">
                                                    {formatMoney(budget.opex * 58.5)}
                                                </td>
                                                <td className="text-right py-3 px-2 text-gray-800 font-mono font-bold">
                                                    {monthlyOpEx > 0 ? formatMoney(monthlyOpEx) : <span className="text-gray-300">—</span>}
                                                </td>
                                                
                                                {/* Net Income */}
                                                <td className="text-right py-3 px-2 text-blue-600 font-mono text-[11px]">
                                                    {formatMoney(budgetNetIncome)}
                                                </td>
                                                <td className="text-right py-3 px-2 font-mono font-bold">
                                                    {actualNetIncome !== 0 ? (
                                                        <span className={actualNetIncome >= 0 ? 'text-green-600' : 'text-red-600'}>
                                                            {formatMoney(actualNetIncome)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-300">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    
                                    {/* TOTALS ROW */}
                                    <tr className="bg-gray-100 font-black border-t-2 border-gray-300">
                                        <td className="py-3 px-2 text-gray-800 uppercase">FY 2026 Total</td>
                                        <td className="text-right py-3 px-2 text-blue-700">
                                            {formatMoney(Object.values(MONTHLY_BUDGETS_2026).reduce((sum, m) => sum + m.revenue, 0) * 58.5)}
                                        </td>
                                        <td className="text-right py-3 px-2 text-green-700">
                                            {formatMoney(profitLoss.revenue)}
                                        </td>
                                        <td className="text-right py-3 px-2 text-blue-700">
                                            {formatMoney(Object.values(MONTHLY_BUDGETS_2026).reduce((sum, m) => sum + m.cogs, 0) * 58.5)}
                                        </td>
                                        <td className="text-right py-3 px-2 text-red-700">
                                            {formatMoney(profitLoss.cogs)}
                                        </td>
                                        <td className="text-right py-3 px-2 text-blue-700">
                                            {formatMoney(Object.values(MONTHLY_BUDGETS_2026).reduce((sum, m) => sum + m.opex, 0) * 58.5)}
                                        </td>
                                        <td className="text-right py-3 px-2 text-red-700">
                                            {formatMoney(profitLoss.opex)}
                                        </td>
                                        <td className="text-right py-3 px-2 text-blue-700">
                                            {formatMoney(
                                                (Object.values(MONTHLY_BUDGETS_2026).reduce((sum, m) => sum + m.revenue - m.cogs - m.opex, 0)) * 58.5
                                            )}
                                        </td>
                                        <td className="text-right py-3 px-2">
                                            <span className={profitLoss.netIncome >= 0 ? 'text-green-700' : 'text-red-700'}>
                                                {formatMoney(profitLoss.netIncome)}
                                            </span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    {/* Integration Notice */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <Calendar className="text-yellow-600 mt-0.5" size={20} />
                            <div>
                                <h4 className="font-black text-yellow-800 text-xs uppercase mb-1">Bank Transaction Integration Ready</h4>
                                <p className="text-xs text-yellow-700">
                                    Monthly actuals will automatically populate once you start reconciling bank transactions 
                                    in the <span className="font-bold">Bank Reconciliation</span> module. Transactions will be 
                                    categorized by month to show real performance against your FY 2026 budget.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 4. BUDGET VS ACTUAL */}
            {activeTab === 'Budget vs Actual' && (
                <div className="space-y-6">
                    {/* REVENUE COMPARISON */}
                    <Card className="p-6 border-l-4 border-blue-500">
                        <div className="flex items-center gap-2 mb-4">
                            <BarChart3 className="text-blue-500" size={20} />
                            <h3 className="font-black text-gray-700 uppercase text-xs tracking-widest">Revenue Analysis</h3>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="text-left py-2 text-xs font-black text-gray-500 uppercase">Line Item</th>
                                        <th className="text-right py-2 text-xs font-black text-gray-500 uppercase">Budget</th>
                                        <th className="text-right py-2 text-xs font-black text-gray-500 uppercase">Actual</th>
                                        <th className="text-right py-2 text-xs font-black text-gray-500 uppercase">Variance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b border-gray-50">
                                        <td className="py-3 font-medium text-gray-700">Total Revenue</td>
                                        <td className="text-right font-bold text-gray-600">{formatMoney(profitLoss.budgetRevenue)}</td>
                                        <td className="text-right font-black text-gray-800">{formatMoney(profitLoss.revenue)}</td>
                                        <td className="text-right">
                                            <VarianceIndicator actual={profitLoss.revenue} budget={profitLoss.budgetRevenue} />
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    {/* EXPENSE COMPARISON */}
                    <Card className="p-6 border-l-4 border-red-500">
                        <div className="flex items-center gap-2 mb-4">
                            <FileText className="text-red-500" size={20} />
                            <h3 className="font-black text-gray-700 uppercase text-xs tracking-widest">Expense Analysis</h3>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="text-left py-2 text-xs font-black text-gray-500 uppercase">Line Item</th>
                                        <th className="text-right py-2 text-xs font-black text-gray-500 uppercase">Budget</th>
                                        <th className="text-right py-2 text-xs font-black text-gray-500 uppercase">Actual</th>
                                        <th className="text-right py-2 text-xs font-black text-gray-500 uppercase">Variance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b border-gray-50">
                                        <td className="py-3 font-medium text-gray-700">Cost of Goods Sold (Direct Cost)</td>
                                        <td className="text-right font-bold text-gray-600">{formatMoney(profitLoss.budgetCOGS)}</td>
                                        <td className="text-right font-black text-gray-800">{formatMoney(profitLoss.cogs)}</td>
                                        <td className="text-right">
                                            <VarianceIndicator actual={profitLoss.cogs} budget={profitLoss.budgetCOGS} inverse />
                                        </td>
                                    </tr>
                                    <tr className="border-b border-gray-50">
                                        <td className="py-3 font-medium text-gray-700">Operating Expenses</td>
                                        <td className="text-right font-bold text-gray-600">{formatMoney(profitLoss.budgetOpEx)}</td>
                                        <td className="text-right font-black text-gray-800">{formatMoney(profitLoss.opex)}</td>
                                        <td className="text-right">
                                            <VarianceIndicator actual={profitLoss.opex} budget={profitLoss.budgetOpEx} inverse />
                                        </td>
                                    </tr>
                                    <tr className="bg-gray-50 font-bold">
                                        <td className="py-3 text-gray-800">Net Income</td>
                                        <td className="text-right text-gray-700">{formatMoney(profitLoss.budgetNetIncome)}</td>
                                        <td className="text-right text-gray-900">{formatMoney(profitLoss.netIncome)}</td>
                                        <td className="text-right">
                                            <VarianceIndicator actual={profitLoss.netIncome} budget={profitLoss.budgetNetIncome} />
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    {/* PERFORMANCE SUMMARY */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="p-4 bg-gradient-to-br from-blue-50 to-white">
                            <p className="text-xs text-blue-600 font-bold uppercase mb-1">Revenue Performance</p>
                            <p className="text-2xl font-black text-blue-700">
                                {profitLoss.budgetRevenue > 0 
                                    ? ((profitLoss.revenue / profitLoss.budgetRevenue) * 100).toFixed(1) 
                                    : '0.0'}%
                            </p>
                            <p className="text-[10px] text-gray-500 mt-1">of budget achieved</p>
                        </Card>
                        
                        <Card className="p-4 bg-gradient-to-br from-green-50 to-white">
                            <p className="text-xs text-green-600 font-bold uppercase mb-1">Cost Control</p>
                            <p className="text-2xl font-black text-green-700">
                                {profitLoss.budgetCOGS > 0 
                                    ? ((profitLoss.cogs / profitLoss.budgetCOGS) * 100).toFixed(1) 
                                    : '0.0'}%
                            </p>
                            <p className="text-[10px] text-gray-500 mt-1">vs. budgeted COGS</p>
                        </Card>
                        
                        <Card className="p-4 bg-gradient-to-br from-purple-50 to-white">
                            <p className="text-xs text-purple-600 font-bold uppercase mb-1">Bottom Line</p>
                            <p className={`text-2xl font-black ${profitLoss.netIncomeVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {profitLoss.netIncomeVariance >= 0 ? '+' : ''}{formatMoney(profitLoss.netIncomeVariance)}
                            </p>
                            <p className="text-[10px] text-gray-500 mt-1">vs. budget</p>
                        </Card>
                    </div>
                </div>
            )}

            {/* 5. BALANCE SHEET */}
            {activeTab === 'Balance Sheet' && (
                <Card className="p-8 shadow-xl max-w-4xl mx-auto border-0">
                    <div className="text-center mb-8">
                        <h2 className="text-xl font-black text-gray-800 uppercase tracking-widest">Statement of Financial Position</h2>
                        <p className="text-xs text-gray-400 font-bold">As of {new Date().toLocaleDateString('en-PH')} • BIR Format</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        {/* ASSETS */}
                        <div>
                            <h3 className="border-b-2 border-green-500 pb-2 mb-4 font-black text-green-700 uppercase text-xs tracking-widest">Assets</h3>
                            <div className="space-y-3 text-sm">
                                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Current Assets</p>
                                <div className="flex justify-between pl-3">
                                    <span className="text-gray-600">Cash & Cash Equivalents</span>
                                    <span className="font-bold">{formatMoney(balanceSheet.cash)}</span>
                                </div>
                                <div className="flex justify-between pl-3">
                                    <span className="text-gray-600">Accounts Receivable - Trade</span>
                                    <span className="font-bold">{formatMoney(balanceSheet.ar)}</span>
                                </div>
                                <div className="flex justify-between border-t border-gray-100 pt-2 mt-2">
                                    <span className="text-gray-700 font-medium">Total Current Assets</span>
                                    <span className="font-bold">{formatMoney(balanceSheet.cash + balanceSheet.ar)}</span>
                                </div>
                                
                                <p className="text-xs font-bold text-gray-500 uppercase mt-4 mb-2">Non-Current Assets</p>
                                <div className="flex justify-between pl-3">
                                    <span className="text-gray-600">Property, Plant & Equipment</span>
                                    <span className="font-bold">{formatMoney(balanceSheet.fixedAssets)}</span>
                                </div>
                                <div className="flex justify-between border-t border-gray-100 pt-2 mt-2">
                                    <span className="text-gray-700 font-medium">Total Non-Current Assets</span>
                                    <span className="font-bold">{formatMoney(balanceSheet.fixedAssets)}</span>
                                </div>
                                
                                <div className="border-t-2 border-green-500 pt-3 mt-4 flex justify-between text-lg">
                                    <span className="font-black text-gray-800">TOTAL ASSETS</span>
                                    <span className="font-black text-green-600">{formatMoney(balanceSheet.totalAssets)}</span>
                                </div>
                            </div>
                        </div>

                        {/* LIABILITIES & EQUITY */}
                        <div>
                            <h3 className="border-b-2 border-red-500 pb-2 mb-4 font-black text-red-700 uppercase text-xs tracking-widest">Liabilities & Equity</h3>
                            <div className="space-y-3 text-sm">
                                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Current Liabilities</p>
                                <div className="flex justify-between pl-3">
                                    <span className="text-gray-600">Accounts Payable - Trade</span>
                                    <span className="font-bold">{formatMoney(balanceSheet.liabilities)}</span>
                                </div>
                                <div className="flex justify-between border-t border-gray-100 pt-2 mt-2">
                                    <span className="text-gray-700 font-medium">Total Current Liabilities</span>
                                    <span className="font-bold">{formatMoney(balanceSheet.liabilities)}</span>
                                </div>
                                
                                <p className="text-xs font-bold text-gray-500 uppercase mt-4 mb-2">Equity</p>
                                <div className="flex justify-between pl-3">
                                    <span className="text-gray-600">Capital Stock - Common</span>
                                    <span className="font-bold">{formatMoney(balanceSheet.equity)}</span>
                                </div>
                                <div className="flex justify-between pl-3">
                                    <span className="text-gray-600">Retained Earnings (Deficit)</span>
                                    <span className={`font-bold ${balanceSheet.retainedEarnings >= 0 ? 'text-gray-800' : 'text-red-500'}`}>
                                        {formatMoney(balanceSheet.retainedEarnings)}
                                    </span>
                                </div>
                                <div className="flex justify-between border-t border-gray-100 pt-2 mt-2">
                                    <span className="text-gray-700 font-medium">Total Equity</span>
                                    <span className="font-bold">
                                        {formatMoney(balanceSheet.equity + balanceSheet.retainedEarnings)}
                                    </span>
                                </div>
                                
                                <div className="border-t-2 border-red-500 pt-3 mt-4 flex justify-between text-lg">
                                    <span className="font-black text-gray-800">TOTAL L & E</span>
                                    <span className="font-black text-red-600">
                                        {formatMoney(balanceSheet.liabilities + balanceSheet.equity + balanceSheet.retainedEarnings)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Balance Check */}
                    <div className="mt-8 p-4 bg-gray-50 rounded-xl text-center">
                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Balance Verification</p>
                        <p className={`text-sm font-black ${
                            Math.abs(balanceSheet.totalAssets - (balanceSheet.liabilities + balanceSheet.equity + balanceSheet.retainedEarnings)) < 1 
                                ? 'text-green-600' 
                                : 'text-red-600'
                        }`}>
                            {Math.abs(balanceSheet.totalAssets - (balanceSheet.liabilities + balanceSheet.equity + balanceSheet.retainedEarnings)) < 1 
                                ? '✓ Balanced' 
                                : '✗ Out of Balance'}
                        </p>
                    </div>
                </Card>
            )}

            {/* 6. BIR REPORT FORMAT */}
            {activeTab === 'BIR Report' && (
                <Card className="p-8 max-w-5xl mx-auto bg-white border-2 border-gray-300">
                    <div className="text-center mb-8 pb-6 border-b-2 border-gray-800">
                        <p className="text-xs text-gray-600 uppercase tracking-widest mb-2">BUREAU OF INTERNAL REVENUE</p>
                        <h2 className="text-lg font-black text-gray-900 uppercase tracking-wide">KARNOT ENERGY SOLUTIONS INC.</h2>
                        <p className="text-sm text-gray-700 mt-1">BOI-Registered Enterprise (SIPP)</p>
                        <p className="text-xs text-gray-500">Strategic Investment Priority Plan • Renewable Energy / Energy Efficiency Technologies</p>
                        <p className="text-xs text-gray-500 mt-2">Statement of Comprehensive Income</p>
                        <p className="text-xs text-gray-500">For the Period: January 1, {new Date().getFullYear()} to {new Date().toLocaleDateString('en-PH')}</p>
                        <p className="text-xs text-gray-400 mt-1 italic">(Amounts in Philippine Pesos)</p>
                    </div>

                    <div className="space-y-6">
                        {/* REVENUE SECTION */}
                        <div>
                            <h3 className="font-bold text-gray-800 uppercase text-xs mb-3 border-b border-gray-300 pb-1">I. REVENUE</h3>
                            <div className="pl-4 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-700">Sales - BOI Registered Activity</span>
                                    <span className="font-mono">{formatMoney(profitLoss.boiRevenue)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-700">Sales - Non-BOI Activity</span>
                                    <span className="font-mono">{formatMoney(profitLoss.nonBoiRevenue)}</span>
                                </div>
                                <div className="flex justify-between border-t border-gray-200 pt-2 font-bold">
                                    <span className="text-gray-800">TOTAL REVENUE</span>
                                    <span className="font-mono">{formatMoney(profitLoss.revenue)}</span>
                                </div>
                            </div>
                        </div>

                        {/* COST OF SALES */}
                        <div>
                            <h3 className="font-bold text-gray-800 uppercase text-xs mb-3 border-b border-gray-300 pb-1">II. COST OF SALES</h3>
                            <div className="pl-4 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-700">Direct Materials & Projects</span>
                                    <span className="font-mono">({formatMoney(profitLoss.directMaterials)})</span>
                                </div>
                                {/* NEW: DIRECT LABOR FROM PAYROLL */}
                                <div className="flex justify-between">
                                    <span className="text-gray-700">Direct Labor (Payroll)</span>
                                    <span className="font-mono">({formatMoney(profitLoss.directLabor)})</span>
                                </div>
                                <div className="flex justify-between border-t border-gray-200 pt-2 font-bold">
                                    <span className="text-gray-800">GROSS PROFIT</span>
                                    <span className="font-mono">{formatMoney(profitLoss.grossProfit)}</span>
                                </div>
                            </div>
                        </div>

                        {/* OPERATING EXPENSES */}
                        <div>
                            <h3 className="font-bold text-gray-800 uppercase text-xs mb-3 border-b border-gray-300 pb-1">III. OPERATING EXPENSES</h3>
                            <div className="pl-4 space-y-2 text-sm">
                                {/* NEW: ADMIN SALARIES */}
                                <div className="flex justify-between">
                                    <span className="text-gray-700">Admin & Staff Salaries</span>
                                    <span className="font-mono">({formatMoney(profitLoss.adminSalaries)})</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-700">General Admin Expenses</span>
                                    <span className="font-mono">({formatMoney(profitLoss.otherOpex)})</span>
                                </div>
                                <div className="flex justify-between border-t border-gray-200 pt-2 font-bold">
                                    <span className="text-gray-800">TOTAL OPERATING EXPENSES</span>
                                    <span className="font-mono">({formatMoney(profitLoss.opex)})</span>
                                </div>
                            </div>
                        </div>

                        {/* NET INCOME */}
                        <div className="pt-4 border-t-2 border-gray-800">
                            <div className="flex justify-between text-base font-black">
                                <span className="text-gray-900 uppercase">NET INCOME (LOSS) BEFORE TAX</span>
                                <span className={`font-mono ${profitLoss.netIncome >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                    {formatMoney(profitLoss.netIncome)}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm mt-2">
                                <span className="text-gray-600">Less: Income Tax Expense (BOI ITH @ 0% / 5% GIE post-ITH)</span>
                                <span className="font-mono text-gray-700">({formatMoney(profitLoss.netIncome * 0.00)})</span>
                            </div>
                            <div className="flex justify-between text-base font-black mt-3 pt-3 border-t border-gray-400">
                                <span className="text-gray-900 uppercase">NET INCOME (LOSS) AFTER TAX</span>
                                <span className={`font-mono ${profitLoss.netIncome >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                    {formatMoney(profitLoss.netIncome * 1.00)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* BOI INCENTIVES INFORMATION */}
                    <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="text-xs font-black text-blue-800 uppercase mb-2">BOI-SIPP Registered Incentives</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-blue-700">
                            <div>
                                <p className="font-bold">• Income Tax Holiday (ITH):</p>
                                <p className="pl-4 text-blue-600">0% income tax during ITH period</p>
                            </div>
                            <div>
                                <p className="font-bold">• Post-ITH Tax Rate:</p>
                                <p className="pl-4 text-blue-600">5% Gross Income Earned (GIE)</p>
                            </div>
                            <div>
                                <p className="font-bold">• VAT Zero-Rating:</p>
                                <p className="pl-4 text-blue-600">On capital equipment & local purchases</p>
                            </div>
                            <div>
                                <p className="font-bold">• Duty-Free Imports:</p>
                                <p className="pl-4 text-blue-600">Core technology systems & equipment</p>
                            </div>
                        </div>
                        <p className="text-[10px] text-blue-500 mt-2 italic">
                            SIPP Tier: A.1.3 – Renewable Energy / Energy Efficiency Technologies
                        </p>
                    </div>

                    {/* CERTIFICATION */}
                    <div className="mt-12 pt-6 border-t border-gray-300 text-xs text-gray-600">
                        <p className="mb-4 italic">I hereby certify that the foregoing statement is true and correct to the best of my knowledge and belief.</p>
                        <div className="grid grid-cols-2 gap-8 mt-8">
                            <div>
                                <div className="border-t border-gray-400 pt-2 mt-12">
                                    <p className="font-bold text-gray-800">LENILIA COX</p>
                                    <p className="text-gray-600">Chief Financial Officer</p>
                                </div>
                            </div>
                            <div>
                                <div className="border-t border-gray-400 pt-2 mt-12">
                                    <p className="font-bold text-gray-800">STUART E. COX</p>
                                    <p className="text-gray-600">Chief Executive Officer</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {/* 7. FUNDING & ASSETS MANAGER */}
            {activeTab === 'Funding & Assets' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* EQUITY LOG */}
                    <Card className="p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <Users className="text-blue-500"/>
                            <h3 className="font-black text-gray-700 uppercase text-xs tracking-widest">Shareholder Capital Contributions</h3>
                        </div>
                        
                        <div className="flex gap-2 mb-4">
                            <Input 
                                placeholder="Partner Name (e.g. Stuart Cox)" 
                                value={newCapital.partner} 
                                onChange={e => setNewCapital({...newCapital, partner: e.target.value})} 
                            />
                            <Input 
                                type="number" 
                                placeholder="Amount (PHP)" 
                                value={newCapital.amount} 
                                onChange={e => setNewCapital({...newCapital, amount: e.target.value})} 
                            />
                            <Button onClick={handleAddCapital} size="sm" variant="primary"><ArrowRight size={16}/></Button>
                        </div>

                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {equityEntries.length === 0 && (
                                <div className="text-center py-8 text-gray-400 text-sm">
                                    No capital contributions recorded yet
                                </div>
                            )}
                            {equityEntries.map(e => (
                                <div key={e.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <div>
                                        <p className="font-bold text-sm text-gray-800">{e.partner}</p>
                                        <p className="text-[10px] text-gray-400 uppercase">
                                            {e.type || 'CASH'} • 
                                            {e.createdAt?.toDate ? new Date(e.createdAt.toDate()).toLocaleDateString('en-PH') : 'Recent'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-blue-600">{formatMoney(e.amount)}</p>
                                        <button 
                                            onClick={() => deleteDoc(doc(db, "users", user.uid, "equity_log", e.id))} 
                                            className="text-[9px] text-red-400 hover:text-red-600 underline"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-blue-700 uppercase">Total Paid-In Capital</span>
                                <span className="text-lg font-black text-blue-600">{formatMoney(balanceSheet.equity)}</span>
                            </div>
                        </div>
                    </Card>

                    {/* ASSET REGISTER */}
                    <Card className="p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <Briefcase className="text-orange-500"/>
                            <h3 className="font-black text-gray-700 uppercase text-xs tracking-widest">Fixed Asset Register</h3>
                        </div>

                        <div className="flex gap-2 mb-4">
                            <Input 
                                placeholder="Asset Name (e.g. Core IT Server)" 
                                value={newAsset.name} 
                                onChange={e => setNewAsset({...newAsset, name: e.target.value})} 
                            />
                            <Input 
                                type="number" 
                                placeholder="Value (PHP)" 
                                value={newAsset.value} 
                                onChange={e => setNewAsset({...newAsset, value: e.target.value})} 
                            />
                            <Button onClick={handleAddAsset} size="sm" variant="secondary"><ArrowRight size={16}/></Button>
                        </div>

                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {assetEntries.length === 0 && (
                                <div className="text-center py-8 text-gray-400 text-sm">
                                    No fixed assets registered yet
                                </div>
                            )}
                            {assetEntries.map(a => (
                                <div key={a.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <div>
                                        <p className="font-bold text-sm text-gray-800">{a.name}</p>
                                        <p className="text-[10px] text-gray-400 uppercase">
                                            {a.type || 'EQUIPMENT'} • 
                                            {a.createdAt?.toDate ? new Date(a.createdAt.toDate()).toLocaleDateString('en-PH') : 'Recent'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-orange-600">{formatMoney(a.value)}</p>
                                        <button 
                                            onClick={() => deleteDoc(doc(db, "users", user.uid, "asset_register", a.id))} 
                                            className="text-[9px] text-red-400 hover:text-red-600 underline"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 p-3 bg-orange-50 rounded-xl border border-orange-100">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-orange-700 uppercase">Total Fixed Assets</span>
                                <span className="text-lg font-black text-orange-600">{formatMoney(balanceSheet.fixedAssets)}</span>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default ManagementAccounts;
