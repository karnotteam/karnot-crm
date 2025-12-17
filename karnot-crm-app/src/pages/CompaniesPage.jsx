import React, { useState, useRef, useMemo, useEffect } from 'react'; 
import { db } from '../firebase'; 
import { collection, addDoc, serverTimestamp, doc, setDoc, deleteDoc, writeBatch } from "firebase/firestore";
import Papa from 'papaparse'; 
import { 
    Plus, X, Edit, Trash2, Building, Globe, Upload, Search, 
    MapPin, ShieldCheck, AlertTriangle, CheckSquare, Wand2, 
    Calendar, MessageSquare, Filter, Clock, FileText, 
    Link as LinkIcon, Users, User, ArrowRight, Navigation, 
    ClipboardCheck, Linkedin, Phone, RotateCcw
} from 'lucide-react';
import { Card, Button, Input, Textarea, Checkbox, PRICING_TIERS } from '../data/constants.jsx';

// --- DISTANCE HELPER ---
const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI/180);  
    const dLon = (lon2 - lon1) * (Math.PI/180); 
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) * Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(1-a), Math.sqrt(1-a)); 
    return R * c; 
};

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

// --- MODAL ---
const CompanyModal = ({ onClose, onSave, companyToEdit, quotes = [], contacts = [], onOpenQuote, onDeleteInteraction }) => {
    const [activeTab, setActiveTab] = useState('ACTIVITY');
    const [companyName, setCompanyName] = useState(companyToEdit?.companyName || '');
    const [website, setWebsite] = useState(companyToEdit?.website || '');
    const [industry, setIndustry] = useState(companyToEdit?.industry || '');
    const [address, setAddress] = useState(companyToEdit?.address || '');
    const [tier, setTier] = useState(companyToEdit?.tier || 'STANDARD');
    const [isVerified, setIsVerified] = useState(companyToEdit?.isVerified || false);
    const [isTarget, setIsTarget] = useState(companyToEdit?.isTarget || false);
    const [notes, setNotes] = useState(companyToEdit?.notes || '');
    const [interactions, setInteractions] = useState(companyToEdit?.interactions || []);
    const [newLogType, setNewLogType] = useState('Call');
    const [newLogOutcome, setNewLogOutcome] = useState('');
    const [newLogDate, setNewLogDate] = useState(new Date().toISOString().split('T')[0]);

    const targetName = (companyToEdit?.companyName || companyName || '').toLowerCase().trim();
    const companyContacts = (contacts || []).filter(c => c.companyId === companyToEdit?.id || (c.companyName && c.companyName.toLowerCase().trim() === targetName));
    const relevantQuotes = (quotes || []).filter(q => (q.customer?.name || '').toLowerCase().includes(targetName));

    const handleAddInteraction = () => {
        if (!newLogOutcome) return;
        const newInteraction = { id: Date.now(), date: newLogDate, type: newLogType, outcome: newLogOutcome };
        setInteractions([newInteraction, ...interactions].sort((a, b) => new Date(b.date) - new Date(a.date)));
        setNewLogOutcome('');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <Card className="w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl bg-white rounded-xl p-0">
                <div className="flex-1 p-6 overflow-y-auto border-r border-gray-100 space-y-4">
                    <h2 className="text-2xl font-bold text-gray-800">{companyToEdit ? 'Edit Account' : 'New Account'}</h2>
                    <Input label="Company Name" value={companyName} onChange={e => setCompanyName(e.target.value)} />
                    <select value={tier} onChange={e => setTier(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md bg-white font-bold text-sm">
                        {Object.entries(PRICING_TIERS).map(([key, t]) => (
                            <option key={key} value={key}>{t.label} ({t.discount}% Off)</option>
                        ))}
                    </select>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Website" value={website} onChange={e => setWebsite(e.target.value)} />
                        <Input label="Industry" value={industry} onChange={e => setIndustry(e.target.value)} />
                    </div>
                    <Textarea label="Address" value={address} onChange={e => setAddress(e.target.value)} rows="2" />
                    <div className="flex gap-4 p-3 bg-gray-50 rounded-lg border">
                        <Checkbox label="Verified" checked={isVerified} onChange={e => setIsVerified(e.target.checked)} />
                        <Checkbox label="Target Account" checked={isTarget} onChange={e => setIsTarget(e.target.checked)} />
                    </div>
                    <Textarea label="General Notes" value={notes} onChange={e => setNotes(e.target.value)} rows="3" />
                </div>
                <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden">
                    <div className="flex border-b bg-white">
                        <button onClick={() => setActiveTab('ACTIVITY')} className={`flex-1 py-3 text-xs font-bold ${activeTab === 'ACTIVITY' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-gray-400'}`}>Activity Log</button>
                        <button onClick={() => setActiveTab('DATA')} className={`flex-1 py-3 text-xs font-bold ${activeTab === 'DATA' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400'}`}>Linked Data</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                        {activeTab === 'ACTIVITY' ? (
                            <div className="space-y-4">
                                <div className="bg-white p-3 rounded border space-y-2 shadow-sm">
                                    <div className="flex gap-2">
                                        <Input type="date" value={newLogDate} onChange={e => setNewLogDate(e.target.value)} className="text-xs" />
                                        <select value={newLogType} onChange={e => setNewLogType(e.target.value)} className="text-xs border rounded p-1 flex-1 font-bold">
                                            <option value="Call">Call</option><option value="Visit">Site Visit</option><option value="Email">Email</option>
                                        </select>
                                    </div>
                                    <div className="flex gap-2">
                                        <input type="text" value={newLogOutcome} onChange={e => setNewLogOutcome(e.target.value)} placeholder="Summary..." className="flex-1 text-sm p-2 border rounded" />
                                        <Button onClick={handleAddInteraction} variant="primary"><Plus size={18}/></Button>
                                    </div>
                                </div>
                                {interactions.map(log => (
                                    <div key={log.id} className="bg-white p-3 rounded border shadow-sm group relative">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded text-white ${log.type === 'Visit' ? 'bg-green-500' : 'bg-blue-500'}`}>{log.type}</span>
                                            <span className="text-[10px] text-gray-400 font-bold">{log.date}</span>
                                        </div>
                                        <p className="text-xs text-gray-700 font-medium pr-6">{log.outcome}</p>
                                        <button onClick={() => onDeleteInteraction(companyToEdit.id, log.id)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12}/></button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {relevantQuotes.map(q => (
                                    <div key={q.id} onClick={() => onOpenQuote(q)} className="flex justify-between items-center text-xs py-2 px-3 border rounded-lg bg-white hover:border-orange-500 cursor-pointer">
                                        <span className="font-bold">{q.id}</span>
                                        <span className="text-orange-600 font-bold">${q.finalSalesPrice?.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="p-4 bg-white border-t flex justify-end gap-2">
                        <Button onClick={onClose} variant="secondary">Cancel</Button>
                        <Button onClick={() => onSave({ companyName, website, industry, address, tier, isVerified, isTarget, notes, interactions })} variant="primary">Save Changes</Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

// --- MAIN PAGE ---
const CompaniesPage = ({ companies = [], user, quotes = [], contacts = [], onOpenQuote, onRestoreCompany }) => {
    const [showModal, setShowModal] = useState(false);
    const [editingCompany, setEditingCompany] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('ALL');
    const [showTrash, setShowTrash] = useState(false);

    const activeCompanies = useMemo(() => (companies || []).filter(c => !c.isDeleted), [companies]);
    const trashedCompanies = useMemo(() => (companies || []).filter(c => c.isDeleted), [companies]);

    const stats = useMemo(() => ({
        total: activeCompanies.length,
        targets: activeCompanies.filter(c => c.isTarget).length,
        active: activeCompanies.filter(c => (c.interactions || []).length > 0).length,
        nearMe: 0
    }), [activeCompanies]);

    const filtered = useMemo(() => {
        const term = searchTerm.toLowerCase();
        let list = activeCompanies.filter(c => c.companyName.toLowerCase().includes(term) || (c.industry || '').toLowerCase().includes(term));
        if (activeFilter === 'TARGETS') list = list.filter(c => c.isTarget);
        return list;
    }, [activeCompanies, searchTerm, activeFilter]);

    const handleSoftDelete = async (companyId) => {
        if (!user || !window.confirm("Move to Trash?")) return;
        await setDoc(doc(db, "users", user.uid, "companies", companyId), { isDeleted: true, deletedAt: serverTimestamp() }, { merge: true });
    };

    const handleSave = async (data) => {
        if (!user) return;
        if (editingCompany) {
            await setDoc(doc(db, "users", user.uid, "companies", editingCompany.id), { ...data, lastModified: serverTimestamp() }, { merge: true });
        } else {
            await addDoc(collection(db, "users", user.uid, "companies"), { ...data, createdAt: serverTimestamp() });
        }
        setShowModal(false); setEditingCompany(null);
    };

    const handleDeleteInteraction = async (companyId, logId) => {
        if (!user) return;
        const company = companies.find(c => c.id === companyId);
        const filteredLogs = (company.interactions || []).filter(i => i.id !== logId);
        await setDoc(doc(db, "users", user.uid, "companies", companyId), { interactions: filteredLogs }, { merge: true });
    };

    return (
        <div className="w-full space-y-6">
            {showModal && <CompanyModal onClose={() => setShowModal(false)} onSave={handleSave} onDeleteInteraction={handleDeleteInteraction} companyToEdit={editingCompany} quotes={quotes} contacts={contacts} onOpenQuote={onOpenQuote} />}

            <div className="flex flex-wrap gap-4">
                <StatBadge icon={Building} label="Active Accounts" count={stats.total} total={stats.total} color="gray" active={activeFilter === 'ALL'} onClick={() => setActiveFilter('ALL')} />
                <StatBadge icon={CheckSquare} label="Targets" count={stats.targets} total={stats.total} color="purple" active={activeFilter === 'TARGETS'} onClick={() => setActiveFilter('TARGETS')} />
            </div>

            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Companies ({filtered.length})</h1>
                <div className="flex gap-2">
                    <Button onClick={() => setShowTrash(!showTrash)} variant="secondary" className="text-xs uppercase font-black">{showTrash ? 'Hide Trash' : 'View Trash'}</Button>
                    <Button onClick={() => { setEditingCompany(null); setShowModal(true); }} variant="primary"><Plus className="mr-1" size={16}/> New Company</Button>
                </div>
            </div>

            <div className="relative">
                <Input placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map(c => (
                    <Card key={c.id} className="p-5 border-gray-200 hover:border-orange-400 transition-all bg-white relative">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="font-bold text-lg text-gray-800 leading-tight">{c.companyName}</h4>
                                <p className="text-xs font-bold text-orange-600 uppercase">{c.industry || 'Account'}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => { setEditingCompany(c); setShowModal(true); }} className="p-2 bg-slate-50 text-gray-400 hover:text-indigo-600 rounded-lg border border-slate-100"><Edit size={16}/></button>
                                <button onClick={() => handleSoftDelete(c.id)} className="p-2 bg-slate-50 text-gray-400 hover:text-red-600 rounded-lg border border-slate-100"><Trash2 size={16}/></button>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mb-4 truncate"><MapPin size={12} className="inline mr-1"/>{c.address || 'No address'}</p>
                    </Card>
                ))}
            </div>

            {/* TRASH SECTION */}
            {showTrash && trashedCompanies.length > 0 && (
                <div className="mt-12 pt-12 border-t border-dashed border-gray-300">
                    <h2 className="text-xl font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Trash2 size={20}/> Trash Bin</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {trashedCompanies.map(c => (
                            <div key={c.id} className="p-4 bg-gray-50 border rounded-xl flex justify-between items-center opacity-60">
                                <span className="font-bold text-gray-700">{c.companyName}</span>
                                <Button onClick={() => onRestoreCompany(c.id)} variant="primary" className="bg-green-600 text-xs"><RotateCcw size={14} className="mr-1"/> Restore</Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompaniesPage;
