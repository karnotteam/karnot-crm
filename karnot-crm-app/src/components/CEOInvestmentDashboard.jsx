import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
    collection, addDoc, updateDoc, deleteDoc, doc, 
    getDocs, query, orderBy, serverTimestamp 
} from 'firebase/firestore';
import { 
    Upload, X, CheckCircle, Trash2, Edit, Plus, 
    Search, Filter, Download, ExternalLink, AlertTriangle,
    TrendingUp, BarChart2, PieChart, Layout, List, Mail
} from 'lucide-react';

// --- IMPORTS ---
import FundraisingTaskBoard from './FundraisingTaskBoard'; 
import InvestorFunnel from './InvestorFunnel';             
import InvestorEmailManager from './InvestorEmailManager'; 

// ==========================================
// 1. STRATEGY IMPORT MODAL (JSON)
// ==========================================
const SimpleStrategyImportModal = ({ onClose, user, onImportComplete }) => {
    const [jsonInput, setJsonInput] = useState('');
    const [loading, setLoading] = useState(false);

    const handleImport = async () => {
        try {
            setLoading(true);
            // Fix iPad "Smart Punctuation"
            const cleanJson = jsonInput
                .replace(/[\u201C\u201D]/g, '"')
                .replace(/[\u2018\u2019]/g, "'");
            
            const data = JSON.parse(cleanJson);
            const items = Array.isArray(data) ? data : [data];

            const batchPromises = items.map(item => {
                return addDoc(collection(db, 'investmentStrategies'), {
                    title: item.title || "New Strategy",
                    description: item.description || "",
                    priority: item.priority || "MEDIUM",
                    status: 'ACTIVE',
                    owner: user.email || 'CEO',
                    dueDate: item.dueDate || "",
                    category: "Fundraising",
                    createdAt: serverTimestamp(),
                    createdBy: user.uid
                });
            });

            await Promise.all(batchPromises);
            onImportComplete();
            onClose();
        } catch (error) {
            alert("Invalid JSON. Please check format.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center">
                        <Upload size={20} className="mr-2 text-blue-600"/> Import AI Strategy
                    </h3>
                    <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-red-500"/></button>
                </div>
                <textarea 
                    className="w-full h-48 p-3 border border-gray-200 rounded-lg text-xs font-mono bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder='[{"title": "Test Strategy", "priority": "HIGH", "description": "..."}]'
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                />
                <div className="flex justify-end gap-2 mt-4">
                    <button onClick={onClose} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-sm font-bold">Cancel</button>
                    <button onClick={handleImport} disabled={loading || !jsonInput} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700">
                        {loading ? 'Importing...' : 'Import Strategies'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ==========================================
// 2. STRATEGY MANUAL FORM MODAL
// ==========================================
const StrategyFormModal = ({ strategy, onClose, onSave, user }) => {
    const [formData, setFormData] = useState(strategy || {
        title: '', description: '', priority: 'MEDIUM', 
        owner: 'CEO', dueDate: '', category: 'Fundraising'
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (strategy?.id) {
                await updateDoc(doc(db, 'investmentStrategies', strategy.id), formData);
            } else {
                await addDoc(collection(db, 'investmentStrategies'), { ...formData, status: 'ACTIVE', createdAt: serverTimestamp(), createdBy: user.uid });
            }
            onSave();
        } catch (error) { console.error("Error saving strategy:", error); }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
                <h2 className="text-xl font-bold mb-4 text-gray-800">{strategy ? 'Edit Strategy' : 'New Strategy'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div><label className="text-xs font-bold text-gray-500">Title</label><input required className="w-full p-2 border rounded" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} /></div>
                    <div><label className="text-xs font-bold text-gray-500">Priority</label><select className="w-full p-2 border rounded" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}><option value="CRITICAL">Critical</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option></select></div>
                    <div><label className="text-xs font-bold text-gray-500">Description</label><textarea className="w-full p-2 border rounded" rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs font-bold text-gray-500">Due Date</label><input type="date" className="w-full p-2 border rounded" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} /></div>
                        <div><label className="text-xs font-bold text-gray-500">Owner</label><input className="w-full p-2 border rounded" value={formData.owner} onChange={e => setFormData({...formData, owner: e.target.value})} /></div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4"><button type="button" onClick={onClose} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded font-bold">Cancel</button><button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded font-bold">Save</button></div>
                </form>
            </div>
        </div>
    );
};

// ==========================================
// 3. MAIN DASHBOARD COMPONENT
// ==========================================
const CEOInvestmentDashboard = ({ user }) => {
  const [investors, setInvestors] = useState([]);
  const [strategies, setStrategies] = useState([]);
  const [activeTab, setActiveTab] = useState('pipeline');
  const [pipelineView, setPipelineView] = useState('table'); 
  
  // Modal States
  const [showAddInvestor, setShowAddInvestor] = useState(false);
  const [selectedInvestor, setSelectedInvestor] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showStrategyForm, setShowStrategyForm] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState(null);

  // Filters
  const [filterStage, setFilterStage] = useState('ALL');
  const [filterRegion, setFilterRegion] = useState('ALL');
  
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

  useEffect(() => {
    loadInvestors();
    loadStrategies();
  }, [user]);

  const loadInvestors = async () => {
    if(!user) return;
    const q = query(collection(db, 'investors'), orderBy('lastContact', 'desc'));
    const snapshot = await getDocs(q);
    setInvestors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const loadStrategies = async () => {
    if(!user) return;
    const q = query(collection(db, 'investmentStrategies'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    setStrategies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  // --- DELETE FUNCTION ---
  const handleDelete = async (collectionName, id) => {
      if(window.confirm("Are you sure you want to delete this item?")) {
          try {
            await deleteDoc(doc(db, collectionName, id));
            if(collectionName === 'investors') loadInvestors();
            if(collectionName === 'investmentStrategies') loadStrategies();
          } catch (e) {
            console.error("Delete failed", e);
            alert("Error deleting item. Check console.");
          }
      }
  };

  // Metrics Logic
  const metrics = {
    totalPipeline: investors.reduce((sum, inv) => sum + (inv.amount || 0), 0),
    weightedPipeline: investors.reduce((sum, inv) => sum + (inv.amount || 0) * (getProbability(inv.stage) / 100), 0),
    activeConversations: investors.filter(inv => ['OUTREACH', 'MEETING', 'DILIGENCE', 'TERM_SHEET'].includes(inv.stage)).length,
    closedAmount: investors.filter(inv => inv.stage === 'CLOSED').reduce((sum, inv) => sum + (inv.amount || 0), 0),
    documentsShared: investors.reduce((sum, inv) => sum + (inv.documentsShared?.length || 0), 0)
  };

  function getProbability(stage) {
    const map = { 'RESEARCH': 5, 'OUTREACH': 10, 'MEETING': 25, 'DILIGENCE': 50, 'TERM_SHEET': 75, 'LEGAL': 90, 'CLOSED': 100 };
    return map[stage] || 0;
  }

  const filteredInvestors = investors.filter(inv => {
    if (filterStage !== 'ALL' && inv.stage !== filterStage) return false;
    if (filterRegion !== 'ALL' && inv.region !== filterRegion) return false;
    return true;
  });

  // --- INVESTOR FORM ---
  const InvestorForm = ({ investor, onSave, onCancel }) => {
    const [formData, setFormData] = useState(investor || {
      name: '', type: 'Venture Capital', region: 'Philippines', stage: 'RESEARCH',
      amount: 0, contactPerson: '', email: '', phone: '', linkedin: '', website: '',
      notes: '', ticketSize: '', fit: 'MODERATE', priority: 'MEDIUM',
      lastContact: new Date().toISOString().split('T')[0], nextAction: '', nextActionDate: ''
    });

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (investor?.id) await updateDoc(doc(db, 'investors', investor.id), formData);
      else await addDoc(collection(db, 'investors'), formData);
      loadInvestors();
      onSave();
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
          <h2 className="text-xl font-bold mb-4">{investor ? 'Edit Investor' : 'New Investor'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><label className="text-xs font-bold text-gray-500">Name</label><input required className="w-full p-2 border rounded" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
              <div><label className="text-xs font-bold text-gray-500">Type</label><select className="w-full p-2 border rounded" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>{INVESTOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
              <div><label className="text-xs font-bold text-gray-500">Region</label><select className="w-full p-2 border rounded" value={formData.region} onChange={e => setFormData({...formData, region: e.target.value})}>{REGIONS.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
              <div><label className="text-xs font-bold text-gray-500">Stage</label><select className="w-full p-2 border rounded" value={formData.stage} onChange={e => setFormData({...formData, stage: e.target.value})}>{STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></div>
              <div><label className="text-xs font-bold text-gray-500">Amount ($)</label><input type="number" className="w-full p-2 border rounded" value={formData.amount} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} /></div>
              <div><label className="text-xs font-bold text-gray-500">Contact</label><input className="w-full p-2 border rounded" value={formData.contactPerson} onChange={e => setFormData({...formData, contactPerson: e.target.value})} /></div>
              <div><label className="text-xs font-bold text-gray-500">Email</label><input className="w-full p-2 border rounded" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
              <div><label className="text-xs font-bold text-gray-500">Phone</label><input className="w-full p-2 border rounded" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
              <div><label className="text-xs font-bold text-gray-500">LinkedIn</label><input className="w-full p-2 border rounded" value={formData.linkedin} onChange={e => setFormData({...formData, linkedin: e.target.value})} /></div>
              <div><label className="text-xs font-bold text-gray-500">Ticket Size</label><input className="w-full p-2 border rounded" value={formData.ticketSize} onChange={e => setFormData({...formData, ticketSize: e.target.value})} /></div>
              <div><label className="text-xs font-bold text-gray-500">Fit Score</label><select className="w-full p-2 border rounded" value={formData.fit} onChange={e => setFormData({...formData, fit: e.target.value})}><option value="EXCELLENT">Excellent</option><option value="GOOD">Good</option><option value="MODERATE">Moderate</option></select></div>
              <div className="col-span-2"><label className="text-xs font-bold text-gray-500">Next Action</label><input className="w-full p-2 border rounded" value={formData.nextAction} onChange={e => setFormData({...formData, nextAction: e.target.value})} /></div>
              <div className="col-span-2"><label className="text-xs font-bold text-gray-500">Notes</label><textarea className="w-full p-2 border rounded" rows={3} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} /></div>
              <div className="col-span-2 flex justify-end gap-2 mt-4 border-t pt-4">
                  <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-100 rounded font-bold text-gray-600">Cancel</button>
                  <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded font-bold">Save</button>
              </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      {/* HEADER & METRICS */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 text-gray-800">CEO Investment Dashboard</h1>
        <p className="text-gray-600">Target: $250k Convertible Note | Series A Readiness</p>
      </div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
            <div className="text-xs font-bold text-gray-400 uppercase">Pipeline Value</div>
            <div className="text-2xl font-black text-gray-800">${metrics.totalPipeline.toLocaleString()}</div>
            <div className="text-xs text-green-600 font-medium">Weighted: ${Math.round(metrics.weightedPipeline).toLocaleString()}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
            <div className="text-xs font-bold text-gray-400 uppercase">Active Deals</div>
            <div className="text-2xl font-black text-blue-600">{metrics.activeConversations}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
            <div className="text-xs font-bold text-gray-400 uppercase">Secured</div>
            <div className="text-2xl font-black text-green-600">${metrics.closedAmount.toLocaleString()}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
            <div className="text-xs font-bold text-gray-400 uppercase">Data Room</div>
            <div className="text-2xl font-black text-purple-600">{metrics.documentsShared}</div>
        </div>
      </div>

      {/* MAIN TABS */}
      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
        <div className="flex border-b overflow-x-auto">
          {['pipeline', 'roadmap', 'strategies', 'emails', 'documents', 'analytics'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-bold text-sm uppercase tracking-wide whitespace-nowrap ${activeTab === tab ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-50'}`}>
              {tab === 'roadmap' ? 'Cambridge Roadmap' : tab}
            </button>
          ))}
        </div>

        {/* 1. PIPELINE TAB */}
        {activeTab === 'pipeline' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex gap-2">
                 <button onClick={() => setPipelineView('table')} className={`p-2 rounded ${pipelineView==='table'?'bg-gray-200':'bg-white border'}`}><List size={16}/></button>
                 <button onClick={() => setPipelineView('funnel')} className={`p-2 rounded ${pipelineView==='funnel'?'bg-gray-200':'bg-white border'}`}><Layout size={16}/></button>
                 <div className="h-8 w-px bg-gray-300 mx-2"></div>
                 <select value={filterStage} onChange={e => setFilterStage(e.target.value)} className="p-1 border rounded text-sm"><option value="ALL">All Stages</option>{STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
              </div>
              <button onClick={() => { setSelectedInvestor(null); setShowAddInvestor(true); }} className="px-4 py-2 bg-blue-600 text-white rounded font-bold text-sm hover:bg-blue-700 flex items-center gap-2">
                <Plus size={16}/> Add Investor
              </button>
            </div>
            
            {pipelineView === 'funnel' ? (
                <div className="h-[600px] bg-slate-50 rounded border border-gray-200 overflow-hidden">
                    <InvestorFunnel investors={filteredInvestors} user={user} />
                </div>
            ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                      <tr>
                        <th className="px-4 py-3 text-left">Investor</th>
                        <th className="px-4 py-3 text-left">Stage</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3 text-left">Prob.</th>
                        <th className="px-4 py-3 text-left">Next</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredInvestors.map(inv => (
                          <tr key={inv.id} className="hover:bg-blue-50/50">
                            <td className="px-4 py-3"><div className="font-bold text-gray-800">{inv.name}</div><div className="text-xs text-gray-500">{inv.type}</div></td>
                            <td className="px-4 py-3"><span className="px-2 py-1 rounded-full text-[10px] bg-gray-100 font-bold">{inv.stage}</span></td>
                            <td className="px-4 py-3 text-right font-medium text-gray-700">${inv.amount?.toLocaleString()}</td>
                            <td className="px-4 py-3 text-xs">{getProbability(inv.stage)}%</td>
                            <td className="px-4 py-3 text-xs text-gray-500 truncate max-w-[150px]">{inv.nextAction}</td>
                            <td className="px-4 py-3 text-right flex justify-end gap-2">
                                <button onClick={() => { setSelectedInvestor(inv); setShowAddInvestor(true); }} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded"><Edit size={14}/></button>
                                <button onClick={() => handleDelete('investors', inv.id)} className="text-red-400 hover:bg-red-50 p-1.5 rounded"><Trash2 size={14}/></button>
                            </td>
                          </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            )}
          </div>
        )}

        {/* 2. ROADMAP TAB */}
        {activeTab === 'roadmap' && (
             <div className="h-[600px] p-4 bg-slate-50">
                 <FundraisingTaskBoard user={user} />
             </div>
        )}

        {/* 3. STRATEGIES TAB - UPDATED WITH DELETE BUTTONS */}
        {activeTab === 'strategies' && (
          <div className="p-6 bg-slate-50 min-h-[500px]">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-700">Strategic Objectives</h3>
                <div className="flex gap-2">
                    <button onClick={() => { setSelectedStrategy(null); setShowStrategyForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-white border text-gray-700 rounded-lg text-sm font-bold"><Plus size={16} /> Add Manual</button>
                    <button onClick={() => setShowImportModal(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold"><Upload size={16} /> Import JSON</button>
                </div>
            </div>
            <div className="grid gap-4">
              {strategies.map(strat => (
                <div key={strat.id} className="group relative bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-gray-800">{strat.title}</h3>
                    <div className="flex items-center gap-2">
                         <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${strat.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700'}`}>{strat.priority}</span>
                         {/* --- UPDATED: BUTTONS ALWAYS VISIBLE FOR IPAD --- */}
                         <div className="flex gap-1">
                            <button onClick={() => { setSelectedStrategy(strat); setShowStrategyForm(true); }} className="p-1 hover:bg-gray-100 rounded text-blue-600"><Edit size={14}/></button>
                            <button onClick={() => handleDelete('investmentStrategies', strat.id)} className="p-1 hover:bg-gray-100 rounded text-red-500"><Trash2 size={14}/></button>
                         </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{strat.description}</p>
                  <div className="flex items-center gap-4 text-xs font-bold text-gray-400 border-t pt-3">
                    <span className="flex items-center gap-1"><AlertTriangle size={12}/> Due: {strat.dueDate || 'N/A'}</span>
                    <span className="flex items-center gap-1"><ExternalLink size={12}/> Owner: {strat.owner}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. EMAILS TAB */}
        {activeTab === 'emails' && (
            <div className="p-6">
                <InvestorEmailManager user={user} />
            </div>
        )}

        {/* 5. DOCUMENTS TAB */}
        {activeTab === 'documents' && (
          <div className="p-6 grid grid-cols-2 gap-6">
            <div className="border rounded-xl p-6 bg-white shadow-sm">
                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Download size={18} className="text-blue-500"/> Core Documents</h4>
                <ul className="space-y-3 text-sm text-gray-600">
                    <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500"/> Pitch Deck (v6.0)</li>
                    <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500"/> Financial Model (R6)</li>
                    <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500"/> Convertible Note Term Sheet</li>
                </ul>
            </div>
            <div className="border rounded-xl p-6 bg-white shadow-sm">
                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><CheckCircle size={18} className="text-purple-500"/> Compliance</h4>
                <ul className="space-y-3 text-sm text-gray-600">
                    <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500"/> BOI-SIPP Certificate</li>
                    <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500"/> SEC Registration</li>
                </ul>
            </div>
          </div>
        )}

        {/* 6. ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div className="p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold mb-4 flex items-center gap-2"><BarChart2 size={16}/> Pipeline by Stage</h3>
                {STAGES.filter(s => s.id !== 'PASSED').map(stage => {
                  const count = investors.filter(inv => inv.stage === stage.id).length;
                  return (
                    <div key={stage.id} className="mb-3">
                      <div className="flex justify-between text-xs font-bold mb-1 uppercase text-gray-500"><span>{stage.label}</span><span>{count}</span></div>
                      <div className="w-full bg-gray-100 rounded-full h-2"><div className="bg-blue-600 h-2 rounded-full" style={{ width: `${(count / (investors.length || 1)) * 100}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODALS */}
      {showAddInvestor && <InvestorForm investor={selectedInvestor} onSave={() => { setShowAddInvestor(false); setSelectedInvestor(null); }} onCancel={() => { setShowAddInvestor(false); setSelectedInvestor(null); }} />}
      {showImportModal && <SimpleStrategyImportModal user={user} onClose={() => setShowImportModal(false)} onImportComplete={loadStrategies} />}
      {showStrategyForm && <StrategyFormModal strategy={selectedStrategy} user={user} onClose={() => { setShowStrategyForm(false); setSelectedStrategy(null); }} onSave={() => { setShowStrategyForm(false); setSelectedStrategy(null); loadStrategies(); }} />}
    </div>
  );
};

export default CEOInvestmentDashboard;
