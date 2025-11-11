// src/components/QuoteCalculator.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Eye, Plus, Trash2, Edit, Save, X } from 'lucide-react';
// --- FIX 1: Import from .jsx file ---
import { ALL_PRODUCTS, Card, Button, Input, Textarea, Checkbox, Section } from '../data/constants.jsx';

// This is the entire QuoteCalculator component, moved from App.jsx
const QuoteCalculator = ({ onSaveQuote, nextQuoteNumber, initialData = null }) => {
    const [customer, setCustomer] = useState({ name: '', number: '', tin: '', address: '', saleType: 'Export' });
    const [commercial, setCommercial] = useState({ shippingTerms: 'Ex-Works Warehouse', deliveryTime: '3-5 days from payment', dueDate: '', discount: 0, wht: 0 });
    const [docControl, setDocControl] = useState({ quoteNumber: nextQuoteNumber, revision: 'A', paymentTerms: 'Full payment is required upon order confirmation.' });
    const [costing, setCosting] = useState({ forexRate: 58.50, transportCost: 0, dutiesRate: 1, vatRate: 12, brokerFees: 0 });
    const [docGeneration, setDocGeneration] = useState({ generateInPHP: false, generateQuote: true, generateProForma: true, generateBirInvoice: false, includeLandedCost: true });
    
    const [selectedProducts, setSelectedProducts] = useState({});
    const [manualItems, setManualItems] = useState([]);
    const [manualItemInput, setManualItemInput] = useState({ name: '', price: '', specs: '' });

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
            ...Object.entries(selectedProducts)
                .map(([id, quantity]) => {
                    const product = ALL_PRODUCTS.find(p => p.id === id);
                    if (!product) return null; 
                    return { ...product, quantity };
                })
                .filter(Boolean), 
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
                    {/* --- FIX 2: Typo 'includeLamdCost' corrected to 'includeLandedCost' --- */}
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
                <Button onClick={addManualItem} className="w-full md:w-auto mt-4"><Plus className="mr-2" size={16}/>Add Item</Button>
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

export default QuoteCalculator;
