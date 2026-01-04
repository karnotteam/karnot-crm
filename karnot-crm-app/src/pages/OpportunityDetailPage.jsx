import React, { useState, useEffect } from 'react';
import { 
    Mail, Phone, Hash, ArrowLeft, DollarSign, List, Calendar, 
    Edit, Plus, FileText, User, Layout, Activity, Trash2, PlusCircle, 
    ExternalLink, Save, X, Edit2
} from 'lucide-react';
import { db } from '../firebase'; 
import { 
    collection, addDoc, serverTimestamp, doc, updateDoc, getDoc, setDoc,
    query, onSnapshot, orderBy 
} from "firebase/firestore";
import { Card, Button, Section, Input, Textarea } from '../data/constants.jsx';

const OpportunityDetailPage = ({ 
    opportunity, 
    quotes = [], 
    onBack, 
    onAddQuote, 
    onOpenQuote, 
    user, 
    companies = [],
    onEdit // ✅ NEW: Add onEdit prop to trigger the edit modal
}) => {
    
    const [notes, setNotes] = useState(opportunity?.notes || []); 
    const [newNoteText, setNewNoteText] = useState('');
    const [editingNoteIndex, setEditingNoteIndex] = useState(null);
    const [editingNoteText, setEditingNoteText] = useState('');
    
    const [interactions, setInteractions] = useState([]);
    const [newLogType, setNewLogType] = useState('Call');
    const [newLogOutcome, setNewLogOutcome] = useState('');
    const [newLogDate, setNewLogDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedQuoteId, setSelectedQuoteId] = useState('');
    
    const formatProb = (p) => {
        if (p >= 90) return 'text-green-600';
        if (p >= 50) return 'text-yellow-600';
        return 'text-red-600';
    };

    // Load notes from opportunity document
    useEffect(() => {
        if (opportunity?.notes) {
            setNotes(opportunity.notes);
        }
    }, [opportunity]);

    // Load interactions from BOTH opportunity AND company
    useEffect(() => {
        if (!opportunity || !companies || !user) return;
        
        const oppInteractions = opportunity.interactions || [];
        const matchingCompany = companies.find(c => 
            c.companyName.toLowerCase() === opportunity.customerName.toLowerCase()
        );
        const companyInteractions = matchingCompany?.interactions || [];
        
        const allInteractions = [...oppInteractions, ...companyInteractions]
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        
        const uniqueInteractions = allInteractions.filter((item, index, self) =>
            index === self.findIndex((t) => t.id === item.id)
        );
        
        setInteractions(uniqueInteractions);
    }, [opportunity, companies, user]);

    // ==========================================
    // NOTES HANDLERS (Stored in opportunity doc)
    // ==========================================
    const handleAddNote = async () => {
        if (!newNoteText.trim()) {
            alert('Please enter a note before saving.');
            return;
        }

        const newNote = {
            text: newNoteText.trim(),
            timestamp: new Date().toISOString(),
            author: user.email || user.displayName || 'Unknown'
        };

        const updatedNotes = [...notes, newNote];

        try {
            const oppRef = doc(db, 'users', user.uid, 'opportunities', opportunity.id);
            await setDoc(oppRef, {
                notes: updatedNotes,
                lastModified: serverTimestamp()
            }, { merge: true });

            setNotes(updatedNotes);
            setNewNoteText('');
            console.log('Note added successfully!');
        } catch (error) {
            console.error('Error adding note:', error);
            alert('Failed to add note. Please try again.');
        }
    };

    const handleDeleteNote = async (indexToDelete) => {
        if (!window.confirm('Are you sure you want to delete this note?')) {
            return;
        }

        const updatedNotes = notes.filter((_, index) => index !== indexToDelete);

        try {
            const oppRef = doc(db, 'users', user.uid, 'opportunities', opportunity.id);
            await setDoc(oppRef, {
                notes: updatedNotes,
                lastModified: serverTimestamp()
            }, { merge: true });

            setNotes(updatedNotes);
            console.log('Note deleted successfully!');
        } catch (error) {
            console.error('Error deleting note:', error);
            alert('Failed to delete note. Please try again.');
        }
    };

    const handleStartEditNote = (index) => {
        setEditingNoteIndex(index);
        setEditingNoteText(notes[index].text);
    };

    const handleSaveEditNote = async () => {
        if (!editingNoteText.trim()) {
            alert('Note cannot be empty.');
            return;
        }

        const updatedNotes = notes.map((note, index) => {
            if (index === editingNoteIndex) {
                return {
                    ...note,
                    text: editingNoteText.trim(),
                    lastEdited: new Date().toISOString(),
                    editedBy: user.email || user.displayName
                };
            }
            return note;
        });

        try {
            const oppRef = doc(db, 'users', user.uid, 'opportunities', opportunity.id);
            await setDoc(oppRef, {
                notes: updatedNotes,
                lastModified: serverTimestamp()
            }, { merge: true });

            setNotes(updatedNotes);
            setEditingNoteIndex(null);
            setEditingNoteText('');
            console.log('Note updated successfully!');
        } catch (error) {
            console.error('Error updating note:', error);
            alert('Failed to update note. Please try again.');
        }
    };

    const handleCancelEdit = () => {
        setEditingNoteIndex(null);
        setEditingNoteText('');
    };

    // ==========================================
    // INTERACTIONS HANDLERS
    // ==========================================
    const saveInteractionsToFirebase = async (updatedInteractions) => {
        if (!user || !opportunity) return;
        
        try {
            const oppRef = doc(db, "users", user.uid, "opportunities", opportunity.id);
            await updateDoc(oppRef, {
                interactions: updatedInteractions,
                lastModified: serverTimestamp()
            });
            
            const matchingCompany = companies.find(c => 
                c.companyName.toLowerCase() === opportunity.customerName.toLowerCase()
            );
            
            if (matchingCompany) {
                const companyRef = doc(db, "users", user.uid, "companies", matchingCompany.id);
                await updateDoc(companyRef, {
                    interactions: updatedInteractions,
                    lastModified: serverTimestamp()
                });
            }
        } catch (error) {
            console.error("Error saving interactions:", error);
        }
    };

    const handleAddInteraction = async () => {
        if (!newLogOutcome) return;
        
        let linkedQuote = null;
        if (selectedQuoteId) {
            linkedQuote = relatedQuotes.find(q => q.id === selectedQuoteId);
        }
        
        const newInteraction = {
            id: Date.now(),
            date: newLogDate,
            type: newLogType,
            outcome: newLogOutcome,
            linkedQuote
        };
        
        const updatedInteractions = [newInteraction, ...interactions].sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        );
        
        setInteractions(updatedInteractions);
        await saveInteractionsToFirebase(updatedInteractions);
        
        setNewLogOutcome('');
        setSelectedQuoteId('');
    };

    const handleDeleteInteraction = async (logId) => {
        const updatedInteractions = interactions.filter(i => i.id !== logId);
        setInteractions(updatedInteractions);
        await saveInteractionsToFirebase(updatedInteractions);
    };

    if (!opportunity) {
        return (
            <div className="flex flex-col items-center justify-center p-20">
                <Layout size={48} className="text-gray-200 mb-4" />
                <p className="text-gray-500 font-bold uppercase tracking-widest">Opportunity data not loaded.</p>
                <Button onClick={onBack} variant="secondary" className="mt-4">Return to Funnel</Button>
            </div>
        );
    }
// Add this temporarily to debug
console.log('Opportunity data:', opportunity);
console.log('Contact Name:', opportunity.contactName);
console.log('Contact Email:', opportunity.contactEmail);
    const relatedQuotes = (quotes || []).filter(q => 
        (q.customer?.name && q.customer.name.toLowerCase().includes(opportunity.customerName.toLowerCase())) || 
        (q.opportunityId === opportunity.id)
    );

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-10">
            <div className="flex justify-between items-center">
                <Button onClick={onBack} variant="secondary" className="group">
                    <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform"/> Back to Funnel
                </Button>
                {/* ✅ FIXED: Now calls onEdit instead of showing alert */}
                <Button 
                    onClick={() => onEdit && onEdit(opportunity)} 
                    variant="primary" 
                    className="shadow-lg shadow-orange-100"
                >
                    <Edit size={16} className="mr-2"/> Edit Lead Details
                </Button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LEFT COLUMN - MAIN CONTENT */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* OPPORTUNITY HEADER */}
                    <Card className="border-t-4 border-t-orange-500">
                        <div className="mb-6">
                            <h2 className="text-4xl font-black text-gray-800 uppercase tracking-tighter leading-none">{opportunity.customerName}</h2>
                            <div className="mt-2 inline-block px-3 py-1 bg-orange-50 text-orange-600 rounded-full text-xs font-black uppercase tracking-widest">{opportunity.project}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Deal Value</p>
                                <p className="text-3xl font-black text-gray-800">${(opportunity.estimatedValue || 0).toLocaleString()}</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Current Stage</p>
                                <p className={`text-xl font-black uppercase ${formatProb(opportunity.probability)}`}>{opportunity.stage} <span className="text-sm opacity-60">({opportunity.probability}%)</span></p>
                            </div>
                        </div>
                    </Card>

                    {/* PROPOSALS/QUOTES */}
                    <Card>
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><FileText size={20}/></div>
                                <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Proposals ({relatedQuotes.length})</h3>
                            </div>
                            <Button onClick={onAddQuote} variant="primary" className="text-xs !py-2"><Plus size={16} className="mr-2"/> New Quote</Button>
                        </div>
                        {relatedQuotes.length > 0 ? (
                            <div className="grid gap-3">
                                {relatedQuotes.map(q => (
                                    <div key={q.id} onClick={() => onOpenQuote(q)} className="p-4 bg-white border border-gray-100 rounded-xl flex justify-between items-center hover:border-orange-400 hover:shadow-md transition-all cursor-pointer group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 group-hover:text-orange-500 transition-colors"><FileText size={18}/></div>
                                            <div>
                                                <p className="font-black text-gray-800 uppercase text-sm tracking-tight">{q.id}</p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Click to view details</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-orange-600">${(q.finalSalesPrice || 0).toLocaleString()}</p>
                                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-green-100 text-green-700 uppercase tracking-widest">{q.status || 'Draft'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 border-2 border-dashed rounded-2xl"><p className="text-sm font-bold text-gray-300 uppercase tracking-[0.2em]">No quotes created yet</p></div>
                        )}
                    </Card>

                    {/* NOTES SECTION - ENHANCED */}
                    <Card>
                        <div className="flex items-center gap-2 mb-6">
                            <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg"><FileText size={20}/></div>
                            <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Notes & Documentation ({notes.length})</h3>
                        </div>

                        {/* ADD NEW NOTE */}
                        <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
                            <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-2">Add New Note</label>
                            <textarea
                                value={newNoteText}
                                onChange={(e) => setNewNoteText(e.target.value)}
                                placeholder="Document important details, decisions, technical requirements, customer concerns..."
                                rows={3}
                                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none text-sm mb-2"
                            />
                            <div className="flex justify-end">
                                <Button onClick={handleAddNote} variant="primary" className="bg-orange-600 hover:bg-orange-700 text-xs">
                                    <Plus size={14} className="mr-2" /> Add Note
                                </Button>
                            </div>
                        </div>

                        {/* NOTES LIST */}
                        {notes.length === 0 ? (
                            <div className="text-center py-10 border-2 border-dashed rounded-2xl">
                                <FileText size={48} className="mx-auto mb-2 text-gray-200" />
                                <p className="text-sm font-bold text-gray-300 uppercase tracking-[0.2em]">No notes yet</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {[...notes].reverse().map((note, reverseIndex) => {
                                    const actualIndex = notes.length - 1 - reverseIndex;
                                    const isEditing = editingNoteIndex === actualIndex;

                                    return (
                                        <div 
                                            key={actualIndex} 
                                            className="p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-yellow-300 transition-colors group"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                                    <Calendar size={12} />
                                                    <span className="font-bold uppercase tracking-widest">
                                                        {note.timestamp 
                                                            ? new Date(note.timestamp).toLocaleString('en-US', {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                year: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })
                                                            : 'Recent'
                                                        }
                                                    </span>
                                                    {note.author && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="text-orange-600">{note.author.split('@')[0]}</span>
                                                        </>
                                                    )}
                                                    {note.lastEdited && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="italic text-blue-600">Edited</span>
                                                        </>
                                                    )}
                                                </div>
                                                
                                                {!isEditing && (
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleStartEditNote(actualIndex)}
                                                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                            title="Edit note"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteNote(actualIndex)}
                                                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                            title="Delete note"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {isEditing ? (
                                                <div>
                                                    <textarea
                                                        value={editingNoteText}
                                                        onChange={(e) => setEditingNoteText(e.target.value)}
                                                        rows={3}
                                                        className="w-full p-3 border-2 border-orange-300 rounded-lg focus:border-orange-500 focus:outline-none text-sm mb-2"
                                                    />
                                                    <div className="flex justify-end gap-2">
                                                        <Button onClick={handleCancelEdit} variant="secondary" className="text-xs !py-1">
                                                            <X size={12} className="mr-1" /> Cancel
                                                        </Button>
                                                        <Button onClick={handleSaveEditNote} variant="primary" className="text-xs !py-1 bg-orange-600 hover:bg-orange-700">
                                                            <Save size={12} className="mr-1" /> Save
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{note.text}</p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Card>
                </div>

                {/* RIGHT COLUMN - SIDEBAR */}
                <div className="space-y-6">
                    
                   {/* ✅ DECISION MAKER CARD - FIXED TEXT COLOR */}
<Card className="bg-slate-900 text-white">
    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-orange-400 mb-4 flex items-center gap-2">
        <User size={14}/> Decision Maker
    </h3>
    <div className="space-y-4">
        <div>
            <p className="text-lg font-black leading-none text-white">
                {opportunity.contactName || 'Contact Not Assigned'}
            </p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                Primary Contact
            </p>
        </div>
        <div className="pt-4 border-t border-slate-800 space-y-3">
            {opportunity.contactEmail ? (
                <a 
                    href={`mailto:${opportunity.contactEmail}`} 
                    className="flex items-center gap-3 text-sm hover:text-orange-400 transition-colors text-slate-300"
                >
                    <Mail size={16} className="text-slate-500"/>
                    <span className="truncate">{opportunity.contactEmail}</span>
                </a>
            ) : (
                <div className="flex items-center gap-3 text-sm text-slate-500">
                    <Mail size={16} className="text-slate-700"/>
                    <span className="italic">No Email Assigned</span>
                </div>
            )}
            
            {opportunity.contactPhone ? (
                <a 
                    href={`tel:${opportunity.contactPhone}`}
                    className="flex items-center gap-3 text-sm hover:text-orange-400 transition-colors text-slate-300"
                >
                    <Phone size={16} className="text-slate-500"/>
                    <span>{opportunity.contactPhone}</span>
                </a>
            ) : (
                <div className="flex items-center gap-3 text-sm text-slate-500">
                    <Phone size={16} className="text-slate-700"/>
                    <span className="italic">No Phone Number</span>
                </div>
            )}
        </div>
    </div>
</Card>>

                    {/* ACTIVITY LOG */}
                    <Card className="max-h-[600px] flex flex-col">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-4 flex items-center gap-2">
                            <Activity size={14}/> Activity Log
                        </h3>
                        
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2 mb-4">
                            <div className="flex gap-2">
                                <Input 
                                    type="date" 
                                    value={newLogDate} 
                                    onChange={e => setNewLogDate(e.target.value)} 
                                    className="text-xs flex-1" 
                                />
                                <select 
                                    value={newLogType} 
                                    onChange={e => setNewLogType(e.target.value)} 
                                    className="text-xs border rounded px-2 py-1 flex-1 font-black uppercase bg-white"
                                >
                                    <option value="Call">Call</option>
                                    <option value="Visit">Site Visit</option>
                                    <option value="Email">Email</option>
                                    <option value="Meeting">Meeting</option>
                                </select>
                            </div>
                            {relatedQuotes.length > 0 && (
                                <select 
                                    value={selectedQuoteId} 
                                    onChange={e => setSelectedQuoteId(e.target.value)} 
                                    className="w-full text-xs border px-2 py-1 rounded font-bold uppercase bg-white"
                                >
                                    <option value="">Attach Quote Link (Optional)</option>
                                    {relatedQuotes.map(q => (
                                        <option key={q.id} value={q.id}>
                                            {q.id} - ${q.finalSalesPrice?.toLocaleString()}
                                        </option>
                                    ))}
                                </select>
                            )}
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={newLogOutcome} 
                                    onChange={e => setNewLogOutcome(e.target.value)} 
                                    placeholder="Summary of activity..." 
                                    className="flex-1 text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" 
                                />
                                <Button onClick={handleAddInteraction} variant="primary" className="px-3">
                                    <PlusCircle size={20}/>
                                </Button>
                            </div>
                        </div>

                        {/* INTERACTIONS LIST */}
                        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                            {interactions.length > 0 && interactions.map(log => (
                                <div key={log.id} className="bg-white p-4 rounded-xl border shadow-sm group relative hover:border-orange-200 transition-all">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className={`text-[9px] font-black px-2 py-1 rounded-full text-white uppercase tracking-widest ${
                                            log.type === 'Visit' ? 'bg-green-500' : 
                                            log.type === 'Email' ? 'bg-purple-500' :
                                            log.type === 'Meeting' ? 'bg-indigo-500' :
                                            'bg-blue-500'
                                        }`}>
                                            {log.type}
                                        </span>
                                        <span className="text-[10px] text-gray-400 font-bold">
                                            {new Date(log.date).toLocaleDateString('en-US', { 
                                                month: 'short', 
                                                day: 'numeric', 
                                                year: 'numeric' 
                                            })}
                                        </span>
                                    </div>
                                    
                                    <p className="text-sm text-gray-700 font-medium mb-2">{log.outcome}</p>
                                    
                                    {log.linkedQuote && (
                                        <button 
                                            type="button"
                                            onClick={() => onOpenQuote(log.linkedQuote)} 
                                            className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors"
                                        >
                                            <FileText size={12}/>
                                            <span className="text-[9px] font-black uppercase">
                                                Ref: {log.linkedQuote.id}
                                            </span>
                                            <ExternalLink size={10}/>
                                        </button>
                                    )}
                                    
                                    <button 
                                        onClick={() => handleDeleteInteraction(log.id)} 
                                        className="absolute top-3 right-3 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 size={14}/>
                                    </button>
                                </div>
                            ))}
                            
                            {interactions.length === 0 && (
                                <p className="text-[10px] text-gray-300 font-black uppercase tracking-widest text-center py-4">No activity logged yet</p>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default OpportunityDetailPage;
