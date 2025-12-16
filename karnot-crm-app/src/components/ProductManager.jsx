import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../firebase';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import Papa from 'papaparse';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  Save,
  Package,
  Zap,
  BarChart3,
  Ruler,
  Plug,
  Upload,
  AlertTriangle,
  CheckSquare,
  Download,
  Filter,
  Sun,
  Thermometer,
  Box,
} from 'lucide-react';
import { Card, Button, Input, Checkbox, Textarea } from '../data/constants';

const PASSWORD = "Edmund18931!";

// --- Consistently Named Categories ---
const CATEGORY_MAP = {
  'Heat Pump': { icon: Thermometer, color: 'orange' },
  'iCOOL CO2 Refrigeration': { icon: Box, color: 'purple' },
  'iSTOR Storage (non-PCM)': { icon: Package, color: 'teal' },
  'iSTOR Storage (with-PCM)': { icon: Package, color: 'blue' },
  'Solar Panels': { icon: Sun, color: 'amber' }, 
  'Inverters': { icon: Zap, color: 'indigo' },    
  'iMESH': { icon: Box, color: 'purple' },
  'Other Products Miscellaneous': { icon: Filter, color: 'pink' },
};

// ----------------------------------------------------------------------
// ✅ HELPERS
// ----------------------------------------------------------------------

const getCleanCategory = (rawCat) => {
  if (!rawCat) return 'Uncategorized';
  if (CATEGORY_MAP[rawCat]) return rawCat; // Return directly if matches preset

  const cat = String(rawCat).toLowerCase();
  if (cat.includes('icool')) return 'iCOOL CO2 Refrigeration';
  if (cat.includes('istor') || cat.includes('storage')) {
    if (cat.includes('pcm')) return 'iSTOR Storage (with-PCM)';
    return 'iSTOR Storage (non-PCM)';
  }
  if (cat.includes('heat pump') || cat.includes('aquahero')) return 'Heat Pump';
  if (cat.includes('solar')) return 'Solar Panels';
  if (cat.includes('inverter')) return 'Inverters';
  if (cat.includes('imesh')) return 'iMESH';
  return 'Other Products Miscellaneous';
};

const hpFromKW = (kw) => {
  const v = parseFloat(kw);
  if (!isFinite(v) || v <= 0) return '';
  if (v <= 5.5) return '2HP';
  if (v <= 9.5) return '4HP';
  return '10HP';
};

const ensureHpInName = (productLike) => {
  const category = (productLike?.category || '').toLowerCase();
  const name = String(productLike?.name || '');
  if (!category.includes('icool') && !name.toLowerCase().includes('icool')) return name;
  if (/\b(2|4|5|7|10|12|15)\s*hp\b/i.test(name)) return name;
  const hp = hpFromKW(productLike?.kW_Cooling_Nominal || productLike?.kW_DHW_Nominal || 0);
  if (!hp) return name;
  if (/karnot\s+icool/i.test(name)) return name.replace(/(karnot\s+icool)\b/i, `$1 ${hp}`);
  return `Karnot iCOOL ${hp} ${name}`.replace(/\s+/g, ' ').trim();
};

const makeSafeId = (s) => String(s || '').trim().replace(/[\s/]+/g, '_').replace(/[^\w.-]+/g, '_').toLowerCase();

// ----------------------------------------------------------------------
// --- 1. Helper: Stat Badge ---
// ----------------------------------------------------------------------
const StatBadge = ({ icon: Icon, label, count, total, color, active, onClick }) => {
  if (!Icon || !color) return null;
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer flex-1 min-w-[200px] p-3 rounded-xl border transition-all duration-200 flex items-center justify-between gap-3
        ${active ? `bg-${color}-100 border-${color}-500 ring-2 ring-${color}-400` : 'bg-white border-gray-200 hover:border-orange-300 hover:shadow-md'}
      `}
    >
      <div className={`p-2 rounded-full bg-${color}-100 text-${color}-600`}><Icon size={20} /></div>
      <div className="text-right">
        <p className="text-xs text-gray-500 font-bold uppercase">{label}</p>
        <p className="text-xl font-bold text-gray-800">{count} <span className="text-xs text-gray-400 font-normal">({percentage}%)</span></p>
      </div>
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
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  const defaultFormData = {
    id: '', name: '', category: 'Heat Pump', costPriceUSD: 0, salesPriceUSD: 0, specs: '',
    kW_DHW_Nominal: 0, COP_DHW: 3.8, kW_Cooling_Nominal: 0, Power_Supply: '380/420 V-50/60 Hz-3 ph', Refrigerant: 'R290',
  };
  const [formData, setFormData] = useState(defaultFormData);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const unsub = onSnapshot(collection(db, "users", user.uid, "products"), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProducts(list.sort((a, b) => (a.category || '').localeCompare(b.category || '') || (a.name || '').localeCompare(b.name || '')));
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const stats = useMemo(() => {
    const categories = {};
    products.forEach(p => { const clean = getCleanCategory(p.category); categories[clean] = (categories[clean] || 0) + 1; });
    return { total: products.length, categories };
  }, [products]);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return products.filter(p => {
      const matchesSearch = (p.name || '').toLowerCase().includes(term) || (p.category || '').toLowerCase().includes(term);
      const matchesFilter = activeFilter === 'ALL' || getCleanCategory(p.category) === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [products, searchTerm, activeFilter]);

  const groupedProducts = useMemo(() => {
    return filteredProducts.reduce((acc, p) => {
      const key = p.Power_Supply || 'N/A';
      if (!acc[key]) acc[key] = [];
      acc[key].push(p);
      return acc;
    }, {});
  }, [filteredProducts]);

  // --- Handlers ---
  const handleInputChange = (field) => (e) => {
    const { value, checked, type } = e.target;
    setFormData(prev => {
        let finalValue = type === 'checkbox' ? checked : value;
        const isNumeric = ['costPriceUSD', 'salesPriceUSD', 'kW_DHW_Nominal', 'COP_DHW', 'kW_Cooling_Nominal', 'max_temp_c'].includes(field);
        if (isNumeric && type !== 'checkbox') finalValue = value === '' ? 0 : parseFloat(value);
        return { ...prev, [field]: finalValue };
    });
  };

  const handleEdit = (p) => {
    setEditId(p.id);
    setFormData({ ...defaultFormData, ...p, id: p.id });
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async () => {
    if (!user || !formData.name || Number(formData.salesPriceUSD) <= 0) return alert("Please check Product Name and Price.");
    
    try {
      const finalName = ensureHpInName(formData);
      const docId = editId || makeSafeId(formData.id || finalName);
      const saveDate = {
          ...formData,
          name: finalName,
          lastModified: serverTimestamp()
      };
      
      if (!editId) saveDate.createdAt = serverTimestamp();
      delete saveDate.id; // Doc ID is the ID

      await setDoc(doc(db, "users", user.uid, "products", docId), saveDate, { merge: true });
      setIsEditing(false); setEditId(null); setFormData(defaultFormData);
      alert("Successfully Saved!");
    } catch (e) {
      console.error("Save Error:", e);
      alert("Error saving: " + e.message);
    }
  };

  const handleBulkExport = (all = false) => {
    const list = all ? products : products.filter(p => selectedIds.has(p.id));
    const csv = Papa.unparse(list);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    link.download = `inventory_export.csv`; link.click();
  };

  if (loading) return <div className="p-8 text-center font-bold">Connecting to Inventory...</div>;

  return (
    <div className="w-full pb-20">
      {/* STAT GRID */}
      <div className="flex flex-wrap gap-4 mb-8 pb-3">
        <StatBadge icon={Package} label="All Assets" count={stats.total} total={stats.total} color="gray" active={activeFilter === 'ALL'} onClick={() => setActiveFilter('ALL')} />
        {Object.keys(CATEGORY_MAP).map(cat => (
          <StatBadge key={cat} icon={CATEGORY_MAP[cat].icon} label={cat} count={stats.categories[cat] || 0} total={stats.total} color={CATEGORY_MAP[cat].color} active={activeFilter === cat} onClick={() => setActiveFilter(cat)} />
        ))}
      </div>

      {/* ACTIONS */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-2">
        <h3 className="text-xl font-bold text-gray-800">{activeFilter === 'ALL' ? 'Complete Inventory' : activeFilter} ({filteredProducts.length})</h3>
        <div className="flex gap-2">
          <Button onClick={() => handleBulkExport(true)} variant="secondary"><Download size={16} className="mr-2" /> Export</Button>
          <Button onClick={() => { setIsEditing(true); setEditId(null); setFormData(defaultFormData); }} variant="primary"><Plus size={16} className="mr-2" /> Add New</Button>
        </div>
      </div>

      {/* EDITOR */}
      {isEditing && (
        <Card className="bg-orange-50 border-orange-200 mb-6 p-6 shadow-xl">
          <h4 className="font-bold text-lg mb-4 text-orange-800">{editId ? 'Modify Product' : 'Register New Asset'}</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 border-b pb-4">
            <div className="md:col-span-2">
                <Input label="Product Name" value={formData.name} onChange={handleInputChange('name')} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-orange-700 uppercase tracking-widest ml-1">Category</label>
              <select className="w-full p-2.5 border border-orange-200 rounded-lg bg-white focus:ring-2 focus:ring-orange-500 text-sm font-bold"
                value={formData.category} onChange={(e) => setFormData(p => ({...p, category: e.target.value}))}>
                {Object.keys(CATEGORY_MAP).map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <Input label="System ID" value={formData.id} disabled={!!editId} onChange={handleInputChange('id')} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <Input label="Price (USD)" type="number" value={formData.salesPriceUSD} onChange={handleInputChange('salesPriceUSD')} />
            <Input label="Heating (kW)" type="number" value={formData.kW_DHW_Nominal} onChange={handleInputChange('kW_DHW_Nominal')} />
            <Input label="Cooling (kW)" type="number" value={formData.kW_Cooling_Nominal} onChange={handleInputChange('kW_Cooling_Nominal')} />
            <div className="flex items-end gap-2">
              <Button onClick={() => setIsEditing(false)} variant="secondary" className="w-full">Cancel</Button>
              <Button onClick={handleSave} variant="success" className="w-full font-bold">Save Changes</Button>
            </div>
          </div>
        </Card>
      )}

      {/* SEARCH */}
      <div className="relative mb-4">
        <input type="text" placeholder="Search product name or refrigerant..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-orange-500 shadow-sm" />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Product Details</th>
              <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Perf (kW)</th>
              <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Price</th>
              <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Edit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-sm">
            {Object.keys(groupedProducts).sort().map(groupKey => (
              <React.Fragment key={groupKey}>
                <tr className="bg-slate-50 sticky top-0 z-10 border-y border-slate-100"><td colSpan="4" className="px-6 py-2 font-black text-slate-500 uppercase text-[10px]">🔌 Power: {groupKey}</td></tr>
                {groupedProducts[groupKey].map((p) => (
                  <tr key={p.id} className="hover:bg-orange-50/30">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{p.name}</div>
                      <div className="text-[10px] uppercase font-bold text-gray-400">{p.category}</div>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-700">{p.kW_DHW_Nominal || '-'}</td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-orange-600">${Number(p.salesPriceUSD)?.toLocaleString()}</td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => handleEdit(p)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit size={16} /></button>
                      <button onClick={() => deleteDoc(doc(db, "users", user.uid, "products", p.id))} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductManager;
