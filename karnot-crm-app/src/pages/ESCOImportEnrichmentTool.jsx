import React, { useState, useMemo } from 'react';
import { 
    Upload, Search, Building, Phone, Globe, MapPin, 
    Zap, CheckCircle, AlertCircle, Loader, Download,
    Copy, Star, FileText, ArrowRight, Trash2
} from 'lucide-react';
import { Card, Button, Input, Textarea } from '../data/constants.jsx';
import { ExportButton } from '../utils/ExcelExport.jsx';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, writeBatch, doc } from 'firebase/firestore';

// ============================================================================
// ESCO LIST IMPORT & ENRICHMENT TOOL
// Import list of company names → Find contact data → Add to CRM
// ============================================================================

const ESCOImportEnrichmentTool = ({ user }) => {
    
    const [importText, setImportText] = useState('');
    const [parsedCompanies, setParsedCompanies] = useState([]);
    const [selectedCompanies, setSelectedCompanies] = useState(new Set());
    const [enrichmentResults, setEnrichmentResults] = useState([]);
    const [processing, setProcessing] = useState(false);
    const [currentCompany, setCurrentCompany] = useState(null);
    const [defaultCity, setDefaultCity] = useState('Kuala Lumpur');
    const [defaultRegion, setDefaultRegion] = useState('MALAYSIA');

    // ========================================================================
    // STEP 1: PARSE IMPORTED TEXT
    // ========================================================================

    const handleParseText = () => {
        if (!importText.trim()) {
            alert("Please paste your company list");
            return;
        }

        // Parse text - handle various formats
        const lines = importText.split('\n');
        const companies = [];

        lines.forEach((line, idx) => {
            // Remove numbering (1, 2., 1., etc.) and clean up
            let cleaned = line
                .replace(/^\d+\.?\s*/, '')  // Remove leading numbers
                .replace(/^D?NAME\d*\s*/i, '')  // Remove DNAME, NAME headers
                .trim();
            
            if (cleaned && cleaned.length > 3) {
                companies.push({
                    id: `import_${idx}`,
                    name: cleaned,
                    original: line.trim()
                });
            }
        });

        setParsedCompanies(companies);
        setSelectedCompanies(new Set(companies.map(c => c.id)));
        alert(`Parsed ${companies.length} companies successfully!`);
    };

    // ========================================================================
    // STEP 2: ENRICH WITH GOOGLE PLACES
    // ========================================================================

    const enrichSingleCompany = async (company) => {
        setCurrentCompany(company.name);
        
        try {
            const searchQuery = `${company.name} ${defaultCity} ${defaultRegion === 'MALAYSIA' ? 'Malaysia' : defaultRegion}`;
            
            const response = await fetch('/.netlify/functions/places-search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    keyword: searchQuery,
                    radius: 50000 // 50km
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
                        businessStatus: match.business_status || '',
                        foundName: match.name || ''
                    },
                    confidence: calculateConfidence(company.name, match.name)
                };
            } else {
                return {
                    companyId: company.id,
                    companyName: company.name,
                    status: 'NOT_FOUND',
                    enrichedData: null
                };
            }
        } catch (error) {
            console.error(`Enrichment failed for ${company.name}:`, error);
            return {
                companyId: company.id,
                companyName: company.name,
                status: 'ERROR',
                error: error.message
            };
        }
    };

    const calculateConfidence = (originalName, foundName) => {
        if (!originalName || !foundName) return 0;
        
        const orig = originalName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const found = foundName.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        if (orig === found) return 100;
        if (found.includes(orig) || orig.includes(found)) return 85;
        
        // Word overlap
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

        if (!window.confirm(`This will search Google Places for ${selectedCompanies.size} companies. This may take several minutes and will cost approximately $${(selectedCompanies.size * 0.05).toFixed(2)}. Continue?`)) {
            return;
        }

        setProcessing(true);
        setEnrichmentResults([]);

        const companiesToEnrich = parsedCompanies.filter(c => selectedCompanies.has(c.id));
        const results = [];

        for (const company of companiesToEnrich) {
            const result = await enrichSingleCompany(company);
            results.push(result);
            setEnrichmentResults([...results]); // Update UI incrementally
            
            // Rate limiting: 1 search per second
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        setProcessing(false);
        setCurrentCompany(null);
        alert(`Enrichment complete! Found data for ${results.filter(r => r.status === 'FOUND').length} of ${results.length} companies.`);
    };

    // ========================================================================
    // STEP 3: BULK IMPORT TO CRM
    // ========================================================================

    const handleBulkImportToCRM = async () => {
        if (!user) {
            alert("Please log in");
            return;
        }

        const successfulResults = enrichmentResults.filter(r => 
            r.status === 'FOUND' && 
            r.confidence >= 60
        );

        if (successfulResults.length === 0) {
            alert("No high-confidence results to import");
            return;
        }

        if (!window.confirm(`Import ${successfulResults.length} companies to CRM?`)) {
            return;
        }

        try {
            // Use batch write for efficiency (max 500 per batch)
            const batch = writeBatch(db);
            let count = 0;

            for (const result of successfulResults) {
                if (count >= 500) break; // Firestore batch limit

                const docRef = doc(collection(db, "users", user.uid, "companies"));
                batch.set(docRef, {
                    companyName: result.companyName,
                    region: defaultRegion,
                    city: defaultCity,
                    address: result.enrichedData.address,
                    phone: result.enrichedData.phone,
                    website: result.enrichedData.website,
                    email: '', // To be filled manually
                    type: 'ESCO',
                    industry: 'Energy Services',
                    source: 'Imported ESCO List + Google Places',
                    status: 'New Lead',
                    priority: 'Medium',
                    currency: 'MYR',
                    notes: `Imported from ESCO list. Google Places confidence: ${result.confidence}%. Found as: ${result.enrichedData.foundName}`,
                    rating: result.enrichedData.rating,
                    reviewCount: result.enrichedData.reviewCount,
                    googleMapsUrl: result.enrichedData.googleMapsUrl,
                    isExportTarget: true,
                    vipTarget: false,
                    createdAt: serverTimestamp(),
                    importedAt: serverTimestamp()
                });

                count++;
            }

            await batch.commit();
            alert(`Successfully imported ${count} companies to CRM!`);
            
            // Clear processed results
            setEnrichmentResults([]);
            setParsedCompanies([]);
            setImportText('');

        } catch (error) {
            console.error("Bulk import failed:", error);
            alert(`Import failed: ${error.message}`);
        }
    };

    // ========================================================================
    // SELECTION HANDLERS
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

    const selectAll = () => {
        setSelectedCompanies(new Set(parsedCompanies.map(c => c.id)));
    };

    const clearSelection = () => {
        setSelectedCompanies(new Set());
    };

    // ========================================================================
    // STATISTICS
    // ========================================================================

    const stats = useMemo(() => {
        const parsed = parsedCompanies.length;
        const selected = selectedCompanies.size;
        const enriched = enrichmentResults.length;
        const found = enrichmentResults.filter(r => r.status === 'FOUND').length;
        const highConfidence = enrichmentResults.filter(r => r.confidence >= 70).length;
        const mediumConfidence = enrichmentResults.filter(r => r.confidence >= 60 && r.confidence < 70).length;

        return { parsed, selected, enriched, found, highConfidence, mediumConfidence };
    }, [parsedCompanies, selectedCompanies, enrichmentResults]);

    // Export enrichment results
    const exportData = useMemo(() => {
        return enrichmentResults
            .filter(r => r.status === 'FOUND')
            .map(r => ({
                company: r.companyName,
                foundAs: r.enrichedData.foundName,
                confidence: `${r.confidence}%`,
                phone: r.enrichedData.phone,
                website: r.enrichedData.website,
                address: r.enrichedData.address,
                rating: r.enrichedData.rating || 'N/A',
                reviews: r.enrichedData.reviewCount || 0
            }));
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
                        <Upload className="text-orange-600" size={32} />
                        ESCO List Import & Enrichment
                    </h1>
                    <p className="text-gray-500 text-sm font-bold mt-1">
                        Import Malaysian ESCO names → Auto-find contact data → Add to CRM
                    </p>
                </div>
                <div className="flex gap-3">
                    {enrichmentResults.length > 0 && (
                        <>
                            <ExportButton 
                                data={exportData}
                                filename={`Enriched_ESCOs_${new Date().toISOString().split('T')[0]}.csv`}
                                columns={[
                                    { key: 'company', label: 'Company' },
                                    { key: 'foundAs', label: 'Found As' },
                                    { key: 'confidence', label: 'Match %' },
                                    { key: 'phone', label: 'Phone' },
                                    { key: 'website', label: 'Website' },
                                    { key: 'rating', label: 'Rating' }
                                ]}
                            />
                            <Button 
                                variant="primary"
                                onClick={handleBulkImportToCRM}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                <CheckCircle size={16} className="mr-2" />
                                Import {stats.highConfidence + stats.mediumConfidence} to CRM
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Statistics Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
                    <div className="flex items-center justify-between">
                        <FileText className="text-blue-600" size={28} />
                        <div className="text-right">
                            <p className="text-xs text-blue-600 font-black uppercase">Parsed</p>
                            <p className="text-3xl font-black text-blue-900">{stats.parsed}</p>
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
                            <p className="text-xs text-green-600 font-black uppercase">Found</p>
                            <p className="text-3xl font-black text-green-900">{stats.found}</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200">
                    <div className="flex items-center justify-between">
                        <Star className="text-purple-600" size={28} />
                        <div className="text-right">
                            <p className="text-xs text-purple-600 font-black uppercase">High Confidence</p>
                            <p className="text-3xl font-black text-purple-900">{stats.highConfidence}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* STEP 1: Import Text */}
            {parsedCompanies.length === 0 && (
                <Card className="p-6">
                    <h3 className="text-lg font-black text-gray-800 mb-4 uppercase flex items-center gap-2">
                        <Upload size={20} />
                        Step 1: Paste Your ESCO List
                    </h3>
                    
                    <Textarea
                        value={importText}
                        onChange={(e) => setImportText(e.target.value)}
                        rows={12}
                        placeholder="Paste your list here, one company per line. Formats accepted:&#10;&#10;1. Gading Kencana Sdn Bhd&#10;2. TNB Energy Services Sdn Bhd&#10;3. Advanced Maintenance Precision Management Sdn Bhd&#10;&#10;Or:&#10;&#10;Gading Kencana Sdn Bhd&#10;TNB Energy Services Sdn Bhd&#10;Advanced Maintenance Precision Management Sdn Bhd"
                        className="font-mono text-sm"
                    />

                    <div className="mt-4 flex justify-between items-center">
                        <p className="text-xs text-gray-500">
                            💡 Accepts numbered lists, CSV format, or plain text (one company per line)
                        </p>
                        <Button onClick={handleParseText} variant="primary">
                            <ArrowRight size={16} className="mr-2" />
                            Parse List
                        </Button>
                    </div>
                </Card>
            )}

            {/* STEP 2: Configure & Enrich */}
            {parsedCompanies.length > 0 && enrichmentResults.length === 0 && (
                <>
                    {/* Configuration */}
                    <Card className="p-6">
                        <h3 className="text-lg font-black text-gray-800 mb-4 uppercase">Configuration</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-black uppercase text-gray-500 mb-2 block">
                                    Default City
                                </label>
                                <Input 
                                    value={defaultCity}
                                    onChange={(e) => setDefaultCity(e.target.value)}
                                    placeholder="Kuala Lumpur"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-black uppercase text-gray-500 mb-2 block">
                                    Default Region
                                </label>
                                <select
                                    value={defaultRegion}
                                    onChange={(e) => setDefaultRegion(e.target.value)}
                                    className="w-full p-3 border-2 border-gray-200 rounded-xl font-bold"
                                >
                                    <option value="MALAYSIA">🇲🇾 Malaysia</option>
                                    <option value="THAILAND">🇹🇭 Thailand</option>
                                    <option value="VIETNAM">🇻🇳 Vietnam</option>
                                    <option value="UK">🇬🇧 United Kingdom</option>
                                </select>
                            </div>
                        </div>
                    </Card>

                    {/* Company Selection */}
                    <Card className="p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-black text-gray-800 uppercase">
                                Select Companies ({stats.selected} selected)
                            </h3>
                            <div className="flex gap-2">
                                <Button size="sm" variant="secondary" onClick={selectAll}>
                                    Select All
                                </Button>
                                <Button size="sm" variant="secondary" onClick={clearSelection}>
                                    Clear
                                </Button>
                                <Button size="sm" variant="secondary" onClick={() => {
                                    setParsedCompanies([]);
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
                                            Enriching...
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

                        {processing && currentCompany && (
                            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm font-bold text-blue-700 flex items-center gap-2">
                                    <Loader className="animate-spin" size={16} />
                                    Searching: {currentCompany}
                                </p>
                                <p className="text-xs text-blue-600 mt-1">
                                    {enrichmentResults.length} of {stats.selected} processed
                                </p>
                            </div>
                        )}

                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {parsedCompanies.map(company => (
                                <div 
                                    key={company.id}
                                    className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                                        selectedCompanies.has(company.id)
                                            ? 'bg-orange-50 border-orange-300'
                                            : 'bg-white border-gray-200 hover:border-gray-300'
                                    }`}
                                    onClick={() => toggleSelection(company.id)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <h4 className="font-black text-gray-900">{company.name}</h4>
                                            <p className="text-xs text-gray-400 mt-1">
                                                Will search: "{company.name} {defaultCity} {defaultRegion}"
                                            </p>
                                        </div>
                                        <input 
                                            type="checkbox"
                                            checked={selectedCompanies.has(company.id)}
                                            onChange={() => toggleSelection(company.id)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </>
            )}

            {/* STEP 3: Results */}
            {enrichmentResults.length > 0 && (
                <Card className="p-6">
                    <h3 className="text-lg font-black text-gray-800 mb-4 uppercase">
                        Enrichment Results ({stats.found} of {stats.enriched} found)
                    </h3>

                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                        {enrichmentResults.map((result, idx) => (
                            <Card 
                                key={idx}
                                className={`p-4 ${
                                    result.status === 'FOUND' && result.confidence >= 70
                                        ? 'border-2 border-green-200 bg-green-50'
                                        : result.status === 'FOUND' && result.confidence >= 60
                                        ? 'border-2 border-yellow-200 bg-yellow-50'
                                        : result.status === 'FOUND'
                                        ? 'border-2 border-orange-200 bg-orange-50'
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
                                                            : result.confidence >= 60
                                                            ? 'bg-yellow-600 text-white'
                                                            : 'bg-orange-600 text-white'
                                                    }`}>
                                                        {result.confidence}% Match
                                                    </span>
                                                    {result.enrichedData.foundName !== result.companyName && (
                                                        <span className="text-xs text-gray-500 italic">
                                                            Found as: {result.enrichedData.foundName}
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </div>

                                        {result.status === 'FOUND' && result.enrichedData && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm mt-3">
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

                                                {result.enrichedData.rating && (
                                                    <p className="flex items-center gap-2">
                                                        <Star size={14} className="text-yellow-600" fill="currentColor" />
                                                        <span className="font-bold text-gray-700">
                                                            {result.enrichedData.rating} ({result.enrichedData.reviewCount} reviews)
                                                        </span>
                                                    </p>
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

export default ESCOImportEnrichmentTool;
