import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Eye, Plus, Trash2, Save, Search, Check, Briefcase, Grid, List, PlusCircle, Truck } from 'lucide-react';
import { Card, Button, Input, Textarea, Checkbox, Section, PRICING_TIERS } from '../data/constants.jsx';

// --- FIREBASE IMPORTS ---
import { db } from '../firebase';
import { collection, getDocs, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const QuoteCalculator = ({ onSaveQuote, nextQuoteNumber, initialData = null, companies, contacts, opportunities }) => {
    
    // --- STATE ---
    const [dbProducts, setDbProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [opportunityId, setOpportunityId] = useState(initialData?.opportunityId || null);
    
    const [customer, setCustomer] = useState({ 
        id: '', name: '', number: '', tin: '', 
        address: '', // Billing Address
        deliveryAddress: '', // New Delivery Address
        saleType: 'Export',
        contactId: '', contactName: '', contactEmail: '', tier: 'STANDARD' 
    });

    const [sameAsBilling, setSameAsBilling] = useState(true);
    
    const [commercial, setCommercial] = useState({ 
        shippingTerms: 'Ex-Works Warehouse', 
        deliveryTime: '3-5 days from payment', 
        dueDate: '', 
        discount: 0, 
        wht: 0 
    });
    
    // Standard Payment Terms
    const [docControl, setDocControl] = useState({ 
        quoteNumber: nextQuoteNumber, 
        revision: 'A', 
        paymentTerms: '50% Down Payment upon Order Confirmation\n40% upon Delivery to Site\n10% upon Commissioning or 45 days after delivery (whichever comes sooner)' 
    });
    
    const [costing, setCosting] = useState({ 
        forexRate: 58.50, 
        transportCost: 0, 
        dutiesRate: 1, 
        vatRate: 12, 
        brokerFees: 0 
    });
    
    const [docGeneration, setDocGeneration] = useState({ 
        generateInPHP: false, 
        generateQuote: true, 
        generateProForma: true, 
        generateBirInvoice: false,
        generateDeliveryReceipt: false,
        generateOfficialReceipt: false,
        includeLandedCost: true 
    });
    
    const [selectedProducts, setSelectedProducts] = useState({});
    const [manualItems, setManualItems] = useState([]);
    const [manualItemInput, setManualItemInput] = useState({ name: '', price: '', cost: '', specs: '' });
    
    // UI State
    const [companySearch, setCompanySearch] = useState('');
    const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
    const [productViewMode, setProductViewMode] = useState('grid'); 
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const dropdownRef = useRef(null);

    // --- FETCH PRODUCTS ---
    useEffect(() => {
        const fetchProducts = async () => {
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) return;

            try {
                const querySnapshot = await getDocs(collection(db, "users", user.uid, "products"));
                const products = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                products.sort((a, b) => {
                    if (a.category === b.category) return a.name.localeCompare(b.name);
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

    // --- LOAD INITIAL DATA ---
    useEffect(() => {
        const defaultCustomer = { 
            id: '', name: '', number: '', tin: '', address: '', deliveryAddress: '', saleType: 'Export',
            contactId: '', contactName: '', contactEmail: '', tier: 'STANDARD'
        };
        
        if (initialData) {
            setCustomer({ ...defaultCustomer, ...initialData.customer });
            setCompanySearch(initialData.customer?.name || ''); 
            // Check if billing matches delivery to set checkbox state
            const billing = initialData.customer?.address || '';
            const delivery = initialData.customer?.deliveryAddress || '';
            setSameAsBilling(billing === delivery || !delivery);

            setCommercial({ 
                shippingTerms: 'Ex-Works Warehouse', 
                deliveryTime: '3-5 days from payment', 
                dueDate: '', 
                discount: 0, 
                wht: 0, 
                ...initialData.commercial 
            });
            setDocControl({ 
                quoteNumber: nextQuoteNumber, 
                revision: 'A', 
                paymentTerms: '50% Down Payment upon Order Confirmation\n40% upon Delivery to Site\n10% upon Commissioning or 45 days after delivery (whichever comes sooner)', 
                ...initialData.docControl, 
                quoteNumber: initialData.docControl?.quoteNumber || nextQuoteNumber 
            });
            setCosting({ 
                forexRate: 58.50, 
                transportCost: 0, 
                dutiesRate: 1, 
                vatRate: 12, 
                brokerFees: 0, 
                ...initialData.costing 
            });
            setDocGeneration({ 
                generateInPHP: false, 
                generateQuote: true, 
                generateProForma: true, 
                generateBirInvoice: false,
                generateDeliveryReceipt: false,
                generateOfficialReceipt: false,
                includeLandedCost: true, 
                ...initialData.docGeneration 
            });
            setSelectedProducts(initialData.selectedProducts || {});
            setManualItems(initialData.manualItems || []);
            setOpportunityId(initialData.opportunityId || null);
        }
    }, [initialData, nextQuoteNumber]);

    // Sync delivery address if checkbox is checked
    useEffect(() => {
        if (sameAsBilling) {
            setCustomer(prev => ({ ...prev, deliveryAddress: prev.address }));
        }
    }, [customer.address, sameAsBilling]);

    // --- RELATED DATA ---
    const relatedOpportunities = useMemo(() => {
        if (!opportunities || !customer.name) return [];
        return opportunities.filter(opp => 
            opp.customerName?.toLowerCase().trim() === customer.name?.toLowerCase().trim()
        );
    }, [opportunities, customer.name]);

    const filteredCompanies = useMemo(() => {
        if (!companies) return [];
        return companies.filter(c => 
            c.companyName.toLowerCase().includes(companySearch.toLowerCase())
        );
    }, [companies, companySearch]);

    const filteredProducts = useMemo(() => {
        if (!productSearchTerm) return dbProducts;
        const term = productSearchTerm.toLowerCase();
        return dbProducts.filter(p => 
            p.name.toLowerCase().includes(term) || 
            (p.category || '').toLowerCase().includes(term)
        );
    }, [dbProducts, productSearchTerm]);

    // --- HANDLERS ---
    const handleSelectCompany = (company) => {
        const detectedTier = company.tier && PRICING_TIERS[company.tier] ? company.tier : 'STANDARD';
        const tierDiscount = PRICING_TIERS[detectedTier].discount;

        setCustomer(prev => ({
            ...prev,
            id: company.id,
            name: company.companyName,
            address: company.address || prev.address,
            deliveryAddress: company.address || prev.address, // Default delivery to billing
            tin: company.tin || prev.tin,
            saleType: company.isExport ? 'Export' : 'Domestic', 
            contactId: '', 
            contactName: '', 
            contactEmail: '',
            tier: detectedTier 
        }));
        
        setSameAsBilling(true);
        setCompanySearch(company.companyName);
        setIsCompanyDropdownOpen(false);

        setCommercial(prev => ({
            ...prev,
            discount: tierDiscount,
            shippingTerms: detectedTier === 'EXPORT' ? 'FOB' : prev.shippingTerms 
        }));
        
        const latestOpp = opportunities?.find(o => o.customerName === company.companyName);
        if (latestOpp) setOpportunityId(latestOpp.id);
    };

    const handleTierChange = (e) => {
        const newTier = e.target.value;
        const newDiscount = PRICING_TIERS[newTier] ? PRICING_TIERS[newTier].discount : 0;
        setCustomer(prev => ({ ...prev, tier: newTier }));
        setCommercial(prev => ({ ...prev, discount: newDiscount }));
    };

    const handleSelectContact = (e) => {
        const contact = contacts.find(c => c.id === e.target.value);
        if (contact) {
            setCustomer(prev => ({
                ...prev,
                contactId: contact.id,
                contactName: `${contact.firstName} ${contact.lastName}`,
                contactEmail: contact.email
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
            setManualItems(prev => [...prev, { 
                ...manualItemInput, 
                priceUSD: parseFloat(manualItemInput.price),
                costPriceUSD: parseFloat(manualItemInput.cost) || 0,
                quantity: 1, 
                id: `manual_${Date.now()}` 
            }]);
            setManualItemInput({ name: '', price: '', cost: '', specs: '' });
        }
    };
    
    const removeManualItem = (index) => { 
        setManualItems(prev => prev.filter((_, i) => i !== index)); 
    };

    // --- QUOTE TOTALS ---
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
        
        const subtotalUSD = allItems.reduce((acc, item) => 
            acc + (item.salesPriceUSD || item.priceUSD || 0) * item.quantity, 0
        );
        const costSubtotalUSD = allItems.reduce((acc, item) => 
            acc + (item.costPriceUSD || 0) * item.quantity, 0
        );
        const discountAmount = subtotalUSD * (commercial.discount / 100);
        const finalSalesPrice = subtotalUSD - discountAmount;
        const grossMarginAmount = finalSalesPrice - costSubtotalUSD;
        const grossMarginPercentage = finalSalesPrice > 0 ? (grossMarginAmount / finalSalesPrice) * 100 : 0;
        
        return { 
            allItems, 
            subtotalUSD, 
            costSubtotalUSD, 
            finalSalesPrice, 
            grossMarginAmount, 
            grossMarginPercentage 
        };
    }, [selectedProducts, manualItems, commercial.discount, dbProducts]);

    // --- PDF GENERATION ENGINE ---
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

        // --- BANK DETAILS ---
        const bankDetailsPHP = `<h3>Bank Account Details (For PHP Payments)</h3><p style="font-size:14px; line-height:1.6;"><strong>Account Name:</strong> STUART EDMUND COX<br><strong>Account Number:</strong> 027-102383-132<br><strong>Bank:</strong> HSBC - The Hongkong and Shanghai Banking Corporation Ltd<br><strong>Bank Address:</strong> HSBC Centre, 3058 Fifth Avenue West, BGC, Taguig City, 1632 Philippines</p>`;
        
        const bankDetailsUSD = `<h3>Bank Account Details (For USD Payments)</h3><p style="font-size:14px; line-height:1.6; white-space: pre-wrap;"><strong>Payment Type:</strong> PDDTS (real-time aka GSRT or EOD batch aka LP USA DOLLARS)<br><strong>Remit Currency:</strong> USA DOLLARS<br><strong>Account Name:</strong> STUART EDMUND COX<br><strong>Account Number:</strong> 027-102383-132<br><strong>Bank:</strong> HSBC - The Hongkong and Shanghai Banking Corporation Ltd<br><strong>Bank Address:</strong><br>HSBC Centre<br>3058 Fifth Avenue West<br>Bonifacio Global City<br>Taguig City, Metro Manila, 1632 Philippines<br><strong>Telephone:</strong> +632 8858 0000<br><strong>SWIFT Code:</strong> HSBCPHMMXXX</p>`;

        // Terms & Conditions
        const termsAndConditionsHTML = `<div class="terms-section">
            <h3>Terms and Conditions</h3>
            <div class="terms-content">
                <div class="term-item">
                    <strong>Warranty</strong>
                    <p>18 months from the date of delivery, covering manufacturing defects under normal use and service.</p>
                </div>
                <div class="term-item">
                    <strong>Payment Terms</strong>
                    <p>${docControl.paymentTerms.replace(/\n/g, "<br>")}</p>
                </div>
                <div class="term-item">
                    <strong>Production Lead Time</strong>
                    <p>For in-stock units, shipment within 15 working days from receipt of full payment.</p>
                </div>
            </div>
        </div>`;

        // Line Items HTML
        let lineItemsHTML = allItems.map(p => {
            const unitPrice = docGeneration.generateInPHP ? (p.salesPriceUSD || p.priceUSD || 0) * costing.forexRate : (p.salesPriceUSD || p.priceUSD || 0);
            const lineTotal = unitPrice * (p.quantity || 1);
            let description = `<strong>${p.name}</strong>`;
            if (p.specs) {
                description += `<br><span style="color:#666; font-size:12px; font-style:italic;">${p.specs.replace(/\n/g, "<br>")}</span>`;
            }
            return `<tr>
                <td style="padding:12px 8px; border-bottom:1px solid #e5e7eb;">${description}</td>
                <td style="padding:12px 8px; border-bottom:1px solid #e5e7eb; text-align:center;">${p.quantity || 1}</td>
                <td style="padding:12px 8px; border-bottom:1px solid #e5e7eb; text-align:right;">${primaryFormat(unitPrice)}</td>
                <td style="padding:12px 8px; border-bottom:1px solid #e5e7eb; text-align:right;"><strong>${primaryFormat(lineTotal)}</strong></td>
            </tr>`;
        }).join('');

        // Company Header
        const logoURL = "https://img1.wsimg.com/isteam/ip/cb1de239-c2b8-4674-b57d-5ae86a72feb1/Asset%2010%404x.png/:/rs=w:400,cg:true,m";
        const companyHeaderHTML = `<div class="company-info">
            <img src="${logoURL}" alt="Karnot Logo" style="width:140px; margin-bottom:12px;">
            <p style="font-size:12px; line-height:1.6; margin:0;">
                <strong>Karnot Energy Solutions INC.</strong><br>
                TIN: ${customer.tin || 'N/A'}<br>
                Low Carbon Innovation Centre, Cosmos Street, Nilombot,<br>
                2429 Mapandan, Pangasinan, Philippines<br>
                Tel: +63 75 510 8922
            </p>
        </div>`;
        
        let contactLine = '';
        if (customer.contactName) {
            contactLine = `<br><strong>Attention:</strong> ${customer.contactName}`;
        }

        // Customer Info Boxes
        const customerInfoHTML = `<div class="customer-box">
            <strong>Quote For:</strong><br>
            Customer No.: ${customer.number || "N/A"}<br>
            ${customer.name || "N/A"}${contactLine}<br>
            ${customer.address.replace(/\n/g, "<br>") || "N/A"}
        </div>`;
        
        const soldToInfoHTML = `<div class="customer-box">
            <strong>SOLD TO:</strong><br>
            <strong>Customer No.:</strong> ${customer.number || "N/A"}<br>
            <strong>Registered Name:</strong> ${customer.name || "N/A"}<br>
            <strong>TIN:</strong> ${customer.tin || "N/A"}<br>
            <strong>Business Address:</strong> ${customer.address.replace(/\n/g, "<br>") || "N/A"}${contactLine}
        </div>`;

        // Delivery Address Box
        const deliveryAddressToUse = customer.deliveryAddress || customer.address;
        const deliverToInfoHTML = `<div class="customer-box" style="border-left-color: #3b82f6; background-color: #eff6ff;">
            <strong>DELIVER TO:</strong><br>
            ${customer.name || "N/A"}<br>
            <strong>Destination Address:</strong><br>
            ${deliveryAddressToUse.replace(/\n/g, "<br>") || "Same as Billing Address"}
        </div>`;

        let generatedDocumentsHTML = '';
        let landedCostHTML = '';

        // Landed Cost Breakdown
        if (docGeneration.includeLandedCost) {
            const cifUSD = totalAfterDiscountUSD + costing.transportCost;
            const dutiesUSD = cifUSD * (costing.dutiesRate / 100);
            const customsValueUSD = cifUSD + dutiesUSD;
            const vatUSD = customsValueUSD * (costing.vatRate / 100);
            const totalLandedCostUSD = customsValueUSD + vatUSD + costing.brokerFees;
            
            landedCostHTML = `<div class="landed-cost-section">
                <h3>Estimated Landed Cost Breakdown (USD)</h3>
                <table style="width:100%; max-width:450px; margin-left:auto; font-size:13px;">
                    <tr><td style="padding:6px 12px; text-align:left;">Equipment Price (Ex-Works, after discount)</td><td style="padding:6px 12px; text-align:right;"><strong>${formatUSD(totalAfterDiscountUSD)}</strong></td></tr>
                    <tr><td style="padding:6px 12px; text-align:left;">Freight Cost</td><td style="padding:6px 12px; text-align:right;">${formatUSD(costing.transportCost)}</td></tr>
                    <tr><td style="padding:6px 12px; text-align:left;">Duties (${costing.dutiesRate}%)</td><td style="padding:6px 12px; text-align:right;">${formatUSD(dutiesUSD)}</td></tr>
                    <tr><td style="padding:6px 12px; text-align:left;">VAT / IVA (${costing.vatRate}%)</td><td style="padding:6px 12px; text-align:right;">${formatUSD(vatUSD)}</td></tr>
                    <tr><td style="padding:6px 12px; text-align:left;">Broker & Handling Fees</td><td style="padding:6px 12px; text-align:right;">${formatUSD(costing.brokerFees)}</td></tr>
                    <tr style="border-top:2px solid #333; background-color:#f9fafb;">
                        <td style="padding:10px 12px; text-align:left;"><strong>Total Estimated Landed Cost</strong></td>
                        <td style="padding:10px 12px; text-align:right;"><strong>${formatUSD(totalLandedCostUSD)}</strong></td>
                    </tr>
                </table>
            </div>`;
        }

        // 1. SALES QUOTATION
        if (docGeneration.generateQuote) {
            const quoteHeaderHTML = `<div class="doc-header">${companyHeaderHTML}<div class="doc-title"><h2 style="color:#ea580c;">SALES QUOTATION</h2><p><strong>Date:</strong> ${todayFormatted}<br><strong>Quote ID:</strong> ${quoteId}</p></div></div>`;
            const quoteSummaryHTML = `<table style="width:100%; max-width:350px; margin-left:auto; margin-top:30px;"><tr><td>Subtotal</td><td class="text-right">${primaryFormat(subtotalPrimary)}</td></tr>${discountAmountPrimary > 0 ? `<tr><td>Discount (${commercial.discount}%)</td><td class="text-right">-${primaryFormat(discountAmountPrimary)}</td></tr>` : ''}<tr class="grand-total-row"><td><strong>Total Amount</strong></td><td class="text-right"><strong>${primaryFormat(totalAfterDiscountPrimary)}</strong></td></tr></table>`;
            generatedDocumentsHTML += `<div class="page">${quoteHeaderHTML}${customerInfoHTML}<h3>Products & Services</h3><table class="items-table"><thead><tr><th>Description</th><th class="text-center">Qty</th><th class="text-right">${priceColumnHeader}</th><th class="text-right">${amountColumnHeader}</th></tr></thead><tbody>${lineItemsHTML}</tbody></table>${quoteSummaryHTML}${landedCostHTML}${termsAndConditionsHTML}</div>`;
        }

        // 2. PRO FORMA INVOICE
        if (docGeneration.generateProForma) {
            const proFormaHeaderHTML = `<div class="doc-header">${companyHeaderHTML}<div class="doc-title"><h2 style="color:#ea580c;">PRO FORMA INVOICE</h2><p><strong>Date:</strong> ${todayFormatted}<br><strong>Reference:</strong> PF-${quoteId}<br><strong>Due Date: ${commercial.dueDate}</strong></p></div></div>`;
            const proFormaSummaryHTML = `<table style="width:100%; max-width:350px; margin-left:auto; margin-top:30px;"><tr><td>Subtotal</td><td class="text-right">${primaryFormat(subtotalPrimary)}</td></tr>${discountAmountPrimary > 0 ? `<tr><td>Discount (${commercial.discount}%)</td><td class="text-right">-${primaryFormat(discountAmountPrimary)}</td></tr>` : ''}<tr class="grand-total-row"><td><strong>Total Amount Due</strong></td><td class="text-right"><strong>${primaryFormat(totalAfterDiscountPrimary)}</strong></td></tr></table>`;
            const bankDetailsHTML = docGeneration.generateInPHP ? bankDetailsPHP : bankDetailsUSD;
            generatedDocumentsHTML += `<div class="page">${proFormaHeaderHTML}${customerInfoHTML}<h3>Details</h3><table class="items-table"><thead><tr><th>Description</th><th class="text-center">Qty</th><th class="text-right">${priceColumnHeader}</th><th class="text-right">${amountColumnHeader}</th></tr></thead><tbody>${lineItemsHTML}</tbody></table>${proFormaSummaryHTML}${landedCostHTML}${bankDetailsHTML}</div>`;
        }

        // 3. BIR SALES INVOICE
        if (docGeneration.generateBirInvoice) {
            const isExport = customer.saleType === 'Export';
            const totalAfterDiscountPHP = totalAfterDiscountUSD * costing.forexRate;
            
            let vatableSales = 0, vatAmount = 0, zeroRatedSales = 0, vatExemptSales = 0;

            if (isExport) {
                zeroRatedSales = totalAfterDiscountPHP;
            } else {
                vatableSales = totalAfterDiscountPHP / 1.12; 
                vatAmount = vatableSales * 0.12;
            }

            const withholdingTaxAmount = vatableSales * (commercial.wht / 100);
            const totalAmountDue = totalAfterDiscountPHP - withholdingTaxAmount;
            
            const birLineItemsHTML = allItems.map(p => {
                const unitPricePHP = (p.salesPriceUSD || p.priceUSD || 0) * costing.forexRate;
                const lineTotalPHP = unitPricePHP * (p.quantity || 1);
                return `<tr><td style="padding:12px 8px; border-bottom:1px solid #e5e7eb;"><strong>${p.name}</strong></td><td style="padding:12px 8px; border-bottom:1px solid #e5e7eb; text-align:center;">${p.quantity || 1}</td><td style="padding:12px 8px; border-bottom:1px solid #e5e7eb; text-align:right;">${formatPHP(unitPricePHP)}</td><td style="padding:12px 8px; border-bottom:1px solid #e5e7eb; text-align:right;"><strong>${formatPHP(lineTotalPHP)}</strong></td></tr>`;
            }).join('');

            const birHeaderHTML = `<div class="doc-header">${companyHeaderHTML}<div class="doc-title"><h2 style="color:#ea580c;">SALES INVOICE</h2><p><strong>No:</strong> ${String(docControl.quoteNumber).padStart(4, '0')}<br><strong>Date:</strong> ${todayFormatted}<br><strong>Due Date: ${commercial.dueDate}</strong></p></div></div>`;
            const birSummaryHTML = `<table class="summary-table"><tr><td>VATable Sales</td><td class="text-right">${formatPHP(vatableSales)}</td><td>Total Sales (VAT-Inclusive)</td><td class="text-right">${formatPHP(totalAfterDiscountPHP)}</td></tr><tr><td>VAT-Exempt Sales</td><td class="text-right">${formatPHP(vatExemptSales)}</td><td>Less: 12% VAT</td><td class="text-right">${formatPHP(vatAmount)}</td></tr><tr><td>Zero-Rated Sales</td><td class="text-right">${formatPHP(zeroRatedSales)}</td><td>Net of VAT</td><td class="text-right">${formatPHP(vatableSales + zeroRatedSales)}</td></tr><tr><td><strong>Total Sales</strong></td><td class="text-right"><strong>${formatPHP(vatableSales + zeroRatedSales)}</strong></td><td>Less: Withholding Tax (${commercial.wht}%)</td><td class="text-right">${formatPHP(withholdingTaxAmount)}</td></tr><tr class="bir-grand-total-row"><td></td><td></td><td><strong>TOTAL AMOUNT DUE</strong></td><td class="text-right"><strong>${formatPHP(totalAmountDue)}</strong></td></tr></table>`;
            const paymentFooter = `<div style="margin-top:40px; border-top:2px dashed #ccc; padding-top:20px;"><h4>Payment & Collection (Official Use Only)</h4><div style="display:flex; justify-content:space-between; margin-top:15px;"><div style="border-bottom:1px solid #000; width:30%;">Date Paid:</div><div style="border-bottom:1px solid #000; width:30%;">Amount Paid:</div><div style="border-bottom:1px solid #000; width:30%;">OR / Ref #:</div></div><p style="margin-top:10px; font-size:11px; font-style:italic;">Issue Official Receipt upon full payment or delivery as per terms.</p></div>`;

            generatedDocumentsHTML += `<div class="page">${birHeaderHTML}${soldToInfoHTML}<h3>Details</h3><table class="items-table"><thead><tr><th>Description</th><th class="text-center">Qty</th><th class="text-right">Unit Price (PHP)</th><th class="text-right">Amount (PHP)</th></tr></thead><tbody>${birLineItemsHTML}</tbody></table><div class="summary-wrapper">${birSummaryHTML}</div>${paymentFooter}</div>`;
        }

        // 4. DELIVERY RECEIPT
        if (docGeneration.generateDeliveryReceipt) {
            const drHeaderHTML = `<div class="doc-header">${companyHeaderHTML}<div class="doc-title"><h2 style="color:#ea580c;">DELIVERY RECEIPT</h2><p><strong>Ref:</strong> DR-${quoteId}<br><strong>Date:</strong> ${todayFormatted}</p></div></div>`;
            const drLineItemsHTML = allItems.map(p => `<tr><td style="padding:12px;"><strong>${p.name}</strong><br><span style="font-size:11px; color:#666;">${p.specs || ''}</span></td><td style="text-align:center; padding:12px;">${p.quantity}</td><td style="padding:12px;">__________________</td></tr>`).join('');
            const drFooter = `<div style="margin-top:50px; display:flex; justify-content:space-between;"><div style="width:45%; border-top:1px solid #000; padding-top:10px;"><strong>Prepared By:</strong><br>Karnot Energy Solutions Inc.</div><div style="width:45%; border-top:1px solid #000; padding-top:10px;"><strong>Received By (Signature over Printed Name):</strong><br>Date Received: _________________</div></div><div style="margin-top:20px; font-size:12px; font-style:italic; text-align:center;">Received the above items in good order and condition.</div>`;

            generatedDocumentsHTML += `<div class="page">${drHeaderHTML}${deliverToInfoHTML}<h3>Items Delivered</h3><table class="items-table"><thead><tr><th>Description</th><th class="text-center" width="80">Qty</th><th width="150">Remarks</th></tr></thead><tbody>${drLineItemsHTML}</tbody></table>${drFooter}</div>`;
        }

        // 5. OFFICIAL RECEIPT
        if (docGeneration.generateOfficialReceipt) {
            const orHeaderHTML = `<div class="doc-header">${companyHeaderHTML}<div class="doc-title"><h2 style="color:#ea580c;">OFFICIAL RECEIPT</h2><p><strong>OR No:</strong> ___________<br><strong>Date:</strong> ${todayFormatted}</p></div></div>`;
            const totalAmountPHP = totalAfterDiscountUSD * costing.forexRate; 
            
            const isExport = customer.saleType === 'Export';
            const vatable = isExport ? 0 : totalAmountPHP / 1.12;
            const vat = isExport ? 0 : vatable * 0.12;
            const zeroRated = isExport ? totalAmountPHP : 0;

            const orBody = `<div style="margin:20px 0; font-size:14px; line-height:2;"><div style="border-bottom:1px solid #ccc;"><strong>Received From:</strong> ${customer.name}</div><div style="border-bottom:1px solid #ccc;"><strong>TIN:</strong> ${customer.tin}</div><div style="border-bottom:1px solid #ccc;"><strong>Address:</strong> ${customer.address}</div><div style="border-bottom:1px solid #ccc; margin-top:15px;"><strong>The Sum of (Amount in Words):</strong> __________________________________________________________________________</div><div style="text-align:right; font-size:18px; font-weight:bold; margin-top:10px;">Amount: ${formatPHP(totalAmountPHP)}</div><div style="border-bottom:1px solid #ccc; margin-top:15px;"><strong>In full/partial settlement of:</strong> Invoice No. ${String(docControl.quoteNumber).padStart(4, '0')}</div></div>`;
            const orPaymentDetails = `<table style="width:100%; border:1px solid #ccc; margin-top:20px; font-size:12px;"><tr style="background:#eee;"><th style="border:1px solid #ccc; padding:5px;">Form of Payment</th><th style="border:1px solid #ccc; padding:5px;">Amount</th><th style="border:1px solid #ccc; padding:5px;">Bank / Check No.</th><th style="border:1px solid #ccc; padding:5px;">Date</th></tr><tr><td style="border:1px solid #ccc; padding:10px;">Cash</td><td style="border:1px solid #ccc;"></td><td style="border:1px solid #ccc;"></td><td style="border:1px solid #ccc;"></td></tr><tr><td style="border:1px solid #ccc; padding:10px;">Check</td><td style="border:1px solid #ccc;"></td><td style="border:1px solid #ccc;"></td><td style="border:1px solid #ccc;"></td></tr></table>`;
            const orTaxTable = `<table style="width:50%; font-size:10px; margin-top:20px; border-collapse:collapse;"><tr><td style="border:1px solid #ccc; padding:2px;">VATable Sales</td><td style="border:1px solid #ccc; text-align:right; padding:2px;">${formatPHP(vatable)}</td></tr><tr><td style="border:1px solid #ccc; padding:2px;">VAT-Exempt</td><td style="border:1px solid #ccc; text-align:right; padding:2px;">0.00</td></tr><tr><td style="border:1px solid #ccc; padding:2px;">Zero-Rated</td><td style="border:1px solid #ccc; text-align:right; padding:2px;">${formatPHP(zeroRated)}</td></tr><tr><td style="border:1px solid #ccc; padding:2px;">12% VAT</td><td style="border:1px solid #ccc; text-align:right; padding:2px;">${formatPHP(vat)}</td></tr><tr><td style="border:1px solid #ccc; padding:2px;"><strong>TOTAL</strong></td><td style="border:1px solid #ccc; text-align:right; padding:2px;"><strong>${formatPHP(totalAmountPHP)}</strong></td></tr></table>`;
            const orFooter = `<div style="margin-top:40px; text-align:right;"><div style="display:inline-block; text-align:center; border-top:1px solid #000; width:200px; padding-top:5px;">Authorized Signature</div></div>`;

            generatedDocumentsHTML += `<div class="page">${orHeaderHTML}${orBody}${orPaymentDetails}<div style="display:flex; justify-content:space-between;">${orTaxTable}${orFooter}</div></div>`;
        }

        const finalReportHTML = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Quote Preview - ${quoteId}</title><style> * { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1f2937; background: #f3f4f6; padding: 20px; } .page { background: white; max-width: 800px; margin: 0 auto 40px; padding: 50px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); page-break-after: always; } .page:last-child { page-break-after: auto; } .doc-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 3px solid #ea580c; margin-bottom: 30px; } .company-info { flex: 1; } .doc-title { text-align: right; } .customer-box { background: #fef3c7; border-left: 4px solid #ea580c; padding: 15px 20px; margin: 25px 0; font-size: 13px; line-height: 1.8; } h3 { color: #4b5563; font-size: 15px; margin: 25px 0 15px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb; text-transform: uppercase; letter-spacing: 0.5px; } .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; } .items-table thead { background: #ea580c; color: white; } .items-table th { padding: 12px 8px; text-align: left; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; } .items-table tbody tr:hover { background: #f9fafb; } .landed-cost-section { margin: 30px 0; padding: 20px; background: #f9fafb; border-radius: 8px; } .terms-section { margin-top: 50px; padding-top: 30px; border-top: 2px solid #e5e7eb; } .terms-content { font-size: 12px; line-height: 1.6; color: #6b7280; } .term-item { margin: 15px 0; } .term-item strong { display: block; color: #374151; margin-bottom: 5px; font-size: 13px; } .summary-table { width: 100%; font-size: 13px; border-collapse: collapse; } .summary-table td { border: 1px solid #d1d5db; padding: 8px; } .text-right { text-align: right; } .text-center { text-align: center; } @media print { body { background: white; padding: 0; } .page { box-shadow: none; margin: 0; max-width: none; page-break-after: always; } .page:last-child { page-break-after: auto; } }</style></head><body>${generatedDocumentsHTML}</body></html>`;
        
        const win = window.open("", "QuotePreview");
        win.document.write(finalReportHTML);
        win.document.close();
    };
    
    const handleSave = () => {
        if (!customer.name) return alert("Please select or enter a customer.");
        
        const quoteId = initialData?.id || `QN${String(docControl.quoteNumber).padStart(4, '0')}-${new Date().getFullYear()}`;
        const companyId = customer.id || (companies?.find(c => c.companyName === customer.name)?.id) || '';

        const newQuote = {
    id: quoteId,
    customer: { ...customer, id: companyId },
    commercial,
    docControl,
    costing,
    docGeneration,
    selectedProducts,
    manualItems,
    finalSalesPrice: quoteTotals.finalSalesPrice,
    totalCost: quoteTotals.costSubtotalUSD, 
    grossMarginAmount: quoteTotals.grossMarginAmount,
    grossMarginPercentage: quoteTotals.grossMarginPercentage,
    status: initialData?.status || 'DRAFT',
    createdAt: initialData?.createdAt || new Date().toISOString(),
    lastModified: serverTimestamp ? serverTimestamp() : new Date().toISOString(),
    opportunityId: opportunityId || null, 
    companyId: companyId,
    customerName: customer.name,
   boiActivity: true // ← BOI REGISTERED ACTIVITY (Natural Refrigerant Systems)
};

console.log("Saving quote:", newQuote);
onSaveQuote(newQuote);
};  // ← This closes the handleSave function

    const productCategories = useMemo(() => {
        return filteredProducts.reduce((acc, p) => {
            const cat = p.category || 'Uncategorized';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(p);
            return acc;
        }, {});
    }, [filteredProducts]);

    const currentTier = PRICING_TIERS[customer.tier || 'STANDARD'];
    const selectedCount = Object.keys(selectedProducts).length;

    return (
        <Card className="max-w-7xl mx-auto shadow-2xl rounded-3xl border-none">
            <h2 className="text-4xl font-black text-center text-gray-800 mb-10 uppercase tracking-tighter">
                {initialData ? `Editing ${initialData.id}` : 'New Sales Quote'}
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* COLUMN 1: CUSTOMER */}
                <Section title="1. Customer Information">
                    <div className="space-y-5">
                        <div className="relative" ref={dropdownRef}>
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Company Search</label>
                            <div className="relative mt-1">
                                <input 
                                    type="text" 
                                    className="w-full p-3 pl-10 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-orange-500 outline-none transition-all font-bold text-gray-700"
                                    value={companySearch}
                                    onChange={(e) => {
                                        setCompanySearch(e.target.value);
                                        setCustomer(prev => ({...prev, name: e.target.value})); 
                                        setIsCompanyDropdownOpen(true);
                                    }}
                                    onFocus={() => setIsCompanyDropdownOpen(true)}
                                    placeholder="Search directory..."
                                />
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                                {customer.id && <Check className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" size={18}/>}
                            </div>
                            {isCompanyDropdownOpen && filteredCompanies.length > 0 && (
                                <div className="absolute z-50 w-full mt-2 bg-white shadow-2xl rounded-2xl border border-gray-100 overflow-hidden max-h-60 overflow-y-auto">
                                    {filteredCompanies.map(c => (
                                        <div key={c.id} className="p-4 hover:bg-orange-50 cursor-pointer border-b last:border-0" onClick={() => handleSelectCompany(c)}>
                                            <p className="font-black text-gray-800 uppercase text-xs">{c.companyName}</p>
                                            <p className="text-[9px] text-gray-400 font-bold tracking-widest">{c.industry || 'CLIENT'}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* CRM LINKING BOX */}
                        {customer.name && relatedOpportunities.length > 0 && (
                            <div className="p-4 bg-blue-50 rounded-2xl border-2 border-blue-100 animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center gap-2 mb-2">
                                    <Briefcase className="text-blue-600" size={16}/>
                                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Pipeline Lead Found</span>
                                </div>
                                <select 
                                    value={opportunityId || ''} 
                                    onChange={(e) => setOpportunityId(e.target.value || null)}
                                    className="w-full p-2 bg-white border border-blue-200 rounded-xl text-xs font-bold text-blue-800 outline-none"
                                >
                                    <option value="">-- Don't link to funnel --</option>
                                    {relatedOpportunities.map(opp => (
                                        <option key={opp.id} value={opp.id}>
                                            {opp.project} (${opp.estimatedValue?.toLocaleString()})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Pricing Tier</label>
                                <select 
                                    value={customer.tier} 
                                    onChange={handleTierChange} 
                                    className={`w-full p-3 mt-1 border-2 rounded-2xl font-black text-xs uppercase outline-none ${
                                        currentTier ? `bg-${currentTier.color}-50 border-${currentTier.color}-100 text-${currentTier.color}-700` : 'bg-white'
                                    }`}
                                >
                                    {Object.entries(PRICING_TIERS).map(([key, t]) => (
                                        <option key={key} value={key}>{t.label}</option>
                                    ))}
                                </select>
                            </div>
                            <Input label="TIN" value={customer.tin} onChange={handleInputChange(setCustomer, 'tin')} />
                        </div>

                        <Textarea label="Billing Address" value={customer.address} onChange={handleInputChange(setCustomer, 'address')} rows="2" />
                        
                        {/* Delivery Address Section */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black uppercase text-gray-400">Delivery Address</label>
                                <Checkbox 
                                    label="Same as Billing" 
                                    checked={sameAsBilling} 
                                    onChange={(e) => {
                                        setSameAsBilling(e.target.checked);
                                        if (e.target.checked) setCustomer(prev => ({...prev, deliveryAddress: prev.address}));
                                    }} 
                                />
                            </div>
                            {!sameAsBilling && (
                                <Textarea 
                                    value={customer.deliveryAddress} 
                                    onChange={handleInputChange(setCustomer, 'deliveryAddress')} 
                                    rows="2" 
                                    className="bg-blue-50 border-blue-200"
                                />
                            )}
                        </div>
                        
                        {/* Sale Type Selector (VAT Logic) */}
                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                            <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Sale Type (VAT Logic)</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="saleType" 
                                        value="Export" 
                                        checked={customer.saleType === 'Export'} 
                                        onChange={(e) => setCustomer({...customer, saleType: e.target.value})}
                                    /> Export (Zero-Rated)
                                </label>
                                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="saleType" 
                                        value="Domestic" 
                                        checked={customer.saleType === 'Domestic'} 
                                        onChange={(e) => setCustomer({...customer, saleType: e.target.value})}
                                    /> Domestic (12% VAT)
                                </label>
                            </div>
                        </div>
                    </div>
                </Section>

                {/* COLUMN 2: TERMS */}
                <Section title="2. Commercial Terms">
                    <div className="space-y-4">
                        <Input label="Shipping Terms" value={commercial.shippingTerms} onChange={handleInputChange(setCommercial, 'shippingTerms')} />
                        <Input label="Delivery Schedule" value={commercial.deliveryTime} onChange={handleInputChange(setCommercial, 'deliveryTime')} />
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Due Date" type="date" value={commercial.dueDate} onChange={handleInputChange(setCommercial, 'dueDate')} />
                            <Input label="Quote Rev" value={docControl.revision} onChange={handleInputChange(setDocControl, 'revision')} />
                        </div>
                        <div className="flex gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                           <div className="flex-1">
                               <label className="text-[10px] font-black text-gray-400 uppercase">Discount %</label>
                               <input type="number" className="w-full bg-transparent text-xl font-black text-orange-600 outline-none" value={commercial.discount} onChange={handleInputChange(setCommercial, 'discount', true)} />
                           </div>
                           <div className="flex-1 border-l pl-4">
                               <label className="text-[10px] font-black text-gray-400 uppercase">WHT %</label>
                               <input type="number" className="w-full bg-transparent text-xl font-black text-gray-700 outline-none" value={commercial.wht} onChange={handleInputChange(setCommercial, 'wht', true)} />
                           </div>
                        </div>
                    </div>
                </Section>

                {/* COLUMN 3: DOC CONTROL */}
                <Section title="3. Document Control & Options">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Input 
                                label="Quote Start No." 
                                type="number" 
                                value={docControl.quoteNumber} 
                                onChange={handleInputChange(setDocControl, 'quoteNumber', true)} 
                            />
                            <Input 
                                label="Revision" 
                                value={docControl.revision} 
                                onChange={handleInputChange(setDocControl, 'revision')} 
                            />
                        </div>
                        
                        <Textarea 
                            label="Payment Terms" 
                            rows="4" 
                            value={docControl.paymentTerms} 
                            onChange={handleInputChange(setDocControl, 'paymentTerms')} 
                        />
                        
                        {/* Document Generation Options */}
                        <div className="p-4 bg-orange-50 rounded-2xl space-y-3 border border-orange-100">
                            <p className="text-[10px] font-black uppercase text-orange-600 tracking-widest mb-2">
                                Output Documents
                            </p>
                            <Checkbox 
                                label="Generate in PHP (Peso)" 
                                checked={docGeneration.generateInPHP} 
                                onChange={handleCheckboxChange(setDocGeneration, 'generateInPHP')} 
                            />
                            <Checkbox 
                                label="Sales Quotation" 
                                checked={docGeneration.generateQuote} 
                                onChange={handleCheckboxChange(setDocGeneration, 'generateQuote')} 
                            />
                            <Checkbox 
                                label="Pro Forma Invoice" 
                                checked={docGeneration.generateProForma} 
                                onChange={handleCheckboxChange(setDocGeneration, 'generateProForma')} 
                            />
                            <Checkbox 
                                label="BIR Sales Invoice" 
                                checked={docGeneration.generateBirInvoice} 
                                onChange={handleCheckboxChange(setDocGeneration, 'generateBirInvoice')} 
                            />
                            <Checkbox 
                                label="Delivery Receipt" 
                                checked={docGeneration.generateDeliveryReceipt} 
                                onChange={handleCheckboxChange(setDocGeneration, 'generateDeliveryReceipt')} 
                            />
                            <Checkbox 
                                label="Official Receipt" 
                                checked={docGeneration.generateOfficialReceipt} 
                                onChange={handleCheckboxChange(setDocGeneration, 'generateOfficialReceipt')} 
                            />
                            <Checkbox 
                                label="Include Landed Cost Breakdown" 
                                checked={docGeneration.includeLandedCost} 
                                onChange={handleCheckboxChange(setDocGeneration, 'includeLandedCost')} 
                            />
                        </div>
                    </div>
                </Section>
            </div>

            {/* INTERNATIONAL COSTING SECTION */}
            <div className="mt-12">
                <Section title="3a. International Costing & Import Taxes">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <Input 
                            label="Forex (USD to PHP)" 
                            type="number" 
                            value={costing.forexRate} 
                            onChange={handleInputChange(setCosting, 'forexRate', true)} 
                        />
                        <Input 
                            label="Transport Cost (USD)" 
                            type="number" 
                            value={costing.transportCost} 
                            onChange={handleInputChange(setCosting, 'transportCost', true)} 
                        />
                        <Input 
                            label="Duties Rate (%)" 
                            type="number" 
                            value={costing.dutiesRate} 
                            onChange={handleInputChange(setCosting, 'dutiesRate', true)} 
                        />
                        <Input 
                            label="VAT on Import (%)" 
                            type="number" 
                            value={costing.vatRate} 
                            onChange={handleInputChange(setCosting, 'vatRate', true)} 
                        />
                        <Input 
                            label="Broker Fees (USD)" 
                            type="number" 
                            value={costing.brokerFees} 
                            onChange={handleInputChange(setCosting, 'brokerFees', true)} 
                        />
                    </div>
                </Section>
            </div>

            {/* PRODUCT SELECTION - IMPROVED LAYOUT */}
            <div className="mt-12">
                <Section title="4. Equipment Selection">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search products..."
                                    value={productSearchTerm}
                                    onChange={(e) => setProductSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-2 border-2 border-gray-200 rounded-xl focus:border-orange-500 outline-none text-sm font-bold"
                                />
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                            </div>
                            <div className="px-4 py-2 bg-orange-50 rounded-xl border-2 border-orange-100">
                                <span className="text-sm font-black text-orange-600">
                                    {selectedCount} Selected
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
                            <button
                                onClick={() => setProductViewMode('grid')}
                                className={`p-2 rounded-lg transition-all ${productViewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
                            >
                                <Grid size={18} className={productViewMode === 'grid' ? 'text-orange-600' : 'text-gray-400'}/>
                            </button>
                            <button
                                onClick={() => setProductViewMode('compact')}
                                className={`p-2 rounded-lg transition-all ${productViewMode === 'compact' ? 'bg-white shadow-sm' : ''}`}
                            >
                                <List size={18} className={productViewMode === 'compact' ? 'text-orange-600' : 'text-gray-400'}/>
                            </button>
                        </div>
                    </div>

                    {loadingProducts ? (
                        <div className="p-20 text-center animate-pulse font-black text-gray-300 uppercase tracking-[0.5em]">
                            Loading Inventory...
                        </div>
                    ) : productViewMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-6">
                            {Object.entries(productCategories).map(([cat, products]) => (
                                <div key={cat} className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm">
                                    <h4 className="text-[10px] font-black text-orange-600 uppercase tracking-[0.3em] mb-4 border-b pb-2">
                                        {cat} ({products.length})
                                    </h4>
                                    <div className="space-y-2 max-h-80 overflow-y-auto">
                                        {products.map(p => (
                                            <div key={p.id} className="flex items-center justify-between group">
                                                <Checkbox 
                                                    label={
                                                        <span className="text-xs font-bold text-gray-700 group-hover:text-orange-600 transition-colors">
                                                            {p.name}
                                                        </span>
                                                    } 
                                                    checked={!!selectedProducts[p.id]} 
                                                    onChange={handleProductSelect(p.id)} 
                                                />
                                                {selectedProducts[p.id] && (
                                                    <input 
                                                        type="number" 
                                                        className="w-12 text-center text-xs font-black bg-orange-50 text-orange-600 rounded-lg p-1 animate-in zoom-in" 
                                                        value={selectedProducts[p.id]} 
                                                        onChange={handleProductQuantityChange(p.id)} 
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="text-left p-4 text-[10px] font-black uppercase text-gray-500">Product</th>
                                        <th className="text-left p-4 text-[10px] font-black uppercase text-gray-500">Category</th>
                                        <th className="text-center p-4 text-[10px] font-black uppercase text-gray-500">Qty</th>
                                        <th className="text-center p-4 text-[10px] font-black uppercase text-gray-500 w-20">Select</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProducts.map(p => (
                                        <tr key={p.id} className="border-b hover:bg-orange-50 transition-colors">
                                            <td className="p-4">
                                                <span className="font-bold text-sm text-gray-800">{p.name}</span>
                                            </td>
                                            <td className="p-4">
                                                <span className="text-xs font-bold text-gray-500 uppercase">{p.category}</span>
                                            </td>
                                            <td className="p-4 text-center">
                                                {selectedProducts[p.id] && (
                                                    <input 
                                                        type="number" 
                                                        className="w-16 text-center text-sm font-black bg-orange-50 text-orange-600 rounded-lg p-2 border border-orange-200" 
                                                        value={selectedProducts[p.id]} 
                                                        onChange={handleProductQuantityChange(p.id)} 
                                                    />
                                                )}
                                            </td>
                                            <td className="p-4 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={!!selectedProducts[p.id]}
                                                    onChange={handleProductSelect(p.id)}
                                                    className="w-5 h-5 text-orange-600 rounded border-gray-300 focus:ring-orange-500 cursor-pointer"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Section>
            </div>

            {/* MANUAL ITEMS (UPDATED WITH HIDDEN COST) */}
            <div className="mt-12 bg-slate-900 p-8 rounded-[3rem] text-white">
                <h3 className="text-xl font-black uppercase tracking-tighter mb-6 flex items-center gap-2">
                    <PlusCircle className="text-orange-500"/> Custom Line Items
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-2">
                        <Input 
                            label={<span className="text-gray-400">Description</span>} 
                            value={manualItemInput.name} 
                            onChange={e => setManualItemInput({...manualItemInput, name: e.target.value})} 
                            className="bg-slate-800 border-slate-700 text-white" 
                        />
                    </div>
                    <div>
                        <Input 
                            label={<span className="text-gray-400">USD Price</span>} 
                            type="number" 
                            value={manualItemInput.price} 
                            onChange={e => setManualItemInput({...manualItemInput, price: e.target.value})} 
                            className="bg-slate-800 border-slate-700 text-white" 
                        />
                    </div>
                    {/* NEW HIDDEN COST INPUT */}
                    <div>
                        <Input 
                            label={<span className="text-gray-400">USD Cost (Hidden)</span>} 
                            type="number" 
                            value={manualItemInput.cost} 
                            onChange={e => setManualItemInput({...manualItemInput, cost: e.target.value})} 
                            className="bg-slate-800 border-slate-700 text-white" 
                        />
                    </div>
                    <Button 
                        onClick={addManualItem} 
                        className="bg-orange-600 hover:bg-orange-500 h-[50px] rounded-2xl font-black uppercase w-full"
                    >
                        Add Item
                    </Button>
                </div>
                {manualItems.length > 0 && (
                    <div className="mt-8 space-y-3">
                        {manualItems.map((item, index) => (
                            <div key={item.id} className="flex justify-between items-center bg-slate-800 p-4 rounded-2xl border border-slate-700">
                                <span className="font-bold">{item.name}</span>
                                <div className="flex items-center gap-4">
                                    <span className="font-mono text-orange-400">$ {item.priceUSD.toLocaleString()}</span>
                                    <span className="text-xs text-gray-500">(Cost: ${item.costPriceUSD?.toLocaleString()})</span>
                                    <button 
                                        onClick={() => removeManualItem(index)} 
                                        className="text-slate-500 hover:text-red-400 transition-colors"
                                    >
                                        <Trash2 size={18}/>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* FOOTER TOTALS */}
            <div className="mt-12 flex flex-col md:flex-row items-center justify-between border-t pt-10 gap-6">
                <div className="flex gap-10">
                    <div className="text-center">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Sales (USD)</p>
                        <p className="text-4xl font-black text-gray-900">
                            $ {quoteTotals.finalSalesPrice.toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </p>
                    </div>
                    <div className="text-center border-l pl-10">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gross Margin</p>
                        <p className={`text-4xl font-black ${
                            quoteTotals.grossMarginPercentage < 30 ? 'text-red-500' : 'text-green-600'
                        }`}>
                            {quoteTotals.grossMarginPercentage.toFixed(1)}%
                        </p>
                    </div>
                </div>

                <div className="flex gap-4">
                    <Button 
                        onClick={generateQuotePreview} 
                        variant="secondary" 
                        className="px-8 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center gap-2"
                    >
                        <Eye size={20}/> Preview PDF
                    </Button>
                    <Button 
                        onClick={handleSave} 
                        variant="success" 
                        className="px-10 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-green-100"
                    >
                        <Save size={20}/> {initialData ? 'Update Quote' : 'Save to CRM'}
                    </Button>
                </div>
            </div>
        </Card>
    );
};

export default QuoteCalculator;
