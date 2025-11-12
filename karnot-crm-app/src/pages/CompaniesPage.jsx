import React, { useState, useRef } from 'react'; // --- 1. IMPORT 'useRef' ---
import { db } from '../firebase'; 
import { collection, addDoc, serverTimestamp, doc, setDoc, deleteDoc, writeBatch } from "firebase/firestore"; // --- 2. IMPORT 'writeBatch' ---
import { Plus, X, Edit, Trash2, Building, Globe, Upload } from 'lucide-react'; // --- 3. IMPORT 'Upload' ---
import { Card, Button, Input } from '../data/constants.jsx'; 

// --- (CompanyModal and CompanyCard components are unchanged) ---
const CompanyModal = ({ onClose, onSave, companyToEdit }) => {
    const isEditMode = Boolean(companyToEdit);
    const [companyName, setCompanyName] = useState(companyToEdit?.companyName || '');
    const [website, setWebsite] = useState(companyToEdit?.website || '');
    const [industry, setIndustry] = useState(companyToEdit?.industry || '');

    const handleSave = () => {
        if (!companyName) {
            alert('Please enter a company name.');
            return;
        }
        const companyData = {
            companyName,
            website,
            industry,
        };
        onSave(companyData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-20 flex justify-center items-center p-4">
            <Card className="w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-bold text-gray-800">
                        {isEditMode ? 'Edit Company' : 'New Company'}
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><X /></button>
                </div>
                <div className="space-y-4">
                    <Input label="Company Name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g., Nestlé Inc." required />
                    <Input label="Website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="e.g., www.nestle.com" />
                    <Input label="Industry" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g., Food & Beverage" />
                </div>
                <div className="mt-6 flex justify-end">
                    <Button onClick={handleSave} variant="primary">
                        <Plus className="mr-2" size={16} /> 
                        {isEditMode ? 'Update Company' : 'Save Company'}
                    </Button>
                </div>
            </Card>
        </div>
    );
};

const CompanyCard = ({ company, onEdit, onDelete }) => {
    return (
        <Card className="p-4 rounded-lg shadow border border-gray-200">
            <div className="flex justify-between items-start">
                <h4 className="font-bold text-lg text-gray-800">{company.companyName}</h4>
                <div className="flex gap-1">
                    <Button 
                        onClick={() => onEdit(company)} 
                        variant="secondary" 
                        className="p-1 h-auto w-auto"
                    >
                        <Edit size={14}/>
                    </Button>
                    <Button 
                        onClick={() => onDelete(company.id)} 
                        variant="danger" 
                        className="p-1 h-auto w-auto"
                    >
                        <Trash2 size={14}/>
                    </Button>
                </div>
            </div>
            {company.industry && (
                <p className="text-sm text-gray-600">{company.industry}</p>
            )}
            {company.website && (
                <a href={company.website.startsWith('http') ? company.website : `//${company.website}`} target="_blank" rel="noopener noreferrer" className="text-sm text-orange-600 hover:underline flex items-center gap-1 mt-2">
                    <Globe size={14} />
                    {company.website}
                </a>
            )}
        </Card>
    );
};


// --- Main Companies Page Component ---
const CompaniesPage = ({ companies, user }) => { 
    const [showModal, setShowModal] = useState(false);
    const [editingCompany, setEditingCompany] = useState(null);
    
    // --- 4. ADD STATE for importing and a ref for the file input ---
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef(null);
    
    // --- (Your existing save, update, delete, and modal functions) ---
    const handleSaveCompany = async (companyData) => {
        if (!user || !user.uid) return alert("Error: User not logged in.");
        try {
            const newCompany = { ...companyData, createdAt: serverTimestamp() };
            await addDoc(collection(db, "users", user.uid, "companies"), newCompany);
            handleCloseModal(); 
        } catch (e) {
            console.error("Error adding document: ", e);
            alert("Failed to save company.");
        }
    };

    const handleUpdateCompany = async (companyData) => {
        if (!editingCompany || !editingCompany.id) return;
        if (!user || !user.uid) return alert("Error: User not logged in.");

        const companyRef = doc(db, "users", user.uid, "companies", editingCompany.id);
        try {
            await setDoc(companyRef, { ...companyData, lastModified: serverTimestamp() }, { merge: true });
            handleCloseModal(); 
        } catch (e) {
            console.error("Error updating document: ", e);
            alert("Failed to update company.");
        }
    };
    
    const handleDeleteCompany = async (companyId) => {
        if (!user || !user.uid) return alert("Error: User not logged in.");
        if (window.confirm("Are you sure you want to permanently delete this company?")) {
            const companyRef = doc(db, "users", user.uid, "companies", companyId);
            try {
                await deleteDoc(companyRef);
            } catch (error) {
                console.error("Error deleting company: ", error);
                alert("Failed to delete company.");
            }
        }
    };

    const handleSave = (companyData) => {
        if (editingCompany) {
            handleUpdateCompany(companyData);
        } else {
            handleSaveCompany(companyData);
        }
    };

    const handleOpenNewModal = () => {
        setEditingCompany(null);
        setShowModal(true);
    };

    const handleOpenEditModal = (company) => {
        setEditingCompany(company);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setEditingCompany(null);
        setShowModal(false);
    };

    // --- 5. ADD NEW FUNCTIONS for CSV IMPORT ---
    
    // This function triggers the hidden file input
    const handleImportClick = () => {
        fileInputRef.current.click();
    };

    // This function runs when a file is selected
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (!file) {
            return;
        }

        setIsImporting(true);
        
        // Use PapaParse (from index.html) to read the file
        // Note: 'Papa' is available globally because we added it in index.html
        Papa.parse(file, {
            header: true, // This tells PapaParse to use the first row as object keys
            skipEmptyLines: true,
            complete: async (results) => {
                const rows = results.data;
                console.log("Parsed rows:", rows);

                // This checks your 'companies_consolidated.csv' file
                if (!rows.length || !rows[0].CompanyFinal) {
                    alert("Error: Could not find 'CompanyFinal' column in CSV. Please check the file.");
                    setIsImporting(false);
                    return;
                }

                // Use a "batch" to upload all companies at once
                const batch = writeBatch(db);
                const companiesRef = collection(db, "users", user.uid, "companies");
                let importCount = 0;

                rows.forEach(row => {
                    // Make sure the company name exists
                    const companyName = row.CompanyFinal ? row.CompanyFinal.trim() : '';
                    if (companyName) {
                        const companyData = {
                            companyName: companyName,
                            website: row.WebsiteGuess || '',
                            industry: '', // You can add this field to your CSV later
                            createdAt: serverTimestamp()
                        };
                        
                        // Create a new document reference and add it to the batch
                        const docRef = doc(companiesRef); 
                        batch.set(docRef, companyData);
                        importCount++;
                    }
                });

                // Commit the batch
                try {
                    await batch.commit();
                    alert(`Successfully imported ${importCount} companies!`);
                } catch (error) {
                    console.error("Error importing companies: ", error);
                    alert("An error occurred during import. See console for details.");
                }

                setIsImporting(false);
                // Reset file input
                event.target.value = null;
            },
            error: (error) => {
                console.error("PapaParse error:", error);
                alert("Failed to parse CSV file.");
                setIsImporting(false);
            }
        });
    };

    return (
        <div className="w-full">
            {showModal && (
                <CompanyModal 
                    onSave={handleSave} 
                    onClose={handleCloseModal}
                    companyToEdit={editingCompany} 
                />
            )}
            
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Companies ({companies.length})</h1>
                <div className="flex gap-2">
                    {/* --- 6. ADD THE "IMPORT CSV" BUTTON --- */}
                    <Button 
                        onClick={handleImportClick} 
                        variant="secondary"
                        disabled={isImporting}
                    >
                        <Upload className="mr-2" size={16} />
                        {isImporting ? 'Importing...' : 'Import CSV'}
                    </Button>
                    <Button 
                        onClick={handleOpenNewModal} 
                        variant="primary"
                        disabled={isImporting}
                    >
                        <Plus className="mr-2" size={16} /> New Company
                    </Button>
                </div>
            </div>

            {/* --- 7. ADD THE HIDDEN FILE INPUT --- */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv"
                style={{ display: 'none' }}
            />

            {/* (Your existing grid code... no changes) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {companies
                    .sort((a, b) => a.companyName.localeCompare(b.companyName))
                    .map(company => (
                        <CompanyCard 
                            key={company.id} 
                            company={company} 
                            onEdit={handleOpenEditModal}
                            onDelete={handleDeleteCompany}
                        />
                    ))
                }
            </div>
            
            {companies.length === 0 && (
                <div className="text-center py-10 bg-white rounded-lg shadow">
                    <Building size={48} className="mx-auto text-gray-400" />
                    <h3 className="mt-2 text-lg font-semibold text-gray-700">No companies found.</h3>
                    <p className="mt-1 text-sm text-gray-500">Click "New Company" or "Import CSV" to add your first one.</p>
                </div>
            )}
        </div>
    );
};

export default CompaniesPage;
