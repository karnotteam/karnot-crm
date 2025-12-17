import React, { useState, useMemo, useRef, useEffect } from 'react';
import { db } from '../firebase'; 
import { collection, addDoc, serverTimestamp, doc, setDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { Plus, X, Edit, Trash2, Building, Search, Mail, Phone, CheckSquare, Clock, Globe, MapPin, UserCheck, FileText } from 'lucide-react';
import { Card, Button, Input, Checkbox, Textarea } from '../data/constants.jsx'; 

// --- 1. Company Modal Component ---
const CompanyModal = ({ onClose, onSave, companyToEdit }) => {
    const isEditMode = Boolean(companyToEdit);
    
    const [companyName, setCompanyName] = useState(companyToEdit?.companyName || '');
    const [industry, setIndustry] = useState(companyToEdit?.industry || '');
    const [website, setWebsite] = useState(companyToEdit?.website || '');
    const [phone, setPhone] = useState(companyToEdit?.phone || '');
    const [address, setAddress] = useState(companyToEdit?.address || '');
    const [notes, setNotes] = useState(companyToEdit?.notes || '');
    
    const [isVerified, setIsVerified] = useState(companyToEdit?.isVerified || false);
    const [isEmailed, setIsEmailed] = useState(companyToEdit?.isEmailed || false);

    const handleSave = () => {
        if (!companyName) return alert('Please enter a company name.');
        onSave({ 
            companyName, industry, website, phone, address, notes,
            isVerified, isEmailed 
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-20 flex justify-center items-center p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-800">{isEditMode ? 'Edit Company' : 'New Company'}</h3>
                    <button onClick={onClose} className="text-gray-500"><X /></button>
                </div>

                <div className="space-y-4">
                    <Input label="Company Name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Industry" value={industry} onChange={(e) => setIndustry(e.target.value)} />
                        <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </div>
                    <Input label="Website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
                    <Input label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
                    <Textarea label="Notes" rows="3" value={notes} onChange={(e) => setNotes(e.target.value)} />

                    <div className="grid grid-cols-2 gap-4 mt-2 p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <Checkbox id="isVerified" label="Verified Company" checked={isVerified} onChange={(e) => setIsVerified(e.target.checked)} />
                        <Checkbox id="isEmailed" label="Campaign Sent" checked={isEmailed} onChange={(e) => setIsEmailed(e.target.checked)} />
                    </div>
                </div>

                <div className="mt-8 flex justify-end gap-2">
                    <Button onClick={onClose} variant="secondary">Cancel</Button>
                    <Button onClick={handleSave} variant="primary"><Plus className="mr-2" size={16} /> Save Company</Button>
                </div>
            </Card>
        </div>
    );
};

// --- 2. CompanyCard Component (Updated with Quoted Indicator) ---
const CompanyCard = ({ company, onEdit, onDelete, hasQuotes }) => {
    return (
        <Card className="p-4 rounded-lg shadow border border-gray-200 hover:border-orange-300 transition-all relative group">
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                        <Building size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold text-lg text-gray-800 leading-tight">{company.companyName}</h4>
                        <p className="text-xs text-orange-600 font-medium">{company.industry || 'No Industry Set'}</p>
                    </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button onClick={() => onEdit(company)} variant="secondary" className="p-1 h-auto w-auto"><Edit size={14}/></Button>
                    <Button onClick={() => onDelete(company.id)} variant="danger" className="p-1 h-auto w-auto"><Trash2 size={14}/></Button>
                </div>
            </div>

            <div className="space-y-2 mb-4">
                {company.website && (
                    <div className="text-sm text-gray-600 flex items-center gap-2">
                        <Globe size={14} className="text-gray-400" />
                        <a href={company.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate">{company.website.replace('https://', '')}</a>
                    </div>
                )}
                {company.phone && (
                    <div className="text-sm text-gray-600 flex items-center gap-2">
                        <Phone size={14} className="text-gray-400" />
                        <span>{company.phone}</span>
                    </div>
                )}
            </div>

            {/* LIGHT UP FEATURES (Verified, Emailed, and now Quoted) */}
            <div className="pt-3 border-t border-gray-100 grid grid-cols-3 gap-1 text-[9px] text-gray-500 text-center">
                <div className={`p-1 rounded transition-all ${company.isVerified ? 'bg-green-50 text-green-700 font-bold' : ''}`}>
                    <UserCheck size={14} className={`mx-auto mb-1 ${company.isVerified ? 'text-green-600' : 'text-gray-300'}`}/> 
                    Verified
                </div>
                <div className={`p-1 rounded transition-all ${company.isEmailed ? 'bg-purple-50 text-purple-700 font-bold' : ''}`}>
                    <Mail size={14} className={`mx-auto mb-1 ${company.isEmailed ? 'text-purple-600' : 'text-gray-300'}`}/> 
                    Emailed
                </div>
                <div className={`p-1 rounded transition-all ${hasQuotes ? 'bg-orange-50 text-orange-700 font-bold' : ''}`}>
                    <CheckSquare size={14} className={`mx-auto mb-1 ${hasQuotes ? 'text-orange-600' : 'text-gray-300'}`}/> 
                    Quoted
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
        } catch (err) {
            console.error(err);
            alert("Error saving company.");
        }
    };

    const handleDeleteCompany = async (id) => {
        if (!user || !confirm("Delete this company?")) return;
        await deleteDoc(doc(db, "users", user.uid, "companies", id));
    };

    const filteredCompanies = useMemo(() => {
        return companies.filter(c => 
            c.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.industry?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [companies, searchTerm]);

    const checkHasQuotes = (compName) => {
        if (!compName || !quotes) return false;
        const normalizedComp = compName.toLowerCase().trim();
        return quotes.some(q => q.customer?.name?.toLowerCase().trim() === normalizedComp);
    };

    return (
        <div className="w-full pb-20">
            {showModal && <CompanyModal onClose={() => setShowModal(false)} onSave={handleSaveCompany} companyToEdit={editingCompany} />}

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Building className="text-orange-600" />
                    Companies
                    <span className="text-gray-400 font-normal text-lg">({filteredCompanies.length})</span>
                </h2>
                <Button onClick={() => { setEditingCompany(null); setShowModal(true); }} variant="primary">
                    <Plus className="mr-2" size={16} /> New Company
                </Button>
            </div>

            <div className="mb-6 relative">
                <Input 
                    type="text" 
                    placeholder="Search by company name or industry..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className="pl-10" 
                />
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCompanies.map(company => (
                    <CompanyCard 
                        key={company.id} 
                        company={company} 
                        hasQuotes={checkHasQuotes(company.companyName)}
                        onEdit={(c) => { setEditingCompany(c); setShowModal(true); }} 
                        onDelete={handleDeleteCompany} 
                    />
                ))}
            </div>
            
            {companies.length === 0 && (
                <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <Building size={48} className="mx-auto text-gray-300 mb-4"/>
                    <p className="text-gray-500 font-medium">No companies in your database yet.</p>
                </div>
            )}
        </div>
    );
};

export default CompaniesPage;
