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

// --- Approved Consistently Named Categories ---
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
// ✅ NORMALIZATION HELPER: Maps variations to your clean categories
// ----------------------------------------------------------------------
const getCleanCategory = (rawCat) => {
  const cat = String(rawCat || '').toLowerCase();
  
  // Consolidation Logic
  if (cat.includes('icool')) return 'iCOOL CO2 Refrigeration';
  
  if (cat.includes('istor') || cat.includes('storage')) {
    if (cat.includes('pcm')) return 'iSTOR Storage (with-PCM)';
    return 'iSTOR Storage (non-PCM)';
  }
  
  if (cat.includes('ispa')) return 'Other Products Miscellaneous';
  if (cat.includes('heat pump') || cat.includes('aquahero')) return 'Heat Pump';
  if (cat.includes('solar')) return 'Solar Panels';
  if (cat.includes('inverter')) return 'Inverters';
  if (cat.includes('imesh')) return 'iMESH';
  if (cat.includes('misc') || cat.includes('other')) return 'Other Products Miscellaneous';
  
  return 'Uncategorized';
};

// ----------------------------------------------------------------------
// ✅ NAME HELPERS
// ----------------------------------------------------------------------
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
  const baseKW = productLike?.kW_Cooling_Nominal || productLike?.kW_DHW_Nominal || 0;
  const hp = hpFromKW(baseKW);
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
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedToDelete(newSet);
  };
  const handleAutoSelect = () => {
    const newSet = new Set();
    duplicates.forEach(group => {
      const sortedItems = [...group.items].sort((a, b) => (a.salesPriceUSD || 0) - (b.salesPriceUSD || 0));
      for (let i = 1; i < sortedItems.length; i++) newSet.add(sortedItems[i].id);
    });
    setSelectedToDelete(newSet);
  };
  const handleResolve = () => {
    if (window.confirm(`Permanently delete ${selectedToDelete.size} selected duplicate products?`)) onResolve(Array.from(selectedToDelete));
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-30 flex justify-center items-center p-4">
      <Card className="w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><AlertTriangle className="text-orange-500" /> Duplicates Found</h3>
          <button onClick={onClose}><X /></button>
        </div>
        <div className="overflow-y-auto flex-1 space-y-4 p-2">
          {duplicates.map((group, i) => (
            <div key={i} className="border border-orange-200 rounded-lg overflow-hidden">
              <div className="bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-800 tracking-widest">{group.key}</div>
              <div className="divide-y divide-gray-100">
                {group.items.map(p => (
                  <div key={p.id} className={`flex items-center justify-between p-3 ${selectedToDelete.has(p.id) ? 'bg-red-50' : 'bg-white'}`}>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked={selectedToDelete.has(p.id)} onChange={() => toggleSelection(p.id)} className="w-5 h-5 text-red-600 rounded" />
                      <div><p className="font-bold text-gray-800">{p.name} (${p.salesPriceUSD})</p></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t flex justify-end gap-2">
          <Button onClick={onClose} variant="secondary">Cancel</Button>
          <Button onClick={handleResolve} variant="danger" disabled={selectedToDelete.size === 0}><Trash2 className="mr-2" size={16} /> Delete Selected ({selectedToDelete.size})</Button>
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
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  const defaultFormData = {
    id: '', name: '', category: 'Heat Pump', salesPriceUSD: 0, costPriceUSD: 0,
    kW_DHW_Nominal: 0, kW_Cooling_Nominal: 0, Power_Supply: '380/420 V-50/60 Hz-3 ph', Refrigerant: 'R290',
  };
  const [formData, setFormData] = useState(defaultFormData);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const unsub = onSnapshot(collection(db, "users", user.uid, "products"), (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setProducts(list);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  // --- REFINED STATS: Consolidation Logic applied here ---
  const stats = useMemo(() => {
    const categories = {};
    products.forEach(p => {
      const cleanCat = getCleanCategory(p.category);
      categories[cleanCat] = (categories[cleanCat] || 0) + 1;
    });
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

  const handleEdit = (p) => {
    setIsEditing(true); setEditId(p.id);
    setFormData({ ...defaultFormData, ...p, id: p.id });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async () => {
    if (!user || !formData.name || Number(formData.salesPriceUSD) <= 0) return alert("Check Name and Price");
    try {
      const normalizedName = ensureHpInName(formData);
      const safeId = editId || makeSafeId(formData.id || normalizedName);
      const data = { ...formData, name: normalizedName, lastModified: serverTimestamp() };
      if (!editId) data.createdAt = serverTimestamp();
      delete data.id;
      await setDoc(doc(db, "users", user.uid, "products", safeId), data, { merge: true });
      setIsEditing(false); setEditId(null); alert("Saved!");
    } catch (e) { alert("Error: " + e.message); }
  };

  const handleDeleteAll = async () => {
    const pin = prompt("Enter password to delete ALL products:");
    if (pin !== PASSWORD) return alert("Wrong password.");
    const batch = writeBatch(db);
    products.forEach(p => batch.delete(doc(db, "users", user.uid, "products", p.id)));
    await batch.commit(); alert("Inventory cleared.");
  };

  const handleBulkExport = (all = false) => {
    const list = all ? products : products.filter(p => selectedIds.has(p.id));
    if (!list.length) return alert("Nothing selected");
    const csv = Papa.unparse(list);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    link.download = `karnot_inventory.csv`;
    link.click();
  };

  const handleSelectAll = () => {
    const allVisibleIds = filteredProducts.map(p => p.id);
    if (allVisibleIds.length > 0 && allVisibleIds.every(id => selectedIds.has(id))) setSelectedIds(new Set());
    else setSelectedIds(new Set(allVisibleIds));
  };

  const toggleSelection = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedIds(newSet);
  };

  if (loading) return <div className="p-4 text-center font-bold">Syncing Inventory...</div>;

  return (
    <div className="w-full pb-20">
      {/* --- CONSOLIDATED STAT GRID --- */}
      <div className="flex flex-wrap gap-4 mb-8 pb-3">
        <StatBadge
          icon={Package} label="All Products" count={stats.total} total={stats.total} color="gray"
          active={activeFilter === 'ALL'} onClick={() => setActiveFilter('ALL')}
        />
        {Object.keys(CATEGORY_MAP).map(cat => (
          <StatBadge
            key={cat} icon={CATEGORY_MAP[cat].icon} label={cat} count={stats.categories[cat] || 0} total={stats.total}
            color={CATEGORY_MAP[cat].color} active={activeFilter === cat} onClick={() => setActiveFilter(cat)}
          />
        ))}
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-2">
        <h3 className="text-xl font-bold text-gray-800">
          {activeFilter === 'ALL' ? 'Total Inventory' : activeFilter} ({filteredProducts.length})
        </h3>
        <div className="flex gap-2">
          <Button onClick={() => handleBulkExport(true)} variant="secondary"><Download size={16} className="mr-2" /> Export</Button>
          <Button onClick={() => { setIsEditing(true); setEditId(null); setFormData(defaultFormData); }} variant="primary"><Plus size={16} className="mr-2" /> Add New</Button>
          <Button onClick={handleDeleteAll} variant="danger"><Trash2 size={16} /></Button>
        </div>
      </div>

      {/* --- EDITOR FORM --- */}
      {isEditing && (
        <Card className="bg-orange-50 border-orange-200 mb-6 p-6 shadow-lg">
          <h4 className="font-bold text-lg mb-4 text-orange-800">{editId ? 'Edit Product' : 'New Entry'}</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 border-b pb-4">
            <div className="md:col-span-2">
              <Input label="Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-orange-700 uppercase tracking-widest ml-1">Category Selection</label>
              <select className="w-full p-2.5 border border-orange-200 rounded-lg bg-white focus:ring-2 focus:ring-orange-500 text-sm font-bold shadow-sm"
                value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                {Object.keys(CATEGORY_MAP).map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <Input label="ID" value={formData.id} disabled={!!editId} onChange={(e) => setFormData({...formData, id: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <Input label="Price (USD)" type="number" value={formData.salesPriceUSD} onChange={(e) => setFormData({...formData, salesPriceUSD: e.target.value})} />
            <Input label="Heating (kW)" type="number" value={formData.kW_DHW_Nominal} onChange={(e) => setFormData({...formData, kW_DHW_Nominal: e.target.value})} />
            <Input label="Cooling (kW)" type="number" value={formData.kW_Cooling_Nominal} onChange={(e) => setFormData({...formData, kW_Cooling_Nominal: e.target.value})} />
            <div className="flex items-end gap-2">
              <Button onClick={() => setIsEditing(false)} variant="secondary" className="w-full">Cancel</Button>
              <Button onClick={handleSave} variant="success" className="w-full font-bold">Save</Button>
            </div>
          </div>
        </Card>
      )}

      {/* --- TABLE --- */}
      <div className="relative mb-4">
        <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-orange-500 shadow-sm" />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
      </div>

      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 w-10"><input type="checkbox" checked={filteredProducts.length > 0 && selectedIds.size === filteredProducts.length} onChange={handleSelectAll} className="rounded" /></th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Details</th>
              <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Performance</th>
              <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Price</th>
              <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-sm">
            {Object.keys(groupedProducts).sort().map(groupKey => (
              <React.Fragment key={groupKey}>
                <tr className="bg-slate-50 sticky top-0 z-10 border-y border-slate-100"><td colSpan="5" className="px-6 py-2 font-black text-slate-500 uppercase text-[10px]">🔌 Power: {groupKey}</td></tr>
                {groupedProducts[groupKey].map((p) => (
                  <tr key={p.id} className="hover:bg-orange-50/30">
                    <td className="px-6 py-4"><input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelection(p.id)} /></td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{p.name}</div>
                      <div className="text-[10px] uppercase font-bold text-gray-400">{p.category}</div>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold">{p.kW_DHW_Nominal || '-'} kW</td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-orange-600">${p.salesPriceUSD?.toLocaleString()}</td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => handleEdit(p)} className="text-indigo-600 mr-3"><Edit size={16} /></button>
                      <button onClick={() => deleteDoc(doc(db, "users", user.uid, "products", p.id))} className="text-red-600"><Trash2 size={16} /></button>
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
