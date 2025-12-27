import React, { useState, useMemo, useCallback } from 'react';
import { 
    Globe, Search, MapPin, Phone, Building, ArrowRight, CheckCircle, 
    Plus, Loader, Briefcase, Factory, Trash2, Mail, AlertCircle,
    Download, ExternalLink, Star, Users
} from 'lucide-react';
import { Card, Button, Input } from '../data/constants.jsx';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ExportButton } from '../utils/ExcelExport.jsx';
import EmailTemplateModal from '../components/EmailTemplateModal';

// ============================================================================
// STATIC DATA - VIP TARGETS & SEARCH CONFIGURATIONS
// ============================================================================

const VIP_TARGETS = {
    'MALAYSIA': [
        { 
            name: "Engie Services Malaysia", 
            base: "Cyberjaya", 
            type: "MNC ESCO", 
            phone: "+60 3-2282 3000",
            website: "engie.com.my",
            notes: "Global leader in energy services, active in Malaysia since 1990s"
        },
        { 
            name: "TNB Energy Services (TNBES)", 
            base: "Kuala Lumpur", 
            type: "Utility ESCO", 
            phone: "+60 3-7967 9000",
            website: "tnbes.com.my",
            notes: "TNB subsidiary, largest utility ESCO in Malaysia"
        },
        { 
            name: "Cofreth (M) Sdn Bhd", 
            base: "Penang", 
            type: "M&E Contractor", 
            phone: "+60 4-332 5566",
            website: "cofreth.com",
            notes: "Established M&E contractor, strong in industrial sector"
        },
        { 
            name: "YTL Power Services", 
            base: "Kuala Lumpur", 
            type: "Utility ESCO", 
            phone: "+60 3-2117 5000",
            website: "ytlpowerseraya.com",
            notes: "Part of YTL Group, comprehensive energy solutions"
        },
        { 
            name: "Eco World Engineering", 
            base: "Shah Alam", 
            type: "Green Building", 
            phone: "+60 3-5569 8800",
            notes: "Focus on sustainable building systems"
        }
    ],
    'THAILAND': [
        { 
            name: "Econowatt Co., Ltd.", 
            base: "Bangkok", 
            type: "ESCO", 
            phone: "+66 2 731 1999",
            website: "econowatt.co.th",
            notes: "Leading Thai ESCO, projects across industrial sector"
        },
        { 
            name: "Azbil Thailand Co., Ltd.", 
            base: "Bangkok", 
            type: "Automation & ESCO", 
            phone: "+66 2 297 2800",
            website: "azbil.com",
            notes: "Japanese MNC, strong in factory automation and energy management"
        },
        { 
            name: "EGAT Energy Efficiency", 
            base: "Bangkok", 
            type: "Utility ESCO", 
            phone: "+66 2 436 1000",
            notes: "State utility subsidiary, government connections"
        },
        { 
            name: "Thai Energy Conservation Co.", 
            base: "Bangkok", 
            type: "ESCO", 
            phone: "+66 2 653 3939",
            notes: "Veteran ESCO company, industrial focus"
        }
    ],
    'VIETNAM': [
        { 
            name: "Vina Energy Joint Stock Company", 
            base: "Ho Chi Minh City", 
            type: "Renewables & ESCO", 
            phone: "+84 28 3512 0000",
            website: "vinaenergy.vn",
            notes: "Renewable energy developer expanding into energy efficiency"
        },
        { 
            name: "Lilama Corporation", 
            base: "Hanoi", 
            type: "M&E Contractor", 
            phone: "+84 24 3825 3535",
            website: "lilama.com.vn",
            notes: "State-owned, major industrial contractor"
        },
        { 
            name: "PetroVietnam Technical Services", 
            base: "Ho Chi Minh City", 
            type: "Industrial Services", 
            phone: "+84 28 3910 5000",
            notes: "Part of state oil & gas group, strong industrial presence"
        }
    ]
};

const INDUSTRY_KEYWORDS = [
    { label: "HVAC & Chiller Services", query: "Industrial HVAC Service" },
    { label: "M&E Contractors", query: "Mechanical Engineering Contractor" },
    { label: "Energy Management", query: "Energy Management Consultant" },
    { label: "Cold Storage & Refrigeration", query: "Cold Storage Construction" },
    { label: "Factory Automation", query: "Factory Automation Company" },
    { label: "Building Management Systems", query: "Building Automation System" },
    { label: "District Cooling", query: "District Cooling System" }
];

const CITY_PRESETS = {
    'MALAYSIA': ['Penang', 'Kuala Lumpur', 'Johor Bahru', 'Shah Alam', 'Ipoh', 'Melaka'],
    'THAILAND': ['Bangkok', 'Chonburi', 'Rayong', 'Chiang Mai', 'Phuket'],
    'VIETNAM': ['Ho Chi Minh City', 'Hanoi', 'Da Nang', 'Binh Duong', 'Dong Nai']
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ASEANExportPage = ({ user }) => {
    // Country & Location State
    const [activeCountry, setActiveCountry] = useState('MALAYSIA');
    const [city, setCity] = useState('Penang');
    
    // Search State
    const [selectedKeyword, setSelectedKeyword] = useState(INDUSTRY_KEYWORDS[0].query);
    const [customKeyword, setCustomKeyword] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // UI State
    const [addedLeads, setAddedLeads] = useState(new Set());
    const [dismissedIds, setDismissedIds] = useState(new Set());
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailTarget, setEmailTarget] = useState(null);
    
    // Search Statistics
    const [searchStats, setSearchStats] = useState({
        lastSearch: null,
        totalResults: 0,
        addedCount: 0
    });

    // ========================================================================
    // EVENT HANDLERS
    // ========================================================================

    const handleCountrySwitch = useCallback((country) => {
        setActiveCountry(country);
        setSearchResults([]);
        setDismissedIds(new Set());
        setError(null);
        
        // Auto-select first city for new country
        const defaultCity = CITY_PRESETS[country][0];
        setCity(defaultCity);
    }, []);

    const handleSearch = async () => {
        if (!city.trim()) {
            setError("Please enter a city name");
            return;
        }

        setLoading(true);
        setError(null);
        setSearchResults([]);
        setDismissedIds(new Set());
        
        const searchKeyword = selectedKeyword === 'CUSTOM' ? customKeyword : selectedKeyword;
        
        try {
            const response = await fetch('/.netlify/functions/places-search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    keyword: `${searchKeyword} in ${city}`,
                    radius: 25000, // 25km radius
                    type: 'establishment'
                })
            });

            if (!response.ok) {
                throw new Error(`Search failed: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
                setSearchResults(data.results);
                setSearchStats({
                    lastSearch: new Date().toISOString(),
                    totalResults: data.results.length,
                    addedCount: 0
                });
            } else {
                // Provide helpful demo data if API returns no results
                const demoResults = [
                    { 
                        name: `${city} Industrial Cooling Systems`, 
                        formatted_address: `${city} Industrial Zone, ${activeCountry}`, 
                        formatted_phone_number: "+60 12-345 6789", 
                        place_id: "demo_1",
                        rating: 4.2,
                        user_ratings_total: 15
                    },
                    { 
                        name: `${activeCountry} M&E Engineering`, 
                        formatted_address: `${city} Free Trade Zone`, 
                        formatted_phone_number: "+60 12-987 6543", 
                        place_id: "demo_2",
                        rating: 4.5,
                        user_ratings_total: 28
                    }
                ];
                setSearchResults(demoResults);
                setError("API returned no results - showing demo data. Check API quota or search terms.");
            }
        } catch (err) {
            console.error("Search error:", err);
            setError(`Search failed: ${err.message}. Check API configuration.`);
            setSearchResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAddLead = async (company, isVip = false) => {
        if (!user) {
            setError("Please log in to add leads");
            return;
        }

        const phone = company.formatted_phone_number || company.phone || "Lookup Required";
        const address = company.formatted_address || company.base || `${city}, ${activeCountry}`;
        const companyType = isVip ? company.type : 'B2B Prospect';
        
        try {
            await addDoc(collection(db, "users", user.uid, "companies"), {
                companyName: company.name,
                region: activeCountry,
                city: company.base || city,
                address: address,
                phone: phone,
                website: company.website || "",
                industry: isVip ? company.type : selectedKeyword,
                type: companyType,
                source: isVip ? 'Karnot VIP Target List' : `Google Places (${city})`,
                status: 'New Lead',
                priority: isVip ? 'High' : 'Medium',
                currency: activeCountry === 'MALAYSIA' ? 'MYR' : 
                         activeCountry === 'THAILAND' ? 'THB' : 'VND',
                notes: company.notes || `Found via ${isVip ? 'VIP list' : 'Google Maps search'}. Rating: ${company.rating || 'N/A'}`,
                rating: company.rating || null,
                reviewCount: company.user_ratings_total || null,
                isExportTarget: true,
                vipTarget: isVip,
                createdAt: serverTimestamp()
            });

            const leadId = company.name || company.place_id;
            setAddedLeads(prev => new Set(prev).add(leadId));
            
            // Update stats
            setSearchStats(prev => ({
                ...prev,
                addedCount: prev.addedCount + 1
            }));

        } catch (err) {
            console.error("Failed to add lead:", err);
            setError(`Failed to add ${company.name}: ${err.message}`);
        }
    };

    const handleDismiss = useCallback((id) => {
        setDismissedIds(prev => new Set(prev).add(id));
    }, []);

    const handleEmail = useCallback((company) => {
        setEmailTarget(company);
        setShowEmailModal(true);
    }, []);

    // ========================================================================
    // COMPUTED VALUES
    // ========================================================================

    const exportData = useMemo(() => {
        const vips = VIP_TARGETS[activeCountry].map(v => ({
            name: v.name,
            type: v.type,
            city: v.base,
            phone: v.phone,
            website: v.website || '',
            notes: v.notes || '',
            source: 'VIP List'
        }));
        
        const results = searchResults
            .filter(r => !dismissedIds.has(r.place_id))
            .map(r => ({
                name: r.name,
                type: 'Search Result',
                city: city,
                phone: r.formatted_phone_number || '',
                address: r.formatted_address || '',
                rating: r.rating || '',
                reviews: r.user_ratings_total || '',
                source: 'Google Maps'
            }));
        
        return [...vips, ...results];
    }, [activeCountry, searchResults, dismissedIds, city]);

    const visibleResults = useMemo(() => {
        return searchResults.filter(r => !dismissedIds.has(r.place_id));
    }, [searchResults, dismissedIds]);

    const activeKeyword = selectedKeyword === 'CUSTOM' ? customKeyword : 
                         INDUSTRY_KEYWORDS.find(k => k.query === selectedKeyword)?.label || selectedKeyword;

    // ========================================================================
    // RENDER
    // ========================================================================

    return (
        <div className="w-full space-y-6 pb-8">
            {/* Email Modal */}
            {showEmailModal && emailTarget && (
                <EmailTemplateModal 
                    opportunity={emailTarget} 
                    onClose={() => setShowEmailModal(false)} 
                />
            )}

            {/* Header Card */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 opacity-5">
                    <Globe size={200} />
                </div>
                <div className="absolute bottom-0 left-0 opacity-5">
                    <Factory size={150} />
                </div>
                
                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <Factory className="text-yellow-400" size={32} />
                                <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight">
                                    ASEAN Export Hub
                                </h1>
                            </div>
                            <p className="text-slate-300 font-bold text-sm md:text-base">
                                B2B Lead Generation • ESCO & Industrial Partners • Malaysia, Thailand, Vietnam
                            </p>
                            {searchStats.lastSearch && (
                                <div className="flex items-center gap-4 text-xs text-slate-400 font-bold mt-2">
                                    <span className="flex items-center gap-1">
                                        <Search size={12} /> 
                                        {searchStats.totalResults} results
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <CheckCircle size={12} /> 
                                        {searchStats.addedCount} added
                                    </span>
                                </div>
                            )}
                        </div>
                        
                        <div className="flex gap-3">
                            <ExportButton 
                                data={exportData} 
                                filename={`Karnot_ASEAN_${activeCountry}_${city}_${new Date().toISOString().split('T')[0]}.csv`}
                                columns={[
                                    { key: 'name', label: 'Company Name' },
                                    { key: 'type', label: 'Type' },
                                    { key: 'city', label: 'City' },
                                    { key: 'phone', label: 'Phone' },
                                    { key: 'website', label: 'Website' },
                                    { key: 'rating', label: 'Rating' },
                                    { key: 'source', label: 'Source' }
                                ]}
                                label="Export CSV"
                                className="bg-green-600 hover:bg-green-700"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Country Tabs */}
            <div className="flex gap-2 border-b-2 border-gray-200 pb-1 overflow-x-auto">
                {['MALAYSIA', 'THAILAND', 'VIETNAM'].map(country => {
                    const flag = country === 'MALAYSIA' ? '🇲🇾' : country === 'THAILAND' ? '🇹🇭' : '🇻🇳';
                    const vipCount = VIP_TARGETS[country].length;
                    
                    return (
                        <button
                            key={country}
                            onClick={() => handleCountrySwitch(country)}
                            className={`px-6 py-3 rounded-t-2xl font-black uppercase text-sm transition-all flex items-center gap-2 whitespace-nowrap ${
                                activeCountry === country 
                                    ? 'bg-blue-600 text-white shadow-lg -mb-0.5' 
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                            }`}
                        >
                            <span className="text-xl">{flag}</span>
                            <span>{country}</span>
                            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                                {vipCount} VIPs
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Error Alert */}
            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-start gap-3">
                    <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                    <div>
                        <h4 className="font-bold text-red-800 text-sm">Search Error</h4>
                        <p className="text-red-700 text-sm">{error}</p>
                    </div>
                    <button 
                        onClick={() => setError(null)} 
                        className="ml-auto text-red-500 hover:text-red-700"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Search Panel */}
                <Card className="p-6 h-fit space-y-5 border-2 border-blue-100 lg:col-span-1">
                    <div className="flex items-center gap-2 text-blue-800 pb-3 border-b-2 border-blue-100">
                        <Search size={24} /> 
                        <h2 className="text-xl font-black uppercase">Lead Finder</h2>
                    </div>
                    
                    {/* City Selection */}
                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-500 mb-2 block">
                            Target City
                        </label>
                        <div className="space-y-2">
                            <Input 
                                value={city} 
                                onChange={(e) => setCity(e.target.value)} 
                                className="font-bold text-gray-800"
                                placeholder="Enter city name"
                            />
                            <div className="flex flex-wrap gap-1">
                                {CITY_PRESETS[activeCountry].map(preset => (
                                    <button
                                        key={preset}
                                        onClick={() => setCity(preset)}
                                        className={`px-2 py-1 text-xs font-bold rounded ${
                                            city === preset 
                                                ? 'bg-blue-600 text-white' 
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        {preset}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Industry Keyword */}
                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-500 mb-2 block">
                            Industry Sector
                        </label>
                        <select 
                            value={selectedKeyword}
                            onChange={(e) => setSelectedKeyword(e.target.value)}
                            className="w-full p-3 bg-gray-50 border-2 border-gray-200 rounded-xl font-bold text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        >
                            {INDUSTRY_KEYWORDS.map((k, idx) => (
                                <option key={idx} value={k.query}>{k.label}</option>
                            ))}
                            <option value="CUSTOM">✏️ Custom Keyword...</option>
                        </select>
                        
                        {selectedKeyword === 'CUSTOM' && (
                            <Input 
                                placeholder="Enter custom search term..." 
                                className="mt-2 font-bold" 
                                value={customKeyword}
                                onChange={(e) => setCustomKeyword(e.target.value)} 
                            />
                        )}
                    </div>

                    {/* Search Info */}
                    <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-800 font-bold">
                        <p className="flex items-center gap-2">
                            <MapPin size={14} />
                            Searching: <span className="text-blue-600">{city}, {activeCountry}</span>
                        </p>
                        <p className="flex items-center gap-2 mt-1">
                            <Briefcase size={14} />
                            Sector: <span className="text-blue-600">{activeKeyword}</span>
                        </p>
                    </div>

                    {/* Search Button */}
                    <Button 
                        onClick={handleSearch} 
                        disabled={loading || !city.trim()} 
                        className="w-full py-4 text-sm font-black uppercase"
                    >
                        {loading ? (
                            <>
                                <Loader className="animate-spin mr-2" size={16} />
                                Searching...
                            </>
                        ) : (
                            <>
                                <Search className="mr-2" size={16} />
                                Find Companies
                            </>
                        )}
                    </Button>
                </Card>

                {/* Results Panel */}
                <div className="lg:col-span-2 space-y-6">
                    {/* VIP Targets Section */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-2 text-yellow-700">
                                <Briefcase size={18} /> 
                                <h3 className="text-sm font-black uppercase">VIP Target Companies</h3>
                            </div>
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-bold">
                                {VIP_TARGETS[activeCountry].length} Verified
                            </span>
                        </div>
                        
                        {VIP_TARGETS[activeCountry].map((vip, idx) => {
                            const isAdded = addedLeads.has(vip.name);
                            
                            return (
                                <Card 
                                    key={idx} 
                                    className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 hover:shadow-lg transition-all"
                                >
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-start gap-2">
                                                <div className="bg-yellow-500 text-white px-2 py-1 rounded text-xs font-black">
                                                    VIP
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-gray-900 text-lg">{vip.name}</h4>
                                                    <p className="text-xs font-bold text-gray-600 flex items-center gap-2 mt-1">
                                                        <Building size={12} />
                                                        {vip.type} • {vip.base}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            {vip.phone && (
                                                <p className="text-xs text-blue-600 font-bold flex items-center gap-1 ml-14">
                                                    <Phone size={12} /> {vip.phone}
                                                </p>
                                            )}
                                            
                                            {vip.website && (
                                                <p className="text-xs text-gray-500 ml-14">{vip.website}</p>
                                            )}
                                            
                                            {vip.notes && (
                                                <p className="text-xs text-gray-600 bg-white/50 p-2 rounded ml-14">
                                                    {vip.notes}
                                                </p>
                                            )}
                                        </div>
                                        
                                        <div className="flex gap-2 items-center">
                                            <Button 
                                                size="sm" 
                                                variant="secondary" 
                                                onClick={() => handleEmail(vip)}
                                                title="Send intro email"
                                            >
                                                <Mail size={14} />
                                            </Button>
                                            
                                            {vip.website && (
                                                <Button 
                                                    size="sm" 
                                                    variant="secondary"
                                                    onClick={() => window.open(`https://${vip.website}`, '_blank')}
                                                    title="Visit website"
                                                >
                                                    <ExternalLink size={14} />
                                                </Button>
                                            )}
                                            
                                            <Button 
                                                size="sm" 
                                                onClick={() => handleAddLead(vip, true)}
                                                disabled={isAdded}
                                                className={`min-w-[100px] ${
                                                    isAdded 
                                                        ? "bg-green-600 hover:bg-green-700 text-white" 
                                                        : "bg-yellow-600 hover:bg-yellow-700 text-white"
                                                }`}
                                            >
                                                {isAdded ? (
                                                    <>
                                                        <CheckCircle size={14} className="mr-1" /> In CRM
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus size={14} className="mr-1" /> Add VIP
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>

                    {/* Search Results Section */}
                    {searchResults.length > 0 && (
                        <div className="space-y-3 pt-6 border-t-2 border-dashed border-gray-300">
                            <div className="flex justify-between items-center px-2">
                                <div className="flex items-center gap-2 text-blue-700">
                                    <MapPin size={18} /> 
                                    <h3 className="text-sm font-black uppercase">
                                        Search Results: {city}
                                    </h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-bold">
                                        {visibleResults.length} Companies
                                    </span>
                                    {dismissedIds.size > 0 && (
                                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-bold">
                                            {dismissedIds.size} hidden
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                {visibleResults.map((result, idx) => {
                                    const isAdded = addedLeads.has(result.name || result.place_id);
                                    
                                    return (
                                        <Card 
                                            key={result.place_id || idx} 
                                            className="p-4 hover:shadow-lg transition-all border-l-4 border-l-blue-400"
                                        >
                                            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                                                <div className="flex-1 space-y-2">
                                                    <h4 className="font-black text-gray-900 text-base">
                                                        {result.name}
                                                    </h4>
                                                    
                                                    <p className="text-xs text-gray-600 flex items-start gap-1">
                                                        <MapPin size={12} className="mt-0.5 flex-shrink-0" />
                                                        {result.formatted_address}
                                                    </p>
                                                    
                                                    <div className="flex flex-wrap items-center gap-3 text-xs">
                                                        {result.rating && (
                                                            <span className="flex items-center gap-1 text-yellow-600 font-bold">
                                                                <Star size={12} fill="currentColor" />
                                                                {result.rating}
                                                                {result.user_ratings_total && (
                                                                    <span className="text-gray-400">
                                                                        ({result.user_ratings_total})
                                                                    </span>
                                                                )}
                                                            </span>
                                                        )}
                                                        
                                                        {result.formatted_phone_number && (
                                                            <span className="flex items-center gap-1 text-blue-600 font-bold">
                                                                <Phone size={12} />
                                                                {result.formatted_phone_number}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <div className="flex gap-2 items-center flex-shrink-0">
                                                    <Button 
                                                        size="sm" 
                                                        variant="secondary" 
                                                        onClick={() => handleEmail({name: result.name})}
                                                        title="Send email"
                                                    >
                                                        <Mail size={14} />
                                                    </Button>
                                                    
                                                    <Button 
                                                        size="sm" 
                                                        variant="secondary"
                                                        onClick={() => window.open(
                                                            `https://www.google.com/search?q=${encodeURIComponent(result.name + ' ' + city)}`,
                                                            '_blank'
                                                        )}
                                                        title="Search company"
                                                    >
                                                        <ExternalLink size={14} />
                                                    </Button>
                                                    
                                                    <Button 
                                                        size="sm" 
                                                        variant="danger"
                                                        onClick={() => handleDismiss(result.place_id)}
                                                        title="Hide from list"
                                                    >
                                                        <Trash2 size={14} />
                                                    </Button>
                                                    
                                                    <Button 
                                                        size="sm"
                                                        onClick={() => handleAddLead(result)} 
                                                        disabled={isAdded}
                                                        className={`min-w-[100px] ${
                                                            isAdded 
                                                                ? "bg-green-600 hover:bg-green-700" 
                                                                : "bg-blue-600 hover:bg-blue-700"
                                                        }`}
                                                    >
                                                        {isAdded ? (
                                                            <>
                                                                <CheckCircle size={14} className="mr-1" /> Added
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Plus size={14} className="mr-1" /> Add
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && searchResults.length === 0 && (
                        <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl border-2 border-dashed border-gray-300">
                            <Search className="mx-auto text-gray-300 mb-4" size={48} />
                            <h3 className="font-black text-gray-500 text-lg mb-2">Ready to Find Leads</h3>
                            <p className="text-gray-400 font-bold text-sm max-w-md mx-auto">
                                Select your target city and industry sector, then click "Find Companies" to start prospecting in {activeCountry}.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ASEANExportPage;
