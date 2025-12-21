import React, { useState, useMemo, useEffect } from 'react';
import { Card, Button } from '../data/constants.jsx'; 
import { 
    Printer, BookOpen, FileText, PieChart, TrendingUp, 
    AlertTriangle, AlertCircle, ArrowDownCircle, Lock, Leaf, History
} from 'lucide-react';
import { db } from '../firebase'; 
import { collection, query, orderBy, addDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const BIRBookPrep = ({ quotes = [], ledgerEntries = [] }) => {
    // --- STATE ---
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [activeBook, setActiveBook] = useState('SALES'); // SALES, RECEIPT, PURCHASE, DISBURSEMENT, GENERAL, LEDGER
    
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
                const lastFiling = history[0]; 
                if (lastFiling.action === 'CARRY_OVER') {
                    setPrevExcessVat(lastFiling.carryOverAmount || 0);
                } else {
                    setPrevExcessVat(0); 
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

    // --- 2. SALES JOURNAL (Output VAT) ---
    const salesData = useMemo(() => {
        const revenueQuotes = quotes.filter(q => ['WON', 'APPROVED', 'INVOICED'].includes(q.status));
        return filterByDate(revenueQuotes, 'createdAt').map(q => {
            const rate = q.costing?.forexRate || 58.5;
            const isExport = q.customer?.saleType === 'Export';
            const grossUSD = Number(q.finalSalesPrice || 0);
            const grossPHP = grossUSD * rate;
            
            let vatableSales = 0, vatOutput = 0, zeroRated = 0;

            // BOI LOGIC: Domestic sales from RE projects are Zero-Rated
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

    // --- 3. PURCHASE JOURNAL (Input VAT) ---
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

    // --- 4. GENERAL LEDGER SUMMARY (Restored) ---
    const generalLedgerSummary = useMemo(() => {
        const summary = {};
        
        // Process Expenses (Debits)
        expenseData.forEach(e => {
            const key = e.subCategory || e.category || 'Uncategorized Expense';
            if (!summary[key]) summary[key] = { debit: 0, credit: 0, count: 0 };
            summary[key].debit += e.grossPHP; // Using Gross for simple Cash basis visualization
            summary[key].count += 1;
        });

        // Process Sales (Credits)
        const totalSalesGross = salesData.reduce((sum, s) => sum + s.grossPHP, 0);
        if (totalSalesGross > 0) {
            summary['Sales Revenue'] = { debit: 0, credit: totalSalesGross, count: salesData.length };
        }

        return Object.entries(summary).sort((a, b) => b[1].debit - a[1].debit);
    }, [expenseData, salesData]);

    // --- 5. VAT COMPUTATION ---
    const totals = useMemo(() => {
        const outputVAT = salesData.reduce((sum, i) => sum + (i.vatOutput || 0), 0);
        const currentInputVAT = expenseData.reduce((sum, i) => sum + (i.inputVat || 0), 0);
        
        const totalTaxCredits = currentInputVAT + Number(prevExcessVat);
        const netVAT = outputVAT - totalTaxCredits;
        
        return { outputVAT, currentInputVAT, totalTaxCredits, netVAT };
    }, [salesData, expenseData, prevExcessVat]);

    // --- 6. HANDLE CLOSE PERIOD ---
    const handleClosePeriod = async () => {
        if (!user) return;
        const confirmMsg = totals.netVAT >= 0 
            ? `Confirm filing? You are recording a PAYMENT of ₱${totals.netVAT.toLocaleString()}.` 
            : `Confirm filing? You are carrying over ₱${Math.abs(totals.netVAT).toLocaleString()} to the next period.`;
        
        if (!window.confirm(confirmMsg)) return;

        setIsFiling(true);
        try {
            await addDoc(collection(db, "users", user.uid, "tax_filings"), {
                periodMonth: selectedMonth,
                periodYear: selectedYear,
                periodEnd: new Date(selectedYear, selectedMonth + 1, 0),
                filedAt: serverTimestamp(),
                outputVat: totals.outputVAT,
                inputVat: totals.currentInputVAT,
                prevExcessUsed: prevExcessVat,
                netAmount: totals.netVAT,
                action: totals.netVAT >= 0 ? 'PAYMENT_DUE' : 'CARRY_OVER',
                carryOverAmount: totals.netVAT < 0 ? Math.abs(totals.netVAT) : 0,
                status: 'FILED',
                regime: isBOIMode ? 'BOI_RE_INCENTIVE' : 'STANDARD_VAT'
            });
            alert("Period Closed Successfully!");
        } catch (error) {
            console.error("Filing Error:", error);
            alert("Failed to close period.");
        } finally {
            setIsFiling(false);
        }
    };

    // --- HELPERS ---
    const formatCurrency = (val) => `₱${(Number(val) || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];

    return (
        <div className="flex flex-col lg:flex-row gap-8 pb-20">
            {/* LEFT SIDE: MAIN BOOKKEEPING */}
            <div className="flex-1 space-y-8">
                
                {/* HEADER & CONTROLS */}
                <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-[30px] shadow-sm border border-gray-100 gap-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-2xl ${isBOIMode ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                            {isBOIMode ? <Leaf size={24}/> : <BookOpen size={24} />}
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tight">
                                {isBOIMode ? 'Green Energy Books' : 'Standard BIR Books'}
                            </h1>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                                {isBOIMode ? 'BOI Incentives (RA 9513) Active' : 'Standard VAT Compliance'}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        {/* BOI TOGGLE */}
                        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl cursor-pointer" onClick={() => setIsBOIMode(!isBOIMode)}>
                            <span className={`text-[10px] font-black uppercase px-3 py-2 rounded-lg transition-all ${!isBOIMode ? 'bg-white shadow text-gray-800' : 'text-gray-400'}`}>Standard</span>
                            <span className={`text-[10px] font-black uppercase px-3 py-2 rounded-lg transition-all ${isBOIMode ? 'bg-green-500 shadow text-white' : 'text-gray-400'}`}>BOI / Green</span>
                        </div>

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
                            <Printer size={16} className="mr-2"/> Print
                        </Button>
                    </div>
                </div>

                {/* VAT SUMMARY CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className={`p-5 border-l-4 bg-white shadow-sm ${isBOIMode ? 'border-green-500' : 'border-blue-500'}`}>
                        <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">Output VAT (Sales)</p>
                        <p className="text-xl font-black text-gray-800">{formatCurrency(totals.outputVAT)}</p>
                        {isBOIMode && <span className="text-[9px] text-green-600 font-bold uppercase bg-green-50 px-2 py-0.5 rounded">Zero-Rated (RE)</span>}
                    </Card>

                    <Card className="p-5 border-l-4 border-red-500 bg-white shadow-sm">
                        <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">Input VAT (Credits)</p>
                        <p className="text-xl font-black text-gray-800">{formatCurrency(totals.currentInputVAT)}</p>
                    </Card>

                    <Card className="p-5 border-l-4 border-purple-500 bg-purple-50 shadow-sm relative group">
                        <div className="flex justify-between items-center mb-1">
                            <p className="text-[9px] text-purple-400 font-black uppercase tracking-widest">Less: Prev. Excess</p>
                            <ArrowDownCircle size={14} className="text-purple-400"/>
                        </div>
                        <input 
                            type="number" 
                            value={prevExcessVat} 
                            onChange={(e) => setPrevExcessVat(e.target.value)}
                            className="bg-transparent text-xl font-black text-purple-700 w-full outline-none placeholder-purple-300"
                        />
                    </Card>

                    <Card className={`p-5 border-l-4 shadow-md bg-white ${totals.netVAT >= 0 ? 'border-orange-500' : 'border-green-500'}`}>
                        <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">
                            {totals.netVAT >= 0 ? 'Net Payable' : 'Excess Input VAT'}
                        </p>
                        <p className={`text-xl font-black ${totals.netVAT >= 0 ? 'text-orange-600' : 'text-green-600'}`}>
                            {totals.netVAT < 0 ? `(${formatCurrency(Math.abs(totals.netVAT))})` : formatCurrency(totals.netVAT)}
                        </p>
                        <p className={`text-[9px] font-bold mt-1 uppercase ${totals.netVAT >= 0 ? 'text-orange-500' : 'text-green-600'}`}>
                            {totals.netVAT >= 0 ? 'Remit to BIR' : 'Carry Over'}
                        </p>
                    </Card>
                </div>

                {/* BOOKS NAVIGATION */}
                <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-1">
                    {[
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
                                ? 'bg-white text-orange-600 border-t-2 border-x-2 border-gray-100 shadow-sm relative top-[1px]' 
                                : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                            }`}
                        >
                            <book.icon size={14}/> {book.label}
                        </button>
                    ))}
                </div>

                {/* BOOK CONTENT AREA */}
                <Card className="rounded-b-[30px] rounded-tr-[30px] border-none shadow-xl overflow-hidden bg-white min-h-[400px]">
                    
                    {/* 1. SALES JOURNAL */}
                    {activeBook === 'SALES' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-gray-50 text-gray-500 uppercase font-black text-[9px] tracking-widest">
                                    <tr>
                                        <th className="p-4">Date</th>
                                        <th className="p-4">Ref #</th>
                                        <th className="p-4">Customer</th>
                                        <th className="p-4 text-right">VATable</th>
                                        <th className="p-4 text-right">Output VAT</th>
                                        <th className="p-4 text-right">Gross</th>
                                        <th className="p-4 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {salesData.map((row, i) => (
                                        <tr key={i}>
                                            <td className="p-4 text-gray-500">{new Date(row.date).toLocaleDateString()}</td>
                                            <td className="p-4 font-mono text-orange-600">{row.ref}</td>
                                            <td className="p-4 font-bold">{row.customer}</td>
                                            <td className="p-4 text-right font-mono">{formatCurrency(row.vatableSales)}</td>
                                            <td className="p-4 text-right font-mono text-blue-600">{formatCurrency(row.vatOutput)}</td>
                                            <td className="p-4 text-right font-black">{formatCurrency(row.grossPHP)}</td>
                                            <td className="p-4 text-center">
                                                {row.zeroRated > 0 && <span className="text-[9px] font-black bg-green-100 text-green-700 px-2 py-1 rounded">ZERO-RATED</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    
                    {/* 2. RECEIPT JOURNAL */}
                    {activeBook === 'RECEIPT' && (
                        <div className="p-8 text-center text-gray-400 italic">
                            <p className="mb-2">This book tracks Official Receipts (OR) issued.</p>
                            <p className="text-xs">Currently proxied by Sales Journal data for estimation.</p>
                        </div>
                    )}

                    {/* 3. PURCHASE / DISBURSEMENT JOURNAL */}
                    {(activeBook === 'PURCHASE' || activeBook === 'DISBURSEMENT') && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-gray-50 text-gray-500 uppercase font-black text-[9px] tracking-widest">
                                    <tr>
                                        <th className="p-4">Date</th>
                                        <th className="p-4">Ref #</th>
                                        <th className="p-4">Payee</th>
                                        <th className="p-4">Category</th>
                                        <th className="p-4 text-right">Net</th>
                                        <th className="p-4 text-right">Input VAT</th>
                                        <th className="p-4 text-right">Gross</th>
                                        <th className="p-4 text-center">Class</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {expenseData.map((row, i) => (
                                        <tr key={i}>
                                            <td className="p-4 text-gray-500">{new Date(row.date).toLocaleDateString()}</td>
                                            <td className="p-4 font-mono text-gray-500">{row.ref}</td>
                                            <td className="p-4 font-bold">{row.payee}</td>
                                            <td className="p-4 text-[10px] uppercase font-bold text-gray-400">{row.subCategory || row.category}</td>
                                            <td className="p-4 text-right font-mono">{formatCurrency(row.netPurchase)}</td>
                                            <td className={`p-4 text-right font-mono ${row.isDutyFree ? 'text-green-600 font-black' : 'text-red-500'}`}>
                                                {formatCurrency(row.inputVat)}
                                            </td>
                                            <td className="p-4 text-right font-black">{formatCurrency(row.grossPHP)}</td>
                                            <td className="p-4 text-center">
                                                {row.isDutyFree && <span className="text-[9px] font-black bg-green-100 text-green-700 px-2 py-1 rounded">DUTY FREE</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* 4. GENERAL LEDGER (Summary) */}
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

                    {/* 5. GENERAL JOURNAL */}
                    {activeBook === 'GENERAL' && (
                        <div className="p-8 text-center text-gray-400 italic">
                            <p>General Journal (GJ) for adjusting entries.</p>
                        </div>
                    )}
                </Card>
            </div>

            {/* RIGHT SIDE: FILING ENGINE & NOTES */}
            <div className="w-full lg:w-80 space-y-6">
                
                {/* CLOSE PERIOD ACTION */}
                <Card className="bg-slate-900 text-white p-6 shadow-xl border-0 relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="text-lg font-black uppercase tracking-tight mb-1">Tax Filing</h3>
                        <p className="text-xs text-slate-400 mb-6">{months[selectedMonth]} {selectedYear}</p>
                        
                        <div className="space-y-2 mb-6 text-sm">
                            <div className="flex justify-between">
                                <span className="opacity-70">Net Result:</span>
                                <span className="font-bold">{totals.netVAT >= 0 ? 'Payment Due' : 'Carry Over'}</span>
                            </div>
                            <div className="flex justify-between border-t border-slate-700 pt-2">
                                <span className="opacity-70">Amount:</span>
                                <span className={`font-mono font-black ${totals.netVAT >= 0 ? 'text-orange-400' : 'text-green-400'}`}>
                                    {formatCurrency(Math.abs(totals.netVAT))}
                                </span>
                            </div>
                        </div>

                        <Button 
                            onClick={handleClosePeriod} 
                            disabled={isFiling}
                            className={`w-full py-4 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg border-none ${
                                totals.netVAT >= 0 
                                ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                                : 'bg-green-600 hover:bg-green-700 text-white'
                            }`}
                        >
                            {isFiling ? 'Filing...' : (totals.netVAT >= 0 ? 'Finalize & Pay' : 'File & Carry Over')}
                        </Button>
                        <p className="text-[9px] text-center mt-3 opacity-50 text-slate-300">
                            Action creates a permanent tax record.
                        </p>
                    </div>
                    <Lock size={120} className="absolute -bottom-6 -right-6 text-slate-800 opacity-50 rotate-[-15deg]"/>
                </Card>

                {/* FILING HISTORY */}
                <Card className="border-0 shadow-sm">
                    <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                        <History size={16} className="text-gray-400"/>
                        <h4 className="font-black text-gray-600 uppercase text-xs tracking-widest">Filing History</h4>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                        {filingHistory.length === 0 && <p className="p-4 text-xs text-gray-400 italic">No filings recorded yet.</p>}
                        {filingHistory.map(record => (
                            <div key={record.id} className="p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors group">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold text-gray-800 text-xs">
                                        {months[record.periodMonth]} {record.periodYear}
                                    </span>
                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                                        record.action === 'PAYMENT_DUE' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                                    }`}>
                                        {record.action === 'PAYMENT_DUE' ? 'Paid' : 'Carried'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-400 text-[10px]">
                                        {new Date(record.filedAt?.seconds * 1000).toLocaleDateString()}
                                    </span>
                                    <span className="font-mono font-bold text-gray-600">
                                        {formatCurrency(record.action === 'PAYMENT_DUE' ? record.netAmount : record.carryOverAmount)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* NOTES & COMPLIANCE */}
                <div className="bg-yellow-50 p-6 rounded-2xl border border-yellow-100">
                    <div className="flex items-center gap-2 mb-4 text-yellow-700">
                        <AlertCircle size={20} />
                        <h4 className="font-black uppercase tracking-widest text-xs">BIR Compliance</h4>
                    </div>
                    <ul className="list-disc list-inside text-xs space-y-2 text-yellow-800">
                        <li>File <strong>Form 2550M/Q</strong> on or before the 20th/25th.</li>
                        <li><strong>Input VAT</strong> requires valid TINs.</li>
                        <li><strong>Zero-Rated Sales</strong> need proof of inward remittance.</li>
                        {isBOIMode && <li><strong>BOI Mode Active:</strong> Ensure all import entries are supported by Certificate of Authority (CA).</li>}
                    </ul>
                </div>
                
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h4 className="font-black uppercase tracking-widest text-xs text-gray-400 mb-4">Accountant Notes</h4>
                    <textarea 
                        className="w-full h-24 p-4 bg-gray-50 rounded-xl text-sm border-0 focus:ring-2 focus:ring-orange-500 resize-none"
                        placeholder="Notes for bookkeeper..."
                    ></textarea>
                </div>

            </div>
        </div>
    );
};

export default BIRBookPrep;
