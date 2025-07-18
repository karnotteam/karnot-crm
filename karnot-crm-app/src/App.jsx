import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, FileText, List, Lock, Send, CheckCircle, XCircle, BarChart2, DollarSign, Target, PieChart, Edit, Eye } from 'lucide-react';

// --- DATA: Merged from your HTML tool ---
const ALL_PRODUCTS = [
    // iHEAT (R290)
    { id: 'iheat_r290_9_5_240v', name: "Karnot iHEAT R290 - 9.5kW - 240V", category: 'iHEAT (R290)', costPriceUSD: 2865.00, salesPriceUSD: 4776.00 },
    { id: 'iheat_r290_9_5_127v', name: "Karnot iHEAT R290 - 9.5kW - 127V", category: 'iHEAT (R290)', costPriceUSD: 2865.00, salesPriceUSD: 4776.00 },
    { id: 'iheat_r290_11_5_240v', name: "Karnot iHEAT R290 - 11.5kW - 240V", category: 'iHEAT (R290)', costPriceUSD: 3298.00, salesPriceUSD: 5497.00 },
    { id: 'iheat_r290_11_5_127v', name: "Karnot iHEAT R290 - 11.5kW - 127V", category: 'iHEAT (R290)', costPriceUSD: 3298.00, salesPriceUSD: 5497.00 },
    { id: 'iheat_r290_15_5_240v', name: "Karnot iHEAT R290 - 15.5kW - 240V", category: 'iHEAT (R290)', costPriceUSD: 4610.00, salesPriceUSD: 7683.00 },
    { id: 'iheat_r290_18_5_240v', name: "Karnot iHEAT R290 - 18.5kW - 240V", category: 'iHEAT (R290)', costPriceUSD: 4874.00, salesPriceUSD: 8124.00 },
    { id: 'aquahero_200l', name: "Karnot R290 AquaHERO 200L", category: 'iHEAT (R290)', costPriceUSD: 906.00, salesPriceUSD: 1511.00 },
    { id: 'aquahero_300l', name: "Karnot R290 AquaHERO 300L", category: 'iHEAT (R290)', costPriceUSD: 1526.00, salesPriceUSD: 2544.00 },

    // iHEAT (CO₂)
    { id: 'iheat_co2_35', name: "Karnot iHEAT - CO2 - 35kW", category: 'iHEAT (CO₂)', costPriceUSD: 21471.00, salesPriceUSD: 35786.00 },
    { id: 'iheat_co2_75', name: "Karnot iHEAT - CO2 - 75kW", category: 'iHEAT (CO₂)', costPriceUSD: 45000.00, salesPriceUSD: 75000.00 },
    { id: 'iheat_co2_105', name: "Karnot iHEAT - CO2 - 105kW", category: 'iHEAT (CO₂)', costPriceUSD: 57000.00, salesPriceUSD: 95000.00 },

    // iCOOL (CO₂ Refrigeration)
    { id: 'icool_5_mt', name: "Karnot iCOOL 5 HP", category: 'iCOOL (CO₂ Refrigeration)', costPriceUSD: 7950.00, salesPriceUSD: 13250.00 },
    { id: 'icool_7_mt', name: "Karnot iCOOL 7 HP", category: 'iCOOL (CO₂ Refrigeration)', costPriceUSD: 11977.00, salesPriceUSD: 19962.00 },
    { id: 'icool_15_mt_lt', name: "Karnot iCOOL 15 HP", category: 'iCOOL (CO₂ Refrigeration)', costPriceUSD: 21199.00, salesPriceUSD: 35332.00 },
    { id: 'icool_max_15', name: "Karnot iCOOL MAX 15 HP", category: 'iCOOL (CO₂ Refrigeration)', costPriceUSD: 24000.00, salesPriceUSD: 40000.00 },

    // iSTOR (Thermal Storage)
    { id: 'iheat_integrated_storage_200l', name: "iHEAT Integrated Storage Tank 200Ltr", category: 'iSTOR (Thermal Storage)', costPriceUSD: 2059.00, salesPriceUSD: 3432.00 },
    { id: 'istor_58', name: "iSTOR 58 Compact Thermal Battery", category: 'iSTOR (Thermal Storage)', costPriceUSD: 4800.00, salesPriceUSD: 8000.00 },
    { id: 'istor_89', name: "iSTOR 89 Compact Thermal Battery", category: 'iSTOR (Thermal Storage)', costPriceUSD: 7200.00, salesPriceUSD: 12000.00 }
];
const QUOTE_STATUSES = {
    DRAFT: { text: "Draft", color: "bg-gray-500" },
    SENT: { text: "Sent", color: "bg-blue-500" },
    APPROVED: { text: "Approved", color: "bg-green-500" },
    DECLINED: { text: "Declined", color: "bg-red-500" }
};
const BOI_TARGETS = { 2025: 1073035, 2026: 2175323, 2027: 3380671 };
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
    <div>
        <h3 className="text-xl font-bold border-b-2 border-orange-500 pb-2 mb-4">{title}</h3>
        {children}
    </div>
);


// --- The main Quote Calculator Component ---
const QuoteCalculator = ({ onSaveQuote, nextQuoteNumber, initialData = null }) => {
    // --- State for all form inputs, based on your HTML tool ---
    const [customer, setCustomer] = useState({ name: '', number: '', tin: '', address: '' });
    const [commercial, setCommercial] = useState({ shippingTerms: 'Ex-Works Warehouse', deliveryTime: '3-5 days from payment', dueDate: '', discount: 0, wht: 0 });
    const [docControl, setDocControl] = useState({ quoteNumber: nextQuoteNumber, revision: 'A', paymentTerms: 'Full payment is required upon order confirmation.' });
    const [costing, setCosting] = useState({ forexRate: 58.50, transportCost: 0, dutiesRate: 1, vatRate: 12, brokerFees: 0 });
    const [docGeneration, setDocGeneration] = useState({ generateInPHP: false, generateQuote: true, generateProForma: true, includeLandedCost: true });
    
    const [selectedProducts, setSelectedProducts] = useState({});
    const [manualItems, setManualItems] = useState([]);
    const [manualItemInput, setManualItemInput] = useState({ name: '', price: '', specs: '' });

    // --- Load data when editing an existing quote ---
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
             setDocControl(prev => ({ ...prev, quoteNumber: nextQuoteNumber, revision: 'A' }));
        }
    }, [initialData, nextQuoteNumber]);

    // --- Handlers for interactive form elements ---
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

    // --- Memoized calculations for quote totals ---
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

    // --- Function to build and display the quote preview in a new window ---
    const generateQuotePreview = () => {
        const { allItems, subtotalUSD, finalSalesPrice } = quoteTotals;

        if (allItems.length === 0) { alert("Please select products or add manual items."); return; }

        const format = (num, currency) => `${currency}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const primaryCurrency = docGeneration.generateInPHP ? 'PHP' : 'USD';
        const forexRate = costing.forexRate || 1;
        const formatPrimary = (num) => format(docGeneration.generateInPHP ? num * forexRate : num, primaryCurrency === 'PHP' ? '₱' : '$');
        
        const lineItemsHTML = allItems.map(p => {
            const unitPrice = p.salesPriceUSD || p.priceUSD || 0;
            const lineTotal = unitPrice * p.quantity;
            return `<tr><td>${p.name}</td><td style="text-align:center;">${p.quantity}</td><td style="text-align:right;">${formatPrimary(unitPrice)}</td><td style="text-align:right;">${formatPrimary(lineTotal)}</td></tr>`;
        }).join('');

        // Simplified HTML generation for preview
        let finalHTML = `
            <!DOCTYPE html><html><head><title>Quote Preview</title><style>body{font-family:sans-serif;margin:2cm;} table{width:100%;border-collapse:collapse;} th,td{border:1px solid #ccc;padding:8px;} h1,h2,h3{color:#F56600;}</style></head><body>
            <h1>Sales Quotation</h1><hr>
            <h3>To: ${customer.name}</h3><p>${customer.address.replace(/\n/g, "<br>")}</p><hr>
            <h3>Products & Services</h3>
            <table><thead><tr><th>Description</th><th>Qty</th><th>Unit Price (${primaryCurrency})</th><th>Amount (${primaryCurrency})</th></tr></thead><tbody>${lineItemsHTML}</tbody></table>
            <div style="text-align:right;width:40%;margin-left:auto;margin-top:20px;">
                <table >
                    <tr><td>Subtotal</td><td>${formatPrimary(subtotalUSD)}</td></tr>
                    <tr><td>Discount (${commercial.discount}%)</td><td>-${formatPrimary(subtotalUSD * (commercial.discount/100))}</td></tr>
                    <tr><td><b>TOTAL</b></td><td><b>${formatPrimary(finalSalesPrice)}</b></td></tr>
                </table>
            </div>
            </body></html>`;
        
        const win = window.open("", "QuotePreview", "width=800,height=600");
        win.document.write(finalHTML);
        win.document.close();
    };
    
    // --- Function to save the quote data to the CRM ---
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
            // Add calculated totals for dashboard/list view
            finalSalesPrice: quoteTotals.finalSalesPrice,
            grossMarginAmount: quoteTotals.grossMarginAmount,
            grossMarginPercentage: quoteTotals.grossMarginPercentage,
            // Standard CRM fields
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

    // --- JSX layout based on your HTML tool's design ---
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
                </section>
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Checkbox label="Generate in PHP" checked={docGeneration.generateInPHP} onChange={handleCheckboxChange(setDocGeneration, 'generateInPHP')} />
                    <Checkbox label="Show Sales Quote" checked={docGeneration.generateQuote} onChange={handleCheckboxChange(setDocGeneration, 'generateQuote')} />
                    <Checkbox label="Show Pro Forma" checked={docGeneration.generateProForma} onChange={handleCheckboxChange(setDocGeneration, 'generateProForma')} />
                    <Checkbox label="Include Landed Cost" checked={docGeneration.includeLandedCost} onChange={handleCheckboxChange(setDocGeneration, 'includeLandedCost')} />
                </div>
            </Section>
            
            <Section title="5. Product Selection">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-2"><Input label="Item Name" value={manualItemInput.name} onChange={e => setManualItemInput(p => ({...p, name: e.target.value}))} /></div>
                    <div><Input label="Price (USD)" type="number" value={manualItemInput.price} onChange={e => setManualItemInput(p => ({...p, price: e.target.value}))} /></div>
                    <div><Button onClick={addManualItem} className="w-full">Add Item</Button></div>
                </div>
                 {manualItems.length > 0 && <div className="mt-4 space-y-2">
                     {manualItems.map((item, index) => (
                         <div key={index} className="flex justify-between items-center bg-gray-100 p-2 rounded-lg">
                             <span>{item.name} - ${parseFloat(item.priceUSD).toLocaleString()}</span>
                             <Button onClick={() => removeManualItem(index)} variant="danger" className="px-2 py-1"><Trash2 size={16}/></Button>
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
        return { ordersWonValue, outstandingValue, avgMargin, statusCounts };
    }, [quotes]);

    const StatCard = ({ title, value, icon, color }) => (
        <Card className="flex items-center">
            <div className={`p-3 rounded-full mr-4 ${color}`}>{icon}</div>
            <div><p className="text-gray-500 text-sm">{title}</p><p className="text-2xl font-bold">{value}</p></div>
        </Card>
    );

    return (
        <div className="space-y-10">
            <div>
                <h2 className="text-3xl font-bold text-gray-800 mb-6">Sales Dashboard</h2>
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
            </div>
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
        catch (error) { console.error("Failed to save quotes to localStorage", error); }
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
        const lastQuoteNum = savedQuotes
            .map(q => parseInt(q.id.split('/')[0].replace('QN', ''), 10))
            .filter(num => !isNaN(num))
            .reduce((max, num) => Math.max(max, num), 2500);
        return lastQuoteNum + 1;
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