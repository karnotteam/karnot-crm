import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase'; 
import { 
    collection, addDoc, serverTimestamp, doc, setDoc, deleteDoc 
} from "firebase/firestore";
import { 
    Plus, X, Edit, Trash2, FileText, MessageSquare, 
    ChevronLeft, ChevronRight, Phone, PlusCircle, Target
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

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <Card className="w-full max-w-lg shadow-2xl p-6 bg-white rounded-lg">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-bold text-gray-800 uppercase tracking-tight">{isEditMode ? 'Edit Lead' : 'New Lead'}</h3>
                    <button onClick={onClose}><X /></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Company</label>
                        <select value={companyId} onChange={e => setCompanyId(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md bg-white font-bold">
                            <option value="">-- Select Company --</option>
                            {(companies || []).map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                        </select>
                    </div>
                    <Input label="Project Name" value={project} onChange={e => setProject(e.target.value)} />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Value ($)" type="number" value={estimatedValue} onChange={e => setEstimatedValue(e.target.value)} />
                        <Input label="Probability (%)" type="number" value={probability} onChange={e => setProbability(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Primary Contact</label>
                        <select value={contactId} onChange={e => setContactId(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md bg-white font-bold">
                            <option value="">-- Select Contact --</option>
                            {availableContacts.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                        </select>
                    </div>
                </div>
                <div className="mt-8 flex justify-end gap-3 border-t pt-4">
                    <Button onClick={onClose} variant="secondary">Cancel</Button>
                    <Button onClick={() => {
                        const selComp = companies.find(c => c.id === companyId);
                        const selCon = contacts.find(c => c.id === contactId);
                        if (!selComp) return alert('Select company.');
                        onSave({
                            companyId: selComp.id,
                            customerName: selComp.companyName,
                            project,
                            estimatedValue: Number(estimatedValue),
                            probability: Number(probability),
                            contactId: selCon?.id || '',
                            contactName: selCon ? `${selCon.firstName} ${selCon.lastName}` : '',
                            contactEmail: selCon?.email || ''
                        });
                    }} variant="primary">Save to Pipeline</Button>
                </div>
            </Card>
        </div>
    );
};

// ----------------------------------------------------------------------
// 2. INTERACTION MODAL (Adjustable Prob & Smart Quote Linking)
// ----------------------------------------------------------------------
const OpportunityDetailModal = ({ opp, onClose, onSaveInteraction, onUpdateProb, quotes = [], contacts = [], companies = [], onOpenQuote }) => {
    const [activeTab, setActiveTab] = useState('ACTIVITY');
    const [logType, setLogType] = useState('Call');
    const [logOutcome, setLogOutcome] = useState('');
    const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);

    const company = (companies || []).find(c => c.id === opp.companyId || c.companyName === opp.customerName);
    const interactions = company?.interactions || [];

    // SMART QUOTE LINKING: Matches by name, ID, or lead reference
    const targetName = (opp?.customerName || '').toLowerCase().trim();
    const relevantQuotes = (quotes || []).filter(q => {
        const quoteCustName = (q.customer?.name || '').toLowerCase().trim();
        return quoteCustName === targetName || q.leadId === opp.id || q.companyId === opp.companyId;
    });

    const handleAddLog = () => {
        if (!logOutcome || !company) return alert("Log data missing.");
        onSaveInteraction(company.id, { id: Date.now(), date: logDate, type: logType, outcome: logOutcome });
        setLogOutcome('');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <Card className="w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl bg-white p-0">
                <div className="flex-1 p-6 overflow-y-auto space-y-4 border-r">
                    <div className="flex justify-between items-center border-b pb-4">
                        <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tighter leading-none">{opp.customerName}</h3>
                        <button onClick={onClose}><X /></button>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 font-bold text-gray-800">{opp.project}</div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-gray-50 rounded-lg border">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Deal Value</p>
                            <p className="text-xl font-black text-gray-800">${(opp.estimatedValue || 0).toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg border relative">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Win Probability</p>
                            <div className="flex items-center gap-1">
                                <input 
                                    type="number" 
                                    value={opp.probability} 
                                    onChange={(e) => onUpdateProb(opp.id, e.target.value)}
                                    className="text-xl font-black text-orange-600 bg-transparent border-none w-16 focus:ring-0 p-0"
                                />
                                <span className="text-xl font-black text-orange-600">%</span>
                            </div>
                            <Target size={14} className="absolute top-3 right-3 text-gray-200" />
                        </div>
                    </div>
                    <Textarea label="Lead Summary" rows="6" value={opp.notes || ''} readOnly className="bg-gray-50 text-sm font-medium" />
                </div>

                <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden font-sans">
                    <div className="flex border-b bg-white">
                        <button onClick={() => setActiveTab('ACTIVITY')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'ACTIVITY' ? 'text-orange-600 border-b-4 border-orange-600' : 'text-gray-400'}`}>Activity Log</button>
                        <button onClick={() => setActiveTab('DATA')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'DATA' ? 'text-blue-600 border-b-4 border-blue-600' : 'text-gray-400'}`}>Quotes ({relevantQuotes.length})</button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {activeTab === 'ACTIVITY' ? (
                            <div className="space-y-4">
                                <div className="bg-white p-4 rounded-xl border shadow-sm space-y-3">
                                    <div className="flex gap-2">
                                        <Input type="date" value={logDate} onChange={e => setLogDate(e.target.value)} className="text-xs" />
                                        <select value={logType} onChange={e => setLogType(e.target.value)} className="text-xs border rounded-xl p-1 flex-1 font-black uppercase bg-gray-50">
                                            <option value="Call">Call</option><option value="Visit">Site Visit</option><option value="Email">Email</option>
                                        </select>
                                    </div>
                                    <div className="flex gap-2">
                                        <input type="text" value={logOutcome} onChange={e => setLogOutcome(e.target.value)} placeholder="Summary..." className="flex-1 text-sm p-2 border rounded-xl" />
                                        <Button onClick={handleAddLog} variant="primary"><PlusCircle size={20}/></Button>
                                    </div>
                                </div>
                                {interactions.map(log => (
                                    <div key={log.id} className="bg-white p-4 rounded-xl border shadow-sm mb-2">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full text-white uppercase tracking-widest ${log.type === 'Visit' ? 'bg-green-500' : 'bg-blue-500'}`}>{log.type}</span>
                                            <span className="text-[10px] text-gray-400 font-bold">{log.date}</span>
                                        </div>
                                        <p className="text-sm text-gray-700 font-bold">{log.outcome}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-white p-4 rounded-xl border shadow-sm">
                                    <h5 className="font-black text-[10px] text-gray-400 uppercase tracking-[0.2em] mb-4">Associated Quotes</h5>
                                    {relevantQuotes.length === 0 ? <p className="text-xs font-bold text-gray-300 uppercase py-4 text-center">No quotes linked</p> : relevantQuotes.map(q => (
                                        <div key={q.id} onClick={() => onOpenQuote(q)} className="flex justify-between items-center text-xs py-3 border-b last:border-0 font-black cursor-pointer hover:bg-slate-50 transition-colors">
                                            <span className="text-gray-600 uppercase tracking-widest">{q.id}</span>
                                            <span className="text-orange-600">${Number(q.finalSalesPrice || 0).toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="p-4 bg-white border-t flex justify-end"><Button onClick={onClose} variant="secondary" className="font-black uppercase text-[10px] tracking-widest">Close</Button></div>
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
        const company = companies.find(c => c.id === companyId);
        if (!company) return;
        await setDoc(doc(db, "users", user.uid, "companies", companyId), { interactions: [newLog, ...(company.interactions || [])] }, { merge: true });
    };

    const handleUpdateStage = async (oppId, next) => {
        const probs = { 'Lead': 10, 'Qualifying': 25, 'Site Visit / Demo': 50, 'Proposal Sent': 75, 'Negotiation': 70, 'Closed-Won': 100, 'Closed-Lost': 0 };
        await setDoc(doc(db, "users", user.uid, "opportunities", oppId), { stage: next, probability: probs[next] || 0, lastModified: serverTimestamp() }, { merge: true });
    };

    const handleUpdateProb = async (oppId, val) => {
        await setDoc(doc(db, "users", user.uid, "opportunities", oppId), { probability: Number(val) }, { merge: true });
    };

    const handleCommit = async (data) => {
        if (!user) return;
        if (editingOpp) await setDoc(doc(db, "users", user.uid, "opportunities", editingOpp.id), { ...data, lastModified: serverTimestamp() }, { merge: true });
        else await addDoc(collection(db, "users", user.uid, "opportunities"), { ...data, stage: 'Lead', createdAt: serverTimestamp() });
        setShowCreateModal(false); setEditingOpp(null);
    };

    return (
        <div className="w-full">
            {showCreateModal && <NewOpportunityModal companies={companies} contacts={contacts} opportunityToEdit={editingOpp} onClose={() => setShowCreateModal(false)} onSave={handleCommit} />}
            {showDetailModal && selectedOpp && <OpportunityDetailModal opp={selectedOpp} companies={companies} quotes={quotes} contacts={contacts} onOpenQuote={onOpenQuote} onSaveInteraction={handleSaveInteraction} onUpdateProb={handleUpdateProb} onClose={() => setShowDetailModal(false)} />}

            <div className="flex justify-between items-center mb-10"><h1 className="text-4xl font-black text-gray-800 uppercase tracking-tighter">Sales Pipeline</h1><Button onClick={() => { setEditingOpp(null); setShowCreateModal(true); }} variant="primary" className="font-black uppercase text-xs tracking-[0.2em] shadow-lg shadow-orange-100"><Plus className="mr-1" size={16} /> New Lead</Button></div>

            <div className="flex gap-4 overflow-x-auto pb-6" style={{ minHeight: '75vh' }}>
                {STAGE_ORDER.map(stage => {
                    const stageOpps = (opportunities || []).filter(o => o.stage === stage);
                    const totalVal = stageOpps.reduce((sum, o) => sum + (Number(o.estimatedValue) || 0), 0);
                    let columnBg = stage === 'Closed-Won' ? "bg-green-50" : stage === 'Closed-Lost' ? "bg-red-50" : "bg-gray-200/60";

                    return (
                        <div key={stage} className={`flex-shrink-0 w-85 ${columnBg} p-4 rounded-3xl shadow-sm border border-gray-200/50`}>
                            <div className="mb-6 flex justify-between items-end px-1 border-b-2 border-slate-300 pb-2">
                                <div>
                                    <h3 className="font-black text-slate-500 text-[10px] uppercase tracking-[0.3em] leading-none mb-1">{stage}</h3>
                                    <p className="text-2xl font-black text-gray-800 leading-none">{stageOpps.length}</p>
                                </div>
                                <span className="text-xs font-black text-gray-500 bg-white/50 px-2 py-1 rounded-lg tracking-tight">${totalVal.toLocaleString()}</span>
                            </div>
                            
                            <div className="space-y-4">
                                {stageOpps.map(opp => {
                                    const currIdx = STAGE_ORDER.indexOf(opp.stage);
                                    const nextS = STAGE_ORDER[currIdx + 1];
                                    const prevS = STAGE_ORDER[currIdx - 1];

                                    return (
                                        <Card key={opp.id} className="p-5 rounded-2xl shadow-sm border border-gray-100 bg-white hover:border-orange-400 transition-all group relative">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-black text-gray-800 leading-tight uppercase text-sm tracking-tight">{opp.customerName}</h4>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                                                    <button onClick={() => { setEditingOpp(opp); setShowCreateModal(true); }} className="p-1 text-gray-400 hover:text-indigo-600"><Edit size={14}/></button>
                                                    <button onClick={async () => { if(window.confirm("Delete lead?")) await deleteDoc(doc(db, "users", user.uid, "opportunities", opp.id)); }} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={14}/></button>
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-4 border-l-2 border-orange-200 pl-2">{opp.project}</p>
                                            
                                            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl mb-4 border border-gray-100">
                                                <span className="text-sm font-black text-gray-700 font-mono">${(Number(opp.estimatedValue) || 0).toLocaleString()}</span>
                                                <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">{opp.probability}%</span>
                                            </div>

                                            <Button onClick={() => { setSelectedOpp(opp); setShowDetailModal(true); }} variant="secondary" className="w-full !py-2 text-[10px] font-black uppercase tracking-widest border-slate-200">
                                                <MessageSquare size={14} className="mr-2 text-orange-500"/> View Interactions
                                            </Button>

                                            <div className="mt-3 flex gap-2">
                                                {prevS && (
                                                    <button onClick={() => handleUpdateStage(opp.id, prevS)} className="flex-1 py-1.5 text-[9px] font-black text-gray-400 hover:text-gray-600 bg-gray-50 border rounded-lg uppercase flex items-center justify-center">
                                                        <ChevronLeft size={10} className="mr-1"/> Back
                                                    </button>
                                                )}
                                                {nextS && !['Closed-Won', 'Closed-Lost'].includes(opp.stage) && (
                                                    <button onClick={() => handleUpdateStage(opp.id, nextS)} className="flex-[2] py-1.5 text-[9px] font-black text-blue-600 hover:text-blue-800 bg-blue-50 border border-blue-100 rounded-lg uppercase flex items-center justify-center">
                                                        Forward <ChevronRight size={10} className="ml-1"/>
                                                    </button>
                                                )}
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default FunnelPage;
