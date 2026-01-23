import React, { useState, useEffect } from 'react';
import { storage } from '../firebase'; // ✅ Pointing to src/firebase.js
import { ref, listAll, getDownloadURL } from "firebase/storage";
import { Printer, Search, FileText, ExternalLink, RefreshCw, AlertTriangle, Package } from 'lucide-react';
import { Button } from '../data/constants.jsx';

const DatasheetLibrary = () => {
    // 1. STATE MANAGEMENT
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // 2. FETCH DATASHEETS FROM FIREBASE STORAGE
    const fetchDocuments = async () => {
        setLoading(true);
        setErrorMsg(null);

        if (!storage) {
            setErrorMsg("Firebase Storage not initialized.");
            setLoading(false);
            return;
        }

        // ✅ UPDATED: Pointing to your new folder 'data-sheets'
        const listRef = ref(storage, 'data-sheets');

        try {
            const res = await listAll(listRef);
            
            const filePromises = res.items.map(async (itemRef) => {
                const url = await getDownloadURL(itemRef);
                return {
                    name: itemRef.name,
                    fullPath: itemRef.fullPath,
                    url: url
                };
            });

            const files = await Promise.all(filePromises);
            setDocuments(files);
        } catch (error) {
            console.error("Error fetching datasheets:", error);
            setErrorMsg(error.message); 
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    // 3. FILTERING (Search Logic)
    const filteredDocuments = documents.filter(doc => 
        doc.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // 4. OPEN PDF HANDLER
    const handleOpen = (url) => {
        window.open(url, '_blank');
    };

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden">
            <div className="flex-1 flex flex-col h-screen relative">
                
                {/* TOP HEADER */}
                <div className="bg-white border-b px-8 py-5 flex items-center justify-between shadow-sm z-10">
                    <div>
                        <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-2">
                            <Package className="text-orange-600"/> Datasheet <span className="text-orange-600">Library</span>
                        </h1>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
                            Technical Specifications & Submittals
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        {/* SEARCH BAR */}
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-3 text-gray-400"/>
                            <input 
                                type="text" 
                                placeholder="Search datasheets..." 
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)} 
                                className="pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm w-64 focus:outline-none focus:border-orange-500 transition-colors"
                            />
                        </div>

                        <Button onClick={fetchDocuments} variant="secondary" className="h-10">
                            <RefreshCw size={16} className={loading ? "animate-spin mr-2" : "mr-2"} />
                            Refresh
                        </Button>
                    </div>
                </div>

                {/* MAIN CONTENT AREA */}
                <div className="flex-1 overflow-y-auto p-8">
                    
                    {/* ERROR STATE */}
                    {errorMsg && (
                        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex items-center max-w-4xl mx-auto">
                            <AlertTriangle className="text-red-500 mr-3" size={24} />
                            <div>
                                <h3 className="font-bold text-red-800">Connection Error</h3>
                                <p className="text-sm text-red-600">{errorMsg}</p>
                            </div>
                        </div>
                    )}

                    {/* LOADING STATE */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <RefreshCw size={48} className="animate-spin mb-4 text-orange-500" />
                            <p className="font-medium">Syncing Datasheets...</p>
                        </div>
                    ) : filteredDocuments.length === 0 && !errorMsg ? (
                        <div className="text-center p-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 max-w-4xl mx-auto mt-10">
                            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                            <h3 className="text-lg font-bold text-gray-600">No Datasheets Found</h3>
                            <p className="text-gray-400 mb-4">Upload .html files to the "data-sheets" folder in Firebase Storage.</p>
                            {searchTerm && <p className="text-orange-600 text-sm">Clear your search terms to see all files.</p>}
                        </div>
                    ) : (
                        // GRID LAYOUT
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
                            {filteredDocuments.map((doc, index) => (
                                <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all group flex flex-col h-full">
                                    <div className="p-6 flex-1">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center text-orange-600">
                                                <FileText size={20} />
                                            </div>
                                            <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-1 rounded uppercase">
                                                HTML
                                            </span>
                                        </div>
                                        
                                        <h3 className="font-bold text-gray-800 mb-2 leading-tight line-clamp-2" title={doc.name}>
                                            {doc.name.replace('.html', '').replace(/_/g, ' ')}
                                        </h3>
                                        <p className="text-xs text-gray-400">Ready for print & download</p>
                                    </div>
                                    
                                    <div className="bg-gray-50 p-4 border-t border-gray-100 group-hover:bg-orange-50 transition-colors">
                                        <button 
                                            onClick={() => handleOpen(doc.url)}
                                            className="w-full flex items-center justify-center px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:text-orange-700 hover:border-orange-300 shadow-sm transition-all"
                                        >
                                            <Printer size={14} className="mr-2" />
                                            Open PDF
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DatasheetLibrary;
