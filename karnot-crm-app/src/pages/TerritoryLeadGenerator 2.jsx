import React, { useState } from 'react';
import { Target, Search, MapPin, Building, Phone, Mail, Globe, AlertCircle, Loader } from 'lucide-react';
import { Card, Button, Input } from '../data/constants.jsx';

const TerritoryLeadGenerator = ({ territories = [] }) => {
    const [selectedTerritory, setSelectedTerritory] = useState('');
    const [businessType, setBusinessType] = useState('');
    const [searchRadius, setSearchRadius] = useState(5);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const businessTypes = [
        { value: 'hotel', label: 'Hotels & Resorts', icon: '🏨' },
        { value: 'restaurant', label: 'Restaurants & Cafes', icon: '🍽️' },
        { value: 'hospital', label: 'Hospitals & Clinics', icon: '🏥' },
        { value: 'school', label: 'Schools & Universities', icon: '🎓' },
        { value: 'shopping_mall', label: 'Shopping Malls', icon: '🛍️' },
        { value: 'gym', label: 'Gyms & Fitness Centers', icon: '💪' },
        { value: 'supermarket', label: 'Supermarkets', icon: '🛒' },
        { value: 'warehouse', label: 'Warehouses & Logistics', icon: '📦' },
        { value: 'office', label: 'Office Buildings', icon: '🏢' },
        { value: 'factory', label: 'Manufacturing Plants', icon: '🏭' }
    ];

    const selectedTerritoryData = territories.find(t => t.id === selectedTerritory);

    const handleSearch = async () => {
        if (!selectedTerritory || !businessType) {
            setError('Please select both a territory and business type');
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
                    type: businessType
                })
            });

            if (!response.ok) {
                throw new Error('Search failed. Please check your API configuration.');
            }

            const data = await response.json();
            setResults(data.results || []);
            
            if (!data.results || data.results.length === 0) {
                setError('No businesses found in this area. Try expanding the search radius.');
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
                            Business Type
                        </label>
                        <select
                            value={businessType}
                            onChange={e => setBusinessType(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-xl bg-white font-bold text-sm"
                        >
                            <option value="">-- Choose Type --</option>
                            {businessTypes.map(type => (
                                <option key={type.value} value={type.value}>
                                    {type.icon} {type.label}
                                </option>
                            ))}
                        </select>
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
                        disabled={!selectedTerritory || !businessType || loading}
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
                        {results.length > 0 && (
                            <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-black">
                                {results.length} Found
                            </span>
                        )}
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
                            {results.map((place, idx) => (
                                <div
                                    key={idx}
                                    className="bg-white border-2 border-gray-100 rounded-2xl p-4 hover:border-indigo-200 hover:shadow-md transition-all"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex-1">
                                            <h3 className="font-black text-gray-800 text-lg mb-1">
                                                {place.name}
                                            </h3>
                                            <p className="text-xs text-gray-500 font-bold flex items-center gap-1">
                                                <MapPin size={12} />
                                                {place.vicinity || place.formatted_address}
                                            </p>
                                        </div>
                                        {place.rating && (
                                            <div className="bg-yellow-50 px-2 py-1 rounded-lg">
                                                <p className="text-xs font-black text-yellow-700">
                                                    ⭐ {place.rating}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                        {place.formatted_phone_number && (
                                            <div className="flex items-center gap-2">
                                                <Phone size={14} className="text-green-600" />
                                                <span className="font-bold text-gray-700">
                                                    {place.formatted_phone_number}
                                                </span>
                                            </div>
                                        )}
                                        {place.website && (
                                            <div className="flex items-center gap-2">
                                                <Globe size={14} className="text-blue-600" />
                                                <a
                                                    href={place.website}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="font-bold text-blue-600 hover:underline truncate"
                                                >
                                                    Website
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
                                        >
                                            <Building size={12} className="mr-1" />
                                            Add to CRM
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default TerritoryLeadGenerator;
