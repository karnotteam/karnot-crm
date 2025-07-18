import React, { useState, useMemo } from 'react';
import { Download, Plus, Trash2, ChevronDown, ChevronRight, FileText, List, Lock, Send, CheckCircle, XCircle, BarChart2, DollarSign, Target, PieChart } from 'lucide-react';

// --- Data Configuration ---
const ALL_PRODUCTS = [
    { id: 'iheat_9_5_240', name: "Karnot iHEAT R290 - 9.5kW - 240V", costPriceUSD: 1972.00, salesPriceUSD: 2943.28 },
    { id: 'iheat_11_5_240', name: "Karnot iHEAT R290 - 11.5kW - 240V", costPriceUSD: 2063.00, salesPriceUSD: 3079.10 },
    { id: 'iheat_15_5_380', name: "Karnot iHEAT R290 - 15.5kW - 380V", costPriceUSD: 2791.00, salesPriceUSD: 4165.67 },
    { id: 'iheat_18_380', name: "Karnot iHEAT R290 - 18kW - 380V", costPriceUSD: 2938.00, salesPriceUSD: 4385.07 },
    { id: 'aquahero_200l', name: "Karnot R290 AquaHERO 200L", costPriceUSD: 855.00, salesPriceUSD: 1276.12 },
    { id: 'aquahero_300l', name: "Karnot R290 AquaHERO 300L", costPriceUSD: 958.00, salesPriceUSD: 1429.85 },
    { id: 'istor_210', name: "Karnot iSTOR 210 Litre DHW Tank", costPriceUSD: 1716.00, salesPriceUSD: 2561.19 },
    { id: 'iheat_co2_35', name: "Karnot iHEAT - CO2 - 35kW", costPriceUSD: 17893.00, salesPriceUSD: 26705.97 },
    { id: 'iheat_co2_75', name: "Karnot iHEAT - CO2 - 75kW", costPriceUSD: 37500.00, salesPriceUSD: 55970.15 },
    { id: 'icool_5', name: "Karnot iCOOL 5 CO2 MT", costPriceUSD: 6492.96, salesPriceUSD: 9690.98 },
    { id: 'icool_7', name: "Karnot iCOOL 7 CO2 MT", costPriceUSD: 9699.48, salesPriceUSD: 14476.84 },
    { id: 'icool_15', name: "Karnot iCOOL 15 CO2 MT/LT", costPriceUSD: 13691.16, salesPriceUSD: 20434.57 },
    { id: 'icool_max_15', name: "Karnot iCOOL 15MAX CO2 MT/LT", costPriceUSD: 14580.00, salesPriceUSD: 21761.19 },
    { id: 'icool_22', name: "Karnot iCOOL 22 CO2 MT", costPriceUSD: 18360.00, salesPriceUSD: 27402.99 },
    { id: 'imesh', name: "Karnot iMESH", costPriceUSD: 622.08, salesPriceUSD: 928.48 },
];
const SALESPEOPLE = ["Stuart Cox", "Jane Smith", "Robert Johnson"];
const REGIONS = ["NCR", "CAR", "Region I", "Region II", "Region III", "Region IV-A", "Region IV-B", "Region V", "Region VI", "Region VII", "Region VIII", "Region IX", "Region X", "Region XI", "Region XII", "Region XIII", "BARMM"];
const QUOTE_STATUSES = { DRAFT: { text: "Draft", color: "bg-gray-500" }, SENT: { text: "Sent", color: "bg-blue-500" }, APPROVED: { text: "Approved", color: "bg-green-500" }, DECLINED: { text: "Declined", color: "bg-red-500" } };

// --- Helper Components ---
const Card = ({ children, className = '' }) => <div className={`bg-white rounded-2xl shadow-lg p-6 md:p-8 ${className}`}>{children}</div>;
const Button = ({ children, onClick, variant = 'primary', className = '', ...props }) => {
    const baseClasses = 'px-4 py-2 rounded-lg font-semibold flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    const variants = { primary: 'bg-orange-600 text-white hover:bg-orange-700 focus:ring-orange-500', secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400', danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500' };
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
const QuoteCalculator = ({ onSaveQuote }) => {
    const [customerDetails, setCustomerDetails] = useState({ name: '', number: '', tin: '', address: '' });
    const [commercialTerms, setCommercialTerms] = useState({ shipping: 'Ex-Works Warehouse', delivery: '3-5 days from payment', dueDate: '11 March 2025', discount: 0, wht: 0 });
    const [docControl, setDocControl] = useState({ quoteStart: 23, revision: 'A', paymentTerms: 'Full payment is required upon order confirmation.' });
    const [costing, setCosting] = useState({ forex: 58.50, transport: 0, duties: 1, vat: 12, broker: 0 });
    const [docGen, setDocGen] = useState({ quote: true, proForma: false, bir: false, landedCost: false, inPhp: true });
    const [lineItems, setLineItems] = useState([]);

    const handleInputChange = (setter, field, value) => {
        setter(prev => ({ ...prev, [field]: value }));
    };

    const handleLineItemChange = (index, field, value) => {
        const updated = [...lineItems];
        updated[index][field] = value;
        setLineItems(updated);
    };

    const addLineItem = (productId) => {
        const product = ALL_PRODUCTS.find(p => p.id === productId);
        if (product) {
            const existing = lineItems.find(li => li.id === productId);
            if (existing) {
                handleLineItemChange(lineItems.indexOf(existing), 'quantity', existing.quantity + 1);
            } else {
                setLineItems([...lineItems, { ...product, quantity: 1, customPrice: product.salesPriceUSD }]);
            }
        }
    };
    const removeLineItem = (index) => setLineItems(lineItems.filter((_, i) => i !== index));

    const quoteTotals = useMemo(() => {
        const subtotal = lineItems.reduce((acc, item) => acc + (item.customPrice * item.quantity), 0);
        const totalDiscount = subtotal * (commercialTerms.discount / 100);
        const finalSalesPrice = subtotal - totalDiscount;
        const totalCostPrice = lineItems.reduce((acc, item) => acc + (item.costPriceUSD * item.quantity), 0);
        return { subtotal, totalDiscount, finalSalesPrice, totalCostPrice };
    }, [lineItems, commercialTerms.discount]);

    const handleSave = () => {
        if (!customerDetails.name) { alert("Please enter a customer name."); return; }
        const newQuote = {
            id: `QN-${docControl.quoteStart}`,
            customerDetails,
            commercialTerms,
            docControl,
            costing,
            lineItems,
            status: 'DRAFT',
            ...quoteTotals,
            createdAt: new Date().toISOString(),
        };
        onSaveQuote(newQuote);
    };

    const generatePDF = () => {
        if (!customerDetails.name) { alert("Please enter a customer name."); return; }
        
        const { subtotal, totalDiscount, finalSalesPrice } = quoteTotals;
        const todayFormatted = new Date().toLocaleDateString('en-CA');
        const quoteId = `QN${String(docControl.quoteStart).padStart(4, '0')}/${new Date().getFullYear()}${docControl.revision ? ` - Rev ${docControl.revision}` : ''}`;

        const formatCurrency = (num, inPhp = docGen.inPhp) => {
            const options = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
            if (inPhp) {
                return `₱${(num * costing.forex).toLocaleString('en-US', options)}`;
            }
            return `$${num.toLocaleString('en-US', options)}`;
        };

        const lineItemsHtml = lineItems.map(item => `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eaeaea;">${item.name}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eaeaea; text-align: center;">${item.quantity}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eaeaea; text-align: right;">${formatCurrency(item.customPrice)}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eaeaea; text-align: right;">${formatCurrency(item.customPrice * item.quantity)}</td>
            </tr>`).join('');
        
        const companyHeaderHTML = (title, reference) => `<div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 2px solid #F56600;">
            <div style="font-size: 11px; line-height: 1.5;">
                <strong>Karnot Energy Solutions INC.</strong><br>
                VAT REG. TIN: 678-799-105-00000<br>
                Low Carbon Innovation Centre, Cosmos Street, Nilombot,<br>
                2429 Mapandan, Pangasinan, Philippines<br>
                Tel: +63 75 510 8922
            </div>
            <div style="text-align: right;">
                <h1 style="font-size: 28px; color: #F56600; margin: 0;">${title}</h1>
                <p><strong>Date:</strong> ${todayFormatted}</p>
                <p><strong>${reference.label}:</strong> ${reference.value}</p>
                ${reference.dueDate ? `<p><strong>Due Date:</strong> ${reference.dueDate}</p>` : ''}
            </div>
        </div>`;
        
        let generatedDocumentsHTML = '';

        // Sales Quotation
        if (docGen.quote) {
             generatedDocumentsHTML += `<div class="page">
                ${companyHeaderHTML('Sales Quotation', { label: 'Quote ID', value: quoteId })}
                ... Sales Quotation Content ...
            </div>`;
        }
        // Pro Forma Invoice
        if (docGen.proForma) {
             generatedDocumentsHTML += `<div class="page">
                ${companyHeaderHTML('Pro Forma Invoice', { label: 'Reference', value: `PF-${quoteId}`, dueDate: commercialTerms.dueDate })}
                ... Pro Forma Content ...
            </div>`;
        }
        // BIR Invoice
        if (docGen.bir) {
             generatedDocumentsHTML += `<div class="page">
                ${companyHeaderHTML('SALES INVOICE', { label: 'No', value: String(docControl.quoteStart).padStart(4, '0'), dueDate: commercialTerms.dueDate })}
                ... BIR Invoice Content ...
            </div>`;
        }

        const fullHtml = `<html><head><style>.page{width:210mm;min-height:297mm;padding:20mm;margin:auto;box-sizing:border-box;page-break-after:always;}.page:last-child{page-break-after:auto;}</style></head><body>${generatedDocumentsHTML}</body></html>`;
        
        const element = document.createElement('div');
        element.innerHTML = fullHtml;
        html2pdf().from(element).set({ margin: 0, filename: `Karnot-Documents.pdf`, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }).save();
    };

    return (
        <Card>
            <h2 className="text-3xl font-bold text-center text-orange-600 mb-8">Karnot Internal Quoting Tool</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Column 1: Customer Details */}
                <div className="space-y-4">
                    <h3 className="text-xl font-bold border-b-2 border-orange-500 pb-2">1. Customer Details</h3>
                    <Input label="Registered Name" value={customerDetails.name} onChange={e => handleInputChange(setCustomerDetails, 'name', e.target.value)} />
                    <Input label="Customer No." value={customerDetails.number} onChange={e => handleInputChange(setCustomerDetails, 'number', e.target.value)} />
                    <Input label="TIN" value={customerDetails.tin} onChange={e => handleInputChange(setCustomerDetails, 'tin', e.target.value)} />
                    <Textarea label="Business Address" rows="4" value={customerDetails.address} onChange={e => handleInputChange(setCustomerDetails, 'address', e.target.value)} />
                </div>
                {/* Column 2: Commercial Terms */}
                <div className="space-y-4">
                    <h3 className="text-xl font-bold border-b-2 border-orange-500 pb-2">2. Commercial Terms</h3>
                    <Input label="Shipping Terms" value={commercialTerms.shipping} onChange={e => handleInputChange(setCommercialTerms, 'shipping', e.target.value)} />
                    <Input label="Delivery Time" value={commercialTerms.delivery} onChange={e => handleInputChange(setCommercialTerms, 'delivery', e.target.value)} />
                    <Input label="Payment Due Date" value={commercialTerms.dueDate} onChange={e => handleInputChange(setCommercialTerms, 'dueDate', e.target.value)} />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Discount (%)" type="number" value={commercialTerms.discount} onChange={e => handleInputChange(setCommercialTerms, 'discount', parseFloat(e.target.value))} />
                        <Input label="WHT (%)" type="number" value={commercialTerms.wht} onChange={e => handleInputChange(setCommercialTerms, 'wht', parseFloat(e.target.value))} />
                    </div>
                </div>
                {/* Column 3: Document Control */}
                <div className="space-y-4">
                    <h3 className="text-xl font-bold border-b-2 border-orange-500 pb-2">3. Document Control</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Quote Start No." type="number" value={docControl.quoteStart} onChange={e => handleInputChange(setDocControl, 'quoteStart', e.target.value)} />
                        <Input label="Revision" value={docControl.revision} onChange={e => handleInputChange(setDocControl, 'revision', e.target.value)} />
                    </div>
                    <Textarea label="Payment Terms" rows="4" value={docControl.paymentTerms} onChange={e => handleInputChange(setDocControl, 'paymentTerms', e.target.value)} />
                </div>
            </div>

            <div className="mt-8">
                <h3 className="text-xl font-bold border-b-2 border-orange-500 pb-2">3a. International Costing & Taxes</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4">
                    <Input label="Forex (USD-PHP)" type="number" value={costing.forex} onChange={e => handleInputChange(setCosting, 'forex', parseFloat(e.target.value))} />
                    <Input label="Transport (USD)" type="number" value={costing.transport} onChange={e => handleInputChange(setCosting, 'transport', parseFloat(e.target.value))} />
                    <Input label="Duties (%)" type="number" value={costing.duties} onChange={e => handleInputChange(setCosting, 'duties', parseFloat(e.target.value))} />
                    <Input label="VAT on Import (%)" type="number" value={costing.vat} onChange={e => handleInputChange(setCosting, 'vat', parseFloat(e.target.value))} />
                    <Input label="Broker Fees (USD)" type="number" value={costing.broker} onChange={e => handleInputChange(setCosting, 'broker', parseFloat(e.target.value))} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                <div>
                    <h3 className="text-xl font-bold border-b-2 border-orange-500 pb-2">4. Document Generation</h3>
                    <div className="space-y-3 mt-4">
                        <Checkbox label="Generate documents in PHP (untick for USD)" checked={docGen.inPhp} onChange={e => handleInputChange(setDocGen, 'inPhp', e.target.checked)} />
                        <hr/>
                        <Checkbox label="Generate Sales Quotation" checked={docGen.quote} onChange={e => handleInputChange(setDocGen, 'quote', e.target.checked)} />
                        <Checkbox label="Generate Pro Forma Invoice" checked={docGen.proForma} onChange={e => handleInputChange(setDocGen, 'proForma', e.target.checked)} />
                        <Checkbox label="Generate Official BIR Sales Invoice" checked={docGen.bir} onChange={e => handleInputChange(setDocGen, 'bir', e.target.checked)} />
                        <Checkbox label="Include Int'l Landed Cost Estimate" checked={docGen.landedCost} onChange={e => handleInputChange(setDocGen, 'landedCost', e.target.checked)} />
                    </div>
                </div>
                <div>
                    <h3 className="text-xl font-bold border-b-2 border-orange-500 pb-2">5. Product Selection</h3>
                    <div className="flex items-center gap-2 mt-4">
                        <select onChange={e => addLineItem(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500">
                            <option>-- Select a Product to Add --</option>
                            {ALL_PRODUCTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2 mt-4 max-h-60 overflow-y-auto">
                        {lineItems.map((item, index) => (
                            <div key={index} className="flex items-center gap-2 bg-gray-100 p-2 rounded-lg">
                                <p className="flex-grow font-medium">{item.name}</p>
                                <Input type="number" value={item.quantity} onChange={e => handleLineItemChange(index, 'quantity', parseInt(e.target.value))} className="w-20 text-center" />
                                <Button onClick={() => removeLineItem(index)} variant="danger" className="p-2"><Trash2 size={16}/></Button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            
            <div className="flex justify-between items-center mt-8">
                 <Button onClick={handleSave} className="w-full md:w-auto"><Plus className="mr-2"/>Save to CRM</Button>
                 <Button onClick={generatePDF} className="w-full md:w-auto"><Download className="mr-2"/>Generate PDF Documents</Button>
            </div>
        </Card>
    );
};

const SavedQuotesList = ({ quotes, onUpdateQuoteStatus, onDeleteQuote }) => {
    const [expandedQuoteId, setExpandedQuoteId] = useState(null);
    const [regionFilter, setRegionFilter] = useState('ALL');

    const filteredQuotes = useMemo(() => {
        if (regionFilter === 'ALL') return quotes;
        return quotes.filter(q => q.customerDetails.region === regionFilter);
    }, [quotes, regionFilter]);

    const StatusBadge = ({ status }) => (
        <span className={`px-2 py-1 text-xs font-semibold text-white rounded-full ${QUOTE_STATUSES[status]?.color || 'bg-gray-400'}`}>
            {QUOTE_STATUSES[status]?.text || 'Unknown'}
        </span>
    );

    const handleDelete = (quoteId) => {
        if (window.confirm("Are you sure you want to permanently delete this quote?")) {
            onDeleteQuote(quoteId);
        }
    };

    return (
        <Card>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Saved Quotes</h2>
                <div className="w-1/4">
                    <select id="regionFilter" value={regionFilter} onChange={e => setRegionFilter(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500">
                        <option value="ALL">All Regions</option>
                        {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead><tr className="border-b bg-gray-50"><th className="p-3"></th><th className="p-3">Quote ID</th><th className="p-3">Customer</th><th className="p-3">Region</th><th className="p-3">Status</th><th className="p-3 text-right">Sales Price</th><th className="p-3 text-right">Margin</th></tr></thead>
                    <tbody>
                        {filteredQuotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(quote => (
                            <React.Fragment key={quote.id}>
                                <tr className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => setExpandedQuoteId(expandedQuoteId === quote.id ? null : quote.id)}>
                                    <td className="p-3">{expandedQuoteId === quote.id ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}</td>
                                    <td className="p-3 font-mono text-sm">{quote.id}</td>
                                    <td className="p-3">{quote.customerDetails.name}</td>
                                    <td className="p-3">{quote.customerDetails.region}</td>
                                    <td className="p-3"><StatusBadge status={quote.status} /></td>
                                    <td className="p-3 text-right font-semibold">${quote.finalSalesPrice.toFixed(2)}</td>
                                    <td className="p-3 text-right text-green-600">{quote.grossMarginPercentage ? `${quote.grossMarginPercentage.toFixed(2)}%` : 'N/A'}</td>
                                </tr>
                                {expandedQuoteId === quote.id && (
                                    <tr className="bg-gray-100"><td colSpan="8" className="p-4">
                                        <div className="flex justify-end">
                                            <Button onClick={() => handleDelete(quote.id)} variant="danger"><Trash2 size={16} className="mr-2"/>Delete Quote</Button>
                                        </div>
                                    </td></tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
            {filteredQuotes.length === 0 && <p className="text-center text-gray-500 mt-6">No quotes match the current filter.</p>}
        </Card>
    );
};

const Dashboard = ({ quotes }) => {
    const stats = useMemo(() => {
        const approvedQuotes = quotes.filter(q => q.status === 'APPROVED');
        const outstandingQuotes = quotes.filter(q => q.status === 'DRAFT' || q.status === 'SENT');
        const ordersWonValue = approvedQuotes.reduce((acc, q) => acc + q.finalSalesPrice, 0);
        const outstandingValue = outstandingQuotes.reduce((acc, q) => acc + q.finalSalesPrice, 0);
        const totalMargin = approvedQuotes.reduce((acc, q) => acc + q.grossMarginAmount, 0);
        const avgMargin = approvedQuotes.length > 0 ? (totalMargin / ordersWonValue) * 100 : 0;
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
        <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Sales Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Orders Won" value={`$${stats.ordersWonValue.toLocaleString('en-US', {maximumFractionDigits:0})}`} icon={<DollarSign className="text-white"/>} color="bg-green-500" />
                <StatCard title="Outstanding Quotes" value={`$${stats.outstandingValue.toLocaleString('en-US', {maximumFractionDigits:0})}`} icon={<Target className="text-white"/>} color="bg-blue-500" />
                <StatCard title="Avg. Margin (Won)" value={`${stats.avgMargin.toFixed(2)}%`} icon={<PieChart className="text-white"/>} color="bg-yellow-500" />
            </div>
            <Card className="mt-8">
                <h3 className="text-xl font-bold mb-4">Quotes by Status</h3>
                <div className="flex justify-around">
                    {Object.keys(QUOTE_STATUSES).map(statusKey => (
                        <div key={statusKey} className="text-center">
                            <p className="text-3xl font-bold">{stats.statusCounts[statusKey] || 0}</p>
                            <span className={`px-3 py-1 text-sm font-semibold text-white rounded-full ${QUOTE_STATUSES[statusKey].color}`}>{QUOTE_STATUSES[statusKey].text}</span>
                        </div>
                    ))}
                </div>
            </Card>
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
                <div className="text-center"><Lock size={40} className="mx-auto text-orange-600"/><h2 className="text-2xl font-bold text-gray-800 mt-4">Karnot CRM Login</h2></div>
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
    const [activeView, setActiveView] = useState('calculator');

    const handleSaveQuote = (newQuote) => {
        setSavedQuotes([...savedQuotes, newQuote]);
        setActiveView('list');
        alert(`Quote ${newQuote.id} for ${newQuote.customerDetails.name} has been saved!`);
    };
    const handleUpdateQuoteStatus = (quoteId, newStatus) => {
        setSavedQuotes(savedQuotes.map(q => q.id === quoteId ? { ...q, status: newStatus } : q));
    };
    const handleDeleteQuote = (quoteId) => {
        setSavedQuotes(savedQuotes.filter(q => q.id !== quoteId));
    };

    if (!isAuthenticated) return <LoginScreen onLoginSuccess={() => setIsAuthenticated(true)} />;

    return (
        <div className="bg-gray-100 min-h-screen font-sans text-gray-900">
            <header className="bg-white shadow-md">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-orange-600">Karnot Quoting CRM</h1>
                    <nav className="flex gap-2">
                         <Button onClick={() => setActiveView('dashboard')} variant={activeView === 'dashboard' ? 'primary' : 'secondary'}><BarChart2 className="mr-2" size={16} /> Dashboard</Button>
                         <Button onClick={() => setActiveView('calculator')} variant={activeView === 'calculator' ? 'primary' : 'secondary'}><FileText className="mr-2" size={16} /> New Quote</Button>
                         <Button onClick={() => setActiveView('list')} variant={activeView === 'list' ? 'primary' : 'secondary'}><List className="mr-2" size={16} /> Saved Quotes ({savedQuotes.length})</Button>
                    </nav>
                </div>
            </header>
            <main className="container mx-auto p-4 md:p-8">
                {activeView === 'dashboard' && <Dashboard quotes={savedQuotes} />}
                {activeView === 'calculator' && <QuoteCalculator onSaveQuote={handleSaveQuote} />}
                {activeView === 'list' && <SavedQuotesList quotes={savedQuotes} onUpdateQuoteStatus={handleUpdateQuoteStatus} onDeleteQuote={handleDeleteQuote} />}
            </main>
        </div>
    );
}
