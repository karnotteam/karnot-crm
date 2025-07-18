import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, FileText, List, Lock, Send, CheckCircle, XCircle, BarChart2, DollarSign, Target, PieChart, Edit } from 'lucide-react';

// --- Data Configuration ---
const ALL_PRODUCTS = [
    { id: 'iheat_9_5_240', name: "Karnot iHEAT R290 - 9.5kW - 240V", costPriceUSD: 1972.00, salesPriceUSD: 2943.28 },
    { id: 'iheat_11_5_240', name: "Karnot iHEAT R290 - 11.5kW - 240V", costPriceUSD: 2063.00, salesPriceUSD: 3079.10 },
    { id: 'iheat_18_5_127', name: "Karnot iHEAT R290 - 18.5kW - 127V", costPriceUSD: 5442.86, salesPriceUSD: 8124.00 },
    { id: 'iheat_15_5_380', name: "Karnot iHEAT R290 - 15.5kW - 380V", costPriceUSD: 2791.00, salesPriceUSD: 4165.67 },
    { id: 'iheat_18_380', name: "Karnot iHEAT R290 - 18kW - 380V", costPriceUSD: 2938.00, salesPriceUSD: 4385.07 },
    { id: 'aquahero_200l', name: "Karnot R290 AquaHERO 200L", costPriceUSD: 855.00, salesPriceUSD: 1276.12 },
    { id: 'aquahero_300l', name: "Karnot R290 AquaHERO 300L", costPriceUSD: 958.00, salesPriceUSD: 1429.85 },
    { id: 'istor_210', name: "Karnot iSTOR 210 Litre DHW Tank", costPriceUSD: 1716.00, salesPriceUSD: 2561.19 },
    { id: 'cif_freight', name: 'CIF to Port of Manzanillo', costPriceUSD: 0, salesPriceUSD: 350.00 },
    { id: 'imesh', name: "Karnot iMESH", costPriceUSD: 622.08, salesPriceUSD: 928.48 },
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
    <div>
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

// --- Main Application Components ---
const QuoteCalculator = ({ onSaveQuote, nextQuoteNumber, initialData = null }) => {
    const [customerDetails, setCustomerDetails] = useState({ name: '', number: '', tin: '', address: '', saleType: 'Export' });
    const [commercialTerms, setCommercialTerms] = useState({ shipping: 'Ex-Works Warehouse', delivery: '3-5 days from payment', dueDate: '', discount: 0, wht: 0 });
    const [docControl, setDocControl] = useState({ quoteNumber: nextQuoteNumber, revision: 'A' });
    const [costing, setCosting] = useState({ forex: 58.50, transport: 0, duties: 0, vat: 0, broker: 0 });
    const [lineItems, setLineItems] = useState([]);

    const [bankDetails, setBankDetails] = useState(`Payment Type: PDDTS (real-time aka OSRT or EOD batch aka LP USA DOLLARS)\nRemit Currency: USA DOLLARS\nAccount Name: STUART EDMUND COX\nAccount Number: 027-102583-182\nBank: HSBC - The Hongkong and Shanghai Banking Corporation Ltd\nBank Address:\nHSBC Centre\n3058 Fifth Avenue West\nBonifacio Global City\nTaguig City, Metro Manila, 1632 Philippines\nTelephone: +632 8858 0000\nSWIFT Code: HSBCPHMMXXX`);
    const [termsAndConditions, setTermsAndConditions] = useState(`Warranty: 18 months from the date of delivery, covering manufacturing defects under normal use and service.\nPayment Terms: Full payment is required upon order confirmation.\nProduction Lead Time: For in-stock units, shipment within 15 working days from receipt of full payment.\nPackaging: Export-grade plywood case packaging, IPPC-compliant and suitable for international shipment.\nValidity: Quotation valid for 30 days from the date of issue unless otherwise specified.\nIncoterms: EXW (Ex Works) unless otherwise stated in the quotation.\nOwnership: Title to goods transfers upon receipt of full payment.\nLiability: Seller's liability is limited to repair or replacement under warranty. No liability for consequential damages.\nForce Majeure: The seller is not liable for delays or failure to perform due to causes beyond reasonable control.`);

    useEffect(() => {
        if (initialData) {
            setCustomerDetails(initialData.customerDetails);
            setCommercialTerms(initialData.commercialTerms);
            setDocControl(initialData.docControl);
            setCosting(initialData.costing);
            setLineItems(initialData.lineItems);
            if(initialData.bankDetails) setBankDetails(initialData.bankDetails);
            if(initialData.termsAndConditions) setTermsAndConditions(initialData.termsAndConditions);
        } else {
             setDocControl(prev => ({ ...prev, quoteNumber: nextQuoteNumber, revision: 'A' }));
        }
    }, [initialData, nextQuoteNumber]);
    
    const handleInputChange = (setter, field, value) => setter(prev => ({ ...prev, [field]: value }));
    const handleLineItemChange = (index, field, value) => {
        const updated = [...lineItems];
        updated[index][field] = value;
        setLineItems(updated);
    };
    const addLineItem = (productId) => {
        const product = ALL_PRODUCTS.find(p => p.id === productId);
        if (product) setLineItems(prev => [...prev, { ...product, quantity: 1, customPrice: product.salesPriceUSD, uniqueId: `${product.id}_${Date.now()}` }]);
    };
    const removeLineItem = (index) => setLineItems(lineItems.filter((_, i) => i !== index));

    const quoteTotals = useMemo(() => {
        const subtotal = lineItems.reduce((acc, item) => acc + (Number(item.customPrice) * Number(item.quantity)), 0);
        const totalDiscount = subtotal * (Number(commercialTerms.discount) / 100);
        const finalSalesPrice = subtotal - totalDiscount;
        const totalCostPrice = lineItems.reduce((acc, item) => acc + (Number(item.costPriceUSD) * Number(item.quantity)), 0);
        const grossMarginAmount = finalSalesPrice - totalCostPrice;
        const grossMarginPercentage = finalSalesPrice > 0 ? (grossMarginAmount / finalSalesPrice) * 100 : 0;
        return { subtotal, totalDiscount, finalSalesPrice, totalCostPrice, grossMarginAmount, grossMarginPercentage };
    }, [lineItems, commercialTerms.discount]);

    const handleSave = () => {
        if (!customerDetails.name) { alert("Please enter a customer name."); return; }
        const quoteId = initialData?.id || `QN${docControl.quoteNumber}/${new Date().getFullYear()}`;
        const newQuote = {
            id: quoteId,
            customerDetails, commercialTerms, docControl, costing, lineItems,
            bankDetails, termsAndConditions,
            status: initialData?.status || 'DRAFT',
            ...quoteTotals,
            createdAt: initialData?.createdAt || new Date().toISOString(),
        };
        onSaveQuote(newQuote);
    };

    return (
        <Card>
            <h2 className="text-3xl font-bold text-center text-orange-600 mb-8">{initialData ? `Editing Quote ${initialData.id}` : 'New Quote'}</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-4">
                    <h3 className="text-xl font-bold border-b-2 border-orange-500 pb-2">1. Customer & Document Control</h3>
                    <Input label="Registered Name" value={customerDetails.name} onChange={e => handleInputChange(setCustomerDetails, 'name', e.target.value)} />
                    <div className="grid grid-cols-3 gap-4">
                        <Input label="Customer No." value={customerDetails.number} onChange={e => handleInputChange(setCustomerDetails, 'number', e.target.value)} />
                        <Input label="Customer TIN" value={customerDetails.tin} onChange={e => handleInputChange(setCustomerDetails, 'tin', e.target.value)} />
                        <div className="flex items-end gap-2">
                             <Checkbox id="saleTypeExport" label="Export" checked={customerDetails.saleType === 'Export'} onChange={() => handleInputChange(setCustomerDetails, 'saleType', 'Export')} />
                             <Checkbox id="saleTypeDomestic" label="Domestic" checked={customerDetails.saleType === 'Domestic'} onChange={() => handleInputChange(setCustomerDetails, 'saleType', 'Domestic')} />
                        </div>
                    </div>
                    <Textarea label="Business Address" rows="2" value={customerDetails.address} onChange={e => handleInputChange(setCustomerDetails, 'address', e.target.value)} />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Quote Number" type="number" value={docControl.quoteNumber} onChange={e => handleInputChange(setDocControl, 'quoteNumber', parseInt(e.target.value))} />
                        <Input label="Revision" value={docControl.revision} onChange={e => handleInputChange(setDocControl, 'revision', e.target.value)} />
                    </div>
                </div>
                <div className="space-y-4">
                    <h3 className="text-xl font-bold border-b-2 border-orange-500 pb-2">2. Product Selection</h3>
                     <select onChange={e => addLineItem(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500">
                        <option>-- Select a Product or Service --</option>
                        {ALL_PRODUCTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                     </select>
                     <div className="space-y-2 mt-4 max-h-[240px] overflow-y-auto pr-2">
                        {lineItems.map((item, index) => (
                            <div key={item.uniqueId} className="grid grid-cols-12 items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                <p className="col-span-6 font-medium text-sm">{item.name}</p>
                                <Input aria-label="Custom Price" type="number" step="0.01" value={item.customPrice} onChange={e => handleLineItemChange(index, 'customPrice', parseFloat(e.target.value))} className="w-full text-center col-span-3" />
                                <Input aria-label="Quantity" type="number" value={item.quantity} onChange={e => handleLineItemChange(index, 'quantity', parseInt(e.target.value))} className="w-full text-center col-span-2" />
                                <Button onClick={() => removeLineItem(index)} variant="danger" className="p-2 col-span-1"><Trash2 size={16}/></Button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6 mt-6">
                <div>
                    <h3 className="text-xl font-bold border-b-2 border-orange-500 pb-2">3. Landed Cost Details</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <Input label="Freight ($)" type="number" value={costing.transport} onChange={e => handleInputChange(setCosting, 'transport', parseFloat(e.target.value))} />
                        <Input label="Duties (%)" type="number" value={costing.duties} onChange={e => handleInputChange(setCosting, 'duties', parseFloat(e.target.value))} />
                        <Input label="VAT/IVA (%)" type="number" value={costing.vat} onChange={e => handleInputChange(setCosting, 'vat', parseFloat(e.target.value))} />
                        <Input label="Broker ($)" type="number" value={costing.broker} onChange={e => handleInputChange(setCosting, 'broker', parseFloat(e.target.value))} />
                    </div>
                </div>
                <div>
                     <h3 className="text-xl font-bold border-b-2 border-orange-500 pb-2">4. Commercial Terms</h3>
                     <div className="grid grid-cols-2 gap-4 mt-4">
                        <Input label="Discount (%)" type="number" value={commercialTerms.discount} onChange={e => handleInputChange(setCommercialTerms, 'discount', parseFloat(e.target.value))} />
                        <Input label="Payment Due Date" type="date" value={commercialTerms.dueDate} onChange={e => handleInputChange(setCommercialTerms, 'dueDate', e.target.value)} />
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
                <Textarea label="Terms & Conditions" rows="8" value={termsAndConditions} onChange={e => setTermsAndConditions(e.target.value)} />
                <Textarea label="Bank Details" rows="8" value={bankDetails} onChange={e => setBankDetails(e.target.value)} />
            </div>
            <div className="flex justify-end items-center mt-8 border-t pt-6">
                <Button onClick={handleSave} variant="success" className="w-full md:w-auto">
                    <Plus className="mr-2"/>
                    {initialData ? 'Update Quote in CRM' : 'Save Quote to CRM'}
                </Button>
            </div>
        </Card>
    );
};

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
                                    <td className="p-3">{quote.customerDetails.name}</td>
                                    <td className="p-3"><span className={`px-2 py-1 text-xs font-semibold text-white rounded-full ${QUOTE_STATUSES[quote.status]?.color}`}>{QUOTE_STATUSES[quote.status]?.text}</span></td>
                                    <td className="p-3 text-right font-semibold">${(quote.finalSalesPrice || 0).toFixed(2)}</td>
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
        
        const exportSales = approvedQuotes.filter(q => q.customerDetails.saleType === 'Export').reduce((acc, q) => acc + q.finalSalesPrice, 0);
        const domesticSales = approvedQuotes.filter(q => q.customerDetails.saleType === 'Domestic').reduce((acc, q) => acc + q.finalSalesPrice, 0);
        const totalSales = exportSales + domesticSales;
        const exportPercentage = totalSales > 0 ? (exportSales / totalSales) * 100 : 0;
        const salesByYear = approvedQuotes.reduce((acc, q) => {
            const year = new Date(q.createdAt).getFullYear();
            acc[year] = (acc[year] || 0) + q.finalSalesPrice;
            return acc;
        }, {});

        return { ordersWonValue, outstandingValue, avgMargin, statusCounts, exportSales, domesticSales, exportPercentage, salesByYear };
    }, [quotes]);

    const StatCard = ({ title, value, icon, color }) => (
        <Card className="flex items-center">
            <div className={`p-3 rounded-full mr-4 ${color}`}>{icon}</div>
            <div><p className="text-gray-500 text-sm">{title}</p><p className="text-2xl font-bold">{value}</p></div>
        </Card>
    );

    const CircularProgress = ({ percentage }) => {
        const radius = 50;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (percentage / 100 * circumference);
        return (
            <div className="relative flex items-center justify-center w-32 h-32">
                <svg className="w-full h-full" viewBox="0 0 120 120">
                    <circle className="text-gray-200" strokeWidth="10" stroke="currentColor" fill="transparent" r={radius} cx="60" cy="60" />
                    <circle className="text-orange-500" strokeWidth="10" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" stroke="currentColor" fill="transparent" r={radius} cx="60" cy="60" style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }} />
                </svg>
                <span className="absolute text-xl font-bold">{percentage.toFixed(1)}%</span>
            </div>
        );
    };

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
            <div>
                 <h2 className="text-3xl font-bold text-gray-800 mb-6">BOI Compliance Dashboard</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <h3 className="text-xl font-bold mb-4">Sales Mix (Approved Orders)</h3>
                        <p>Export Sales: ${stats.exportSales.toLocaleString('en-US', {maximumFractionDigits:0})}</p>
                        <p>Domestic Sales: ${stats.domesticSales.toLocaleString('en-US', {maximumFractionDigits:0})}</p>
                        <div className="w-full bg-gray-200 rounded-full h-4 mt-2"><div className="bg-green-500 h-4 rounded-full" style={{ width: `${stats.exportPercentage}%` }} title="Export %"></div></div>
                        <p className="text-right font-bold mt-1">{stats.exportPercentage.toFixed(2)}% Export</p>
                    </Card>
                    <Card>
                        <h3 className="text-xl font-bold mb-4">Annual Sales vs. BOI Target</h3>
                        <div className="flex justify-around">
                            {Object.keys(BOI_TARGETS).map(year => (
                                <div key={year} className="text-center">
                                    <p className="font-bold">{year}</p>
                                    <CircularProgress percentage={((stats.salesByYear[year] || 0) / BOI_TARGETS[year]) * 100} />
                                    <p className="text-xs text-gray-500">Target: ${BOI_TARGETS[year].toLocaleString()}</p>
                                    <p className="text-xs">Actual: ${(stats.salesByYear[year] || 0).toLocaleString()}</p>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
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
            alert(`Quote ${quote.id} for ${quote.customerDetails.name} has been saved!`);
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
    
    const nextQuoteNumber = 2501 + savedQuotes.filter(q => !q.id.startsWith("QN-")).length;

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