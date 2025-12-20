import React, { useState } from 'react';
import { Card, Button, Input } from '../data/constants.jsx';
import { Calculator, AlertTriangle, TrendingDown } from 'lucide-react';

const ProjectOperations = ({ quotes = [], manpowerLogs = [], ledgerEntries = [] }) => {
    const [selectedQuoteId, setSelectedQuoteId] = useState('');

    const selectedQuote = quotes.find(q => q.id === selectedQuoteId);
    
    // Calculate actual costs linked to this specific project/company
    const projectExpenses = ledgerEntries
        .filter(e => e.companyId === selectedQuote?.customer?.id)
        .reduce((sum, e) => sum + parseFloat(e.amountPHP || 0), 0);

    const projectManpower = manpowerLogs
        .filter(m => m.companyId === selectedQuote?.customer?.id)
        .reduce((sum, m) => sum + parseFloat(m.totalCost || 0), 0);

    const totalActualCost = projectExpenses + projectManpower;
    const grossMargin = selectedQuote?.finalSalesPrice - selectedQuote?.totalCost; // This is your 50% buffer
    const netProfit = grossMargin - totalActualCost;

    return (
        <div className="space-y-6">
            <Card className="border-t-4 border-purple-600">
                <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                    <Calculator className="text-purple-600" /> Project ROI & Margin Watch
                </h2>
                <select 
                    className="w-full p-3 border rounded-xl bg-gray-50 font-bold"
                    value={selectedQuoteId}
                    onChange={(e) => setSelectedQuoteId(e.target.value)}
                >
                    <option value="">-- Select an Active Project --</option>
                    {quotes.filter(q => q.status === 'Won' || q.status === 'Invoiced').map(q => (
                        <option key={q.id} value={q.id}>{q.id} - {q.customer?.name}</option>
                    ))}
                </select>

                {selectedQuote && (
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                            <p className="text-xs uppercase text-green-700 font-bold">Sales Margin (Buffer)</p>
                            <p className="text-2xl font-black text-green-800">₱{grossMargin?.toLocaleString()}</p>
                        </div>
                        <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                            <p className="text-xs uppercase text-red-700 font-bold">Total Ops Burn (Labor/Exp)</p>
                            <p className="text-2xl font-black text-red-800">₱{totalActualCost?.toLocaleString()}</p>
                        </div>
                        <div className="p-4 bg-purple-600 rounded-xl text-white shadow-lg">
                            <p className="text-xs uppercase opacity-80 font-bold">Net Project Profit</p>
                            <p className="text-2xl font-black">₱{netProfit?.toLocaleString()}</p>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default ProjectOperations;
