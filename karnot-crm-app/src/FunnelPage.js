import React, { useState } from 'react';
import { db } from '../firebase'; // Import our database
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Plus, X } from 'lucide-react';
import { Card, Button, Input } from '../data/constants'; // Import your helper components

// This is the new "Opportunity" card component
const OpportunityCard = ({ opp }) => {
    return (
        <div className="bg-white p-4 mb-3 rounded-lg shadow border border-gray-200 cursor-pointer hover:shadow-md">
            <h4 className="font-bold text-gray-800">{opp.customerName}</h4>
            <p className="text-sm text-gray-600">{opp.project}</p>
            <div className="mt-3 flex justify-between items-center">
                <span className="text-lg font-semibold text-orange-600">
                    ${(opp.estimatedValue || 0).toLocaleString()}
                </span>
                <span className="text-xs font-bold text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                    {opp.probability || 0}%
                </span>
            </div>
        </div>
    );
};

// This is the modal (popup) for adding a new deal
const NewOpportunityModal = ({ onClose, onSave }) => {
    const [customerName, setCustomerName] = useState('');
    const [project, setProject] = useState('');
    const [estimatedValue, setEstimatedValue] = useState(0);
    const [probability, setProbability] = useState(10); // Default probability

    const handleSave = async () => {
        if (!customerName || !project) {
            alert('Please fill out Customer Name and Project.');
            return;
        }
        
        const newOpp = {
            customerName,
            project,
            estimatedValue: Number(estimatedValue),
            stage: 'Lead', // All new deals start as a "Lead"
            probability: Number(probability),
            createdAt: serverTimestamp(), // Firebase adds the current date
            notes: [] // An empty log for notes
        };
        
        onSave(newOpp);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-20 flex justify-center items-center p-4">
            <Card className="w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-bold text-gray-800">New Opportunity</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><X /></button>
                </div>
                <div className="space-y-4">
                    <Input label="Customer Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g., Nestlé Ice Cream" />
                    <Input label="Project" value={project} onChange={(e) => setProject(e.target.value)} placeholder="e.g., Laguna Plant - Cooling/Heat Recovery" />
                    <Input label="Estimated Value ($)" type="number" value={estimatedValue} onChange={(e) => setEstimatedValue(e.target.value)} />
                    <Input label="Probability (%)" type="number" value={probability} onChange={(e) => setProbability(e.target.value)} />
                </div>
                <div className="mt-6 flex justify-end">
                    <Button onClick={handleSave} variant="primary">
                        <Plus className="mr-2" size={16} /> Save Opportunity
                    </Button>
                </div>
            </Card>
        </div>
    );
};

// This is the main "Funnel" component
const FunnelPage = ({ opportunities, user }) => { // We get the user to save data
    const [showModal, setShowModal] = useState(false);
    
    // Define your sales stages
    // We added "Closed-Won" and "Closed-Lost"
    const STAGES = [
        'Lead',
        'Qualifying',
        'Site Visit / Demo',
        'Proposal Sent',
        'Negotiation',
        'Closed-Won',
        'Closed-Lost'
    ];

    // This function adds the new Opportunity to your Firebase database
    const handleSaveOpportunity = async (newOpp) => {
        if (!user || !user.uid) {
            alert("Error: You are not logged in.");
            return;
        }
        try {
            // Save this new opportunity under the logged-in user's data
            await addDoc(collection(db, "users", user.uid, "opportunities"), newOpp);
            console.log("Opportunity saved!");
            setShowModal(false);
        } catch (e) {
            console.error("Error adding document: ", e);
            alert("Failed to save opportunity. Check console.");
        }
    };

    // This filters your opportunities for a specific stage
    const getOppsByStage = (stage) => {
        if (!opportunities) return []; // Handle loading state
        return opportunities.filter(opp => opp.stage === stage);
    };

    return (
        <div className="w-full">
            {showModal && <NewOpportunityModal onSave={handleSaveOpportunity} onClose={() => setShowModal(false)} />}
            
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Sales Funnel</h1>
                <Button onClick={() => setShowModal(true)} variant="primary">
                    <Plus className="mr-2" size={16} /> New Opportunity
                </Button>
            </div>

            {/* This div makes the funnel scroll horizontally on small screens */}
            <div className="flex gap-4 overflow-x-auto pb-4" style={{minHeight: '60vh'}}>
                {STAGES.map(stage => {
                    const stageOpps = getOppsByStage(stage);
                    const stageValue = stageOpps.reduce((sum, opp) => sum + (opp.estimatedValue || 0), 0);
                    
                    // Highlight Won/Lost columns
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
                                        <OpportunityCard key={opp.id} opp={opp} />
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
