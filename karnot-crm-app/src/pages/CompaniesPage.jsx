import React, { useState, useRef, useMemo, useEffect } from 'react'; 
import { db } from '../firebase'; 
import { collection, addDoc, serverTimestamp, doc, setDoc, deleteDoc, writeBatch, updateDoc } from "firebase/firestore";
import Papa from 'papaparse'; 
import { 
    Plus, X, Edit, Trash2, Building, Globe, Upload, Search, 
    MapPin, CheckSquare, Clock, FileText, 
    Link as LinkIcon, UserCheck, Mail, PlusCircle, ExternalLink, Download, Send, RotateCcw, Handshake, Map as MapIcon, Copy
} from 'lucide-react';
import { Card, Button, Input, Textarea, Checkbox, PRICING_TIERS } from '../data/constants.jsx';

// --- 1. StatBadge Component ---
const StatBadge = ({ icon: Icon, label, count, total, color, active, onClick }) => {
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
        <div onClick={onClick} className={`cursor-pointer flex-1 min-w-[200px] p-3 rounded-xl border transition-all duration-200 flex items-center justify-between gap-3 ${active ? `bg-${color}-100 border-${color}-500 ring-2 ring-${color}-400` : 'bg-white border-gray-200 hover:border-orange-300 hover:shadow-md'}`}>
            <div className={`p-2 rounded-full bg-${color}-100 text-${color}-600`}><Icon size={20} /></div>
            <div className="text-right">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{label}</p>
                <p className="text-xl font-bold text-gray-800">{count} <span className="text-xs text-gray-400 font-normal">({percentage}%)</span></p>
            </div>
        </div>
    );
};

// --- 2. Company Modal Component (Restored with GPS & Deduplication) ---
const CompanyModal = ({ onClose, onSave, companyToEdit, quotes = [], onOpenQuote, existingCompanies = [] }) => {
    const [activeTab, setActiveTab] = useState('ACTIVITY');
    const [companyName, setCompanyName] = useState(companyToEdit?.companyName || '');
    const [website, setWebsite] = useState(companyToEdit?.website || '');
    const [industry, setIndustry] = useState(companyToEdit?.industry || '');
    const [address, setAddress] = useState(companyToEdit?.address || '');
    
    // RESTORED GPS FIELDS
    const [latitude, setLatitude] = useState(companyToEdit?.latitude || '');
    const [longitude, setLongitude] = useState(companyToEdit?.longitude || '');
    
    const [tier, setTier] = useState(companyToEdit?.tier || 'STANDARD');
    const [isVerified, setIsVerified] = useState(companyToEdit?.isVerified || false);
    const [isTarget, setIsTarget] = useState(companyToEdit?.isTarget || false);
    const [isEmailed, setIsEmailed] = useState(companyToEdit?.isEmailed || false);
    const [isCustomer, setIsCustomer] = useState(companyToEdit?.isCustomer || false);
    const [notes, setNotes] = useState(companyToEdit?.notes || '');
    const [interactions, setInteractions] = useState(companyToEdit?.interactions || []);
    
    const [newLogType, setNewLogType] = useState('Call');
    const [newLogOutcome, setNewLogOutcome] = useState('');
    const [newLogDate, setNewLogDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedQuoteId, setSelectedQuoteId] = useState('');

    // RESTORED DEDUPLICATION LOGIC
    const isDuplicate = useMemo(() => {
        if (companyToEdit) return false;
        return existingCompanies.some(c => c.companyName.toLowerCase().trim() === companyName.toLowerCase().trim());
    }, [companyName, existingCompanies, companyToEdit]);

    const targetName = (companyName || '').toLowerCase().trim();
    const relevantQuotes = (quotes || []).filter(q => (q.customer?.name || '').toLowerCase().includes(targetName));

    const handleAddInteraction = () => {
        if (!newLogOutcome) return;
        let linkedQuote = null;
        if (selectedQuoteId) linkedQuote = relevantQuotes.find(rq => rq.id === selectedQuoteId);
        const newInteraction = { id: Date.now(), date: newLogDate, type: newLogType, outcome: newLogOutcome, linkedQuote };
        setInteractions([newInteraction, ...interactions].sort((a, b) => new Date(b.date) - new Date(a.date)));
        setNewLogOutcome('');
        setSelectedQuoteId('');
    };

    const openInGoogleMaps = () => {
        if (latitude && longitude) {
            window.open(`https://www.google.com/maps?q=${latitude},${longitude}`, '_blank');
        } else if (address) {
            window.open(`https://www.google.com/maps?q=${encodeURIComponent(address)}`, '_blank');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <Card className="w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col md:flex-row shadow-2xl bg-white rounded-3xl p-0">
                <div className="flex-1 p-8 overflow-y-auto border-r border-gray-100 space-y-6">
                    <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tighter">{companyToEdit ? 'Edit Account' : 'New Account'}</h2>
                    
                    {isDuplicate && (
                        <div className="bg-red-50 border border-red-200 p-3 rounded-xl flex items-center gap-3 text-red-600 animate-pulse">
                            <Copy size={18} /><p className="text-xs font-black uppercase">Company already exists in directory.</p>
                        </div>
                    )}

                    <div className="space-y-4">
                        <Input label="Company Name" value={companyName} onChange={e => setCompanyName(e.target.value)} />
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Tier</label>
                                <select value={tier} onChange={e => setTier(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-xl bg-white font-black uppercase text-xs">
                                    {Object.entries(PRICING_TIERS).map(([key, t]) => (
                                        <option key={key} value={key}>{t.label} ({t.discount}% Off)</option>
                                    ))}
                                </select>
                            </div>
                            <Input label="Industry" value={industry} onChange={e => setIndustry(e.target.value)} />
                        </div>
                        <Input label="Website" value={website} onChange={e => setWebsite(e.target.value)} />
                        <div className="space-y-2">
                            <Textarea label="Address" value={address} onChange={e => setAddress(e.target.value)} rows="2" />
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                                <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase">
                                    <span>GPS Site Location</span>
                                    {(latitude || longitude || address) && (
                                        <button onClick={openInGoogleMaps} className="text-blue-600 hover:underline flex items-center gap-1">VIEW ON MAP <ExternalLink size={10}/></button>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input placeholder="Latitude" value={latitude} onChange={e => setLatitude(e.target.value)} className="bg-white" />
                                    <Input placeholder="Longitude" value={longitude} onChange={e => setLongitude(e.target.value)} className="bg-white" />
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
                            <Checkbox label="Verified" checked={isVerified} onChange={e => setIsVerified(e.target.checked)} />
                            <Checkbox label="Intro Emailed" checked={isEmailed} onChange={e => setIsEmailed(e.target.checked)} />
                            <Checkbox label="Target Account" checked={isTarget} onChange={e => setIsTarget(e.target.checked)} />
                            <Checkbox label={<span className="text-teal-700 font-bold">Existing Customer</span>} checked={isCustomer} onChange={e => setIsCustomer(e.target.checked)} />
                        </div>
                        <Textarea label="Internal Notes" value={notes} onChange={e => setNotes(e.target.value)} rows="3" />
                    </div>
                </div>

                <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden">
                    <div className="flex border-b bg-white">
                        <button onClick={() => setActiveTab('ACTIVITY')} className={`flex-1 py-5 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ACTIVITY' ? 'text-orange-600 border-b-4 border-orange-600' : 'text-gray-400'}`}>Activity</button>
                        <button onClick={() => setActiveTab('DATA')} className={`flex-1 py-5 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'DATA' ? 'text-blue-600 border-b-4 border-blue-600' : 'text-gray-400'}`}>Quotes ({relevantQuotes.length})</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6">
                        {activeTab === 'ACTIVITY' ? (
                            <div className="space-y-4">
                                <div className="bg-white p-4 rounded-2xl border shadow-sm space-y-3">
                                    <div className="flex gap-2">
                                        <Input type="date" value={newLogDate} onChange={e => setNewLogDate(e.target.value)} className="text-xs" />
                                        <select value={newLogType} onChange={e => setNewLogType(e.target.value)} className="text-xs border rounded-xl p-2 flex-1 font-black uppercase bg-gray-50">
                                            <option value="Call">Call</option><option value="Visit">Site Visit</option><option value="Email">Email</option>
                                        </select>
                                    </div>
                                    <div className="flex gap-2">
                                        <input type="text" value={newLogOutcome} onChange={e => setNewLogOutcome(e.target.value)} placeholder="Summary..." className="flex-1 text-sm p-2.5 border rounded-xl" />
                                        <Button onClick={handleAddInteraction} variant="primary"><PlusCircle size={20}/></Button>
                                    </div>
                                </div>
                                {interactions.map(log => (
                                    <div key={log.id} className="bg-white p-4 rounded-2xl border shadow-sm group relative">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full text-white uppercase ${log.type === 'Visit' ? 'bg-green-500' : 'bg-blue-500'}`}>{log.type}</span>
                                            <span className="text-[10px] text-gray-400 font-bold">{log.date}</span>
                                        </div>
                                        <p className="text-sm text-gray-700 font-bold">{log.outcome}</p>
                                        <button onClick={() => setInteractions(interactions.filter(i => i.id !== log.id))} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={12}/></button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {relevantQuotes.map(q => (
                                    <div key={q.id} onClick={() => onOpenQuote(q)} className="flex justify-between items-center p-4 border rounded-2xl bg-white hover:border-orange-500 cursor-pointer">
                                        <span className="font-black text-xs">{q.id}</span>
                                        <span className="text-orange-600 font-black">${q.finalSalesPrice?.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="p-6 bg-white border-t flex justify-end gap-3">
                        <Button onClick={onClose} variant="secondary">Cancel</Button>
                        <Button onClick={() => onSave({ companyName, website, industry, address, latitude, longitude, tier, isVerified, isTarget, isEmailed, isCustomer, notes, interactions })} variant="primary" disabled={isDuplicate && !companyToEdit}>Save Changes</Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

// --- 3. Main Page Component ---
const CompaniesPage = ({ companies = [], user, quotes = [], contacts = [], onOpenQuote }) => {
    const [showModal, setShowModal] = useState(false);
    const [editingCompany, setEditingCompany] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('ALL');
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef(null);

    const activeCompanies = useMemo(() => (companies || []).filter(c => !c.isDeleted), [companies]);

    const stats = useMemo(() => ({
        total: activeCompanies.length,
        targets: activeCompanies.filter(c => c.isTarget).length,
        customers: activeCompanies.filter(c => c.isCustomer).length,
    }), [activeCompanies]);

    const filtered = useMemo(() => {
        const term = searchTerm.toLowerCase();
        let list = activeCompanies.filter(c => 
            c.companyName.toLowerCase().includes(term) || (c.industry || '').toLowerCase().includes(term) || (c.notes || '').toLowerCase().includes(term)
        );
        if (activeFilter === 'TARGETS') list = list.filter(c => c.isTarget);
        if (activeFilter === 'CUSTOMERS') list = list.filter(c => c.isCustomer);
        return list;
    }, [activeCompanies, searchTerm, activeFilter]);

    const handleBulkDelete = async () => {
        if (!confirm(`Delete ${selectedIds.size} accounts?`)) return;
        const batch = writeBatch(db);
        selectedIds.forEach(id => batch.update(doc(db, "users", user.uid, "companies", id), { isDeleted: true }));
        await batch.commit();
        setSelectedIds(new Set());
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
                    const name = row.Company || row.CompanyName;
                    const exists = activeCompanies.some(c => c.companyName.toLowerCase().trim() === name?.toLowerCase().trim());
                    if (!exists && name) {
                        const ref = doc(collection(db, "users", user.uid, "companies"));
                        batch.set(ref, { 
                            companyName: name, industry: row.Industry || '', address: row.Address || '', website: row.Website || '',
                            latitude: row.Latitude || '', longitude: row.Longitude || '', interactions: [], createdAt: serverTimestamp() 
                        });
                    }
                });
                await batch.commit();
                setIsImporting(false);
                alert("Import Complete!");
            }
        });
    };

    const handleSave = async (data) => {
        if (editingCompany) {
            await updateDoc(doc(db, "users", user.uid, "companies", editingCompany.id), { ...data, lastModified: serverTimestamp() });
        } else {
            await addDoc(collection(db, "users", user.uid, "companies"), { ...data, createdAt: serverTimestamp() });
        }
        setShowModal(false); setEditingCompany(null);
    };

    return (
        <div className="w-full space-y-6">
            {showModal && <CompanyModal onClose={() => setShowModal(false)} onSave={handleSave} companyToEdit={editingCompany} quotes={quotes} onOpenQuote={onOpenQuote} existingCompanies={activeCompanies} />}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatBadge icon={Building} label="Total Accounts" count={stats.total} total={stats.total} color="gray" active={activeFilter === 'ALL'} onClick={() => setActiveFilter('ALL')} />
                <StatBadge icon={Handshake} label="Customers" count={stats.customers} total={stats.total} color="teal" active={activeFilter === 'CUSTOMERS'} onClick={() => setActiveFilter('CUSTOMERS')} />
                <StatBadge icon={CheckSquare} label="Targets" count={stats.targets} total={stats.total} color="purple" active={activeFilter === 'TARGETS'} onClick={() => setActiveFilter('TARGETS')} />
            </div>

            <div className="flex justify-between items-center gap-4">
                <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">Directory ({filtered.length})</h2>
                <div className="flex gap-2">
                    <Button onClick={() => fileInputRef.current.click()} variant="secondary" disabled={isImporting}><Upload size={16} className="mr-1"/> Import</Button>
                    <Button onClick={() => { setEditingCompany(null); setShowModal(true); }} variant="primary"><Plus size={16} className="mr-1"/> New Account</Button>
                </div>
            </div>

            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
            <div className="relative">
                <Input placeholder="Search directory..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map(c => (
                    <Card key={c.id} className={`p-6 rounded-2xl border-gray-100 hover:border-orange-400 transition-all bg-white relative ${selectedIds.has(c.id) ? 'ring-2 ring-orange-500' : ''}`}>
                        <div className="absolute top-4 left-4 z-10">
                            <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => {
                                const next = new Set(selectedIds);
                                next.has(c.id) ? next.delete(c.id) : next.add(c.id);
                                setSelectedIds(next);
                            }} className="w-5 h-5 accent-orange-600 rounded cursor-pointer" />
                        </div>
                        <div className="pl-8">
                            <div className="flex justify-between items-start mb-4">
                                <div className="truncate pr-4">
                                    <h4 className="font-black text-lg text-gray-800 uppercase truncate">{c.companyName}</h4>
                                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">{c.industry || 'Account'}</p>
                                </div>
                                <button onClick={() => { setEditingCompany(c); setShowModal(true); }} className="p-2 text-gray-300 hover:text-orange-600"><Edit size={16}/></button>
                            </div>
                            <div className="flex gap-2 mb-4">
                                <Button onClick={() => { setEditingCompany(c); setShowModal(true); }} variant="secondary" className="flex-1 !py-2 text-[9px] font-black uppercase">Detailed Profile</Button>
                                {c.latitude && c.longitude && (
                                    <button onClick={() => window.open(`https://www.google.com/maps?q=${c.latitude},${c.longitude}`, '_blank')} className="px-3 border rounded-xl hover:bg-orange-50 text-orange-600 transition-all"><MapIcon size={16}/></button>
                                )}
                            </div>
                        </div>
                        <div className="pt-4 border-t grid grid-cols-4 gap-1 text-[8px] text-gray-400 text-center font-black">
                            <div className={`p-1 rounded ${c.isCustomer ? 'bg-teal-50 text-teal-700' : ''}`}><Handshake size={14} className="mx-auto mb-1"/> Cust</div>
                            <div className={`p-1 rounded ${quotes.some(q => q.customer?.name === c.companyName) ? 'bg-orange-50 text-orange-700' : ''}`}><CheckSquare size={14} className="mx-auto mb-1"/> Quot</div>
                            <div className={`p-1 rounded ${c.isEmailed ? 'bg-purple-50 text-purple-700' : ''}`}><Mail size={14} className="mx-auto mb-1"/> Mail</div>
                            <div className={`p-1 rounded ${c.isVerified ? 'bg-green-50 text-green-700' : ''}`}><UserCheck size={14} className="mx-auto mb-1"/> Verf</div>
                        </div>
                    </Card>
                ))}
            </div>

            {selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-10 z-50 animate-in slide-in-from-bottom-4">
                    <span className="font-black text-sm uppercase">{selectedIds.size} Selected</span>
                    <button onClick={handleBulkDelete} className="flex items-center gap-2 hover:text-red-400 transition-colors font-black text-xs uppercase"><Trash2 size={18} /> Delete</button>
                    <button onClick={() => setSelectedIds(new Set())} className="text-gray-400 hover:text-white"><X size={20}/></button>
                </div>
            )}
        </div>
    );
};

export default CompaniesPage;
