import React, { useState, useEffect } from 'react'; // --- 1. IMPORT useEffect ---
import { db } from '../firebase'; 
import { collection, addDoc, serverTimestamp, doc, setDoc, deleteDoc } from "firebase/firestore";
import { Plus, X, Edit, Trash2 } from 'lucide-react';
import { Card, Button, Input, Textarea } from '../data/constants.jsx'; 

// Define the fixed list of stages to calculate the "next" step
const STAGE_ORDER = [
    'Lead',
    'Qualifying',
    'Site Visit / Demo',
    'Proposal Sent',
    'Negotiation',
    'Closed-Won',
    'Closed-Lost'
];

// --- UPDATED: Opportunity Card Component ---
// --- 2. ADD 'onEdit' PROP ---
const OpportunityCard = ({ opp, onUpdate, onDelete, onEdit }) => {
    // Logic to calculate the index of the next stage
    const currentStageIndex = STAGE_ORDER.indexOf(opp.stage);
    const nextStage = STAGE_ORDER[currentStageIndex + 1];

    // Handle button click: move to the next stage in the array
    const handleMoveForward = () => {
        if (nextStage) {
            onUpdate(opp.id, nextStage);
        }
    };
    
    return (
        <Card className="p-4 mb-3 rounded-lg shadow border border-gray-200">
            <div className="flex justify-between items-start">
                <h4 className="font-bold text-gray-800">{opp.customerName}</h4>
                <div className="flex gap-1">
                    {/* --- 3. HOOK UP EDIT BUTTON --- */}
                    <Button 
                        onClick={() => onEdit(opp)} // Call the onEdit function with the opp data
                        variant="secondary" 
                        className="p-1 h-auto w-auto"
                    >
                        <Edit size={14}/>
                    </Button>
                    {/* DELETE BUTTON - calls the actual delete function */}
                    <Button 
                        onClick={() => onDelete(opp.id)} 
                        variant="danger" 
                        className="p-1 h-auto w-auto"
                    >
                        <Trash2 size={14}/>
                    </Button>
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

            {/* HOOKED UP BUTTON: Only shows if there is a stage after the current one */}
            {nextStage && opp.stage !== 'Closed-Won' && opp.stage !== 'Closed-Lost' && (
                <div className="mt-3">
                    <Button 
                        onClick={handleMoveForward} 
                        variant="secondary" 
                        className="w-full text-xs py-1"
                    >
                        Move to {nextStage} Stage
                    </Button>
                </div>
            )}
        </Card>
    );
};


// --- UPDATED: New/Edit Opportunity Modal ---
// --- 4. ADD 'opportunityToEdit' PROP ---
const NewOpportunityModal = ({ onClose, onSave, opportunityToEdit }) => {
    // Check if we are in "edit mode"
    const isEditMode = Boolean(opportunityToEdit);

    // Form state
    const [customerName, setCustomerName] = useState('');
    const [project, setProject] = useState('');
    const [estimatedValue, setEstimatedValue] = useState(0);
    const [probability, setProbability] = useState(10);
    const [contactName, setContactName] = useState('');
    const [contactEmail, setContactEmail] = useState('');

    // --- 5. ADD useEffect TO PRE-FILL FORM ---
    // This runs when the modal opens. If we are editing,
    // it fills the form with the opportunity's data.
    useEffect(() => {
        if (isEditMode) {
            // We are EDITING, so pre-fill the form
            setCustomerName(opportunityToEdit.customerName);
            setProject(opportunityToEdit.project);
            setEstimatedValue(opportunityToEdit.estimatedValue);
            setProbability(opportunityToEdit.probability);
            setContactName(opportunityToEdit.contactName);
            setContactEmail(opportunityToEdit.contactEmail);
        } else {
            // We are CREATING, so ensure fields are default
            setCustomerName('');
            setProject('');
            setEstimatedValue(0);
            setProbability(10);
            setContactName('');
            setContactEmail('');
        }
    }, [opportunityToEdit, isEditMode]); // Rerun when the opp changes

    const handleSave = async () => {
        if (!customerName || !project || !contactName || !contactEmail) {
            alert('Please fill out all required fields.');
            return;
        }
        
        // --- 6. CLEAN UP 'oppData' ---
        // This object *only* contains the form data.
        // The parent (FunnelPage) will add 'createdAt' or 'stage'
        const oppData = {
            customerName,
            project,
            estimatedValue: Number(estimatedValue),
            probability: Number(probability),
            contactName,
            contactEmail,
        };
        
        onSave(oppData); // Pass this data back to the parent's handleSave
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-20 flex justify-center items-center p-4">
            <Card className="w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    {/* --- 7. DYNAMIC TITLE --- */}
                    <h3 className="text-2xl font-bold text-gray-800">
                        {isEditMode ? 'Edit Opportunity' : 'New Opportunity'}
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><X /></button>
                </div>
                <div className="space-y-4">
                    <Input label="Customer/Client Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g., Nestlé Ice Cream" required />
                    <Input label="Project Name" value={project} onChange={(e) => setProject(e.target.value)} placeholder="e.g., Laguna Plant - Cooling/Heat Recovery" required />
                    <Input label="Estimated Value ($)" type="number" value={estimatedValue} onChange={(e) => setEstimatedValue(e.target.value)} />
                    <Input label="Probability (%)" type="number" value={probability} onChange={(e) => setProbability(e.target.value)} />

                    <hr className="my-2"/>
                    <h4 className="text-lg font-semibold text-gray-700">Primary Contact</h4>
                    <Input label="Contact Name" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="e.g., Engineer Smith" required />
                    <Input label="Contact Email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="smith@client.com" required />
                </div>
                <div className="mt-6 flex justify-end">
                    {/* --- 8. DYNAMIC BUTTON TEXT --- */}
                    <Button onClick={handleSave} variant="primary">
                        <Plus className="mr-2" size={16} /> 
                        {isEditMode ? 'Update Opportunity' : 'Save Opportunity'}
                    </Button>
                </div>
            </Card>
        </div>
    );
};

// This is the main "Funnel" component
const FunnelPage = ({ opportunities, user }) => { 
    const [showModal, setShowModal] = useState(false);
    // --- 9. ADD STATE FOR EDITING ---
    // This will hold the 'opp' object when we click "Edit"
    const [editingOpportunity, setEditingOpportunity] = useState(null);
    
    // Define your sales stages
    const STAGES = STAGE_ORDER;

    // Function to handle saving a NEW opportunity to Firebase
    const handleSaveOpportunity = async (newOppData) => {
        if (!user || !user.uid) {
            alert("Error: You are not logged in.");
            return;
        }
        try {
            // Add creation-specific fields
            const newOpp = {
                ...newOppData,
                stage: 'Lead', // Default stage for new
                createdAt: serverTimestamp(), 
                notes: [] 
            };
            await addDoc(collection(db, "users", user.uid, "opportunities"), newOpp);
            console.log("Opportunity saved!");
            handleCloseModal(); // Use new close function
        } catch (e) {
            console.error("Error adding document: ", e);
            alert("Failed to save opportunity. Check console.");
        }
    };

    // --- 10. ADD "UPDATE" FUNCTION ---
    // This saves the *edited* data
    const handleUpdateFullOpportunity = async (oppData) => {
        if (!editingOpportunity || !editingOpportunity.id) return alert("Error: No opportunity selected for update.");
        if (!user || !user.uid) return alert("Error: User not logged in.");

        const oppRef = doc(db, "users", user.uid, "opportunities", editingOpportunity.id);
        try {
            await setDoc(oppRef, {
                ...oppData, // Use all the new data from the form
                lastModified: serverTimestamp() // Add a modified time
            }, { merge: true }); // Merge to not overwrite createdAt or stage
            
            console.log("Opportunity updated!");
            handleCloseModal(); // Use new close function
        } catch (e) {
            console.error("Error updating document: ", e);
            alert("Failed to update opportunity.");
        }
    };

    // --- 11. CREATE "SMART" SAVE FUNCTION ---
    // This function is passed to the modal.
    // It decides whether to CREATE or UPDATE.
    const handleSave = (oppDataFromModal) => {
        if (editingOpportunity) {
            // We are in EDIT mode
            handleUpdateFullOpportunity(oppDataFromModal);
        } else {
            // We are in NEW mode
            handleSaveOpportunity(oppDataFromModal);
        }
    };

    // --- 12. CREATE FUNCTIONS TO OPEN/CLOSE MODAL ---
    const handleOpenNewModal = () => {
        setEditingOpportunity(null); // Ensure we're NOT in edit mode
        setShowModal(true); // Open the modal
    };

    const handleOpenEditModal = (opp) => {
        setEditingOpportunity(opp); // Set *which* opp to edit
        setShowModal(true); // Open the modal
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingOpportunity(null); // ALWAYS reset on close
    };

    // --- (Existing code: handleUpdateOpportunityStage) ---
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
    // --- (Existing code: handleDeleteOpportunity) ---
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

    // --- (Existing code: getOppsByStage) ---
    const getOppsByStage = (stage) => {
        if (!opportunities) return []; // Handle loading state
        return opportunities.filter(opp => opp.stage === stage);
    };

    return (
        <div className="w-full">
            {/* --- 13. UPDATE MODAL RENDER --- */}
            {showModal && (
                <NewOpportunityModal 
                    onSave={handleSave} 
                    onClose={handleCloseModal}
                    opportunityToEdit={editingOpportunity} 
                />
            )}
            
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Sales Funnel</h1>
                {/* --- 14. UPDATE "NEW" BUTTON onClick --- */}
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
                                            // --- 15. PASS 'onEdit' PROP ---
                                            onEdit={handleOpenEditModal}
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
