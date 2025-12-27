import React, { useState, useMemo, useCallback } from 'react';
import { 
    Globe, Search, MapPin, Phone, Building, CheckCircle, 
    Plus, Loader, Briefcase, ExternalLink, Trash2, Mail, 
    AlertCircle, Award, Star, Users, Zap, Factory
} from 'lucide-react';
import { Card, Button, Input } from '../data/constants.jsx';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ExportButton } from '../utils/ExcelExport.jsx'; 
import EmailTemplateModal from '../components/EmailTemplateModal'; 

// ============================================================================
// STATIC DATA - UK SEARCH TYPES & TARGET CITIES
// ============================================================================

const UK_SEARCH_TYPES = [
    { 
        label: "MCS Heat Pump Installers", 
        query: "MCS certified heat pump installer",
        icon: "🔥",
        description: "MCS-certified installers for domestic heat pumps"
    },
    { 
        label: "Solar PV + Battery Firms", 
        query: "Solar PV installer battery storage",
        icon: "☀️",
        description: "Solar panel and battery storage installers"
    },
    { 
        label: "Renewable Energy Contractors", 
        query: "Renewable energy contractor",
        icon: "♻️",
        description: "General renewable energy installation companies"
    },
    { 
        label: "Gas Boiler Replacement", 
        query: "Boiler replacement heating engineer",
        icon: "🔧",
        description: "Heating engineers specializing in boiler upgrades"
    },
    { 
        label: "Commercial HVAC Installers", 
        query: "Commercial HVAC installation",
        icon: "🏢",
        description: "Commercial heating and cooling specialists"
    },
    { 
        label: "Air Source Heat Pump Specialists", 
        query: "Air source heat pump installer",
        icon: "💨",
        description: "ASHP-specific installation companies"
    },
    { 
        label: "Ground Source Heat Pump Specialists", 
        query: "Ground source heat pump installer",
        icon: "🌍",
        description: "GSHP and geothermal system installers"
    }
];

const UK_MAJOR_CITIES = [
    // Scotland
    { name: 'Edinburgh', region: 'Scotland', priority: 'High' },
    { name: 'Glasgow', region: 'Scotland', priority: 'High' },
    { name: 'Aberdeen', region: 'Scotland', priority: 'Medium' },
    { name: 'Dundee', region: 'Scotland', priority: 'Medium' },
    
    // England - Major Cities
    { name: 'London', region: 'England', priority: 'High' },
    { name: 'Manchester', region: 'England', priority: 'High' },
    { name: 'Birmingham', region: 'England', priority: 'High' },
    { name: 'Leeds', region: 'England', priority: 'High' },
    { name: 'Liverpool', region: 'England', priority: 'Medium' },
    { name: 'Newcastle', region: 'England', priority: 'Medium' },
    { name: 'Sheffield', region: 'England', priority: 'Medium' },
    { name: 'Bristol', region: 'England', priority: 'Medium' },
    { name: 'Nottingham', region: 'England', priority: 'Medium' },
    
    // Wales
    { name: 'Cardiff', region: 'Wales', priority: 'Medium' },
    { name: 'Swansea', region: 'Wales', priority: 'Low' },
    
    // Northern Ireland
    { name: 'Belfast', region: 'Northern Ireland', priority: 'Medium' }
];

const VIP_MCS_INSTALLERS = {
    'Scotland': [
        {
            name: "Renewable Energy Services (Scotland) Ltd",
            city: "Edinburgh",
            type: "MCS Heat Pump Specialist",
            phone: "0131 555 0100",
            website: "res-scotland.co.uk",
            notes: "Leading MCS installer in Scotland, 500+ installations"
        },
        {
            name: "Greenmatch Scotland",
            city: "Glasgow",
            type: "Solar & Heat Pump",
            phone: "0141 404 0200",
            website: "greenmatch.co.uk",
            notes: "Large network, handles grants and BUS applications"
        }
    ],
    'England': [
        {
            name: "Viessmann Approved Installer Network",
            city: "London",
            type: "Premium Heat Pump",
            phone: "0800 083 4000",
            website: "viessmann.co.uk",
            notes: "Official Viessmann network, high-end installations"
        },
        {
            name: "Octopus Energy Heat Pump Team",
            city: "Manchester",
            type: "Volume Installer",
            phone: "0330 175 9669",
            website: "octopus.energy/heat-pumps",
            notes: "Major volume player, tied to energy supply"
        }
    ]
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UKExportPage = ({ user }) => {
    // Search Configuration State
    const [targetCity, setTargetCity] = useState('Edinburgh');
    const [targetRegion, setTargetRegion] = useState('Scotland');
    const [selectedType, setSelectedType] = useState(UK_SEARCH_TYPES[0].query);
    const [radiusMiles, setRadiusMiles] = useState(20);
    
    // Search Results State
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
        addedCount: 0,
        averageRating: 0
    });

    // ========================================================================
    // EVENT HANDLERS
    // ========================================================================

    const handleUKSearch = async () => {
        if (!targetCity.trim()) {
            setError("Please enter a city name");
            return;
        }

        setLoading(true);
        setError(null);
        setSearchResults([]);
        setDismissedIds(new Set());
        
        try {
            const radiusMeters = radiusMiles * 1609; // Convert miles to meters
            const searchQuery = `${selectedType} in ${targetCity}`;
            
            const response = await fetch('/.netlify/functions/places-search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    keyword: searchQuery,
                    radius: radiusMeters,
                    type: 'establishment'
                })
            });

            if (!response.ok) {
                throw new Error(`Search failed: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
                setSearchResults(data.results);
                
                // Calculate statistics
                const avgRating = data.results
                    .filter(r => r.rating)
                    .reduce((sum, r) => sum + r.rating, 0) / 
                    data.results.filter(r => r.rating).length;
                
                setSearchStats({
                    lastSearch: new Date().toISOString(),
                    totalResults: data.results.length,
                    addedCount: 0,
                    averageRating: avgRating || 0
                });
            } else {
                // Demo data for testing if API returns nothing
                const demoResults = [
                    { 
                        name: "EcoWarmth Scotland (MCS Certified)", 
                        formatted_address: "Leith, Edinburgh EH6", 
                        formatted_phone_number: "0131 555 0123", 
                        rating: 4.8, 
                        user_ratings_total: 45, 
                        place_id: 'demo_uk_1',
                        website: 'ecowarmth-scotland.co.uk',
                        business_status: 'OPERATIONAL'
                    },
                    { 
                        name: "Lothian Heat Pump Solutions", 
                        formatted_address: "Dalkeith EH22", 
                        formatted_phone_number: "0131 663 0999", 
                        rating: 4.5, 
                        user_ratings_total: 12, 
                        place_id: 'demo_uk_2',
                        business_status: 'OPERATIONAL'
                    }
                ];
                setSearchResults(demoResults);
                setError("API returned no results - showing demo data. Check API quota or try different search terms.");
            }
        } catch (err) {
            console.error("UK Search error:", err);
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

        const phone = company.formatted_phone_number || company.phone || "Check Website";
        const address = company.formatted_address || `${company.city}, UK`;
        
        try {
            await addDoc(collection(db, "users", user.uid, "companies"), {
                companyName: company.name,
                region: 'UK',
                city: targetCity,
                address: address,
                phone: phone,
                website: company.website || "",
                industry: 'MCS Installer',
                type: isVip ? 'VIP Partner Target' : 'Potential Partner',
                source: isVip ? 'Karnot UK VIP List' : `UK Trawler (${targetCity})`,
                status: 'New Lead',
                priority: isVip ? 'High' : 'Medium',
                currency: 'GBP',
                notes: isVip 
                    ? company.notes 
                    : `Found searching for '${selectedType}' in ${targetCity}. Rating: ${company.rating || 'N/A'}. Check MCS Certification on official registry.`,
                rating: company.rating || null,
                reviewCount: company.user_ratings_total || null,
                isExportTarget: true,
                vipTarget: isVip,
                ukRegion: targetRegion,
                installerType: selectedType,
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

    const handleCitySelect = useCallback((city, region) => {
        setTargetCity(city);
        setTargetRegion(region);
    }, []);

    // ========================================================================
    // COMPUTED VALUES
    // ========================================================================

    const exportData = useMemo(() => {
        const vips = (VIP_MCS_INSTALLERS[targetRegion] || []).map(v => ({
            name: v.name,
            type: v.type,
            city: v.city,
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
                city: targetCity,
                phone: r.formatted_phone_number || '',
                address: r.formatted_address || '',
                rating: r.rating || '',
                reviews: r.user_ratings_total || '',
                website: r.website || '',
                source: 'Google Maps'
            }));
        
        return [...vips, ...results];
    }, [targetRegion, searchResults, dismissedIds, targetCity]);

    const visibleResults = useMemo(() => {
        return searchResults.filter(r => !dismissedIds.has(r.place_id));
    }, [searchResults, dismissedIds]);

    const selectedSearchType = UK_SEARCH_TYPES.find(t => t.query === selectedType);

    const citiesByRegion = useMemo(() => {
        return UK_MAJOR_CITIES.reduce((acc, city) => {
            if (!acc[city.region]) acc[city.region] = [];
            acc[city.region].push(city);
            return acc;
        }, {});
    }, []);

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
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Globe size={180} />
                </div>
                <div className="absolute bottom-0 left-0 p-4 opacity-5">
                    <Factory size={120} />
                </div>
                
                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <span className="text-5xl">🇬🇧</span>
                                <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight">
                                    Karnot UK Operations
                                </h1>
                            </div>
                            <p className="text-blue-200 font-bold text-sm md:text-base">
                                MCS Partner Recruitment • Heat Pump Installer Network • Scotland & UK Wide
                            </p>
                            {searchStats.lastSearch && (
                                <div className="flex items-center gap-4 text-xs text-blue-300 font-bold mt-2">
                                    <span className="flex items-center gap-1">
                                        <Search size={12} /> 
                                        {searchStats.totalResults} installers
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <CheckCircle size={12} /> 
                                        {searchStats.addedCount} added
                                    </span>
                                    {searchStats.averageRating > 0 && (
                                        <span className="flex items-center gap-1">
                                            <Star size={12} /> 
                                            {searchStats.averageRating.toFixed(1)} avg rating
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                        
                        <div className="flex gap-3">
                            <ExportButton 
                                data={exportData} 
                                filename={`Karnot_UK_MCS_${targetCity}_${new Date().toISOString().split('T')[0]}.csv`}
                                columns={[
                                    { key: 'name', label: 'Installer Name' },
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

            {/* Error Alert */}
            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-start gap-3">
                    <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                    <div className="flex-1">
                        <h4 className="font-bold text-red-800 text-sm">Search Error</h4>
                        <p className="text-red-700 text-sm">{error}</p>
                    </div>
                    <button 
                        onClick={() => setError(null)} 
                        className="text-red-500 hover:text-red-700"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Search Panel */}
                <Card className="p-6 h-fit space-y-5 border-t-4 border-blue-600 lg:col-span-1">
                    <div className="flex items-center gap-2 text-blue-900 pb-3 border-b-2 border-blue-100">
                        <Search size={24} /> 
                        <h2 className="text-xl font-black uppercase">MCS Trawler</h2>
                    </div>
                    
                    {/* City Selection by Region */}
                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-500 mb-2 block">
                            Select Target City
                        </label>
                        
                        {Object.entries(citiesByRegion).map(([region, cities]) => (
                            <div key={region} className="mb-3">
                                <p className="text-xs font-black text-gray-400 mb-1.5">{region}</p>
                                <div className="flex flex-wrap gap-1">
                                    {cities.map(city => (
                                        <button
                                            key={city.name}
                                            onClick={() => handleCitySelect(city.name, region)}
                                            className={`px-2 py-1 text-xs font-bold rounded transition-all ${
                                                targetCity === city.name 
                                                    ? 'bg-blue-600 text-white shadow-md' 
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            } ${
                                                city.priority === 'High' ? 'border-2 border-blue-300' : ''
                                            }`}
                                        >
                                            {city.name}
                                            {city.priority === 'High' && <span className="ml-1 text-yellow-400">⭐</span>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                        
                        <Input 
                            value={targetCity} 
                            onChange={(e) => setTargetCity(e.target.value)} 
                            className="font-bold text-gray-800 mt-2"
                            placeholder="Or type custom city..."
                        />
                    </div>

                    {/* Installer Type */}
                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-500 mb-2 block">
                            Installer Type
                        </label>
                        <select 
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                            className="w-full p-3 bg-gray-50 border-2 border-gray-200 rounded-xl font-bold text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        >
                            {UK_SEARCH_TYPES.map((t, idx) => (
                                <option key={idx} value={t.query}>
                                    {t.icon} {t.label}
                                </option>
                            ))}
                        </select>
                        {selectedSearchType && (
                            <p className="text-xs text-gray-500 mt-1 italic">
                                {selectedSearchType.description}
                            </p>
                        )}
                    </div>

                    {/* Search Radius */}
                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-500 mb-2 block">
                            Search Radius: {radiusMiles} Miles
                        </label>
                        <input 
                            type="range" 
                            min="5" 
                            max="50" 
                            step="5" 
                            value={radiusMiles} 
                            onChange={(e) => setRadiusMiles(Number(e.target.value))} 
                            className="w-full h-2 bg-blue-100 rounded-lg accent-blue-600 cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-gray-400 font-bold mt-1">
                            <span>5 mi</span>
                            <span>25 mi</span>
                            <span>50 mi</span>
                        </div>
                    </div>

                    {/* Search Info */}
                    <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-900 font-bold space-y-1">
                        <p className="flex items-center gap-2">
                            <MapPin size={14} />
                            Searching: <span className="text-blue-700">{targetCity}, {targetRegion}</span>
                        </p>
                        <p className="flex items-center gap-2">
                            <Award size={14} />
                            Type: <span className="text-blue-700">{selectedSearchType?.label}</span>
                        </p>
                        <p className="flex items-center gap-2">
                            <Zap size={14} />
                            Radius: <span className="text-blue-700">{radiusMiles} miles</span>
                        </p>
                    </div>

                    {/* Search Button */}
                    <Button 
                        onClick={handleUKSearch} 
                        disabled={loading || !targetCity.trim()} 
                        className="w-full py-4 text-sm font-black uppercase bg-blue-700 hover:bg-blue-800"
                    >
                        {loading ? (
                            <>
                                <Loader className="animate-spin mr-2" size={16} />
                                Searching...
                            </>
                        ) : (
                            <>
                                <Search className="mr-2" size={16} />
                                Find MCS Partners
                            </>
                        )}
                    </Button>
                </Card>

                {/* Results Panel */}
                <div className="lg:col-span-2 space-y-6">
                    {/* VIP Installers Section */}
                    {VIP_MCS_INSTALLERS[targetRegion] && VIP_MCS_INSTALLERS[targetRegion].length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-2 text-purple-700">
                                    <Award size={18} /> 
                                    <h3 className="text-sm font-black uppercase">VIP MCS Installers - {targetRegion}</h3>
                                </div>
                                <span className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-bold">
                                    {VIP_MCS_INSTALLERS[targetRegion].length} Verified
                                </span>
                            </div>
                            
                            {VIP_MCS_INSTALLERS[targetRegion].map((vip, idx) => {
                                const isAdded = addedLeads.has(vip.name);
                                
                                return (
                                    <Card 
                                        key={idx} 
                                        className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 hover:shadow-lg transition-all"
                                    >
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-start gap-2">
                                                    <div className="bg-purple-600 text-white px-2 py-1 rounded text-xs font-black">
                                                        VIP
                                                    </div>
                                                    <div>
                                                        <h4 className="font-black text-gray-900 text-lg">{vip.name}</h4>
                                                        <p className="text-xs font-bold text-gray-600 flex items-center gap-2 mt-1">
                                                            <Building size={12} />
                                                            {vip.type} • {vip.city}
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
                                                    <p className="text-xs text-gray-700 bg-white/60 p-2 rounded ml-14">
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
                                                            : "bg-purple-600 hover:bg-purple-700 text-white"
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
                    )}

                    {/* Search Results Section */}
                    {searchResults.length > 0 && (
                        <div className="space-y-3 pt-6 border-t-2 border-dashed border-gray-300">
                            <div className="flex justify-between items-center px-2">
                                <div className="flex items-center gap-2 text-blue-700">
                                    <Users size={18} /> 
                                    <h3 className="text-sm font-black uppercase">
                                        Found Installers: {targetCity}
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
                            
                            <div className="space-y-3">
                                {visibleResults.map((result, idx) => {
                                    const isAdded = addedLeads.has(result.name || result.place_id);
                                    const likelyMCS = result.name.toLowerCase().includes('mcs') || 
                                                     result.name.toLowerCase().includes('renewable') ||
                                                     result.name.toLowerCase().includes('heat pump');
                                    
                                    return (
                                        <Card 
                                            key={result.place_id || idx} 
                                            className="p-4 hover:shadow-lg transition-all border-l-4 border-l-blue-500"
                                        >
                                            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                                                <div className="flex-1 space-y-2">
                                                    <div className="flex items-start gap-2">
                                                        <h4 className="font-black text-gray-900 text-base flex-1">
                                                            {result.name}
                                                        </h4>
                                                        {likelyMCS && (
                                                            <span className="bg-green-100 text-green-700 text-[10px] font-black px-2 py-0.5 rounded whitespace-nowrap">
                                                                LIKELY MCS
                                                            </span>
                                                        )}
                                                    </div>
                                                    
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
                                                        
                                                        {result.website && (
                                                            <a 
                                                                href={result.website}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-1 text-purple-600 font-bold hover:underline"
                                                            >
                                                                <Globe size={12} />
                                                                Website
                                                            </a>
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
                                                            `https://www.google.com/search?q=${encodeURIComponent(result.name + ' ' + targetCity + ' MCS')}`,
                                                            '_blank'
                                                        )}
                                                        title="Search company + MCS"
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
                        <div className="text-center py-16 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-dashed border-blue-300">
                            <Briefcase className="mx-auto text-blue-300 mb-4" size={48} />
                            <h3 className="font-black text-blue-600 text-lg mb-2">Ready to Find MCS Partners</h3>
                            <p className="text-blue-500 font-bold text-sm max-w-md mx-auto mb-4">
                                Select your target city and installer type, then click "Find MCS Partners" to start recruiting in {targetRegion}.
                            </p>
                            <div className="inline-block bg-white px-4 py-2 rounded-lg border-2 border-blue-200 text-xs">
                                <p className="font-black text-gray-700 mb-1">💡 Pro Tip:</p>
                                <p className="text-gray-600">
                                    High priority cities (⭐) have the most heat pump potential
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UKExportPage;
