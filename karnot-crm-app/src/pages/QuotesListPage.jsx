// src/pages/QuotesListPage.jsx
import React, { useState } from 'react';
import { Trash2, ChevronDown, ChevronRight, Send, CheckCircle, XCircle, Edit } from 'lucide-react';
import { QUOTE_STATUSES, Card, Button } from '../data/constants.jsx'; // FIX: Ensure .jsx import

// This is your SavedQuotesList component
const QuotesListPage = ({ quotes, onUpdateQuoteStatus, onDeleteQuote, onEditQuote }) => {
    const [expandedQuoteId, setExpandedQuoteId] = useState(null);
    
    // Helper function to safely convert createdAt to a Date
    const getQuoteDate = (quote) => {
        if (!quote.createdAt) return new Date(); // Fallback
        if (typeof quote.createdAt.toDate === 'function') {
            return quote.createdAt.toDate();
        }
        return new Date(quote.createdAt);
    };

    return (
        <Card>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Saved Quotes</h2>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b bg-gray-50">
                            <th className="p-3"></th>
                            <th className="p-3">Quote ID</th>
                            <th className="p-3">Customer</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-right">Sales Price</th>
                            <th className="p-3 text-right">Margin</th>
                            <th className="p-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {quotes.sort((a, b) => getQuoteDate(b) - getQuoteDate(a)).map(quote => (
                            <React.Fragment key={quote.id}>
                                <tr 
                                    className="border-b hover:bg-gray-50 cursor-pointer" 
                                    onClick={() => setExpandedQuoteId(expandedQuoteId === quote.id ? null : quote.id)}
                                >
                                    <td className="p-3"><button>{expandedQuoteId === quote.id ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}</button></td>
                                    <td className="p-3 font-mono">{quote.id}</td>
                                    <td className="p-3">{quote.customer?.name}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 text-xs font-semibold text-white rounded-full ${QUOTE_STATUSES[quote.status]?.color || 'bg-gray-400'}`}>
                                            {QUOTE_STATUSES[quote.status]?.text || quote.status}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right font-semibold">${(quote.finalSalesPrice || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                    <td className="p-3 text-right font-semibold" style={{color: quote.grossMarginPercentage > 0 ? 'green' : 'red'}}>{(quote.grossMarginPercentage || 0).toFixed(2)}%</td>
                                    
                                    {/* FIX: Ensure onEditQuote is called correctly */}
                                    <td className="p-3 text-center">
                                        <Button 
                                            onClick={(e) => { e.stopPropagation(); onEditQuote(quote);}} 
                                            className="p-2 h-auto w-auto text-blue-600 hover:text-blue-800"
                                            variant="secondary"
                                        >
                                            <Edit size={16}/>
                                        </Button>
                                    </td>
                                </tr>
                                {expandedQuoteId === quote.id && (
                                    <tr className="bg-gray-100"><td colSpan="7" className="p-4">
                                        <div className="flex justify-between items-center">
                                            <div><strong>Created:</strong> {getQuoteDate(quote).toLocaleString()}</div>
                                            <div className="flex flex-wrap gap-2">
                                                <Button onClick={(e) => { e.stopPropagation(); onUpdateQuoteStatus(quote.id, 'SENT')}} variant="secondary" className="text-xs"><Send size={14} className="mr-1"/>Mark as Sent</Button>
                                                <Button onClick={(e) => { e.stopPropagation(); onUpdateQuoteStatus(quote.id, 'APPROVED')}} variant="success" className="text-xs"><CheckCircle size={14} className="mr-1"/>Mark as Approved</Button>
                                                <Button onClick={(e) => { e.stopPropagation(); onUpdateQuoteStatus(quote.id, 'DECLINED')}} variant="danger" className="text-xs"><XCircle size={14} className="mr-1"/>Mark as Declined</Button>
                                                <Button onClick={(e) => { e.stopPropagation(); onDeleteQuote(quote.id)}} variant="danger" className="p-2 ml-4"><Trash2 size={16}/></Button>
                                            </div>
                                        </div>
                                    </td></tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
            {quotes.length === 0 && <p className="text-center text-gray-500 mt-6">No quotes have been saved yet.</p>}
        </Card>
    );
};

export default QuotesListPage;