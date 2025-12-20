import React from 'react';
import { Card } from '../data/constants.jsx';

const BIRBookPrep = ({ quotes = [], ledgerEntries = [] }) => {
    return (
        <div className="space-y-10">
            {/* 6-COLUMN BOOK: SALES JOURNAL */}
            <Card className="border-t-4 border-orange-500">
                <h2 className="text-lg font-bold mb-4 uppercase tracking-wider text-orange-700">6-Column Book: Sales Journal</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-[10px] text-left border-collapse border">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-2 border">Date</th>
                                <th className="p-2 border">Invoice #</th>
                                <th className="p-2 border">Customer</th>
                                <th className="p-2 border">Net Sales</th>
                                <th className="p-2 border">VAT Output (12%)</th>
                                <th className="p-2 border">Gross Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {quotes.filter(q => q.status === 'Invoiced').map(q => (
                                <tr key={q.id}>
                                    <td className="p-2 border">{new Date(q.lastModified?.seconds * 1000).toLocaleDateString()}</td>
                                    <td className="p-2 border font-bold">{q.id}</td>
                                    <td className="p-2 border">{q.customer?.name}</td>
                                    <td className="p-2 border">₱{(q.finalSalesPrice / 1.12).toFixed(2)}</td>
                                    <td className="p-2 border">₱{(q.finalSalesPrice - (q.finalSalesPrice / 1.12)).toFixed(2)}</td>
                                    <td className="p-2 border font-bold">₱{q.finalSalesPrice?.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* 8-COLUMN BOOK: DISBURSEMENTS */}
            <Card className="border-t-4 border-blue-600">
                <h2 className="text-lg font-bold mb-4 uppercase tracking-wider text-blue-700">8-Column Book: Disbursement Journal</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-[10px] text-left border-collapse border">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-1 border text-center">Date</th>
                                <th className="p-1 border">Ref (OR)</th>
                                <th className="p-1 border">Payee</th>
                                <th className="p-1 border">TIN</th>
                                <th className="p-1 border text-right">Total</th>
                                <th className="p-1 border text-right">VAT Input</th>
                                <th className="p-1 border text-right">Net</th>
                                <th className="p-1 border">Account Title</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ledgerEntries.map(e => (
                                <tr key={e.id}>
                                    <td className="p-1 border">{e.date}</td>
                                    <td className="p-1 border font-bold">{e.reference}</td>
                                    <td className="p-1 border">{e.description?.substring(0, 15)}...</td>
                                    <td className="p-1 border">--</td>
                                    <td className="p-1 border text-right">₱{e.amountPHP}</td>
                                    <td className="p-1 border text-right">₱{(parseFloat(e.amountPHP) * 0.1071).toFixed(2)}</td>
                                    <td className="p-1 border text-right">₱{(parseFloat(e.amountPHP) / 1.12).toFixed(2)}</td>
                                    <td className="p-1 border uppercase font-bold text-blue-800">{e.subCategory}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default BIRBookPrep;
