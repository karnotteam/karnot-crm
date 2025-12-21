import React, { useState, useMemo } from 'react';
import { Card, Button } from '../data/constants.jsx'; 
import { Printer, BookOpen, FileText, PieChart, TrendingUp, AlertTriangle } from 'lucide-react';

const BIRBookPrep = ({ quotes = [], ledgerEntries = [] }) => {
    // --- STATE ---
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [activeBook, setActiveBook] = useState('SALES'); // SALES, RECEIPT, PURCHASE, DISBURSEMENT, GENERAL, LEDGER

    // --- HELPER: DATE FILTERING ---
    const filterByDate = (items, dateField) => {
        return items.filter(item => {
            if (!item[dateField]) return false;
            // Handle Firestore Timestamp or String
            const date = item[dateField].seconds ? new Date(item[dateField].seconds * 1000) : new Date(item[dateField]);
            return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
        });
    };

    // --- 1. SALES JOURNAL & CASH RECEIPT (Revenue) ---
    const salesData = useMemo(() => {
        // Filter for valid revenue-generating quotes
        const revenueQuotes = quotes.filter(q => ['WON', 'APPROVED', 'INVOICED'].includes(q.status));
        const filtered = filterByDate(revenueQuotes, 'createdAt');

        return filtered.map(q => {
            const rate = q.costing?.forexRate || 58.5;
            const isExport = q.customer?.saleType === 'Export';
            const grossUSD = Number(q.finalSalesPrice || 0);
            const grossPHP = grossUSD * rate;

            let vatableSales = 0;
            let vatOutput = 0;
            let zeroRated = 0;

            if (isExport) {
                zeroRated = grossPHP;
            } else {
                // Domestic: Gross is VAT Inclusive
                vatableSales = grossPHP / 1.12;
                vatOutput = grossPHP - vatableSales;
            }

            return { 
                date: q.createdAt, 
                ref: q.id, 
                customer: q.customer?.name || 'Walk-in', 
                tin: q.customer?.tin || '000-000-000',
                grossPHP, 
                vatableSales, 
                vatOutput, 
                zeroRated
            };
        });
    }, [quotes, selectedMonth, selectedYear]);

    // --- 2. PURCHASE & DISBURSEMENT JOURNAL (Expenses) ---
    const expenseData = useMemo(() => {
        const filtered = filterByDate(ledgerEntries, 'date');

        return filtered.map(e => {
            const grossPHP = parseFloat(e.amountPHP) || 0;
            const isNonVat = e.taxStatus === 'NON-VAT';
            
            let netPurchase = 0;
            let inputVat = 0;

            if (isNonVat) {
                netPurchase = grossPHP;
            } else {
                netPurchase = grossPHP / 1.12;
                inputVat = grossPHP - netPurchase;
            }

            return {
                id: e.id,
                date: e.date,
                payee: e.supplierName || e.description || 'Unknown',
                tin: e.supplierTIN || '000-000-000',
                ref: e.reference || 'N/A',
                category: e.category,
                subCategory: e.subCategory,
                grossPHP,
                netPurchase,
                inputVat,
                isNonVat
            };
        });
    }, [ledgerEntries, selectedMonth, selectedYear]);

    // --- 3. GENERAL LEDGER (Aggregation) ---
    const generalLedgerSummary = useMemo(() => {
        const summary = {};
        
        // Summarize Expenses
        expenseData.forEach(e => {
            const key = e.subCategory || 'Uncategorized Expense';
            if (!summary[key]) summary[key] = { debit: 0, credit: 0, count: 0 };
            summary[key].debit += e.netPurchase; // Expenses are Debits
            summary[key].count += 1;
        });

        // Summarize Sales
        const totalSalesNet = salesData.reduce((sum, s) => sum + (s.vatableSales + s.zeroRated), 0);
        if (totalSalesNet > 0) {
            summary['Sales Revenue'] = { debit: 0, credit: totalSalesNet, count: salesData.length }; // Revenue is Credit
        }

        return Object.entries(summary).sort((a, b) => b[1].debit - a[1].debit);
    }, [expenseData, salesData]);

    // --- 4. VAT COMPUTATION (For 2550Q) ---
    const totals = useMemo(() => {
        const outputVAT = salesData.reduce((sum, i) => sum + i.vatOutput, 0);
        const inputVAT = expenseData.reduce((sum, i) => sum + i.inputVat, 0);
        const netVAT = outputVAT - inputVAT;
        
        const totalSales = salesData.reduce((sum, i) => sum + i.grossPHP, 0);
        const totalPurchases = expenseData.reduce((sum, i) => sum + i.grossPHP, 0);

        return { outputVAT, inputVAT, netVAT, totalSales, totalPurchases };
    }, [salesData, expenseData]);

    // --- HELPERS ---
    const formatCurrency = (val) => `₱${val.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];

    return (
        <div className="space-y-8 pb-20">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-[30px] shadow-sm border border-gray-100 gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-orange-100 text-orange-600 rounded-2xl">
                        <BookOpen size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tight">BIR Books of Accounts</h1>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Compliance & Reporting Module</p>
                    </div>
                </div>
                
                <div className="flex gap-2">
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
                    <Button onClick={() => window.print()} variant="secondary" className="px-6 rounded-xl font-bold uppercase text-xs">
                        <Printer size={16} className="mr-2"/> Print Books
                    </Button>
                </div>
            </div>

            {/* TAX SUMMARY CARDS (2550Q) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 border-l-4 border-blue-500 bg-white shadow-md">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">Output VAT (Sales)</p>
                    <p className="text-3xl font-black text-gray-800">{formatCurrency(totals.outputVAT)}</p>
                    <p className="text-[10px] font-bold text-blue-600 mt-1 uppercase">Form 2550Q: Box 15B</p>
                </Card>

                <Card className="p-6 border-l-4 border-red-500 bg-white shadow-md">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">Input VAT (Purchases)</p>
                    <p className="text-3xl font-black text-gray-800">{formatCurrency(totals.inputVAT)}</p>
                    <p className="text-[10px] font-bold text-red-600 mt-1 uppercase">Form 2550Q: Box 20B</p>
                </Card>

                <Card className={`p-6 border-l-4 shadow-md text-white ${totals.netVAT >= 0 ? 'bg-slate-800 border-orange-500' : 'bg-green-700 border-green-400'}`}>
                    <p className="text-[10px] text-gray-300 font-black uppercase tracking-widest mb-2">Net VAT Payable</p>
                    <p className="text-3xl font-black">{formatCurrency(totals.netVAT)}</p>
                    <p className="text-[10px] font-bold text-orange-400 mt-1 uppercase">
                        {totals.netVAT >= 0 ? 'Remit to BIR (Box 26)' : 'Excess Input / Carry Over'}
                    </p>
                </Card>
            </div>

            {/* BOOKS NAVIGATION TABS */}
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
                        className={`px-4 py-3 rounded-t-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${
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
            <Card className="rounded-b-[30px] rounded-tr-[30px] border-none shadow-xl overflow-hidden bg-white min-h-[500px]">
                
                {/* 1. SALES JOURNAL */}
                {activeBook === 'SALES' && (
                    <div className="overflow-x-auto">
                        <div className="p-4 bg-orange-50/50 border-b border-orange-100 flex justify-between items-center">
                            <h3 className="text-xs font-black text-orange-800 uppercase tracking-widest">Sales Journal (SJ)</h3>
                            <span className="text-[10px] font-bold text-orange-600 bg-white px-2 py-1 rounded border border-orange-200">
                                Total Gross: {formatCurrency(totals.totalSales)}
                            </span>
                        </div>
                        <table className="w-full text-xs text-left">
                            <thead className="bg-gray-50 text-gray-500 uppercase font-black text-[9px] tracking-widest">
                                <tr>
                                    <th className="p-4 border-b">Date</th>
                                    <th className="p-4 border-b">Ref No. (SI)</th>
                                    <th className="p-4 border-b">Customer Name</th>
                                    <th className="p-4 border-b">TIN</th>
                                    <th className="p-4 border-b text-right">Zero-Rated (Export)</th>
                                    <th className="p-4 border-b text-right">VATable Sales</th>
                                    <th className="p-4 border-b text-right">Output VAT (12%)</th>
                                    <th className="p-4 border-b text-right">Gross Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {salesData.length === 0 ? (
                                    <tr><td colSpan="8" className="p-8 text-center text-gray-400 italic">No sales recorded for {months[selectedMonth]} {selectedYear}.</td></tr>
                                ) : (
                                    salesData.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4 text-gray-500">{new Date(row.date).toLocaleDateString()}</td>
                                            <td className="p-4 font-mono text-orange-600 font-bold">{row.ref}</td>
                                            <td className="p-4 font-bold text-gray-800">{row.customer}</td>
                                            <td className="p-4 font-mono text-gray-400">{row.tin}</td>
                                            <td className="p-4 text-right font-mono">{row.zeroRated > 0 ? formatCurrency(row.zeroRated) : '-'}</td>
                                            <td className="p-4 text-right font-mono">{row.vatableSales > 0 ? formatCurrency(row.vatableSales) : '-'}</td>
                                            <td className="p-4 text-right font-mono text-blue-600">{row.vatOutput > 0 ? formatCurrency(row.vatOutput) : '-'}</td>
                                            <td className="p-4 text-right font-black text-gray-800">{formatCurrency(row.grossPHP)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* 2. CASH RECEIPT JOURNAL (Proxy) */}
                {activeBook === 'RECEIPT' && (
                    <div className="p-8 text-center">
                        <div className="bg-yellow-50 p-6 rounded-2xl border border-yellow-100 max-w-2xl mx-auto">
                            <AlertTriangle className="mx-auto text-yellow-500 mb-4" size={32}/>
                            <h3 className="text-lg font-black text-yellow-800 mb-2">Cash Receipt Book (CRB)</h3>
                            <p className="text-sm text-yellow-700 mb-4">
                                This book tracks actual collections. Currently, the system uses "Sales Invoices" as a proxy for receivables. 
                                Ensure Official Receipts (OR) are issued manually and logged.
                            </p>
                            <div className="text-left text-xs bg-white p-4 rounded-xl border border-yellow-200">
                                <strong>Compliance Note:</strong> For PEZA/Export, receipts must be supported by "Certificate of Inward Remittance" from your bank.
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. PURCHASE / DISBURSEMENT JOURNAL */}
                {(activeBook === 'PURCHASE' || activeBook === 'DISBURSEMENT') && (
                    <div className="overflow-x-auto">
                        <div className="p-4 bg-blue-50/50 border-b border-blue-100 flex justify-between items-center">
                            <h3 className="text-xs font-black text-blue-800 uppercase tracking-widest">
                                {activeBook === 'PURCHASE' ? 'Purchase Journal (PJ)' : 'Cash Disbursement Journal (CDJ)'}
                            </h3>
                            <span className="text-[10px] font-bold text-blue-600 bg-white px-2 py-1 rounded border border-blue-200">
                                Total: {formatCurrency(totals.totalPurchases)}
                            </span>
                        </div>
                        <table className="w-full text-xs text-left">
                            <thead className="bg-gray-50 text-gray-500 uppercase font-black text-[9px] tracking-widest">
                                <tr>
                                    <th className="p-4 border-b">Date</th>
                                    <th className="p-4 border-b">Ref / OR #</th>
                                    <th className="p-4 border-b">Supplier / Payee</th>
                                    <th className="p-4 border-b">TIN</th>
                                    <th className="p-4 border-b">Account Title</th>
                                    <th className="p-4 border-b text-right">Net Purchase</th>
                                    <th className="p-4 border-b text-right">Input VAT</th>
                                    <th className="p-4 border-b text-right">Gross Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {expenseData.length === 0 ? (
                                    <tr><td colSpan="8" className="p-8 text-center text-gray-400 italic">No entries found.</td></tr>
                                ) : (
                                    expenseData.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4 text-gray-500">{row.date}</td>
                                            <td className="p-4 font-mono text-gray-500">{row.ref}</td>
                                            <td className="p-4 font-bold text-gray-800">{row.payee}</td>
                                            <td className="p-4 font-mono text-gray-400">{row.tin}</td>
                                            <td className="p-4">
                                                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-[9px] uppercase font-bold">
                                                    {row.subCategory || row.category}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right font-mono">{formatCurrency(row.netPurchase)}</td>
                                            <td className="p-4 text-right font-mono text-red-500">{row.inputVat > 0 ? formatCurrency(row.inputVat) : '-'}</td>
                                            <td className="p-4 text-right font-black text-gray-800">{formatCurrency(row.grossPHP)}</td>
                                        </tr>
                                    ))
                                )}
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
                                    <h4 className="font-black text-gray-700 uppercase text-xs tracking-widest">Account Summaries (Debits)</h4>
                                </div>
                                <table className="w-full text-xs">
                                    <thead className="bg-gray-50 text-gray-400 text-[9px] uppercase font-bold">
                                        <tr>
                                            <th className="p-3 text-left">Account Title</th>
                                            <th className="p-3 text-center">Trans. Count</th>
                                            <th className="p-3 text-right">Debit Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {generalLedgerSummary.map(([account, data]) => (
                                            data.debit > 0 && (
                                                <tr key={account}>
                                                    <td className="p-3 font-bold text-gray-700">{account}</td>
                                                    <td className="p-3 text-center text-gray-400">{data.count}</td>
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

                {/* 5. GENERAL JOURNAL (Raw Chronological) */}
                {activeBook === 'GENERAL' && (
                    <div className="p-8 text-center text-gray-400 italic">
                        <p>The General Journal (GJ) captures all adjusting entries and non-cash transactions.</p>
                        <p className="text-xs mt-2">(Module ready for Journal Entry Voucher (JEV) implementation)</p>
                    </div>
                )}

            </Card>
        </div>
    );
};

export default BIRBookPrep;
