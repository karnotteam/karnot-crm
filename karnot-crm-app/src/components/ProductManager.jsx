import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import Papa from 'papaparse'; 
import { Plus, Search, Edit, Trash2, X, Save, Package, Zap, BarChart3, Ruler, Plug, Upload, AlertTriangle, CheckSquare, Download, Filter, Sun, Thermometer, Box } from 'lucide-react'; 
import { Card, Button, Input, Checkbox } from '../data/constants';

// --- Default Category Icons and Colors for Stat Badges ---
const CATEGORY_MAP = {
    'Heat Pump': { icon: Thermometer, color: 'orange' },
    'iSTOR systems': { icon: Package, color: 'teal' }, 
    'iSPA': { icon: Sun, color: 'blue' }, 
    'iMESH': { icon: Box, color: 'purple' }, 
    'Other Products Miscellaneous': { icon: Filter, color: 'pink' }, 
    'Uncategorized': { icon: Package, color: 'gray' },
};

// ----------------------------------------------------------------------
// --- 1. Helper: Stat Badge ---
// ----------------------------------------------------------------------
const StatBadge = ({ label, count, total, color, active, onClick, icon: Icon }) => {
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0; 
    return (
        <div 
            onClick={onClick}
            className={`cursor-pointer p-3 rounded-xl border transition-all duration-200 flex items-center justify-between gap-3 min-w-[180px]
                ${active ? `bg-${color}-100 border-${color}-500 ring-2 ring-${color}-400` : 'bg-white border-gray-200 hover:border-orange-300 hover:shadow-md'}
            `}
        >
            <div className={`p-2 rounded-full bg-${color}-100 text-${color}-600`}>
                <Icon size={20} />
            </div>
            <div className="text-right">
                <p className="text-xs text-gray-500 font-bold uppercase truncate max-w-[100px]">{label}</p>
                <p className="text-xl font-bold text-gray-800">
                    {count} <span className="text-xs text-gray-400 font-normal">({percentage}%)</span>
                </p>
            </div>
        </div>
    );
};

// ----------------------------------------------------------------------
// --- 2. Helper: Duplicate Resolver Modal ---
// ----------------------------------------------------------------------
const DuplicateResolverModal = ({ duplicates, onClose, onResolve }) => {
    const [selectedToDelete, setSelectedToDelete] = useState(new Set());
    const toggleSelection = (id) => {
        const newSet = new Set(selectedToDelete);
        if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
        setSelectedToDelete(newSet);
    };

    const handleAutoSelect = () => {
        const newSet = new Set();
        duplicates.forEach(group => {
            const sortedItems = [...group.items].sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
            for (let i = 1; i < sortedItems.length; i++) { newSet.add(sortedItems[i].id); }
        });
        setSelectedToDelete(newSet);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <Card className="w-full max-w-3xl max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><AlertTriangle className="text-orange-500"/> {duplicates.length} Duplicate Groups</h3>
                    <button onClick={onClose}><X /></button>
                </div>
                <div className="overflow-y-auto flex-1 space-y-4 p-2">
                    {duplicates.map((group, idx) => (
                        <div key={idx} className="border border-orange-200 rounded-lg overflow-hidden">
                            <div className="bg-orange-50 px-4 py-1 text-xs font-bold text-orange-800">NAME: {group.key}</div>
                            {group.items.map(p => (
                                <div key={p.id} className="flex items-center justify-between p-3 border-t">
                                    <div className="flex items-center gap-3">
                                        <input type="checkbox" checked={selectedToDelete.has(p.id)} onChange={() => toggleSelection(p.id)} />
                                        <span className="text-sm">{p.name} - {p.category}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
                <div className="mt-4 pt-4 border-t flex justify-end gap-2">
                    <Button onClick={handleAutoSelect} variant="secondary">Auto-Select Newest</Button>
                    <Button onClick={() => onResolve(Array.from(selectedToDelete))} variant="danger">Delete Selected</Button>
                </div>
            </Card>
        </div>
    );
};

// ----------------------------------------------------------------------
// --- 3. Main Component ---
// ----------------------------------------------------------------------
const ProductManager = ({ user }) => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('ALL');
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [duplicateGroups, setDuplicateGroups] = useState([]);
    const [isImporting, setIsImporting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    const fileInputRef = useRef(null);

    const defaultFormData = {
        id: '', name: '', category: 'Heat Pump', costPriceUSD: 0, salesPriceUSD: 0, specs: '',
        kW_DHW_Nominal: 0, COP_DHW: 3.8, kW_Cooling_Nominal: 0, Cooling_EER_Range: '', 
        SCOP_DHW_Avg: 3.51, Rated_Power_Input: 0, Max_Running_Current: 0, Sound_Power_Level: 0, 
        Outdoor_Air_Temp_Range: '', Power_Supply: '380/420 V-50/60 Hz-3 ph', Recommended_Breaker: '',
        Refrigerant: 'R290', Refrigerant_Charge: '150g', Rated_Water_Pressure: '0.7 MPa', 
        Evaporating_Temp_Nominal: '', Ambient_Temp_Nominal: '', Suction_Connection: '', 
        Liquid_Connection: '', Suitable_Compressor: '', Type_of_Oil: '', Receiver_Volume: '', 
        Fan_Details: '', Air_Flow: '', Certificates: '', max_temp_c: 75, isReversible: true,
        Unit_Dimensions: '', Net_Weight: 0, Gross_Weight: 0, Order_Reference: '',
    };
    const [formData, setFormData] = useState(defaultFormData);

    useEffect(() => {
        if (!user) return;
        const unsub = onSnapshot(collection(db, "users", user.uid, "products"), (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            list.sort((a, b) => (a.category || '').localeCompare(b.category || '') || (a.name || '').localeCompare(b.name || ''));
            setProducts(list);
            setLoading(false);
        });
        return () => unsub();
    }, [user]);

    // --- Stats calculation ---
    const stats = useMemo(() => {
        const categories = {};
        products.forEach(p => {
            const cat = p.category || 'Uncategorized';
            categories[cat] = (categories[cat] || 0) + 1;
        });
        return { total: products.length, categories };
    }, [products]);

    // --- CSV IMPORT LOGIC (Upsert: Update or Add New) ---
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        setIsImporting(true);
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const batch = writeBatch(db);
                results.data.forEach(row => {
                    const csvName = (row['Product Name'] || row['name'] || '').trim();
                    const csvId = (row['System ID'] || row['id'] || '').trim();
                    if (!csvName) return;

                    const docId = csvId || csvName.replace(/[\s/]+/g, '_').toLowerCase();
                    const productRef = doc(db, "users", user.uid, "products", docId);
                    
                    const cleanData = { ...defaultFormData };
                    Object.keys(row).forEach(key => {
                        const dbKey = Object.keys(defaultFormData).find(k => k.toLowerCase() === key.toLowerCase().replace(/\s/g, ''));
                        if (dbKey) {
                            const isNum = typeof defaultFormData[dbKey] === 'number';
                            cleanData[dbKey] = isNum ? (parseFloat(row[key]) || 0) : row[key];
                        }
                    });

                    batch.set(productRef, { ...cleanData, lastModified: serverTimestamp() }, { merge: true });
                });
                await batch.commit();
                setIsImporting(false);
                alert("Import Success!");
            }
        });
    };

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchSearch = (p.name + p.category + p.Order_Reference).toLowerCase().includes(searchTerm.toLowerCase());
            const matchCat = activeFilter === 'ALL' || p.category === activeFilter;
            return matchSearch && matchCat;
        });
    }, [products, searchTerm, activeFilter]);

    const handleSelectAll = () => {
        if (selectedIds.size === filteredProducts.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(filteredProducts.map(p => p.id)));
    };

    const handleBulkExport = () => {
        const data = products.filter(p => selectedIds.has(p.id));
        const csv = Papa.unparse(data);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "products_export.csv";
        a.click();
    };

    if (loading) return <div className="p-10 text-center">Loading Database...</div>;

    return (
        <div className="w-full pb-20">
            {showDuplicateModal && (
                <DuplicateResolverModal 
                    duplicates={duplicateGroups} 
                    onClose={() => setShowDuplicateModal(false)} 
                    onResolve={handleResolveDuplicates} 
                />
            )}

            {/* --- TOP CATEGORY BADGES --- */}
            <div className="flex flex-row gap-4 mb-8 overflow-x-auto pb-4 no-scrollbar">
                <StatBadge icon={Package} label="All" count={stats.total} total={stats.total} color="gray" active={activeFilter === 'ALL'} onClick={() => setActiveFilter('ALL')} />
                {Object.keys(CATEGORY_MAP).filter(c => c !== 'Uncategorized').map(cat => (
                    <StatBadge 
                        key={cat}
                        icon={CATEGORY_MAP[cat].icon}
                        label={cat}
                        count={stats.categories[cat] || 0}
                        total={stats.total}
                        color={CATEGORY_MAP[cat].color}
                        active={activeFilter === cat}
                        onClick={() => setActiveFilter(cat)}
                    />
                ))}
            </div>

            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                    <Filter size={20} className="text-orange-500"/> {activeFilter} <span className="text-sm font-normal text-gray-400">({filteredProducts.length})</span>
                </h3>
                <div className="flex gap-2">
                    <Button onClick={handleImportClick} variant="secondary"><Upload size={16} className="mr-2"/> Import CSV</Button>
                    <Button onClick={handleAddNew} variant="primary"><Plus size={16} className="mr-2"/> New Product</Button>
                </div>
            </div>

            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".csv" />

            {/* --- SEARCH --- */}
            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                    placeholder="Search by name, category or SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* --- EDITOR (Only shows when editing/new) --- */}
            {isEditing && (
                <Card className="mb-10 border-2 border-orange-200 bg-orange-50/30 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="text-lg font-bold">{editId ? 'Edit Product' : 'New Product'}</h4>
                        <button onClick={handleCancel}><X /></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input label="Product Name" value={formData.name} onChange={handleInputChange('name')} />
                        <Input label="Category" value={formData.category} onChange={handleInputChange('category')} />
                        <Input label="Sales Price (USD)" type="number" value={formData.salesPriceUSD} onChange={handleInputChange('salesPriceUSD')} />
                    </div>
                    {/* ... Rest of your inputs ... */}
                    <div className="flex justify-end gap-2 mt-6">
                        <Button onClick={handleCancel} variant="secondary">Cancel</Button>
                        <Button onClick={handleSave} variant="primary"><Save size={16} className="mr-2"/> Save Product</Button>
                    </div>
                </Card>
            )}

            {/* --- TABLE --- */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="p-4 w-10"><input type="checkbox" onChange={handleSelectAll} checked={selectedIds.size === filteredProducts.length && filteredProducts.length > 0} /></th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">Product Details</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Price</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.map(p => (
                            <tr key={p.id} className={`border-b border-gray-50 hover:bg-orange-50/30 transition-colors ${selectedIds.has(p.id) ? 'bg-orange-50/50' : ''}`}>
                                <td className="p-4"><input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelection(p.id)} /></td>
                                <td className="p-4">
                                    <div className="font-bold text-gray-900">{p.name}</div>
                                    <div className="text-xs text-gray-400">{p.category} | SKU: {p.Order_Reference || 'N/A'}</div>
                                </td>
                                <td className="p-4 text-right font-bold text-orange-600">${p.salesPriceUSD?.toLocaleString()}</td>
                                <td className="p-4 text-center">
                                    <button onClick={() => handleEdit(p)} className="p-2 hover:bg-white rounded-lg transition-colors text-blue-600"><Edit size={16}/></button>
                                    <button onClick={() => handleDelete(p.id)} className="p-2 hover:bg-white rounded-lg transition-colors text-red-600"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* --- BULK ACTIONS BAR --- */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 z-50">
                    <span className="text-sm font-bold">{selectedIds.size} Selected</span>
                    <button onClick={handleBulkExport} className="flex items-center gap-2 text-green-400 hover:text-green-300 font-bold text-sm"><Download size={18}/> Export CSV</button>
                    <button onClick={handleBulkDelete} className="flex items-center gap-2 text-red-400 hover:text-red-300 font-bold text-sm"><Trash2 size={18}/> Delete All</button>
                    <button onClick={() => setSelectedIds(new Set())} className="text-gray-400 hover:text-white"><X size={18}/></button>
                </div>
            )}
        </div>
    );
};

export default ProductManager;
