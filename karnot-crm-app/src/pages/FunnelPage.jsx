import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase'; 
import { collection, addDoc, serverTimestamp, doc, setDoc, deleteDoc, getDocs, updateDoc } from "firebase/firestore";
import { Plus, X, Edit, Trash2, FileText, DollarSign, Building, ChevronLeft, ChevronRight, Calendar, Calculator, Clock, AlertCircle } from 'lucide-react';
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

// ==========================================
// 1. OPPORTUNITY CARD COMPONENT
// ==========================================
const OpportunityCard = ({ opp, onUpdate, onDelete, onEdit, onOpen, quotesForThisOpp, companyData, upcomingAppointments }) => {
    const currentStageIndex = STAGE_ORDER.indexOf(opp.stage);
    const nextStage = STAGE_ORDER[currentStageIndex + 1];
    const previousStage = STAGE_ORDER[currentStageIndex - 1];

    const handleMoveForward = () => {
        if (nextStage) onUpdate(opp.id, nextStage);
    };

    const handleMoveBackward = () => {
        if (previousStage) onUpdate(opp.id, previousStage);
    };

    // --- CALCULATE SMART DEAL VALUE ---
    // Sum of all active quotes linked to this opportunity
    const quoteSum = quotesForThisOpp 
        ? quotesForThisOpp
            .filter(q => ['DRAFT', 'APPROVED', 'INVOICED', 'WON'].includes(q.status))
            .reduce((acc, q) => acc + Number(q.finalSalesPrice || 0), 0)
        : 0;
        
    // If quotes exist, override the manual estimate
    const displayValue = quoteSum > 0 ? quoteSum : (opp.estimatedValue || 0);
    const isQuoteLinked = quoteSum > 0;

    // Dates
    const lastActivity = opp.lastModified?.seconds ? new Date(opp.lastModified.seconds * 1000) : new Date();
    const nextAppointment = upcomingAppointments && upcomingAppointments.length > 0 ? upcomingAppointments[0] : null;

    return (
        <Card className="p-3 mb-3 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all bg-white group relative">
            
            {/* Header: Name & Actions */}
            <div className="flex justify-between items-start mb-1">
                <h4 className="font-black text-gray-800 text-sm leading-tight line-clamp-2 w-10/12" title={opp.customerName}>
                    {opp.customerName}
                </h4>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2 bg-white/90 p-1 rounded-lg shadow-sm">
                    <button onClick={() => onEdit(opp)} className="p-1 hover:bg-orange-50 text-gray-400 hover:text-orange-500 rounded transition-colors"><Edit size={12}/></button>
                    <button onClick={() => onDelete(opp.id)} className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded transition-colors"><Trash2 size={12}/></button>
                </div>
            </div>
            
            <p className="text-[10px] font-bold text-gray-400 mb-3 truncate uppercase tracking-wide" title={opp.project}>
                {opp.project || 'General Inquiry'}
            </p>
            
            {/* VALUE BOX */}
            <div className={`p-2 rounded-lg border flex justify-between items-center mb-3 ${isQuoteLinked ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
                <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-50">Deal Value</span>
                    <div className="flex items-center gap-1">
                        <span className={`text-sm font-black ${isQuoteLinked ? 'text-green-700' : 'text-gray-700'}`}>
                            ${displayValue.toLocaleString()}
                        </span>
                        {isQuoteLinked && <Calculator size={10} className="text-green-600" title="Calculated from Quotes"/>}
                    </div>
                </div>
                <div className="text-right">
                    <span className={`text-[9px] font-black px-2 py-1 rounded-full border ${opp.probability > 50 ? 'bg-white text-green-600 border-green-200' : 'bg-white text-gray-400 border-gray-200'}`}>
                        {opp.probability}% Prob.
                    </span>
                </div>
            </div>
            
            {/* METADATA & BADGES */}
            <div className="space-y-1.5 mb-3">
                {/* 1. Quote Status */}
                {quotesForThisOpp && quotesForThisOpp.length > 0 && (
                    <div className="flex items-center gap-2 text-[10px] text-green-700 bg-white border border-green-100 px-2 py-1 rounded shadow-sm">
                        <DollarSign size={10} />
                        <span className="font-bold">{quotesForThisOpp.length} Active Quote{quotesForThisOpp.length !== 1 && 's'}</span>
                    </div>
                )}

                {/* 2. Next Appointment */}
                {nextAppointment && (
                    <div className="flex items-center gap-2 text-[10px] text-blue-700 bg-blue-50 border border-blue-100 px-2 py-1 rounded">
                        <Calendar size={10} />
                        <span className="font-bold truncate">
                            {new Date(nextAppointment.appointmentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: {nextAppointment.purpose}
                        </span>
                    </div>
                )}
                
                {/* 3. Last Activity */}
                <div className="flex items-center gap-1 text-[9px] text-gray-400 pl-1">
                    <Clock size={10} />
                    <span>Updated {lastActivity.toLocaleDateString()}</span>
                </div>
            </div>
            
            <Button onClick={() => onOpen(opp)} variant="secondary" className="w-full text-[10px] uppercase font-black tracking-widest py-2 h-auto border-gray-200 text-gray-500 hover:text-gray-800">
                <FileText size={12} className="mr-2"/> View & Notes
            </Button>

            {/* STAGE NAVIGATION */}
            {(opp.stage !== 'Closed-Won' && opp.stage !== 'Closed-Lost') && (
                <div className="mt-2 flex gap-1 pt-2 border-t border-gray-100">
                    {previousStage && (
                        <button onClick={handleMoveBackward} className="flex-1 bg-gray-50 hover:bg-gray-200 text-gray-400 hover:text-gray-600 rounded p-1 flex justify-center transition-colors" title={`Move back to ${previousStage}`}>
                            <ChevronLeft size={14}/>
                        </button>
                    )}
                    {nextStage && (
                        <button onClick={handleMoveForward} className="flex-1 bg-green-50 hover:bg-green-500 text-green-600 hover:text-white rounded p-1 flex justify-center transition-colors" title={`Move to ${nextStage}`}>
                            <ChevronRight size={14}/>
                        </button>
                    )}
                </div>
            )}
        </Card>
    );
};


// ==========================================
// 2. MODAL COMPONENT (CREATE / EDIT)
// ==========================================
const NewOpportunityModal = ({ onClose, onSave, opportunityToEdit, companies, contacts }) => {
    const isEditMode = Boolean(opportunityToEdit);
    
    // Form State
    const [companyId, setCompanyId] = useState('');
    const [contactId, setContactId] = useState('');
    const [project, setProject] = useState('');
    const [estimatedValue, setEstimatedValue] = useState(0);
    const [probability, setProbability] = useState(10);
    const [contactEmail, setContactEmail] = useState('');

    // Filter contacts to only show those belonging to the selected company
    const availableContacts = useMemo(() => {
        if (!companyId) return [];
        const selectedCompany = companies.find(c => c.id === companyId);
        if (!selectedCompany) return [];
        // Match by Company Name (safest if IDs aren't perfectly synced)
        return contacts.filter(contact => contact.companyName === selectedCompany.companyName);
    }, [companyId, companies, contacts]);

    // Initialize Form Data
    useEffect(() => {
        if (isEditMode) {
            // --- EDIT MODE ---
            const company = companies.find(c => c.companyName === opportunityToEdit.customerName);
            const foundCompanyId = company ? company.id : '';
            
            setCompanyId(foundCompanyId);
            setProject(opportunityToEdit.project || '');
            setEstimatedValue(opportunityToEdit.estimatedValue || 0);
            setProbability(opportunityToEdit.probability || 10);
            
            // Try to find the contact
            if (foundCompanyId) {
                const relatedContacts = contacts.filter(c => c.companyName === company.companyName);
                const contact = relatedContacts.find(c => 
                    `${c.firstName} ${c.lastName}` === opportunityToEdit.contactName
                );

                if (contact) {
                    setContactId(contact.id);
                    setContactEmail(contact.email);
                } else {
                    // Keep old data if contact record is missing
                    setContactId('');
                    setContactEmail(opportunityToEdit.contactEmail || '');
                }
            }
        } else {
            // --- NEW MODE ---
            // Default to the first company in the list to save a click
            const defaultCompanyId = companies.length > 0 ? companies[0].id : '';
            setCompanyId(defaultCompanyId);
            setProject('');
            setEstimatedValue(0);
            setProbability(10);
            
            // Default contact
            if (defaultCompanyId) {
                const defaultCompany = companies.find(c => c.id === defaultCompanyId);
                const defaultContacts = contacts.filter(c => c.companyName === defaultCompany.companyName);
                if (defaultContacts.length > 0) {
                    setContactId(defaultContacts[0].id);
                    setContactEmail(defaultContacts[0].email);
                }
            }
        }
    }, [opportunityToEdit, isEditMode, companies, contacts]);

    // Handlers
    const handleCompanyChange = (e) => {
        const newCompanyId = e.target.value;
        setCompanyId(newCompanyId);
        setContactId(''); // Clear contact on company change
        setContactEmail('');
    };

    const handleContactChange = (e) => {
        const newContactId = e.target.value;
        setContactId(newContactId);
        const contact = contacts.find(c => c.id === newContactId);
        if (contact) setContactEmail(contact.email);
    };

    const handleSaveClick = async () => {
        const selectedCompany = companies.find(c => c.id === companyId);
        
        if (!selectedCompany) {
            alert('Please select a valid company.');
            return;
        }
        
        // It's okay if contact is missing (might be a new lead), but warn if strict
        let selectedContact = contacts.find(c => c.id === contactId);
        let finalContactName = selectedContact ? `${selectedContact.firstName} ${selectedContact.lastName}` : '';
        let finalContactEmail = selectedContact ? selectedContact.email : '';

        // Preserve old contact data in edit mode if user didn't change it
        if(isEditMode && !selectedContact) {
             finalContactName = opportunityToEdit.contactName;
             finalContactEmail = opportunityToEdit.contactEmail;
        }

        const oppData = {
            companyId: selectedCompany.id,
            customerName: selectedCompany.companyName,
            customerAddress: selectedCompany.address || '',
            customerTIN: selectedCompany.tin || '',
            project,
            estimatedValue: Number(estimatedValue),
            probability: Number(probability),
            contactId: contactId || '',
            contactName: finalContactName,
            contactEmail: finalContactEmail,
        };
        
        onSave(oppData);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <Card className="w-full max-w-lg shadow-2xl border-0 animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-6 pb-4 border-b">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isEditMode ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                            {isEditMode ? <Edit size={20}/> : <Plus size={20}/>}
                        </div>
                        <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">
                            {isEditMode ? 'Edit Opportunity' : 'New Opportunity'}
                        </h3>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-red-50"><X size={20}/></button>
                </div>
                
                <div className="space-y-5">
                    {/* COMPANY SELECTION */}
                    <div>
                        <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1">Customer / Company</label>
                        <select
                            value={companyId}
                            onChange={handleCompanyChange}
                            className="block w-full p-3 bg-gray-50 border-2 border-gray-100 rounded-xl font-bold text-sm text-gray-700 outline-none focus:border-orange-500 transition-colors"
                        >
                            {!companies || companies.length === 0 ? (
                                <option value="">No companies available</option>
                            ) : (
                                companies.map(company => (
                                    <option key={company.id} value={company.id}>{company.companyName}</option>
                                ))
                            )}
                        </select>
                    </div>

                    <Input 
                        label="Project Name / Deal Title" 
                        value={project} 
                        onChange={(e) => setProject(e.target.value)} 
                        placeholder="e.g., Laguna Plant Upgrade" 
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                        <Input 
                            label="Est. Value ($)" 
                            type="number" 
                            value={estimatedValue} 
                            onChange={(e) => setEstimatedValue(e.target.value)} 
                        />
                        <Input 
                            label="Probability (%)" 
                            type="number" 
                            value={probability} 
                            onChange={(e) => setProbability(e.target.value)} 
                        />
                    </div>

                    <hr className="border-gray-100"/>
                    
                    {/* CONTACT SELECTION */}
                    <div>
                        <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1">Key Contact Person</label>
                        <select
                            value={contactId}
                            onChange={handleContactChange}
                            className="block w-full p-3 bg-gray-50 border-2 border-gray-100 rounded-xl font-bold text-sm text-gray-700 outline-none focus:border-orange-500 transition-colors disabled:opacity-50"
                            disabled={availableContacts.length === 0}
                        >
                            <option value="">
                                {availableContacts.length === 0 ? '-- No Contacts Found --' : '-- Select Contact --'}
                            </option>
                            {availableContacts.map(contact => (
                                <option key={contact.id} value={contact.id}>
                                    {contact.firstName} {contact.lastName} {contact.jobTitle ? `(${contact.jobTitle})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <Button onClick={onClose} variant="secondary">Cancel</Button>
                    <Button onClick={handleSaveClick} variant="primary" className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-200 px-6">
                        {isEditMode ? <><Edit className="mr-2" size={16} /> Update Deal</> : <><Plus className="mr-2" size={16} /> Create Deal</>}
                    </Button>
                </div>
            </Card>
        </div>
    );
};


// ==========================================
// 3. MAIN PAGE COMPONENT
// ==========================================
const FunnelPage = ({ opportunities, user, onOpen, companies, contacts, appointments = [] }) => { 
    const [showModal, setShowModal] = useState(false);
    const [editingOpportunity, setEditingOpportunity] = useState(null);
    const [quotes, setQuotes] = useState([]);
    const [loadingQuotes, setLoadingQuotes] = useState(true);
    
    const STAGES = STAGE_ORDER;

    // --- FETCH QUOTES FOR DEAL VALUE CALCULATION ---
    useEffect(() => {
        const fetchQuotes = async () => {
            if (!user || !user.uid) return;
            setLoadingQuotes(true);
            try {
                const quotesSnapshot = await getDocs(collection(db, "users", user.uid, "quotes"));
                const quotesData = quotesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setQuotes(quotesData);
            } catch (error) {
                console.error("Error fetching quotes:", error);
            } finally {
                setLoadingQuotes(false);
            }
        };
        fetchQuotes();
    }, [user]);

    // Helpers
    const getQuotesForOpportunity = (opportunityId) => quotes.filter(quote => quote.opportunityId === opportunityId);

    const getCompanyData = (companyName) => {
        const companyQuotes = quotes.filter(q => q.customerName === companyName || q.customer?.name === companyName);
        if (companyQuotes.length === 0) return null;
        return {
            quoteCount: companyQuotes.length,
            totalValue: companyQuotes.reduce((sum, q) => sum + (q.finalSalesPrice || 0), 0),
            lastQuoteDate: companyQuotes.map(q => q.createdAt).filter(Boolean).sort((a, b) => new Date(b) - new Date(a))[0]
        };
    };

    const getUpcomingAppointments = (companyName) => {
        if (!appointments || appointments.length === 0) return [];
        const now = new Date();
        return appointments.filter(apt => 
            apt.companyName === companyName &&
            apt.status !== 'Completed' &&
            apt.status !== 'Cancelled' &&
            new Date(apt.appointmentDate) >= now
        ).sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate));
    };

    // --- CRUD HANDLERS ---

    const handleSave = async (oppData) => {
        if (!user) return alert("Please log in.");
        
        try {
            if (editingOpportunity) {
                // UPDATE
                await setDoc(doc(db, "users", user.uid, "opportunities", editingOpportunity.id), {
                    ...oppData, 
                    lastModified: serverTimestamp() 
                }, { merge: true });
            } else {
                // CREATE
                await addDoc(collection(db, "users", user.uid, "opportunities"), {
                    ...oppData,
                    stage: 'Lead', 
                    createdAt: serverTimestamp(), 
                    notes: [] 
                });
            }
            handleCloseModal();
        } catch (e) {
            console.error("Error saving opportunity: ", e);
            alert("Save failed.");
        }
    };

    const handleUpdateOpportunityStage = async (oppId, newStage) => {
        if (!user) return;
        let newProbability = 0;
        // Auto-update probability based on stage
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
            await setDoc(doc(db, "users", user.uid, "opportunities", oppId), {
                stage: newStage,
                probability: newProbability,
                lastModified: serverTimestamp()
            }, { merge: true });
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteOpportunity = async (oppId) => {
        if (!user) return;
        if (confirm("Permanently delete this Opportunity? This action cannot be undone.")) {
            try {
                await deleteDoc(doc(db, "users", user.uid, "opportunities", oppId));
            } catch (error) {
                console.error(error);
            }
        }
    };

    // --- MODAL TRIGGERS ---
    const handleOpenNewModal = () => { setEditingOpportunity(null); setShowModal(true); };
    const handleOpenEditModal = (opp) => { setEditingOpportunity(opp); setShowModal(true); };
    const handleCloseModal = () => { setShowModal(false); setEditingOpportunity(null); };

    const getOppsByStage = (stage) => opportunities ? opportunities.filter(opp => opp.stage === stage) : [];

    return (
        <div className="w-full">
            {showModal && (
                <NewOpportunityModal 
                    onSave={handleSave} 
                    onClose={handleCloseModal}
                    opportunityToEdit={editingOpportunity} 
                    companies={companies}
                    contacts={contacts} 
                />
            )}
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-800 uppercase tracking-tighter">Sales Funnel</h1>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pipeline Management</p>
                </div>
                <Button onClick={handleOpenNewModal} variant="primary" className="shadow-lg shadow-orange-200 bg-orange-600 hover:bg-orange-700 border-none font-black uppercase text-xs tracking-widest px-6 py-3 rounded-xl">
                    <Plus className="mr-2" size={16} /> New Opportunity
                </Button>
            </div>

            {loadingQuotes && (
                <div className="flex justify-center items-center py-4 bg-yellow-50 text-yellow-700 text-xs font-bold rounded-lg mb-4 animate-pulse">
                    <Clock size={14} className="mr-2"/> Syncing Deal Values...
                </div>
            )}

            {/* FUNNEL COLUMNS */}
            <div className="flex gap-6 overflow-x-auto pb-8 snap-x" style={{minHeight: '70vh'}}>
                {STAGES.map(stage => {
                    const stageOpps = getOppsByStage(stage);
                    
                    // CALCULATE COLUMN TOTAL: 
                    // Sum of (Quote Sum if exists, else Estimated Value)
                    const stageValue = stageOpps.reduce((sum, opp) => {
                        const linkedQuotes = getQuotesForOpportunity(opp.id);
                        const quoteSum = linkedQuotes
                            .filter(q => ['DRAFT', 'APPROVED', 'INVOICED', 'WON'].includes(q.status))
                            .reduce((acc, q) => acc + Number(q.finalSalesPrice || 0), 0);
                        return sum + (quoteSum > 0 ? quoteSum : (opp.estimatedValue || 0));
                    }, 0);
                    
                    let columnBg = "bg-gray-100/50 border-gray-200";
                    let headerColor = "text-gray-600";
                    if (stage === 'Closed-Won') { columnBg = "bg-green-50/50 border-green-200"; headerColor = "text-green-700"; }
                    if (stage === 'Closed-Lost') { columnBg = "bg-red-50/50 border-red-200"; headerColor = "text-red-700"; }

                    return (
                        <div key={stage} className={`flex-shrink-0 w-80 ${columnBg} border rounded-[20px] p-4 flex flex-col snap-start`}>
                            <div className="mb-4 flex justify-between items-end border-b border-gray-200 pb-2">
                                <div>
                                    <h3 className={`font-black uppercase text-xs tracking-widest ${headerColor}`}>{stage}</h3>
                                    <span className="text-[10px] font-bold text-gray-400">{stageOpps.length} Deal{stageOpps.length !== 1 && 's'}</span>
                                </div>
                                <span className="text-sm font-black text-gray-800">${stageValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                                {stageOpps
                                    .sort((a, b) => (b.lastModified?.seconds || 0) - (a.lastModified?.seconds || 0)) 
                                    .map(opp => (
                                        <OpportunityCard 
                                            key={opp.id} 
                                            opp={opp} 
                                            onUpdate={handleUpdateOpportunityStage}
                                            onDelete={handleDeleteOpportunity}
                                            onEdit={handleOpenEditModal}
                                            onOpen={onOpen}
                                            quotesForThisOpp={getQuotesForOpportunity(opp.id)}
                                            companyData={getCompanyData(opp.customerName)}
                                            upcomingAppointments={getUpcomingAppointments(opp.customerName)}
                                        />
                                    ))
                                }
                                {stageOpps.length === 0 && (
                                    <div className="h-20 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl text-gray-300 text-xs font-bold uppercase tracking-widest">
                                        Empty
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default FunnelPage;
