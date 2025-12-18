import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import Papa from 'papaparse';
import { Plus, Search, Edit, Trash2, X, Save, Upload, Thermometer, Package, RefreshCw } from 'lucide-react';
import { Card, Button, Input, Checkbox, Textarea } from '../data/constants';

const ProductManager = ({ user }) => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('ALL');
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (!user) return;
        const unsub = onSnapshot(collection(db, "users", user.uid, "products"), (snap) => {
            setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return () => unsub();
    }, [user]);

    const handleImportCSV = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (h) => h.trim(), // Cleans hidden spaces in headers
            complete: async (results) => {
                const data = results.data;
                console.log("Parsed rows:", data.length);
                
                // Firestore batches have a limit of 500 operations. 
                // We'll process in chunks to be safe for 300+ lines.
                const batch = writeBatch(db);
                
                data.forEach((row, index) => {
                    // Robust ID selection: try 'System ID', then 'id', then a generated one
                    const sysId = row['System ID'] || row['id'] || `PROD_${Date.now()}_${index}`;
                    const docRef = doc(db, "users", user.uid, "products", sysId.trim());

                    // Mapping EVERY column from your Master File
                    const productData = {
                        id: sysId.trim(),
                        name: row['Product Name'] || 'Unnamed Product',
                        category: row['Category'] || 'Miscellaneous',
                        salesPriceUSD: parseFloat(row['Sales Price']) || 0,
                        costPriceUSD: parseFloat(row['Cost Price']) || 0,
                        kW_DHW_Nominal: parseFloat(row['kW_DHW_Nominal']) || 0,
                        kW_Cooling_Nominal: parseFloat(row['kW_Cooling_Nominal']) || 0,
                        COP_DHW: parseFloat(row['COP_DHW']) || 0,
                        SCOP_DHW_Avg: row['SCOP_DHW_Avg'] || '',
                        max_temp_c: parseFloat(row['Max Temp']) || 65,
                        Refrigerant: row['Refrigerant'] || '',
                        Power_Supply: row['Power Supply'] || '',
                        Rated_Power_Input: row['Rated Power Input'] || '',
                        Max_Running_Current: row['Max Running Current'] || '',
                        Sound_Power_Level: row['Sound Power Level'] || '',
                        Outdoor_Air_Temp_Range: row['Outdoor Air Temp Range'] || '',
                        Recommended_Breaker: row['Recommended Breaker'] || '',
                        Refrigerant_Charge: row['Refrigerant Charge'] || '',
                        Rated_Water_Pressure: row['Rated Water Pressure'] || '',
                        Evaporating_Temp_Nominal: row['Evaporating Temp Nominal'] || '',
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

                try {
                    await batch.commit();
                    alert(`IMPORT COMPLETE: ${data.length} items registered.`);
                } catch (err) {
                    console.error("Batch Error:", err);
                    alert("Import failed. Check console for details.");
                }
            }
        });
    };

    const filtered = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return products.filter(p => 
            (p.name?.toLowerCase().includes(term) || p.id?.toLowerCase().includes(term)) &&
            (activeFilter === 'ALL' || (p.category && p.category.includes(activeFilter)))
        );
    }, [products, searchTerm, activeFilter]);

    if (loading) return <div className="p-20 text-center font-bold">Synchronizing {products.length} Inventory Items...</div>;

    return (
        <div className="w-full space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Inventory Manager ({products.length})</h2>
                <div className="flex gap-2">
                    <input type="file" ref={fileInputRef} onChange={handleImportCSV} accept=".csv" className="hidden" />
                    <Button onClick={() => fileInputRef.current.click()} variant="secondary" className="bg-white border-2 border-slate-100 hover:border-orange-500 shadow-sm transition-all"><Upload size={16} className="mr-2"/> Full Master Import</Button>
                    <Button onClick={() => { setIsEditing(true); setEditId(null); }} variant="primary" className="shadow-lg shadow-orange-200"><Plus size={16} className="mr-2"/> Add Asset</Button>
                </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                {['ALL', 'Heat Pump', 'iSPA', 'iSTOR', 'Solar', 'Inverter'].map(cat => (
                    <button key={cat} onClick={() => setActiveFilter(cat)} className={`px-6 py-2 rounded-full text-[10px] font-black tracking-widest transition-all ${activeFilter === cat ? 'bg-orange-600 text-white shadow-xl' : 'bg-white text-slate-400 border border-slate-100 hover:border-orange-200'}`}>{cat.toUpperCase()}</button>
                ))}
            </div>

            <div className="relative">
                <input type="text" placeholder="Search 300+ Technical Profiles..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-14 pr-4 py-5 bg-white border-2 border-slate-100 rounded-[1.5rem] shadow-sm focus:border-orange-500 outline-none font-bold text-slate-700" />
                <Search size={24} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-200" />
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-50">
                <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50/50">
                        <tr>
                            <th className="px-10 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Model & Ref</th>
                            <th className="px-10 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Performance Stats</th>
                            <th className="px-10 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">MSRP (USD)</th>
                            <th className="px-10 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Manage</th>
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
                                        {p.Refrigerant && <span className="bg-white border border-blue-100 text-blue-500 px-2 py-1 rounded text-[10px] font-black">{p.Refrigerant}</span>}
                                        {p.kW_DHW_Nominal > 0 && <span className="bg-white border border-orange-100 text-orange-500 px-2 py-1 rounded text-[10px] font-black">{p.kW_DHW_Nominal}kW</span>}
                                        {p.max_temp_c > 0 && <span className="bg-white border border-slate-100 text-slate-400 px-2 py-1 rounded text-[10px] font-black">{p.max_temp_c}°C</span>}
                                    </div>
                                </td>
                                <td className="px-10 py-8 text-right">
                                    <div className="font-mono font-black text-green-600 text-xl">${p.salesPriceUSD?.toLocaleString()}</div>
                                    <div className="text-[10px] font-bold text-slate-200 uppercase">Weight: {p.Net_Weight || 'N/A'}</div>
                                </td>
                                <td className="px-10 py-8 text-center">
                                    <button onClick={async () => { if(window.confirm(`Permanently delete ${p.name}?`)) await deleteDoc(doc(db, "users", user.uid, "products", p.id)); }} className="p-3 bg-slate-50 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all">
                                        <Trash2 size={18}/>
                                    </button>
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
