import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase'; 
import { collection, addDoc, serverTimestamp, doc, setDoc, deleteDoc } from "firebase/firestore";
import { Plus, X, Edit, Trash2, FileText, MessageSquare, Clock, Users, Phone } from 'lucide-react';
import { Card, Button, Input, Textarea, PRICING_TIERS } from '../data/constants.jsx'; 

const STAGE_ORDER = ['Lead', 'Qualifying', 'Site Visit / Demo', 'Proposal Sent', 'Negotiation', 'Closed-Won', 'Closed-Lost'];

const NewOpportunityModal = ({ onClose, onSave, opportunityToEdit, companies = [], contacts = [] }) => {
    const isEditMode = Boolean(opportunityToEdit);
    const [companyId, setCompanyId] = useState('');
    const [contactId, setContactId] = useState('');
    const [project, setProject] = useState('');
    const [estimatedValue, setEstimatedValue] = useState(0);
    const [probability, setProbability] = useState(10);
    const [contactEmail, setContactEmail] = useState('');

    const availableContacts = useMemo(() => !companyId ? [] : contacts.filter(c => c.companyId === companyId), [companyId, contacts]);

    useEffect(() => {
        if (isEditMode && opportunityToEdit) {
            const company = companies.find(c => c.companyName === opportunityToEdit.customerName);
            setCompanyId(company ? company.id : '');
            setProject(opportunityToEdit.project || '');
            setEstimatedValue(opportunityToEdit.estimatedValue || 0);
            setProbability(opportunityToEdit.probability || 10);
            setContactId(opportunityToEdit.contactId || '');
            setContactEmail(opportunityToEdit.contactEmail || '');
        }
    }, [opportunityToEdit, isEditMode, companies]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <Card className="w-full max-w-lg shadow-2xl p-6 bg-white rounded-lg">
                <div className="flex justify-between items-center mb-4"><h3 className="text-2xl font-bold text-gray-800">{isEditMode ? 'Edit Opportunity' : 'New Opportunity'}</h3><button onClick={onClose}><X /></button></div>
                <div className="space-y-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Company</label><select value={companyId} onChange={e => setCompanyId(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md bg-white sm:text-sm"><option value="">-- Select Company --</option>{companies.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}</select></div>
                    <Input label="Project Name" value={project} onChange={e => setProject(e.target.value)} />
                    <div className="grid grid-cols-2 gap-4"><Input label="Value ($)" type="number" value={estimatedValue} onChange={e => setEstimatedValue(e.target.value)} /><Input label="Win Prob (%)" type="number" value={probability} onChange={e => setProbability(e.target.value)} /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Contact</label><select value={contactId} onChange={e => { setContactId(e.target.value); const con = contacts.find(c => c.id === e.target.value); setContactEmail(con?.email || ''); }} className="w-full p-2 border border-gray-300 rounded-md bg-white sm:text-sm"><option value="">-- Select Contact --</option>{availableContacts.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}</select></div>
                </div>
                <div className="mt-6 flex justify-end gap-3"><Button onClick={onClose} variant="secondary">Cancel</Button><Button onClick={() => {
                    const selComp = companies.find(c => c.id === companyId);
                    const selCon = contacts.find(c => c.id === contactId);
                    if (!selComp) return alert('Select company.');
                    onSave({ companyId: selComp.id, customerName: selComp.companyName, project, estimatedValue: Number(estimatedValue), probability: Number(probability), contactId: selCon?.id || '', contactName: selCon ? `${selCon.firstName} ${selCon.lastName}` : '', contactEmail: selCon?.email || '' });
                }} variant="primary">Save Lead</Button></div>
            </Card>
        </div>
    );
};

const OpportunityDetailModal = ({ opp, onClose, onSaveInteraction, quotes = [], contacts = [], companies = [], onOpenQuote }) => {
    const [activeTab, setActiveTab] = useState('ACTIVITY');
    const [logType, setLogType] = useState('Call');
    const [logOutcome, setLogOutcome] = useState('');
    const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);

    const company = companies.find(c => c.id === opp.companyId || c.companyName === opp.customerName);
    const interactions = company?.interactions || [];
    const targetName = (opp?.customerName || '').toLowerCase().trim();
    const relevantQuotes = (quotes || []).filter(q => (q.customer?.name || '').toLowerCase().includes(targetName));

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <Card className="w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl bg-white rounded-lg p-0">
                <div className="flex-1 p-6 overflow-y-auto space-y-4 border-r">
                    <div className="flex justify-between items-center border-b pb-4"><h3 className="text-2xl font-bold text-gray-800">{opp.customerName}</h3><button onClick={onClose} className="md:hidden"><X /></button></div>
                    <div className="bg-orange-50 p-4 rounded-xl border border-orange-100"><p className="text-xs font-bold text-orange-600 uppercase tracking-widest">Project</p><p className="text-lg font-bold text-gray-800">{opp.project}</p></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-gray-50 rounded-lg"><p className="text-[10px] font-bold text-gray-400 uppercase">Value</p><p className="text-xl font-bold text-gray-800">${(opp.estimatedValue || 0).toLocaleString()}</p></div>
                        <div className="p-3 bg-gray-50 rounded-lg"><p className="text-[10px] font-bold text-gray-400 uppercase">Stage</p><p className="text-xl font-bold text-orange-600">{opp.stage}</p></div>
                    </div>
                    <Textarea label="Lead Notes" rows="6" value={opp.notes || ''} readOnly className="bg-gray-50" />
                </div>
                <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden">
                    <div className="flex border-b bg-white"><button onClick={() => setActiveTab('ACTIVITY')} className={`flex-1 py-3 text-sm font-bold ${activeTab === 'ACTIVITY' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-gray-400'}`}>Call Logs (Synced)</button><button onClick={() => setActiveTab('DATA')} className={`flex-1 py-3 text-sm font-bold ${activeTab === 'DATA' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400'}`}>Linked Data</button></div>
                    <div className="flex-1 overflow-y-auto p-6">
                        {activeTab === 'ACTIVITY' ? (
                            <div className="space-y-4">
                                <div className="bg-white p-4 rounded-xl border shadow-sm space-y-3"><div className="flex gap-2"><Input type="date" value={logDate} onChange={e => setLogDate(e.target.value)} className="text-xs" /><select value={logType} onChange={e => setLogType(e.target.value)} className="block w-full px-2 py-2 border rounded-md text-sm font-bold"><option value="Call">Call</option><option value="Visit">Site Visit</option><option value="Email">Email</option></select></div><div className="flex gap-2"><input type="text" value={logOutcome} onChange={e => setLogOutcome(e.target.value)} placeholder="Outcome..." className="flex-1 text-sm p-2 border rounded-md shadow-inner" /><Button onClick={() => { if(!logOutcome || !company) return; onSaveInteraction(company.id, { id: Date.now(), date: logDate, type: logType, outcome: logOutcome }); setLogOutcome(''); }} variant="primary"><Plus/></Button></div></div>
                                {interactions.map(log => (<div key={log.id} className="bg-white p-3 rounded-lg border shadow-sm"><div className="flex justify-between items-center mb-1"><span className={`text-[10px] font-bold px-2 py-0.5 rounded text-white ${log.type === 'Visit' ? 'bg-green-500' : 'bg-blue-500'}`}>{log.type}</span><span className="text-[10px] text-gray-400">{log.date}</span></div><p className="text-xs text-gray-700 font-medium">{log.outcome}</p></div>))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-white p-4 rounded-xl border shadow-sm"><h5 className="font-bold text-xs text-gray-400 uppercase mb-3 flex items-center gap-1"><FileText size={12}/> Associated Quotes</h5>{relevantQuotes.length === 0 ? <p className="text-xs italic text-gray-300">No linked quotes</p> : relevantQuotes.map(q => (<div key={q.id} onClick={() => onOpenQuote(q)} className="flex justify-between items-center text-xs py-2 border-b last:border-0 font-bold cursor-pointer hover:bg-slate-50"><span>{q.id}</span><span className="text-orange-600">${Number(q.finalSalesPrice || 0).toLocaleString()}</span></div>))}</div>
                            </div>
                        )}
                    </div>
                    <div className="p-4 bg-white border-t flex justify-end"><Button onClick={onClose} variant="secondary">Close Viewer</Button></div>
                </div>
            </Card>
        </div>
    );
};

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

    const handleCommit = async (data) => {
        if (!user) return;
        if (editingOpp) await setDoc(doc(db, "users", user.uid, "opportunities", editingOpp.id), { ...data, lastModified: serverTimestamp() }, { merge: true });
        else await addDoc(collection(db, "users", user.uid, "opportunities"), { ...data, stage: 'Lead', createdAt: serverTimestamp() });
        setShowCreateModal(false); setEditingOpp(null);
    };

    return (
        <div className="w-full">
            {showCreateModal && <NewOpportunityModal companies={companies} contacts={contacts} opportunityToEdit={editingOpp} onClose={() => setShowCreateModal(false)} onSave={handleCommit} />}
            {showDetailModal && selectedOpp && <OpportunityDetailModal opp={selectedOpp} companies={companies} quotes={quotes} contacts={contacts} onOpenQuote={onOpenQuote} onSaveInteraction={handleSaveInteraction} onClose={() => setShowDetailModal(false)} />}

            <div className="flex justify-between items-center mb-6"><h1 className="text-3xl font-bold text-gray-800">Sales Funnel</h1><Button onClick={() => { setEditingOpp(null); setShowCreateModal(true); }} variant="primary"><Plus className="mr-2" size={16} /> New Lead</Button></div>

            <div className="flex gap-4 overflow-x-auto pb-6" style={{ minHeight: '70vh' }}>
                {STAGE_ORDER.map(stage => {
                    const stageOpps = opportunities.filter(o => o.stage === stage);
                    const totalVal = stageOpps.reduce((sum, o) => sum + (Number(o.estimatedValue) || 0), 0);
                    let columnBg = stage === 'Closed-Won' ? "bg-green-50" : stage === 'Closed-Lost' ? "bg-red-50" : "bg-gray-200";
                    return (
                        <div key={stage} className={`flex-shrink-0 w-80 ${columnBg} p-3 rounded-lg shadow-sm border border-gray-300`}>
                            <div className="mb-4 flex justify-between items-center px-1"><h3 className="font-bold text-gray-700 text-sm uppercase">{stage} ({stageOpps.length})</h3><span className="text-xs font-bold text-gray-500">${totalVal.toLocaleString()}</span></div>
                            <div className="space-y-3">
                                {stageOpps.map(opp => (
                                    <Card key={opp.id} className="p-4 rounded-lg shadow-sm border border-gray-200 bg-white hover:border-orange-400 transition-all group relative">
                                        <div className="flex justify-between items-start mb-1"><h4 className="font-bold text-gray-800 leading-tight">{opp.customerName}</h4><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => { setEditingOpp(opp); setShowCreateModal(true); }} className="p-1 text-gray-400 hover:text-indigo-600"><Edit size={14}/></button><button onClick={async () => { if(window.confirm("Delete lead?")) await deleteDoc(doc(db, "users", user.uid, "opportunities", opp.id)); }} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={14}/></button></div></div>
                                        <p className="text-xs text-gray-500 mb-3 line-clamp-1">{opp.project}</p>
                                        <div className="flex justify-between items-center bg-gray-50 p-2 rounded border mb-3"><span className="text-sm font-bold text-orange-600">${(Number(opp.estimatedValue) || 0).toLocaleString()}</span><span className="text-[10px] font-bold text-gray-400 border bg-white px-1 rounded">{opp.probability}% win</span></div>
                                        <Button onClick={() => { setSelectedOpp(opp); setShowDetailModal(true); }} variant="secondary" className="w-full !py-1 text-[10px] font-bold uppercase tracking-widest"><MessageSquare size={12} className="mr-2"/> View Interactions</Button>
                                        {STAGE_ORDER[STAGE_ORDER.indexOf(opp.stage) + 1] && !['Closed-Won', 'Closed-Lost'].includes(opp.stage) && (
                                            <button onClick={async () => { 
                                                const next = STAGE_ORDER[STAGE_ORDER.indexOf(opp.stage) + 1];
                                                const probs = { 'Lead': 10, 'Qualifying': 25, 'Site Visit / Demo': 50, 'Proposal Sent': 75, 'Negotiation': 90, 'Closed-Won': 100, 'Closed-Lost': 0 };
                                                await setDoc(doc(db, "users", user.uid, "opportunities", opp.id), { stage: next, probability: probs[next] || 0, lastModified: serverTimestamp() }, { merge: true });
                                            }} className="w-full mt-2 py-1 text-[10px] font-bold text-blue-500 hover:text-blue-700 bg-blue-50 rounded border border-blue-100 uppercase tracking-widest">Advance Stage &rarr;</button>
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
