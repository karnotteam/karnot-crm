import React, { useState, useEffect, useMemo } from 'react'; // --- 1. IMPORT useMemo ---
import { db } from '../firebase'; 
import { collection, addDoc, serverTimestamp, doc, setDoc, deleteDoc } from "firebase/firestore";
import { Plus, X, Edit, Trash2, FileText } from 'lucide-react';
import { Card, Button, Input, Textarea } from '../data/constants.jsx'; 

const STAGE_ORDER = [
    'Lead',
    'Qualifying',
    'Site Visit / Demo',
    'Proposal Sent',
    'Negotiation',
    'Closed-Won',
    'Closed-Lost'
];

// --- (OpportunityCard component is unchanged) ---
const OpportunityCard = ({ opp, onUpdate, onDelete, onEdit, onOpen }) => {
    const currentStageIndex = STAGE_ORDER.indexOf(opp.stage);
    const nextStage = STAGE_ORDER[currentStageIndex + 1];

    const handleMoveForward = () => {
        if (nextStage) {
            onUpdate(opp.id, nextStage);
        }
    };
    
    return (
        <Card className="p-4 mb-3 rounded-lg shadow border border-gray-200">
            <div className="flex justify-between items-start">
                <h4 className="font-bold text-gray-800">
                    {opp.customerName}
                </h4>
                <div className="flex gap-1">
                    <Button onClick={() => onEdit(opp)} variant="secondary" className="p-1 h-auto w-auto"><Edit size={14}/></Button>
                    <Button onClick={() => onDelete(opp.id)} variant="danger" className="p-1 h-auto w-auto"><Trash2 size={14}/></Button>
                </div>
            </div>
            <p className="text-sm text-gray-600">{opp.project}</p>
            <div className="mt-3 flex justify-between items-center">
                <span className="text-lg font-semibold text-orange-600">
                    ${(opp.estimatedValue || 0).toLocaleString()}
                </span>
                <span className="text-xs font-bold text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                    {opp.probability || 0}%
                </span>
            </div>
            <Button onClick={() => onOpen(opp)} variant="secondary" className="w-full text-xs py-1 mt-3">
                <FileText size={14} className="mr-2"/> View Details / Notes
            </Button>
            {nextStage && opp.stage !== 'Closed-Won' && opp.stage !== 'Closed-Lost' && (
                <div className="mt-2">
                    <Button onClick={handleMoveForward} variant="secondary" className="w-full text-xs py-1">
                        Move to {nextStage} Stage
                    </Button>
                </div>
            )}
        </Card>
    );
};


// --- 2. REBUILD THE NewOpportunityModal to be SMART ---
const NewOpportunityModal = ({ onClose, onSave, opportunityToEdit, companies, contacts }) => {
    const isEditMode = Boolean(opportunityToEdit);
    
    // --- New State ---
    const [companyId, setCompanyId] = useState(''); // Store the Company ID
    const [contactId, setContactId] = useState(''); // Store the Contact ID
    const [project, setProject] = useState('');
    const [estimatedValue, setEstimatedValue] = useState(0);
    const [probability, setProbability] = useState(10);
    const [contactEmail, setContactEmail] = useState(''); // This will now auto-fill

    // --- Smart Dropdown Logic ---
    // This filters the contacts list based on the selected company
    const availableContacts = useMemo(() => {
        if (!companyId) return []; // If no company is selected, show no contacts
        return contacts.filter(contact => contact.companyId === companyId);
    }, [companyId, contacts]);

    // --- Updated useEffect ---
    useEffect(() => {
        if (isEditMode) {
            // EDIT MODE: Pre-fill all fields from the opportunity
            const company = companies.find(c => c.companyName === opportunityToEdit.customerName);
            const companyId = company ? company.id : '';
            
            setCompanyId(companyId);
            setProject(opportunityToEdit.project);
            setEstimatedValue(opportunityToEdit.estimatedValue);
            setProbability(opportunityToEdit.probability);
            
            // Find the matching contact
            const contact = contacts.find(c => 
                c.companyId === companyId && 
                c.firstName.includes(opportunityToEdit.contactName.split(' ')[0]) &&
                c.lastName.includes(opportunityToEdit.contactName.split(' ')[1])
            );

            if (contact) {
                setContactId(contact.id);
                setContactEmail(contact.email);
            } else {
                // Handle contacts that were manually entered
                setContactId('manual'); // Set a special ID
                setContactEmail(opportunityToEdit.contactEmail);
            }

        } else {
            // NEW MODE: Set defaults
            const defaultCompanyId = companies.length > 0 ? companies[0].id : '';
            setCompanyId(defaultCompanyId);
            setProject('');
            setEstimatedValue(0);
            setProbability(10);
            
            // Auto-select first contact of that company
            const defaultContacts = contacts.filter(c => c.companyId === defaultCompanyId);
            if (defaultContacts.length > 0) {
                setContactId(defaultContacts[0].id);
                setContactEmail(defaultContacts[0].email);
            } else {
                setContactId('');
                setContactEmail('');
            }
        }
    }, [opportunityToEdit, isEditMode, companies, contacts]);

    // --- Event Handlers for Dropdowns ---
    const handleCompanyChange = (e) => {
        const newCompanyId = e.target.value;
        setCompanyId(newCompanyId);

        // Auto-select the first contact from this new company
        const newContacts = contacts.filter(c => c.companyId === newCompanyId);
        if (newContacts.length > 0) {
            setContactId(newContacts[0].id);
            setContactEmail(newContacts[0].email);
        } else {
            setContactId('');
            setContactEmail('');
        }
    };

    const handleContactChange = (e) => {
        const newContactId = e.target.value;
        setContactId(newContactId);
        
        // Auto-fill the email
        const contact = contacts.find(c => c.id === newContactId);
        if (contact) {
            setContactEmail(contact.email);
        } else {
            setContactEmail('');
        }
    };

    // --- Updated Save Function ---
    const handleSave = async () => {
        const selectedCompany = companies.find(c => c.id === companyId);
        const selectedContact = contacts.find(c => c.id === contactId);

        if (!selectedCompany || !selectedContact) {
            alert('Please select a valid company and contact.');
            return;
        }
        
        const oppData = {
            companyId: selectedCompany.id,
            customerName: selectedCompany.companyName, // Use 'customerName' to keep card display simple
            project,
            estimatedValue: Number(estimatedValue),
            probability: Number(probability),
            contactId: selectedContact.id,
            contactName: `${selectedContact.firstName} ${selectedContact.lastName}`,
            contactEmail: selectedContact.email,
        };
        
        onSave(oppData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-20 flex justify-center items-center p-4">
            <Card className="w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-bold text-gray-800">
                        {isEditMode ? 'Edit Opportunity' : 'New Opportunity'}
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><X /></button>
                </div>
                <div className="space-y-4">
                    
                    {/* --- Company Dropdown --- */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                        <select
                            value={companyId}
                            onChange={handleCompanyChange}
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

                    <Input label="Project Name" value={project} onChange={(e) => setProject(e.target.value)} placeholder="e.g., Laguna Plant - Cooling/Heat Recovery" required />
                    <Input label="Estimated Value ($)" type="number" value={estimatedValue} onChange={(e) => setEstimatedValue(e.target.value)} />
                    <Input label="Probability (%)" type="number" value={probability} onChange={(e) => setProbability(e.target.value)} />

                    <hr className="my-2"/>
                    <h4 className="text-lg font-semibold text-gray-700">Primary Contact</h4>
                    
                    {/* --- Smart Contact Dropdown --- */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                        <select
                            value={contactId}
                            onChange={handleContactChange}
                            className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                            required
                            disabled={availableContacts.length === 0} // Disable if no contacts
                        >
                            {availableContacts.length === 0 ? (
                                <option value="">No contacts found for this company</option>
                            ) : (
                                availableContacts.map(contact => (
                                    <option key={contact.id} value={contact.id}>
                                        {contact.firstName} {contact.lastName} ({contact.jobTitle})
                                    </option>
                                ))
                            )}
                            {isEditMode && contactId === 'manual' && (
                                <option value="manual">Manually Entered Contact</option>
                            )}
                        </select>
                    </div>
                    
                    {/* --- Auto-filled Email --- */}
                    <Input label="Contact Email" type="email" value={contactEmail} readOnly disabled />

                </div>
                <div className="mt-6 flex justify-end">
                    <Button onClick={handleSave} variant="primary">
                        <Plus className="mr-2" size={16} /> 
                        {isEditMode ? 'Update Opportunity' : 'Save Opportunity'}
                    </Button>
                </div>
            </Card>
        </div>
    );
};

// --- 3. ACCEPT 'contacts' PROP ---
const FunnelPage = ({ opportunities, user, onOpen, companies, contacts }) => { 
    const [showModal, setShowModal] = useState(false);
    const [editingOpportunity, setEditingOpportunity] = useState(null);
    
    const STAGES = STAGE_ORDER;

    // --- (All handle... functions are unchanged) ---
    const handleSaveOpportunity = async (newOppData) => {
        if (!user || !user.uid) {
            alert("Error: You are not logged in.");
            return;
        }
        try {
            const newOpp = {
                ...newOppData,
                stage: 'Lead', 
                createdAt: serverTimestamp(), 
                notes: [] 
            };
            await addDoc(collection(db, "users", user.uid, "opportunities"), newOpp);
            console.log("Opportunity saved!");
            handleCloseModal(); 
        } catch (e) {
            console.error("Error adding document: ", e);
            alert("Failed to save opportunity. Check console.");
        }
    };
    const handleUpdateFullOpportunity = async (oppData) => {
        if (!editingOpportunity || !editingOpportunity.id) return alert("Error: No opportunity selected for update.");
        if (!user || !user.uid) return alert("Error: User not logged in.");

        const oppRef = doc(db, "users", user.uid, "opportunities", editingOpportunity.id);
        try {
            await setDoc(oppRef, {
                ...oppData, 
                lastModified: serverTimestamp() 
            }, { merge: true }); 
            
            console.log("Opportunity updated!");
            handleCloseModal(); 
        } catch (e) {
            console.error("Error updating document: ", e);
            alert("Failed to update opportunity.");
        }
    };
    const handleSave = (oppDataFromModal) => {
        if (editingOpportunity) {
            handleUpdateFullOpportunity(oppDataFromModal);
        } else {
            handleSaveOpportunity(oppDataFromModal);
        }
    };
    const handleOpenNewModal = () => {
        setEditingOpportunity(null);
        setShowModal(true);
    };
    const handleOpenEditModal = (opp) => {
        setEditingOpportunity(opp);
        setShowModal(true);
    };
    const handleCloseModal = () => {
        setShowModal(false);
        setEditingOpportunity(null);
    };
    const handleUpdateOpportunityStage = async (oppId, newStage) => {
        if (!user || !user.uid) return alert("Error: User not logged in.");
        const oppRef = doc(db, "users", user.uid, "opportunities", oppId);
        let newProbability;
        switch (newStage) {
            case 'Lead': newProbability = 10; break;
            case 'Qualifying': newProbability = 25; break;
            case 'Site Visit / Demo': newProbability = 50; break;
            case 'Proposal Sent': newProbability = 75; break;
            case 'Negotiation': newProbability = 90; break;
            case 'Closed-Won': newProbability = 100; break;
            case 'Closed-Lost': newProbability = 0; break;
            default: newProbability = 0;
        }
        try {
            await setDoc(oppRef, {
                stage: newStage,
                probability: newProbability,
                lastModified: serverTimestamp()
            }, { merge: true });
            console.log(`Opportunity ${oppId} updated to ${newStage}`);
        } catch (error) {
            console.error("Error updating opportunity: ", error);
            alert("Failed to update lead stage.");
        }
    };
    const handleDeleteOpportunity = async (oppId) => {
        if (!user || !user.uid) return alert("Error: User not logged in.");
        if (window.confirm("Are you sure you want to permanently delete this Opportunity?")) {
            const oppRef = doc(db, "users", user.uid, "opportunities", oppId);
            try {
                await deleteDoc(oppRef);
                console.log(`Opportunity ${oppId} deleted`);
            } catch (error) {
                console.error("Error deleting opportunity: ", error);
                alert("Failed to delete lead.");
            }
        }
    };
    const getOppsByStage = (stage) => {
        if (!opportunities) return []; 
        return opportunities.filter(opp => opp.stage === stage);
    };
    // --- (End of unchanged handle... functions) ---

    return (
        <div className="w-full">
            {/* --- 4. PASS 'contacts' DOWN TO THE MODAL --- */}
            {showModal && <NewOpportunityModal 
                onSave={handleSave} 
                onClose={handleCloseModal}
                opportunityToEdit={editingOpportunity} 
                companies={companies}
                contacts={contacts} 
            />}
            
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Sales Funnel</h1>
                <Button onClick={handleOpenNewModal} variant="primary">
                    <Plus className="mr-2" size={16} /> New Opportunity
                </Button>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4" style={{minHeight: '60vh'}}>
                {STAGES.map(stage => {
                    const stageOpps = getOppsByStage(stage);
                    const stageValue = stageOpps.reduce((sum, opp) => sum + (opp.estimatedValue || 0), 0);
                    
                    let columnBg = "bg-gray-200";
                    if (stage === 'Closed-Won') columnBg = "bg-green-100";
                    if (stage === 'Closed-Lost') columnBg = "bg-red-100";

                    return (
                        <div key={stage} className={`flex-shrink-0 w-80 ${columnBg} p-3 rounded-xl shadow-sm`}>
                            <div className="mb-3 flex justify-between items-center">
                                <h3 className="font-semibold text-gray-800">{stage} ({stageOpps.length})</h3>
                                <span className="text-sm font-bold text-gray-700">${stageValue.toLocaleString()}</span>
                            </div>
                            <div className="h-full space-y-3">
                                {stageOpps
                                    .sort((a, b) => b.estimatedValue - a.estimatedValue) 
                                    .map(opp => (
                                        <OpportunityCard 
                                            key={opp.id} 
                                            opp={opp} 
                                            onUpdate={handleUpdateOpportunityStage}
                                            onDelete={handleDeleteOpportunity}
                                            onEdit={handleOpenEditModal}
                                            onOpen={onOpen}
                                        />
                                    ))
                                }
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default FunnelPage;
