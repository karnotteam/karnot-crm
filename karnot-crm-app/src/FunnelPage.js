import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase'; 
import { 
    collection, addDoc, serverTimestamp, doc, setDoc, deleteDoc, updateDoc
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
// 1. OPPORTUNITY DETAIL MODAL (With Delete Interaction & Summary)
// ----------------------------------------------------------------------
const OpportunityDetailModal = ({ opp, onClose, onSaveInteraction, onDeleteInteraction, onUpdateProb, onUpdateNotes, quotes = [], companies = [], onOpenQuote }) => {
    const [activeTab, setActiveTab] = useState('ACTIVITY');
    const [logType, setLogType] = useState('Call');
    const [logOutcome, setLogOutcome] = useState('');
    const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
    const [localNotes, setLocalNotes] = useState(opp.notes || '');

    const company = (companies || []).find(c => c.id === opp.companyId || c.companyName === opp.customerName);
    const interactions = company?.interactions || [];

    const relevantQuotes = useMemo(() => {
        const targetName = (opp?.customerName || "").toLowerCase().trim();
        return (quotes || []).filter(q => {
            const quoteName = (q.customer?.name || "").toLowerCase().trim();
            return quoteName.includes(targetName) || targetName.includes(quoteName) || q.leadId === opp.id;
        });
    }, [quotes, opp]);

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
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Win Prob %</p>
                            <input type="number" value={opp.probability} onChange={(e) => onUpdateProb(opp.id, e.target.value)} className="text-xl font-black text-orange-600 bg-transparent border-none w-full focus:ring-0 p-0" />
                        </div>
                    </div>

                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lead Summary</label>
                    <textarea 
                        rows="8" value={localNotes} 
                        onChange={(e) => setLocalNotes(e.target.value)}
                        onBlur={() => onUpdateNotes(opp.id, localNotes)}
                        className="w-full p-4 bg-white text-sm font-medium border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                        placeholder="Type deal notes here..."
                    />
                </div>

                <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden">
                    <div className="flex border-b bg-white">
                        <button onClick={() => setActiveTab('ACTIVITY')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] ${activeTab === 'ACTIVITY' ? 'text-orange-600 border-b-4 border-orange-600' : 'text-gray-400'}`}>Activity Log</button>
                        <button onClick={() => setActiveTab('DATA')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] ${activeTab === 'DATA' ? 'text-blue-600 border-b-4 border-blue-600' : 'text-gray-400'}`}>Quotes ({relevantQuotes.length})</button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {activeTab === 'ACTIVITY' ? (
                            <div className="space-y-4">
                                <div className="bg-white p-4 rounded-xl border space-y-3">
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
                                    <div key={log.id} className="bg-white p-4 rounded-xl border shadow-sm mb-2 flex justify-between items-start group">
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full text-white uppercase tracking-widest ${log.type === 'Visit' ? 'bg-green-500' : 'bg-blue-500'}`}>{log.type}</span>
                                                <span className="text-[10px] text-gray-400 font-bold">{log.date}</span>
                                            </div>
                                            <p className="text-sm text-gray-700 font-bold">{log.outcome}</p>
                                        </div>
                                        <button onClick={() => onDeleteInteraction(company.id, log.id)} className="ml-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {relevantQuotes.map(q => (
                                    <div key={q.id} onClick={() => onOpenQuote(q)} className="p-4 bg-white border border-slate-200 rounded-2xl cursor-pointer hover:border-orange-500 transition-all flex justify-between items-center">
                                        <div><p className="text-gray-800 font-black text-xs uppercase">{q.id}</p><p className="text-[9px] text-gray-400 font-bold">VIEW PROPOSAL →</p></div>
                                        <span className="text-orange-600 font-black text-lg">${Number(q.finalSalesPrice || 0).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
};

const FunnelPage = ({ opportunities = [], user, companies = [], contacts = [], quotes = [], onOpenQuote }) => { 
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedOpp, setSelectedOpp] = useState(null);

    const handleUpdateStage = async (oppId, next) => {
        const probs = { 'Lead': 10, 'Qualifying': 25, 'Site Visit / Demo': 50, 'Proposal Sent': 75, 'Negotiation': 85, 'Closed-Won': 100, 'Closed-Lost': 0 };
        await setDoc(doc(db, "users", user.uid, "opportunities", oppId), { stage: next, probability: probs[next] || 0, lastModified: serverTimestamp() }, { merge: true });
    };

    const handleSaveInteraction = async (companyId, newLog) => {
        const company = companies.find(c => c.id === companyId);
        await setDoc(doc(db, "users", user.uid, "companies", companyId), { interactions: [newLog, ...(company.interactions || [])] }, { merge: true });
    };

    const handleDeleteInteraction = async (companyId, logId) => {
        const company = companies.find(c => c.id === companyId);
        const filtered = (company.interactions || []).filter(i => i.id !== logId);
        await setDoc(doc(db, "users", user.uid, "companies", companyId), { interactions: filtered }, { merge: true });
    };

    return (
        <div className="w-full">
            {showDetailModal && selectedOpp && (
                <OpportunityDetailModal 
                    opp={selectedOpp} companies={companies} quotes={quotes} onOpenQuote={onOpenQuote} 
                    onSaveInteraction={handleSaveInteraction} onDeleteInteraction={handleDeleteInteraction}
                    onUpdateProb={(id, val) => setDoc(doc(db, "users", user.uid, "opportunities", id), { probability: Number(val) }, { merge: true })}
                    onUpdateNotes={(id, notes) => setDoc(doc(db, "users", user.uid, "opportunities", id), { notes }, { merge: true })}
                    onClose={() => setShowDetailModal(false)} 
                />
            )}

            <div className="flex gap-4 overflow-x-auto pb-6" style={{ minHeight: '80vh' }}>
                {STAGE_ORDER.map(stage => {
                    const stageOpps = (opportunities || []).filter(o => o.stage === stage);
                    return (
                        <div key={stage} className="flex-shrink-0 w-80 bg-gray-200/50 p-4 rounded-3xl border border-gray-200/50">
                            <h3 className="font-black text-slate-500 text-[10px] uppercase tracking-[0.3em] mb-4">{stage} ({stageOpps.length})</h3>
                            <div className="space-y-4">
                                {stageOpps.map(opp => {
                                    const currIdx = STAGE_ORDER.indexOf(opp.stage);
                                    return (
                                        <Card key={opp.id} className="p-5 rounded-2xl shadow-sm bg-white hover:border-orange-400 group">
                                            <h4 className="font-black text-gray-800 uppercase text-sm mb-1">{opp.customerName}</h4>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase mb-4">{opp.project}</p>
                                            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl mb-3">
                                                <span className="text-xs font-black">${(Number(opp.estimatedValue) || 0).toLocaleString()}</span>
                                                <span className="text-[10px] font-black text-orange-600">{opp.probability}%</span>
                                            </div>
                                            <Button onClick={() => { setSelectedOpp(opp); setShowDetailModal(true); }} variant="secondary" className="w-full !py-2 text-[9px] font-black uppercase tracking-widest mb-3">Interactions</Button>
                                            <div className="flex gap-2">
                                                {currIdx > 0 && <button onClick={() => handleUpdateStage(opp.id, STAGE_ORDER[currIdx - 1])} className="flex-1 py-2 text-[9px] font-black text-gray-400 bg-gray-50 rounded-lg uppercase border">Back</button>}
                                                {currIdx < STAGE_ORDER.length - 1 && <button onClick={() => handleUpdateStage(opp.id, STAGE_ORDER[currIdx + 1])} className="flex-1 py-2 text-[9px] font-black text-blue-600 bg-blue-50 rounded-lg uppercase border border-blue-100">Forward</button>}
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
