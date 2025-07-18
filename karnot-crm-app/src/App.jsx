import React, { useState, useMemo } from 'react';
import { Download, Plus, Trash2, ChevronDown, ChevronRight, FileText, List, Lock, Send, CheckCircle, XCircle, BarChart2, DollarSign, Target, PieChart } from 'lucide-react';

// --- Expanded Product Database with Real Costs ---
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
    { id: 'manual_service', name: "Manual Service/Item", salesPriceUSD: 0, costPriceUSD: 0 },
];

const SALESPEOPLE = ["Stuart Cox", "Jane Smith", "Robert Johnson"];
const REGIONS = ["NCR", "CAR", "Region I", "Region II", "Region III", "Region IV-A", "Region IV-B", "Region V", "Region VI", "Region VII", "Region VIII", "Region IX", "Region X", "Region XI", "Region XII", "Region XIII", "BARMM"];
const QUOTE_STATUSES = {
    DRAFT: { text: "Draft", color: "bg-gray-500" },
    SENT: { text: "Sent", color: "bg-blue-500" },
    APPROVED: { text: "Approved", color: "bg-green-500" },
    DECLINED: { text: "Declined", color: "bg-red-500" },
};

// --- Helper Components ---
const Card = ({ children, className = '' }) => <div className={`bg-white rounded-2xl shadow-lg p-6 md:p-8 ${className}`}>{children}</div>;
const Button = ({ children, onClick, variant = 'primary', className = '', ...props }) => {
    const baseClasses = 'px-4 py-2 rounded-lg font-semibold flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    const variants = {
        primary: 'bg-orange-600 text-white hover:bg-orange-700 focus:ring-orange-500',
        secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    };
    return <button className={`${baseClasses} ${variants[variant]} ${className}`} onClick={onClick} {...props}>{children}</button>;
};
const Input = ({ label, id, ...props }) => (
    <div>
        {label && <label htmlFor={id} className="block text-sm font-medium text-gray-600 mb-1">{label}</label>}
        <input id={id} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500" {...props} />
    </div>
);
const Select = ({ label, id, children, ...props }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
        <select id={id} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500" {...props}>{children}</select>
    </div>
);
const Textarea = ({ label, id, ...props }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
        <textarea id={id} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500" {...props} />
    </div>
);
const Section = ({ title, children, defaultOpen = true }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="bg-gray-50 rounded-xl my-6">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-4 font-bold text-lg text-gray-800">
                {title}
                {isOpen ? <ChevronDown /> : <ChevronRight />}
            </button>
            {isOpen && <div className="p-4 border-t border-gray-200">{children}</div>}
        </div>
    );
};

// --- Main Application Components ---
const QuoteCalculator = ({ onSaveQuote }) => {
    const [customerName, setCustomerName] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');
    const [customerRegion, setCustomerRegion] = useState(REGIONS[0]);
    const [salesperson, setSalesperson] = useState(SALESPEOPLE[0]);
    const [quoteNotes, setQuoteNotes] = useState('');
    const [lineItems, setLineItems] = useState([]);
    const [discount, setDiscount] = useState(0);

    const addLineItem = (productId) => {
        const product = ALL_PRODUCTS.find(p => p.id === productId);
        if (product) setLineItems([...lineItems, { ...product, quantity: 1, customPrice: product.salesPriceUSD }]);
    };
    const updateLineItem = (index, field, value) => {
        const updatedItems = [...lineItems];
        if (field === 'quantity' || field === 'customPrice') value = parseFloat(value) || 0;
        updatedItems[index][field] = value;
        setLineItems(updatedItems);
    };
    const removeLineItem = (index) => setLineItems(lineItems.filter((_, i) => i !== index));

    const quoteTotals = useMemo(() => {
        const subtotal = lineItems.reduce((acc, item) => acc + (item.customPrice * item.quantity), 0);
        const totalDiscount = subtotal * (discount / 100);
        const finalSalesPrice = subtotal - totalDiscount;
        const totalCostPrice = lineItems.reduce((acc, item) => acc + (item.costPriceUSD * item.quantity), 0);
        const grossMarginAmount = finalSalesPrice - totalCostPrice;
        const grossMarginPercentage = finalSalesPrice > 0 ? (grossMarginAmount / finalSalesPrice) * 100 : 0;
        return { subtotal, totalDiscount, finalSalesPrice, totalCostPrice, grossMarginAmount, grossMarginPercentage };
    }, [lineItems, discount]);

    const handleSave = () => {
        if (!customerName) { alert("Please enter a customer name."); return; }
        const newQuote = {
            id: `QN-${String(Date.now()).slice(-6)}`,
            customerName, customerEmail, customerPhone, customerAddress, customerRegion,
            salesperson, quoteNotes, lineItems, discount,
            status: 'DRAFT',
            ...quoteTotals,
            createdAt: new Date().toISOString(),
        };
        onSaveQuote(newQuote);
        setCustomerName(''); setCustomerEmail(''); setCustomerPhone(''); setCustomerAddress('');
        setLineItems([]); setDiscount(0); setQuoteNotes('');
    };
    
    const generatePDF = () => {
        if (!customerName) { alert("Please enter a customer name."); return; }
        const { subtotal, totalDiscount, finalSalesPrice } = quoteTotals;

        const lineItemsHtml = lineItems.map(item => `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eaeaea;">${item.name}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eaeaea; text-align: center;">${item.quantity}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eaeaea; text-align: right;">$${item.customPrice.toFixed(2)}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eaeaea; text-align: right;">$${(item.customPrice * item.quantity).toFixed(2)}</td>
            </tr>`).join('');

        const termsAndConditionsHTML = `<div style="margin-top: 40px; font-size: 10px; color: #555; border-top: 1px solid #eaeaea; padding-top: 20px;">
            <h3 style="font-size: 14px; color: #333; border-bottom: none; margin-top: 0;">Terms and Conditions</h3>
            <p><b>Warranty:</b> 18 months from the date of delivery, covering manufacturing defects under normal use and service.</p>
            <p><b>Payment Terms:</b> Full payment is required upon order confirmation.</p>
            <p><b>Validity:</b> Quotation valid for 30 days from the date of issue.</p>
        </div>`;

        const reportHtml = `
            <html>
            <head>
                <style>
                    body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 12px; color: #333; }
                    .page { width: 210mm; min-height: 297mm; padding: 20mm; margin: 0 auto; box-sizing: border-box; }
                    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 2px solid #F56600; }
                    .company-details { font-size: 11px; line-height: 1.5; }
                    .quote-details { text-align: right; }
                    .quote-details h1 { font-size: 28px; color: #F56600; margin: 0; }
                    .customer-info { margin-top: 30px; padding: 15px; border: 1px solid #eaeaea; border-radius: 8px; }
                    h2 { font-size: 16px; color: #333; border-bottom: 1px solid #eaeaea; padding-bottom: 8px; margin-top: 30px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th { background-color: #f9f9f9; text-align: left; padding: 10px; }
                    .totals { float: right; width: 50%; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="page">
                    <div class="header">
                        <div class="company-details">
                            <strong>Karnot Energy Solutions INC.</strong><br>
                            VAT REG. TIN: 678-799-105-00000<br>
                            Low Carbon Innovation Centre, Cosmos Street, Nilombot,<br>
                            2429 Mapandan, Pangasinan, Philippines<br>
                            Tel: +63 75 510 8922
                        </div>
                        <div class="quote-details">
                            <h1>Sales Quotation</h1>
                            <p><strong>Quote ID:</strong> QN-${String(Date.now()).slice(-6)}</p>
                            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                            <p><strong>Salesperson:</strong> ${salesperson}</p>
                        </div>
                    </div>
                    <div class="customer-info">
                        <strong>Quote For:</strong><br>
                        ${customerName}<br>
                        ${customerAddress.replace(/\n/g, '<br/>')}
                    </div>
                    <h2>Products & Services</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Description</th>
                                <th style="text-align: center;">Qty</th>
                                <th style="text-align: right;">Unit Price</th>
                                <th style="text-align: right;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>${lineItemsHtml}</tbody>
                    </table>
                    <div class="totals">
                        <table style="font-size: 14px;">
                            <tr>
                                <td style="padding: 8px;">Subtotal:</td>
                                <td style="padding: 8px; text-align: right;">$${subtotal.toFixed(2)}</td>
                            </tr>
                            ${discount > 0 ? `<tr>
                                <td style="padding: 8px;">Discount (${discount}%):</td>
                                <td style="padding: 8px; text-align: right;">-$${totalDiscount.toFixed(2)}</td>
                            </tr>` : ''}
                            <tr style="font-weight: bold; border-top: 2px solid #333;">
                                <td style="padding: 8px;">Total Amount:</td>
                                <td style="padding: 8px; text-align: right;">$${finalSalesPrice.toFixed(2)}</td>
                            </tr>
                        </table>
                    </div>
                    <div style="clear: both;"></div>
                    ${termsAndConditionsHTML}
                </div>
            </body>
            </html>`;
        
        const element = document.createElement('div');
        element.innerHTML = reportHtml;
        html2pdf().from(element.querySelector('.page')).set({
            margin: 0,
            filename: `Karnot-Quote-${customerName.replace(/\s/g, '_')}.pdf`,
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).save();
    };

    return (
        <Card>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Create New Quote</h2>
            <Section title="1. Customer Information">
                <div className="grid md:grid-cols-2 gap-4">
                    <Input label="Customer Name" id="customerName" type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                    <Input label="Customer Email" id="customerEmail" type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} />
                    <Input label="Customer Phone" id="customerPhone" type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                    <Select label="Region" id="customerRegion" value={customerRegion} onChange={e => setCustomerRegion(e.target.value)}>
                        {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </Select>
                    <Textarea label="Address" id="customerAddress" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} rows="3" className="md:col-span-2" />
                </div>
            </Section>
            {/* ... Other sections (Quote Details, Totals) ... */}
            <div className="flex flex-col md:flex-row gap-4 mt-8">
                <Button onClick={handleSave} className="w-full md:w-auto flex-grow"><Plus className="mr-2" size={20} /> Save Quote to CRM</Button>
                <Button onClick={generatePDF} variant="secondary" className="w-full md:w-auto"><Download className="mr-2" size={20} /> Generate Quote PDF</Button>
            </div>
        </Card>
    );
};

const SavedQuotesList = ({ quotes, onUpdateQuoteStatus, onDeleteQuote }) => {
    const [expandedQuoteId, setExpandedQuoteId] = useState(null);
    const [regionFilter, setRegionFilter] = useState('ALL');

    const filteredQuotes = useMemo(() => {
        if (regionFilter === 'ALL') return quotes;
        return quotes.filter(q => q.customerRegion === regionFilter);
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
                    <Select id="regionFilter" value={regionFilter} onChange={e => setRegionFilter(e.target.value)}>
                        <option value="ALL">All Regions</option>
                        {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </Select>
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
                                    <td className="p-3">{quote.customerName}</td>
                                    <td className="p-3">{quote.customerRegion}</td>
                                    <td className="p-3"><StatusBadge status={quote.status} /></td>
                                    <td className="p-3 text-right font-semibold">${quote.finalSalesPrice.toFixed(2)}</td>
                                    <td className="p-3 text-right text-green-600">{quote.grossMarginPercentage.toFixed(2)}%</td>
                                </tr>
                                {expandedQuoteId === quote.id && (
                                    <tr className="bg-gray-100"><td colSpan="8" className="p-4">
                                        {/* ... Expanded view details ... */}
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
    const [activeView, setActiveView] = useState('dashboard');

    const handleSaveQuote = (newQuote) => {
        setSavedQuotes([...savedQuotes, newQuote]);
        setActiveView('list');
        alert(`Quote ${newQuote.id} for ${newQuote.customerName} has been saved!`);
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
