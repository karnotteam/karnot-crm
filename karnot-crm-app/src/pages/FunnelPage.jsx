import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase'; 
import { 
    collection, addDoc, serverTimestamp, doc, setDoc, deleteDoc 
} from "firebase/firestore";
import { 
    Plus, X, Edit, Trash2, FileText, MessageSquare, 
    Calendar, Clock, Users, ClipboardCheck, ArrowRight, 
    MapPin, Navigation, Phone, Mail, CheckCircle2 
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
// 1. SMART OPPORTUNITY MODAL (Add/Edit Leads)
// ----------------------------------------------------------------------
const NewOpportunityModal = ({ onClose, onSave, opportunityToEdit, companies = [], contacts = [] }) => {
    const isEditMode = Boolean(opportunityToEdit);
    const [companyId, setCompanyId] = useState('');
    const [contactId, setContactId] = useState('');
    const [project, setProject] = useState('');
    const [estimatedValue, setEstimatedValue] = useState(0);
    const [probability, setProbability] = useState(10);

    const availableContacts = useMemo(() => {
        if (!companyId) return [];
        return contacts.filter(c => c.companyId === companyId);
    }, [companyId, contacts]);

    useEffect(() => {
        if (isEditMode && opportunityToEdit) {
            const company = companies.find(c => c.companyName === opportunityToEdit.customerName);
            setCompanyId(company ? company.id : '');
            setProject(opportunityToEdit.project || '');
            setEstimatedValue(opportunityToEdit.estimatedValue || 0);
            setProbability(opportunityToEdit.probability || 10);
            setContactId(opportunityToEdit.contactId || '');
        }
    }, [opportunityToEdit, isEditMode, companies]);

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
            <Card className="w-full max-w-lg shadow-2xl p-6 bg-white rounded-2xl border-none">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">
                        {isEditMode ? 'Edit Lead' : 'New Lead Entry'}
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full"><X /></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1 block ml-1">Account Name</label>
                        <select value={companyId} onChange={e => setCompanyId(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-sm font-bold focus:ring-2 focus:ring-orange-500 outline-none">
                            <option value="">-- Select Existing Company --</option>
                            {companies.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                        </select>
                    </div>
                    <Input label="Project Description" value={project} onChange={e => setProject(e.target.value)} />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Deal Value ($)" type="number" value={estimatedValue} onChange={e => setEstimatedValue(e.target.value)} />
                        <Input label="Win Prob (%)" type="number" value={probability} onChange={e => setProbability(e.target.value)} />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1 block ml-1">Primary Contact</label>
                        <select value={contactId} onChange={e => setContactId(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-sm font-bold focus:ring-2 focus:ring-orange-500 outline-none">
                            <option value="">-- Select Person --</option>
                            {availableContacts.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                        </select>
                    </div>
                </div>
                <div className="mt-8 flex justify-end gap-3 border-t pt-6">
                    <Button onClick={onClose} variant="secondary">Discard</Button>
                    <Button onClick={handleSave} variant="primary" className="font-black px-8 uppercase tracking-widest">Save Lead</Button>
                </div>
            </Card>
        </div>
    );
};

// ----------------------------------------------------------------------
// 2. INTERACTION MODAL (Sharp Call Logs & Linked Data)
// ----------------------------------------------------------------------
const OpportunityDetailModal = ({ opp, onClose, onSaveInteraction, quotes = [], contacts = [] }) => {
    const [activeTab, setActiveTab] = useState('ACTIVITY');
    const [logType, setLogType] = useState('Call');
    const [logOutcome, setLogOutcome] = useState('');
    const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);

    // Safety: ensure name is a string for matching
    const targetName = (opp?.customerName || '').toLowerCase().trim();
    const relevantQuotes = quotes.filter(q => q.customer?.name?.toLowerCase().includes(targetName) || q.leadId === opp.id);
    const companyContacts = contacts.filter(c => c.companyName?.toLowerCase().trim() === targetName || c.companyId === opp.companyId);

    const handleAddLog = () => {
        if (!logOutcome) return;
        onSaveInteraction(opp.id, { id: Date.now(), date: logDate, type: logType, outcome: logOutcome });
        setLogOutcome('');
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <Card className="w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col md:flex-row shadow-2xl bg-white rounded-3xl border-none">
                {/* Left side: Overview */}
                <div className="flex-1 p-8 overflow-y-auto border-r border-gray-100">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tighter leading-none">{opp.customerName}</h2>
                            <p className="text-orange-600 font-bold uppercase text-xs tracking-widest mt-2">{opp.project}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lead Value</span>
                            <p className="text-2xl font-black text-gray-800">${(opp.estimatedValue || 0).toLocaleString()}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Probability</span>
                            <p className="text-2xl font-black text-orange-600">{opp.probability}%</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Internal Notes</h4>
                        <div className="p-4 bg-orange-50/50 rounded-2xl text-sm text-gray-700 font-medium italic border border-orange-100">
                            {opp.notes || "No detailed briefing notes added yet."}
                        </div>
                    </div>
                </div>

                {/* Right side: Tabs */}
                <div className="flex-1 bg-gray-50/50 flex flex-col overflow-hidden">
                    <div className="flex border-b bg-white px-6">
                        <button onClick={() => setActiveTab('ACTIVITY')} className={`py-4 px-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'ACTIVITY' ? 'text-orange-600 border-b-4 border-orange-600' : 'text-gray-400'}`}>Call Logs</button>
                        <button onClick={() => setActiveTab('DATA')} className={`py-4 px-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'DATA' ? 'text-blue-600 border-b-4 border-blue-600' : 'text-gray-400'}`}>Files ({relevantQuotes.length})</button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {activeTab === 'ACTIVITY' ? (
                            <div className="space-y-6">
                                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-4">
                                    <div className="flex gap-2">
                                        <Input type="date" value={logDate} onChange={e => setLogDate(e.target.value)} className="text-xs" />
                                        <select value={logType} onChange={e => setLogType(e.target.value)} className="text-xs border-gray-200 border rounded-xl p-2 flex-1 font-black uppercase text-gray-600 bg-gray-50 outline-none">
                                            <option value="Call">Phone Call</option>
                                            <option value="Visit">Site Visit</option>
                                            <option value="Email">Email sent</option>
                                        </select>
                                    </div>
                                    <div className="flex gap-2">
                                        <input type="text" value={logOutcome} onChange={e => setLogOutcome(e.target.value)} placeholder="Summary of interaction..." className="flex-1 text-sm p-3 bg-gray-50 border-none rounded-xl font-medium focus:ring-2 focus:ring-orange-500 outline-none" />
                                        <Button onClick={handleAddLog} variant="primary" className="rounded-xl px-4"><Plus size={20}/></Button>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    {(opp.interactions || []).length === 0 ? (
                                        <p className="text-center text-xs text-gray-400 font-bold uppercase mt-10">No interactions recorded</p>
                                    ) : (
                                        (opp.interactions || []).map(log => (
                                            <div key={log.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm relative group">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-[9px] font-black bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full uppercase tracking-widest">{log.type}</span>
                                                    <span className="text-[10px] text-gray-400 font-black">{log.date}</span>
                                                </div>
                                                <p className="text-sm text-gray-700 font-bold leading-relaxed">{log.outcome}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                    <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Quotes Issued</h5>
                                    {relevantQuotes.length === 0 ? <p className="text-xs font-bold text-gray-300">No quotes found</p> : relevantQuotes.map(q => (
                                        <div key={q.id} className="flex justify-between items-center p-3 hover:bg-slate-50 border-b border-gray-50 last:border-0 rounded-xl transition-colors">
                                            <span className="text-xs font-black text-gray-700 uppercase tracking-widest">{q.id}</span>
                                            <span className="text-sm font-black text-orange-600">${Number(q.finalSalesPrice)?.toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                    <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Main Contacts</h5>
                                    {companyContacts.map(c => (
                                        <div key={c.id} className="flex justify-between items-center p-3 border-b border-gray-50 last:border-0">
                                            <div>
                                                <p className="text-sm font-black text-gray-800 leading-tight">{c.firstName} {c.lastName}</p>
                                                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">{c.jobTitle}</p>
                                            </div>
                                            <a href={`tel:${c.phone}`} className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"><Phone size={14}/></a>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="p-6 bg-white border-t flex justify-end">
                        <Button onClick={onClose} variant="secondary" className="font-black uppercase tracking-widest text-xs px-8">Exit Viewer</Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

// ----------------------------------------------------------------------
// 3. MAIN FUNNEL PAGE
// ----------------------------------------------------------------------
const FunnelPage = ({ opportunities = [], user, companies = [], contacts = [], quotes = [], onOpenQuote }) => { 
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
        try {
            if (editingOpp) {
                await setDoc(doc(db, "users", user.uid, "opportunities", editingOpp.id), { ...data, lastModified: serverTimestamp() }, { merge: true });
            } else {
                await addDoc(collection(db, "users", user.uid, "opportunities"), { ...data, stage: 'Lead', createdAt: serverTimestamp(), interactions: [] });
            }
            setShowCreateModal(false);
            setEditingOpp(null);
        } catch (e) { console.error(e); }
    };

    return (
        <div className="w-full max-w-7xl mx-auto px-4">
            {showCreateModal && <NewOpportunityModal companies={companies} contacts={contacts} opportunityToEdit={editingOpp} onClose={() => setShowCreateModal(false)} onSave={handleCommit} />}
            {showDetailModal && selectedOpp && <OpportunityDetailModal opp={selectedOpp} quotes={quotes} contacts={contacts} onOpenQuote={onOpenQuote} onSaveInteraction={handleSaveInteraction} onClose={() => setShowDetailModal(false)} />}

            <div className="flex justify-between items-center mb-10">
                <h1 className="text-4xl font-black text-gray-800 uppercase tracking-tighter">Sales Funnel</h1>
                <Button onClick={() => { setEditingOpp(null); setShowCreateModal(true); }} variant="primary" className="font-black uppercase text-xs tracking-widest px-8 shadow-lg shadow-orange-200">
                    <Plus className="mr-2" size={16} /> New Lead
                </Button>
            </div>

            <div className="flex gap-6 overflow-x-auto pb-10 snap-x">
                {STAGE_ORDER.map(stage => {
                    const stageOpps = (opportunities || []).filter(o => o.stage === stage);
                    const totalVal = stageOpps.reduce((sum, o) => sum + (Number(o.estimatedValue) || 0), 0);
                    return (
                        <div key={stage} className="flex-shrink-0 w-85 snap-center">
                            <div className="mb-6 flex justify-between items-end px-3 border-b-4 border-slate-200 pb-3">
                                <div>
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mb-2">{stage}</h3>
                                    <p className="text-3xl font-black text-slate-800 leading-none">{stageOpps.length}</p>
                                </div>
                                <span className="text-xs font-black text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">${totalVal.toLocaleString()}</span>
                            </div>
                            
                            <div className="bg-slate-100/40 p-4 rounded-3xl min-h-[60vh] space-y-4 border border-slate-200/50 backdrop-blur-sm">
                                {stageOpps.map(opp => (
                                    <Card key={opp.id} className="p-5 rounded-2xl shadow-sm border-none bg-white hover:shadow-xl hover:ring-2 hover:ring-orange-400 group transition-all duration-300">
                                        <div className="flex justify-between items-start mb-3">
                                            <h4 className="font-black text-gray-800 uppercase text-sm tracking-tight leading-tight">{opp.customerName}</h4>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                <button onClick={() => { setEditingOpp(opp); setShowCreateModal(true); }} className="p-1.5 bg-gray-50 rounded-lg text-indigo-400 hover:text-indigo-700"><Edit size={14}/></button>
                                                <button onClick={async () => { if(window.confirm("Permanently delete lead?")) await deleteDoc(doc(db, "users", user.uid, "opportunities", opp.id)); }} className="p-1.5 bg-gray-50 rounded-lg text-red-400 hover:text-red-700"><Trash2 size={14}/></button>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-4 line-clamp-1 border-l-2 border-orange-200 pl-2">{opp.project}</p>
                                        <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl mb-4">
                                            <span className="text-sm font-black text-gray-800 font-mono">${(Number(opp.estimatedValue) || 0).toLocaleString()}</span>
                                            <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded uppercase">{opp.probability}% win</span>
                                        </div>
                                        <button onClick={() => { setSelectedOpp(opp); setShowDetailModal(true); }} className="w-full bg-slate-800 text-white py-3 rounded-xl text-[10px] font-black tracking-[0.2em] uppercase hover:bg-orange-600 transition-colors flex items-center justify-center gap-2">
                                            <MessageSquare size={14}/> Interactions
                                        </button>
                                        {!['Closed-Won', 'Closed-Lost'].includes(opp.stage) && (
                                            <button onClick={() => handleUpdateStage(opp.id, STAGE_ORDER[STAGE_ORDER.indexOf(opp.stage) + 1])} className="w-full mt-3 py-1 text-[9px] font-black uppercase text-slate-400 hover:text-orange-600 tracking-tighter">
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
