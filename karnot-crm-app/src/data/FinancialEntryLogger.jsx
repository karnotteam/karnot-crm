import React, { useState, useEffect } from 'react';
import { Save, Landmark, ArrowRightLeft, Trash2, Edit2, X, Check } from 'lucide-react';
import { Card, Button, Input, Textarea, Section, KARNOT_CHART_OF_ACCOUNTS } from '../data/constants.jsx';
import { db } from '../firebase';
import { collection, addDoc, getDocs, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc } from "firebase/firestore";
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
        supplierTIN: '', // <--- Added for BIR Compliance
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
            if (editingId) {
                await updateDoc(doc(db, "users", auth.currentUser.uid, "ledger", editingId), {
                    ...entry,
                    amountPHP: parseFloat(entry.amountPHP),
                    amountUSD: parseFloat(entry.amountUSD)
                });
                setEditingId(null);
            } else {
                await addDoc(collection(db, "users", auth.currentUser.uid, "ledger"), {
                    ...entry,
                    amountPHP: parseFloat(entry.amountPHP),
                    amountUSD: parseFloat(entry.amountUSD),
                    createdAt: new Date().toISOString(),
                    type: 'EXPENSE'
                });
            }
            // Reset form
            setEntry(prev => ({ 
                ...prev, 
                amountUSD: '', 
                amountPHP: '', 
                reference: '', 
                supplierTIN: '', 
                description: '' 
            }));
        } catch (error) {
            console.error(error);
            alert("Error saving entry.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this entry? This cannot be undone.")) {
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
            <Card className="max-w-5xl mx-auto border-t-4 border-orange-500">
                <div className="flex justify-between items-center mb-8 pb-4 border-b">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Landmark className="text-orange-600" /> {editingId ? "Edit Ledger Entry" : "New Ledger Entry"}
                    </h2>
                    {editingId && (
                        <Button onClick={() => {setEditingId(null); setEntry(prev => ({...prev, amountUSD: '', amountPHP: ''}))}} variant="secondary">
                            <X size={16} className="mr-1"/> Cancel Edit
                        </Button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Section title="Categorization">
                        <div className="space-y-4">
                            <Input label="Date" type="date" value={entry.date} onChange={e => setEntry({...entry, date: e.target.value})} />
                            <select className="w-full p-2 border rounded" value={entry.category} onChange={(e) => setEntry({...entry, category: e.target.value, subCategory: ''})}>
                                <option value="">-- Account Group --</option>
                                {Object.keys(KARNOT_CHART_OF_ACCOUNTS).map(cat => <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>)}
                            </select>
                            {entry.category && (
                                <select className="w-full p-2 border border-orange-300 bg-orange-50 rounded font-bold" value={entry.subCategory} onChange={(e) => setEntry({...entry, subCategory: e.target.value})}>
                                    <option value="">-- Specific Line Item --</option>
                                    {KARNOT_CHART_OF_ACCOUNTS[entry.category].map(item => <option key={item} value={item}>{item}</option>)}
                                </select>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Reference (OR#)" placeholder="Invoice/OR#" value={entry.reference} onChange={e => setEntry({...entry, reference: e.target.value})} />
                                <Input label="Supplier TIN" placeholder="000-000-000-000" value={entry.supplierTIN} onChange={e => setEntry({...entry, supplierTIN: e.target.value})} />
                            </div>
                        </div>
                    </Section>

                    <Section title="Values">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Input label="USD" type="number" value={entry.amountUSD} onChange={e => handleAmountChange(e.target.value, 'USD')} />
                                <ArrowRightLeft className="mt-6 text-gray-400" size={20} />
                                <Input label="PHP" type="number" value={entry.amountPHP} onChange={e => handleAmountChange(e.target.value, 'PHP')} />
                            </div>
                            <select className="w-full p-2 border rounded" value={entry.companyId} onChange={(e) => setEntry({...entry, companyId: e.target.value})}>
                                <option value="">-- Internal / No Company --</option>
                                {companies.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                            </select>
                            <Textarea label="Description" value={entry.description} onChange={e => setEntry({...entry, description: e.target.value})} />
                        </div>
                    </Section>
                </div>

                <div className="flex justify-end mt-8">
                    <Button onClick={handleSave} variant="success" className="px-10" disabled={loading}>
                        {editingId ? <Check className="mr-2"/> : <Save className="mr-2"/>}
                        {editingId ? "Update Entry" : "Post to Ledger"}
                    </Button>
                </div>
            </Card>

            {/* HISTORY TABLE SECTION */}
            <Card className="max-w-5xl mx-auto overflow-hidden">
                <h3 className="text-xl font-bold mb-6 text-gray-700">Recent Transactions (Manual Book History)</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                            <tr>
                                <th className="p-4 border">Date</th>
                                <th className="p-4 border">Category / TIN</th>
                                <th className="p-4 border text-right">Amount (PHP)</th>
                                <th className="p-4 border">Reference</th>
                                <th className="p-4 border text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ledgerEntries.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50 border-b">
                                    <td className="p-4 border font-medium whitespace-nowrap">{item.date}</td>
                                    <td className="p-4 border">
                                        <div className="font-bold text-orange-700">{item.subCategory}</div>
                                        <div className="text-[10px] text-gray-500 font-mono">{item.supplierTIN || 'NO TIN PROVIDED'}</div>
                                    </td>
                                    <td className="p-4 border text-right font-mono font-bold">₱{parseFloat(item.amountPHP).toLocaleString()}</td>
                                    <td className="p-4 border text-gray-500 font-medium">{item.reference || '-'}</td>
                                    <td className="p-4 border">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => startEdit(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={16}/></button>
                                            <button onClick={() => handleDelete(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
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
