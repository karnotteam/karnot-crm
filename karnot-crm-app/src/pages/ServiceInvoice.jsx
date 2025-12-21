import React, { useState, useEffect, useMemo } from 'react';
import { 
    Wrench, Truck, Users, Save, FileText, Calculator, 
    HardHat, ArrowRight, DollarSign, Plus, X, Zap
} from 'lucide-react';
import { Card, Button, Input, Textarea, Section } from '../data/constants.jsx';
import { db } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, setDoc } from "firebase/firestore";

const ServiceInvoice = ({ companies = [], user }) => {
    const [serviceInvoices, setServiceInvoices] = useState([]);
    const [activeTab, setActiveTab] = useState('new'); // 'new' or 'list'
    const [loading, setLoading] = useState(false);

    // --- SERVICE INVOICE STATE ---
    const [invoice, setInvoice] = useState({
        // Customer Info
        customerName: '',
        customerAddress: '',
        customerContact: '',
        
        // Invoice Details
        invoiceNumber: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        
        // Service Type
        serviceType: 'MAINTENANCE', // MAINTENANCE, REPAIR, INSTALLATION, CONSULTATION
        
        // Line Items
        lineItems: [],
        
        // Status
        status: 'DRAFT' // DRAFT, INVOICED, PAID
    });

    // Single line item form
    const [newLineItem, setNewLineItem] = useState({
        description: '',
        quantity: 1,
        unitPrice: 0,
        unit: 'SERVICE'
    });

    // --- LOAD SERVICE INVOICES ---
    useEffect(() => {
        if (!user) return;
        
        const q = query(
            collection(db, "users", user.uid, "service_invoices"), 
            orderBy("createdAt", "desc")
        );
        
        const unsub = onSnapshot(q, (snap) => {
            setServiceInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        
        return () => unsub();
    }, [user]);

    // --- AUTO-GENERATE INVOICE NUMBER ---
    useEffect(() => {
        if (serviceInvoices.length > 0) {
            const lastNum = parseInt(serviceInvoices[0].invoiceNumber?.replace('SI-', '') || '3000');
            setInvoice(prev => ({ ...prev, invoiceNumber: `SI-${lastNum + 1}` }));
        } else {
            setInvoice(prev => ({ ...prev, invoiceNumber: 'SI-3001' }));
        }
    }, [serviceInvoices]);

    // --- CALCULATIONS ---
    const totals = useMemo(() => {
        const subtotal = invoice.lineItems.reduce((sum, item) => {
            return sum + (item.quantity * item.unitPrice);
        }, 0);
        
        const vat = subtotal * 0.12; // 12% VAT for Non-BOI
        const total = subtotal + vat;
        
        return { subtotal, vat, total };
    }, [invoice.lineItems]);

    // --- HANDLERS ---
    const handleAddLineItem = () => {
        if (!newLineItem.description || newLineItem.unitPrice <= 0) {
            return alert("Please enter description and unit price");
        }
        
        setInvoice({
            ...invoice,
            lineItems: [...invoice.lineItems, { ...newLineItem, id: Date.now() }]
        });
        
        setNewLineItem({
            description: '',
            quantity: 1,
            unitPrice: 0,
            unit: 'SERVICE'
        });
    };

    const handleRemoveLineItem = (id) => {
        setInvoice({
            ...invoice,
            lineItems: invoice.lineItems.filter(item => item.id !== id)
        });
    };

    const handleSelectCompany = (e) => {
        const companyId = e.target.value;
        const company = companies.find(c => c.id === companyId);
        if (company) {
            setInvoice({
                ...invoice,
                customerName: company.companyName,
                customerAddress: company.address || '',
                customerContact: company.email || company.phone || ''
            });
        }
    };

    const handleSaveInvoice = async () => {
        if (!invoice.customerName || invoice.lineItems.length === 0) {
            return alert("Please add customer details and at least one line item");
        }
        
        setLoading(true);
        try {
            const invoiceData = {
                ...invoice,
                subtotal: totals.subtotal,
                vat: totals.vat,
                total: totals.total,
                boiActivity: false, // NON-BOI ACTIVITY
                createdAt: serverTimestamp(),
                lastModified: serverTimestamp()
            };
            
            if (invoice.id) {
                // Update existing
                await updateDoc(doc(db, "users", user.uid, "service_invoices", invoice.id), invoiceData);
            } else {
                // Create new
                await addDoc(collection(db, "users", user.uid, "service_invoices"), invoiceData);
            }
            
            alert("Service Invoice Saved!");
            resetForm();
            setActiveTab('list');
        } catch (error) {
            console.error(error);
            alert("Error saving invoice");
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setInvoice({
            customerName: '',
            customerAddress: '',
            customerContact: '',
            invoiceNumber: `SI-${parseInt(invoice.invoiceNumber.replace('SI-', '')) + 1}`,
            invoiceDate: new Date().toISOString().split('T')[0],
            serviceType: 'MAINTENANCE',
            lineItems: [],
            status: 'DRAFT'
        });
    };

    const handleEditInvoice = (inv) => {
        setInvoice(inv);
        setActiveTab('new');
    };

    const handleUpdateStatus = async (invId, newStatus) => {
        try {
            await updateDoc(doc(db, "users", user.uid, "service_invoices", invId), {
                status: newStatus,
                lastModified: serverTimestamp()
            });
        } catch (error) {
            console.error(error);
        }
    };

    // --- GENERATE PDF ---
    const generateInvoicePDF = (inv = invoice) => {
        const logoURL = "https://img1.wsimg.com/isteam/ip/cb1de239-c2b8-4674-b57d-5ae86a72feb1/Asset%2010%404x.png/:/rs=w:400,cg:true,m";
        
        const html = `
        <html>
        <head>
            <title>Service Invoice - ${inv.invoiceNumber}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
                .header { display: flex; justify-content: space-between; border-bottom: 3px solid #f59e0b; padding-bottom: 20px; margin-bottom: 30px; }
                .invoice-title { color: #f59e0b; font-size: 28px; font-weight: bold; text-transform: uppercase; }
                .section { margin-bottom: 20px; }
                .label { font-size: 10px; font-weight: bold; color: #666; text-transform: uppercase; }
                .value { font-size: 14px; margin-top: 3px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th { text-align: left; background: #fef3c7; padding: 12px; font-size: 11px; border-bottom: 2px solid #fbbf24; }
                td { border-bottom: 1px solid #eee; padding: 12px; font-size: 13px; }
                .totals { float: right; width: 350px; margin-top: 30px; }
                .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
                .total-final { background: #fef3c7; padding: 15px; margin-top: 10px; border-radius: 8px; font-size: 18px; font-weight: bold; }
                .non-boi-badge { background: #dc2626; color: white; padding: 4px 12px; border-radius: 20px; font-size: 10px; font-weight: bold; display: inline-block; }
                .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 11px; color: #666; }
            </style>
        </head>
        <body>
            <div class="header">
                <div>
                    <img src="${logoURL}" width="140" />
                    <p style="font-size:11px; margin-top:10px; line-height: 1.6;">
                        <strong>Karnot Energy Solutions Inc.</strong><br>
                        Mapandan, Pangasinan<br>
                        TIN: [Your TIN]
                    </p>
                </div>
                <div style="text-align:right;">
                    <div class="invoice-title">Service Invoice</div>
                    <p style="margin-top: 5px;"><span class="non-boi-badge">NON-BOI ACTIVITY</span></p>
                    <p style="margin-top: 15px; font-size: 13px;">
                        <strong>Invoice No:</strong> ${inv.invoiceNumber}<br>
                        <strong>Date:</strong> ${new Date(inv.invoiceDate).toLocaleDateString()}<br>
                        <strong>Service Type:</strong> ${inv.serviceType}
                    </p>
                </div>
            </div>

            <div class="section">
                <div class="label">Bill To:</div>
                <div class="value">
                    <strong>${inv.customerName}</strong><br>
                    ${inv.customerAddress}<br>
                    ${inv.customerContact}
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Description</th>
                        <th style="text-align:center; width: 100px;">Quantity</th>
                        <th style="text-align:right; width: 120px;">Unit Price</th>
                        <th style="text-align:right; width: 120px;">Amount (PHP)</th>
                    </tr>
                </thead>
                <tbody>
                    ${inv.lineItems.map(item => `
                        <tr>
                            <td>${item.description}</td>
                            <td style="text-align:center;">${item.quantity} ${item.unit}</td>
                            <td style="text-align:right;">${item.unitPrice.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                            <td style="text-align:right; font-weight: bold;">${(item.quantity * item.unitPrice).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="totals">
                <div class="totals-row">
                    <span>Subtotal:</span>
                    <span>₱${(inv.subtotal || totals.subtotal).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
                <div class="totals-row" style="color: #dc2626;">
                    <span>VAT (12%):</span>
                    <span>₱${(inv.vat || totals.vat).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
                <div class="total-final">
                    <div style="display: flex; justify-content: space-between;">
                        <span>TOTAL AMOUNT DUE:</span>
                        <span style="color: #f59e0b;">₱${(inv.total || totals.total).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                </div>
            </div>

            <div style="clear: both;"></div>

            <div class="footer">
                <p><strong>Payment Terms:</strong> Net 30 days from invoice date</p>
                <p><strong>Bank Details:</strong> [Your Bank Account Details]</p>
                <p style="margin-top: 20px; font-size: 10px; color: #999;">
                    <strong>Tax Notice:</strong> This invoice covers Non-BOI registered activities and is subject to regular 12% VAT and 25% corporate income tax.
                </p>
            </div>

            <div style="margin-top: 60px; display: flex; justify-content: space-between;">
                <div style="width: 45%;">
                    <div class="label">Prepared By:</div>
                    <div style="margin-top:40px; border-top: 1px solid #ccc; padding-top: 5px;">Authorized Signature</div>
                </div>
                <div style="width: 45%;">
                    <div class="label">Received By:</div>
                    <div style="margin-top:40px; border-top: 1px solid #ccc; padding-top: 5px;">Customer Signature over Printed Name</div>
                </div>
            </div>
        </body>
        </html>
        `;

        const win = window.open("", "Print", "width=800,height=900");
        win.document.write(html);
        win.document.close();
    };

    const formatMoney = (val) => `₱${Number(val).toLocaleString(undefined, {minimumFractionDigits: 2})}`;

    return (
        <div className="max-w-7xl mx-auto pb-20 space-y-8">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-orange-100 text-orange-600 rounded-3xl">
                        <Wrench size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-gray-800 uppercase tracking-tighter">Service Invoicing</h1>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Non-BOI Activities • Regular HVAC Services</p>
                    </div>
                </div>
                
                <div className="flex gap-2 bg-gray-50 p-1 rounded-xl border border-gray-200 mt-4 md:mt-0">
                    <button 
                        onClick={() => setActiveTab('new')}
                        className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                            activeTab === 'new' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400'
                        }`}
                    >
                        <Plus size={14} className="inline mr-1"/> New Invoice
                    </button>
                    <button 
                        onClick={() => setActiveTab('list')}
                        className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                            activeTab === 'list' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400'
                        }`}
                    >
                        <FileText size={14} className="inline mr-1"/> Invoice List ({serviceInvoices.length})
                    </button>
                </div>
            </div>

            {/* TAB CONTENT */}
            {activeTab === 'new' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* LEFT: INVOICE FORM */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* CUSTOMER DETAILS */}
                        <Card className="p-6">
                            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                                <Users size={14}/> Customer Details
                            </h3>
                            
                            <div className="mb-4">
                                <label className="text-xs font-bold text-gray-500">Quick Select from Companies</label>
                                <select 
                                    onChange={handleSelectCompany}
                                    className="w-full mt-1 p-3 border border-gray-200 rounded-lg font-bold text-sm"
                                >
                                    <option value="">-- Select Existing Company --</option>
                                    {companies.map(c => (
                                        <option key={c.id} value={c.id}>{c.companyName}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input 
                                    label="Customer Name" 
                                    value={invoice.customerName}
                                    onChange={e => setInvoice({...invoice, customerName: e.target.value})}
                                    placeholder="Company or Individual"
                                />
                                <Input 
                                    label="Contact Info" 
                                    value={invoice.customerContact}
                                    onChange={e => setInvoice({...invoice, customerContact: e.target.value})}
                                    placeholder="Email or Phone"
                                />
                            </div>
                            
                            <Textarea 
                                label="Address"
                                rows="2"
                                value={invoice.customerAddress}
                                onChange={e => setInvoice({...invoice, customerAddress: e.target.value})}
                                placeholder="Customer address..."
                            />
                        </Card>

                        {/* LINE ITEMS */}
                        <Card className="p-6">
                            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                                <Calculator size={14}/> Service Line Items
                            </h3>

                            {/* Add Line Item Form */}
                            <div className="bg-gray-50 p-4 rounded-xl mb-4 grid grid-cols-12 gap-3">
                                <div className="col-span-5">
                                    <Input 
                                        label="Description"
                                        value={newLineItem.description}
                                        onChange={e => setNewLineItem({...newLineItem, description: e.target.value})}
                                        placeholder="e.g., Aircon Cleaning Service"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <Input 
                                        label="Qty"
                                        type="number"
                                        value={newLineItem.quantity}
                                        onChange={e => setNewLineItem({...newLineItem, quantity: e.target.value})}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <Input 
                                        label="Unit"
                                        value={newLineItem.unit}
                                        onChange={e => setNewLineItem({...newLineItem, unit: e.target.value})}
                                        placeholder="SERVICE"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <Input 
                                        label="Unit Price"
                                        type="number"
                                        value={newLineItem.unitPrice}
                                        onChange={e => setNewLineItem({...newLineItem, unitPrice: e.target.value})}
                                    />
                                </div>
                                <div className="col-span-1 flex items-end">
                                    <Button onClick={handleAddLineItem} size="sm" className="w-full bg-orange-600 hover:bg-orange-700">
                                        <Plus size={16}/>
                                    </Button>
                                </div>
                            </div>

                            {/* Line Items Table */}
                            <div className="space-y-2">
                                {invoice.lineItems.length === 0 && (
                                    <p className="text-center text-gray-400 text-sm py-8 italic">No line items added yet</p>
                                )}
                                {invoice.lineItems.map(item => (
                                    <div key={item.id} className="flex justify-between items-center p-3 bg-white border border-gray-200 rounded-lg">
                                        <div className="flex-1">
                                            <p className="font-bold text-sm">{item.description}</p>
                                            <p className="text-xs text-gray-500">{item.quantity} {item.unit} × {formatMoney(item.unitPrice)}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="font-black text-gray-800">{formatMoney(item.quantity * item.unitPrice)}</span>
                                            <button 
                                                onClick={() => handleRemoveLineItem(item.id)}
                                                className="p-1 hover:bg-red-50 text-red-500 rounded"
                                            >
                                                <X size={16}/>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>

                    {/* RIGHT: SUMMARY */}
                    <div className="space-y-6">
                        <Card className="p-6 bg-gradient-to-br from-orange-50 to-white border-2 border-orange-200">
                            <h3 className="text-xs font-black uppercase tracking-widest text-orange-600 mb-4">Invoice Details</h3>
                            
                            <Input 
                                label="Invoice Number"
                                value={invoice.invoiceNumber}
                                onChange={e => setInvoice({...invoice, invoiceNumber: e.target.value})}
                                className="font-black"
                            />
                            
                            <Input 
                                label="Invoice Date"
                                type="date"
                                value={invoice.invoiceDate}
                                onChange={e => setInvoice({...invoice, invoiceDate: e.target.value})}
                                className="mt-3"
                            />

                            <div className="mt-3">
                                <label className="text-xs font-bold text-gray-500">Service Type</label>
                                <select 
                                    value={invoice.serviceType}
                                    onChange={e => setInvoice({...invoice, serviceType: e.target.value})}
                                    className="w-full mt-1 p-3 border border-gray-200 rounded-lg font-bold"
                                >
                                    <option value="MAINTENANCE">Maintenance</option>
                                    <option value="REPAIR">Repair</option>
                                    <option value="INSTALLATION">Installation</option>
                                    <option value="CONSULTATION">Consultation</option>
                                </select>
                            </div>
                        </Card>

                        <Card className="p-6 bg-slate-800 text-white">
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6">Amount Summary</h3>
                            
                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between text-sm">
                                    <span className="opacity-70">Subtotal</span>
                                    <span className="font-mono font-bold">{formatMoney(totals.subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-sm pb-4 border-b border-slate-700">
                                    <span className="opacity-70">VAT (12%)</span>
                                    <span className="font-mono font-bold text-red-400">+ {formatMoney(totals.vat)}</span>
                                </div>
                                
                                <div className="bg-slate-700/50 p-4 rounded-xl flex justify-between items-center">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-400">Total Amount</p>
                                        <p className="text-[9px] text-slate-400 mt-0.5">Incl. 12% VAT</p>
                                    </div>
                                    <span className="text-2xl font-black">{formatMoney(totals.total)}</span>
                                </div>
                            </div>

                            <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 mb-6">
                                <p className="text-xs font-bold text-red-300 flex items-center gap-2">
                                    <Zap size={12}/> Non-BOI Activity
                                </p>
                                <p className="text-[10px] text-red-200 mt-1">
                                    Subject to regular 12% VAT + 25% corporate tax
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Button 
                                    onClick={() => generateInvoicePDF()}
                                    variant="secondary" 
                                    className="w-full py-3 font-black uppercase text-xs"
                                >
                                    <FileText size={14} className="mr-2"/> Preview PDF
                                </Button>
                                <Button 
                                    onClick={handleSaveInvoice}
                                    variant="primary" 
                                    className="w-full py-3 font-black uppercase text-xs bg-orange-600 hover:bg-orange-700 border-none shadow-lg shadow-orange-200"
                                    disabled={loading}
                                >
                                    <Save size={14} className="mr-2"/> {invoice.id ? 'Update' : 'Save'} Invoice
                                </Button>
                            </div>
                        </Card>
                    </div>
                </div>
            ) : (
                /* INVOICE LIST */
                <Card className="p-6">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b-2 border-gray-200 text-left">
                                    <th className="py-3 px-2 text-xs font-black text-gray-500 uppercase">Invoice #</th>
                                    <th className="py-3 px-2 text-xs font-black text-gray-500 uppercase">Date</th>
                                    <th className="py-3 px-2 text-xs font-black text-gray-500 uppercase">Customer</th>
                                    <th className="py-3 px-2 text-xs font-black text-gray-500 uppercase">Type</th>
                                    <th className="py-3 px-2 text-xs font-black text-gray-500 uppercase text-right">Total</th>
                                    <th className="py-3 px-2 text-xs font-black text-gray-500 uppercase text-center">Status</th>
                                    <th className="py-3 px-2 text-xs font-black text-gray-500 uppercase text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {serviceInvoices.map(inv => (
                                    <tr key={inv.id} className="hover:bg-gray-50">
                                        <td className="py-3 px-2 font-bold">{inv.invoiceNumber}</td>
                                        <td className="py-3 px-2 text-sm text-gray-600">{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                                        <td className="py-3 px-2 text-sm font-medium">{inv.customerName}</td>
                                        <td className="py-3 px-2 text-xs text-gray-500">{inv.serviceType}</td>
                                        <td className="py-3 px-2 text-right font-mono font-bold">{formatMoney(inv.total)}</td>
                                        <td className="py-3 px-2 text-center">
                                            <select 
                                                value={inv.status}
                                                onChange={(e) => handleUpdateStatus(inv.id, e.target.value)}
                                                className={`text-xs font-bold px-3 py-1 rounded-full border-0 ${
                                                    inv.status === 'PAID' ? 'bg-green-100 text-green-700' :
                                                    inv.status === 'INVOICED' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-gray-100 text-gray-700'
                                                }`}
                                            >
                                                <option value="DRAFT">DRAFT</option>
                                                <option value="INVOICED">INVOICED</option>
                                                <option value="PAID">PAID</option>
                                            </select>
                                        </td>
                                        <td className="py-3 px-2 text-center">
                                            <div className="flex gap-2 justify-center">
                                                <Button 
                                                    onClick={() => handleEditInvoice(inv)}
                                                    size="sm" 
                                                    variant="secondary"
                                                    className="text-xs"
                                                >
                                                    Edit
                                                </Button>
                                                <Button 
                                                    onClick={() => generateInvoicePDF(inv)}
                                                    size="sm" 
                                                    className="bg-orange-600 hover:bg-orange-700 text-xs"
                                                >
                                                    PDF
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {serviceInvoices.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="py-12 text-center text-gray-400 italic">
                                            No service invoices created yet
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default ServiceInvoice;
