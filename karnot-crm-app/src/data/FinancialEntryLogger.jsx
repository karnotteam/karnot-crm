import React, { useState, useEffect } from 'react';
import { Save, Landmark, ArrowRightLeft, Trash2, Edit2, RefreshCw, XCircle, Briefcase } from 'lucide-react';
import { Card, Button, Input, Textarea, Section, KARNOT_CHART_OF_ACCOUNTS } from '../data/constants.jsx';
import { db } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Added quotes and opportunities to props
const FinancialEntryLogger = ({ companies = [], quotes = [], opportunities = [] }) => {
    const [loading, setLoading] = useState(false);
    const [ledgerEntries, setLedgerEntries] = useState([]);
    const [suppliers, setSuppliers] = useState([]); 
    const [editingId, setEditingId] = useState(null);
    const [fetchingForex, setFetchingForex] = useState(false);
    
    // Initial State - ADDED projectId and projectLabel
    const initialEntryState = {
        date: new Date().toISOString().split('T')[0],
        category: '',
        subCategory: '',
        amountUSD: '',
        amountPHP: '',
        forexRate: 58.75,
        supplierId: '',
        supplierName: '',
        supplierTIN: '',
        reference: '', 
        taxStatus: 'VAT',
        description: '',
        projectId: '', // New Field for Costing Module
        projectLabel: '' // For display purposes
    };

    const [entry, setEntry] = useState(initialEntryState);

    // --- 1. DATA FETCHING ---
    useEffect(() => {
        const auth = getAuth();
        if (!auth.currentUser) return;

        // Fetch Ledger
        const qLedger = query(collection(db, "users", auth.currentUser.uid, "ledger"), orderBy("date", "desc"));
        const unsubLedger = onSnapshot(qLedger, (snapshot) => {
            setLedgerEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        // Fetch Suppliers
        const qSuppliers = query(collection(db, "users", auth.currentUser.uid, "suppliers"), orderBy("name", "asc"));
        const unsubSuppliers = onSnapshot(qSuppliers, (snapshot) => {
            setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => {
            unsubLedger();
            unsubSuppliers();
        };
    }, []);

    // --- 2. LOGIC HANDLERS ---
    
    const handleSupplierSelect = (e) => {
        const selectedId = e.target.value;
        const supplier = suppliers.find(s => s.id === selectedId);
        
        if (supplier) {
            setEntry(prev => ({
                ...prev,
                supplierId: supplier.id,
                supplierName: supplier.name,
                supplierTIN: supplier.tin || ''
            }));
        } else {
            setEntry(prev => ({ ...prev, supplierId: '', supplierName: '', supplierTIN: '' }));
        }
    };

    // New Handler for Project Selection
    const handleProjectSelect = (e) => {
        const pId = e.target.value;
        if (!pId) {
            setEntry(prev => ({ ...prev, projectId: '', projectLabel: '' }));
            return;
        }

        // Find the quote to get a nice label
        const quote = quotes.find(q => q.id === pId);
        const label = quote ? `${quote.id} - ${quote.customer?.name}` : pId;

        setEntry(prev => ({ ...prev, projectId: pId, projectLabel: label }));
    };

    const fetchLatestRate = () => {
        setFetchingForex(true);
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

    const handleEdit = (item) => {
        setEntry(item);
        setEditingId(item.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEntry(initialEntryState);
        setEditingId(null);
    };

    const handleSave = async () => {
        const auth = getAuth();
        if (!auth.currentUser) return;
        if (!entry.subCategory || !entry.amountPHP) return alert("Please fill in Category and Amount.");

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
            setEntry(initialEntryState);
        } catch (error) {
            console.error("Error saving ledger entry:", error);
            alert("Failed to save entry.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if(!confirm("Are you sure you want to delete this financial record?")) return;
        try {
            await deleteDoc(doc(db, "users", getAuth().currentUser.uid, "ledger", id));
        } catch(e) {
            alert("Error deleting: " + e.message);
        }
    };

    return (
        <div className="space-y-10">
            <Card className="max-w-6xl mx-auto border-t-4 border-orange-500 shadow-xl">
                <div className="flex justify-between items-center mb-8 pb-4 border-b">
                    <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2 uppercase tracking-tight">
                        <Landmark className="text-orange-600" /> 
                        {editingId ? 'Edit Ledger Entry' : 'New Financial Entry'}
                    </h2>
                    {editingId && (
                        <Button onClick={handleCancelEdit} variant="secondary" className="text-xs uppercase font-bold">
                            <XCircle size={14} className="mr-1"/> Cancel Edit
                        </Button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* SECTION 1: PAYEE & CATEGORY */}
                    <Section title="1. Payee & Classification">
                        <div className="space-y-4">
                            <Input 
                                label="Transaction Date" 
                                type="date" 
                                value={entry.date} 
                                onChange={e => setEntry({...entry, date: e.target.value})} 
                            />
                            
                            {/* Supplier Dropdown */}
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Supplier / Payee</label>
                                <select 
                                    className="w-full p-3 border-2 border-gray-200 rounded-xl bg-white font-bold text-sm outline-none focus:border-orange-500 transition-colors" 
                                    value={entry.supplierId} 
                                    onChange={handleSupplierSelect}
                                >
                                    <option value="">-- Select Supplier --</option>
                                    {suppliers.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} (TIN: {s.tin})</option>
                                    ))}
                                </select>
                            </div>

                            {/* NEW: PROJECT ASSIGNMENT DROPDOWN */}
                            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                                <label className="text-[10px] font-black text-blue-400 uppercase mb-1 block flex items-center gap-1">
                                    <Briefcase size={10} /> Cost Allocation (Project)
                                </label>
                                <select 
                                    className="w-full p-2 border border-blue-200 rounded-lg bg-white font-bold text-blue-900 text-sm outline-none focus:border-blue-500" 
                                    value={entry.projectId || ''} 
                                    onChange={handleProjectSelect}
                                >
                                    <option value="">-- General Overhead (No Project) --</option>
                                    {quotes.map(q => (
                                        <option key={q.id} value={q.id}>
                                            {q.id} | {q.customer?.name} ({q.status})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Input 
                                    label="Supplier TIN (Auto)" 
                                    value={entry.supplierTIN} 
                                    onChange={e => setEntry({...entry, supplierTIN: e.target.value})} 
                                    placeholder="000-000-000"
                                />
                                <Input 
                                    label="Reference (OR/Inv #)" 
                                    value={entry.reference} 
                                    onChange={e => setEntry({...entry, reference: e.target.value})} 
                                    placeholder="OR-12345"
                                />
                            </div>

                            <select className="w-full p-2 border rounded-xl bg-white font-bold" value={entry.category} onChange={(e) => setEntry({...entry, category: e.target.value, subCategory: ''})}>
                                <option value="">-- Chart of Accounts --</option>
                                {Object.keys(KARNOT_CHART_OF_ACCOUNTS).map(cat => <option key={cat} value={cat}>{cat.replace(/_/g, ' ')}</option>)}
                            </select>
                            
                            {entry.category && (
                                <select className="w-full p-2 border-2 border-orange-200 bg-orange-50 rounded-xl font-black text-orange-800" value={entry.subCategory} onChange={(e) => setEntry({...entry, subCategory: e.target.value})}>
                                    <option value="">-- Select Line Item --</option>
                                    {KARNOT_CHART_OF_ACCOUNTS[entry.category].map(item => <option key={item} value={item}>{item}</option>)}
                                </select>
                            )}
                        </div>
                    </Section>

                    {/* SECTION 2: VALUES */}
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
                                <Button onClick={fetchLatestRate} variant="secondary" className="mb-1 h-[42px]" disabled={fetchingForex}>
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
                                    <Input type="number" value={entry.amountPHP} onChange={e => handleAmountChange(e.target.value, 'PHP')} className="font-black text-orange-600"/>
                                </div>
                            </div>
                            
                            <Textarea 
                                label="Description / Notes" 
                                value={entry.description} 
                                onChange={e => setEntry({...entry, description: e.target.value})}
                                rows="2"
                            />

                            <div className="pt-2 border-t mt-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase">Tax Status</label>
                                <div className="flex bg-white p-1 rounded-lg border mt-1">
                                    <button onClick={() => setEntry({...entry, taxStatus: 'VAT'})} className={`flex-1 py-1 text-[9px] font-black rounded ${entry.taxStatus === 'VAT' ? 'bg-orange-600 text-white' : 'text-gray-400'}`}>VAT (12%)</button>
                                    <button onClick={() => setEntry({...entry, taxStatus: 'NON-VAT'})} className={`flex-1 py-1 text-[9px] font-black rounded ${entry.taxStatus === 'NON-VAT' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>NON-VAT / ZERO</button>
                                </div>
                            </div>
                        </div>
                    </Section>
                </div>

                <div className="flex justify-end mt-8 border-t pt-6">
                    <Button onClick={handleSave} variant="success" className="px-12 py-3 rounded-2xl shadow-lg" disabled={loading}>
                        <Save className="mr-2" size={18}/> {editingId ? 'Update Entry' : 'Post to Ledger'}
                    </Button>
                </div>
            </Card>

            {/* LEDGER TABLE */}
            <Card className="max-w-6xl mx-auto overflow-hidden shadow-lg border-0">
                <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-b">
                    <h3 className="text-xs font-black uppercase text-gray-500 tracking-[0.2em]">Daily Journal History</h3>
                    <div className="text-xs font-bold text-gray-400">{ledgerEntries.length} Records</div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                        <thead>
                            <tr className="bg-white border-b">
                                <th className="p-4 text-gray-400 font-black uppercase">Date</th>
                                <th className="p-4 text-gray-400 font-black uppercase">Payee / Supplier</th>
                                <th className="p-4 text-gray-400 font-black uppercase">Category & Project</th>
                                <th className="p-4 text-gray-400 font-black uppercase">Ref</th>
                                <th className="p-4 text-right text-gray-400 font-black uppercase">PHP Value</th>
                                <th className="p-4 text-center text-gray-400 font-black uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {ledgerEntries.map((item) => (
                                <tr key={item.id} className={`hover:bg-orange-50/30 transition-colors ${item.id === editingId ? 'bg-orange-50 border-l-4 border-orange-500' : ''}`}>
                                    <td className="p-4 font-medium text-gray-600">{item.date}</td>
                                    <td className="p-4">
                                        <div className="font-bold text-gray-800">{item.supplierName || '—'}</div>
                                        <div className="text-[10px] text-gray-400">{item.supplierTIN}</div>
                                    </td>
                                    <td className="p-4">
                                        <span className="font-black text-gray-700 uppercase block">{item.subCategory}</span>
                                        <span className="text-[10px] text-gray-400 block">{item.category}</span>
                                        {/* DISPLAY LINKED PROJECT */}
                                        {item.projectId && (
                                            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[9px] font-bold border border-blue-100">
                                                <Briefcase size={8} /> {item.projectLabel || item.projectId}
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 font-mono text-gray-500">{item.reference}</td>
                                    <td className="p-4 text-right">
                                        <div className="font-black text-orange-600">₱{parseFloat(item.amountPHP).toLocaleString()}</div>
                                        {item.amountUSD > 0 && (
                                            <div className="text-[9px] text-gray-400">${parseFloat(item.amountUSD).toLocaleString()} USD</div>
                                        )}
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => handleEdit(item)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Edit">
                                                <Edit2 size={16}/>
                                            </button>
                                            <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete">
                                                <Trash2 size={16}/>
                                            </button>
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
