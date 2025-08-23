import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, FileText, List, Send, CheckCircle, XCircle, BarChart2, DollarSign, Target, PieChart, Edit, Eye, Save, X } from 'lucide-react';

// --- DATA ---
const ALL_PRODUCTS = [
    // iHEAT (R32)
    { id: 'iheat_r32_6_220v', name: "Karnot iHEAT R32 - 6kW (220V)", category: 'iHEAT (R32)', costPriceUSD: 1273.00, salesPriceUSD: 2546.00 },
    { id: 'iheat_r32_9_5_220v', name: "Karnot iHEAT R32 - 9.5kW (220V)", category: 'iHEAT (R32)', costPriceUSD: 1339.00, salesPriceUSD: 2678.00 },
    { id: 'iheat_r32_12_220v', name: "Karnot iHEAT R32 - 12kW (220V)", category: 'iHEAT (R32)', costPriceUSD: 1442.00, salesPriceUSD: 2884.00 },
    { id: 'iheat_r32_16_220v', name: "Karnot iHEAT R32 - 16kW (220V)", category: 'iHEAT (R32)', costPriceUSD: 1577.00, salesPriceUSD: 3154.00 },
    { id: 'iheat_r32_20_220v', name: "Karnot iHEAT R32 - 20kW (220V)", category: 'iHEAT (R32)', costPriceUSD: 1790.00, salesPriceUSD: 3580.00 },
    { id: 'iheat_r32_22_220v', name: "Karnot iHEAT R32 - 22kW (220V)", category: 'iHEAT (R32)', costPriceUSD: 1864.00, salesPriceUSD: 3728.00 },
    { id: 'iheat_r32_9_5_380v', name: "Karnot iHEAT R32 - 9.5kW (380V)", category: 'iHEAT (R32)', costPriceUSD: 1427.00, salesPriceUSD: 2854.00 },
    { id: 'iheat_r32_12_380v', name: "Karnot iHEAT R32 - 12kW (380V)", category: 'iHEAT (R32)', costPriceUSD: 1530.00, salesPriceUSD: 3060.00 },
    { id: 'iheat_r32_16_380v', name: "Karnot iHEAT R32 - 16kW (380V)", category: 'iHEAT (R32)', costPriceUSD: 1666.00, salesPriceUSD: 3332.00 },
    { id: 'iheat_r32_20_380v', name: "Karnot iHEAT R32 - 20kW (380V)", category: 'iHEAT (R32)', costPriceUSD: 1878.00, salesPriceUSD: 3756.00 },
    { id: 'iheat_r32_22_380v', name: "Karnot iHEAT R32 - 22kW (380V)", category: 'iHEAT (R32)', costPriceUSD: 1952.00, salesPriceUSD: 3904.00 },
    // -- NEWLY ADDED LARGER R32 MODELS --
    { id: 'iheat_r32_25_380v', name: "Karnot iHEAT R32 - 25kW (380V)", category: 'iHEAT (R32)', costPriceUSD: 2746.00, salesPriceUSD: 5492.00 },
    { id: 'iheat_r32_30_380v', name: "Karnot iHEAT R32 - 30kW (380V)", category: 'iHEAT (R32)', costPriceUSD: 3428.00, salesPriceUSD: 6856.00 },
    { id: 'iheat_r32_50_380v', name: "Karnot iHEAT R32 - 50kW (380V)", category: 'iHEAT (R32)', costPriceUSD: 5150.00, salesPriceUSD: 10300.00 },
    { id: 'iheat_r32_100_380v', name: "Karnot iHEAT R32 - 100kW (380V)", category: 'iHEAT (R32)', costPriceUSD: 10226.00, salesPriceUSD: 20452.00 },
    // iHEAT (R290)
    { id: 'iheat_r290_9_5_240v', name: "Karnot iHEAT R290 - 9.5kW - 240V", category: 'iHEAT (R290)', costPriceUSD: 1972.00, salesPriceUSD: 3944.00 },
    { id: 'iheat_r290_9_5_127v', name: "Karnot iHEAT R290 - 9.5kW - 127V", category: 'iHEAT (R290)', costPriceUSD: 1972.00, salesPriceUSD: 3944.00 },
    { id: 'iheat_r290_11_5_240v', name: "Karnot iHEAT R290 - 11.5kW - 240V", category: 'iHEAT (R290)', costPriceUSD: 2063.00, salesPriceUSD: 4126.00 },
    { id: 'iheat_r290_11_5_127v', name: "Karnot iHEAT R290 - 11.5kW - 127V", category: 'iHEAT (R290)', costPriceUSD: 2063.00, salesPriceUSD: 4126.00 },
    { id: 'iheat_r290_15_5_240v', name: "Karnot iHEAT R290 - 15.5kW - 240V", category: 'iHEAT (R290)', costPriceUSD: 2791.00, salesPriceUSD: 5582.00 },
    { id: 'iheat_r290_18_5_240v', name: "Karnot iHEAT R290 - 18.5kW - 240V", category: 'iHEAT (R290)', costPriceUSD: 2791.00, salesPriceUSD: 5582.00 },
    { id: 'aquahero_200l', name: "Karnot R290 AquaHERO 200L", category: 'iHEAT (R290)', costPriceUSD: 855.00, salesPriceUSD: 1710.00 },
    { id: 'aquahero_300l', name: "Karnot R290 AquaHERO 300L", category: 'iHEAT (R290)', costPriceUSD: 958.00, salesPriceUSD: 1916.00 },
    // iHEAT (CO₂)
    { id: 'iheat_co2_35', name: "Karnot iHEAT - CO2 - 35kW", category: 'iHEAT (CO₂)', costPriceUSD: 21471.00, salesPriceUSD: 42942.00 },
    { id: 'iheat_co2_75', name: "Karnot iHEAT - CO2 - 75kW", category: 'iHEAT (CO₂)', costPriceUSD: 45000.00, salesPriceUSD: 90000.00 },
    { id: 'iheat_co2_105', name: "Karnot iHEAT - CO2 - 105kW", category: 'iHEAT (CO₂)', costPriceUSD: 57000.00, salesPriceUSD: 114000.00 },
    // iCOOL (CO₂ Refrigeration)
    { id: 'icool_5_mt', name: "Karnot iCOOL 5 HP", category: 'iCOOL (CO₂ Refrigeration)', costPriceUSD: 7012.00, salesPriceUSD: 14024.00 },
    { id: 'icool_7_mt', name: "Karnot iCOOL 7 HP", category: 'iCOOL (CO₂ Refrigeration)', costPriceUSD: 9981.00, salesPriceUSD: 19962.00 },
    { id: 'icool_15_mt_lt', name: "Karnot iCOOL 15 HP", category: 'iCOOL (CO₂ Refrigeration)', costPriceUSD: 13677.00, salesPriceUSD: 27354.00 },
    { id: 'icool_max_15', name: "Karnot iCOOL MAX 15 HP", category: 'iCOOL (CO₂ Refrigeration)', costPriceUSD: 19830.00, salesPriceUSD: 39660.00 },
    // iSTOR (Thermal Storage)
    { id: 'iheat_integrated_storage_200l', name: "iHEAT Integrated Storage Tank 200Ltr", category: 'iSTOR (Thermal Storage)', costPriceUSD: 1716.00, salesPriceUSD: 3432.00 },
    { id: 'istor_58', name: "iSTOR 58 Compact Thermal Battery", category: 'iSTOR (Thermal Storage)', costPriceUSD: 4800.00, salesPriceUSD: 9600.00 },
    { id: 'istor_89', name: "iSTOR 89 Compact Thermal Battery", category: 'iSTOR (Thermal Storage)', costPriceUSD: 7200.00, salesPriceUSD: 14400.00 }
];
const QUOTE_STATUSES = {
    DRAFT: { text: "Draft", color: "bg-gray-500" },
    SENT: { text: "Sent", color: "bg-blue-500" },
    APPROVED: { text: "Approved", color: "bg-green-500" },
    DECLINED: { text: "Declined", color: "bg-red-500" }
};
// BOI Targets in Millions (PHP)
const BOI_TARGETS = {
    2025: 1073035,
    2026: 2175323,
    2027: 3380671
};
const KARNOT_LOGO_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAABkCAYAAADDhn8LAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAA1rSURBVHgB7Z15fFTlGcd/98zMm8lkMsmEkCQhIUAI2QhZEOyK4lYVq1ar1Vq1tVprrVprwVprrUfF/WlVq1Zt1aJa69a19V5r1XUFVkEQ2QhZCAlhAyEhySQzyWS+nJk57j1nJplM5iYhCcn7+X7y/eY+555z5j3P+5zn+Z5zLgEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA-";

// --- Helper Components ---
const Card = ({ children, className = '' }) => <div className={`bg-white rounded-2xl shadow-lg p-6 md:p-8 ${className}`}>{children}</div>;
const Button = ({ children, onClick, variant = 'primary', className = '', ...props }) => {
    const baseClasses = 'px-4 py-2 rounded-lg font-semibold flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    const variants = {
        primary: 'bg-orange-600 text-white hover:bg-orange-700 focus:ring-orange-500',
        secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
        success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
    };
    return <button className={`${baseClasses} ${variants[variant]} ${className}`} onClick={onClick} {...props}>{children}</button>;
};
const Input = ({ label, id, ...props }) => (
    <div className="w-full">
        {label && <label htmlFor={id} className="block text-sm font-medium text-gray-600 mb-1">{label}</label>}
        <input id={id} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500" {...props} />
    </div>
);
const Textarea = ({ label, id, ...props }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
        <textarea id={id} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500" {...props} />
    </div>
);
const Checkbox = ({ label, id, ...props }) => (
    <div className="flex items-center">
        <input id={id} type="checkbox" className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500" {...props} />
        <label htmlFor={id} className="ml-2 block text-sm text-gray-900">{label}</label>
    </div>
);
const Section = ({ title, children }) => (
    <div className="mt-8">
        <h3 className="text-xl font-bold border-b-2 border-orange-500 pb-2 mb-4">{title}</h3>
        {children}
    </div>
);


// --- The main Quote Calculator Component ---
const QuoteCalculator = ({ onSaveQuote, nextQuoteNumber, initialData = null }) => {
    const [customer, setCustomer] = useState({ name: '', number: '', tin: '', address: '', saleType: 'Export' });
    const [commercial, setCommercial] = useState({ shippingTerms: 'Ex-Works Warehouse', deliveryTime: '3-5 days from payment', dueDate: '', discount: 0, wht: 0 });
    const [docControl, setDocControl] = useState({ quoteNumber: nextQuoteNumber, revision: 'A', paymentTerms: 'Full payment is required upon order confirmation.' });
    const [costing, setCosting] = useState({ forexRate: 58.50, transportCost: 0, dutiesRate: 1, vatRate: 12, brokerFees: 0 });
    const [docGeneration, setDocGeneration] = useState({ generateInPHP: false, generateQuote: true, generateProForma: true, generateBirInvoice: false, includeLandedCost: true });
    
    const [selectedProducts, setSelectedProducts] = useState({});
    const [manualItems, setManualItems] = useState([]);
    const [manualItemInput, setManualItemInput] = useState({ name: '', price: '', specs: '' });

    // State for managing inline editing of manual items
    const [editingIndex, setEditingIndex] = useState(null);
    const [editingItem, setEditingItem] = useState(null);

    useEffect(() => {
        if (initialData) {
            setCustomer(initialData.customer);
            setCommercial(initialData.commercial);
            setDocControl(initialData.docControl);
            setCosting(initialData.costing);
            setDocGeneration(initialData.docGeneration);
            setSelectedProducts(initialData.selectedProducts || {});
            setManualItems(initialData.manualItems || []);
        } else {
             // Reset form for new quote
             setCustomer({ name: '', number: '', tin: '', address: '', saleType: 'Export' });
             setCommercial({ shippingTerms: 'Ex-Works Warehouse', deliveryTime: '3-5 days from payment', dueDate: '', discount: 0, wht: 0 });
             setDocControl({ quoteNumber: nextQuoteNumber, revision: 'A', paymentTerms: 'Full payment is required upon order confirmation.' });
             setCosting({ forexRate: 58.50, transportCost: 0, dutiesRate: 1, vatRate: 12, brokerFees: 0 });
             setDocGeneration({ generateInPHP: false, generateQuote: true, generateProForma: true, generateBirInvoice: false, includeLandedCost: true });
             setSelectedProducts({});
             setManualItems([]);
        }
    }, [initialData, nextQuoteNumber]);

    const handleInputChange = (setter, field, isNumber = false) => (e) => {
        const value = isNumber ? parseFloat(e.target.value) || 0 : e.target.value;
        setter(prev => ({ ...prev, [field]: value }));
    };

    const handleCheckboxChange = (setter, field) => (e) => {
        setter(prev => ({ ...prev, [field]: e.target.checked }));
    };

    const handleProductSelect = (id) => (e) => {
        const newSelected = { ...selectedProducts };
        if (e.target.checked) {
            newSelected[id] = 1;
        } else {
            delete newSelected[id];
        }
        setSelectedProducts(newSelected);
    };

    const handleProductQuantityChange = (id) => (e) => {
        const quantity = parseInt(e.target.value, 10);
        if (quantity >= 1) {
            setSelectedProducts(prev => ({ ...prev, [id]: quantity }));
        }
    };
    
    const addManualItem = () => {
        if (manualItemInput.name && manualItemInput.price) {
            setManualItems(prev => [...prev, { ...manualItemInput, priceUSD: parseFloat(manualItemInput.price), quantity: 1, id: `manual_${Date.now()}` }]);
            setManualItemInput({ name: '', price: '', specs: '' });
        }
    };
    
    const removeManualItem = (index) => {
        setManualItems(prev => prev.filter((_, i) => i !== index));
    };

    const startEditing = (index) => {
        setEditingIndex(index);
        setEditingItem(manualItems[index]);
    };

    const cancelEditing = () => {
        setEditingIndex(null);
        setEditingItem(null);
    };

    const saveEditing = (index) => {
        const updatedItems = [...manualItems];
        updatedItems[index] = { ...editingItem, priceUSD: parseFloat(editingItem.priceUSD) };
        setManualItems(updatedItems);
        cancelEditing();
    };

    const handleEditInputChange = (field) => (e) => {
        setEditingItem(prev => ({ ...prev, [field]: e.target.value }));
    };

    const quoteTotals = useMemo(() => {
        const allItems = [
            ...Object.entries(selectedProducts).map(([id, quantity]) => ({ ...ALL_PRODUCTS.find(p => p.id === id), quantity })),
            ...manualItems
        ];
        
        const subtotalUSD = allItems.reduce((acc, item) => acc + (item.salesPriceUSD || item.priceUSD || 0) * item.quantity, 0);
        const costSubtotalUSD = allItems.reduce((acc, item) => acc + (item.costPriceUSD || 0) * item.quantity, 0);

        const discountAmount = subtotalUSD * (commercial.discount / 100);
        const finalSalesPrice = subtotalUSD - discountAmount;
        const grossMarginAmount = finalSalesPrice - costSubtotalUSD;
        const grossMarginPercentage = finalSalesPrice > 0 ? (grossMarginAmount / finalSalesPrice) * 100 : 0;
        
        return { allItems, subtotalUSD, finalSalesPrice, grossMarginAmount, grossMarginPercentage };
    }, [selectedProducts, manualItems, commercial.discount]);

    const generateQuotePreview = () => {
        const { allItems, subtotalUSD } = quoteTotals;

        if (allItems.length === 0) {
            alert("Please select at least one product or add a manual item.");
            return;
        }

        const discountAmountUSD = subtotalUSD * (commercial.discount / 100);
        const totalAfterDiscountUSD = subtotalUSD - discountAmountUSD;
        
        const formatPHP = (num) => `₱${num.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        const formatUSD = (num) => `$${num.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        
        const today = new Date();
        const year = today.getFullYear();
        const todayFormatted = today.toLocaleDateString('en-CA');

        let quoteId = `QN${String(docControl.quoteNumber).padStart(4, '0')}/${year}`;
        if (docControl.revision) {
            quoteId += ` - Rev ${docControl.revision}`;
        }
        
        const primaryFormat = docGeneration.generateInPHP ? formatPHP : formatUSD;
        const subtotalPrimary = docGeneration.generateInPHP ? subtotalUSD * costing.forexRate : subtotalUSD;
        const discountAmountPrimary = docGeneration.generateInPHP ? discountAmountUSD * costing.forexRate : discountAmountUSD;
        const totalAfterDiscountPrimary = docGeneration.generateInPHP ? totalAfterDiscountUSD * costing.forexRate : totalAfterDiscountUSD;
        const priceColumnHeader = `Unit Price (${docGeneration.generateInPHP ? 'PHP' : 'USD'})`;
        const amountColumnHeader = `Amount (${docGeneration.generateInPHP ? 'PHP' : 'USD'})`;
        
        const bankDetailsPHP = `<h3>Bank Account Details (For PHP Payments)</h3><p style="font-size:14px; line-height:1.6;"><strong>Account Name:</strong> STUART EDMUND COX<br><strong>Account Number:</strong> 027-102383-132<br><strong>Bank:</strong> HSBC - The Hongkong and Shanghai Banking Corporation Ltd<br><strong>Bank Address:</strong> HSBC Centre, 3058 Fifth Avenue West, BGC, Taguig City, 1632 Philippines</p>`;
        const bankDetailsUSD = `<h3>Bank Account Details (For USD Payments)</h3><p style="font-size:14px; line-height:1.6; white-space: pre-wrap;"><strong>Payment Type:</strong> PDDTS (real-time aka GSRT or EOD batch aka LP USA DOLLARS)<br><strong>Remit Currency:</strong> USA DOLLARS<br><strong>Account Name:</strong> STUART EDMUND COX<br><strong>Account Number:</strong> 027-102383-132<br><strong>Bank:</strong> HSBC - The Hongkong and Shanghai Banking Corporation Ltd<br><strong>Bank Address:</strong><br>HSBC Centre<br>3058 Fifth Avenue West<br>Bonifacio Global City<br>Taguig City, Metro Manila, 1632 Philippines<br><strong>Telephone:</strong> +632 8858 0000<br><strong>SWIFT Code:</strong> HSBCPHMMXXX</p>`;
        
        const termsAndConditionsHTML = `<div class="terms-conditions"><h3>Terms and Conditions</h3><dl><dt>Warranty</dt><dd>18 months from the date of delivery, covering manufacturing defects under normal use and service.</dd><dt>Payment Terms</dt><dd>${docControl.paymentTerms.replace(/\n/g, "<br>")}</dd><dt>Production Lead Time</dt><dd>For in-stock units, shipment within 15 working days from receipt of full payment.</dd></dl></div>`;

        let lineItemsHTML = allItems.map(p => {
            const unitPrice = docGeneration.generateInPHP ? (p.salesPriceUSD || p.priceUSD || 0) * costing.forexRate : (p.salesPriceUSD || p.priceUSD || 0);
            const lineTotal = unitPrice * (p.quantity || 1);
            let description = p.name;
            if (p.specs) {
                description += `<br><small style="color:#6e6e73; font-style:italic;">${p.specs.replace(/\n/g, "<br>")}</small>`;
            }
            return `<tr><td>${description}</td><td class="text-center">${p.quantity || 1}</td><td class="text-right">${primaryFormat(unitPrice)}</td><td class="text-right">${primaryFormat(lineTotal)}</td></tr>`;
        }).join('');
        
        const logoURL = "https://img1.wsimg.com/isteam/ip/cb1de239-c2b8-4674-b57d-5ae86a72feb1/Asset%2010%404x.png/:/rs=w:400,cg:true,m";
        const companyHeaderHTML = `<div class="company-details"><img src="${logoURL}" alt="Karnot Logo" style="width:200px; margin-bottom:15px;"><p><strong>Karnot Energy Solutions INC.</strong><br>TIN: ${customer.tin || 'N/A'}<br>Low Carbon Innovation Centre, Cosmos Street, Nilombot,<br>2429 Mapandan, Pangasinan, Philippines<br>Tel: +63 75 510 8922</p></div>`;
        const customerInfoHTML = `<div class="customer-info-box"><strong>Quote For:</strong><br>Customer No.: ${customer.number || "N/A"}<br>${customer.name || "N/A"}<br>${customer.address.replace(/\n/g, "<br>") || "N/A"}</div>`;
        const billToInfoHTML = `<div class="customer-info-box"><strong>Bill To:</strong><br>Customer No.: ${customer.number || "N/A"}<br>${customer.name || "N/A"}<br>${customer.address.replace(/\n/g, "<br>") || "N/A"}</div>`;
        const soldToInfoHTML = `<div class="customer-info-box"><strong>SOLD TO:</strong><br><strong>Customer No.:</strong> ${customer.number || "N/A"}<br><strong>Registered Name:</strong> ${customer.name || "N/A"}<br><strong>TIN:</strong> ${customer.tin || "N/A"}<br><strong>Business Address:</strong> ${customer.address.replace(/\n/g, "<br>") || "N/A"}</div>`;

        let generatedDocumentsHTML = '';
        let landedCostHTML = '';
        if (docGeneration.includeLandedCost) {
            const cifUSD = totalAfterDiscountUSD + costing.transportCost;
            const dutiesUSD = cifUSD * (costing.dutiesRate / 100);
            const customsValueUSD = cifUSD + dutiesUSD;
            const vatUSD = customsValueUSD * (costing.vatRate / 100);
            const totalLandedCostUSD = customsValueUSD + vatUSD + costing.brokerFees;
            landedCostHTML = `<h3>Estimated Landed Cost Breakdown (USD)</h3><table class="simple-summary-table"><tr><td>Equipment Price (Ex-Works, after discount)</td><td class="text-right">${formatUSD(totalAfterDiscountUSD)}</td></tr><tr><td>Freight Cost</td><td class="text-right">${formatUSD(costing.transportCost)}</td></tr><tr><td>Duties (${costing.dutiesRate}%)</td><td class="text-right">${formatUSD(dutiesUSD)}</td></tr><tr><td>VAT / IVA (${costing.vatRate}%)</td><td class="text-right">${formatUSD(vatUSD)}</td></tr><tr><td>Broker & Handling Fees</td><td class="text-right">${formatUSD(costing.brokerFees)}</td></tr><tr class="grand-total-row"><td><strong>Total Estimated Landed Cost</strong></td><td class="text-right"><strong>${formatUSD(totalLandedCostUSD)}</strong></td></tr></table>`;
        }

        if (docGeneration.generateQuote) {
            const quoteHeaderHTML = `<div class="report-header">${companyHeaderHTML}<div class="report-info"><h2>Sales Quotation</h2><p><strong>Date:</strong> ${todayFormatted}<br><strong>Quote ID:</strong> ${quoteId}</p></div></div>`;
            const quoteSummaryHTML = `<table class="simple-summary-table"><tr><td>Subtotal</td><td class="text-right">${primaryFormat(subtotalPrimary)}</td></tr>${discountAmountPrimary > 0 ? `<tr><td>Discount (${commercial.discount}%)</td><td class="text-right">-${primaryFormat(discountAmountPrimary)}</td></tr>` : ''}<tr class="grand-total-row"><td><strong>Total Amount</strong></td><td class="text-right"><strong>${primaryFormat(totalAfterDiscountPrimary)}</strong></td></tr></table>`;
            generatedDocumentsHTML += `<div class="report-page">${quoteHeaderHTML}${customerInfoHTML}<h3>Products & Services</h3><table class="line-items-table"><thead><tr><th>Description</th><th class="text-center">Qty</th><th class="text-right">${priceColumnHeader}</th><th class="text-right">${amountColumnHeader}</th></tr></thead><tbody>${lineItemsHTML}</tbody></table><div class="summary-wrapper">${quoteSummaryHTML}</div><div class="summary-wrapper">${landedCostHTML}</div>${termsAndConditionsHTML}</div>`;
        }

        if (docGeneration.generateProForma) {
             const proFormaHeaderHTML = `<div class="report-header">${companyHeaderHTML}<div class="report-info"><h2>Pro Forma Invoice</h2><p><strong>Date:</strong> ${todayFormatted}<br><strong>Reference:</strong> PF-${quoteId}<br><strong>Due Date: ${commercial.dueDate}</strong></p></div></div>`;
             const proFormaSummaryHTML = `<table class="simple-summary-table"><tr><td>Subtotal</td><td class="text-right">${primaryFormat(subtotalPrimary)}</td></tr>${discountAmountPrimary > 0 ? `<tr><td>Discount (${commercial.discount}%)</td><td class="text-right">-${primaryFormat(discountAmountPrimary)}</td></tr>` : ''}<tr class="grand-total-row"><td><strong>Total Amount Due</strong></td><td class="text-right"><strong>${primaryFormat(totalAfterDiscountPrimary)}</strong></td></tr></table>`;
             const bankDetailsHTML = docGeneration.generateInPHP ? bankDetailsPHP : bankDetailsUSD;
             generatedDocumentsHTML += `<div class="report-page">${proFormaHeaderHTML}${billToInfoHTML}<h3>Details</h3><table class="line-items-table"><thead><tr><th>Description</th><th class="text-center">Qty</th><th class="text-right">${priceColumnHeader}</th><th class="text-right">${amountColumnHeader}</th></tr></thead><tbody>${lineItemsHTML}</tbody></table><div class="summary-wrapper">${proFormaSummaryHTML}</div><div class="summary-wrapper">${landedCostHTML}</div>${bankDetailsHTML}</div>`;
        }
        
        if (docGeneration.generateBirInvoice) {
            const totalAfterDiscountPHP = totalAfterDiscountUSD * costing.forexRate;
            const vatableSales = totalAfterDiscountPHP / 1.12;
            const vatAmount = vatableSales * 0.12;
            const withholdingTaxAmount = vatableSales * (commercial.wht / 100);
            const totalAmountDue = totalAfterDiscountPHP - withholdingTaxAmount;
            const birLineItemsHTML = allItems.map(p => { const unitPricePHP = (p.salesPriceUSD || p.priceUSD || 0) * costing.forexRate; const lineTotalPHP = unitPricePHP * (p.quantity || 1); return `<tr><td>${p.name}</td><td class="text-center">${p.quantity || 1}</td><td class="text-right">${formatPHP(unitPricePHP)}</td><td class="text-right">${formatPHP(lineTotalPHP)}</td></tr>`; }).join('');
            const birHeaderHTML = `<div class="report-header">${companyHeaderHTML}<div class="report-info"><h2>SALES INVOICE</h2><p><strong>No:</strong> ${String(docControl.quoteNumber).padStart(4, '0')}<br><strong>Date:</strong> ${todayFormatted}<br><strong>Due Date: ${commercial.dueDate}</strong></p></div></div>`;
            const birSummaryHTML = `<table class="summary-table"><tr><td>VATable Sales</td><td class="text-right">${formatPHP(vatableSales)}</td><td>Total Sales (VAT-Inclusive)</td><td class="text-right">${formatPHP(totalAfterDiscountPHP)}</td></tr><tr><td>VAT-Exempt Sales</td><td class="text-right">${formatPHP(0)}</td><td>Less: 12% VAT</td><td class="text-right">${formatPHP(vatAmount)}</td></tr><tr><td>Zero-Rated Sales</td><td class="text-right">${formatPHP(0)}</td><td>Net of VAT</td><td class="text-right">${formatPHP(vatableSales)}</td></tr><tr><td><strong>Total Sales</strong></td><td class="text-right"><strong>${formatPHP(vatableSales)}</strong></td><td>Less: Withholding Tax (${commercial.wht}%)</td><td class="text-right">${formatPHP(withholdingTaxAmount)}</td></tr><tr class="bir-grand-total-row"><td></td><td></td><td><strong>TOTAL AMOUNT DUE</strong></td><td class="text-right"><strong>${formatPHP(totalAmountDue)}</strong></td></tr></table>`;
            generatedDocumentsHTML += `<div class="report-page">${birHeaderHTML}${soldToInfoHTML}<h3>Details</h3><table class="line-items-table"><thead><tr><th>Description</th><th class="text-center">Qty</th><th class="text-right">Unit Price (PHP)</th><th class="text-right">Amount (PHP)</th></tr></thead><tbody>${birLineItemsHTML}</tbody></table><div class="summary-wrapper">${birSummaryHTML}</div>${bankDetailsPHP}</div>`;
        }

        const finalReportHTML = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Karnot Document for ${customer.name}</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"><style>:root{--primary-orange:#F56600;--text-primary:#1d1d1f;--text-secondary:#6e6e73;--bg-light:#f5f5f7;--bg-main:#fff;--border-color:#d2d2d7;--border-radius:16px;--box-shadow:0 6px 24px rgba(0,0,0,.07)} body{font-family:'Inter',sans-serif;margin:0;padding:0;color:#1d1d1f;background-color:#f5f5f7}.report-container{max-width:1100px;margin:auto}.report-page{padding:40px;margin:20px auto;border:1px solid #ddd;background:#fff;position:relative;box-shadow:0 0 10px rgba(0,0,0,.1);page-break-after:always;}.report-page:last-of-type{page-break-after:auto;}.report-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;border-bottom:2px solid #ccc;padding-bottom:20px}.company-details{font-size:13px;line-height:1.5;flex-basis:50%}.report-info{text-align:right;font-size:14px;line-height:1.5;flex-basis:50%}.report-info h2{font-size:24px;color:#000;text-align:right;margin-bottom:10px;margin-top:0;font-weight:700}h3{font-size:16px;color:#1d1d1f;border-bottom:1px solid #F56600;padding-bottom:8px;margin-top:25px}p{line-height:1.6}.text-right{text-align:right}.text-center{text-align:center}.customer-info-box{border:1px solid #ccc;padding:15px;border-radius:8px;margin-bottom:20px;line-height:1.7}table{width:100%;border-collapse:collapse;margin-top:10px;font-size:14px}.line-items-table th,.line-items-table td{padding:10px;border-bottom:1px solid #d2d2d7;text-align:left;vertical-align:top}.line-items-table th{font-weight:600;background-color:#f5f5f7}.summary-wrapper{display:flex;flex-direction:column;align-items:flex-end;margin-top:20px;page-break-inside:avoid;}.simple-summary-table{width:60%;border:1px solid #eee;margin-top:10px}.simple-summary-table td{padding:8px;border-bottom:1px solid #eee}.summary-table{width:100%}.summary-table td{padding:6px 8px;vertical-align:top}.grand-total-row td{border-top:2px solid #000;font-size:1.1em;font-weight:700;padding-top:10px}.bir-grand-total-row td{border-top:2px solid #000;font-size:1.2em;font-weight:700;padding-top:10px}.terms-conditions{margin-top:30px;font-size:12px;line-height:1.5;border-top:1px solid #eee;padding-top:15px;page-break-inside:avoid;}.terms-conditions h3{font-size:14px;border-bottom:none;margin-top:0}.terms-conditions dt{font-weight:600;color:#1d1d1f;margin-top:10px}.terms-conditions dd{margin-left:0;margin-bottom:5px;color:#6e6e73}.quote-footer{margin-top:50px;text-align:center;font-size:12px;color:#6c757d;border-top:1px solid #d2d2d7;padding-top:20px}</style></head><body><div class="report-container">${generatedDocumentsHTML}<div class="quote-footer"><p>SEC REG. NO. 2025060205860-05</p><p>Thank you for your business. Please contact us if you have any questions.</p></div></div></body></html>`;
        
        const win = window.open("", "QuotePreview");
        win.document.write(finalReportHTML);
        win.document.close();
    };
    
    const handleSave = () => {
        if (!customer.name) {
            alert("Please enter a customer name.");
            return;
        }
        
        const quoteId = initialData?.id || `QN${String(docControl.quoteNumber).padStart(4, '0')}/${new Date().getFullYear()}`;

        const newQuote = {
            id: quoteId,
            customer,
            commercial,
            docControl,
            costing,
            docGeneration,
            selectedProducts,
            manualItems,
            finalSalesPrice: quoteTotals.finalSalesPrice,
            grossMarginAmount: quoteTotals.grossMarginAmount,
            grossMarginPercentage: quoteTotals.grossMarginPercentage,
            status: initialData?.status || 'DRAFT',
            createdAt: initialData?.createdAt || new Date().toISOString(),
        };
        onSaveQuote(newQuote);
    };

    const productCategories = useMemo(() => {
        return ALL_PRODUCTS.reduce((acc, p) => {
            if (!acc[p.category]) acc[p.category] = [];
            acc[p.category].push(p);
            return acc;
        }, {});
    }, []);

    return (
        <Card>
            <h2 className="text-3xl font-bold text-center text-orange-600 mb-8">{initialData ? `Editing Quote ${initialData.id}` : 'New Quote'}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <Section title="1. Customer Details">
                    <div className="space-y-4">
                        <Input label="Registered Name" value={customer.name} onChange={handleInputChange(setCustomer, 'name')} />
                        <Input label="Customer No." value={customer.number} onChange={handleInputChange(setCustomer, 'number')} />
                        <Input label="TIN" value={customer.tin} onChange={handleInputChange(setCustomer, 'tin')} />
                        <Textarea label="Business Address" rows="3" value={customer.address} onChange={handleInputChange(setCustomer, 'address')} />
                         <div className="flex items-end gap-4 pt-2">
                           <Checkbox id="saleTypeExport" label="Export Sale" checked={customer.saleType === 'Export'} onChange={() => setCustomer(p => ({...p, saleType: 'Export'}))} />
                           <Checkbox id="saleTypeDomestic" label="Domestic Sale" checked={customer.saleType === 'Domestic'} onChange={() => setCustomer(p => ({...p, saleType: 'Domestic'}))} />
                        </div>
                    </div>
                </Section>
                <Section title="2. Commercial Terms">
                    <div className="space-y-4">
                        <Input label="Shipping Terms" value={commercial.shippingTerms} onChange={handleInputChange(setCommercial, 'shippingTerms')} />
                        <Input label="Delivery Time" value={commercial.deliveryTime} onChange={handleInputChange(setCommercial, 'deliveryTime')} />
                        <Input label="Payment Due Date" type="date" value={commercial.dueDate} onChange={handleInputChange(setCommercial, 'dueDate')} />
                        <div className="flex gap-4">
                           <Input label="Discount (%)" type="number" value={commercial.discount} onChange={handleInputChange(setCommercial, 'discount', true)} />
                           <Input label="WHT (%)" type="number" value={commercial.wht} onChange={handleInputChange(setCommercial, 'wht', true)} />
                        </div>
                    </div>
                </Section>
                <Section title="3. Document Control">
                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <Input label="Quote Start No." type="number" value={docControl.quoteNumber} onChange={handleInputChange(setDocControl, 'quoteNumber', true)} />
                            <Input label="Revision" value={docControl.revision} onChange={handleInputChange(setDocControl, 'revision')} />
                        </div>
                        <Textarea label="Payment Terms" rows="4" value={docControl.paymentTerms} onChange={handleInputChange(setDocControl, 'paymentTerms')} />
                    </div>
                </Section>
            </div>
            
            <Section title="3a. International Costing & Taxes">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                     <Input label="Forex (USD to PHP)" type="number" value={costing.forexRate} onChange={handleInputChange(setCosting, 'forexRate', true)} />
                     <Input label="Transport (USD)" type="number" value={costing.transportCost} onChange={handleInputChange(setCosting, 'transportCost', true)} />
                     <Input label="Duties Rate (%)" type="number" value={costing.dutiesRate} onChange={handleInputChange(setCosting, 'dutiesRate', true)} />
                     <Input label="VAT on Import (%)" type="number" value={costing.vatRate} onChange={handleInputChange(setCosting, 'vatRate', true)} />
                     <Input label="Broker Fees (USD)" type="number" value={costing.brokerFees} onChange={handleInputChange(setCosting, 'brokerFees', true)} />
                </div>
            </Section>

            <Section title="4. Document Options">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <Checkbox label="Generate in PHP" checked={docGeneration.generateInPHP} onChange={handleCheckboxChange(setDocGeneration, 'generateInPHP')} />
                    <Checkbox label="Sales Quotation" checked={docGeneration.generateQuote} onChange={handleCheckboxChange(setDocGeneration, 'generateQuote')} />
                    <Checkbox label="Pro Forma Invoice" checked={docGeneration.generateProForma} onChange={handleCheckboxChange(setDocGeneration, 'generateProForma')} />
                    <Checkbox label="BIR Sales Invoice" checked={docGeneration.generateBirInvoice} onChange={handleCheckboxChange(setDocGeneration, 'generateBirInvoice')} />
                    <Checkbox label="Include Landed Cost" checked={docGeneration.includeLandedCost} onChange={handleCheckboxChange(setDocGeneration, 'includeLandedCost')} />
                </div>
            </Section>
            
            <Section title="5. Product Selection">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2">
                    {Object.entries(productCategories).map(([category, products]) => (
                        <div key={category}>
                           <h4 className="text-orange-600 font-semibold mt-4 mb-2">{category}</h4>
                           {products.map(p => (
                                <div key={p.id} className="flex items-center justify-between gap-4 my-1">
                                    <Checkbox id={p.id} label={p.name} checked={!!selectedProducts[p.id]} onChange={handleProductSelect(p.id)} />
                                    <Input type="number" className="w-20 text-center" value={selectedProducts[p.id] || 1} onChange={handleProductQuantityChange(p.id)} disabled={!selectedProducts[p.id]} />
                                </div>
                           ))}
                        </div>
                    ))}
                </div>
            </Section>

            <Section title="6. Manual Line Items (USD)">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                    <Input label="Item Name" value={manualItemInput.name} onChange={e => setManualItemInput(p => ({...p, name: e.target.value}))} />
                    <Input label="Price (USD)" type="number" value={manualItemInput.price} onChange={e => setManualItemInput(p => ({...p, price: e.target.value}))} />
                    <Textarea label="Description (Optional)" rows={1} value={manualItemInput.specs} onChange={e => setManualItemInput(p => ({...p, specs: e.target.value}))} />
                </div>
                <Button onClick={addManualItem} className="w-full md:w-auto mt-4">Add Item</Button>
                 {manualItems.length > 0 && <div className="mt-4 space-y-2">
                     {manualItems.map((item, index) => (
                         <div key={item.id}>
                            {editingIndex === index ? (
                                <div className="p-2 bg-orange-100 rounded-lg space-y-2">
                                    <Input label="Item Name" value={editingItem.name} onChange={handleEditInputChange('name')} />
                                    <Input label="Price (USD)" type="number" value={editingItem.priceUSD} onChange={handleEditInputChange('priceUSD')} />
                                    <Textarea label="Description" rows={2} value={editingItem.specs} onChange={handleEditInputChange('specs')} />
                                    <div className="flex gap-2 justify-end">
                                        <Button onClick={cancelEditing} variant="secondary" className="px-2 py-1"><X size={16} /></Button>
                                        <Button onClick={() => saveEditing(index)} variant="success" className="px-2 py-1"><Save size={16} /></Button>
                                    </div>
                                </div>
                            ) : (
                                 <div className="flex justify-between items-center bg-gray-100 p-2 rounded-lg">
                                     <span>{item.name} - ${parseFloat(item.priceUSD).toLocaleString()}</span>
                                     <div className="flex gap-2">
                                        <Button onClick={() => startEditing(index)} variant="secondary" className="px-2 py-1"><Edit size={16}/></Button>
                                        <Button onClick={() => removeManualItem(index)} variant="danger" className="px-2 py-1"><Trash2 size={16}/></Button>
                                     </div>
                                 </div>
                            )}
                         </div>
                     ))}
                 </div>}
            </Section>
            
            <div className="flex justify-end items-center mt-12 border-t pt-6 gap-4">
                <Button onClick={generateQuotePreview} variant="secondary"><Eye className="mr-2"/>Preview Quote</Button>
                <Button onClick={handleSave} variant="success"><Plus className="mr-2"/>{initialData ? 'Update Quote in CRM' : 'Save Quote to CRM'}</Button>
            </div>
        </Card>
    );
};


// --- The rest of the CRM Application ---
const SavedQuotesList = ({ quotes, onUpdateQuoteStatus, onDeleteQuote, onEditQuote }) => {
    const [expandedQuoteId, setExpandedQuoteId] = useState(null);
    return (
        <Card>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Saved Quotes</h2>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead><tr className="border-b bg-gray-50"><th className="p-3"></th><th className="p-3">Quote ID</th><th className="p-3">Customer</th><th className="p-3">Status</th><th className="p-3 text-right">Sales Price</th><th className="p-3 text-right">Margin</th><th className="p-3 text-center">Actions</th></tr></thead>
                    <tbody>
                        {quotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(quote => (
                            <React.Fragment key={quote.id}>
                                <tr className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => setExpandedQuoteId(expandedQuoteId === quote.id ? null : quote.id)}>
                                    <td className="p-3"><button>{expandedQuoteId === quote.id ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}</button></td>
                                    <td className="p-3 font-mono">{quote.id}</td>
                                    <td className="p-3">{quote.customer.name}</td>
                                    <td className="p-3"><span className={`px-2 py-1 text-xs font-semibold text-white rounded-full ${QUOTE_STATUSES[quote.status]?.color}`}>{QUOTE_STATUSES[quote.status]?.text}</span></td>
                                    <td className="p-3 text-right font-semibold">${(quote.finalSalesPrice || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                                    <td className="p-3 text-right font-semibold" style={{color: quote.grossMarginPercentage > 0 ? 'green' : 'red'}}>{(quote.grossMarginPercentage || 0).toFixed(2)}%</td>
                                    <td className="p-3 text-center"><button onClick={(e) => { e.stopPropagation(); onEditQuote(quote);}} className="p-2 text-blue-600 hover:text-blue-800"><Edit size={16}/></button></td>
                                </tr>
                                {expandedQuoteId === quote.id && (
                                    <tr className="bg-gray-100"><td colSpan="7" className="p-4">
                                        <div className="flex justify-between items-center">
                                            <div><strong>Created:</strong> {new Date(quote.createdAt).toLocaleString()}</div>
                                            <div className="flex gap-2">
                                                <Button onClick={(e) => { e.stopPropagation(); onUpdateQuoteStatus(quote.id, 'SENT')}} variant="secondary" className="text-xs"><Send size={14} className="mr-1"/>Mark as Sent</Button>
                                                <Button onClick={(e) => { e.stopPropagation(); onUpdateQuoteStatus(quote.id, 'APPROVED')}} variant="success" className="text-xs"><CheckCircle size={14} className="mr-1"/>Mark as Approved</Button>
                                                <Button onClick={(e) => { e.stopPropagation(); onUpdateQuoteStatus(quote.id, 'DECLINED')}} variant="danger" className="text-xs"><XCircle size={14} className="mr-1"/>Mark as Declined</Button>
                                                <Button onClick={(e) => { e.stopPropagation(); if (window.confirm("Are you sure?")) onDeleteQuote(quote.id)}} variant="danger" className="p-2 ml-4"><Trash2 size={16}/></Button>
                                            </div>
                                        </div>
                                    </td></tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
            {quotes.length === 0 && <p className="text-center text-gray-500 mt-6">No quotes have been saved yet.</p>}
        </Card>
    );
};

const Dashboard = ({ quotes }) => {
    // Helper to format large numbers
    const formatLargeNumber = (num) => {
        const number = num || 0;
        if (number >= 1e12) return `₱${(number / 1e12).toFixed(2)}T`;
        if (number >= 1e9) return `₱${(number / 1e9).toFixed(2)}B`;
        if (number >= 1e6) return `₱${(number / 1e6).toFixed(2)}M`;
        return `₱${number.toLocaleString('en-US', {maximumFractionDigits: 0})}`;
    };

    const stats = useMemo(() => {
        const approvedQuotes = quotes.filter(q => q.status === 'APPROVED');
        const outstandingQuotes = quotes.filter(q => ['DRAFT', 'SENT'].includes(q.status));
        
        const ordersWonValue = approvedQuotes.reduce((acc, q) => acc + q.finalSalesPrice, 0);
        const outstandingValue = outstandingQuotes.reduce((acc, q) => acc + q.finalSalesPrice, 0);
        const totalMarginAmount = approvedQuotes.reduce((acc, q) => acc + q.grossMarginAmount, 0);
        const avgMargin = ordersWonValue > 0 ? (totalMarginAmount / ordersWonValue) * 100 : 0;
        
        const statusCounts = quotes.reduce((acc, q) => {
            acc[q.status] = (acc[q.status] || 0) + 1;
            return acc;
        }, {});
        
        const salesByYear = approvedQuotes.reduce((acc, q) => {
            const year = new Date(q.createdAt).getFullYear();
            const saleInPHP = q.finalSalesPrice * (q.costing?.forexRate || 58.5);
            acc[year] = (acc[year] || 0) + saleInPHP;
            return acc;
        }, {});
        
        const exportSales = approvedQuotes.filter(q => q.customer?.saleType === 'Export').reduce((acc, q) => acc + q.finalSalesPrice, 0);
        const domesticSales = approvedQuotes.filter(q => q.customer?.saleType === 'Domestic').reduce((acc, q) => acc + q.finalSalesPrice, 0);
        const totalSales = exportSales + domesticSales;
        const exportPercentage = totalSales > 0 ? (exportSales / totalSales) * 100 : 0;

        return { ordersWonValue, outstandingValue, avgMargin, statusCounts, salesByYear, exportSales, domesticSales, exportPercentage };
    }, [quotes]);

    const StatCard = ({ title, value, icon, color }) => (
        <Card className="flex items-center">
            <div className={`p-3 rounded-full mr-4 ${color}`}>{icon}</div>
            <div><p className="text-gray-500 text-sm">{title}</p><p className="text-2xl font-bold">{value}</p></div>
        </Card>
    );
    
    const CircularProgress = ({ percentage, label }) => {
        const radius = 50;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (Math.min(100, Math.max(0, percentage)) / 100 * circumference);
        return (
            <div className="relative flex items-center justify-center w-32 h-32">
                <svg className="w-full h-full" viewBox="0 0 120 120">
                    <circle className="text-gray-200" strokeWidth="10" stroke="currentColor" fill="transparent" r={radius} cx="60" cy="60" />
                    <circle className="text-orange-500 transition-all duration-500" strokeWidth="10" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" stroke="currentColor" fill="transparent" r={radius} cx="60" cy="60" style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }} />
                </svg>
                <span className="absolute text-xl font-bold">{label}</span>
            </div>
        );
    };

    return (
        <div className="space-y-10">
            <Section title="Sales Dashboard">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <StatCard title="Orders Won" value={`$${stats.ordersWonValue.toLocaleString('en-US', {maximumFractionDigits:0})}`} icon={<DollarSign className="text-white"/>} color="bg-green-500" />
                    <StatCard title="Outstanding Quotes" value={`$${stats.outstandingValue.toLocaleString('en-US', {maximumFractionDigits:0})}`} icon={<Target className="text-white"/>} color="bg-blue-500" />
                    <StatCard title="Avg. Margin (Won)" value={`${stats.avgMargin.toFixed(2)}%`} icon={<PieChart className="text-white"/>} color="bg-yellow-500" />
                </div>
                <Card className="mt-8">
                    <h3 className="text-xl font-bold mb-4">Quotes by Status</h3>
                    <div className="flex justify-around items-center">
                        {Object.keys(QUOTE_STATUSES).map(statusKey => (
                            <div key={statusKey} className="text-center">
                                <p className="text-4xl font-bold">{stats.statusCounts[statusKey] || 0}</p>
                                <span className={`px-3 py-1 text-sm font-semibold text-white rounded-full ${QUOTE_STATUSES[statusKey].color}`}>{QUOTE_STATUSES[statusKey].text}</span>
                            </div>
                        ))}
                    </div>
                </Card>
            </Section>
            
            <Section title="BOI Compliance Dashboard">
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <Card>
                        <h3 className="text-xl font-bold mb-4">Sales Mix (Export vs. Domestic)</h3>
                        <div className="w-full bg-blue-200 rounded-full h-8 dark:bg-gray-700">
                            <div className="bg-green-600 h-8 rounded-l-full text-center text-white font-bold leading-8" style={{ width: `${stats.exportPercentage}%` }}>
                                {stats.exportPercentage > 15 && `Export ${stats.exportPercentage.toFixed(1)}%`}
                            </div>
                        </div>
                         <div className="text-center mt-2 text-sm text-gray-600">
                             BOI Target: 70% Export
                         </div>
                    </Card>
                    <Card>
                        <h3 className="text-xl font-bold mb-4">Annual Sales vs. BOI Target (PHP)</h3>
                        <div className="flex flex-col md:flex-row justify-around items-center text-center gap-6">
                            {Object.keys(BOI_TARGETS).map(year => {
                                const sales = stats.salesByYear[year] || 0;
                                const target = BOI_TARGETS[year];
                                const percentage = target > 0 ? (sales / target) * 100 : 0;
                                return (
                                    <div key={year}>
                                        <p className="font-bold text-lg">{year}</p>
                                        <CircularProgress percentage={percentage} label={`${percentage.toFixed(1)}%`} />
                                        <p className="text-sm mt-2">
                                            <span className="font-semibold">Actual:</span> {formatLargeNumber(sales)}<br/>
                                            <span className="text-gray-500">Target: {formatLargeNumber(target)}</span>
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                 </div>
            </Section>
        </div>
    );
};

const LoginScreen = ({ onLoginSuccess }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const CORRECT_PASSWORD = 'Karnot18931!'; 
    const handleSubmit = (e) => {
        e.preventDefault();
        if (password === CORRECT_PASSWORD) onLoginSuccess();
        else setError('Incorrect password. Please try again.');
    };
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <Card className="w-full max-w-sm">
                <div className="text-center"><img src={KARNOT_LOGO_BASE64} alt="Karnot Logo" className="mx-auto" style={{height: '60px'}}/><h2 className="text-2xl font-bold text-gray-800 mt-4">Karnot CRM Login</h2></div>
                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                    <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required />
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    <Button type="submit" className="w-full">Unlock</Button>
                </form>
            </Card>
        </div>
    );
};

export default function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [savedQuotes, setSavedQuotes] = useState([]);
    const [activeView, setActiveView] = useState('dashboard');
    const [quoteToEdit, setQuoteToEdit] = useState(null);

    useEffect(() => {
        try { const data = localStorage.getItem('karnotQuotes'); if (data) setSavedQuotes(JSON.parse(data));} 
        catch (error) { console.error("Failed to load quotes from localStorage", error); }
    }, []);

    useEffect(() => {
        try { localStorage.setItem('karnotQuotes', JSON.stringify(savedQuotes)); } 
        catch (error) { console.error("Failed to save quotes from localStorage", error); }
    }, [savedQuotes]);

    const handleSaveQuote = (quote) => {
        const existingQuoteIndex = savedQuotes.findIndex(q => q.id === quote.id);
        if (existingQuoteIndex > -1) {
            const updatedQuotes = [...savedQuotes];
            updatedQuotes[existingQuoteIndex] = quote;
            setSavedQuotes(updatedQuotes);
            alert(`Quote ${quote.id} has been updated!`);
        } else {
            setSavedQuotes(prev => [...prev, quote]);
            alert(`Quote ${quote.id} for ${quote.customer.name} has been saved!`);
        }
        setActiveView('list');
        setQuoteToEdit(null);
    };
    
    const handleUpdateQuoteStatus = (quoteId, newStatus) => {
        setSavedQuotes(savedQuotes.map(q => q.id === quoteId ? { ...q, status: newStatus } : q));
    };
    
    const handleDeleteQuote = (quoteId) => {
        setSavedQuotes(savedQuotes.filter(q => q.id !== quoteId));
    };

    const handleEditQuote = (quote) => {
        setQuoteToEdit(quote);
        setActiveView('calculator');
    }
    
    const nextQuoteNumber = useMemo(() => {
        if (savedQuotes.length === 0) return 2501;
        const lastQuoteNum = savedQuotes
            .map(q => parseInt(q.id.split('/')[0].replace('QN', ''), 10))
            .filter(num => !isNaN(num))
            .reduce((max, num) => Math.max(max, num), 0);
        return lastQuoteNum > 0 ? lastQuoteNum + 1 : 2501;
    }, [savedQuotes]);

    if (!isAuthenticated) return <LoginScreen onLoginSuccess={() => setIsAuthenticated(true)} />;

    return (
        <div className="bg-gray-100 min-h-screen font-sans text-gray-900">
            <header className="bg-white shadow-md sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <img src={KARNOT_LOGO_BASE64} alt="Karnot Logo" style={{height: '40px'}}/>
                        <h1 className="text-2xl font-bold text-orange-600">Quoting CRM</h1>
                    </div>
                    <nav className="flex gap-2">
                         <Button onClick={() => setActiveView('dashboard')} variant={activeView === 'dashboard' ? 'primary' : 'secondary'}><BarChart2 className="mr-2" size={16} /> Dashboard</Button>
                         <Button onClick={() => { setQuoteToEdit(null); setActiveView('calculator'); }} variant={activeView === 'calculator' ? 'primary' : 'secondary'}><FileText className="mr-2" size={16} /> New Quote</Button>
                         <Button onClick={() => setActiveView('list')} variant={activeView === 'list' ? 'primary' : 'secondary'}><List className="mr-2" size={16} /> Saved Quotes ({savedQuotes.length})</Button>
                    </nav>
                </div>
            </header>
            <main className="container mx-auto p-4 md:p-8">
                {activeView === 'dashboard' && <Dashboard quotes={savedQuotes} />}
                {activeView === 'calculator' && <QuoteCalculator onSaveQuote={handleSaveQuote} nextQuoteNumber={nextQuoteNumber} key={quoteToEdit ? quoteToEdit.id : 'new'} initialData={quoteToEdit} />}
                {activeView === 'list' && <SavedQuotesList quotes={savedQuotes} onUpdateQuoteStatus={handleUpdateQuoteStatus} onDeleteQuote={handleDeleteQuote} onEditQuote={handleEditQuote} />}
            </main>
        </div>
    );
}