import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { Building, Mail, Phone, Globe, Linkedin, Plus, Edit, Trash2, Search, Filter, DollarSign, MapPin, Users, FileText, Grid, List } from 'lucide-react';
import { importInvestors } from '../utils/importInvestors';
import InvestorFunnel from '../components/InvestorFunnel';

const InvestorsPage = ({ user, contacts }) => {
  const [investors, setInvestors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRegion, setFilterRegion] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingInvestor, setEditingInvestor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'funnel'
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [duplicates, setDuplicates] = useState([]);

  const REGIONS = ['Philippines', 'United Kingdom', 'Malaysia', 'Southeast Asia', 'Global'];
  const INVESTOR_TYPES = ['Venture Capital', 'Family Office', 'Strategic Corporate', 'Impact Investor', 'Revenue-Based Financing', 'Bank/Lender', 'Angel Investor', 'Accelerator', 'Government Fund', 'Utility', 'Energy Company', 'Crowdfunding Platform', 'Infrastructure Fund', 'Climate Fund'];
  const PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

  // Load investors
  useEffect(() => {
    if (user) {
      loadInvestors();
    }
  }, [user]);

  const loadInvestors = async () => {
    if (!user) return;
    
    try {
      const investorsRef = collection(db, 'users', user.uid, 'investors');
      const q = query(investorsRef, orderBy('name', 'asc'));
      const snapshot = await getDocs(q);
      const investorData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setInvestors(investorData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading investors:', error);
      setLoading(false);
    }
  };

  // Import database
  const handleImportDatabase = async () => {
    if (window.confirm('Import 43 investors from database? This will add all investors as companies in your CRM.')) {
      try {
        const count = await importInvestors(user);
        alert(`✅ Successfully imported ${count} investors!`);
        loadInvestors();
      } catch (error) {
        console.error('Import error:', error);
        alert('❌ Import failed. Check console for details.');
      }
    }
  };

  // Delete investor
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this investor?')) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'investors', id));
        loadInvestors();
      } catch (error) {
        console.error('Error deleting investor:', error);
        alert('Failed to delete investor');
      }
    }
  };

  // Find duplicates
  const findDuplicates = () => {
    const nameGroups = {};
    
    // Group investors by similar names
    investors.forEach(investor => {
      const normalizedName = investor.name?.toLowerCase().trim();
      if (!normalizedName) return;
      
      if (!nameGroups[normalizedName]) {
        nameGroups[normalizedName] = [];
      }
      nameGroups[normalizedName].push(investor);
    });
    
    // Find groups with more than one investor
    const duplicateGroups = Object.values(nameGroups)
      .filter(group => group.length > 1)
      .map(group => ({
        name: group[0].name,
        count: group.length,
        investors: group.sort((a, b) => {
          // Sort by creation date (oldest first)
          const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
          const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
          return dateA - dateB;
        })
      }));
    
    setDuplicates(duplicateGroups);
    setShowDuplicates(true);
  };

  // Delete selected duplicates
  const handleDeleteDuplicates = async (investorsToDelete) => {
    if (window.confirm(`Delete ${investorsToDelete.length} duplicate investor${investorsToDelete.length !== 1 ? 's' : ''}?`)) {
      try {
        for (const investor of investorsToDelete) {
          await deleteDoc(doc(db, 'users', user.uid, 'investors', investor.id));
        }
        loadInvestors();
        setShowDuplicates(false);
        alert(`✅ Deleted ${investorsToDelete.length} duplicate${investorsToDelete.length !== 1 ? 's' : ''}!`);
      } catch (error) {
        console.error('Error deleting duplicates:', error);
        alert('Failed to delete some duplicates');
      }
    }
  };

  // Merge duplicates (keep oldest, delete others)
  const handleMergeDuplicates = async (group) => {
    const keepInvestor = group.investors[0]; // Keep the oldest
    const deleteInvestors = group.investors.slice(1); // Delete the rest
    
    if (window.confirm(`Keep "${keepInvestor.name}" and delete ${deleteInvestors.length} duplicate${deleteInvestors.length !== 1 ? 's' : ''}?`)) {
      await handleDeleteDuplicates(deleteInvestors);
    }
  };

  // Filter investors
  const filteredInvestors = investors.filter(inv => {
    const matchesSearch = inv.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         inv.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         inv.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRegion = filterRegion === 'ALL' || inv.region === filterRegion;
    const matchesType = filterType === 'ALL' || inv.type === filterType;
    const matchesPriority = filterPriority === 'ALL' || inv.priority === filterPriority;
    
    return matchesSearch && matchesRegion && matchesType && matchesPriority;
  });

  // Stats
  const stats = {
    total: investors.length,
    critical: investors.filter(i => i.priority === 'CRITICAL').length,
    high: investors.filter(i => i.priority === 'HIGH').length,
    philippines: investors.filter(i => i.region === 'Philippines').length,
    uk: investors.filter(i => i.region === 'United Kingdom').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading investors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-800 uppercase tracking-tight">
            💰 Investor Companies
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage investor relationships, contacts, and fundraising pipeline
          </p>
        </div>
        
        <div className="flex gap-2">
          <div className="flex gap-1 border-2 border-gray-200 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded flex items-center gap-2 text-xs font-bold uppercase transition-all ${
                viewMode === 'grid' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Grid size={14} />
              Grid
            </button>
            <button
              onClick={() => setViewMode('funnel')}
              className={`px-3 py-1.5 rounded flex items-center gap-2 text-xs font-bold uppercase transition-all ${
                viewMode === 'funnel' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <List size={14} />
              Funnel
            </button>
          </div>

          {investors.length > 0 && (
            <button
              onClick={findDuplicates}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-bold uppercase text-xs tracking-wider flex items-center gap-2"
            >
              <Search size={16} />
              Find Duplicates
            </button>
          )}
          
          {investors.length === 0 && (
            <button
              onClick={handleImportDatabase}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold uppercase text-xs tracking-wider flex items-center gap-2"
            >
              <DollarSign size={16} />
              Import 43 Investors
            </button>
          )}
          
          <button
            onClick={() => {
              setEditingInvestor(null);
              setShowAddModal(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold uppercase text-xs tracking-wider flex items-center gap-2"
          >
            <Plus size={16} />
            Add Investor
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg border-2 border-gray-100">
          <div className="text-xs font-bold text-gray-500 uppercase">Total Investors</div>
          <div className="text-2xl font-black text-gray-800">{stats.total}</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border-2 border-red-200">
          <div className="text-xs font-bold text-red-600 uppercase">Critical</div>
          <div className="text-2xl font-black text-red-700">{stats.critical}</div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg border-2 border-orange-200">
          <div className="text-xs font-bold text-orange-600 uppercase">High Priority</div>
          <div className="text-2xl font-black text-orange-700">{stats.high}</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
          <div className="text-xs font-bold text-blue-600 uppercase">Philippines</div>
          <div className="text-2xl font-black text-blue-700">{stats.philippines}</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200">
          <div className="text-xs font-bold text-purple-600 uppercase">UK</div>
          <div className="text-2xl font-black text-purple-700">{stats.uk}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border-2 border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search investors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Region Filter */}
          <select
            value={filterRegion}
            onChange={(e) => setFilterRegion(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Regions</option>
            {REGIONS.map(region => (
              <option key={region} value={region}>{region}</option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Types</option>
            {INVESTOR_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Priorities</option>
            {PRIORITIES.map(priority => (
              <option key={priority} value={priority}>{priority}</option>
            ))}
          </select>
        </div>

        {/* Active Filters */}
        {(searchTerm || filterRegion !== 'ALL' || filterType !== 'ALL' || filterPriority !== 'ALL') && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="text-gray-600 font-medium">Active filters:</span>
            {searchTerm && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">Search: {searchTerm}</span>}
            {filterRegion !== 'ALL' && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">{filterRegion}</span>}
            {filterType !== 'ALL' && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">{filterType}</span>}
            {filterPriority !== 'ALL' && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">{filterPriority}</span>}
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterRegion('ALL');
                setFilterType('ALL');
                setFilterPriority('ALL');
              }}
              className="text-blue-600 hover:underline ml-2"
            >
              Clear all
            </button>
          </div>
        )}

        <div className="mt-2 text-sm text-gray-600">
          Showing {filteredInvestors.length} of {investors.length} investors
        </div>
      </div>

      {/* View Toggle: Grid or Funnel */}
      {viewMode === 'funnel' ? (
        <>
          {console.log('🔍 Funnel mode active, investors count:', investors.length)}
          <InvestorFunnel 
            investors={investors} 
            onRefresh={loadInvestors} 
            user={user} 
          />
        </>
      ) : (
        <>
          {/* Investors Grid */}
          {filteredInvestors.length === 0 ? (
            <div className="bg-white p-12 rounded-lg border-2 border-dashed border-gray-300 text-center">
              <Building className="mx-auto mb-4 text-gray-400" size={48} />
              <h3 className="text-xl font-bold text-gray-700 mb-2">No Investors Found</h3>
              <p className="text-gray-600 mb-4">
                {investors.length === 0 
                  ? 'Import the investor database or add your first investor manually'
                  : 'No investors match your search criteria'}
              </p>
              {investors.length === 0 && (
                <button
                  onClick={handleImportDatabase}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold"
                >
                  📥 Import 43 Investors
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredInvestors.map(investor => (
                <InvestorCard
                  key={investor.id}
                  investor={investor}
                  onEdit={() => {
                    setEditingInvestor(investor);
                    setShowAddModal(true);
                  }}
                  onDelete={() => handleDelete(investor.id)}
                  contacts={contacts}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <InvestorModal
          investor={editingInvestor}
          onSave={async (data) => {
            try {
              if (editingInvestor) {
                await updateDoc(doc(db, 'users', user.uid, 'investors', editingInvestor.id), {
                  ...data,
                  updatedAt: serverTimestamp()
                });
              } else {
                await addDoc(collection(db, 'users', user.uid, 'investors'), {
                  ...data,
                  createdAt: serverTimestamp()
                });
              }
              loadInvestors();
              setShowAddModal(false);
            } catch (error) {
              console.error('Error saving investor:', error);
              alert('Failed to save investor');
            }
          }}
          onCancel={() => setShowAddModal(false)}
          regions={REGIONS}
          types={INVESTOR_TYPES}
          priorities={PRIORITIES}
        />
      )}

      {/* Duplicates Modal */}
      {showDuplicates && (
        <DuplicatesModal
          duplicates={duplicates}
          onMerge={handleMergeDuplicates}
          onClose={() => setShowDuplicates(false)}
        />
      )}
    </div>
  );
};

// Investor Card Component
const InvestorCard = ({ investor, onEdit, onDelete, contacts }) => {
  const priorityColors = {
    CRITICAL: 'bg-red-100 text-red-700 border-red-300',
    HIGH: 'bg-orange-100 text-orange-700 border-orange-300',
    MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    LOW: 'bg-gray-100 text-gray-700 border-gray-300'
  };

  // Find related contacts
  const relatedContacts = contacts?.filter(c => 
    c.company?.toLowerCase() === investor.name?.toLowerCase()
  ) || [];

  return (
    <div className="bg-white rounded-lg border-2 border-gray-100 hover:border-blue-300 transition-all p-4">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-black text-gray-800 text-lg leading-tight mb-1">
            {investor.name}
          </h3>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="font-medium">{investor.type}</span>
            <span>•</span>
            <span>{investor.region}</span>
          </div>
        </div>
        
        <span className={`px-2 py-1 rounded text-xs font-bold border ${priorityColors[investor.priority] || priorityColors.MEDIUM}`}>
          {investor.priority}
        </span>
      </div>

      {/* Contact Info */}
      <div className="space-y-2 mb-3 text-sm">
        {investor.contactPerson && (
          <div className="flex items-center gap-2 text-gray-700">
            <Users size={14} className="text-gray-400" />
            <span>{investor.contactPerson}</span>
          </div>
        )}
        {investor.email && (
          <div className="flex items-center gap-2">
            <Mail size={14} className="text-gray-400" />
            <a href={`mailto:${investor.email}`} className="text-blue-600 hover:underline">
              {investor.email}
            </a>
          </div>
        )}
        {investor.phone && (
          <div className="flex items-center gap-2 text-gray-700">
            <Phone size={14} className="text-gray-400" />
            <span>{investor.phone}</span>
          </div>
        )}
        {investor.website && (
          <div className="flex items-center gap-2">
            <Globe size={14} className="text-gray-400" />
            <a href={investor.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
              {investor.website.replace('https://', '')}
            </a>
          </div>
        )}
        {investor.city && (
          <div className="flex items-center gap-2 text-gray-700">
            <MapPin size={14} className="text-gray-400" />
            <span>{investor.city}</span>
          </div>
        )}
      </div>

      {/* Ticket Size & Fit */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
        {investor.ticketSize && (
          <div className="bg-green-50 p-2 rounded border border-green-200">
            <div className="font-bold text-green-700">Ticket Size</div>
            <div className="text-green-600">{investor.ticketSize}</div>
          </div>
        )}
        {investor.fit && (
          <div className="bg-blue-50 p-2 rounded border border-blue-200">
            <div className="font-bold text-blue-700">Fit Score</div>
            <div className="text-blue-600">{investor.fit}</div>
          </div>
        )}
      </div>

      {/* Focus Areas */}
      {investor.focus && investor.focus.length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-bold text-gray-600 mb-1">Focus Areas:</div>
          <div className="flex flex-wrap gap-1">
            {investor.focus.map((area, idx) => (
              <span key={idx} className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs">
                {area}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Related Contacts */}
      {relatedContacts.length > 0 && (
        <div className="mb-3 p-2 bg-blue-50 rounded border border-blue-200">
          <div className="text-xs font-bold text-blue-700 mb-1">
            {relatedContacts.length} Contact{relatedContacts.length !== 1 ? 's' : ''}
          </div>
          <div className="text-xs text-blue-600">
            {relatedContacts.map(c => `${c.firstName} ${c.lastName}`).join(', ')}
          </div>
        </div>
      )}

      {/* Notes */}
      {investor.notes && (
        <div className="mb-3 text-xs text-gray-600 line-clamp-2">
          {investor.notes}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t">
        <button
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 text-sm font-bold"
        >
          <Edit size={14} />
          Edit
        </button>
        <button
          onClick={onDelete}
          className="flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded hover:bg-red-100 text-sm font-bold"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

// Investor Modal Component
const InvestorModal = ({ investor, onSave, onCancel, regions, types, priorities }) => {
  const [formData, setFormData] = useState(investor || {
    name: '',
    type: 'Venture Capital',
    region: 'Philippines',
    city: '',
    contactPerson: '',
    email: '',
    phone: '',
    website: '',
    linkedin: '',
    ticketSize: '',
    focus: [],
    priority: 'MEDIUM',
    fit: 'MODERATE',
    notes: '',
    stage: 'RESEARCH',
    amount: 0,
    status: 'ACTIVE'
  });

  const [focusInput, setFocusInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const addFocus = () => {
    if (focusInput.trim() && !formData.focus.includes(focusInput.trim())) {
      setFormData({
        ...formData,
        focus: [...(formData.focus || []), focusInput.trim()]
      });
      setFocusInput('');
    }
  };

  const removeFocus = (area) => {
    setFormData({
      ...formData,
      focus: formData.focus.filter(f => f !== area)
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full my-8">
        <h2 className="text-2xl font-black mb-4 uppercase">
          {investor ? 'Edit Investor' : 'Add New Investor'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto pr-2">
            {/* Basic Info */}
            <div className="col-span-2">
              <label className="block text-sm font-bold mb-1">Investor Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">Type *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              >
                {types.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">Region *</label>
              <select
                value={formData.region}
                onChange={(e) => setFormData({...formData, region: e.target.value})}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              >
                {regions.map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">City</label>
              <input
                type="text"
                value={formData.city || ''}
                onChange={(e) => setFormData({...formData, city: e.target.value})}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">Contact Person</label>
              <input
                type="text"
                value={formData.contactPerson || ''}
                onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Contact Details */}
            <div>
              <label className="block text-sm font-bold mb-1">Email</label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">Website</label>
              <input
                type="url"
                value={formData.website || ''}
                onChange={(e) => setFormData({...formData, website: e.target.value})}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">LinkedIn</label>
              <input
                type="url"
                value={formData.linkedin || ''}
                onChange={(e) => setFormData({...formData, linkedin: e.target.value})}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Investment Details */}
            <div>
              <label className="block text-sm font-bold mb-1">Ticket Size</label>
              <input
                type="text"
                placeholder="e.g., $100k-$500k"
                value={formData.ticketSize || ''}
                onChange={(e) => setFormData({...formData, ticketSize: e.target.value})}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: e.target.value})}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              >
                {priorities.map(priority => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">Fit Score</label>
              <select
                value={formData.fit || 'MODERATE'}
                onChange={(e) => setFormData({...formData, fit: e.target.value})}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="EXCELLENT">Excellent</option>
                <option value="VERY GOOD">Very Good</option>
                <option value="GOOD">Good</option>
                <option value="MODERATE">Moderate</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            {/* Focus Areas */}
            <div className="col-span-2">
              <label className="block text-sm font-bold mb-1">Focus Areas</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={focusInput}
                  onChange={(e) => setFocusInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFocus())}
                  placeholder="Add focus area..."
                  className="flex-1 p-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={addFocus}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(formData.focus || []).map((area, idx) => (
                  <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-700 rounded flex items-center gap-2">
                    {area}
                    <button
                      type="button"
                      onClick={() => removeFocus(area)}
                      className="text-purple-900 hover:text-red-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="col-span-2">
              <label className="block text-sm font-bold mb-1">Notes</label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={4}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-6 pt-4 border-t">
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold"
            >
              Save Investor
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 bg-gray-300 rounded hover:bg-gray-400 font-bold"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Duplicates Modal Component
const DuplicatesModal = ({ duplicates, onMerge, onClose }) => {
  if (duplicates.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
          <h2 className="text-2xl font-black mb-4 uppercase text-green-600">
            ✅ No Duplicates Found!
          </h2>
          <p className="text-gray-600 mb-6">
            Your investor database is clean. No duplicate investors detected.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const totalDuplicates = duplicates.reduce((sum, group) => sum + (group.count - 1), 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full my-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-black uppercase text-red-600">
              ⚠️ {totalDuplicates} Duplicate{totalDuplicates !== 1 ? 's' : ''} Found
            </h2>
            <p className="text-gray-600 mt-1">
              {duplicates.length} investor{duplicates.length !== 1 ? 's have' : ' has'} duplicate entries
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {duplicates.map((group, idx) => (
            <div key={idx} className="border-2 border-yellow-200 rounded-lg p-4 bg-yellow-50">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-black text-lg">{group.name}</h3>
                  <p className="text-sm text-gray-600">
                    {group.count} duplicate entries found
                  </p>
                </div>
                <button
                  onClick={() => onMerge(group)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold text-sm"
                >
                  Keep Oldest, Delete {group.count - 1}
                </button>
              </div>

              <div className="space-y-2">
                {group.investors.map((investor, invIdx) => (
                  <div
                    key={investor.id}
                    className={`p-3 rounded-lg border-2 ${
                      invIdx === 0 
                        ? 'bg-green-50 border-green-300' 
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {invIdx === 0 && (
                            <span className="px-2 py-0.5 bg-green-600 text-white rounded text-xs font-bold">
                              KEEP
                            </span>
                          )}
                          {invIdx > 0 && (
                            <span className="px-2 py-0.5 bg-red-600 text-white rounded text-xs font-bold">
                              DELETE
                            </span>
                          )}
                          <span className="text-sm font-bold">{investor.type}</span>
                          <span className="text-sm text-gray-600">•</span>
                          <span className="text-sm text-gray-600">{investor.region}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mt-2">
                          {investor.email && (
                            <div>
                              <span className="font-bold">Email:</span> {investor.email}
                            </div>
                          )}
                          {investor.contactPerson && (
                            <div>
                              <span className="font-bold">Contact:</span> {investor.contactPerson}
                            </div>
                          )}
                          {investor.stage && (
                            <div>
                              <span className="font-bold">Stage:</span> {investor.stage}
                            </div>
                          )}
                          {investor.priority && (
                            <div>
                              <span className="font-bold">Priority:</span> {investor.priority}
                            </div>
                          )}
                          {investor.createdAt && (
                            <div className="col-span-2">
                              <span className="font-bold">Created:</span>{' '}
                              {new Date(investor.createdAt?.toDate?.() || investor.createdAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t flex justify-between items-center">
          <p className="text-sm text-gray-600">
            💡 <strong>Tip:</strong> The oldest entry will be kept (marked in green). Newer duplicates will be deleted.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-300 rounded-lg hover:bg-gray-400 font-bold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvestorsPage;
