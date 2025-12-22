import React, { useState, useMemo } from 'react';
import { Factory, MapPin, Building2, Filter, Search, Check, Users, Zap, Package, Globe } from 'lucide-react';
import { Card, Button, Input } from '../data/constants.jsx';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const PEZAZones = ({ territories = [], user }) => {
    const [selectedRegion, setSelectedRegion] = useState('ALL');
    const [selectedZoneType, setSelectedZoneType] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [addedCompanies, setAddedCompanies] = useState(new Set());
    const [addingCompany, setAddingCompany] = useState(null);

    // PEZA ZONES DATABASE
    const pezaZones = [
        {
            id: 'PEZA-001',
            zoneName: 'Clark Freeport Zone',
            zoneType: 'Manufacturing & IT Park',
            region: 'Region III',
            province: 'Pampanga',
            city: 'Mabalacat City',
            established: '1993',
            area: '36,000 hectares',
            majorTenants: [
                { name: 'Texas Instruments', industry: 'Electronics Manufacturing', employees: 2500 },
                { name: 'Nestlé Clark', industry: 'Food Manufacturing', employees: 800 },
                { name: 'Hanjin Heavy Industries', industry: 'Shipbuilding', employees: 5000 },
                { name: 'Lufthansa Technik Philippines', industry: 'Aircraft Maintenance', employees: 3200 },
                { name: 'Asialink Finance Corp', industry: 'BPO', employees: 1500 }
            ],
            infrastructure: ['Power: 24/7 stable', 'Water: High capacity', 'Advanced cooling systems needed', 'Data centers'],
            contact: 'Clark Development Corporation',
            website: 'https://www.clark.com.ph'
        },
        {
            id: 'PEZA-002',
            zoneName: 'Laguna Technopark',
            zoneType: 'IT Park & Light Manufacturing',
            region: 'CALABARZON',
            province: 'Laguna',
            city: 'Biñan City',
            established: '1997',
            area: '500 hectares',
            majorTenants: [
                { name: 'IBM Philippines', industry: 'IT Services', employees: 5000 },
                { name: 'NEC Technologies', industry: 'Electronics', employees: 1200 },
                { name: 'Sanyo Electronics', industry: 'Consumer Electronics', employees: 2000 },
                { name: 'Toshiba Information Equipment', industry: 'IT Hardware', employees: 1800 },
                { name: 'Canon Business Machines', industry: 'Office Equipment', employees: 1500 }
            ],
            infrastructure: ['24/7 power', 'High-speed internet', 'Central HVAC infrastructure', 'Cold storage facilities'],
            contact: 'Laguna Technopark Inc.',
            website: 'https://www.lagunatechnopark.com'
        },
        {
            id: 'PEZA-003',
            zoneName: 'Mactan Economic Zone',
            zoneType: 'Manufacturing & Logistics',
            region: 'Region VII',
            province: 'Cebu',
            city: 'Lapu-Lapu City',
            established: '1979',
            area: '140 hectares',
            majorTenants: [
                { name: 'Taiheiyo Cement Philippines', industry: 'Cement Manufacturing', employees: 450 },
                { name: 'Amertron Inc', industry: 'Electronics', employees: 2500 },
                { name: 'Tsuneishi Heavy Industries', industry: 'Shipbuilding', employees: 3500 },
                { name: 'Cebu Export Processing Zone', industry: 'Garments', employees: 8000 },
                { name: 'Fair Electronics', industry: 'PCB Manufacturing', employees: 1200 }
            ],
            infrastructure: ['Port access', 'Airport proximity', 'Industrial cooling required', 'Cold chain logistics'],
            contact: 'Mactan Economic Zone Authority',
            website: 'https://www.mepz.gov.ph'
        },
        {
            id: 'PEZA-004',
            zoneName: 'LIMA Technology Center',
            zoneType: 'IT Park & Light Industry',
            region: 'CALABARZON',
            province: 'Batangas',
            city: 'Lipa City',
            established: '1996',
            area: '500 hectares',
            majorTenants: [
                { name: 'Intel Philippines', industry: 'Semiconductor Manufacturing', employees: 4000 },
                { name: 'First Philippine Industrial Park', industry: 'Electronics', employees: 2500 },
                { name: 'Canon Precision', industry: 'Precision Equipment', employees: 1800 },
                { name: 'Mitsumi Electronics', industry: 'Electronic Components', employees: 3200 },
                { name: 'Nidec Philippines', industry: 'Motors Manufacturing', employees: 2000 }
            ],
            infrastructure: ['High-capacity power', 'Advanced telecommunications', 'Precision cooling requirements', 'Clean rooms'],
            contact: 'LIMA Land Inc.',
            website: 'https://www.limaland.com.ph'
        },
        {
            id: 'PEZA-005',
            zoneName: 'Subic Bay Freeport Zone',
            zoneType: 'Multi-Sector Industrial Park',
            region: 'Region III',
            province: 'Zambales',
            city: 'Subic',
            established: '1992',
            area: '67,000 hectares',
            majorTenants: [
                { name: 'Hanjin Shipyard', industry: 'Shipbuilding', employees: 5000 },
                { name: 'Federal Express', industry: 'Logistics', employees: 800 },
                { name: 'Subic Bay Marine Exploratorium', industry: 'Tourism', employees: 200 },
                { name: 'Convergys Philippines', industry: 'BPO', employees: 4500 },
                { name: 'Aleson Shipping Lines', industry: 'Maritime Services', employees: 600 }
            ],
            infrastructure: ['Deep water port', 'Airport', 'Tax-free zone', 'Large-scale refrigeration needs'],
            contact: 'Subic Bay Metropolitan Authority',
            website: 'https://www.sbma.com'
        },
        {
            id: 'PEZA-006',
            zoneName: 'Cavite Economic Zone',
            zoneType: 'Export Processing Zone',
            region: 'CALABARZON',
            province: 'Cavite',
            city: 'Rosario',
            established: '1995',
            area: '275 hectares',
            majorTenants: [
                { name: 'TDK Philippines', industry: 'Electronics Components', employees: 6000 },
                { name: 'Integrated Micro-Electronics', industry: 'Electronics Manufacturing', employees: 8000 },
                { name: 'Sony Precision Engineering Center', industry: 'Precision Parts', employees: 2500 },
                { name: 'Fujitsu Computer Products', industry: 'IT Hardware', employees: 1500 },
                { name: 'Yazaki Torres Manufacturing', industry: 'Automotive Parts', employees: 3500 }
            ],
            infrastructure: ['Stable power supply', 'Water treatment plant', 'Climate-controlled facilities', 'Export logistics hub'],
            contact: 'Cavite Economic Zone Authority',
            website: 'https://www.ceza.gov.ph'
        },
        {
            id: 'PEZA-007',
            zoneName: 'Gateway Business Park',
            zoneType: 'IT Park & BPO Hub',
            region: 'Region VII',
            province: 'Cebu',
            city: 'Mandaue City',
            established: '2004',
            area: '18 hectares',
            majorTenants: [
                { name: 'JP Morgan Chase', industry: 'Financial BPO', employees: 3000 },
                { name: 'Accenture Cebu', industry: 'IT Services', employees: 5000 },
                { name: 'Teleperformance', industry: 'Call Center', employees: 4500 },
                { name: 'Concentrix', industry: 'Customer Support', employees: 6000 },
                { name: 'TTEC', industry: 'BPO', employees: 2500 }
            ],
            infrastructure: ['Redundant power systems', 'Fiber optic backbone', '24/7 HVAC systems critical', 'Data center cooling'],
            contact: 'Filinvest Land Inc.',
            website: 'https://www.gatewaypark.com.ph'
        },
        {
            id: 'PEZA-008',
            zoneName: 'Bataan Economic Zone',
            zoneType: 'Heavy Manufacturing',
            region: 'Region III',
            province: 'Bataan',
            city: 'Mariveles',
            established: '1972',
            area: '440 hectares',
            majorTenants: [
                { name: 'Petron Corporation', industry: 'Petroleum Refining', employees: 2000 },
                { name: 'Hermosa Ecozone Development Corp', industry: 'Mixed Manufacturing', employees: 3500 },
                { name: 'Taiwan Cement Corp', industry: 'Cement Production', employees: 800 },
                { name: 'JG Summit Petrochemicals', industry: 'Petrochemicals', employees: 1500 },
                { name: 'Energy Development Corporation', industry: 'Power Generation', employees: 600 }
            ],
            infrastructure: ['Deep water port', 'Heavy industrial power', 'Process cooling systems', 'Hazmat facilities'],
            contact: 'BEPZ Authority',
            website: 'https://www.bepz.gov.ph'
        }
    ];

    const regions = ['ALL', 'NCR', 'CALABARZON', 'Region III', 'Region VII'];
    const zoneTypes = ['ALL', 'Manufacturing & IT Park', 'IT Park & Light Manufacturing', 'Export Processing Zone', 'Multi-Sector Industrial Park'];

    // Flatten companies with zone info
    const allCompanies = useMemo(() => {
        return pezaZones.flatMap(zone => 
            zone.majorTenants.map(tenant => ({
                ...tenant,
                zoneId: zone.id,
                zoneName: zone.zoneName,
                zoneType: zone.zoneType,
                region: zone.region,
                province: zone.province,
                city: zone.city,
                infrastructure: zone.infrastructure,
                zoneContact: zone.contact,
                zoneWebsite: zone.website
            }))
        );
    }, []);

    const filteredCompanies = useMemo(() => {
        return allCompanies.filter(company => {
            const matchesRegion = selectedRegion === 'ALL' || company.region === selectedRegion;
            const matchesZoneType = selectedZoneType === 'ALL' || company.zoneType === selectedZoneType;
            const matchesSearch = searchTerm === '' || 
                company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                company.zoneName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                company.industry.toLowerCase().includes(searchTerm.toLowerCase()) ||
                company.city.toLowerCase().includes(searchTerm.toLowerCase());
            
            return matchesRegion && matchesZoneType && matchesSearch;
        });
    }, [selectedRegion, selectedZoneType, searchTerm, allCompanies]);

    const handleAddToCompanies = async (company) => {
        if (!user) {
            alert('Please log in to add companies');
            return;
        }

        setAddingCompany(company.name);

        try {
            await addDoc(collection(db, "users", user.uid, "companies"), {
                companyName: company.name,
                address: `${company.zoneName}, ${company.city}, ${company.province}`,
                city: company.city,
                phone: '',
                website: company.zoneWebsite || '',
                email: '',
                industry: company.industry,
                isTarget: true,
                isCustomer: false,
                source: 'PEZA Economic Zone',
                pezaZone: company.zoneName,
                employees: company.employees,
                zoneInfrastructure: company.infrastructure.join('; '),
                notes: `PEZA Zone: ${company.zoneName}\nIndustry: ${company.industry}\nEmployees: ${company.employees}\nInfrastructure: ${company.infrastructure.join(', ')}`,
                createdAt: serverTimestamp()
            });

            alert(`✅ ${company.name} added to Companies!`);
            setAddedCompanies(prev => new Set(prev).add(company.name));
        } catch (error) {
            console.error('Error adding to companies:', error);
            alert('Error adding company. Please try again.');
        } finally {
            setAddingCompany(null);
        }
    };

    return (
        <div className="w-full space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-3xl p-8 text-white">
                <div className="flex items-center gap-3 mb-2">
                    <Factory size={32} />
                    <h1 className="text-3xl font-black uppercase tracking-tight">PEZA Economic Zones</h1>
                </div>
                <p className="text-blue-100 text-sm font-bold">
                    Track PEZA-registered companies in industrial parks and economic zones
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase text-gray-500">PEZA Zones</p>
                            <p className="text-3xl font-black text-purple-700">{pezaZones.length}</p>
                        </div>
                        <Building2 size={32} className="text-purple-400" />
                    </div>
                </Card>

                <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase text-gray-500">Companies</p>
                            <p className="text-3xl font-black text-blue-700">{allCompanies.length}</p>
                        </div>
                        <Factory size={32} className="text-blue-400" />
                    </div>
                </Card>

                <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase text-gray-500">Filtered Results</p>
                            <p className="text-3xl font-black text-green-700">{filteredCompanies.length}</p>
                        </div>
                        <Search size={32} className="text-green-400" />
                    </div>
                </Card>

                <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase text-gray-500">Added to CRM</p>
                            <p className="text-3xl font-black text-orange-700">{addedCompanies.size}</p>
                        </div>
                        <Check size={32} className="text-orange-400" />
                    </div>
                </Card>
            </div>

            {/* Filters */}
            <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Filter size={18} className="text-gray-600" />
                    <h2 className="text-lg font-black text-gray-800 uppercase">Filters</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">Region</label>
                        <select
                            value={selectedRegion}
                            onChange={e => setSelectedRegion(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-xl bg-white font-bold text-sm"
                        >
                            {regions.map(region => (
                                <option key={region} value={region}>{region}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">Zone Type</label>
                        <select
                            value={selectedZoneType}
                            onChange={e => setSelectedZoneType(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-xl bg-white font-bold text-sm"
                        >
                            {zoneTypes.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">Search</label>
                        <Input
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Company, zone, or industry..."
                            icon={Search}
                        />
                    </div>
                </div>
            </Card>

            {/* Companies List */}
            <div className="space-y-3">
                {filteredCompanies.map((company, idx) => {
                    const isAdded = addedCompanies.has(company.name);
                    const isAdding = addingCompany === company.name;

                    return (
                        <Card 
                            key={idx}
                            className={`p-5 transition-all ${
                                isAdded ? 'border-2 border-green-300 bg-green-50' : 'hover:shadow-lg'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-lg font-black text-gray-800">{company.name}</h3>
                                        {isAdded && (
                                            <span className="bg-green-500 text-white px-2 py-0.5 rounded-full text-[9px] font-black flex items-center gap-1">
                                                <Check size={10} /> ADDED
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm font-bold text-gray-600 flex items-center gap-1">
                                        <Package size={12} />
                                        {company.industry}
                                    </p>
                                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                        <MapPin size={12} />
                                        {company.zoneName}, {company.city}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-blue-600">{company.zoneType}</p>
                                    <p className="text-xs text-gray-500 flex items-center gap-1 justify-end mt-1">
                                        <Users size={12} />
                                        {company.employees.toLocaleString()} employees
                                    </p>
                                </div>
                            </div>

                            <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 mb-3">
                                <p className="text-[10px] font-black uppercase text-gray-500 mb-2 flex items-center gap-1">
                                    <Zap size={12} />
                                    Infrastructure & Cooling Needs
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {company.infrastructure.map((infra, i) => (
                                        <span key={i} className="text-xs bg-white px-2 py-1 rounded-lg font-bold text-gray-700">
                                            {infra}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    variant="secondary"
                                    className="flex-1 text-xs"
                                    onClick={() => window.open(company.zoneWebsite, '_blank')}
                                >
                                    <Globe size={12} className="mr-1" />
                                    Zone Website
                                </Button>
                                <Button
                                    variant="primary"
                                    className="flex-1 text-xs"
                                    onClick={() => handleAddToCompanies(company)}
                                    disabled={isAdded || isAdding}
                                >
                                    {isAdding ? (
                                        <>Adding...</>
                                    ) : isAdded ? (
                                        <>
                                            <Check size={12} className="mr-1" />
                                            Added to CRM
                                        </>
                                    ) : (
                                        <>
                                            <Building2 size={12} className="mr-1" />
                                            Add to Companies
                                        </>
                                    )}
                                </Button>
                            </div>
                        </Card>
                    );
                })}

                {filteredCompanies.length === 0 && (
                    <Card className="p-12 text-center">
                        <Factory size={48} className="mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-400 font-bold">No companies found matching your filters</p>
                        <p className="text-gray-400 text-sm">Try adjusting your search criteria</p>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default PEZAZones;
