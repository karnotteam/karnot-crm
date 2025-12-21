import React, { useState, useMemo, useEffect } from 'react';
import { Card, Button, Input } from '../data/constants.jsx'; 
import { 
    Landmark, ArrowRightLeft, CheckCircle, XCircle, 
    Upload, Search, Filter, TrendingUp, TrendingDown, Link2, 
    PlusCircle, Trash2, Edit2 // Added Trash2 and Edit2
} from 'lucide-react';
import { db } from '../firebase'; 
import { collection, query, onSnapshot, doc, updateDoc, serverTimestamp, addDoc, orderBy, deleteDoc, setDoc } from "firebase/firestore";

const BankReconciliation = ({ user, quotes = [], ledgerEntries = [] }) => {
    // --- STATE ---
    const [bankLines, setBankLines] = useState([]); 
    const [formLine, setFormLine] = useState({ date: '', description: '', amount: '', type: 'DEBIT' });
    const [editingLineId, setEditingLineId] = useState(null); // Track if editing
    
    const [selectedBookEntry, setSelectedBookEntry] = useState(null);
    const [selectedBankLine, setSelectedBankLine] = useState(null);
    const [reconciledHistory, setReconciledHistory] = useState([]);

    // --- 1. FETCH DATA ---
    useEffect(() => {
        if (!user) return;
        
        // Fetch History
        const qHistory = query(collection(db, "users", user.uid, "reconciliations"), orderBy("reconciledAt", "desc"));
        const unsubHistory = onSnapshot(qHistory, (snap) => {
            setReconciledHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // Fetch Saved Bank Lines (Unmatched)
        // In a real app, you'd save these to Firestore. For now, we use local state or a temporary collection.
        // Let's assume we fetch them from a "bank_feed" collection for persistence.
        const qBank = query(collection(db, "users", user.uid, "bank_feed"));
        const unsubBank = onSnapshot(qBank, (snap) => {
            setBankLines(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => { unsubHistory(); unsubBank(); };
    }, [user]);

    // --- 2. PREPARE BOOK ENTRIES ---
    const bookEntries = useMemo(() => {
        const moneyIn = quotes
            .filter(q => (q.status === 'INVOICED' || q.status === 'WON') && !q.isReconciled)
            .map(q => ({
                id: q.id,
                source: 'QUOTE',
                date: q.lastModified?.seconds ? new Date(q.lastModified.seconds * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                description: `Collection: ${q.customer?.name} (Inv# ${q.id})`,
                amount: (Number(q.finalSalesPrice) * (q.costing?.forexRate || 58.5)), 
                type: 'CREDIT'
            }));

        const moneyOut = ledgerEntries
            .filter(e => !e.isReconciled)
            .map(e => ({
                id: e.id,
                source: 'LEDGER',
                date: e.date,
                description: `Payment: ${e.supplierName || e.subCategory} (Ref: ${e.reference})`,
                amount: Number(e.amountPHP),
                type: 'DEBIT' 
            }));

        return [...moneyIn, ...moneyOut].sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [quotes, ledgerEntries]);

    // --- 3. CRUD HANDLERS FOR BANK LINES ---

    const handleSaveBankLine = async () => {
        if (!formLine.date || !formLine.amount) return alert("Date and Amount are required.");
        
        try {
            if (editingLineId) {
                // UPDATE
                await updateDoc(doc(db, "users", user.uid, "bank_feed", editingLineId), formLine);
                setEditingLineId(null);
            } else {
                // CREATE
                await addDoc(collection(db, "users", user.uid, "bank_feed"), {
                    ...formLine,
                    status: 'UNMATCHED',
                    createdAt: serverTimestamp()
                });
            }
            setFormLine({ date: '', description: '', amount: '', type: 'DEBIT' }); // Reset form
        } catch (error) {
            console.error("Error saving bank line:", error);
        }
    };

    const handleEditBankLine = (line) => {
        setFormLine(line);
        setEditingLineId(line.id);
        setSelectedBankLine(null); // Deselect if editing
    };

    const handleDeleteBankLine = async (id) => {
        if (!confirm("Delete this bank line?")) return;
        try {
            await deleteDoc(doc(db, "users", user.uid, "bank_feed", id));
            if (selectedBankLine?.id === id) setSelectedBankLine(null);
        } catch (error) {
            console.error("Error deleting bank line:", error);
        }
    };

    const handleCancelEdit = () => {
        setEditingLineId(null);
        setFormLine({ date: '', description: '', amount: '', type: 'DEBIT' });
    };

    // --- 4. RECONCILIATION LOGIC ---
    const handleReconcile = async () => {
        if (!selectedBookEntry || !selectedBankLine) return alert("Select one item from both sides to match.");
        
        const variance = Math.abs(selectedBookEntry.amount - parseFloat(selectedBankLine.amount));
        if (variance > 1.00) {
            if (!confirm(`Warning: Amounts differ by ₱${variance.toFixed(2)}. Reconcile anyway?`)) return;
        }

        try {
            // Mark Book Entry as Reconciled
            if (selectedBookEntry.source === 'QUOTE') {
                await updateDoc(doc(db, "users", user.uid, "quotes", selectedBookEntry.id), { isReconciled: true, reconciledDate: new Date().toISOString() });
            } else {
                await updateDoc(doc(db, "users", user.uid, "ledger", selectedBookEntry.id), { isReconciled: true, reconciledDate: new Date().toISOString() });
            }

            // Remove/Mark Bank Line as Reconciled (Delete from feed or mark status)
            await deleteDoc(doc(db, "users", user.uid, "bank_feed", selectedBankLine.id));

            // Save Audit Record
            await addDoc(collection(db, "users", user.uid, "reconciliations"), {
                bookId: selectedBookEntry.id,
                bankLineDesc: selectedBankLine.description,
                amount: selectedBookEntry.amount,
                date: new Date().toISOString().split('T')[0],
                matchType: 'MANUAL',
                reconciledAt: serverTimestamp(),
                details: `${selectedBookEntry.description} matched with Bank: ${selectedBankLine.description}`
            });

            setSelectedBankLine(null);
            setSelectedBookEntry(null);

        } catch (error) {
            console.error(error);
            alert("Reconciliation failed.");
        }
    };

    const formatMoney = (val) => `₱${Number(val).toLocaleString(undefined, {minimumFractionDigits: 2})}`;

    return (
        <div className="space-y-8 pb-20">
            {/* HEADER */}
            <div className="flex justify-between items-center bg-white p-6 rounded-[30px] shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl">
                        <Landmark size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Bank Reconciliation</h1>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Match Books vs. Bank Statement</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="text-right">
                        <p className="text-[10px] font-black uppercase text-gray-400">Unreconciled Book Items</p>
                        <p className="text-xl font-black text-gray-800">{bookEntries.length} Items</p>
                    </div>
                    <div className="text-right pl-4 border-l border-gray-200">
                        <p className="text-[10px] font-black uppercase text-gray-400">Reconciled This Month</p>
                        <p className="text-xl font-black text-green-600">{reconciledHistory.length} Items</p>
                    </div>
                </div>
            </div>

            {/* MAIN WORKSPACE */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* LEFT: BANK STATEMENT FEED */}
                <Card className="border-t-4 border-purple-500 shadow-lg flex flex-col h-[600px]">
                    <div className="p-4 bg-purple-50 border-b border-purple-100 flex justify-between items-center">
                        <h3 className="font-black text-purple-800 uppercase tracking-widest text-xs flex items-center gap-2">
                            <Landmark size={16}/> Bank Statement Feed
                        </h3>
                        <span className="text-[9px] font-bold bg-white text-purple-600 px-2 py-1 rounded border border-purple-200">HSBC / EXTERNAL</span>
                    </div>
                    
                    {/* INPUT FORM (ADD / EDIT) */}
                    <div className="p-4 border-b border-gray-100 bg-white grid grid-cols-4 gap-2 items-end">
                        <div className="col-span-1">
                            <label className="text-[9px] font-bold text-gray-400">Date</label>
                            <input 
                                type="date" 
                                className="w-full p-2 text-xs border rounded-lg font-bold outline-none focus:border-purple-500 transition-colors" 
                                value={formLine.date} 
                                onChange={e => setFormLine({...formLine, date: e.target.value})} 
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="text-[9px] font-bold text-gray-400">Amount</label>
                            <input 
                                type="number" 
                                className="w-full p-2 text-xs border rounded-lg font-bold outline-none focus:border-purple-500 transition-colors" 
                                value={formLine.amount} 
                                onChange={e => setFormLine({...formLine, amount: e.target.value})} 
                                placeholder="0.00" 
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="text-[9px] font-bold text-gray-400">Desc</label>
                            <input 
                                type="text" 
                                className="w-full p-2 text-xs border rounded-lg font-bold outline-none focus:border-purple-500 transition-colors" 
                                value={formLine.description} 
                                onChange={e => setFormLine({...formLine, description: e.target.value})} 
                                placeholder="Ref..." 
                            />
                        </div>
                        <div className="flex gap-1">
                            <Button onClick={handleSaveBankLine} size="sm" variant="secondary" className={`h-[34px] flex-1 ${editingLineId ? 'bg-orange-100 text-orange-600' : ''}`}>
                                {editingLineId ? <CheckCircle size={16}/> : <PlusCircle size={16}/>}
                            </Button>
                            {editingLineId && (
                                <Button onClick={handleCancelEdit} size="sm" variant="secondary" className="h-[34px] text-red-500">
                                    <XCircle size={16}/>
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-gray-50/50">
                        {bankLines.length === 0 && <div className="text-center text-gray-400 text-xs mt-10 italic">No bank lines added. Input manually or upload CSV.</div>}
                        {bankLines.map(line => (
                            <div 
                                key={line.id} 
                                onClick={() => !editingLineId && setSelectedBankLine(line)}
                                className={`p-3 rounded-xl border cursor-pointer transition-all flex justify-between items-center group relative ${
                                    selectedBankLine?.id === line.id 
                                    ? 'bg-purple-600 text-white border-purple-600 shadow-md transform scale-[1.02]' 
                                    : 'bg-white border-gray-200 hover:border-purple-300 text-gray-700'
                                }`}
                            >
                                <div>
                                    <p className="font-bold text-xs">{line.date}</p>
                                    <p className={`text-[10px] uppercase font-bold tracking-wider ${selectedBankLine?.id === line.id ? 'opacity-80' : 'text-gray-400'}`}>
                                        {line.description || 'Bank Transaction'}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="font-mono font-black">{formatMoney(line.amount)}</p>
                                </div>

                                {/* EDIT/DELETE ACTIONS (Only show on hover and when not already selected/editing) */}
                                {selectedBankLine?.id !== line.id && !editingLineId && (
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 p-1 rounded-lg shadow-sm">
                                        <button onClick={(e) => { e.stopPropagation(); handleEditBankLine(line); }} className="p-1 hover:bg-orange-50 text-gray-400 hover:text-orange-500 rounded">
                                            <Edit2 size={12}/>
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteBankLine(line.id); }} className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded">
                                            <Trash2 size={12}/>
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </Card>

                {/* RIGHT: INTERNAL BOOKS (No changes needed here, keeping logic intact) */}
                <Card className="border-t-4 border-orange-500 shadow-lg flex flex-col h-[600px]">
                    <div className="p-4 bg-orange-50 border-b border-orange-100 flex justify-between items-center">
                        <h3 className="font-black text-orange-800 uppercase tracking-widest text-xs flex items-center gap-2">
                            <ArrowRightLeft size={16}/> Internal Books
                        </h3>
                        <span className="text-[9px] font-bold bg-white text-orange-600 px-2 py-1 rounded border border-orange-200">ERP / INTERNAL</span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-gray-50/50">
                        {bookEntries.length === 0 && <div className="text-center text-gray-400 text-xs mt-10 italic">All caught up! No unreconciled items.</div>}
                        {bookEntries.map(entry => (
                            <div 
                                key={entry.id} 
                                onClick={() => setSelectedBookEntry(entry)}
                                className={`p-3 rounded-xl border cursor-pointer transition-all flex justify-between items-center ${
                                    selectedBookEntry?.id === entry.id 
                                    ? 'bg-orange-600 text-white border-orange-600 shadow-md transform scale-[1.02]' 
                                    : 'bg-white border-gray-200 hover:border-orange-300 text-gray-700'
                                }`}
                            >
                                <div>
                                    <div className="flex gap-2 mb-1">
                                        <span className="font-bold text-xs">{entry.date}</span>
                                        <span className={`text-[8px] px-1 rounded font-black uppercase ${entry.type === 'CREDIT' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                                            {entry.type === 'CREDIT' ? 'Deposit' : 'Payment'}
                                        </span>
                                    </div>
                                    <p className="text-[10px] opacity-80 font-bold truncate max-w-[200px]">{entry.description}</p>
                                </div>
                                <p className="font-mono font-black">{formatMoney(entry.amount)}</p>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* ACTION BAR */}
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-white border border-gray-200 p-4 rounded-full shadow-2xl flex items-center gap-6 z-50">
                <div className="flex items-center gap-2 text-xs">
                    <span className={`w-3 h-3 rounded-full ${selectedBankLine ? 'bg-purple-500' : 'bg-gray-300'}`}></span>
                    <span className="font-bold text-gray-600">{selectedBankLine ? 'Bank Selected' : 'Select Bank Line'}</span>
                </div>
                <Link2 size={20} className="text-gray-400"/>
                <div className="flex items-center gap-2 text-xs">
                    <span className={`w-3 h-3 rounded-full ${selectedBookEntry ? 'bg-orange-500' : 'bg-gray-300'}`}></span>
                    <span className="font-bold text-gray-600">{selectedBookEntry ? 'Book Selected' : 'Select Book Entry'}</span>
                </div>
                <div className="h-8 w-px bg-gray-200 mx-2"></div>
                <Button 
                    onClick={handleReconcile} 
                    variant="primary" 
                    className="rounded-full px-8 shadow-lg shadow-green-200 bg-green-600 hover:bg-green-700 border-none"
                    disabled={!selectedBankLine || !selectedBookEntry}
                >
                    <CheckCircle className="mr-2" size={18}/> Reconcile Match
                </Button>
            </div>

            {/* RECONCILED HISTORY */}
            <div className="mt-12">
                <h3 className="font-black text-gray-400 uppercase text-xs tracking-widest mb-4">Reconciliation History</h3>
                <Card className="border-0 shadow-sm overflow-hidden">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-gray-50 border-b font-black text-gray-500 uppercase">
                            <tr>
                                <th className="p-4">Date Matched</th>
                                <th className="p-4">Match Details</th>
                                <th className="p-4 text-right">Amount</th>
                                <th className="p-4 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {reconciledHistory.map(h => (
                                <tr key={h.id}>
                                    <td className="p-4 text-gray-500">{new Date(h.reconciledAt?.seconds * 1000).toLocaleDateString()}</td>
                                    <td className="p-4 font-medium text-gray-700">{h.details}</td>
                                    <td className="p-4 text-right font-mono font-bold text-gray-800">{formatMoney(h.amount)}</td>
                                    <td className="p-4 text-center"><span className="bg-green-100 text-green-700 px-2 py-1 rounded text-[9px] font-black uppercase">Verified</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            </div>
        </div>
    );
};

export default BankReconciliation;
