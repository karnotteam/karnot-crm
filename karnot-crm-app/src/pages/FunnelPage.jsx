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
// 1. SMART OPPORTUNITY MODAL (Add/Edit)
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
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <Card className="w-full max-w-lg shadow-xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-bold text-gray-800">{isEditMode ? 'Edit Opportunity' : 'New Opportunity'}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><X /></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                        <select value={companyId} onChange={e => setCompanyId(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md bg-white">
                            <option value="">-- Select Company --</option>
                            {companies.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                        </select>
                    </div>
                    <Input label="Project Name" value={project} onChange={e => setProject(e.target.value)} />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Value ($)" type="number" value={estimatedValue} onChange={e => setEstimatedValue(e.target.value)} />
                        <Input label="Probability (%)" type="number" value={probability} onChange={e => setProbability(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Primary Contact</label>
                        <select value={contactId} onChange={e => setContactId(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md bg-white">
                            <option value="">-- Select Contact --</option>
                            {availableContacts.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                        </select>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <Button onClick={onClose} variant="secondary">Cancel</Button>
                    <Button onClick={handleSave} variant="primary">Save Lead</Button>
                </div>
            </Card>
        </div>
    );
};

// ----------------------------------------------------------------------
// 2. INTERACTION MODAL (Original Sharp Activity View)
// ----------------------------------------------------------------------
const OpportunityDetailModal = ({ opp, onClose, onSaveInteraction, quotes = [], contacts = [] }) => {
    const [activeTab, setActiveTab] = useState('ACTIVITY');
    const [logType, setLogType] = useState('Call');
    const [logOutcome, setLogOutcome] = useState('');
    const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);

    // Safety checks to prevent "White Screen"
    const safeQuotes = quotes || [];
    const safeContacts = contacts || [];
    const targetName = (opp?.customerName || '').toLowerCase().trim();
    
    const relevantQuotes = safeQuotes.filter(q => (q.customer?.name || '').toLowerCase().includes(targetName));
    const companyContacts = safeContacts.filter(c => (c.companyName || '').toLowerCase().trim() === targetName || c.companyId === opp.companyId);

    const handleAddLog = () => {
        if (!logOutcome) return;
        onSaveInteraction(opp.id, { id: Date.now(), date: logDate, type: logType, outcome: logOutcome });
        setLogOutcome('');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <Card className="w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row gap-6 bg-white p-0 shadow-2xl">
                <div className="flex-1 p-6 overflow-y-auto space-y-4">
                    <div className="flex justify-between items-center border-b pb-4">
                        <h3 className="text-2xl font-bold text-gray-800">{opp.customerName}</h3>
                        <button onClick={onClose} className="md:hidden"><X /></button>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                        <p className="text-xs font-bold text-orange-600 uppercase tracking-widest">Active Project</p>
                        <p className="text-lg font-bold text-gray-800">{opp.project}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Est. Value</p>
                            <p className="text-xl font-bold text-gray-800">${(opp.estimatedValue || 0).toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Status</p>
                            <p className="text-xl font-bold text-orange-600">{opp.stage}</p>
                        </div>
                    </div>
                    <Textarea label="Lead Notes" rows="6" value={opp.notes || ''} readOnly className="bg-gray-50" />
                </div>

                <div className="flex-1 border-l border-gray-200 bg-slate-50 p-6 flex flex-col overflow-hidden">
                    <div className="flex gap-2 mb-4">
                        <button onClick={() => setActiveTab('ACTIVITY')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'ACTIVITY' ? 'bg-orange-100 text-orange-700 shadow-sm' : 'text-gray-400 hover:bg-white'}`}>Activity Log</button>
                        <button onClick={() => setActiveTab('DATA')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'DATA' ? 'bg-blue-100 text-blue-700 shadow-sm' : 'text-gray-400 hover:bg-white'}`}>Linked Data ({relevantQuotes.length})</button>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2">
                        {activeTab === 'ACTIVITY' ? (
                            <div className="space-y-4">
                                <div className="bg-white p-4 rounded-xl border shadow-sm space-y-3">
                                    <div className="flex gap-2">
                                        <Input type="date" value={logDate} onChange={e => setLogDate(e.target.value)} className="text-xs" />
                                        <select value={logType} onChange={e => setLogType(e.target.value)} className="block w-full px-2 py-2 border rounded-md text-sm font-bold">
                                            <option value="Call">Phone Call</option><option value="Visit">Site Visit</option><option value="Email">Email Followup</option>
                                        </select>
                                    </div>
                                    <div className="flex gap-2">
                                        <input type="text" value={logOutcome} onChange={e => setLogOutcome(e.target.value)} placeholder="Outcome..." className="flex-1 px-3 py-2 border rounded-md text-sm" />
                                        <Button onClick={handleAddLog} variant="primary"><Plus size={18}/></Button>
                                    </div>
                                </div>
                                {(opp.interactions || []).map(log => (
                                    <div key={log.id} className="bg-white p-3 rounded-lg border shadow-sm">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded text-white ${log.type === 'Visit' ? 'bg-green-500' : 'bg-blue-500'}`}>{log.type}</span>
                                            <span className="text-[10px] text-gray-400">{log.date}</span>
                                        </div>
                                        <p className="text-xs text-gray-700 font-medium">{log.outcome}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-white p-4 rounded-xl border">
                                    <h5 className="font-bold text-xs text-gray-400 uppercase mb-3 flex items-center gap-2"><FileText size={14}/> Quotes</h5>
                                    {relevantQuotes.length === 0 ? <p className="text-xs italic text-gray-300">No linked quotes</p> : relevantQuotes.map(q => (
                                        <div key={q.id} className="flex justify-between items-center text-xs py-2 border-b last:border-0">
                                            <span className="font-bold">{q.id}</span>
                                            <span className="text-orange-600 font-bold">${Number(q.finalSalesPrice || 0).toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="bg-white p-4 rounded-xl border">
                                    <h5 className="font-bold text-xs text-gray-400 uppercase mb-3 flex items-center gap-2"><Users size={14}/> Contacts</h5>
                                    {companyContacts.map(c => (
                                        <div key={c.id} className="flex justify-between items-center text-xs py-1 border-b last:border-0">
                                            <span>{c.firstName} {c.lastName}</span>
                                            <a href={`tel:${c.phone}`} className="text-blue-600"><Phone size={14}/></a>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="mt-4 pt-4 border-t flex justify-end">
                        <Button onClick={onClose} variant="secondary">Close Viewer</Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

// ----------------------------------------------------------------------
// 3. MAIN FUNNEL PAGE
// ----------------------------------------------------------------------
const FunnelPage = ({ opportunities = [], user, companies = [], contacts = [], quotes = [] }) => { 
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedOpp, setSelectedOpp] = useState(null);
    const [editingOpp, setEditingOpp] = useState(null);

    const handleSaveInteraction = async (oppId, newLog) => {
        const opp = (opportunities || []).find(o => o.id === oppId);
        if (!opp) return;
        const updated = [newLog, ...(opp.interactions || [])];
        await setDoc(doc(db, "users", user.uid, "opportunities", oppId), { interactions: updated }, { merge: true });
    };

    const handleUpdateStage = async (oppId, next) => {
        const probs = { 'Lead': 10, 'Qualifying': 25, 'Site Visit / Demo': 50, 'Proposal Sent': 75, 'Negotiation': 90, 'Closed-Won': 100, 'Closed-Lost': 0 };
        await setDoc(doc(db, "users", user.uid, "opportunities", oppId), { stage: next, probability: probs[next] || 0, lastModified: serverTimestamp() }, { merge: true });
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
        <div className="w-full">
            {showCreateModal && <NewOpportunityModal companies={companies} contacts={contacts} opportunityToEdit={editingOpp} onClose={() => setShowCreateModal(false)} onSave={handleCommit} />}
            {showDetailModal && selectedOpp && <OpportunityDetailModal opp={selectedOpp} quotes={quotes} contacts={contacts} onSaveInteraction={handleSaveInteraction} onClose={() => setShowDetailModal(false)} />}

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Sales Funnel</h1>
                <Button onClick={() => { setEditingOpp(null); setShowCreateModal(true); }} variant="primary"><Plus className="mr-2" size={16} /> New Lead</Button>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-6" style={{ minHeight: '70vh' }}>
                {STAGE_ORDER.map(stage => {
                    const stageOpps = (opportunities || []).filter(o => o.stage === stage);
                    const totalVal = stageOpps.reduce((sum, o) => sum + (Number(o.estimatedValue) || 0), 0);
                    
                    let columnBg = "bg-gray-200";
                    if (stage === 'Closed-Won') columnBg = "bg-green-50";
                    if (stage === 'Closed-Lost') columnBg = "bg-red-50";

                    return (
                        <div key={stage} className={`flex-shrink-0 w-80 ${columnBg} p-3 rounded-xl shadow-sm border border-gray-300`}>
                            <div className="mb-4 flex justify-between items-center px-1">
                                <h3 className="font-bold text-gray-700 text-sm uppercase tracking-widest">{stage} ({stageOpps.length})</h3>
                                <span className="text-xs font-bold text-gray-500">${totalVal.toLocaleString()}</span>
                            </div>
                            
                            <div className="space-y-3">
                                {stageOpps.map(opp => (
                                    <Card key={opp.id} className="p-4 rounded-lg shadow-sm border border-gray-200 bg-white hover:border-orange-400 transition-all group relative">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="font-bold text-gray-800 leading-tight">{opp.customerName}</h4>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => { setEditingOpp(opp); setShowCreateModal(true); }} className="p-1 text-gray-400 hover:text-indigo-600"><Edit size={14}/></button>
                                                <button onClick={async () => { if(window.confirm("Delete lead?")) await deleteDoc(doc(db, "users", user.uid, "opportunities", opp.id)); }} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={14}/></button>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500 mb-3 line-clamp-1">{opp.project}</p>
                                        
                                        <div className="flex justify-between items-center bg-gray-50 p-2 rounded border mb-3">
                                            <span className="text-sm font-bold text-orange-600">${(Number(opp.estimatedValue) || 0).toLocaleString()}</span>
                                            <span className="text-[10px] font-bold text-gray-400 border bg-white px-1 rounded">{opp.probability}% win</span>
                                        </div>

                                        <Button onClick={() => { setSelectedOpp(opp); setShowDetailModal(true); }} variant="secondary" className="w-full !py-1 text-[10px] font-bold uppercase tracking-widest">
                                            <MessageSquare size={12} className="mr-2"/> Interactions / Logs
                                        </Button>

                                        {STAGE_ORDER[STAGE_ORDER.indexOf(opp.stage) + 1] && !['Closed-Won', 'Closed-Lost'].includes(opp.stage) && (
                                            <button onClick={() => handleUpdateStage(opp.id, STAGE_ORDER[STAGE_ORDER.indexOf(opp.stage) + 1])} className="w-full mt-2 py-1 text-[10px] font-bold text-blue-500 hover:text-blue-700 bg-blue-50 rounded border border-blue-100 uppercase tracking-widest">
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
