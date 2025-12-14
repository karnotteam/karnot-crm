import React, { useMemo } from 'react';
import { DollarSign, FileText, CheckCircle, TrendingUp, AlertTriangle, Target, Globe, Briefcase } from 'lucide-react';
import { Card, BOI_TARGETS_USD } from '../data/constants.jsx';

// Helper to format currency
const formatCurrency = (value) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

// --- CSS-Based Chart Components (No Libraries Needed) ---

const ProgressBar = ({ label, value, max, color, subLabel }) => {
    const percentage = Math.min((value / max) * 100, 100);
    return (
        <div className="mb-4">
            <div className="flex justify-between text-sm font-medium text-gray-600 mb-1">
                <span>{label}</span>
                <span>{subLabel}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden border border-gray-200">
                <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${color}`} 
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
};

const SplitBar = ({ partA, partB, labelA, labelB, colorA, colorB }) => {
    const total = partA + partB;
    const pctA = total > 0 ? (partA / total) * 100 : 0;
    const pctB = total > 0 ? (partB / total) * 100 : 0;

    return (
        <div className="w-full mt-2">
            <div className="flex h-6 w-full rounded-lg overflow-hidden border border-gray-200">
                <div className={`${colorA} flex items-center justify-center text-[10px] text-white font-bold transition-all duration-500`} style={{ width: `${pctA}%` }}>
                    {pctA > 10 && `${Math.round(pctA)}%`}
                </div>
                <div className={`${colorB} flex items-center justify-center text-[10px] text-white font-bold transition-all duration-500`} style={{ width: `${pctB}%` }}>
                    {pctB > 10 && `${Math.round(pctB)}%`}
                </div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1 px-1">
                <span className="flex items-center gap-1"><div className={`w-2 h-2 rounded-full ${colorA}`}></div> {labelA} ({formatCurrency(partA)})</span>
                <span className="flex items-center gap-1"><div className={`w-2 h-2 rounded-full ${colorB}`}></div> {labelB} ({formatCurrency(partB)})</span>
            </div>
        </div>
    );
};

const StackedTargetBar = ({ won, pipeline, target }) => {
    const wonPct = Math.min((won / target) * 100, 100);
    const pipePct = Math.min((pipeline / target) * 100, (100 - wonPct)); // Clamp so it doesn't overflow
    
    return (
        <div className="w-full mt-4">
            <div className="relative h-8 w-full bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                {/* Won Segment */}
                <div className="absolute top-0 left-0 h-full bg-green-500 transition-all duration-1000 flex items-center justify-center text-xs font-bold text-white z-20" style={{ width: `${wonPct}%` }}>
                    {wonPct > 5 && 'WON'}
                </div>
                {/* Pipeline Segment */}
                <div className="absolute top-0 h-full bg-blue-400 transition-all duration-1000 flex items-center justify-center text-xs font-bold text-white z-10 opacity-90" style={{ left: `${wonPct}%`, width: `${pipePct}%` }}>
                    {pipePct > 10 && 'PIPELINE'}
                </div>
            </div>
            <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
                <div className="flex gap-4">
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> Won: {formatCurrency(won)}</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-400"></div> Active: {formatCurrency(pipeline)}</span>
                </div>
                <span className="font-bold text-gray-700">Goal: {formatCurrency(target)}</span>
            </div>
        </div>
    );
};

const DashboardPage = ({ quotes, user }) => {
    
    // --- 1. Calculate General Stats ---
    const stats = useMemo(() => {
        const totalQuotes = quotes.length;
        const totalValue = quotes.reduce((acc, q) => acc + (q.finalSalesPrice || 0), 0);
        
        const wonQuotes = quotes.filter(q => q.status === 'WON');
        const wonValue = wonQuotes.reduce((acc, q) => acc + (q.finalSalesPrice || 0), 0);
        
        const lostQuotes = quotes.filter(q => q.status === 'LOST');
        const pipelineQuotes = quotes.filter(q => ['DRAFT', 'SENT', 'APPROVED'].includes(q.status));
        const pipelineValue = pipelineQuotes.reduce((acc, q) => acc + (q.finalSalesPrice || 0), 0);

        return { totalQuotes, totalValue, wonQuotes, wonValue, lostQuotes, pipelineValue };
    }, [quotes]);

    // --- 2. Calculate BOI & Export Targets ---
    const boiStats = useMemo(() => {
        const wonItems = stats.wonQuotes;
        
        // Split Revenue by Sale Type
        let exportRevenue = 0;
        let domesticRevenue = 0;

        wonItems.forEach(q => {
            if (q.customer?.saleType === 'Export') {
                exportRevenue += (q.finalSalesPrice || 0);
            } else {
                domesticRevenue += (q.finalSalesPrice || 0);
            }
        });

        const totalWonRevenue = exportRevenue + domesticRevenue;
        const exportPercentage = totalWonRevenue > 0 ? (exportRevenue / totalWonRevenue) * 100 : 0;
        const isCompliant = exportPercentage >= 70;

        // Financial Targets (Default to 2026)
        const currentYear = 2026; 
        const annualTarget = BOI_TARGETS_USD[currentYear] || 2000000;
        const progressPercentage = Math.min((totalWonRevenue / annualTarget) * 100, 100);

        return { 
            exportRevenue, 
            domesticRevenue, 
            totalWonRevenue, 
            exportPercentage, 
            isCompliant,
            annualTarget,
            progressPercentage
        };
    }, [stats.wonQuotes]);

    return (
        <div className="space-y-6 pb-10">
            <h2 className="text-3xl font-bold text-gray-800">Executive Dashboard</h2>

            {/* --- TOP ROW: KPI CARDS --- */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="flex items-center gap-4 border-l-4 border-blue-500 shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-3 bg-blue-50 rounded-full text-blue-600"><Briefcase size={24}/></div>
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Pipeline Value</p>
                        <p className="text-xl font-extrabold text-gray-800">{formatCurrency(stats.pipelineValue)}</p>
                    </div>
                </Card>
                <Card className="flex items-center gap-4 border-l-4 border-green-500 shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-3 bg-green-50 rounded-full text-green-600"><CheckCircle size={24}/></div>
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Revenue Won</p>
                        <p className="text-xl font-extrabold text-gray-800">{formatCurrency(stats.wonValue)}</p>
                    </div>
                </Card>
                <Card className="flex items-center gap-4 border-l-4 border-orange-500 shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-3 bg-orange-50 rounded-full text-orange-600"><Target size={24}/></div>
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">2026 Target</p>
                        <p className="text-xl font-extrabold text-gray-800">{formatCurrency(boiStats.annualTarget)}</p>
                    </div>
                </Card>
                <Card className={`flex items-center gap-4 border-l-4 shadow-sm hover:shadow-md transition-shadow ${boiStats.isCompliant ? 'border-green-500' : 'border-red-500'}`}>
                    <div className={`p-3 rounded-full ${boiStats.isCompliant ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                        <Globe size={24}/>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Export Ratio</p>
                        <p className="text-xl font-extrabold text-gray-800">{boiStats.exportPercentage.toFixed(1)}% <span className="text-xs text-gray-400 font-normal">/ 70%</span></p>
                    </div>
                </Card>
            </div>

            {/* --- MIDDLE ROW: BOI & REVENUE --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. EXPORT COMPLIANCE CARD */}
                <Card>
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <Globe className="text-orange-600" size={20}/> BOI Export Compliance
                            </h3>
                            <p className="text-sm text-gray-500">Requirement: 70% of Sales must be Export</p>
                        </div>
                        {boiStats.isCompliant ? (
                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                <CheckCircle size={14}/> Compliant
                            </span>
                        ) : (
                            <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                <AlertTriangle size={14}/> Action Needed
                            </span>
                        )}
                    </div>

                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-sm font-bold text-gray-600">Export Share</span>
                            <span className={`text-2xl font-bold ${boiStats.isCompliant ? 'text-green-600' : 'text-red-500'}`}>
                                {boiStats.exportPercentage.toFixed(1)}%
                            </span>
                        </div>
                        
                        {/* Visual Split Bar */}
                        <SplitBar 
                            partA={boiStats.exportRevenue} 
                            partB={boiStats.domesticRevenue} 
                            labelA="Export" 
                            labelB="Domestic"
                            colorA="bg-orange-500"
                            colorB="bg-blue-500"
                        />
                    </div>
                </Card>

                {/* 2. REVENUE TARGET CARD */}
                <Card>
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <TrendingUp className="text-blue-600" size={20}/> 2026 Financial Goal
                            </h3>
                            <p className="text-sm text-gray-500">Progress towards annual target</p>
                        </div>
                        <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
                            {boiStats.progressPercentage.toFixed(1)}% Achieved
                        </span>
                    </div>

                    {/* Stacked Progress Bar */}
                    <StackedTargetBar 
                        won={stats.wonValue} 
                        pipeline={stats.pipelineValue} 
                        target={boiStats.annualTarget} 
                    />

                    <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-gray-400 uppercase font-bold">Total Gap</p>
                            <p className="text-lg font-bold text-gray-700">
                                {formatCurrency(Math.max(0, boiStats.annualTarget - boiStats.totalWonRevenue))}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase font-bold">Pipeline Coverage</p>
                            <p className="text-lg font-bold text-blue-600">
                                {((stats.pipelineValue / Math.max(1, boiStats.annualTarget - boiStats.totalWonRevenue)) * 100).toFixed(0)}%
                            </p>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default DashboardPage;
