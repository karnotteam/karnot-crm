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

const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI/180);  
    const dLon = (lon2 - lon1) * (Math.PI/180); 
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) * Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
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

const DuplicateResolverModal = ({ duplicates, onClose, onResolve }) => {
    const [selectedToDelete, setSelectedToDelete] = useState(new Set());
    const toggleSelection = (id) => {
        const newSet = new Set(selectedToDelete);
        if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
        setSelectedToDelete(newSet);
    };
    const handleAutoSelect = () => {
        const newSet = new Set();
        duplicates.forEach(group => {
            const sortedItems = [...group.items].sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
            for (let i = 1; i < sortedItems.length; i++) newSet.add(sortedItems[i].id);
        });
        setSelectedToDelete(newSet);
    };
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <Card className="w-full max-w-3xl max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><AlertTriangle className="text-orange-500"/> Duplicate Groups</h3>
                    <button onClick={onClose}><X /></button>
                </div>
                <div className="overflow-y-auto flex-1 space-y-4">
                    {duplicates.map((group, i) => (
                        <div key={i} className="border rounded-lg overflow-hidden">
                            <div className="bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-800 uppercase">{group.key}</div>
                            {group.items.map(c => (
                                <div key={c.id} className="flex items-center justify-between p-3 border-t">
                                    <div className="flex items-center gap-3">
                                        <input type="checkbox" checked={selectedToDelete.has(c.id)} onChange={() => toggleSelection(c.id)} />
                                        <span className="text-sm font-medium">{c.companyName} ({c.address})</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
                <div className="mt-4 pt-4 border-t flex justify-end gap-2">
                    <Button onClick={onClose} variant="secondary">Cancel</Button>
                    <Button onClick={handleAutoSelect} variant="secondary">Auto-Select Newer</Button>
                    <Button onClick={() => onResolve(Array.from(selectedToDelete))} variant="danger">Delete Selected ({selectedToDelete.size})</Button>
                </div>
            </Card>
        </div>
    );
};

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

    const handleRemoveInteraction = (id) => {
        const updated = interactions.filter(i => i.id !== id);
        setInteractions(updated);
        // If we are editing an existing company, we call the parent delete function
        if (companyToEdit?.id) {
            onDeleteInteraction(companyToEdit.id, id);
        }
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
                                        <button 
                                            onClick={() => handleRemoveInteraction(log.id)}
                                            className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 size={12}/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-white p-3 rounded border shadow-sm">
                                    <h5 className="font-bold text-[10px] text-gray-400 uppercase mb-2 flex items-center gap-1"><Users size={12}/> Contacts</h5>
                                    {companyContacts.map(c => (
                                        <div key={c.id} className="flex justify-between items-center text-xs py-1 border-b last:border-0 font-bold">
                                            <span>{c.firstName} {c.lastName}</span>
                                            <a href={`tel:${c.phone}`} className="text-blue-600"><Phone size={12}/></a>
                                        </div>
                                    ))}
                                </div>
                                <div className="bg-white p-3 rounded border shadow-sm">
                                    <h5 className="font-bold text-[10px] text-gray-400 uppercase mb-2 flex items-center gap-1"><FileText size={12}/> Quotes</h5>
                                    {relevantQuotes.map(q => (
                                        <div key={q.id} onClick={() => onOpenQuote(q)} className="flex justify-between items-center text-xs py-2 border-b last:border-0 cursor-pointer hover:bg-gray-50">
                                            <span className="font-bold">{q.id}</span>
                                            <span className="text-orange-600 font-bold">${q.finalSalesPrice?.toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
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

const CompaniesPage = ({ companies = [], user, quotes = [], contacts = [], onOpenQuote }) => {
    const [showModal, setShowModal] = useState(false);
    const [editingCompany, setEditingCompany] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('ALL');
    const [isImporting, setIsImporting] = useState(false);
    const [userLocation, setUserLocation] = useState(null);
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [duplicateGroups, setDuplicateGroups] = useState([]);
    const fileInputRef = useRef(null);

    const stats = useMemo(() => ({
        total: companies.length,
        targets: companies.filter(c => c.isTarget).length,
        active: companies.filter(c => (c.interactions || []).length > 0).length,
        nearMe: userLocation ? companies.filter(c => c.latitude && getDistanceFromLatLonInKm(userLocation.lat, userLocation.lng, c.latitude, c.longitude) <= 20).length : 0
    }), [companies, userLocation]);

    const filtered = useMemo(() => {
        const term = searchTerm.toLowerCase();
        let list = (companies || []).filter(c => c.companyName.toLowerCase().includes(term) || (c.industry || '').toLowerCase().includes(term));
        if (activeFilter === 'TARGETS') list = list.filter(c => c.isTarget);
        if (activeFilter === 'NEARBY' && userLocation) {
            list = list.filter(c => c.latitude && getDistanceFromLatLonInKm(userLocation.lat, userLocation.lng, c.latitude, c.longitude) <= 20);
        }
        return list;
    }, [companies, searchTerm, activeFilter, userLocation]);

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        setIsImporting(true);
        Papa.parse(file, {
            header: true, skipEmptyLines: true,
            complete: async (results) => {
                const batch = writeBatch(db);
                results.data.forEach(row => {
                    if (!row.companyName) return;
                    batch.set(doc(collection(db, "users", user.uid, "companies")), { ...row, createdAt: serverTimestamp(), interactions: [], tier: 'STANDARD' });
                });
                await batch.commit(); setIsImporting(false); alert("Imported!");
            }
        });
    };

    const handleNearMe = () => {
        if (activeFilter === 'NEARBY') { setActiveFilter('ALL'); setUserLocation(null); return; }
        navigator.geolocation.getCurrentPosition((pos) => {
            setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            setActiveFilter('NEARBY');
        }, () => alert("GPS error."));
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
        if (!company) return;
        const updatedLogs = (company.interactions || []).filter(i => i.id !== logId);
        await setDoc(doc(db, "users", user.uid, "companies", companyId), { interactions: updatedLogs }, { merge: true });
    };

    return (
        <div className="w-full">
            {showModal && (
                <CompanyModal 
                    onClose={() => setShowModal(false)} 
                    onSave={handleSave} 
                    onDeleteInteraction={handleDeleteInteraction}
                    companyToEdit={editingCompany} 
                    quotes={quotes} 
                    contacts={contacts} 
                    onOpenQuote={onOpenQuote} 
                />
            )}
            {showDuplicateModal && <DuplicateResolverModal duplicates={duplicateGroups} onClose={() => setShowDuplicateModal(false)} onResolve={async (ids) => {
                const batch = writeBatch(db);
                ids.forEach(id => batch.delete(doc(db, "users", user.uid, "companies", id)));
                await batch.commit(); setShowDuplicateModal(false);
            }} />}

            <div className="flex flex-wrap gap-4 mb-8">
                <StatBadge icon={Building} label="Total Accounts" count={stats.total} total={stats.total} color="gray" active={activeFilter === 'ALL'} onClick={() => setActiveFilter('ALL')} />
                <StatBadge icon={Navigation} label="Near Me (20km)" count={stats.nearMe} total={stats.total} color="orange" active={activeFilter === 'NEARBY'} onClick={handleNearMe} />
                <StatBadge icon={CheckSquare} label="Target Accounts" count={stats.targets} total={stats.total} color="purple" active={activeFilter === 'TARGETS'} onClick={() => setActiveView('TARGETS')} />
                <StatBadge icon={Clock} label="Active Interactions" count={stats.active} total={stats.total} color="blue" active={activeFilter === 'ACTIVE'} onClick={() => setActiveFilter('ACTIVE')} />
            </div>

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Companies ({filtered.length})</h1>
                <div className="flex gap-2">
                    <Button onClick={() => {
                        const groups = {};
                        companies.forEach(c => { const key = c.companyName.toLowerCase().trim(); if(!groups[key]) groups[key] = []; groups[key].push(c); });
                        const conflicts = Object.keys(groups).filter(k => groups[k].length > 1).map(k => ({ key: k, items: groups[k] }));
                        if(conflicts.length > 0) { setDuplicateGroups(conflicts); setShowDuplicateModal(true); } else alert("No duplicates!");
                    }} variant="secondary"><CheckSquare className="mr-1" size={16}/> Dedupe</Button>
                    <Button onClick={() => fileInputRef.current.click()} variant="secondary" disabled={isImporting}><Upload className="mr-1" size={16}/> Import CSV</Button>
                    <Button onClick={() => { setEditingCompany(null); setShowModal(true); }} variant="primary"><Plus className="mr-1" size={16}/> New Company</Button>
                </div>
            </div>

            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />

            <div className="relative mb-6">
                <input type="text" placeholder="Search accounts..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-orange-500 outline-none" />
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map(c => (
                    <Card key={c.id} className="p-5 rounded-lg border border-gray-200 hover:border-orange-400 transition-all group shadow-sm bg-white relative">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h4 className="font-bold text-lg text-gray-800 leading-tight">{c.companyName}</h4>
                                <p className="text-xs font-bold text-orange-600 uppercase tracking-widest">{c.industry || 'Account'}</p>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                                <button onClick={() => { setEditingCompany(c); setShowModal(true); }} className="p-1 text-gray-400 hover:text-indigo-600"><Edit size={16}/></button>
                                <button onClick={async () => { if(window.confirm("Delete?")) await deleteDoc(doc(db, "users", user.uid, "companies", c.id)); }} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={16}/></button>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mb-4 truncate font-medium"><MapPin size={12} className="inline mr-1 text-gray-300"/>{c.address || 'No address'}</p>
                        
                        {(c.interactions || []).length > 0 ? (
                            <div className="bg-slate-50 p-2 rounded border border-slate-100 text-xs flex justify-between items-center">
                                <span><Clock size={10} className="inline mr-1 text-blue-500"/> {c.interactions[0].date}</span>
                                <span className="font-bold text-gray-600 truncate w-32 text-right">{c.interactions[0].outcome}</span>
                            </div>
                        ) : (
                            <div className="text-[10px] font-bold text-gray-300 uppercase text-center border border-dashed rounded p-2 tracking-widest">No History</div>
                        )}
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default CompaniesPage;
