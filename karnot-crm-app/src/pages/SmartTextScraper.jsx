import React, { useState, useMemo } from 'react';
import { 
    Upload, Search, Building, Phone, Globe, MapPin, 
    User, Mail, Briefcase, FileText, ArrowRight, Trash2,
    Zap, CheckCircle, AlertCircle, Loader, Download, Users, Sparkles
} from 'lucide-react';
import { Card, Button, Input, Textarea } from '../data/constants.jsx';
import { ExportButton } from '../utils/ExcelExport.jsx';
import { db } from '../firebase';
import { collection, writeBatch, doc, serverTimestamp } from 'firebase/firestore';

// ============================================================================
// SMART TEXT SCRAPER
// Paste ANY text → Extract companies & contacts → Enrich → Import to CRM
// Works with: conference agendas, articles, LinkedIn, emails, anything!
// ============================================================================

const SmartTextScraper = ({ user }) => {
    
    const [importText, setImportText] = useState('');
    const [parsedData, setParsedData] = useState({ companies: [], contacts: [] });
    const [selectedCompanies, setSelectedCompanies] = useState(new Set());
    const [enrichmentResults, setEnrichmentResults] = useState([]);
    const [processing, setProcessing] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);
    const [defaultCity, setDefaultCity] = useState('Manila');
    const [sourceDescription, setSourceDescription] = useState('');

    // ========================================================================
    // STEP 1: SMART AI PARSER - Extract Companies & Contacts from ANY Text
    // ========================================================================

    const handleParseText = () => {
        if (!importText.trim()) {
            alert("Please paste text to analyze");
            return;
        }

        const lines = importText.split('\n');
        const companies = new Map();
        const contacts = [];

        // Company indicators (broader patterns)
        const companyKeywords = /(Corp|Inc|Company|Ltd|Limited|Group|Holdings|Development|Services|Corporation|Sdn Bhd|Bank|Department|Commission|Board|Ministry|Association|Foundation|Institute|Center|Centre|University|College|Solutions|Technologies|Consulting|Partners|Ventures|Capital|Energy|Engineering|Systems)/i;

        // Title patterns for contact detection
        const titlePatterns = /(President|CEO|Chief|Director|VP|Vice President|Manager|Head|Chairperson|Secretary|Executive|Officer|General Manager|AVP|Managing Director|Specialist|Leader|Coordinator|Supervisor|Representative|Chairman|Founder|Partner|Analyst|Engineer|Consultant|Architect)/i;

        lines.forEach((line, idx) => {
            const cleaned = line.trim();
            if (!cleaned || cleaned.length < 5) return;

            // ============================================================
            // PATTERN 1: "Name, Title, Company" 
            // Example: "John Smith, CEO, Acme Corp"
            // ============================================================
            const standardPattern = /^([A-Z][a-zA-Z\s\.\-']+),\s*([^,]+),\s*(.+)$/;
            const standardMatch = cleaned.match(standardPattern);
            
            if (standardMatch) {
                const name = standardMatch[1].trim();
                const title = standardMatch[2].trim();
                const organization = standardMatch[3].trim();

                // Only if title looks like a real title
                if (title.match(titlePatterns)) {
                    const nameParts = name.split(/\s+/);
                    const firstName = nameParts[0];
                    const lastName = nameParts.slice(1).join(' ') || firstName;

                    contacts.push({
                        id: `contact_${idx}`,
                        firstName,
                        lastName,
                        fullName: name,
                        title,
                        organization,
                        source: line
                    });

                    // Add company
                    const cleanOrg = cleanCompanyName(organization);
                    if (!companies.has(cleanOrg)) {
                        companies.set(cleanOrg, {
                            id: `company_${companies.size}`,
                            name: cleanOrg,
                            source: organization
                        });
                    }
                }
                return;
            }

            // ============================================================
            // PATTERN 2: "Name - Title at Company"
            // Example: "Jane Doe - Marketing Manager at TechCorp Inc"
            // ============================================================
            const dashPattern = /^([A-Z][a-zA-Z\s\.\-']+)\s*[-–—]\s*(.+?)\s+at\s+(.+)$/i;
            const dashMatch = cleaned.match(dashPattern);
            
            if (dashMatch) {
                const name = dashMatch[1].trim();
                const title = dashMatch[2].trim();
                const organization = dashMatch[3].trim();

                const nameParts = name.split(/\s+/);
                const firstName = nameParts[0];
                const lastName = nameParts.slice(1).join(' ') || firstName;

                contacts.push({
                    id: `contact_${idx}`,
                    firstName,
                    lastName,
                    fullName: name,
                    title,
                    organization,
                    source: line
                });

                const cleanOrg = cleanCompanyName(organization);
                if (!companies.has(cleanOrg)) {
                    companies.set(cleanOrg, {
                        id: `company_${companies.size}`,
                        name: cleanOrg,
                        source: organization
                    });
                }
                return;
            }

            // ============================================================
            // PATTERN 3: "Title: Name, Company"
            // Example: "CEO: Robert Johnson, Global Dynamics Ltd"
            // ============================================================
            const titleFirstPattern = /^([^:]+):\s*([A-Z][a-zA-Z\s\.\-']+),\s*(.+)$/;
            const titleFirstMatch = cleaned.match(titleFirstPattern);
            
            if (titleFirstMatch && titleFirstMatch[1].match(titlePatterns)) {
                const title = titleFirstMatch[1].trim();
                const name = titleFirstMatch[2].trim();
                const organization = titleFirstMatch[3].trim();

                const nameParts = name.split(/\s+/);
                const firstName = nameParts[0];
                const lastName = nameParts.slice(1).join(' ') || firstName;

                contacts.push({
                    id: `contact_${idx}`,
                    firstName,
                    lastName,
                    fullName: name,
                    title,
                    organization,
                    source: line
                });

                const cleanOrg = cleanCompanyName(organization);
                if (!companies.has(cleanOrg)) {
                    companies.set(cleanOrg, {
                        id: `company_${companies.size}`,
                        name: cleanOrg,
                        source: organization
                    });
                }
                return;
            }

            // ============================================================
            // PATTERN 4: Just company names
            // Example: "Microsoft Corporation"
            // ============================================================
            if (cleaned.match(companyKeywords) && !cleaned.match(/^[a-z]/) && cleaned.length < 100) {
                // Skip common headers/labels
                if (cleaned.match(/^(Platinum|Gold|Silver|Bronze|Supporting|Partner|Sponsor|Organized by|In Conjunction|Session|Panel|Keynote|Welcome|Opening|Closing)/i)) {
                    return;
                }

                const cleanOrg = cleanCompanyName(cleaned);
                if (!companies.has(cleanOrg) && cleanOrg.length > 3) {
                    companies.set(cleanOrg, {
                        id: `company_${companies.size}`,
                        name: cleanOrg,
                        source: cleaned
                    });
                }
            }
        });

        const companiesArray = Array.from(companies.values());
        
        setParsedData({
            companies: companiesArray,
            contacts: contacts
        });
        setSelectedCompanies(new Set(companiesArray.map(c => c.id)));

        alert(`✨ Found ${companiesArray.length} companies and ${contacts.length} contacts!`);
    };

    // Clean company names
    const cleanCompanyName = (name) => {
        return name
            .replace(/\s*\([^)]*\)/g, '') // Remove (AUSI), (Philippines)
            .replace(/\s*represented by.*/i, '')
            .replace(/\s*for\s+.*/i, '')
            .replace(/^(The|A|An)\s+/i, '') // Remove articles
            .trim();
    };

    // ========================================================================
    // STEP 2: ENRICH WITH GOOGLE PLACES
    // ========================================================================

    const enrichSingleCompany = async (company) => {
        setCurrentItem(company.name);
        
        try {
            const searchQuery = `${company.name} ${defaultCity} Philippines`;
            
            const response = await fetch('/.netlify/functions/places-search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    keyword: searchQuery,
                    radius: 50000
                })
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
                const match = data.results[0];
                
                return {
                    companyId: company.id,
                    companyName: company.name,
                    status: 'FOUND',
                    enrichedData: {
                        phone: match.formatted_phone_number || '',
                        website: match.website || '',
                        address: match.formatted_address || '',
                        rating: match.rating || null,
                        reviewCount: match.user_ratings_total || null,
                        googleMapsUrl: match.url || '',
                        placeId: match.place_id || '',
                        foundName: match.name || ''
                    },
                    confidence: calculateConfidence(company.name, match.name),
                    contacts: parsedData.contacts.filter(c => 
                        cleanCompanyName(c.organization) === company.name
                    )
                };
            } else {
                return {
                    companyId: company.id,
                    companyName: company.name,
                    status: 'NOT_FOUND',
                    enrichedData: null,
                    contacts: parsedData.contacts.filter(c => 
                        cleanCompanyName(c.organization) === company.name
                    )
                };
            }
        } catch (error) {
            console.error(`Enrichment failed for ${company.name}:`, error);
            return {
                companyId: company.id,
                companyName: company.name,
                status: 'ERROR',
                error: error.message,
                contacts: []
            };
        }
    };

    const calculateConfidence = (originalName, foundName) => {
        if (!originalName || !foundName) return 0;
        
        const orig = originalName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const found = foundName.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        if (orig === found) return 100;
        if (found.includes(orig) || orig.includes(found)) return 85;
        
        const origWords = originalName.toLowerCase().split(/\s+/);
        const foundWords = foundName.toLowerCase().split(/\s+/);
        const overlap = origWords.filter(w => foundWords.some(fw => fw.includes(w) || w.includes(fw))).length;
        const confidence = (overlap / Math.max(origWords.length, foundWords.length)) * 100;
        
        return Math.round(confidence);
    };

    // ========================================================================
    // BATCH PROCESSING
    // ========================================================================

    const handleBatchEnrichment = async () => {
        if (selectedCompanies.size === 0) {
            alert("Please select companies to enrich");
            return;
        }

        if (!window.confirm(`Search Google Places for ${selectedCompanies.size} companies?\n\nCost: ~$${(selectedCompanies.size * 0.05).toFixed(2)}\n\nThis will take ~${Math.ceil(selectedCompanies.size / 60)} minutes.`)) {
            return;
        }

        setProcessing(true);
        setEnrichmentResults([]);

        const companiesToEnrich = parsedData.companies.filter(c => selectedCompanies.has(c.id));
        const results = [];

        for (const company of companiesToEnrich) {
            const result = await enrichSingleCompany(company);
            results.push(result);
            setEnrichmentResults([...results]);
            
            // Rate limiting: 1/sec
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        setProcessing(false);
        setCurrentItem(null);
        alert(`✅ Complete! Found data for ${results.filter(r => r.status === 'FOUND').length} of ${results.length} companies.`);
    };

    // ========================================================================
    // STEP 3: IMPORT TO PHILIPPINES CRM
    // ========================================================================

    const handleBulkImportToCRM = async () => {
        if (!user) {
            alert("Please log in");
            return;
        }

        const successfulResults = enrichmentResults.filter(r => 
            r.status === 'FOUND' && r.confidence >= 50
        );

        if (successfulResults.length === 0) {
            alert("No results to import");
            return;
        }

        const totalContacts = successfulResults.reduce((sum, r) => sum + r.contacts.length, 0);

        if (!window.confirm(`Import to Philippines CRM:\n\n${successfulResults.length} companies\n${totalContacts} contacts\n\nContinue?`)) {
            return;
        }

        try {
            const batch = writeBatch(db);
            const companyIds = new Map();

            // Import Companies
            let companyCount = 0;
            for (const result of successfulResults) {
                if (companyCount >= 450) break;

                const companyDocRef = doc(collection(db, "users", user.uid, "companies"));
                batch.set(companyDocRef, {
                    companyName: result.companyName,
                    city: defaultCity,
                    address: result.enrichedData.address,
                    phone: result.enrichedData.phone,
                    website: result.enrichedData.website,
                    email: '',
                    type: 'Lead',
                    industry: '',
                    source: sourceDescription || 'Smart Text Scraper',
                    status: 'New Lead',
                    priority: 'High',
                    currency: 'PHP',
                    notes: `Scraped from text. Confidence: ${result.confidence}%. Google: ${result.enrichedData.foundName}`,
                    rating: result.enrichedData.rating,
                    reviewCount: result.enrichedData.reviewCount,
                    googleMapsUrl: result.enrichedData.googleMapsUrl,
                    isExportTarget: false, // Philippines domestic
                    isTarget: true,
                    createdAt: serverTimestamp()
                });

                companyIds.set(result.companyId, companyDocRef.id);
                companyCount++;
            }

            // Import Contacts
            let contactCount = 0;
            for (const result of successfulResults) {
                const companyFirebaseId = companyIds.get(result.companyId);
                if (!companyFirebaseId) continue;

                for (const contact of result.contacts) {
                    if (companyCount + contactCount >= 500) break;

                    const contactDocRef = doc(collection(db, "users", user.uid, "contacts"));
                    batch.set(contactDocRef, {
                        firstName: contact.firstName,
                        lastName: contact.lastName,
                        title: contact.title,
                        email: '',
                        phone: '',
                        mobile: '',
                        companyId: companyFirebaseId,
                        role: 'Decision Maker',
                        department: '',
                        notes: `From text scraper: ${contact.source}`,
                        linkedin: '',
                        isPrimaryContact: contactCount === 0,
                        source: sourceDescription || 'Smart Text Scraper',
                        createdAt: serverTimestamp()
                    });

                    contactCount++;
                }
            }

            await batch.commit();
            alert(`✅ SUCCESS!\n\nImported:\n${companyCount} companies\n${contactCount} contacts\n\nCheck Sales & CRM → Companies`);
            
            // Clear
            setEnrichmentResults([]);
            setParsedData({ companies: [], contacts: [] });
            setImportText('');

        } catch (error) {
            console.error("Import failed:", error);
            alert(`Import failed: ${error.message}`);
        }
    };

    // ========================================================================
    // SELECTION
    // ========================================================================

    const toggleSelection = (companyId) => {
        setSelectedCompanies(prev => {
            const next = new Set(prev);
            if (next.has(companyId)) {
                next.delete(companyId);
            } else {
                next.add(companyId);
            }
            return next;
        });
    };

    const selectAll = () => setSelectedCompanies(new Set(parsedData.companies.map(c => c.id)));
    const clearSelection = () => setSelectedCompanies(new Set());

    // ========================================================================
    // STATS
    // ========================================================================

    const stats = useMemo(() => {
        const totalCompanies = parsedData.companies.length;
        const totalContacts = parsedData.contacts.length;
        const selected = selectedCompanies.size;
        const enriched = enrichmentResults.length;
        const found = enrichmentResults.filter(r => r.status === 'FOUND').length;
        const contactsWithCompanies = enrichmentResults.reduce((sum, r) => sum + r.contacts.length, 0);

        return { totalCompanies, totalContacts, selected, enriched, found, contactsWithCompanies };
    }, [parsedData, selectedCompanies, enrichmentResults]);

    // Export data
    const exportData = useMemo(() => {
        return enrichmentResults
            .filter(r => r.status === 'FOUND')
            .flatMap(r => 
                r.contacts.length > 0 
                    ? r.contacts.map(c => ({
                        company: r.companyName,
                        contact: c.fullName,
                        title: c.title,
                        phone: r.enrichedData.phone,
                        website: r.enrichedData.website,
                        confidence: `${r.confidence}%`
                    }))
                    : [{
                        company: r.companyName,
                        contact: '',
                        title: '',
                        phone: r.enrichedData.phone,
                        website: r.enrichedData.website,
                        confidence: `${r.confidence}%`
                    }]
            );
    }, [enrichmentResults]);

    // ========================================================================
    // RENDER
    // ========================================================================

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b-2 pb-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-3">
                        <Sparkles className="text-purple-600" size={32} />
                        Smart Text Scraper
                    </h1>
                    <p className="text-gray-500 text-sm font-bold mt-1">
                        Paste any text → AI finds companies & contacts → Auto-enrich → Import to CRM
                    </p>
                </div>
                <div className="flex gap-3">
                    {enrichmentResults.length > 0 && (
                        <>
                            <ExportButton 
                                data={exportData}
                                filename={`Scraped_Leads_${new Date().toISOString().split('T')[0]}.csv`}
                                columns={[
                                    { key: 'company', label: 'Company' },
                                    { key: 'contact', label: 'Contact' },
                                    { key: 'title', label: 'Title' },
                                    { key: 'phone', label: 'Phone' },
                                    { key: 'website', label: 'Website' },
                                    { key: 'confidence', label: 'Match %' }
                                ]}
                            />
                            <Button 
                                variant="primary"
                                onClick={handleBulkImportToCRM}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                <CheckCircle size={16} className="mr-2" />
                                Import to Philippines CRM
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200">
                    <div className="flex items-center justify-between">
                        <Building className="text-purple-600" size={28} />
                        <div className="text-right">
                            <p className="text-xs text-purple-600 font-black uppercase">Companies Found</p>
                            <p className="text-3xl font-black text-purple-900">{stats.totalCompanies}</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
                    <div className="flex items-center justify-between">
                        <Users className="text-blue-600" size={28} />
                        <div className="text-right">
                            <p className="text-xs text-blue-600 font-black uppercase">Contacts Found</p>
                            <p className="text-3xl font-black text-blue-900">{stats.totalContacts}</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200">
                    <div className="flex items-center justify-between">
                        <Zap className="text-orange-600" size={28} />
                        <div className="text-right">
                            <p className="text-xs text-orange-600 font-black uppercase">Enriched</p>
                            <p className="text-3xl font-black text-orange-900">{stats.enriched}</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200">
                    <div className="flex items-center justify-between">
                        <CheckCircle className="text-green-600" size={28} />
                        <div className="text-right">
                            <p className="text-xs text-green-600 font-black uppercase">Data Found</p>
                            <p className="text-3xl font-black text-green-900">{stats.found}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* STEP 1: Parse Text */}
            {parsedData.companies.length === 0 && (
                <Card className="p-6">
                    <h3 className="text-lg font-black text-gray-800 mb-4 uppercase flex items-center gap-2">
                        <Upload size={20} />
                        Step 1: Paste Any Text
                    </h3>
                    
                    <div className="mb-4">
                        <label className="text-xs font-black uppercase text-gray-500 mb-2 block">
                            Source Description (Optional)
                        </label>
                        <Input 
                            value={sourceDescription}
                            onChange={(e) => setSourceDescription(e.target.value)}
                            placeholder="e.g., 'Energy Efficiency Day 2025', 'LinkedIn Post', 'Industry Report'"
                        />
                    </div>

                    <Textarea
                        value={importText}
                        onChange={(e) => setImportText(e.target.value)}
                        rows={15}
                        placeholder="Paste any text here...&#10;&#10;Examples that work:&#10;&#10;✓ Conference agendas&#10;✓ LinkedIn posts&#10;✓ News articles&#10;✓ Email lists&#10;✓ Directory listings&#10;✓ Company reports&#10;✓ Meeting notes&#10;✓ Industry articles&#10;&#10;The AI will automatically find:&#10;• Company names&#10;• People's names&#10;• Job titles&#10;• Organizations"
                        className="font-mono text-sm"
                    />

                    <div className="mt-4 flex justify-between items-center">
                        <div className="text-xs text-gray-500 space-y-1">
                            <p>💡 <strong>Tip:</strong> Works best with structured text (bullet points, lists, formal writing)</p>
                            <p>🎯 <strong>Finds:</strong> "John Smith, CEO, Acme Corp" → Company + Contact</p>
                            <p>📍 <strong>Or:</strong> Just company names like "Microsoft Corporation"</p>
                        </div>
                        <Button onClick={handleParseText} variant="primary" className="ml-4">
                            <Sparkles size={16} className="mr-2" />
                            Parse Text
                        </Button>
                    </div>
                </Card>
            )}

            {/* STEP 2: Configure & Enrich */}
            {parsedData.companies.length > 0 && enrichmentResults.length === 0 && (
                <>
                    <Card className="p-6">
                        <h3 className="text-lg font-black text-gray-800 mb-4 uppercase">Configuration</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-black uppercase text-gray-500 mb-2 block">
                                    City for Search
                                </label>
                                <select
                                    value={defaultCity}
                                    onChange={(e) => setDefaultCity(e.target.value)}
                                    className="w-full p-3 border-2 border-gray-200 rounded-xl font-bold"
                                >
                                    <option value="Manila">Manila</option>
                                    <option value="Makati">Makati</option>
                                    <option value="Quezon City">Quezon City</option>
                                    <option value="BGC Taguig">BGC Taguig</option>
                                    <option value="Cebu">Cebu</option>
                                    <option value="Davao">Davao</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-black uppercase text-gray-500 mb-2 block">
                                    Source Tag
                                </label>
                                <Input 
                                    value={sourceDescription}
                                    onChange={(e) => setSourceDescription(e.target.value)}
                                    placeholder="e.g., 'EE Day 2025 Conference'"
                                />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-lg font-black text-gray-800 uppercase">
                                    Review Extracted Data
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    {stats.totalCompanies} companies, {stats.totalContacts} contacts · {stats.selected} selected
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" variant="secondary" onClick={selectAll}>
                                    Select All
                                </Button>
                                <Button size="sm" variant="secondary" onClick={clearSelection}>
                                    Clear
                                </Button>
                                <Button size="sm" variant="secondary" onClick={() => {
                                    setParsedData({ companies: [], contacts: [] });
                                    setImportText('');
                                }}>
                                    <Trash2 size={14} className="mr-1" />
                                    Reset
                                </Button>
                                <Button 
                                    variant="primary"
                                    onClick={handleBatchEnrichment}
                                    disabled={processing || selectedCompanies.size === 0}
                                >
                                    {processing ? (
                                        <>
                                            <Loader className="animate-spin mr-2" size={14} />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <Zap size={14} className="mr-2" />
                                            Enrich {stats.selected} Companies
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>

                        {processing && currentItem && (
                            <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                                <p className="text-sm font-bold text-purple-700 flex items-center gap-2">
                                    <Loader className="animate-spin" size={16} />
                                    Searching: {currentItem}
                                </p>
                                <p className="text-xs text-purple-600 mt-1">
                                    {enrichmentResults.length} of {stats.selected} processed
                                </p>
                            </div>
                        )}

                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {parsedData.companies.map(company => {
                                const companyContacts = parsedData.contacts.filter(c => 
                                    cleanCompanyName(c.organization) === company.name
                                );

                                return (
                                    <div 
                                        key={company.id}
                                        className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                                            selectedCompanies.has(company.id)
                                                ? 'bg-purple-50 border-purple-300'
                                                : 'bg-white border-gray-200 hover:border-gray-300'
                                        }`}
                                        onClick={() => toggleSelection(company.id)}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-black text-gray-900">{company.name}</h4>
                                                    {companyContacts.length > 0 && (
                                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-black">
                                                            {companyContacts.length} {companyContacts.length === 1 ? 'contact' : 'contacts'}
                                                        </span>
                                                    )}
                                                </div>
                                                {companyContacts.length > 0 && (
                                                    <div className="mt-2 space-y-1">
                                                        {companyContacts.map((contact, idx) => (
                                                            <p key={idx} className="text-xs text-gray-600 flex items-center gap-2">
                                                                <User size={12} className="text-blue-500" />
                                                                <span className="font-bold">{contact.fullName}</span>
                                                                <span className="text-gray-400">·</span>
                                                                <span>{contact.title}</span>
                                                            </p>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <input 
                                                type="checkbox"
                                                checked={selectedCompanies.has(company.id)}
                                                onChange={() => toggleSelection(company.id)}
                                                className="mt-1"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </>
            )}

            {/* STEP 3: Results */}
            {enrichmentResults.length > 0 && (
                <Card className="p-6">
                    <h3 className="text-lg font-black text-gray-800 mb-4 uppercase">
                        Enrichment Results ({stats.found} of {stats.enriched} found data)
                    </h3>

                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                        {enrichmentResults.map((result, idx) => (
                            <Card 
                                key={idx}
                                className={`p-4 ${
                                    result.status === 'FOUND' && result.confidence >= 70
                                        ? 'border-2 border-green-200 bg-green-50'
                                        : result.status === 'FOUND'
                                        ? 'border-2 border-yellow-200 bg-yellow-50'
                                        : 'border-2 border-gray-200'
                                }`}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h4 className="font-black text-gray-900">{result.companyName}</h4>
                                            
                                            {result.status === 'FOUND' && (
                                                <>
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                                                        result.confidence >= 70 
                                                            ? 'bg-green-600 text-white'
                                                            : 'bg-yellow-600 text-white'
                                                    }`}>
                                                        {result.confidence}% Match
                                                    </span>
                                                    {result.contacts.length > 0 && (
                                                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-black">
                                                            {result.contacts.length} contacts
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </div>

                                        {result.status === 'FOUND' && result.enrichedData && (
                                            <div className="space-y-2">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                                    {result.enrichedData.phone && (
                                                        <p className="flex items-center gap-2">
                                                            <Phone size={14} className="text-blue-600" />
                                                            <span className="font-bold text-gray-700">
                                                                {result.enrichedData.phone}
                                                            </span>
                                                        </p>
                                                    )}
                                                    
                                                    {result.enrichedData.website && (
                                                        <a 
                                                            href={result.enrichedData.website}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-2 text-blue-600 hover:underline truncate"
                                                        >
                                                            <Globe size={14} />
                                                            <span className="font-bold truncate">{result.enrichedData.website}</span>
                                                        </a>
                                                    )}

                                                    {result.enrichedData.address && (
                                                        <p className="flex items-start gap-2 col-span-2">
                                                            <MapPin size={14} className="text-gray-600 mt-0.5 flex-shrink-0" />
                                                            <span className="text-xs text-gray-700">
                                                                {result.enrichedData.address}
                                                            </span>
                                                        </p>
                                                    )}
                                                </div>

                                                {result.contacts.length > 0 && (
                                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                                        <p className="text-xs font-black text-gray-500 uppercase mb-2">Contacts:</p>
                                                        <div className="space-y-1">
                                                            {result.contacts.map((contact, cidx) => (
                                                                <p key={cidx} className="text-sm text-gray-700 flex items-center gap-2">
                                                                    <User size={12} className="text-blue-500" />
                                                                    <span className="font-bold">{contact.fullName}</span>
                                                                    <span className="text-gray-400">·</span>
                                                                    <span className="text-xs">{contact.title}</span>
                                                                </p>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {result.status === 'NOT_FOUND' && (
                                            <p className="text-sm text-gray-500 italic">❌ No data found on Google Places</p>
                                        )}

                                        {result.status === 'ERROR' && (
                                            <p className="text-sm text-red-600">⚠️ Error: {result.error}</p>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
};

export default SmartTextScraper;
