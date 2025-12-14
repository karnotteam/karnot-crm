import React, { useState, useRef, useMemo, useEffect } from 'react'; 
import { db } from '../firebase'; 
import { collection, addDoc, serverTimestamp, doc, setDoc, deleteDoc, writeBatch, query, getDocs, updateDoc } from "firebase/firestore";
import Papa from 'papaparse'; 
import { Plus, X, Edit, Trash2, Building, Upload, Search, User, Mail, Phone, ShieldCheck, AlertTriangle, CheckSquare, Wand2, Calendar, MessageSquare, Square, Filter, Clock, FileText, Link as LinkIcon, Check, ChevronDown, Linkedin, MessageCircle, Database, Send, Download, FileCheck, Settings } from 'lucide-react';
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

// --- 4. Import Settings Modal (NEW) ---
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
    
    // Core Data
    const [firstName, setFirstName] = useState(contactToEdit?.firstName || '');
    const [lastName, setLastName] = useState(contactToEdit?.lastName || '');
    const [jobTitle, setJobTitle] = useState(contactToEdit?.jobTitle || '');
    const [email, setEmail] = useState(contactToEdit?.email || '');
    const [phone, setPhone] = useState(contactToEdit?.phone || '');
    const [linkedIn, setLinkedIn] = useState(contactToEdit?.linkedIn || '');
    const [companyId, setCompanyId] = useState(contactToEdit?.companyId || '');
    const [companyName, setCompanyName] = useState(contactToEdit?.companyName || ''); 
    
    // Activity Tracking
    const [isVerified, setIsVerified] = useState(contactToEdit?.isVerified || false);
    const [isEmailed, setIsEmailed] = useState(contactToEdit?.isEmailed || false);
    const [isContacted, setIsContacted] = useState(contactToEdit?.isContacted || false);
    const [contactDate, setContactDate] = useState(contactToEdit?.contactDate || '');
    const [isVisited, setIsVisited] = useState(contactToEdit?.isVisited || false);
    const [visitDate, setVisitDate] = useState(contactToEdit?.visitDate || '');
    const [notes, setNotes] = useState(contactToEdit?.notes || '');

    // Interaction History
    const [interactions, setInteractions] = useState(contactToEdit?.interactions || []);
    const [newLogDate, setNewLogDate] = useState(new Date().toISOString().split('T')[0]);
    const [newLogType, setNewLogType] = useState('Call');
    const [newLogOutcome, setNewLogOutcome] = useState('');
    const [selectedQuoteId, setSelectedQuoteId] = useState('');

    // --- Searchable Company State ---
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
        return quotes.filter(q => q.customer?.name?.toLowerCase() === cName || q.customer?.name?.toLowerCase().includes(cName));
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
            isVerified, isEmailed, isContacted, isVisited, notes, interactions
        };
        onSave(contactData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-20 flex justify-center items-center p-4">
            <Card className="w-full max-w-4xl max-h-[95vh] overflow-y-auto flex flex-col md:flex-row gap-6">
                
                {/* LEFT: Contact Details */}
                <div className="flex-1 space-y-4">
                     <div className="flex justify-between items-center mb-2">
                        <h3 className="text-2xl font-bold text-gray-800">{isEditMode ? 'Edit Contact' : 'New Contact'}</h3>
                        <button onClick={onClose} className="md:hidden text-gray-500"><X /></button>
                    </div>

                    <div className="flex gap-4">
                        <Input label="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                        <Input label="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                    </div>

                    {/* SEARCHABLE COMPANY INPUT */}
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
                            {companyId && <Check className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500" size={16} title="Linked to Company DB"/>}
                        </div>
                        
                        {isCompanyDropdownOpen && (
                            <div className="absolute z-50 w-full mt-1 bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                                {filteredCompanies.length === 0 ? (
                                    <div className="py-2 px-4 text-gray-500 italic">No companies found.</div>
                                ) : (
                                    filteredCompanies.map((company) => (
                                        <div
                                            key={company.id}
                                            className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-orange-50 text-gray-900 border-b border-gray-50 last:border-0"
                                            onClick={() => handleSelectCompany(company)}
                                        >
                                            <span className="block truncate font-medium">{company.companyName}</span>
                                            {company.address && <span className="block truncate text-xs text-gray-500">{company.address}</span>}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    <Input label="Job Title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
                    <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Phone (Mobile)" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0917..." />
                        <Input label="LinkedIn URL" type="url" value={linkedIn} onChange={(e) => setLinkedIn(e.target.value)} placeholder="https://linkedin.com/in/..." />
                    </div>
                    
                    <Textarea label="General Notes" rows="3" value={notes} onChange={(e) => setNotes(e.target.value)} />
                    
                    <div className="grid grid-cols-2 gap-2 mt-4 p-4 bg-gray-50 rounded-lg">
                        <Checkbox id="isVerified" label="Verified" checked={isVerified} onChange={(e) => setIsVerified(e.target.checked)} />
                        <Checkbox id="isEmailed" label="Emailed" checked={isEmailed} onChange={(e) => setIsEmailed(e.target.checked)} />
                        <Checkbox id="isContacted" label="Call/Met" checked={isContacted} onChange={(e) => setIsContacted(e.target.checked)} />
                        <Checkbox id="isVisited" label="Visited" checked={isVisited} onChange={(e) => setIsVisited(e.target.checked)} />
                    </div>
                </div>

                {/* RIGHT: Log */}
                <div className="flex-1 border-l border-gray-200 pl-0 md:pl-6 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-gray-700 flex items-center gap-2"><Clock size={18}/> Interaction Log</h4>
                        <button onClick={onClose} className="hidden md:block text-gray-500 hover:text-gray-800"><X /></button>
                    </div>

                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 mb-4 space-y-2">
                        <div className="flex gap-2">
                            <Input type="date" value={newLogDate} onChange={e => setNewLogDate(e.target.value)} className="text-sm w-1/3" />
                            <select value={newLogType} onChange={e => setNewLogType(e.target.value)} className="block w-2/3 px-2 py-2 bg-white border-gray-300 rounded-md shadow-sm text-sm">
                                <option value="Call">Call</option>
                                <option value="Visit">Visit</option>
                                <option value="Email">Email</option>
                                <option value="Event">Event</option>
                                <option value="Note">Note</option>
                            </select>
                        </div>
                        
                        {relevantQuotes.length > 0 && (
                            <div className="flex items-center gap-2">
                                <LinkIcon size={14} className="text-gray-500"/>
                                <select value={selectedQuoteId} onChange={(e) => setSelectedQuoteId(e.target.value)} className="block w-full px-2 py-1 bg-white border border-gray-300 rounded text-xs">
                                    <option value="">-- Attach Quote (Optional) --</option>
                                    {relevantQuotes.map(q => <option key={q.id} value={q.id}>{q.id} - ${q.finalSalesPrice?.toLocaleString()} ({q.status})</option>)}
                                </select>
                            </div>
                        )}

                        <div className="flex gap-2">
                            <input type="text" value={newLogOutcome} onChange={e => setNewLogOutcome(e.target.value)} placeholder="Outcome / Details..." className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm" />
                            <Button onClick={handleAddInteraction} variant="secondary" className="px-3"><Plus size={16}/></Button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-2" style={{minHeight: '200px', maxHeight: '500px'}}>
                        {interactions.map((log) => (
                            <div key={log.id} className="bg-white border border-gray-200 p-3 rounded-lg shadow-sm group relative">
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded text-white ${log.type === 'Visit' ? 'bg-green-500' : log.type === 'Call' ? 'bg-blue-500' : 'bg-purple-500'}`}>{log.type}</span>
                                        <span className="text-xs text-gray-500">{log.date}</span>
                                    </div>
                                    <button onClick={() => handleDeleteInteraction(log.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><X size={14}/></button>
                                </div>
                                <p className="text-sm text-gray-800">{log.outcome}</p>
                                {log.linkedQuote && (
                                    <div className="mt-2 flex items-center gap-2 bg-blue-50 border border-blue-100 rounded p-1.5 w-fit">
                                        <FileText size={14} className="text-blue-600"/>
                                        <span className="text-xs font-semibold text-blue-800">{log.linkedQuote.id} (${log.linkedQuote.total?.toLocaleString()})</span>
                                    </div>
                                )}
                            </div>
                        ))}
                        {interactions.length === 0 && <p className="text-center text-gray-400 italic text-sm">No interactions logged yet.</p>}
                    </div>

                    <div className="mt-4 pt-4 border-t flex justify-end">
                        <Button onClick={handleSave} variant="primary" className="w-full md:w-auto"><Plus className="mr-2" size={16} /> Save Changes</Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

// --- 6. ContactCard (Unchanged) ---
const ContactCard = ({ contact, onEdit, onDelete, selected, onToggleSelect }) => {
    const lastActivity = contact.interactions && contact.interactions.length > 0 ? contact.interactions[0] : null;
    const whatsappLink = getWhatsAppLink(contact.phone);

    return (
        <Card className={`p-4 rounded-lg shadow border transition-colors relative ${selected ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-400' : 'border-gray-200 hover:border-orange-300'}`}>
            
            <div className="absolute top-4 left-4 z-10">
                <input 
                    type="checkbox" 
                    checked={selected} 
                    onChange={() => onToggleSelect(contact.id)}
                    className="w-5 h-5 text-orange-600 rounded border-gray-300 focus:ring-orange-500 cursor-pointer"
                />
            </div>

            <div className="pl-8"> 
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                        <h4 className="font-bold text-lg text-gray-800 leading-tight">{contact.firstName} {contact.lastName}</h4>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                        <Button onClick={() => onEdit(contact)} variant="secondary" className="p-1 h-auto w-auto"><Edit size={14}/></Button>
                        <Button onClick={() => onDelete(contact.id)} variant="danger" className="p-1 h-auto w-auto"><Trash2 size={14}/></Button>
                    </div>
                </div>
                
                <p className="text-sm text-orange-600 font-medium mb-1">{contact.jobTitle || 'No Job Title'}</p>
                <div className="text-sm text-gray-600 flex items-center gap-2 mb-3"><Building size={14} className="flex-shrink-0" /><span className="truncate">{contact.companyName}</span></div>

                <div className="flex gap-3 mb-3 border-t border-b border-gray-100 py-2 justify-center">
                    {contact.email && <a href={`mailto:${contact.email}`} className="text-gray-500 hover:text-orange-600" title="Email"><Mail size={18}/></a>}
                    {contact.phone && <a href={`tel:${contact.phone}`} className="text-gray-500 hover:text-blue-600" title="Call"><Phone size={18}/></a>}
                    {whatsappLink && <a href={whatsappLink} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-green-600" title="WhatsApp"><MessageCircle size={18}/></a>}
                    {contact.linkedIn && <a href={contact.linkedIn} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-blue-800" title="LinkedIn"><Linkedin size={18}/></a>}
                </div>

                {lastActivity ? (
                    <div className="mb-3 bg-blue-50 p-2 rounded border border-blue-100">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-blue-800 flex items-center gap-1">
                                {lastActivity.type === 'Visit' ? <Building size={10}/> : <Phone size={10}/>} {lastActivity.type}
                            </span>
                            <span className="text-[10px] text-gray-500">{lastActivity.date}</span>
                        </div>
                        <p className="text-xs text-gray-700 truncate">{lastActivity.outcome}</p>
                    </div>
                ) : (
                    <div className="mb-3 p-2 text-xs text-gray-400 italic">No recent activity</div>
                )}
            </div>

            <div className="pt-3 border-t border-gray-100 grid grid-cols-4 gap-1 text-[10px] text-gray-500 text-center">
                <div className={`p-1 rounded ${contact.isVerified ? 'bg-gray-100 text-green-700 font-bold' : ''}`}><CheckSquare size={14} className={`mx-auto mb-1 ${contact.isVerified ? 'text-green-600' : 'text-gray-300'}`}/> Verified</div>
                <div className={`p-1 rounded ${contact.isEmailed ? 'bg-purple-50 text-purple-700 font-bold' : ''}`}><Mail size={14} className={`mx-auto mb-1 ${contact.isEmailed ? 'text-purple-600' : 'text-gray-300'}`}/> Emailed</div>
                <div className={`p-1 rounded ${contact.isContacted ? 'bg-blue-50 text-blue-700 font-bold' : ''}`}><Phone size={14} className={`mx-auto mb-1 ${contact.isContacted ? 'text-blue-600' : 'text-gray-300'}`}/> Call</div>
                <div className={`p-1 rounded ${contact.isVisited ? 'bg-green-50 text-green-700 font-bold' : ''}`}><Building size={14} className={`mx-auto mb-1 ${contact.isVisited ? 'text-green-600' : 'text-gray-300'}`}/> Visit</div>
            </div>
        </Card>
    );
};

// --- Main Page Component ---
const ContactsPage = ({ contacts, companies, user, quotes, initialContactToEdit }) => { 
    const [showModal, setShowModal] = useState(false);
    const [editingContact, setEditingContact] = useState(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importMode, setImportMode] = useState('CREATE'); 
    
    // --- NEW: Custom Response Import Settings ---
    const [showImportSettings, setShowImportSettings] = useState(false);
    const [importConfig, setImportConfig] = useState({ note: '', date: '' });

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

    const stats = useMemo(() => {
        const total = contacts.length;
        const contacted = contacts.filter(c => c.isContacted).length;
        const visited = contacts.filter(c => c.isVisited).length;
        const emailed = contacts.filter(c => c.isEmailed).length;
        const esco = contacts.filter(c => c.notes && c.notes.includes('ESCO')).length;
        return { total, contacted, visited, emailed, esco };
    }, [contacts]);

    // --- Handlers ---
    const handleScanForDuplicates = () => { /* ... Unchanged ... */ };
    const handleResolveDuplicates = async (idsToDelete) => { /* ... Unchanged ... */ };
    const handleSaveContact = async (contactData) => { /* ... Unchanged ... */ };
    const handleUpdateContact = async (contactData) => { /* ... Unchanged ... */ };
    const handleDeleteContact = async (contactId) => { /* ... Unchanged ... */ };
    const handleSave = (data) => editingContact ? handleUpdateContact(data) : handleSaveContact(data);
    const handleOpenNewModal = () => { setEditingContact(null); setShowModal(true); };
    const handleOpenEditModal = (c) => { setEditingContact(c); setShowModal(true); };
    const handleCloseModal = () => { setEditingContact(null); setShowModal(false); };
    
    const handleImportClick = () => {
        setImportMode('CREATE');
        fileInputRef.current.click();
    };

    // --- OPEN SETTINGS MODAL FIRST ---
    const handleResponseImportClick = () => {
        setImportMode('UPDATE');
        setShowImportSettings(true); // Open Modal
    };

    // --- PROCEED AFTER MODAL ---
    const handleProceedWithResponseImport = (note, date) => {
        setImportConfig({ note, date });
        setShowImportSettings(false);
        fileInputRef.current.click(); // Trigger actual file input
    };
    
    // --- BULK ACTION HANDLERS ---
    const toggleSelection = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleSelectAll = () => {
        // ... (Unchanged)
        const allVisibleIds = filteredContacts.map(c => c.id);
        const allSelected = allVisibleIds.every(id => selectedIds.has(id));
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(allVisibleIds));
        }
    };

    const handleBulkEmail = () => {
        const emails = contacts.filter(c => selectedIds.has(c.id) && c.email).map(c => c.email);
        if (emails.length === 0) return alert("No valid email addresses found.");
        
        const mailtoLink = `mailto:?bcc=${emails.join(',')}`;
        if (mailtoLink.length > 2000) {
            if(!window.confirm("That's a lot of emails! The link might break. Try exporting to CSV instead?")) return;
        }
        window.location.href = mailtoLink;
    };

    const handleBulkExport = () => {
        const selectedContacts = contacts.filter(c => selectedIds.has(c.id));
        if (selectedContacts.length === 0) return;

        const exportData = selectedContacts.map(c => ({
            "First Name": c.firstName,
            "Last Name": c.lastName,
            "Email Address": c.email,
            "Phone Number": c.phone,
            "Company": c.companyName,
            "Job Title": c.jobTitle,
            "LinkedIn": c.linkedIn || '',
            "Notes": c.notes || ''
        }));

        const csv = Papa.unparse(exportData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        
        link.setAttribute("href", url);
        link.setAttribute("download", `karnot_contacts_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Permanently delete ${selectedIds.size} contacts?`)) return;
        const batch = writeBatch(db);
        selectedIds.forEach(id => {
            const ref = doc(db, "users", user.uid, "contacts", id);
            batch.delete(ref);
        });
        try {
            await batch.commit();
            setSelectedIds(new Set());
            alert("Contacts deleted.");
        } catch (error) {
            console.error(error);
            alert("Failed to delete.");
        }
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        setIsImporting(true);
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const dataRows = results.data;
                const batch = writeBatch(db);
                
                // --- UPDATE MODE (RESPONSE IMPORT) ---
                if (importMode === 'UPDATE') {
                    let updatedCount = 0;
                    const logNote = importConfig.note || 'Responded to Email'; // Use Custom Note
                    const logDate = importConfig.date || new Date().toISOString().split('T')[0]; // Use Custom Date

                    dataRows.forEach(row => {
                        const email = (row['EMAIL'] || row['Email'] || row['Email Address'])?.trim();
                        if (!email) return;

                        const match = contacts.find(c => c.email && c.email.toLowerCase() === email.toLowerCase());
                        if (match) {
                            const ref = doc(db, "users", user.uid, "contacts", match.id);
                            
                            const newInteraction = {
                                id: Date.now(),
                                date: logDate, // CUSTOM DATE
                                type: 'Email',
                                outcome: logNote, // CUSTOM NOTE
                                linkedQuote: null
                            };
                            const updatedInteractions = [newInteraction, ...(match.interactions || [])];

                            batch.update(ref, {
                                isVerified: true,
                                isEmailed: true,
                                interactions: updatedInteractions,
                                lastModified: serverTimestamp()
                            });
                            updatedCount++;
                        }
                    });

                    try {
                        await batch.commit();
                        alert(`Success! Updated ${updatedCount} contacts with "${logNote}".`);
                    } catch (error) {
                        console.error("Update Error:", error);
                        alert("Failed to update contacts.");
                    }
                    setIsImporting(false);
                    event.target.value = null;
                    return;
                }

                // ... (Create mode logic unchanged) ...
                // --- CREATE MODE (STANDARD IMPORT) ---
                let importCount = 0;
                let duplicateCount = 0;
                const existingNames = new Set(contacts.map(c => `${c.firstName} ${c.lastName}`.toLowerCase().trim()));
                const contactsRef = collection(db, "users", user.uid, "contacts");

                const firstRow = dataRows[0] || {};
                const isESCO = 'Name of Representative' in firstRow;

                if (isESCO) {
                    // (Same ESCO logic as before)
                    dataRows.forEach(row => {
                        const rawNames = row['Name of Representative'] ? row['Name of Representative'].split('/') : [];
                        const rawPositions = row['Position'] ? row['Position'].split('/') : [];
                        const rawEmails = (row['E-Mail Address'] || row['Email Address']) ? (row['E-Mail Address'] || row['Email Address']).split(/[\s/\n,]+/) : [];
                        const companyName = row['Company Name'] ? row['Company Name'].trim() : '';
                        const validEmails = rawEmails.filter(e => e.includes('@'));

                        rawNames.forEach((fullName, index) => {
                            const cleanName = fullName.trim();
                            if (!cleanName) return;
                            const nameParts = cleanName.split(' ');
                            const lastName = nameParts.pop();
                            const firstName = nameParts.join(' ');
                            const position = rawPositions[index] ? rawPositions[index].trim() : (rawPositions[0] || '');
                            
                            let email = '';
                            if (validEmails.length === rawNames.length) email = validEmails[index];
                            else if (validEmails.length === 1) email = validEmails[0]; 
                            else email = validEmails[index] || '';

                            if (existingNames.has(`${firstName} ${lastName}`.toLowerCase())) { duplicateCount++; return; }

                            let companyMatch = null;
                            if (companies.length && companyName) {
                                 const lowerC = companyName.toLowerCase().trim();
                                 companyMatch = companies.find(c => c.companyName.toLowerCase().trim() === lowerC) || companies.find(c => c.companyName.toLowerCase().includes(lowerC));
                            }

                            batch.set(doc(contactsRef), {
                                firstName, lastName, jobTitle: position,
                                email: email || '', phone: '', 
                                companyId: companyMatch ? companyMatch.id : null,
                                companyName: companyMatch ? companyMatch.companyName : (companyName || 'N/A'),
                                isVerified: false, isEmailed: false, isContacted: false, isVisited: false, notes: 'Imported from ESCO List', interactions: [],
                                createdAt: serverTimestamp()
                            });
                            importCount++;
                        });
                    });
                } else {
                    // (Same Standard logic as before)
                    dataRows.forEach(row => {
                        const firstName = (row['FirstName'] || row['First Name'] || '').trim();
                        const lastName = (row['LastName'] || row['Last Name'] || '').trim();
                        const email = (row['Email'] || row['EmailAddress'] || row['Email Address'] || '').trim();
                        const companyName = (row['Company'] || row['Organization'] || '').trim();
                        const jobTitle = (row['Job Title'] || row['Position'] || row['Title'] || '').trim();

                        if (!firstName || !lastName) return; 
                        if (existingNames.has(`${firstName} ${lastName}`.toLowerCase())) { duplicateCount++; return; }

                        let companyMatch = null;
                        if (companies.length && companyName) {
                             const lowerC = companyName.toLowerCase().trim();
                             companyMatch = companies.find(c => c.companyName.toLowerCase().trim() === lowerC) || companies.find(c => c.companyName.toLowerCase().includes(lowerC));
                        }

                        batch.set(doc(contactsRef), {
                            firstName, lastName, jobTitle,
                            email, phone: '', companyId: companyMatch ? companyMatch.id : null,
                            companyName: companyMatch ? companyMatch.companyName : (companyName || 'N/A'),
                            isVerified: false, isEmailed: false, isContacted: false, isVisited: false, notes: '', interactions: [],
                            createdAt: serverTimestamp()
                        });
                        importCount++;
                    });
                }

                try { await batch.commit(); alert(`Import Complete!\n✅ Added: ${importCount}\n🚫 Skipped (Duplicates): ${duplicateCount}`); } 
                catch (error) { console.error("Import Error: ", error); alert("An error occurred during import."); }
                setIsImporting(false);
                event.target.value = null;
            },
            error: () => { alert("Failed to parse CSV."); setIsImporting(false); }
        });
    };

    // ... (Filter Logic and DeleteAll unchanged) ...
    const handleDeleteAllContacts = async () => { /* ... Unchanged ... */ };
    const filteredContacts = useMemo(() => {
        const lowerSearchTerm = searchTerm.toLowerCase();
        let list = contacts;
        if (activeFilter === 'EMAILED') list = list.filter(c => c.isEmailed);
        if (activeFilter === 'CONTACTED') list = list.filter(c => c.isContacted);
        if (activeFilter === 'VISITED') list = list.filter(c => c.isVisited);
        if (activeFilter === 'ESCO') list = list.filter(c => c.notes && c.notes.includes('ESCO')); 
        
        return list.filter(c => 
            c.firstName.toLowerCase().includes(lowerSearchTerm) || 
            c.lastName.toLowerCase().includes(lowerSearchTerm) ||
            (c.email && c.email.toLowerCase().includes(lowerSearchTerm)) ||
            (c.companyName && c.companyName.toLowerCase().includes(lowerSearchTerm)) ||
            (c.jobTitle && c.jobTitle.toLowerCase().includes(lowerSearchTerm)) ||
            (c.notes && c.notes.toLowerCase().includes(lowerSearchTerm)) 
        );
    }, [contacts, searchTerm, activeFilter]);

    return (
        <div className="w-full pb-20"> 
            {showModal && <ContactModal onSave={handleSave} onClose={handleCloseModal} contactToEdit={editingContact} companies={companies} quotes={quotes} />}
            {showDuplicateModal && <DuplicateResolverModal duplicates={duplicateGroups} onClose={() => setShowDuplicateModal(false)} onResolve={handleResolveDuplicates} />}
            
            {/* NEW: Import Settings Modal */}
            {showImportSettings && <ImportSettingsModal onClose={() => setShowImportSettings(false)} onProceed={handleProceedWithResponseImport} />}

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                <StatBadge icon={User} label="Total Contacts" count={stats.total} total={stats.total} color="gray" active={activeFilter === 'ALL'} onClick={() => setActiveFilter('ALL')} />
                <StatBadge icon={Mail} label="Emailed" count={stats.emailed} total={stats.total} color="purple" active={activeFilter === 'EMAILED'} onClick={() => setActiveFilter(activeFilter === 'EMAILED' ? 'ALL' : 'EMAILED')} />
                <StatBadge icon={Phone} label="Contacted" count={stats.contacted} total={stats.total} color="blue" active={activeFilter === 'CONTACTED'} onClick={() => setActiveFilter(activeFilter === 'CONTACTED' ? 'ALL' : 'CONTACTED')} />
                <StatBadge icon={Building} label="Visited" count={stats.visited} total={stats.total} color="green" active={activeFilter === 'VISITED'} onClick={() => setActiveFilter(activeFilter === 'VISITED' ? 'ALL' : 'VISITED')} />
                <StatBadge icon={Database} label="ESCO List" count={stats.esco} total={stats.total} color="orange" active={activeFilter === 'ESCO'} onClick={() => setActiveFilter(activeFilter === 'ESCO' ? 'ALL' : 'ESCO')} />
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 whitespace-nowrap">
                        {activeFilter !== 'ALL' && <Filter size={20} className="text-orange-600"/>}
                        {activeFilter === 'ALL' ? 'All Contacts' : `${activeFilter.charAt(0) + activeFilter.slice(1).toLowerCase()} List`}
                        <span className="text-gray-400 font-normal text-base ml-2">({filteredContacts.length})</span>
                    </h2>
                    
                    {filteredContacts.length > 0 && (
                        <button 
                            onClick={handleSelectAll}
                            className="text-xs font-bold text-orange-600 hover:text-orange-800 underline"
                        >
                            {selectedIds.size === filteredContacts.length ? 'Deselect All' : 'Select All'}
                        </button>
                    )}
                </div>

                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    <Button onClick={handleResponseImportClick} variant="secondary" title="Update Status from CSV"><FileCheck className="mr-2" size={16}/> Upload Responses</Button>
                    <Button onClick={handleScanForDuplicates} variant="secondary" title="Find duplicate contacts"><CheckSquare className="mr-2" size={16}/> Dedupe</Button>
                    <Button onClick={handleDeleteAllContacts} variant="danger">Reset</Button>
                    <Button onClick={handleImportClick} variant="secondary" disabled={isImporting}><Upload className="mr-2" size={16} /> Import</Button>
                    <Button onClick={handleOpenNewModal} variant="primary"><Plus className="mr-2" size={16} /> New</Button>
                </div>
            </div>

            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" style={{ display: 'none' }} />

            <div className="mb-4 relative">
                <Input type="text" placeholder="Search by Name, Company, or Job Title (e.g. 'CEM')..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredContacts.sort((a, b) => a.lastName.localeCompare(b.lastName)).map(contact => (
                    <ContactCard 
                        key={contact.id} 
                        contact={contact} 
                        onEdit={handleOpenEditModal} 
                        onDelete={handleDeleteContact} 
                        selected={selectedIds.has(contact.id)}
                        onToggleSelect={toggleSelection}
                    />
                ))}
            </div>
            {contacts.length === 0 && <div className="text-center py-10"><User size={48} className="mx-auto text-gray-400"/><p>No contacts yet.</p></div>}

            {selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 z-50 animate-in fade-in slide-in-from-bottom-4">
                    <span className="font-bold text-sm">{selectedIds.size} Selected</span>
                    
                    <div className="h-4 w-px bg-gray-600"></div>
                    
                    <button onClick={handleBulkEmail} className="flex items-center gap-2 hover:text-orange-400 transition-colors">
                        <Send size={18} />
                        <span className="text-sm font-bold">Email App</span>
                    </button>

                    <button onClick={handleBulkExport} className="flex items-center gap-2 hover:text-green-400 transition-colors">
                        <Download size={18} />
                        <span className="text-sm font-bold">Export CSV</span>
                    </button>

                    <button onClick={handleBulkDelete} className="flex items-center gap-2 hover:text-red-400 transition-colors">
                        <Trash2 size={18} />
                        <span className="text-sm font-bold">Delete</span>
                    </button>

                    <button onClick={() => setSelectedIds(new Set())} className="ml-2 text-gray-400 hover:text-white">
                        <X size={18}/>
                    </button>
                </div>
            )}
        </div>
    );
};

export default ContactsPage;
