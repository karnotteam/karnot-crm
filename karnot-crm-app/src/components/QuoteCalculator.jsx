import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Eye, Plus, Trash2, Save, Search, Check, Briefcase, Grid, List } from 'lucide-react';
import { Card, Button, Input, Textarea, Checkbox, Section, PRICING_TIERS } from '../data/constants.jsx';

// --- FIREBASE IMPORTS (FIXED) ---
import { db } from '../firebase';
import { collection, getDocs, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const QuoteCalculator = ({ onSaveQuote, nextQuoteNumber, initialData = null, companies, contacts, opportunities }) => {
    
    // --- STATE ---
    const [dbProducts, setDbProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [opportunityId, setOpportunityId] = useState(initialData?.opportunityId || null);
    
    const [customer, setCustomer] = useState({ 
        id: '', name: '', number: '', tin: '', address: '', saleType: 'Export',
        contactId: '', contactName: '', contactEmail: '', tier: 'STANDARD' 
    });
    
    const [commercial, setCommercial] = useState({ 
        shippingTerms: 'Ex-Works Warehouse', 
        deliveryTime: '3-5 days from payment', 
        dueDate: '', 
        discount: 0, 
        wht: 0 
    });
    
    const [docControl, setDocControl] = useState({ 
        quoteNumber: nextQuoteNumber, 
        revision: 'A', 
        paymentTerms: 'Full payment is required upon order confirmation.' 
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
        includeLandedCost: true 
    });
    
    const [selectedProducts, setSelectedProducts] = useState({});
    const [manualItems, setManualItems] = useState([]);
    const [manualItemInput, setManualItemInput] = useState({ name: '', price: '', specs: '' });
    
    // UI State
    const [companySearch, setCompanySearch] = useState('');
    const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
    const [productViewMode, setProductViewMode] = useState('grid'); // grid or compact
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
            id: '', name: '', number: '', tin: '', address: '', saleType: 'Export',
            contactId: '', contactName: '', contactEmail: '', tier: 'STANDARD'
        };
        
        if (initialData) {
            setCustomer({ ...defaultCustomer, ...initialData.customer });
            setCompanySearch(initialData.customer?.name || ''); 
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
                paymentTerms: 'Full payment is required upon order confirmation.', 
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
                includeLandedCost: true, 
                ...initialData.docGeneration 
            });
            setSelectedProducts(initialData.selectedProducts || {});
            setManualItems(initialData.manualItems || []);
            setOpportunityId(initialData.opportunityId || null);
        }
    }, [initialData, nextQuoteNumber]);

    // --- RELATED OPPORTUNITIES ---
    const relatedOpportunities = useMemo(() => {
        if (!opportunities || !customer.name) return [];
        return opportunities.filter(opp => 
            opp.customerName?.toLowerCase().trim() === customer.name?.toLowerCase().trim()
        );
    }, [opportunities, customer.name]);

    // --- FILTERED COMPANIES ---
    const filteredCompanies = useMemo(() => {
        if (!companies) return [];
        return companies.filter(c => 
            c.companyName.toLowerCase().includes(companySearch.toLowerCase())
        );
    }, [companies, companySearch]);

    // --- COMPANY CONTACTS ---
    const companyContacts = useMemo(() => {
        if (!customer.name || !contacts) return [];
        return contacts.filter(c => c.companyName === customer.name);
    }, [contacts, customer.name]);

    // --- FILTERED PRODUCTS ---
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
            tin: company.tin || prev.tin,
            contactId: '', 
            contactName: '', 
            contactEmail: '',
            tier: detectedTier 
        }));
        
        setCompanySearch(company.companyName);
        setIsCompanyDropdownOpen(false);

        setCommercial(prev => ({
            ...prev,
            discount: tierDiscount,
            shippingTerms: detectedTier === 'EXPORT' ? 'FOB' : prev.shippingTerms 
        }));
        
        // Auto-link to funnel
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
                quantity: 1, 
                id: `manual_${Date.now()}` 
            }]);
            setManualItemInput({ name: '', price: '', specs: '' });
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

    // --- QUOTE PREVIEW ---
    const generateQuotePreview = () => {
        const { allItems, subtotalUSD, finalSalesPrice } = quoteTotals;
        if (allItems.length === 0) return alert("Please select products first.");

        const formatPHP = (num) => `₱${num.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        const formatUSD = (num) => `$${num.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

        const todayFormatted = new Date().toLocaleDateString('en-CA');
        let quoteId = `QN${String(docControl.quoteNumber).padStart(4, '0')}/${new Date().getFullYear()}`;
        if (docControl.revision) quoteId += ` - Rev ${docControl.revision}`;

        const primaryFormat = docGeneration.generateInPHP ? formatPHP : formatUSD;
        const conversion = docGeneration.generateInPHP ? costing.forexRate : 1;

        const logoURL = "https://img1.wsimg.com/isteam/ip/cb1de239-c2b8-4674-b57d-5ae86a72feb1/Asset%2010%404x.png/:/rs=w:400,cg:true,m";
        const companyHeader = `<div style="display:flex; justify-content:space-between; border-bottom:2px solid #ea580c; padding-bottom:20px; margin-bottom:20px;">
            <img src="${logoURL}" style="width:180px;">
            <div style="text-align:right; font-size:12px;"><strong>Karnot Energy Solutions Inc.</strong><br>Mapandan, Pangasinan<br>TIN: 000-000-000-000</div>
        </div>`;

        const itemsHTML = allItems.map(p => `<tr>
            <td style="padding:10px; border-bottom:1px solid #eee;">${p.name}<br><small style="color:#666;">${p.specs || ''}</small></td>
            <td style="padding:10px; border-bottom:1px solid #eee; text-align:center;">${p.quantity}</td>
            <td style="padding:10px; border-bottom:1px solid #eee; text-align:right;">${primaryFormat((p.salesPriceUSD || p.priceUSD) * conversion)}</td>
            <td style="padding:10px; border-bottom:1px solid #eee; text-align:right;">${primaryFormat((p.salesPriceUSD || p.priceUSD) * conversion * p.quantity)}</td>
        </tr>`).join('');

        const finalReportHTML = `<html><head><title>Quote ${quoteId}</title>
            <style>body{font-family:Helvetica, Arial, sans-serif; color:#333; padding:40px;} table{width:100%; border-collapse:collapse; margin-top:20px;} th{background:#ea580c; color:white; padding:10px; text-align:left;} .total-box{float:right; width:300px; margin-top:20px; background:#f9f9f9; padding:15px; border-radius:10px;}</style>
            </head><body>
            ${companyHeader}
            <div style="margin-bottom:30px;"><strong>Quote To:</strong><br>${customer.name}<br>${customer.address}</div>
            <div style="margin-bottom:30px;"><strong>Quote ID:</strong> ${quoteId}<br><strong>Date:</strong> ${todayFormatted}</div>
            <table><thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr></thead><tbody>${itemsHTML}</tbody></table>
            <div class="total-box">
                <div style="display:flex; justify-content:space-between;"><span>Subtotal:</span><span>${primaryFormat(subtotalUSD * conversion)}</span></div>
                ${commercial.discount > 0 ? `<div style="display:flex; justify-content:space-between; color:red;"><span>Discount (${commercial.discount}%):</span><span>-${primaryFormat((subtotalUSD * (commercial.discount/100)) * conversion)}</span></div>` : ''}
                <div style="display:flex; justify-content:space-between; font-size:18px; font-weight:bold; margin-top:10px; border-top:1px solid #ddd; padding-top:10px;"><span>Total:</span><span>${primaryFormat(finalSalesPrice * conversion)}</span></div>
            </div>
            <div style="margin-top:100px; font-size:11px; border-top:1px solid #eee; padding-top:20px;">
                <strong>Terms & Conditions:</strong><br>${docControl.paymentTerms.replace(/\n/g, '<br>')}
            </div>
            </body></html>`;

        const win = window.open("", "QuotePreview");
        win.document.write(finalReportHTML);
        win.document.close();
    };
    
    // --- SAVE QUOTE (FIXED) ---
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
            lastModified: serverTimestamp(),
            
            // CRM HANDSHAKE FIELDS
            opportunityId: opportunityId || null, 
            companyId: companyId,
            customerName: customer.name
        };

        console.log("Saving quote:", newQuote); // DEBUG
        onSaveQuote(newQuote);
    };

    // --- PRODUCT CATEGORIES ---
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

                        <Textarea label="Address" value={customer.address} onChange={handleInputChange(setCustomer, 'address')} rows="3" />
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
                <Section title="3. Document Logic">
                    <div className="space-y-4">
                        <Textarea label="Payment Terms" rows="6" value={docControl.paymentTerms} onChange={handleInputChange(setDocControl, 'paymentTerms')} />
                        <div className="p-4 bg-orange-50 rounded-2xl space-y-3 border border-orange-100">
                            <Checkbox label="Output in PHP (Peso)" checked={docGeneration.generateInPHP} onChange={handleCheckboxChange(setDocGeneration, 'generateInPHP')} />
                            <Checkbox label="Include Landed Cost Breakdown" checked={docGeneration.includeLandedCost} onChange={handleCheckboxChange(setDocGeneration, 'includeLandedCost')} />
                        </div>
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

            {/* MANUAL ITEMS */}
            <div className="mt-12 bg-slate-900 p-8 rounded-[3rem] text-white">
                <h3 className="text-xl font-black uppercase tracking-tighter mb-6 flex items-center gap-2">
                    <Plus className="text-orange-500"/> Custom Line Items
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
                    <Button 
                        onClick={addManualItem} 
                        className="bg-orange-600 hover:bg-orange-500 h-[50px] rounded-2xl font-black uppercase"
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
