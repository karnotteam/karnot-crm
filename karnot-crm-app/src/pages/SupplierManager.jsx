import React, { useState, useRef, useMemo, useEffect } from 'react'; 
import { db } from '../firebase'; 
import { collection, addDoc, serverTimestamp, doc, setDoc, deleteDoc, writeBatch, updateDoc, query, orderBy, onSnapshot } from "firebase/firestore";
import Papa from 'papaparse'; 
import { 
    Plus, X, Edit, Trash2, Truck, Globe, Upload, Search, 
    MapPin, CheckSquare, Clock, FileText, 
    Link as LinkIcon, UserCheck, Mail, PlusCircle, ExternalLink, Download, Send, RotateCcw, Landmark, ShieldCheck, AlertTriangle
} from 'lucide-react';
import { Card, Button, Input, Textarea, Checkbox } from '../data/constants.jsx';

// --- 1. StatBadge Component (Supplier Focused) ---
const StatBadge = ({ icon: Icon, label, count, total, color, active, onClick }) => {
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
        <div onClick={onClick} className={`cursor-pointer flex-1 min-w-[200px] p-3 rounded-xl border transition-all duration-200 flex items-center justify-between gap-3 ${active ? `bg-${color}-100 border-${color}-500 ring-2 ring-${color}-400` : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md'}`}>
            <div className={`p-2 rounded-full bg-${color}-100 text-${color}-600`}><Icon size={20} /></div>
            <div className="text-right">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{label}</p>
                <p className="text-xl font-bold text-gray-800">{count} <span className="text-xs text-gray-400 font-normal">({percentage}%)</span></p>
            </div>
        </div>
    );
};

// --- 2. Supplier Modal Component ---
const SupplierModal = ({ onClose, onSave, supplierToEdit }) => {
    const [activeTab, setActiveTab] = useState('ACTIVITY');
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
    const [interactions, setInteractions] = useState(supplierToEdit?.interactions || []);
    
    const [newLogType, setNewLogType] = useState('Order');
    const [newLogOutcome, setNewLogOutcome] = useState('');
    const [newLogDate, setNewLogDate] = useState(new Date().toISOString().split('T')[0]);

    const handleAddInteraction = () => {
        if (!newLogOutcome) return;
        const newInteraction = { id: Date.now(), date: newLogDate, type: newLogType, outcome: newLogOutcome };
        setInteractions([newInteraction, ...interactions].sort((a, b) => new Date(b.date) - new Date(a.date)));
        setNewLogOutcome('');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <Card className="w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl bg-white rounded-xl p-0 border-t-4 border-blue-600">
                <div className="flex-1 p-6 overflow-y-auto border-r border-gray-100 space-y-4">
                    <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">{supplierToEdit ? 'Edit Supplier' : 'New Supplier'}</h2>
                    <Input label="Supplier/Factory Name" value={name} onChange={e => setName(e.target.value)} />
                    <Input label="Supplier TIN (BIR Requirement)" value={tin} onChange={e => setTin(e.target.value)} placeholder="000-000-000-000" />
                    
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Contact Person" value={contactPerson} onChange={e => setContactPerson(e.target.value)} />
                        <div>
                            <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Region</label>
                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                <button onClick={() => setIsInternational(false)} className={`flex-1 py-1 text-[9px] font-black rounded ${!isInternational ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>LOCAL</button>
                                <button onClick={() => setIsInternational(true)} className={`flex-1 py-1 text-[9px] font-black rounded ${isInternational ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>OVERSEAS</button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Email" value={email} onChange={e => setEmail(e.target.value)} />
                        <Input label="Phone" value={phone} onChange={e => setPhone(e.target.value)} />
                    </div>

                    <Textarea label="Address" value={address} onChange={e => setAddress(e.target.value)} rows="2" />
                    
                    <div className="grid grid-cols-2 gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <Checkbox label="Onboarded" checked={isOnboarded} onChange={e => setIsOnboarded(e.target.checked)} />
                        <Checkbox label="Approved Vendor" checked={isApproved} onChange={e => setIsApproved(e.target.checked)} />
                        <Checkbox label={<span className="text-red-700 font-bold">Critical Path Supplier</span>} checked={isCritical} onChange={e => setIsCritical(e.target.checked)} />
                    </div>

                    <Textarea label="Supply Chain Notes" value={notes} onChange={e => setNotes(e.target.value)} rows="3" />
                </div>

                <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden">
                    <div className="flex border-b bg-white">
                        <button onClick={() => setActiveTab('ACTIVITY')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest ${activeTab === 'ACTIVITY' ? 'text-blue-600 border-b-4 border-blue-600' : 'text-gray-400'}`}>Procurement Log</button>
                        <button onClick={() => setActiveTab('DATA')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest ${activeTab === 'DATA' ? 'text-indigo-600 border-b-4 border-indigo-600' : 'text-gray-400'}`}>Purchase Orders</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                        {activeTab === 'ACTIVITY' ? (
                            <div className="space-y-4">
                                <div className="bg-white p-3 rounded border space-y-2 shadow-sm">
                                    <div className="flex gap-2">
                                        <Input type="date" value={newLogDate} onChange={e => setNewLogDate(e.target.value)} className="text-xs" />
                                        <select value={newLogType} onChange={e => setNewLogType(e.target.value)} className="text-xs border rounded p-1 flex-1 font-black uppercase bg-gray-50">
                                            <option value="Order">Order Sent</option>
                                            <option value="Payment">Wire Transfer</option>
                                            <option value="QC">Quality Check</option>
                                            <option value="Logistics">Shipping Update</option>
                                        </select>
                                    </div>
                                    <div className="flex gap-2">
                                        <input type="text" value={newLogOutcome} onChange={e => setNewLogOutcome(e.target.value)} placeholder="Log detail..." className="flex-1 text-sm p-2 border rounded" />
                                        <Button onClick={handleAddInteraction} variant="primary"><PlusCircle size={20}/></Button>
                                    </div>
                                </div>
                                {interactions.map(log => (
                                    <div key={log.id} className="bg-white p-4 rounded-xl border shadow-sm group relative">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 uppercase">{log.type}</span>
                                            <span className="text-[10px] text-gray-400 font-bold">{log.date}</span>
                                        </div>
                                        <p className="text-sm text-gray-700 font-bold">{log.outcome}</p>
                                        <button onClick={() => setInteractions(interactions.filter(i => i.id !== log.id))} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12}/></button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 opacity-20"><Truck size={48} className="mx-auto" /><p className="font-black text-[10px] mt-2 uppercase">PO Integration Coming Soon</p></div>
                        )}
                    </div>
                    <div className="p-4 bg-white border-t flex justify-end gap-2">
                        <Button onClick={onClose} variant="secondary">Cancel</Button>
                        <Button onClick={() => onSave({ name, contactPerson, email, phone, tin, address, isInternational, isApproved, isCritical, isOnboarded, notes, interactions })} variant="primary">Save Supplier</Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

// --- 3. Main Page Component ---
const SupplierManager = ({ user }) => {
    const [suppliers, setSuppliers] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('ALL');
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, "users", user.uid, "suppliers"), orderBy("name", "asc"));
        const unsub = onSnapshot(q, (snap) => setSuppliers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        return () => unsub();
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
        <div className="w-full space-y-6">
            {showModal && <SupplierModal onClose={() => setShowModal(false)} onSave={handleSave} supplierToEdit={editingSupplier} />}
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatBadge icon={Truck} label="Vendor List" count={stats.total} total={stats.total} color="blue" active={activeFilter === 'ALL'} onClick={() => setActiveFilter('ALL')} />
                <StatBadge icon={Globe} label="Overseas/China" count={stats.overseas} total={stats.total} color="indigo" active={activeFilter === 'OVERSEAS'} onClick={() => setActiveFilter('OVERSEAS')} />
                <StatBadge icon={AlertTriangle} label="Critical Path" count={stats.critical} total={stats.total} color="red" active={activeFilter === 'CRITICAL'} onClick={() => setActiveFilter('CRITICAL')} />
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter leading-none">Suppliers ({filtered.length})</h2>
                <div className="flex gap-2">
                    <Button onClick={() => fileInputRef.current.click()} variant="secondary" disabled={isImporting}><Upload size={16} className="mr-1"/> Import CSV</Button>
                    <Button onClick={() => { setEditingSupplier(null); setShowModal(true); }} variant="primary" className="bg-blue-600"><Plus size={16} className="mr-1"/> Add Supplier</Button>
                </div>
            </div>

            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />

            <div className="relative">
                <Input placeholder="Search factory name, TIN, or notes..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map(s => (
                    <Card key={s.id} className={`p-5 rounded-2xl hover:border-blue-400 transition-all bg-white relative ${selectedIds.has(s.id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
                        <div className="absolute top-4 left-4 z-10">
                            <input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => {
                                const next = new Set(selectedIds);
                                next.has(s.id) ? next.delete(s.id) : next.add(s.id);
                                setSelectedIds(next);
                            }} className="w-5 h-5 accent-blue-600 cursor-pointer" />
                        </div>
                        <div className="pl-8">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    <h4 className="font-black text-lg text-gray-800 uppercase tracking-tight truncate">{s.name}</h4>
                                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{s.isInternational ? 'International Factory' : 'Local Supplier'}</p>
                                </div>
                                <button onClick={() => { setEditingSupplier(s); setShowModal(true); }} className="p-2 text-gray-300 hover:text-blue-600"><Edit size={16}/></button>
                            </div>
                            <Button onClick={() => { setEditingSupplier(s); setShowModal(true); }} variant="secondary" className="w-full !py-2 text-[9px] font-black uppercase mb-4">Procurement History</Button>
                        </div>
                        <div className="pt-3 border-t grid grid-cols-4 gap-1 text-[8px] text-gray-500 text-center font-black">
                            <div className={`p-1 rounded uppercase ${s.isCritical ? 'bg-red-50 text-red-700' : ''}`}><AlertTriangle size={14} className={`mx-auto mb-1 ${s.isCritical ? 'text-red-600' : 'text-gray-300'}`}/> Critical</div>
                            <div className={`p-1 rounded uppercase ${s.isApproved ? 'bg-green-50 text-green-700' : ''}`}><ShieldCheck size={14} className={`mx-auto mb-1 ${s.isApproved ? 'text-green-600' : 'text-gray-300'}`}/> Approved</div>
                            <div className={`p-1 rounded uppercase ${s.isOnboarded ? 'bg-blue-50 text-blue-700' : ''}`}><UserCheck size={14} className={`mx-auto mb-1 ${s.isOnboarded ? 'text-blue-600' : 'text-gray-300'}`}/> Onboarded</div>
                            <div className={`p-1 rounded uppercase`}><FileText size={14} className={`mx-auto mb-1 text-gray-300`}/> Active PO</div>
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
