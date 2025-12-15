import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { Plus, Search, Edit, Trash2, X, Save, Package } from 'lucide-react';
import { Card, Button, Input, Checkbox } from '../data/constants';

const ProductManager = ({ user }) => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Form State for Adding/Editing
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null); // If null, we are adding new
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        category: 'Uncategorized',
        costPriceUSD: '',
        salesPriceUSD: '',
        specs: ''
    });

    // 1. Sync Products Live
    useEffect(() => {
        if (!user) return;
        const unsub = onSnapshot(collection(db, "users", user.uid, "products"), (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Sort by category then name
            list.sort((a, b) => (a.category || '').localeCompare(b.category || '') || a.name.localeCompare(b.name));
            setProducts(list);
            setLoading(false);
        });
        return () => unsub();
    }, [user]);

    // 2. Handlers
    const handleEdit = (product) => {
        setIsEditing(true);
        setEditId(product.id);
        setFormData({
            id: product.id,
            name: product.name,
            category: product.category || 'Uncategorized',
            costPriceUSD: product.costPriceUSD || 0,
            salesPriceUSD: product.salesPriceUSD || 0,
            specs: product.specs || ''
        });
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleAddNew = () => {
        setIsEditing(true);
        setEditId(null);
        // Auto-generate a simple ID
        const newId = `prod_${Date.now()}`;
        setFormData({
            id: newId,
            name: '',
            category: 'Uncategorized',
            costPriceUSD: 0,
            salesPriceUSD: 0,
            specs: ''
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
        if (!formData.name || !formData.salesPriceUSD) {
            alert("Please provide at least a Name and Sales Price.");
            return;
        }

        try {
            // Ensure ID is safe
            const safeId = formData.id.replace(/\s+/g, '_').toLowerCase();
            
            const productData = {
                ...formData,
                id: safeId,
                costPriceUSD: parseFloat(formData.costPriceUSD) || 0,
                salesPriceUSD: parseFloat(formData.salesPriceUSD) || 0,
                lastModified: serverTimestamp()
            };

            await setDoc(doc(db, "users", user.uid, "products", safeId), productData, { merge: true });
            
            setIsEditing(false);
            setEditId(null);
            alert(editId ? "Product Updated!" : "New Product Added!");
        } catch (error) {
            console.error("Error saving:", error);
            alert("Failed to save product.");
        }
    };

    // 3. Filter for Search
    const filteredProducts = useMemo(() => {
        return products.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.id.toLowerCase().includes(searchTerm.toLowerCase())
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
                <Card className="bg-orange-50 border-orange-200 mb-6 animate-in slide-in-from-top-4">
                    <h4 className="font-bold text-lg mb-4 text-orange-800">{editId ? 'Edit Product' : 'New Product'}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <Input 
                            label="Product Name" 
                            value={formData.name} 
                            onChange={e => setFormData({...formData, name: e.target.value})} 
                        />
                         <Input 
                            label="Category" 
                            value={formData.category} 
                            onChange={e => setFormData({...formData, category: e.target.value})} 
                            placeholder="e.g. Heat Pumps"
                        />
                        <Input 
                            label="Cost Price (USD)" 
                            type="number" 
                            value={formData.costPriceUSD} 
                            onChange={e => setFormData({...formData, costPriceUSD: e.target.value})} 
                        />
                        <Input 
                            label="Sales Price (USD)" 
                            type="number" 
                            value={formData.salesPriceUSD} 
                            onChange={e => setFormData({...formData, salesPriceUSD: e.target.value})} 
                        />
                        <div className="md:col-span-2">
                            <Input 
                                label="System ID (Unique)" 
                                value={formData.id} 
                                onChange={e => setFormData({...formData, id: e.target.value})} 
                                disabled={!!editId} // Cannot change ID once created
                                placeholder="Auto-generated if left blank"
                            />
                            <p className="text-xs text-gray-500 mt-1">Unique ID used for database tracking.</p>
                        </div>
                         <div className="md:col-span-2">
                             <label className="block text-sm font-medium text-gray-600 mb-1">Specs / Description</label>
                             <textarea 
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500"
                                rows="2"
                                value={formData.specs}
                                onChange={e => setFormData({...formData, specs: e.target.value})}
                             />
                         </div>
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button onClick={handleCancel} variant="secondary">Cancel</Button>
                        <Button onClick={handleSave} variant="success"><Save size={16} className="mr-2"/> Save Product</Button>
                    </div>
                </Card>
            )}

            {/* --- SEARCH --- */}
            <div className="relative">
                <input 
                    type="text" 
                    placeholder="Search products..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
            </div>

            {/* --- LIST TABLE --- */}
            <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cost (USD)</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price (USD)</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredProducts.map((p) => (
                            <tr key={p.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4">
                                    <div className="text-sm font-medium text-gray-900">{p.name}</div>
                                    <div className="text-xs text-gray-500">{p.id}</div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">{p.category}</td>
                                <td className="px-6 py-4 text-right text-sm text-gray-500">${p.costPriceUSD?.toLocaleString()}</td>
                                <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">${p.salesPriceUSD?.toLocaleString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                    <button onClick={() => handleEdit(p)} className="text-indigo-600 hover:text-indigo-900 mr-4"><Edit size={18}/></button>
                                    <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:text-red-900"><Trash2 size={18}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredProducts.length === 0 && (
                    <div className="p-8 text-center text-gray-500">No products found.</div>
                )}
            </div>
        </div>
    );
};

export default ProductManager;
