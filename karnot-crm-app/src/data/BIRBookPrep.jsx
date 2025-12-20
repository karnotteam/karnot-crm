import React from 'react';
import { Card } from '../data/constants.jsx';

const BIRBookPrep = ({ quotes = [], ledgerEntries = [] }) => {
    // --- 1. SALES JOURNAL MATH (Output VAT) ---
    const invoicedQuotes = quotes.filter(q => 
        q.status === 'WON' || q.status === 'APPROVED' || q.status === 'INVOICED'
    );
    
    const totalGrossSales = invoicedQuotes.reduce((sum, q) => sum + (q.finalSalesPrice || 0), 0);
    // Standard 12% VAT logic for Sales
    const totalNetSales = totalGrossSales / 1.12;
    const totalOutputVat = totalGrossSales - totalNetSales;

    // --- 2. DISBURSEMENT JOURNAL MATH (Input VAT) ---
    // Critical: We only strip VAT from items marked as 'VAT'. 
    // NON-VAT/Overseas items contribute 0 to Box 20B.
    const totalInputVat = ledgerEntries.reduce((sum, e) => {
        const gross = parseFloat(e.amountPHP) || 0;
        if (e.taxStatus === 'NON-VAT') {
            return sum + 0; 
        }
        return sum + (gross - (gross / 1.12));
    }, 0);

    const totalGrossPurchases = ledgerEntries.reduce((sum, e) => sum + (parseFloat(e.amountPHP) || 0), 0);
    // Box 20B is the total Input VAT collected from domestic suppliers
    const netVatPayable = totalOutputVat - totalInputVat;

    return (
        <div className="space-y-10 pb-20">
            {/* Part II: Summary for eFPS Form 2550Q */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-white border border-gray-200 rounded shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Box 15B (Output VAT)</p>
                    <p className="text-xl font-black text-gray-800">₱{totalOutputVat.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                    <p className="text-[9px] text-gray-400 mt-1 italic">Total VAT from Sales</p>
                </div>
                <div className="p-4 bg-white border border-gray-200 rounded shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Box 20B (Input VAT)</p>
                    <p className="text-xl font-black text-blue-600">₱{totalInputVat.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                    <p className="text-[9px] text-gray-400 mt-1 italic">VAT from Domestic Purchases</p>
                </div>
                <div className={`p-4 rounded shadow-lg text-white md:col-span-2 flex flex-col justify-center ${netVatPayable >= 0 ? 'bg-slate-900' : 'bg-green-700'}`}>
                    <p className="text-[10px] text-orange-400 font-black uppercase tracking-[0.2em]">Box 26 (Net VAT Payable / Excess)</p>
                    <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-black">₱{netVatPayable.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                        <span className="text-[10px] opacity-70 font-bold uppercase">{netVatPayable >= 0 ? 'To Pay' : 'Excess Input'}</span>
                    </div>
                </div>
            </div>

            {/* Sales Journal Table (6-Column Book) */}
            <Card className="border-0 shadow-xl overflow-hidden">
                <div className="p-4 bg-gray-50 border-b">
                    <h2 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em]">Sales Journal (6-Column Book Data)</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-white text-gray-400 uppercase text-[9px] font-black tracking-widest">
                            <tr>
                                <th className="p-4 border-b">Date</th>
                                <th className="p-4 border-b">Quote/SI #</th>
                                <th className="p-4 border-b">Customer</th>
                                <th className="p-4 border-b text-right">Net Sales (PHP)</th>
                                <th className="p-4 border-b text-right">VAT Output</th>
                                <th className="p-4 border-b text-right">Gross Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {invoicedQuotes.map(q => {
                                const gross = q.finalSalesPrice || 0;
                                const net = gross / 1.12;
                                const vat = gross - net;
                                return (
                                    <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4 font-medium text-gray-600">
                                            {q.lastModified?.seconds 
                                                ? new Date(q.lastModified.seconds * 1000).toLocaleDateString() 
                                                : new Date().toLocaleDateString()}
                                        </td>
                                        <td className="p-4 font-mono font-bold text-orange-600">{q.id}</td>
                                        <td className="p-4 uppercase font-black text-gray-700">{q.customer?.name || 'Walk-in'}</td>
                                        <td className="p-4 text-right font-mono">₱{net.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                        <td className="p-4 text-right font-mono text-gray-500">₱{vat.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                        <td className="p-4 text-right font-black bg-gray-50/50">₱{gross.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Disbursement Journal Table (8-Column Book) */}
            <Card className="border-0 shadow-xl overflow-hidden">
                <div className="p-4 bg-gray-50 border-b">
                    <h2 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em]">Disbursement Journal (8-Column Book Data)</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-white text-gray-400 uppercase text-[9px] font-black tracking-widest">
                            <tr>
                                <th className="p-4 border-b">Date</th>
                                <th className="p-4 border-b">OR / Ref</th>
                                <th className="p-4 border-b">Payee / Description</th>
                                <th className="p-4 border-b">Supplier TIN</th>
                                <th className="p-4 border-b text-right">Gross</th>
                                <th className="p-4 border-b text-right">VAT Input</th>
                                <th className="p-4 border-b text-right">Net Purchase</th>
                                <th className="p-4 border-b">Account Title</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {ledgerEntries.map(e => {
                                const gross = parseFloat(e.amountPHP) || 0;
                                const isNonVat = e.taxStatus === 'NON-VAT';
                                
                                // Logic: If Non-VAT, input tax is 0 and Net is 100% of Gross
                                const vatInput = isNonVat ? 0 : (gross - (gross / 1.12));
                                const netPurchase = isNonVat ? gross : (gross / 1.12);

                                return (
                                    <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4 whitespace-nowrap text-gray-500">{e.date}</td>
                                        <td className="p-4 font-mono text-gray-600">{e.reference || 'N/A'}</td>
                                        <td className="p-4">
                                            <div className="font-bold text-gray-800 truncate max-w-[180px]">{e.description || 'General Expense'}</div>
                                            {isNonVat && <span className="text-[8px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-black uppercase">Import / No VAT</span>}
                                        </td>
                                        <td className={`p-4 font-mono font-medium ${!e.supplierTIN && !isNonVat ? 'text-red-500 bg-red-50/50' : 'text-gray-400'}`}>
                                            {isNonVat ? 'EXEMPT/OVERSEAS' : (e.supplierTIN || 'MISSING TIN')}
                                        </td>
                                        <td className="p-4 text-right font-black text-gray-700">₱{gross.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                        <td className={`p-4 text-right font-mono ${isNonVat ? 'text-gray-300 italic' : 'text-blue-500'}`}>
                                            ₱{vatInput.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                        </td>
                                        <td className="p-4 text-right font-mono font-bold text-gray-900">₱{netPurchase.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 bg-orange-50 text-orange-700 rounded-lg font-black text-[10px] uppercase">
                                                {e.subCategory || 'Uncategorized'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default BIRBookPrep;
