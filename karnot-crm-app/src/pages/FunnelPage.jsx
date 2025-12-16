import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase'; 
import { 
    collection, 
    addDoc, 
    serverTimestamp, 
    doc, 
    setDoc, 
    deleteDoc 
} from "firebase/firestore";
import { 
    Plus, X, Edit, Trash2, FileText, MessageSquare, 
    Calendar, Clock, Users, ClipboardCheck, ArrowRight, 
    MapPin, Navigation, Phone, CheckCircle2 
} from 'lucide-react';
import { Card, Button, Input, Textarea, PRICING_TIERS } from '../data/constants.jsx'; 

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
// 1. SMART OPPORTUNITY MODAL (Used for creating/editing the Lead)
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
        return contacts.filter(c => c.companyId === companyId);
    }, [companyId, contacts]);

    useEffect(() => {
        if (isEditMode) {
            const company = companies.find(c => c.companyName === opportunityToEdit.customerName);
            const cId = company ? company.id : '';
            setCompanyId(cId);
            setProject(opportunityToEdit.project || '');
            setEstimatedValue(opportunityToEdit.estimatedValue || 0);
            setProbability(opportunityToEdit.probability || 10);
            
            const contact = contacts.find(c => c.id === opportunityToEdit.contactId);
            if (contact) {
                setContactId(contact.id);
                setContactEmail(contact.email);
            }
        }
    }, [opportunityToEdit, isEditMode, companies, contacts]);

    const handleSave = () => {
        const selectedCompany = companies.find(c => c.id === companyId);
        const selectedContact = contacts.find(c => c.id === contactId);
        if (!selectedCompany) return alert('Please select a company.');

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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <Card className="w-full max-w-lg shadow-2xl p-6 bg-white">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">
                        {isEditMode ? 'Modify Opportunity' : 'New Opportunity'}
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full"><X /></button>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Company / Account</label>
                        <select value={companyId} onChange={e => setCompanyId(e.target.value)} className="w-full p-2.5 border rounded-lg bg-gray-50 text-sm font-bold">
                            <option value="">-- Select Company --</option>
                            {companies.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                        </select>
                    </div>

                    <Input label="Project / Requirement" value={project} onChange={e => setProject(e.target.value)} placeholder="e.g. 50kW Heat Pump Install" />
                    
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Estimated Value ($)" type="number" value={estimatedValue} onChange={e => setEstimatedValue(e.target.value)} />
                        <Input label="Probability (%)" type="number" value={probability} onChange={e => setProbability(e.target.value)} />
                    </div>

                    <hr className="border-gray-100" />

                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Primary Contact</label>
                        <select value={contactId} onChange={e => {
                            setContactId(e.target.value);
                            const c = contacts.find(con => con.id === e.target.value);
                            setContactEmail(c?.email || '');
                        }} className="w-full p-2.5 border rounded-lg bg-gray-50 text-sm font-bold">
                            <option value="">-- Select Contact --</option>
                            {availableContacts.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                        </select>
                    </div>
                </div>

                <div className="mt-8 flex justify-end gap-3">
                    <Button onClick={onClose} variant="secondary">Cancel</Button>
                    <Button onClick={handleSave} variant="primary" className="font-black px-6 uppercase tracking-widest">Commit Opportunity</Button>
                </div>
            </Card>
        </div>
    );
};

// ----------------------------------------------------------------------
// 2. INTERACTION MODAL (Ported from Companies Page)
// ----------------------------------------------------------------------
const OpportunityDetailModal = ({ opp, onClose, onSaveInteraction, quotes, contacts, onOpenQuote }) => {
    const [activeTab, setActiveTab] = useState('ACTIVITY');
    const [logType, setLogType] = useState('Call');
    const [logOutcome, setLogOutcome] = useState('');
    const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);

    const targetName = opp.customerName.toLowerCase().trim();
    const relevantQuotes = quotes.filter(q => q.customer?.name?.toLowerCase().includes(targetName) || q.leadId === opp.id);
    const companyContacts = contacts.filter(c => c.companyName?.toLowerCase().trim() === targetName || c.companyId === opp.companyId);

    const handleAddLog = () => {
        if (!logOutcome) return;
        onSaveInteraction(opp.id, { id: Date.now(), date: logDate, type: logType, outcome: logOutcome });
        setLogOutcome('');
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <Card className="w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl bg-white">
                <div className="flex-1 p-6 overflow-y-auto border-r">
                    <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight mb-1">{opp.customerName}</h2>
                    <p className="text-orange-600 font-bold mb-6">{opp.project}</p>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pipeline Value</span>
                            <p className="text-2xl font-black text-gray-800">${opp.estimatedValue?.toLocaleString()}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Current Status</span>
                            <p className="text-2xl font-black text-orange-600">{opp.stage}</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 bg-slate-50 flex flex-col">
                    <div className="flex border-b bg-white">
                        <button onClick={() => setActiveTab('ACTIVITY')} className={`flex-1 py-4 text-xs font-black uppercase tracking-[0.2em] ${activeTab === 'ACTIVITY' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-gray-400'}`}>Activity</button>
                        <button onClick={() => setActiveTab('DATA')} className={`flex-1 py-4 text-xs font-black uppercase tracking-[0.2em] ${activeTab === 'DATA' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400'}`}>Files ({relevantQuotes.length})</button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {activeTab === 'ACTIVITY' ? (
                            <div className="space-y-4">
                                <div className="bg-white p-4 rounded-xl border space-y-3">
                                    <div className="flex gap-2">
                                        <Input type="date" value={logDate} onChange={e => setLogDate(e.target.value)} className="text-xs" />
                                        <select value={logType} onChange={e => setLogType(e.target.value)} className="text-xs border rounded-md p-2 flex-1 font-bold">
                                            <option value="Call">Phone Call</option>
                                            <option value="Visit">Site Visit</option>
                                            <option value="Email">Email Followup</option>
                                        </select>
                                    </div>
                                    <div className="flex gap-2">
                                        <input type="text" value={logOutcome} onChange={e => setLogOutcome(e.target.value)} placeholder="What was the outcome?" className="flex-1 text-sm p-2 border rounded-md" />
                                        <Button onClick={handleAddLog} variant="primary"><Plus size={18}/></Button>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {(opp.interactions || []).map(log => (
                                        <div key={log.id} className="bg-white p-3 rounded-lg border shadow-sm">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[10px] font-black text-blue-600 uppercase">{log.type}</span>
                                                <span className="text-[10px] text-gray-400 font-bold">{log.date}</span>
                                            </div>
                                            <p className="text-xs text-gray-600 font-medium">{log.outcome}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-white p-4 rounded-xl border">
                                    <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Associated Quotes</h5>
                                    {relevantQuotes.map(q => (
                                        <div key={q.id} onClick={() => onOpenQuote(q)} className="flex justify-between items-center p-2 hover:bg-slate-50 cursor-pointer border-b last:border-0 font-bold text-xs">
                                            <span>{q.id}</span>
                                            <span className="text-orange-600">${q.finalSalesPrice?.toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="p-6 bg-white border-t flex justify-end">
                        <Button onClick={onClose} variant="secondary">Close Viewer</Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

// ----------------------------------------------------------------------
// 3. MAIN FUNNEL PAGE COMPONENT
// ----------------------------------------------------------------------
const FunnelPage = ({ opportunities, user, companies, contacts, quotes, onOpenQuote }) => { 
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedOpp, setSelectedOpp] = useState(null);
    const [editingOpp, setEditingOpp] = useState(null);

    const handleSaveInteraction = async (oppId, newLog) => {
        const opp = opportunities.find(o => o.id === oppId);
        const updated = [newLog, ...(opp.interactions || [])];
        await setDoc(doc(db, "users", user.uid, "opportunities", oppId), { interactions: updated }, { merge: true });
    };

    const handleUpdateStage = async (oppId, next) => {
        const probs = { 'Lead': 10, 'Qualifying': 25, 'Site Visit / Demo': 50, 'Proposal Sent': 75, 'Negotiation': 90, 'Closed-Won': 100, 'Closed-Lost': 0 };
        await setDoc(doc(db, "users", user.uid, "opportunities", oppId), { stage: next, probability: probs[next], lastModified: serverTimestamp() }, { merge: true });
    };

    const handleCommit = async (data) => {
        if (!user) return;
        if (editingOpp) {
            await setDoc(doc(db, "users", user.uid, "opportunities", editingOpp.id), data, { merge: true });
        } else {
            await addDoc(collection(db, "users", user.uid, "opportunities"), { ...data, stage: 'Lead', createdAt: serverTimestamp(), interactions: [] });
        }
        setShowCreateModal(false);
    };

    return (
        <div className="w-full">
            {showCreateModal && <NewOpportunityModal companies={companies} contacts={contacts} opportunityToEdit={editingOpp} onClose={() => setShowCreateModal(false)} onSave={handleCommit} />}
            {showDetailModal && selectedOpp && <OpportunityDetailModal opp={selectedOpp} quotes={quotes} contacts={contacts} onOpenQuote={onOpenQuote} onSaveInteraction={handleSaveInteraction} onClose={() => setShowDetailModal(false)} />}

            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-black text-gray-800 uppercase tracking-tighter">Sales Funnel</h1>
                <Button onClick={() => { setEditingOpp(null); setShowCreateModal(true); }} variant="primary" className="font-black uppercase text-xs tracking-widest">
                    <Plus className="mr-2" size={16} /> New Lead
                </Button>
            </div>

            <div className="flex gap-6 overflow-x-auto pb-8">
                {STAGE_ORDER.map(stage => {
                    const stageOpps = (opportunities || []).filter(o => o.stage === stage);
                    const totalVal = stageOpps.reduce((sum, o) => sum + (o.estimatedValue || 0), 0);
                    return (
                        <div key={stage} className="flex-shrink-0 w-80">
                            <div className="mb-4 flex justify-between items-end px-2 border-b-2 border-slate-200 pb-2">
                                <div>
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{stage}</h3>
                                    <p className="text-xl font-black text-slate-800 leading-none mt-1">{stageOpps.length}</p>
                                </div>
                                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">${totalVal.toLocaleString()}</span>
                            </div>
                            
                            <div className="bg-slate-50 p-2 rounded-2xl min-h-[60vh] space-y-3 border border-slate-100">
                                {stageOpps.map(opp => (
                                    <Card key={opp.id} className="p-4 rounded-xl shadow-sm border bg-white hover:border-orange-400 group transition-all">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-black text-gray-800 uppercase text-xs tracking-tight">{opp.customerName}</h4>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                                                <button onClick={() => { setEditingOpp(opp); setShowCreateModal(true); }} className="p-1 text-indigo-400 hover:text-indigo-700"><Edit size={12}/></button>
                                                <button onClick={async () => { if(window.confirm("Delete?")) await deleteDoc(doc(db, "users", user.uid, "opportunities", opp.id)); }} className="p-1 text-red-400 hover:text-red-700"><Trash2 size={12}/></button>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-3 line-clamp-1">{opp.project}</p>
                                        <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg mb-3">
                                            <span className="text-sm font-black text-orange-600">${opp.estimatedValue?.toLocaleString()}</span>
                                            <span className="text-[10px] font-black text-slate-400 border px-1.5 rounded">{opp.probability}%</span>
                                        </div>
                                        <Button onClick={() => { setSelectedOpp(opp); setShowDetailModal(true); }} variant="secondary" className="w-full !py-1 text-[10px] font-black tracking-widest uppercase">
                                            <MessageSquare size={12} className="mr-1"/> Interactions
                                        </Button>
                                        {!['Closed-Won', 'Closed-Lost'].includes(opp.stage) && (
                                            <button onClick={() => handleUpdateStage(opp.id, STAGE_ORDER[STAGE_ORDER.indexOf(opp.stage) + 1])} className="w-full mt-2 text-[9px] font-black uppercase text-blue-500 hover:text-blue-800">
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
