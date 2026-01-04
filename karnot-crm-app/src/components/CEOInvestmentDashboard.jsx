import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
    collection, addDoc, updateDoc, deleteDoc, doc, 
    getDocs, query, orderBy, where 
} from 'firebase/firestore';

// --- NEW IMPORT ---
import FundraisingTaskBoard from './FundraisingTaskBoard'; 

const CEOInvestmentDashboard = ({ user }) => { // Added { user } prop here so we can pass it to the Board
  const [investors, setInvestors] = useState([]);
  const [strategies, setStrategies] = useState([]);
  const [activeTab, setActiveTab] = useState('pipeline');
  const [showAddInvestor, setShowAddInvestor] = useState(false);
  const [selectedInvestor, setSelectedInvestor] = useState(null);
  
  // Filters
  const [filterStage, setFilterStage] = useState('ALL');
  const [filterRegion, setFilterRegion] = useState('ALL');
  
  // Investment stages
  const STAGES = [
    { id: 'RESEARCH', label: 'Research', color: 'bg-gray-200' },
    { id: 'OUTREACH', label: 'Outreach', color: 'bg-blue-200' },
    { id: 'MEETING', label: 'Meeting', color: 'bg-yellow-200' },
    { id: 'DILIGENCE', label: 'Due Diligence', color: 'bg-orange-200' },
    { id: 'TERM_SHEET', label: 'Term Sheet', color: 'bg-purple-200' },
    { id: 'LEGAL', label: 'Legal/Closing', color: 'bg-green-200' },
    { id: 'CLOSED', label: 'Closed Won', color: 'bg-green-500' },
    { id: 'PASSED', label: 'Passed', color: 'bg-red-200' }
  ];

  const REGIONS = ['Philippines', 'United Kingdom', 'Malaysia', 'Southeast Asia', 'Global'];
  const INVESTOR_TYPES = ['Venture Capital', 'Family Office', 'Strategic Corporate', 'Impact Investor', 'Revenue-Based Financing', 'Bank/Lender', 'Angel Investor'];

  // Load investors from Firebase
  useEffect(() => {
    loadInvestors();
    loadStrategies();
  }, [user]); // Re-load if user changes

  const loadInvestors = async () => {
    try {
      // NOTE: Using your original logic. If you want per-user data, change this to:
      // collection(db, 'users', user.uid, 'investors')
      const investorsRef = collection(db, 'investors'); 
      const q = query(investorsRef, orderBy('lastContact', 'desc'));
      const snapshot = await getDocs(q);
      const investorData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setInvestors(investorData);
    } catch (error) {
      console.error('Error loading investors:', error);
    }
  };

  const loadStrategies = async () => {
    try {
      const strategiesRef = collection(db, 'investmentStrategies');
      const snapshot = await getDocs(strategiesRef);
      const strategyData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setStrategies(strategyData);
    } catch (error) {
      console.error('Error loading strategies:', error);
    }
  };

  // Metrics Calculation (Restored)
  const metrics = {
    totalPipeline: investors.reduce((sum, inv) => sum + (inv.amount || 0), 0),
    weightedPipeline: investors.reduce((sum, inv) => {
      const probability = getProbability(inv.stage);
      return sum + (inv.amount || 0) * (probability / 100);
    }, 0),
    activeConversations: investors.filter(inv => 
      ['OUTREACH', 'MEETING', 'DILIGENCE', 'TERM_SHEET', 'LEGAL'].includes(inv.stage)
    ).length,
    averageDaysInStage: calculateAvgDaysInStage(),
    closedWon: investors.filter(inv => inv.stage === 'CLOSED').length,
    closedAmount: investors.filter(inv => inv.stage === 'CLOSED')
      .reduce((sum, inv) => sum + (inv.amount || 0), 0),
    documentsShared: investors.reduce((sum, inv) => sum + (inv.documentsShared?.length || 0), 0)
  };

  function getProbability(stage) {
    const probabilities = {
      'RESEARCH': 5, 'OUTREACH': 10, 'MEETING': 25, 'DILIGENCE': 50,
      'TERM_SHEET': 75, 'LEGAL': 90, 'CLOSED': 100, 'PASSED': 0
    };
    return probabilities[stage] || 0;
  }

  function calculateAvgDaysInStage() {
    const active = investors.filter(inv => inv.stageEnteredDate);
    if (active.length === 0) return 0;
    
    const totalDays = active.reduce((sum, inv) => {
      const entered = new Date(inv.stageEnteredDate);
      const now = new Date();
      const days = Math.floor((now - entered) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0);
    
    return Math.round(totalDays / active.length);
  }

  // Filter Logic
  const filteredInvestors = investors.filter(inv => {
    if (filterStage !== 'ALL' && inv.stage !== filterStage) return false;
    if (filterRegion !== 'ALL' && inv.region !== filterRegion) return false;
    return true;
  });

  // --- INVESTOR FORM COMPONENT (Internal) ---
  const InvestorForm = ({ investor, onSave, onCancel }) => {
    const [formData, setFormData] = useState(investor || {
      name: '', type: 'Venture Capital', region: 'Philippines', stage: 'RESEARCH',
      amount: 0, contactPerson: '', email: '', phone: '', linkedin: '', website: '',
      notes: '', focus: [], ticketSize: '', fit: 'MODERATE', priority: 'MEDIUM',
      lastContact: new Date().toISOString(),
      stageEnteredDate: new Date().toISOString(),
      documentsShared: [], meetings: [], nextAction: '', nextActionDate: ''
    });

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        if (investor?.id) {
          await updateDoc(doc(db, 'investors', investor.id), formData);
        } else {
          await addDoc(collection(db, 'investors'), formData);
        }
        loadInvestors();
        onSave();
      } catch (error) {
        console.error('Error saving investor:', error);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <h2 className="text-2xl font-bold mb-4">{investor ? 'Edit Investor' : 'Add New Investor'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Investor Name *</label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full p-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type *</label>
                <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} className="w-full p-2 border rounded">
                  {INVESTOR_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Region *</label>
                <select value={formData.region} onChange={(e) => setFormData({...formData, region: e.target.value})} className="w-full p-2 border rounded">
                  {REGIONS.map(region => <option key={region} value={region}>{region}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Stage *</label>
                <select value={formData.stage} onChange={(e) => setFormData({...formData, stage: e.target.value, stageEnteredDate: new Date().toISOString()})} className="w-full p-2 border rounded">
                  {STAGES.map(stage => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
                </select>
              </div>
              <div>
                 <label className="block text-sm font-medium mb-1">Target Amount (USD)</label>
                 <input type="number" value={formData.amount} onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})} className="w-full p-2 border rounded" />
              </div>
              {/* Simplified fields for brevity in this display, keeping logic same as yours */}
              <div><label className="block text-sm font-medium mb-1">Contact Person</label><input type="text" value={formData.contactPerson} onChange={(e) => setFormData({...formData, contactPerson: e.target.value})} className="w-full p-2 border rounded"/></div>
              <div><label className="block text-sm font-medium mb-1">Email</label><input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full p-2 border rounded"/></div>
              <div><label className="block text-sm font-medium mb-1">Priority</label><select value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})} className="w-full p-2 border rounded"><option value="CRITICAL">Critical</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option></select></div>
              <div className="col-span-2"><label className="block text-sm font-medium mb-1">Next Action</label><input type="text" value={formData.nextAction} onChange={(e) => setFormData({...formData, nextAction: e.target.value})} className="w-full p-2 border rounded"/></div>
            </div>
            <div className="flex gap-2 mt-6">
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save Investor</button>
              <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // --- MAIN RENDER ---
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">CEO Investment Dashboard</h1>
        <p className="text-gray-600">Target: $250k Convertible Note | Track investor pipeline and fundraising progress</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Pipeline</div>
          <div className="text-2xl font-bold">${metrics.totalPipeline.toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">Weighted: ${Math.round(metrics.weightedPipeline).toLocaleString()}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Active Conversations</div>
          <div className="text-2xl font-bold">{metrics.activeConversations}</div>
          <div className="text-xs text-gray-500 mt-1">Avg. {metrics.averageDaysInStage} days in stage</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Closed Won</div>
          <div className="text-2xl font-bold text-green-600">${metrics.closedAmount.toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">{metrics.closedWon} investor{metrics.closedWon !== 1 ? 's' : ''}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Documents Shared</div>
          <div className="text-2xl font-bold">{metrics.documentsShared}</div>
          <div className="text-xs text-gray-500 mt-1">Across {investors.length} prospects</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="flex border-b overflow-x-auto">
          {/* UPDATED TAB LIST with 'roadmap' */}
          {['pipeline', 'roadmap', 'strategies', 'documents', 'analytics'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-medium capitalize whitespace-nowrap ${
                activeTab === tab ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'roadmap' ? 'Cambridge Roadmap' : tab}
            </button>
          ))}
        </div>

        {/* 1. PIPELINE TAB */}
        {activeTab === 'pipeline' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex gap-4">
                <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)} className="p-2 border rounded">
                  <option value="ALL">All Stages</option>
                  {STAGES.map(stage => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
                </select>
                <select value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)} className="p-2 border rounded">
                  <option value="ALL">All Regions</option>
                  {REGIONS.map(region => <option key={region} value={region}>{region}</option>)}
                </select>
              </div>
              <button onClick={() => setShowAddInvestor(true)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">+ Add Investor</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Type</th>
                    <th className="px-4 py-2 text-left">Region</th>
                    <th className="px-4 py-2 text-left">Stage</th>
                    <th className="px-4 py-2 text-right">Amount</th>
                    <th className="px-4 py-2 text-left">Probability</th>
                    <th className="px-4 py-2 text-left">Priority</th>
                    <th className="px-4 py-2 text-left">Next Action</th>
                    <th className="px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvestors.map(investor => {
                    const stage = STAGES.find(s => s.id === investor.stage);
                    const probability = getProbability(investor.stage);
                    return (
                      <tr key={investor.id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-3"><div className="font-medium">{investor.name}</div><div className="text-sm text-gray-600">{investor.contactPerson}</div></td>
                        <td className="px-4 py-3 text-sm">{investor.type}</td>
                        <td className="px-4 py-3 text-sm">{investor.region}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs ${stage?.color}`}>{stage?.label}</span></td>
                        <td className="px-4 py-3 text-right font-medium">${investor.amount?.toLocaleString() || 0}</td>
                        <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                                <div className="w-16 bg-gray-200 rounded-full h-2">
                                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${probability}%` }}/>
                                </div>
                                <span className="text-sm">{probability}%</span>
                            </div>
                        </td>
                        <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs ${investor.priority === 'CRITICAL' ? 'bg-red-200' : investor.priority === 'HIGH' ? 'bg-orange-200' : 'bg-gray-200'}`}>{investor.priority}</span></td>
                        <td className="px-4 py-3"><div className="text-sm">{investor.nextAction}</div><div className="text-xs text-gray-600">{investor.nextActionDate}</div></td>
                        <td className="px-4 py-3">
                          <button onClick={() => { setSelectedInvestor(investor); setShowAddInvestor(true); }} className="text-blue-600 hover:underline text-sm">Edit</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. ROADMAP TAB (NEW) */}
        {activeTab === 'roadmap' && (
             <div className="h-full min-h-[500px] p-4 bg-gray-50">
                 <FundraisingTaskBoard user={user} />
             </div>
        )}

        {/* 3. STRATEGIES TAB */}
        {activeTab === 'strategies' && (
          <div className="p-6">
            <div className="grid gap-4">
              {strategies.map(strategy => (
                <div key={strategy.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold">{strategy.title}</h3>
                    <span className="bg-gray-200 px-2 py-1 rounded text-xs">{strategy.priority}</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{strategy.description}</p>
                </div>
              ))}
              {strategies.length === 0 && <p className="text-gray-500 text-center">No strategies loaded.</p>}
            </div>
          </div>
        )}

        {/* 4. DOCUMENTS TAB */}
        {activeTab === 'documents' && (
          <div className="p-6">
            <div className="mb-4">
              <h3 className="font-bold mb-2">Investor Data Room</h3>
              <p className="text-sm text-gray-600 mb-4">Track which documents have been shared.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">📊 Core Documents</h4>
                <ul className="space-y-2 text-sm">
                  <li>✅ Pitch Deck (v6.0)</li>
                  <li>✅ Financial Model (R6)</li>
                  <li>✅ Convertible Note Term Sheet</li>
                  <li>✅ Cap Table</li>
                </ul>
              </div>
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">📋 Compliance & Legal</h4>
                <ul className="space-y-2 text-sm">
                  <li>✅ BOI-SIPP Certificate</li>
                  <li>✅ UK Companies House Filing</li>
                  <li>✅ PH SEC Registration</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* 5. ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div className="p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold mb-4">Pipeline by Stage</h3>
                {STAGES.filter(s => s.id !== 'PASSED').map(stage => {
                  const count = investors.filter(inv => inv.stage === stage.id).length;
                  const amount = investors.filter(inv => inv.stage === stage.id).reduce((sum, inv) => sum + (inv.amount || 0), 0);
                  return (
                    <div key={stage.id} className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span>{stage.label}</span>
                        <span className="font-medium">${amount.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${(count / (investors.length || 1)) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div>
                <h3 className="font-bold mb-4">Pipeline by Region</h3>
                {REGIONS.map(region => {
                  const count = investors.filter(inv => inv.region === region).length;
                  if (count === 0) return null;
                  return (
                    <div key={region} className="mb-3">
                       <div className="text-sm mb-1 flex justify-between"><span>{region}</span><span>{count}</span></div>
                       <div className="w-full bg-gray-200 rounded-full h-2">
                         <div className="bg-green-600 h-2 rounded-full" style={{ width: `${(count / investors.length) * 100}%` }} />
                       </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {showAddInvestor && (
        <InvestorForm
          investor={selectedInvestor}
          onSave={() => { setShowAddInvestor(false); setSelectedInvestor(null); }}
          onCancel={() => { setShowAddInvestor(false); setSelectedInvestor(null); }}
        />
      )}
    </div>
  );
};

export default CEOInvestmentDashboard;
