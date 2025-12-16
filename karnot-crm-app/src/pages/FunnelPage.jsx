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
// 1. SMART OPPORTUNITY MODAL (Creation & Edit)
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
        return (contacts || []).filter(c => c.companyId === companyId);
    }, [companyId, contacts]);

    useEffect(() => {
        if (isEditMode && opportunityToEdit) {
            const company = (companies || []).find(c => c.companyName === opportunityToEdit.customerName);
            setCompanyId(company ? company.id : '');
            setProject(opportunityToEdit.project || '');
            setEstimatedValue(opportunityToEdit.estimatedValue || 0);
            setProbability(opportunityToEdit.probability || 10);
            setContactId(opportunityToEdit.contactId || '');
        }
    }, [opportunityToEdit, isEditMode, companies]);

    const handleSave = () => {
        const selectedCompany = (companies || []).find(c => c.id === companyId);
        const selectedContact = (contacts || []).find(c => c.id === contactId);
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
            <Card className="w-full max-w-lg shadow-2xl p-6 bg-white rounded-lg">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-bold text-gray-800 tracking-tight">{isEditMode ? 'Edit Opportunity' : 'New Opportunity'}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><X /></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                        <select value={companyId} onChange={e => setCompanyId(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md bg-white shadow-sm">
                            <option value="">-- Select Company --</option>
                            {(companies || []).map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                        </select>
                    </div>
                    <Input label="Project Name" value={project} onChange={e => setProject(e.target.value)} />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Value ($)" type="number" value={estimatedValue} onChange={e => setEstimatedValue(e.target.value)} />
                        <Input label="Win Prob (%)" type="number" value={probability} onChange={e => setProbability(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Primary Contact</label>
                        <select value={contactId} onChange={e => setContactId(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md bg-white shadow-sm">
                            <option value="">-- Select Contact --</option>
                            {availableContacts.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                        </select>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3 border-t pt-4">
                    <Button onClick={onClose} variant="secondary">Cancel</Button>
                    <Button onClick={handleSave} variant="primary">Save Lead</Button>
                </div>
            </Card>
        </div>
    );
};

// ----------------------------------------------------------------------
// 2. INTERACTION MODAL (Fixed Matching & Safety Checks)
// ----------------------------------------------------------------------
const OpportunityDetailModal = ({ opp, onClose, onSaveInteraction, quotes = [], contacts = [], companies = [], onOpenQuote }) => {
    const [activeTab, setActiveTab] = useState('ACTIVITY');
    const [logType, setLogType] = useState('Call');
    const [logOutcome, setLogOutcome] = useState('');
    const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);

    // Safety: Find the master company
    const company = (companies || []).find(c => c.id === opp.companyId || c.companyName === opp.customerName);
    const interactions = Array.isArray(company?.interactions) ? company.interactions : [];

    // BROAD MATCHING Logic: Finds quotes by Lead ID, Company ID, or Customer Name
    const targetName = (opp?.customerName || '').toLowerCase().trim();
    const relevantQuotes = (quotes || []).filter(q => 
        q.leadId === opp.id || 
        q.companyId === opp.companyId || 
        (q.customer?.name || '').toLowerCase().includes(targetName)
    );

    const handleAddLog = () => {
        if (!logOutcome || !company) return alert("Please select a company for this lead first.");
        onSaveInteraction(company.id, { id: Date.now(), date: logDate, type: logType, outcome: logOutcome });
        setLogOutcome('');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <Card className="w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl bg-white rounded-lg p-0 border-none">
                {/* Left side: Opportunity Specs */}
                <div className="flex-1 p-6 overflow-y-auto space-y-4 border-r border-gray-100">
                    <div className="flex justify-between items-center border-b pb-4">
                        <h3 className="text-2xl font-bold text-gray-800">{opp.customerName}</h3>
                        <button onClick={onClose} className="md:hidden"><X /></button>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 font-bold text-gray-800">
                        {opp.project}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-gray-50 rounded-lg border">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pipeline Value</p>
                            <p className="text-xl font-bold text-gray-800">${(opp.estimatedValue || 0).toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg border">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Current Stage</p>
                            <p className="text-xl font-bold text-orange-600">{opp.stage}</p>
                        </div>
                    </div>
                    <Textarea label="Lead Briefing" rows="6" value={opp.notes || ''} readOnly className="bg-gray-50 text-sm" />
                </div>

                {/* Right side: Activity Log & File Linker */}
                <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden">
                    <div className="flex border-b bg-white">
                        <button onClick={() => setActiveTab('ACTIVITY')} className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'ACTIVITY' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-gray-400'}`}>Activity Log</button>
                        <button onClick={() => setActiveTab('DATA')} className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'DATA' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400'}`}>Linked Files ({relevantQuotes.length})</button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {activeTab === 'ACTIVITY' ? (
                            <div className="space-y-4">
                                <div className="bg-white p-4 rounded-xl border shadow-sm space-y-3">
                                    <div className="flex gap-2">
                                        <Input type="date" value={logDate} onChange={e => setLogDate(e.target.value)} className="text-xs" />
                                        <select value={logType} onChange={e => setLogType(e.target.value)} className="block w-full px-2 py-2 border rounded-md text-sm font-bold bg-gray-50">
                                            <option value="Call">Phone Call</option><option value="Visit">Site Visit</option><option value="Email">Email Followup</option>
                                        </select>
                                    </div>
                                    <div className="flex gap-2">
                                        <input type="text" value={logOutcome} onChange={e => setLogOutcome(e.target.value)} placeholder="What was the outcome?" className="flex-1 text-sm p-2 border rounded shadow-inner" />
                                        <Button onClick={handleAddLog} variant="primary" className="shadow-lg"><Plus size={20}/></Button>
                                    </div>
                                </div>
                                {interactions.length === 0 ? (
                                    <p className="text-center text-xs text-gray-400 uppercase font-bold tracking-widest py-10">No interactions recorded</p>
                                ) : (
                                    interactions.map(log => (
                                        <div key={log.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm transition-all hover:shadow-md">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded text-white ${log.type === 'Visit' ? 'bg-green-500' : 'bg-blue-500'}`}>{log.type}</span>
                                                <span className="text-[10px] text-gray-400 font-bold">{log.date}</span>
                                            </div>
                                            <p className="text-xs text-gray-700 font-medium leading-relaxed">{log.outcome}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-white p-4 rounded-xl border shadow-sm">
                                    <h5 className="font-bold text-xs text-gray-400 uppercase mb-3 flex items-center gap-1 tracking-widest">Associated Quotes</h5>
                                    {relevantQuotes.length === 0 ? (
                                        <p className="text-xs italic text-gray-300 py-4 text-center">No quotes linked to this account</p>
                                    ) : (
                                        relevantQuotes.map(q => (
                                            <div key={q.id} onClick={() => onOpenQuote(q)} className="flex justify-between items-center text-xs py-3 border-b last:border-0 font-bold cursor-pointer hover:bg-slate-50 rounded px-1 transition-colors">
                                                <span className="text-gray-600">{q.id}</span>
                                                <span className="text-orange-600">${Number(q.finalSalesPrice || 0).toLocaleString()}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="p-4 bg-white border-t flex justify-end">
                        <Button onClick={onClose} variant="secondary" className="font-bold text-xs uppercase tracking-widest">Close Detail View</Button>
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

    const handleSaveInteraction = async (companyId, newLog) => {
        const company = (companies || []).find(c => c.id === companyId);
        if (!company) return;
        const updated = [newLog, ...(company.interactions || [])];
        await setDoc(doc(db, "users", user.uid, "companies", companyId), { interactions: updated }, { merge: true });
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
                await addDoc(collection(db, "users", user.uid, "opportunities"), { ...data, stage: 'Lead', createdAt: serverTimestamp() });
            }
            setShowCreateModal(false); setEditingOpp(null);
        } catch (e) { console.error(e); }
    };

    return (
        <div className="w-full">
            {showCreateModal && <NewOpportunityModal companies={companies} contacts={contacts} opportunityToEdit={editingOpp} onClose={() => setShowCreateModal(false)} onSave={handleCommit} />}
            {showDetailModal && selectedOpp && <OpportunityDetailModal opp={selectedOpp} companies={companies} quotes={quotes} contacts={contacts} onOpenQuote={onOpenQuote} onSaveInteraction={handleSaveInteraction} onClose={() => setShowDetailModal(false)} />}

            <div className="flex justify-between items-center mb-8 font-sans">
                <h1 className="text-3xl font-black text-gray-800 uppercase tracking-tighter">Sales Pipeline</h1>
                <Button onClick={() => { setEditingOpp(null); setShowCreateModal(true); }} variant="primary" className="font-bold uppercase tracking-widest text-xs"><Plus className="mr-2" size={16} /> New Lead</Button>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-6 snap-x" style={{ minHeight: '70vh' }}>
                {STAGE_ORDER.map(stage => {
                    const stageOpps = (opportunities || []).filter(o => o.stage === stage);
                    const totalVal = stageOpps.reduce((sum, o) => sum + (Number(o.estimatedValue) || 0), 0);
                    
                    let columnBg = "bg-gray-100";
                    if (stage === 'Closed-Won') columnBg = "bg-green-50";
                    if (stage === 'Closed-Lost') columnBg = "bg-red-50";

                    return (
                        <div key={stage} className={`flex-shrink-0 w-85 ${columnBg} p-3 rounded-xl shadow-sm border border-gray-200 snap-center`}>
                            <div className="mb-4 flex justify-between items-center px-1">
                                <h3 className="font-black text-gray-700 text-xs uppercase tracking-widest">{stage} ({stageOpps.length})</h3>
                                <span className="text-xs font-black text-slate-500">${totalVal.toLocaleString()}</span>
                            </div>
                            
                            <div className="space-y-3">
                                {stageOpps.map(opp => (
                                    <Card key={opp.id} className="p-4 rounded-xl shadow-sm border border-gray-200 bg-white hover:border-orange-400 transition-all group relative">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="font-black text-gray-800 uppercase text-sm tracking-tight leading-tight">{opp.customerName}</h4>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => { setEditingOpp(opp); setShowCreateModal(true); }} className="p-1 text-gray-400 hover:text-indigo-600"><Edit size={14}/></button>
                                                <button onClick={async () => { if(window.confirm("Permanently delete lead?")) await deleteDoc(doc(db, "users", user.uid, "opportunities", opp.id)); }} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={14}/></button>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500 font-medium mb-3 line-clamp-1">{opp.project}</p>
                                        
                                        <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border mb-3">
                                            <span className="text-sm font-black text-orange-600">${(Number(opp.estimatedValue) || 0).toLocaleString()}</span>
                                            <span className="text-[10px] font-black text-gray-400 border bg-white px-2 rounded-full shadow-sm">{opp.probability}% win</span>
                                        </div>

                                        <Button onClick={() => { setSelectedOpp(opp); setShowDetailModal(true); }} variant="secondary" className="w-full !py-2 text-[10px] font-black uppercase tracking-widest">
                                            <MessageSquare size={12} className="mr-2"/> View interactions
                                        </Button>

                                        {STAGE_ORDER[STAGE_ORDER.indexOf(opp.stage) + 1] && !['Closed-Won', 'Closed-Lost'].includes(opp.stage) && (
                                            <button onClick={() => handleUpdateStage(opp.id, STAGE_ORDER[STAGE_ORDER.indexOf(opp.stage) + 1])} className="w-full mt-2 py-1 text-[9px] font-black text-blue-500 hover:text-blue-700 uppercase tracking-[0.2em] transition-all">
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
