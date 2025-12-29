import React, { useState } from 'react';
import { Target, Search, MapPin, Building, Phone, Mail, Globe, AlertCircle, Loader, Trash2, Check, X } from 'lucide-react';
import { Card, Button, Input } from '../data/constants.jsx';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const TerritoryLeadGenerator = ({ territories = [], user }) => {
    const [selectedTerritory, setSelectedTerritory] = useState('');
    const [businessType, setBusinessType] = useState('');
    const [customKeyword, setCustomKeyword] = useState('');
    const [searchRadius, setSearchRadius] = useState(5);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedLeads, setSelectedLeads] = useState(new Set());
    const [addingToCompanies, setAddingToCompanies] = useState(new Set());

    const businessTypes = [
        // HVAC & Heating Contractors
        { value: 'heating_contractor', keyword: 'heating contractor HVAC', label: 'Heating Contractors', icon: '🔥', category: 'HVAC & Heating' },
        { value: 'hvac_contractor', keyword: 'HVAC contractor air conditioning', label: 'HVAC Contractors', icon: '❄️', category: 'HVAC & Heating' },
        { value: 'furnace_repair', keyword: 'furnace repair installation service', label: 'Furnace Repair & Installation', icon: '🔧', category: 'HVAC & Heating' },
        { value: 'boiler_installation', keyword: 'boiler installation repair service', label: 'Boiler Installation & Repair', icon: '⚙️', category: 'HVAC & Heating' },
        { value: 'heating_system', keyword: 'heating system specialist repair', label: 'Heating System Specialists', icon: '🌡️', category: 'HVAC & Heating' },
        { value: 'emergency_heating', keyword: '24/7 emergency heating service repair', label: '24/7 Emergency Heating Service', icon: '🚨', category: 'HVAC & Heating' },
        { value: 'heating_cooling', keyword: 'heating and cooling specialist HVAC', label: 'Heating & Cooling Specialists', icon: '♨️', category: 'HVAC & Heating' },
        
        // Hot Water & Boiler Suppliers
        { value: 'boiler_supplier', keyword: 'hot water boiler supplier commercial', label: 'Hot Water Boiler Suppliers', icon: '💧', category: 'Boiler & Hot Water' },
        { value: 'commercial_boiler', keyword: 'commercial boiler supplier industrial', label: 'Commercial Boiler Suppliers', icon: '🏭', category: 'Boiler & Hot Water' },
        { value: 'industrial_boiler', keyword: 'industrial boiler manufacturer supplier', label: 'Industrial Boiler Manufacturers', icon: '⚡', category: 'Boiler & Hot Water' },
        { value: 'electric_boiler', keyword: 'electric boiler supplier installation', label: 'Electric Boiler Suppliers', icon: '🔌', category: 'Boiler & Hot Water' },
        { value: 'boiler_parts', keyword: 'boiler parts equipment supplier', label: 'Boiler Parts & Equipment', icon: '🔩', category: 'Boiler & Hot Water' },
        { value: 'water_heater', keyword: 'water heater supplier commercial', label: 'Water Heater Suppliers', icon: '🚿', category: 'Boiler & Hot Water' },
        { value: 'gas_boiler', keyword: 'gas fired boiler water tube', label: 'Gas-Fired Boiler Suppliers', icon: '🔥', category: 'Boiler & Hot Water' },
        
        // Plumbing & Heating Merchants
        { value: 'heating_merchant', keyword: 'heating merchant wholesale supplier', label: 'Heating Merchants', icon: '🏪', category: 'Plumbing & Merchants' },
        { value: 'plumber_supplier', keyword: 'plumber supplier wholesale distributor', label: 'Plumber Suppliers', icon: '🔧', category: 'Plumbing & Merchants' },
        { value: 'plumbing_heating_wholesale', keyword: 'plumbing heating wholesale distributor', label: 'Plumbing & Heating Wholesalers', icon: '📦', category: 'Plumbing & Merchants' },
        { value: 'hvac_distributor', keyword: 'HVAC equipment distributor supplier', label: 'HVAC Equipment Distributors', icon: '🚚', category: 'Plumbing & Merchants' },
        { value: 'mechanical_contractor', keyword: 'mechanical contractor plumbing HVAC', label: 'Mechanical Contractors', icon: '⚙️', category: 'Plumbing & Merchants' },
        
        // Water Treatment
        { value: 'water_treatment', keyword: 'water treatment company industrial', label: 'Water Treatment Companies', icon: '💦', category: 'Water Treatment' },
        { value: 'water_purification', keyword: 'water purification system commercial', label: 'Water Purification Systems', icon: '🌊', category: 'Water Treatment' },
        { value: 'industrial_water', keyword: 'industrial water treatment plant', label: 'Industrial Water Treatment', icon: '🏭', category: 'Water Treatment' },
        { value: 'water_filtration', keyword: 'water filtration system supplier', label: 'Water Filtration Suppliers', icon: '💧', category: 'Water Treatment' },
        
        // Hospitality
        { value: 'hotel', keyword: 'hotel resort', label: 'Hotels & Resorts', icon: '🏨', category: 'Hospitality' },
        { value: 'restaurant', keyword: 'restaurant fine dining', label: 'Fine Dining Restaurants', icon: '🍽️', category: 'Hospitality' },
        { value: 'cafe', keyword: 'cafe coffee shop', label: 'Cafes & Coffee Shops', icon: '☕', category: 'Hospitality' },
        { value: 'fastfood', keyword: 'fast food restaurant chain', label: 'Fast Food Chains', icon: '🍔', category: 'Hospitality' },
        
        // Healthcare
        { value: 'hospital', keyword: 'hospital medical center', label: 'Hospitals & Medical Centers', icon: '🏥', category: 'Healthcare' },
        { value: 'clinic', keyword: 'clinic polyclinic medical', label: 'Clinics & Polyclinics', icon: '⚕️', category: 'Healthcare' },
        { value: 'pharmacy', keyword: 'pharmacy drugstore', label: 'Pharmacies', icon: '💊', category: 'Healthcare' },
        
        // Education
        { value: 'university', keyword: 'university college', label: 'Universities & Colleges', icon: '🎓', category: 'Education' },
        { value: 'school', keyword: 'school academy', label: 'Schools & Academies', icon: '🏫', category: 'Education' },
        
        // Retail & Commercial
        { value: 'mall', keyword: 'shopping mall shopping center', label: 'Shopping Malls', icon: '🛍️', category: 'Retail' },
        { value: 'supermarket', keyword: 'supermarket grocery hypermarket', label: 'Supermarkets & Hypermarkets', icon: '🛒', category: 'Retail' },
        { value: 'convenience', keyword: '7-eleven convenience store', label: 'Convenience Stores', icon: '🏪', category: 'Retail' },
        { value: 'department', keyword: 'department store', label: 'Department Stores', icon: '🏬', category: 'Retail' },
        
        // Fitness & Wellness
        { value: 'gym', keyword: 'gym fitness center', label: 'Gyms & Fitness Centers', icon: '💪', category: 'Fitness' },
        { value: 'spa', keyword: 'spa wellness massage', label: 'Spas & Wellness Centers', icon: '🧖', category: 'Fitness' },
        
        // Food & Beverage Manufacturing
        { value: 'food_manufacturing', keyword: 'food manufacturing plant processing', label: 'Food Manufacturing Plants', icon: '🏭', category: 'Manufacturing' },
        { value: 'beverage_plant', keyword: 'beverage bottling plant brewery distillery', label: 'Beverage Bottling Plants', icon: '🍺', category: 'Manufacturing' },
        { value: 'bakery_factory', keyword: 'bakery factory bread production', label: 'Bakery Production Facilities', icon: '🍞', category: 'Manufacturing' },
        { value: 'meat_processing', keyword: 'meat processing plant slaughterhouse', label: 'Meat Processing Plants', icon: '🥩', category: 'Manufacturing' },
        { value: 'dairy_plant', keyword: 'dairy plant milk processing', label: 'Dairy Processing Facilities', icon: '🥛', category: 'Manufacturing' },
        
        // Industrial & Logistics
        { value: 'warehouse', keyword: 'warehouse distribution center logistics', label: 'Warehouses & Distribution Centers', icon: '📦', category: 'Industrial' },
        { value: 'cold_storage', keyword: 'cold storage facility refrigerated warehouse', label: 'Cold Storage Facilities', icon: '❄️', category: 'Industrial' },
        { value: 'factory', keyword: 'factory manufacturing plant industrial', label: 'Manufacturing Factories', icon: '🏭', category: 'Industrial' },
        { value: 'textile', keyword: 'textile factory garment manufacturing', label: 'Textile & Garment Factories', icon: '👔', category: 'Industrial' },
        
        // Technology & Data
        { value: 'datacenter', keyword: 'data center server facility', label: 'Data Centers', icon: '💻', category: 'Technology' },
        { value: 'call_center', keyword: 'call center BPO contact center', label: 'Call Centers & BPO', icon: '📞', category: 'Technology' },
        { value: 'tech_office', keyword: 'technology company office IT', label: 'Tech Company Offices', icon: '💼', category: 'Technology' },
        
        // Real Estate & Construction
        { value: 'office_building', keyword: 'office building commercial tower', label: 'Office Buildings', icon: '🏢', category: 'Real Estate' },
        { value: 'condominium', keyword: 'condominium residential tower', label: 'Condominiums', icon: '🏙️', category: 'Real Estate' },
        
        // Automotive
        { value: 'car_dealership', keyword: 'car dealership auto showroom', label: 'Car Dealerships', icon: '🚗', category: 'Automotive' },
        { value: 'service_center', keyword: 'auto service center repair shop', label: 'Auto Service Centers', icon: '🔧', category: 'Automotive' }
    ];

    const selectedTerritoryData = territories.find(t => t.id === selectedTerritory);

    const handleAddToCompanies = async (place) => {
        if (!user) {
            alert('Please log in to add companies');
            return;
        }

        setAddingToCompanies(prev => new Set(prev).add(place.place_id));

        try {
            await addDoc(collection(db, "users", user.uid, "companies"), {
                companyName: place.name,
                address: place.vicinity || place.formatted_address,
                city: selectedTerritoryData?.province || '',
                phone: place.formatted_phone_number || '',
                website: place.website || '',
                email: '',
                latitude: place.geometry?.location?.lat || null,
                longitude: place.geometry?.location?.lng || null,
                industry: businessType,
                isTarget: true,
                isCustomer: false,
                source: 'Territory Lead Generator',
                googlePlaceId: place.place_id,
                rating: place.rating || null,
                createdAt: serverTimestamp()
            });

            alert(`✅ ${place.name} added to Companies!`);
            
            // Mark as selected
            setSelectedLeads(prev => new Set(prev).add(place.place_id));
        } catch (error) {
            console.error('Error adding to companies:', error);
            alert('Error adding company. Please try again.');
        } finally {
            setAddingToCompanies(prev => {
                const newSet = new Set(prev);
                newSet.delete(place.place_id);
                return newSet;
            });
        }
    };

    const handleBulkAdd = async () => {
        if (!user) {
            alert('Please log in to add companies');
            return;
        }

        const unselectedLeads = results.filter(r => !selectedLeads.has(r.place_id));
        
        if (unselectedLeads.length === 0) {
            alert('All results have already been added!');
            return;
        }

        if (!confirm(`Add ${unselectedLeads.length} companies to CRM?`)) return;

        setLoading(true);
        let added = 0;

        for (const place of unselectedLeads) {
            try {
                await handleAddToCompanies(place);
                added++;
            } catch (error) {
                console.error(`Failed to add ${place.name}:`, error);
            }
        }

        setLoading(false);
        alert(`✅ Successfully added ${added} companies!`);
    };

    const handleDeleteResult = (placeId) => {
        if (confirm('Remove this result from the list?')) {
            setResults(prev => prev.filter(r => r.place_id !== placeId));
        }
    };

    const handleClearResults = () => {
        if (confirm('Clear all search results?')) {
            setResults([]);
            setSelectedLeads(new Set());
        }
    };

    const handleSearch = async () => {
        // Determine search keyword
        let searchKeyword = '';
        
        if (customKeyword.trim()) {
            // Use custom keyword if provided
            searchKeyword = customKeyword.trim();
        } else if (businessType) {
            // Use predefined keyword
            const selectedType = businessTypes.find(t => t.value === businessType);
            searchKeyword = selectedType?.keyword || businessType;
        } else {
            setError('Please select a business type or enter a custom keyword');
            return;
        }

        if (!selectedTerritory) {
            setError('Please select a territory');
            return;
        }

        if (!selectedTerritoryData?.centerLat || !selectedTerritoryData?.centerLon) {
            setError('Selected territory does not have GPS coordinates');
            return;
        }

        setLoading(true);
        setError('');
        setResults([]);

        try {
            const response = await fetch('/.netlify/functions/places-search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    latitude: selectedTerritoryData.centerLat,
                    longitude: selectedTerritoryData.centerLon,
                    radius: searchRadius * 1000,
                    keyword: searchKeyword  // Send keyword instead of type
                })
            });

            if (!response.ok) {
                throw new Error('Search failed. Please check your API configuration.');
            }

            const data = await response.json();
            setResults(data.results || []);
            
            if (!data.results || data.results.length === 0) {
                setError(`No businesses found matching "${searchKeyword}". Try different keywords or expand the search radius.`);
            }
        } catch (err) {
            setError(err.message || 'Search failed. Please try again.');
            console.error('Search error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full space-y-6">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-3xl p-8 text-white">
                <div className="flex items-center gap-3 mb-2">
                    <Target size={32} />
                    <h1 className="text-3xl font-black uppercase tracking-tight">Territory Lead Generator</h1>
                </div>
                <p className="text-purple-100 text-sm font-bold">
                    Find potential customers within your defined territories using Google Places API
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="p-6 space-y-4">
                    <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-2">
                        <MapPin size={20} className="text-indigo-600" />
                        Search Parameters
                    </h2>

                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">
                            Select Territory
                        </label>
                        <select
                            value={selectedTerritory}
                            onChange={e => setSelectedTerritory(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-xl bg-white font-bold text-sm"
                        >
                            <option value="">-- Choose Territory --</option>
                            {territories.map(territory => (
                                <option key={territory.id} value={territory.id}>
                                    {territory.name} ({territory.province})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">
                            Business Type (Predefined)
                        </label>
                        <select
                            value={businessType}
                            onChange={e => {
                                setBusinessType(e.target.value);
                                setCustomKeyword(''); // Clear custom when selecting predefined
                            }}
                            className="w-full p-3 border border-gray-300 rounded-xl bg-white font-bold text-sm"
                        >
                            <option value="">-- Choose Type --</option>
                            {Object.entries(
                                businessTypes.reduce((acc, type) => {
                                    if (!acc[type.category]) acc[type.category] = [];
                                    acc[type.category].push(type);
                                    return acc;
                                }, {})
                            ).map(([category, types]) => (
                                <optgroup key={category} label={category}>
                                    {types.map(type => (
                                        <option key={type.value} value={type.value}>
                                            {type.icon} {type.label}
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300"></div>
                        </div>
                        <div className="relative flex justify-center text-[10px] font-black uppercase">
                            <span className="bg-white px-3 text-gray-400">OR</span>
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">
                            Custom Search Keywords
                        </label>
                        <Input
                            value={customKeyword}
                            onChange={e => {
                                setCustomKeyword(e.target.value);
                                setBusinessType(''); // Clear predefined when typing custom
                            }}
                            placeholder="e.g., seafood restaurant, pharmaceutical warehouse, tech startup"
                            className="bg-white"
                        />
                        <p className="text-[9px] text-gray-400 mt-1 font-bold">
                            💡 Be specific: "cold storage facility" vs "warehouse"
                        </p>
                    </div>

                    <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black uppercase text-gray-500">Search Radius</span>
                            <span className="text-2xl font-black text-indigo-600">{searchRadius} km</span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="20"
                            step="1"
                            value={searchRadius}
                            onChange={e => setSearchRadius(parseInt(e.target.value))}
                            className="w-full h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                        <div className="flex justify-between text-[9px] text-gray-400 font-bold mt-1">
                            <span>1 km</span>
                            <span>20 km</span>
                        </div>
                    </div>

                    {selectedTerritoryData && (
                        <div className="bg-gray-50 p-4 rounded-2xl text-xs space-y-2">
                            <p className="font-black text-gray-500 uppercase text-[10px]">Territory Info</p>
                            <p><span className="font-bold">Name:</span> {selectedTerritoryData.name}</p>
                            <p><span className="font-bold">Province:</span> {selectedTerritoryData.province}</p>
                            {selectedTerritoryData.agentName && (
                                <p><span className="font-bold">Agent:</span> {selectedTerritoryData.agentName}</p>
                            )}
                        </div>
                    )}

                    <Button
                        onClick={handleSearch}
                        disabled={(!selectedTerritory || (!businessType && !customKeyword.trim())) || loading}
                        variant="primary"
                        className="w-full"
                    >
                        {loading ? (
                            <>
                                <Loader size={16} className="mr-2 animate-spin" />
                                Searching...
                            </>
                        ) : (
                            <>
                                <Search size={16} className="mr-2" />
                                Generate Leads
                            </>
                        )}
                    </Button>

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-2">
                            <AlertCircle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
                            <p className="text-xs font-bold text-red-700">{error}</p>
                        </div>
                    )}
                </Card>

                <Card className="lg:col-span-2 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">
                            Search Results
                        </h2>
                        <div className="flex items-center gap-2">
                            {results.length > 0 && (
                                <>
                                    <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-black">
                                        {results.length} Found
                                    </span>
                                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-black">
                                        {selectedLeads.size} Added
                                    </span>
                                    <Button
                                        onClick={handleBulkAdd}
                                        variant="primary"
                                        className="text-xs"
                                        disabled={results.length === selectedLeads.size}
                                    >
                                        <Check size={12} className="mr-1" />
                                        Add All
                                    </Button>
                                    <Button
                                        onClick={handleClearResults}
                                        variant="secondary"
                                        className="text-xs"
                                    >
                                        <X size={12} className="mr-1" />
                                        Clear
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    {loading && (
                        <div className="text-center py-12">
                            <Loader size={48} className="mx-auto mb-4 text-indigo-600 animate-spin" />
                            <p className="text-gray-500 font-bold">Searching for businesses...</p>
                        </div>
                    )}

                    {!loading && results.length === 0 && !error && (
                        <div className="text-center py-12">
                            <Search size={48} className="mx-auto mb-4 text-gray-300" />
                            <p className="text-gray-400 font-bold">No results yet</p>
                            <p className="text-gray-400 text-sm">Select parameters and click "Generate Leads"</p>
                        </div>
                    )}

                    {!loading && results.length > 0 && (
                        <div className="space-y-3 max-h-[600px] overflow-y-auto">
                            {results.map((place, idx) => {
                                const isAdded = selectedLeads.has(place.place_id);
                                const isAdding = addingToCompanies.has(place.place_id);
                                
                                return (
                                    <div
                                        key={idx}
                                        className={`bg-white border-2 rounded-2xl p-4 hover:shadow-md transition-all ${
                                            isAdded 
                                                ? 'border-green-300 bg-green-50' 
                                                : 'border-gray-100 hover:border-indigo-200'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-black text-gray-800 text-lg">
                                                        {place.name}
                                                    </h3>
                                                    {isAdded && (
                                                        <span className="bg-green-500 text-white px-2 py-0.5 rounded-full text-[9px] font-black flex items-center gap-1">
                                                            <Check size={10} /> ADDED
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 font-bold flex items-center gap-1 mt-1">
                                                    <MapPin size={12} />
                                                    {place.vicinity || place.formatted_address}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {place.rating && (
                                                    <div className="bg-yellow-50 px-2 py-1 rounded-lg">
                                                        <p className="text-xs font-black text-yellow-700">
                                                            ⭐ {place.rating}
                                                        </p>
                                                    </div>
                                                )}
                                                <Button
                                                    onClick={() => handleDeleteResult(place.place_id)}
                                                    variant="secondary"
                                                    className="!p-1.5 text-red-500 hover:bg-red-50"
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                            </div>
                                        </div>

                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                        {place.formatted_phone_number && (
                                            <div className="flex items-center gap-2">
                                                <Phone size={14} className="text-green-600" />
                                                <a 
                                                    href={`tel:${place.formatted_phone_number}`}
                                                    className="font-bold text-gray-700 hover:text-green-600"
                                                >
                                                    {place.formatted_phone_number}
                                                </a>
                                            </div>
                                        )}
                                        {place.user_ratings_total && (
                                            <div className="text-gray-500 font-bold">
                                                {place.user_ratings_total} reviews
                                            </div>
                                        )}
                                        {place.business_status && (
                                            <div className={`font-black text-[10px] uppercase ${
                                                place.business_status === 'OPERATIONAL' 
                                                    ? 'text-green-600' 
                                                    : 'text-gray-400'
                                            }`}>
                                                {place.business_status}
                                            </div>
                                        )}
                                    </div>

                                    {place.website && (
                                        <div className="mt-3 pt-3 border-t border-gray-100">
                                            <div className="flex items-center gap-2 bg-blue-50 p-3 rounded-xl border border-blue-100">
                                                <Globe size={16} className="text-blue-600 flex-shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Website</p>
                                                    <a
                                                        href={place.website}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="font-bold text-blue-600 hover:underline block truncate text-sm"
                                                        title={place.website}
                                                    >
                                                        {place.website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                                                    </a>
                                                </div>
                                                <Button
                                                    onClick={() => window.open(place.website, '_blank')}
                                                    variant="secondary"
                                                    className="!p-2 text-blue-600 hover:bg-blue-100 flex-shrink-0"
                                                >
                                                    <Globe size={14} />
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {place.opening_hours && (
                                        <div className="mt-3 pt-3 border-t border-gray-100">
                                            <p className={`text-xs font-black ${
                                                place.opening_hours.open_now 
                                                    ? 'text-green-600' 
                                                    : 'text-red-600'
                                            }`}>
                                                {place.opening_hours.open_now ? '🟢 Open Now' : '🔴 Closed'}
                                            </p>
                                        </div>
                                    )}

                                    <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                                        <Button
                                            variant="secondary"
                                            className="text-xs flex-1"
                                            onClick={() => window.open(
                                                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}`,
                                                '_blank'
                                            )}
                                        >
                                            <MapPin size={12} className="mr-1" />
                                            View on Map
                                        </Button>
                                        <Button
                                            variant="primary"
                                            className="text-xs flex-1"
                                            onClick={() => handleAddToCompanies(place)}
                                            disabled={isAdded || isAdding}
                                        >
                                            {isAdding ? (
                                                <>
                                                    <Loader size={12} className="mr-1 animate-spin" />
                                                    Adding...
                                                </>
                                            ) : isAdded ? (
                                                <>
                                                    <Check size={12} className="mr-1" />
                                                    Added to CRM
                                                </>
                                            ) : (
                                                <>
                                                    <Building size={12} className="mr-1" />
                                                    Add to CRM
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            );
                            })}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default TerritoryLeadGenerator;
