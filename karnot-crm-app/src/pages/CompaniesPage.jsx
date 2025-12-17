import React, { useState, useMemo, useRef, useEffect } from 'react';
import { db } from '../firebase'; 
import { collection, addDoc, serverTimestamp, doc, setDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { Plus, X, Edit, Trash2, Building, Search, Mail, Phone, CheckSquare, Clock, Globe, MapPin, UserCheck, PlusCircle } from 'lucide-react';
import { Card, Button, Input, Checkbox, Textarea } from '../data/constants.jsx'; 

// --- 1. Company Modal Component (Restored with Full Interaction Log) ---
const CompanyModal = ({ onClose, onSave, companyToEdit }) => {
    const isEditMode = Boolean(companyToEdit);
    
    const [companyName, setCompanyName] = useState(companyToEdit?.companyName || '');
    const [industry, setIndustry] = useState(companyToEdit?.industry || '');
    const [website, setWebsite] = useState(companyToEdit?.website || '');
    const [phone, setPhone] = useState(companyToEdit?.phone || '');
    const [address, setAddress] = useState(companyToEdit?.address || '');
    const [notes, setNotes] = useState(companyToEdit?.notes || '');
    
    // Status Flags
    const [isVerified, setIsVerified] = useState(companyToEdit?.isVerified || false);
    const [isEmailed, setIsEmailed] = useState(companyToEdit?.isEmailed || false);

    // Interaction History (Same logic as Funnel/Contacts)
    const [interactions, setInteractions] = useState(companyToEdit?.interactions || []);
    const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
    const [logType, setLogType] = useState('Call');
    const [logOutcome, setLogOutcome] = useState('');

    const handleAddLog = () => {
        if (!logOutcome) return alert("Please enter an outcome.");
        const newLog = { id: Date.now(), date: logDate, type: logType, outcome: logOutcome };
        setInteractions([newLog, ...interactions]);
        setLogOutcome('');
    };

    const handleDeleteLog = (id) => setInteractions(interactions.filter(i => i.id !== id));

    const handleSave = () => {
        if (!companyName) return alert('Please enter a company name.');
        onSave({ 
            companyName, industry, website, phone, address, notes,
            isVerified, isEmailed, interactions 
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-20 flex justify-center items-center p-4">
            <Card className="w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl bg-white p-0">
                {/* LEFT: Company Details */}
                <div className="flex-1 p-6 overflow-y-auto space-y-4 border-r">
                    <div className="flex justify-between items-center border-b pb-4">
                        <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tighter leading-none">
                            {isEditMode ? 'Edit Company' : 'New Company'}
                        </h3>
                        <button onClick={onClose} className="md:hidden"><X /></button>
                    </div>

                    <Input label="Company Name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
                    
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Industry" value={industry} onChange={(e) => setIndustry(e.target.value)} />
                        <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </div>
                    
                    <Input label="Website" value={website} onChange={(e) => setWebsite(e.target.value)} />
                    <Input label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
                    
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Notes</label>
                    <textarea 
                        rows="4" value={notes} 
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full p-4 bg-white text-sm font-medium border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                    />

                    <div className="grid grid-cols-2 gap-4 mt-2 p-4 bg-gray-50 rounded-lg border">
                        <Checkbox id="isVerified" label="Verified" checked={isVerified} onChange={(e) => setIsVerified(e.target.checked)} />
                        <Checkbox id="isEmailed" label="Emailed" checked={isEmailed} onChange={(e) => setIsEmailed(e.target.checked)} />
                    </div>
                </div>

                {/* RIGHT: Interaction Log (Matches Funnel Style) */}
                <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden">
                    <div className="p-4 border-b bg-white flex justify-between items-center">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Activity Log</h4>
                        <button onClick={onClose} className="hidden md:block"><X /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="bg-white p-4 rounded-xl border space-y-3 mb-6">
                            <div className="flex gap-2">
                                <Input type="date" value={logDate} onChange={e => setLogDate(e.target.value)} className="text-xs" />
                                <select value={logType} onChange={e => setLogType(e.target.value)} className="text-xs border rounded-xl p-1 flex-1 font-black uppercase bg-gray-50">
                                    <option value="Call">Call</option><option value="Visit">Site Visit</option><option value="Email">Email</option>
                                </select>
                            </div>
                            <div className="flex gap-2">
                                <input type="text" value={logOutcome} onChange={e => setLogOutcome(e.target.value)} placeholder="Outcome..." className="flex-1 text-sm p-2 border rounded-xl" />
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
                                <button onClick={() => handleDeleteLog(log.id)} className="ml-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 bg-white border-t">
                        <Button onClick={handleSave} variant="primary" className="w-full">Save Changes</Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

// --- 2. CompanyCard Component ---
const CompanyCard = ({ company, onEdit, onDelete, hasQuotes }) => {
    const lastActivity = company.interactions && company.interactions.length > 0 ? company.interactions[0] : null;

    return (
        <Card className="p-5 rounded-2xl shadow-sm bg-white hover:border-orange-400 group relative">
            <button onClick={() => onDelete(company.id)} className="absolute top-4 right-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
            
            <h4 className="font-black text-gray-800 uppercase text-sm mb-1 pr-6">{company.companyName}</h4>
            <p className="text-[10px] text-gray-400 font-bold uppercase mb-4">{company.industry}</p>

            {lastActivity && (
                <div className="mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-black text-blue-600 uppercase">{lastActivity.type}</span>
                        <span className="text-[9px] text-gray-400 font-bold">{lastActivity.date}</span>
                    </div>
                    <p className="text-[11px] text-gray-600 font-bold truncate">{lastActivity.outcome}</p>
                </div>
            )}

            <Button onClick={() => onEdit(company)} variant="secondary" className="w-full !py-2 text-[9px] font-black uppercase tracking-widest mb-4">Interactions / Details</Button>

            <div className="pt-3 border-t grid grid-cols-3 gap-1 text-[9px] text-gray-500 text-center">
                <div className={`p-1 rounded ${company.isVerified ? 'bg-green-50 text-green-700 font-bold' : ''}`}>
                    <UserCheck size={14} className={`mx-auto mb-1 ${company.isVerified ? 'text-green-600' : 'text-gray-300'}`}/> Verified
                </div>
                <div className={`p-1 rounded ${company.isEmailed ? 'bg-purple-50 text-purple-700 font-bold' : ''}`}>
                    <Mail size={14} className={`mx-auto mb-1 ${company.isEmailed ? 'text-purple-600' : 'text-gray-300'}`}/> Emailed
                </div>
                <div className={`p-1 rounded ${hasQuotes ? 'bg-orange-50 text-orange-700 font-bold' : ''}`}>
                    <CheckSquare size={14} className={`mx-auto mb-1 ${hasQuotes ? 'text-orange-600' : 'text-gray-300'}`}/> Quoted
                </div>
            </div>
        </Card>
    );
};

// --- 3. Main Page Component ---
const CompaniesPage = ({ companies = [], user, quotes = [] }) => {
    const [showModal, setShowModal] = useState(false);
    const [editingCompany, setEditingCompany] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const handleSaveCompany = async (companyData) => {
        if (!user) return;
        try {
            if (editingCompany) {
                const ref = doc(db, "users", user.uid, "companies", editingCompany.id);
                await updateDoc(ref, { ...companyData, lastModified: serverTimestamp() });
            } else {
                await addDoc(collection(db, "users", user.uid, "companies"), { ...companyData, createdAt: serverTimestamp() });
            }
            setShowModal(false);
            setEditingCompany(null);
        } catch (err) { console.error(err); }
    };

    const handleDeleteCompany = async (id) => {
        if (!user || !confirm("Delete this company?")) return;
        await deleteDoc(doc(db, "users", user.uid, "companies", id));
    };

    const checkHasQuotes = (compName) => {
        if (!compName || !quotes) return false;
        const normalizedComp = compName.toLowerCase().trim();
        return quotes.some(q => q.customer?.name?.toLowerCase().trim() === normalizedComp);
    };

    const filtered = companies.filter(c => c.companyName?.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="w-full pb-20">
            {showModal && <CompanyModal onClose={() => setShowModal(false)} onSave={handleSaveCompany} companyToEdit={editingCompany} />}

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">Companies ({filtered.length})</h2>
                <Button onClick={() => { setEditingCompany(null); setShowModal(true); }} variant="primary"><Plus size={16} /> New Company</Button>
            </div>

            <div className="mb-6 relative">
                <Input placeholder="Search companies..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(company => (
                    <CompanyCard key={company.id} company={company} hasQuotes={checkHasQuotes(company.companyName)} onEdit={(c) => { setEditingCompany(c); setShowModal(true); }} onDelete={handleDeleteCompany} />
                ))}
            </div>
        </div>
    );
};

export default CompaniesPage;
