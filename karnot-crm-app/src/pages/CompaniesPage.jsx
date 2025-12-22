import React, { useState, useRef, useMemo } from 'react'; 
import { db } from '../firebase'; 
import { collection, addDoc, serverTimestamp, doc, updateDoc, writeBatch } from "firebase/firestore";
import Papa from 'papaparse'; 
import { 
    Plus, X, Edit, Trash2, Building, Upload, Search, 
    CheckSquare, FileText, UserCheck, Mail, PlusCircle, 
    ExternalLink, Download, Send, Handshake, Map as MapIcon, Copy,
    Navigation, Target, Globe, User, Phone // <--- Added User and Phone here
} from 'lucide-react';
import { Card, Button, Input, Textarea, Checkbox, PRICING_TIERS } from '../data/constants.jsx';

// ... [Keep Helper: Open Website, Distance Calculator, StatBadge, ProximitySearch as they are] ...

// --- 2. Company Modal Component (UPDATED) ---
const CompanyModal = ({ onClose, onSave, companyToEdit, quotes = [], contacts = [], onOpenQuote, existingCompanies = [] }) => {
    const [activeTab, setActiveTab] = useState('ACTIVITY');
    
    // Form State
    const [companyName, setCompanyName] = useState(companyToEdit?.companyName || '');
    const [website, setWebsite] = useState(companyToEdit?.website || '');
    const [industry, setIndustry] = useState(companyToEdit?.industry || '');
    const [address, setAddress] = useState(companyToEdit?.address || '');
    const [latitude, setLatitude] = useState(companyToEdit?.latitude || '');
    const [longitude, setLongitude] = useState(companyToEdit?.longitude || '');
    const [tier, setTier] = useState(companyToEdit?.tier || 'STANDARD');
    const [isVerified, setIsVerified] = useState(companyToEdit?.isVerified || false);
    const [isTarget, setIsTarget] = useState(companyToEdit?.isTarget || false);
    const [isEmailed, setIsEmailed] = useState(companyToEdit?.isEmailed || false);
    const [isCustomer, setIsCustomer] = useState(companyToEdit?.isCustomer || false);
    const [notes, setNotes] = useState(companyToEdit?.notes || '');
    const [interactions, setInteractions] = useState(companyToEdit?.interactions || []);
    
    // Log State
    const [newLogType, setNewLogType] = useState('Call');
    const [newLogOutcome, setNewLogOutcome] = useState('');
    const [newLogDate, setNewLogDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedQuoteId, setSelectedQuoteId] = useState('');

    // DEDUPLICATION
    const isDuplicate = useMemo(() => {
        if (companyToEdit) return false;
        return existingCompanies.some(c => 
            c.companyName.toLowerCase().trim() === companyName.toLowerCase().trim()
        );
    }, [companyName, existingCompanies, companyToEdit]);

    // --- LINKING LOGIC ---
    const targetName = (companyName || '').toLowerCase().trim();
    
    // 1. Link Quotes
    const relevantQuotes = (quotes || []).filter(q => 
        (q.customer?.name || '').toLowerCase().includes(targetName)
    );

    // 2. Link Contacts (NEW LOGIC)
    const relatedContacts = useMemo(() => {
        if (!contacts || !companyToEdit) return [];
        return contacts.filter(c => 
            // Check by ID first (Best match), fallback to Name match
            c.companyId === companyToEdit.id || 
            (c.companyName && c.companyName.toLowerCase().trim() === targetName)
        );
    }, [contacts, companyToEdit, targetName]);

    const handleAddInteraction = () => {
        if (!newLogOutcome) return;
        let linkedQuote = null;
        if (selectedQuoteId) {
            linkedQuote = relevantQuotes.find(rq => rq.id === selectedQuoteId);
        }
        const newInteraction = { 
            id: Date.now(), 
            date: newLogDate, 
            type: newLogType, 
            outcome: newLogOutcome, 
            linkedQuote 
        };
        setInteractions([newInteraction, ...interactions].sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        ));
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
                
                {/* LEFT PANEL - Data Entry */}
                <div className="flex-1 p-8 overflow-y-auto border-r border-gray-100 space-y-6">
                    <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tighter">
                        {companyToEdit ? 'Edit Account' : 'New Account'}
                    </h2>
                    
                    {isDuplicate && (
                        <div className="bg-red-50 border border-red-200 p-3 rounded-xl flex items-center gap-3 text-red-600 animate-pulse">
                            <Copy size={18} />
                            <p className="text-xs font-black uppercase">Company already exists in directory.</p>
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
                        
                        <div className="flex items-end gap-2">
                            <div className="flex-1">
                                <Input label="Website" value={website} onChange={e => setWebsite(e.target.value)} />
                            </div>
                            {website && (
                                <Button onClick={() => openWebsite(website)} variant="secondary" className="h-[46px] w-[46px] !p-0 flex items-center justify-center bg-blue-50 text-blue-600 border-blue-200">
                                    <ExternalLink size={20} />
                                </Button>
                            )}
                        </div>
                        
                        <div className="space-y-2">
                            <Textarea label="Address" value={address} onChange={e => setAddress(e.target.value)} rows="2" />
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                                <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase">
                                    <span>GPS Site Location</span>
                                    {(latitude || longitude || address) && (
                                        <button onClick={openInGoogleMaps} type="button" className="text-blue-600 hover:underline flex items-center gap-1">
                                            VIEW ON MAP <ExternalLink size={10}/>
                                        </button>
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

                {/* RIGHT PANEL - Activity, Quotes, & People */}
                <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden">
                    <div className="flex border-b bg-white">
                        <button onClick={() => setActiveTab('ACTIVITY')} className={`flex-1 py-5 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ACTIVITY' ? 'text-orange-600 border-b-4 border-orange-600' : 'text-gray-400'}`}>
                            Activity
                        </button>
                        <button onClick={() => setActiveTab('DATA')} className={`flex-1 py-5 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'DATA' ? 'text-blue-600 border-b-4 border-blue-600' : 'text-gray-400'}`}>
                            Quotes ({relevantQuotes.length})
                        </button>
                        <button onClick={() => setActiveTab('PEOPLE')} className={`flex-1 py-5 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'PEOPLE' ? 'text-teal-600 border-b-4 border-teal-600' : 'text-gray-400'}`}>
                            People ({relatedContacts.length})
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6">
                        {activeTab === 'ACTIVITY' && (
                            <div className="space-y-4">
                                <div className="bg-white p-4 rounded-2xl border shadow-sm space-y-3">
                                    <div className="flex gap-2">
                                        <Input type="date" value={newLogDate} onChange={e => setNewLogDate(e.target.value)} className="text-xs" />
                                        <select value={newLogType} onChange={e => setNewLogType(e.target.value)} className="text-xs border rounded-xl p-2 flex-1 font-black uppercase bg-gray-50">
                                            <option value="Call">Call</option>
                                            <option value="Visit">Site Visit</option>
                                            <option value="Email">Email</option>
                                        </select>
                                    </div>
                                    {relevantQuotes.length > 0 && (
                                        <select value={selectedQuoteId} onChange={e => setSelectedQuoteId(e.target.value)} className="w-full text-[10px] border p-2 rounded-xl font-bold uppercase bg-white">
                                            <option value="">Attach Quote Link (Optional)</option>
                                            {relevantQuotes.map(q => (
                                                <option key={q.id} value={q.id}>{q.id} - ${q.finalSalesPrice?.toLocaleString()}</option>
                                            ))}
                                        </select>
                                    )}
                                    <div className="flex gap-2">
                                        <input type="text" value={newLogOutcome} onChange={e => setNewLogOutcome(e.target.value)} placeholder="Summary..." className="flex-1 text-sm p-2.5 border rounded-xl" />
                                        <Button onClick={handleAddInteraction} variant="primary"><PlusCircle size={20}/></Button>
                                    </div>
                                </div>
                                {interactions.map(log => (
                                    <div key={log.id} className="bg-white p-4 rounded-2xl border shadow-sm group relative">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full text-white uppercase tracking-widest ${log.type === 'Visit' ? 'bg-green-500' : log.type === 'Email' ? 'bg-purple-500' : 'bg-blue-500'}`}>{log.type}</span>
                                            <span className="text-[10px] text-gray-400 font-bold">{log.date}</span>
                                        </div>
                                        <p className="text-sm text-gray-700 font-bold">{log.outcome}</p>
                                        {log.linkedQuote && (
                                            <button type="button" onClick={() => onOpenQuote(log.linkedQuote)} className="mt-2 flex items-center gap-1.5 text-blue-600 bg-blue-50 p-1.5 rounded-lg border border-blue-100 hover:bg-blue-100 transition-all">
                                                <FileText size={12}/>
                                                <span className="text-[9px] font-black uppercase">Ref: {log.linkedQuote.id}</span>
                                                <ExternalLink size={10}/>
                                            </button>
                                        )}
                                        <button onClick={() => setInteractions(interactions.filter(i => i.id !== log.id))} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12}/></button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'DATA' && (
                            <div className="space-y-2">
                                {relevantQuotes.length === 0 ? (
                                    <p className="text-center text-gray-400 text-sm font-bold py-8">No quotes found for this company</p>
                                ) : (
                                    relevantQuotes.map(q => (
                                        <div key={q.id} onClick={() => onOpenQuote(q)} className="flex justify-between items-center p-4 border rounded-2xl bg-white hover:border-orange-500 cursor-pointer group transition-all">
                                            <span className="font-black text-xs text-gray-800">{q.id}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-orange-600 font-black">${q.finalSalesPrice?.toLocaleString()}</span>
                                                <ExternalLink size={12} className="text-gray-300 group-hover:text-orange-500"/>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'PEOPLE' && (
                            <div className="space-y-3">
                                {relatedContacts.length === 0 ? (
                                    <div className="text-center py-8">
                                        <User size={48} className="mx-auto text-gray-200 mb-2"/>
                                        <p className="text-gray-400 text-sm font-bold">No contacts linked yet.</p>
                                        <p className="text-[10px] text-gray-400">Add contacts via the Contacts tab and search for "{companyName}".</p>
                                    </div>
                                ) : (
                                    relatedContacts.map(c => (
                                        <div key={c.id} className="p-4 bg-white border border-gray-200 rounded-2xl hover:border-teal-400 transition-all">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-bold text-gray-800">{c.firstName} {c.lastName}</h4>
                                                    <p className="text-xs text-teal-600 font-bold uppercase">{c.jobTitle || 'No Title'}</p>
                                                </div>
                                                {c.phone && (
                                                    <a href={`tel:${c.phone}`} className="p-2 bg-gray-50 rounded-full text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors">
                                                        <Phone size={14} />
                                                    </a>
                                                )}
                                            </div>
                                            <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                                                <Mail size={12} />
                                                <span>{c.email || 'No Email'}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                    
                    <div className="p-6 bg-white border-t flex justify-end gap-3">
                        <Button onClick={onClose} variant="secondary">Cancel</Button>
                        <Button onClick={() => onSave({ companyName, website, industry, address, latitude, longitude, tier, isVerified, isTarget, isEmailed, isCustomer, notes, interactions })} variant="primary" disabled={isDuplicate && !companyToEdit}>
                            Save Changes
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

// --- 3. Main Page Component ---
const CompaniesPage = ({ companies = [], user, quotes = [], contacts = [], onOpenQuote }) => {
    // ... [No changes needed to the state variables here] ...
    const [showModal, setShowModal] = useState(false);
    const [editingCompany, setEditingCompany] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('ALL');
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [isImporting, setIsImporting] = useState(false);
    const [showProximitySearch, setShowProximitySearch] = useState(false);
    const fileInputRef = useRef(null);

    const activeCompanies = useMemo(() => (companies || []).filter(c => !c.isDeleted), [companies]);

    // ... [Keep Stats, Filtered Logic, Bulk Export/Email/Delete, CSV Import as is] ...
    const stats = useMemo(() => ({
        total: activeCompanies.length,
        targets: activeCompanies.filter(c => c.isTarget).length,
        customers: activeCompanies.filter(c => c.isCustomer).length,
    }), [activeCompanies]);

    const filtered = useMemo(() => {
        const term = searchTerm.toLowerCase();
        let list = activeCompanies.filter(c => 
            c.companyName.toLowerCase().includes(term) || 
            (c.industry || '').toLowerCase().includes(term) || 
            (c.notes || '').toLowerCase().includes(term)
        );
        if (activeFilter === 'TARGETS') list = list.filter(c => c.isTarget);
        if (activeFilter === 'CUSTOMERS') list = list.filter(c => c.isCustomer);
        return list;
    }, [activeCompanies, searchTerm, activeFilter]);

    const checkHasQuotes = (compName) => quotes.some(q => (q.customer?.name || '').toLowerCase().includes(compName?.toLowerCase().trim()));

    // ... [Paste your handleBulkExport, handleBulkEmail, handleBulkDelete, handleFileChange, toggleSelection functions here exactly as they were] ...
    const handleBulkExport = () => { /* ... existing code ... */ }; // Placeholder for brevity
    const handleBulkEmail = () => { /* ... existing code ... */ };
    const handleBulkDelete = async () => { /* ... existing code ... */ };
    const handleFileChange = (e) => { /* ... existing code ... */ };
    const toggleSelection = (id) => { /* ... existing code ... */ };

    const handleSave = async (data) => {
        if (!user) return;
        if (editingCompany) {
            await updateDoc(doc(db, "users", user.uid, "companies", editingCompany.id), { ...data, lastModified: serverTimestamp() });
        } else {
            await addDoc(collection(db, "users", user.uid, "companies"), { ...data, createdAt: serverTimestamp() });
        }
        setShowModal(false);
        setEditingCompany(null);
    };

    return (
        <div className="w-full space-y-6">
            {/* COMPANY MODAL */}
            {showModal && (
                <CompanyModal 
                    onClose={() => { setShowModal(false); setEditingCompany(null); }} 
                    onSave={handleSave} 
                    companyToEdit={editingCompany} 
                    quotes={quotes} 
                    contacts={contacts} // <--- THIS WAS THE MISSING LINK!
                    onOpenQuote={onOpenQuote}
                    existingCompanies={activeCompanies}
                />
            )}

            {/* ... [Rest of the Component: ProximitySearch, StatBadges, Header, Search, CardGrid, BulkActions - Exact same as before] ... */}
            {/* COPY AND PASTE THE REST OF YOUR RETURN STATEMENT FROM YOUR ORIGINAL CODE HERE */}
            {showProximitySearch && (
                <ProximitySearch
                    companies={activeCompanies}
                    onSelectCompany={(company) => {
                        setEditingCompany(company);
                        setShowProximitySearch(false);
                        setShowModal(true);
                    }}
                    onClose={() => setShowProximitySearch(false)}
                />
            )}
             
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
               {/* ... Stat Badges ... */} 
               <StatBadge icon={Building} label="Total Directory" count={stats.total} total={stats.total} color="gray" active={activeFilter === 'ALL'} onClick={() => setActiveFilter('ALL')} />
               <StatBadge icon={Handshake} label="Existing Customers" count={stats.customers} total={stats.total} color="teal" active={activeFilter === 'CUSTOMERS'} onClick={() => setActiveFilter('CUSTOMERS')} />
               <StatBadge icon={CheckSquare} label="Targets" count={stats.targets} total={stats.total} color="purple" active={activeFilter === 'TARGETS'} onClick={() => setActiveFilter('TARGETS')} />
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">
                    Directory ({filtered.length})
                    <button onClick={() => setSelectedIds(selectedIds.size === filtered.length ? new Set() : new Set(filtered.map(c => c.id)))} className="text-xs font-bold text-orange-600 underline ml-2">
                        {selectedIds.size === filtered.length ? 'Deselect' : 'Select'} All
                    </button>
                </h2>
                <div className="flex gap-2 w-full md:w-auto flex-wrap">
                    <Button onClick={() => setShowProximitySearch(true)} variant="secondary" className="bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"><Navigation size={16} className="mr-1"/> Nearby</Button>
                    <Button onClick={() => fileInputRef.current.click()} variant="secondary" disabled={isImporting}><Upload size={16} className="mr-1"/> {isImporting ? 'Importing...' : 'Import CSV'}</Button>
                    <Button onClick={() => { setEditingCompany(null); setShowModal(true); }} variant="primary"><Plus size={16} className="mr-1"/> New Account</Button>
                </div>
            </div>

            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />

            <div className="relative">
                <Input placeholder="Search accounts, sector, or notes..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
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
                            <div className="flex gap-2 mb-4">
                                <Button onClick={() => { setEditingCompany(c); setShowModal(true); }} variant="secondary" className="flex-1 !py-2 text-[9px] font-black uppercase tracking-widest">View History</Button>
                                {c.website && (
                                    <button onClick={() => openWebsite(c.website)} className="px-3 border border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 text-blue-600 transition-all" title="Visit Website"><Globe size={16}/></button>
                                )}
                                {c.latitude && c.longitude && (
                                    <button onClick={() => window.open(`https://www.google.com/maps?q=${c.latitude},${c.longitude}`, '_blank')} className="px-3 border border-gray-200 rounded-xl hover:bg-orange-50 hover:border-orange-300 text-orange-600 transition-all" title="Open in Google Maps"><MapIcon size={16}/></button>
                                )}
                            </div>
                        </div>
                        <div className="pt-3 border-t grid grid-cols-4 gap-1 text-[8px] text-gray-500 text-center font-black">
                            <div className={`p-1 rounded uppercase ${c.isCustomer ? 'bg-teal-50 text-teal-700' : ''}`}><Handshake size={14} className={`mx-auto mb-1 ${c.isCustomer ? 'text-teal-600' : 'text-gray-300'}`}/> Customer</div>
                            <div className={`p-1 rounded uppercase ${checkHasQuotes(c.companyName) ? 'bg-orange-50 text-orange-700' : ''}`}><CheckSquare size={14} className={`mx-auto mb-1 ${checkHasQuotes(c.companyName) ? 'text-orange-600' : 'text-gray-300'}`}/> Quoted</div>
                            <div className={`p-1 rounded uppercase ${c.isEmailed ? 'bg-purple-50 text-purple-700' : ''}`}><Mail size={14} className={`mx-auto mb-1 ${c.isEmailed ? 'text-purple-600' : 'text-gray-300'}`}/> Emailed</div>
                            <div className={`p-1 rounded uppercase ${c.isVerified ? 'bg-green-50 text-green-700' : ''}`}><UserCheck size={14} className={`mx-auto mb-1 ${c.isVerified ? 'text-green-600' : 'text-gray-300'}`}/> Verified</div>
                        </div>
                    </Card>
                ))}
            </div>
            
            {/* KEEP BULK ACTION BAR */}
        </div>
    );
};

export default CompaniesPage;
