import React, { useState, useMemo } from 'react';
import { TrendingUp, Building2, MapPin, DollarSign, Factory, Filter, Search, Plus, Check, Calendar, Users, Briefcase } from 'lucide-react';
import { Card, Button, Input } from '../data/constants.jsx';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const BOIProjectLeads = ({ territories = [], user }) => {
    const [selectedRegion, setSelectedRegion] = useState('ALL');
    const [selectedIndustry, setSelectedIndustry] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [minInvestment, setMinInvestment] = useState(0);
    const [addedProjects, setAddedProjects] = useState(new Set());
    const [addingProject, setAddingProject] = useState(null);

    // MOCK BOI PROJECT DATA (In production, this would come from BOI API/Database)
    // Source: Based on typical BOI-registered projects
    const boiProjects = [
        {
            id: 'BOI-2024-001',
            companyName: 'Nestlé Philippines Inc.',
            projectName: 'Factory Expansion - Cabuyao Plant',
            region: 'CALABARZON',
            province: 'Laguna',
            city: 'Cabuyao City',
            industry: 'Food Manufacturing',
            investmentAmount: 2500000000, // PHP
            investmentUSD: 45000000,
            projectType: 'Expansion',
            status: 'Approved',
            approvalDate: '2024-11-15',
            expectedCompletion: '2026-Q2',
            description: 'Expansion of milk processing and cold storage facilities',
            contactPerson: 'Operations Manager',
            employmentGenerated: 350,
            incentives: ['Income Tax Holiday (6 years)', 'Duty-free importation of equipment']
        },
        {
            id: 'BOI-2024-002',
            companyName: 'Meralco PowerGen Corporation',
            projectName: 'Solar Power Plant - Batangas',
            region: 'CALABARZON',
            province: 'Batangas',
            city: 'Lipa City',
            industry: 'Renewable Energy',
            investmentAmount: 8500000000,
            investmentUSD: 150000000,
            projectType: 'New Project',
            status: 'Approved',
            approvalDate: '2024-10-20',
            expectedCompletion: '2026-Q4',
            description: '100MW solar power generation facility with battery storage',
            contactPerson: 'Project Director',
            employmentGenerated: 120,
            incentives: ['Income Tax Holiday (7 years)', '0% VAT on local purchases']
        },
        {
            id: 'BOI-2024-003',
            companyName: 'SM Prime Holdings',
            projectName: 'SM City Iloilo Expansion',
            region: 'Region VI',
            province: 'Iloilo',
            city: 'Iloilo City',
            industry: 'Real Estate Development',
            investmentAmount: 3200000000,
            investmentUSD: 57000000,
            projectType: 'Expansion',
            status: 'Under Review',
            approvalDate: '2024-12-01',
            expectedCompletion: '2025-Q4',
            description: 'Addition of new retail wing and entertainment complex',
            contactPerson: 'Development Manager',
            employmentGenerated: 500,
            incentives: ['Income Tax Holiday (4 years)']
        },
        {
            id: 'BOI-2024-004',
            companyName: 'PLDT Inc.',
            projectName: 'Data Center - Clark Freeport',
            region: 'Region III',
            province: 'Pampanga',
            city: 'Mabalacat City (Clark)',
            industry: 'IT/Data Center',
            investmentAmount: 5000000000,
            investmentUSD: 89000000,
            projectType: 'New Project',
            status: 'Approved',
            approvalDate: '2024-09-10',
            expectedCompletion: '2025-Q3',
            description: 'Tier-4 hyperscale data center with advanced cooling systems',
            contactPerson: 'Infrastructure Head',
            employmentGenerated: 200,
            incentives: ['Income Tax Holiday (8 years)', 'Duty-free importation']
        },
        {
            id: 'BOI-2024-005',
            companyName: 'Universal Robina Corporation',
            projectName: 'Snack Food Production Facility',
            region: 'Region VII',
            province: 'Cebu',
            city: 'Mandaue City',
            industry: 'Food Manufacturing',
            investmentAmount: 1800000000,
            investmentUSD: 32000000,
            projectType: 'New Project',
            status: 'Approved',
            approvalDate: '2024-11-25',
            expectedCompletion: '2026-Q1',
            description: 'Automated snack food manufacturing with cold storage',
            contactPerson: 'Plant Manager',
            employmentGenerated: 280,
            incentives: ['Income Tax Holiday (6 years)']
        },
        {
            id: 'BOI-2024-006',
            companyName: 'San Miguel Brewery Inc.',
            projectName: 'Brewery Modernization - Davao',
            region: 'Region XI',
            province: 'Davao City',
            city: 'Davao City',
            industry: 'Beverage Manufacturing',
            investmentAmount: 4200000000,
            investmentUSD: 75000000,
            projectType: 'Modernization',
            status: 'Approved',
            approvalDate: '2024-08-15',
            expectedCompletion: '2025-Q4',
            description: 'Brewery capacity expansion and cold chain modernization',
            contactPerson: 'Operations Director',
            employmentGenerated: 180,
            incentives: ['Income Tax Holiday (5 years)', 'Duty-free equipment']
        },
        {
            id: 'BOI-2024-007',
            companyName: 'Ayala Land Premier',
            projectName: 'Mixed-Use Development - BGC',
            region: 'NCR',
            province: 'Metro Manila',
            city: 'Metro Manila - BGC (Taguig)',
            industry: 'Real Estate Development',
            investmentAmount: 12000000000,
            investmentUSD: 215000000,
            projectType: 'New Project',
            status: 'Approved',
            approvalDate: '2024-10-05',
            expectedCompletion: '2027-Q2',
            description: 'High-rise residential and commercial complex with HVAC systems',
            contactPerson: 'Project Manager',
            employmentGenerated: 800,
            incentives: ['Income Tax Holiday (3 years)']
        },
        {
            id: 'BOI-2024-008',
            companyName: 'Monde Nissin Corporation',
            projectName: 'Biscuit Manufacturing Expansion',
            region: 'CALABARZON',
            province: 'Laguna',
            city: 'Sta. Cruz',
            industry: 'Food Manufacturing',
            investmentAmount: 2100000000,
            investmentUSD: 37500000,
            projectType: 'Expansion',
            status: 'Approved',
            approvalDate: '2024-11-01',
            expectedCompletion: '2025-Q4',
            description: 'New production lines with temperature-controlled storage',
            contactPerson: 'Manufacturing Head',
            employmentGenerated: 220,
            incentives: ['Income Tax Holiday (6 years)']
        }
    ];

    const regions = ['ALL', 'NCR', 'CALABARZON', 'Region III', 'Region VI', 'Region VII', 'Region XI'];
    const industries = ['ALL', 'Food Manufacturing', 'Beverage Manufacturing', 'Real Estate Development', 'IT/Data Center', 'Renewable Energy'];

    // Filter projects
    const filteredProjects = useMemo(() => {
        return boiProjects.filter(project => {
            const matchesRegion = selectedRegion === 'ALL' || project.region === selectedRegion;
            const matchesIndustry = selectedIndustry === 'ALL' || project.industry === selectedIndustry;
            const matchesSearch = searchTerm === '' || 
                project.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                project.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                project.city.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesInvestment = project.investmentAmount >= minInvestment;
            
            return matchesRegion && matchesIndustry && matchesSearch && matchesInvestment;
        });
    }, [selectedRegion, selectedIndustry, searchTerm, minInvestment]);

    const handleAddToCompanies = async (project) => {
        if (!user) {
            alert('Please log in to add companies');
            return;
        }

        setAddingProject(project.id);

        try {
            await addDoc(collection(db, "users", user.uid, "companies"), {
                companyName: project.companyName,
                address: `${project.city}, ${project.province}`,
                city: project.city,
                phone: '',
                website: '',
                email: '',
                industry: project.industry,
                isTarget: true,
                isCustomer: false,
                source: 'BOI Project Leads',
                boiProjectId: project.id,
                projectName: project.projectName,
                investmentAmount: project.investmentAmount,
                investmentUSD: project.investmentUSD,
                expectedCompletion: project.expectedCompletion,
                contactPerson: project.contactPerson,
                notes: `BOI Project: ${project.projectName}\nInvestment: ₱${(project.investmentAmount / 1000000).toFixed(1)}M\nExpected Completion: ${project.expectedCompletion}`,
                createdAt: serverTimestamp()
            });

            alert(`✅ ${project.companyName} added to Companies!`);
            setAddedProjects(prev => new Set(prev).add(project.id));
        } catch (error) {
            console.error('Error adding to companies:', error);
            alert('Error adding company. Please try again.');
        } finally {
            setAddingProject(null);
        }
    };

    const totalInvestment = filteredProjects.reduce((sum, p) => sum + p.investmentUSD, 0);
    const totalJobs = filteredProjects.reduce((sum, p) => sum + p.employmentGenerated, 0);

    return (
        <div className="w-full space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-8 text-white">
                <div className="flex items-center gap-3 mb-2">
                    <TrendingUp size={32} />
                    <h1 className="text-3xl font-black uppercase tracking-tight">BOI Project Leads</h1>
                </div>
                <p className="text-emerald-100 text-sm font-bold">
                    Track BOI-registered investment projects and identify high-value leads
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase text-gray-500">Projects Found</p>
                            <p className="text-3xl font-black text-blue-700">{filteredProjects.length}</p>
                        </div>
                        <Building2 size={32} className="text-blue-400" />
                    </div>
                </Card>

                <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase text-gray-500">Total Investment</p>
                            <p className="text-2xl font-black text-green-700">${(totalInvestment / 1000000).toFixed(1)}M</p>
                        </div>
                        <DollarSign size={32} className="text-green-400" />
                    </div>
                </Card>

                <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase text-gray-500">Jobs Created</p>
                            <p className="text-3xl font-black text-purple-700">{totalJobs.toLocaleString()}</p>
                        </div>
                        <Users size={32} className="text-purple-400" />
                    </div>
                </Card>

                <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase text-gray-500">Added to CRM</p>
                            <p className="text-3xl font-black text-orange-700">{addedProjects.size}</p>
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

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                        <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">Industry</label>
                        <select
                            value={selectedIndustry}
                            onChange={e => setSelectedIndustry(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-xl bg-white font-bold text-sm"
                        >
                            {industries.map(industry => (
                                <option key={industry} value={industry}>{industry}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">Min Investment</label>
                        <select
                            value={minInvestment}
                            onChange={e => setMinInvestment(Number(e.target.value))}
                            className="w-full p-3 border border-gray-300 rounded-xl bg-white font-bold text-sm"
                        >
                            <option value={0}>All Projects</option>
                            <option value={1000000000}>₱1B+</option>
                            <option value={2000000000}>₱2B+</option>
                            <option value={5000000000}>₱5B+</option>
                            <option value={10000000000}>₱10B+</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block">Search</label>
                        <Input
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Company or project name..."
                            icon={Search}
                        />
                    </div>
                </div>
            </Card>

            {/* Projects List */}
            <div className="space-y-4">
                {filteredProjects.map(project => {
                    const isAdded = addedProjects.has(project.id);
                    const isAdding = addingProject === project.id;

                    return (
                        <Card 
                            key={project.id} 
                            className={`p-6 transition-all ${
                                isAdded ? 'border-2 border-green-300 bg-green-50' : 'hover:shadow-lg'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-xl font-black text-gray-800">{project.companyName}</h3>
                                        {isAdded && (
                                            <span className="bg-green-500 text-white px-2 py-0.5 rounded-full text-[9px] font-black flex items-center gap-1">
                                                <Check size={10} /> ADDED
                                            </span>
                                        )}
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black ${
                                            project.status === 'Approved' 
                                                ? 'bg-green-100 text-green-700' 
                                                : 'bg-yellow-100 text-yellow-700'
                                        }`}>
                                            {project.status}
                                        </span>
                                    </div>
                                    <p className="text-sm font-bold text-gray-600 mb-1">{project.projectName}</p>
                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                        <MapPin size={12} />
                                        {project.city}, {project.province} · {project.region}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase text-gray-400">Investment</p>
                                    <p className="text-2xl font-black text-emerald-600">₱{(project.investmentAmount / 1000000000).toFixed(2)}B</p>
                                    <p className="text-xs text-gray-500">${(project.investmentUSD / 1000000).toFixed(1)}M USD</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div className="bg-gray-50 p-3 rounded-xl">
                                    <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Industry</p>
                                    <p className="text-sm font-bold text-gray-700 flex items-center gap-1">
                                        <Factory size={14} className="text-gray-500" />
                                        {project.industry}
                                    </p>
                                </div>

                                <div className="bg-gray-50 p-3 rounded-xl">
                                    <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Completion</p>
                                    <p className="text-sm font-bold text-gray-700 flex items-center gap-1">
                                        <Calendar size={14} className="text-gray-500" />
                                        {project.expectedCompletion}
                                    </p>
                                </div>

                                <div className="bg-gray-50 p-3 rounded-xl">
                                    <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Jobs Created</p>
                                    <p className="text-sm font-bold text-gray-700 flex items-center gap-1">
                                        <Users size={14} className="text-gray-500" />
                                        {project.employmentGenerated} positions
                                    </p>
                                </div>
                            </div>

                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4">
                                <p className="text-[10px] font-black uppercase text-gray-500 mb-2">Project Description</p>
                                <p className="text-sm text-gray-700 font-medium">{project.description}</p>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    variant="secondary"
                                    className="flex-1 text-xs"
                                >
                                    <Briefcase size={12} className="mr-1" />
                                    View BOI Details
                                </Button>
                                <Button
                                    variant="primary"
                                    className="flex-1 text-xs"
                                    onClick={() => handleAddToCompanies(project)}
                                    disabled={isAdded || isAdding}
                                >
                                    {isAdding ? (
                                        <>Loading...</>
                                    ) : isAdded ? (
                                        <>
                                            <Check size={12} className="mr-1" />
                                            Added to CRM
                                        </>
                                    ) : (
                                        <>
                                            <Plus size={12} className="mr-1" />
                                            Add to Companies
                                        </>
                                    )}
                                </Button>
                            </div>
                        </Card>
                    );
                })}

                {filteredProjects.length === 0 && (
                    <Card className="p-12 text-center">
                        <Building2 size={48} className="mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-400 font-bold">No projects found matching your filters</p>
                        <p className="text-gray-400 text-sm">Try adjusting your search criteria</p>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default BOIProjectLeads;
