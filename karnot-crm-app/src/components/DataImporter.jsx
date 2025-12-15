import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from "firebase/auth";
import Papa from 'papaparse';
import { Card, Button } from '../data/constants';
import { Upload, CheckCircle, AlertTriangle } from 'lucide-react';

const DataImporter = ({ user }) => {
    const [file, setFile] = useState(null);
    const [status, setStatus] = useState('idle'); // idle, processing, success, error
    const [message, setMessage] = useState('');
    const [importCount, setImportCount] = useState(0);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setStatus('idle');
        setMessage('');
    };

    const importData = async () => {
        if (!file) {
            setMessage('Please select a CSV file first.');
            return;
        }

        setStatus('processing');
        setMessage('Processing file...');
        setImportCount(0);
        
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) {
            setStatus('error');
            setMessage('Error: User not authenticated.');
            return;
        }

        const reader = new FileReader();
        reader.onload = async ({ target }) => {
            const csv = target.result;
            Papa.parse(csv, {
                header: true,
                skipEmptyLines: true,
                dynamicTyping: true, // Auto-converts numbers and booleans
                complete: async (results) => {
                    const data = results.data;
                    let successCount = 0;

                    for (const row of data) {
                        try {
                            // --- CRITICAL MAPPING AND DATA CLEANING ---
                            let safeId = (row.id || row.name).toString().toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_{2,}/g, '_').replace(/^_|_$/g, '');
                            if (!safeId) {
                                console.warn("Skipping row due to missing ID/Name:", row);
                                continue;
                            }

                            const productData = {
                                // REQUIRED BASE FIELDS
                                id: safeId,
                                name: row.name || 'Untitled Product',
                                category: row.category || 'Uncategorized',
                                specs: row.specs || '',
                                
                                // FINANCIAL FIELDS (Must be Numbers)
                                salesPriceUSD: parseFloat(row.salesPriceUSD) || 0,
                                costPriceUSD: parseFloat(row.costPriceUSD) || 0,

                                // --- NEW TECHNICAL SPECS MAPPING ---
                                // These must match the columns in your CSV and the fields in ProductManager.jsx
                                kW_DHW_Nominal: parseFloat(row.kW_DHW_Nominal) || 0,
                                kW_Cooling_Nominal: parseFloat(row.kW_Cooling_Nominal) || 0,
                                COP_DHW: parseFloat(row.COP_DHW) || 3.0,
                                max_temp_c: parseFloat(row.max_temp_c) || 60,
                                isReversible: row.isReversible === true || row.isReversible === 'TRUE' || row.isReversible === 'True' || false,

                                lastModified: serverTimestamp(),
                            };

                            // Save to Firebase
                            await setDoc(doc(db, "users", currentUser.uid, "products", safeId), productData, { merge: true });
                            successCount++;

                        } catch (e) {
                            console.error("Error processing row:", row, e);
                            setMessage(`Error on row: ${row.id || row.name}. Check console for details.`);
                            setStatus('error');
                            break;
                        }
                    }

                    if (status !== 'error') {
                        setImportCount(successCount);
                        setStatus('success');
                        setMessage(`${successCount} products imported successfully! Check the Product List.`);
                    }
                },
                error: (error) => {
                    setStatus('error');
                    setMessage(`CSV Parsing Error: ${error.message}`);
                    console.error("PapaParse Error:", error);
                }
            });
        };
        reader.readAsText(file);
    };

    return (
        <Card className="max-w-xl mx-auto">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-4">
                <Upload className="text-orange-600"/> Product Data Importer (CSV)
            </h3>
            <p className="text-sm text-gray-600 mb-6">
                Upload a CSV file to bulk update your product inventory.
                <br/>
                <span className="font-semibold text-orange-600">Required Column Headers:</span> `id`, `name`, `salesPriceUSD`, `kW_DHW_Nominal`, `kW_Cooling_Nominal`, `COP_DHW`, `max_temp_c`, `isReversible`.
            </p>

            <div className="flex items-center space-x-4 mb-6">
                <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="flex-1 block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
                />
                <Button onClick={importData} disabled={!file || status === 'processing'} variant="primary">
                    {status === 'processing' ? 'Processing...' : 'Start Import'}
                </Button>
            </div>

            {/* --- Status Display --- */}
            {status !== 'idle' && (
                <div className={`p-4 rounded-lg flex items-center gap-3 ${
                    status === 'success' ? 'bg-green-100 text-green-700' : 
                    status === 'error' ? 'bg-red-100 text-red-700' : 
                    'bg-yellow-100 text-yellow-700'
                }`}>
                    {status === 'success' && <CheckCircle size={20} />}
                    {status === 'error' && <AlertTriangle size={20} />}
                    {status === 'processing' && <span className="animate-spin">⏳</span>}
                    
                    <div>
                        <p className="font-semibold">{message}</p>
                        {importCount > 0 && status === 'success' && (
                            <p className="text-sm">Total products imported: {importCount}</p>
                        )}
                    </div>
                </div>
            )}
        </Card>
    );
};

export default DataImporter;
