import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { Phone, Calendar, User, Building, Mail, Clock, CheckCircle, XCircle, AlertCircle, Plus, Edit, Trash2, Filter, Search, FileText } from 'lucide-react';

const CallCentre = ({ user, mode = 'investor' }) => {
  // mode can be 'investor' or 'export'
  const [calls, setCalls] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [agents, setAgents] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCall, setEditingCall] = useState(null);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterAgent, setFilterAgent] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('upcoming');

  const isInvestorMode = mode === 'investor';
  const title = isInvestorMode ? 'Investor Call Centre' : 'Export Call Centre';
  const collectionName = isInvestorMode ? 'investor_calls' : 'export_calls';
  const companyCollection = isInvestorMode ? 'investors' : 'export_companies';

  const CALL_STATUSES = [
    { id: 'SCHEDULED', label: 'Scheduled', color: 'bg-blue-100 text-blue-700 border-blue-300', icon: Calendar },
    { id: 'COMPLETED', label: 'Completed', color: 'bg-green-100 text-green-700 border-green-300', icon: CheckCircle },
    { id: 'NO_ANSWER', label: 'No Answer', color: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: AlertCircle },
    { id: 'VOICEMAIL', label: 'Voicemail', color: 'bg-orange-100 text-orange-700 border-orange-300', icon: Phone },
    { id: 'CALLBACK_REQUESTED', label: 'Callback Requested', color: 'bg-purple-100 text-purple-700 border-purple-300', icon: Phone },
    { id: 'CANCELLED', label: 'Cancelled', color: 'bg-red-100 text-red-700 border-red-300', icon: XCircle },
    { id: 'RESCHEDULED', label: 'Rescheduled', color: 'bg-indigo-100 text-indigo-700 border-indigo-300', icon: Calendar }
  ];

  const INVESTOR_OUTCOMES = [
    'Interested - Schedule follow-up',
    'Sent pitch deck',
    'Requested financials',
    'Requested term sheet',
    'Declined - Not interested',
    'Declined - Wrong timing',
    'Declined - Outside mandate',
    'Need more information',
    'Will discuss internally',
    'Referred to partner',
    'Other'
  ];

  const EXPORT_OUTCOMES = [
    'Interested - Send quote',
    'Interested - Schedule demo',
    'Sent product catalog',
    'Sent technical specs',
    'Requested pricing',
    'Requested samples',
    'Not qualified - Wrong market',
    'Not qualified - Budget too low',
    'Not interested',
    'Need more information',
    'Will discuss with team',
    'Other'
  ];

  const CALL_OUTCOMES = isInvestorMode ? INVESTOR_OUTCOMES : EXPORT_OUTCOMES;

  useEffect(() => {
    if (user) {
      loadCalls();
      loadCompanies();
      loadAgents();
    }
  }, [user, mode]);

  const loadCalls = async () => {
    if (!user) return;
    try {
      const callsRef = collection(db, 'users', user.uid, collectionName);
      const q = query(callsRef, orderBy('callDate', 'desc'));
      const snapshot = await getDocs(q);
      const callData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCalls(callData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading calls:', error);
      setLoading(false);
    }
  };

  const loadCompanies = async () => {
    if (!user) return;
    try {
      const companiesRef = collection(db, 'users', user.uid, companyCollection);
      const snapshot = await getDocs(companiesRef);
      const companyData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCompanies(companyData);
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  };

  const loadAgents = async () => {
    if (!user) return;
    try {
      const agentsRef = collection(db, 'users', user.uid, 'agents');
      const snapshot = await getDocs(agentsRef);
      const agentData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAgents(agentData);
    } catch (error) {
      console.error('Error loading agents:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this call record?')) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, collectionName, id));
        loadCalls();
      } catch (error) {
        console.error('Error deleting call:', error);
      }
    }
  };

  // Filter calls
  const filteredCalls = calls.filter(call => {
    const matchesStatus = filterStatus === 'ALL' || call.status === filterStatus;
    const matchesAgent = filterAgent === 'ALL' || call.assignedTo === filterAgent;
    const matchesSearch = 
      call.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const now = new Date();
    const callDate = new Date(call.callDate);
    const matchesView = 
      activeView === 'all' ||
      (activeView === 'upcoming' && callDate >= now && call.status === 'SCHEDULED') ||
      (activeView === 'completed' && call.status === 'COMPLETED');
    
    return matchesStatus && matchesAgent && matchesSearch && matchesView;
  });

  // Stats
  const stats = {
    total: calls.length,
    scheduled: calls.filter(c => c.status === 'SCHEDULED').length,
    completed: calls.filter(c => c.status === 'COMPLETED').length,
    today: calls.filter(c => {
      const callDate = new Date(c.callDate);
      const today = new Date();
      return callDate.toDateString() === today.toDateString() && c.status === 'SCHEDULED';
    }).length,
    thisWeek: calls.filter(c => {
      const callDate = new Date(c.callDate);
      const today = new Date();
      const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      return callDate >= today && callDate <= weekFromNow && c.status === 'SCHEDULED';
    }).length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading call centre...</p>
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
            📞 {title}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {isInvestorMode 
              ? 'Schedule and track investor outreach calls and appointments'
              : 'Schedule and track export prospect calls and appointments'}
          </p>
        </div>
        
        <button
          onClick={() => {
            setEditingCall(null);
            setShowAddModal(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold uppercase text-xs tracking-wider flex items-center gap-2"
        >
          <Plus size={16} />
          Schedule Call
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg border-2 border-gray-100">
          <div className="text-xs font-bold text-gray-500 uppercase">Total Calls</div>
          <div className="text-2xl font-black text-gray-800">{stats.total}</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
          <div className="text-xs font-bold text-blue-600 uppercase">Scheduled</div>
          <div className="text-2xl font-black text-blue-700">{stats.scheduled}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
          <div className="text-xs font-bold text-green-600 uppercase">Completed</div>
          <div className="text-2xl font-black text-green-700">{stats.completed}</div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg border-2 border-orange-200">
          <div className="text-xs font-bold text-orange-600 uppercase">Today</div>
          <div className="text-2xl font-black text-orange-700">{stats.today}</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200">
          <div className="text-xs font-bold text-purple-600 uppercase">This Week</div>
          <div className="text-2xl font-black text-purple-700">{stats.thisWeek}</div>
        </div>
      </div>

      {/* View Tabs */}
      <div className="bg-white rounded-lg border-2 border-gray-100 p-1 flex gap-1">
        <button
          onClick={() => setActiveView('upcoming')}
          className={`flex-1 px-4 py-2 rounded font-bold text-xs uppercase transition-all ${
            activeView === 'upcoming'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Calendar size={14} className="inline mr-2" />
          Upcoming ({stats.scheduled})
        </button>
        <button
          onClick={() => setActiveView('completed')}
          className={`flex-1 px-4 py-2 rounded font-bold text-xs uppercase transition-all ${
            activeView === 'completed'
              ? 'bg-green-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <CheckCircle size={14} className="inline mr-2" />
          Completed ({stats.completed})
        </button>
        <button
          onClick={() => setActiveView('all')}
          className={`flex-1 px-4 py-2 rounded font-bold text-xs uppercase transition-all ${
            activeView === 'all'
              ? 'bg-gray-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          All Calls ({stats.total})
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border-2 border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search companies, contacts, notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Statuses</option>
            {CALL_STATUSES.map(status => (
              <option key={status.id} value={status.id}>{status.label}</option>
            ))}
          </select>

          <select
            value={filterAgent}
            onChange={(e) => setFilterAgent(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Team Members</option>
            <option value="Stuart Cox">Stuart Cox</option>
            <option value="Lenilia Cox">Lenilia Cox</option>
            {agents.map(agent => (
              <option key={agent.id} value={agent.name}>{agent.name}</option>
            ))}
          </select>
        </div>

        <div className="mt-2 text-sm text-gray-600">
          Showing {filteredCalls.length} of {calls.length} calls
        </div>
      </div>

      {/* Calls List */}
      {filteredCalls.length === 0 ? (
        <div className="bg-white p-12 rounded-lg border-2 border-dashed border-gray-300 text-center">
          <Phone className="mx-auto mb-4 text-gray-400" size={48} />
          <h3 className="text-xl font-bold text-gray-700 mb-2">No Calls Found</h3>
          <p className="text-gray-600 mb-4">
            {calls.length === 0 
              ? `Schedule your first ${isInvestorMode ? 'investor' : 'export'} call to get started`
              : 'No calls match your filters'}
          </p>
          {calls.length === 0 && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold"
            >
              📞 Schedule First Call
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCalls.map(call => (
            <CallCard
              key={call.id}
              call={call}
              statuses={CALL_STATUSES}
              onEdit={() => {
                setEditingCall(call);
                setShowAddModal(true);
              }}
              onDelete={() => handleDelete(call.id)}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <CallModal
          call={editingCall}
          companies={companies}
          agents={agents}
          statuses={CALL_STATUSES}
          outcomes={CALL_OUTCOMES}
          onSave={async (data) => {
            try {
              if (editingCall) {
                await updateDoc(doc(db, 'users', user.uid, collectionName, editingCall.id), {
                  ...data,
                  updatedAt: serverTimestamp()
                });
              } else {
                await addDoc(collection(db, 'users', user.uid, collectionName), {
                  ...data,
                  createdAt: serverTimestamp()
                });
              }
              loadCalls();
              setShowAddModal(false);
            } catch (error) {
              console.error('Error saving call:', error);
              alert('Failed to save call');
            }
          }}
          onCancel={() => setShowAddModal(false)}
          mode={mode}
        />
      )}
    </div>
  );
};

// Call Card Component
const CallCard = ({ call, statuses, onEdit, onDelete }) => {
  const status = statuses.find(s => s.id === call.status) || statuses[0];
  const callDate = new Date(call.callDate);
  const isToday = callDate.toDateString() === new Date().toDateString();

  return (
    <div className={`bg-white rounded-lg border-2 p-4 hover:border-blue-300 transition-all ${
      isToday && call.status === 'SCHEDULED' ? 'border-orange-300 bg-orange-50' : 'border-gray-100'
    }`}>
      <div className="flex flex-col md:flex-row md:items-start gap-4">
        {/* Left: Date & Time */}
        <div className={`flex-shrink-0 text-center p-3 rounded-lg ${
          isToday ? 'bg-orange-100 border-2 border-orange-300' : 'bg-gray-50 border-2 border-gray-200'
        }`}>
          <div className={`text-2xl font-black ${isToday ? 'text-orange-700' : 'text-gray-700'}`}>
            {callDate.getDate()}
          </div>
          <div className={`text-xs font-bold uppercase ${isToday ? 'text-orange-600' : 'text-gray-600'}`}>
            {callDate.toLocaleDateString('en-US', { month: 'short' })}
          </div>
          <div className={`text-xs mt-1 ${isToday ? 'text-orange-600' : 'text-gray-600'}`}>
            {call.callTime || '—'}
          </div>
        </div>

        {/* Middle: Call Details */}
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-black text-lg text-gray-800">{call.companyName}</h3>
              {call.contactPerson && (
                <p className="text-sm text-gray-600">
                  <User size={12} className="inline mr-1" />
                  {call.contactPerson}
                </p>
              )}
              {call.country && (
                <p className="text-xs text-gray-500">
                  📍 {call.country}
                </p>
              )}
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${status.color}`}>
              {status.label}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-600 mb-2">
            {call.phone && (
              <div>
                <Phone size={12} className="inline mr-1" />
                {call.phone}
              </div>
            )}
            {call.email && (
              <div className="truncate">
                <Mail size={12} className="inline mr-1" />
                {call.email}
              </div>
            )}
            {call.assignedTo && (
              <div>
                <User size={12} className="inline mr-1" />
                {call.assignedTo}
              </div>
            )}
            {call.duration && (
              <div>
                <Clock size={12} className="inline mr-1" />
                {call.duration} min
              </div>
            )}
          </div>

          {call.outcome && (
            <div className="mb-2 p-2 bg-blue-50 rounded border border-blue-200 text-xs">
              <span className="font-bold text-blue-700">Outcome:</span> {call.outcome}
            </div>
          )}

          {call.notes && (
            <p className="text-sm text-gray-700 line-clamp-2">{call.notes}</p>
          )}

          {call.followUpDate && (
            <div className="mt-2 text-xs text-purple-600 font-bold">
              📅 Follow-up: {new Date(call.followUpDate).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex md:flex-col gap-2">
          <button
            onClick={onEdit}
            className="flex-1 md:flex-none px-3 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 text-xs font-bold flex items-center justify-center gap-1"
          >
            <Edit size={14} />
            Edit
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-2 bg-red-50 text-red-700 rounded hover:bg-red-100 text-xs font-bold"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

// Call Modal Component
const CallModal = ({ call, companies, agents, statuses, outcomes, onSave, onCancel, mode }) => {
  const isInvestorMode = mode === 'investor';
  
  const [formData, setFormData] = useState(call || {
    companyId: '',
    companyName: '',
    contactPerson: '',
    phone: '',
    email: '',
    country: '',
    callDate: '',
    callTime: '',
    duration: '',
    assignedTo: 'Stuart Cox',
    status: 'SCHEDULED',
    outcome: '',
    notes: '',
    followUpDate: ''
  });

  // Auto-fill company details when company is selected
  const handleCompanyChange = (companyId) => {
    const company = companies.find(c => c.id === companyId);
    if (company) {
      setFormData({
        ...formData,
        companyId,
        companyName: company.name,
        contactPerson: company.contactPerson || '',
        phone: company.phone || '',
        email: company.email || '',
        country: company.country || company.region || ''
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 max-w-3xl w-full my-8">
        <h2 className="text-2xl font-black mb-4 uppercase">
          {call ? 'Edit Call' : 'Schedule New Call'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2">
            {/* Company Selection */}
            <div className="col-span-2">
              <label className="block text-sm font-bold mb-1">
                {isInvestorMode ? 'Investor' : 'Export Company'} *
              </label>
              <select
                required
                value={formData.companyId}
                onChange={(e) => handleCompanyChange(e.target.value)}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select company...</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.name} {company.country ? `- ${company.country}` : company.region ? `- ${company.region}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">Contact Person</label>
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-bold mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">Call Date *</label>
              <input
                type="date"
                required
                value={formData.callDate}
                onChange={(e) => setFormData({...formData, callDate: e.target.value})}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">Call Time</label>
              <input
                type="time"
                value={formData.callTime}
                onChange={(e) => setFormData({...formData, callTime: e.target.value})}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">Duration (minutes)</label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({...formData, duration: e.target.value})}
                placeholder="30"
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">Assigned To</label>
              <select
                value={formData.assignedTo}
                onChange={(e) => setFormData({...formData, assignedTo: e.target.value})}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="Stuart Cox">Stuart Cox</option>
                <option value="Lenilia Cox">Lenilia Cox</option>
                {agents.map(agent => (
                  <option key={agent.id} value={agent.name}>{agent.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">Status *</label>
              <select
                required
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              >
                {statuses.map(status => (
                  <option key={status.id} value={status.id}>{status.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">Outcome</label>
              <select
                value={formData.outcome}
                onChange={(e) => setFormData({...formData, outcome: e.target.value})}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select outcome...</option>
                {outcomes.map(outcome => (
                  <option key={outcome} value={outcome}>{outcome}</option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-bold mb-1">Follow-up Date</label>
              <input
                type="date"
                value={formData.followUpDate}
                onChange={(e) => setFormData({...formData, followUpDate: e.target.value})}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-bold mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={4}
                placeholder="Call notes, discussion points, next steps..."
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-6 pt-4 border-t">
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold"
            >
              Save Call
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

export default CallCentre;

