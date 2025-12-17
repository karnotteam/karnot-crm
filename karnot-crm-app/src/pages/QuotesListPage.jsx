import React, { useState } from 'react';
import { Search, FileText, Trash2, Edit } from 'lucide-react';
import { Card, Button, Input } from '../data/constants.jsx';

const QuotesListPage = ({ quotes = [], onDeleteQuote, onEditQuote, onUpdateQuoteStatus }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');

    const filteredQuotes = (quotes || []).filter(q => {
        const matchesSearch = q.id.toLowerCase().includes(searchTerm.toLowerCase()) || (q.customer?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
        return (filterStatus === 'ALL' || q.status === filterStatus) && matchesSearch;
    });

    const getStatusStyle = (status) => {
        switch (status) {
            case 'WON': case 'APPROVED': return 'bg-green-100 text-green-700 border-green-200';
            case 'LOST': case 'REJECTED': return 'bg-red-100 text-red-700 border-red-200';
            case 'SENT': return 'bg-blue-100 text-blue-700 border-blue-200';
            default: return 'bg-gray-100 text-gray-600 border-gray-200';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-black text-gray-800 uppercase tracking-tighter leading-none">Quote Registry</h1>
                <select 
                    value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                    className="p-2 border border-gray-200 rounded-xl text-[10px] font-black uppercase bg-white outline-none"
                >
                    <option value="ALL">All Status</option>
                    <option value="DRAFT">Draft</option>
                    <option value="SENT">Sent</option>
                    <option value="APPROVED">Approved</option>
                    <option value="WON">Won</option>
                    <option value="LOST">Lost</option>
                </select>
            </div>

            <div className="relative">
                <Input placeholder="Search Quotes..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 h-12 rounded-2xl" />
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>

            <div className="grid gap-4">
                {filteredQuotes.map(quote => (
                    <Card key={quote.id} className="p-4 flex items-center justify-between border-gray-100 bg-white group">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-slate-50 rounded-2xl text-slate-300 group-hover:text-orange-500 transition-colors"><FileText size={24} /></div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-black text-gray-800 uppercase text-sm">{quote.id}</h3>
                                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border uppercase tracking-widest ${getStatusStyle(quote.status)}`}>{quote.status || 'DRAFT'}</span>
                                </div>
                                <p className="text-xs font-bold text-gray-400 uppercase">{quote.customer?.name || 'Unknown'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Price</p>
                                <p className="text-lg font-black text-orange-600">${Number(quote.finalSalesPrice || 0).toLocaleString()}</p>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={() => onEditQuote(quote)} variant="primary" className="!p-2"><Edit size={16}/></Button>
                                <Button onClick={() => { if(window.confirm("Delete?")) onDeleteQuote(quote.id); }} variant="secondary" className="!p-2 text-gray-300 hover:text-red-500"><Trash2 size={16}/></Button>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default QuotesListPage;
