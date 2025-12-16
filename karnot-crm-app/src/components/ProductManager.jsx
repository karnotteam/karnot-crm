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
  ChevronDown,
} from 'lucide-react';
import { Card, Button, Input, Checkbox, Textarea } from '../data/constants';

const PASSWORD = "Edmund18931!";

// --- Optimized Category Map (Pre-set list for dropdowns and stats) ---
const CATEGORY_MAP = {
  'Heat Pump': { icon: Thermometer, color: 'orange' },
  'iCOOL': { icon: Box, color: 'purple' },
  'iSTOR systems': { icon: Package, color: 'teal' },
  'iSPA': { icon: Sun, color: 'blue' },
  'Solar Panels': { icon: Sun, color: 'amber' }, 
  'Inverters': { icon: Zap, color: 'indigo' },    
  'iMESH': { icon: Box, color: 'purple' },
  'Other Products Miscellaneous': { icon: Filter, color: 'pink' },
  'Uncategorized': { icon: Package, color: 'gray' },
};

// ----------------------------------------------------------------------
// ✅ HELPERS: iCOOL Naming & ID Normalization
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
// --- 1. Helper: Stat Badge (Optimized for Grid) ---
// ----------------------------------------------------------------------
const StatBadge = ({ icon: Icon, label, count, total, color, active, onClick }) => {
  if (!Icon || !color) return null;
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between h-full
        ${active ? `bg-${color}-50 border-${color}-500 ring-2 ring-${color}-200` : 'bg-white border-gray-200 hover:border-orange-300 hover:shadow-md'}
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg bg-${color}-100 text-${color}-600`}>
          <Icon size={18} />
        </div>
        <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded uppercase">
          {percentage}%
        </span>
      </div>
      <div>
        <p className="text-[10px] text-gray-500 font-bold uppercase truncate leading-tight mb-1">{label}</p>
        <p className="text-xl font-black text-gray-800 leading-none">{count}</p>
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
    if (window.confirm(`Delete ${selectedToDelete.size} duplicates?`)) onResolve(Array.from(selectedToDelete));
  };
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <Card className="w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h3 className="text-xl font-bold flex items-center gap-2"><AlertTriangle className="text-orange-500" /> Duplicates Found</h3>
          <button onClick={onClose}><X /></button>
        </div>
        <div className="overflow-y-auto flex-1 space-y-4 p-2">
          {duplicates.map((group, i) => (
            <div key={i} className="border rounded-lg overflow-hidden">
              <div className="bg-orange-50 px-4 py-2 text-xs font-bold text-orange-800 uppercase tracking-widest">{group.key}</div>
              {group.items.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-3 border-t">
                  <input type="checkbox" checked={selectedToDelete.has(p.id)} onChange={() => toggleSelection(p.id)} />
                  <div className="text-sm font-bold">{p.name} (${p.salesPriceUSD})</div>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t flex justify-end gap-2">
          <Button onClick={handleAutoSelect} variant="secondary">Auto-Select</Button>
          <Button onClick={handleResolve} variant="danger">Delete Selected ({selectedToDelete.size})</Button>
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
    kW_DHW_Nominal: 0, COP_DHW: 3.8, kW_Cooling_Nominal: 0, Cooling_EER_Range: '', SCOP_DHW_Avg: 3.51,
    Rated_Power_Input: 0, Max_Running_Current: 0, Sound_Power_Level: 0, Outdoor_Air_Temp_Range: '',
    Power_Supply: '380/420 V-50/60 Hz-3 ph', Recommended_Breaker: '', Refrigerant: 'R290',
    Refrigerant_Charge: '150g', Rated_Water_Pressure: '0.7 MPa', Evaporating_Temp_Nominal: '',
    Ambient_Temp_Nominal: '', Suction_Connection: '', Liquid_Connection: '', Suitable_Compressor: '',
    Type_of_Oil: '', Receiver_Volume: '', Fan_Details: '', Air_Flow: '', Certificates: '',
    max_temp_c: 75, isReversible: true, Unit_Dimensions: '', Net_Weight: 0, Gross_Weight: 0,
    Order_Reference: '', createdAt: null, lastModified: null,
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
    const total = products.length;
    const categories = {};
    products.forEach(p => {
      const cat = p.category || 'Uncategorized';
      categories[cat] = (categories[cat] || 0) + 1;
    });
    return { total, categories };
  }, [products]);

  const categoriesInDropdown = useMemo(() => {
    return Object.keys(stats.categories).sort();
  }, [stats.categories]);

  const filteredProducts = useMemo(() => {
    const term = (searchTerm || '').toLowerCase();
    let list = products || [];
    if (activeFilter !== 'ALL') list = list.filter(p => p.category === activeFilter);
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

  // --- Handlers ---
  const handleEdit = (product) => {
    setIsEditing(true); setEditId(product.id);
    setFormData({ ...defaultFormData, ...product, id: product.id });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddNew = () => {
    setIsEditing(true); setEditId(null);
    setFormData({ ...defaultFormData, id: `prod_${Date.now()}`, category: 'Heat Pump' });
  };

  const handleSave = async () => {
    if (!user || !formData.name || Number(formData.salesPriceUSD) <= 0) {
      alert("Provide Name and Price > 0"); return;
    }
    try {
      const normalizedName = ensureHpInName(formData);
      const safeId = editId || makeSafeId(formData.id || normalizedName || `prod_${Date.now()}`);
      const productData = { ...formData, name: normalizedName, lastModified: serverTimestamp() };
      if (!editId) productData.createdAt = serverTimestamp();
      delete productData.id;
      await setDoc(doc(db, "users", user.uid, "products", safeId), productData, { merge: true });
      setIsEditing(false); setEditId(null); alert("Saved!");
    } catch (e) { alert("Save error: " + e.message); }
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
    if (!list.length) return alert("Nothing selected.");
    const csv = Papa.unparse(list);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `karnot_export_${all ? 'all' : 'selected'}.csv`;
    link.click();
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: async (results) => {
        const batch = writeBatch(db);
        results.data.forEach(row => {
          const name = row['Product Name'] || row['name'];
          if (!name) return;
          const safeId = makeSafeId(row['System ID'] || row['id'] || name);
          const data = { ...row, lastModified: serverTimestamp() };
          if (!products.find(p => p.id === safeId)) data.createdAt = serverTimestamp();
          batch.set(doc(db, "users", user.uid, "products", safeId), data, { merge: true });
        });
        await batch.commit(); setIsImporting(false); alert("Import Complete.");
      }
    });
  };

  const handleSelectAll = () => {
    const allVisibleIds = filteredProducts.map(p => p.id);
    const allSelected = allVisibleIds.length > 0 && allVisibleIds.every(id => selectedIds.has(id));
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(allVisibleIds));
  };

  const handleBulkDelete = async () => {
    if (!user) return;
    if (!window.confirm(`Delete ${selectedIds.size} products?`)) return;
    const batch = writeBatch(db);
    selectedIds.forEach(id => batch.delete(doc(db, "users", user.uid, "products", id)));
    await batch.commit(); setSelectedIds(new Set()); alert("Deleted.");
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

  const handleCancel = () => { setIsEditing(false); setEditId(null); };

  if (loading) return <div className="p-8 text-center font-bold">Connecting to Inventory...</div>;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 pb-32">
      {showDuplicateModal && (
        <DuplicateResolverModal duplicates={duplicateGroups} onClose={() => setShowDuplicateModal(false)} onResolve={handleResolveDuplicates} />
      )}

      {/* --- Optimized Quick Stats Grid (2 rows of clean boxes) --- */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
        <StatBadge
          icon={Package} label="Total Assets" count={stats.total} total={stats.total} color="gray"
          active={activeFilter === 'ALL'} onClick={() => setActiveFilter('ALL')}
        />
        {Object.entries(CATEGORY_MAP).filter(([label]) => label !== 'Uncategorized').map(([label, config]) => (
          <StatBadge
            key={label} icon={config.icon} label={label} count={stats.categories[label] || 0} total={stats.total}
            color={config.color} active={activeFilter === label} onClick={() => setActiveFilter(label)}
          />
        ))}
      </div>

      {/* --- Search & Action Header --- */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-col lg:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text" placeholder="Search product name, SKU or specs..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500"
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <div className="relative">
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2.5 bg-gray-100 border-none rounded-xl font-bold text-xs uppercase tracking-wider focus:ring-2 focus:ring-orange-500 cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {categoriesInDropdown.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
          </div>

          <Button onClick={handleImportClick} variant="secondary" className="!py-2.5 text-xs"><Upload size={14} className="mr-2"/> Import</Button>
          <Button onClick={() => handleBulkExport(true)} variant="secondary" className="!py-2.5 text-xs"><Download size={14} className="mr-2"/> Export All</Button>
          <Button onClick={handleAddNew} variant="primary" className="!py-2.5 text-xs"><Plus size={14} className="mr-2"/> New Product</Button>
          <Button onClick={handleDeleteAll} variant="danger" className="!py-2.5 text-xs px-2"><Trash2 size={14}/></Button>
        </div>
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />

      {/* --- EDITOR FORM (With Category Dropdown) --- */}
      {isEditing && (
        <Card className="bg-orange-50 border-orange-200 mb-8 animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-6">
             <h4 className="font-black text-xl text-orange-800 uppercase tracking-tight">{editId ? 'Edit Asset' : 'New Asset Entry'}</h4>
             <button onClick={handleCancel} className="p-2 hover:bg-orange-100 rounded-full text-orange-800"><X/></button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 border-b pb-4">
            <div className="md:col-span-2">
              <Input label="Product Name" value={formData.name} onChange={handleInputChange('name')} />
              <Input label="Order Reference / SKU" value={formData.Order_Reference} onChange={handleInputChange('Order_Reference')} />
            </div>

            {/* --- PRESET CATEGORY DROPDOWN --- */}
            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-orange-700 uppercase tracking-widest">Category</label>
                <select 
                    className="w-full p-2.5 border border-orange-200 rounded-lg bg-white focus:ring-2 focus:ring-orange-500 text-sm font-bold"
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

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
             <Input label="Sales Price (USD)" type="number" value={formData.salesPriceUSD} onChange={handleInputChange('salesPriceUSD')} />
             <Input label="Cost Price (USD)" type="number" value={formData.costPriceUSD} onChange={handleInputChange('costPriceUSD')} />
             <Input label="Heating (kW)" type="number" value={formData.kW_DHW_Nominal} onChange={handleInputChange('kW_DHW_Nominal')} />
             <Input label="Cooling (kW)" type="number" value={formData.kW_Cooling_Nominal} onChange={handleInputChange('kW_Cooling_Nominal')} />
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-orange-200">
            <Button onClick={handleCancel} variant="secondary">Discard</Button>
            <Button onClick={handleSave} variant="success" className="px-8 font-bold"><Save size={18} className="mr-2" /> Commit to Inventory</Button>
          </div>
        </Card>
      )}

      {/* --- TABLE LIST --- */}
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50/50">
            <tr>
              <th className="px-6 py-4 w-10">
                <input type="checkbox" checked={filteredProducts.length > 0 && selectedIds.size === filteredProducts.length} onChange={handleSelectAll} className="rounded text-orange-600 focus:ring-orange-500" />
              </th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Product Details</th>
              <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Power</th>
              <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Price (USD)</th>
              <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-50">
            {Object.keys(groupedProducts).sort().map(groupKey => (
              <React.Fragment key={groupKey}>
                <tr className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm border-y border-slate-100">
                  <td colSpan="5" className="px-6 py-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
                    🔌 Power: {groupKey}
                  </td>
                </tr>
                {groupedProducts[groupKey].map((p) => (
                  <tr key={p.id} className={`group hover:bg-orange-50/30 ${selectedIds.has(p.id) ? 'bg-orange-50/50' : ''}`}>
                    <td className="px-6 py-4"><input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelection(p.id)} className="rounded text-orange-600" /></td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-black text-gray-900 leading-tight">{p.name}</div>
                      <div className="text-[10px] text-gray-400 mt-1 font-bold uppercase tracking-wider">{p.category} • {p.Refrigerant || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm font-black text-gray-700">{p.kW_DHW_Nominal ? `${p.kW_DHW_Nominal} kW` : '-'}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm font-black text-orange-600">${p.salesPriceUSD?.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => handleEdit(p)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit size={16}/></button>
                        <button onClick={() => handleDelete(p.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- Floating Selection Bar --- */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 z-40 animate-in slide-in-from-bottom-8">
          <span className="text-sm font-bold">{selectedIds.size} Selected</span>
          <div className="h-8 w-px bg-gray-700" />
          <div className="flex gap-2">
            <Button onClick={() => handleBulkExport(false)} variant="success" className="!py-2 !px-4 text-xs font-black">EXPORT CSV</Button>
            <Button onClick={handleBulkDelete} variant="danger" className="!py-2 !px-4 text-xs font-black">DELETE</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManager;
