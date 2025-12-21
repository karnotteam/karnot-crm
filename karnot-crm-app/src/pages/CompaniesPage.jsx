import React, { useState, useRef, useMemo } from 'react'; 
import { db } from '../firebase'; 
import { collection, addDoc, serverTimestamp, doc, deleteDoc, writeBatch, updateDoc, setDoc } from "firebase/firestore";
import Papa from 'papaparse'; 
import { 
    Plus, X, Edit, Trash2, Building, Globe, Upload, Search, 
    MapPin, CheckSquare, FileText, UserCheck, Mail, PlusCircle, 
    ExternalLink, Download, Send, Handshake, Map as MapIcon, Copy
} from 'lucide-react';
import { Card, Button, Input, Textarea, Checkbox, PRICING_TIERS } from '../data/constants.jsx';

// --- 1. StatBadge Component ---
const StatBadge = ({ icon: Icon, label, count, total, color, active, onClick }) => {
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
        <div onClick={onClick} className={`cursor-pointer flex-1 min-w-[200px] p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between gap-4 ${active ? `bg-${color}-100 border-${color}-500 ring-4 ring-${color}-50` : 'bg-white border-gray-100 hover:border-orange-300 hover:shadow-xl'}`}>
            <div className={`p-3 rounded-2xl bg-${color}-100 text-${color}-600`}><Icon size={24} /></div>
            <div className="text-right">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">{label}</p>
                <p className="text-2xl font-black text-gray-800">{count} <span className="text-xs text-gray-300 font-bold">({percentage}%)</span></p>
            </div>
        </div>
    );
};

// --- 2. Company Modal (GPS, Dedupe & Tiers Locked) ---
const CompanyModal = ({ onClose, onSave, companyToEdit, existingCompanies = [] }) => {
    const [activeTab, setActiveTab] = useState('ACTIVITY');
    
    // Core Data
    const [companyName, setCompanyName] = useState(companyToEdit?.companyName || '');
    const [latitude, setLatitude] = useState(companyToEdit?.latitude || '');
    const [longitude, setLongitude] = useState(companyToEdit?.longitude || '');
    const [website, setWebsite] = useState(companyToEdit?.website || '');
    const [industry, setIndustry] = useState(companyToEdit?.industry || '');
    const [address, setAddress] = useState(companyToEdit?.address || '');
    const [tier, setTier] = useState(companyToEdit?.tier || 'STANDARD');
    
    // Flags
    const [isVerified, setIsVerified] = useState(companyToEdit?.isVerified || false);
    const [isTarget, setIsTarget] = useState(companyToEdit?.isTarget || false);
    const [isEmailed, setIsEmailed] = useState(companyToEdit?.isEmailed || false);
    const [isCustomer, setIsCustomer] = useState(companyToEdit?.isCustomer || false);
    
    // Logs
    const [notes, setNotes] = useState(companyToEdit?.notes || '');
    const [interactions, setInteractions] = useState(companyToEdit?.interactions || []);
    const [newLogOutcome, setNewLogOutcome] = useState('');

    // --- PRO MODE: REAL-TIME DEDUPLICATION ---
    const isDuplicate = useMemo(() => {
        if (companyToEdit) return false; // If editing, don't flag self as duplicate
        return existingCompanies.some(c => c.companyName?.toLowerCase().trim() === companyName.toLowerCase().trim());
    }, [companyName, existingCompanies, companyToEdit]);

    const handleAddInteraction = () => {
        if (!newLogOutcome) return;
        const newInteraction = { id: Date.now(), date: new Date().toISOString().split('T')[0], type: 'Log', outcome: newLogOutcome };
        setInteractions([newInteraction, ...interactions]);
        setNewLogOutcome('');
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl bg-white rounded-[40px] p-0 border-none">
                <div className="flex-1 p-8 overflow-y-auto border-r border-gray-100 space-y-6">
                    <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tighter">Account Profile</h2>
                    
                    {isDuplicate && (
                        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-center gap-3 text-red-600 animate-pulse">
                            <Copy size={20} /><p className="text-[10px] font-black uppercase tracking-widest">Duplicate Detected: Name already exists.</p>
                        </div>
                    )}

                    <div className="space-y-4">
                        <Input label="Company Name" value={companyName} onChange={e => setCompanyName(e.target.value)} />
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Pricing Tier</label>
                                <select value={tier} onChange={e => setTier(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 font-bold text-xs uppercase outline-none focus:border-orange-500 transition-all">
                                    {Object.entries(PRICING_TIERS).map(([key, t]) => (
                                        <option key={key} value={key}>{t.label} ({t.discount}% Off)</option>
                                    ))}
                                </select>
                            </div>
                            <Input label="Industry / Sector" value={industry} onChange={e => setIndustry(e.target.value)} />
                        </div>

                        <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 space-y-3">
                            <div className="flex justify-between items-center text-[10px] font-black text-blue-400 uppercase tracking-widest">
                                <span>Geolocation Data</span>
                                <MapPin size={12}/>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Latitude" value={latitude} onChange={e => setLatitude(e.target.value)} placeholder="00.0000" className="bg-white" />
                                <Input label="Longitude" value={longitude} onChange={e => setLongitude(e.target.value)} placeholder="00.0000" className="bg-white" />
                            </div>
                            <Textarea label="Physical Address" value={address} onChange={e => setAddress(e.target.value)} rows="2" className="bg-white" />
                        </div>

                        <div className="grid grid-cols-2 gap-2 p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
                            <Checkbox label="Account Verified" checked={isVerified} onChange={e => setIsVerified(e.target.checked)} />
                            <Checkbox label="Target Account" checked={isTarget} onChange={e => setIsTarget(e.target.checked)} />
                            <Checkbox label="Intro Emailed" checked={isEmailed} onChange={e => setIsEmailed(e.target.checked)} />
                            <Checkbox label={<span className="text-teal-700 font-bold">Existing Customer</span>} checked={isCustomer} onChange={e => setIsCustomer(e.target.checked)} />
                        </div>
                        
                        <Input label="Website" value={website} onChange={e => setWebsite(e.target.value)} />
                        <Textarea label="Internal Notes" value={notes} onChange={e => setNotes(e.target.value)} rows="2" />
                    </div>
                </div>

                <div className="flex-1 bg-slate-50 flex flex-col p-8">
                    <h3 className="text-xs font-black uppercase tracking-widest mb-4 text-slate-500">Activity Log</h3>
                    <div className="flex gap-2 mb-4">
                        <input type="text" value={newLogOutcome} onChange={e => setNewLogOutcome(e.target.value)} placeholder="Log call, email, or visit..." className="flex-1 p-3 border rounded-2xl text-sm shadow-sm" />
                        <Button onClick={handleAddInteraction} variant="primary"><PlusCircle size={24}/></Button>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                        {interactions.map((i, idx) => (
                            <div key={i.id || idx} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-sm text-gray-700 group relative hover:border-orange-200 transition-all">
                                <span className="absolute top-2 right-3 text-[9px] text-gray-300 font-black">{i.date}</span>
                                <p className="font-bold pr-4">{i.outcome}</p>
                            </div>
                        ))}
                    </div>
                    <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end gap-3">
                        <Button onClick={onClose} variant="secondary">Cancel</Button>
                        <Button onClick={() => onSave({ companyName, latitude, longitude, website, industry, address, tier, isVerified, isTarget, isEmailed, isCustomer, notes, interactions })} variant="primary" disabled={isDuplicate}>Save Account</Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

// --- 3. Main Page Logic ---
const CompaniesPage = ({ companies = [], user, quotes = [] }) => {
    const [showModal, setShowModal] = useState(false);
    const [editingCompany, setEditingCompany] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState(new Set());
    const fileInputRef = useRef(null);

    const activeCompanies = useMemo(() => companies.filter(c => !c.isDeleted), [companies]);

    const filtered = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return activeCompanies.filter(c => c.companyName?.toLowerCase().includes(term) || c.industry?.toLowerCase().includes(term));
    }, [activeCompanies, searchTerm]);

    // --- PRO MODE: CSV IMPORTER WITH DEDUPLICATION ---
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        Papa.parse(file, {
            header: true, skipEmptyLines: true,
            complete: async (results) => {
                const batch = writeBatch(db);
                let skipped = 0;
                results.data.forEach(row => {
                    const name = row.Company || row.CompanyName;
                    const exists = activeCompanies.some(c => c.companyName?.toLowerCase().trim() === name?.toLowerCase().trim());
                    if (!exists && name) {
                        const ref = doc(collection(db, "users", user.uid, "companies"));
                        batch.set(ref, { 
                            companyName: name, 
                            latitude: row.Latitude || '', 
                            longitude: row.Longitude || '', 
                            industry: row.Industry || '',
                            website: row.Website || '',
                            interactions: [], 
                            createdAt: serverTimestamp() 
                        });
                    } else {
                        skipped++;
                    }
                });
                await batch.commit();
                alert(`Import Complete. ${skipped} duplicates were skipped.`);
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

    const handleBulkDelete = async () => {
        if (!confirm(`Permanently delete ${selectedIds.size} accounts?`)) return;
        const batch = writeBatch(db);
        selectedIds.forEach(id => batch.update(doc(db, "users", user.uid, "companies", id), { isDeleted: true }));
        await batch.commit();
        setSelectedIds(new Set());
    };

    return (
        <div className="w-full space-y-8 pb-20">
            {showModal && <CompanyModal onClose={() => setShowModal(false)} onSave={handleSave} companyToEdit={editingCompany} existingCompanies={activeCompanies} />}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatBadge icon={Building} label="Total Accounts" count={activeCompanies.length} total={activeCompanies.length} color="gray" active={true} />
                <StatBadge icon={Handshake} label="Active Customers" count={activeCompanies.filter(c => c.isCustomer).length} total={activeCompanies.length} color="teal" />
                <StatBadge icon={UserCheck} label="Verified Entries" count={activeCompanies.filter(c => c.isVerified).length} total={activeCompanies.length} color="blue" />
            </div>

            <div className="flex justify-between items-center bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
                <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tighter">Directory ({filtered.length})</h2>
                <div className="flex gap-2">
                    <Button onClick={() => fileInputRef.current.click()} variant="secondary"><Upload size={18} className="mr-2"/> Import CSV</Button>
                    <Button onClick={() => { setEditingCompany(null); setShowModal(true); }} variant="primary" className="bg-orange-600 px-8 rounded-2xl border-none shadow-lg shadow-orange-100"><Plus size={18} className="mr-2"/> Add Account</Button>
                </div>
            </div>

            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
            
            <div className="relative">
                <Input placeholder="Search directory by name or industry..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-14 py-5 rounded-[30px] text-lg shadow-sm border-gray-100" />
                <Search size={24} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filtered.map(c => (
                    <Card key={c.id} className={`p-8 rounded-[40px] bg-white border-2 transition-all group relative ${selectedIds.has(c.id) ? 'border-orange-500 ring-4 ring-orange-50' : 'border-transparent hover:border-orange-200'}`}>
                        <div className="absolute top-8 left-8">
                            <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => {
                                const next = new Set(selectedIds);
                                next.has(c.id) ? next.delete(c.id) : next.add(c.id);
                                setSelectedIds(next);
                            }} className="w-6 h-6 accent-orange-600 cursor-pointer" />
                        </div>
                        <div className="pl-12">
                            <div className="flex justify-between items-start mb-4">
                                <div className="truncate pr-4">
                                    <h4 className="font-black text-2xl text-gray-800 uppercase tracking-tighter truncate leading-none mb-1">{c.companyName}</h4>
                                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">{c.industry || 'Account'}</p>
                                </div>
                                <button onClick={() => { setEditingCompany(c); setShowModal(true); }} className="p-3 text-gray-300 hover:text-orange-600 hover:bg-orange-50 rounded-full transition-all"><Edit size={20}/></button>
                            </div>
                            
                            <div className="flex gap-2 mt-6">
                                <Button onClick={() => { setEditingCompany(c); setShowModal(true); }} variant="secondary" className="flex-1 py-3 text-[9px] font-black uppercase rounded-2xl tracking-widest">View Profile</Button>
                                {c.latitude && c.longitude && (
                                    <button onClick={() => window.open(`https://www.google.com/maps?q=${c.latitude},${c.longitude}`, '_blank')} className="px-4 border-2 border-gray-100 rounded-2xl hover:border-orange-400 text-orange-600 transition-all">
                                        <MapIcon size={20}/>
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="mt-8 pt-5 border-t border-gray-50 grid grid-cols-4 gap-2 text-[8px] text-gray-400 text-center font-black uppercase tracking-tighter">
                            <div className={`p-2 rounded-2xl transition-all ${c.isCustomer ? 'bg-teal-50 text-teal-700 shadow-sm' : ''}`}><Handshake size={16} className="mx-auto mb-1"/> Cust</div>
                            <div className={`p-2 rounded-2xl transition-all ${quotes.some(q => q.customer?.name === c.companyName) ? 'bg-orange-50 text-orange-700 shadow-sm' : ''}`}><CheckSquare size={16} className="mx-auto mb-1"/> Quot</div>
                            <div className={`p-2 rounded-2xl transition-all ${c.isEmailed ? 'bg-purple-50 text-purple-700 shadow-sm' : ''}`}><Mail size={16} className="mx-auto mb-1"/> Mail</div>
                            <div className={`p-2 rounded-2xl transition-all ${c.isVerified ? 'bg-green-50 text-green-700 shadow-sm' : ''}`}><UserCheck size={16} className="mx-auto mb-1"/> Verf</div>
                        </div>
                    </Card>
                ))}
            </div>

            {selectedIds.size > 0 && (
                <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-10 py-5 rounded-full shadow-2xl flex items-center gap-10 z-50">
                    <span className="font-black text-sm uppercase">{selectedIds.size} Selected</span>
                    <button onClick={handleBulkDelete} className="flex items-center gap-2 hover:text-red-400 transition-colors font-black text-xs uppercase"><Trash2 size={20} /> Delete Selected</button>
                    <button onClick={() => setSelectedIds(new Set())} className="text-gray-400 hover:text-white"><X size={20}/></button>
                </div>
            )}
        </div>
    );
};

export default CompaniesPage;
