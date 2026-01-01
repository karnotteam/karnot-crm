import React, { useState, useMemo, useEffect } from 'react';
import { Card, Button } from '../data/constants.jsx'; 
import { 
    Printer, BookOpen, FileText, PieChart, TrendingUp, 
    Leaf, History, Calendar, Calculator
} from 'lucide-react';
import { db } from '../firebase'; 
import { collection, query, orderBy, addDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const BIRBookPrep = ({ quotes = [], ledgerEntries = [] }) => {
    // --- STATE ---
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    // Default to the new Dashboard
    const [activeBook, setActiveBook] = useState('TAX_DASHBOARD'); 
    
    // TAX CONFIGURATION
    const [taxRate, setTaxRate] = useState(0.20); // 20% for Micro/Small (<100M Assets)
    const [deductionMethod, setDeductionMethod] = useState('OSD'); // 'OSD' (40%) is simplest for zero/low maintenance
    
    // TAX FILING & BOI STATE
    const [prevExcessVat, setPrevExcessVat] = useState(0); 
    const [filingHistory, setFilingHistory] = useState([]);
    const [isFiling, setIsFiling] = useState(false);
    const [isBOIMode, setIsBOIMode] = useState(false); // Green Energy Incentives

    const auth = getAuth();
    const user = auth.currentUser;

    // --- 1. FETCH FILING HISTORY ---
    useEffect(() => {
        if (!user) return;
        const qHistory = query(collection(db, "users", user.uid, "tax_filings"), orderBy("periodEnd", "desc"));
        const unsub = onSnapshot(qHistory, (snap) => {
            const history = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setFilingHistory(history);
            if (history.length > 0) {
                const lastFiling = history.find(h => h.type === 'VAT'); 
                if (lastFiling && lastFiling.action === 'CARRY_OVER') {
                    setPrevExcessVat(lastFiling.carryOverAmount || 0);
                }
            }
        });
        return () => unsub();
    }, [user]);

    // --- HELPER: DATE FILTERING ---
    const filterByDate = (items, dateField) => {
        return items.filter(item => {
            if (!item[dateField]) return false;
            const date = item[dateField].seconds ? new Date(item[dateField].seconds * 1000) : new Date(item[dateField]);
            return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
        });
    };

    // --- 2. SALES JOURNAL (Output VAT & Income) ---
    const salesData = useMemo(() => {
        const revenueQuotes = quotes.filter(q => ['WON', 'APPROVED', 'INVOICED'].includes(q.status));
        return filterByDate(revenueQuotes, 'createdAt').map(q => {
            const rate = q.costing?.forexRate || 58.5;
            const isExport = q.customer?.saleType === 'Export';
            const grossUSD = Number(q.finalSalesPrice || 0);
            const grossPHP = grossUSD * rate;
            
            let vatableSales = 0, vatOutput = 0, zeroRated = 0;

            if (isBOIMode || isExport) { 
                zeroRated = grossPHP; 
            } else { 
                vatableSales = grossPHP / 1.12; 
                vatOutput = grossPHP - vatableSales; 
            }

            return { 
                date: q.createdAt, ref: q.id, customer: q.customer?.name, tin: q.customer?.tin, 
                grossPHP, vatableSales, vatOutput, zeroRated, isBOIApplied: isBOIMode 
            };
        });
    }, [quotes, selectedMonth, selectedYear, isBOIMode]);

    // --- 3. PURCHASE JOURNAL (Input VAT & Deductions) ---
    const expenseData = useMemo(() => {
        return filterByDate(ledgerEntries, 'date').map(e => {
            const grossPHP = parseFloat(e.amountPHP) || 0;
            const isNonVat = e.taxStatus === 'NON-VAT';
            
            // Detect Importation / Capital Equipment
            const isImportOrCapital = e.category?.toLowerCase().includes('duties') || 
                                      e.description?.toLowerCase().includes('import') ||
                                      e.category?.toLowerCase().includes('equipment');

            let netPurchase = 0, inputVat = 0;

            if (isBOIMode && isImportOrCapital) {
                // BOI LOGIC: Duty-Free Importation (No VAT paid = No Credit)
                netPurchase = grossPHP;
                inputVat = 0; 
            } else if (isImportOrCapital && !isBOIMode) {
                // STANDARD: Paid VAT at Customs = Input Tax Credit
                netPurchase = 0;
                inputVat = grossPHP; 
            } else if (isNonVat) { 
                netPurchase = grossPHP; 
            } else { 
                netPurchase = grossPHP / 1.12; 
                inputVat = grossPHP - netPurchase; 
            }

            return { 
                id: e.id, date: e.date, payee: e.supplierName || e.description, tin: e.supplierTIN, 
                ref: e.reference, category: e.category, subCategory: e.subCategory, 
                grossPHP, netPurchase, inputVat, isNonVat, 
                isDutyFree: (isBOIMode && isImportOrCapital)
            };
        });
    }, [ledgerEntries, selectedMonth, selectedYear, isBOIMode]);

    // --- 4. GENERAL LEDGER SUMMARY ---
    const generalLedgerSummary = useMemo(() => {
        const summary = {};
        
        // Expenses
        expenseData.forEach(e => {
            const key = e.subCategory || e.category || 'Uncategorized Expense';
            if (!summary[key]) summary[key] = { debit: 0, credit: 0 };
            summary[key].debit += e.grossPHP; 
        });

        // Sales
        const totalSalesGross = salesData.reduce((sum, s) => sum + s.grossPHP, 0);
        if (totalSalesGross > 0) {
            summary['Sales Revenue'] = { debit: 0, credit: totalSalesGross };
        }

        return Object.entries(summary).sort((a, b) => b[1].debit - a[1].debit);
    }, [expenseData, salesData]);

    // --- 5. VAT COMPUTATION (Form 2550Q Logic) ---
    const vatTotals = useMemo(() => {
        const outputVAT = salesData.reduce((sum, i) => sum + (i.vatOutput || 0), 0);
        const currentInputVAT = expenseData.reduce((sum, i) => sum + (i.inputVat || 0), 0);
        
        const totalTaxCredits = currentInputVAT + Number(prevExcessVat);
        const netVAT = outputVAT - totalTaxCredits;
        
        return { outputVAT, currentInputVAT, totalTaxCredits, netVAT };
    }, [salesData, expenseData, prevExcessVat]);

    // --- 6. INCOME TAX COMPUTATION (Form 1702Q Logic) ---
    const incomeTaxTotals = useMemo(() => {
        const totalSales = salesData.reduce((sum, i) => sum + i.grossPHP, 0); // Line 16A
        const costOfSales = 0; 
        const grossIncome = totalSales - costOfSales; // Line 18A

        let deductions = 0;
        if (deductionMethod === 'OSD') {
            deductions = grossIncome * 0.40; // Line 21 (40% of Gross Income)
        } else {
            deductions = expenseData.reduce((sum, i) => sum + i.netPurchase, 0); // Itemized
        }

        const taxableIncome = grossIncome - deductions; // Line 22
        const taxBase = taxableIncome > 0 ? taxableIncome : 0;
        const taxDue = taxBase * taxRate; // Line 29

        return { totalSales, costOfSales, grossIncome, deductions, taxableIncome, taxDue };
    }, [salesData, expenseData, deductionMethod, taxRate]);

    // --- 7. DEADLINE ENGINE ---
    const deadlineInfo = useMemo(() => {
        // Is this a quarter-ending month? (March, June, Sept, Dec)
        const isQuarterEnd = (selectedMonth + 1) % 3 === 0;

        // VAT Deadline: 25th of following month
        const nextMonthYear = selectedMonth === 11 ? selectedYear + 1 : selectedYear;
        const nextMonthIndex = selectedMonth === 11 ? 0 : selectedMonth + 1;
        
        const vatDeadline = new Date(nextMonthYear, nextMonthIndex, 25);
        
        // Income Tax Deadline: 60 days after quarter closes
        let incomeDeadline = null;
        if (isQuarterEnd) {
            incomeDeadline = new Date(nextMonthYear, nextMonthIndex + 1, 29); 
        }

        const now = new Date();
        const daysToVat = Math.ceil((vatDeadline - now) / (1000 * 60 * 60 * 24));
        
        return { isQuarterEnd, vatDeadline, incomeDeadline, daysToVat };
    }, [selectedMonth, selectedYear]);


    // --- 8. HANDLE CLOSE PERIOD ---
    const handleClosePeriod = async () => {
        if (!user) return;
        
        const vatAction = vatTotals.netVAT >= 0 ? 'PAYMENT_DUE' : 'CARRY_OVER';
        const msg = `Confirm Filing for ${months[selectedMonth]}?\n\nVAT: ₱${vatTotals.netVAT.toLocaleString()} (${vatAction})\nIncome Tax: ₱${incomeTaxTotals.taxDue.toLocaleString()}`;
        
        if (!window.confirm(msg)) return;

        setIsFiling(true);
        try {
            const batchData = {
                periodMonth: selectedMonth,
                periodYear: selectedYear,
                periodEnd: new Date(selectedYear, selectedMonth + 1, 0),
                filedAt: serverTimestamp(),
                status: 'FILED',
                regime: isBOIMode ? 'BOI_RE_INCENTIVE' : 'STANDARD_VAT'
            };

            // 1. File VAT
            await addDoc(collection(db, "users", user.uid, "tax_filings"), {
                ...batchData,
                type: 'VAT',
                form: '2550Q',
                outputVat: vatTotals.outputVAT,
                inputVat: vatTotals.currentInputVAT,
                prevExcessUsed: prevExcessVat,
                netAmount: vatTotals.netVAT,
                action: vatAction,
                carryOverAmount: vatTotals.netVAT < 0 ? Math.abs(vatTotals.netVAT) : 0,
            });

            // 2. File Income Tax
            await addDoc(collection(db, "users", user.uid, "tax_filings"), {
                ...batchData,
                type: 'INCOME_TAX',
                form: '1702Q',
                grossIncome: incomeTaxTotals.grossIncome,
                deductions: incomeTaxTotals.deductions,
                taxableIncome: incomeTaxTotals.taxableIncome,
                taxDue: incomeTaxTotals.taxDue,
                method: deductionMethod,
                rate: taxRate
            });

            alert("Returns Recorded Successfully!");
        } catch (error) {
            console.error("Filing Error:", error);
            alert("Failed to close period.");
        } finally {
            setIsFiling(false);
        }
    };

    // --- HELPER: Form Badge Component ---
    const FormBox = ({ code }) => (
        <span className="ml-2 text-[10px] font-black bg-gray-800 text-white px-1.5 py-0.5 rounded">
            Box {code}
        </span>
    );

    const formatCurrency = (val) => `₱${(Number(val) || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];

    return (
        <div className="flex flex-col xl:flex-row gap-8 pb-20">
            {/* LEFT SIDE: MAIN WORKSPACE */}
            <div className="flex-1 space-y-6">
                
                {/* HEADER */}
                <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-[30px] shadow-sm border border-gray-100 gap-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-2xl ${isBOIMode ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                            {isBOIMode ? <Leaf size={24}/> : <BookOpen size={24} />}
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tight">
                                Karnot Tax Engine
                            </h1>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                                {isBOIMode ? 'BOI Incentives Active (Zero-Rated)' : 'Regular Corporate Tax'}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="bg-gray-50 p-1 rounded-xl flex border border-gray-200">
                            <select 
                                value={selectedMonth} 
                                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                className="bg-transparent font-bold text-sm p-2 outline-none text-gray-700 cursor-pointer"
                            >
                                {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                            </select>
                            <select 
                                value={selectedYear} 
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                className="bg-transparent font-bold text-sm p-2 outline-none text-gray-700 border-l border-gray-200 cursor-pointer"
                            >
                                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                        <Button onClick={() => window.print()} variant="secondary" className="px-4 rounded-xl font-bold uppercase text-xs">
                            <Printer size={16}/>
                        </Button>
                    </div>
                </div>

                {/* DEADLINE ALERT WIDGET */}
                <div className={`p-4 rounded-2xl flex items-center justify-between shadow-sm border-l-4 ${deadlineInfo.daysToVat < 5 ? 'bg-red-50 border-red-500 text-red-700' : 'bg-blue-50 border-blue-500 text-blue-700'}`}>
                    <div className="flex items-center gap-3">
                        <Calendar size={20} />
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest">Upcoming Deadline</p>
                            <p className="font-bold text-sm">
                                VAT (2550Q) Due: {deadlineInfo.vatDeadline.toDateString()} 
                                {deadlineInfo.incomeDeadline && ` | Income (1702Q) Due: ${deadlineInfo.incomeDeadline.toDateString()}`}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-black">{deadlineInfo.daysToVat}</p>
                        <p className="text-[9px] uppercase font-bold">Days Remaining</p>
                    </div>
                </div>

                {/* NAVIGATION TABS */}
                <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-1">
                    {[
                        { id: 'TAX_DASHBOARD', label: 'Tax Return View', icon: Calculator },
                        { id: 'SALES', label: 'Sales Journal', icon: TrendingUp },
                        { id: 'RECEIPT', label: 'Cash Receipt', icon: FileText },
                        { id: 'PURCHASE', label: 'Purchase Journal', icon: BookOpen },
                        { id: 'DISBURSEMENT', label: 'Cash Disbursement', icon: FileText },
                        { id: 'GENERAL', label: 'General Journal', icon: BookOpen },
                        { id: 'LEDGER', label: 'General Ledger', icon: PieChart }
                    ].map(book => (
                        <button
                            key={book.id}
                            onClick={() => setActiveBook(book.id)}
                            className={`px-4 py-2 rounded-t-lg font-bold text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${
                                activeBook === book.id
                                ? 'bg-white text-blue-600 border-t-2 border-x-2 border-gray-100 shadow-sm relative top-[1px]' 
                                : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                            }`}
                        >
                            <book.icon size={14}/> {book.label}
                        </button>
                    ))}
                </div>

                {/* CONTENT AREA */}
                <Card className="rounded-b-[30px] rounded-tr-[30px] border-none shadow-xl overflow-hidden bg-white min-h-[400px]">
                    
                    {/* --- VIEW 1: TAX RETURN DASHBOARD (CHEAT SHEET) --- */}
                    {activeBook === 'TAX_DASHBOARD' && (
                        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                            
                            {/* FORM 2550Q (VAT) */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-blue-600 border-b border-blue-100 pb-2">
                                    <FileText size={18} />
                                    <h3 className="font-black uppercase text-sm tracking-widest">VAT Return (Form 2550Q)</h3>
                                </div>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500">Vatable Sales <FormBox code="15"/></span>
                                        <span className="font-mono font-bold">{formatCurrency(salesData.reduce((a,b)=>a+b.vatableSales,0))}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500">Output VAT Due <FormBox code="19B"/></span>
                                        <span className="font-mono font-bold text-red-500">{formatCurrency(vatTotals.outputVAT)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500">Input Tax (Purchases) <FormBox code="21"/></span>
                                        <span className="font-mono font-bold text-green-600">({formatCurrency(vatTotals.currentInputVAT)})</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500">Previous Excess VAT <FormBox code="23A"/></span>
                                        <input 
                                            type="number" 
                                            value={prevExcessVat} 
                                            onChange={(e) => setPrevExcessVat(e.target.value)}
                                            className="w-24 text-right bg-gray-50 border-b border-gray-300 focus:border-blue-500 outline-none font-mono text-green-600"
                                        />
                                    </div>
                                    <div className="flex justify-between border-t-2 border-gray-200 pt-2 mt-2 items-center">
                                        <span className="font-black text-gray-800">NET VAT PAYABLE <FormBox code="25"/></span>
                                        <span className={`font-mono font-black text-lg ${vatTotals.netVAT >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {formatCurrency(vatTotals.netVAT)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* FORM 1702Q (INCOME TAX) */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-orange-600 border-b border-orange-100 pb-2">
                                    <FileText size={18} />
                                    <h3 className="font-black uppercase text-sm tracking-widest">Income Tax (Form 1702Q)</h3>
                                    <div className="ml-auto text-[9px] bg-orange-100 px-2 py-1 rounded font-bold">Rate: {taxRate * 100}%</div>
                                </div>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500">Gross Sales <FormBox code="16A"/></span>
                                        <span className="font-mono font-bold">{formatCurrency(incomeTaxTotals.totalSales)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500">Cost of Sales <FormBox code="17A"/></span>
                                        <span className="font-mono font-bold">({formatCurrency(incomeTaxTotals.costOfSales)})</span>
                                    </div>
                                    <div className="flex justify-between bg-gray-50 p-2 rounded items-center">
                                        <div className="flex flex-col">
                                            <span className="text-gray-500">Deductions <FormBox code="21"/></span>
                                            <div className="flex gap-2 mt-1">
                                                <button onClick={() => setDeductionMethod('OSD')} className={`text-[9px] px-2 py-0.5 rounded ${deductionMethod === 'OSD' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>OSD (40%)</button>
                                                <button onClick={() => setDeductionMethod('ITEMIZED')} className={`text-[9px] px-2 py-0.5 rounded ${deductionMethod === 'ITEMIZED' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Itemized</button>
                                            </div>
                                        </div>
                                        <span className="font-mono font-bold text-green-600">({formatCurrency(incomeTaxTotals.deductions)})</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500">Taxable Income <FormBox code="22"/></span>
                                        <span className="font-mono font-bold">{formatCurrency(incomeTaxTotals.taxableIncome)}</span>
                                    </div>
                                    <div className="flex justify-between border-t-2 border-gray-200 pt-2 mt-2 items-center">
                                        <span className="font-black text-gray-800">TAX DUE <FormBox code="29"/></span>
                                        <span className="font-mono font-black text-lg text-red-600">
                                            {formatCurrency(incomeTaxTotals.taxDue)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                        </div>
                    )}

                    {/* --- VIEW 2: SALES JOURNAL --- */}
                    {activeBook === 'SALES' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-gray-50 text-gray-500 uppercase font-black text-[9px] tracking-widest">
                                    <tr>
                                        <th className="p-4">Date</th>
                                        <th className="p-4">Customer</th>
                                        <th className="p-4 text-right">VATable</th>
                                        <th className="p-4 text-right">Output VAT</th>
                                        <th className="p-4 text-right">Gross</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {salesData.map((row, i) => (
                                        <tr key={i}>
                                            <td className="p-4 text-gray-500">{new Date(row.date.seconds * 1000).toLocaleDateString()}</td>
                                            <td className="p-4 font-bold">{row.customer}</td>
                                            <td className="p-4 text-right font-mono">{formatCurrency(row.vatableSales)}</td>
                                            <td className="p-4 text-right font-mono text-blue-600">{formatCurrency(row.vatOutput)}</td>
                                            <td className="p-4 text-right font-black">{formatCurrency(row.grossPHP)}</td>
                                        </tr>
                                    ))}
                                    {salesData.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-gray-400">No Sales recorded for this period.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* --- VIEW 3: PURCHASE JOURNAL --- */}
                    {(activeBook === 'PURCHASE' || activeBook === 'DISBURSEMENT') && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-gray-50 text-gray-500 uppercase font-black text-[9px] tracking-widest">
                                    <tr>
                                        <th className="p-4">Date</th>
                                        <th className="p-4">Payee</th>
                                        <th className="p-4 text-right">Net Purchase</th>
                                        <th className="p-4 text-right">Input VAT</th>
                                        <th className="p-4 text-right">Gross</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {expenseData.map((row, i) => (
                                        <tr key={i}>
                                            <td className="p-4 text-gray-500">{new Date(row.date.seconds * 1000).toLocaleDateString()}</td>
                                            <td className="p-4 font-bold">{row.payee}</td>
                                            <td className="p-4 text-right font-mono">{formatCurrency(row.netPurchase)}</td>
                                            <td className="p-4 text-right font-mono text-red-500">{formatCurrency(row.inputVat)}</td>
                                            <td className="p-4 text-right font-black">{formatCurrency(row.grossPHP)}</td>
                                        </tr>
                                    ))}
                                    {expenseData.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-gray-400">No Expenses recorded for this period.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* --- VIEW 4: PLACEHOLDERS --- */}
                    {(activeBook === 'RECEIPT' || activeBook === 'GENERAL') && (
                        <div className="p-8 text-center text-gray-400 italic">
                            <p className="mb-2">This book is currently proxied by Sales/Purchase data.</p>
                        </div>
                    )}

                    {/* --- VIEW 5: GENERAL LEDGER --- */}
                    {activeBook === 'LEDGER' && (
                        <div className="p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                                    <div className="p-4 bg-gray-50 border-b border-gray-100">
                                        <h4 className="font-black text-gray-700 uppercase text-xs tracking-widest">Expenses (Debits)</h4>
                                    </div>
                                    <table className="w-full text-xs">
                                        <tbody className="divide-y divide-gray-50">
                                            {generalLedgerSummary.map(([account, data]) => (
                                                data.debit > 0 && (
                                                    <tr key={account}>
                                                        <td className="p-3 font-bold text-gray-700">{account}</td>
                                                        <td className="p-3 text-right font-mono">{formatCurrency(data.debit)}</td>
                                                    </tr>
                                                )
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden h-fit">
                                    <div className="p-4 bg-gray-50 border-b border-gray-100">
                                        <h4 className="font-black text-gray-700 uppercase text-xs tracking-widest">Revenue (Credits)</h4>
                                    </div>
                                    <table className="w-full text-xs">
                                        <tbody className="divide-y divide-gray-50">
                                            {generalLedgerSummary.map(([account, data]) => (
                                                data.credit > 0 && (
                                                    <tr key={account}>
                                                        <td className="p-3 font-bold text-gray-700">{account}</td>
                                                        <td className="p-3 text-right font-black text-green-600">{formatCurrency(data.credit)}</td>
                                                    </tr>
                                                )
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            {/* RIGHT SIDE: ACTIONS & HISTORY */}
            <div className="w-full xl:w-80 space-y-6">
                
                {/* CLOSE PERIOD CARD */}
                <Card className="bg-slate-900 text-white p-6 shadow-xl border-0 relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="text-lg font-black uppercase tracking-tight mb-1">File Returns</h3>
                        <p className="text-xs text-slate-400 mb-6">{months[selectedMonth]} {selectedYear}</p>
                        
                        <div className="space-y-2 mb-6 text-sm">
                            <div className="flex justify-between">
                                <span className="opacity-70">Total Tax Due:</span>
                                <span className="font-mono font-black text-orange-400">
                                    {formatCurrency((vatTotals.netVAT > 0 ? vatTotals.netVAT : 0) + incomeTaxTotals.taxDue)}
                                </span>
                            </div>
                        </div>

                        <Button 
                            onClick={handleClosePeriod} 
                            disabled={isFiling}
                            className="w-full py-4 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg border-none bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {isFiling ? 'Filing...' : 'Confirm & Record'}
                        </Button>
                        <p className="text-[9px] text-center mt-3 opacity-50 text-slate-300">
                            Records filing to Karnot history.
                        </p>
                    </div>
                </Card>

                {/* FILING HISTORY */}
                <Card className="border-0 shadow-sm">
                    <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                        <History size={16} className="text-gray-400"/>
                        <h4 className="font-black text-gray-600 uppercase text-xs tracking-widest">Recent Filings</h4>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                        {filingHistory.map(record => (
                            <div key={record.id} className="p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold text-gray-800 text-xs">
                                        {months[record.periodMonth]} {record.periodYear}
                                    </span>
                                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase bg-gray-100 text-gray-600">
                                        {record.form || 'VAT'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-400 text-[10px]">
                                        {record.filedAt?.seconds ? new Date(record.filedAt.seconds * 1000).toLocaleDateString() : 'Pending'}
                                    </span>
                                    <span className="font-mono font-bold text-gray-600">
                                        {formatCurrency(record.netAmount || record.taxDue)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* BOI TOGGLE */}
                <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-200 cursor-pointer hover:border-green-400 transition-colors" onClick={() => setIsBOIMode(!isBOIMode)}>
                    <div className={`w-10 h-6 rounded-full flex items-center transition-all px-1 ${isBOIMode ? 'bg-green-500 justify-end' : 'bg-gray-300 justify-start'}`}>
                        <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-700">BOI Incentive Mode</p>
                        <p className="text-[9px] text-gray-400">Toggle for Zero-Rated Sales</p>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default BIRBookPrep;
