import React, { useState, useMemo } from 'react';
import { Download, Plus, Trash2, ChevronDown, ChevronRight, FileText, List, X } from 'lucide-react';

// --- Expanded Product Database with Real Costs ---
// Data is based on the provided image. Sales prices are calculated with a default margin.
// EUR costs have been converted to USD for this version (1 EUR = 1.08 USD).
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
    { id: 'icool_5', name: "Karnot iCOOL 5 CO2 MT", costPriceUSD: 6492.96, salesPriceUSD: 9690.98 }, // 6012 EUR * 1.08
    { id: 'icool_7', name: "Karnot iCOOL 7 CO2 MT", costPriceUSD: 9699.48, salesPriceUSD: 14476.84 }, // 8981 EUR * 1.08
    { id: 'icool_15', name: "Karnot iCOOL 15 CO2 MT/LT", costPriceUSD: 13691.16, salesPriceUSD: 20434.57 }, // 12677 EUR * 1.08
    { id: 'icool_max_15', name: "Karnot iCOOL 15MAX CO2 MT/LT", costPriceUSD: 14580.00, salesPriceUSD: 21761.19 }, // 13500 EUR * 1.08
    { id: 'icool_22', name: "Karnot iCOOL 22 CO2 MT", costPriceUSD: 18360.00, salesPriceUSD: 27402.99 }, // 17000 EUR * 1.08
    { id: 'imesh', name: "Karnot iMESH", costPriceUSD: 622.08, salesPriceUSD: 928.48 }, // 576 EUR * 1.08
    { id: 'manual_service', name: "Manual Service/Item", salesPriceUSD: 0, costPriceUSD: 0 },
];

const SALESPEOPLE = ["Stuart Cox", "Jane Smith", "Robert Johnson"];

// --- Helper Components ---
const Card = ({ children, className = '' }) => <div className={`bg-white rounded-2xl shadow-lg p-6 md:p-8 ${className}`}>{children}</div>;
const Button = ({ children, onClick, variant = 'primary', className = '', ...props }) => {
    const baseClasses = 'px-4 py-2 rounded-lg font-semibold flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2';
    const variants = {
        primary: 'bg-orange-600 text-white hover:bg-orange-700 focus:ring-orange-500',
        secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    };
    return <button className={`${baseClasses} ${variants[variant]} ${className}`} onClick={onClick} {...props}>{children}</button>;
};
const Input = ({ label, id, ...props }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
        <input id={id} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500" {...props} />
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
    const [salesperson, setSalesperson] = useState(SALESPEOPLE[0]);
    const [quoteNotes, setQuoteNotes] = useState('');
    const [lineItems, setLineItems] = useState([]);
    const [discount, setDiscount] = useState(0);

    const addLineItem = (productId) => {
        const product = ALL_PRODUCTS.find(p => p.id === productId);
        if (product) {
            setLineItems([...lineItems, { ...product, quantity: 1, customPrice: product.salesPriceUSD }]);
        }
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
            customerName, customerEmail, customerPhone, customerAddress,
            salesperson, quoteNotes, lineItems, discount,
            ...quoteTotals,
            createdAt: new Date().toISOString(),
        };
        onSaveQuote(newQuote);
        // Reset form
        setCustomerName(''); setCustomerEmail(''); setCustomerPhone(''); setCustomerAddress('');
        setLineItems([]); setDiscount(0); setQuoteNotes('');
    };
    
    const generatePDF = () => {
        if (!customerName) { alert("Please enter a customer name before generating a PDF."); return; }
        const { subtotal, totalDiscount, finalSalesPrice } = quoteTotals;
        const lineItemsHtml = lineItems.map(item => `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td><td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td><td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${item.customPrice.toFixed(2)}</td><td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${(item.customPrice * item.quantity).toFixed(2)}</td></tr>`).join('');
        const reportHtml = `<html><head><style>body{font-family:'Helvetica','Arial',sans-serif;font-size:12px;color:#333}h1,h2{color:#F56600}table{width:100%;border-collapse:collapse}th{background-color:#f2f2f2;text-align:left;padding:8px}</style></head><body style="padding:40px;"><h1>Sales Quotation</h1><p><strong>Quote ID:</strong> QN-${String(Date.now()).slice(-6)}</p><p><strong>Salesperson:</strong> ${salesperson}</p><p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p><hr style="margin:20px 0"/><h2>Customer Information</h2><p><strong>Name:</strong> ${customerName}<br/><strong>Email:</strong> ${customerEmail}<br/><strong>Phone:</strong> ${customerPhone}<br/><strong>Address:</strong> ${customerAddress.replace(/\n/g, '<br/>')}</p><hr style="margin:20px 0"/><h2>Products & Services</h2><table><thead><tr><th>Description</th><th style="text-align:center;">Quantity</th><th style="text-align:right;">Unit Price</th><th style="text-align:right;">Amount</th></tr></thead><tbody>${lineItemsHtml}</tbody></table><hr style="margin:20px 0"/><table style="width:50%;margin-left:auto;"><tr><td>Subtotal:</td><td style="text-align:right;">$${subtotal.toFixed(2)}</td></tr>${discount > 0 ? `<tr><td>Discount (${discount}%):</td><td style="text-align:right;">-$${totalDiscount.toFixed(2)}</td></tr>` : ''}<tr><td><strong>Total Amount:</strong></td><td style="text-align:right;"><strong>$${finalSalesPrice.toFixed(2)}</strong></td></tr></table></body></html>`;
        const element = document.createElement('div');
        element.innerHTML = reportHtml;
        html2pdf().from(element).set({ margin: 0.5, filename: `Quote-${customerName.replace(/\s/g, '_')}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' } }).save();
    };

    return (
        <Card>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Create New Quote</h2>
            <Section title="1. Customer Information">
                <div className="grid md:grid-cols-2 gap-4">
                    <Input label="Customer Name" id="customerName" type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="e.g., John Doe" />
                    <Input label="Customer Email" id="customerEmail" type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="e.g., john.doe@example.com" />
                    <Input label="Customer Phone" id="customerPhone" type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="e.g., +1-555-123-4567" />
                    <Textarea label="Address" id="customerAddress" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} rows="3" />
                </div>
            </Section>
            <Section title="2. Quote Details & Line Items">
                 <div className="grid md:grid-cols-2 gap-4 mb-6">
                    <div>
                        <label htmlFor="salesperson" className="block text-sm font-medium text-gray-600 mb-1">Salesperson</label>
                        <select id="salesperson" value={salesperson} onChange={e => setSalesperson(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500">
                            {SALESPEOPLE.map(name => <option key={name} value={name}>{name}</option>)}
                        </select>
                    </div>
                    <Textarea label="Internal Notes" id="quoteNotes" value={quoteNotes} onChange={e => setQuoteNotes(e.target.value)} rows="3" placeholder="Add any internal notes about this quote..."/>
                </div>
                <div className="flex items-center gap-2 mb-4">
                    <select onChange={e => addLineItem(e.target.value)} className="flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500">
                        <option>-- Add a Product --</option>
                        {ALL_PRODUCTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div className="space-y-4">
                    {lineItems.map((item, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center bg-gray-100 p-3 rounded-lg">
                            <div className="md:col-span-5 font-medium">{item.name}</div>
                            <div className="md:col-span-2"><Input label="Qty" type="number" value={item.quantity} onChange={e => updateLineItem(index, 'quantity', e.target.value)} min="1" /></div>
                            <div className="md:col-span-2"><Input label="Sales Price" type="number" value={item.customPrice} onChange={e => updateLineItem(index, 'customPrice', e.target.value)} /></div>
                            <div className="md:col-span-2 text-right font-semibold text-gray-700">${(item.customPrice * item.quantity).toFixed(2)}</div>
                            <div className="md:col-span-1 flex justify-end"><Button onClick={() => removeLineItem(index)} variant="danger" className="p-2"><Trash2 size={16} /></Button></div>
                        </div>
                    ))}
                </div>
            </Section>
            <Section title="3. Totals & Margin Analysis">
                 <div className="grid md:grid-cols-2 gap-8">
                    <div className="bg-green-50 p-4 rounded-lg"><h4 className="font-bold text-lg text-green-800 mb-2">Sales Summary</h4><div className="space-y-2"><div className="flex justify-between"><span>Subtotal:</span> <span>${quoteTotals.subtotal.toFixed(2)}</span></div><div className="flex items-center gap-2"><label htmlFor="discount" className="flex-shrink-0">Discount (%):</label><input id="discount" type="number" value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} className="w-full px-2 py-1 border border-gray-300 rounded-md" /></div><div className="flex justify-between text-green-700"><span>Discount Amount:</span> <span>-${quoteTotals.totalDiscount.toFixed(2)}</span></div><hr className="my-2"/><div className="flex justify-between font-bold text-xl"><span>Final Sales Price:</span> <span>${quoteTotals.finalSalesPrice.toFixed(2)}</span></div></div></div>
                    <div className="bg-blue-50 p-4 rounded-lg"><h4 className="font-bold text-lg text-blue-800 mb-2">Internal Margin Analysis</h4><div className="space-y-2"><div className="flex justify-between"><span>Total Cost Price:</span> <span>${quoteTotals.totalCostPrice.toFixed(2)}</span></div><div className="flex justify-between"><span>Final Sales Price:</span> <span>${quoteTotals.finalSalesPrice.toFixed(2)}</span></div><hr className="my-2"/><div className="flex justify-between font-bold text-xl text-blue-700"><span>Gross Margin:</span> <span>${quoteTotals.grossMarginAmount.toFixed(2)}</span></div><div className="flex justify-between font-bold text-xl text-blue-700"><span>Margin (%):</span> <span>{quoteTotals.grossMarginPercentage.toFixed(2)}%</span></div></div></div>
                </div>
            </Section>
            <div className="flex flex-col md:flex-row gap-4 mt-8">
                <Button onClick={handleSave} className="w-full md:w-auto flex-grow"><Plus className="mr-2" size={20} /> Save Quote to CRM</Button>
                <Button onClick={generatePDF} variant="secondary" className="w-full md:w-auto"><Download className="mr-2" size={20} /> Generate Customer PDF</Button>
            </div>
        </Card>
    );
};

const SavedQuotesList = ({ quotes }) => {
    const [expandedQuoteId, setExpandedQuoteId] = useState(null);
    return (
        <Card>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Saved Quotes</h2>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead><tr className="border-b bg-gray-50"><th className="p-3"></th><th className="p-3">Quote ID</th><th className="p-3">Customer</th><th className="p-3">Salesperson</th><th className="p-3">Date</th><th className="p-3 text-right">Sales Price</th><th className="p-3 text-right">Margin</th></tr></thead>
                    <tbody>
                        {quotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(quote => (
                            <React.Fragment key={quote.id}>
                                <tr className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => setExpandedQuoteId(expandedQuoteId === quote.id ? null : quote.id)}>
                                    <td className="p-3">{expandedQuoteId === quote.id ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}</td>
                                    <td className="p-3 font-mono text-sm">{quote.id}</td>
                                    <td className="p-3">{quote.customerName}</td>
                                    <td className="p-3">{quote.salesperson}</td>
                                    <td className="p-3">{new Date(quote.createdAt).toLocaleDateString()}</td>
                                    <td className="p-3 text-right font-semibold">${quote.finalSalesPrice.toFixed(2)}</td>
                                    <td className="p-3 text-right text-green-600">{quote.grossMarginPercentage.toFixed(2)}%</td>
                                </tr>
                                {expandedQuoteId === quote.id && (
                                    <tr className="bg-gray-100"><td colSpan="7" className="p-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><strong>Email:</strong> {quote.customerEmail}</div>
                                            <div><strong>Phone:</strong> {quote.customerPhone}</div>
                                            <div className="col-span-2"><strong>Address:</strong> {quote.customerAddress}</div>
                                            <div className="col-span-2"><strong>Notes:</strong> <pre className="font-sans whitespace-pre-wrap">{quote.quoteNotes}</pre></div>
                                            <div className="col-span-2">
                                                <h5 className="font-bold mt-2">Line Items:</h5>
                                                <ul className="list-disc pl-5">
                                                    {quote.lineItems.map((li, i) => <li key={i}>{li.quantity}x {li.name} @ ${li.customPrice.toFixed(2)}</li>)}
                                                </ul>
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

export default function App() {
    const [savedQuotes, setSavedQuotes] = useState([]);
    const [activeView, setActiveView] = useState('calculator');
    const handleSaveQuote = (newQuote) => {
        setSavedQuotes([...savedQuotes, newQuote]);
        setActiveView('list');
        alert(`Quote ${newQuote.id} for ${newQuote.customerName} has been saved!`);
    };
    return (
        <div className="bg-gray-100 min-h-screen font-sans text-gray-900">
            <header className="bg-white shadow-md">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-orange-600">Karnot Quoting CRM</h1>
                    <nav className="flex gap-2">
                         <Button onClick={() => setActiveView('calculator')} variant={activeView === 'calculator' ? 'primary' : 'secondary'}><FileText className="mr-2" size={16} /> New Quote</Button>
                        <Button onClick={() => setActiveView('list')} variant={activeView === 'list' ? 'primary' : 'secondary'}><List className="mr-2" size={16} /> Saved Quotes ({savedQuotes.length})</Button>
                    </nav>
                </div>
            </header>
            <main className="container mx-auto p-4 md:p-8">
                {activeView === 'calculator' && <QuoteCalculator onSaveQuote={handleSaveQuote} />}
                {activeView === 'list' && <SavedQuotesList quotes={savedQuotes} />}
            </main>
        </div>
    );
}
