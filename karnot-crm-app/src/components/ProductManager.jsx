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

// --- Optimized Category Map (Cleaned up and Updated) ---
const CATEGORY_MAP = {
  'Heat Pump': { icon: Thermometer, color: 'orange' },
  'iCOOL': { icon: Box, color: 'purple' },
  'iSTOR Storage (non-PCM)': { icon: Package, color: 'teal' },
  'iSTOR Storage (with-PCM)': { icon: Package, color: 'blue' }, // NEW
  'Solar Panels': { icon: Sun, color: 'amber' }, 
  'Inverters': { icon: Zap, color: 'indigo' },    
  'iMESH': { icon: Box, color: 'purple' },
  'Other Products Miscellaneous': { icon: Filter, color: 'pink' },
  'Uncategorized': { icon: Package, color: 'gray' },
};

// ----------------------------------------------------------------------
// ✅ HELPERS
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
  const looksLikeICool = category.includes('icool') || name.toLowerCase().includes('icool');
  if (!looksLikeICool) return name;
  if (/\b(2|4|5|7|10|12|15)\s*hp\b/i.test(name)) return name;
  const baseKW = productLike?.kW_Cooling_Nominal || productLike?.kW_DHW_Nominal || 0;
  const hp = hpFromKW(baseKW);
  if (!hp) return name;
  if (/karnot\s+icool/i.test(name)) {
    return name.replace(/(karnot\s+icool)\b/i, `$1 ${hp}`);
  }
  return `Karnot iCOOL ${hp} ${name}`.replace(/\s+/g, ' ').trim();
};

const makeSafeId = (s) =>
  String(s || '').trim().replace(/[\s/]+/g, '_').replace(/[^\w.-]+/g, '_').toLowerCase();

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
      <Card className="w-full max-w-3xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <AlertTriangle className="text-orange-500" /> {duplicates.length} Duplicate Product Groups Found
          </h3>
          <button onClick={onClose}><X /></button>
        </div>
        <div className="bg-gray-50 p-3 rounded mb-4 flex justify-between items-center">
          <p className="text-sm text-gray-600">Select records to <span className="text-red-600 font-bold">DELETE</span>.</p>
          <Button onClick={handleAutoSelect} variant="secondary" className="text-sm">
            <CheckSquare size={14} className="mr-2 text-purple-600" /> Auto-Select Duplicates
          </Button>
        </div>
        <div className="overflow-y-auto flex-1 space-y-6 p-2">
          {duplicates.map((group, i) => (
            <div key={i} className="border border-orange-200 rounded-lg overflow-hidden">
              <div className="bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-800 tracking-widest">{group.key}</div>
              <div className="divide-y divide-gray-100">
                {group.items.map(product => (
                  <div key={product.id} className={`flex items-center justify-between p-3 ${selectedToDelete.has(product.id) ? 'bg-red-50' : 'bg-white'}`}>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked={selectedToDelete.has(product.id)} onChange={() => toggleSelection(product.id)} className="w-5 h-5 text-red-600 rounded" />
                      <div><p className="font-bold text-gray-800">{product.name} (${product.salesPriceUSD})</p></div>
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
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  const defaultFormData = {
    id: '', name: '', category: 'Heat Pump', costPriceUSD: 0, salesPriceUSD: 0, specs: '',
    kW_DHW_Nominal: 0, COP_DHW: 3.8, kW_Cooling_Nominal: 0, Power_Supply: '380/420 V-50/60 Hz-3 ph', 
    max_temp_c: 75, isReversible: true, Refrigerant: 'R290',
  };

  const [formData, setFormData] = useState(defaultFormData);

  useEffect(() => {
    if (!user) { setLoading(false); setProducts([]); return; }
    const unsub = onSnapshot(collection(db, "users", user.uid, "products"), (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.category || '').localeCompare(b.category || '') || (a.name || '').localeCompare(b.name || ''));
      setProducts(list);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const stats = useMemo(() => {
    if (!products || products.length === 0) return { total: 0, categories: {} };
    const categories = {};
    products.forEach(p => {
      const cat = p.category || 'Uncategorized';
      categories[cat] = (categories[cat] || 0) + 1;
    });
    return { total: products.length, categories };
  }, [products]);

  const categoriesToShow = useMemo(() => {
    const existing = Object.keys(stats.categories).filter(c => c !== 'Uncategorized');
    const presets = Object.keys(CATEGORY_MAP).filter(c => c !== 'Uncategorized');
    return Array.from(new Set([...presets, ...existing])).sort();
  }, [stats.categories]);

  const filteredProducts = useMemo(() => {
    const term = (searchTerm || '').toLowerCase();
    let list = activeFilter === 'ALL' ? products : products.filter(p => p.category === activeFilter);
    return list.filter(p => 
        (p.name || '').toLowerCase().includes(term) || 
        (p.category || '').toLowerCase().includes(term) ||
        (p.Order_Reference || '').toLowerCase().includes(term)
    );
  }, [products, searchTerm, activeFilter]);

  const groupedProducts = useMemo(() => {
    return filteredProducts.reduce((acc, p) => {
      const key = p.Power_Supply || 'N/A';
      if (!acc[key]) acc[key] = [];
      acc[key].push(p);
      return acc;
    }, {});
  }, [filteredProducts]);

  const handleEdit = (product) => {
    setIsEditing(true); setEditId(product.id);
    setFormData({ ...defaultFormData, ...product, id: product.id });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async () => {
    if (!user || !formData.name || Number(formData.salesPriceUSD) <= 0) {
      alert("Provide Name and Price > 0"); return;
    }
    try {
      const normalizedName = ensureHpInName(formData);
      const safeId = editId || makeSafeId(formData.id || normalizedName);
      const productData = { ...formData, name: normalizedName, lastModified: serverTimestamp() };
      if (!editId) productData.createdAt = serverTimestamp();
      delete productData.id;
      await setDoc(doc(db, "users", user.uid, "products", safeId), productData, { merge: true });
      setIsEditing(false); setEditId(null); alert("Saved!");
    } catch (e) { alert("Save error: " + e.message); }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this product?")) await deleteDoc(doc(db, "users", user.uid, "products", id));
  };

  const handleDeleteAll = async () => {
    const pin = prompt("DANGER! Enter password to delete ALL products:");
    if (pin !== PASSWORD) return alert("Wrong password.");
    if (!window.confirm("Confirm deletion of ALL data?")) return;
    const batch = writeBatch(db);
    products.forEach(p => batch.delete(doc(db, "users", user.uid, "products", p.id)));
    await batch.commit(); alert("Inventory cleared.");
  };

  const handleBulkExport = (all = false) => {
    const list = all ? products : products.filter(p => selectedIds.has(p.id));
    if (!list.length) return alert("Nothing to export.");
    const csv = Papa.unparse(list);
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `karnot_inventory_${all ? 'all' : 'selected'}.csv`;
    link.click();
  };

  const handleSelectAll = () => {
    const allVisibleIds = filteredProducts.map(p => p.id);
    const allSelected = allVisibleIds.length > 0 && allVisibleIds.every(id => selectedIds.has(id));
    if (allSelected) setSelectedIds(new Set()); else setSelectedIds(new Set(allVisibleIds));
  };

  const toggleSelection = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleInputChange = (field) => (e) => {
    const { value, checked, type } = e.target;
    if (type === 'checkbox') { setFormData(prev => ({ ...prev, [field]: checked })); return; }
    const isNumeric = ['costPriceUSD', 'salesPriceUSD', 'kW_DHW_Nominal', 'COP_DHW', 'kW_Cooling_Nominal', 'SCOP_DHW_Avg', 'max_temp_c', 'Rated_Power_Input', 'Max_Running_Current', 'Sound_Power_Level', 'Net_Weight', 'Gross_Weight'].includes(field);
    let finalValue = value;
    if (isNumeric) finalValue = value === '' ? 0 : parseFloat(value);
    setFormData(prev => ({ ...prev, [field]: finalValue }));
  };

  if (loading) return <div className="p-4 text-center">Syncing Inventory...</div>;

  return (
    <div className="w-full pb-20">
      {showDuplicateModal && <DuplicateResolverModal duplicates={duplicateGroups} onClose={() => setShowDuplicateModal(false)} onResolve={handleResolveDuplicates} />}

      {/* --- SHARP STAT GRID --- */}
      <div className="flex flex-wrap gap-4 mb-8 pb-3">
        <StatBadge
          icon={Package} label="All Products" count={stats.total} total={stats.total} color="gray"
          active={activeFilter === 'ALL'} onClick={() => setActiveFilter('ALL')}
        />
        {categoriesToShow.map((cat, index) => {
          const config = CATEGORY_MAP[cat] || CATEGORY_MAP['Uncategorized'];
          const dynamicColor = config.color || ['orange', 'blue', 'green', 'purple'][index % 4];
          return (
            <StatBadge
              key={cat} icon={config.icon} label={cat} count={stats.categories[cat] || 0} total={stats.total}
              color={dynamicColor} active={activeFilter === cat} onClick={() => setActiveFilter(cat)}
            />
          );
        })}
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-2">
        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          {activeFilter !== 'ALL' && <Filter size={20} className="text-orange-600" />}
          {activeFilter === 'ALL' ? 'All Inventory' : `${activeFilter} Inventory`}
          <span className="text-gray-400 font-normal text-base ml-2">({filteredProducts.length})</span>
        </h3>

        <div className="flex gap-2 flex-wrap justify-end w-full md:w-auto">
          <Button onClick={() => fileInputRef.current.click()} variant="secondary"><Upload size={16} className="mr-2" /> Update via CSV</Button>
          <Button onClick={() => handleBulkExport(true)} variant="secondary"><Download size={16} className="mr-2" /> Export ALL</Button>
          <Button onClick={() => { setIsEditing(true); setEditId(null); setFormData({...defaultFormData, id: `prod_${Date.now()}`})}} variant="primary"><Plus size={16} className="mr-2" /> Add New</Button>
          <Button onClick={handleDeleteAll} variant="danger"><Trash2 size={16} /></Button>
        </div>
      </div>

      <input type="file" ref={fileInputRef} onChange={() => {}} accept=".csv" className="hidden" />

      {/* --- EDITOR FORM --- */}
      {isEditing && (
        <Card className="bg-orange-50 border-orange-200 mb-6">
          <h4 className="font-bold text-lg mb-4 text-orange-800 tracking-tight">{editId ? 'Edit Product' : 'New Asset Entry'}</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 border-b pb-4">
            <div className="md:col-span-2">
              <Input label="Product Name" value={formData.name} onChange={handleInputChange('name')} />
              <Input label="SKU / Reference" value={formData.Order_Reference} onChange={handleInputChange('Order_Reference')} />
            </div>

            {/* PRESET CATEGORY DROPDOWN */}
            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-orange-700 uppercase tracking-widest mb-1 ml-1">Category Selection</label>
                <select 
                    className="w-full p-2.5 border border-orange-200 rounded-lg bg-white focus:ring-2 focus:ring-orange-500 text-sm font-bold shadow-sm"
                    value={formData.category} 
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                >
                    {Object.keys(CATEGORY_MAP).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
            </div>

            <Input label="System ID" value={formData.id} onChange={handleInputChange('id')} disabled={!!editId} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
             <Input label="Sales Price (USD)" type="number" value={formData.salesPriceUSD} onChange={handleInputChange('salesPriceUSD')} />
             <Input label="Cost Price (USD)" type="number" value={formData.costPriceUSD} onChange={handleInputChange('costPriceUSD')} />
             <Input label="Heating (kW)" type="number" value={formData.kW_DHW_Nominal} onChange={handleInputChange('kW_DHW_Nominal')} />
             <Input label="Cooling (kW)" type="number" value={formData.kW_Cooling_Nominal} onChange={handleInputChange('kW_Cooling_Nominal')} />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button onClick={() => setIsEditing(false)} variant="secondary">Discard</Button>
            <Button onClick={handleSave} variant="success" className="font-bold"><Save size={16} className="mr-2" /> Commit to Inventory</Button>
          </div>
        </Card>
      )}

      {/* --- SEARCH BAR --- */}
      <div className="relative mb-4">
        <input type="text" placeholder="Search by name, SKU or refrigerant..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-orange-500 shadow-sm" />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
      </div>

      {/* --- TABLE --- */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 w-10"><input type="checkbox" checked={filteredProducts.length > 0 && selectedIds.size === filteredProducts.length} onChange={handleSelectAll} className="w-4 h-4 text-orange-600 rounded" /></th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Product Details</th>
              <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Performance</th>
              <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Price (USD)</th>
              <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {Object.keys(groupedProducts).sort().map(groupKey => (
              <React.Fragment key={groupKey}>
                <tr className="bg-slate-50 sticky top-0 border-y border-slate-100 z-10"><td colSpan="5" className="px-6 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">🔌 Power Setup: {groupKey}</td></tr>
                {groupedProducts[groupKey].map((p) => (
                  <tr key={p.id} className={`hover:bg-orange-50/30 transition-colors ${selectedIds.has(p.id) ? 'bg-orange-50' : ''}`}>
                    <td className="px-6 py-4"><input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelection(p.id)} className="w-4 h-4 text-orange-600 rounded" /></td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-gray-900 leading-tight">{p.name}</div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase mt-1">{p.category} • {p.Refrigerant || '-'}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm font-bold text-gray-700">{p.kW_DHW_Nominal ? `${p.kW_DHW_Nominal} kW` : '-'}</div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-orange-600 text-sm">${p.salesPriceUSD?.toLocaleString()}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => handleEdit(p)} className="text-indigo-600 hover:text-indigo-900 mr-4"><Edit size={18} /></button>
                        <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:text-red-900"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- FLOATING BAR --- */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 z-50 animate-in slide-in-from-bottom-4">
          <span className="text-sm font-bold tracking-tight">{selectedIds.size} Selected</span>
          <div className="h-4 w-px bg-gray-600" />
          <Button onClick={() => handleBulkExport(false)} variant="success" className="text-xs font-black px-4">EXPORT CSV</Button>
          <Button onClick={handleBulkDelete} variant="danger" className="text-xs font-black px-4">DELETE</Button>
          <button onClick={() => setSelectedIds(new Set())} className="ml-2 text-gray-400 hover:text-white transition-colors"><X size={18} /></button>
        </div>
      )}
    </div>
  );
};

export default ProductManager;
