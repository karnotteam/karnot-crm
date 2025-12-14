import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { DollarSign, FileText, CheckCircle, XCircle, TrendingUp, AlertTriangle, Target, Globe } from 'lucide-react';
import { Card, BOI_TARGETS_USD } from '../data/constants.jsx';

// Helper to format currency
const formatCurrency = (value) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

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

    // --- 3. Chart Data Preparation ---
    const pieData = [
        { name: 'Export Sales', value: boiStats.exportRevenue, color: '#ea580c' }, // Orange
        { name: 'Domestic Sales', value: boiStats.domesticRevenue, color: '#3b82f6' } // Blue
    ];

    const funnelData = [
        { name: 'Won', value: stats.wonValue },
        { name: 'Pipeline', value: stats.pipelineValue },
        { name: 'Target Gap', value: Math.max(0, boiStats.annualTarget - (stats.wonValue + stats.pipelineValue)) }
    ];

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-800">Executive Dashboard</h2>

            {/* --- TOP ROW: KPI CARDS --- */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="flex items-center gap-4 border-l-4 border-blue-500">
                    <div className="p-3 bg-blue-100 rounded-full text-blue-600"><FileText size={24}/></div>
                    <div>
                        <p className="text-sm text-gray-500 font-bold uppercase">Total Pipeline</p>
                        <p className="text-xl font-bold text-gray-800">{formatCurrency(stats.pipelineValue)}</p>
                    </div>
                </Card>
                <Card className="flex items-center gap-4 border-l-4 border-green-500">
                    <div className="p-3 bg-green-100 rounded-full text-green-600"><CheckCircle size={24}/></div>
                    <div>
                        <p className="text-sm text-gray-500 font-bold uppercase">Revenue Won</p>
                        <p className="text-xl font-bold text-gray-800">{formatCurrency(stats.wonValue)}</p>
                    </div>
                </Card>
                <Card className="flex items-center gap-4 border-l-4 border-orange-500">
                    <div className="p-3 bg-orange-100 rounded-full text-orange-600"><Target size={24}/></div>
                    <div>
                        <p className="text-sm text-gray-500 font-bold uppercase">2026 Target</p>
                        <p className="text-xl font-bold text-gray-800">{formatCurrency(boiStats.annualTarget)}</p>
                    </div>
                </Card>
                <Card className={`flex items-center gap-4 border-l-4 ${boiStats.isCompliant ? 'border-green-500' : 'border-red-500'}`}>
                    <div className={`p-3 rounded-full ${boiStats.isCompliant ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        <Globe size={24}/>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-bold uppercase">Export Ratio</p>
                        <p className="text-xl font-bold text-gray-800">{boiStats.exportPercentage.toFixed(1)}% <span className="text-xs text-gray-400">/ 70%</span></p>
                    </div>
                </Card>
            </div>

            {/* --- MIDDLE ROW: BOI & TARGETS --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. EXPORT COMPLIANCE (PIE CHART) */}
                <Card>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <Globe className="text-orange-600"/> BOI Export Compliance
                            </h3>
                            <p className="text-sm text-gray-500">Target: 70% of Sales must be Export</p>
                        </div>
                        {boiStats.isCompliant ? (
                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                <CheckCircle size={12}/> Compliant
                            </span>
                        ) : (
                            <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                <AlertTriangle size={12}/> Action Needed
                            </span>
                        )}
                    </div>

                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => formatCurrency(value)} />
                                <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="text-center mt-2">
                        <p className="text-sm font-medium text-gray-600">
                            Current Export Share: <span className={`font-bold ${boiStats.isCompliant ? 'text-green-600' : 'text-red-600'}`}>{boiStats.exportPercentage.toFixed(1)}%</span>
                        </p>
                    </div>
                </Card>

                {/* 2. REVENUE TARGET PROGRESS */}
                <Card>
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <TrendingUp className="text-blue-600"/> 2026 Financial Target
                    </h3>
                    
                    <div className="space-y-6">
                        {/* Progress Bar */}
                        <div>
                            <div className="flex justify-between text-sm font-medium text-gray-600 mb-1">
                                <span>Progress</span>
                                <span>{boiStats.progressPercentage.toFixed(1)}% of {formatCurrency(boiStats.annualTarget)}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                                <div 
                                    className="bg-green-500 h-4 rounded-full transition-all duration-1000 ease-out" 
                                    style={{ width: `${boiStats.progressPercentage}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Breakdown */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                <p className="text-xs text-gray-500 uppercase font-bold">Secured Revenue</p>
                                <p className="text-xl font-bold text-green-600">{formatCurrency(boiStats.totalWonRevenue)}</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                <p className="text-xs text-gray-500 uppercase font-bold">Remaining to Target</p>
                                <p className="text-xl font-bold text-gray-400">
                                    {formatCurrency(Math.max(0, boiStats.annualTarget - boiStats.totalWonRevenue))}
                                </p>
                            </div>
                        </div>

                        <div className="bg-blue-50 p-3 rounded text-sm text-blue-700 flex items-center gap-2">
                            <Target size={16}/>
                            <span>
                                <strong>Pipeline Potential:</strong> You have {formatCurrency(stats.pipelineValue)} in active quotes. 
                                Closing these would reach <strong>{(( (boiStats.totalWonRevenue + stats.pipelineValue) / boiStats.annualTarget ) * 100).toFixed(0)}%</strong> of target.
                            </span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* --- BOTTOM ROW: REVENUE FORECAST (Stacked Bar) --- */}
            <Card>
                <h3 className="text-lg font-bold text-gray-800 mb-4">Revenue Forecast vs Target</h3>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            layout="vertical"
                            data={[
                                { name: '2026 Progress', won: boiStats.totalWonRevenue, pipeline: stats.pipelineValue, gap: Math.max(0, boiStats.annualTarget - (boiStats.totalWonRevenue + stats.pipelineValue)) }
                            ]}
                            margin={{ top: 20, right: 30, left: 40, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" tickFormatter={(val) => `$${val/1000}k`} />
                            <YAxis type="category" dataKey="name" />
                            <Tooltip formatter={(value) => formatCurrency(value)} />
                            <Legend />
                            <Bar dataKey="won" name="Won Deals" stackId="a" fill="#22c55e" />
                            <Bar dataKey="pipeline" name="Active Pipeline" stackId="a" fill="#3b82f6" />
                            <Bar dataKey="gap" name="Gap to Target" stackId="a" fill="#e5e7eb" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </Card>
        </div>
    );
};

export default DashboardPage;
