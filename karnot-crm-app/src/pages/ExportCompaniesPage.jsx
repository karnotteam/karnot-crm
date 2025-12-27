import React, { useState, useMemo } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from "firebase/firestore";
import {
    Plus, X, Edit, Trash2, Building, Search, Mail, Phone,
    Globe, MapPin, Star, Award, FileText, Filter, Download,
    ExternalLink, TrendingUp, Users, Briefcase, Target
} from 'lucide-react';
import { Card, Button, Input, Textarea } from '../data/constants.jsx';
import { ExportButton } from '../utils/ExcelExport.jsx';

// ============================================================================
// EXPORT COMPANIES PAGE - International Partners & Distributors
// ============================================================================

const ExportCompaniesPage = ({ companies, contacts, quotes, user, onOpenQuote, appointments }) => {
    
    // Filter to show ONLY export companies
    const exportCompanies = useMemo(() => {
        return (companies || []).filter(c => c.isExportTarget === true);
    }, [companies]);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRegion, setSelectedRegion] = useState('ALL');
    const [selectedType, setSelectedType] = useState('ALL');
    const [editingCompany, setEditingCompany] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    
    // Form state
    const [formData, setFormData] = useState({
        companyName: '',
        region: 'MALAYSIA',
        city: '',
        address: '',
        phone: '',
        email: '',
        website: '',
        contactName: '',
        type: 'Potential Partner',
        industry: '',
        notes: '',
        priority: 'Medium',
        vipTarget: false
    });

    // ========================================================================
    // FILTERS & COMPUTED VALUES
    // ========================================================================

    const regions = useMemo(() => {
        const regionSet = new Set(exportCompanies.map(c => c.region).filter(Boolean));
        return ['ALL', ...Array.from(regionSet).sort()];
    }, [exportCompanies]);

    const companyTypes = useMemo(() => {
        const typeSet = new Set(exportCompanies.map(c => c.type).filter(Boolean));
        return ['ALL', ...Array.from(typeSet).sort()];
    }, [exportCompanies]);

    const filteredCompanies = useMemo(() => {
        return exportCompanies.filter(company => {
            const matchesSearch = !searchTerm || 
                company.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                company.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                company.industry?.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesRegion = selectedRegion === 'ALL' || company.region === selectedRegion;
            const matchesType = selectedType === 'ALL' || company.type === selectedType;
            
            return matchesSearch && matchesRegion && matchesType;
        });
    }, [exportCompanies, searchTerm, selectedRegion, selectedType]);

    // Statistics
    const stats = useMemo(() => {
        const total = exportCompanies.length;
        const vips = exportCompanies.filter(c => c.vipTarget).length;
        const highPriority = exportCompanies.filter(c => c.priority === 'High').length;
        const byRegion = exportCompanies.reduce((acc, c) => {
            acc[c.region] = (acc[c.region] || 0) + 1;
            return acc;
        }, {});
        
        return { total, vips, highPriority, byRegion };
    }, [exportCompanies]);

    // ========================================================================
    // HANDLERS
    // ========================================================================

    const handleAdd = async () => {
        if (!user || !formData.companyName.trim()) {
            alert("Company name is required");
            return;
        }

        try {
            await addDoc(collection(db, "users", user.uid, "companies"), {
                ...formData,
                isExportTarget: true,
                createdAt: serverTimestamp(),
                source: 'Manual Entry - Export CRM'
            });

            resetForm();
            setShowAddForm(false);
        } catch (error) {
            console.error("Error adding company:", error);
            alert("Failed to add company");
        }
    };

    const handleUpdate = async () => {
        if (!user || !editingCompany) return;

        try {
            await updateDoc(doc(db, "users", user.uid, "companies", editingCompany.id), {
                ...formData,
                updatedAt: serverTimestamp()
            });

            setEditingCompany(null);
            resetForm();
        } catch (error) {
            console.error("Error updating company:", error);
            alert("Failed to update company");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this company? This cannot be undone.")) return;
        
        try {
            await deleteDoc(doc(db, "users", user.uid, "companies", id));
        } catch (error) {
            console.error("Error deleting company:", error);
            alert("Failed to delete company");
        }
    };

    const handleEdit = (company) => {
        setFormData({
            companyName: company.companyName || '',
            region: company.region || 'MALAYSIA',
            city: company.city || '',
            address: company.address || '',
            phone: company.phone || '',
            email: company.email || '',
            website: company.website || '',
            contactName: company.contactName || '',
            type: company.type || 'Potential Partner',
            industry: company.industry || '',
            notes: company.notes || '',
            priority: company.priority || 'Medium',
            vipTarget: company.vipTarget || false
        });
        setEditingCompany(company);
    };

    const resetForm = () => {
        setFormData({
            companyName: '',
            region: 'MALAYSIA',
            city: '',
            address: '',
            phone: '',
            email: '',
            website: '',
            contactName: '',
            type: 'Potential Partner',
            industry: '',
            notes: '',
            priority: 'Medium',
            vipTarget: false
        });
    };

    // Export data
    const exportData = useMemo(() => {
        return filteredCompanies.map(c => ({
            company: c.companyName,
            region: c.region,
            city: c.city,
            type: c.type,
            industry: c.industry,
            phone: c.phone,
            email: c.email,
            website: c.website,
            contact: c.contactName,
            priority: c.priority,
            vip: c.vipTarget ? 'Yes' : 'No',
            source: c.source
        }));
    }, [filteredCompanies]);

    // ========================================================================
    // RENDER
    // ========================================================================

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b-2 pb-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-3">
                        <Globe className="text-blue-600" size={32} />
                        Export Partners & Distributors
                    </h1>
                    <p className="text-gray-500 text-sm font-bold mt-1">
                        International B2B relationships • {stats.total} companies • {regions.length - 1} markets
                    </p>
                </div>
                <div className="flex gap-3">
                    <ExportButton 
                        data={exportData}
                        filename={`Karnot_Export_Companies_${new Date().toISOString().split('T')[0]}.csv`}
                        columns={[
                            { key: 'company', label: 'Company' },
                            { key: 'region', label: 'Region' },
                            { key: 'city', label: 'City' },
                            { key: 'type', label: 'Type' },
                            { key: 'phone', label: 'Phone' },
                            { key: 'email', label: 'Email' },
                            { key: 'priority', label: 'Priority' }
                        ]}
                    />
                    <Button onClick={() => setShowAddForm(true)} variant="primary">
                        <Plus size={16} className="mr-2" /> Add Company
                    </Button>
                </div>
            </div>

            {/* Statistics Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
                    <div className="flex items-center justify-between">
                        <Building className="text-blue-600" size={32} />
                        <div className="text-right">
                            <p className="text-xs text-blue-600 font-black uppercase">Total Companies</p>
                            <p className="text-3xl font-black text-blue-900">{stats.total}</p>
                        </div>
                    </div>
                </Card>
                
                <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200">
                    <div className="flex items-center justify-between">
                        <Award className="text-purple-600" size={32} />
                        <div className="text-right">
                            <p className="text-xs text-purple-600 font-black uppercase">VIP Targets</p>
                            <p className="text-3xl font-black text-purple-900">{stats.vips}</p>
                        </div>
                    </div>
                </Card>
                
                <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200">
                    <div className="flex items-center justify-between">
                        <Target className="text-orange-600" size={32} />
                        <div className="text-right">
                            <p className="text-xs text-orange-600 font-black uppercase">High Priority</p>
                            <p className="text-3xl font-black text-orange-900">{stats.highPriority}</p>
                        </div>
                    </div>
                </Card>
                
                <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200">
                    <div className="flex items-center justify-between">
                        <MapPin className="text-green-600" size={32} />
                        <div className="text-right">
                            <p className="text-xs text-green-600 font-black uppercase">Active Markets</p>
                            <p className="text-3xl font-black text-green-900">{regions.length - 1}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Filters */}
            <Card className="p-4">
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                            <Input
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search companies, cities, industries..."
                                className="pl-10 font-bold"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <select
                            value={selectedRegion}
                            onChange={(e) => setSelectedRegion(e.target.value)}
                            className="px-4 py-2 border-2 border-gray-200 rounded-xl font-bold text-sm focus:border-blue-400"
                        >
                            {regions.map(r => (
                                <option key={r} value={r}>
                                    {r === 'ALL' ? '🌍 All Regions' : `${r}`}
                                </option>
                            ))}
                        </select>
                        <select
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                            className="px-4 py-2 border-2 border-gray-200 rounded-xl font-bold text-sm focus:border-blue-400"
                        >
                            {companyTypes.map(t => (
                                <option key={t} value={t}>{t === 'ALL' ? 'All Types' : t}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </Card>

            {/* Companies List */}
            <div className="space-y-3">
                {filteredCompanies.length === 0 ? (
                    <Card className="p-12 text-center">
                        <Building className="mx-auto text-gray-300 mb-4" size={48} />
                        <p className="text-gray-500 font-bold">
                            {searchTerm || selectedRegion !== 'ALL' || selectedType !== 'ALL' 
                                ? 'No companies match your filters' 
                                : 'No export companies yet. Add your first international partner!'}
                        </p>
                    </Card>
                ) : (
                    filteredCompanies.map(company => (
                        <Card key={company.id} className="p-5 hover:shadow-lg transition-all border-l-4 border-l-blue-500">
                            <div className="flex flex-col lg:flex-row justify-between gap-4">
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-start gap-3">
                                        {company.vipTarget && (
                                            <span className="bg-purple-600 text-white px-2 py-1 rounded text-xs font-black">
                                                VIP
                                            </span>
                                        )}
                                        <div className="flex-1">
                                            <h3 className="font-black text-xl text-gray-900">{company.companyName}</h3>
                                            <p className="text-sm font-bold text-gray-500 flex items-center gap-2 mt-1">
                                                <MapPin size={14} />
                                                {company.city}, {company.region}
                                                {company.priority === 'High' && (
                                                    <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-black ml-2">
                                                        HIGH PRIORITY
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm mt-3">
                                        {company.type && (
                                            <p className="flex items-center gap-2">
                                                <Briefcase size={14} className="text-blue-600" />
                                                <span className="font-bold text-gray-700">{company.type}</span>
                                            </p>
                                        )}
                                        {company.industry && (
                                            <p className="flex items-center gap-2">
                                                <Building size={14} className="text-green-600" />
                                                <span className="font-bold text-gray-700">{company.industry}</span>
                                            </p>
                                        )}
                                        {company.phone && (
                                            <p className="flex items-center gap-2">
                                                <Phone size={14} className="text-orange-600" />
                                                <span className="font-bold text-gray-700">{company.phone}</span>
                                            </p>
                                        )}
                                        {company.email && (
                                            <p className="flex items-center gap-2">
                                                <Mail size={14} className="text-purple-600" />
                                                <span className="font-bold text-gray-700">{company.email}</span>
                                            </p>
                                        )}
                                    </div>

                                    {company.website && (
                                        <button
                                            onClick={() => window.open(company.website.startsWith('http') ? company.website : `https://${company.website}`, '_blank')}
                                            className="flex items-center gap-2 text-xs text-blue-600 font-bold hover:underline mt-2"
                                        >
                                            <Globe size={12} />
                                            {company.website}
                                            <ExternalLink size={12} />
                                        </button>
                                    )}

                                    {company.notes && (
                                        <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded mt-2">
                                            {company.notes}
                                        </p>
                                    )}
                                </div>

                                <div className="flex lg:flex-col gap-2">
                                    <Button size="sm" variant="secondary" onClick={() => handleEdit(company)}>
                                        <Edit size={14} />
                                    </Button>
                                    <Button size="sm" variant="danger" onClick={() => handleDelete(company.id)}>
                                        <Trash2 size={14} />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* Add/Edit Modal */}
            {(showAddForm || editingCompany) && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white flex justify-between items-center sticky top-0">
                            <h2 className="text-2xl font-black uppercase">
                                {editingCompany ? 'Edit Company' : 'Add New Company'}
                            </h2>
                            <button onClick={() => {
                                setShowAddForm(false);
                                setEditingCompany(null);
                                resetForm();
                            }}>
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Form fields... (truncated for brevity, includes all fields from formData) */}
                            <Input label="Company Name *" value={formData.companyName} onChange={(e) => setFormData({...formData, companyName: e.target.value})} />
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-black uppercase text-gray-500 mb-2 block">Region *</label>
                                    <select value={formData.region} onChange={(e) => setFormData({...formData, region: e.target.value})} className="w-full p-3 border-2 rounded-xl font-bold">
                                        <option value="MALAYSIA">Malaysia</option>
                                        <option value="THAILAND">Thailand</option>
                                        <option value="VIETNAM">Vietnam</option>
                                        <option value="UK">United Kingdom</option>
                                    </select>
                                </div>
                                <Input label="City" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} />
                            </div>

                            <Input label="Address" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
                            
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                                <Input label="Email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                            </div>

                            <Input label="Website" value={formData.website} onChange={(e) => setFormData({...formData, website: e.target.value})} />
                            <Input label="Primary Contact Name" value={formData.contactName} onChange={(e) => setFormData({...formData, contactName: e.target.value})} />
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-black uppercase text-gray-500 mb-2 block">Company Type</label>
                                    <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} className="w-full p-3 border-2 rounded-xl font-bold">
                                        <option value="Potential Partner">Potential Partner</option>
                                        <option value="VIP Partner Target">VIP Partner Target</option>
                                        <option value="Active Partner">Active Partner</option>
                                        <option value="MCS Installer">MCS Installer (UK)</option>
                                        <option value="ESCO">ESCO</option>
                                        <option value="Distributor">Distributor</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-black uppercase text-gray-500 mb-2 block">Priority</label>
                                    <select value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})} className="w-full p-3 border-2 rounded-xl font-bold">
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                    </select>
                                </div>
                            </div>

                            <Input label="Industry/Sector" value={formData.industry} onChange={(e) => setFormData({...formData, industry: e.target.value})} />
                            <Textarea label="Notes" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={3} />
                            
                            <label className="flex items-center gap-2">
                                <input type="checkbox" checked={formData.vipTarget} onChange={(e) => setFormData({...formData, vipTarget: e.target.checked})} className="rounded" />
                                <span className="text-sm font-bold">Mark as VIP Target</span>
                            </label>
                        </div>

                        <div className="p-6 bg-gray-50 border-t flex gap-3 justify-end">
                            <Button variant="secondary" onClick={() => {
                                setShowAddForm(false);
                                setEditingCompany(null);
                                resetForm();
                            }}>
                                Cancel
                            </Button>
                            <Button variant="primary" onClick={editingCompany ? handleUpdate : handleAdd}>
                                {editingCompany ? 'Update Company' : 'Add Company'}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default ExportCompaniesPage;
