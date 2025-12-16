import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import Papa from 'papaparse'; 
import { Plus, Search, Edit, Trash2, X, Save, Package, Zap, BarChart3, Ruler, Plug, Upload, AlertTriangle, CheckSquare, Download, Filter, Sun, Thermometer, Box } from 'lucide-react'; 
import { Card, Button, Input, Checkbox, Textarea } from '../data/constants';

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
// --- 2. Helper: Duplicate Resolver Modal ---
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
    // --- CRUD and UI Handlers ---
    // ----------------------------------------------------------------------
    
    const handleEdit = (product) => {
        setIsEditing(true);
        setEditId(product.id);
        
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
            
            if (!editId) {
                productData.createdAt = serverTimestamp();
            }

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

    // --- CORRECTED EXPORT FUNCTION (Headers simplified for import compatibility) ---
    const handleBulkExport = () => {
        const productsToExport = products.filter(p => selectedIds.has(p.id));
        if (productsToExport.length === 0) return alert("Select products to export.");

        const exportData = productsToExport.map(p => ({
            "System ID": p.id,
            "Product Name": p.name,
            "Category": p.category,
            "Sales Price": p.salesPriceUSD,      
            "Cost Price": p.costPriceUSD,        
            "kW_DHW_Nominal": p.kW_DHW_Nominal,
            "kW_Cooling_Nominal": p.kW_Cooling_Nominal,
            "COP_DHW": p.COP_DHW,
            "SCOP_DHW_Avg": p.SCOP_DHW_Avg,
            "Max Temp": p.max_temp_c,            
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
            "Net Weight": p.Net_Weight,          
            "Gross Weight": p.Gross_Weight,      
            "Unit Dimensions": p.Unit_Dimensions,
            "Order Reference": p.Order_Reference,
            "Specs": p.specs,
        }));

        const csv = Papa.unparse(exportData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        
        link.setAttribute("href", url);
        link.setAttribute("download", `karnot_products_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImportClick = () => {
        fileInputRef.current.click();
    };
    
    // --- CSV Update/Insert Logic (handleFileChange) ---
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
                let notFoundCount = 0;
                const productsRef = collection(db, "users", user.uid, "products");
                
                const fieldMappings = {
                    'system id': 'id', 'product name': 'name', 'category': 'category', 'sales price': 'salesPriceUSD', 
                    'cost price': 'costPriceUSD', 'kw_dhw_nominal': 'kW_DHW_Nominal', 'kw_cooling_nominal': 'kW_Cooling_Nominal',
                    'cop_dhw': 'COP_DHW', 'scop_dhw_avg': 'SCOP_DHW_Avg', 'max temp': 'max_temp_c',
                    'refrigerant': 'Refrigerant', 'power supply': 'Power_Supply', 'rated power input': 'Rated_Power_Input', 
                    'max running current': 'Max_Running_Current', 'sound power level': 'Sound_Power_Level', 
                    'outdoor air temp range': 'Outdoor_Air_Temp_Range', 'recommended breaker': 'Recommended_Breaker', 
                    'refrigerant charge': 'Refrigerant_Charge', 'rated water pressure': 'Rated_Water_Pressure', 
                    'evaporating temp nominal': 'Evaporating_Temp_Nominal', 'ambient temp nominal': 'Ambient_Temp_Nominal', 
                    'suction connection': 'Suction_Connection', 'liquid connection': 'Liquid_Connection', 
                    'suitable compressor': 'Suitable_Compressor', 'type of oil': 'Type_of_Oil', 
                    'receiver volume': 'Receiver_Volume', 'fan details': 'Fan_Details', 'air flow': 'Air_Flow', 
                    'certificates': 'Certificates', 'net weight': 'Net_Weight', 'gross weight': 'Gross_Weight', 
                    'unit dimensions': 'Unit_Dimensions', 'order reference': 'Order_Reference', 'specs': 'specs',
                };
                
                const numericFields = ['salesPriceUSD', 'costPriceUSD', 'kW_DHW_Nominal', 'kW_Cooling_Nominal', 'COP_DHW', 'SCOP_DHW_Avg', 'max_temp_c', 'Rated_Power_Input', 'Max_Running_Current', 'Sound_Power_Level', 'Net_Weight', 'Gross_Weight'];

                dataRows.forEach(row => {
                    const csvSystemId = (row['System ID'] || row['id'])?.trim();
                    const csvProductName = (row['Product Name'] || row['name'])?.trim();
                    
                    if (!csvSystemId && !csvProductName) return;

                    const match = products.find(p => p.id === csvSystemId) || products.find(p => p.name?.toLowerCase() === csvProductName?.toLowerCase());
                    
                    if (match) {
                        const ref = doc(productsRef, match.id);
                        const updateData = { lastModified: serverTimestamp() };
                        
                        Object.keys(row).forEach(csvHeader => {
                            const normalizedHeader = csvHeader.toLowerCase().trim();
                            const firestoreKey = fieldMappings[normalizedHeader];
                            
                            if (firestoreKey && row[csvHeader] !== undefined && row[csvHeader] !== null) {
                                let value = row[csvHeader];
                                
                                if (numericFields.includes(firestoreKey)) {
                                    let parsedValue = parseFloat(value);
                                    if (!isNaN(parsedValue)) {
                                        updateData[firestoreKey] = parsedValue;
                                    }
                                } else if (value.trim() !== '') {
                                    updateData[firestoreKey] = value;
                                }
                            }
                        });

                        if (Object.keys(updateData).length > 1) {
                            batch.update(ref, updateData);
                            updatedCount++;
                        }
                    } else {
                        notFoundCount++;
                    }
                });

                try {
                    await batch.commit();
                    alert(`Price/Spec Update Complete!\n✅ Updated: ${updatedCount} products.\n🚫 Not Found (Skipped): ${notFoundCount} rows.`);
                } catch (error) {
                    console.error("Update Error:", error);
                    alert("Failed to update products from CSV.");
                }
                setIsImporting(false);
                event.target.value = null;
            },
            error: () => { alert("Failed to parse CSV."); setIsImporting(false); }
        });
    };
    
    // ----------------------------------------------------------------------
    // --- Filtered Products Logic ---
    // ----------------------------------------------------------------------

    const filteredProducts = useMemo(() => {
        const lowerSearchTerm = (searchTerm || '').toLowerCase();
        let list = products || [];

        if (activeFilter !== 'ALL') {
            list = list.filter(p => p.category === activeFilter);
        }

        return list.filter(p => 
            (p.name || '').toLowerCase().includes(lowerSearchTerm) || 
            (p.category || '').toLowerCase().includes(lowerSearchTerm) ||
            (p.Order_Reference || '').toLowerCase().includes(lowerSearchTerm)
        );
    }, [products, searchTerm, activeFilter]);


    if (loading) return <div className="p-4 text-center">Loading Products...</div>;

    const categoriesToShow = useMemo(() => {
        const productCategories = Object.keys(stats.categories).filter(c => c !== 'Uncategorized').sort();
        const predefinedCategories = Object.keys(CATEGORY_MAP).filter(c => c !== 'Uncategorized');
        
        const combined = new Set([...predefinedCategories, ...productCategories]);
        return Array.from(combined).sort();
    }, [stats.categories]);


    return (
        <div className="w-full pb-20"> 
            {showDuplicateModal && <DuplicateResolverModal duplicates={duplicateGroups} onClose={() => setShowDuplicateModal(false)} onResolve={handleResolveDuplicates} />}

            {/* --- STAT BADGES / CATEGORY FILTER --- */}
            <div className="flex flex-row gap-4 mb-8 overflow-x-auto pb-3">
                <StatBadge 
                    icon={Package} 
                    label="All Products" 
                    count={stats.total} 
                    total={stats.total} 
                    color="gray" 
                    active={activeFilter === 'ALL'} 
                    onClick={() => handleCategoryFilter('ALL')} 
                />
                
                {/* FIX: Robustly render dynamic category badges, filtering out null/undefined categories */}
                {categoriesToShow
                    .filter(cat => cat)
                    .map((cat, index) => {
                    const map = CATEGORY_MAP[cat] || CATEGORY_MAP['Uncategorized'];
                    const dynamicColor = map.color || ['orange', 'blue', 'green', 'purple'][index % 4];

                    return (
                        <div key={cat} className="flex-shrink-0 w-[220px] md:w-auto">
                            <StatBadge 
                                icon={map.icon} 
                                label={cat} 
                                count={stats.categories[cat] || 0} 
                                total={stats.total} 
                                color={dynamicColor} 
                                active={activeFilter === cat} 
                                onClick={() => handleCategoryFilter(cat)} 
                            />
                        </div>
                    );
                })}
            </div>
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-2">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    {activeFilter !== 'ALL' && <Filter size={20} className="text-orange-600"/>}
                    {activeFilter === 'ALL' ? 'All Products' : `${activeFilter} Products`} 
                    <span className="text-gray-400 font-normal text-base ml-2">({filteredProducts.length})</span>
                </h3>
                
                <div className="flex gap-2 flex-wrap justify-end w-full md:w-auto">
                    <Button onClick={handleImportClick} variant="secondary" disabled={isImporting}><Upload className="mr-2" size={16} /> Update via CSV</Button>
                    <Button onClick={handleScanForDuplicates} variant="secondary" title="Find duplicate products"><CheckSquare className="mr-2" size={16}/> Dedupe</Button>
                    {!isEditing && (
                        <Button onClick={handleAddNew} variant="primary">
                            <Plus size={16} className="mr-2"/> Add New Product
                        </Button>
                    )}
                </div>
            </div>

            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" style={{ display: 'none' }} />
            
            {/* --- EDITOR FORM --- */}
            {isEditing && (
                <Card className="bg-orange-50 border-orange-200 mb-6">
                    <h4 className="font-bold text-lg mb-4 text-orange-800">{editId ? 'Edit Product' : 'New Product'}</h4>
                    
                    {/* --- 1. CORE & FINANCIALS --- */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 border-b pb-4">
                        <div className="md:col-span-2">
                            <Input label="Product Name" value={formData.name} onChange={handleInputChange('name')} />
                            <Input label="Order Reference / SKU" value={formData.Order_Reference} onChange={handleInputChange('Order_Reference')} />
                        </div>
                        <Input label="Category" value={formData.category} onChange={handleInputChange('category')} />
                        <Input label="System ID (Unique)" value={formData.id} onChange={handleInputChange('id')} disabled={!!editId} />
                        
                        <Input label="Sales Price (USD)" type="number" value={formData.salesPriceUSD} onChange={handleInputChange('salesPriceUSD')} />
                        <Input label="Cost Price (USD)" type="number" value={formData.costPriceUSD} onChange={handleInputChange('costPriceUSD')} />
                    </div>

                    {/* --- 2. PERFORMANCE & THERMAL --- */}
                    <div className="bg-white p-4 rounded-lg border border-orange-200 mb-4">
                        <h5 className="font-semibold text-gray-700 mb-3 flex items-center gap-2"><Zap size={16}/> Power & Efficiency Specs</h5>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <Input label="DHW Heating Power (kW)" type="number" value={formData.kW_DHW_Nominal} onChange={handleInputChange('kW_DHW_Nominal')} />
                            <Input label="DHW COP" type="number" value={formData.COP_DHW} onChange={handleInputChange('COP_DHW')} />
                            <Input label="SCOP (Avg Climate)" type="number" value={formData.SCOP_DHW_Avg} onChange={handleInputChange('SCOP_DHW_Avg')} />
                            <Input label="Max Hot Water Temp (°C)" type="number" value={formData.max_temp_c} onChange={handleInputChange('max_temp_c')} />

                            <div className="md:col-span-4 flex items-center mt-2">
                                <Checkbox label="Is Reversible (Has Cooling)?" checked={formData.isReversible} onChange={handleInputChange('isReversible')} />
                            </div>
                            
                            {formData.isReversible && (
                                <>
                                    <Input label="Cooling Power (kW)" type="number" value={formData.kW_Cooling_Nominal} onChange={handleInputChange('kW_Cooling_Nominal')} />
                                    <Input label="Cooling EER Range" value={formData.Cooling_EER_Range} onChange={handleInputChange('Cooling_EER_Range')} />
                                </>
                            )}
                        </div>
                    </div>

                    {/* --- 3. REFRIGERATION & CONNECTIONS (NEW BLOCK) --- */}
                    <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
                        <h5 className="font-semibold text-gray-700 mb-3 flex items-center gap-2"><Plug size={16}/> Refrigeration & Piping Details</h5>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <Input label="Refrigerant" value={formData.Refrigerant} onChange={handleInputChange('Refrigerant')} />
                            <Input label="Charge Weight" value={formData.Refrigerant_Charge} onChange={handleInputChange('Refrigerant_Charge')} />
                            <Input label="Suction Connection" value={formData.Suction_Connection} onChange={handleInputChange('Suction_Connection')} placeholder="e.g. 3/8&quot;" />
                            <Input label="Liquid Connection" value={formData.Liquid_Connection} onChange={handleInputChange('Liquid_Connection')} placeholder="e.g. 1/4&quot;" />
                            
                            <Input label="Nominal Evap Temp (°C)" value={formData.Evaporating_Temp_Nominal} onChange={handleInputChange('Evaporating_Temp_Nominal')} placeholder="e.g. -10" />
                            <Input label="Nominal Ambient Temp (°C)" value={formData.Ambient_Temp_Nominal} onChange={handleInputChange('Ambient_Temp_Nominal')} placeholder="e.g. 32" />
                            <Input label="Suitable Compressor" value={formData.Suitable_Compressor} onChange={handleInputChange('Suitable_Compressor')} />
                            <Input label="Type of Oil" value={formData.Type_of_Oil} onChange={handleInputChange('Type_of_Oil')} />

                            <Input label="Receiver Volume" value={formData.Receiver_Volume} onChange={handleInputChange('Receiver_Volume')} placeholder="e.g. 10.0 dm³" />
                            <Input label="Air Flow" value={formData.Air_Flow} onChange={handleInputChange('Air_Flow')} placeholder="e.g. 3600 m³/h" />
                            <Input label="Fan Details" value={formData.Fan_Details} onChange={handleInputChange('Fan_Details')} placeholder="e.g. 1×630 mm" />
                            <Input label="Rated Water Pressure (MPa)" value={formData.Rated_Water_Pressure} onChange={handleInputChange('Rated_Water_Pressure')} />
                        </div>
                    </div>


                    {/* --- 4. ELECTRICAL & CONDITIONS --- */}
                    <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
                        <h5 className="font-semibold text-gray-700 mb-3 flex items-center gap-2"><BarChart3 size={16}/> Electrical & Operating Data</h5>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <Input label="Power Supply" value={formData.Power_Supply} onChange={handleInputChange('Power_Supply')} placeholder="e.g. 380V / 3Ph / 50Hz" />
                            <Input label="Rated Power Input (kW)" type="number" value={formData.Rated_Power_Input} onChange={handleInputChange('Rated_Power_Input')} />
                            <Input label="Max. Running Current (A)" type="number" value={formData.Max_Running_Current} onChange={handleInputChange('Max_Running_Current')} />
                            <Input label="Recommended Breaker (A)" value={formData.Recommended_Breaker} onChange={handleInputChange('Recommended_Breaker')} />
                            
                            <Input label="Outdoor Temp Range" value={formData.Outdoor_Air_Temp_Range} onChange={handleInputChange('Outdoor_Air_Temp_Range')} placeholder="e.g. -7 °C to 43 °C" />
                            <Input label="Sound Power Level (dB(A))" type="number" value={formData.Sound_Power_Level} onChange={handleInputChange('Sound_Power_Level')} />
                            <Input label="Certificates" value={formData.Certificates} onChange={handleInputChange('Certificates')} placeholder="e.g. CE, TUV, RoHS" />
                        </div>
                    </div>


                    {/* --- 5. LOGISTICS --- */}
                    <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
                        <h5 className="font-semibold text-gray-700 mb-3 flex items-center gap-2"><Ruler size={16}/> Sizing & Weight</h5>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <Input label="Net Dimensions (L×W×H)" value={formData.Unit_Dimensions} onChange={handleInputChange('Unit_Dimensions')} placeholder="e.g. 510 × 1289 × 963 mm" />
                            <Input label="Net Weight (kg)" type="number" value={formData.Net_Weight} onChange={handleInputChange('Net_Weight')} />
                            <Input label="Gross Weight (kg)" type="number" value={formData.Gross_Weight} onChange={handleInputChange('Gross_Weight')} />
                        </div>
                    </div>
                    
                    <div className="md:col-span-4 mb-4">
                        {/* Correctly using the imported Textarea component */}
                        <Textarea
                            label="Specs / Description"
                            rows="2"
                            value={formData.specs}
                            onChange={handleInputChange('specs')}
                        />
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button onClick={handleCancel} variant="secondary">Cancel</Button>
                        <Button onClick={handleSave} variant="success"><Save size={16} className="mr-2"/> Save Product</Button>
                    </div>
                </Card>
            )}

            {/* --- LIST TABLE --- */}
            <div className="relative mb-4">
                <input type="text" placeholder="Search products by Name, Category, or SKU..." value={searchTerm} onChange={handleSearchChange} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500" />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
            </div>

            {/* --- Table with Checkboxes for Bulk Action --- */}
            <div className="bg-white rounded-lg shadow overflow-x-auto border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 w-10">
                                <input 
                                    type="checkbox" 
                                    checked={selectedIds.size > 0 && selectedIds.size === filteredProducts.length} 
                                    onChange={handleSelectAll} 
                                    className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                                />
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[200px]">Product</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Heating (kW)</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cooling (kW)</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Price (USD)</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase min-w-[100px]">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {/* FIX: Filter out any product missing an ID before rendering */}
                        {filteredProducts
                            .filter(p => p.id)
                            .map((p) => (
                            <tr key={p.id} className={`hover:bg-gray-50 ${selectedIds.has(p.id) ? 'bg-orange-50' : ''}`}>
                                <td className="px-6 py-4 w-10">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedIds.has(p.id)} 
                                        onChange={() => toggleSelection(p.id)}
                                        className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                                    />
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm font-bold text-gray-900">{p.name}</div>
                                    <div className="text-xs text-gray-500">
                                        {p.category} | Ref: {p.Refrigerant || '-'} | Max Temp: {p.max_temp_c || '-'}°C
                                    </div>
                                </td>
                                
                                <td className="px-6 py-4 text-right text-sm text-gray-500">
                                    <span className="font-semibold text-gray-700">
                                        {p.kW_DHW_Nominal ? `${p.kW_DHW_Nominal} kW` : '-'}
                                    </span>
                                </td>
                                
                                <td className="px-6 py-4 text-right text-sm text-gray-500">
                                    <span className="font-semibold text-gray-700">
                                        {p.kW_Cooling_Nominal > 0 ? `${p.kW_Cooling_Nominal} kW` : (p.isReversible ? '0 kW' : '-')}
                                    </span>
                                </td>

                                <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                                    ${p.salesPriceUSD?.toLocaleString()}
                                </td>
                                
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                    <button onClick={() => handleEdit(p)} className="text-indigo-600 hover:text-indigo-900 mr-4" title="Edit Product"><Edit size={18}/></button>
                                    <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:text-red-900" title="Delete Product"><Trash2 size={18}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {filteredProducts.length === 0 && (
                <div className="p-8 text-center text-gray-500">No products found matching filters.</div>
            )}

            {/* --- BULK ACTION BAR --- */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 z-50 animate-in fade-in slide-in-from-bottom-4">
                    <span className="font-bold text-sm">{selectedIds.size} Selected</span>
                    
                    <div className="h-4 w-px bg-gray-600"></div>
                    
                    <button onClick={handleBulkExport} className="flex items-center gap-2 hover:text-green-400 transition-colors">
                        <Download size={18} />
                        <span className="text-sm font-bold">Export CSV</span>
                    </button>

                    <button onClick={handleBulkDelete} className="flex items-center gap-2 hover:text-red-400 transition-colors">
                        <Trash2 size={18} />
                        <span className="text-sm font-bold">Delete</span>
                    </button>

                    <button onClick={() => setSelectedIds(new Set())} className="ml-2 text-gray-400 hover:text-white">
                        <X size={18}/>
                    </button>
                </div>
            )}
        </div>
    );
};

export default ProductManager;
