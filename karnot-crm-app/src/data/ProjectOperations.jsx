import React, { useState } from 'react';
import { Card, Button, Input } from '../data/constants.jsx';
import { Calculator, Briefcase, Landmark, Clock, Target, Flame, TrendingUp, AlertCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const ProjectOperations = ({ quotes = [], manpowerLogs = [], ledgerEntries = [] }) => {
    const [selectedQuoteId, setSelectedQuoteId] = useState('');
    const [targetLabor, setTargetLabor] = useState(0);
    const [targetMaterials, setTargetMaterials] = useState(0);

    // Get active projects (Won or Invoiced)
    const activeProjects = quotes.filter(q => 
        q.status === 'WON' || q.status === 'APPROVED' || q.status === 'INVOICED'
    );

    const selectedQuote = activeProjects.find(q => q.id === selectedQuoteId);
    
    // --- ROBUST LINKING LOGIC ---
    const clientId = selectedQuote?.customer?.id;
    const clientName = selectedQuote?.customer?.name?.toLowerCase().trim();

    // 1. Calculate Actual Expenses from Ledger
    const projectExpenses = ledgerEntries
        .filter(e => {
            const entryId = e.companyId;
            const entryName = e.companyName?.toLowerCase().trim();
            return (clientId && entryId === clientId) || (clientName && entryName === clientName);
        })
        .reduce((sum, e) => sum + parseFloat(e.amountPHP || 0), 0);

    // 2. Calculate Actual Labor from Manpower Logs
    const projectManpower = manpowerLogs
        .filter(m => {
            const logId = m.companyId;
            const logName = m.companyName?.toLowerCase().trim();
            return (clientId && logId === clientId) || (clientName && logName === clientName);
        })
        .reduce((sum, m) => sum + parseFloat(m.totalCost || 0), 0);

    const totalActualBurn = projectExpenses + projectManpower;

    // --- ROI & MARGIN CALCULATIONS ---
    // --- ROI & MARGIN CALCULATIONS ---
    const forexRate = selectedQuote?.costing?.forexRate || 58.5;
    
    // We now pull the EXACT cost price we collected in the Quotation Calculator
    const equipmentCostUSD = selectedQuote?.totalCost || 0; 
    const salesPriceUSD = selectedQuote?.finalSalesPrice || 0;

    // Convert everything to PHP for the "Actual Burn" comparison
    const availableMarginPHP = (salesPriceUSD - equipmentCostUSD) * forexRate;
    
    // Actuals from Ledger & Logs (already in PHP)
    const totalActualBurnPHP = projectExpenses + projectManpower; 
    
    const remainingProfitPHP = availableMarginPHP - totalActualBurnPHP;
    const burnPercentage = availableMarginPHP > 0 ? (totalActualBurnPHP / availableMarginPHP) * 100 : 0;

    // --- VARIANCE CALCULATIONS ---
    const laborVariance = parseFloat(targetLabor || 0) - projectManpower;
    const materialVariance = parseFloat(targetMaterials || 0) - projectExpenses;
    const totalTarget = parseFloat(targetLabor || 0) + parseFloat(targetMaterials || 0);
    const totalVariance = totalTarget - totalActualBurn;

    return (
        <div className="space-y-6">
            <Card className="border-t-4 border-purple-600 shadow-xl bg-gray-50/30">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2 text-gray-800">
                            <Briefcase className="text-purple-600" size={24} /> Project ROI Control
                        </h2>
                        <p className="text-gray-500 text-[10px] mt-1 font-black uppercase tracking-[0.2em]">Monitoring Budget vs Actual Variance</p>
                    </div>
                    {selectedQuote && (
                        <div className="text-right">
                            <span className="text-[10px] bg-purple-100 text-purple-700 px-4 py-1.5 rounded-full font-black uppercase tracking-widest border border-purple-200">
                                Project ID: {selectedQuote.id}
                            </span>
                        </div>
                    )}
                </div>

                <select 
                    className="w-full p-4 border-2 border-purple-100 rounded-2xl bg-white font-black text-gray-700 mb-8 outline-none focus:ring-2 focus:ring-purple-500 shadow-sm transition-all cursor-pointer"
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
                            <div className="p-6 bg-white border border-gray-200 rounded-3xl shadow-sm">
                                <p className="text-[10px] uppercase text-gray-400 font-black mb-1">Equipment Margin (Buffer)</p>
                                <p className="text-2xl font-black text-green-600">₱{availableMargin.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                                <p className="text-[10px] text-gray-400 mt-2 italic">Sales Price - Machine Cost</p>
                            </div>

                            <div className="p-6 bg-white border border-gray-200 rounded-3xl shadow-sm">
                                <p className="text-[10px] uppercase text-gray-400 font-black mb-1">Actual Burn (Spent)</p>
                                <p className="text-2xl font-black text-red-600">₱{totalActualBurn.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                                <p className="text-[10px] text-gray-400 mt-2 italic">Total Labor + Ledger Expenses</p>
                            </div>

                            <div className={`p-6 rounded-3xl shadow-lg text-white ${remainingProfit > 0 ? 'bg-slate-900' : 'bg-red-700'}`}>
                                <p className="text-[10px] uppercase opacity-70 font-black mb-1">Net Project Profit</p>
                                <p className="text-3xl font-black">₱{remainingProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                                <div className="mt-4 h-2 bg-white/20 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full ${burnPercentage > 90 ? 'bg-red-400' : 'bg-green-400'}`} 
                                        style={{ width: `${Math.min(burnPercentage, 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        {/* VARIANCE ANALYSIS TABLE */}
                        <div className="bg-white border-2 border-gray-100 rounded-3xl overflow-hidden shadow-sm">
                            <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                                <h3 className="text-xs font-black uppercase text-gray-500 tracking-widest flex items-center gap-2">
                                    <Target size={16} className="text-purple-600"/> Variance Analysis: Target vs Actual
                                </h3>
                                <div className="flex gap-4">
                                    <span className="text-[10px] font-bold text-green-600 flex items-center gap-1"><ArrowUpRight size={12}/> UNDER</span>
                                    <span className="text-[10px] font-bold text-red-600 flex items-center gap-1"><ArrowDownRight size={12}/> OVER</span>
                                </div>
                            </div>
                            <table className="w-full text-left">
                                <thead className="bg-gray-50/50">
                                    <tr>
                                        <th className="p-4 text-[10px] font-black uppercase text-gray-400">Description</th>
                                        <th className="p-4 text-[10px] font-black uppercase text-gray-400">Target Budget</th>
                                        <th className="p-4 text-[10px] font-black uppercase text-gray-400">Actual Cost</th>
                                        <th className="p-4 text-[10px] font-black uppercase text-gray-400">Variance</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {/* LABOR ROW */}
                                    <tr>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 bg-purple-50 rounded-lg text-purple-600"><Clock size={16}/></div>
                                                <span className="font-bold text-gray-700 uppercase text-xs">Labor / Manpower</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="relative">
                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₱</span>
                                                <input 
                                                    type="number" 
                                                    className="w-32 p-2 pl-6 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none font-black text-sm"
                                                    value={targetLabor} 
                                                    onChange={(e) => setTargetLabor(e.target.value)} 
                                                />
                                            </div>
                                        </td>
                                        <td className="p-4 font-mono font-bold text-gray-800">₱{projectManpower.toLocaleString()}</td>
                                        <td className={`p-4 font-mono font-black ${laborVariance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {laborVariance < 0 ? '-' : '+'}₱{Math.abs(laborVariance).toLocaleString()}
                                        </td>
                                    </tr>

                                    {/* MATERIALS ROW */}
                                    <tr>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Landmark size={16}/></div>
                                                <span className="font-bold text-gray-700 uppercase text-xs">Materials / Consumables</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="relative">
                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₱</span>
                                                <input 
                                                    type="number" 
                                                    className="w-32 p-2 pl-6 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none font-black text-sm"
                                                    value={targetMaterials} 
                                                    onChange={(e) => setTargetMaterials(e.target.value)} 
                                                />
                                            </div>
                                        </td>
                                        <td className="p-4 font-mono font-bold text-gray-800">₱{projectExpenses.toLocaleString()}</td>
                                        <td className={`p-4 font-mono font-black ${materialVariance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {materialVariance < 0 ? '-' : '+'}₱{Math.abs(materialVariance).toLocaleString()}
                                        </td>
                                    </tr>

                                    {/* TOTAL FOOTER ROW */}
                                    <tr className="bg-slate-50 border-t-2 border-gray-100">
                                        <td className="p-4 font-black text-slate-800 uppercase text-xs">TOTAL INSTALLATION COST</td>
                                        <td className="p-4 font-black text-slate-800 font-mono text-base">₱{totalTarget.toLocaleString()}</td>
                                        <td className="p-4 font-black text-slate-800 font-mono text-base">₱{totalActualBurn.toLocaleString()}</td>
                                        <td className={`p-4 font-black font-mono text-base ${totalVariance < 0 ? 'text-red-700 bg-red-50' : 'text-green-700 bg-green-50'}`}>
                                            ₱{totalVariance.toLocaleString()}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* STATUS ADVISORY */}
                        {totalVariance < 0 && (
                            <div className="flex items-center gap-4 p-5 bg-red-50 border-2 border-red-100 rounded-3xl text-red-700 animate-pulse">
                                <AlertCircle size={32} />
                                <div>
                                    <p className="text-xs font-black uppercase tracking-widest">Budget Warning</p>
                                    <p className="font-bold text-sm">Installation actuals have exceeded the set target by ₱{Math.abs(totalVariance).toLocaleString()}. Profit margin is currently being consumed.</p>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="mt-10 text-center py-24 border-4 border-dashed border-gray-100 rounded-[40px] bg-white">
                        <Calculator size={64} className="mx-auto text-gray-100 mb-6" />
                        <p className="text-gray-400 font-black uppercase tracking-[0.4em] text-sm">Select an active project to begin ROI analysis</p>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default ProjectOperations;
