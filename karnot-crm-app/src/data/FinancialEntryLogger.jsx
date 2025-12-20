import React, { useState, useEffect } from 'react';
import { Save, Landmark, ArrowRightLeft, Trash2, Edit2, X, Check, Globe, RefreshCw } from 'lucide-react';
import { Card, Button, Input, Textarea, Section, KARNOT_CHART_OF_ACCOUNTS } from '../data/constants.jsx';
import { db } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const FinancialEntryLogger = ({ companies = [] }) => {
    const [loading, setLoading] = useState(false);
    const [ledgerEntries, setLedgerEntries] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [fetchingForex, setFetchingForex] = useState(false);
    
    const [entry, setEntry] = useState({
        date: new Date().toISOString().split('T')[0],
        category: '',
        subCategory: '',
        amountUSD: '',
        amountPHP: '',
        forexRate: 58.75, // Default/Last Rate
        companyId: '',
        reference: '',
        supplierTIN: '',
        taxStatus: 'VAT',
        description: ''
    });

    // --- 1. DATA FETCHING ---
    useEffect(() => {
        const auth = getAuth();
        if (!auth.currentUser) return;
        const q = query(collection(db, "users", auth.currentUser.uid, "ledger"), orderBy("date", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setLedgerEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, []);

    // --- 2. FOREX LOGIC ---
    const fetchLatestRate = () => {
        setFetchingForex(true);
        // Simulate API Fetch (In production, replace with actual Exchange Rate API)
        setTimeout(() => {
            const mockRate = (58.50 + Math.random()).toFixed(2);
            setEntry(prev => {
                const newPHP = (parseFloat(prev.amountUSD || 0) * mockRate).toFixed(2);
                return { ...prev, forexRate: parseFloat(mockRate), amountPHP: newPHP };
            });
            setFetchingForex(false);
        }, 800);
    };

    const handleAmountChange = (value, type) => {
        const numValue = parseFloat(value) || 0;
        if (type === 'USD') {
            setEntry(prev => ({ 
                ...prev, 
                amountUSD: value, 
                amountPHP: (numValue * prev.forexRate).toFixed(2) 
            }));
        } else if (type === 'PHP') {
            setEntry(prev => ({ 
                ...prev, 
                amountPHP: value, 
                amountUSD: (numValue / prev.forexRate).toFixed(2) 
            }));
        } else if (type === 'RATE') {
            setEntry(prev => ({ 
                ...prev, 
                forexRate: value, 
                amountPHP: (parseFloat(prev.amountUSD || 0) * value).toFixed(2) 
            }));
        }
    };

    const handleSave = async () => {
        const auth = getAuth();
        if (!auth.currentUser) return;
        if (!entry.subCategory || !entry.amountPHP) return alert("Required fields missing.");

        setLoading(true);
        try {
            const payload = {
                ...entry,
                amountPHP: parseFloat(entry.amountPHP),
                amountUSD: parseFloat(entry.amountUSD),
                forexRate: parseFloat(entry.forexRate),
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
            setEntry(prev => ({ ...prev, amountUSD: '', amountPHP: '', reference: '', description: '' }));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-10">
            <Card className="max-w-5xl mx-auto border-t-4 border-orange-500 shadow-xl">
                <div className="flex justify-between items-center mb-8 pb-4 border-b">
                    <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2 uppercase tracking-tight">
                        <Landmark className="text-orange-600" /> Financial Entry
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Section title="1. Categorization">
                        <div className="space-y-4">
                            <Input label="Transaction Date" type="date" value={entry.date} onChange={e => setEntry({...entry, date: e.target.value})} />
                            <select className="w-full p-2 border rounded-xl bg-white font-bold" value={entry.category} onChange={(e) => setEntry({...entry, category: e.target.value, subCategory: ''})}>
                                <option value="">-- Account Group --</option>
                                {Object.keys(KARNOT_CHART_OF_ACCOUNTS).map(cat => <option key={cat} value={cat}>{cat.replace(/_/g, ' ')}</option>)}
                            </select>
                            {entry.category && (
                                <select className="w-full p-2 border-2 border-orange-200 bg-orange-50 rounded-xl font-black text-orange-800" value={entry.subCategory} onChange={(e) => setEntry({...entry, subCategory: e.target.value})}>
                                    <option value="">-- Select Line Item --</option>
                                    {KARNOT_CHART_OF_ACCOUNTS[entry.category].map(item => <option key={item} value={item}>{item}</option>)}
                                </select>
                            )}
                            <Input label="Supplier TIN" value={entry.supplierTIN} onChange={e => setEntry({...entry, supplierTIN: e.target.value})} />
                        </div>
                    </Section>

                    <Section title="2. Values & Daily Forex">
                        <div className="space-y-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                            {/* FOREX CONTROL */}
                            <div className="flex items-end gap-2">
                                <div className="flex-1">
                                    <Input 
                                        label="Daily Forex Rate (1 USD to PHP)" 
                                        type="number" 
                                        step="0.01"
                                        value={entry.forexRate} 
                                        onChange={e => handleAmountChange(e.target.value, 'RATE')} 
                                    />
                                </div>
                                <Button onClick={fetchLatestRate} variant="secondary" className="mb-1" disabled={fetchingForex}>
                                    <RefreshCw size={16} className={fetchingForex ? 'animate-spin' : ''} />
                                </Button>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="flex-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase">Amount in USD</label>
                                    <Input type="number" value={entry.amountUSD} onChange={e => handleAmountChange(e.target.value, 'USD')} />
                                </div>
                                <ArrowRightLeft className="mt-4 text-gray-300" size={20} />
                                <div className="flex-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase">Amount in PHP</label>
                                    <Input type="number" value={entry.amountPHP} onChange={e => handleAmountChange(e.target.value, 'PHP')} />
                                </div>
                            </div>
                            
                            <div className="pt-2 border-t mt-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase">Tax Status</label>
                                <div className="flex bg-white p-1 rounded-lg border mt-1">
                                    <button onClick={() => setEntry({...entry, taxStatus: 'VAT'})} className={`flex-1 py-1 text-[9px] font-black rounded ${entry.taxStatus === 'VAT' ? 'bg-orange-600 text-white' : 'text-gray-400'}`}>VAT</button>
                                    <button onClick={() => setEntry({...entry, taxStatus: 'NON-VAT'})} className={`flex-1 py-1 text-[9px] font-black rounded ${entry.taxStatus === 'NON-VAT' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>NON-VAT</button>
                                </div>
                            </div>
                        </div>
                    </Section>
                </div>

                <div className="flex justify-end mt-8 border-t pt-6">
                    <Button onClick={handleSave} variant="success" className="px-12 py-3 rounded-2xl shadow-lg" disabled={loading}>
                        <Save className="mr-2" size={18}/> Post to Ledger
                    </Button>
                </div>
            </Card>

            {/* TABLE REMAINS THE SAME BUT SHOWS THE RATE */}
            <Card className="max-w-5xl mx-auto overflow-hidden shadow-lg border-0">
                <h3 className="text-xs font-black uppercase text-gray-400 tracking-[0.2em] mb-6 px-4">Daily Journal History</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-100 border-b">
                                <th className="p-4">Date</th>
                                <th className="p-4">Category</th>
                                <th className="p-4 text-right">USD Value</th>
                                <th className="p-4 text-center">Rate</th>
                                <th className="p-4 text-right">PHP Value</th>
                                <th className="p-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {ledgerEntries.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4 text-gray-500 font-medium">{item.date}</td>
                                    <td className="p-4 font-black text-gray-800 uppercase">{item.subCategory}</td>
                                    <td className="p-4 text-right font-mono text-gray-400">${parseFloat(item.amountUSD).toLocaleString()}</td>
                                    <td className="p-4 text-center"><span className="bg-gray-100 px-2 py-0.5 rounded text-[10px] font-bold">@ {item.forexRate}</span></td>
                                    <td className="p-4 text-right font-mono font-black text-orange-600">₱{parseFloat(item.amountPHP).toLocaleString()}</td>
                                    <td className="p-4 text-center">
                                        <button onClick={() => deleteDoc(doc(db, "users", getAuth().currentUser.uid, "ledger", item.id))} className="text-gray-300 hover:text-red-500"><Trash2 size={14}/></button>
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
