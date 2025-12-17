import React, { useState, useRef, useMemo, useEffect } from 'react'; 
import { db } from '../firebase'; 
import { collection, addDoc, serverTimestamp, doc, setDoc, deleteDoc, writeBatch, updateDoc } from "firebase/firestore";
import Papa from 'papaparse'; 
import { 
    Plus, X, Edit, Trash2, Building, Globe, Upload, Search, 
    MapPin, CheckSquare, Clock, FileText, 
    Link as LinkIcon, UserCheck, Mail, PlusCircle, ExternalLink, Download, Send
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

// --- 2. CompanyModal Component (With Clickable Quotes & Full Log) ---
const CompanyModal = ({ onClose, onSave, companyToEdit, quotes = [], onOpenQuote }) => {
    const [activeTab, setActiveTab] = useState('ACTIVITY');
    const [companyName, setCompanyName] = useState(companyToEdit?.companyName || '');
    const [website, setWebsite] = useState(companyToEdit?.website || '');
    const [industry, setIndustry] = useState(companyToEdit?.industry || '');
    const [address, setAddress] = useState(companyToEdit?.address || '');
    const [tier, setTier] = useState(companyToEdit?.tier || 'STANDARD');
    const [isVerified, setIsVerified] = useState(companyToEdit?.isVerified || false);
    const [isTarget, setIsTarget] = useState(companyToEdit?.isTarget || false);
    const [isEmailed, setIsEmailed] = useState(companyToEdit?.isEmailed || false);
    const [notes, setNotes] = useState(companyToEdit?.notes || '');
    const [interactions, setInteractions] = useState(companyToEdit?.interactions || []);
    const [newLogType, setNewLogType] = useState('Call');
    const [newLogOutcome, setNewLogOutcome] = useState('');
    const [newLogDate, setNewLogDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedQuoteId, setSelectedQuoteId] = useState('');

    const targetName = (companyName || '').toLowerCase().trim();
    const relevantQuotes = (quotes || []).filter(q => (q.customer?.name || '').toLowerCase().includes(targetName));

    const handleAddInteraction = () => {
        if (!newLogOutcome) return;
        let linkedQuote = null;
        if (selectedQuoteId) {
            linkedQuote = relevantQuotes.find(rq => rq.id === selectedQuoteId);
        }
        const newInteraction = { id: Date.now(), date: newLogDate, type: newLogType, outcome: newLogOutcome, linkedQuote };
        setInteractions([newInteraction, ...interactions].sort((a, b) => new Date(b.date) - new Date(a.date)));
        setNewLogOutcome('');
        setSelectedQuoteId('');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <Card className="w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl bg-white rounded-xl p-0">
                <div className="flex-1 p-6 overflow-y-auto border-r border-gray-100 space-y-4">
                    <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">{companyToEdit ? 'Edit Account' : 'New Account'}</h2>
                    <Input label="Company Name" value={companyName} onChange={e => setCompanyName(e.target.value)} />
                    <select value={tier} onChange={e => setTier(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md bg-white font-black uppercase text-xs">
                        {Object.entries(PRICING_TIERS).map(([key, t]) => (
                            <option key={key} value={key}>{t.label} ({t.discount}% Off)</option>
                        ))}
                    </select>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Website" value={website} onChange={e => setWebsite(e.target.value)} />
                        <Input label="Industry" value={industry} onChange={e => setIndustry(e.target.value)} />
                    </div>
                    <Textarea label="Address" value={address} onChange={e => setAddress(e.target.value)} rows="2" />
                    <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50 rounded-lg border">
                        <Checkbox label="Verified" checked={isVerified} onChange={e => setIsVerified(e.target.checked)} />
                        <Checkbox label="Target" checked={isTarget} onChange={e => setIsTarget(e.target.checked)} />
                        <Checkbox label="Emailed" checked={isEmailed} onChange={e => setIsEmailed(e.target.checked)} />
                    </div>
                    <Textarea label="General Notes" value={notes} onChange={e => setNotes(e.target.value)} rows="3" />
                </div>
                <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden">
                    <div className="flex border-b bg-white">
                        <button onClick={() => setActiveTab('ACTIVITY')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest ${activeTab === 'ACTIVITY' ? 'text-orange-600 border-b-4 border-orange-600' : 'text-gray-400'}`}>Activity Log</button>
                        <button onClick={() => setActiveTab('DATA')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest ${activeTab === 'DATA' ? 'text-blue-600 border-b-4 border-blue-600' : 'text-gray-400'}`}>Linked Quotes ({relevantQuotes.length})</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                        {activeTab === 'ACTIVITY' ? (
                            <div className="space-y-4">
                                <div className="bg-white p-3 rounded border space-y-2 shadow-sm">
                                    <div className="flex gap-2">
                                        <Input type="date" value={newLogDate} onChange={e => setNewLogDate(e.target.value)} className="text-xs" />
                                        <select value={newLogType} onChange={e => setNewLogType(e.target.value)} className="text-xs border rounded p-1 flex-1 font-black uppercase bg-gray-50">
                                            <option value="Call">Call</option><option value="Visit">Site Visit</option><option value="Email">Email</option>
                                        </select>
                                    </div>
                                    {relevantQuotes.length > 0 && (
                                        <select value={selectedQuoteId} onChange={e => setSelectedQuoteId(e.target.value)} className="w-full text-[10px] border p-1 rounded font-black uppercase">
                                            <option value="">Attach Quote Link (Optional)</option>
                                            {relevantQuotes.map(q => <option key={q.id} value={q.id}>{q.id} - ${q.finalSalesPrice?.toLocaleString()}</option>)}
                                        </select>
                                    )}
                                    <div className="flex gap-2">
                                        <input type="text" value={newLogOutcome} onChange={e => setNewLogOutcome(e.target.value)} placeholder="Summary..." className="flex-1 text-sm p-2 border rounded" />
                                        <Button onClick={handleAddInteraction} variant="primary"><PlusCircle size={20}/></Button>
                                    </div>
                                </div>
                                {interactions.map(log => (
                                    <div key={log.id} className="bg-white p-4 rounded-xl border shadow-sm group relative">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full text-white uppercase tracking-widest ${log.type === 'Visit' ? 'bg-green-500' : 'bg-blue-500'}`}>{log.type}</span>
                                            <span className="text-[10px] text-gray-400 font-bold">{log.date}</span>
                                        </div>
                                        <p className="text-sm text-gray-700 font-bold">{log.outcome}</p>
                                        {log.linkedQuote && (
                                            <button type="button" onClick={() => onOpenQuote(log.linkedQuote)} className="mt-2 flex items-center gap-1.5 text-blue-600 bg-blue-50 p-1.5 rounded-lg border border-blue-100 hover:bg-blue-100">
                                                <FileText size={12}/><span className="text-[9px] font-black uppercase">Ref: {log.linkedQuote.id}</span><ExternalLink size={10}/>
                                            </button>
                                        )}
                                        <button onClick={() => setInteractions(interactions.filter(i => i.id !== log.id))} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12}/></button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {relevantQuotes.map(q => (
                                    <div key={q.id} onClick={() => onOpenQuote(q)} className="flex justify-between items-center p-3 border rounded-xl bg-white hover:border-orange-500 cursor-pointer group">
                                        <span className="font-black text-xs text-gray-800">{q.id}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-orange-600 font-black">${q.finalSalesPrice?.toLocaleString()}</span>
                                            <ExternalLink size={12} className="text-gray-300 group-hover:text-orange-500"/>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="p-4 bg-white border-t flex justify-end gap-2">
                        <Button onClick={onClose} variant="secondary">Cancel</Button>
                        <Button onClick={() => onSave({ companyName, website, industry, address, tier, isVerified, isTarget, isEmailed, notes, interactions })} variant="primary">Save Changes</Button>
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
        emailed: activeCompanies.filter(c => c.isEmailed).length,
    }), [activeCompanies]);

    const filtered = useMemo(() => {
        const term = searchTerm.toLowerCase();
        let list = activeCompanies.filter(c => 
            c.companyName.toLowerCase().includes(term) || 
            (c.industry || '').toLowerCase().includes(term)
        );
        if (activeFilter === 'TARGETS') list = list.filter(c => c.isTarget);
        if (activeFilter === 'EMAILED') list = list.filter(c => c.isEmailed);
        return list;
    }, [activeCompanies, searchTerm, activeFilter]);

    const checkHasQuotes = (compName) => quotes.some(q => (q.customer?.name || '').toLowerCase().includes(compName?.toLowerCase().trim()));

    // --- BULK ACTION HANDLERS ---
    const handleBulkEmail = () => {
        const selected = activeCompanies.filter(c => selectedIds.has(c.id) && c.phone); // Assuming 'phone' or adding 'email' logic
        alert("Email function ready for selection.");
    };

    const handleBulkExport = () => {
        const selected = activeCompanies.filter(c => selectedIds.has(c.id));
        const exportData = selected.map(c => ({
            "Company": c.companyName,
            "Industry": c.industry,
            "Website": c.website,
            "Phone": c.phone,
            "Verified": c.isVerified ? 'YES' : 'NO'
        }));
        const csv = Papa.unparse(exportData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.setAttribute("href", URL.createObjectURL(blob));
        link.setAttribute("download", `karnot_companies_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

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
                    const ref = doc(collection(db, "users", user.uid, "companies"));
                    batch.set(ref, { 
                        companyName: row.Company || row.CompanyName || 'New Co', 
                        industry: row.Industry || '', 
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

    const toggleSelection = (id) => {
        const newSet = new Set(selectedIds);
        newSet.has(id) ? newSet.delete(id) : newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleSave = async (data) => {
        if (!user) return;
        if (editingCompany) {
            await updateDoc(doc(db, "users", user.uid, "companies", editingCompany.id), { ...data, lastModified: serverTimestamp() });
        } else {
            await addDoc(collection(db, "users", user.uid, "companies"), { ...data, createdAt: serverTimestamp() });
        }
        setShowModal(false); setEditingCompany(null);
    };

    return (
        <div className="w-full space-y-6">
            {showModal && <CompanyModal onClose={() => setShowModal(false)} onSave={handleSave} companyToEdit={editingCompany} quotes={quotes} onOpenQuote={onOpenQuote} />}
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatBadge icon={Building} label="Total Accounts" count={stats.total} total={stats.total} color="gray" active={activeFilter === 'ALL'} onClick={() => setActiveFilter('ALL')} />
                <StatBadge icon={CheckSquare} label="Targets" count={stats.targets} total={stats.total} color="purple" active={activeFilter === 'TARGETS'} onClick={() => setActiveFilter('TARGETS')} />
                <StatBadge icon={Mail} label="Emailed" count={stats.emailed} total={stats.total} color="blue" active={activeFilter === 'EMAILED'} onClick={() => setActiveFilter('EMAILED')} />
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">Directory ({filtered.length}) <button onClick={() => setSelectedIds(selectedIds.size === filtered.length ? new Set() : new Set(filtered.map(c => c.id)))} className="text-xs font-bold text-orange-600 underline ml-2">{selectedIds.size === filtered.length ? 'Deselect' : 'Select'} All</button></h2>
                <div className="flex gap-2 w-full md:w-auto">
                    <Button onClick={() => fileInputRef.current.click()} variant="secondary" disabled={isImporting}><Upload size={16} className="mr-1"/> Import</Button>
                    <Button onClick={() => { setEditingCompany(null); setShowModal(true); }} variant="primary"><Plus size={16} className="mr-1"/> New Account</Button>
                </div>
            </div>

            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />

            <div className="relative">
                <Input placeholder="Search accounts, industry, or notes..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map(c => (
                    <Card key={c.id} className={`p-5 rounded-2xl border-gray-100 hover:border-orange-400 transition-all bg-white relative ${selectedIds.has(c.id) ? 'ring-2 ring-orange-500 border-orange-500 bg-orange-50' : ''}`}>
                        <div className="absolute top-4 left-4 z-10">
                            <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleSelection(c.id)} className="w-5 h-5 text-orange-600 rounded border-gray-300 focus:ring-orange-500 cursor-pointer" />
                        </div>
                        <div className="pl-8">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="font-black text-lg text-gray-800 uppercase tracking-tight">{c.companyName}</h4>
                                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">{c.industry || 'Account'}</p>
                                </div>
                                <button onClick={() => { setEditingCompany(c); setShowModal(true); }} className="p-2 text-gray-300 hover:text-indigo-600"><Edit size={16}/></button>
                            </div>
                            <Button onClick={() => { setEditingCompany(c); setShowModal(true); }} variant="secondary" className="w-full !py-2 text-[9px] font-black uppercase tracking-widest mb-4">View History</Button>
                        </div>
                        <div className="pt-3 border-t grid grid-cols-3 gap-1 text-[9px] text-gray-500 text-center font-black">
                            <div className={`p-1 rounded uppercase tracking-tighter ${c.isVerified ? 'bg-green-50 text-green-700 font-black' : ''}`}><UserCheck size={14} className={`mx-auto mb-1 ${c.isVerified ? 'text-green-600' : 'text-gray-300'}`}/> Verified</div>
                            <div className={`p-1 rounded uppercase tracking-tighter ${c.isEmailed ? 'bg-purple-50 text-purple-700 font-black' : ''}`}><Mail size={14} className={`mx-auto mb-1 ${c.isEmailed ? 'text-purple-600' : 'text-gray-300'}`}/> Emailed</div>
                            <div className={`p-1 rounded uppercase tracking-tighter ${checkHasQuotes(c.companyName) ? 'bg-orange-50 text-orange-700 font-black' : ''}`}><CheckSquare size={14} className={`mx-auto mb-1 ${checkHasQuotes(c.companyName) ? 'text-orange-600' : 'text-gray-300'}`}/> Quoted</div>
                        </div>
                    </Card>
                ))}
            </div>

            {selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 z-50 animate-in fade-in slide-in-from-bottom-4">
                    <span className="font-bold text-sm">{selectedIds.size} Selected</span>
                    <button onClick={handleBulkEmail} className="flex items-center gap-2 hover:text-orange-400 transition-colors"><Send size={18} /><span className="text-sm font-bold">Email</span></button>
                    <button onClick={handleBulkExport} className="flex items-center gap-2 hover:text-green-400 transition-colors"><Download size={18} /><span className="text-sm font-bold">Export</span></button>
                    <button onClick={handleBulkDelete} className="flex items-center gap-2 hover:text-red-400 transition-colors"><Trash2 size={18} /><span className="text-sm font-bold">Delete</span></button>
                    <button onClick={() => setSelectedIds(new Set())} className="ml-2 text-gray-400 hover:text-white"><X size={18}/></button>
                </div>
            )}
        </div>
    );
};

export default CompaniesPage;
