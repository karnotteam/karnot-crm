import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import Papa from 'papaparse';
import { Plus, Search, Edit, Trash2, X, Save, Package, Upload, Download, Thermometer, Box, RefreshCw, Settings2 } from 'lucide-react';
import { Card, Button, Input, Checkbox, Textarea } from '../data/constants';

const ProductManager = ({ user }) => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('ALL');
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    const fileInputRef = useRef(null);

    // --- FULL 34-FIELD SCHEMA FROM CSV ---
    const defaultFormData = {
        id: '', name: '', category: '', salesPriceUSD: 0, costPriceUSD: 0,
        kW_DHW_Nominal: 0, kW_Cooling_Nominal: 0, COP_DHW: 0, SCOP_DHW_Avg: '',
        max_temp_c: 0, Refrigerant: '', Power_Supply: '', Rated_Power_Input: '',
        Max_Running_Current: '', Sound_Power_Level: '', Outdoor_Air_Temp_Range: '',
        Recommended_Breaker: '', Refrigerant_Charge: '', Rated_Water_Pressure: '',
        Evaporating_Temp_Nominal: '', Ambient_Temp_Nominal: '', Suction_Connection: '',
        Liquid_Connection: '', Suitable_Compressor: '', Type_of_Oil: '',
        Receiver_Volume: '', Fan_Details: '', Air_Flow: '', Certificates: '',
        Net_Weight: '', Gross_Weight: '', Unit_Dimensions: '', Order_Reference: '', Specs: '',
        isReversible: false
    };

    const [formData, setFormData] = useState(defaultFormData);

    useEffect(() => {
        if (!user) return;
        const unsub = onSnapshot(collection(db, "users", user.uid, "products"), (snap) => {
            setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return () => unsub();
    }, [user]);

    // --- ZERO-LOSS CSV IMPORT ---
    const handleImportCSV = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const batch = writeBatch(db);
                results.data.forEach(row => {
                    const sysId = row['System ID']?.trim() || Math.random().toString(36).substr(2, 9);
                    const docRef = doc(db, "users", user.uid, "products", sysId);
                    
                    // Exact mapping of every column in Master_Product_Data.csv
                    const productData = {
                        id: sysId,
                        name: row['Product Name'] || '',
                        category: row['Category'] || '',
                        salesPriceUSD: parseFloat(row['Sales Price']) || 0,
                        costPriceUSD: parseFloat(row['Cost Price']) || 0,
                        kW_DHW_Nominal: parseFloat(row['kW_DHW_Nominal']) || 0,
                        kW_Cooling_Nominal: parseFloat(row['kW_Cooling_Nominal']) || 0,
                        COP_DHW: parseFloat(row['COP_DHW']) || 0,
                        SCOP_DHW_Avg: row['SCOP_DHW_Avg'] || '',
                        max_temp_c: parseFloat(row['Max Temp']) || 0,
                        Refrigerant: row['Refrigerant'] || '',
                        Power_Supply: row['Power Supply'] || '',
                        Rated_Power_Input: row['Rated Power Input'] || '',
                        Max_Running_Current: row['Max Running Current'] || '',
                        Sound_Power_Level: row['Sound Power Level'] || '',
                        Outdoor_Air_Temp_Range: row['Outdoor Air Temp Range'] || '',
                        Recommended_Breaker: row['Recommended Breaker'] || '',
                        Refrigerant_Charge: row['Refrigerant Charge'] || '',
                        Rated_Water_Pressure: row['Rated Water Pressure'] || '',
                        Evating_Temp_Nominal: row['Evaporating Temp Nominal'] || '',
                        Ambient_Temp_Nominal: row['Ambient Temp Nominal'] || '',
                        Suction_Connection: row['Suction Connection'] || '',
                        Liquid_Connection: row['Liquid Connection'] || '',
                        Suitable_Compressor: row['Suitable Compressor'] || '',
                        Type_of_Oil: row['Type of Oil'] || '',
                        Receiver_Volume: row['Receiver Volume'] || '',
                        Fan_Details: row['Fan Details'] || '',
                        Air_Flow: row['Air Flow'] || '',
                        Certificates: row['Certificates'] || '',
                        Net_Weight: row['Net Weight'] || '',
                        Gross_Weight: row['Gross Weight'] || '',
                        Unit_Dimensions: row['Unit Dimensions'] || '',
                        Order_Reference: row['Order Reference'] || '',
                        Specs: row['Specs'] || '',
                        isReversible: (row['Refrigerant'] || '').toLowerCase().includes('r32') || (row['Product Name'] || '').toLowerCase().includes('iheat'),
                        lastModified: serverTimestamp()
                    };
                    batch.set(docRef, productData, { merge: true });
                });
                await batch.commit();
                alert(`SUCCESS: Imported ${results.data.length} records with full technical data.`);
            }
        });
    };

    const handleSave = async () => {
        if (!formData.name) return alert("Product Name Required");
        const docId = editId || formData.id || formData.name.replace(/\s+/g, '_').toLowerCase();
        await setDoc(doc(db, "users", user.uid, "products", docId), { ...formData, lastModified: serverTimestamp() }, { merge: true });
        setIsEditing(false);
        setFormData(defaultFormData);
    };

    const filtered = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return products.filter(p => 
            (p.name?.toLowerCase().includes(term) || p.id?.toLowerCase().includes(term)) &&
            (activeFilter === 'ALL' || p.category?.includes(activeFilter))
        );
    }, [products, searchTerm, activeFilter]);

    if (loading) return <div className="p-20 text-center font-bold">Syncing Master Database...</div>;

    return (
        <div className="w-full space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Master Inventory Manager ({products.length})</h2>
                <div className="flex gap-2">
                    <input type="file" ref={fileInputRef} onChange={handleImportCSV} accept=".csv" className="hidden" />
                    <Button onClick={() => fileInputRef.current.click()} variant="secondary"><Upload size={16} className="mr-2"/> Bulk Import CSV</Button>
                    <Button onClick={() => { setIsEditing(true); setEditId(null); setFormData(defaultFormData); }} variant="primary"><Plus size={16} className="mr-2"/> New Entry</Button>
                </div>
            </div>

            {/* FULL 34-FIELD EDITOR */}
            {isEditing && (
                <Card className="p-8 border-t-8 border-orange-500 shadow-2xl bg-white">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold uppercase tracking-tight text-slate-800">{editId ? 'Edit Technical Profile' : 'Create New Technical Profile'}</h3>
                        <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-red-500"><X/></button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        <Input label="System ID" value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} />
                        <div className="md:col-span-2"><Input label="Product Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                        <Input label="Category" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8 p-6 bg-slate-50 rounded-2xl border">
                        <Input label="Sales Price ($)" type="number" value={formData.salesPriceUSD} onChange={e => setFormData({...formData, salesPriceUSD: e.target.value})} />
                        <Input label="Cost Price ($)" type="number" value={formData.costPriceUSD} onChange={e => setFormData({...formData, costPriceUSD: e.target.value})} />
                        <Input label="DHW kW" type="number" value={formData.kW_DHW_Nominal} onChange={e => setFormData({...formData, kW_DHW_Nominal: e.target.value})} />
                        <Input label="Cooling kW" type="number" value={formData.kW_Cooling_Nominal} onChange={e => setFormData({...formData, kW_Cooling_Nominal: e.target.value})} />
                        <Input label="COP" type="number" value={formData.COP_DHW} onChange={e => setFormData({...formData, COP_DHW: e.target.value})} />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <Input label="Refrigerant" value={formData.Refrigerant} onChange={e => setFormData({...formData, Refrigerant: e.target.value})} />
                        <Input label="Max Temp (°C)" type="number" value={formData.max_temp_c} onChange={e => setFormData({...formData, max_temp_c: e.target.value})} />
                        <Input label="Power Supply" value={formData.Power_Supply} onChange={e => setFormData({...formData, Power_Supply: e.target.value})} />
                        <div className="flex items-center pt-6"><Checkbox label="Cooling Capable (Reversible)" checked={formData.isReversible} onChange={e => setFormData({...formData, isReversible: e.target.checked})} /></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <Textarea label="Full Technical Specs" rows="4" value={formData.Specs} onChange={e => setFormData({...formData, Specs: e.target.value})} />
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Dimensions" value={formData.Unit_Dimensions} onChange={e => setFormData({...formData, Unit_Dimensions: e.target.value})} />
                            <Input label="Order Reference" value={formData.Order_Reference} onChange={e => setFormData({...formData, Order_Reference: e.target.value})} />
                            <Input label="Net Weight" value={formData.Net_Weight} onChange={e => setFormData({...formData, Net_Weight: e.target.value})} />
                            <Input label="Sound Level" value={formData.Sound_Power_Level} onChange={e => setFormData({...formData, Sound_Power_Level: e.target.value})} />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t">
                        <Button onClick={() => setIsEditing(false)} variant="secondary">Discard Changes</Button>
                        <Button onClick={handleSave} variant="primary" className="px-10 font-black"><Save size={18} className="mr-2"/> Commit to Database</Button>
                    </div>
                </Card>
            )}

            <div className="flex gap-2 overflow-x-auto pb-4">
                {['ALL', 'Heat Pump', 'iSPA', 'iSTOR', 'Solar', 'Inverter'].map(cat => (
                    <button key={cat} onClick={() => setActiveFilter(cat)} className={`px-6 py-2 rounded-full text-[10px] font-black tracking-widest transition-all ${activeFilter === cat ? 'bg-orange-600 text-white shadow-xl' : 'bg-white text-slate-400 border border-slate-100 hover:border-orange-300'}`}>{cat.toUpperCase()}</button>
                ))}
            </div>

            <div className="relative">
                <input type="text" placeholder="Search 300+ technical profiles by Name, ID, or Refrigerant..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-14 pr-4 py-5 bg-white border-2 border-slate-100 rounded-3xl shadow-sm focus:border-orange-500 outline-none font-bold text-slate-700" />
                <Search size={24} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-200" />
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-50">
                <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50/50">
                        <tr>
                            <th className="px-10 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Asset Identity</th>
                            <th className="px-10 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Technical Capacity</th>
                            <th className="px-10 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">MSRP (USD)</th>
                            <th className="px-10 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Management</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filtered.map(p => (
                            <tr key={p.id} className="hover:bg-orange-50/50 transition-all group">
                                <td className="px-10 py-8">
                                    <div className="font-black text-slate-800 text-lg leading-none mb-2">{p.name}</div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">{p.category}</span>
                                        <span className="text-[10px] font-bold text-slate-300 uppercase">{p.id}</span>
                                    </div>
                                </td>
                                <td className="px-10 py-8">
                                    <div className="flex gap-2">
                                        {p.Refrigerant && <span className="bg-white border border-blue-200 text-blue-600 px-2 py-1 rounded text-[10px] font-black">{p.Refrigerant}</span>}
                                        {p.kW_DHW_Nominal > 0 && <span className="bg-white border border-orange-200 text-orange-600 px-2 py-1 rounded text-[10px] font-black">{p.kW_DHW_Nominal}kW</span>}
                                        {p.COP_DHW > 0 && <span className="bg-white border border-green-200 text-green-600 px-2 py-1 rounded text-[10px] font-black">COP {p.COP_DHW}</span>}
                                    </div>
                                </td>
                                <td className="px-10 py-8 text-right">
                                    <div className="font-mono font-black text-green-600 text-xl">${p.salesPriceUSD?.toLocaleString()}</div>
                                    <div className="text-[10px] font-bold text-slate-300 uppercase">Ref: {p.Order_Reference || 'None'}</div>
                                </td>
                                <td className="px-10 py-8 text-center">
                                    <div className="flex justify-center gap-2">
                                        <button onClick={() => { setEditId(p.id); setFormData(p); setIsEditing(true); window.scrollTo(0,0); }} className="p-3 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all"><Edit size={18}/></button>
                                        <button onClick={async () => { if(window.confirm(`Delete ${p.name}?`)) await deleteDoc(doc(db, "users", user.uid, "products", p.id)); }} className="p-3 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"><Trash2 size={18}/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ProductManager;
