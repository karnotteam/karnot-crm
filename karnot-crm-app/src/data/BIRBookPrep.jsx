import React from 'react';
import { Card } from '../data/constants.jsx';

const BIRBookPrep = ({ quotes = [], ledgerEntries = [] }) => {
    // Math for the Summary
    const invoicedQuotes = quotes.filter(q => q.status === 'WON' || q.status === 'APPROVED' || q.status === 'INVOICED');
    const totalGrossSales = invoicedQuotes.reduce((sum, q) => sum + (q.finalSalesPrice || 0), 0);
    const totalNetSales = totalGrossSales / 1.12;
    const totalOutputVat = totalGrossSales - totalNetSales;

    const totalGrossPurchases = ledgerEntries.reduce((sum, e) => sum + (parseFloat(e.amountPHP) || 0), 0);
    const totalNetPurchases = totalGrossPurchases / 1.12;
    const totalInputVat = totalGrossPurchases - totalNetPurchases;

    return (
        <div className="space-y-10 pb-20">
            {/* Part II: Summary for eFPS Form 2550Q */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-white border border-gray-200 rounded shadow-sm">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Box 15B (Output VAT)</p>
                    <p className="text-xl font-bold">₱{totalOutputVat.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                </div>
                <div className="p-4 bg-white border border-gray-200 rounded shadow-sm">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Box 20B (Input VAT)</p>
                    <p className="text-xl font-bold">₱{totalInputVat.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                </div>
                <div className="p-4 bg-slate-800 text-white rounded shadow-sm md:col-span-2">
                    <p className="text-[10px] text-orange-400 font-bold uppercase">Box 26 (Net VAT Payable)</p>
                    <p className="text-xl font-bold">₱{(totalOutputVat - totalInputVat).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                </div>
            </div>

            {/* Sales Journal Table */}
            <Card>
                <h2 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wider">Sales Journal (6-Column Book Data)</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse border border-gray-100">
                        <thead className="bg-gray-50 text-gray-500 uppercase">
                            <tr>
                                <th className="p-2 border">Date</th>
                                <th className="p-2 border">Quote/SI #</th>
                                <th className="p-2 border">Customer</th>
                                <th className="p-2 border text-right">Net Sales (PHP)</th>
                                <th className="p-2 border text-right">VAT Output</th>
                                <th className="p-2 border text-right">Gross Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoicedQuotes.map(q => (
                                <tr key={q.id} className="hover:bg-gray-50">
                                    <td className="p-2 border">{new Date(q.lastModified?.seconds * 1000).toLocaleDateString()}</td>
                                    <td className="p-2 border font-mono">{q.id}</td>
                                    <td className="p-2 border uppercase font-medium">{q.customer?.name}</td>
                                    <td className="p-2 border text-right">₱{(q.finalSalesPrice / 1.12).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                    <td className="p-2 border text-right">₱{(q.finalSalesPrice - (q.finalSalesPrice / 1.12)).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                    <td className="p-2 border text-right font-bold bg-gray-50">₱{q.finalSalesPrice?.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Disbursement Journal Table */}
            <Card>
                <h2 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wider">Disbursement Journal (8-Column Book Data)</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse border border-gray-100">
                        <thead className="bg-gray-50 text-gray-500 uppercase">
                            <tr>
                                <th className="p-2 border">Date</th>
                                <th className="p-2 border">OR Reference</th>
                                <th className="p-2 border">Payee/Supplier</th>
                                <th className="p-2 border">Supplier TIN</th>
                                <th className="p-2 border text-right">Gross</th>
                                <th className="p-2 border text-right">VAT Input</th>
                                <th className="p-2 border text-right">Net Purchase</th>
                                <th className="p-2 border">Account Title</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ledgerEntries.map(e => {
                                const gross = parseFloat(e.amountPHP) || 0;
                                const net = gross / 1.12;
                                return (
                                    <tr key={e.id} className="hover:bg-gray-50">
                                        <td className="p-2 border whitespace-nowrap">{e.date}</td>
                                        <td className="p-2 border font-mono">{e.reference}</td>
                                        <td className="p-2 border truncate max-w-[150px]">{e.description}</td>
                                        <td className={`p-2 border font-mono ${!e.supplierTIN ? 'bg-red-50 text-red-600' : ''}`}>
                                            {e.supplierTIN || 'TIN MISSING'}
                                        </td>
                                        <td className="p-2 border text-right font-bold">₱{gross.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                        <td className="p-2 border text-right">₱{(gross - net).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                        <td className="p-2 border text-right">₱{net.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                        <td className="p-2 border uppercase font-bold text-blue-800">{e.subCategory}</td>
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
