import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { BarChart2, TrendingUp, DollarSign, Activity, Settings, X, Save, Target } from 'lucide-react';
import { Card, Button, Input } from '../data/constants.jsx';

// --- Edit Targets Modal ---
const TargetsModal = ({ onClose, onSave, currentTargets }) => {
    const [yearlyGoal, setYearlyGoal] = useState(currentTargets?.yearlyGoal || 10000000);
    const [monthlyGoal, setMonthlyGoal] = useState(currentTargets?.monthlyGoal || 1000000);
    const [conversionGoal, setConversionGoal] = useState(currentTargets?.conversionGoal || 30);

    const handleSave = () => {
        onSave({ 
            yearlyGoal: parseFloat(yearlyGoal), 
            monthlyGoal: parseFloat(monthlyGoal), 
            conversionGoal: parseFloat(conversionGoal) 
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-30 flex justify-center items-center p-4">
            <Card className="w-full max-w-md">
                <div className="flex justify-between items-center mb-6 border-b pb-2">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Target className="text-orange-600"/> Sales Targets
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><X /></button>
                </div>
                
                <div className="space-y-4">
                    <Input 
                        label="Yearly Revenue Goal (PHP)" 
                        type="number" 
                        value={yearlyGoal} 
                        onChange={(e) => setYearlyGoal(e.target.value)} 
                    />
                    <Input 
                        label="Monthly Revenue Goal (PHP)" 
                        type="number" 
                        value={monthlyGoal} 
                        onChange={(e) => setMonthlyGoal(e.target.value)} 
                    />
                    <Input 
                        label="Target Win Rate (%)" 
                        type="number" 
                        value={conversionGoal} 
                        onChange={(e) => setConversionGoal(e.target.value)} 
                    />
                </div>

                <div className="mt-6 flex justify-end gap-2">
                    <Button onClick={onClose} variant="secondary">Cancel</Button>
                    <Button onClick={handleSave} variant="primary">
                        <Save className="mr-2" size={16}/> Save Targets
                    </Button>
                </div>
            </Card>
        </div>
    );
};

// --- Stat Card Component ---
const StatCard = ({ title, value, subtext, icon: Icon, color, progress }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
        <div className="flex justify-between items-start mb-4">
            <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
                <h3 className="text-2xl font-bold text-gray-800 mt-1">{value}</h3>
            </div>
            <div className={`p-3 rounded-full bg-${color}-50 text-${color}-600`}>
                <Icon size={24} />
            </div>
        </div>
        
        {/* Progress Bar */}
        {progress !== undefined && (
            <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                <div 
                    className={`bg-${color}-500 h-2 rounded-full transition-all duration-1000`} 
                    style={{ width: `${Math.min(progress, 100)}%` }}
                ></div>
            </div>
        )}
        
        <p className="text-xs text-gray-400">{subtext}</p>
    </div>
);

// --- Main Dashboard Page ---
const DashboardPage = ({ quotes, user }) => {
    const [targets, setTargets] = useState({
        yearlyGoal: 10000000, // Default 10M
        monthlyGoal: 1000000, // Default 1M
        conversionGoal: 30    // Default 30%
    });
    const [showModal, setShowModal] = useState(false);
    const [loadingTargets, setLoadingTargets] = useState(true);

    // --- 1. Fetch Targets from Firebase ---
    useEffect(() => {
        if (!user) return;
        const ref = doc(db, "users", user.uid, "settings", "dashboard");
        const unsub = onSnapshot(ref, (docSnap) => {
            if (docSnap.exists()) {
                setTargets(docSnap.data());
            }
            setLoadingTargets(false);
        });
        return () => unsub();
    }, [user]);

    // --- 2. Save Targets ---
    const handleSaveTargets = async (newTargets) => {
        if (!user) return;
        try {
            await setDoc(doc(db, "users", user.uid, "settings", "dashboard"), newTargets);
            setShowModal(false);
        } catch (error) {
            console.error("Error saving targets:", error);
            alert("Failed to save targets.");
        }
    };

    // --- 3. Calculate Real-Time Stats ---
    const stats = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Filter Won Quotes
        const wonQuotes = quotes.filter(q => q.status === 'WON' || q.status === 'APPROVED');
        
        // Totals
        const totalRevenue = wonQuotes.reduce((acc, q) => acc + (q.finalSalesPrice || 0), 0);
        
        // Monthly Revenue
        const monthlyRevenue = wonQuotes
            .filter(q => {
                const qDate = q.createdAt?.seconds ? new Date(q.createdAt.seconds * 1000) : new Date(q.createdAt);
                return qDate.getMonth() === currentMonth && qDate.getFullYear() === currentYear;
            })
            .reduce((acc, q) => acc + (q.finalSalesPrice || 0), 0);

        // Win Rate
        const totalClosed = quotes.filter(q => ['WON', 'APPROVED', 'LOST', 'REJECTED'].includes(q.status)).length;
        const totalWon = wonQuotes.length;
        const winRate = totalClosed > 0 ? Math.round((totalWon / totalClosed) * 100) : 0;

        // Pending Pipeline
        const pendingQuotes = quotes.filter(q => ['DRAFT', 'SENT', 'PENDING'].includes(q.status));
        const pipelineValue = pendingQuotes.reduce((acc, q) => acc + (q.finalSalesPrice || 0), 0);

        return {
            totalRevenue,
            monthlyRevenue,
            winRate,
            pipelineValue,
            pendingCount: pendingQuotes.length
        };
    }, [quotes]);

    // Format Currency
    const formatPHP = (num) => `₱${num.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

    return (
        <div className="w-full space-y-6">
            {showModal && <TargetsModal onClose={() => setShowModal(false)} onSave={handleSaveTargets} currentTargets={targets} />}

            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Performance Dashboard</h1>
                    <p className="text-gray-500">Real-time overview of your sales performance.</p>
                </div>
                <Button onClick={() => setShowModal(true)} variant="secondary" className="text-sm">
                    <Settings className="mr-2" size={16}/> Edit Targets
                </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* 1. Yearly Revenue */}
                <StatCard 
                    title="Yearly Revenue" 
                    value={formatPHP(stats.totalRevenue)} 
                    subtext={`Goal: ${formatPHP(targets.yearlyGoal)}`}
                    icon={DollarSign} 
                    color="green" 
                    progress={(stats.totalRevenue / targets.yearlyGoal) * 100}
                />

                {/* 2. Monthly Revenue */}
                <StatCard 
                    title="This Month" 
                    value={formatPHP(stats.monthlyRevenue)} 
                    subtext={`Goal: ${formatPHP(targets.monthlyGoal)}`}
                    icon={BarChart2} 
                    color="blue" 
                    progress={(stats.monthlyRevenue / targets.monthlyGoal) * 100}
                />

                {/* 3. Pipeline */}
                <StatCard 
                    title="Active Pipeline" 
                    value={formatPHP(stats.pipelineValue)} 
                    subtext={`${stats.pendingCount} quotes pending`}
                    icon={Activity} 
                    color="orange" 
                    progress={50} // Static visual for pipeline
                />

                {/* 4. Win Rate */}
                <StatCard 
                    title="Win Rate" 
                    value={`${stats.winRate}%`} 
                    subtext={`Target: >${targets.conversionGoal}%`}
                    icon={TrendingUp} 
                    color={stats.winRate >= targets.conversionGoal ? "green" : "red"}
                    progress={(stats.winRate / targets.conversionGoal) * 100}
                />
            </div>

            {/* Recent Activity / Mini Table (Optional) */}
            <Card className="mt-8">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Quotes</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-3 font-semibold text-gray-600">Quote ID</th>
                                <th className="p-3 font-semibold text-gray-600">Customer</th>
                                <th className="p-3 font-semibold text-gray-600 text-right">Value</th>
                                <th className="p-3 font-semibold text-gray-600 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {quotes.slice(0, 5).map(q => (
                                <tr key={q.id} className="hover:bg-gray-50">
                                    <td className="p-3 font-medium text-orange-600">{q.id}</td>
                                    <td className="p-3">{q.customer?.name || 'Unknown'}</td>
                                    <td className="p-3 text-right">{formatPHP(q.finalSalesPrice || 0)}</td>
                                    <td className="p-3 text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold 
                                            ${q.status === 'WON' ? 'bg-green-100 text-green-700' : 
                                              q.status === 'DRAFT' ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-700'}`}>
                                            {q.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {quotes.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="p-4 text-center text-gray-400">No recent quotes found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default DashboardPage;
