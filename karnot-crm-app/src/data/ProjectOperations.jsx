import React, { useState, useEffect } from 'react';
import { Card } from '../data/constants.jsx';
import { Briefcase, Target, Clock, Landmark, AlertCircle, Calculator, CheckCircle, Package } from 'lucide-react';
import { db } from '../firebase'; 
import { collection, query, where, getDocs } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const ProjectOperations = ({ quotes = [], manpowerLogs = [], ledgerEntries = [] }) => {
    const [selectedQuoteId, setSelectedQuoteId] = useState('');
    const [targetLabor, setTargetLabor] = useState(0);
    const [targetMaterials, setTargetMaterials] = useState(0); // Strictly INSTALL materials
    const [estimateFound, setEstimateFound] = useState(false);

    // Get active projects (Won or Invoiced)
    const activeProjects = quotes.filter(q => 
        q.status === 'WON' || q.status === 'APPROVED' || q.status === 'INVOICED'
    );

    const selectedQuote = activeProjects.find(q => q.id === selectedQuoteId);
    
    // --- 1. AUTO-FETCH ESTIMATES (If available) ---
    useEffect(() => {
        const fetchEstimate = async () => {
            if (!selectedQuoteId) return;
            const auth = getAuth();
            if (!auth.currentUser) return;

            // Try to find a saved Installation Estimate for this quote
            const q = query(collection(db, "users", auth.currentUser.uid, "installation_proposals"), where("quoteId", "==", selectedQuoteId));
            const snapshot = await getDocs(q);
            
            if (!snapshot.empty) {
                const estData = snapshot.docs[0].data();
                setTargetLabor(estData.costs?.labor || 0);
                setTargetMaterials((estData.costs?.materials || 0) + (estData.costs?.logistics || 0)); 
                setEstimateFound(true);
            } else {
                setTargetLabor(0);
                setTargetMaterials(0);
                setEstimateFound(false);
            }
        };
        fetchEstimate();
    }, [selectedQuoteId]);

    // --- 2. CALCULATE ACTUALS ---
    
    // A. Expenses from Ledger (Includes Equipment Purchase + Install Mats)
    const projectExpenses = ledgerEntries
        .filter(e => e.projectId === selectedQuoteId)
        .reduce((sum, e) => sum + parseFloat(e.amountPHP || 0), 0);

    // B. Labor from Manpower Logs (FIXED: Uses quoteId to match ManpowerLogger)
    const projectManpower = manpowerLogs
        .filter(m => m.quoteId === selectedQuoteId)
        .reduce((sum, m) => sum + parseFloat(m.totalCost || 0), 0);

    const totalActualBurn = projectExpenses + projectManpower;

    // --- 3. ROI & MARGIN MATH ---
    const forexRate = selectedQuote?.costing?.forexRate || 58.5;
    const salesPriceUSD = selectedQuote?.finalSalesPrice || 0;
    const equipmentCostUSD = selectedQuote?.totalCost || 0; // Machine Cost from Quote

    // BUDGET COMPONENTS
    const grossProjectBudgetPHP = salesPriceUSD * forexRate; // Total Revenue
    const equipmentBudgetPHP = equipmentCostUSD * forexRate; // Budget allocated for buying the machine
    
    // Net Profit
    const remainingProfitPHP = grossProjectBudgetPHP - totalActualBurn;
    const burnPercentage = grossProjectBudgetPHP > 0 ? (totalActualBurn / grossProjectBudgetPHP) * 100 : 0;

    // --- 4. VARIANCE MATH ---
    const laborVariance = parseFloat(targetLabor || 0) - projectManpower;
    
    // Material Variance (Target includes Install Estimate + Machine Cost)
    const totalMaterialTarget = parseFloat(targetMaterials || 0) + equipmentBudgetPHP;
    const materialVariance = totalMaterialTarget - projectExpenses;

    const totalTarget = totalMaterialTarget + parseFloat(targetLabor || 0);
    const totalVariance = totalTarget - totalActualBurn; 

    return (
        <div className="space-y-6">
            <Card className="border-t-4 border-purple-600 shadow-xl bg-gray-50/30">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2 text-gray-800">
                            <Briefcase className="text-purple-600" size={24} /> Project Operations & ROI
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

                <div className="relative">
                    <select 
                        className="w-full p-4 pl-12 border-2 border-purple-100 rounded-2xl bg-white font-black text-gray-700 mb-8 outline-none focus:ring-2 focus:ring-purple-500 shadow-sm transition-all cursor-pointer appearance-none"
                        value={selectedQuoteId} 
                        onChange={(e) => setSelectedQuoteId(e.target.value)}
                    >
                        <option value="">-- SELECT AN ACTIVE PROJECT ({activeProjects.length}) --</option>
                        {activeProjects.map(q => (
                            <option key={q.id} value={q.id}>{q.customer?.name} (Ref: {q.id})</option>
                        ))}
                    </select>
                    <Briefcase className="absolute left-4 top-4 text-purple-300 pointer-events-none" size={20}/>
                </div>

                {selectedQuote ? (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* THE MONEY METRICS */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            
                            {/* CARD 1: GROSS SALES (BUDGET) */}
                            <div className="p-6 bg-white border border-gray-200 rounded-3xl shadow-sm">
                                <p className="text-[10px] uppercase text-gray-400 font-black mb-1">Gross Project Sales (Budget)</p>
                                <p className="text-2xl font-black text-green-600">₱{grossProjectBudgetPHP.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                                <p className="text-[10px] text-gray-400 mt-2 italic">Total Contract Price</p>
                            </div>

                            {/* CARD 2: ACTUAL SPEND */}
                            <div className="p-6 bg-white border border-gray-200 rounded-3xl shadow-sm">
                                <p className="text-[10px] uppercase text-gray-400 font-black mb-1">Actual Burn (Total Spent)</p>
                                <p className="text-2xl font-black text-red-600">₱{totalActualBurn.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                                <p className="text-[10px] text-gray-400 mt-2 italic">Machine + Materials + Labor</p>
                            </div>

                            {/* CARD 3: NET PROFIT */}
                            <div className={`p-6 rounded-3xl shadow-lg text-white ${remainingProfitPHP > 0 ? 'bg-slate-900' : 'bg-red-700'}`}>
                                <p className="text-[10px] uppercase opacity-70 font-black mb-1">Net Project Profit</p>
                                <p className="text-3xl font-black">₱{remainingProfitPHP.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                                <div className="mt-4 h-2 bg-white/20 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full ${burnPercentage > 90 ? 'bg-red-400' : 'bg-green-400'}`}
                                        style={{ width: `${Math.min(burnPercentage, 100)}%` }}
                                    ></div>
                                </div>
                                <p className="text-[9px] mt-1 text-right font-bold opacity-80">{burnPercentage.toFixed(1)}% Revenue Consumed</p>
                            </div>
                        </div>

                        {/* VARIANCE ANALYSIS TABLE */}
                        <div className="bg-white border-2 border-gray-100 rounded-3xl overflow-hidden shadow-sm">
                            <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                                <h3 className="text-xs font-black uppercase text-gray-500 tracking-widest flex items-center gap-2">
                                    <Target size={16} className="text-purple-600"/> Variance Analysis: Target vs Actual
                                </h3>
                                {estimateFound ? (
                                    <span className="text-[9px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded flex items-center gap-1">
                                        <CheckCircle size={10}/> Linked to Estimate
                                    </span>
                                ) : (
                                    <span className="text-[9px] font-bold bg-yellow-100 text-yellow-700 px-2 py-1 rounded flex items-center gap-1">
                                        <AlertCircle size={10}/> Manual Targets
                                    </span>
                                )}
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
                                    {/* ROW 1: LABOR */}
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

                                    {/* ROW 2: MATERIALS + EQUIPMENT */}
                                    <tr>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Package size={16}/></div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-700 uppercase text-xs">Equipment & Materials</span>
                                                    <span className="text-[9px] text-gray-400">Machine Cost (From Quote) + Install Items</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="font-mono font-bold text-gray-800 text-sm">₱{totalMaterialTarget.toLocaleString()}</span>
                                                <span className="text-[9px] text-gray-400 italic">
                                                    (Machine: ₱{equipmentBudgetPHP.toLocaleString()})
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 font-mono font-bold text-gray-800">₱{projectExpenses.toLocaleString()}</td>
                                        <td className={`p-4 font-mono font-black ${materialVariance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {materialVariance < 0 ? '-' : '+'}₱{Math.abs(materialVariance).toLocaleString()}
                                        </td>
                                    </tr>

                                    {/* TOTAL FOOTER ROW */}
                                    <tr className="bg-slate-50 border-t-2 border-gray-100">
                                        <td className="p-4 font-black text-slate-800 uppercase text-xs">TOTAL PROJECT COST</td>
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
                                    <p className="font-bold text-sm">Project actuals have exceeded the combined budget by ₱{Math.abs(totalVariance).toLocaleString()}.</p>
                                </div>
                            </div>
                        )}
                        
                        {totalVariance >= 0 && (
                            <div className="flex items-center gap-4 p-5 bg-green-50 border-2 border-green-100 rounded-3xl text-green-700">
                                <CheckCircle size={32} />
                                <div>
                                    <p className="text-xs font-black uppercase tracking-widest">On Budget</p>
                                    <p className="font-bold text-sm">Project is currently ₱{Math.abs(totalVariance).toLocaleString()} under the estimated budget.</p>
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
