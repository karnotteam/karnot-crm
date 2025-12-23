import React, { useState, useEffect } from 'react';
import { 
    FileText, Plus, Trash2, Edit, Save, Printer, 
    CheckCircle, AlertCircle, Calendar, User, MapPin, 
    Search, ArrowLeft, DollarSign, Briefcase
} from 'lucide-react';
import { Card, Button, Input, Textarea } from '../data/constants.jsx';
import { db } from '../firebase';
import { 
    collection, addDoc, query, orderBy, onSnapshot, 
    doc, updateDoc, deleteDoc, serverTimestamp 
} from "firebase/firestore";

const ServiceInvoice = ({ companies = [], user }) => {
    const [invoices, setInvoices] = useState([]);
    const [view, setView] = useState('list'); // 'list' or 'form'
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // --- FORM STATE ---
    const initialFormState = {
        invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        status: 'DRAFT', // DRAFT, SENT, PAID, OVERDUE
        dateIssued: new Date().toISOString().split('T')[0],
        dateDue: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        clientId: '',
        clientName: '',
        clientAddress: '',
        clientEmail: '',
        notes: 'Thank you for your business. Please make checks payable to Karnot Energy Solutions.',
        items: [
            { id: 1, description: 'Service Call - General Maintenance', quantity: 1, rate: 2500 }
        ],
        subtotal: 2500,
        tax: 300,
        total: 2800
    };

    const [formData, setFormData] = useState(initialFormState);

    // --- 1. DATA LISTENER ---
    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, "users", user.uid, "service_invoices"), orderBy("dateIssued", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setInvoices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, [user]);

    // --- 2. CALCULATIONS ---
    useEffect(() => {
        const sub = formData.items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.rate)), 0);
        const tx = sub * 0.12; // 12% VAT
        const tot = sub + tx;
        setFormData(prev => ({ ...prev, subtotal: sub, tax: tx, total: tot }));
    }, [formData.items]);

    // --- 3. HANDLERS ---
    const handleClientSelect = (e) => {
        const selectedId = e.target.value;
        const company = companies.find(c => c.id === selectedId);
        if (company) {
            setFormData(prev => ({
                ...prev,
                clientId: company.id,
                clientName: company.companyName,
                clientAddress: company.address || '',
                clientEmail: company.email || '' // Assuming email exists in company
            }));
        }
    };

    const handleAddItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, { id: Date.now(), description: '', quantity: 1, rate: 0 }]
        }));
    };

    const handleRemoveItem = (itemId) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter(i => i.id !== itemId)
        }));
    };

    const handleItemChange = (itemId, field, value) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.map(i => i.id === itemId ? { ...i, [field]: value } : i)
        }));
    };

    const handleSave = async () => {
        if (!user) return;
        setLoading(true);
        try {
            if (formData.id) {
                // Update
                await updateDoc(doc(db, "users", user.uid, "service_invoices", formData.id), {
                    ...formData,
                    lastModified: serverTimestamp()
                });
            } else {
                // Create
                await addDoc(collection(db, "users", user.uid, "service_invoices"), {
                    ...formData,
                    createdAt: serverTimestamp()
                });
            }
            setView('list');
            setFormData(initialFormState);
        } catch (error) {
            console.error("Error saving invoice:", error);
            alert("Failed to save invoice.");
        }
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to permanently delete this invoice?")) {
            try {
                await deleteDoc(doc(db, "users", user.uid, "service_invoices", id));
            } catch (error) {
                console.error("Error deleting:", error);
                alert("Failed to delete.");
            }
        }
    };

    const handleEdit = (invoice) => {
        setFormData(invoice);
        setView('form');
    };

    const formatMoney = (amount) => `₱${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

    // --- RENDER ---
    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-8 py-5 flex justify-between items-center sticky top-0 z-10 shadow-sm">
                <div>
                    <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Service Invoices</h1>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Billing & Receivables</p>
                </div>
                <div className="flex gap-3">
                    {view === 'form' && (
                        <Button onClick={() => setView('list')} variant="secondary">
                            <ArrowLeft size={16} className="mr-2"/> Cancel
                        </Button>
                    )}
                    {view === 'list' && (
                        <Button onClick={() => { setFormData(initialFormState); setView('form'); }} variant="primary" className="bg-orange-600 border-orange-600">
                            <Plus size={16} className="mr-2"/> New Invoice
                        </Button>
                    )}
                </div>
            </div>

            <div className="p-8 max-w-6xl mx-auto">
                {/* VIEW: LIST */}
                {view === 'list' && (
                    <Card className="border-0 shadow-lg overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50 flex gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input 
                                    type="text" 
                                    placeholder="Search by client or invoice #..." 
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-100 text-gray-500 font-black uppercase text-xs">
                                <tr>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Invoice #</th>
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Client</th>
                                    <th className="p-4 text-right">Amount</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {invoices.filter(i => 
                                    i.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                    i.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase())
                                ).map(inv => (
                                    <tr key={inv.id} className="hover:bg-orange-50 transition-colors">
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                                                inv.status === 'PAID' ? 'bg-green-100 text-green-700' :
                                                inv.status === 'SENT' ? 'bg-blue-100 text-blue-700' :
                                                inv.status === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                                                'bg-gray-200 text-gray-600'
                                            }`}>
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="p-4 font-mono font-bold text-gray-700">{inv.invoiceNumber}</td>
                                        <td className="p-4 text-gray-500">{new Date(inv.dateIssued).toLocaleDateString()}</td>
                                        <td className="p-4 font-bold text-gray-800">{inv.clientName}</td>
                                        <td className="p-4 text-right font-black text-gray-800">{formatMoney(inv.total)}</td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => handleEdit(inv)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                                                    <Edit size={16}/>
                                                </button>
                                                <button onClick={() => handleDelete(inv.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                                                    <Trash2 size={16}/>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {invoices.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="p-12 text-center text-gray-400">No invoices found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </Card>
                )}

                {/* VIEW: FORM */}
                {view === 'form' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* LEFT: FORM INPUTS */}
                        <div className="lg:col-span-2 space-y-6">
                            <Card className="p-8 border-t-4 border-orange-500 shadow-xl">
                                {/* Header */}
                                <div className="flex justify-between items-start mb-8">
                                    <div>
                                        <h2 className="text-3xl font-black text-gray-800 uppercase">Invoice</h2>
                                        <div className="mt-2 text-xs text-gray-500 font-bold uppercase tracking-widest">
                                            Karnot Energy Solutions Inc.
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <label className="block text-[10px] font-black uppercase text-gray-400">Invoice Number</label>
                                        <input 
                                            type="text" 
                                            value={formData.invoiceNumber}
                                            onChange={e => setFormData({...formData, invoiceNumber: e.target.value})}
                                            className="text-right font-mono font-bold text-xl border-none bg-transparent focus:ring-0 p-0 w-full"
                                        />
                                    </div>
                                </div>

                                {/* Details Grid */}
                                <div className="grid grid-cols-2 gap-8 mb-8">
                                    <div className="space-y-4">
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                            <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">Bill To</label>
                                            <select 
                                                className="w-full p-2 mb-2 text-sm border rounded bg-white"
                                                value={formData.clientId}
                                                onChange={handleClientSelect}
                                            >
                                                <option value="">-- Select Client --</option>
                                                {companies.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                                            </select>
                                            <Input 
                                                value={formData.clientName} 
                                                onChange={e => setFormData({...formData, clientName: e.target.value})} 
                                                placeholder="Client Name" 
                                                className="mb-2 bg-white"
                                            />
                                            <Textarea 
                                                value={formData.clientAddress} 
                                                onChange={e => setFormData({...formData, clientAddress: e.target.value})} 
                                                placeholder="Address" 
                                                rows={3} 
                                                className="bg-white text-xs"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <Input 
                                                type="date" 
                                                label="Date Issued" 
                                                value={formData.dateIssued} 
                                                onChange={e => setFormData({...formData, dateIssued: e.target.value})} 
                                            />
                                            <Input 
                                                type="date" 
                                                label="Due Date" 
                                                value={formData.dateDue} 
                                                onChange={e => setFormData({...formData, dateDue: e.target.value})} 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Status</label>
                                            <select 
                                                value={formData.status}
                                                onChange={e => setFormData({...formData, status: e.target.value})}
                                                className="w-full p-2 border rounded text-sm font-bold bg-gray-50"
                                            >
                                                <option value="DRAFT">Draft</option>
                                                <option value="SENT">Sent</option>
                                                <option value="PAID">Paid</option>
                                                <option value="OVERDUE">Overdue</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Line Items */}
                                <div className="mb-8">
                                    <table className="w-full text-sm mb-4">
                                        <thead className="border-b border-gray-200 text-left text-xs font-black text-gray-400 uppercase">
                                            <tr>
                                                <th className="py-2">Description</th>
                                                <th className="py-2 w-20 text-center">Qty</th>
                                                <th className="py-2 w-32 text-right">Rate</th>
                                                <th className="py-2 w-32 text-right">Amount</th>
                                                <th className="py-2 w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {formData.items.map((item, index) => (
                                                <tr key={item.id}>
                                                    <td className="py-2">
                                                        <input 
                                                            className="w-full p-2 border border-gray-200 rounded"
                                                            value={item.description}
                                                            onChange={e => handleItemChange(item.id, 'description', e.target.value)}
                                                            placeholder="Item description"
                                                        />
                                                    </td>
                                                    <td className="py-2">
                                                        <input 
                                                            type="number"
                                                            className="w-full p-2 border border-gray-200 rounded text-center"
                                                            value={item.quantity}
                                                            onChange={e => handleItemChange(item.id, 'quantity', e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="py-2">
                                                        <input 
                                                            type="number"
                                                            className="w-full p-2 border border-gray-200 rounded text-right"
                                                            value={item.rate}
                                                            onChange={e => handleItemChange(item.id, 'rate', e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="py-2 text-right font-bold text-gray-700">
                                                        {formatMoney(item.quantity * item.rate)}
                                                    </td>
                                                    <td className="py-2 text-center">
                                                        <button onClick={() => handleRemoveItem(item.id)} className="text-gray-300 hover:text-red-500">
                                                            <Trash2 size={14}/>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <Button onClick={handleAddItem} variant="secondary" size="sm" className="w-full border-dashed border-gray-300">
                                        <Plus size={14} className="mr-2"/> Add Line Item
                                    </Button>
                                </div>

                                {/* Totals & Notes */}
                                <div className="grid grid-cols-2 gap-8 border-t border-gray-200 pt-6">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">Notes / Terms</label>
                                        <textarea 
                                            className="w-full p-3 bg-yellow-50 border border-yellow-100 rounded-lg text-xs text-yellow-800"
                                            rows={4}
                                            value={formData.notes}
                                            onChange={e => setFormData({...formData, notes: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-2 text-right">
                                        <div className="flex justify-between text-gray-500 text-sm">
                                            <span>Subtotal</span>
                                            <span>{formatMoney(formData.subtotal)}</span>
                                        </div>
                                        <div className="flex justify-between text-gray-500 text-sm">
                                            <span>VAT (12%)</span>
                                            <span>{formatMoney(formData.tax)}</span>
                                        </div>
                                        <div className="flex justify-between text-2xl font-black text-gray-800 border-t border-gray-200 pt-2 mt-2">
                                            <span>Total</span>
                                            <span>{formatMoney(formData.total)}</span>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* RIGHT: ACTIONS */}
                        <div className="space-y-4">
                            <Card className="p-6 bg-slate-900 text-white border-0">
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Actions</h3>
                                <Button onClick={handleSave} className="w-full mb-3 bg-orange-600 hover:bg-orange-700 text-white border-0 py-3 font-bold">
                                    <Save size={16} className="mr-2"/> {loading ? 'Saving...' : 'Save Invoice'}
                                </Button>
                                <Button onClick={() => window.print()} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700">
                                    <Printer size={16} className="mr-2"/> Print / PDF
                                </Button>
                            </Card>
                            
                            {formData.id && (
                                <Button onClick={() => handleDelete(formData.id)} className="w-full border-red-200 text-red-600 hover:bg-red-50">
                                    <Trash2 size={16} className="mr-2"/> Delete Invoice
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ServiceInvoice;
