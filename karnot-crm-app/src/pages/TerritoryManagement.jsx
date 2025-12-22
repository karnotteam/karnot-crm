import React, { useState } from ‘react’;
import { Card, Button, Input } from ‘../data/constants.jsx’;
import { MapPin, Download, Search, Target, Zap, Building, Factory } from ‘lucide-react’;

const TerritoryLeadGenerator = ({ territories = [] }) => {
const [selectedTerritory, setSelectedTerritory] = useState(’’);
const [generating, setGenerating] = useState(false);
const [leads, setLeads] = useState([]);
const [searchRadius, setSearchRadius] = useState(15); // km
const [categories, setCategories] = useState({
hospitals: true,
hotels: true,
supermarkets: true,
coldStorage: true,
foodProcessing: true,
bottlingPlants: true,
resorts: true,
malls: true,
iceePlants: false,
laundries: false,
fishProcessing: true
});

```
// CATEGORY DEFINITIONS with Google Places types and keywords
const CATEGORY_CONFIG = {
    hospitals: {
        label: 'Hospitals & Medical Centers',
        placeTypes: ['hospital'],
        keywords: ['hospital', 'medical center', 'regional hospital'],
        score: 5,
        icon: '🏥',
        pitch: 'High hot water demand for sterilization, laundry, patient care'
    },
    hotels: {
        label: 'Hotels (50+ rooms)',
        placeTypes: ['lodging'],
        keywords: ['hotel', 'resort hotel'],
        score: 5,
        icon: '🏨',
        pitch: 'Continuous hot water for rooms, laundry, kitchens'
    },
    resorts: {
        label: 'Resorts & Beach Hotels',
        placeTypes: ['lodging', 'resort_hotel'],
        keywords: ['resort', 'beach resort'],
        score: 4,
        icon: '🏖️',
        pitch: 'Pool heating + hot water + kitchen loads'
    },
    supermarkets: {
        label: 'Supermarkets & Malls',
        placeTypes: ['supermarket', 'shopping_mall'],
        keywords: ['SM', 'Robinsons', 'Puregold', 'supermarket', 'mall'],
        score: 4,
        icon: '🛒',
        pitch: 'Large refrigeration systems, HVAC loads'
    },
    coldStorage: {
        label: 'Cold Storage & Warehouses',
        placeTypes: ['storage'],
        keywords: ['cold storage', 'cold store', 'warehouse', 'logistics'],
        score: 5,
        icon: '❄️',
        pitch: 'Massive refrigeration loads, year-round operation'
    },
    foodProcessing: {
        label: 'Food Processing Plants',
        placeTypes: ['food'],
        keywords: ['food processing', 'meat processing', 'processing plant', 'commissary'],
        score: 5,
        icon: '🏭',
        pitch: 'Industrial hot water + refrigeration + process cooling'
    },
    bottlingPlants: {
        label: 'Bottling & Beverage Plants',
        placeTypes: ['food'],
        keywords: ['Coca-Cola', 'Pepsi', 'San Miguel', 'bottling', 'brewery'],
        score: 5,
        icon: '🥤',
        pitch: 'Process cooling, pasteurization, CIP systems'
    },
    fishProcessing: {
        label: 'Seafood & Fish Processing',
        placeTypes: ['food'],
        keywords: ['fish processing', 'seafood', 'fishery', 'bangus'],
        score: 4,
        icon: '🐟',
        pitch: 'Blast freezing, ice making, cold storage'
    },
    malls: {
        label: 'Shopping Malls',
        placeTypes: ['shopping_mall'],
        keywords: ['mall', 'plaza', 'shopping center'],
        score: 4,
        icon: '🏬',
        pitch: 'Central HVAC, food court loads, anchor tenant refrigeration'
    },
    icePlants: {
        label: 'Ice Plants',
        placeTypes: ['food'],
        keywords: ['ice plant', 'ice factory', 'ice'],
        score: 3,
        icon: '🧊',
        pitch: 'Continuous refrigeration, brine systems'
    },
    laundries: {
        label: 'Industrial Laundries',
        placeTypes: ['laundry'],
        keywords: ['laundry', 'industrial laundry', 'linen'],
        score: 3,
        icon: '🧺',
        pitch: 'High-volume hot water for washing'
    }
};

// DAGUPAN AREA CENTERS (you can expand this with your KML data)
const TERRITORY_CENTERS = {
    'Dagupan': { lat: 16.0433, lng: 120.3334, name: 'Dagupan City' },
    'Calasiao': { lat: 16.0167, lng: 120.3667, name: 'Calasiao' },
    'Urdaneta': { lat: 15.9761, lng: 120.5711, name: 'Urdaneta City' },
    'San Fabian': { lat: 16.1167, lng: 120.4333, name: 'San Fabian' },
    'Villasis': { lat: 15.9000, lng: 120.5833, name: 'Villasis' }
};

// MOCK FUNCTION - Replace with actual Google Places API call
const searchGooglePlaces = async (center, category, radius) => {
    // This is where you'd call Google Places API
    // For now, returning mock data structure
    
    const config = CATEGORY_CONFIG[category];
    
    // MOCK DATA - Replace with actual API call:
    /*
    const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?` +
        `location=${center.lat},${center.lng}` +
        `&radius=${radius * 1000}` +
        `&type=${config.placeTypes[0]}` +
        `&key=YOUR_API_KEY`
    );
    */
    
    return [
        {
            name: `Sample ${config.label} in ${center.name}`,
            category: category,
            address: `${center.name}, Pangasinan`,
            lat: center.lat + (Math.random() - 0.5) * 0.1,
            lng: center.lng + (Math.random() - 0.5) * 0.1,
            placeId: `sample_${category}_${Math.random()}`,
            score: config.score,
            pitch: config.pitch,
            icon: config.icon
        }
    ];
};

const generateLeads = async () => {
    if (!selectedTerritory) {
        alert('Please select a territory first');
        return;
    }

    setGenerating(true);
    setLeads([]);

    try {
        const center = TERRITORY_CENTERS[selectedTerritory];
        const allLeads = [];

        // Search each enabled category
        for (const [categoryKey, enabled] of Object.entries(categories)) {
            if (enabled) {
                const results = await searchGooglePlaces(center, categoryKey, searchRadius);
                allLeads.push(...results);
            }
        }

        // Sort by score (highest priority first)
        allLeads.sort((a, b) => b.score - a.score);

        setLeads(allLeads);
    } catch (error) {
        console.error('Lead generation error:', error);
        alert('Error generating leads. Check console for details.');
    } finally {
        setGenerating(false);
    }
};

const exportToCSV = () => {
    if (leads.length === 0) {
        alert('No leads to export');
        return;
    }

    // CSV Headers matching your import format
    const headers = [
        'Company',
        'Industry',
        'Website',
        'Address',
        'Latitude',
        'Longitude',
        'Tier',
        'IsCustomer',
        'IsTarget',
        'IsVerified',
        'Score',
        'Pitch',
        'Territory'
    ];

    const rows = leads.map(lead => [
        lead.name,
        CATEGORY_CONFIG[lead.category].label,
        '', // Website (to be filled by call center)
        lead.address,
        lead.lat,
        lead.lng,
        lead.score >= 5 ? 'STRATEGIC' : lead.score >= 4 ? 'PRIORITY' : 'STANDARD',
        'No',
        'Yes',
        'Yes',
        lead.score,
        lead.pitch,
        selectedTerritory
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Karnot_Leads_${selectedTerritory}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
};

return (
    <div className="space-y-6">
        <Card className="border-t-4 border-blue-500 shadow-xl">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2 text-gray-800">
                        <Target className="text-blue-600" /> Territory Lead Generator
                    </h2>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
                        Automated Target Prospecting with Google Places
                    </p>
                </div>
                {leads.length > 0 && (
                    <Button onClick={exportToCSV} variant="success" className="px-6">
                        <Download className="mr-2" size={16}/> Export {leads.length} Leads to CSV
                    </Button>
                )}
            </div>

            {/* CONFIGURATION PANEL */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                
                {/* Territory Selection */}
                <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">
                        Select Territory
                    </label>
                    <select
                        className="w-full p-3 border-2 border-blue-100 rounded-xl bg-white font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                        value={selectedTerritory}
                        onChange={e => setSelectedTerritory(e.target.value)}
                    >
                        <option value="">-- Choose Territory --</option>
                        {Object.keys(TERRITORY_CENTERS).map(territory => (
                            <option key={territory} value={territory}>{territory}</option>
                        ))}
                    </select>
                </div>

                {/* Search Radius */}
                <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">
                        Search Radius (km)
                    </label>
                    <Input
                        type="number"
                        value={searchRadius}
                        onChange={e => setSearchRadius(e.target.value)}
                        min="5"
                        max="50"
                    />
                    <p className="text-xs text-gray-400 mt-1 italic">
                        Larger radius = more results but less focused
                    </p>
                </div>

                {/* Generate Button */}
                <div className="flex items-end">
                    <Button
                        onClick={generateLeads}
                        variant="primary"
                        className="w-full h-[50px] bg-blue-600 hover:bg-blue-700 font-black"
                        disabled={generating || !selectedTerritory}
                    >
                        {generating ? (
                            <>Searching...</>
                        ) : (
                            <>
                                <Search className="mr-2" size={18}/> Generate Leads
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* CATEGORY CHECKBOXES */}
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <h3 className="text-xs font-black uppercase text-gray-400 mb-4 tracking-widest">
                    Target Categories (Select All That Apply)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                        <label
                            key={key}
                            className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                categories[key]
                                    ? 'bg-blue-50 border-blue-300'
                                    : 'bg-white border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <input
                                type="checkbox"
                                checked={categories[key]}
                                onChange={e => setCategories({...categories, [key]: e.target.checked})}
                                className="w-4 h-4"
                            />
                            <span className="text-lg">{config.icon}</span>
                            <div className="flex-1">
                                <span className="text-xs font-bold text-gray-700 block leading-tight">
                                    {config.label}
                                </span>
                                <span className={`text-[9px] font-black uppercase ${
                                    config.score >= 5 ? 'text-red-600' : 
                                    config.score >= 4 ? 'text-orange-600' : 
                                    'text-blue-600'
                                }`}>
                                    Priority {config.score}
                                </span>
                            </div>
                        </label>
                    ))}
                </div>
            </div>
        </Card>

        {/* RESULTS TABLE */}
        {leads.length > 0 && (
            <Card className="shadow-md overflow-hidden">
                <div className="p-4 bg-blue-50 border-b flex justify-between items-center">
                    <h3 className="font-black text-blue-800 uppercase text-xs tracking-widest">
                        Generated Leads: {selectedTerritory}
                    </h3>
                    <span className="text-xs font-bold text-blue-600">
                        {leads.length} Prospects Found
                    </span>
                </div>
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                    <table className="w-full text-xs">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th className="p-3 text-left font-black uppercase text-gray-500">Score</th>
                                <th className="p-3 text-left font-black uppercase text-gray-500">Company</th>
                                <th className="p-3 text-left font-black uppercase text-gray-500">Category</th>
                                <th className="p-3 text-left font-black uppercase text-gray-500">Address</th>
                                <th className="p-3 text-left font-black uppercase text-gray-500">Coordinates</th>
                                <th className="p-3 text-left font-black uppercase text-gray-500">Sales Pitch</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {leads.map((lead, idx) => (
                                <tr key={idx} className="hover:bg-blue-50 transition-colors">
                                    <td className="p-3">
                                        <span className={`inline-block px-2 py-1 rounded-full text-[9px] font-black ${
                                            lead.score >= 5 ? 'bg-red-100 text-red-700' :
                                            lead.score >= 4 ? 'bg-orange-100 text-orange-700' :
                                            'bg-blue-100 text-blue-700'
                                        }`}>
                                            {lead.score}
                                        </span>
                                    </td>
                                    <td className="p-3 font-bold text-gray-800">{lead.name}</td>
                                    <td className="p-3">
                                        <span className="flex items-center gap-1">
                                            <span>{lead.icon}</span>
                                            <span className="text-gray-600">{CATEGORY_CONFIG[lead.category].label}</span>
                                        </span>
                                    </td>
                                    <td className="p-3 text-gray-600">{lead.address}</td>
                                    <td className="p-3 font-mono text-gray-500 text-[10px]">
                                        {lead.lat.toFixed(4)}, {lead.lng.toFixed(4)}
                                    </td>
                                    <td className="p-3 text-gray-600 italic text-[10px]">{lead.pitch}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        )}

        {/* IMPLEMENTATION NOTES */}
        <Card className="bg-yellow-50 border-2 border-yellow-200">
            <div className="flex items-start gap-3">
                <Zap className="text-yellow-600 flex-shrink-0" size={24}/>
                <div>
                    <h4 className="font-black uppercase text-xs text-yellow-800 mb-2">Implementation Required</h4>
                    <p className="text-xs text-yellow-700 leading-relaxed mb-2">
                        <strong>This is a prototype.</strong> To make it production-ready, you need to:
                    </p>
                    <ol className="list-decimal list-inside text-xs text-yellow-700 space-y-1">
                        <li>Get a <strong>Google Places API key</strong> from Google Cloud Console</li>
                        <li>Replace the <code className="bg-yellow-100 px-1">searchGooglePlaces()</code> mock function with real API calls</li>
                        <li>Add your territory KML polygon data to filter results by boundary</li>
                        <li>Set up <strong>geocoding</strong> for address-to-coordinates conversion</li>
                        <li>Add deduplication logic to prevent duplicate leads</li>
                    </ol>
                    <p className="text-xs text-yellow-700 mt-3">
                        <strong>Cost estimate:</strong> Google Places API costs ~$17 per 1,000 searches. 
                        For Dagupan with 10 categories = ~$0.17 per territory scan.
                    </p>
                </div>
            </div>
        </Card>
    </div>
);
```

};

export default TerritoryLeadGenerator;

