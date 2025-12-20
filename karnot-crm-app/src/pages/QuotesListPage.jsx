import React, { useState } from 'react';
import { Search, FileText, Trash2, Edit, CheckCircle2, XCircle, Send, Briefcase, TrendingUp } from 'lucide-react';
import { Card, Button, Input } from '../data/constants.jsx';

const QuotesListPage = ({ quotes = [], onDeleteQuote, onEditQuote, onUpdateQuoteStatus, onViewProject }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');

    const filteredQuotes = (quotes || []).filter(q => {
        const matchesSearch = q.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             (q.customer?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'ALL' || q.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const getStatusStyle = (status) => {
        switch (status) {
            case 'WON':
            case 'APPROVED': 
                return 'bg-green-100 text-green-700 border-green-200';
            case 'LOST':
            case 'REJECTED': 
                return 'bg-red-100 text-red-700 border-red-200';
            case 'SENT': 
                return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'DRAFT':
                return 'bg-orange-100 text-orange-700 border-orange-200';
            default: 
                return 'bg-gray-100 text-gray-600 border-gray-200';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-black text-gray-800 uppercase tracking-tighter leading-none">Quote Registry</h1>
                <div className="flex gap-2">
                    <select 
                        value={filterStatus} 
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="p-2 border border-gray-200 rounded-xl text-[10px] font-black uppercase bg-white outline-none focus:ring-2 focus:ring-orange-500"
                    >
                        <option value="ALL">All Quotes</option>
                        <option value="DRAFT">Drafts</option>
                        <option value="SENT">Sent</option>
                        <option value="APPROVED">Approved</option>
                        <option value="WON">Won</option>
                        <option value="LOST">Lost</option>
                    </select>
                </div>
            </div>

            <div className="relative">
                <Input 
                    placeholder="Search by ID, Company or Project..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className="pl-12 h-14 rounded-2xl shadow-sm border-gray-200 focus:border-orange-500" 
                />
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>

            <div className="grid gap-4">
                {filteredQuotes.length > 0 ? filteredQuotes.map(quote => {
                    const isWon = quote.status === 'WON' || quote.status === 'APPROVED';
                    
                    // FIXED: Calculate margin using the saved values
                    const revenue = Number(quote.finalSalesPrice || 0);
                    const cost = Number(quote.totalCost || 0);
                    const margin = revenue - cost;
                    const marginPercentage = revenue > 0 ? ((margin / revenue) * 100) : 0;
                    
                    return (
                        <Card key={quote.id} className="p-0 overflow-hidden border-gray-100 bg-white group hover:border-orange-400 transition-all shadow-sm">
                            <div className="flex flex-col md:flex-row items-center justify-between p-5 gap-4">
                                
                                {/* Quote Info */}
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="p-3 bg-slate-50 rounded-2xl text-slate-300 group-hover:text-orange-500 group-hover:bg-orange-50 transition-all">
                                        <FileText size={28} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="font-black text-gray-800 uppercase text-base tracking-tight">{quote.id}</h3>
                                            <span className={`text-[9px] font-black px-2.5 py-1 rounded-full border uppercase tracking-widest shadow-sm ${getStatusStyle(quote.status)}`}>
                                                {quote.status || 'DRAFT'}
                                            </span>
                                        </div>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{quote.customer?.name || 'Unknown Client'}</p>
                                    </div>
                                </div>

                                {/* Price & Margin Section */}
                                <div className="text-center md:text-right px-8 md:border-r md:border-l border-gray-50 flex flex-col justify-center min-w-[180px]">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Value</p>
                                    <p className="text-xl font-black text-gray-800 leading-none mb-2">
                                        ${revenue.toLocaleString()}
                                    </p>
                                    {isWon && cost > 0 && (
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-end gap-1 text-orange-600 font-bold text-[10px]">
                                                <span>Cost: ${cost.toLocaleString()}</span>
                                            </div>
                                            <div className="flex items-center justify-end gap-1 text-green-600 font-bold text-[10px]">
                                                <TrendingUp size={12} />
                                                <span>Margin: ${margin.toLocaleString()} ({marginPercentage.toFixed(1)}%)</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                    {/* Project Management Trigger - Only for Won Quotes */}
                                    {isWon && (
                                        <button 
                                            onClick={() => onViewProject(quote)}
                                            className="flex flex-col items-center justify-center p-2 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-600 hover:text-white transition-all border border-purple-100 group/btn"
                                            title="View Project ROI"
                                        >
                                            <Briefcase size={20}/>
                                            <span className="text-[8px] font-black mt-1 uppercase">Project</span>
                                        </button>
                                    )}

                                    <div className="flex flex-col gap-1 mr-2 border-l pl-2 border-gray-100">
                                        <button 
                                            onClick={() => onUpdateQuoteStatus(quote.id, 'SENT')}
                                            className={`p-1.5 rounded-lg transition-all border ${quote.status === 'SENT' ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-600 hover:text-white'}`}
                                            title="Mark as Sent"
                                        >
                                            <Send size={16}/>
                                        </button>
                                        <button 
                                            onClick={() => onUpdateQuoteStatus(quote.id, 'WON')}
                                            className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-all border border-green-100"
                                            title="Mark as Won"
                                        >
                                            <CheckCircle2 size={16}/>
                                        </button>
                                        <button 
                                            onClick={() => onUpdateQuoteStatus(quote.id, 'LOST')}
                                            className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all border border-red-100"
                                            title="Mark as Lost"
                                        >
                                            <XCircle size={16}/>
                                        </button>
                                    </div>

                                    <Button onClick={() => onEditQuote(quote)} variant="primary" className="!p-3 shadow-lg shadow-orange-100">
                                        <Edit size={18}/>
                                    </Button>
                                    
                                    <Button 
                                        onClick={() => { if(window.confirm(`Delete Quote ${quote.id}?`)) onDeleteQuote(quote.id); }} 
                                        variant="secondary" 
                                        className="!p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 border-gray-200"
                                    >
                                        <Trash2 size={18}/>
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    );
                }) : (
                    <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-gray-100 shadow-inner">
                        <FileText size={48} className="mx-auto text-gray-100 mb-4" />
                        <p className="font-black text-gray-300 uppercase tracking-[0.3em]">No matching quotes found</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuotesListPage;
