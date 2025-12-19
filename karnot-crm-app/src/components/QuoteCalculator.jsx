import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Eye, Plus, Trash2, Edit, Save, X, Search, ChevronDown, Check, User, Handshake } from 'lucide-react';
import { Card, Button, Input, Textarea, Checkbox, Section, PRICING_TIERS } from '../data/constants.jsx';

// --- FIREBASE IMPORTS ---
import { db } from '../firebase';
import { collection, getDocs } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const QuoteCalculator = ({ onSaveQuote, nextQuoteNumber, initialData = null, companies, contacts }) => {
    
    // --- 1. STATE FOR LIVE PRODUCTS ---
    const [dbProducts, setDbProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(true);

    const [opportunityId, setOpportunityId] = useState(initialData?.opportunityId || null);

    // Added 'tier' to customer state
    const [customer, setCustomer] = useState({ 
        name: '', number: '', tin: '', address: '', saleType: 'Export',
        contactId: '', contactName: '', contactEmail: '', tier: 'STANDARD' 
    });
    
    const [commercial, setCommercial] = useState({ shippingTerms: 'Ex-Works Warehouse', deliveryTime: '3-5 days from payment', dueDate: '', discount: 0, wht: 0 });
    const [docControl, setDocControl] = useState({ quoteNumber: nextQuoteNumber, revision: 'A', paymentTerms: 'Full payment is required upon order confirmation.' });
    const [costing, setCosting] = useState({ forexRate: 58.50, transportCost: 0, dutiesRate: 1, vatRate: 12, brokerFees: 0 });
    const [docGeneration, setDocGeneration] = useState({ generateInPHP: false, generateQuote: true, generateProForma: true, generateBirInvoice: false, includeLandedCost: true });
    
    const [selectedProducts, setSelectedProducts] = useState({});
    const [manualItems, setManualItems] = useState([]);
    const [manualItemInput, setManualItemInput] = useState({ name: '', price: '', specs: '' });

    const [editingIndex, setEditingIndex] = useState(null);
    const [editingItem, setEditingItem] = useState(null);

    // --- Searchable Dropdown State ---
    const [companySearch, setCompanySearch] = useState('');
    const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // --- 2. FETCH PRODUCTS FROM FIREBASE ---
    useEffect(() => {
        const fetchProducts = async () => {
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) return;

            try {
                const querySnapshot = await getDocs(collection(db, "users", user.uid, "products"));
                const products = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                products.sort((a, b) => {
                    if (a.category === b.category) {
                        return a.name.localeCompare(b.name);
                    }
                    return a.category.localeCompare(b.category);
                });

                setDbProducts(products);
            } catch (error) {
                console.error("Error fetching products:", error);
            } finally {
                setLoadingProducts(false);
            }
        };

        fetchProducts();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsCompanyDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const defaultCustomer = { 
            name: '', number: '', tin: '', address: '', saleType: 'Export',
            contactId: '', contactName: '', contactEmail: '', tier: 'STANDARD'
        };
        const defaultCommercial = { shippingTerms: 'Ex-Works Warehouse', deliveryTime: '3-5 days from payment', dueDate: '', discount: 0, wht: 0 };
        const defaultDocControl = { quoteNumber: nextQuoteNumber, revision: 'A', paymentTerms: 'Full payment is required upon order confirmation.' };
        const defaultCosting = { forexRate: 58.50, transportCost: 0, dutiesRate: 1, vatRate: 12, brokerFees: 0 };
        const defaultDocGeneration = { generateInPHP: false, generateQuote: true, generateProForma: true, generateBirInvoice: false, includeLandedCost: true };

        if (initialData) {
            setCustomer({ ...defaultCustomer, ...initialData.customer });
            setCompanySearch(initialData.customer?.name || ''); 
            setCommercial({ ...defaultCommercial, ...initialData.commercial });
            setDocControl({ ...defaultDocControl, ...initialData.docControl, quoteNumber: initialData.docControl?.quoteNumber || nextQuoteNumber });
            setCosting({ ...defaultCosting, ...initialData.costing });
            setDocGeneration({ ...defaultDocGeneration, ...initialData.docGeneration });
            setSelectedProducts(initialData.selectedProducts || {});
            setManualItems(initialData.manualItems || []);
            setOpportunityId(initialData.opportunityId || null);
        } else {
            setCustomer(defaultCustomer);
            setCompanySearch('');
            setCommercial(defaultCommercial);
            setDocControl({ ...defaultDocControl, quoteNumber: nextQuoteNumber });
            setCosting(defaultCosting);
            setDocGeneration(defaultDocGeneration);
            setSelectedProducts({});
            setManualItems([]);
            setOpportunityId(null);
        }
    }, [initialData, nextQuoteNumber, companies]);

    const filteredCompanies = useMemo(() => {
        if (!companies) return [];
        return companies.filter(c => c.companyName.toLowerCase().includes(companySearch.toLowerCase()));
    }, [companies, companySearch]);

    const companyContacts = useMemo(() => {
        if (!customer.name || !contacts) return [];
        return contacts.filter(c => c.companyName === customer.name);
    }, [contacts, customer.name]);

    const handleSelectCompany = (company) => {
        const detectedTier = company.tier && PRICING_TIERS[company.tier] ? company.tier : 'STANDARD';
        const tierDiscount = PRICING_TIERS[detectedTier].discount;

        setCustomer(prev => ({
            ...prev,
            name: company.companyName,
            address: company.address || prev.address,
            contactId: '', contactName: '', contactEmail: '',
            tier: detectedTier 
        }));
        setCompanySearch(company.companyName);
        setIsCompanyDropdownOpen(false);

        setCommercial(prev => ({
            ...prev,
            discount: tierDiscount,
            shippingTerms: detectedTier === 'EXPORT' ? 'FOB' : prev.shippingTerms 
        }));
    };

    const handleTierChange = (e) => {
        const newTier = e.target.value;
        const newDiscount = PRICING_TIERS[newTier] ? PRICING_TIERS[newTier].discount : 0;
        
        setCustomer(prev => ({ ...prev, tier: newTier }));
        setCommercial(prev => ({ ...prev, discount: newDiscount }));
    };

    const handleSelectContact = (e) => {
        const selectedContactId = e.target.value;
        const contact = contacts.find(c => c.id === selectedContactId);
        if (contact) {
            setCustomer(prev => ({
                ...prev,
                contactId: contact.id,
                contactName: `${contact.firstName} ${contact.lastName}`,
                contactEmail: contact.email
            }));
        } else {
            setCustomer(prev => ({
                ...prev,
                contactId: '', contactName: '', contactEmail: ''
            }));
        }
    };

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
                    const product = dbProducts.find(p => p.id === id); 
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
    }, [selectedProducts, manualItems, commercial.discount, dbProducts]);

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
        
        let contactLine = '';
        if (customer.contactName) {
            contactLine = `<br><strong>Attention:</strong> ${customer.contactName}`;
        }

        const customerInfoHTML = `<div class="customer-info-box"><strong>Quote For:</strong><br>Customer No.: ${customer.number || "N/A"}<br>${customer.name || "N/A"}${contactLine}<br>${customer.address.replace(/\n/g, "<br>") || "N/A"}</div>`;
        const billToInfoHTML = `<div class="customer-info-box"><strong>Bill To:</strong><br>Customer No.: ${customer.number || "N/A"}<br>${customer.name || "N/A"}${contactLine}<br>${customer.address.replace(/\n/g, "<br>") || "N/A"}</div>`;
        const soldToInfoHTML = `<div class="customer-info-box"><strong>SOLD TO:</strong><br><strong>Customer No.:</strong> ${customer.number || "N/A"}<br><strong>Registered Name:</strong> ${customer.name || "N/A"}<br><strong>TIN:</strong> ${customer.tin || "N/A"}<br><strong>Business Address:</strong> ${customer.address.replace(/\n/g, "<br>") || "N/A"}${contactLine}</div>`;

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
            
            const birLineItemsHTML = allItems.map(p => {
                const unitPricePHP = (p.salesPriceUSD || p.priceUSD || 0) * costing.forexRate;
                const lineTotalPHP = unitPricePHP * (p.quantity || 1);
                return `<tr><td>${p.name}</td><td class="text-center">${p.quantity || 1}</td><td class="text-right">${formatPHP(unitPricePHP)}</td><td class="text-right">${formatPHP(lineTotalPHP)}</td></tr>`;
            }).join('');

            const birHeaderHTML = `<div class="report-header">${companyHeaderHTML}<div class="report-info"><h2>SALES INVOICE</h2><p><strong>No:</strong> ${String(docControl.quoteNumber).padStart(4, '0')}<br><strong>Date:</strong> ${todayFormatted}<br><strong>Due Date: ${commercial.dueDate}</strong></p></div></div>`;
            const birSummaryHTML = `<table class="summary-table"><tr><td>VATable Sales</td><td class="text-right">${formatPHP(vatableSales)}</td><td>Total Sales (VAT-Inclusive)</td><td class="text-right">${formatPHP(totalAfterDiscountPHP)}</td></tr><tr><td>VAT-Exempt Sales</td><td class="text-right">${formatPHP(0)}</td><td>Less: 12% VAT</td><td class="text-right">${formatPHP(vatAmount)}</td></tr><tr><td>Zero-Rated Sales</td><td class="text-right">${formatPHP(0)}</td><td>Net of VAT</td><td class="text-right">${formatPHP(vatableSales)}</td></tr><tr><td><strong>Total Sales</strong></td><td class="text-right"><strong>${formatPHP(vatableSales)}</strong></td><td>Less: Withholding Tax (${commercial.wht}%)</td><td class="text-right">${formatPHP(withholdingTaxAmount)}</td></tr><tr class="bir-grand-total-row"><td></td><td></td><td><strong>TOTAL AMOUNT DUE</strong></td><td class="text-right"><strong>${formatPHP(totalAmountDue)}</strong></td></tr></table>`;
            
            generatedDocumentsHTML += `<div class="report-page">${birHeaderHTML}${soldToInfoHTML}<h3>Details</h3><table class="line-items-table"><thead><tr><th>Description</th><th class="text-center">Qty</th><th class="text-right">Unit Price (PHP)</th><th class="text-right">Amount (PHP)</th></tr></thead><tbody>${birLineItemsHTML}</tbody></table><div class="summary-wrapper">${birSummaryHTML}</div>${bankDetailsPHP}</div>`;
        }

        const finalReportHTML = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Quote Preview</title><style>body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 20px; background-color: #f3f4f6; color: #333; } .report-page { background: white; max-width: 800px; margin: 0 auto 40px auto; padding: 40px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); border-radius: 8px; position: relative; } .report-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 2px solid #ea580c; padding-bottom: 20px; } .report-info h2 { color: #ea580c; margin: 0 0 10px 0; font-size: 28px; text-transform: uppercase; letter-spacing: 1px; } .customer-info-box { background-color: #f9fafb; border-left: 4px solid #ea580c; padding: 15px; margin-bottom: 30px; font-size: 14px; line-height: 1.5; } h3 { color: #4b5563; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-top: 0; } table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; } th { background-color: #ea580c; color: white; padding: 10px; text-align: left; font-weight: 600; } td { padding: 10px; border-bottom: 1px solid #e5e7eb; } .text-right { text-align: right; } .text-center { text-align: center; } .simple-summary-table { width: 100%; max-width: 400px; margin-left: auto; } .simple-summary-table td { border: none; padding: 5px 10px; } .grand-total-row { border-top: 2px solid #333; font-size: 16px; background-color: #f3f4f6; } .summary-wrapper { page-break-inside: avoid; margin-bottom: 20px; } .terms-conditions { font-size: 12px; color: #666; margin-top: 40px; border-top: 1px solid #ddd; padding-top: 20px; } dt { font-weight: bold; margin-top: 5px; color: #333; } dd { margin: 2px 0 10px 0; } @media print { body { background: white; margin: 0; padding: 0; } .report-page { box-shadow: none; margin: 0; width: 210mm; min-height: 297mm; max-width: none; page-break-after: always; padding: 20mm; } .report-page:last-child { page-break-after: auto; } }</style></head><body>${generatedDocumentsHTML}</body></html>`;
        
        const win = window.open("", "QuotePreview");
        win.document.write(finalReportHTML);
        win.document.close();
    };
    
    const handleSave = () => {
        if (!customer.name) {
            alert("Please enter a customer name.");
            return;
        }
        
        const quoteId = initialData?.id || `QN${String(docControl.quoteNumber).padStart(4, '0')}-${new Date().getFullYear()}`;

        // 1. Determine Revenue Account for P&L Matching
        let assignedRevenueAccount = "Domestic Equipment Sales";
        if (customer.saleType === 'Export') {
            assignedRevenueAccount = "Export Equipment Sales";
        } else if (docControl.paymentTerms.toLowerCase().includes("eaas")) {
            assignedRevenueAccount = docGeneration.generateProForma ? "Domestic (EaaS) Service Charge" : "Domestic (EaaS) Funded Sales";
        }

        // 2. Calculate Financial Splits for BIR Manual Books
        const totalPHP = quoteTotals.finalSalesPrice * costing.forexRate;
        const vatableSales = customer.saleType === 'Export' ? 0 : totalPHP / 1.12;
        const vatOutput = customer.saleType === 'Export' ? 0 : vatableSales * 0.12;
        const zeroRatedSales = customer.saleType === 'Export' ? totalPHP : 0;

        const financialEntry = {
            quoteId,
            revenueAccount: assignedRevenueAccount,
            netSalesUSD: quoteTotals.subtotalUSD,
            finalSalesPHP: totalPHP,
            vatableSalesPHP: vatableSales,
            vatOutputPHP: vatOutput,
            zeroRatedSalesPHP: zeroRatedSales,
            marginPercentage: quoteTotals.grossMarginPercentage,
            ledgerStatus: 'PENDING_MANUAL_BOOK'
        };

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
            ledgerPosting: financialEntry, // Added audit trail for BIR
            status: initialData?.status || 'DRAFT',
            createdAt: initialData?.createdAt || new Date().toISOString(),
            opportunityId: opportunityId, 
        };
        onSaveQuote(newQuote);
    };

    const productCategories = useMemo(() => {
        return dbProducts.reduce((acc, p) => {
            const cat = p.category || 'Uncategorized';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(p);
            return acc;
        }, {});
    }, [dbProducts]);

    // --- TIER BADGE HELPER ---
    const currentTier = PRICING_TIERS[customer.tier || 'STANDARD'];

    return (
        <Card>
            <h2 className="text-3xl font-bold text-center text-orange-600 mb-8">{initialData ? `Editing Quote ${initialData.id}` : 'New Quote'}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <Section title="1. Customer Details">
                    <div className="space-y-4">
                        {/* --- SEARCHABLE COMPANY DROPDOWN --- */}
                        <div className="relative" ref={dropdownRef}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Registered Name</label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    className="block w-full px-3 py-2 pl-10 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                                    value={companySearch}
                                    onChange={(e) => {
                                        setCompanySearch(e.target.value);
                                        setCustomer(prev => ({...prev, name: e.target.value})); 
                                        setIsCompanyDropdownOpen(true);
                                    }}
                                    onFocus={() => setIsCompanyDropdownOpen(true)}
                                    placeholder="Search or Type Company Name..."
                                />
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16}/>
                                {customer.name && companies.find(c => c.companyName === customer.name) && (
                                    <Check className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500" size={16} title="Company Linked"/>
                                )}
                            </div>
                            
                            {isCompanyDropdownOpen && (
                                <div className="absolute z-50 w-full mt-1 bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                                    {filteredCompanies.length === 0 ? (
                                        <div className="cursor-default select-none relative py-2 px-4 text-gray-700">
                                            {companySearch ? "No matches. Continue typing to create new." : "Start typing to search..."}
                                        </div>
                                    ) : (
                                        filteredCompanies.map((company) => (
                                            <div
                                                key={company.id}
                                                className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-orange-50 text-gray-900 border-b border-gray-50 last:border-0"
                                                onClick={() => handleSelectCompany(company)}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="block truncate font-medium">{company.companyName}</span>
                                                    {company.isVerified && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Verified</span>}
                                                </div>
                                                {company.address && <span className="block truncate text-xs text-gray-500">{company.address}</span>}
                                                {company.tier && PRICING_TIERS[company.tier] && (
                                                    <span className={`text-[10px] font-bold px-1.5 rounded bg-${PRICING_TIERS[company.tier].color}-100 text-${PRICING_TIERS[company.tier].color}-800`}>
                                                        {PRICING_TIERS[company.tier].label}
                                                    </span>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        {/* --- NEW: PRICING TIER DROPDOWN (MANUAL OVERRIDE) --- */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Pricing Tier / Discount Level</label>
                            <div className="relative">
                                <select 
                                    value={customer.tier} 
                                    onChange={handleTierChange} 
                                    className={`block w-full pl-3 pr-10 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm font-semibold
                                        ${currentTier ? `bg-${currentTier.color}-50 border-${currentTier.color}-200 text-${currentTier.color}-800` : 'bg-white border-gray-300'}
                                    `}
                                >
                                    {Object.entries(PRICING_TIERS).map(([key, t]) => (
                                        <option key={key} value={key}>
                                            {t.label} ({t.discount}% Off)
                                        </option>
                                    ))}
                                </select>
                                {customer.tier === 'PARTNER' && <Handshake size={16} className="absolute right-8 top-1/2 -translate-y-1/2 text-teal-600"/>}
                            </div>
                        </div>

                        {/* --- CONTACT PERSON DROPDOWN --- */}
                        {customer.name && companyContacts.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Attention To (Contact)</label>
                                <div className="relative">
                                    <select 
                                        value={customer.contactId} 
                                        onChange={handleSelectContact} 
                                        className="block w-full pl-10 pr-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                                    >
                                        <option value="">-- Select Contact Person --</option>
                                        {companyContacts.map(c => (
                                            <option key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.jobTitle})</option>
                                        ))}
                                    </select>
                                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16}/>
                                </div>
                            </div>
                        )}

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
                           <div className="w-full">
                               <label className="block text-sm font-medium text-gray-600 mb-1">Discount (%)</label>
                               <div className="relative">
                                   <input 
                                        type="number" 
                                        value={commercial.discount} 
                                        onChange={handleInputChange(setCommercial, 'discount', true)} 
                                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-orange-500 ${commercial.discount > 0 ? 'border-green-500 bg-green-50 font-bold text-green-700' : 'border-gray-300'}`}
                                   />
                                   {commercial.discount > 0 && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-green-600 font-bold">APPLIED</span>}
                               </div>
                           </div>
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
                {loadingProducts ? (
                    <div className="text-center p-4">Loading Products from Database...</div>
                ) : dbProducts.length === 0 ? (
                    <div className="text-center p-4 bg-orange-50 border border-orange-200 rounded text-orange-700">
                        No products found in the database.
                    </div>
                ) : (
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
                )}
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
