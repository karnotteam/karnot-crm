import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Input } from '../data/constants.jsx'; 
import { 
    Users, Calculator, PiggyBank, Building, Wallet, 
    ArrowRight, Save, Trash2, TrendingDown, AlertCircle, FileText 
} from 'lucide-react';
import { db } from '../firebase'; 
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, serverTimestamp } from "firebase/firestore";

// --- PHILIPPINE TAX CONSTANTS (2025 Estimates) ---
const TAX_TABLE = [
    { limit: 250000, rate: 0, base: 0 },
    { limit: 400000, rate: 0.15, base: 0 }, // TRAIN Law adjustments
    { limit: 800000, rate: 0.20, base: 22500 },
    { limit: 2000000, rate: 0.25, base: 102500 },
    { limit: 8000000, rate: 0.30, base: 402500 },
    { limit: Infinity, rate: 0.35, base: 2202500 }
];

const DIVIDEND_TAX_RATE = 0.10; 

const PayrollManager = ({ user }) => {
    const [activeTab, setActiveTab] = useState('Process');
    const [payrollHistory, setPayrollHistory] = useState([]);
    
    // PAYROLL FORM STATE
    const [entry, setEntry] = useState({
        name: '',
        role: '',
        department: 'Operations', 
        basicPay: 0,
        allowance: 0,
        overtime: 0
    });

    // TAX OPTIMIZER STATE
    const [targetIncome, setTargetIncome] = useState(2000000); 

    // --- 1. FETCH DATA ---
    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, "users", user.uid, "payroll_log"), orderBy("createdAt", "desc"));
        const unsub = onSnapshot(q, (snap) => {
            setPayrollHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, [user]);

    // --- 2. CALCULATORS ---
    const calculateGovtContributions = (grossPay) => {
        // 2025 SSS/PhilHealth/Pag-IBIG Logic
        const sssCredit = Math.min(grossPay, 30000);
        const sssEE = sssCredit * 0.045;
        const sssER = sssCredit * 0.095;

        const phBase = Math.min(Math.max(grossPay, 10000), 100000);
        const phTotal = phBase * 0.05;
        const phEE = phTotal / 2;
        const phER = phTotal / 2;

        const piEE = 100; // Standard minimum
        const piER = 100;

        return { sssEE, sssER, phEE, phER, piEE, piER };
    };

    const calculateWithholdingTax = (taxableIncome) => {
        const annualIncome = taxableIncome * 12;
        let tax = 0;
        
        for (let i = TAX_TABLE.length - 1; i >= 0; i--) {
            if (annualIncome > TAX_TABLE[i].limit) {
                const bracket = TAX_TABLE[i];
                tax = bracket.base + ((annualIncome - bracket.limit) * bracket.rate);
                break;
            }
        }
        return tax / 12; 
    };

    // --- 3. BIR FORM GENERATOR ---
    const birData = useMemo(() => {
        // Filter for current month/year for 1601-C
        const currentMonth = new Date().getMonth(); 
        const currentYear = new Date().getFullYear();
        
        const monthlyRecords = payrollHistory.filter(p => {
            const d = new Date(p.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        const totalCompensation = monthlyRecords.reduce((sum, p) => sum + (p.basic + p.allowance), 0);
        const totalTaxWithheld = monthlyRecords.reduce((sum, p) => sum + p.taxWithheld, 0);
        
        // Annual for 1604-C / 2316
        const annualRecords = payrollHistory.filter(p => new Date(p.date).getFullYear() === currentYear);
        const annualTaxWithheld = annualRecords.reduce((sum, p) => sum + p.taxWithheld, 0);

        return {
            month: new Date().toLocaleString('default', { month: 'long' }),
            form1601C: {
                totalCompensation,
                taxDue: totalTaxWithheld,
                deadline: `10th of next month`
            },
            form1604C: {
                totalEmployees: new Set(annualRecords.map(p => p.staffName)).size,
                totalTaxRemitted: annualTaxWithheld,
                deadline: `Jan 31, ${currentYear + 1}`
            }
        };
    }, [payrollHistory]);

    // --- 4. HANDLERS ---
    const handleProcessPayroll = async () => {
        if (!entry.name || entry.basicPay <= 0) return;

        const gross = parseFloat(entry.basicPay) + parseFloat(entry.allowance) + parseFloat(entry.overtime);
        const contribs = calculateGovtContributions(parseFloat(entry.basicPay));
        
        const taxable = gross - (contribs.sssEE + contribs.phEE + contribs.piEE); 
        const tax = calculateWithholdingTax(taxable);
        
        const netPay = gross - (contribs.sssEE + contribs.phEE + contribs.piEE + tax);
        const totalEmployerCost = gross + contribs.sssER + contribs.phER + contribs.piER;

        const payrollRecord = {
            staffName: entry.name,
            role: entry.role,
            type: entry.department === 'Operations' ? 'DIRECT' : 'ADMIN', 
            amount: totalEmployerCost, 
            netPayToStaff: netPay,
            taxWithheld: tax,
            basic: parseFloat(entry.basicPay),
            allowance: parseFloat(entry.allowance),
            deductions: { ...contribs, tax },
            date: new Date().toISOString().split('T')[0],
            createdAt: serverTimestamp()
        };

        await addDoc(collection(db, "users", user.uid, "payroll_log"), payrollRecord);
        setEntry({ ...entry, name: '', basicPay: 0, allowance: 0, overtime: 0 });
    };

    const handleDelete = async (id) => {
        if(confirm("Void this payslip? This will update the P&L.")) {
            await deleteDoc(doc(db, "users", user.uid, "payroll_log", id));
        }
    };

    // --- 5. OPTIMIZER LOGIC ---
    const optimizer = useMemo(() => {
        const annualTarget = parseFloat(targetIncome) || 0;
        
        // Scenario A: Salary Only
        let taxSalaryOnly = 0;
        const sortedTable = [...TAX_TABLE].sort((a,b) => a.limit - b.limit);
        for(let i=0; i<sortedTable.length; i++) {
            if(annualTarget <= sortedTable[i].limit) {
                const prev = i === 0 ? { limit: 0, base: 0, rate: 0 } : sortedTable[i-1];
                taxSalaryOnly = prev.base + ((annualTarget - prev.limit) * sortedTable[i].rate); 
                break;
            } else if (i === sortedTable.length -1) {
                 const max = sortedTable[sortedTable.length - 2]; 
                 taxSalaryOnly = max.base + ((annualTarget - max.limit) * 0.35);
            }
        }
        const netSalaryOnly = annualTarget - taxSalaryOnly;

        // Scenario B: Optimized (Salary + Dividend)
        const optimalSalary = 250000; // Tax Exempt Cap
        const dividendPart = Math.max(0, annualTarget - optimalSalary);
        const taxOnDividend = dividendPart * DIVIDEND_TAX_RATE;
        const totalTaxOptimized = taxOnDividend; 
        const netOptimized = annualTarget - totalTaxOptimized;
        const savings = netOptimized - netSalaryOnly;

        return { taxSalaryOnly, netSalaryOnly, taxOnDividend, totalTaxOptimized, netOptimized, savings };
    }, [targetIncome]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center bg-white p-6 rounded-[30px] border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl">
                        <Users size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Payroll & Compliance</h1>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                            BIR Forms 1601-C, 2316 • Dividends Strategy
                        </p>
                    </div>
                </div>
                <div className="flex gap-2 bg-gray-50 p-1 rounded-xl border border-gray-200">
                    {['Process', 'Compliance', 'Tax Strategy'].map(tab => (
                        <button 
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                                activeTab === tab ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* TAB: PROCESS PAYROLL */}
            {activeTab === 'Process' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-1 p-6 border-t-4 border-purple-500">
                        <h3 className="font-black text-gray-700 uppercase text-xs tracking-widest mb-6">New Payslip</h3>
                        <div className="space-y-4">
                            <Input label="Employee Name" value={entry.name} onChange={e => setEntry({...entry, name: e.target.value})} />
                            <div className="grid grid-cols-2 gap-3">
                                <Input label="Role" value={entry.role} onChange={e => setEntry({...entry, role: e.target.value})} />
                                <div>
                                    <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Department</label>
                                    <select 
                                        className="w-full p-3 border border-gray-300 rounded-xl bg-white text-sm font-bold"
                                        value={entry.department}
                                        onChange={e => setEntry({...entry, department: e.target.value})}
                                    >
                                        <option value="Operations">Operations (Direct)</option>
                                        <option value="Admin">Admin (Overhead)</option>
                                    </select>
                                </div>
                            </div>
                            <Input label="Basic Pay (Monthly)" type="number" value={entry.basicPay} onChange={e => setEntry({...entry, basicPay: e.target.value})} />
                            <div className="grid grid-cols-2 gap-3">
                                <Input label="Non-Tax Allowance" type="number" value={entry.allowance} onChange={e => setEntry({...entry, allowance: e.target.value})} />
                                <Input label="Overtime" type="number" value={entry.overtime} onChange={e => setEntry({...entry, overtime: e.target.value})} />
                            </div>
                            
                            <Button onClick={handleProcessPayroll} variant="primary" className="w-full mt-4">Process & Log</Button>
                        </div>
                    </Card>

                    <Card className="lg:col-span-2 p-6">
                        <h3 className="font-black text-gray-700 uppercase text-xs tracking-widest mb-6">Recent History</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-gray-500 font-black uppercase text-xs">
                                    <tr>
                                        <th className="p-3 text-left">Staff</th>
                                        <th className="p-3 text-right">Gross</th>
                                        <th className="p-3 text-right">Withholding Tax</th>
                                        <th className="p-3 text-right">Net Pay</th>
                                        <th className="p-3"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {payrollHistory.map(p => (
                                        <tr key={p.id} className="hover:bg-gray-50">
                                            <td className="p-3 font-bold text-gray-800">{p.staffName}</td>
                                            <td className="p-3 text-right">₱{(p.basic + p.allowance).toLocaleString()}</td>
                                            <td className="p-3 text-right text-red-500">({p.taxWithheld.toLocaleString()})</td>
                                            <td className="p-3 text-right font-black text-green-600">₱{p.netPayToStaff.toLocaleString()}</td>
                                            <td className="p-3 text-right">
                                                <button onClick={() => handleDelete(p.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* TAB: COMPLIANCE (BIR FORMS) */}
            {activeTab === 'Compliance' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 1601-C CARD */}
                        <Card className="p-6 border-l-4 border-blue-500">
                            <div className="flex justify-between mb-4">
                                <h3 className="font-black text-xl text-blue-800">BIR Form 1601-C</h3>
                                <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs font-black uppercase">Monthly</span>
                            </div>
                            <p className="text-sm text-gray-600 mb-6">Monthly Remittance of Income Taxes Withheld on Compensation.</p>
                            
                            <div className="bg-gray-50 p-4 rounded-xl space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="font-bold text-gray-500">For Month Of:</span>
                                    <span className="font-black text-gray-800">{birData.month}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="font-bold text-gray-500">Total Compensation:</span>
                                    <span className="font-black text-gray-800">₱{birData.form1601C.totalCompensation.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm border-t pt-2 border-gray-200">
                                    <span className="font-bold text-gray-500">Tax Due (Remittance):</span>
                                    <span className="font-black text-blue-600 text-lg">₱{birData.form1601C.taxDue.toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="mt-4 flex items-center gap-2 text-xs text-red-500 font-bold">
                                <AlertCircle size={16} /> Deadline: {birData.form1601C.deadline}
                            </div>
                        </Card>

                        {/* 1604-C CARD */}
                        <Card className="p-6 border-l-4 border-orange-500">
                            <div className="flex justify-between mb-4">
                                <h3 className="font-black text-xl text-orange-800">BIR Form 1604-C</h3>
                                <span className="bg-orange-100 text-orange-600 px-2 py-1 rounded text-xs font-black uppercase">Annual</span>
                            </div>
                            <p className="text-sm text-gray-600 mb-6">Annual Information Return of Income Taxes Withheld on Compensation.</p>
                            
                            <div className="bg-gray-50 p-4 rounded-xl space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="font-bold text-gray-500">Total Employees:</span>
                                    <span className="font-black text-gray-800">{birData.form1604C.totalEmployees}</span>
                                </div>
                                <div className="flex justify-between text-sm border-t pt-2 border-gray-200">
                                    <span className="font-bold text-gray-500">Total Tax Remitted (YTD):</span>
                                    <span className="font-black text-orange-600 text-lg">₱{birData.form1604C.totalTaxRemitted.toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="mt-4 flex items-center gap-2 text-xs text-red-500 font-bold">
                                <AlertCircle size={16} /> Deadline: {birData.form1604C.deadline}
                            </div>
                        </Card>
                    </div>

                    {/* ALPHALIST GENERATOR */}
                    <Card className="p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <FileText className="text-green-500"/>
                            <h3 className="font-black text-gray-700 uppercase text-xs tracking-widest">Alphalist / 2316 Data</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-gray-50 border-b font-black text-gray-500 uppercase">
                                    <tr>
                                        <th className="p-3">Employee Name</th>
                                        <th className="p-3">Gross Comp.</th>
                                        <th className="p-3">Non-Taxable (13th/De Minimis)</th>
                                        <th className="p-3">Taxable Comp.</th>
                                        <th className="p-3">Tax Due</th>
                                        <th className="p-3">Tax Withheld</th>
                                        <th className="p-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Aggregating logic would go here in production */}
                                    <tr>
                                        <td colSpan="7" className="p-4 text-center text-gray-400 italic">
                                            Aggregated annual data for Alphalist generation will appear here.
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* TAB: TAX STRATEGY */}
            {activeTab === 'Tax Strategy' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* INPUTS */}
                    <Card className="p-8 bg-gradient-to-br from-indigo-900 to-purple-900 text-white border-0 shadow-2xl">
                        <div className="flex items-center gap-3 mb-6 text-white/80">
                            <Calculator size={24}/>
                            <h3 className="font-black uppercase tracking-widest">Dividend Strategy Calculator</h3>
                        </div>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="text-xs font-black uppercase text-indigo-300 mb-2 block">Target Annual Personal Income</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300 font-bold text-xl">₱</span>
                                    <input 
                                        type="number" 
                                        value={targetIncome} 
                                        onChange={e => setTargetIncome(e.target.value)}
                                        className="w-full pl-10 pr-4 py-4 bg-white/10 border border-white/20 rounded-2xl text-2xl font-black text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                                    />
                                </div>
                                <p className="text-[10px] text-indigo-300 mt-2">Enter the total amount you want to take out of the company this year.</p>
                            </div>

                            <div className="p-4 bg-white/10 rounded-2xl border border-white/10">
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm font-bold text-white/70">Estimated Tax Savings</span>
                                    <span className="text-lg font-black text-green-400">₱{optimizer.savings.toLocaleString()}</span>
                                </div>
                                <div className="w-full bg-white/10 rounded-full h-2">
                                    <div className="bg-green-400 h-2 rounded-full" style={{ width: `${(optimizer.savings / optimizer.totalTaxOptimized) * 50}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* COMPARISON */}
                    <div className="space-y-4">
                        <div className="p-6 bg-white border-2 border-red-100 rounded-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 bg-red-100 text-red-600 px-3 py-1 rounded-bl-xl text-[10px] font-black uppercase">Standard Salary</div>
                            <h4 className="font-black text-gray-800 text-lg mb-4">Option A: 100% Salary</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between text-gray-500">
                                    <span>Gross Income</span>
                                    <span>₱{parseFloat(targetIncome).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-red-500 font-bold">
                                    <span>Income Tax (Graduated up to 35%)</span>
                                    <span>- ₱{optimizer.taxSalaryOnly.toLocaleString()}</span>
                                </div>
                                <div className="border-t pt-2 mt-2 flex justify-between text-lg font-black text-gray-800">
                                    <span>Net Take Home</span>
                                    <span>₱{optimizer.netSalaryOnly.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-green-50 border-2 border-green-200 rounded-2xl relative overflow-hidden shadow-md">
                            <div className="absolute top-0 right-0 bg-green-500 text-white px-3 py-1 rounded-bl-xl text-[10px] font-black uppercase">Karnot Strategy</div>
                            <h4 className="font-black text-green-800 text-lg mb-4">Option B: Salary + Dividends</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between text-gray-500">
                                    <span>Basic Salary (Tax Exempt Limit)</span>
                                    <span>₱250,000</span>
                                </div>
                                <div className="flex justify-between text-gray-500">
                                    <span>Dividend Income</span>
                                    <span>₱{(targetIncome - 250000).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-green-600 font-bold">
                                    <span>Dividend Tax (Flat 10%)</span>
                                    <span>- ₱{optimizer.taxOnDividend.toLocaleString()}</span>
                                </div>
                                <div className="border-t border-green-200 pt-2 mt-2 flex justify-between text-lg font-black text-green-800">
                                    <span>Net Take Home</span>
                                    <span>₱{optimizer.netOptimized.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PayrollManager;
