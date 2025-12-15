import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { Plus, Search, Edit, Trash2, X, Save, Package, Settings, Zap } from 'lucide-react';
import { Card, Button, Input, Checkbox } from '../data/constants';

const ProductManager = ({ user }) => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null); 
    
    // --- UPDATED STATE: Includes kW Engineering Fields ---
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        category: 'Heat Pump',
        costPriceUSD: 0,
        salesPriceUSD: 0,
        specs: '',
        kW_DHW_Nominal: 0,
        kW_Cooling_Nominal: 0,
        COP_DHW: 3.8,
        max_temp_c: 75,
        isReversible: true 
    });

    useEffect(() => {
        if (!user) return;
        const unsub = onSnapshot(collection(db, "users", user.uid, "products"), (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            list.sort((a, b) => (a.category || '').localeCompare(b.category || '') || a.name.localeCompare(b.name));
            setProducts(list);
            setLoading(false);
        });
        return () => unsub();
    }, [user]);

    const handleEdit = (product) => {
        setIsEditing(true);
        setEditId(product.id);
        setFormData({
            id: product.id,
            name: product.name || '',
            category: product.category || 'Heat Pump',
            costPriceUSD: product.costPriceUSD || 0,
            salesPriceUSD: product.salesPriceUSD || 0,
            specs: product.specs || '',
            // Load existing technical data or defaults
            kW_DHW_Nominal: product.kW_DHW_Nominal || 0,
            kW_Cooling_Nominal: product.kW_Cooling_Nominal || 0,
            COP_DHW: product.COP_DHW || 3.8,
            max_temp_c: product.max_temp_c || 75,
            isReversible: product.isReversible || false
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleAddNew = () => {
        setIsEditing(true);
        setEditId(null);
        const newId = `prod_${Date.now()}`;
        setFormData({
            id: newId,
            name: '',
            category: 'Heat Pump',
            costPriceUSD: 0,
            salesPriceUSD: 0,
            specs: '',
            kW_DHW_Nominal: 0,
            kW_Cooling_Nominal: 0,
            COP_DHW: 3.8,
            max_temp_c: 75,
            isReversible: true
        });
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditId(null);
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

    const handleSave = async () => {
        if (!formData.name || !formData.salesPriceUSD || !formData.kW_DHW_Nominal) {
            alert("Please provide Name, Sales Price, and DHW Power (kW).");
            return;
        }

        try {
            const safeId = formData.id.replace(/\s+/g, '_').toLowerCase();
            
            const productData = {
                ...formData,
                id: safeId,
                costPriceUSD: parseFloat(formData.costPriceUSD) || 0,
                salesPriceUSD: parseFloat(formData.salesPriceUSD) || 0,
                // Save Engineering Data as Numbers
                kW_DHW_Nominal: parseFloat(formData.kW_DHW_Nominal) || 0,
                kW_Cooling_Nominal: parseFloat(formData.kW_Cooling_Nominal) || 0,
                COP_DHW: parseFloat(formData.COP_DHW) || 3.0,
                max_temp_c: parseFloat(formData.max_temp_c) || 60,
                isReversible: Boolean(formData.isReversible),
                lastModified: serverTimestamp()
            };

            await setDoc(doc(db, "users", user.uid, "products", safeId), productData, { merge: true });
            
            setIsEditing(false);
            setEditId(null);
            alert("Product Saved!");
        } catch (error) {
            console.error("Error saving:", error);
            alert("Failed to save product.");
        }
    };

    const filteredProducts = useMemo(() => {
        return products.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            p.category.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [products, searchTerm]);

    if (loading) return <div className="p-4 text-center">Loading Products...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Package className="text-orange-600"/> Product List ({products.length})
                </h3>
                {!isEditing && (
                    <Button onClick={handleAddNew} variant="primary">
                        <Plus size={16} className="mr-2"/> Add New Product
                    </Button>
                )}
            </div>

            {/* --- EDITOR FORM --- */}
            {isEditing && (
                <Card className="bg-orange-50 border-orange-200 mb-6">
                    <h4 className="font-bold text-lg mb-4 text-orange-800">{editId ? 'Edit Product' : 'New Product'}</h4>
                    
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <Input label="Product Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                        <Input label="Category" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                        <Input label="Cost Price (USD)" type="number" value={formData.costPriceUSD} onChange={e => setFormData({...formData, costPriceUSD: e.target.value})} />
                        <Input label="Sales Price (USD)" type="number" value={formData.salesPriceUSD} onChange={e => setFormData({...formData, salesPriceUSD: e.target.value})} />
                    </div>

                    {/* NEW: Engineering Data Section */}
                    <div className="bg-white p-4 rounded-lg border border-orange-200 mb-4">
                        <h5 className="font-semibold text-gray-700 mb-3 flex items-center gap-2"><Zap size={16}/> Technical Specs (kW Power & Efficiency)</h5>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <Input 
                                label="DHW Heating Power (kW)" 
                                placeholder="e.g. 15.5" 
                                type="number" 
                                value={formData.kW_DHW_Nominal} 
                                onChange={e => setFormData({...formData, kW_DHW_Nominal: e.target.value})} 
                            />
                            <Input 
                                label="Cooling Power (kW)" 
                                placeholder="e.g. 18.6" 
                                type="number" 
                                value={formData.kW_Cooling_Nominal} 
                                onChange={e => setFormData({...formData, kW_Cooling_Nominal: e.target.value})} 
                            />
                            <Input 
                                label="DHW COP" 
                                placeholder="e.g. 3.60" 
                                type="number" 
                                value={formData.COP_DHW} 
                                onChange={e => setFormData({...formData, COP_DHW: e.target.value})} 
                            />
                            <Input 
                                label="Max Temp (°C)" 
                                placeholder="e.g. 75" 
                                type="number" 
                                value={formData.max_temp_c} 
                                onChange={e => setFormData({...formData, max_temp_c: e.target.value})} 
                            />
                        </div>
                        <div className="flex items-center mt-4">
                            <Checkbox 
                                label="Is Reversible (Has Cooling)?" 
                                checked={formData.isReversible} 
                                onChange={e => setFormData({...formData, isReversible: e.target.checked})} 
                            />
                        </div>
                    </div>

                    <div className="md:col-span-2 mb-4">
                        <Input label="Specs / Description" value={formData.specs} onChange={e => setFormData({...formData, specs: e.target.value})} />
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button onClick={handleCancel} variant="secondary">Cancel</Button>
                        <Button onClick={handleSave} variant="success"><Save size={16} className="mr-2"/> Save Product</Button>
                    </div>
                </Card>
            )}

            {/* --- LIST TABLE --- */}
            {/* ... (Keep existing List Table rendering logic) ... */}
        </div>
    );
};

export default ProductManager;
