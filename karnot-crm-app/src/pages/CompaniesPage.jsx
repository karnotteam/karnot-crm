import React, { useState, useRef, useMemo, useEffect } from 'react'; 
import { db } from '../firebase'; 
import { collection, addDoc, serverTimestamp, doc, setDoc, deleteDoc, writeBatch } from "firebase/firestore";
import Papa from 'papaparse'; 
import { 
    Plus, X, Edit, Trash2, Building, Globe, Upload, Search, 
    MapPin, ShieldCheck, AlertTriangle, CheckSquare, Wand2, 
    Calendar, MessageSquare, Filter, Clock, FileText, 
    Link as LinkIcon, Users, User, ArrowRight, Navigation, 
    ClipboardCheck, Linkedin, Phone 
} from 'lucide-react';
import { Card, Button, Input, Textarea, Checkbox, PRICING_TIERS } from '../data/constants.jsx';

// --- Helper: Distance Formula ---
const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI/180);  
    const dLon = (lon2 - lon1) * (Math.PI/180); 
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) * Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c; 
};

// --- Stat Badge ---
const StatBadge = ({ icon: Icon, label, count, total, color, active, onClick }) => {
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
        <div onClick={onClick} className={`cursor-pointer flex-1 min-w-[200px] p-3 rounded-xl border transition-all duration-200 flex items-center justify-between gap-3 ${active ? `bg-${color}-100 border-${color}-500 ring-2 ring-${color}-400` : 'bg-white border-gray-200 hover:border-orange-300 hover:shadow-md'}`}>
            <div className={`p-2 rounded-full bg-${color}-100 text-${color}-600`}><Icon size={20} /></div>
            <div className="text-right">
                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{label}</p>
                <p className="text-xl font-black text-gray-800">{count} <span className="text-xs text-gray-400 font-normal">({percentage}%)</span></p>
            </div>
        </div>
    );
};

// --- Company Modal (Sharp Activity View) ---
const CompanyModal = ({ onClose, onSave, companyToEdit, quotes = [], contacts = [], commissioningReports = [], onOpenQuote, onEditContact }) => {
    const isEditMode = Boolean(companyToEdit);
    const [companyName, setCompanyName] = useState(companyToEdit?.companyName || '');
    const [tier, setTier] = useState(companyToEdit?.tier || 'STANDARD');
    const [activeTab, setActiveTab] = useState('ACTIVITY');
    
    // Core details
    const [website, setWebsite] = useState(companyToEdit?.website || '');
    const [industry, setIndustry] = useState(companyToEdit?.industry || '');
    const [address, setAddress] = useState(companyToEdit?.address || '');
    const [linkedIn, setLinkedIn] = useState(companyToEdit?.linkedIn || '');
    const [notes, setNotes] = useState(companyToEdit?.notes || '');
    const [isVerified, setIsVerified] = useState(companyToEdit?.isVerified || false);
    const [isTarget, setIsTarget] = useState(companyToEdit?.isTarget || false);
    
    // Log State
    const [interactions, setInteractions] = useState(companyToEdit?.interactions || []);
    const [newLogType, setNewLogType] = useState('Call');
    const [newLogOutcome, setNewLogOutcome] = useState('');
    const [newLogDate, setNewLogDate] = useState(new Date().toISOString().split('T')[0]);

    // Safety checks for data linking
    const safeQuotes = quotes || [];
    const safeContacts = contacts || [];
    const targetName = (companyToEdit?.companyName || companyName || '').toLowerCase().trim();

    const companyContacts = safeContacts.filter(c => c.companyId === companyToEdit?.id || (c.companyName && c.companyName.toLowerCase().trim() === targetName));
    const relevantQuotes = safeQuotes.filter(q => (q.customer?.name || '').toLowerCase().includes(targetName));

    const handleAddInteraction = () => {
        if (!newLogOutcome) return;
        const newInteraction = { id: Date.now(), date: newLogDate, type: newLogType, outcome: newLogOutcome };
        setInteractions([newInteraction, ...interactions].sort((a, b) => new Date(b.date) - new Date(a.date)));
        setNewLogOutcome('');
    };

    const handleSave = () => {
        if (!companyName) return alert('Enter company name.');
        onSave({ companyName, website, industry, address, linkedIn, tier, isVerified, isTarget, notes, interactions });
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <Card className="w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl bg-white rounded-3xl border-none">
                <div className="flex-1 p-8 overflow-y-auto border-r border-gray-100">
                    <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight mb-6">{isEditMode ? 'Edit Account' : 'New Account'}</h2>
                    <div className="space-y-4">
                        <Input label="Company Name" value={companyName} onChange={e => setCompanyName(e.target.value)} />
                        <div>
                            <label className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1 block ml-1">Pricing Tier</label>
                            <select value={tier} onChange={e => setTier(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-sm font-bold focus:ring-2 focus:ring-orange-500 outline-none">
                                {Object.entries(PRICING_TIERS).map(([key, t]) => (
                                    <option key={key} value={key}>{t.label} ({t.discount}% Off)</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Website" value={website} onChange={e => setWebsite(e.target.value)} />
                            <Input label="Industry" value={industry} onChange={e => setIndustry(e.target.value)} />
                        </div>
                        <Textarea label="Address" value={address} onChange={e => setAddress(e.target.value)} />
                        <div className="flex gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <Checkbox label="Verified" checked={isVerified} onChange={e => setIsVerified(e.target.checked)} />
                            <Checkbox label="Target Account" checked={isTarget} onChange={e => setIsTarget(e.target.checked)} />
                        </div>
                    </div>
                </div>

                <div className="flex-1 bg-gray-50/50 flex flex-col overflow-hidden">
                    <div className="flex border-b bg-white px-6">
                        <button onClick={() => setActiveTab('ACTIVITY')} className={`py-4 px-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'ACTIVITY' ? 'text-orange-600 border-b-4 border-orange-600' : 'text-gray-400'}`}>Interaction Logs</button>
                        <button onClick={() => setActiveTab('DATA')} className={`py-4 px-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'DATA' ? 'text-blue-600 border-b-4 border-blue-600' : 'text-gray-400'}`}>Account Data</button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {activeTab === 'ACTIVITY' ? (
                            <div className="space-y-4">
                                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
                                    <div className="flex gap-2">
                                        <Input type="date" value={newLogDate} onChange={e => setNewLogDate(e.target.value)} className="text-xs" />
                                        <select value={newLogType} onChange={e => setNewLogType(e.target.value)} className="text-xs border rounded-xl p-2 flex-1 font-black uppercase bg-gray-50">
                                            <option value="Call">Call</option><option value="Visit">Site Visit</option><option value="Email">Email</option>
                                        </select>
                                    </div>
                                    <div className="flex gap-2">
                                        <input type="text" value={newLogOutcome} onChange={e => setNewLogOutcome(e.target.value)} placeholder="Outcome..." className="flex-1 text-sm p-3 bg-gray-50 border-none rounded-xl font-medium focus:ring-2 focus:ring-orange-500 outline-none" />
                                        <Button onClick={handleAddInteraction} variant="primary" className="rounded-xl px-4"><Plus size={20}/></Button>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {interactions.map(log => (
                                        <div key={log.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[9px] font-black bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full uppercase tracking-widest">{log.type}</span>
                                                <span className="text-[10px] text-gray-400 font-black">{log.date}</span>
                                            </div>
                                            <p className="text-sm text-gray-700 font-bold">{log.outcome}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                    <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Quotes</h5>
                                    {relevantQuotes.map(q => (
                                        <div key={q.id} className="flex justify-between items-center p-3 hover:bg-slate-50 border-b last:border-0 rounded-xl transition-colors">
                                            <span className="text-xs font-black text-gray-700">{q.id}</span>
                                            <span className="text-sm font-black text-orange-600">${Number(q.finalSalesPrice || 0).toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="p-6 bg-white border-t flex justify-end gap-3">
                        <Button onClick={onClose} variant="secondary">Discard</Button>
                        <Button onClick={handleSave} variant="primary" className="font-black px-8 uppercase tracking-widest">Save Changes</Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

// --- Main Page ---
const CompaniesPage = ({ companies = [], user, quotes = [], contacts = [] }) => {
    const [showModal, setShowModal] = useState(false);
    const [editingCompany, setEditingCompany] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('ALL');

    const stats = useMemo(() => ({
        total: companies.length,
        targets: companies.filter(c => c.isTarget).length,
        verified: companies.filter(c => c.isVerified).length,
        active: companies.filter(c => c.interactions?.length > 0).length
    }), [companies]);

    const filtered = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return companies.filter(c => {
            const matchesSearch = c.companyName.toLowerCase().includes(term) || (c.industry || '').toLowerCase().includes(term);
            const matchesFilter = activeFilter === 'ALL' || (activeFilter === 'TARGETS' && c.isTarget) || (activeFilter === 'VERIFIED' && c.isVerified);
            return matchesSearch && matchesFilter;
        });
    }, [companies, searchTerm, activeFilter]);

    const handleSave = async (data) => {
        if (!user) return;
        try {
            if (editingCompany) {
                await setDoc(doc(db, "users", user.uid, "companies", editingCompany.id), { ...data, lastModified: serverTimestamp() }, { merge: true });
            } else {
                await addDoc(collection(db, "users", user.uid, "companies"), { ...data, createdAt: serverTimestamp(), interactions: [] });
            }
            setShowModal(false); setEditingCompany(null);
        } catch (e) { alert("Error saving."); }
    };

    return (
        <div className="w-full max-w-7xl mx-auto px-4 font-sans">
            {showModal && <CompanyModal onClose={() => setShowModal(false)} onSave={handleSave} companyToEdit={editingCompany} quotes={quotes} contacts={contacts} />}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                <StatBadge icon={Building} label="Total Accounts" count={stats.total} total={stats.total} color="gray" active={activeFilter === 'ALL'} onClick={() => setActiveFilter('ALL')} />
                <StatBadge icon={CheckSquare} label="Target Accounts" count={stats.targets} total={stats.total} color="purple" active={activeFilter === 'TARGETS'} onClick={() => setActiveFilter('TARGETS')} />
                <StatBadge icon={ShieldCheck} label="Verified" count={stats.verified} total={stats.total} color="green" active={activeFilter === 'VERIFIED'} onClick={() => setActiveFilter('VERIFIED')} />
                <StatBadge icon={Clock} label="Active Logs" count={stats.active} total={stats.total} color="blue" active={activeFilter === 'ACTIVE'} onClick={() => setActiveFilter('ACTIVE')} />
            </div>

            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-black text-gray-800 uppercase tracking-tighter">Account Management</h1>
                <Button onClick={() => { setEditingCompany(null); setShowModal(true); }} variant="primary" className="font-black px-8 uppercase tracking-widest text-xs shadow-lg shadow-orange-100">
                    <Plus className="mr-2" size={16} /> New Company
                </Button>
            </div>

            <div className="relative mb-6">
                <input type="text" placeholder="Search by company name or sector..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-orange-500 outline-none font-medium" />
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map(c => (
                    <Card key={c.id} className="p-6 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:border-orange-200 transition-all duration-300 relative group">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="font-black text-gray-800 uppercase text-lg leading-tight">{c.companyName}</h4>
                                <span className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em]">{c.industry || 'General Sector'}</span>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setEditingCompany(c); setShowModal(true); }} className="p-2 bg-slate-50 rounded-xl text-indigo-600"><Edit size={16}/></button>
                                <button onClick={async () => { if(window.confirm("Delete account?")) await deleteDoc(doc(db, "users", user.uid, "companies", c.id)); }} className="p-2 bg-slate-50 rounded-xl text-red-600"><Trash2 size={16}/></button>
                            </div>
                        </div>
                        
                        <div className="space-y-3 mb-6">
                            <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                                <MapPin size={14} className="text-gray-300"/> <span className="truncate">{c.address || 'No location set'}</span>
                            </div>
                            {c.website && <div className="flex items-center gap-2 text-xs text-blue-600 font-bold tracking-tight">
                                <Globe size={14} className="text-blue-200"/> <span>{c.website}</span>
                            </div>}
                        </div>

                        {c.interactions?.length > 0 ? (
                            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex justify-between items-center">
                                <div>
                                    <span className="text-[8px] font-black uppercase text-gray-400 block tracking-widest mb-1">Last Log ({c.interactions[0].date})</span>
                                    <p className="text-xs text-gray-600 font-bold truncate w-40">{c.interactions[0].outcome}</p>
                                </div>
                                <span className="bg-white p-2 rounded-xl border border-slate-200"><MessageSquare size={12} className="text-orange-500"/></span>
                            </div>
                        ) : (
                            <div className="p-3 border border-dashed border-gray-200 rounded-2xl text-[10px] font-black text-gray-300 text-center uppercase tracking-widest">No Interaction History</div>
                        )}
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default CompaniesPage;
