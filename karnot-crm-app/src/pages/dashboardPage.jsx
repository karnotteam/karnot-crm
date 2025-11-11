import React, { useMemo } from 'react';
import { DollarSign, Target, PieChart } from 'lucide-react';
import { QUOTE_STATUSES, BOI_TARGETS_USD, Card, Section } from '../data/constants.jsx';

// This is your Dashboard component, moved from App.jsx
const DashboardPage = ({ quotes }) => {
    // Helper to format large numbers
    const formatLargeNumber = (num) => {
        const number = num || 0;
        if (number >= 1e12) return `₱${(number / 1e12).toFixed(2)}T`;
        if (number >= 1e9) return `₱${(number / 1e9).toFixed(2)}B`;
        if (number >= 1e6) return `₱${(number / 1e6).toFixed(2)}M`;
        return `₱${number.toLocaleString('en-US', {maximumFractionDigits: 0})}`;
    };

    const stats = useMemo(() => {
        const forexRate = 58.5; // Centralize forex rate for dashboard calculations
        const approvedQuotes = quotes.filter(q => q.status === 'APPROVED');
        const outstandingQuotes = quotes.filter(q => ['DRAFT', 'SENT'].includes(q.status));
        
        const ordersWonValue = approvedQuotes.reduce((acc, q) => acc + (q.finalSalesPrice || 0), 0);
        const outstandingValue = outstandingQuotes.reduce((acc, q) => acc + (q.finalSalesPrice || 0), 0);
        const totalMarginAmount = approvedQuotes.reduce((acc, q) => acc + (q.grossMarginAmount || 0), 0);
        const avgMargin = ordersWonValue > 0 ? (totalMarginAmount / ordersWonValue) * 100 : 0;
        
        const statusCounts = quotes.reduce((acc, q) => {
            acc[q.status] = (acc[q.status] || 0) + 1;
            return acc;
        }, {});
        
        const salesByYear = approvedQuotes.reduce((acc, q) => {
            const year = q.createdAt ? new Date(q.createdAt).getFullYear() : new Date().getFullYear();
            const saleInPHP = (q.finalSalesPrice || 0) * (q.costing?.forexRate || forexRate);
            acc[year] = (acc[year] || 0) + saleInPHP;
            return acc;
        }, {});
        
        const exportSales = approvedQuotes.filter(q => q.customer?.saleType === 'Export').reduce((acc, q) => acc + (q.finalSalesPrice || 0), 0);
        const domesticSales = approvedQuotes.filter(q => q.customer?.saleType === 'Domestic').reduce((acc, q) => acc + (q.finalSalesPrice || 0), 0);
        const totalSales = exportSales + domesticSales;
        const exportPercentage = totalSales > 0 ? (exportSales / totalSales) * 100 : 0;

        return { ordersWonValue, outstandingValue, avgMargin, statusCounts, salesByYear, exportSales, domesticSales, exportPercentage, forexRate };
    }, [quotes]);

    const StatCard = ({ title, value, icon, color }) => (
        <Card className="flex items-center">
            <div className={`p-3 rounded-full mr-4 ${color}`}>{icon}</div>
            <div><p className="text-gray-500 text-sm">{title}</p><p className="text-2xl font-bold">{value}</p></div>
        </Card>
    );
    
    const CircularProgress = ({ percentage, label }) => {
        const radius = 50;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (Math.min(100, Math.max(0, percentage)) / 100 * circumference);
        return (
            <div className="relative flex items-center justify-center w-32 h-32">
                <svg className="w-full h-full" viewBox="0 0 120 120">
                    <circle className="text-gray-200" strokeWidth="10" stroke="currentColor" fill="transparent" r={radius} cx="60" cy="60" />
                    <circle className="text-orange-500 transition-all duration-500" strokeWidth="10" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" stroke="currentColor" fill="transparent" r={radius} cx="60" cy="60" style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }} />
                </svg>
                <span className="absolute text-xl font-bold">{label}</span>
            </div>
        );
    };

    return (
        <div className="space-y-10">
            <Section title="Sales Dashboard">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <StatCard title="Orders Won" value={`$${stats.ordersWonValue.toLocaleString('en-US', {maximumFractionDigits:0})}`} icon={<DollarSign className="text-white"/>} color="bg-green-500" />
                    <StatCard title="Outstanding Quotes" value={`$${stats.outstandingValue.toLocaleString('en-US', {maximumFractionDigits:0})}`} icon={<Target className="text-white"/>} color="bg-blue-500" />
                    <StatCard title="Avg. Margin (Won)" value={`${stats.avgMargin.toFixed(2)}%`} icon={<PieChart className="text-white"/>} color="bg-yellow-500" />
                </div>
                <Card className="mt-8">
                    <h3 className="text-xl font-bold mb-4">Quotes by Status</h3>
                    <div className="flex flex-wrap justify-around items-center gap-4">
                        {Object.keys(QUOTE_STATUSES).map(statusKey => (
                            <div key={statusKey} className="text-center">
                                <p className="text-4xl font-bold">{stats.statusCounts[statusKey] || 0}</p>
                                <span className={`px-3 py-1 text-sm font-semibold text-white rounded-full ${QUOTE_STATUSES[statusKey]?.color || 'bg-gray-400'}`}>{QUOTE_STATUSES[statusKey]?.text || statusKey}</span>
                            </div>
                        ))}
                    </div>
                </Card>
            </Section>
            
            <Section title="BOI Compliance Dashboard">
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <Card>
                        <h3 className="text-xl font-bold mb-4">Sales Mix (Export vs. Domestic)</h3>
                        <div className="w-full bg-blue-200 rounded-full h-8">
                            <div className="bg-green-600 h-8 rounded-l-full text-center text-white font-bold leading-8" style={{ width: `${stats.exportPercentage}%` }}>
                                {stats.exportPercentage > 15 && `Export ${stats.exportPercentage.toFixed(1)}%`}
                            </div>
                        </div>
                         <div className="text-center mt-2 text-sm text-gray-600">
                             BOI Target: 70% Export
                         </div>
                    </Card>
                    <Card>
                        <h3 className="text-xl font-bold mb-4">Annual Sales vs. BOI Target (PHP)</h3>
                        <div className="flex flex-col md:flex-row justify-around items-center text-center gap-6">
                            {Object.keys(BOI_TARGETS_USD).map(year => {
                                const sales = stats.salesByYear[year] || 0;
                                const targetPHP = BOI_TARGETS_USD[year] * stats.forexRate;
                                const percentage = targetPHP > 0 ? (sales / targetPHP) * 100 : 0;
                                return (
                                    <div key={year}>
                                        <p className="font-bold text-lg">{year}</p>
                                        <CircularProgress percentage={percentage} label={`${percentage.toFixed(1)}%`} />
                                        <p className="text-sm mt-2">
                                            <span className="font-semibold">Actual:</span> {formatLargeNumber(sales)}<br/>
                                            <span className="text-gray-500">Target: {formatLargeNumber(targetPHP)}</span>
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                 </div>
            </Section>
        </div>
    );
};

export default DashboardPage;
