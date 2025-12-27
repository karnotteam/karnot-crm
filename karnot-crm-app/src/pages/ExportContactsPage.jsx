import React, { useState, useMemo } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from "firebase/firestore";
import {
    Plus, X, Edit, Trash2, User, Search, Mail, Phone,
    Building, MapPin, Briefcase, Globe, Award, Users, Download
} from 'lucide-react';
import { Card, Button, Input, Textarea } from '../data/constants.jsx';
import { ExportButton } from '../utils/ExcelExport.jsx';

// ============================================================================
// EXPORT CONTACTS PAGE - International Business Contacts
// ============================================================================

const ExportContactsPage = ({ contacts, companies, user }) => {
    
    // Filter to show contacts linked to export companies
    const exportCompanies = useMemo(() => {
        return (companies || []).filter(c => c.isExportTarget === true);
    }, [companies]);

    const exportCompanyIds = useMemo(() => {
        return new Set(exportCompanies.map(c => c.id));
    }, [exportCompanies]);

    const exportContacts = useMemo(() => {
        return (contacts || []).filter(c => 
            c.isExportContact === true || exportCompanyIds.has(c.companyId)
        );
    }, [contacts, exportCompanyIds]);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCompany, setSelectedCompany] = useState('ALL');
    const [selectedRole, setSelectedRole] = useState('ALL');
    const [editingContact, setEditingContact] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    
    // Form state
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        title: '',
        email: '',
        phone: '',
        mobile: '',
        companyId: '',
        companyName: '',
        role: 'Decision Maker',
        department: '',
        notes: '',
        linkedin: '',
        isPrimaryContact: false
    });

    // ========================================================================
    // FILTERS & COMPUTED VALUES
    // ========================================================================

    const roles = useMemo(() => {
        const roleSet = new Set(exportContacts.map(c => c.role).filter(Boolean));
        return ['ALL', ...Array.from(roleSet).sort()];
    }, [exportContacts]);

    const filteredContacts = useMemo(() => {
        return exportContacts.filter(contact => {
            const matchesSearch = !searchTerm || 
                contact.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                contact.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                contact.companyName?.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesCompany = selectedCompany === 'ALL' || contact.companyId === selectedCompany;
            const matchesRole = selectedRole === 'ALL' || contact.role === selectedRole;
            
            return matchesSearch && matchesCompany && matchesRole;
        });
    }, [exportContacts, searchTerm, selectedCompany, selectedRole]);

    // Statistics
    const stats = useMemo(() => {
        const total = exportContacts.length;
        const withEmail = exportContacts.filter(c => c.email).length;
        const withPhone = exportContacts.filter(c => c.phone || c.mobile).length;
        const primary = exportContacts.filter(c => c.isPrimaryContact).length;
        
        return { total, withEmail, withPhone, primary };
    }, [exportContacts]);

    // ========================================================================
    // HANDLERS
    // ========================================================================

    const handleAdd = async () => {
        if (!user || !formData.firstName.trim() || !formData.lastName.trim()) {
            alert("First and last name are required");
            return;
        }

        try {
            const selectedCompany = exportCompanies.find(c => c.id === formData.companyId);
            
            await addDoc(collection(db, "users", user.uid, "contacts"), {
                ...formData,
                companyName: selectedCompany?.companyName || formData.companyName,
                isExportContact: true,
                createdAt: serverTimestamp()
            });

            resetForm();
            setShowAddForm(false);
        } catch (error) {
            console.error("Error adding contact:", error);
            alert("Failed to add contact");
        }
    };

    const handleUpdate = async () => {
        if (!user || !editingContact) return;

        try {
            const selectedCompany = exportCompanies.find(c => c.id === formData.companyId);
            
            await updateDoc(doc(db, "users", user.uid, "contacts", editingContact.id), {
                ...formData,
                companyName: selectedCompany?.companyName || formData.companyName,
                updatedAt: serverTimestamp()
            });

            setEditingContact(null);
            resetForm();
        } catch (error) {
            console.error("Error updating contact:", error);
            alert("Failed to update contact");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this contact? This cannot be undone.")) return;
        
        try {
            await deleteDoc(doc(db, "users", user.uid, "contacts", id));
        } catch (error) {
            console.error("Error deleting contact:", error);
            alert("Failed to delete contact");
        }
    };

    const handleEdit = (contact) => {
        setFormData({
            firstName: contact.firstName || '',
            lastName: contact.lastName || '',
            title: contact.title || '',
            email: contact.email || '',
            phone: contact.phone || '',
            mobile: contact.mobile || '',
            companyId: contact.companyId || '',
            companyName: contact.companyName || '',
            role: contact.role || 'Decision Maker',
            department: contact.department || '',
            notes: contact.notes || '',
            linkedin: contact.linkedin || '',
            isPrimaryContact: contact.isPrimaryContact || false
        });
        setEditingContact(contact);
    };

    const resetForm = () => {
        setFormData({
            firstName: '',
            lastName: '',
            title: '',
            email: '',
            phone: '',
            mobile: '',
            companyId: '',
            companyName: '',
            role: 'Decision Maker',
            department: '',
            notes: '',
            linkedin: '',
            isPrimaryContact: false
        });
    };

    // Get company name for contact
    const getCompanyName = (contact) => {
        if (contact.companyName) return contact.companyName;
        const company = exportCompanies.find(c => c.id === contact.companyId);
        return company?.companyName || 'Unknown Company';
    };

    // Export data
    const exportData = useMemo(() => {
        return filteredContacts.map(c => ({
            name: `${c.firstName} ${c.lastName}`,
            title: c.title,
            company: getCompanyName(c),
            role: c.role,
            email: c.email,
            phone: c.phone,
            mobile: c.mobile,
            department: c.department,
            primary: c.isPrimaryContact ? 'Yes' : 'No'
        }));
    }, [filteredContacts]);

    // ========================================================================
    // RENDER
    // ========================================================================

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b-2 pb-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-3">
                        <Users className="text-purple-600" size={32} />
                        Export Contacts
                    </h1>
                    <p className="text-gray-500 text-sm font-bold mt-1">
                        International business contacts • {stats.total} people • {exportCompanies.length} companies
                    </p>
                </div>
                <div className="flex gap-3">
                    <ExportButton 
                        data={exportData}
                        filename={`Karnot_Export_Contacts_${new Date().toISOString().split('T')[0]}.csv`}
                        columns={[
                            { key: 'name', label: 'Name' },
                            { key: 'title', label: 'Title' },
                            { key: 'company', label: 'Company' },
                            { key: 'role', label: 'Role' },
                            { key: 'email', label: 'Email' },
                            { key: 'phone', label: 'Phone' }
                        ]}
                    />
                    <Button onClick={() => setShowAddForm(true)} variant="primary">
                        <Plus size={16} className="mr-2" /> Add Contact
                    </Button>
                </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200">
                    <div className="flex items-center justify-between">
                        <Users className="text-purple-600" size={28} />
                        <div className="text-right">
                            <p className="text-xs text-purple-600 font-black uppercase">Total Contacts</p>
                            <p className="text-3xl font-black text-purple-900">{stats.total}</p>
                        </div>
                    </div>
                </Card>
                
                <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
                    <div className="flex items-center justify-between">
                        <Mail className="text-blue-600" size={28} />
                        <div className="text-right">
                            <p className="text-xs text-blue-600 font-black uppercase">With Email</p>
                            <p className="text-3xl font-black text-blue-900">{stats.withEmail}</p>
                        </div>
                    </div>
                </Card>
                
                <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200">
                    <div className="flex items-center justify-between">
                        <Phone className="text-green-600" size={28} />
                        <div className="text-right">
                            <p className="text-xs text-green-600 font-black uppercase">With Phone</p>
                            <p className="text-3xl font-black text-green-900">{stats.withPhone}</p>
                        </div>
                    </div>
                </Card>
                
                <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200">
                    <div className="flex items-center justify-between">
                        <Award className="text-orange-600" size={28} />
                        <div className="text-right">
                            <p className="text-xs text-orange-600 font-black uppercase">Primary Contacts</p>
                            <p className="text-3xl font-black text-orange-900">{stats.primary}</p>
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
                                placeholder="Search contacts, companies, emails..."
                                className="pl-10 font-bold"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <select
                            value={selectedCompany}
                            onChange={(e) => setSelectedCompany(e.target.value)}
                            className="px-4 py-2 border-2 border-gray-200 rounded-xl font-bold text-sm focus:border-purple-400"
                        >
                            <option value="ALL">All Companies</option>
                            {exportCompanies.map(c => (
                                <option key={c.id} value={c.id}>{c.companyName}</option>
                            ))}
                        </select>
                        <select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                            className="px-4 py-2 border-2 border-gray-200 rounded-xl font-bold text-sm focus:border-purple-400"
                        >
                            {roles.map(r => (
                                <option key={r} value={r}>{r === 'ALL' ? 'All Roles' : r}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </Card>

            {/* Contacts List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredContacts.length === 0 ? (
                    <Card className="col-span-full p-12 text-center">
                        <User className="mx-auto text-gray-300 mb-4" size={48} />
                        <p className="text-gray-500 font-bold">
                            {searchTerm || selectedCompany !== 'ALL' || selectedRole !== 'ALL' 
                                ? 'No contacts match your filters' 
                                : 'No export contacts yet. Add your first international contact!'}
                        </p>
                    </Card>
                ) : (
                    filteredContacts.map(contact => (
                        <Card key={contact.id} className="p-5 hover:shadow-lg transition-all border-l-4 border-l-purple-500">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-black text-lg text-gray-900">
                                            {contact.firstName} {contact.lastName}
                                        </h3>
                                        {contact.isPrimaryContact && (
                                            <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-black">
                                                PRIMARY
                                            </span>
                                        )}
                                    </div>
                                    {contact.title && (
                                        <p className="text-sm font-bold text-gray-600">{contact.title}</p>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="secondary" onClick={() => handleEdit(contact)}>
                                        <Edit size={14} />
                                    </Button>
                                    <Button size="sm" variant="danger" onClick={() => handleDelete(contact.id)}>
                                        <Trash2 size={14} />
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2 text-sm">
                                <p className="flex items-center gap-2">
                                    <Building size={14} className="text-blue-600" />
                                    <span className="font-bold text-gray-700">{getCompanyName(contact)}</span>
                                </p>
                                
                                {contact.role && (
                                    <p className="flex items-center gap-2">
                                        <Briefcase size={14} className="text-purple-600" />
                                        <span className="font-bold text-gray-700">{contact.role}</span>
                                    </p>
                                )}

                                {contact.email && (
                                    <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-blue-600 hover:underline">
                                        <Mail size={14} />
                                        <span className="font-bold">{contact.email}</span>
                                    </a>
                                )}

                                {contact.phone && (
                                    <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-green-600 hover:underline">
                                        <Phone size={14} />
                                        <span className="font-bold">{contact.phone}</span>
                                    </a>
                                )}

                                {contact.mobile && contact.mobile !== contact.phone && (
                                    <p className="flex items-center gap-2">
                                        <Phone size={14} className="text-green-600" />
                                        <span className="font-bold text-gray-700">{contact.mobile} (Mobile)</span>
                                    </p>
                                )}

                                {contact.linkedin && (
                                    <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-700 hover:underline">
                                        <Globe size={14} />
                                        <span className="font-bold">LinkedIn Profile</span>
                                    </a>
                                )}
                            </div>

                            {contact.notes && (
                                <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded mt-3">
                                    {contact.notes}
                                </p>
                            )}
                        </Card>
                    ))
                )}
            </div>

            {/* Add/Edit Modal */}
            {(showAddForm || editingContact) && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white flex justify-between items-center sticky top-0">
                            <h2 className="text-2xl font-black uppercase">
                                {editingContact ? 'Edit Contact' : 'Add New Contact'}
                            </h2>
                            <button onClick={() => {
                                setShowAddForm(false);
                                setEditingContact(null);
                                resetForm();
                            }}>
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="First Name *" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} />
                                <Input label="Last Name *" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} />
                            </div>

                            <Input label="Job Title" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />

                            <div>
                                <label className="text-xs font-black uppercase text-gray-500 mb-2 block">Company</label>
                                <select value={formData.companyId} onChange={(e) => setFormData({...formData, companyId: e.target.value})} className="w-full p-3 border-2 rounded-xl font-bold">
                                    <option value="">Select Company</option>
                                    {exportCompanies.map(c => (
                                        <option key={c.id} value={c.id}>{c.companyName}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-black uppercase text-gray-500 mb-2 block">Role</label>
                                    <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className="w-full p-3 border-2 rounded-xl font-bold">
                                        <option value="Decision Maker">Decision Maker</option>
                                        <option value="Technical Contact">Technical Contact</option>
                                        <option value="Procurement">Procurement</option>
                                        <option value="Management">Management</option>
                                        <option value="Sales">Sales</option>
                                        <option value="Operations">Operations</option>
                                    </select>
                                </div>
                                <Input label="Department" value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} />
                            </div>

                            <Input label="Email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                            
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                                <Input label="Mobile" value={formData.mobile} onChange={(e) => setFormData({...formData, mobile: e.target.value})} />
                            </div>

                            <Input label="LinkedIn URL" value={formData.linkedin} onChange={(e) => setFormData({...formData, linkedin: e.target.value})} />
                            
                            <Textarea label="Notes" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={3} />
                            
                            <label className="flex items-center gap-2">
                                <input type="checkbox" checked={formData.isPrimaryContact} onChange={(e) => setFormData({...formData, isPrimaryContact: e.target.checked})} className="rounded" />
                                <span className="text-sm font-bold">Primary Contact for this Company</span>
                            </label>
                        </div>

                        <div className="p-6 bg-gray-50 border-t flex gap-3 justify-end">
                            <Button variant="secondary" onClick={() => {
                                setShowAddForm(false);
                                setEditingContact(null);
                                resetForm();
                            }}>
                                Cancel
                            </Button>
                            <Button variant="primary" onClick={editingContact ? handleUpdate : handleAdd}>
                                {editingContact ? 'Update Contact' : 'Add Contact'}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default ExportContactsPage;
