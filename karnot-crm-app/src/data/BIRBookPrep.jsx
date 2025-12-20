import React from 'react';
import { Card } from '../data/constants.jsx';

const BIRBookPrep = ({ quotes = [], ledgerEntries = [] }) => {
    // Math logic for the quarter
    const invoicedQuotes = quotes.filter(q => q.status === 'Invoiced' || q.status === 'Won');
    const totalGrossSales = invoicedQuotes.reduce((sum, q) => sum + (q.finalSalesPrice || 0), 0);
    const totalNetSales = totalGrossSales / 1.12;
    const totalOutputVat = totalGrossSales - totalNetSales;

    const totalGrossPurchases = ledgerEntries.reduce((sum, e) => sum + (parseFloat(e.amountPHP) || 0), 0);
    const totalNetPurchases = totalGrossPurchases / 1.12;
    const totalInputVat = totalGrossPurchases - totalNetPurchases;

    return (
        <div className="space-y-8 pb-20">
            {/* --- DYSLEXIA FRIENDLY FORM MAP --- */}
            <Card className="border-l-8 border-orange-500 bg-white shadow-xl">
                <div className="bg-orange-600 p-4 -m-6 mb-6 rounded-t-lg">
                    <h2 className="text-white text-2xl font-black uppercase">Filing Assistant: Form 2550Q</h2>
                    <p className="text-orange-100 text-sm italic">Match these boxes to the boxes on your screen in eFPS</p>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {/* STEP 1: SALES */}
                    <div className="p-6 border-2 border-orange-100 rounded-xl bg-orange-50/30">
                        <h3 className="text-orange-700 font-black mb-4 flex items-center gap-2">
                            <span className="bg-orange-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">1</span> 
                            PART II: SALES (Where money came in)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded border shadow-sm">
                                <span className="text-[10px] text-gray-400 font-bold block">BOX 15A (Vatable Sales)</span>
                                <span className="text-2xl font-mono font-black text-gray-800">₱{totalNetSales.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                            </div>
                            <div className="bg-white p-4 rounded border shadow-sm border-orange-200">
                                <span className="text-[10px] text-orange-400 font-bold block">BOX 15B (Output Tax)</span>
                                <span className="text-2xl font-mono font-black text-orange-600">₱{totalOutputVat.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                            </div>
                        </div>
                    </div>

                    {/* STEP 2: PURCHASES */}
                    <div className="p-6 border-2 border-blue-100 rounded-xl bg-blue-50/30">
                        <h3 className="text-blue-700 font-black mb-4 flex items-center gap-2">
                            <span className="bg-blue-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">2</span> 
                            PART II: PURCHASES (Where money went out)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded border shadow-sm">
                                <span className="text-[10px] text-gray-400 font-bold block">BOX 20A (Domestic Purchases)</span>
                                <span className="text-2xl font-mono font-black text-gray-800">₱{totalNetPurchases.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                            </div>
                            <div className="bg-white p-4 rounded border shadow-sm border-blue-200">
                                <span className="text-[10px] text-blue-400 font-bold block">BOX 20B (Input Tax)</span>
                                <span className="text-2xl font-mono font-black text-blue-600">₱{totalInputVat.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                            </div>
                        </div>
                    </div>

                    {/* STEP 3: THE TOTAL */}
                    <div className="p-6 bg-slate-900 rounded-xl text-white">
                        <div className="flex justify-between items-center">
                            <div>
                                <span className="text-[10px] text-orange-400 font-bold block uppercase tracking-widest">BOX 26 (Tax Payable / Overpayment)</span>
                                <h4 className="text-3xl font-black">₱{(totalOutputVat - totalInputVat).toLocaleString(undefined, {minimumFractionDigits: 2})}</h4>
                            </div>
                            <div className="text-right text-xs text-gray-400 max-w-[200px]">
                                If this number is MINUS (-), you don't pay anything. You just file it.
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* The Detailed Journal Tables (The ones we built before) go here */}
            {/* ... (Keep the Sales Journal and Disbursement Journal tables below this) ... */}
        </div>
    );
};

export default BIRBookPrep;
