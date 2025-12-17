import React, { useState, useRef, useMemo, useEffect } from 'react'; 
import { db } from '../firebase'; 
import { collection, addDoc, serverTimestamp, doc, setDoc, deleteDoc, writeBatch, query, getDocs, updateDoc } from "firebase/firestore";
import Papa from 'papaparse'; 
import { Plus, X, Edit, Trash2, Building, Upload, Search, User, Mail, Phone, ShieldCheck, AlertTriangle, CheckSquare, Wand2, Calendar, MessageSquare, MessageCircle, Square, Filter, Clock, FileText, Link as LinkIcon, Check, ChevronDown, Linkedin, Database, Send, Download, FileCheck, Handshake, RotateCcw } from 'lucide-react';
import { Card, Button, Input, Checkbox, Textarea } from '../data/constants.jsx'; 

// --- 1. Helper: WhatsApp Link Generator ---
const getWhatsAppLink = (phone) => {
    if (!phone) return null;
    let cleanNumber = phone.replace(/\D/g, '');
    if (cleanNumber.startsWith('0')) {
        cleanNumber = '63' + cleanNumber.substring(1);
    }
    if (!cleanNumber.startsWith('63') && cleanNumber.length === 10) {
        cleanNumber = '63' + cleanNumber;
    }
    return `https://api.whatsapp.com/send?phone=${cleanNumber}`;
};

// --- 2. Stats Badge ---
const StatBadge = ({ icon: Icon, label, count, total, color, active, onClick }) => {
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
        <div 
            onClick={onClick}
            className={`cursor-pointer p-3 rounded-xl border transition-all duration-200 flex items-center justify-between gap-3
                ${active ? `bg-${color}-100 border-${color}-500 ring-2 ring-${color}-400` : 'bg-white border-gray-200 hover:border-orange-300 hover:shadow-md'}
            `}
        >
            <div className={`p-2 rounded-full bg-${color}-100 text-${color}-600`}>
                <Icon size={20} />
            </div>
            <div className="text-right">
                <p className="text-xs text-gray-500 font-bold uppercase">{label}</p>
                <p className="text-xl font-bold text-gray-800">
                    {count} <span className="text-xs text-gray-400 font-normal">({percentage}%)</span>
                </p>
            </div>
        </div>
    );
};

// --- 3. Duplicate Resolver ---
const DuplicateResolverModal = ({ duplicates, onClose, onResolve }) => {
    const [selectedToDelete, setSelectedToDelete] = useState(new Set());

    const toggleSelection = (id) => {
        const newSet = new Set(selectedToDelete);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedToDelete(newSet);
    };

    const handleAutoSelect = () => {
        const newSet = new Set();
        let count = 0;
        duplicates.forEach(group => {
            const sortedItems = [...group.items].sort((a, b) => {
                const timeA = a.createdAt?.seconds || 0;
                const timeB = b.createdAt?.seconds || 0;
                return timeA - timeB; 
            });
            for (let i = 1; i < sortedItems.length; i++) {
                newSet.add(sortedItems[i].id);
                count++;
            }
        });
        setSelectedToDelete(newSet);
        if(count > 0) alert(`Auto-selected ${count} newer duplicates.`);
    };

    const handleResolve = () => {
        if (window.confirm(`Permanently delete ${selectedToDelete.size} selected duplicates?`)) {
            onResolve(Array.from(selectedToDelete));
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-30 flex justify-center items-center p-4">
            <Card className="w-full max-w-3xl max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <AlertTriangle className="text-orange-500"/> 
                        {duplicates.length} Duplicate Groups Found
                    </h3>
                    <button onClick={onClose}><X /></button>
                </div>
                <div className="bg-gray-50 p-3 rounded mb-4 flex justify-between items-center">
                    <p className="text-sm text-gray-600">Select records to <span className="text-red-600 font-bold">DELETE</span>. Unchecked items stay safe.</p>
                    <Button onClick={handleAutoSelect} variant="secondary" className="text-sm"><Wand2 size={14} className="mr-2 text-purple-600"/>Auto-Select All</Button>
                </div>
                <div className="overflow-y-auto flex-1 space-y-6 p-2">
                    {duplicates.map((group, groupIndex) => (
                        <div key={groupIndex} className="border border-orange-200 rounded-lg overflow-hidden">
                            <div className="bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-800 flex justify-between">
                                <span>Conflict: {group.key}</span>
                                <span className="text-xs uppercase tracking-wider bg-white px-2 py-0.5 rounded">Group {groupIndex + 1}</span>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {group.items.map(contact => (
                                    <div key={contact.id} className={`flex items-center justify-between p-3 ${selectedToDelete.has(contact.id) ? 'bg-red-50' : 'bg-white'}`}>
                                        <div className="flex items-center gap-3">
                                            <input type="checkbox" checked={selectedToDelete.has(contact.id)} onChange={() => toggleSelection(contact.id)} className="w-5 h-5 text-red-600 rounded border-gray-300 focus:ring-red-500"/>
                                            <div>
                                                <p className="font-bold text-gray-800">{contact.firstName} {contact.lastName}</p>
                                                <p className="text-xs text-gray-500">{contact.companyName} • {contact.email || 'No Email'}</p>
                                            </div>
                                        </div>
                                        {selectedToDelete.has(contact.id) && <span className="text-xs font-bold text-red-600">Marked for Delete</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-4 pt-4 border-t flex justify-end gap-2">
                    <Button onClick={onClose} variant="secondary">Cancel</Button>
                    <Button onClick={handleResolve} variant="danger" disabled={selectedToDelete.size === 0}><Trash2 className="mr-2" size={16}/> Delete Selected ({selectedToDelete.size})</Button>
                </div>
            </Card>
        </div>
    );
};

// --- 4. Import Settings Modal ---
const ImportSettingsModal = ({ onClose, onProceed }) => {
    const [note, setNote] = useState('Responded to Email Campaign');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4">
            <Card className="w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <FileCheck className="text-orange-500"/> Response Settings
                    </h3>
                    <button onClick={onClose}><X /></button>
                </div>
                <div className="space-y-4">
                    <p className="text-sm text-gray-600">Configure how the uploaded responses will appear in the contact's history.</p>
                    <Input 
                        label="Log Date" 
                        type="date" 
                        value={date} 
                        onChange={(e) => setDate(e.target.value)} 
                    />
                    <Input 
                        label="Activity Note / Title" 
                        value={note} 
                        onChange={(e) => setNote(e.target.value)} 
                        placeholder="e.g., 'Replied to Xmas Promo'"
                    />
                    <div className="flex justify-end gap-2 mt-6">
                        <Button onClick={onClose} variant="secondary">Cancel</Button>
                        <Button onClick={() => onProceed(note, date)} variant="primary">Select CSV File</Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

// --- 5. ContactModal Component ---
const ContactModal = ({ onClose, onSave, contactToEdit, companies, quotes }) => {
    const isEditMode = Boolean(contactToEdit);
    
    const [firstName, setFirstName] = useState(contactToEdit?.firstName || '');
    const [lastName, setLastName] = useState(contactToEdit?.lastName || '');
    const [jobTitle, setJobTitle] = useState(contactToEdit?.jobTitle || '');
    const [email, setEmail] = useState(contactToEdit?.email || '');
    const [phone, setPhone] = useState(contactToEdit?.phone || '');
    const [linkedIn, setLinkedIn] = useState(contactToEdit?.linkedIn || '');
    const [companyId, setCompanyId] = useState(contactToEdit?.companyId || '');
    const [companyName, setCompanyName] = useState(contactToEdit?.companyName || ''); 
    
    const [isVerified, setIsVerified] = useState(contactToEdit?.isVerified || false);
    const [isEmailed, setIsEmailed] = useState(contactToEdit?.isEmailed || false);
    const [isContacted, setIsContacted] = useState(contactToEdit?.isContacted || false);
    const [isVisited, setIsVisited] = useState(contactToEdit?.isVisited || false);
    const [notes, setNotes] = useState(contactToEdit?.notes || '');
    const [isPartner, setIsPartner] = useState(contactToEdit?.isPartner || false);

    const [interactions, setInteractions] = useState(contactToEdit?.interactions || []);
    const [newLogDate, setNewLogDate] = useState(new Date().toISOString().split('T')[0]);
    const [newLogType, setNewLogType] = useState('Call');
    const [newLogOutcome, setNewLogOutcome] = useState('');
    const [selectedQuoteId, setSelectedQuoteId] = useState('');

    const [companySearch, setCompanySearch] = useState('');
    const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (contactToEdit?.companyName) {
            setCompanySearch(contactToEdit.companyName);
        }
    }, [contactToEdit]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsCompanyDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredCompanies = useMemo(() => {
        if (!companies) return [];
        return companies.filter(c => c.companyName.toLowerCase().includes(companySearch.toLowerCase()));
    }, [companies, companySearch]);

    const handleSelectCompany = (company) => {
        setCompanyId(company.id);
        setCompanyName(company.companyName);
        setCompanySearch(company.companyName);
        setIsCompanyDropdownOpen(false);
    };

    const handleCompanySearchChange = (e) => {
        setCompanySearch(e.target.value);
        setCompanyId(''); 
        setCompanyName(e.target.value);
        setIsCompanyDropdownOpen(true);
    };

    const relevantQuotes = useMemo(() => {
        if (!quotes || !companyId) return [];
        const selectedCompany = companies.find(c => c.id === companyId);
        if (!selectedCompany) return [];
        const cName = selectedCompany.companyName.toLowerCase();
        return quotes.filter(q => q.customer?.name?.toLowerCase().includes(cName));
    }, [quotes, companyId, companies]);

    const handleAddInteraction = () => {
        if (!newLogOutcome) return alert("Please enter an outcome or note.");
        let linkedQuote = null;
        if (selectedQuoteId) {
            const q = relevantQuotes.find(rq => rq.id === selectedQuoteId);
            if (q) linkedQuote = { id: q.id, total: q.finalSalesPrice || 0, status: q.status };
        }
        const newInteraction = { id: Date.now(), date: newLogDate, type: newLogType, outcome: newLogOutcome, linkedQuote };
        setInteractions([newInteraction, ...interactions].sort((a, b) => new Date(b.date) - new Date(a.date)));
        if (newLogType === 'Call') setIsContacted(true);
        if (newLogType === 'Visit') setIsVisited(true);
        if (newLogType === 'Email') setIsEmailed(true);
        setNewLogOutcome('');
        setSelectedQuoteId('');
    };

    const handleDeleteInteraction = (id) => setInteractions(interactions.filter(i => i.id !== id));

    const handleSave = () => {
        if (!firstName || !lastName) {
            alert('Please enter a first and last name.');
            return;
        }
        const finalCompanyName = companyId ? companies.find(c => c.id === companyId)?.companyName : companySearch;
        
        const contactData = {
            firstName, lastName, jobTitle, email, phone, linkedIn, companyId, companyName: finalCompanyName, 
            isVerified, isEmailed, isContacted, isVisited, isPartner, notes, interactions 
        };
        onSave(contactData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-20 flex justify-center items-center p-4">
            <Card className="w-full max-w-4xl max-h-[95vh] overflow-y-auto flex flex-col md:flex-row gap-6">
                <div className="flex-1 space-y-4">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-2xl font-bold text-gray-800">{isEditMode ? 'Edit Contact' : 'New Contact'}</h3>
                        <button onClick={onClose} className="md:hidden text-gray-500"><X /></button>
                    </div>
                    <div className="flex gap-4">
                        <Input label="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                        <Input label="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                    </div>
                    <div className="relative" ref={dropdownRef}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                className="block w-full px-3 py-2.5 pl-10 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                                value={companySearch}
                                onChange={handleCompanySearchChange}
                                onFocus={() => setIsCompanyDropdownOpen(true)}
                                placeholder="Search Company..."
                            />
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16}/>
                            {companyId && <Check className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500" size={16}/>}
                        </div>
                        {isCompanyDropdownOpen && (
                            <div className="absolute z-50 w-full mt-1 bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                                {filteredCompanies.length === 0 ? (
                                    <div className="py-2 px-4 text-gray-500 italic">No companies found.</div>
                                ) : (
                                    filteredCompanies.map((company) => (
                                        <div key={company.id} className="cursor-pointer py-2 pl-3 pr-9 hover:bg-orange-50 text-gray-900 border-b border-gray-50 last:border-0" onClick={() => handleSelectCompany(company)}>
                                            <span className="block truncate font-medium">{company.companyName}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                    <Input label="Job Title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
                    <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                        <Input label="LinkedIn" type="url" value={linkedIn} onChange={(e) => setLinkedIn(e.target.value)} />
                    </div>
                    <Textarea label="Notes" rows="3" value={notes} onChange={(e) => setNotes(e.target.value)} />
                    <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg">
                        <Checkbox id="isPartner" label={<span className="font-bold text-teal-800 flex items-center gap-2"><Handshake size={16}/> Investor / Partner</span>} checked={isPartner} onChange={(e) => setIsPartner(e.target.checked)} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 p-4 bg-gray-50 rounded-lg">
                        <Checkbox id="isVerified" label="Verified" checked={isVerified} onChange={(e) => setIsVerified(e.target.checked)} />
                        <Checkbox id="isEmailed" label="Emailed" checked={isEmailed} onChange={(e) => setIsEmailed(e.target.checked)} />
                        <Checkbox id="isContacted" label="Call/Met" checked={isContacted} onChange={(e) => setIsContacted(e.target.checked)} />
                        <Checkbox id="isVisited" label="Visited" checked={isVisited} onChange={(e) => setIsVisited(e.target.checked)} />
                    </div>
                </div>

                <div className="flex-1 border-l border-gray-200 pl-0 md:pl-6 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-gray-700 flex items-center gap-2"><Clock size={18}/> Interaction Log</h4>
                        <button onClick={onClose} className="hidden md:block text-gray-500"><X /></button>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 mb-4 space-y-2">
                        <div className="flex gap-2">
                            <Input type="date" value={newLogDate} onChange={e => setNewLogDate(e.target.value)} className="text-sm w-1/3" />
                            <select value={newLogType} onChange={e => setNewLogType(e.target.value)} className="block w-2/3 px-2 py-2 bg-white border-gray-300 rounded-md text-sm">
                                <option value="Call">Call</option><option value="Visit">Visit</option><option value="Email">Email</option><option value="Note">Note</option>
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <input type="text" value={newLogOutcome} onChange={e => setNewLogOutcome(e.target.value)} placeholder="Outcome..." className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm" />
                            <Button onClick={handleAddInteraction} variant="secondary" className="px-3"><Plus size={16}/></Button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-3" style={{maxHeight: '400px'}}>
                        {interactions.map((log) => (
                            <div key={log.id} className="bg-white border border-gray-200 p-3 rounded-lg shadow-sm group relative">
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded text-white ${log.type === 'Visit' ? 'bg-green-500' : 'bg-blue-500'}`}>{log.type}</span>
                                    <button onClick={() => handleDeleteInteraction(log.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><X size={14}/></button>
                                </div>
                                <p className="text-sm text-gray-800">{log.outcome}</p>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 pt-4 border-t flex justify-end">
                        <Button onClick={handleSave} variant="primary">Save Changes</Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

// --- 6. ContactCard ---
const ContactCard = ({ contact, onEdit, onSoftDelete, selected, onToggleSelect }) => {
    const lastActivity = contact.interactions && contact.interactions.length > 0 ? contact.interactions[0] : null;
    const whatsappLink = getWhatsAppLink(contact.phone);

    return (
        <Card className={`p-4 rounded-lg shadow border transition-colors relative ${selected ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-300'}`}>
            <div className="absolute top-4 left-4 z-10">
                <input type="checkbox" checked={selected} onChange={() => onToggleSelect(contact.id)} className="w-5 h-5 text-orange-600 rounded cursor-pointer" />
            </div>
            <div className="pl-8"> 
                <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-lg text-gray-800">{contact.firstName} {contact.lastName} {contact.isPartner && <Handshake size={18} className="inline text-teal-600 ml-1"/>}</h4>
                    <div className="flex gap-1">
                        <Button onClick={() => onEdit(contact)} variant="secondary" className="p-1 h-auto"><Edit size={14}/></Button>
                        <Button onClick={() => onSoftDelete(contact.id)} variant="danger" className="p-1 h-auto"><Trash2 size={14}/></Button>
                    </div>
                </div>
                <p className="text-sm text-orange-600 font-medium mb-1 truncate">{contact.jobTitle || 'No Title'}</p>
                <div className="text-xs text-gray-500 mb-3 truncate">{contact.companyName}</div>
                <div className="flex gap-3 mb-3 justify-center py-2 border-y border-gray-50">
                    {contact.email && <a href={`mailto:${contact.email}`} className="text-gray-400 hover:text-orange-600"><Mail size={16}/></a>}
                    {contact.phone && <a href={`tel:${contact.phone}`} className="text-gray-400 hover:text-blue-600"><Phone size={16}/></a>}
                    {whatsappLink && <a href={whatsappLink} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-green-600"><MessageCircle size={16}/></a>}
                </div>
            </div>
        </Card>
    );
};

// --- Main Page Component ---
const ContactsPage = ({ contacts = [], companies = [], user, quotes = [], initialContactToEdit, onRestoreContact }) => { 
    const [showModal, setShowModal] = useState(false);
    const [editingContact, setEditingContact] = useState(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importMode, setImportMode] = useState('CREATE');
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [duplicateGroups, setDuplicateGroups] = useState([]);
    const [showImportSettings, setShowImportSettings] = useState(false);
    const [importConfig, setImportConfig] = useState({ note: '', date: '' });
    const [showTrash, setShowTrash] = useState(false);
    const fileInputRef = useRef(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('ALL'); 
    const [selectedIds, setSelectedIds] = useState(new Set());

    useEffect(() => {
        if (initialContactToEdit) {
            setEditingContact(initialContactToEdit);
            setShowModal(true);
        }
    }, [initialContactToEdit]);

    const activeContacts = useMemo(() => (contacts || []).filter(c => !c.isDeleted), [contacts]);
    const trashedContacts = useMemo(() => (contacts || []).filter(c => c.isDeleted), [contacts]);

    const stats = useMemo(() => {
        const list = activeContacts;
        return {
            total: list.length,
            contacted: list.filter(c => c.isContacted).length,
            visited: list.filter(c => c.isVisited).length,
            emailed: list.filter(c => c.isEmailed).length,
            partners: list.filter(c => c.isPartner).length
        };
    }, [activeContacts]);

    const filteredContacts = useMemo(() => {
        let list = activeContacts;
        if (activeFilter === 'EMAILED') list = list.filter(c => c.isEmailed);
        if (activeFilter === 'CONTACTED') list = list.filter(c => c.isContacted);
        if (activeFilter === 'VISITED') list = list.filter(c => c.isVisited);
        if (activeFilter === 'PARTNERS') list = list.filter(c => c.isPartner);
        
        const term = searchTerm.toLowerCase();
        return list.filter(c => `${c.firstName} ${c.lastName} ${c.companyName} ${c.email} ${c.notes}`.toLowerCase().includes(term));
    }, [activeContacts, searchTerm, activeFilter]);

    const handleSoftDelete = async (id) => {
        if (!user || !confirm("Move to Trash?")) return;
        await updateDoc(doc(db, "users", user.uid, "contacts", id), { isDeleted: true, deletedAt: serverTimestamp() });
    };

    const handleSave = async (data) => {
        if (!user) return;
        if (editingContact) {
            await updateDoc(doc(db, "users", user.uid, "contacts", editingContact.id), { ...data, lastModified: serverTimestamp() });
        } else {
            await addDoc(collection(db, "users", user.uid, "contacts"), { ...data, createdAt: serverTimestamp() });
        }
        setShowModal(false);
    };

    return (
        <div className="w-full pb-20 space-y-8"> 
            {showModal && <ContactModal onSave={handleSave} onClose={() => setShowModal(false)} contactToEdit={editingContact} companies={companies} quotes={quotes} />}
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatBadge icon={User} label="Total" count={stats.total} total={stats.total} color="gray" active={activeFilter === 'ALL'} onClick={() => setActiveFilter('ALL')} />
                <StatBadge icon={Handshake} label="Partners" count={stats.partners} total={stats.total} color="teal" active={activeFilter === 'PARTNERS'} onClick={() => setActiveFilter('PARTNERS')} />
                <StatBadge icon={Mail} label="Emailed" count={stats.emailed} total={stats.total} color="purple" active={activeFilter === 'EMAILED'} onClick={() => setActiveFilter('EMAILED')} />
                <StatBadge icon={Phone} label="Contacted" count={stats.contacted} total={stats.total} color="blue" active={activeFilter === 'CONTACTED'} onClick={() => setActiveFilter('CONTACTED')} />
                <StatBadge icon={Building} label="Visited" count={stats.visited} total={stats.total} color="green" active={activeFilter === 'VISITED'} onClick={() => setActiveFilter('VISITED')} />
            </div>

            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">Contacts ({filteredContacts.length})</h2>
                <div className="flex gap-2">
                    <Button onClick={() => setShowTrash(!showTrash)} variant="secondary" className="text-xs">{showTrash ? 'Hide Trash' : 'View Trash'}</Button>
                    <Button onClick={() => { setEditingContact(null); setShowModal(true); }} variant="primary"><Plus size={16} /> New</Button>
                </div>
            </div>

            <div className="relative">
                <Input placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredContacts.map(c => (
                    <ContactCard key={c.id} contact={c} onEdit={handleOpenEditModal} onSoftDelete={handleSoftDelete} selected={selectedIds.has(c.id)} onToggleSelect={(id) => {
                        const newSet = new Set(selectedIds);
                        newSet.has(id) ? newSet.delete(id) : newSet.add(id);
                        setSelectedIds(newSet);
                    }} />
                ))}
            </div>

            {/* TRASH SECTION */}
            {showTrash && trashedContacts.length > 0 && (
                <div className="mt-12 pt-8 border-t border-dashed">
                    <h3 className="text-lg font-bold text-gray-400 mb-4 uppercase tracking-widest flex items-center gap-2"><Trash2 size={18}/> Recently Trashed Contacts</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {trashedContacts.map(c => (
                            <div key={c.id} className="p-4 bg-gray-50 border rounded-xl flex justify-between items-center opacity-60">
                                <span className="font-bold text-gray-700">{c.firstName} {c.lastName} ({c.companyName})</span>
                                <Button onClick={() => onRestoreContact(c.id)} variant="primary" className="bg-green-600 text-xs"><RotateCcw size={14} className="mr-1"/> Restore</Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContactsPage;
