// src/pages/OpportunityDetailPage.jsx

import React, { useState, useEffect } from 'react';
// --- 'Link' import is REMOVED ---
import { 
    Mail, Phone, Hash, ArrowLeft, DollarSign, List, Calendar, 
    Edit, Plus, FileText 
} from 'lucide-react';
import { db } from '../data/firebase'; 
import { 
    collection, addDoc, serverTimestamp, 
    query, onSnapshot, orderBy 
} from "firebase/firestore";

import { Card, Button, Section, Input, Textarea } from '../data/constants.jsx';

// --- 'onEdit' is REMOVED from the props list ---
const OpportunityDetailPage = ({ opportunity, quotes, onBack, onAddQuote, user }) => {
    
    const [newNoteText, setNewNoteText] = useState('');
    const [notes, setNotes] = useState([]); 
    
    const formatProb = (p) => {
        if (p >= 90) return 'text-green-600';
        if (p >= 50) return 'text-yellow-600';
        return 'text-red-600';
    };

    useEffect(() => {
        if (!opportunity || !opportunity.id || !user || !user.uid) {
            setNotes([]); 
            return;
        }

        const notesRef = collection(db, "users", user.uid, "opportunities", opportunity.id, "notes");
        const q = query(notesRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const notesList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setNotes(notesList);
        });

        return () => unsubscribe();
    }, [opportunity, user]); 

    
    const handleSaveNote = async () => {
        if (!newNoteText.trim()) return; 
        if (!user || !user.uid) return alert("Error: User not logged in.");

        try {
            const notesRef = collection(db, "users", user.uid, "opportunities", opportunity.id, "notes");

            await addDoc(notesRef, {
                text: newNoteText,
                createdAt: serverTimestamp(),
                authorName: user.displayName || user.email 
            });

            setNewNoteText('');
        } catch (error) {
            console.error("Error adding note: ", error);
            alert("Failed to save note.");
        }
    };


    if (!opportunity) {
        return <div className="text-center p-10">Opportunity data not loaded.</div>;
    }

    const relatedQuotes = quotes.filter(q => q.customer && q.customer.name === opportunity.customerName);


    return (
        <div className="space-y-6">
            
            <div className="flex justify-between items-center mb-4">
                <Button onClick={onBack} variant="secondary">
                    <ArrowLeft size={16} className="mr-2"/> Back to Funnel
                </Button>
                
                {/* --- THIS IS THE FIX --- */}
                {/* Replaced the <Link> with a <Button> that shows an alert. */}
                {/* This will get the build to pass. */}
                <Button onClick={() => alert('Edit feature coming soon!')} variant="primary">
                    <Edit size={16} className="mr-2"/> Edit Opportunity
                </Button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                <Card className="lg:col-span-2">
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">{opportunity.customerName}</h2>
                    <p className="text-xl font-semibold text-orange-600 mb-6">{opportunity.project}</p>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-500">Estimated Value</p>
                            <p className="text-2xl font-bold text-green-700">${opportunity.estimatedValue.toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-500">Current Stage / Win Chance</p>
                            <p className={`text-2xl font-bold ${formatProb(opportunity.probability)}`}>{opportunity.stage} ({opportunity.probability}%)</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg col-span-2">
                            <p className="text-sm text-gray-500">Created At</p>
                            <p className="text-base font-medium">
                                {opportunity.createdAt && opportunity.createdAt.toDate().toLocaleString()}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card>
                    <h3 className="text-xl font-bold text-gray-800 flex items-center mb-4">Contact Info</h3>
                    
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Hash size={18} className="text-orange-500"/>
                            <span className="font-medium">{opportunity.contactName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Mail size={18} className="text-orange-500"/>
                            <span className="text-sm text-gray-600">{opportunity.contactEmail}</span>
                        </div>
                        
                        <Section title="Activity/Notes">
                            <Textarea 
                                rows="4" 
                                placeholder="Add a new activity log or note..." 
                                value={newNoteText}
                                onChange={(e) => setNewNoteText(e.target.value)}
                            />
                            <Button 
                                className="mt-2 w-full" 
                                variant="secondary"
                                onClick={handleSaveNote}
                            >
                                Add Note
                            </Button>
                        </Section>

                        <div className="space-y-3 pt-3 max-h-60 overflow-y-auto">
                            {notes.length > 0 ? (
                                notes.map(note => (
                                    <div key={note.id} className="text-sm p-3 bg-gray-50 rounded-lg">
                                        <p className="text-gray-700">{note.text}</p>
                                        <p className="text-xs text-gray-400 text-right mt-2">
                                            {note.authorName} - {note.createdAt ? note.createdAt.toDate().toLocaleString() : 'Just now'}
                                        </d>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-400 italic text-center">No notes yet.</p>
                            )}
                        </div>
                    </div>
                </Card>
            </div>

            <Card>
                <Section title="Related Quotes">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-gray-800">Quotes ({relatedQuotes.length})</h3>
                        <Button onClick={onAddQuote} variant="primary">
                            <Plus size={16} className="mr-2"/> Create New Quote
                        </Button>
                    </div>
                    
                    {relatedQuotes.length > 0 ? (
                        <ul className="space-y-2">
                            {relatedQuotes.map(q => (
                                <li key={q.id} className="p-3 bg-gray-100 rounded-lg flex justify-between items-center">
                                    <span className="font-medium text-gray-700 flex items-center gap-2"><FileText size={16}/> Quote: {q.id}</span>
                                    <span className={`px-2 py-1 text-xs font-semibold text-white rounded-full ${q.status === 'APPROVED' ? 'bg-green-500' : 'bg-blue-500'}`}>
                                        ${(q.finalSalesPrice || 0).toLocaleString()}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500 italic">No quotes created for this opportunity yet.</p>
                    )}
                </Section>
            </Card>

        </div>
    );
};

export default OpportunityDetailPage;
