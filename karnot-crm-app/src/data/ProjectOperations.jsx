import React, { useState } from 'react';
import { Card, Button, Input } from '../data/constants.jsx';
import { Calculator, Briefcase, Landmark, Clock, Target, Flame, TrendingUp } from 'lucide-react';

const ProjectOperations = ({ quotes = [], manpowerLogs = [], ledgerEntries = [] }) => {
    const [selectedQuoteId, setSelectedQuoteId] = useState('');
    const [targetLabor, setTargetLabor] = useState(0);
    const [targetMaterials, setTargetMaterials] = useState(0);

    // Ensure we are catching all "active" quote statuses
    const activeProjects = quotes.filter(q => 
        q.status === 'WON' || q.status === 'APPROVED' || q.status === 'INVOICED'
    );

    const selectedQuote = activeProjects.find(q => q.id === selectedQuoteId);
    
    // --- ROBUST LINKING LOGIC ---
    const clientId = selectedQuote?.customer?.id;
    const clientName = selectedQuote?.customer?.name;

    const projectExpenses = ledgerEntries
        .filter(e => 
            (clientId && e.companyId === clientId) || 
            (clientName && e.companyId === clientName)
        )
        .reduce((sum, e) => sum + parseFloat(e.amountPHP || 0), 0);

    const projectManpower = manpowerLogs
        .filter(m => 
            (clientId && m.companyId === clientId) || 
            (clientName && m.companyId === clientName)
        )
        .reduce((sum, m) => sum + parseFloat(m.totalCost || 0), 0);

    const totalActualBurn = projectExpenses + projectManpower;

    // MARGIN LOGIC: Revenue - Equipment Cost
    // Using the saved totalCost from the Quote Calculator, or 50% fallback
    const equipmentCost = selectedQuote?.totalCost || (selectedQuote?.finalSalesPrice * 0.5);
    const availableMargin = (selectedQuote?.finalSalesPrice || 0) - equipmentCost; 
    const remainingProfit = availableMargin - totalActualBurn;
    const burnPercentage = availableMargin > 0 ? (totalActualBurn / availableMargin) * 100 : 0;

    return (
        <div className="space-y-6">
            <Card className="border-t-4 border-purple-600 shadow-xl">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2 text-gray-800">
                            <Briefcase className="text-purple-600" size={24} /> Project ROI Control
                        </h2>
                        <p className="text-gray-500 text-xs mt-1 font-medium">Monitoring actual burn against equipment margin</p>
                    </div>
                    {selectedQuote && (
                        <div className="text-right">
                            <span className="text-[10px] bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-bold uppercase tracking-widest">
                                Project Linked: {selectedQuote.id}
                            </span>
                        </div>
                    )}
                </div>

                <select 
                    className="w-full p-4 border-2 border-purple-100 rounded-2xl bg-white font-bold text-gray-700 mb-8 outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer"
                    value={selectedQuoteId} 
                    onChange={(e) => setSelectedQuoteId(e.target.value)}
                >
                    <option value="">-- SELECT AN ACTIVE PROJECT ({activeProjects.length}) --</option>
                    {activeProjects.map(q => (
                        <option key={q.id} value={q.id}>{q.id} - {q.customer?.name}</option>
                    ))}
                </select>

                {selectedQuote ? (
                    <div className="space-y-8">
                        {/* THE MONEY METRICS */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-5 bg-white border border-gray-200 rounded-2xl shadow-sm">
                                <p className="text-[10px] uppercase text-gray-400 font-black mb-1">Equipment Margin (Buffer)</p>
                                <p className="text-2xl font-black text-green-600">₱{availableMargin.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                                <p className="text-[10px] text-gray-400 mt-1 italic">Sales Price minus Equipment Cost</p>
                            </div>

                            <div className="p-5 bg-white border border-gray-200 rounded-2xl shadow-sm">
                                <p className="text-[10px] uppercase text-gray-400 font-black mb-1">Actual Burn (Expenses + Labor)</p>
                                <p className="text-2xl font-black text-red-600">₱{totalActualBurn.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                                <p className="text-[10px] text-gray-400 mt-1 italic">Real-time data from Ledger & Logs</p>
                            </div>

                            <div className={`p-5 rounded-2xl shadow-lg text-white ${remainingProfit > 0 ? 'bg-slate-900' : 'bg-red-700'}`}>
                                <p className="text-[10px] uppercase opacity-70 font-black mb-1">Net Project Profit</p>
                                <p className="text-3xl font-black">₱{remainingProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                                <div className="mt-2 h-1 bg-white/20 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full ${burnPercentage > 90 ? 'bg-red-400' : 'bg-green-400'}`} 
                                        style={{ width: `${Math.min(burnPercentage, 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        {/* ESTIMATOR VS ACTUALS BREAKDOWN */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Target Estimator */}
                            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-200">
                                <h3 className="text-xs font-black text-gray-500 uppercase mb-4 flex items-center gap-2">
                                    <Target size={16} className="text-purple-600"/> Installation Budget (Estimates)
                                </h3>
                                <div className="space-y-4">
                                    <Input label="Estimated Labor (PHP)" type="number" value={targetLabor} onChange={(e) => setTargetLabor(e.target.value)} />
                                    <Input label="Estimated Installation Consumables (PHP)" type="number" value={targetMaterials} onChange={(e) => setTargetMaterials(e.target.value)} />
                                    <div className="pt-4 border-t flex justify-between font-black text-gray-800">
                                        <span>Total Target Cost:</span>
                                        <span>₱{(parseFloat(targetLabor || 0) + parseFloat(targetMaterials || 0)).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Actual Details */}
                            <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-3 text-red-100"><Flame size={48} /></div>
                                <h3 className="text-xs font-black text-gray-500 uppercase mb-4 flex items-center gap-2">
                                    <TrendingUp size={16} className="text-red-500"/> Real-Time Burn Breakdown
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                                        <span className="text-xs font-bold text-gray-500 flex items-center gap-2"><Clock size={14}/> Labor Costs (Logs)</span>
                                        <span className="font-mono font-bold text-gray-800">₱{actualManpower.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                                        <span className="text-xs font-bold text-gray-500 flex items-center gap-2"><Landmark size={14}/> Material Expenses (Ledger)</span>
                                        <span className="font-mono font-bold text-gray-800">₱{actualExpenses.toLocaleString()}</span>
                                    </div>
                                    <div className="pt-4 text-center">
                                        <p className="text-[10px] font-black text-gray-400 uppercase">Margin Consumption</p>
                                        <p className={`text-2xl font-black ${burnPercentage > 100 ? 'text-red-600' : 'text-purple-600'}`}>
                                            {burnPercentage.toFixed(1)}%
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="mt-10 text-center py-20 border-2 border-dashed border-gray-200 rounded-3xl">
                        <Calculator size={48} className="mx-auto text-gray-100 mb-4" />
                        <p className="text-gray-300 font-black uppercase tracking-[0.3em]">Select a project to begin ROI analysis</p>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default ProjectOperations;
