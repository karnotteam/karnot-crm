import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, writeBatch, query, getDocs, updateDoc } from "firebase/firestore";
import Papa from 'papaparse'; 
import { Plus, Search, Edit, Trash2, X, Save, Package, Zap, BarChart3, Ruler, Plug, Upload, AlertTriangle, CheckSquare, Download, Filter } from 'lucide-react'; 
import { Card, Button, Input, Checkbox } from '../data/constants';

// ----------------------------------------------------------------------
// --- 1. Helper: Stat Badge (Unchanged) ---
// ----------------------------------------------------------------------
const StatBadge = ({ icon: Icon, label, count, total, color, active, onClick }) => {
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
        <div 
            onClick={onClick}
            className={`cursor-pointer p-3 rounded-xl border transition-all duration-200 flex items-center justify-between gap-3
                ${active ? `bg-${color}-100 border-${color}-500 ring-2 ring-${color}-400` : 'bg-white border-gray-200 hover:border-orange-300 hover:shadow-md'}
            `}
        >
            <div className={`p-2 rounded-full bg-${color}-100 text-${color}-600`}>
                <Icon size={20} />
            </div>
            <div className="text-right">
                <p className="text-xs text-gray-500 font-bold uppercase">{label}</p>
                <p className="text-xl font-bold text-gray-800">
                    {count} <span className="text-xs text-gray-400 font-normal">({percentage}%)</span>
                </p>
            </div>
        </div>
    );
};

// ----------------------------------------------------------------------
// --- 2. Helper: Duplicate Resolver Modal (Unchanged) ---
// ----------------------------------------------------------------------
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
            const sortedItems = [...group.items].sort((a, b) => {
                const priceDiff = (a.salesPriceUSD || 0) - (b.salesPriceUSD || 0);
                if (priceDiff !== 0) return priceDiff;
                const timeA = a.createdAt?.seconds || 0;
                const timeB = b.createdAt?.seconds || 0;
                return timeA - timeB; 
            });
            for (let i = 1; i < sortedItems.length; i++) {
                newSet.add(sortedItems[i].id);
                count++;
            }
        });
        setSelectedToDelete(newSet);
        if(count > 0) alert(`Auto-selected ${count} duplicates for deletion.`);
    };

    const handleResolve = () => {
        if (window.confirm(`Permanently delete ${selectedToDelete.size} selected duplicate products?`)) {
            onResolve(Array.from(selectedToDelete));
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-30 flex justify-center items-center p-4">
            <Card className="w-full max-w-3xl max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <AlertTriangle className="text-orange-500"/> 
                        {duplicates.length} Duplicate Product Groups Found
                    </h3>
                    <button onClick={onClose}><X /></button>
                </div>
                <div className="bg-gray-50 p-3 rounded mb-4 flex justify-between items-center">
                    <p className="text-sm text-gray-600">Select records to <span className="text-red-600 font-bold">DELETE</span>. Unchecked items stay safe.</p>
                    <Button onClick={handleAutoSelect} variant="secondary" className="text-sm"><CheckSquare size={14} className="mr-2 text-purple-600"/>Auto-Select Duplicates</Button>
                </div>
                <div className="overflow-y-auto flex-1 space-y-6 p-2">
                    {duplicates.map((group, groupIndex) => (
                        <div key={groupIndex} className="border border-orange-200 rounded-lg overflow-hidden">
                            <div className="bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-800 flex justify-between">
                                <span>Conflict: {group.key}</span>
                                <span className="text-xs uppercase tracking-wider bg-white px-2 py-0.5 rounded">Group {groupIndex + 1}</span>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {group.items.map(product => (
                                    <div key={product.id} className={`flex items-center justify-between p-3 ${selectedToDelete.has(product.id) ? 'bg-red-50' : 'bg-white'}`}>
                                        <div className="flex items-center gap-3">
                                            <input type="checkbox" checked={selectedToDelete.has(product.id)} onChange={() => toggleSelection(product.id)} className="w-5 h-5 text-red-600 rounded border-gray-300 focus:ring-red-500"/>
                                            <div>
                                                <p className="font-bold text-gray-800">{product.name} (${product.salesPriceUSD?.toLocaleString()})</p>
                                                <p className="text-xs text-gray-500">{product.category} • kW: {product.kW_DHW_Nominal}</p>
                                            </div>
                                        </div>
                                        {selectedToDelete.has(product.id) && <span className="text-xs font-bold text-red-600">Marked for Delete</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-4 pt-4 border-t flex justify-end gap-2">
                    <Button onClick={onClose} variant="secondary">Cancel</Button>
                    <Button onClick={handleResolve} variant="danger" disabled={selectedToDelete.size === 0}><Trash2 className="mr-2" size={16}/> Delete Selected ({selectedToDelete.size})</Button>
                </div>
            </Card>
        </div>
    );
};

// ----------------------------------------------------------------------
// --- 3. Main Product Manager Component ---
// ----------------------------------------------------------------------

const ProductManager = ({ user }) => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // CRM Feature States
    const [activeFilter, setActiveFilter] = useState('ALL'); 
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [duplicateGroups, setDuplicateGroups] = useState([]);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef(null);

    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null); 
    
    // Default form data template
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
        createdAt: null 
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

    // ----------------------------------------------------------------------
    // --- CRUD and UI Handlers (largely unchanged) ---
    // ----------------------------------------------------------------------
    
    const handleEdit = (product) => {
        setIsEditing(true);
        setEditId(product.id);
        
        // Use defaultFormData to ensure all keys exist when loading a product
        setFormData(prev => ({
            ...defaultFormData, 
            ...product,
            costPriceUSD: parseFloat(product.costPriceUSD || 0),
            salesPriceUSD: parseFloat(product.salesPriceUSD || 0),
            kW_DHW_Nominal: parseFloat(product.kW_DHW_Nominal || 0),
            kW_Cooling_Nominal: parseFloat(product.kW_Cooling_Nominal || 0),
            COP_DHW: parseFloat(product.COP_DHW || 3.8),
            max_temp_c: parseFloat(product.max_temp_c || 75),
            Rated_Power_Input: parseFloat(product.Rated_Power_Input || 0),
            SCOP_DHW_Avg: parseFloat(product.SCOP_DHW_Avg || 3.51),
            Max_Running_Current: parseFloat(product.Max_Running_Current || 0),
            Sound_Power_Level: parseFloat(product.Sound_Power_Level || 0),
            Net_Weight: parseFloat(product.Net_Weight || 0),
            Gross_Weight: parseFloat(product.Gross_Weight || 0),
            isReversible: product.isReversible !== undefined ? product.isReversible : true,
        }));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleAddNew = () => {
        setIsEditing(true);
        setEditId(null);
        setFormData({
            ...defaultFormData,
            id: `prod_${Date.now()}`,
        });
    };

    const handleSave = async () => {
        if (!formData.name || formData.salesPriceUSD === 0) {
            alert("Please provide Name and a Sales Price greater than 0.");
            return;
        }

        try {
            const safeId = formData.id.replace(/[\s/]+/g, '_').toLowerCase();
            
            const productData = {
                ...formData,
                lastModified: serverTimestamp(),
            };
            
            // Clean up state fields that shouldn't be saved as data fields
            delete productData.id; 
            delete productData.createdAt; 
            
            await setDoc(doc(db, "users", user.uid, "products", safeId), productData, { merge: true });
            
            setIsEditing(false);
            setEditId(null);
            alert("Product Saved!");
        } catch (error) {
            console.error("Error saving:", error);
            alert("Failed to save product: " + error.message);
        }
    };
    
    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this product? This cannot be undone.")) {
            try {
                await deleteDoc(doc(db, "users", user.uid, "products", id));
            } catch (error) {
                console.error("Error deleting:", error);
                alert("Failed to delete product.");
            }
        }
    };
    
    const handleInputChange = (field) => (e) => {
        const { value, checked, type } = e.target;

        if (type === 'checkbox') {
            setFormData(prev => ({ ...prev, [field]: checked }));
            return;
        }

        const isNumeric = [
            'costPriceUSD', 'salesPriceUSD', 'kW_DHW_Nominal', 'COP_DHW', 'kW_Cooling_Nominal', 
            'SCOP_DHW_Avg', 'max_temp_c', 'Rated_Power_Input', 'Max_Running_Current', 
            'Sound_Power_Level', 'Net_Weight', 'Gross_Weight'
        ].includes(field);

        let finalValue = value;
        if (isNumeric) {
            finalValue = value === '' ? 0 : parseFloat(value);
        }

        setFormData(prev => ({ ...prev, [field]: finalValue }));
    };

    const handleCancel = () => { setIsEditing(false); setEditId(null); };
    const handleSearchChange = (e) => { setSearchTerm(e.target.value); };


    // ----------------------------------------------------------------------
    // --- CRM Feature Handlers (Dedupe, Filter, Bulk Operations) ---
    // ----------------------------------------------------------------------

    const stats = useMemo(() => {
        if (!products || products.length === 0) return { total: 0, categories: {} };
        const total = products.length;
        const categories = {};
        products.forEach(p => {
            const cat = p.category || 'Uncategorized';
            categories[cat] = (categories[cat] || 0) + 1;
        });
        return { total, categories };
    }, [products]);

    const handleCategoryFilter = (category) => {
        setActiveFilter(activeFilter === category ? 'ALL' : category);
    };

    const handleScanForDuplicates = () => { 
        // ... (Dedupe logic unchanged)
        const groups = {};
        products.forEach(p => {
            const key = (p.name || '').toLowerCase().trim();
            if(!groups[key]) groups[key] = [];
            groups[key].push(p);
        });
        
        const conflicts = Object.keys(groups)
            .filter(key => groups[key].length > 1 && key !== '')
            .map(key => ({ key, items: groups[key] }));

        if(conflicts.length > 0) {
            setDuplicateGroups(conflicts);
            setShowDuplicateModal(true);
        } else {
            alert("No duplicates found based on Product Name.");
        }
    };
    
    const handleResolveDuplicates = async (idsToDelete) => { 
        if(!user) return;
        const batch = writeBatch(db);
        idsToDelete.forEach(id => {
            const ref = doc(db, "users", user.uid, "products", id);
            batch.delete(ref);
        });
        try {
            await batch.commit();
            setShowDuplicateModal(false);
            setDuplicateGroups([]);
            setSelectedIds(new Set()); 
            alert(`Resolved. Deleted ${idsToDelete.length} products.`);
        } catch(err) {
            console.error(err);
            alert("Error deleting duplicates.");
        }
    };

    const toggleSelection = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleSelectAll = () => {
        const allVisibleIds = filteredProducts.map(p => p.id);
        const allSelected = allVisibleIds.every(id => selectedIds.has(id));
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(allVisibleIds));
        }
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Permanently delete ${selectedIds.size} selected products?`)) return;
        const batch = writeBatch(db);
        selectedIds.forEach(id => {
            const ref = doc(db, "users", user.uid, "products", id);
            batch.delete(ref);
        });
        try {
            await batch.commit();
            setSelectedIds(new Set());
            alert("Products deleted.");
        } catch (error) {
            console.error(error);
            alert("Failed to delete.");
        }
    };

    const handleBulkExport = () => {
        const productsToExport = products.filter(p => selectedIds.has(p.id));
        if (productsToExport.length === 0) return alert("Select products to export.");

        const exportData = productsToExport.map(p => ({
            "System ID": p.id,
            "Product Name": p.name,
            "Category": p.category,
            "Sales Price (USD)": p.salesPriceUSD,
            "Cost Price (USD)": p.costPriceUSD,
            // Include ALL technical data for easy re-import/new product creation
            "kW_DHW_Nominal": p.kW_DHW_Nominal,
            "kW_Cooling_Nominal": p.kW_Cooling_Nominal,
            "COP_DHW": p.COP_DHW,
            "SCOP_DHW_Avg": p.SCOP_DHW_Avg,
            "Max Hot Water Temp (°C)": p.max_temp_c,
            "Refrigerant": p.Refrigerant,
            "Power Supply": p.Power_Supply,
            "Rated Power Input": p.Rated_Power_Input,
            "Max Running Current": p.Max_Running_Current,
            "Sound Power Level": p.Sound_Power_Level,
            "Outdoor Air Temp Range": p.Outdoor_Air_Temp_Range,
            "Recommended Breaker": p.Recommended_Breaker,
            "Refrigerant Charge": p.Refrigerant_Charge,
            "Rated Water Pressure": p.Rated_Water_Pressure,
            "Evaporating Temp Nominal": p.Evaporating_Temp_Nominal,
            "Ambient Temp Nominal": p.Ambient_Temp_Nominal,
            "Suction Connection": p.Suction_Connection,
            "Liquid Connection": p.Liquid_Connection,
            "Suitable Compressor": p.Suitable_Compressor,
            "Type of Oil": p.Type_of_Oil,
            "Receiver Volume": p.Receiver_Volume,
            "Fan Details": p.Fan_Details,
            "Air Flow": p.Air_Flow,
            "Certificates": p.Certificates,
            "Net Weight (kg)": p.Net_Weight,
            "Gross Weight (kg)": p.Gross_Weight,
            "Unit Dimensions": p.Unit_Dimensions,
            "Order Reference": p.Order_Reference,
            "Specs": p.specs,
        }));

        const csv = Papa.unparse(exportData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        
        link.setAttribute("href", url);
        // Ensure the downloaded CSV name indicates it's a template for import
        link.setAttribute("download", `karnot_product_import_template_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImportClick = () => {
        fileInputRef.current.click();
    };
    
    // --- UPDATED LOGIC: Handles both Update (Upsert) and Insert (New) ---
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        setIsImporting(true);
        
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const dataRows = results.data;
                const batch = writeBatch(db);
                let updatedCount = 0;
                let insertedCount = 0;
                const productsRef = collection(db, "users", user.uid, "products");
                
                // Fields to map from CSV to Firestore (key is CSV name part, value is Firestore key)
                const fieldMappings = {
                    'system id': 'id',
                    'product name': 'name',
                    'category': 'category',
                    'sales price': 'salesPriceUSD',
                    'cost price': 'costPriceUSD',
                    'kw_dhw_nominal': 'kW_DHW_Nominal',
                    'kw_cooling_nominal': 'kW_Cooling_Nominal',
                    'cop_dhw': 'COP_DHW',
                    'scop_dhw_avg': 'SCOP_DHW_Avg',
                    'max hot water temp (°c)': 'max_temp_c', // Matched full header name
                    'refrigerant': 'Refrigerant',
                    'power supply': 'Power_Supply',
                    'rated power input': 'Rated_Power_Input',
                    'max running current': 'Max_Running_Current',
                    'sound power level': 'Sound_Power_Level',
                    'outdoor air temp range': 'Outdoor_Air_Temp_Range',
                    'recommended breaker': 'Recommended_Breaker',
                    'refrigerant charge': 'Refrigerant_Charge',
                    'rated water pressure': 'Rated_Water_Pressure',
                    'evaporating temp nominal': 'Evaporating_Temp_Nominal',
                    'ambient temp nominal': 'Ambient_Temp_Nominal',
                    'suction connection': 'Suction_Connection',
                    'liquid connection': 'Liquid_Connection',
                    'suitable compressor': 'Suitable_Compressor',
                    'type of oil': 'Type_of_Oil',
                    'receiver volume': 'Receiver_Volume',
                    'fan details': 'Fan_Details',
                    'air flow': 'Air_Flow',
                    'certificates': 'Certificates',
                    'net weight (kg)': 'Net_Weight', // Matched full header name
                    'gross weight (kg)': 'Gross_Weight', // Matched full header name
                    'unit dimensions': 'Unit_Dimensions',
                    'order reference': 'Order_Reference',
                    'specs': 'specs',
                };
                
                const numericFields = ['salesPriceUSD', 'costPriceUSD', 'kW_DHW_Nominal', 'kW_Cooling_Nominal', 'COP
