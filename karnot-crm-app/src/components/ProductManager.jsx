import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { Plus, Search, Edit, Trash2, X, Save, Package, Zap, BarChart3, Ruler, Plug } from 'lucide-react';
import { Card, Button, Input, Checkbox } from '../data/constants';

const ProductManager = ({ user }) => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null); 
    
    // --- FINALIZED STATE SCHEMA ---
    const [formData, setFormData] = useState({
        id: '', name: '', category: 'Heat Pump', costPriceUSD: 0, salesPriceUSD: 0, specs: '',
        
        // Performance
        kW_DHW_Nominal: 0, COP_DHW: 3.8, kW_Cooling_Nominal: 0, Cooling_EER_Range: '', 
        SCOP_DHW_Avg: 3.51, 

        // Electrical & Operation
        Rated_Power_Input: 0, Max_Running_Current: 0, Sound_Power_Level: 0, 
        Outdoor_Air_Temp_Range: '', Power_Supply: '380/420 V-50/60 Hz-3 ph', Recommended_Breaker: '',
        
        // Refrigeration & Connections
        Refrigerant: 'R290', Refrigerant_Charge: '150g', Rated_Water_Pressure: '0.7 MPa', 
        Evaporating_Temp_Nominal: '', Ambient_Temp_Nominal: '', Suction_Connection: '', 
        Liquid_Connection: '', Suitable_Compressor: '', Type_of_Oil: '', Receiver_Volume: '', 
        Fan_Details: '', Air_Flow: '', Certificates: '',

        // Logistics & Sizing
        max_temp_c: 75, isReversible: true,
        Unit_Dimensions: '', Net_Weight: 0, Gross_Weight: 0, Order_Reference: '',
    });

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

    const handleEdit = (product) => {
        setIsEditing(true);
        setEditId(product.id);
        // Load all fields, ensuring missing ones default gracefully
        setFormData(prev => ({
            ...prev,
            ...product,
            // Ensure numbers are handled from the database (they might be stored as strings if imported)
            costPriceUSD: parseFloat(product.costPriceUSD) || 0,
            salesPriceUSD: parseFloat(product.salesPriceUSD) || 0,
            kW_DHW_Nominal: parseFloat(product.kW_DHW_Nominal) || 0,
            kW_Cooling_Nominal: parseFloat(product.kW_Cooling_Nominal) || 0,
            COP_DHW: parseFloat(product.COP_DHW) || 3.8,
            max_temp_c: parseFloat(product.max_temp_c) || 75,
            Rated_Power_Input: parseFloat(product.Rated_Power_Input) || 0,
            SCOP_DHW_Avg: parseFloat(product.SCOP_DHW_Avg) || 3.51,
            Max_Running_Current: parseFloat(product.Max_Running_Current) || 0,
            Sound_Power_Level: parseFloat(product.Sound_Power_Level) || 0,
            Net_Weight: parseFloat(product.Net_Weight) || 0,
            Gross_Weight: parseFloat(product.Gross_Weight) || 0,
        }));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleAddNew = () => {
        setIsEditing(true);
        setEditId(null);
        // Reset form to defaults
        setFormData({
            id: `prod_${Date.now()}`,
            name: '', category: 'Heat Pump', costPriceUSD: 0, salesPriceUSD: 0, specs: '',
            kW_DHW_Nominal: 0, COP_DHW: 3.8, kW_Cooling_Nominal: 0, Cooling_EER_Range: '', 
            Rated_Power_Input: 0, SCOP_DHW_Avg: 3.51, Max_Running_Current: 0, Sound_Power_Level: 0,
            Outdoor_Air_Temp_Range: '', Power_Supply: '380/420 V-50/60 Hz-3 ph', Recommended_Breaker: '',
            Refrigerant: 'R290', Refrigerant_Charge: '150g', Rated_Water_Pressure: '0.7 MPa', 
            Evaporating_Temp_Nominal: '', Ambient_Temp_Nominal: '', Suction_Connection: '', 
            Liquid_Connection: '', Suitable_Compressor: '', Type_of_Oil: '', Receiver_Volume: '', 
            Fan_Details: '', Air_Flow: '', Certificates: '', max_temp_c: 75, isReversible: true, 
            Unit_Dimensions: '', Net_Weight: 0, Gross_Weight: 0, Order_Reference: '',
        });
    };

    const handleSave = async () => {
        if (!formData.name || !formData.salesPriceUSD) {
            alert("Please provide Name and Sales Price.");
            return;
        }

        try {
            const safeId = formData.id.replace(/\s+/g, '_').toLowerCase();
            
            // --- FINAL ROBUST DATA SANITIZATION AND ASSIGNMENT (THE FIX) ---
            const productData = {
                id: safeId,
                name: formData.name || '',
                category: formData.category || 'Heat Pump',
                specs: formData.specs || '',
                isReversible: Boolean(formData.isReversible),
                lastModified: serverTimestamp(),
                
                // CORE FINANCIALS (PARSED)
                costPriceUSD: parseFloat(formData.costPriceUSD) || 0,
                salesPriceUSD: parseFloat(formData.salesPriceUSD) || 0,
                
                // PERFORMANCE (PARSED)
                kW_DHW_Nominal: parseFloat(formData.kW_DHW_Nominal) || 0,
                COP_DHW: parseFloat(formData.COP_DHW) || 3.0,
                kW_Cooling_Nominal: parseFloat(formData.kW_Cooling_Nominal) || 0,
                SCOP_DHW_Avg: parseFloat(formData.SCOP_DHW_Avg) || 3.0,
                max_temp_c: parseFloat(formData.max_temp_c) || 60,

                // STRING/RANGE FIELDS (Saved as strings, defaulting to empty string)
                Cooling_EER_Range: formData.Cooling_EER_Range || '', 
                Outdoor_Air_Temp_Range: formData.Outdoor_Air_Temp_Range || '', 
                Power_Supply: formData.Power_Supply || '', 
                Recommended_Breaker: formData.Recommended_Breaker || '',
                Refrigerant: formData.Refrigerant || '', 
                Refrigerant_Charge: formData.Refrigerant_Charge || '', 
                Rated_Water_Pressure: formData.Rated_Water_Pressure || '', 
                Evaporating_Temp_Nominal: formData.Evaporating_Temp_Nominal || '',
                Ambient_Temp_Nominal: formData.Ambient_Temp_Nominal || '',
                Suction_Connection: formData.Suction_Connection || '',
                Liquid_Connection: formData.Liquid_Connection || '',
                Suitable_Compressor: formData.Suitable_Compressor || '',
                Type_of_Oil: formData.Type_of_Oil || '',
                Receiver_Volume: formData.Receiver_Volume || '',
                Fan_Details: formData.Fan_Details || '',
                Air_Flow: formData.Air_Flow || '',
                Certificates: formData.Certificates || '',
                Unit_Dimensions: formData.Unit_Dimensions || '',
                Order_Reference: formData.Order_Reference || '',
                
                // ELECTRICAL & LOGISTICS (PARSED)
                Rated_Power_Input: parseFloat(formData.Rated_Power_Input) || 0,
                Max_Running_Current: parseFloat(formData.Max_Running_Current) || 0,
                Sound_Power_Level: parseFloat(formData.Sound_Power_Level) || 0,
                Net_Weight: parseFloat(formData.Net_Weight) || 0,
                Gross_Weight: parseFloat(formData.Gross_Weight) || 0,
            };
            // --- END FINAL ROBUST DATA SANITIZATION ---

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
        setFormData(prev => ({ ...prev, [field]: e.target.value }));
    };
    const handleCancel = () => { setIsEditing(false); setEditId(null); };
    
    const filteredProducts = useMemo(() => {
        return products.filter(p => 
            (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
            (p.category || '').toLowerCase().includes(searchTerm.toLowerCase())
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
                                <Checkbox label="Is Reversible (Has Cooling)?" checked={formData.isReversible} onChange={e => setFormData(p => ({...p, isReversible: e.target.checked, kW_Cooling_Nominal: e.target.checked ? p.kW_Cooling_Nominal : 0 }))} />
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
                        <label className="block text-sm font-medium text-gray-600 mb-1">Specs / Description</label>
                        <textarea
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500"
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
                <input type="text" placeholder="Search products..." value={searchTerm} onChange={handleInputChange('searchTerm')} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500" />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Heating (kW)</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cooling (kW)</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Price (USD)</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredProducts.map((p) => (
                            <tr key={p.id} className="hover:bg-gray-50">
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
                                    <button onClick={() => handleEdit(p)} className="text-indigo-600 hover:text-indigo-900 mr-4"><Edit size={18}/></button>
                                    <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:text-red-900"><Trash2 size={18}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {filteredProducts.length === 0 && (
                <div className="p-8 text-center text-gray-500">No products found.</div>
            )}
        </div>
    );
};

export default ProductManager;
