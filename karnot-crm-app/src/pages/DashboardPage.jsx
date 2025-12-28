import React, { useMemo, useState } from 'react';
import { 
    DollarSign, TrendingUp, CheckCircle, Target, Globe, 
    Briefcase, Calendar, Users, Wrench, PhoneCall, Building,
    AlertTriangle, Activity, Package, FileText, TrendingDown,
    MapPin, Award, Zap, Download, Printer, Flame, Wallet
} from 'lucide-react';
import { Card, BOI_TARGETS_USD, Button } from '../data/constants.jsx';

// Helper to format currency
const formatCurrency = (value) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

const formatPHP = (value) => 
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value);

// --- NEW CHART COMPONENTS ---

const MiniBarChart = ({ data, height = 50 }) => {
    if (!data || data.length === 0) return null;
    const max = Math.max(...data);
    return (
        <div className="flex items-end gap-0.5 h-12 mt-2">
            {data.map((value, idx) => (
                <div key={idx} className="flex-1 bg-blue-400 rounded-t transition-all duration-300" 
                      style={{ height: `${(value / max) * 100}%`, minHeight: '3px' }} />
            ))}
        </div>
    );
};

const ProgressCircle = ({ percentage, size = 70 }) => {
    const radius = 30;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;
    return (
        <div className="relative inline-flex">
            <svg width={size} height={size}>
                <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth="6"/>
                <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#9333EA" strokeWidth="6"
                    strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
                    transform={`rotate(-90 ${size/2} ${size/2})`} className="transition-all duration-1000"/>
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-black">
                {percentage.toFixed(0)}%
            </span>
        </div>
    );
};

// --- CSS-Based Chart Components ---

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
    const pipePct = Math.min((pipeline / target) * 100, (100 - wonPct));
    
    return (
        <div className="w-full mt-4">
            <div className="relative h-8 w-full bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                <div className="absolute top-0 left-0 h-full bg-green-500 transition-all duration-1000 flex items-center justify-center text-xs font-bold text-white z-20" style={{ width: `${wonPct}%` }}>
                    {wonPct > 5 && 'WON'}
                </div>
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

const DashboardPage = ({ 
    quotes = [], 
    user, 
    ledgerEntries = [], 
    serviceInvoices = [], 
    appointments = [],
    agents = [],
    serviceContracts = [],
    companies = []
}) => {
    const [generating, setGenerating] = useState(false);
    
    // --- 1. Calculate Sales Pipeline Stats ---
    const pipelineStats = useMemo(() => {
        const totalQuotes = quotes.length;
        const totalValue = quotes.reduce((acc, q) => acc + (q.finalSalesPrice || 0), 0);
        
        const wonQuotes = quotes.filter(q => q.status === 'WON');
        const wonValue = wonQuotes.reduce((acc, q) => acc + (q.finalSalesPrice || 0), 0);
        
        const lostQuotes = quotes.filter(q => q.status === 'LOST');
        const pipelineQuotes = quotes.filter(q => ['DRAFT', 'SENT', 'APPROVED'].includes(q.status));
        const pipelineValue = pipelineQuotes.reduce((acc, q) => acc + (q.finalSalesPrice || 0), 0);

        return { totalQuotes, totalValue, wonQuotes, wonValue, lostQuotes, pipelineValue };
    }, [quotes]);

    // --- 1B. Calculate Export Operations Stats ---
    const exportStats = useMemo(() => {
        const exportCompanies = (companies || []).filter(c => c.isExportTarget === true);
        const totalExportCompanies = exportCompanies.length;
        const vipTargets = exportCompanies.filter(c => c.vipTarget === true).length;
        const highPriority = exportCompanies.filter(c => c.priority === 'High').length;
        
        const byRegion = exportCompanies.reduce((acc, c) => {
            const region = c.region || 'Unknown';
            acc[region] = (acc[region] || 0) + 1;
            return acc;
        }, {});
        
        const activeMarkets = Object.keys(byRegion).length;
        const malaysia = byRegion['MALAYSIA'] || 0;
        const thailand = byRegion['THAILAND'] || 0;
        const vietnam = byRegion['VIETNAM'] || 0;
        const uk = byRegion['UK'] || 0;
        
        return {
            totalExportCompanies,
            vipTargets,
            highPriority,
            activeMarkets,
            byRegion,
            malaysia,
            thailand,
            vietnam,
            uk
        };
    }, [companies]);

    // --- 2. Calculate Financial Stats ---
    const financials = useMemo(() => {
        const rate = 58.5;
        
        const boiRevenue = quotes
            .filter(q => ['WON', 'INVOICED', 'PAID'].includes(q.status) && q.boiActivity !== false)
            .reduce((sum, q) => {
                const quoteRate = q.costing?.forexRate || rate;
                return sum + (Number(q.finalSalesPrice) * quoteRate);
            }, 0);

        const nonBoiRevenue = (serviceInvoices || [])
            .filter(inv => inv.status === 'PAID' || inv.status === 'INVOICED')
            .reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
        
        const totalRevenue = boiRevenue + nonBoiRevenue;

        const cogs = ledgerEntries
            .filter(e => ['Cost of Goods Sold', 'Project Materials', 'Direct Materials'].includes(e.category))
            .reduce((sum, e) => sum + Number(e.amountPHP || 0), 0);

        const opex = ledgerEntries
            .filter(e => !['Cost of Goods Sold', 'Project Materials', 'Direct Materials'].includes(e.category))
            .reduce((sum, e) => sum + Number(e.amountPHP || 0), 0);

        const grossProfit = totalRevenue - cogs;
        const netIncome = totalRevenue - cogs - opex;
        const margin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;
        const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

        return {
            boiRevenue,
            nonBoiRevenue,
            totalRevenue,
            cogs,
            grossProfit,
            opex,
            netIncome,
            margin,
            grossMargin
        };
    }, [quotes, ledgerEntries, serviceInvoices]);

    // --- 3. Calculate BOI Compliance ---
    const boiCompliance = useMemo(() => {
        const wonItems = pipelineStats.wonQuotes;
        
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
    }, [pipelineStats.wonQuotes]);

    // --- 4. Calculate Service Operations Stats ---
    const serviceStats = useMemo(() => {
        const activeContracts = (serviceContracts || []).filter(c => c.status === 'Active').length;
        const totalContracts = (serviceContracts || []).length;
        
        const serviceRevenue = (serviceInvoices || [])
            .filter(inv => inv.status === 'PAID' || inv.status === 'INVOICED')
            .reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);

        const pendingInvoices = (serviceInvoices || [])
            .filter(inv => inv.status === 'DRAFT' || inv.status === 'SENT')
            .length;

        return {
            activeContracts,
            totalContracts,
            serviceRevenue,
            pendingInvoices
        };
    }, [serviceContracts, serviceInvoices]);

    // --- 5. Calculate Sales Activity Stats ---
    const salesActivity = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const upcomingAppts = (appointments || []).filter(appt => {
            if (!appt.appointmentDate) return false;
            const apptDate = new Date(appt.appointmentDate);
            return apptDate >= today && ['Scheduled', 'Confirmed'].includes(appt.status);
        }).length;

        const completedThisMonth = (appointments || []).filter(appt => {
            if (!appt.appointmentDate) return false;
            const apptDate = new Date(appt.appointmentDate);
            return apptDate.getMonth() === today.getMonth() && 
                   apptDate.getFullYear() === today.getFullYear() &&
                   appt.status === 'Completed';
        }).length;

        const activeAgents = (agents || []).filter(a => a.status === 'Active').length;
        const totalAgents = (agents || []).length;

        const targetAccounts = (companies || []).filter(c => c.isTarget).length;
        const customerAccounts = (companies || []).filter(c => c.isCustomer).length;

        return {
            upcomingAppts,
            completedThisMonth,
            activeAgents,
            totalAgents,
            targetAccounts,
            customerAccounts
        };
    }, [appointments, agents, companies]);

    // --- 6. PROFESSIONAL BUSINESS METRICS ---
    const businessMetrics = useMemo(() => {
        // MRR (Monthly Recurring Revenue)
        const mrr = serviceStats.serviceRevenue;
        const arr = mrr * 12;
        
        // CAC (Customer Acquisition Cost)
        const marketingSpend = ledgerEntries
            .filter(e => e.category === 'Marketing' || e.category === 'Sales & Marketing')
            .reduce((sum, e) => sum + Number(e.amountPHP || 0), 0);
        
        const newCustomers = pipelineStats.wonQuotes.length || 1;
        const cac = marketingSpend / newCustomers;
        
        // LTV (Lifetime Value)
        const avgContractValue = pipelineStats.wonValue / newCustomers;
        const avgContractLengthMonths = 36; // 3 years
        const ltv = avgContractValue * (financials.grossMargin / 100) * avgContractLengthMonths;
        
        // LTV:CAC Ratio
        const ltvCacRatio = cac > 0 ? ltv / cac : 0;
        
        // Burn Rate & Runway
        const monthlyBurn = financials.opex / 12;
        const estimatedCash = 500000; // Update this with your actual cash balance
        const runway = monthlyBurn > 0 ? estimatedCash / monthlyBurn : 999;
        
        // Unit Economics
        const avgDealSize = pipelineStats.wonValue / Math.max(pipelineStats.wonQuotes.length, 1);
        const avgGrossMargin = avgDealSize * (financials.grossMargin / 100);
        const paybackMonths = cac > 0 ? cac / (avgGrossMargin / 12) : 0;
        
        // Monthly revenue trend (last 6 months simulation)
        const monthlyRevenue = [0.6, 0.7, 0.8, 0.85, 0.92, 1.0].map(x => financials.totalRevenue * x);
        
        return {
            mrr,
            arr,
            cac,
            ltv,
            ltvCacRatio,
            burnRate: monthlyBurn,
            runway,
            avgDealSize,
            avgGrossMargin,
            paybackMonths,
            monthlyRevenue
        };
    }, [pipelineStats, financials, ledgerEntries, serviceStats]);

// --- ONE-CLICK PDF GENERATION ---
    const generatePDF = async () => {
        setGenerating(true);
        
        try {
            if (!window.jspdf) {
                alert('⚠️ Loading PDF library... Please refresh and try again.');
                setGenerating(false);
                return;
            }
            
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // PAGE 1: COVER
            doc.setFillColor(255, 107, 53); // Karnot Orange
            doc.rect(0, 0, 210, 40, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(24);
            doc.setFont('helvetica', 'bold');
            doc.text('KARNOT ENERGY SOLUTIONS', 105, 20, { align: 'center' });
            doc.setFontSize(14);
            doc.text('Monthly Investor Report', 105, 30, { align: 'center' });
            
            doc.setTextColor(0);
            doc.setFontSize(12);
            doc.text(new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), 105, 50, { align: 'center' });
            
            // Executive Summary
            doc.setFillColor(245, 245, 245);
            doc.rect(15, 60, 180, 95, 'F');
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('EXECUTIVE SUMMARY', 20, 70);
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            let y = 80;
            doc.text(`Revenue: ${formatPHP(financials.totalRevenue)}`, 25, y); y += 7;
            doc.text(`Net Income: ${formatPHP(financials.netIncome)}`, 25, y); y += 7;
            doc.text(`Gross Margin: ${financials.grossMargin.toFixed(1)}%`, 25, y); y += 7;
            doc.text(`Pipeline: ${formatCurrency(pipelineStats.pipelineValue)}`, 25, y); y += 7;
            doc.text(`Export: ${boiCompliance.exportPercentage.toFixed(1)}% ${boiCompliance.isCompliant ? '✓' : '✗'}`, 25, y); y += 7;
            doc.text(`LTV:CAC: ${businessMetrics.ltvCacRatio.toFixed(2)}:1`, 25, y); y += 7;
            doc.text(`ARR: ${formatPHP(businessMetrics.arr)}`, 25, y); y += 7;
            doc.text(`MRR: ${formatPHP(businessMetrics.mrr)}`, 25, y); y += 7;
            doc.text(`Burn: ${formatPHP(businessMetrics.burnRate)}/mo`, 25, y); y += 7;
            doc.text(`Runway: ${businessMetrics.runway.toFixed(0)} months`, 25, y);
            
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 280, { align: 'center' });
            doc.text('Confidential - For Investor Use Only', 105, 285, { align: 'center' });
            
            // PAGE 2: FINANCIALS
            doc.addPage();
            doc.setTextColor(0);
            doc.setFillColor(74, 144, 226);
            doc.rect(0, 0, 210, 25, 'F');
            doc.setTextColor(255);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('Financial Performance', 20, 15);
            
            doc.setTextColor(0);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            y = 35;
            doc.text(`BOI Revenue: ${formatPHP(financials.boiRevenue)}`, 25, y); y += 6;
            doc.text(`Service Revenue: ${formatPHP(financials.nonBoiRevenue)}`, 25, y); y += 6;
            doc.text(`Total Revenue: ${formatPHP(financials.totalRevenue)}`, 25, y); y += 8;
            doc.text(`COGS: ${formatPHP(financials.cogs)}`, 25, y); y += 6;
            doc.text(`Gross Profit: ${formatPHP(financials.grossProfit)} (${financials.grossMargin.toFixed(1)}%)`, 25, y); y += 6;
            doc.text(`OpEx: ${formatPHP(financials.opex)}`, 25, y); y += 6;
            doc.setFont('helvetica', 'bold');
            doc.text(`Net Income: ${formatPHP(financials.netIncome)} (${financials.margin.toFixed(1)}%)`, 25, y);
            
            // PAGE 3: SALES & BOI
            doc.addPage();
            doc.setFillColor(123, 31, 162);
            doc.rect(0, 0, 210, 25, 'F');
            doc.setTextColor(255);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('Sales & BOI Compliance', 20, 15);
            
            doc.setTextColor(0);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            y = 35;
            doc.text(`Pipeline: ${formatCurrency(pipelineStats.pipelineValue)}`, 25, y); y += 6;
            doc.text(`Won (YTD): ${formatCurrency(pipelineStats.wonValue)}`, 25, y); y += 6;
            doc.text(`Quotes: ${pipelineStats.totalQuotes} (${pipelineStats.wonQuotes.length} won)`, 25, y); y += 6;
            doc.text(`Win Rate: ${(pipelineStats.wonQuotes.length / Math.max(pipelineStats.totalQuotes, 1) * 100).toFixed(1)}%`, 25, y); y += 10;
            
            doc.setFont('helvetica', 'bold');
            doc.text('BOI Compliance:', 25, y); y += 8;
            doc.setFont('helvetica', 'normal');
            doc.text(`Export: ${formatCurrency(boiCompliance.exportRevenue)}`, 25, y); y += 6;
            doc.text(`Domestic: ${formatCurrency(boiCompliance.domesticRevenue)}`, 25, y); y += 6;
            doc.text(`Export %: ${boiCompliance.exportPercentage.toFixed(1)}%`, 25, y); y += 6;
            doc.text(`Status: ${boiCompliance.isCompliant ? 'COMPLIANT ✓' : 'ACTION REQUIRED ✗'}`, 25, y); y += 6;
            doc.text(`Target: ${formatCurrency(boiCompliance.annualTarget)}`, 25, y); y += 6;
            doc.text(`Progress: ${boiCompliance.progressPercentage.toFixed(1)}%`, 25, y);
            
            doc.save(`Karnot_Report_${new Date().toISOString().split('T')[0]}.pdf`);
            alert('✅ PDF Downloaded Successfully!');
            
        } catch (error) {
            console.error('PDF Error:', error);
            alert('❌ Error generating PDF. Check console.');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="space-y-6 pb-10">
            {/* HEADER WITH INVESTOR REPORT BUTTON */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <h2 className="text-3xl font-bold text-gray-800">Executive Dashboard</h2>
                
                <div className="flex gap-2">
                    <Button
                        onClick={generatePDF}
                        disabled={generating}
                        variant="primary"
                        className="bg-purple-600 hover:bg-purple-700 font-bold uppercase text-xs tracking-wider h-10"
                    >
                        {generating ? (
                            <>
                                <Activity size={16} className="mr-2 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Download size={16} className="mr-2" />
                                Investor Report
                            </>
                        )}
                    </Button>
                    
                    <Button
                        onClick={() => window.print()}
                        variant="secondary"
                        className="font-bold uppercase text-xs tracking-wider h-10"
                    >
                        <Printer size={16} className="mr-2" />
                        Print
                    </Button>
                </div>
            </div>

            {/* --- NEW: PROFESSIONAL BUSINESS METRICS ROW --- */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* LTV:CAC Ratio */}
                <Card className="border-l-4 border-purple-500">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <p className="text-xs text-gray-500 font-bold uppercase">LTV:CAC Ratio</p>
                            <p className="text-3xl font-black text-purple-600">
                                {businessMetrics.ltvCacRatio.toFixed(1)}:1
                            </p>
                            <p className="text-[10px] text-gray-400">Target: 3:1</p>
                        </div>
                        <ProgressCircle percentage={Math.min(businessMetrics.ltvCacRatio / 3 * 100, 100)} />
                    </div>
                    <div className={`text-xs font-bold mt-2 ${businessMetrics.ltvCacRatio >= 3 ? 'text-green-600' : 'text-orange-600'}`}>
                        {businessMetrics.ltvCacRatio >= 3 ? '✓ Healthy' : '⚠ Monitor'}
                    </div>
                </Card>

                {/* ARR */}
                <Card className="border-l-4 border-green-500">
                    <div className="flex items-start justify-between mb-2">
                        <div>
                            <p className="text-xs text-gray-500 font-bold uppercase">ARR</p>
                            <p className="text-2xl font-black text-green-600">
                                {formatPHP(businessMetrics.arr)}
                            </p>
                            <p className="text-[10px] text-gray-400">MRR: {formatPHP(businessMetrics.mrr)}</p>
                        </div>
                        <DollarSign className="text-green-600" size={24} />
                    </div>
                    <MiniBarChart data={businessMetrics.monthlyRevenue} />
                </Card>

                {/* Burn Rate */}
                <Card className="border-l-4 border-orange-500">
                    <div className="flex items-start justify-between mb-2">
                        <div>
                            <p className="text-xs text-gray-500 font-bold uppercase">Monthly Burn</p>
                            <p className="text-2xl font-black text-orange-600">
                                {formatPHP(businessMetrics.burnRate)}
                            </p>
                            <p className="text-[10px] text-gray-400">Runway: {businessMetrics.runway.toFixed(0)}mo</p>
                        </div>
                        <Flame className="text-orange-600" size={24} />
                    </div>
                    <div className={`text-xs font-bold mt-2 ${businessMetrics.runway >= 12 ? 'text-green-600' : 'text-red-600'}`}>
                        {businessMetrics.runway >= 12 ? '✓ Safe' : '⚠ Funding Needed'}
                    </div>
                </Card>

                {/* Unit Economics */}
                <Card className="border-l-4 border-blue-500">
                    <div className="flex items-start justify-between mb-2">
                        <div>
                            <p className="text-xs text-gray-500 font-bold uppercase">Avg Deal Size</p>
                            <p className="text-2xl font-black text-blue-600">
                                {formatCurrency(businessMetrics.avgDealSize)}
                            </p>
                            <p className="text-[10px] text-gray-400">Payback: {businessMetrics.paybackMonths.toFixed(1)}mo</p>
                        </div>
                        <Briefcase className="text-blue-600" size={24} />
                    </div>
                </Card>
            </div>

            {/* --- TOP ROW: PRIMARY KPI CARDS --- */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="flex items-center gap-4 border-l-4 border-blue-500 shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-3 bg-blue-50 rounded-full text-blue-600"><Briefcase size={24}/></div>
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Pipeline Value</p>
                        <p className="text-xl font-extrabold text-gray-800">{formatCurrency(pipelineStats.pipelineValue)}</p>
                    </div>
                </Card>
                <Card className="flex items-center gap-4 border-l-4 border-green-500 shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-3 bg-green-50 rounded-full text-green-600"><CheckCircle size={24}/></div>
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Revenue Won</p>
                        <p className="text-xl font-extrabold text-gray-800">{formatCurrency(pipelineStats.wonValue)}</p>
                    </div>
                </Card>
                <Card className="flex items-center gap-4 border-l-4 border-purple-500 shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-3 bg-purple-50 rounded-full text-purple-600"><DollarSign size={24}/></div>
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Net Income</p>
                        <p className={`text-xl font-extrabold ${financials.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatPHP(financials.netIncome)}
                        </p>
                    </div>
                </Card>
                <Card className={`flex items-center gap-4 border-l-4 shadow-sm hover:shadow-md transition-shadow ${boiCompliance.isCompliant ? 'border-green-500' : 'border-red-500'}`}>
                    <div className={`p-3 rounded-full ${boiCompliance.isCompliant ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                        <Globe size={24}/>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Export Ratio</p>
                        <p className="text-xl font-extrabold text-gray-800">{boiCompliance.exportPercentage.toFixed(1)}% <span className="text-xs text-gray-400 font-normal">/ 70%</span></p>
                    </div>
                </Card>
            </div>

            {/* --- SECOND ROW: FINANCIAL & OPERATIONAL METRICS --- */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="flex items-center gap-4 border-l-4 border-orange-500 shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-3 bg-orange-50 rounded-full text-orange-600"><Wrench size={24}/></div>
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Service Revenue</p>
                        <p className="text-lg font-extrabold text-gray-800">{formatPHP(serviceStats.serviceRevenue)}</p>
                        <p className="text-[10px] text-gray-400">{serviceStats.activeContracts} active contracts</p>
                    </div>
                </Card>
                <Card className="flex items-center gap-4 border-l-4 border-indigo-500 shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-3 bg-indigo-50 rounded-full text-indigo-600"><Activity size={24}/></div>
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Gross Profit</p>
                        <p className="text-lg font-extrabold text-gray-800">{formatPHP(financials.grossProfit)}</p>
                        <p className="text-[10px] text-gray-400">
                            {financials.totalRevenue > 0 ? ((financials.grossProfit / financials.totalRevenue) * 100).toFixed(1) : 0}% margin
                        </p>
                    </div>
                </Card>
                <Card className="flex items-center gap-4 border-l-4 border-cyan-500 shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-3 bg-cyan-50 rounded-full text-cyan-600"><Calendar size={24}/></div>
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Appointments</p>
                        <p className="text-lg font-extrabold text-gray-800">{salesActivity.upcomingAppts}</p>
                        <p className="text-[10px] text-gray-400">{salesActivity.completedThisMonth} completed this month</p>
                    </div>
                </Card>
                <Card className="flex items-center gap-4 border-l-4 border-teal-500 shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-3 bg-teal-50 rounded-full text-teal-600"><Users size={24}/></div>
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Sales Team</p>
                        <p className="text-lg font-extrabold text-gray-800">{salesActivity.activeAgents} / {salesActivity.totalAgents}</p>
                        <p className="text-[10px] text-gray-400">Active agents</p>
                    </div>
                </Card>
            </div>

            {/* --- EXPORT OPERATIONS ROW --- */}
            {exportStats.totalExportCompanies > 0 && (
                <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-orange-600 rounded-lg">
                                <Globe className="text-white" size={20}/>
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-gray-800 uppercase">Export Operations</h3>
                                <p className="text-xs text-gray-600 font-bold">International Market Penetration</p>
                            </div>
                        </div>
                        <span className="bg-orange-600 text-white px-3 py-1 rounded-full text-xs font-black">
                            BOI EXPORT
                        </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="bg-white rounded-xl p-4 border-2 border-orange-100 text-center">
                            <Building className="mx-auto text-orange-600 mb-2" size={24}/>
                            <p className="text-2xl font-black text-gray-800">{exportStats.totalExportCompanies}</p>
                            <p className="text-[10px] text-gray-500 uppercase font-bold">Partners</p>
                        </div>

                        <div className="bg-white rounded-xl p-4 border-2 border-purple-100 text-center">
                            <Award className="mx-auto text-purple-600 mb-2" size={24}/>
                            <p className="text-2xl font-black text-gray-800">{exportStats.vipTargets}</p>
                            <p className="text-[10px] text-gray-500 uppercase font-bold">VIP Targets</p>
                        </div>

                        <div className="bg-white rounded-xl p-4 border-2 border-red-100 text-center">
                            <Zap className="mx-auto text-red-600 mb-2" size={24}/>
                            <p className="text-2xl font-black text-gray-800">{exportStats.highPriority}</p>
                            <p className="text-[10px] text-gray-500 uppercase font-bold">High Priority</p>
                        </div>

                        <div className="bg-white rounded-xl p-4 border-2 border-blue-100 text-center">
                            <MapPin className="mx-auto text-blue-600 mb-2" size={24}/>
                            <p className="text-2xl font-black text-gray-800">{exportStats.activeMarkets}</p>
                            <p className="text-[10px] text-gray-500 uppercase font-bold">Markets</p>
                        </div>

                        <div className="bg-white rounded-xl p-4 border-2 border-green-100">
                            <p className="text-[10px] text-gray-500 uppercase font-black mb-2 text-center">By Region</p>
                            <div className="space-y-1 text-xs">
                                {exportStats.malaysia > 0 && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600 font-bold">🇲🇾 MY</span>
                                        <span className="font-black text-gray-800">{exportStats.malaysia}</span>
                                    </div>
                                )}
                                {exportStats.thailand > 0 && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600 font-bold">🇹🇭 TH</span>
                                        <span className="font-black text-gray-800">{exportStats.thailand}</span>
                                    </div>
                                )}
                                {exportStats.vietnam > 0 && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600 font-bold">🇻🇳 VN</span>
                                        <span className="font-black text-gray-800">{exportStats.vietnam}</span>
                                    </div>
                                )}
                                {exportStats.uk > 0 && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600 font-bold">🇬🇧 UK</span>
                                        <span className="font-black text-gray-800">{exportStats.uk}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {/* --- BOI COMPLIANCE & REVENUE TARGET --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <Card>
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <Globe className="text-orange-600" size={20}/> BOI Export Compliance
                            </h3>
                            <p className="text-sm text-gray-500">Requirement: 70% of Sales must be Export</p>
                        </div>
                        {boiCompliance.isCompliant ? (
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
                            <span className={`text-2xl font-bold ${boiCompliance.isCompliant ? 'text-green-600' : 'text-red-500'}`}>
                                {boiCompliance.exportPercentage.toFixed(1)}%
                            </span>
                        </div>
                        
                        <SplitBar 
                            partA={boiCompliance.exportRevenue} 
                            partB={boiCompliance.domesticRevenue} 
                            labelA="Export" 
                            labelB="Domestic"
                            colorA="bg-orange-500"
                            colorB="bg-blue-500"
                        />
                    </div>
                </Card>

                <Card>
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <TrendingUp className="text-blue-600" size={20}/> 2026 Financial Goal
                            </h3>
                            <p className="text-sm text-gray-500">Progress towards annual target</p>
                        </div>
                        <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
                            {boiCompliance.progressPercentage.toFixed(1)}% Achieved
                        </span>
                    </div>

                    <StackedTargetBar 
                        won={pipelineStats.wonValue} 
                        pipeline={pipelineStats.pipelineValue} 
                        target={boiCompliance.annualTarget} 
                    />

                    <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-gray-400 uppercase font-bold">Total Gap</p>
                            <p className="text-lg font-bold text-gray-700">
                                {formatCurrency(Math.max(0, boiCompliance.annualTarget - boiCompliance.totalWonRevenue))}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase font-bold">Pipeline Coverage</p>
                            <p className="text-lg font-bold text-blue-600">
                                {((pipelineStats.pipelineValue / Math.max(1, boiCompliance.annualTarget - boiCompliance.totalWonRevenue)) * 100).toFixed(0)}%
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* --- FINANCIALS OVERVIEW --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <Card>
                    <div className="flex items-center gap-2 mb-6">
                        <Activity className="text-indigo-600" size={20}/>
                        <h3 className="text-lg font-bold text-gray-800">Profit & Loss Overview</h3>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-100">
                            <span className="text-sm font-bold text-gray-600">Total Revenue</span>
                            <span className="text-lg font-black text-green-600">{formatPHP(financials.totalRevenue)}</span>
                        </div>
                        
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <span className="text-sm font-bold text-gray-600 flex items-center gap-2">
                                BOI Revenue
                                <span className="text-[9px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-black">
                                    {financials.totalRevenue > 0 ? ((financials.boiRevenue / financials.totalRevenue) * 100).toFixed(0) : 0}%
                                </span>
                            </span>
                            <span className="text-md font-bold text-gray-700">{formatPHP(financials.boiRevenue)}</span>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <span className="text-sm font-bold text-gray-600 flex items-center gap-2">
                                Service Revenue
                                <span className="text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-black">
                                    {financials.totalRevenue > 0 ? ((financials.nonBoiRevenue / financials.totalRevenue) * 100).toFixed(0) : 0}%
                                </span>
                            </span>
                            <span className="text-md font-bold text-gray-700">{formatPHP(financials.nonBoiRevenue)}</span>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100">
                            <span className="text-sm font-bold text-gray-600">Cost of Goods Sold</span>
                            <span className="text-lg font-black text-red-600">-{formatPHP(financials.cogs)}</span>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                            <span className="text-sm font-bold text-gray-600">Gross Profit</span>
                            <span className="text-lg font-black text-blue-600">{formatPHP(financials.grossProfit)}</span>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg border border-orange-100">
                            <span className="text-sm font-bold text-gray-600">Operating Expenses</span>
                            <span className="text-lg font-black text-orange-600">-{formatPHP(financials.opex)}</span>
                        </div>

                        <div className={`flex justify-between items-center p-3 rounded-lg border ${financials.netIncome >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                            <span className="text-sm font-bold text-gray-800">Net Income</span>
                            <div className="text-right">
                                <span className={`text-xl font-black ${financials.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatPHP(financials.netIncome)}
                                </span>
                                <p className="text-[10px] text-gray-500">{financials.margin.toFixed(1)}% margin</p>
                            </div>
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center gap-2 mb-6">
                        <Target className="text-cyan-600" size={20}/>
                        <h3 className="text-lg font-bold text-gray-800">Sales & Service Activity</h3>
                    </div>

                    <div className="space-y-4">
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <p className="text-xs font-black uppercase text-slate-500 mb-3">Account Portfolio</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="text-center p-3 bg-white rounded-lg border border-slate-200">
                                    <Building className="text-green-500 mx-auto mb-1" size={20}/>
                                    <p className="text-2xl font-black text-gray-800">{salesActivity.customerAccounts}</p>
                                    <p className="text-[10px] text-gray-500 uppercase font-bold">Customers</p>
                                </div>
                                <div className="text-center p-3 bg-white rounded-lg border border-slate-200">
                                    <Target className="text-orange-500 mx-auto mb-1" size={20}/>
                                    <p className="text-2xl font-black text-gray-800">{salesActivity.targetAccounts}</p>
                                    <p className="text-[10px] text-gray-500 uppercase font-bold">Target Accts</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-cyan-50 rounded-xl border border-cyan-100">
                            <p className="text-xs font-black uppercase text-cyan-700 mb-3">Appointments</p>
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-3xl font-black text-cyan-600">{salesActivity.upcomingAppts}</p>
                                    <p className="text-xs text-cyan-700 font-bold">Upcoming</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-bold text-gray-700">{salesActivity.completedThisMonth}</p>
                                    <p className="text-xs text-gray-500 font-bold">Completed MTD</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
                            <p className="text-xs font-black uppercase text-orange-700 mb-3">Service Operations</p>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-gray-600">Active Contracts</span>
                                    <span className="text-lg font-black text-orange-600">{serviceStats.activeContracts}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-gray-600">Pending Invoices</span>
                                    <span className="text-lg font-black text-orange-600">{serviceStats.pendingInvoices}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-orange-200">
                                    <span className="text-sm font-bold text-gray-700">Service Revenue</span>
                                    <span className="text-lg font-black text-orange-600">{formatPHP(serviceStats.serviceRevenue)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                            <p className="text-xs font-black uppercase text-indigo-700 mb-3">Sales Team</p>
                            <div className="flex items-center justify-between">
                                <Users className="text-indigo-500" size={32}/>
                                <div className="text-right">
                                    <p className="text-2xl font-black text-indigo-600">
                                        {salesActivity.activeAgents} <span className="text-sm text-gray-500">/ {salesActivity.totalAgents}</span>
                                    </p>
                                    <p className="text-xs text-indigo-700 font-bold">Active Agents</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* --- ALERTS --- */}
            {(!boiCompliance.isCompliant || financials.netIncome < 0 || salesActivity.upcomingAppts < 5) && (
                <Card className="border-l-4 border-yellow-500 bg-yellow-50">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="text-yellow-600 mt-1" size={20}/>
                        <div className="flex-1">
                            <h3 className="text-sm font-bold text-gray-800 mb-2">Action Items</h3>
                            <ul className="space-y-1 text-xs text-gray-700">
                                {!boiCompliance.isCompliant && (
                                    <li>• <span className="font-bold text-red-600">BOI Compliance Alert:</span> Export sales below 70% requirement</li>
                                )}
                                {financials.netIncome < 0 && (
                                    <li>• <span className="font-bold text-orange-600">Profitability Alert:</span> Current net income is negative</li>
                                )}
                                {salesActivity.upcomingAppts < 5 && (
                                    <li>• <span className="font-bold text-blue-600">Pipeline Alert:</span> Low number of upcoming appointments scheduled</li>
                                )}
                            </ul>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default DashboardPage;
