import React, { useMemo, useState } from 'react';
import { Search, Edit, Trash2, FileText, CheckCircle, XCircle, Clock, ChevronRight, DollarSign } from 'lucide-react';
import { Card, Button, Input } from '../data/constants.jsx';

const QuotesListPage = ({ quotes, onUpdateQuoteStatus, onDeleteQuote, onEditQuote }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    const filteredQuotes = useMemo(() => {
        return quotes.filter(q => {
            const matchesSearch = (
                q.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                q.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            const matchesStatus = statusFilter === 'ALL' || q.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [quotes, searchTerm, statusFilter]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'WON': return 'bg-green-100 text-green-700 border-green-200';
            case 'APPROVED': return 'bg-green-100 text-green-700 border-green-200';
            case 'LOST': return 'bg-red-100 text-red-700 border-red-200';
            case 'DRAFT': return 'bg-gray-100 text-gray-700 border-gray-200';
            default: return 'bg-blue-100 text-blue-700 border-blue-200';
        }
    };

    // --- Mobile Card Component ---
    const MobileQuoteCard = ({ quote }) => (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col gap-3">
            <div className="flex justify-between items-start">
                <div>
                    <span className="text-xs font-bold text-orange-600 block mb-1">{quote.id}</span>
                    <h4 className="font-bold text-gray-800">{quote.customer?.name || 'Unknown Customer'}</h4>
                    <p className="text-xs text-gray-500">{new Date(quote.createdAt?.seconds ? quote.createdAt.seconds * 1000 : quote.createdAt).toLocaleDateString()}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-bold border ${getStatusColor(quote.status)}`}>
                    {quote.status}
                </span>
            </div>
            
            <div className="flex justify-between items-center border-t border-gray-100 pt-3">
                <span className="text-lg font-bold text-gray-900">
                    ₱{(quote.finalSalesPrice || 0).toLocaleString()}
                </span>
                <div className="flex gap-2">
                    <button onClick={() => onEditQuote(quote)} className="p-2 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200">
                        <Edit size={16}/>
                    </button>
                    <button onClick={() => onDeleteQuote(quote.id)} className="p-2 bg-red-50 rounded-full text-red-600 hover:bg-red-100">
                        <Trash2 size={16}/>
                    </button>
                </div>
            </div>
            
            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2 mt-1">
                {quote.status !== 'WON' && (
                    <button onClick={() => onUpdateQuoteStatus(quote.id, 'WON')} className="flex items-center justify-center gap-1 py-2 bg-green-50 text-green-700 text-xs font-bold rounded hover:bg-green-100">
                        <CheckCircle size={14}/> Mark Won
                    </button>
                )}
                {quote.status !== 'LOST' && (
                    <button onClick={() => onUpdateQuoteStatus(quote.id, 'LOST')} className="flex items-center justify-center gap-1 py-2 bg-red-50 text-red-700 text-xs font-bold rounded hover:bg-red-100">
                        <XCircle size={14}/> Mark Lost
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <div className="w-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
                    <FileText className="text-orange-600"/> Quote History
                </h1>
                
                {/* Search & Filter */}
                <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                    <div className="relative">
                        <Input 
                            placeholder="Search quotes..." 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            className="pl-10 w-full"
                        />
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18}/>
                    </div>
                    <select 
                        value={statusFilter} 
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                        <option value="ALL">All Status</option>
                        <option value="DRAFT">Draft</option>
                        <option value="SENT">Sent</option>
                        <option value="WON">Won</option>
                        <option value="LOST">Lost</option>
                    </select>
                </div>
            </div>

            {/* --- DESKTOP VIEW (Table) --- */}
            <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden border border-gray-200">
                <table className="min-w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="p-4 font-semibold text-gray-600 text-sm">Reference</th>
                            <th className="p-4 font-semibold text-gray-600 text-sm">Customer</th>
                            <th className="p-4 font-semibold text-gray-600 text-sm">Date</th>
                            <th className="p-4 font-semibold text-gray-600 text-sm text-right">Amount (PHP)</th>
                            <th className="p-4 font-semibold text-gray-600 text-sm text-center">Status</th>
                            <th className="p-4 font-semibold text-gray-600 text-sm text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredQuotes.map(quote => (
                            <tr key={quote.id} className="hover:bg-gray-50 transition-colors group">
                                <td className="p-4 font-bold text-orange-600">{quote.id}</td>
                                <td className="p-4 font-medium text-gray-800">{quote.customer?.name}</td>
                                <td className="p-4 text-gray-500 text-sm">
                                    {new Date(quote.createdAt?.seconds ? quote.createdAt.seconds * 1000 : quote.createdAt).toLocaleDateString()}
                                </td>
                                <td className="p-4 text-right font-mono font-medium text-gray-700">
                                    {(quote.finalSalesPrice || 0).toLocaleString()}
                                </td>
                                <td className="p-4 text-center">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(quote.status)}`}>
                                        {quote.status}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => onUpdateQuoteStatus(quote.id, 'WON')} title="Mark Won" className="p-1 text-green-600 hover:bg-green-50 rounded"><CheckCircle size={18}/></button>
                                        <button onClick={() => onUpdateQuoteStatus(quote.id, 'LOST')} title="Mark Lost" className="p-1 text-red-600 hover:bg-red-50 rounded"><XCircle size={18}/></button>
                                        <button onClick={() => onEditQuote(quote)} title="Edit" className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Edit size={18}/></button>
                                        <button onClick={() => onDeleteQuote(quote.id)} title="Delete" className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={18}/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* --- MOBILE VIEW (Cards) --- */}
            <div className="md:hidden space-y-4">
                {filteredQuotes.map(quote => (
                    <MobileQuoteCard key={quote.id} quote={quote} />
                ))}
            </div>

            {filteredQuotes.length === 0 && (
                <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300 mt-4">
                    <Search className="mx-auto text-gray-300 mb-2" size={48}/>
                    <p className="text-gray-500">No quotes found matching your filters.</p>
                </div>
            )}
        </div>
    );
};

export default QuotesListPage;
