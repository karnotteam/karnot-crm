import React, { useState, useRef, useMemo } from 'react'; 
import { db } from '../firebase'; 
import { collection, addDoc, serverTimestamp, doc, setDoc, deleteDoc, writeBatch, query, getDocs } from "firebase/firestore";
import Papa from 'papaparse'; 
import { Plus, X, Edit, Trash2, Building, Upload, Search, User, Mail, Phone, ShieldCheck, AlertTriangle, CheckSquare, Wand2, Calendar, MessageSquare, Square, Filter } from 'lucide-react';
import { Card, Button, Input, Checkbox, Textarea } from '../data/constants.jsx'; 

// --- 1. Stats Card Component ---
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

// --- 2. Duplicate Resolver (Unchanged) ---
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
        if(count > 0) alert(`Auto-selected ${count} newer duplicates. The oldest record in each group was kept safe.`);
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

// --- 3. ContactModal Component (Updated with Emailed) ---
const ContactModal = ({ onClose, onSave, contactToEdit, companies }) => {
    const isEditMode = Boolean(contactToEdit);
    
    // Core Data
    const [firstName, setFirstName] = useState(contactToEdit?.firstName || '');
    const [lastName, setLastName] = useState(contactToEdit?.lastName || '');
    const [jobTitle, setJobTitle] = useState(contactToEdit?.jobTitle || '');
    const [email, setEmail] = useState(contactToEdit?.email || '');
    const [phone, setPhone] = useState(contactToEdit?.phone || '');
    const [companyId, setCompanyId] = useState(contactToEdit?.companyId || (companies.length > 0 ? companies[0].id : ''));
    
    // Activity Tracking
    const [isVerified, setIsVerified] = useState(contactToEdit?.isVerified || false);
    const [isEmailed, setIsEmailed] = useState(contactToEdit?.isEmailed || false);
    const [isContacted, setIsContacted] = useState(contactToEdit?.isContacted || false);
    const [contactDate, setContactDate] = useState(contactToEdit?.contactDate || '');
    const [isVisited, setIsVisited] = useState(contactToEdit?.isVisited || false);
    const [visitDate, setVisitDate] = useState(contactToEdit?.visitDate || '');
    const [notes, setNotes] = useState(contactToEdit?.notes || '');

    const handleSave = () => {
        if (!firstName || !lastName || !companyId) {
            alert('Please enter a first name, last name, and select a company.');
            return;
        }
        const selectedCompany = companies.find(c => c.id === companyId);
        const companyName = selectedCompany ? selectedCompany.companyName : 'Unknown';

        const contactData = {
            firstName, lastName, jobTitle, email, phone, companyId, companyName, 
            isVerified, isEmailed, isContacted, contactDate, isVisited, visitDate, notes
        };
        onSave(contactData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-20 flex justify-center items-center p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-bold text-gray-800">{isEditMode ? 'Edit Contact' : 'New Contact'}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><X /></button>
                </div>
                <div className="space-y-6">
                    {/* Section 1: Basic Info */}
                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <Input label="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="e.g., Jane" required />
                            <Input label="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="e.g., Doe" required />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                                <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm" required>
                                    {!companies || companies.length === 0 ? <option value="">Please add a company first</option> : companies.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                                </select>
                            </div>
                            <Input label="Job Title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g., Sales Manager" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane.doe@company.com" />
                            <Input label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+63 917 123 4567" />
                        </div>
                    </div>

                    <hr className="border-gray-200" />

                    {/* Section 2: Activity Tracking */}
                    <div>
                        <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><Calendar size={18}/> Activity Tracking</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                                <Checkbox id="isVerified" label="Verified" checked={isVerified} onChange={(e) => setIsVerified(e.target.checked)} />
                            </div>
                            <div className="bg-purple-50 p-2 rounded-lg border border-purple-200">
                                <Checkbox id="isEmailed" label="Emailed" checked={isEmailed} onChange={(e) => setIsEmailed(e.target.checked)} />
                            </div>
                            <div className="bg-blue-50 p-2 rounded-lg border border-blue-200">
                                <Checkbox id="isContacted" label="Call/Met" checked={isContacted} onChange={(e) => setIsContacted(e.target.checked)} />
                                {isContacted && <Input type="date" value={contactDate} onChange={(e) => setContactDate(e.target.value)} className="text-xs mt-1" />}
                            </div>
                            <div className="bg-green-50 p-2 rounded-lg border border-green-200">
                                <Checkbox id="isVisited" label="Visited" checked={isVisited} onChange={(e) => setIsVisited(e.target.checked)} />
                                {isVisited && <Input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className="text-xs mt-1" />}
                            </div>
                        </div>
                        <Textarea label="Notes" rows="4" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes..." />
                    </div>
                </div>
                <div className="mt-6 flex justify-end">
                    <Button onClick={handleSave} variant="primary"><Plus className="mr-2" size={16} /> {isEditMode ? 'Update Contact' : 'Save Contact'}</Button>
                </div>
            </Card>
        </div>
    );
};

// --- 4. ContactCard Component (Updated with new badge) ---
const ContactCard = ({ contact, onEdit, onDelete }) => (
    <Card className="p-4 rounded-lg shadow border border-gray-200 flex flex-col justify-between h-full">
        <div>
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
            
            <div className="text-sm text-gray-600 flex items-center gap-2 mb-3">
                <Building size={14} className="flex-shrink-0" />
                <span className="truncate">{contact.companyName}</span>
            </div>

            <div className="space-y-1 mb-4">
                {contact.email && <div className="text-sm text-gray-500 flex items-center gap-2"><Mail size={14} className="flex-shrink-0" /><a href={`mailto:${contact.email}`} className="hover:underline truncate">{contact.email}</a></div>}
                {contact.phone && <div className="text-sm text-gray-500 flex items-center gap-2"><Phone size={14} className="flex-shrink-0" /><span>{contact.phone}</span></div>}
            </div>
            
            {contact.notes && (
                <div className="mb-3 bg-yellow-50 p-2 rounded text-xs text-gray-600 italic border border-yellow-100">
                    <MessageSquare size={12} className="inline mr-1 mb-0.5"/>
                    "{contact.notes.length > 50 ? contact.notes.substring(0, 50) + '...' : contact.notes}"
                </div>
            )}
        </div>

        {/* Status Checkboxes Footer */}
        <div className="pt-3 border-t border-gray-100 grid grid-cols-4 gap-1 text-[10px] text-gray-500 text-center">
            <div className={`p-1 rounded ${contact.isVerified ? 'bg-gray-100 text-green-700 font-bold' : ''}`}>
                <CheckSquare size={14} className={`mx-auto mb-1 ${contact.isVerified ? 'text-green-600' : 'text-gray-300'}`}/> Verified
            </div>
            <div className={`p-1 rounded ${contact.isEmailed ? 'bg-purple-50 text-purple-700 font-bold' : ''}`}>
                <Mail size={14} className={`mx-auto mb-1 ${contact.isEmailed ? 'text-purple-600' : 'text-gray-300'}`}/> Emailed
            </div>
            <div className={`p-1 rounded ${contact.isContacted ? 'bg-blue-50 text-blue-700 font-bold' : ''}`}>
                <Phone size={14} className={`mx-auto mb-1 ${contact.isContacted ? 'text-blue-600' : 'text-gray-300'}`}/> Call
            </div>
            <div className={`p-1 rounded ${contact.isVisited ? 'bg-green-50 text-green-700 font-bold' : ''}`}>
                <Building size={14} className={`mx-auto mb-1 ${contact.isVisited ? 'text-green-600' : 'text-gray-300'}`}/> Visit
            </div>
        </div>
    </Card>
);

// --- Main Page Component ---
const ContactsPage = ({ contacts, companies, user }) => { 
    const [showModal, setShowModal] = useState(false);
    const [editingContact, setEditingContact] = useState(null);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL', 'EMAILED', 'CONTACTED', 'VISITED'
    
    // --- Stats Calculation ---
    const stats = useMemo(() => {
        const total = contacts.length;
        const contacted = contacts.filter(c => c.isContacted).length;
        const visited = contacts.filter(c => c.isVisited).length;
        const emailed = contacts.filter(c => c.isEmailed).length;
        return { total, contacted, visited, emailed };
    }, [contacts]);

    // --- Duplicate Logic ---
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [duplicateGroups, setDuplicateGroups] = useState([]);

    const handleScanForDuplicates = () => {
        const groups = {};
        contacts.forEach(contact => {
            let key = contact.email ? `Email: ${contact.email.toLowerCase().trim()}` : `Name: ${contact.firstName.toLowerCase().trim()} ${contact.lastName.toLowerCase().trim()}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(contact);
        });
        const conflicts = Object.keys(groups).filter(key => groups[key].length > 1).map(key => ({ key, items: groups[key] }));
        if (conflicts.length === 0) {
            alert("Great news! No duplicates found based on Email or Name.");
        } else {
            setDuplicateGroups(conflicts);
            setShowDuplicateModal(true);
        }
    };

    const handleResolveDuplicates = async (idsToDelete) => {
        if (!user || !user.uid) return;
        try {
            const batch = writeBatch(db);
            idsToDelete.forEach(id => {
                const ref = doc(db, "users", user.uid, "contacts", id);
                batch.delete(ref);
            });
            await batch.commit();
            alert(`Successfully deleted ${idsToDelete.length} duplicates.`);
            setShowDuplicateModal(false);
        } catch (error) { console.error("Error resolving duplicates:", error); alert("Failed to delete duplicates."); }
    };

    // --- Standard Handlers ---
    const handleSaveContact = async (contactData) => {
        if (!user || !user.uid) return alert("Error: User not logged in.");
        try { await addDoc(collection(db, "users", user.uid, "contacts"), { ...contactData, createdAt: serverTimestamp() }); handleCloseModal(); } catch (e) { console.error(e); alert("Failed to save contact."); }
    };

    const handleUpdateContact = async (contactData) => {
        if (!editingContact) return;
        try { await setDoc(doc(db, "users", user.uid, "contacts", editingContact.id), { ...contactData, lastModified: serverTimestamp() }, { merge: true }); handleCloseModal(); } catch (e) { console.error(e); alert("Failed to update contact."); }
    };
    
    const handleDeleteContact = async (contactId) => {
        if (window.confirm("Are you sure you want to delete this contact?")) {
            try { await deleteDoc(doc(db, "users", user.uid, "contacts", contactId)); } catch (e) { alert("Failed to delete."); }
        }
    };

    const handleSave = (data) => editingContact ? handleUpdateContact(data) : handleSaveContact(data);
    const handleOpenNewModal = () => { setEditingContact(null); setShowModal(true); };
    const handleOpenEditModal = (c) => { setEditingContact(c); setShowModal(true); };
    const handleCloseModal = () => { setEditingContact(null); setShowModal(false); };
    const handleImportClick = () => fileInputRef.current.click();
    
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        setIsImporting(true);
        Papa.parse(file, {
            header: false, skipEmptyLines: true,
            complete: async (results) => {
                const allRows = results.data;
                let headerRowIndex = -1;
                for (let i = 0; i < Math.min(allRows.length, 10); i++) {
                    const row = allRows[i];
                    if ((row.includes("FirstName") || row.includes("First Name")) && (row.includes("LastName") || row.includes("Last Name"))) {
                        headerRowIndex = i; break;
                    }
                }
                if (headerRowIndex === -1) { alert("Error: Could not find 'FirstName' and 'LastName' columns."); setIsImporting(false); return; }
                const header = allRows[headerRowIndex];
                const dataRows = allRows.slice(headerRowIndex + 1);
                
                const findCol = (options) => header.findIndex(h => options.includes(h.trim()));
                const colFirstName = findCol(["FirstName", "First Name"]);
                const colLastName = findCol(["LastName", "Last Name"]);
                const colEmail = findCol(["EmailAddress", "Email", "Email Address"]);
                const colCompany = findCol(["Company", "Organization", "Business"]); 
                const colJobTitle = findCol(["Certificates", "Job Title", "Title", "Position"]); 

                const batch = writeBatch(db);
                const contactsRef = collection(db, "users", user.uid, "contacts");
                let importCount = 0;
                let duplicateCount = 0;
                const existingEmails = new Set(contacts.map(c => c.email?.toLowerCase().trim()).filter(Boolean));
                const existingNames = new Set(contacts.map(c => `${c.firstName} ${c.lastName}`.toLowerCase().trim()));

                dataRows.forEach(row => {
                    const firstName = row[colFirstName] ? row[colFirstName].trim() : '';
                    const lastName = row[colLastName] ? row[colLastName].trim() : '';
                    const email = colEmail !== -1 ? (row[colEmail] || '').trim() : '';
                    const csvCompanyName = colCompany !== -1 ? (row[colCompany] || '').trim() : '';
                    
                    if (!firstName || !lastName || csvCompanyName.includes("Certificate Number")) return; 
                    if ((email && existingEmails.has(email.toLowerCase())) || existingNames.has(`${firstName} ${lastName}`.toLowerCase())) { duplicateCount++; return; }

                    let companyMatch = null;
                    if (companies.length) {
                         const lowerC = csvCompanyName.toLowerCase().trim();
                         companyMatch = companies.find(c => c.companyName.toLowerCase().trim() === lowerC) || companies.find(c => c.companyName.toLowerCase().includes(lowerC));
                    }

                    batch.set(doc(contactsRef), {
                        firstName, lastName, jobTitle: colJobTitle !== -1 ? (row[colJobTitle] || '').trim() : '',
                        email, phone: '', companyId: companyMatch ? companyMatch.id : null,
                        companyName: companyMatch ? companyMatch.companyName : (csvCompanyName || 'N/A'),
                        isVerified: false, isEmailed: false, isContacted: false, isVisited: false, notes: '',
                        createdAt: serverTimestamp()
                    });
                    importCount++;
                });

                try { await batch.commit(); alert(`Import Complete!\n✅ Added: ${importCount}\n🚫 Skipped (Duplicates): ${duplicateCount}`); } 
                catch (error) { console.error("Import Error: ", error); alert("An error occurred during import."); }
                setIsImporting(false);
                event.target.value = null;
            },
            error: () => { alert("Failed to parse CSV."); setIsImporting(false); }
        });
    };

    const handleDeleteAllContacts = async () => {
         if (!window.confirm("WARNING: Delete ALL contacts? This cannot be undone.")) return;
         const q = query(collection(db, "users", user.uid, "contacts"));
         const snapshot = await getDocs(q);
         const batch = writeBatch(db);
         snapshot.forEach(doc => batch.delete(doc.ref));
         await batch.commit();
         alert("All contacts deleted.");
    };

    const filteredContacts = useMemo(() => {
        const lowerSearchTerm = searchTerm.toLowerCase();
        let list = contacts;
        
        // 1. Filter by Status
        if (activeFilter === 'EMAILED') list = list.filter(c => c.isEmailed);
        if (activeFilter === 'CONTACTED') list = list.filter(c => c.isContacted);
        if (activeFilter === 'VISITED') list = list.filter(c => c.isVisited);
        
        // 2. Filter by Search
        return list.filter(c => 
            c.firstName.toLowerCase().includes(lowerSearchTerm) || 
            c.lastName.toLowerCase().includes(lowerSearchTerm) ||
            (c.email && c.email.toLowerCase().includes(lowerSearchTerm)) ||
            (c.companyName && c.companyName.toLowerCase().includes(lowerSearchTerm))
        );
    }, [contacts, searchTerm, activeFilter]);

    return (
        <div className="w-full">
            {showModal && <ContactModal onSave={handleSave} onClose={handleCloseModal} contactToEdit={editingContact} companies={companies} />}
            {showDuplicateModal && <DuplicateResolverModal duplicates={duplicateGroups} onClose={() => setShowDuplicateModal(false)} onResolve={handleResolveDuplicates} />}

            {/* --- Stats Row --- */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatBadge 
                    icon={User} label="Total Contacts" count={stats.total} total={stats.total} color="gray" 
                    active={activeFilter === 'ALL'} onClick={() => setActiveFilter('ALL')}
                />
                <StatBadge 
                    icon={Mail} label="Emailed" count={stats.emailed} total={stats.total} color="purple" 
                    active={activeFilter === 'EMAILED'} onClick={() => setActiveFilter(activeFilter === 'EMAILED' ? 'ALL' : 'EMAILED')}
                />
                <StatBadge 
                    icon={Phone} label="Contacted" count={stats.contacted} total={stats.total} color="blue" 
                    active={activeFilter === 'CONTACTED'} onClick={() => setActiveFilter(activeFilter === 'CONTACTED' ? 'ALL' : 'CONTACTED')}
                />
                <StatBadge 
                    icon={Building} label="Visited" count={stats.visited} total={stats.total} color="green" 
                    active={activeFilter === 'VISITED'} onClick={() => setActiveFilter(activeFilter === 'VISITED' ? 'ALL' : 'VISITED')}
                />
            </div>

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    {activeFilter !== 'ALL' && <Filter size={20} className="text-orange-600"/>}
                    {activeFilter === 'ALL' ? 'All Contacts' : `${activeFilter.charAt(0) + activeFilter.slice(1).toLowerCase()} List`}
                    <span className="text-gray-400 font-normal text-base ml-2">({filteredContacts.length})</span>
                </h2>
                <div className="flex gap-2">
                    <Button onClick={handleScanForDuplicates} variant="secondary" title="Find duplicate contacts"><CheckSquare className="mr-2" size={16}/> Dedupe</Button>
                    <Button onClick={handleDeleteAllContacts} variant="danger">Delete All</Button>
                    <Button onClick={handleImportClick} variant="secondary" disabled={isImporting}><Upload className="mr-2" size={16} /> {isImporting ? '...' : 'Import CSV'}</Button>
                    <Button onClick={handleOpenNewModal} variant="primary"><Plus className="mr-2" size={16} /> New Contact</Button>
                </div>
            </div>

            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" style={{ display: 'none' }} />

            <div className="mb-4 relative">
                <Input type="text" placeholder="Search contacts..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredContacts.sort((a, b) => a.lastName.localeCompare(b.lastName)).map(contact => (
                    <ContactCard key={contact.id} contact={contact} onEdit={handleOpenEditModal} onDelete={handleDeleteContact} />
                ))}
            </div>
            {contacts.length === 0 && <div className="text-center py-10"><User size={48} className="mx-auto text-gray-400"/><p>No contacts yet.</p></div>}
        </div>
    );
};

export default ContactsPage;
