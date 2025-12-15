// src/components/DataImporter.jsx
import React, { useState } from 'react';
import Papa from 'papaparse';
import { db } from '../firebase';
import { collection, writeBatch, doc } from "firebase/firestore";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../data/constants';

const DataImporter = ({ user, type = 'products' }) => {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });

    // 1. Handle File Selection
    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setStatus({ type: '', message: '' });
            
            // Parse immediately to preview
            Papa.parse(selectedFile, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    // Show first 5 rows as preview
                    setPreview(results.data.slice(0, 5));
                },
                error: (error) => {
                    setStatus({ type: 'error', message: 'Error reading CSV: ' + error.message });
                }
            });
        }
    };

    // 2. Upload Logic
    const handleUpload = async () => {
        if (!file || !user) return;
        setLoading(true);
        setStatus({ type: 'info', message: 'Processing...' });

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const data = results.data;
                const batch = writeBatch(db);
                const collectionName = type === 'products' ? 'products' : 'contacts';
                
                // Firestore limits batches to 500 operations. 
                // For safety, we process the first 450 items (if you have more, we can add looping logic later).
                const itemsToProcess = data.slice(0, 450); 
                let count = 0;

                itemsToProcess.forEach((item) => {
                    // Clean up data based on type
                    let cleanItem = {};

                    if (type === 'products') {
                        // Ensure numbers are actually numbers for math to work later
                        cleanItem = {
                            name: item.name || 'Unknown Product',
                            category: item.category || 'Uncategorized',
                            costPriceUSD: parseFloat(item.costPriceUSD) || 0,
                            salesPriceUSD: parseFloat(item.salesPriceUSD) || 0,
                            specs: item.specs || '',
                            id: item.id || doc(collection(db, 'users', user.uid, collectionName)).id // Generate ID if missing
                        };
                    } else {
                        // Contacts
                        cleanItem = {
                            firstName: item.firstName || '',
                            lastName: item.lastName || '',
                            email: item.email || '',
                            companyName: item.companyName || '',
                            jobTitle: item.jobTitle || '',
                            phone: item.phone || '',
                            id: item.id || doc(collection(db, 'users', user.uid, collectionName)).id
                        };
                    }

                    // Prepare the DB reference
                    // Storing under: users -> UID -> products -> PRODUCT_ID
                    const docRef = doc(db, "users", user.uid, collectionName, cleanItem.id.toString());
                    batch.set(docRef, cleanItem, { merge: true }); // merge: true means it updates existing items instead of deleting fields
                    count++;
                });

                try {
                    await batch.commit();
                    setLoading(false);
                    setStatus({ type: 'success', message: `Successfully imported ${count} ${type}!` });
                    setFile(null);
                    setPreview([]);
                } catch (error) {
                    console.error("Firebase Error:", error);
                    setLoading(false);
                    setStatus({ type: 'error', message: 'Upload failed: ' + error.message });
                }
            }
        });
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <Upload className="mr-2" size={20} /> 
                Import {type === 'products' ? 'Products' : 'Contacts'} (CSV)
            </h3>

            {/* Step 1: File Input */}
            <div className="mb-4">
                <input 
                    type="file" 
                    accept=".csv" 
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-orange-50 file:text-orange-700
                        hover:file:bg-orange-100"
                />
                <p className="text-xs text-gray-500 mt-2">
                    {type === 'products' 
                        ? 'Required Columns: id, name, category, costPriceUSD, salesPriceUSD' 
                        : 'Required Columns: firstName, lastName, email, companyName, jobTitle'}
                </p>
            </div>

            {/* Step 2: Preview */}
            {preview.length > 0 && (
                <div className="mb-4 overflow-x-auto bg-gray-50 p-2 rounded">
                    <p className="text-xs font-bold text-gray-500 mb-2">Preview (First 5 rows):</p>
                    <table className="w-full text-xs text-left">
                        <thead>
                            <tr className="border-b">
                                {Object.keys(preview[0]).map(key => <th key={key} className="p-1">{key}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {preview.map((row, i) => (
                                <tr key={i} className="border-b last:border-0">
                                    {Object.values(row).map((val, j) => <td key={j} className="p-1 truncate max-w-[100px]">{val}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Step 3: Status Messages */}
            {status.message && (
                <div className={`mb-4 p-3 rounded-md flex items-center ${status.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                    {status.type === 'error' ? <AlertCircle size={18} className="mr-2"/> : <CheckCircle size={18} className="mr-2"/>}
                    {status.message}
                </div>
            )}

            {/* Step 4: Action Button */}
            <Button 
                onClick={handleUpload} 
                disabled={!file || loading}
                className="w-full"
            >
                {loading ? 'Uploading...' : 'Upload to Database'}
            </Button>
        </div>
    );
};

export default DataImporter;
