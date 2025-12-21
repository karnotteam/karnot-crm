import React, { useState, useMemo, useEffect } from 'react';
import { Card, Button, Input } from '../data/constants.jsx'; 
import { 
    Landmark, ArrowRightLeft, CheckCircle, XCircle, 
    Upload, Search, Filter, TrendingUp, TrendingDown, Link2
} from 'lucide-react';
import { db } from '../firebase'; 
import { collection, query, onSnapshot, doc, updateDoc, serverTimestamp, addDoc, orderBy } from "firebase/firestore";

const BankReconciliation = ({ user, quotes = [], ledgerEntries = [] }) => {
    const [bankLines, setBankLines] = useState([]); // Local state for bank statement lines
    const [newBankLine, setNewBankLine] = useState({ date: '', description: '', amount: '', type: 'DEBIT' });
    const [selectedBookEntry, setSelectedBookEntry] = useState(null);
    const [selectedBankLine, setSelectedBankLine] = useState(null);
    const [reconciledHistory, setReconciledHistory] = useState([]);

    // --- 1. FETCH RECONCILED DATA ---
    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, "users", user.uid, "reconciliations"), orderBy("reconciledAt", "desc"));
        const unsub = onSnapshot(q, (snap) => {
            setReconciledHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, [user]);

    // --- 2. PREPARE BOOK ENTRIES (Internal Records) ---
    const bookEntries = useMemo(() => {
        // A. Money In (Sales / Collections)
        // We look for Invoiced Quotes that are NOT yet marked as reconciled in their metadata
        const moneyIn = quotes
            .filter(q => (q.status === 'INVOICED' || q.status === 'WON') && !q.isReconciled)
            .map(q => ({
                id: q.id,
                source: 'QUOTE',
                date: q.lastModified?.seconds ? new Date(q.lastModified.seconds * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                description: `Collection: ${q.customer?.name} (Inv# ${q.id})`,
                amount: (Number(q.finalSalesPrice) * (q.costing?.forexRate || 58.5)), // Convert to PHP
                type: 'CREDIT' // Credit to Cash in Bank (Increase)
            }));

        // B. Money Out (Expenses / Disbursements)
        const moneyOut = ledgerEntries
            .filter(e => !e.isReconciled)
            .map(e => ({
                id: e.id,
                source: 'LEDGER',
                date: e.date,
                description: `Payment: ${e.supplierName || e.subCategory} (Ref: ${e.reference})`,
                amount: Number(e.amountPHP),
                type: 'DEBIT' // Debit to Cash in Bank (Decrease)
            }));

        return [...moneyIn, ...moneyOut].sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [quotes, ledgerEntries]);

    // --- 3. HANDLERS ---

    const handleAddBankLine = () => {
        if (!newBankLine.date || !newBankLine.amount) return;
        setBankLines([...bankLines, { ...newBankLine, id: `bank-${Date.now()}`, status: 'UNMATCHED' }]);
        setNewBankLine({ date: '', description: '', amount: '', type: 'DEBIT' });
    };

    const handleReconcile = async () => {
        if (!selectedBookEntry || !selectedBankLine) return alert("Select one item from both sides to match.");
        
        // 1. Validate Amount Match (Allow 1.00 PHP variance for Forex rounding)
        const variance = Math.abs(selectedBookEntry.amount - parseFloat(selectedBankLine.amount));
        if (variance > 1.00) {
            if (!confirm(`Warning: Amounts differ by ₱${variance.toFixed(2)}. Reconcile anyway?`)) return;
        }

        // 2. Update Firestore (Mark the original record as reconciled)
        try {
            if (selectedBookEntry.source === 'QUOTE') {
                await updateDoc(doc(db, "users", user.uid, "quotes", selectedBookEntry.id), { isReconciled: true, reconciledDate: new Date().toISOString() });
            } else {
                await updateDoc(doc(db, "users", user.uid, "ledger", selectedBookEntry.id), { isReconciled: true, reconciledDate: new Date().toISOString() });
            }

            // 3. Save Audit Record
            await addDoc(collection(db, "users", user.uid, "reconciliations"), {
                bookId: selectedBookEntry.id,
                bankLineId: selectedBankLine.id,
                amount: selectedBookEntry.amount,
                date: new Date().toISOString().split('T')[0],
                matchType: 'MANUAL',
                reconciledAt: serverTimestamp(),
                details: `${selectedBookEntry.description} matched with Bank: ${selectedBankLine.description}`
            });

            // 4. Update Local State
            setBankLines(prev => prev.filter(l => l.id !== selectedBankLine.id));
            setSelectedBankLine(null);
            setSelectedBookEntry(null);

        } catch (error) {
            console.error(error);
            alert("Reconciliation failed.");
        }
    };

    // --- HELPERS ---
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
                    
                    {/* Manual Entry Form */}
                    <div className="p-4 border-b border-gray-100 bg-white grid grid-cols-4 gap-2 items-end">
                        <div className="col-span-1">
                            <label className="text-[9px] font-bold text-gray-400">Date</label>
                            <input type="date" className="w-full p-2 text-xs border rounded-lg font-bold" value={newBankLine.date} onChange={e => setNewBankLine({...newBankLine, date: e.target.value})} />
                        </div>
                        <div className="col-span-1">
                            <label className="text-[9px] font-bold text-gray-400">Amount</label>
                            <input type="number" className="w-full p-2 text-xs border rounded-lg font-bold" value={newBankLine.amount} onChange={e => setNewBankLine({...newBankLine, amount: e.target.value})} placeholder="0.00" />
                        </div>
                        <div className="col-span-1">
                            <label className="text-[9px] font-bold text-gray-400">Desc</label>
                            <input type="text" className="w-full p-2 text-xs border rounded-lg font-bold" value={newBankLine.description} onChange={e => setNewBankLine({...newBankLine, description: e.target.value})} placeholder="Ref..." />
                        </div>
                        <Button onClick={handleAddBankLine} size="sm" variant="secondary" className="h-[34px]"><PlusCircle size={16}/></Button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-gray-50/50">
                        {bankLines.length === 0 && <div className="text-center text-gray-400 text-xs mt-10 italic">No bank lines added. Input manually or upload CSV.</div>}
                        {bankLines.map(line => (
                            <div 
                                key={line.id} 
                                onClick={() => setSelectedBankLine(line)}
                                className={`p-3 rounded-xl border cursor-pointer transition-all flex justify-between items-center ${
                                    selectedBankLine?.id === line.id 
                                    ? 'bg-purple-600 text-white border-purple-600 shadow-md transform scale-[1.02]' 
                                    : 'bg-white border-gray-200 hover:border-purple-300 text-gray-700'
                                }`}
                            >
                                <div>
                                    <p className="font-bold text-xs">{line.date}</p>
                                    <p className="text-[10px] opacity-80 uppercase font-bold tracking-wider">{line.description || 'Bank Transaction'}</p>
                                </div>
                                <p className="font-mono font-black">{formatMoney(line.amount)}</p>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* MIDDLE: ACTION BUTTON (Float or Fixed) */}
                
                {/* RIGHT: INTERNAL BOOKS */}
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
