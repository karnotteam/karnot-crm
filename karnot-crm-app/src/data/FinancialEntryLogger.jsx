import React, { useState, useEffect } from 'react';
import { Save, Landmark, ArrowRightLeft, Trash2, Edit2, X, Check, Globe } from 'lucide-react';
import { Card, Button, Input, Textarea, Section, KARNOT_CHART_OF_ACCOUNTS } from '../data/constants.jsx';
import { db } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const FinancialEntryLogger = ({ companies = [] }) => {
    const [loading, setLoading] = useState(false);
    const [ledgerEntries, setLedgerEntries] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [entry, setEntry] = useState({
        date: new Date().toISOString().split('T')[0],
        category: '',
        subCategory: '',
        amountUSD: '',
        amountPHP: '',
        forexRate: 58.75,
        companyId: '',
        reference: '',
        supplierTIN: '',
        taxStatus: 'VAT', // Default to local VAT
        description: ''
    });

    // --- 1. REAL-TIME DATA FETCH ---
    useEffect(() => {
        const auth = getAuth();
        if (!auth.currentUser) return;

        const q = query(
            collection(db, "users", auth.currentUser.uid, "ledger"),
            orderBy("date", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setLedgerEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => unsubscribe();
    }, []);

    // --- 2. HANDLERS ---
    const handleAmountChange = (value, type) => {
        const numValue = parseFloat(value) || 0;
        if (type === 'USD') {
            setEntry(prev => ({ ...prev, amountUSD: value, amountPHP: (numValue * prev.forexRate).toFixed(2) }));
        } else {
            setEntry(prev => ({ ...prev, amountPHP: value, amountUSD: (numValue / prev.forexRate).toFixed(2) }));
        }
    };

    const handleSave = async () => {
        const auth = getAuth();
        if (!auth.currentUser) return;
        if (!entry.subCategory || !entry.amountPHP) return alert("Please fill in the required fields.");

        setLoading(true);
        try {
            const payload = {
                ...entry,
                amountPHP: parseFloat(entry.amountPHP),
                amountUSD: parseFloat(entry.amountUSD),
                updatedAt: new Date().toISOString()
            };

            if (editingId) {
                await updateDoc(doc(db, "users", auth.currentUser.uid, "ledger", editingId), payload);
                setEditingId(null);
            } else {
                await addDoc(collection(db, "users", auth.currentUser.uid, "ledger"), {
                    ...payload,
                    createdAt: new Date().toISOString(),
                    type: 'EXPENSE'
                });
            }
            // Reset form but keep forex rate and date
            setEntry(prev => ({ 
                ...prev, 
                amountUSD: '', 
                amountPHP: '', 
                reference: '', 
                supplierTIN: '', 
                description: '',
                taxStatus: 'VAT'
            }));
        } catch (error) {
            console.error(error);
            alert("Error saving entry.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this entry?")) {
            const auth = getAuth();
            await deleteDoc(doc(db, "users", auth.currentUser.uid, "ledger", id));
        }
    };

    const startEdit = (item) => {
        setEditingId(item.id);
        setEntry({ ...item });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="space-y-10">
            {/* FORM SECTION */}
            <Card className="max-w-5xl mx-auto border-t-4 border-orange-500 shadow-xl">
                <div className="flex justify-between items-center mb-8 pb-4 border-b">
                    <div>
                        <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2 uppercase tracking-tight">
                            <Landmark className="text-orange-600" /> {editingId ? "Edit Ledger Entry" : "Post to Ledger"}
                        </h2>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Recording Disbursements & Disbursements</p>
                    </div>
                    {editingId && (
                        <Button onClick={() => setEditingId(null)} variant="secondary">
                            <X size={16} className="mr-1"/> Cancel
                        </Button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Section title="Transaction Details">
                        <div className="space-y-4">
                            <Input label="Transaction Date" type="date" value={entry.date} onChange={e => setEntry({...entry, date: e.target.value})} />
                            
                            <div>
                                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1">Account Category</label>
                                <select className="w-full p-2 border-2 border-gray-100 rounded-xl bg-white font-bold text-gray-700 focus:ring-2 focus:ring-orange-500 outline-none" value={entry.category} onChange={(e) => setEntry({...entry, category: e.target.value, subCategory: ''})}>
                                    <option value="">-- Select Group --</option>
                                    {Object.keys(KARNOT_CHART_OF_ACCOUNTS).map(cat => <option key={cat} value={cat}>{cat.replace(/_/g, ' ')}</option>)}
                                </select>
                            </div>

                            {entry.category && (
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1">Specific Line Item</label>
                                    <select className="w-full p-2 border-2 border-orange-100 bg-orange-50 rounded-xl font-black text-orange-800 focus:ring-2 focus:ring-orange-500 outline-none" value={entry.subCategory} onChange={(e) => setEntry({...entry, subCategory: e.target.value})}>
                                        <option value="">-- Select Item --</option>
                                        {KARNOT_CHART_OF_ACCOUNTS[entry.category].map(item => <option key={item} value={item}>{item}</option>)}
                                    </select>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Invoice / OR #" placeholder="Ref Number" value={entry.reference} onChange={e => setEntry({...entry, reference: e.target.value})} />
                                <Input label="Supplier TIN" placeholder="000-000-000-000" value={entry.supplierTIN} onChange={e => setEntry({...entry, supplierTIN: e.target.value})} />
                            </div>
                        </div>
                    </Section>

                    <Section title="Tax & Currency">
                        <div className="space-y-4">
                            {/* TAX STATUS TOGGLE */}
                            <div>
                                <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 ml-1">Tax Status (BIR Compliance)</label>
                                <div className="flex bg-gray-100 p-1 rounded-xl">
                                    <button 
                                        onClick={() => setEntry({...entry, taxStatus: 'VAT'})}
                                        className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${entry.taxStatus === 'VAT' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-400'}`}
                                    >
                                        Local VAT
                                    </button>
                                    <button 
                                        onClick={() => setEntry({...entry, taxStatus: 'NON-VAT'})}
                                        className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${entry.taxStatus === 'NON-VAT' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}
                                    >
                                        Non-VAT / Overseas
                                    </button>
                                </div>
                                {entry.taxStatus === 'NON-VAT' && (
                                    <p className="text-[9px] text-blue-500 font-bold mt-2 flex items-center gap-1">
                                        <Globe size={12}/> Overseas Purchase: No Input VAT will be recorded.
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <Input label="Value in USD" type="number" value={entry.amountUSD} onChange={e => handleAmountChange(e.target.value, 'USD')} />
                                <ArrowRightLeft className="mt-6 text-gray-300" size={20} />
                                <Input label="Value in PHP" type="number" value={entry.amountPHP} onChange={e => handleAmountChange(e.target.value, 'PHP')} />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1">Project Assignment</label>
                                <select className="w-full p-2 border-2 border-gray-100 rounded-xl bg-white font-bold text-gray-700" value={entry.companyId} onChange={(e) => setEntry({...entry, companyId: e.target.value})}>
                                    <option value="">-- Internal Admin Expense --</option>
                                    {companies.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                                </select>
                            </div>
                            
                            <Textarea label="Transaction Description" placeholder="Details of purchase..." value={entry.description} onChange={e => setEntry({...entry, description: e.target.value})} />
                        </div>
                    </Section>
                </div>

                <div className="flex justify-end mt-8 border-t pt-6">
                    <Button onClick={handleSave} variant="success" className="px-12 py-3 rounded-2xl shadow-lg" disabled={loading}>
                        {editingId ? <Check className="mr-2"/> : <Save className="mr-2"/>}
                        {editingId ? "Update Ledger" : "Post Transaction"}
                    </Button>
                </div>
            </Card>

            {/* HISTORY TABLE SECTION */}
            <Card className="max-w-5xl mx-auto overflow-hidden shadow-lg border-0">
                <h3 className="text-xs font-black uppercase text-gray-400 tracking-[0.2em] mb-6">Ledger Journal History</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="p-4 text-[10px] font-black uppercase text-gray-400">Date</th>
                                <th className="p-4 text-[10px] font-black uppercase text-gray-400">Category & Tax</th>
                                <th className="p-4 text-[10px] font-black uppercase text-gray-400 text-right">Amount (PHP)</th>
                                <th className="p-4 text-[10px] font-black uppercase text-gray-400 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {ledgerEntries.map((item) => (
                                <tr key={item.id} className="hover:bg-orange-50/30 transition-colors">
                                    <td className="p-4 font-bold text-gray-600 whitespace-nowrap">{item.date}</td>
                                    <td className="p-4">
                                        <div className="font-black text-gray-800 uppercase text-xs">{item.subCategory}</div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${item.taxStatus === 'VAT' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {item.taxStatus || 'VAT'}
                                            </span>
                                            <span className="text-[9px] text-gray-400 font-mono">{item.supplierTIN || 'NO TIN'}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-right font-mono font-black text-gray-900">
                                        ₱{parseFloat(item.amountPHP).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex justify-center gap-1">
                                            <button onClick={() => startEdit(item)} className="p-2 text-gray-400 hover:text-blue-600 transition-colors"><Edit2 size={14}/></button>
                                            <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors"><Trash2 size={14}/></button>
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

export default FinancialEntryLogger;
