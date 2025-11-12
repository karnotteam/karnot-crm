// src/pages/OpportunityDetailPage.jsx

// --- 1. IMPORT useState, useEffect, and Firebase functions ---
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
    Mail, Phone, Hash, ArrowLeft, DollarSign, List, Calendar, 
    Edit, Plus, FileText 
} from 'lucide-react';
import { db } from '../data/firebase'; // Assuming your db export is here
import { 
    collection, addDoc, serverTimestamp, 
    query, onSnapshot, orderBy 
} from "firebase/firestore";

import { Card, Button, Section, Input, Textarea } from '../data/constants.jsx';

// --- 2. ADD 'user' TO THE PROPS LIST ---
const OpportunityDetailPage = ({ opportunity, quotes, onBack, onAddQuote, onEdit, user }) => {
    
    // --- 3. ADD STATE for the new note text and the list of notes ---
    const [newNoteText, setNewNoteText] = useState('');
    const [notes, setNotes] = useState([]); // This will hold our list of notes
    
    // (Your existing formatProb function... no changes)
    const formatProb = (p) => { ... };

    // --- 4. ADD useEffect to FETCH NOTES ---
    // This runs when the component loads or the opportunity/user changes
    useEffect(() => {
        // Don't run if we don't have the info we need
        if (!opportunity || !opportunity.id || !user || !user.uid) {
            setNotes([]); // Clear notes if no opportunity is selected
            return;
        }

        // Create a reference to this opportunity's "notes" sub-collection
        const notesRef = collection(db, "users", user.uid, "opportunities", opportunity.id, "notes");
        
        // Create a query to get the notes, ordered by when they were created
        const q = query(notesRef, orderBy('createdAt', 'desc'));

        // Set up a "listener" that updates in real-time
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const notesList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setNotes(notesList);
        });

        // This is a cleanup function. It stops listening when the
        // component unmounts, preventing memory leaks.
        return () => unsubscribe();

    }, [opportunity, user]); // Re-run this effect if the opportunity or user changes

    
    // --- 5. ADD FUNCTION TO SAVE A NEW NOTE ---
    const handleSaveNote = async () => {
        if (!newNoteText.trim()) return; // Don't save empty notes
        if (!user || !user.uid) return alert("Error: User not logged in.");

        try {
            // Get the same path to the "notes" sub-collection
            const notesRef = collection(db, "users", user.uid, "opportunities", opportunity.id, "notes");

            // Add a new document to that sub-collection
            await addDoc(notesRef, {
                text: newNoteText,
                createdAt: serverTimestamp(),
                authorName: user.displayName || user.email // Save who wrote it
            });

            // Clear the textarea after saving
            setNewNoteText('');

        } catch (error) {
            console.error("Error adding note: ", error);
            alert("Failed to save note.");
        }
    };


    if (!opportunity) {
        return <div className="text-center p-10">Opportunity data not loaded.</div>;
    }

    // (Your existing relatedQuotes code... no changes)
    const relatedQuotes = quotes.filter(q => q.customer.name === opportunity.customerName);

    return (
        <div className="space-y-6">
            
            {/* (Your existing Back/Edit buttons... no changes) */}
            <div className="flex justify-between items-center mb-4">
                ...
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* (Your existing Column 1... no changes) */}
                <Card className="lg:col-span-2">
                    ...
                </Card>

                {/* --- Column 2: Contact & Notes --- */}
                <Card>
                    <h3 className="text-xl font-bold text-gray-800 flex items-center mb-4">Contact Info</h3>
                    
                    <div className="space-y-3">
                        {/* (Your existing Contact Info... no changes) */}
                        <div className="flex items-center gap-2">...</div>
                        <div className="flex items-center gap-2">...</div>
                        
                        {/* --- 6. UPDATE NOTES SECTION --- */}
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

                        {/* --- 7. ADD NOTES RENDER LIST --- */}
                        <div className="space-y-3 pt-3 max-h-60 overflow-y-auto">
                            {notes.length > 0 ? (
                                notes.map(note => (
                                    <div key={note.id} className="text-sm p-3 bg-gray-50 rounded-lg">
                                        <p className="text-gray-700">{note.text}</p>
                                        <p className="text-xs text-gray-400 text-right mt-2">
                                            {note.authorName} - {note.createdAt ? note.createdAt.toDate().toLocaleString() : 'Just now'}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-400 italic text-center">No notes yet.</p>
                            )}
                        </div>
                    </div>
                </Card>
            </div>

            {/* (Your existing Quotes Section... no changes) */}
            <Card>
                ...
            </Read>
        </div>
    );
};

export default OpportunityDetailPage;
