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
  Wind,
  Battery,
  Image as ImageIcon,
  FileText // Added for certificate icon
} from 'lucide-react';
import { Card, Button, Input, Checkbox, Textarea } from '../data/constants';

const PASSWORD = "Edmund18931!"; // SECURITY CONSTANT

// --- Default Category Icons and Colors for Stat Badges ---
const CATEGORY_MAP = {
  'iHEAT': { icon: Thermometer, color: 'orange' },
  'iSTOR Storage (non-PCM)': { icon: Package, color: 'teal' },
  'iSPA': { icon: Sun, color: 'blue' },
  'iMESH': { icon: Box, color: 'purple' },
  'iCOOL': { icon: Box, color: 'purple' },
  'Other Products Miscellaneous': { icon: Filter, color: 'pink' },

  // ✅ iZONE / Fan Coil families (optional categories you may use)
  'iZONE': { icon: Wind, color: 'blue' },


  // ✅ iVOLT categories
  'iVOLT – Solar Panel': { icon: Sun, color: 'yellow' },
  'iVOLT – Inverter': { icon: Zap, color: 'purple' },
  'iVOLT – Battery': { icon: Battery, color: 'green' },

  'Uncategorized': { icon: Package, color: 'gray' },
};

// ----------------------------------------------------------------------
// ✅ HELPERS: HP + Name Normalization
// ----------------------------------------------------------------------

// Panasonic iCOOL customers look for HP in name.
// For your Panasonic range: 2HP / 4HP / 10HP. We infer from nominal capacity.
// Rule: pick cooling kW first, else DHW kW.
const hpFromKW = (kw) => {
  const v = parseFloat(kw);
  if (!isFinite(v) || v <= 0) return '';
  if (v <= 5.5) return '2HP';
  if (v <= 9.5) return '4HP';
  return '10HP';
};

// If category is iCOOL (or product name contains iCOOL), ensure name includes "2HP/4HP/10HP".
const ensureHpInName = (productLike) => {
  const category = (productLike?.category || '').toLowerCase();
  const name = String(productLike?.name || '');
  const looksLikeICool = category.includes('icool') || name.toLowerCase().includes('icool');

  if (!looksLikeICool) return name;

  // Already has HP marker?
  if (/\b(2|4|5|7|10|12|15)\s*hp\b/i.test(name)) return name;

  const baseKW = productLike?.kW_Cooling_Nominal || productLike?.kW_DHW_Nominal || 0;
  const hp = hpFromKW(baseKW);

  // If no hp can be inferred, do not mutate the name
  if (!hp) return name;

  // Prefer: "Karnot iCOOL 4HP ..." format
  if (/karnot\s+icool/i.test(name)) {
    return name.replace(/(karnot\s+icool)\b/i, `$1 ${hp}`);
  }

  // Otherwise prepend
  return `Karnot iCOOL ${hp} ${name}`.replace(/\s+/g, ' ').trim();
};

// Utility for safe Firestore IDs
const makeSafeId = (s) =>
  String(s || '')
    .trim()
    .replace(/[\s/]+/g, '_')
    .replace(/[^\w.-]+/g, '_')
    .toLowerCase();

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
    if (count > 0) alert(`Auto-selected ${count} duplicates for deletion.`);
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
            <AlertTriangle className="text-orange-500" />
            {duplicates.length} Duplicate Product Groups Found
          </h3>
          <button onClick={onClose}><X /></button>
        </div>

        <div className="bg-gray-50 p-3 rounded mb-4 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Select records to <span className="text-red-600 font-bold">DELETE</span>. Unchecked items stay safe.
          </p>
          <Button onClick={handleAutoSelect} variant="secondary" className="text-sm">
            <CheckSquare size={14} className="mr-2 text-purple-600" />
            Auto-Select Duplicates
          </Button>
        </div>

        <div className="overflow-y-auto flex-1 space-y-6 p-2">
          {duplicates.map((group, groupIndex) => (
            <div key={groupIndex} className="border border-orange-200 rounded-lg overflow-hidden">
              <div className="bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-800 flex justify-between">
                <span>Conflict: {group.key}</span>
                <span className="text-xs uppercase tracking-wider bg-white px-2 py-0.5 rounded">
                  Group {groupIndex + 1}
                </span>
              </div>

              <div className="divide-y divide-gray-100">
                {group.items.map(product => (
                  <div
                    key={product.id}
                    className={`flex items-center justify-between p-3 ${selectedToDelete.has(product.id) ? 'bg-red-50' : 'bg-white'}`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedToDelete.has(product.id)}
                        onChange={() => toggleSelection(product.id)}
                        className="w-5 h-5 text-red-600 rounded border-gray-300 focus:ring-red-500"
                      />
                      <div>
                        <p className="font-bold text-gray-800">
                          {product.name} (${product.salesPriceUSD?.toLocaleString()})
                        </p>
                        <p className="text-xs text-gray-500">
                          {product.category} • kW: {product.kW_DHW_Nominal}
                        </p>
                      </div>
                    </div>
                    {selectedToDelete.has(product.id) && (
                      <span className="text-xs font-bold text-red-600">Marked for Delete</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t flex justify-end gap-2">
          <Button onClick={onClose} variant="secondary">Cancel</Button>
          <Button onClick={handleResolve} variant="danger" disabled={selectedToDelete.size === 0}>
            <Trash2 className="mr-2" size={16} /> Delete Selected ({selectedToDelete.size})
          </Button>
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
    id: '',
    name: '',
    category: 'Heat Pump',
    costPriceUSD: 0,
    salesPriceUSD: 0,
    specs: '',
    kW_DHW_Nominal: 0,
    COP_DHW: 3.8,
    kW_Cooling_Nominal: 0,
    Cooling_EER_Range: '',
    SCOP_DHW_Avg: 3.51,
    Rated_Power_Input: 0,
    Max_Running_Current: 0,
    Sound_Power_Level: 0,
    Outdoor_Air_Temp_Range: '',
    Power_Supply: '380/420 V-50/60 Hz-3 ph',
    Recommended_Breaker: '',
    Refrigerant: 'R290',
    Refrigerant_Charge: '150g',
    Rated_Water_Pressure: '0.7 MPa',
    Evaporating_Temp_Nominal: '',
    Ambient_Temp_Nominal: '',
    Suction_Connection: '',
    Liquid_Connection: '',
    Suitable_Compressor: '',
    Type_of_Oil: '',
    Receiver_Volume: '',
    Fan_Details: '',
    Air_Flow: '',
    Certificates: '',
    Certificate_Detail: '',
    Image_URL: '',

    max_temp_c: 75,
    isReversible: true,
    Unit_Dimensions: '',
    Net_Weight: 0,
    Gross_Weight: 0,
    Order_Reference: '',
    createdAt: null,
    lastModified: null,

    // ✅ FAN COIL FIELDS:
    coilType: '',
    mountingType: '',
    kW_Heating_Nominal: 0,
    Airflow_H_m3h: 0,
    Airflow_M_m3h: 0,
    Airflow_L_m3h: 0,
    Noise_H_dBA: 0,
    Noise_M_dBA: 0,
    Noise_L_dBA: 0,
    PowerInput_W: 0,
    WaterConnection: '',
    DrainConnection: '',
    WaterFlow_Cooling_m3h: 0,
    WaterFlow_Heating_m3h: 0,

    // ✅ iVOLT: SOLAR PANEL FIELDS
    pv_Watt_Rated: 0,
    pv_Cell_Type: '',
    pv_Efficiency_pct: 0,
    pv_Voc_V: 0,
    pv_Vmp_V: 0,
    pv_Isc_A: 0,
    pv_Imp_A: 0,
    pv_Dimensions_mm: '',
    pv_Weight_kg: 0,
    pv_Warranty_years: 0,

    // ✅ iVOLT: INVERTER FIELDS
    inv_kW_Rated: 0,
    inv_Phase: '',
    inv_MPPT_Count: 0,
    inv_Max_PV_Input_kW: 0,
    inv_Max_PV_Voltage_V: 0,
    inv_Battery_Compatible: false,
    inv_Warranty_years: 0,

    // ✅ iVOLT: BATTERY FIELDS
    bat_kWh_Nominal: 0,
    bat_Chemistry: 'LFP',
    bat_Voltage_V: 0,
    bat_Ah: 0,
    bat_DoD_pct: 0,
    bat_Cycle_Life: 0,
    bat_Max_Discharge_kW: 0,
    bat_Warranty_years: 0,
  };

  const [formData, setFormData] = useState(defaultFormData);

  // Handle null user state to prevent stuck loading
  useEffect(() => {
    if (!user) {
      setLoading(false);
      setProducts([]);
      return;
    }

    const unsub = onSnapshot(collection(db, "users", user.uid, "products"), (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort(
        (a, b) =>
          (a.category || '').localeCompare(b.category || '') ||
          (a.name || '').localeCompare(b.name || '')
      );
      setProducts(list);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  // --- MEMO: stats ---
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

  const categoriesToShow = useMemo(() => {
    const productCategories = Object.keys(stats.categories).filter(c => c !== 'Uncategorized').sort();
    const predefinedCategories = Object.keys(CATEGORY_MAP).filter(c => c !== 'Uncategorized');
    const combined = new Set([...predefinedCategories, ...productCategories]);
    return Array.from(combined).sort();
  }, [stats.categories]);

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

  const groupedProducts = useMemo(() => {
    if (!filteredProducts) return {};
    return filteredProducts.reduce((acc, product) => {
      const key = product.Power_Supply || 'N/A';
      if (!acc[key]) acc[key] = [];
      acc[key].push(product);
      return acc;
    }, {});
  }, [filteredProducts]);

  if (loading) return <div className="p-4 text-center">Loading Products...</div>;

  // ----------------------------------------------------------------------
  // --- CRUD and UI Handlers ---
  // ----------------------------------------------------------------------

  const handleEdit = (product) => {
    setIsEditing(true);
    setEditId(product.id);

    setFormData({
      ...defaultFormData,
      ...product,
      id: product.id,
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

      Certificate_Detail: product.Certificate_Detail || '',
      Image_URL: product.Image_URL || '',

      kW_Heating_Nominal: parseFloat(product.kW_Heating_Nominal || 0),
      Airflow_H_m3h: parseFloat(product.Airflow_H_m3h || 0),
      Airflow_M_m3h: parseFloat(product.Airflow_M_m3h || 0),
      Airflow_L_m3h: parseFloat(product.Airflow_L_m3h || 0),
      Noise_H_dBA: parseFloat(product.Noise_H_dBA || 0),
      Noise_M_dBA: parseFloat(product.Noise_M_dBA || 0),
      Noise_L_dBA: parseFloat(product.Noise_L_dBA || 0),
      PowerInput_W: parseFloat(product.PowerInput_W || 0),
      WaterFlow_Cooling_m3h: parseFloat(product.WaterFlow_Cooling_m3h || 0),
      WaterFlow_Heating_m3h: parseFloat(product.WaterFlow_Heating_m3h || 0),

      pv_Watt_Rated: parseFloat(product.pv_Watt_Rated || 0),
      pv_Efficiency_pct: parseFloat(product.pv_Efficiency_pct || 0),
      pv_Voc_V: parseFloat(product.pv_Voc_V || 0),
      pv_Vmp_V: parseFloat(product.pv_Vmp_V || 0),
      pv_Isc_A: parseFloat(product.pv_Isc_A || 0),
      pv_Imp_A: parseFloat(product.pv_Imp_A || 0),
      pv_Weight_kg: parseFloat(product.pv_Weight_kg || 0),
      pv_Warranty_years: parseFloat(product.pv_Warranty_years || 0),

      inv_kW_Rated: parseFloat(product.inv_kW_Rated || 0),
      inv_MPPT_Count: parseFloat(product.inv_MPPT_Count || 0),
      inv_Max_PV_Input_kW: parseFloat(product.inv_Max_PV_Input_kW || 0),
      inv_Max_PV_Voltage_V: parseFloat(product.inv_Max_PV_Voltage_V || 0),
      inv_Warranty_years: parseFloat(product.inv_Warranty_years || 0),
      inv_Battery_Compatible: product.inv_Battery_Compatible === true || String(product.inv_Battery_Compatible).toLowerCase() === 'true',

      bat_kWh_Nominal: parseFloat(product.bat_kWh_Nominal || 0),
      bat_Voltage_V: parseFloat(product.bat_Voltage_V || 0),
      bat_Ah: parseFloat(product.bat_Ah || 0),
      bat_DoD_pct: parseFloat(product.bat_DoD_pct || 0),
      bat_Cycle_Life: parseFloat(product.bat_Cycle_Life || 0),
      bat_Max_Discharge_kW: parseFloat(product.bat_Max_Discharge_kW || 0),
      bat_Warranty_years: parseFloat(product.bat_Warranty_years || 0),
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddNew = () => {
    setIsEditing(true);
    setEditId(null);
    setFormData({
      ...defaultFormData,
      id: `prod_${Date.now()}`,
      createdAt: null,
      lastModified: null,
    });
  };

  // ✅ OPTION 2: Smart ID Update with Auto-Migration
  const handleSave = async () => {
    if (!user) return;

    if (!formData.name || Number(formData.salesPriceUSD) <= 0) {
      alert("Please provide Name and a Sales Price greater than 0.");
      return;
    }

    try {
      const normalizedName = ensureHpInName(formData);
      const newSafeId = makeSafeId(formData.id || normalizedName || `prod_${Date.now()}`);

      const productData = {
        ...formData,
        name: normalizedName,
        lastModified: serverTimestamp(),
      };

      if (!editId) {
        productData.createdAt = serverTimestamp();
      }

      delete productData.id;

      // ✅ Check if ID changed during edit
      if (editId && editId !== newSafeId) {
        const confirmMigration = window.confirm(
          `⚠️ You're changing the System ID from:\n"${editId}"\n\nto:\n"${newSafeId}"\n\nThis will:\n1. Create a new product with the new ID\n2. Delete the old product\n\nContinue?`
        );

        if (!confirmMigration) return;

        // Create new document
        await setDoc(doc(db, "users", user.uid, "products", newSafeId), productData);
        
        // Delete old document
        await deleteDoc(doc(db, "users", user.uid, "products", editId));
        
        alert(`✅ Product migrated successfully!\n\nOld ID: ${editId}\nNew ID: ${newSafeId}`);
      } else {
        // Normal save (no ID change)
        await setDoc(doc(db, "users", user.uid, "products", newSafeId), productData, { merge: true });
        alert("Product Saved!");
      }

      setIsEditing(false);
      setEditId(null);
    } catch (error) {
      console.error("Error saving:", error);
      alert("Failed to save product: " + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!user) return;
    if (window.confirm("Are you sure you want to delete this product? This cannot be undone.")) {
      try {
        await deleteDoc(doc(db, "users", user.uid, "products", id));
      } catch (error) {
        console.error("Error deleting:", error);
        alert("Failed to delete product.");
      }
    }
  };

  // Securely delete all products
  const handleDeleteAll = async () => {
    if (!user) return;

    const confirmedPassword = prompt("WARNING! This will permanently delete ALL products. Enter the security password to proceed:");
    if (confirmedPassword !== PASSWORD) {
      alert("Incorrect password or operation cancelled.");
      return;
    }

    if (!window.confirm(`FINAL CONFIRMATION: Are you absolutely sure you want to delete ALL ${products.length} products? This cannot be undone.`)) {
      return;
    }

    const batch = writeBatch(db);
    products.forEach(p => {
      const ref = doc(db, "users", user.uid, "products", p.id);
      batch.delete(ref);
    });

    try {
      await batch.commit();
      alert("SUCCESS: All products have been deleted.");
    } catch (error) {
      console.error("Error deleting all products:", error);
      alert("Failed to delete all products.");
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
      'Sound_Power_Level', 'Net_Weight', 'Gross_Weight',

      'kW_Heating_Nominal', 'Airflow_H_m3h', 'Airflow_M_m3h', 'Airflow_L_m3h',
      'Noise_H_dBA', 'Noise_M_dBA', 'Noise_L_dBA', 'PowerInput_W',
      'WaterFlow_Cooling_m3h', 'WaterFlow_Heating_m3h',

      'pv_Watt_Rated', 'pv_Efficiency_pct', 'pv_Voc_V', 'pv_Vmp_V', 'pv_Isc_A', 'pv_Imp_A', 'pv_Weight_kg', 'pv_Warranty_years',
      'inv_kW_Rated', 'inv_MPPT_Count', 'inv_Max_PV_Input_kW', 'inv_Max_PV_Voltage_V', 'inv_Warranty_years',
      'bat_kWh_Nominal', 'bat_Voltage_V', 'bat_Ah', 'bat_DoD_pct', 'bat_Cycle_Life', 'bat_Max_Discharge_kW', 'bat_Warranty_years'
    ].includes(field);

    let finalValue = value;
    if (isNumeric) finalValue = value === '' ? 0 : parseFloat(value);

    setFormData(prev => ({ ...prev, [field]: finalValue }));
  };

  const handleCancel = () => { setIsEditing(false); setEditId(null); };
  const handleSearchChange = (e) => { setSearchTerm(e.target.value); };

  const handleCategoryFilter = (category) => {
    setActiveFilter(activeFilter === category ? 'ALL' : category);
  };

  const handleScanForDuplicates = () => {
    const groups = {};
    products.forEach(p => {
      const key = (p.name || '').toLowerCase().trim();
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });

    const conflicts = Object.keys(groups)
      .filter(key => groups[key].length > 1 && key !== '')
      .map(key => ({ key, items: groups[key] }));

    if (conflicts.length > 0) {
      setDuplicateGroups(conflicts);
      setShowDuplicateModal(true);
    } else {
      alert("No duplicates found based on Product Name.");
    }
  };

  const handleResolveDuplicates = async (idsToDelete) => {
    if (!user) return;
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
    } catch (err) {
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
    const allSelected = allVisibleIds.length > 0 && allVisibleIds.every(id => selectedIds.has(id));
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(allVisibleIds));
  };

  const handleBulkDelete = async () => {
    if (!user) return;
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

  const handleBulkExport = (exportAll = false) => {
    const productsToExport = exportAll
      ? products
      : products.filter(p => selectedIds.has(p.id));

    if (productsToExport.length === 0) return alert("Select products or use the Export ALL option.");

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
      "Certificate_Detail": p.Certificate_Detail,
      "Image_URL": p.Image_URL,

      "Net Weight": p.Net_Weight,
      "Gross Weight": p.Gross_Weight,
      "Unit Dimensions": p.Unit_Dimensions,
      "Order Reference": p.Order_Reference,
      "Specs": p.specs,

      "Coil Type": p.coilType,
      "Mounting Type": p.mountingType,
      "kW_Heating_Nominal": p.kW_Heating_Nominal,
      "Airflow_H_m3h": p.Airflow_H_m3h,
      "Airflow_M_m3h": p.Airflow_M_m3h,
      "Airflow_L_m3h": p.Airflow_L_m3h,
      "Noise_H_dBA": p.Noise_H_dBA,
      "Noise_M_dBA": p.Noise_M_dBA,
      "Noise_L_dBA": p.Noise_L_dBA,
      "PowerInput_W": p.PowerInput_W,
      "WaterConnection": p.WaterConnection,
      "DrainConnection": p.DrainConnection,
      "WaterFlow_Cooling_m3h": p.WaterFlow_Cooling_m3h,
      "WaterFlow_Heating_m3h": p.WaterFlow_Heating_m3h,

      "pv_Watt_Rated": p.pv_Watt_Rated,
      "pv_Cell_Type": p.pv_Cell_Type,
      "pv_Efficiency_pct": p.pv_Efficiency_pct,
      "pv_Voc_V": p.pv_Voc_V,
      "pv_Vmp_V": p.pv_Vmp_V,
      "pv_Isc_A": p.pv_Isc_A,
      "pv_Imp_A": p.pv_Imp_A,
      "pv_Dimensions_mm": p.pv_Dimensions_mm,
      "pv_Weight_kg": p.pv_Weight_kg,
      "pv_Warranty_years": p.pv_Warranty_years,

      "inv_kW_Rated": p.inv_kW_Rated,
      "inv_Phase": p.inv_Phase,
      "inv_MPPT_Count": p.inv_MPPT_Count,
      "inv_Max_PV_Input_kW": p.inv_Max_PV_Input_kW,
      "inv_Max_PV_Voltage_V": p.inv_Max_PV_Voltage_V,
      "inv_Battery_Compatible": p.inv_Battery_Compatible,
      "inv_Warranty_years": p.inv_Warranty_years,

      "bat_kWh_Nominal": p.bat_kWh_Nominal,
      "bat_Chemistry": p.bat_Chemistry,
      "bat_Voltage_V": p.bat_Voltage_V,
      "bat_Ah": p.bat_Ah,
      "bat_DoD_pct": p.bat_DoD_pct,
      "bat_Cycle_Life": p.bat_Cycle_Life,
      "bat_Max_Discharge_kW": p.bat_Max_Discharge_kW,
      "bat_Warranty_years": p.bat_Warranty_years,
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `karnot_products_export_${exportAll ? 'ALL' : 'SELECTED'}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    if (!user) return;

    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const dataRows = results.data || [];
        const batch = writeBatch(db);
        let updatedCount = 0;
        let createdCount = 0;
        let skippedCount = 0;

        const productsRef = collection(db, "users", user.uid, "products");

        const fieldMappings = {
          'system id': 'id',
          'product name': 'name',
          'category': 'category',
          'sales price': 'salesPriceUSD',
          'cost price': 'costPriceUSD',
          'kw_dhw_nominal': 'kW_DHW_Nominal',
          'kw_cooling_nominal': 'kW_Cooling_Nominal',
          'cop_dhw': 'COP_DHW',
          'scop_dhw_avg': 'SCOP_DHW_Avg',
          'max temp': 'max_temp_c',
          'refrigerant': 'Refrigerant',
          'power supply': 'Power_Supply',
          'rated power input': 'Rated_Power_Input',
          'max running current': 'Max_Running_Current',
          'sound power level': 'Sound_Power_Level',
          'outdoor air temp range': 'Outdoor_Air_Temp_Range',
          'recommended breaker': 'Recommended_Breaker',
          'refrigerant charge': 'Refrigerant_Charge',
          'rated water pressure': 'Rated_Water_Pressure',
          'evaporating temp nominal': 'Evaporating_Temp_Nominal',
          'ambient temp nominal': 'Ambient_Temp_Nominal',
          'suction connection': 'Suction_Connection',
          'liquid connection': 'Liquid_Connection',
          'suitable compressor': 'Suitable_Compressor',
          'type of oil': 'Type_of_Oil',
          'receiver volume': 'Receiver_Volume',
          'fan details': 'Fan_Details',
          'air flow': 'Air_Flow',
          'certificates': 'Certificates',
          'certificate detail': 'Certificate_Detail',
          'certificate_detail': 'Certificate_Detail',
          'image url': 'Image_URL',
          'image_url': 'Image_URL',

          'net weight': 'Net_Weight',
          'gross weight': 'Gross_Weight',
          'unit dimensions': 'Unit_Dimensions',
          'order reference': 'Order_Reference',
          'specs': 'specs',

          'coiltype': 'coilType',
          'coil type': 'coilType',
          'mountingtype': 'mountingType',
          'mounting type': 'mountingType',
          'kw_heating_nominal': 'kW_Heating_Nominal',
          'coolingcapacity_h_w': 'CoolingCapacity_H_W',
          'heatingcapacity_h_w': 'HeatingCapacity_H_W',
          'airflow_h_m3h': 'Airflow_H_m3h',
          'airflow_m_m3h': 'Airflow_M_m3h',
          'airflow_l_m3h': 'Airflow_L_m3h',
          'noise_h_dba': 'Noise_H_dBA',
          'noise_m_dba': 'Noise_M_dBA',
          'noise_l_dba': 'Noise_L_dBA',
          'powerinput_w': 'PowerInput_W',
          'waterflow_cooling_m3h': 'WaterFlow_Cooling_m3h',
          'waterflow_heating_m3h': 'WaterFlow_Heating_m3h',
          'waterpressuredrop_cooling_kpa': 'WaterPressureDrop_Cooling_kPa',
          'waterpressuredrop_heating_kpa': 'WaterPressureDrop_Heating_kPa',
          'waterconnection': 'WaterConnection',
          'drainconnection': 'DrainConnection',

          'pv_watt_rated': 'pv_Watt_Rated',
          'pv_cell_type': 'pv_Cell_Type',
          'pv_efficiency_pct': 'pv_Efficiency_pct',
          'pv_voc_v': 'pv_Voc_V',
          'pv_vmp_v': 'pv_Vmp_V',
          'pv_isc_a': 'pv_Isc_A',
          'pv_imp_a': 'pv_Imp_A',
          'pv_dimensions_mm': 'pv_Dimensions_mm',
          'pv_weight_kg': 'pv_Weight_kg',
          'pv_warranty_years': 'pv_Warranty_years',

          'inv_kw_rated': 'inv_kW_Rated',
          'inv_phase': 'inv_Phase',
          'inv_mppt_count': 'inv_MPPT_Count',
          'inv_max_pv_input_kw': 'inv_Max_PV_Input_kW',
          'inv_max_pv_voltage_v': 'inv_Max_PV_Voltage_V',
          'inv_battery_compatible': 'inv_Battery_Compatible',
          'inv_warranty_years': 'inv_Warranty_years',

          'bat_kwh_nominal': 'bat_kWh_Nominal',
          'bat_chemistry': 'bat_Chemistry',
          'bat_voltage_v': 'bat_Voltage_V',
          'bat_ah': 'bat_Ah',
          'bat_dod_pct': 'bat_DoD_pct',
          'bat_cycle_life': 'bat_Cycle_Life',
          'bat_max_discharge_kw': 'bat_Max_Discharge_kW',
          'bat_warranty_years': 'bat_Warranty_years',
        };

        const numericFields = [
          'salesPriceUSD', 'costPriceUSD', 'kW_DHW_Nominal', 'kW_Cooling_Nominal',
          'COP_DHW', 'SCOP_DHW_Avg', 'max_temp_c', 'Rated_Power_Input', 'Max_Running_Current',
          'Sound_Power_Level', 'Net_Weight', 'Gross_Weight',

          'kW_Heating_Nominal', 'Airflow_H_m3h', 'Airflow_M_m3h', 'Airflow_L_m3h',
          'Noise_H_dBA', 'Noise_M_dBA', 'Noise_L_dBA', 'PowerInput_W',
          'WaterFlow_Cooling_m3h', 'WaterFlow_Heating_m3h',

          'pv_Watt_Rated', 'pv_Efficiency_pct', 'pv_Voc_V', 'pv_Vmp_V', 'pv_Isc_A', 'pv_Imp_A', 'pv_Weight_kg', 'pv_Warranty_years',
          'inv_kW_Rated', 'inv_MPPT_Count', 'inv_Max_PV_Input_kW', 'inv_Max_PV_Voltage_V', 'inv_Warranty_years',
          'bat_kWh_Nominal', 'bat_Voltage_V', 'bat_Ah', 'bat_DoD_pct', 'bat_Cycle_Life', 'bat_Max_Discharge_kW', 'bat_Warranty_years',
        ];

        const booleanFields = [
          'inv_Battery_Compatible',
        ];

        const parseBoolean = (raw) => {
          const s = String(raw ?? '').trim().toLowerCase();
          if (s === 'true' || s === 'yes' || s === '1' || s === 'y') return true;
          if (s === 'false' || s === 'no' || s === '0' || s === 'n') return false;
          return false;
        };

        dataRows.forEach(row => {
          const csvSystemId = (row['System ID'] || row['id'] || '').toString().trim();
          const csvProductName = (row['Product Name'] || row['name'] || '').toString().trim();

          if (!csvSystemId && !csvProductName) {
            skippedCount++;
            return;
          }

          const match =
            (csvSystemId ? products.find(p => p.id === csvSystemId) : null) ||
            (csvProductName ? products.find(p => (p.name || '').toLowerCase().trim() === csvProductName.toLowerCase().trim()) : null);

          const buildDataFromRow = () => {
            const data = { lastModified: serverTimestamp() };

            Object.keys(row).forEach(csvHeader => {
              const normalizedHeader = csvHeader.toLowerCase().trim().replace(/\s+/g, ' ');
              const firestoreKey = fieldMappings[normalizedHeader];
              if (!firestoreKey) return;

              const raw = row[csvHeader];
              if (raw === undefined || raw === null) return;

              if (booleanFields.includes(firestoreKey)) {
                data[firestoreKey] = parseBoolean(raw);
                return;
              }

              if (numericFields.includes(firestoreKey)) {
                const parsed = parseFloat(raw);
                if (!isNaN(parsed)) data[firestoreKey] = parsed;
              } else if (String(raw).trim() !== '') {
                data[firestoreKey] = raw;
              }
            });

            if (data.name || data.category || data.kW_Cooling_Nominal || data.kW_DHW_Nominal) {
              data.name = ensureHpInName({
                name: data.name || csvProductName || '',
                category: data.category || row['Category'] || '',
                kW_Cooling_Nominal: data.kW_Cooling_Nominal,
                kW_DHW_Nominal: data.kW_DHW_Nominal
              });
            }

            delete data.id;

            return data;
          };

          if (match) {
            const ref = doc(productsRef, match.id);
            const updateData = buildDataFromRow();

            if (Object.keys(updateData).length > 1) {
              batch.update(ref, updateData);
              updatedCount++;
            } else {
              skippedCount++;
            }
          } else {
            const createData = buildDataFromRow();
            createData.createdAt = serverTimestamp();

            const newDocId = makeSafeId(csvSystemId || createData.name || `prod_${Date.now()}`);
            const ref = doc(productsRef, newDocId);

            batch.set(ref, createData, { merge: true });
            createdCount++;
          }
        });

        try {
          await batch.commit();
          alert(
            `CSV Import Complete!\n✅ Updated: ${updatedCount}\n🆕 Created: ${createdCount}\n⏭️ Skipped: ${skippedCount}`
          );
        } catch (error) {
          console.error("Update/Create Error:", error);
          alert("Failed to update/create products from CSV: " + error.message);
        }

        setIsImporting(false);
        event.target.value = null;
      },
      error: (err) => {
        console.error(err);
        alert("Failed to parse CSV.");
        setIsImporting(false);
      }
    });
  };

  // ----------------------------------------------------------------------
  // --- Final JSX Return ---
  // ----------------------------------------------------------------------
  const catLower = (formData.category || '').toLowerCase();
  const isFanCoil =
    catLower.includes('fan coil') ||
    catLower.includes('izone');

  const isIVOLT = catLower.includes('ivolt');
  const isIVoltPanel = isIVOLT && (catLower.includes('panel') || catLower.includes('solar'));
  const isIVoltInverter = isIVOLT && catLower.includes('inverter');
  const isIVoltBattery = isIVOLT && catLower.includes('battery');

  return (
    <div className="w-full pb-20">
      {showDuplicateModal && (
        <DuplicateResolverModal
          duplicates={duplicateGroups}
          onClose={() => setShowDuplicateModal(false)}
          onResolve={handleResolveDuplicates}
        />
      )}

      <div className="flex flex-wrap gap-4 mb-8 pb-3">
        <StatBadge
          icon={Package}
          label="All Products"
          count={stats.total}
          total={stats.total}
          color="gray"
          active={activeFilter === 'ALL'}
          onClick={() => handleCategoryFilter('ALL')}
        />

        {categoriesToShow.filter(Boolean).map((cat, index) => {
          const map = CATEGORY_MAP[cat] || CATEGORY_MAP['Uncategorized'];
          const dynamicColor = map.color || ['orange', 'blue', 'green', 'purple'][index % 4];

          return (
            <StatBadge
              key={cat}
              icon={map.icon}
              label={cat}
              count={stats.categories[cat] || 0}
              total={stats.total}
              color={dynamicColor}
              active={activeFilter === cat}
              onClick={() => handleCategoryFilter(cat)}
            />
          );
        })}
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-2">
        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          {activeFilter !== 'ALL' && <Filter size={20} className="text-orange-600" />}
          {activeFilter === 'ALL' ? 'All Products' : `${activeFilter} Products`}
          <span className="text-gray-400 font-normal text-base ml-2">({filteredProducts.length})</span>
        </h3>

        <div className="flex gap-2 flex-wrap justify-end w-full md:w-auto">
          <Button onClick={handleImportClick} variant="secondary" disabled={isImporting}>
            <Upload className="mr-2" size={16} /> {isImporting ? 'Importing…' : 'Update via CSV'}
          </Button>

          <Button onClick={() => handleBulkExport(true)} variant="secondary" title="Export ALL products to CSV template">
            <Download className="mr-2" size={16} /> Export ALL CSV
          </Button>

          <Button onClick={handleScanForDuplicates} variant="secondary" title="Find duplicate products">
            <CheckSquare className="mr-2" size={16} /> Dedupe
          </Button>

          {!isEditing && (
            <Button onClick={handleAddNew} variant="primary">
              <Plus size={16} className="mr-2" /> Add New Product
            </Button>
          )}

          <Button onClick={handleDeleteAll} variant="danger" title="DANGER: Permanently delete ALL products (requires password)">
            <Trash2 className="mr-2" size={16} /> DELETE ALL
          </Button>
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv"
        style={{ display: 'none' }}
      />

      {/* --- EDITOR FORM --- */}
      {isEditing && (
        <Card className="bg-orange-50 border-orange-200 mb-6">
          <h4 className="font-bold text-lg mb-4 text-orange-800">
            {editId ? 'Edit Product' : 'New Product'}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 border-b pb-4">
            <div className="md:col-span-2">
              <Input label="Product Name" value={formData.name} onChange={handleInputChange('name')} />
              <Input label="Order Reference / SKU" value={formData.Order_Reference} onChange={handleInputChange('Order_Reference')} />
            </div>

            <Input label="Category" value={formData.category} onChange={handleInputChange('category')} />
            
            {/* ✅ SYSTEM ID NOW ALWAYS EDITABLE */}
            <div>
              <Input 
                label="System ID (Unique)" 
                value={formData.id} 
                onChange={handleInputChange('id')} 
                className={editId ? "border-yellow-400 bg-yellow-50" : ""}
              />
              {editId && (
                <p className="text-xs text-yellow-700 mt-1 font-semibold">
                  ⚠️ Changing ID will migrate product to new ID
                </p>
              )}
            </div>

            <div className="md:col-span-4">
              <Input 
                label="Image URL (For Datasheets)" 
                value={formData.Image_URL} 
                onChange={handleInputChange('Image_URL')} 
                placeholder="https://... (e.g. GitHub raw link)"
                icon={ImageIcon}
              />
            </div>

            <Input label="Sales Price (USD)" type="number" value={formData.salesPriceUSD} onChange={handleInputChange('salesPriceUSD')} />
            <Input label="Cost Price (USD)" type="number" value={formData.costPriceUSD} onChange={handleInputChange('costPriceUSD')} />
          </div>

          <div className="bg-white p-4 rounded-lg border border-orange-200 mb-4">
            <h5 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Zap size={16} /> Power & Efficiency Specs
            </h5>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input label="DHW Heating Power (kW)" type="number" value={formData.kW_DHW_Nominal} onChange={handleInputChange('kW_DHW_Nominal')} />
              <Input label="DHW COP" type="number" value={formData.COP_DHW} onChange={handleInputChange('COP_DHW')} />
              <Input label="SCOP (Avg Climate)" type="number" value={formData.SCOP_DHW_Avg} onChange={handleInputChange('SCOP_DHW_Avg')} />
              <Input label="Max Hot Water Temp (°C)" type="number" value={formData.max_temp_c} onChange={handleInputChange('max_temp_c')} />

              <div className="md:col-span-4 flex items-center mt-2">
                <Checkbox
                  label="Is Reversible (Has Cooling)?"
                  checked={formData.isReversible}
                  onChange={handleInputChange('isReversible')}
                />
              </div>

              {formData.isReversible && (
                <>
                  <Input label="Cooling Power (kW)" type="number" value={formData.kW_Cooling_Nominal} onChange={handleInputChange('kW_Cooling_Nominal')} />
                  <Input label="Cooling EER Range" value={formData.Cooling_EER_Range} onChange={handleInputChange('Cooling_EER_Range')} />
                </>
              )}
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
            <h5 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Plug size={16} /> Refrigeration & Piping Details
            </h5>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input label="Refrigerant" value={formData.Refrigerant} onChange={handleInputChange('Refrigerant')} />
              <Input label="Charge Weight" value={formData.Refrigerant_Charge} onChange={handleInputChange('Refrigerant_Charge')} />
              <Input label="Suction Connection" value={formData.Suction_Connection} onChange={handleInputChange('Suction_Connection')} placeholder='e.g. 3/8"' />
              <Input label="Liquid Connection" value={formData.Liquid_Connection} onChange={handleInputChange('Liquid_Connection')} placeholder='e.g. 1/4"' />

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

          <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
            <h5 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <BarChart3 size={16} /> Electrical & Operating Data
            </h5>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input label="Power Supply" value={formData.Power_Supply} onChange={handleInputChange('Power_Supply')} placeholder="e.g. 380V / 3Ph / 50Hz" />
              <Input label="Rated Power Input (kW)" type="number" value={formData.Rated_Power_Input} onChange={handleInputChange('Rated_Power_Input')} />
              <Input label="Max. Running Current (A)" type="number" value={formData.Max_Running_Current} onChange={handleInputChange('Max_Running_Current')} />
              <Input label="Recommended Breaker (A)" value={formData.Recommended_Breaker} onChange={handleInputChange('Recommended_Breaker')} />

              <Input label="Outdoor Temp Range" value={formData.Outdoor_Air_Temp_Range} onChange={handleInputChange('Outdoor_Air_Temp_Range')} placeholder="e.g. -7 °C to 43 °C" />
              <Input label="Sound Power Level (dB(A))" type="number" value={formData.Sound_Power_Level} onChange={handleInputChange('Sound_Power_Level')} />
              <Input label="Certificates (General)" value={formData.Certificates} onChange={handleInputChange('Certificates')} placeholder="e.g. CE, TUV, RoHS" />
              
              <Input 
                label="Certificate Details (MCS etc)" 
                value={formData.Certificate_Detail} 
                onChange={handleInputChange('Certificate_Detail')} 
                placeholder="e.g. MCS HP0304"
                icon={FileText}
              />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
            <h5 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Ruler size={16} /> Sizing & Weight
            </h5>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input label="Net Dimensions (L×W×H)" value={formData.Unit_Dimensions} onChange={handleInputChange('Unit_Dimensions')} placeholder="e.g. 510 × 1289 × 963 mm" />
              <Input label="Net Weight (kg)" type="number" value={formData.Net_Weight} onChange={handleInputChange('Net_Weight')} />
              <Input label="Gross Weight (kg)" type="number" value={formData.Gross_Weight} onChange={handleInputChange('Gross_Weight')} />
            </div>
          </div>

          {/* ✅ FAN COIL SECTION */}
          {isFanCoil ? (
            <div className="bg-white p-4 rounded-lg border border-blue-200 mb-4">
              <h5 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Wind size={16} className="text-blue-600" /> Fan Coil Specifications
              </h5>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Input
                  label="Coil Type"
                  value={formData.coilType || ''}
                  onChange={handleInputChange('coilType')}
                  placeholder="e.g., 2-pipe, 4-pipe"
                />
                <Input
                  label="Mounting Type"
                  value={formData.mountingType || ''}
                  onChange={handleInputChange('mountingType')}
                  placeholder="e.g., Ceiling, Wall"
                />
                <Input
                  label="Heating Capacity (kW)"
                  type="number"
                  value={formData.kW_Heating_Nominal || 0}
                  onChange={handleInputChange('kW_Heating_Nominal')}
                />
                <Input
                  label="Cooling Capacity (kW)"
                  type="number"
                  value={formData.kW_Cooling_Nominal || 0}
                  onChange={handleInputChange('kW_Cooling_Nominal')}
                />

                <Input
                  label="Airflow High (m³/h)"
                  type="number"
                  value={formData.Airflow_H_m3h || 0}
                  onChange={handleInputChange('Airflow_H_m3h')}
                />
                <Input
                  label="Airflow Medium (m³/h)"
                  type="number"
                  value={formData.Airflow_M_m3h || 0}
                  onChange={handleInputChange('Airflow_M_m3h')}
                />
                <Input
                  label="Airflow Low (m³/h)"
                  type="number"
                  value={formData.Airflow_L_m3h || 0}
                  onChange={handleInputChange('Airflow_L_m3h')}
                />
                <Input
                  label="Power Input (W)"
                  type="number"
                  value={formData.PowerInput_W || 0}
                  onChange={handleInputChange('PowerInput_W')}
                />

                <Input
                  label="Noise High (dB(A))"
                  type="number"
                  value={formData.Noise_H_dBA || 0}
                  onChange={handleInputChange('Noise_H_dBA')}
                />
                <Input
                  label="Noise Medium (dB(A))"
                  type="number"
                  value={formData.Noise_M_dBA || 0}
                  onChange={handleInputChange('Noise_M_dBA')}
                />
                <Input
                  label="Noise Low (dB(A))"
                  type="number"
                  value={formData.Noise_L_dBA || 0}
                  onChange={handleInputChange('Noise_L_dBA')}
                />
                <Input
                  label="Water Connection"
                  value={formData.WaterConnection || ''}
                  onChange={handleInputChange('WaterConnection')}
                  placeholder='e.g., ZG3/4"'
                />

                <Input
                  label="Drain Connection"
                  value={formData.DrainConnection || ''}
                  onChange={handleInputChange('DrainConnection')}
                  placeholder='e.g., 20mm'
                />
                <Input
                  label="Water Flow Cooling (m³/h)"
                  type="number"
                  value={formData.WaterFlow_Cooling_m3h || 0}
                  onChange={handleInputChange('WaterFlow_Cooling_m3h')}
                />
                <Input
                  label="Water Flow Heating (m³/h)"
                  type="number"
                  value={formData.WaterFlow_Heating_m3h || 0}
                  onChange={handleInputChange('WaterFlow_Heating_m3h')}
                />
              </div>
            </div>
          ) : null}

          {/* ✅ iVOLT: SOLAR PANEL SECTION */}
          {isIVoltPanel ? (
            <div className="bg-white p-4 rounded-lg border border-yellow-200 mb-4">
              <h5 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Sun size={16} className="text-yellow-600" /> iVOLT Solar Panel Specs
              </h5>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Input label="Rated Power (W)" type="number" value={formData.pv_Watt_Rated || 0} onChange={handleInputChange('pv_Watt_Rated')} />
                <Input label="Cell Type" value={formData.pv_Cell_Type || ''} onChange={handleInputChange('pv_Cell_Type')} placeholder="e.g., N-type mono" />
                <Input label="Efficiency (%)" type="number" value={formData.pv_Efficiency_pct || 0} onChange={handleInputChange('pv_Efficiency_pct')} />
                <Input label="Warranty (years)" type="number" value={formData.pv_Warranty_years || 0} onChange={handleInputChange('pv_Warranty_years')} />

                <Input label="Voc (V)" type="number" value={formData.pv_Voc_V || 0} onChange={handleInputChange('pv_Voc_V')} />
                <Input label="Vmp (V)" type="number" value={formData.pv_Vmp_V || 0} onChange={handleInputChange('pv_Vmp_V')} />
                <Input label="Isc (A)" type="number" value={formData.pv_Isc_A || 0} onChange={handleInputChange('pv_Isc_A')} />
                <Input label="Imp (A)" type="number" value={formData.pv_Imp_A || 0} onChange={handleInputChange('pv_Imp_A')} />

                <Input label="Dimensions (mm)" value={formData.pv_Dimensions_mm || ''} onChange={handleInputChange('pv_Dimensions_mm')} placeholder="e.g., 1762×1134×30" />
                <Input label="Weight (kg)" type="number" value={formData.pv_Weight_kg || 0} onChange={handleInputChange('pv_Weight_kg')} />
              </div>
            </div>
          ) : null}

          {/* ✅ iVOLT: INVERTER SECTION */}
          {isIVoltInverter ? (
            <div className="bg-white p-4 rounded-lg border border-purple-200 mb-4">
              <h5 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Zap size={16} className="text-purple-600" /> iVOLT Inverter Specs
              </h5>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Input label="Rated Power (kW)" type="number" value={formData.inv_kW_Rated || 0} onChange={handleInputChange('inv_kW_Rated')} />
                <Input label="Phase" value={formData.inv_Phase || ''} onChange={handleInputChange('inv_Phase')} placeholder="1P / 3P" />
                <Input label="MPPT Count" type="number" value={formData.inv_MPPT_Count || 0} onChange={handleInputChange('inv_MPPT_Count')} />
                <Input label="Warranty (years)" type="number" value={formData.inv_Warranty_years || 0} onChange={handleInputChange('inv_Warranty_years')} />

                <Input label="Max PV Input (kW)" type="number" value={formData.inv_Max_PV_Input_kW || 0} onChange={handleInputChange('inv_Max_PV_Input_kW')} />
                <Input label="Max PV Voltage (V)" type="number" value={formData.inv_Max_PV_Voltage_V || 0} onChange={handleInputChange('inv_Max_PV_Voltage_V')} />
                <div className="md:col-span-2 flex items-center mt-2">
                  <Checkbox
                    label="Battery Compatible (Hybrid)?"
                    checked={!!formData.inv_Battery_Compatible}
                    onChange={handleInputChange('inv_Battery_Compatible')}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {/* ✅ iVOLT: BATTERY SECTION */}
          {isIVoltBattery ? (
            <div className="bg-white p-4 rounded-lg border border-green-200 mb-4">
              <h5 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Battery size={16} className="text-green-600" /> iVOLT Battery Specs
              </h5>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Input label="Nominal Energy (kWh)" type="number" value={formData.bat_kWh_Nominal || 0} onChange={handleInputChange('bat_kWh_Nominal')} />
                <Input label="Chemistry" value={formData.bat_Chemistry || ''} onChange={handleInputChange('bat_Chemistry')} placeholder="LFP / NMC etc" />
                <Input label="Voltage (V)" type="number" value={formData.bat_Voltage_V || 0} onChange={handleInputChange('bat_Voltage_V')} />
                <Input label="Capacity (Ah)" type="number" value={formData.bat_Ah || 0} onChange={handleInputChange('bat_Ah')} />

                <Input label="DoD (%)" type="number" value={formData.bat_DoD_pct || 0} onChange={handleInputChange('bat_DoD_pct')} />
                <Input label="Cycle Life" type="number" value={formData.bat_Cycle_Life || 0} onChange={handleInputChange('bat_Cycle_Life')} />
                <Input label="Max Discharge (kW)" type="number" value={formData.bat_Max_Discharge_kW || 0} onChange={handleInputChange('bat_Max_Discharge_kW')} />
                <Input label="Warranty (years)" type="number" value={formData.bat_Warranty_years || 0} onChange={handleInputChange('bat_Warranty_years')} />
              </div>
            </div>
          ) : null}

          <div className="md:col-span-4 mb-4">
            <Textarea
              label="Specs / Description"
              rows="2"
              value={formData.specs}
              onChange={handleInputChange('specs')}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button onClick={handleCancel} variant="secondary">Cancel</Button>
            <Button onClick={handleSave} variant="success">
              <Save size={16} className="mr-2" /> Save Product
            </Button>
          </div>
        </Card>
      )}

      <div className="relative mb-4">
        <input
          type="text"
          placeholder="Search products by Name, Category, or SKU..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 w-10">
                <input
                  type="checkbox"
                  checked={filteredProducts.length > 0 && selectedIds.size === filteredProducts.length}
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
            {Object.keys(groupedProducts).sort().map(groupKey => (
              <React.Fragment key={groupKey}>
                <tr className="bg-gray-100 sticky top-0 border-t-2 border-orange-300">
                  <td colSpan="6" className="px-6 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Power Supply Group: {groupKey}
                  </td>
                </tr>

                {groupedProducts[groupKey]
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
                        <button onClick={() => handleEdit(p)} className="text-indigo-600 hover:text-indigo-900 mr-4" title="Edit Product">
                          <Edit size={18} />
                        </button>
                        <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:text-red-900" title="Delete Product">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {filteredProducts.length === 0 && (
        <div className="p-8 text-center text-gray-500">No products found matching filters.</div>
      )}

      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 z-50 animate-in fade-in slide-in-from-bottom-4">
          <span className="font-bold text-sm">{selectedIds.size} Selected</span>

          <div className="h-4 w-px bg-gray-600" />

          <button onClick={() => handleBulkExport(false)} className="flex items-center gap-2 hover:text-green-400 transition-colors">
            <Download size={18} />
            <span className="text-sm font-bold">Export Selected CSV</span>
          </button>

          <button onClick={handleBulkDelete} className="flex items-center gap-2 hover:text-red-400 transition-colors">
            <Trash2 size={18} />
            <span className="text-sm font-bold">Delete</span>
          </button>

          <button onClick={() => setSelectedIds(new Set())} className="ml-2 text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductManager;
