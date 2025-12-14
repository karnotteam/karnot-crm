import React, { useState, useRef, useMemo } from 'react'; 
import { db } from '../firebase'; 
import { collection, addDoc, serverTimestamp, doc, setDoc, deleteDoc, writeBatch, query, getDocs } from "firebase/firestore";
import Papa from 'papaparse'; 
import { Plus, X, Edit, Trash2, Building, Globe, Upload, Search, MapPin, ShieldCheck, AlertTriangle, CheckSquare, Wand2 } from 'lucide-react';
import { Card, Button, Input, Textarea, Checkbox } from '../data/constants.jsx'; 

// --- 1. Duplicate Resolver Modal (Companies Version) ---
const DuplicateResolverModal = ({ duplicates, onClose, onResolve }) => {
    const [selectedToDelete, setSelectedToDelete] = useState(new Set());

    const toggleSelection = (id) => {
        const newSet = new Set(selectedToDelete);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedToDelete(newSet);
    };

    const handleAutoSelect = () => {
        const newSet = new Set();
        let count = 0;

        duplicates.forEach(group => {
            // Sort by creation time (Keep the oldest)
            const sortedItems = [...group.items].sort((a, b) => {
                const timeA = a.createdAt?.seconds || 0;
                const timeB = b.createdAt?.seconds || 0;
                return timeA - timeB; 
            });

            // Keep index 0, delete the rest
            for (let i = 1; i < sortedItems.length; i++) {
                newSet.add(sortedItems[i].id);
                count++;
            }
        });

        setSelectedToDelete(newSet);
        if(count > 0) alert(`Auto-selected ${count} newer duplicates. The oldest company record was kept safe.`);
    };

    const handleResolve = () => {
        if (window.confirm(`Permanently delete ${selectedToDelete.size} selected companies?`)) {
            onResolve(Array.from(selectedToDelete));
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-30 flex justify-center items-center p-4">
            <Card className="w-full max-w-3xl max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <AlertTriangle className="text-orange-500"/> 
                        {duplicates.length} Duplicate Groups Found
                    </h3>
                    <button onClick={onClose}><X /></button>
                </div>
                
                <div className="bg-gray-50 p-3 rounded mb-4 flex justify-between items-center">
                    <p className="text-sm text-gray-600">
                        Select companies to <span className="text-red-600 font-bold">DELETE</span>. Unchecked items stay safe.
                    </p>
                    <Button onClick={handleAutoSelect} variant="secondary" className="text-sm">
                        <Wand2 size={14} className="mr-2 text-purple-600"/>
                        Auto-Select Duplicates
                    </Button>
                </div>
                
                <div className="overflow-y-auto flex-1 space-y-6 p-2">
                    {duplicates.map((group, groupIndex) => (
                        <div key={groupIndex} className="border border-orange-200 rounded-lg overflow-hidden">
                            <div className="bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-800 flex justify-between">
                                <span>Conflict: {group.key}</span>
                                <span className="text-xs uppercase tracking-wider bg-white px-2 py-0.5 rounded">Group {groupIndex + 1}</span>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {group.items.map(company => (
                                    <div key={company.id} className={`flex items-center justify-between p-3 ${selectedToDelete.has(company.id) ? 'bg-red-50' : 'bg-white'}`}>
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedToDelete.has(company.id)} 
                                                onChange={() => toggleSelection(company.id)}
                                                className="w-5 h-5 text-red-600 rounded border-gray-300 focus:ring-red-500"
                                            />
                                            <div>
                                                <p className="font-bold text-gray-800">{company.companyName}</p>
                                                <p className="text-xs text-gray-500">
                                                    {company.industry || 'No Industry'} • {company.address || 'No Address'}
                                                </p>
                                            </div>
                                        </div>
                                        {selectedToDelete.has(company.id) && <span className="text-xs font-bold text-red-600">Marked for Delete</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-4 pt-4 border-t flex justify-end gap-2">
                    <Button onClick={onClose} variant="secondary">Cancel</Button>
                    <Button onClick={handleResolve} variant="danger" disabled={selectedToDelete.size === 0}>
                        <Trash2 className="mr-2" size={16}/> Delete Selected ({selectedToDelete.size})
                    </Button>
                </div>
            </Card>
        </div>
    );
};

// --- CompanyModal (Unchanged) ---
const CompanyModal = ({ onClose, onSave, companyToEdit }) => {
    const isEditMode = Boolean(companyToEdit);
    const [companyName, setCompanyName] = useState(companyToEdit?.companyName || '');
    const [website, setWebsite] = useState(companyToEdit?.website || '');
    const [industry, setIndustry] = useState(companyToEdit?.industry || '');
    const [address, setAddress] = useState(companyToEdit?.address || '');
    const [isVerified, setIsVerified] = useState(companyToEdit?.isVerified || false);

    const handleSave = () => {
        if (!companyName) { alert('Please enter a company name.'); return; }
        onSave({ companyName, website, industry, address, isVerified });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-20 flex justify-center items-center p-4">
            <Card className="w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-bold text-gray-800">{isEditMode ? 'Edit Company' : 'New Company'}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><X /></button>
                </div>
                <div className="space-y-4">
                    <Input label="Company Name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g., Nestlé Inc." required />
                    <Input label="Website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="e.g., www.nestle.com" />
                    <Input label="Industry" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g., Food & Beverage" />
                    <Textarea label="Company Address" rows="3" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g., 123 Main St, Metro Manila" />
                    <hr />
                    <Checkbox id="isVerified" label="Data Verified (Contact details are correct)" checked={isVerified} onChange={(e) => setIsVerified(e.target.checked)} />
                </div>
                <div className="mt-6 flex justify-end">
                    <Button onClick={handleSave} variant="primary"><Plus className="mr-2" size={16} /> {isEditMode ? 'Update Company' : 'Save Company'}</Button>
                </div>
            </Card>
        </div>
    );
};

// --- CompanyCard (Unchanged) ---
const CompanyCard = ({ company, onEdit, onDelete }) => {
    return (
        <Card className="p-4 rounded-lg shadow border border-gray-200 flex flex-col justify-between">
            <div>
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                        <h4 className="font-bold text-lg text-gray-800">{company.companyName}</h4>
                        {company.isVerified && <ShieldCheck size={18} className="text-green-600" title="Verified"/>}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                        <Button onClick={() => onEdit(company)} variant="secondary" className="p-1 h-auto w-auto"><Edit size={14}/></Button>
                        <Button onClick={() => onDelete(company.id)} variant="danger" className="p-1 h-auto w-auto"><Trash2 size={14}/></Button>
                    </div>
                </div>
                {company.industry && <p className="text-sm text-gray-600">{company.industry}</p>}
            </div>
            <div className="mt-2">
                {company.address && <div className="text-sm text-gray-500 flex items-start gap-1 mt-2"><MapPin size={14} className="flex-shrink-0 mt-0.5" /><p>{company.address}</p></div>}
                {company.website && <a href={company.website.startsWith('http') ? company.website : `//${company.website}`} target="_blank" rel="noopener noreferrer" className="text-sm text-orange-600 hover:underline flex items-center gap-1 mt-2"><Globe size={14} />{company.website}</a>}
            </div>
        </Card>
    );
};

// --- Main Companies Page ---
const CompaniesPage = ({ companies, user }) => { 
    const [showModal, setShowModal] = useState(false);
    const [editingCompany, setEditingCompany] = useState(null);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef(null);
    const [searchTerm, setSearchTerm] = useState('');

    // --- Dedupe Logic ---
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [duplicateGroups, setDuplicateGroups] = useState([]);

    const handleScanForDuplicates = () => {
        const groups = {};
        companies.forEach(company => {
            // Normalize name: lowercase and trim for comparison
            const key = company.companyName.toLowerCase().trim();
            if (!groups[key]) groups[key] = [];
            groups[key].push(company);
        });

        const conflicts = Object.keys(groups)
            .filter(key => groups[key].length > 1)
            .map(key => ({ key, items: groups[key] }));

        if (conflicts.length === 0) {
            alert("No duplicate company names found!");
        } else {
            setDuplicateGroups(conflicts);
            setShowDuplicateModal(true);
        }
    };

    const handleResolveDuplicates = async (idsToDelete) => {
        if (!user || !user.uid) return;
        try {
            const batch = writeBatch(db);
            idsToDelete.forEach(id => {
                const ref = doc(db, "users", user.uid, "companies", id);
                batch.delete(ref);
            });
            await batch.commit();
            alert(`Successfully deleted ${idsToDelete.length} duplicates.`);
            setShowDuplicateModal(false);
        } catch (error) {
            console.error("Error resolving duplicates:", error);
            alert("Failed to delete duplicates.");
        }
    };

    const handleSaveCompany = async (companyData) => {
        if (!user || !user.uid) return alert("Error: User not logged in.");
        try {
            await addDoc(collection(db, "users", user.uid, "companies"), { ...companyData, createdAt: serverTimestamp() });
            handleCloseModal(); 
        } catch (e) { console.error(e); alert("Failed to save company."); }
    };

    const handleUpdateCompany = async (companyData) => {
        if (!editingCompany) return;
        try {
            await setDoc(doc(db, "users", user.uid, "companies", editingCompany.id), { ...companyData, lastModified: serverTimestamp() }, { merge: true });
            handleCloseModal(); 
        } catch (e) { console.error(e); alert("Failed to update company."); }
    };
    
    const handleDeleteCompany = async (companyId) => {
        if (window.confirm("Are you sure you want to permanently delete this company?")) {
            try { await deleteDoc(doc(db, "users", user.uid, "companies", companyId)); } catch (e) { alert("Failed to delete."); }
        }
    };

    const handleSave = (data) => editingCompany ? handleUpdateCompany(data) : handleSaveCompany(data);
    const handleOpenNewModal = () => { setEditingCompany(null); setShowModal(true); };
    const handleOpenEditModal = (c) => { setEditingCompany(c); setShowModal(true); };
    const handleCloseModal = () => { setEditingCompany(null); setShowModal(false); };
    const handleImportClick = () => fileInputRef.current.click();

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        setIsImporting(true);
        
        Papa.parse(file, {
            header: true, skipEmptyLines: true,
            complete: async (results) => {
                const rows = results.data;
                if (!rows.length || !rows[0].CompanyFinal) {
                    alert("Error: Could not find 'CompanyFinal' column in CSV.");
                    setIsImporting(false); return;
                }

                const batch = writeBatch(db);
                const companiesRef = collection(db, "users", user.uid, "companies");
                let importCount = 0;
                let duplicateCount = 0;
                
                // Existing lookup set
                const existingNames = new Set(companies.map(c => c.companyName.toLowerCase().trim()));

                rows.forEach(row => {
                    const companyName = row.CompanyFinal ? row.CompanyFinal.trim() : '';
                    if (companyName) {
                        // Skip if exists
                        if (existingNames.has(companyName.toLowerCase())) {
                            duplicateCount++;
                            return;
                        }

                        const companyData = {
                            companyName: companyName,
                            website: row.WebsiteGuess || '',
                            industry: '', address: row.Address || '', 
                            isVerified: false, createdAt: serverTimestamp()
                        };
                        batch.set(doc(companiesRef), companyData);
                        importCount++;
                    }
                });

                try {
                    await batch.commit();
                    alert(`Import Complete!\n✅ Added: ${importCount}\n🚫 Skipped (Duplicates): ${duplicateCount}`);
                } catch (error) { console.error(error); alert("Import failed."); }
                setIsImporting(false);
                event.target.value = null;
            },
            error: () => { alert("Failed to parse CSV."); setIsImporting(false); }
        });
    };

    const filteredCompanies = useMemo(() => {
        const lowerSearchTerm = searchTerm.toLowerCase();
        return companies.filter(c =>
            c.companyName.toLowerCase().startsWith(lowerSearchTerm) ||
            (c.industry && c.industry.toLowerCase().includes(lowerSearchTerm)) ||
            (c.address && c.address.toLowerCase().includes(lowerSearchTerm))
        );
    }, [companies, searchTerm]); 

    return (
        <div className="w-full">
            {showModal && <CompanyModal onSave={handleSave} onClose={handleCloseModal} companyToEdit={editingCompany} />}
            {showDuplicateModal && <DuplicateResolverModal duplicates={duplicateGroups} onClose={() => setShowDuplicateModal(false)} onResolve={handleResolveDuplicates} />}
            
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Companies ({filteredCompanies.length})</h1>
                <div className="flex gap-2">
                    {/* Dedupe Button */}
                    <Button onClick={handleScanForDuplicates} variant="secondary" title="Find duplicate companies">
                        <CheckSquare className="mr-2" size={16}/> Dedupe
                    </Button>
                    <Button onClick={handleImportClick} variant="secondary" disabled={isImporting}><Upload className="mr-2" size={16} /> {isImporting ? '...' : 'Import CSV'}</Button>
                    <Button onClick={handleOpenNewModal} variant="primary"><Plus className="mr-2" size={16} /> New Company</Button>
                </div>
            </div>

            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" style={{ display: 'none' }} />

            <div className="mb-4 relative">
                <Input type="text" placeholder="Search companies..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCompanies.sort((a, b) => a.companyName.localeCompare(b.companyName)).map(company => (
                    <CompanyCard key={company.id} company={company} onEdit={handleOpenEditModal} onDelete={handleDeleteCompany} />
                ))}
            </div>
            {companies.length === 0 && <div className="text-center py-10"><Building size={48} className="mx-auto text-gray-400"/><p>No companies found.</p></div>}
        </div>
    );
};

export default CompaniesPage;
