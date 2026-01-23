import React, { useState, useEffect } from 'react';
import { storage } from '../firebase'; // Adjust path if your firebase.js is in src/
import { ref, listAll, getDownloadURL, getMetadata } from "firebase/storage";
import { FileText, Download, ExternalLink, Loader, RefreshCw } from 'lucide-react';
import { Button } from '../data/constants'; // Adjust path to your constants

export default function DocumentsPage() {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);

    // This function fetches the file list from your "deck-templates" folder
    const fetchDocuments = async () => {
        setLoading(true);
        const listRef = ref(storage, 'deck-templates');

        try {
            const res = await listAll(listRef);
            
            const filePromises = res.items.map(async (itemRef) => {
                const url = await getDownloadURL(itemRef);
                const metadata = await getMetadata(itemRef);
                return {
                    name: itemRef.name,
                    fullPath: itemRef.fullPath,
                    url: url,
                    updated: new Date(metadata.updated).toLocaleDateString(),
                    size: (metadata.size / 1024).toFixed(2) + ' KB'
                };
            });

            const files = await Promise.all(filePromises);
            setDocuments(files);
        } catch (error) {
            console.error("Error fetching documents:", error);
            alert("Could not load documents. Check your internet or Firebase permissions.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    // Helper to open the file in a new tab for "Print to PDF"
    const handleOpen = (url) => {
        window.open(url, '_blank');
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-3xl font-black text-gray-800 uppercase tracking-tight">
                        Investor <span className="text-orange-600">Documents</span>
                    </h1>
                    <p className="text-gray-500 font-medium mt-1">
                        Manage and generate PDFs from your HTML templates.
                    </p>
                </div>
                <Button onClick={fetchDocuments} variant="secondary">
                    <RefreshCw size={16} className={loading ? "animate-spin mr-2" : "mr-2"} />
                    Refresh List
                </Button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                    <Loader size={48} className="animate-spin mb-4 text-orange-500" />
                    <p>Syncing with Firebase Storage...</p>
                </div>
            ) : documents.length === 0 ? (
                <div className="text-center p-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-bold text-gray-600">No Templates Found</h3>
                    <p className="text-gray-400">Upload .html files to the "deck-templates" folder in Firebase Storage.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {documents.map((doc, index) => (
                        <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                            <div className="p-6 flex-1">
                                <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center mb-4">
                                    <FileText className="text-orange-600" size={24} />
                                </div>
                                <h3 className="font-bold text-lg text-gray-800 mb-2 truncate" title={doc.name}>
                                    {doc.name.replace('.html', '').replace(/_/g, ' ')}
                                </h3>
                                <div className="text-xs text-gray-400 space-y-1">
                                    <p>Updated: {doc.updated}</p>
                                    <p>Size: {doc.size}</p>
                                </div>
                            </div>
                            
                            <div className="bg-gray-50 p-4 border-t border-gray-100 grid grid-cols-2 gap-3">
                                <button 
                                    onClick={() => handleOpen(doc.url)}
                                    className="col-span-2 flex items-center justify-center px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 transition-colors"
                                >
                                    <ExternalLink size={16} className="mr-2" />
                                    Open & Print PDF
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
