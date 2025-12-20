import React, { useState } from 'react';
import { Card, Button, Input } from '../data/constants.jsx';
import { Calculator, AlertTriangle, TrendingDown, Landmark, Clock } from 'lucide-react';

const ProjectOperations = ({ quotes = [], manpowerLogs = [], ledgerEntries = [] }) => {
    const [selectedQuoteId, setSelectedQuoteId] = useState('');

    // Fix: Match uppercase status from QuotesListPage
    const activeProjects = quotes.filter(q => 
        q.status === 'WON' || q.status === 'APPROVED' || q.status === 'INVOICED'
    );

    const selectedQuote = activeProjects.find(q => q.id === selectedQuoteId);
    
    // Link to Company/Client ID for expenses and labor
    const clientId = selectedQuote?.customer?.id;

    const projectExpenses = ledgerEntries
        .filter(e => e.companyId === clientId)
        .reduce((sum, e) => sum + parseFloat(e.amountPHP || 0), 0);

    const projectManpower = manpowerLogs
        .filter(m => m.companyId === clientId)
        .reduce((sum, m) => sum + parseFloat(m.totalCost || 0), 0);

    const totalActualCost = projectExpenses + projectManpower;

    // Logic: Use the saved totalCost, or fallback to 50% of sales price as the "Equipment Cost"
    const equipmentCost = selectedQuote?.totalCost || (selectedQuote?.finalSalesPrice * 0.5);
    const grossMargin = (selectedQuote?.finalSalesPrice || 0) - equipmentCost; 
    const netProfit = grossMargin - totalActualCost;

    return (
        <div className="space-y-6">
            <Card className="border-t-4 border-purple-600 shadow-lg">
                <div className="mb-6">
                    <h2 className="text-xl font-black flex items-center gap-2 text-gray-800 uppercase tracking-tight">
                        <Calculator className="text-purple-600" /> Project ROI & Margin Watch
                    </h2>
                    <p className="text-gray-500 text-xs italic">Tracking project "Burn" against your 50% absorbed equipment margin.</p>
                </div>

                <select 
                    className="w-full p-4 border-2 border-purple-100 rounded-2xl bg-white font-bold text-gray-700 outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    value={selectedQuoteId}
                    onChange={(e) => setSelectedQuoteId(e.target.value)}
                >
                    <option value="">-- SELECT AN ACTIVE PROJECT ({activeProjects.length}) --</option>
                    {activeProjects.map(q => (
                        <option key={q.id} value={q.id}>{q.id} - {q.customer?.name}</option>
                    ))}
                </select>

                {selectedQuote ? (
                    <div className="mt-10 space-y-8">
                        {/* Summary Row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-5 bg-green-50 rounded-2xl border-2 border-green-100">
                                <p className="text-[10px] uppercase text-green-700 font-black mb-1">Equipment Buffer (50%)</p>
                                <p className="text-2xl font-black text-green-800">₱{grossMargin.toLocaleString()}</p>
                            </div>
                            <div className="p-5 bg-red-50 rounded-2xl border-2 border-red-100 text-right">
                                <p className="text-[10px] uppercase text-red-700 font-black mb-1">Ops Burn (Labor + Exp)</p>
                                <p className="text-2xl font-black text-red-800">₱{totalActualCost.toLocaleString()}</p>
                            </div>
                            <div className={`p-5 rounded-2xl shadow-xl text-white ${netProfit > 0 ? 'bg-purple-600' : 'bg-red-600'}`}>
                                <p className="text-[10px] uppercase opacity-80 font-black mb-1">Remaining Net Profit</p>
                                <p className="text-3xl font-black">₱{netProfit.toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Breakdown */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-dashed">
                            <div className="flex justify-between items-center text-sm p-3 bg-gray-50 rounded-lg">
                                <span className="text-gray-500 flex items-center gap-2"><Clock size={14}/> Total Manpower Cost</span>
                                <span className="font-bold text-gray-700">₱{projectManpower.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm p-3 bg-gray-50 rounded-lg">
                                <span className="text-gray-500 flex items-center gap-2"><Landmark size={14}/> Project Expenses</span>
                                <span className="font-bold text-gray-700">₱{projectExpenses.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="mt-10 text-center py-10 border-2 border-dashed rounded-2xl text-gray-300 font-bold uppercase tracking-widest">
                        Select a project above to view ROI
                    </div>
                )}
            </Card>
        </div>
    );
};

export default ProjectOperations;
