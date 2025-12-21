import React, { useState, useMemo, useEffect } from 'react'; 
import { db } from '../firebase'; 
import { collection, addDoc, serverTimestamp, doc, updateDoc, writeBatch, query, orderBy, onSnapshot } from "firebase/firestore";
import Papa from 'papaparse'; 
import { 
    Plus, X, Edit, Trash2, Truck, Globe, Upload, Search, 
    MapPin, UserCheck, PlusCircle, Download, ShieldCheck, AlertTriangle, 
    ShoppingCart, Package, CheckCircle
} from 'lucide-react';
import { Card, Button, Input, Textarea, Checkbox } from '../data/constants.jsx';

// --- 1. StatBadge Component ---
const StatBadge = ({ icon: Icon, label, count, total, color, active, onClick }) => {
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
        <div onClick={onClick} className={`cursor-pointer flex-1 min-w-[200px] p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-4 ${active ? `bg-${color}-100 border-${color}-500 ring-2 ring-${color}-400` : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md'}`}>
            <div className={`p-3 rounded-full bg-${color}-100 text-${color}-600`}><Icon size={24} /></div>
            <div className="text-right">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{label}</p>
                <p className="text-2xl font-black text-gray-800">{count} <span className="text-xs text-gray-400 font-normal">({percentage}%)</span></p>
            </div>
        </div>
    );
};

// --- 2. Supplier Modal Component ---
const SupplierModal = ({ onClose, onSave, supplierToEdit, productCatalog = [] }) => {
    const [activeTab, setActiveTab] = useState('PO_MANAGER'); 
    
    // Core Supplier Details
    const [name, setName] = useState(supplierToEdit?.name || '');
    const [contactPerson, setContactPerson] = useState(supplierToEdit?.contactPerson || '');
    const [email, setEmail] = useState(supplierToEdit?.email || '');
    const [phone, setPhone] = useState(supplierToEdit?.phone || '');
    const [tin, setTin] = useState(supplierToEdit?.tin || '');
    const [address, setAddress] = useState(supplierToEdit?.address || '');
    const [isInternational, setIsInternational] = useState(supplierToEdit?.isInternational ?? true);
    const [isApproved, setIsApproved] = useState(supplierToEdit?.isApproved || false);
    const [isCritical, setIsCritical] = useState(supplierToEdit?.isCritical || false);
    const [isOnboarded, setIsOnboarded] = useState(supplierToEdit?.isOnboarded || false);
    const [notes, setNotes] = useState(supplierToEdit?.notes || '');
    
    // Interactions (Logs)
    const [interactions, setInteractions] = useState(supplierToEdit?.interactions || []);
    const [newLogType, setNewLogType] = useState('Order');
    const [newLogOutcome, setNewLogOutcome] = useState('');
    const [newLogDate, setNewLogDate] = useState(new Date().toISOString().split('T')[0]);

    // Purchase Order State
    const [purchaseOrders, setPurchaseOrders] = useState(supplierToEdit?.purchaseOrders || []);
    const [poReference, setPoReference] = useState(`PO-${Math.floor(1000 + Math.random() * 9000)}`);
    const [poItems, setPoItems] = useState([]);
    
    // PO Item Entry State
    const [selectedProductId, setSelectedProductId] = useState('');
    const [newItem, setNewItem] = useState({ name: '', qty: 1, cost: 0, sku: '' });

    // --- LOG HANDLERS ---
    const handleAddInteraction = () => {
        if (!newLogOutcome) return;
        const newInteraction = { id: Date.now(), date: newLogDate, type: newLogType, outcome: newLogOutcome };
        setInteractions([newInteraction, ...interactions].sort((a, b) => new Date(b.date) - new Date(a.date)));
        setNewLogOutcome('');
    };

    // --- PO HANDLERS (With Product Master Integration) ---
    const handleProductSelect = (e) => {
        const prodId = e.target.value;
        setSelectedProductId(prodId);
        
        if (prodId) {
            const product = productCatalog.find(p => p.id === prodId);
            if (product) {
                setNewItem({
                    name: product.name,
                    qty: 1,
                    cost: product.costPriceUSD || 0, // Auto-fill Cost Price from Master
                    sku: product.Order_Reference || ''
                });
            }
        } else {
            setNewItem({ name: '', qty: 1, cost: 0, sku: '' });
        }
    };

    const addItemToPO = () => {
        if (!newItem.name || newItem.cost <= 0) return alert("Enter Item Name and Cost Price");
        const lineTotal = parseFloat(newItem.qty) * parseFloat(newItem.cost);
        setPoItems([...poItems, { ...newItem, total: lineTotal, id: Date.now() }]);
        
        // Reset Item Form
        setNewItem({ name: '', qty: 1, cost: 0, sku: '' });
        setSelectedProductId('');
    };

    const removePoItem = (id) => {
        setPoItems(poItems.filter(i => i.id !== id));
    };

    const savePurchaseOrder = () => {
        if (poItems.length === 0) return alert("Add items to the PO first.");
        
        const grandTotal = poItems.reduce((sum, item) => sum + item.total, 0);
        const newPO = {
            id: `PO_${Date.now()}`,
            reference: poReference,
            date: new Date().toISOString(),
            items: poItems,
            totalAmount: grandTotal,
            status: 'Draft'
        };

        setPurchaseOrders([newPO, ...purchaseOrders]);
        
        // Auto-add log entry
        const logEntry = { 
            id: Date.now(), 
            date: new Date().toISOString().split('T')[0], 
            type: 'Order', 
            outcome: `Created PO ${poReference} ($${grandTotal.toLocaleString()})` 
        };
        setInteractions([logEntry, ...interactions]);

        setPoItems([]);
        setPoReference(`PO-${Math.floor(1000 + Math.random() * 9000)}`);
        alert("Purchase Order Created!");
    };

    const formatMoney = (val) => `$${Number(val).toLocaleString(undefined, {minimumFractionDigits: 2})}`;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <Card className="w-full max-w-7xl h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl bg-white rounded-2xl p-0 border-t-8 border-blue-600">
                
                {/* LEFT PANEL: SUPPLIER DETAILS */}
                <div className="w-full md:w-1/3 p-6 overflow-y-auto border-r border-gray-100 bg-white space-y-5">
                    <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter flex items-center gap-2">
                        <Truck className="text-blue-600"/> {supplierToEdit ? 'Edit Vendor' : 'New Vendor'}
                    </h2>
                    
                    <Input label="Supplier / Factory Name" value={name} onChange={e => setName(e.target.value)} />
                    <Input label="TIN (Tax ID)" value={tin} onChange={e => setTin(e.target.value)} placeholder="000-000-000-000" />
                    
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                        <h4 className="text-[10px] font-black uppercase text-gray-400">Contact Info</h4>
                        <Input label="Contact Person" value={contactPerson} onChange={e => setContactPerson(e.target.value)} className="bg-white" />
                        <Input label="Email" value={email} onChange={e => setEmail(e.target.value)} className="bg-white" />
                        <Input label="Phone" value={phone} onChange={e => setPhone(e.target.value)} className="bg-white" />
                    </div>

                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button onClick={() => setIsInternational(false)} className={`flex-1 py-2 text-[10px] font-black rounded uppercase ${!isInternational ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>Local Supplier</button>
                        <button onClick={() => setIsInternational(true)} className={`flex-1 py-2 text-[10px] font-black rounded uppercase ${isInternational ? 'bg-white shadow text-indigo-600' : 'text-gray-400'}`}>Overseas / Import</button>
                    </div>

                    <Textarea label="Billing Address" value={address} onChange={e => setAddress(e.target.value)} rows="2" />
                    
                    <div className="space-y-2">
                        <Checkbox label="Onboarded & Verified" checked={isOnboarded} onChange={e => setIsOnboarded(e.target.checked)} />
                        <Checkbox label="Approved Vendor List" checked={isApproved} onChange={e => setIsApproved(e.target.checked)} />
                        <Checkbox label={<span className="text-red-600 font-bold">Critical Path Component</span>} checked={isCritical} onChange={e => setIsCritical(e.target.checked)} />
                    </div>

                    <Textarea label="Bank / Payment Notes" value={notes} onChange={e => setNotes(e.target.value)} rows="3" placeholder="Account Number, Swift Code..." />
                </div>

                {/* RIGHT PANEL: PO MANAGER & LOGS */}
                <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden">
                    
                    {/* TABS */}
                    <div className="flex border-b border-gray-200 bg-white">
                        <button onClick={() => setActiveTab('PO_MANAGER')} className={`flex-1 py-4 text-[11px] font-black uppercase tracking-widest transition-colors ${activeTab === 'PO_MANAGER' ? 'text-indigo-600 border-b-4 border-indigo-600 bg-indigo-50/50' : 'text-gray-400 hover:bg-gray-50'}`}>
                            Purchase Orders
                        </button>
                        <button onClick={() => setActiveTab('ACTIVITY')} className={`flex-1 py-4 text-[11px] font-black uppercase tracking-widest transition-colors ${activeTab === 'ACTIVITY' ? 'text-blue-600 border-b-4 border-blue-600 bg-blue-50/50' : 'text-gray-400 hover:bg-gray-50'}`}>
                            Interaction Log
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        
                        {/* --- TAB: PURCHASE ORDERS --- */}
                        {activeTab === 'PO_MANAGER' && (
                            <div className="space-y-6">
                                {/* PO CREATOR */}
                                <div className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-black text-indigo-900 text-sm uppercase tracking-widest flex items-center gap-2">
                                            <ShoppingCart size={16}/> Create New PO
                                        </h3>
                                        <input 
                                            value={poReference} 
                                            onChange={e => setPoReference(e.target.value)} 
                                            className="text-right font-mono font-bold text-sm border-b border-indigo-200 focus:outline-none text-indigo-600 w-32" 
                                        />
                                    </div>

                                    {/* Item Entry Row */}
                                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-3">
                                        {/* Product Selector */}
                                        <div>
                                            <label className="text-[9px] font-bold text-gray-400 uppercase mb-1 block">Select From Product Master</label>
                                            <select 
                                                value={selectedProductId} 
                                                onChange={handleProductSelect}
                                                className="w-full p-2 text-xs font-bold border rounded outline-none bg-white"
                                            >
                                                <option value="">-- Manual Entry / Select Product --</option>
                                                {productCatalog.map(p => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.name} (SKU: {p.Order_Reference || 'N/A'})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-12 gap-2 items-end">
                                            <div className="col-span-5">
                                                <label className="text-[9px] font-bold text-gray-400 uppercase">Item Name</label>
                                                <input className="w-full p-2 text-xs font-bold border rounded outline-none" placeholder="Product..." value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-[9px] font-bold text-gray-400 uppercase">Qty</label>
                                                <input type="number" className="w-full p-2 text-xs font-bold border rounded outline-none" value={newItem.qty} onChange={e => setNewItem({...newItem, qty: e.target.value})} />
                                            </div>
                                            <div className="col-span-3">
                                                <label className="text-[9px] font-bold text-gray-400 uppercase">Cost (USD)</label>
                                                <input type="number" className="w-full p-2 text-xs font-bold border rounded outline-none" placeholder="0.00" value={newItem.cost} onChange={e => setNewItem({...newItem, cost: e.target.value})} />
                                            </div>
                                            <div className="col-span-2">
                                                <Button onClick={addItemToPO} variant="primary" className="w-full h-[34px] bg-indigo-600 hover:bg-indigo-700 text-xs"><Plus size={16}/></Button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Items List */}
                                    {poItems.length > 0 ? (
                                        <div className="border rounded-xl overflow-hidden mb-4 mt-4">
                                            <table className="w-full text-xs text-left">
                                                <thead className="bg-indigo-50 font-bold text-indigo-800 uppercase">
                                                    <tr>
                                                        <th className="p-3">Item / SKU</th>
                                                        <th className="p-3 text-center">Qty</th>
                                                        <th className="p-3 text-right">Cost</th>
                                                        <th className="p-3 text-right">Total</th>
                                                        <th className="p-3 w-8"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {poItems.map(item => (
                                                        <tr key={item.id} className="bg-white">
                                                            <td className="p-3 font-medium">
                                                                {item.name}
                                                                {item.sku && <span className="block text-[9px] text-gray-400">{item.sku}</span>}
                                                            </td>
                                                            <td className="p-3 text-center">{item.qty}</td>
                                                            <td className="p-3 text-right">{formatMoney(item.cost)}</td>
                                                            <td className="p-3 text-right font-bold">{formatMoney(item.total)}</td>
                                                            <td className="p-3 text-center">
                                                                <button onClick={() => removePoItem(item.id)} className="text-red-300 hover:text-red-500"><X size={14}/></button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot className="bg-gray-50 font-black text-gray-800">
                                                    <tr>
                                                        <td colSpan="3" className="p-3 text-right uppercase text-[10px] tracking-widest text-gray-500">PO Total</td>
                                                        <td className="p-3 text-right text-indigo-700 text-sm">
                                                            {formatMoney(poItems.reduce((sum, i) => sum + i.total, 0))}
                                                        </td>
                                                        <td></td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="text-center py-6 text-gray-400 text-xs italic border-2 border-dashed border-gray-100 rounded-xl mt-4 mb-4">
                                            Add items from Master to generate a PO
                                        </div>
                                    )}

                                    <Button onClick={savePurchaseOrder} variant="secondary" className="w-full py-3 font-bold uppercase text-xs tracking-widest border-indigo-200 text-indigo-600 hover:bg-indigo-50" disabled={poItems.length === 0}>
                                        <Package className="mr-2" size={16}/> Save Purchase Order
                                    </Button>
                                </div>

                                {/* PO HISTORY */}
                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">PO History</h4>
                                    {purchaseOrders.length === 0 && <p className="text-xs text-gray-400 italic ml-1">No past orders.</p>}
                                    {purchaseOrders.map(po => (
                                        <div key={po.id} className="bg-white p-4 rounded-xl border border-gray-200 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                                            <div>
                                                <p className="font-black text-gray-800 text-xs">{po.reference}</p>
                                                <p className="text-[10px] text-gray-400">{new Date(po.date).toLocaleDateString()} • {po.items.length} Items</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black text-indigo-600">{formatMoney(po.totalAmount)}</p>
                                                <span className="text-[9px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-bold uppercase">{po.status}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* --- TAB: INTERACTION LOG --- */}
                        {activeTab === 'ACTIVITY' && (
                            <div className="space-y-4">
                                <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3 shadow-sm">
                                    <h4 className="text-[10px] font-black uppercase text-gray-400">Add Log Entry</h4>
                                    <div className="flex gap-2">
                                        <Input type="date" value={newLogDate} onChange={e => setNewLogDate(e.target.value)} className="text-xs w-1/3" />
                                        <select value={newLogType} onChange={e => setNewLogType(e.target.value)} className="text-xs border rounded p-2 flex-1 font-bold uppercase bg-gray-50 outline-none">
                                            <option value="Order">Order Sent</option>
                                            <option value="Payment">Wire Transfer</option>
                                            <option value="QC">Quality Check</option>
                                            <option value="Logistics">Shipping Update</option>
                                            <option value="Issue">Issue / Delay</option>
                                        </select>
                                    </div>
                                    <div className="flex gap-2">
                                        <input type="text" value={newLogOutcome} onChange={e => setNewLogOutcome(e.target.value)} placeholder="Describe interaction..." className="flex-1 text-sm p-3 border rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100" />
                                        <Button onClick={handleAddInteraction} variant="primary" className="bg-blue-600"><PlusCircle size={20}/></Button>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {interactions.map(log => (
                                        <div key={log.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm relative pl-4 border-l-4 border-l-blue-400">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[9px] font-black px-2 py-0.5 rounded bg-gray-100 text-gray-600 uppercase">{log.type}</span>
                                                <span className="text-[10px] text-gray-400 font-bold">{log.date}</span>
                                            </div>
                                            <p className="text-sm text-gray-800 font-medium">{log.outcome}</p>
                                            <button onClick={() => setInteractions(interactions.filter(i => i.id !== log.id))} className="absolute top-2 right-2 text-gray-200 hover:text-red-400 transition-colors"><Trash2 size={12}/></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-5 bg-white border-t flex justify-end gap-3">
                        <Button onClick={onClose} variant="secondary" className="px-6 py-3 text-xs uppercase font-bold tracking-widest">Discard</Button>
                        <Button onClick={() => onSave({ name, contactPerson, email, phone, tin, address, isInternational, isApproved, isCritical, isOnboarded, notes, interactions, purchaseOrders })} variant="primary" className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white shadow-lg text-xs uppercase font-bold tracking-widest">
                            Save Supplier
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

// --- 3. Main Page Component ---
const SupplierManager = ({ user }) => {
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]); // PRODUCT MASTER DATA
    const [showModal, setShowModal] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('ALL');
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef(null);

    // Fetch Suppliers & Products
    useEffect(() => {
        if (!user) return;
        
        const qSuppliers = query(collection(db, "users", user.uid, "suppliers"), orderBy("name", "asc"));
        const unsubSuppliers = onSnapshot(qSuppliers, (snap) => setSuppliers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

        const qProducts = query(collection(db, "users", user.uid, "products"), orderBy("name", "asc"));
        const unsubProducts = onSnapshot(qProducts, (snap) => setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

        return () => { unsubSuppliers(); unsubProducts(); };
    }, [user]);

    const stats = useMemo(() => ({
        total: suppliers.length,
        critical: suppliers.filter(s => s.isCritical).length,
        overseas: suppliers.filter(s => s.isInternational).length,
    }), [suppliers]);

    const filtered = useMemo(() => {
        const term = searchTerm.toLowerCase();
        let list = suppliers.filter(s => s.name.toLowerCase().includes(term) || (s.notes || '').toLowerCase().includes(term));
        if (activeFilter === 'CRITICAL') list = list.filter(s => s.isCritical);
        if (activeFilter === 'OVERSEAS') list = list.filter(s => s.isInternational);
        return list;
    }, [suppliers, searchTerm, activeFilter]);

    const handleBulkExport = () => {
        const selected = suppliers.filter(s => selectedIds.has(s.id));
        const csv = Papa.unparse(selected.map(s => ({ "Supplier": s.name, "Contact": s.contactPerson, "Email": s.email, "TIN": s.tin })));
        const link = document.createElement("a");
        link.setAttribute("href", URL.createObjectURL(new Blob([csv], { type: 'text/csv' })));
        link.setAttribute("download", `supplier_export.csv`);
        link.click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsImporting(true);
        Papa.parse(file, {
            header: true, skipEmptyLines: true,
            complete: async (results) => {
                const batch = writeBatch(db);
                results.data.forEach(row => {
                    const ref = doc(collection(db, "users", user.uid, "suppliers"));
                    batch.set(ref, { 
                        name: row.Supplier || row.Name || 'New Supplier', 
                        tin: row.TIN || '', 
                        email: row.Email || '', 
                        isInternational: true,
                        interactions: [], 
                        createdAt: serverTimestamp() 
                    });
                });
                await batch.commit();
                setIsImporting(false);
                alert("Import Complete!");
            }
        });
    };

    const handleSave = async (data) => {
        if (editingSupplier) {
            await updateDoc(doc(db, "users", user.uid, "suppliers", editingSupplier.id), { ...data, lastModified: serverTimestamp() });
        } else {
            await addDoc(collection(db, "users", user.uid, "suppliers"), { ...data, createdAt: serverTimestamp() });
        }
        setShowModal(false); setEditingSupplier(null);
    };

    return (
        <div className="w-full space-y-8">
            {showModal && (
                <SupplierModal 
                    onClose={() => setShowModal(false)} 
                    onSave={handleSave} 
                    supplierToEdit={editingSupplier} 
                    productCatalog={products} // PASS PRODUCT CATALOG TO MODAL
                />
            )}
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <StatBadge icon={Truck} label="Vendor List" count={stats.total} total={stats.total} color="blue" active={activeFilter === 'ALL'} onClick={() => setActiveFilter('ALL')} />
                <StatBadge icon={Globe} label="Overseas/China" count={stats.overseas} total={stats.total} color="indigo" active={activeFilter === 'OVERSEAS'} onClick={() => setActiveFilter('OVERSEAS')} />
                <StatBadge icon={AlertTriangle} label="Critical Path" count={stats.critical} total={stats.total} color="red" active={activeFilter === 'CRITICAL'} onClick={() => setActiveFilter('CRITICAL')} />
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tighter leading-none">Suppliers ({filtered.length})</h2>
                <div className="flex gap-2">
                    <Button onClick={() => fileInputRef.current.click()} variant="secondary" disabled={isImporting}><Upload size={16} className="mr-1"/> Import CSV</Button>
                    <Button onClick={() => { setEditingSupplier(null); setShowModal(true); }} variant="primary" className="bg-blue-600 shadow-lg shadow-blue-200 border-none px-6"><Plus size={16} className="mr-1"/> Add Supplier</Button>
                </div>
            </div>

            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />

            <div className="relative">
                <Input placeholder="Search factory name, TIN, or notes..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-12 py-4 rounded-xl shadow-sm border-gray-200" />
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map(s => (
                    <Card key={s.id} className={`p-6 rounded-[20px] hover:border-blue-400 transition-all bg-white relative flex flex-col justify-between min-h-[320px] shadow-sm hover:shadow-lg ${selectedIds.has(s.id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
                        <div className="absolute top-5 left-5 z-10">
                            <input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => {
                                const next = new Set(selectedIds);
                                next.has(s.id) ? next.delete(s.id) : next.add(s.id);
                                setSelectedIds(next);
                            }} className="w-5 h-5 accent-blue-600 cursor-pointer" />
                        </div>
                        
                        <div className="pl-10 mb-4">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex-1 pr-2">
                                    <h4 className="font-black text-xl text-gray-800 uppercase tracking-tight leading-tight line-clamp-2" title={s.name}>{s.name}</h4>
                                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1.5 flex items-center gap-1">
                                        {s.isInternational ? <Globe size={12}/> : <MapPin size={12}/>}
                                        {s.isInternational ? 'International Factory' : 'Local Supplier'}
                                    </p>
                                </div>
                                <button onClick={() => { setEditingSupplier(s); setShowModal(true); }} className="p-2 bg-gray-50 hover:bg-blue-100 text-gray-400 hover:text-blue-600 rounded-lg transition-colors"><Edit size={16}/></button>
                            </div>
                            
                            <div className="space-y-1">
                                {s.contactPerson && (
                                    <p className="text-xs text-gray-600 font-bold"><span className="text-gray-400 font-normal uppercase text-[10px] tracking-wide w-12 inline-block">Contact:</span> {s.contactPerson}</p>
                                )}
                                {s.email && (
                                    <p className="text-xs text-gray-600 font-bold truncate"><span className="text-gray-400 font-normal uppercase text-[10px] tracking-wide w-12 inline-block">Email:</span> {s.email}</p>
                                )}
                                {s.tin && (
                                    <p className="text-xs text-gray-600 font-bold"><span className="text-gray-400 font-normal uppercase text-[10px] tracking-wide w-12 inline-block">TIN:</span> {s.tin}</p>
                                )}
                            </div>
                        </div>

                        <div className="mt-auto">
                            <Button onClick={() => { setEditingSupplier(s); setShowModal(true); }} variant="secondary" className="w-full !py-3 text-[10px] font-black uppercase mb-5 tracking-widest border-gray-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200">
                                View History & Orders
                            </Button>
                            
                            <div className="pt-4 border-t border-gray-100 grid grid-cols-3 gap-1 text-[8px] text-gray-400 text-center font-black">
                                <div className={`p-1 rounded uppercase flex flex-col items-center ${s.isCritical ? 'bg-red-50 text-red-700' : ''}`}>
                                    <AlertTriangle size={14} className={`mb-1 ${s.isCritical ? 'text-red-600' : 'text-gray-300'}`}/> Critical
                                </div>
                                <div className={`p-1 rounded uppercase flex flex-col items-center ${s.isApproved ? 'bg-green-50 text-green-700' : ''}`}>
                                    <ShieldCheck size={14} className={`mb-1 ${s.isApproved ? 'text-green-600' : 'text-gray-300'}`}/> Approved
                                </div>
                                <div className={`p-1 rounded uppercase flex flex-col items-center ${s.isOnboarded ? 'bg-blue-50 text-blue-700' : ''}`}>
                                    <UserCheck size={14} className={`mb-1 ${s.isOnboarded ? 'text-blue-600' : 'text-gray-300'}`}/> Onboarded
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 z-50 animate-in fade-in slide-in-from-bottom-4">
                    <span className="font-bold text-sm">{selectedIds.size} Suppliers Selected</span>
                    <button onClick={handleBulkExport} className="flex items-center gap-2 hover:text-green-400 transition-colors"><Download size={18} /><span className="text-sm font-bold">Export CSV</span></button>
                    <button onClick={async () => {
                        if(confirm("Move to trash?")) {
                            const b = writeBatch(db);
                            selectedIds.forEach(id => b.delete(doc(db, "users", user.uid, "suppliers", id)));
                            await b.commit();
                            setSelectedIds(new Set());
                        }
                    }} className="flex items-center gap-2 hover:text-red-400 transition-colors"><Trash2 size={18} /><span className="text-sm font-bold">Delete</span></button>
                    <button onClick={() => setSelectedIds(new Set())} className="ml-2 text-gray-400 hover:text-white"><X size={18}/></button>
                </div>
            )}
        </div>
    );
};

export default SupplierManager;
