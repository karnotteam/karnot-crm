import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; 
import { collection, onSnapshot, query, orderBy, doc, setDoc, deleteDoc } from "firebase/firestore";
import { Plus, Search, FileText, Eye, Trash2, Edit, ExternalLink, RefreshCw, AlertTriangle } from 'lucide-react';
import { Card, Button } from '../data/constants.jsx';
import QuoteCalculator from '../components/QuoteCalculator.jsx';

const QuotesListPage = () => {
    // --- STATE MANAGEMENT ---
    const [quotes, setQuotes] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [opportunities, setOpportunities] = useState([]);
    
    const [loading, setLoading] = useState(true);
    const [showCalculator, setShowCalculator] = useState(false);
    const [editingQuote, setEditingQuote] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // --- 1. DATA SYNCHRONIZATION ---
    useEffect(() => {
        setLoading(true);

        // A. Fetch Quotes
        const quotesQuery = query(collection(db, "quotes"), orderBy("createdAt", "desc"));
        const unsubQuotes = onSnapshot(quotesQuery, (snapshot) => {
            setQuotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        // B. Fetch Companies (For Calculator Dropdowns)
        const unsubCompanies = onSnapshot(collection(db, "companies"), (snapshot) => {
            setCompanies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        // C. Fetch Contacts (For Calculator Dropdowns)
        const unsubContacts = onSnapshot(collection(db, "contacts"), (snapshot) => {
            setContacts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        // D. Fetch Opportunities (For Pipeline Linking)
        const unsubOpportunities = onSnapshot(collection(db, "opportunities"), (snapshot) => {
            setOpportunities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false); // Done loading when all listeners attached
        });

        // Cleanup listeners on unmount
        return () => {
            unsubQuotes();
            unsubCompanies();
            unsubContacts();
            unsubOpportunities();
        };
    }, []);

    // --- 2. SAVE HANDLER ---
    const handleSaveQuote = async (quoteData) => {
        try {
            await setDoc(doc(db, "quotes", quoteData.id), quoteData);
            setShowCalculator(false);
            setEditingQuote(null);
            // Optional: Show a toast notification here
        } catch (error) {
            console.error("Error saving quote:", error);
            alert("Error saving to database: " + error.message);
        }
    };

    // --- 3. DELETE HANDLER ---
    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this quote? This cannot be undone.")) {
            try {
                await deleteDoc(doc(db, "quotes", id));
            } catch (error) {
                console.error("Error deleting quote:", error);
                alert("Failed to delete quote.");
            }
        }
    };

    // --- 4. VIEW DOCUMENT HANDLER ---
    const handleViewDocument = (url) => {
        if (url) {
            window.open(url, '_blank');
        } else {
            alert("No digital document found. Please Edit and Save this quote again to generate the file.");
        }
    };

    // --- 5. UTILITY: GENERATE NEXT QUOTE NUMBER ---
    const getNextQuoteNumber = () => {
        if (quotes.length === 0) return 1001;
        const numbers = quotes.map(q => {
            const match = q.id.match(/QN(\d+)/);
            return match ? parseInt(match[1]) : 0;
        });
        return Math.max(...numbers) + 1;
    };

    // --- FILTERING ---
    const filteredQuotes = quotes.filter(q => 
        (q.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (q.customerName || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    // --- RENDER: CALCULATOR MODE ---
    if (showCalculator) {
        return (
            <div className="p-2 md:p-6 bg-gray-50 min-h-screen">
                <div className="max-w-7xl mx-auto mb-6">
                    <Button 
                        variant="secondary" 
                        onClick={() => { setShowCalculator(false); setEditingQuote(null); }}
                        className="mb-4"
                    >
                        ← Back to Quote List
                    </Button>
                    <QuoteCalculator 
                        onSaveQuote={handleSaveQuote}
                        nextQuoteNumber={getNextQuoteNumber()}
                        initialData={editingQuote}
                        // ✅ PASSING REAL DATA SO DROPDOWNS WORK
                        companies={companies} 
                        contacts={contacts} 
                        opportunities={opportunities}
                    />
                </div>
            </div>
        );
    }

    // --- RENDER: LIST MODE ---
    return (
        <div className="max-w-7xl mx-auto p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-800 uppercase tracking-tight">
                        Quote <span className="text-orange-600">Manager</span>
                    </h1>
                    <p className="text-gray-500 font-medium mt-1">
                        Track, manage, and issue sales quotations.
                    </p>
                </div>
                <Button 
                    onClick={() => { setEditingQuote(null); setShowCalculator(true); }} 
                    className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-orange-200 transition-all"
                >
                    <Plus size={20} /> Create New Quote
                </Button>
            </div>

            {/* Search Bar */}
            <div className="mb-6 relative">
                <input 
                    type="text" 
                    placeholder="Search by Quote ID, Customer Name..." 
                    className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl shadow-sm outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-50 transition-all text-gray-700 font-medium"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                    <RefreshCw className="animate-spin mb-4" size={32} />
                    <p className="font-medium">Syncing Quote Database...</p>
                </div>
            ) : filteredQuotes.length === 0 ? (
                <div className="text-center p-16 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                        <FileText size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-700 mb-2">No Quotes Found</h3>
                    <p className="text-gray-500">
                        {searchTerm ? "No results match your search." : "Get started by creating your first quote."}
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="text-left p-5 text-[11px] font-black uppercase text-gray-400 tracking-wider">Quote ID</th>
                                    <th className="text-left p-5 text-[11px] font-black uppercase text-gray-400 tracking-wider">Customer</th>
                                    <th className="text-left p-5 text-[11px] font-black uppercase text-gray-400 tracking-wider">Date</th>
                                    <th className="text-right p-5 text-[11px] font-black uppercase text-gray-400 tracking-wider">Total (USD)</th>
                                    <th className="text-center p-5 text-[11px] font-black uppercase text-gray-400 tracking-wider">Margin</th>
                                    <th className="text-center p-5 text-[11px] font-black uppercase text-gray-400 tracking-wider">Status</th>
                                    <th className="text-center p-5 text-[11px] font-black uppercase text-gray-400 tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredQuotes.map((quote) => (
                                    <tr key={quote.id} className="hover:bg-orange-50/50 transition-colors group">
                                        <td className="p-5 font-bold text-gray-800 font-mono text-sm">
                                            {quote.id}
                                        </td>
                                        <td className="p-5">
                                            <div className="font-bold text-gray-800">{quote.customerName || "Unknown"}</div>
                                            {quote.customer?.contactName && (
                                                <div className="text-xs text-gray-400 mt-0.5">{quote.customer.contactName}</div>
                                            )}
                                        </td>
                                        <td className="p-5 text-sm text-gray-500 font-medium">
                                            {quote.createdAt ? new Date(quote.createdAt).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="p-5 text-right font-black text-gray-800 font-mono">
                                            ${quote.finalSalesPrice?.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                        </td>
                                        <td className="p-5 text-center">
                                            <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                                                (quote.grossMarginPercentage || 0) < 30 
                                                    ? 'bg-red-100 text-red-700' 
                                                    : 'bg-green-100 text-green-700'
                                            }`}>
                                                {quote.grossMarginPercentage?.toFixed(1)}%
                                            </span>
                                        </td>
                                        <td className="p-5 text-center">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border ${
                                                quote.status === 'APPROVED' ? 'bg-green-50 border-green-200 text-green-600' :
                                                quote.status === 'SENT' ? 'bg-blue-50 border-blue-200 text-blue-600' :
                                                'bg-gray-100 border-gray-200 text-gray-500'
                                            }`}>
                                                {quote.status || 'DRAFT'}
                                            </span>
                                        </td>
                                        <td className="p-5">
                                            <div className="flex justify-center gap-2">
                                                {/* 1. VIEW PDF BUTTON */}
                                                <button 
                                                    onClick={() => handleViewDocument(quote.documentUrl)}
                                                    className={`p-2 rounded-lg transition-all ${
                                                        quote.documentUrl 
                                                            ? 'text-blue-600 hover:bg-blue-50 hover:shadow-sm' 
                                                            : 'text-gray-300 cursor-not-allowed'
                                                    }`}
                                                    title={quote.documentUrl ? "Open PDF Document" : "No Document Saved"}
                                                >
                                                    <ExternalLink size={18} />
                                                </button>

                                                {/* 2. EDIT BUTTON */}
                                                <button 
                                                    onClick={() => { setEditingQuote(quote); setShowCalculator(true); }}
                                                    className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                                                    title="Edit Quote"
                                                >
                                                    <Edit size={18} />
                                                </button>

                                                {/* 3. DELETE BUTTON */}
                                                <button 
                                                    onClick={() => handleDelete(quote.id)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Delete Quote"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuotesListPage;
