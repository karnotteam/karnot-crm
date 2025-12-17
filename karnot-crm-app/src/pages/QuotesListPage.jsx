import React, { useState } from 'react';
import { 
    Search, Filter, FileText, Trash2, Edit, 
    CheckCircle, Clock, AlertCircle, ArrowRight 
} from 'lucide-react';
import { Card, Button, Input } from '../data/constants.jsx';

const QuotesListPage = ({ quotes = [], onUpdateQuoteStatus, onDeleteQuote, onEditQuote }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');

    const filteredQuotes = quotes.filter(q => {
        const matchesSearch = 
            q.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (q.customer?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterStatus === 'ALL' || q.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'APPROVED': return 'text-green-600 bg-green-50 border-green-200';
            case 'SENT': return 'text-blue-600 bg-blue-50 border-blue-200';
            case 'REJECTED': return 'text-red-600 bg-red-50 border-red-200';
            default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-black text-gray-800 uppercase tracking-tighter">Quote Registry ({filteredQuotes.length})</h1>
                <select 
                    value={filterStatus} 
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="p-2 border border-gray-200 rounded-xl text-xs font-black uppercase bg-white outline-none focus:ring-2 focus:ring-orange-500"
                >
                    <option value="ALL">All Status</option>
                    <option value="DRAFT">Draft</option>
                    <option value="SENT">Sent</option>
                    <option value="APPROVED">Approved</option>
                </select>
            </div>

            <div className="relative">
                <Input 
                    placeholder="Search by ID or Customer..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-12"
                />
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>

            <div className="grid grid-cols-1 gap-4">
                {filteredQuotes.map(quote => (
                    <Card key={quote.id} className="p-0 overflow-hidden border border-gray-100 hover:border-orange-400 transition-all group shadow-sm bg-white">
                        <div className="flex flex-col md:flex-row items-center justify-between p-4 gap-4">
                            
                            {/* Left: Info */}
                            <div className="flex items-center gap-4 flex-1">
                                <div className="p-3 bg-slate-50 rounded-2xl text-slate-400 group-hover:text-orange-500 transition-colors">
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-black text-gray-800 uppercase tracking-tight">{quote.id}</h3>
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-widest ${getStatusColor(quote.status)}`}>
                                            {quote.status || 'DRAFT'}
                                        </span>
                                    </div>
                                    <p className="text-sm font-bold text-gray-500">{quote.customer?.name || 'Unknown Customer'}</p>
                                </div>
                            </div>

                            {/* Center: Value */}
                            <div className="text-right px-8 border-r border-l border-gray-50 hidden md:block">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Quote Total</p>
                                <p className="text-xl font-black text-orange-600">${Number(quote.finalSalesPrice || 0).toLocaleString()}</p>
                            </div>

                            {/* Right: Actions */}
                            <div className="flex gap-2">
                                {/* OPEN CALCULATOR BUTTON */}
                                <Button 
                                    onClick={() => onEditQuote(quote)} 
                                    variant="primary" 
                                    className="flex items-center gap-2 font-black uppercase text-[10px] tracking-widest px-4"
                                >
                                    <Edit size={14} /> Edit Quote
                                </Button>
                                
                                {/* TRASH BUTTON */}
                                <Button 
                                    onClick={() => {
                                        if (window.confirm(`Delete quote ${quote.id}?`)) {
                                            onDeleteQuote(quote.id);
                                        }
                                    }} 
                                    variant="secondary" 
                                    className="!p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 border-gray-200"
                                >
                                    <Trash2 size={16} />
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))}

                {filteredQuotes.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                        <p className="font-black text-gray-300 uppercase tracking-[0.2em]">No Quotes Found</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuotesListPage;
