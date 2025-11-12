import React, { useState, useRef, useMemo } from 'react'; 
import { db } from '../firebase'; 
import { collection, addDoc, serverTimestamp, doc, setDoc, deleteDoc, writeBatch, query, getDocs } from "firebase/firestore";
// --- 1. IMPORT 'ShieldCheck' icon ---
import { Plus, X, Edit, Trash2, Building, Globe, Upload, Search, User, Mail, Phone, Briefcase, ShieldCheck } from 'lucide-react';
// --- 2. IMPORT 'Checkbox' ---
import { Card, Button, Input, Textarea, Checkbox } from '../data/constants.jsx'; 

// --- ContactModal Component ---
const ContactModal = ({ onClose, onSave, contactToEdit, companies }) => {
    const isEditMode = Boolean(contactToEdit);
    
    const [firstName, setFirstName] = useState(contactToEdit?.firstName || '');
    const [lastName, setLastName] = useState(contactToEdit?.lastName || '');
    const [jobTitle, setJobTitle] = useState(contactToEdit?.jobTitle || '');
    const [email, setEmail] = useState(contactToEdit?.email || '');
    const [phone, setPhone] = useState(contactToEdit?.phone || '');
    const [companyId, setCompanyId] = useState(contactToEdit?.companyId || (companies.length > 0 ? companies[0].id : ''));
    // --- 3. ADD State for 'isVerified' ---
    const [isVerified, setIsVerified] = useState(contactToEdit?.isVerified || false);

    const handleSave = () => {
        if (!firstName || !lastName || !companyId) {
            alert('Please enter a first name, last name, and select a company.');
            return;
        }

        const selectedCompany = companies.find(c => c.id === companyId);
        const companyName = selectedCompany ? selectedCompany.companyName : 'Unknown';

        const contactData = {
            firstName,
            lastName,
            jobTitle,
            email,
            phone,
            companyId, 
            companyName,
            isVerified, // --- 4. ADD 'isVerified' to saved data ---
        };
        onSave(contactData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-20 flex justify-center items-center p-4">
            <Card className="w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-bold text-gray-800">
                        {isEditMode ? 'Edit Contact' : 'New Contact'}
                    </h3>
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
                        <select
                            value={companyId}
                            onChange={(e) => setCompanyId(e.target.value)}
                            className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                            required
                        >
                            {!companies || companies.length === 0 ? (
                                <option value="">Please add a company first</option>
                            ) : (
                                companies.map(company => (
                                    <option key={company.id} value={company.id}>
                                        {company.companyName}
                                    </option>
                                ))
                            )}
                        </select>
                    </div>

                    {/* --- 5. ADD 'Verified' Checkbox --- */}
                    <hr />
                    <Checkbox 
                        id="isVerifiedContact"
                        label="Data Verified (Contact details are correct)"
                        checked={isVerified}
                        onChange={(e) => setIsVerified(e.target.checked)}
                    />
                </div>
                <div className="mt-6 flex justify-end">
                    <Button onClick={handleSave} variant="primary">
                        <Plus className="mr-2" size={16} /> 
                        {isEditMode ? 'Update Contact' : 'Save Contact'}
                    </Button>
                </div>
            </Card>
        </div>
    );
};

// --- ContactCard Component ---
const ContactCard = ({ contact, onEdit, onDelete }) => {
    return (
        <Card className="p-4 rounded-lg shadow border border-gray-200 flex flex-col justify-between">
            <div>
                <div className="flex justify-between items-start">
                    {/* --- 6. ADD 'Verified' Icon to Title --- */}
                    <div className="flex items-center gap-2">
                        <h4 className="font-bold text-lg text-gray-800">{contact.firstName} {contact.lastName}</h4>
                        {contact.isVerified && (
                            <ShieldCheck size={18} className="text-green-600" title="Verified"/>
                        )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                        <Button onClick={() => onEdit(contact)} variant="secondary" className="p-1 h-auto w-auto"><Edit size={14}/></Button>
                        <Button onClick={() => onDelete(contact.id)} variant="danger" className="p-1 h-auto w-auto"><Trash2 size={14}/></Button>
                    </div>
                </div>
                {contact.jobTitle && (
                    <p className="text-sm text-orange-600">{contact.jobTitle}</p>
                )}
            </div>
            
            <div className="mt-2 space-y-2">
                {contact.companyName && (
                    <div className="text-sm text-gray-600 flex items-center gap-2">
                        <Building size={14} className="flex-shrink-0" />
                        <span>{contact.companyName}</span>
                    </div>
                )}
                {contact.email && (
                    <div className="text-sm text-gray-500 flex items-center gap-2">
                        <Mail size={14} className="flex-shrink-0" />
                        <a href={`mailto:${contact.email}`} className="hover:underline">{contact.email}</a>
                    </div>
                )}
                {contact.phone && (
                    <div className="text-sm text-gray-500 flex items-center gap-2">
                        <Phone size={14} className="flex-shrink-0" />
                        <span>{contact.phone}</span>
                    </div>
                )}
            </div>
        </Card>
    );
};


// --- Main Contacts Page Component ---
// (The rest of this component is unchanged)
const ContactsPage = ({ contacts, companies, user }) => { 
    const [showModal, setShowModal] = useState(false);
    const [editingContact, setEditingContact] = useState(null);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef(null);
    const [searchTerm, setSearchTerm] = useState('');

    const handleSaveContact = async (contactData) => {
        if (!user || !user.uid) return alert("Error: User not logged in.");
        try {
            const newContact = { ...contactData, createdAt: serverTimestamp() };
            await addDoc(collection(db, "users", user.uid, "contacts"), newContact);
            handleCloseModal(); 
        } catch (e) {
            console.error("Error adding document: ", e);
            alert("Failed to save contact.");
        }
    };
    const handleUpdateContact = async (contactData) => {
        if (!editingContact || !editingContact.id) return;
        if (!user || !user.uid) return alert("Error: User not logged in.");
        const contactRef = doc(db, "users", user.uid, "contacts", editingContact.id);
        try {
            await setDoc(contactRef, { ...contactData, lastModified: serverTimestamp() }, { merge: true });
            handleCloseModal(); 
        } catch (e) {
            console.error("Error updating document: ", e);
            alert("Failed to update contact.");
        }
    };
    const handleDeleteContact = async (contactId) => {
        if (!user || !user.uid) return alert("Error: User not logged in.");
        // This is the single-delete function, we keep the confirm here
        if (window.confirm("Are you sure you want to delete this contact?")) {
            const contactRef = doc(db, "users", user.uid, "contacts", contactId);
            try {
                await deleteDoc(contactRef);
            } catch (error) {
                console.error("Error deleting contact: ", error);
                alert("Failed to delete contact.");
            }
        }
    };
    const handleSave = (contactData) => {
        if (editingContact) {
            handleUpdateContact(contactData);
        } else {
            handleSaveContact(contactData);
        }
    };
    const handleOpenNewModal = () => {
        setEditingContact(null);
        setShowModal(true);
    };
    const handleOpenEditModal = (contact) => {
        setEditingContact(contact);
        setShowModal(true);
    };
    const handleCloseModal = () => {
        setEditingContact(null);
        setShowModal(false);
    };
    const handleImportClick = () => {
        fileInputRef.current.click();
    };

    const handleDeleteAllContacts = async () => {
        if (!user || !user.uid) return alert("Error: User not logged in.");
        
        if (!window.confirm("ARE YOU SURE? This will permanently delete ALL contacts for your user.")) {
            return;
        }
        if (!window.confirm("SECOND CONFIRMATION: This action cannot be undone. Are you absolutely sure you want to delete all contacts?")) {
            return;
        }

        console.log("Starting to delete all contacts...");
        try {
            const contactsRef = collection(db, "users", user.uid, "contacts");
            const q = query(contactsRef);
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                alert("No contacts to delete.");
                return;
            }

            const batch = writeBatch(db);
            querySnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            alert(`Successfully deleted ${querySnapshot.size} contacts.`);
            console.log("All contacts deleted.");

        } catch (error) {
            console.error("Error deleting all contacts: ", error);
            alert("An error occurred while deleting contacts. See console.");
        }
    };
    
    const findCompanyId = (companyName) => {
        if (!companyName || !companies.length) return null;
        const lowerName = companyName.toLowerCase().trim();
        
        let match = companies.find(c => c.companyName.toLowerCase().trim() === lowerName);
        if (match) return { id: match.id, name: match.companyName };
        
        match = companies.find(c => c.companyName.toLowerCase().includes(lowerName));
        if (match) return { id: match.id, name: match.companyName };
        
        return null;
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        setIsImporting(true);
        
        Papa.parse(file, {
            header: false,
            skipEmptyLines: true,
            complete: async (results) => {
                const allRows = results.data;
                
                if (allRows.length < 2) {
                    alert("File is empty or only contains a header.");
                    setIsImporting(false);
                    return;
                }

                let headerRowIndex = -1;
                for (let i = 0; i < Math.min(allRows.length, 10); i++) {
                    const row = allRows[i];
                    if (row.includes("FirstName") && row.includes("LastName") && row.includes("EmailAddress") && row.includes("Company")) {
                        headerRowIndex = i;
                        break;
                    }
                }

                if (headerRowIndex === -1) {
                    alert("Error: Could not find a header row containing 'FirstName', 'LastName', 'EmailAddress', and 'Company'. Please check the file.");
                    setIsImporting(false);
                    return;
                }

                const header = allRows[headerRowIndex];
                const dataRows = allRows.slice(headerRowIndex + 1);

                const colFirstName = header.indexOf("FirstName");
                const colLastName = header.indexOf("LastName");
                const colEmail = header.indexOf("EmailAddress");
                const colCompany = header.indexOf("Company"); 
                const colJobTitle = header.indexOf("Certificates"); 

                if (colFirstName === -1 || colLastName === -1) {
                    alert("Error: Header is missing required columns 'FirstName' or 'LastName'.");
                    setIsImporting(false);
                    return;
                }
                
                const batch = writeBatch(db);
                const contactsRef = collection(db, "users", user.uid, "contacts");
                let importCount = 0;
                let unmatchedCount = 0;

                dataRows.forEach(row => {
                    const firstName = row[colFirstName] ? row[colFirstName].trim() : '';
                    const lastName = row[colLastName] ? row[colLastName].trim() : '';
                    const csvCompanyName = colCompany !== -1 ? (row[colCompany] || '').trim() : '';
                    
                    const garbageText = "Certificate Number Salutation";
                    if (!firstName || !lastName || (csvCompanyName && csvCompanyName.includes(garbageText))) {
                        return; 
                    }

                    const companyMatch = findCompanyId(csvCompanyName);
                    const jobTitle = colJobTitle !== -1 ? (row[colJobTitle] || '').trim() : '';

                    const contactData = {
                        firstName,
                        lastName,
                        jobTitle: jobTitle,
                        email: colEmail !== -1 ? (row[colEmail] || '').trim() : '',
                        phone: '', 
                        companyId: companyMatch ? companyMatch.id : null,
                        companyName: companyMatch ? companyMatch.name : (csvCompanyName || 'N/A'),
                        isVerified: false, // Default new imports to not verified
                        createdAt: serverTimestamp()
                    };
                    
                    if (!companyMatch && csvCompanyName) {
                        unmatchedCount++;
                    }
                    
                    const docRef = doc(contactsRef); 
                    batch.set(docRef, contactData);
                    importCount++;
                });

                try {
                    await batch.commit();
                    alert(`Successfully imported ${importCount} contacts! \n(${unmatchedCount} contacts had company names that could not be automatically matched.)`);
                } catch (error) {
                    console.error("Error importing contacts: ", error);
                    alert("An error occurred during import. See console for details.");
                }

                setIsImporting(false);
                event.target.value = null;
            },
            error: (error) => {
                console.error("PapaParse error:", error);
                alert("Failed to parse CSV file.");
                setIsImporting(false);
            }
        });
    };

    const filteredContacts = useMemo(() => {
        const lowerSearchTerm = searchTerm.toLowerCase();
        if (!lowerSearchTerm) {
            return contacts; 
        }
        return contacts.filter(contact =>
            contact.firstName.toLowerCase().includes(lowerSearchTerm) ||
            contact.lastName.toLowerCase().includes(lowerSearchTerm) ||
            (contact.companyName && contact.companyName.toLowerCase().includes(lowerSearchTerm)) ||
            (contact.email && contact.email.toLowerCase().includes(lowerSearchTerm))
        );
    }, [contacts, searchTerm]);

    return (
        <div className="w-full">
            {showModal && (
                <ContactModal 
                    onSave={handleSave} 
                    onClose={handleCloseModal}
                    contactToEdit={editingContact} 
                    companies={companies}
                />
            )}
            
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Contacts ({filteredContacts.length})</h1>
                <div className="flex flex-wrap gap-2 justify-end">
                    <Button 
                        onClick={handleDeleteAllContacts}
                        variant="danger"
                        disabled={isImporting}
                    >
                        <Trash2 className="mr-2" size={16} />
                        Delete All
                    </Button>
                    <Button 
                        onClick={handleImportClick} 
                        variant="secondary"
                        disabled={isImporting}
                    >
                        <Upload className="mr-2" size={16} />
                        {isImporting ? 'Importing...' : 'Import CSV'}
                    </Button>
                    <Button 
                        onClick={handleOpenNewModal} 
                        variant="primary"
                        disabled={isImporting}
                    >
                        <Plus className="mr-2" size={16} /> New Contact
                    </Button>
                </div>
            </div>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv"
                style={{ display: 'none' }}
            />

            <div className="mb-4 relative">
                <Input
                    type="text"
                    placeholder="Search contacts by name, company, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredContacts
                    .sort((a, b) => a.lastName.localeCompare(b.lastName)) // Sort by last name
                    .map(contact => (
                        <ContactCard 
                            key={contact.id} 
                            contact={contact} 
                            onEdit={handleOpenEditModal}
                            onDelete={handleDeleteContact}
                        />
                    ))
                }
            </div>
            
            {contacts.length === 0 && (
                <div className="text-center py-10 bg-white rounded-lg shadow">
                    <User size={48} className="mx-auto text-gray-400" />
                    <h3 className="mt-2 text-lg font-semibold text-gray-700">No contacts found.</h3>
                    <p className="mt-1 text-sm text-gray-500">Click "New Contact" or "Import CSV" to add your first one.</p>
                </div>
            )}
            
            {contacts.length > 0 && filteredContacts.length === 0 && (
                <div className="text-center py-10 bg-white rounded-lg shadow">
                    <Search size={48} className="mx-auto text-gray-400" />
                    <h3 className="mt-2 text-lg font-semibold text-gray-700">No contacts match your search.</h3>
                    <p className="mt-1 text-sm text-gray-500">Try a different search term.</p>
                </div>
            )}
        </div>
    );
};

export default ContactsPage;
