import React, { useState, useMemo } from 'react';
import { 
    Trash2, Edit, Eye, CheckCircle, XCircle, FileText, 
    Search, ArrowUpRight, Clock, ShieldCheck, Target, Briefcase, 
    Send, ThumbsUp, RotateCcw
} from 'lucide-react';
import { Card, Button, Input } from '../data/constants.jsx';

const QuotesListPage = ({ quotes = [], onDeleteQuote, onEditQuote, onUpdateQuoteStatus, onOpenQuote, opportunities = [] }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    // --- 1. DATA ENRICHMENT & CALCULATIONS ---
    const processedQuotes = useMemo(() => {
        return quotes.map(q => {
            // A. LINK TO FUNNEL (Win Probability)
            const linkedOpp = opportunities.find(o => o.id === q.opportunityId || o.id === q.leadId);
            const winChance = linkedOpp?.probability || 0;
            
            // B. LIVE MARGIN CALCULATION
            const salesPrice = Number(q.finalSalesPrice || 0);
            const costPrice = Number(q.totalCost || 0); 
            const marginAmount = salesPrice - costPrice;
            const liveMarginPct = salesPrice > 0 ? (marginAmount / salesPrice) * 100 : 0;

            // C. FOREX & CURRENCY
            const rate = q.costing?.forexRate || 58.5;
            const grossPHP = salesPrice * rate;

            // D. TAX STATUS
            const isExport = q.customer?.saleType === 'Export';

            return { 
                ...q, 
                winChance, 
                liveMarginPct, 
                grossPHP, 
                forexUsed: rate,
                isExport,
                hasProjectLink: !!q.opportunityId 
            };
        });
    }, [quotes, opportunities]);

    // --- 2. FILTERING LOGIC ---
    const filteredQuotes = useMemo(() => {
        return processedQuotes.filter(q => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = 
                q.id.toLowerCase().includes(searchLower) ||
                q.customer?.name?.toLowerCase().includes(searchLower) ||
                (q.customerName || '').toLowerCase().includes(searchLower);
                
            const matchesStatus = statusFilter === 'ALL' || q.status === statusFilter;
            
            return matchesSearch && matchesStatus;
        });
    }, [processedQuotes, searchTerm, statusFilter]);

    // --- 3. STATS HEADER MATH ---
    const stats = useMemo(() => {
        const activeProFormas = quotes.filter(q => q.status === 'APPROVED').length;
        const officialInvoices = quotes.filter(q => q.status === 'INVOICED').length;
        const wonDeals = quotes.filter(q => q.status === 'WON').length;
        
        const weightedValue = processedQuotes
            .filter(q => ['DRAFT', 'APPROVED', 'INVOICED'].includes(q.status))
            .reduce((sum, q) => sum + (q.finalSalesPrice * (q.winChance / 100)), 0);

        return { activeProFormas, officialInvoices, wonDeals, weightedValue };
    }, [quotes, processedQuotes]);

    return (
        <div className="space-y-8 pb-20">
            {/* STATS DASHBOARD */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-5 border-l-4 border-blue-500 bg-white shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Active Pro-Formas</p>
                    <p className="text-3xl font-black text-gray-800">{stats.activeProFormas}</p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Awaiting Payment</p>
                </Card>
                <Card className="p-5 border-l-4 border-green-600 bg-white shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">BIR Invoiced</p>
                    <p className="text-3xl font-black text-gray-800">{stats.officialInvoices}</p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Tax Liability Active</p>
                </Card>
                <Card className="p-5 border-l-4 border-orange-500 bg-white shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Weighted Pipeline</p>
                    <p className="text-3xl font-black text-orange-600">${stats.weightedValue.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Risk-Adjusted Value</p>
                </Card>
                <Card className="p-5 border-l-4 border-slate-800 bg-white shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Proposals</p>
                    <p className="text-3xl font-black text-gray-800">{quotes.length}</p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">All Time Volume</p>
                </Card>
            </div>

            {/* CONTROL BAR */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-6 rounded-[35px] shadow-sm border border-gray-100">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                    <Input 
                        placeholder="Search Quote ID, Customer Name..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-14 py-5 rounded-[25px] border-gray-100 bg-gray-50/50 text-lg"
                    />
                </div>
                <div className="w-full md:w-auto">
                    <select 
                        value={statusFilter} 
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full p-4 bg-white border-2 border-gray-100 rounded-[20px] font-black text-[11px] uppercase tracking-widest outline-none focus:border-orange-500 transition-all cursor-pointer"
                    >
                        <option value="ALL">Show All Statuses</option>
                        <option value="DRAFT">Drafts (Editing)</option>
                        <option value="APPROVED">Pro-Forma Issued</option>
                        <option value="INVOICED">BIR Invoiced</option>
                        <option value="WON">Closed Won</option>
                        <option value="LOST">Closed Lost</option>
                    </select>
                </div>
            </div>

            {/* DATA TABLE */}
            <Card className="rounded-[40px] border-none shadow-xl overflow-hidden p-0 bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Proposal & Project</th>
                                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Customer / Pipeline</th>
                                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Value & Margin</th>
                                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">Current Status</th>
                                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 bg-white">
                            {filteredQuotes.map((q) => (
                                <tr key={q.id} className="hover:bg-orange-50/20 transition-all group">
                                    {/* COL 1: ID & PROJECT LINK */}
                                    <td className="p-6 align-top">
                                        <div className="flex items-start gap-3">
                                            <div className={`p-2.5 rounded-2xl mt-1 ${q.hasProjectLink ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                                                <Briefcase size={18}/>
                                            </div>
                                            <div>
                                                <p className="font-black text-gray-800 uppercase tracking-tighter leading-none mb-1 text-sm">{q.id}</p>
                                                {q.hasProjectLink ? (
                                                    <span className="text-[9px] font-black text-green-600 uppercase flex items-center gap-1 tracking-wider">
                                                        <ShieldCheck size={10}/> Linked to ROI
                                                    </span>
                                                ) : (
                                                    <span className="text-[9px] font-black text-gray-400 uppercase italic tracking-wider">Stand-alone Quote</span>
                                                )}
                                                <div className="mt-2 text-[9px] text-gray-400 font-bold flex items-center gap-1">
                                                    <Clock size={10}/> {new Date(q.createdAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* COL 2: CUSTOMER & FUNNEL */}
                                    <td className="p-6 align-top">
                                        <p className="font-bold text-gray-800 uppercase text-xs mb-2">{q.customer?.name}</p>
                                        <div className="flex flex-col gap-2">
                                            <span className={`text-[8px] font-black px-2 py-1 rounded-lg border w-fit ${q.isExport ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
                                                {q.isExport ? 'ZERO-RATED EXPORT' : 'DOMESTIC VAT'}
                                            </span>
                                            {q.winChance > 0 ? (
                                                <p className="text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-lg border border-blue-100 w-fit">
                                                    <Target size={12}/> {q.winChance}% Probability
                                                </p>
                                            ) : (
                                                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1 px-2">
                                                    <Target size={12}/> No Funnel Link
                                                </p>
                                            )}
                                        </div>
                                    </td>

                                    {/* COL 3: MONEY & MARGIN */}
                                    <td className="p-6 text-right align-top">
                                        <p className="font-black text-xl text-gray-900 leading-none">₱{q.grossPHP.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                                            $ {Number(q.finalSalesPrice).toLocaleString()} USD
                                        </p>
                                        <div className="mt-3 flex justify-end items-center gap-2">
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded ${q.liveMarginPct < 30 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                                {q.liveMarginPct.toFixed(1)}% MARGIN
                                            </span>
                                            <div className="w-16 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                                <div className={`h-full ${q.liveMarginPct < 30 ? 'bg-red-500' : 'bg-green-500'}`} style={{width: `${Math.min(q.liveMarginPct, 100)}%`}}></div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* COL 4: STATUS CONTROL */}
                                    <td className="p-6 text-center align-middle">
                                        <div className="flex flex-col items-center gap-2">
                                            <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-sm border
                                                ${q.status === 'INVOICED' ? 'bg-green-100 text-green-700 border-green-200' : 
                                                  q.status === 'APPROVED' ? 'bg-blue-100 text-blue-700 border-blue-200' : 
                                                  q.status === 'WON' ? 'bg-orange-100 text-orange-700 border-orange-200' : 
                                                  q.status === 'LOST' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-gray-100 text-gray-500 border-gray-200'}
                                            `}>
                                                {q.status === 'APPROVED' ? 'PRO-FORMA' : q.status}
                                            </span>
                                            
                                            {/* --- STATUS CHANGE BUTTONS --- */}
                                            {q.status === 'DRAFT' && (
                                                <button 
                                                    onClick={() => onUpdateQuoteStatus(q.id, 'APPROVED')}
                                                    className="flex items-center gap-1.5 text-[9px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-600 hover:text-white transition-all border border-blue-200"
                                                >
                                                    <ThumbsUp size={12}/> APPROVE / SEND
                                                </button>
                                            )}

                                            {q.status === 'APPROVED' && (
                                                <div className="flex flex-col gap-1 w-full">
                                                    <button 
                                                        onClick={() => {
                                                            if(confirm("Confirm: Issue Official Sales Invoice? This triggers VAT liability.")) {
                                                                onUpdateQuoteStatus(q.id, 'INVOICED');
                                                            }
                                                        }}
                                                        className="flex items-center justify-center gap-1.5 text-[9px] font-black text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg hover:bg-orange-600 hover:text-white transition-all border border-orange-200"
                                                    >
                                                        <ArrowUpRight size={12}/> ISSUE INVOICE
                                                    </button>
                                                    <button 
                                                        onClick={() => onUpdateQuoteStatus(q.id, 'DRAFT')}
                                                        className="flex items-center justify-center gap-1.5 text-[9px] font-black text-gray-500 hover:text-gray-800"
                                                    >
                                                        <RotateCcw size={10}/> Revert to Draft
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </td>

                                    {/* COL 5: ACTIONS */}
                                    <td className="p-6 align-middle">
                                        <div className="flex justify-center gap-2 opacity-60 group-hover:opacity-100 transition-all duration-300">
                                            <button onClick={() => onOpenQuote(q)} className="p-2.5 bg-gray-50 text-gray-500 hover:bg-blue-500 hover:text-white rounded-xl transition-colors shadow-sm" title="Preview PDF"><Eye size={16}/></button>
                                            <button onClick={() => onEditQuote(q)} className="p-2.5 bg-gray-50 text-gray-500 hover:bg-orange-500 hover:text-white rounded-xl transition-colors shadow-sm" title="Edit Quote"><Edit size={16}/></button>
                                            
                                            <div className="h-8 w-[1px] bg-gray-200 mx-2 self-center"></div>
                                            
                                            <button onClick={() => onUpdateQuoteStatus(q.id, 'WON')} className="p-2.5 bg-gray-50 text-gray-500 hover:bg-green-500 hover:text-white rounded-xl transition-colors shadow-sm" title="Mark Won"><CheckCircle size={16}/></button>
                                            <button onClick={() => onUpdateQuoteStatus(q.id, 'LOST')} className="p-2.5 bg-gray-50 text-gray-500 hover:bg-red-400 hover:text-white rounded-xl transition-colors shadow-sm" title="Mark Lost"><XCircle size={16}/></button>
                                            <button onClick={() => onDeleteQuote(q.id)} className="p-2.5 bg-gray-50 text-gray-500 hover:bg-red-700 hover:text-white rounded-xl transition-colors shadow-sm" title="Delete"><Trash2 size={16}/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default QuotesListPage;
