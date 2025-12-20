import React from 'react';
import { Card } from '../data/constants.jsx';

const BIRBookPrep = ({ quotes = [], ledgerEntries = [] }) => {
    return (
        <div className="space-y-10">
            {/* 6-COLUMN BOOK: SALES JOURNAL */}
            <Card className="border-t-4 border-orange-500 shadow-lg">
                <div className="mb-4">
                    <h2 className="text-xl font-bold uppercase tracking-wider text-orange-700">6-Column Book: Sales Journal</h2>
                    <p className="text-xs text-gray-500 italic">Transcribe these to your physical Sales Journal book.</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-[11px] text-left border-collapse border border-gray-200">
                        <thead className="bg-gray-100 font-bold uppercase">
                            <tr>
                                <th className="p-2 border">Date</th>
                                <th className="p-2 border">Invoice #</th>
                                <th className="p-2 border">Customer Name</th>
                                <th className="p-2 border text-right">Net Sales (VATable)</th>
                                <th className="p-2 border text-right">VAT Output (12%)</th>
                                <th className="p-2 border text-right">Gross Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {quotes.filter(q => q.status === 'Invoiced' || q.status === 'Won').map(q => {
                                const total = q.finalSalesPrice || 0;
                                const net = total / 1.12;
                                const vat = total - net;
                                return (
                                    <tr key={q.id} className="hover:bg-orange-50">
                                        <td className="p-2 border whitespace-nowrap">{new Date(q.lastModified?.seconds * 1000).toLocaleDateString()}</td>
                                        <td className="p-2 border font-bold text-orange-600">{q.id}</td>
                                        <td className="p-2 border uppercase">{q.customer?.name}</td>
                                        <td className="p-2 border text-right font-mono">₱{net.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                        <td className="p-2 border text-right font-mono text-orange-700">₱{vat.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                        <td className="p-2 border text-right font-bold font-mono bg-gray-50">₱{total.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* 8-COLUMN BOOK: DISBURSEMENTS */}
            <Card className="border-t-4 border-blue-600 shadow-lg">
                <div className="mb-4">
                    <h2 className="text-xl font-bold uppercase tracking-wider text-blue-700">8-Column Book: Disbursement Journal</h2>
                    <p className="text-xs text-gray-500 italic">Use the Supplier TIN column for your VAT Input claims.</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-[11px] text-left border-collapse border border-gray-200">
                        <thead className="bg-gray-100 font-bold uppercase">
                            <tr>
                                <th className="p-2 border">Date</th>
                                <th className="p-2 border">Ref (OR#)</th>
                                <th className="p-2 border">Payee/Supplier</th>
                                <th className="p-2 border text-blue-700">Supplier TIN</th>
                                <th className="p-2 border text-right">Gross Amount</th>
                                <th className="p-2 border text-right">VAT Input (12%)</th>
                                <th className="p-2 border text-right">Net Purchase</th>
                                <th className="p-2 border">Account Title</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ledgerEntries.map(e => {
                                const gross = parseFloat(e.amountPHP) || 0;
                                // BIR Formula for Input VAT: Gross / 9.333 or (Gross / 1.12) * 0.12
                                const net = gross / 1.12;
                                const vatInput = gross - net;
                                return (
                                    <tr key={e.id} className="hover:bg-blue-50">
                                        <td className="p-2 border whitespace-nowrap">{e.date}</td>
                                        <td className="p-2 border font-bold">{e.reference || 'N/A'}</td>
                                        <td className="p-2 border uppercase truncate max-w-[150px]">{e.description}</td>
                                        <td className="p-2 border font-mono text-blue-700">{e.supplierTIN || 'PENDING'}</td>
                                        <td className="p-2 border text-right font-mono font-bold">₱{gross.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                        <td className="p-2 border text-right font-mono text-blue-600">₱{vatInput.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                        <td className="p-2 border text-right font-mono">₱{net.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                        <td className="p-2 border uppercase text-[9px] font-bold text-gray-600">{e.subCategory}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>

            <div className="bg-gray-800 text-white p-6 rounded-xl shadow-inner">
                <h3 className="font-bold text-orange-400 flex items-center gap-2 mb-2">
                    💡 BIR Transcription Tip
                </h3>
                <p className="text-sm opacity-90">
                    Your 8-column book requires an <strong>Account Title</strong> for the last column. 
                    I have mapped your <strong>Sub-Category</strong> directly to this field so you know exactly 
                    which section of your General Ledger to post these totals to.
                </p>
            </div>
        </div>
    );
};

export default BIRBookPrep;
