import React, { useState } from 'react';
import { Card, Button, Input } from '../data/constants.jsx';
import { Calculator, Briefcase, Landmark, Clock, Target, Flame, TrendingUp, AlertCircle } from 'lucide-react';

const ProjectOperations = ({ quotes = [], manpowerLogs = [], ledgerEntries = [] }) => {
    const [selectedQuoteId, setSelectedQuoteId] = useState('');
    const [targetLabor, setTargetLabor] = useState(0);
    const [targetMaterials, setTargetMaterials] = useState(0);

    // Filter for active projects
    const activeProjects = quotes.filter(q => 
        q.status === 'WON' || q.status === 'APPROVED' || q.status === 'INVOICED'
    );

    const selectedQuote = activeProjects.find(q => q.id === selectedQuoteId);
    
    // --- LINKING LOGIC ---
    const clientId = selectedQuote?.customer?.id;
    const clientName = selectedQuote?.customer?.name;

    // Actuals from Ledger (Materials/Expenses)
    const projectExpenses = ledgerEntries
        .filter(e => 
            (clientId && e.companyId === clientId) || 
            (clientName && e.companyId === clientName)
        )
        .reduce((sum, e) => sum + parseFloat(e.amountPHP || 0), 0);

    // Actuals from Manpower Logs (Labor)
    const projectManpower = manpowerLogs
        .filter(m => 
            (clientId && m.companyId === clientId) || 
            (clientName && m.companyId === clientName)
        )
        .reduce((sum, m) => sum + parseFloat(m.totalCost || 0), 0);

    const totalActualBurn = projectExpenses + projectManpower;

    // --- MARGIN & PROFIT LOGIC ---
    const equipmentCost = selectedQuote?.totalCost || (selectedQuote?.finalSalesPrice * 0.5);
    const availableMargin = (selectedQuote?.finalSalesPrice || 0) - equipmentCost; 
    const remainingProfit = availableMargin - totalActualBurn;
    const burnPercentage = availableMargin > 0 ? (totalActualBurn / availableMargin) * 100 : 0;

    // --- VARIANCE CALCULATIONS ---
    const laborVariance = parseFloat(targetLabor || 0) - projectManpower;
    const materialVariance = parseFloat(targetMaterials || 0) - projectExpenses;
    const totalTarget = parseFloat(targetLabor || 0) + parseFloat(targetMaterials || 0);
    const totalVariance = totalTarget - totalActualBurn;

    return (
        <div className="space-y-6">
            <Card className="border-t-4 border-purple-600 shadow-xl">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2 text-gray-800">
                            <Briefcase className="text-purple-600" size={24} /> Project ROI Control
                        </h2>
                        <p className="text-gray-500 text-[10px] mt-1 font-medium uppercase tracking-widest">Tracking Variance: Budget vs Actual</p>
                    </div>
                    {selectedQuote && (
                        <div className="text-right">
                            <span className="text-[10px] bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-bold uppercase tracking-widest">
                                Project ID: {selectedQuote.id}
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
                            </div>

                            <div className="p-5 bg-white border border-gray-200 rounded-2xl shadow-sm">
                                <p className="text-[10px] uppercase text-gray-400 font-black mb-1">Actual Burn</p>
                                <p className="text-2xl font-black text-red-600">₱{totalActualBurn.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                            </div>

                            <div className={`p-5 rounded-2xl shadow-lg text-white ${remainingProfit > 0 ? 'bg-slate-900' : 'bg-red-700'}`}>
                                <p className="text-[10px] uppercase opacity-70 font-black mb-1">Project Profitability</p>
                                <p className="text-3xl font-black">₱{remainingProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                                <div className="mt-2 h-1 bg-white/20 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full ${burnPercentage > 90 ? 'bg-red-400' : 'bg-green-400'}`} 
                                        style={{ width: `${Math.min(burnPercentage, 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        {/* VARIANCE ANALYSIS TABLE */}
                        <div className="overflow-hidden border border-gray-200 rounded-2xl">
                            <table className="w-full text-left bg-white border-collapse">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="p-4 text-[10px] font-black uppercase text-gray-500">Category</th>
                                        <th className="p-4 text-[10px] font-black uppercase text-gray-500">Target Budget</th>
                                        <th className="p-4 text-[10px] font-black uppercase text-gray-500">Actual Spent</th>
                                        <th className="p-4 text-[10px] font-black uppercase text-gray-500">Variance</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    <tr>
                                        <td className="p-4 font-bold text-gray-700 flex items-center gap-2"><Clock size={16} className="text-purple-500"/> Labor</td>
                                        <td className="p-4">
                                            <input 
                                                type="number" 
                                                className="w-full p-1 border-b border-gray-200 focus:border-purple-500 outline-none font-mono"
                                                value={targetLabor} 
                                                onChange={(e) => setTargetLabor(e.target.value)} 
                                            />
                                        </td>
                                        <td className="p-4 font-mono">₱{projectManpower.toLocaleString()}</td>
                                        <td className={`p-4 font-bold font-mono ${laborVariance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {laborVariance < 0 ? '▼' : '▲'} ₱{Math.abs(laborVariance).toLocaleString()}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="p-4 font-bold text-gray-700 flex items-center gap-2"><Landmark size={16} className="text-blue-500"/> Materials</td>
                                        <td className="p-4">
                                            <input 
                                                type="number" 
                                                className="w-full p-1 border-b border-gray-200 focus:border-purple-500 outline-none font-mono"
                                                value={targetMaterials} 
                                                onChange={(e) => setTargetMaterials(e.target.value)} 
                                            />
                                        </td>
                                        <td className="p-4 font-mono">₱{projectExpenses.toLocaleString()}</td>
                                        <td className={`p-4 font-bold font-mono ${materialVariance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {materialVariance < 0 ? '▼' : '▲'} ₱{Math.abs(materialVariance).toLocaleString()}
                                        </td>
                                    </tr>
                                    <tr className="bg-purple-50">
                                        <td className="p-4 font-black uppercase text-gray-800">Total Project</td>
                                        <td className="p-4 font-black font-mono text-gray-800">₱{totalTarget.toLocaleString()}</td>
                                        <td className="p-4 font-black font-mono text-gray-800">₱{totalActualBurn.toLocaleString()}</td>
                                        <td className={`p-4 font-black font-mono ${totalVariance < 0 ? 'text-red-700' : 'text-green-700'}`}>
                                            ₱{totalVariance.toLocaleString()}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* STATUS ADVISORY */}
                        {totalVariance < 0 && (
                            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700">
                                <AlertCircle size={20} />
                                <p className="text-xs font-bold uppercase tracking-tight">Warning: Project is exceeding target budget by ₱{Math.abs(totalVariance).toLocaleString()}</p>
                            </div>
                        )}
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
