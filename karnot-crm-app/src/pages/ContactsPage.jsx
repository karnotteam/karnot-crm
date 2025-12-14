import React, { useState, useRef, useMemo } from 'react'; 
import { db } from '../firebase'; 
import { collection, addDoc, serverTimestamp, doc, setDoc, deleteDoc, writeBatch, query, getDocs } from "firebase/firestore";
import Papa from 'papaparse'; 
import { Plus, X, Edit, Trash2, Building, Upload, Search, User, Mail, Phone, ShieldCheck, AlertTriangle, CheckSquare } from 'lucide-react';
import { Card, Button, Input, Checkbox } from '../data/constants.jsx'; 

// --- 1. Duplicate Resolver Modal ---
const DuplicateResolverModal = ({ duplicates, onClose, onResolve }) => {
    // duplicates structure: [ { key: 'email@test.com', items: [contactA, contactB] }, ... ]
    
    const [selectedToDelete, setSelectedToDelete] = useState(new Set());

    const toggleSelection = (id) => {
        const newSet = new Set(selectedToDelete);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedToDelete(newSet);
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
                
                <div className="overflow-y-auto flex-1 space-y-6 p-2">
                    <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
                        We found contacts that share the same <strong>Email</strong> or <strong>Full Name</strong>. 
                        Select the ones you want to <span className="text-red-600 font-bold">DELETE</span>. 
                        Unselected contacts will remain safe.
                    </p>

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
                                            <input 
                                                type="checkbox" 
                                                checked={selectedToDelete.has(contact.id)} 
                                                onChange={() => toggleSelection(contact.id)}
                                                className="w-5 h-5 text-red-600 rounded border-gray-300 focus:ring-red-500"
                                            />
                                            <div>
                                                <p className="font-bold text-gray-800">{contact.firstName} {contact.lastName}</p>
                                                <p className="text-xs text-gray-500">
                                                    {contact.companyName} • {contact.email || 'No Email'} • 
                                                    Added: {contact.createdAt?.seconds ? new Date(contact.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown'}
                                                </p>
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
                    <Button onClick={handleResolve} variant="danger" disabled={selectedToDelete.size === 0}>
                        <Trash2 className="mr-2" size={16}/> Delete Selected ({selectedToDelete.size})
                    </Button>
                </div>
            </Card>
        </div>
    );
};

// --- ContactModal Component ---
const ContactModal = ({ onClose, onSave, contactToEdit, companies }) => {
    const isEditMode = Boolean(contactToEdit);
    const [firstName, setFirstName] = useState(contactToEdit?.firstName || '');
    const [lastName, setLastName] = useState(contactToEdit?.lastName || '');
    const [jobTitle, setJobTitle] = useState(contactToEdit?.jobTitle || '');
    const [email, setEmail] = useState(contactToEdit?.email || '');
    const [phone, setPhone] = useState(contactToEdit?.phone || '');
    const [companyId, setCompanyId] = useState(contactToEdit?.companyId || (companies.length > 0 ? companies[0].id : ''));
    const [isVerified, setIsVerified] = useState(contactToEdit?.isVerified || false);

    const handleSave = () => {
        if (!firstName || !lastName || !companyId) {
            alert('Please enter a first name, last name, and select a company.');
            return;
        }
        const selectedCompany = companies.find(c => c.id === companyId);
        const companyName = selectedCompany ? selectedCompany.companyName : 'Unknown';

        const contactData = {
            firstName, lastName, jobTitle, email, phone, companyId, companyName, isVerified,
        };
        onSave(contactData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-20 flex justify-center items-center p-4">
            <Card className="w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-bold text-gray-800">{isEditMode ? 'Edit Contact' : 'New Contact'}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><X /></button>
                </div>
                <div className="space-y-4">
                    <div className="flex gap-4">
                        <Input label="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="e.g., Jane" required />
                        <Input label="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="e.g., Doe" required />
                    </div>
                    <Input label="Job Title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g., Sales Manager" />
                    <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g., jane.doe@company.com" />
                    <Input label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g., +63 917 123 4567" />
                    <hr />
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                        <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm" required>
                            {!companies || companies.length === 0 ? <option value="">Please add a company first</option> : companies.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                        </select>
                    </div>
                    <hr />
                    <Checkbox id="isVerifiedContact" label="Data Verified (Contact details are correct)" checked={isVerified} onChange={(e) => setIsVerified(e.target.checked)} />
                </div>
                <div className="mt-6 flex justify-end">
                    <Button onClick={handleSave} variant="primary"><Plus className="mr-2" size={16} /> {isEditMode ? 'Update Contact' : 'Save Contact'}</Button>
                </div>
            </Card>
        </div>
    );
};

// --- ContactCard Component ---
const ContactCard = ({ contact, onEdit, onDelete }) => (
    <Card className="p-4 rounded-lg shadow border border-gray-200 flex flex-col justify-between">
        <div>
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                    <h4 className="font-bold text-lg text-gray-800">{contact.firstName} {contact.lastName}</h4>
                    {contact.isVerified && <ShieldCheck size={18} className="text-green-600" title="Verified"/>}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                    <Button onClick={() => onEdit(contact)} variant="secondary" className="p-1 h-auto w-auto"><Edit size={14}/></Button>
                    <Button onClick={() => onDelete(contact.id)} variant="danger" className="p-1 h-auto w-auto"><Trash2 size={14}/></Button>
                </div>
            </div>
            {contact.jobTitle && <p className="text-sm text-orange-600">{contact.jobTitle}</p>}
        </div>
        <div className="mt-2 space-y-2">
            {contact.companyName && <div className="text-sm text-gray-600 flex items-center gap-2"><Building size={14} className="flex-shrink-0" /><span>{contact.companyName}</span></div>}
            {contact.email && <div className="text-sm text-gray-500 flex items-center gap-2"><Mail size={14} className="flex-shrink-0" /><a href={`mailto:${contact.email}`} className="hover:underline">{contact.email}</a></div>}
            {contact.phone && <div className="text-sm text-gray-500 flex items-center gap-2"><Phone size={14} className="flex-shrink-0" /><span>{contact.phone}</span></div>}
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
    
    // --- Duplicate Logic ---
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [duplicateGroups, setDuplicateGroups] = useState([]);

    const handleScanForDuplicates = () => {
        const groups = {};
        
        contacts.forEach(contact => {
            // Create a key based on Email (preferred) OR Name
            // If email is missing, fallback to Name
            let key = '';
            if (contact.email) {
                key = `Email: ${contact.email.toLowerCase().trim()}`;
            } else {
                key = `Name: ${contact.firstName.toLowerCase().trim()} ${contact.lastName.toLowerCase().trim()}`;
            }

            if (!groups[key]) groups[key] = [];
            groups[key].push(contact);
        });

        // Filter out groups with only 1 item (uniques)
        const conflicts = Object.keys(groups)
            .filter(key => groups[key].length > 1)
            .map(key => ({ key, items: groups[key] }));

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
        } catch (error) {
            console.error("Error resolving duplicates:", error);
            alert("Failed to delete duplicates.");
        }
    };

    // --- Standard Handlers (Save, Update, Delete) ---
    const handleSaveContact = async (contactData) => {
        if (!user || !user.uid) return alert("Error: User not logged in.");
        try {
            await addDoc(collection(db, "users", user.uid, "contacts"), { ...contactData, createdAt: serverTimestamp() });
            handleCloseModal(); 
        } catch (e) { console.error(e); alert("Failed to save contact."); }
    };

    const handleUpdateContact = async (contactData) => {
        if (!editingContact) return;
        try {
            await setDoc(doc(db, "users", user.uid, "contacts", editingContact.id), { ...contactData, lastModified: serverTimestamp() }, { merge: true });
            handleCloseModal(); 
        } catch (e) { console.error(e); alert("Failed to update contact."); }
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
    
    // --- Modified Import Handler (Prevents Duplicates) ---
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        setIsImporting(true);
        
        Papa.parse(file, {
            header: false, skipEmptyLines: true,
            complete: async (results) => {
                const allRows = results.data;
                // Header finding logic
                let headerRowIndex = -1;
                for (let i = 0; i < Math.min(allRows.length, 10); i++) {
                    const row = allRows[i];
                    if (row.includes("FirstName") && row.includes("LastName") && row.includes("EmailAddress")) {
                        headerRowIndex = i; break;
                    }
                }

                if (headerRowIndex === -1) {
                    alert("Error: Could not find required columns (FirstName, LastName, EmailAddress).");
                    setIsImporting(false); return;
                }

                const header = allRows[headerRowIndex];
                const dataRows = allRows.slice(headerRowIndex + 1);
                const colFirstName = header.indexOf("FirstName");
                const colLastName = header.indexOf("LastName");
                const colEmail = header.indexOf("EmailAddress");
                const colCompany = header.indexOf("Company"); 
                const colJobTitle = header.indexOf("Certificates"); 

                const batch = writeBatch(db);
                const contactsRef = collection(db, "users", user.uid, "contacts");
                let importCount = 0;
                let duplicateCount = 0;

                // Create a Set of existing identifiers for fast lookup
                const existingEmails = new Set(contacts.map(c => c.email?.toLowerCase().trim()).filter(Boolean));
                const existingNames = new Set(contacts.map(c => `${c.firstName} ${c.lastName}`.toLowerCase().trim()));

                dataRows.forEach(row => {
                    const firstName = row[colFirstName] ? row[colFirstName].trim() : '';
                    const lastName = row[colLastName] ? row[colLastName].trim() : '';
                    const email = colEmail !== -1 ? (row[colEmail] || '').trim() : '';
                    const csvCompanyName = colCompany !== -1 ? (row[colCompany] || '').trim() : '';
                    
                    if (!firstName || !lastName || csvCompanyName.includes("Certificate Number")) return; 

                    // --- CHECK: Skip if exists ---
                    const emailExists = email && existingEmails.has(email.toLowerCase());
                    const nameExists = existingNames.has(`${firstName} ${lastName}`.toLowerCase());

                    if (emailExists || nameExists) {
                        duplicateCount++;
                        return; // Skip this row
                    }

                    // Find Company ID
                    let companyMatch = null;
                    if (companies.length) {
                         const lowerC = csvCompanyName.toLowerCase().trim();
                         companyMatch = companies.find(c => c.companyName.toLowerCase().trim() === lowerC) 
                                     || companies.find(c => c.companyName.toLowerCase().includes(lowerC));
                    }

                    const contactData = {
                        firstName, lastName, 
                        jobTitle: colJobTitle !== -1 ? (row[colJobTitle] || '').trim() : '',
                        email, 
                        phone: '', 
                        companyId: companyMatch ? companyMatch.id : null,
                        companyName: companyMatch ? companyMatch.companyName : (csvCompanyName || 'N/A'),
                        isVerified: false, createdAt: serverTimestamp()
                    };
                    
                    batch.set(doc(contactsRef), contactData);
                    importCount++;
                });

                try {
                    await batch.commit();
                    alert(`Import Complete!\n\n✅ Added: ${importCount}\n🚫 Skipped (Duplicates): ${duplicateCount}`);
                } catch (error) {
                    console.error("Import Error: ", error);
                    alert("An error occurred during import.");
                }

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
        return contacts.filter(c => 
            c.firstName.toLowerCase().includes(lowerSearchTerm) || 
            c.lastName.toLowerCase().includes(lowerSearchTerm) ||
            (c.email && c.email.toLowerCase().includes(lowerSearchTerm))
        );
    }, [contacts, searchTerm]);

    return (
        <div className="w-full">
            {showModal && <ContactModal onSave={handleSave} onClose={handleCloseModal} contactToEdit={editingContact} companies={companies} />}
            {showDuplicateModal && <DuplicateResolverModal duplicates={duplicateGroups} onClose={() => setShowDuplicateModal(false)} onResolve={handleResolveDuplicates} />}

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Contacts ({filteredContacts.length})</h1>
                <div className="flex gap-2">
                    {/* Dedupe Button */}
                    <Button onClick={handleScanForDuplicates} variant="secondary" title="Find duplicate contacts">
                        <CheckSquare className="mr-2" size={16}/> Dedupe
                    </Button>
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
