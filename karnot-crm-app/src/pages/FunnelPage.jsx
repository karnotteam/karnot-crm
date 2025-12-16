import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase'; 
import { 
    collection, addDoc, serverTimestamp, doc, setDoc, deleteDoc 
} from "firebase/firestore";
import { 
    Plus, X, Edit, Trash2, FileText, MessageSquare, 
    Calendar, Clock, Users, ClipboardCheck, ArrowRight, 
    MapPin, Navigation, Phone, Mail, Link as LinkIcon 
} from 'lucide-react';
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

// ----------------------------------------------------------------------
// 1. SMART OPPORTUNITY MODAL (The Popup for Adding/Editing Leads)
// ----------------------------------------------------------------------
const NewOpportunityModal = ({ onClose, onSave, opportunityToEdit, companies, contacts }) => {
    const isEditMode = Boolean(opportunityToEdit);
    const [companyId, setCompanyId] = useState('');
    const [contactId, setContactId] = useState('');
    const [project, setProject] = useState('');
    const [estimatedValue, setEstimatedValue] = useState(0);
    const [probability, setProbability] = useState(10);
    const [contactEmail, setContactEmail] = useState('');

    const availableContacts = useMemo(() => {
        if (!companyId) return [];
        return contacts.filter(contact => contact.companyId === companyId);
    }, [companyId, contacts]);

    useEffect(() => {
        if (isEditMode) {
            const company = companies.find(c => c.companyName === opportunityToEdit.customerName);
            const cid = company ? company.id : '';
            setCompanyId(cid);
            setProject(opportunityToEdit.project);
            setEstimatedValue(opportunityToEdit.estimatedValue);
            setProbability(opportunityToEdit.probability);
            
            const contact = contacts.find(c => 
                c.companyId === cid && 
                c.firstName === opportunityToEdit.contactName?.split(' ')[0]
            );
            if (contact) {
                setContactId(contact.id);
                setContactEmail(contact.email);
            }
        }
    }, [opportunityToEdit, isEditMode, companies, contacts]);

    const handleSave = () => {
        const selectedCompany = companies.find(c => c.id === companyId);
        const selectedContact = contacts.find(c => c.id === contactId);
        if (!selectedCompany) return alert('Select a company.');

        onSave({
            companyId: selectedCompany.id,
            customerName: selectedCompany.companyName,
            project,
            estimatedValue: Number(estimatedValue),
            probability: Number(probability),
            contactId: selectedContact?.id || '',
            contactName: selectedContact ? `${selectedContact.firstName} ${selectedContact.lastName}` : '',
            contactEmail: selectedContact?.email || '',
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <Card className="w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-bold text-gray-800">{isEditMode ? 'Edit Opportunity' : 'New Opportunity'}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><X /></button>
                </div>
                <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700">Company</label>
                    <select value={companyId} onChange={e => setCompanyId(e.target.value)} className="w-full p-2 border rounded-md shadow-sm">
                        <option value="">Select Company</option>
                        {companies.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                    </select>
                    <Input label="Project Name" value={project} onChange={e => setProject(e.target.value)} />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Estimated Value ($)" type="number" value={estimatedValue} onChange={e => setEstimatedValue(e.target.value)} />
                        <Input label="Probability (%)" type="number" value={probability} onChange={e => setProbability(e.target.value)} />
                    </div>
                    <label className="block text-sm font-medium text-gray-700">Contact Name</label>
                    <select value={contactId} onChange={e => setContactId(e.target.value)} className="w-full p-2 border rounded-md shadow-sm">
                        <option value="">Select Contact</option>
                        {availableContacts.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                    </select>
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <Button onClick={onClose} variant="secondary">Cancel</Button>
                    <Button onClick={handleSave} variant="primary">Save Opportunity</Button>
                </div>
            </Card>
        </div>
    );
};

// ----------------------------------------------------------------------
// 2. ADVANCED DETAIL MODAL (The Interaction Log & Linked Data Tabs)
// ----------------------------------------------------------------------
const OpportunityDetailModal = ({ 
    opp, onClose, onSaveInteraction, quotes, contacts, commissioningReports, onOpenQuote, onOpenReport, onEditContact 
}) => {
    const [activeTab, setActiveTab] = useState('ACTIVITY');
    const [newLogDate, setNewLogDate] = useState(new Date().toISOString().split('T')[0]);
    const [newLogType, setNewLogType] = useState('Call');
    const [newLogOutcome, setNewLogOutcome] = useState('');

    // Logic ported from CompaniesPage for smart data linking
    const targetName = (opp.customerName || '').toLowerCase().trim();
    
    const companyContacts = useMemo(() => contacts.filter(c => 
        c.companyId === opp.companyId || (c.companyName && c.companyName.toLowerCase().trim() === targetName)
    ), [contacts, targetName, opp]);

    const relevantQuotes = useMemo(() => quotes.filter(q => 
        q.customer?.name?.toLowerCase().includes(targetName)
    ), [quotes, targetName]);

    const relevantReports = useMemo(() => commissioningReports.filter(r => 
        r.customerName && r.customerName.toLowerCase().includes(targetName)
    ), [commissioningReports, targetName]);

    const handleAddInteraction = () => {
        if (!newLogOutcome) return alert("Enter details.");
        onSaveInteraction(opp.id, {
            id: Date.now(),
            date: newLogDate,
            type: newLogType,
            outcome: newLogOutcome
        });
        setNewLogOutcome('');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <Card className="w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col md:flex-row gap-6 bg-white p-0">
                {/* Left Side: Summary */}
                <div className="flex-1 p-6 overflow-y-auto space-y-4">
                    <div className="flex justify-between items-center border-b pb-4">
                        <h3 className="text-2xl font-bold text-gray-800">{opp.customerName}</h3>
                        <button onClick={onClose} className="md:hidden"><X /></button>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                        <p className="text-sm font-bold text-orange-600 uppercase tracking-widest">Active Project</p>
                        <p className="text-lg font-bold text-gray-800">{opp.project}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs font-bold text-gray-400">ESTIMATED VALUE</p>
                            <p className="text-xl font-bold text-gray-800">${opp.estimatedValue?.toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs font-bold text-gray-400">PROBABILITY</p>
                            <p className="text-xl font-bold text-orange-600">{opp.probability}%</p>
                        </div>
                    </div>
                    <Textarea label="Internal Briefing/Notes" rows="6" value={opp.notes || ''} readOnly className="bg-gray-50" />
                </div>

                {/* Right Side: Linked Data Tabs (The advanced stuff from Companies page) */}
                <div className="flex-1 border-l border-gray-200 bg-slate-50 p-6 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex gap-2">
                            <button onClick={() => setActiveTab('ACTIVITY')} className={`px-3 py-1 rounded text-sm font-bold ${activeTab === 'ACTIVITY' ? 'bg-orange-100 text-orange-700' : 'text-gray-500 hover:bg-gray-100'}`}>Activity Log</button>
                            <button onClick={() => setActiveTab('DATA')} className={`px-3 py-1 rounded text-sm font-bold ${activeTab === 'DATA' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}>Linked Data ({companyContacts.length + relevantQuotes.length})</button>
                        </div>
                        <button onClick={onClose} className="hidden md:block text-gray-500"><X /></button>
                    </div>

                    {activeTab === 'ACTIVITY' ? (
                        <>
                            <div className="bg-white p-3 rounded-lg border shadow-sm mb-4 space-y-2">
                                <div className="flex gap-2">
                                    <Input type="date" value={newLogDate} onChange={e => setNewLogDate(e.target.value)} className="text-sm w-1/3" />
                                    <select value={newLogType} onChange={e => setNewLogType(e.target.value)} className="block w-2/3 px-2 py-2 border rounded-md text-sm">
                                        <option value="Visit">Site Visit</option><option value="Call">Call</option><option value="Email">Email</option><option value="Note">Note</option>
                                    </select>
                                </div>
                                <div className="flex gap-2">
                                    <input type="text" value={newLogOutcome} onChange={e => setNewLogOutcome(e.target.value)} placeholder="Log outcome..." className="flex-1 px-3 py-2 border rounded-md text-sm" />
                                    <Button onClick={handleAddInteraction} variant="secondary"><Plus size={16}/></Button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-3">
                                {(opp.interactions || []).map(log => (
                                    <div key={log.id} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded text-white ${log.type === 'Visit' ? 'bg-green-500' : 'bg-blue-500'}`}>{log.type}</span>
                                            <span className="text-[10px] text-gray-400">{log.date}</span>
                                        </div>
                                        <p className="text-sm text-gray-800">{log.outcome}</p>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 overflow-y-auto space-y-4">
                            <div className="bg-white rounded-lg p-3 border shadow-sm">
                                <h5 className="font-bold text-xs text-gray-400 uppercase mb-2 flex items-center gap-2"><Users size={14}/> Contacts</h5>
                                {companyContacts.map(c => (
                                    <div key={c.id} className="flex justify-between items-center text-sm py-1 border-b last:border-0">
                                        <span>{c.firstName} {c.lastName}</span>
                                        <div className="flex gap-2">
                                            <a href={`tel:${c.phone}`} className="text-blue-600"><Phone size={14}/></a>
                                            <button onClick={() => onEditContact(c)} className="text-gray-400"><Edit size={14}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-white rounded-lg p-3 border shadow-sm">
                                <h5 className="font-bold text-xs text-gray-400 uppercase mb-2 flex items-center gap-2"><FileText size={14}/> Quotes</h5>
                                {relevantQuotes.map(q => (
                                    <div key={q.id} onClick={() => onOpenQuote(q)} className="flex justify-between items-center text-sm py-2 cursor-pointer hover:bg-slate-50 border-b last:border-0">
                                        <span className="font-bold">{q.id}</span>
                                        <span className="text-orange-600 font-bold">${q.finalSalesPrice?.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

// ----------------------------------------------------------------------
// 3. MAIN FUNNEL PAGE
// ----------------------------------------------------------------------
const FunnelPage = ({ opportunities, user, companies, contacts, quotes, commissioningReports, onOpenQuote, onOpenReport, onEditContact }) => { 
    const [showModal, setShowModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [editingOpportunity, setEditingOpportunity] = useState(null);
    const [selectedOpp, setSelectedOpp] = useState(null);

    const STAGES = STAGE_ORDER;

    const handleSave = async (oppData) => {
        if (!user) return;
        try {
            if (editingOpportunity) {
                await setDoc(doc(db, "users", user.uid, "opportunities", editingOpportunity.id), { ...oppData, lastModified: serverTimestamp() }, { merge: true });
            } else {
                await addDoc(collection(db, "users", user.uid, "opportunities"), { ...oppData, stage: 'Lead', createdAt: serverTimestamp(), interactions: [] });
            }
            setShowModal(false); setEditingOpportunity(null);
        } catch (e) { console.error(e); }
    };

    const handleSaveInteraction = async (oppId, log) => {
        const opp = opportunities.find(o => o.id === oppId);
        const updatedLogs = [log, ...(opp.interactions || [])];
        await setDoc(doc(db, "users", user.uid, "opportunities", oppId), { interactions: updatedLogs }, { merge: true });
    };

    const handleUpdateOpportunityStage = async (oppId, next) => {
        const probs = { 'Lead': 10, 'Qualifying': 25, 'Site Visit / Demo': 50, 'Proposal Sent': 75, 'Negotiation': 90, 'Closed-Won': 100, 'Closed-Lost': 0 };
        await setDoc(doc(db, "users", user.uid, "opportunities", oppId), { stage: next, probability: probs[next], lastModified: serverTimestamp() }, { merge: true });
    };

    return (
        <div className="w-full">
            {showModal && <NewOpportunityModal onSave={handleSave} onClose={() => setShowModal(false)} opportunityToEdit={editingOpportunity} companies={companies} contacts={contacts} />}
            {showDetailModal && selectedOpp && <OpportunityDetailModal opp={selectedOpp} onClose={() => setShowDetailModal(false)} onSaveInteraction={handleSaveInteraction} quotes={quotes} contacts={contacts} commissioningReports={commissioningReports} onOpenQuote={onOpenQuote} onOpenReport={onOpenReport} onEditContact={onEditContact} />}

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Sales Funnel</h1>
                <Button onClick={() => { setEditingOpportunity(null); setShowModal(true); }} variant="primary"><Plus className="mr-2" size={16} /> New Opportunity</Button>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4" style={{minHeight: '60vh'}}>
                {STAGES.map(stage => {
                    const stageOpps = (opportunities || []).filter(opp => opp.stage === stage);
                    const stageValue = stageOpps.reduce((sum, opp) => sum + (opp.estimatedValue || 0), 0);
                    let columnBg = "bg-gray-200";
                    if (stage === 'Closed-Won') columnBg = "bg-green-100";
                    if (stage === 'Closed-Lost') columnBg = "bg-red-100";

                    return (
                        <div key={stage} className={`flex-shrink-0 w-80 ${columnBg} p-3 rounded-xl shadow-sm border border-gray-300`}>
                            <div className="mb-3 flex justify-between items-center">
                                <h3 className="font-bold text-gray-700">{stage} ({stageOpps.length})</h3>
                                <span className="text-sm font-bold text-gray-500">${stageValue.toLocaleString()}</span>
                            </div>
                            <div className="space-y-3">
                                {stageOpps.map(opp => (
                                    <Card key={opp.id} className="p-4 rounded-lg shadow border bg-white border-gray-200 hover:border-orange-400 transition-all group relative">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-gray-800">{opp.customerName}</h4>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => { setEditingOpportunity(opp); setShowModal(true); }} className="p-1 text-gray-400 hover:text-indigo-600"><Edit size={14}/></button>
                                                <button onClick={async () => { if(window.confirm("Delete lead?")) await deleteDoc(doc(db, "users", user.uid, "opportunities", opp.id)); }} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={14}/></button>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500 mb-3">{opp.project}</p>
                                        <div className="flex justify-between items-center bg-gray-50 p-2 rounded border mb-3">
                                            <span className="text-sm font-bold text-orange-600">${(opp.estimatedValue || 0).toLocaleString()}</span>
                                            <span className="text-[10px] font-bold text-gray-400 border bg-white px-1 rounded">{opp.probability}% win</span>
                                        </div>
                                        <Button onClick={() => { setSelectedOpp(opp); setShowDetailModal(true); }} variant="secondary" className="w-full !py-1 text-[10px] font-bold uppercase tracking-widest">
                                            <FileText size={12} className="mr-2"/> View Details & Interaction Logs
                                        </Button>
                                        {STAGE_ORDER[STAGE_ORDER.indexOf(opp.stage) + 1] && opp.stage !== 'Closed-Won' && (
                                            <button onClick={() => handleUpdateOpportunityStage(opp.id, STAGE_ORDER[STAGE_ORDER.indexOf(opp.stage) + 1])} className="w-full mt-2 py-1 text-[10px] font-bold text-blue-500 hover:text-blue-700 bg-blue-50 rounded border border-blue-100 uppercase tracking-widest">
                                                Advance Stage &rarr;
                                            </button>
                                        )}
                                    </Card>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default FunnelPage;
