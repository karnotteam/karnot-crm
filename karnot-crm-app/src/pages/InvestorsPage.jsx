import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, serverTimestamp, writeBatch } from 'firebase/firestore';
import { Building, Mail, Phone, Globe, Linkedin, Plus, Edit, Trash2, Search, Filter, DollarSign, MapPin, Users, FileText, Grid, List, Send, Download, X, CheckSquare, Copy, PlusCircle, ExternalLink, Navigation, Target, Handshake, UserCheck, Upload } from 'lucide-react';
import { importInvestors } from '../utils/importInvestors';
import InvestorFunnel from '../components/InvestorFunnel';
import InvestorWebScraper from '../components/InvestorWebScraper';
import InvestorResearchChecklist from '../components/InvestorResearchChecklist';
import EmailTemplateGenerator from '../components/EmailTemplateGenerator';
import DealStructureChecker from '../components/DealStructureChecker';
import Papa from 'papaparse';

// ========================================
// INVESTOR STAGES CONFIGURATION
// ========================================
const INVESTOR_STAGES = {
  RESEARCH: { label: 'Research', color: 'gray', icon: '🔍' },
  EMAILED: { label: 'Emailed', color: 'blue', icon: '📧' },
  INTERESTED: { label: 'Interested', color: 'green', icon: '👀' },
  DOCS_SENT: { label: 'Docs Sent', color: 'purple', icon: '📄' },
  MEETING_SET: { label: 'Meeting Set', color: 'orange', icon: '🤝' },
  TERM_SHEET: { label: 'Term Sheet', color: 'indigo', icon: '💼' },
  COMMITTED: { label: 'Committed', color: 'teal', icon: '✅' },
  PASSED: { label: 'Passed', color: 'red', icon: '❌' }
};

// ========================================
// STAT BADGE COMPONENT
// ========================================
const StatBadge = ({ icon: Icon, label, count, total, color, active, onClick }) => {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer flex-1 min-w-[160px] p-3 rounded-xl border transition-all duration-200 flex items-center justify-between gap-3 ${
        active
          ? `bg-${color}-100 border-${color}-500 ring-2 ring-${color}-400`
          : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md'
      }`}
    >
      <div className={`p-2 rounded-full bg-${color}-100 text-${color}-600`}>
        <Icon size={20} />
      </div>
      <div className="text-right">
        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{label}</p>
        <p className="text-xl font-bold text-gray-800">
          {count} <span className="text-xs text-gray-400 font-normal">({percentage}%)</span>
        </p>
      </div>
    </div>
  );
};

// ========================================
// RESEARCH MODAL - NEW!
// ========================================
const ResearchModal = ({ investor, user, onClose, onUpdate }) => {
  const [activeResearchTab, setActiveResearchTab] = useState('SCRAPER');

  const handleUpdateInvestor = async (investorId, updates) => {
    try {
      await updateDoc(doc(db, 'users', user.uid, 'investors', investorId), {
        ...updates,
        updatedAt: serverTimestamp()
      });
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating investor:', error);
      alert('Failed to update investor');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-100 to-purple-100 p-6 border-b border-blue-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black uppercase text-blue-800">Investor Research</h2>
              <p className="text-sm font-bold text-blue-600">{investor.name}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-50 rounded-full text-blue-700"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50">
          <button
            onClick={() => setActiveResearchTab('SCRAPER')}
            className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${
              activeResearchTab === 'SCRAPER'
                ? 'text-blue-600 border-b-4 border-blue-600 bg-white'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            🌐 Web Research
          </button>
          <button
            onClick={() => setActiveResearchTab('CHECKLIST')}
            className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${
              activeResearchTab === 'CHECKLIST'
                ? 'text-red-600 border-b-4 border-red-600 bg-white'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            ✅ Due Diligence
          </button>
          <button
            onClick={() => setActiveResearchTab('EMAIL')}
            className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${
              activeResearchTab === 'EMAIL'
                ? 'text-purple-600 border-b-4 border-purple-600 bg-white'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            📧 Email Generator
          </button>
          <button
            onClick={() => setActiveResearchTab('DEAL')}
            className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${
              activeResearchTab === 'DEAL'
                ? 'text-orange-600 border-b-4 border-orange-600 bg-white'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            📄 Deal Structure
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {activeResearchTab === 'SCRAPER' && (
            <InvestorWebScraper 
              investor={investor}
              onUpdateInvestor={handleUpdateInvestor}
            />
          )}

          {activeResearchTab === 'CHECKLIST' && (
            <InvestorResearchChecklist
              investor={investor}
              user={user}
              onComplete={(status) => {
                console.log('Research completed with status:', status);
              }}
            />
          )}

          {activeResearchTab === 'EMAIL' && (
            <EmailTemplateGenerator investor={investor} />
          )}

          {activeResearchTab === 'DEAL' && (
            <DealStructureChecker 
              investor={investor}
              dealTerms={investor.dealTerms || {}}
            />
          )}
        </div>

      </div>
    </div>
  );
};

// ========================================
// DUPLICATE RESOLVER MODAL
// ========================================
const DuplicateResolver = ({ investors, onClose, onResolve }) => {
  const [duplicates, setDuplicates] = useState([]);

  useMemo(() => {
    const lookup = {};
    const dupeGroups = [];

    investors.forEach(inv => {
      const key = inv.name.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      if (!lookup[key]) lookup[key] = [];
      lookup[key].push(inv);
    });

    Object.values(lookup).forEach(group => {
      if (group.length > 1) {
        group.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
        dupeGroups.push(group);
      }
    });

    setDuplicates(dupeGroups);
  }, [investors]);

  const handleResolveGroup = (keepId, group) => {
    const idsToDelete = group.filter(inv => inv.id !== keepId).map(inv => inv.id);
    onResolve(idsToDelete);
    setDuplicates(prev => prev.filter(g => !g.some(inv => inv.id === keepId)));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="bg-orange-100 p-6 border-b border-orange-200">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-200 rounded-lg text-orange-700">
                <Copy size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase text-orange-800">Duplicate Cleaner</h2>
                <p className="text-xs font-bold text-orange-600">
                  Found {duplicates.length} sets of potential duplicates
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-orange-200 rounded-full text-orange-700">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50">
          {duplicates.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <CheckSquare size={48} className="mx-auto mb-3 text-green-400" />
              <p className="font-black text-lg text-gray-600">No Duplicates Found!</p>
              <p className="text-sm">Your investor directory looks clean.</p>
            </div>
          )}

          {duplicates.map((group, idx) => (
            <div key={idx} className="bg-white border rounded-2xl p-4 shadow-sm">
              <h3 className="font-black text-gray-700 mb-3 border-b pb-2">
                Group: "{group[0].name}"
              </h3>
              <div className="space-y-2">
                {group.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-bold text-sm text-gray-800">{inv.name}</p>
                      <p className="text-[10px] text-gray-500">
                        {inv.type} • {inv.region} • {inv.contactPerson || 'No contact'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleResolveGroup(inv.id, group)}
                      className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 text-[10px] font-bold uppercase flex items-center gap-1"
                    >
                      <CheckSquare size={14} />
                      Keep This One
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 text-center mt-2 italic">
                Selecting "Keep This One" will delete the others in this group.
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// [KEEPING ALL YOUR EXISTING CODE - CSV IMPORT MODAL, INVESTOR FORM, etc.]
// I'll continue in next message with the main component integration...

// ========================================
// CSV IMPORT MODAL (YOUR EXISTING CODE - KEEP AS IS)
// ========================================
const CSVImportModal = ({ onClose, onImport, user }) => {
  // ... keep all your existing CSV import code exactly as is ...
};

// ========================================
// INVESTOR FORM MODAL (YOUR EXISTING CODE - KEEP AS IS)
// ========================================
const InvestorFormModal = ({ investor, onSave, onCancel, user, contacts }) => {
  // ... keep all your existing form modal code exactly as is ...
};

// ========================================
// MAIN INVESTORS PAGE COMPONENT (UPDATED)
// ========================================
const InvestorsPage = ({ user }) => {
  // All your existing state
  const [investors, setInvestors] = useState([]);
  const [filteredInvestors, setFilteredInvestors] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStage, setSelectedStage] = useState(null);
  const [selectedPriority, setSelectedPriority] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [showInvestorForm, setShowInvestorForm] = useState(false);
  const [editingInvestor, setEditingInvestor] = useState(null);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [showFunnelView, setShowFunnelView] = useState(false);
  
  // NEW STATE: Research Modal
  const [showResearchModal, setShowResearchModal] = useState(false);
  const [researchingInvestor, setResearchingInvestor] = useState(null);

  // All your existing useEffect and functions - KEEP AS IS
  useEffect(() => {
    fetchInvestors();
    fetchContacts();
  }, [user]);

  const fetchInvestors = async () => {
    // ... your existing fetch code ...
  };

  const fetchContacts = async () => {
    // ... your existing fetch code ...
  };

  const handleSaveInvestor = async (investorData) => {
    // ... your existing save code ...
  };

  const handleDeleteInvestor = async (id) => {
    // ... your existing delete code ...
  };

  // ... all your other existing functions ...

  // NEW FUNCTION: Open Research Modal
  const handleOpenResearch = (investor) => {
    setResearchingInvestor(investor);
    setShowResearchModal(true);
  };

  const handleCloseResearch = () => {
    setShowResearchModal(false);
    setResearchingInvestor(null);
    fetchInvestors(); // Refresh data after research
  };

  // All your existing filtering logic - KEEP AS IS
  useEffect(() => {
    let filtered = investors;

    if (searchQuery) {
      // ... your existing search filter ...
    }

    if (selectedStage) {
      // ... your existing stage filter ...
    }

    if (selectedPriority) {
      // ... your existing priority filter ...
    }

    setFilteredInvestors(filtered);
  }, [investors, searchQuery, selectedStage, selectedPriority]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* YOUR EXISTING HEADER - KEEP AS IS */}
        <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100">
          {/* ... all your existing header code ... */}
        </div>

        {/* YOUR EXISTING STATS - KEEP AS IS */}
        <div className="flex gap-3 overflow-x-auto pb-2">
          {/* ... all your existing stats badges ... */}
        </div>

        {/* YOUR EXISTING FILTERS & ACTIONS - KEEP AS IS */}
        <div className="bg-white rounded-2xl shadow-lg p-4 border border-gray-100">
          {/* ... all your existing filters ... */}
        </div>

        {/* FUNNEL VIEW OR GRID VIEW */}
        {showFunnelView ? (
          <InvestorFunnel 
            investors={filteredInvestors}
            onRefresh={fetchInvestors}
            user={user}
          />
        ) : (
          <>
            {/* INVESTOR GRID/LIST - UPDATE THE CARD TO INCLUDE RESEARCH BUTTON */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredInvestors.map(investor => (
                  <InvestorCard
                    key={investor.id}
                    investor={investor}
                    onEdit={() => {
                      setEditingInvestor(investor);
                      setShowInvestorForm(true);
                    }}
                    onDelete={() => handleDeleteInvestor(investor.id)}
                    onResearch={() => handleOpenResearch(investor)} // NEW!
                    contacts={contacts}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredInvestors.map(investor => (
                  <InvestorListItem
                    key={investor.id}
                    investor={investor}
                    onEdit={() => {
                      setEditingInvestor(investor);
                      setShowInvestorForm(true);
                    }}
                    onDelete={() => handleDeleteInvestor(investor.id)}
                    onResearch={() => handleOpenResearch(investor)} // NEW!
                    contacts={contacts}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* EMPTY STATE - KEEP AS IS */}
        {filteredInvestors.length === 0 && (
          <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-gray-200">
            {/* ... your existing empty state ... */}
          </div>
        )}
      </div>

      {/* MODALS - YOUR EXISTING ONES + NEW RESEARCH MODAL */}
      {showInvestorForm && (
        <InvestorFormModal
          investor={editingInvestor}
          onSave={handleSaveInvestor}
          onCancel={() => {
            setShowInvestorForm(false);
            setEditingInvestor(null);
          }}
          user={user}
          contacts={contacts}
        />
      )}

      {showDuplicates && (
        <DuplicateResolver
          investors={investors}
          onClose={() => setShowDuplicates(false)}
          onResolve={async (idsToDelete) => {
            // ... your existing duplicate resolution code ...
          }}
        />
      )}

      {showCSVImport && (
        <CSVImportModal
          onClose={() => setShowCSVImport(false)}
          onImport={async (mappedData) => {
            // ... your existing CSV import code ...
          }}
          user={user}
        />
      )}

      {/* NEW: RESEARCH MODAL */}
      {showResearchModal && researchingInvestor && (
        <ResearchModal
          investor={researchingInvestor}
          user={user}
          onClose={handleCloseResearch}
          onUpdate={fetchInvestors}
        />
      )}
    </div>
  );
};

// ========================================
// INVESTOR CARD COMPONENT (UPDATED)
// ========================================
const InvestorCard = ({ investor, onEdit, onDelete, onResearch, contacts }) => {
  const relatedContacts = contacts.filter(c => 
    c.company?.toLowerCase() === investor.name?.toLowerCase()
  );

  const priorityColors = {
    CRITICAL: 'bg-red-500',
    HIGH: 'bg-orange-500',
    MEDIUM: 'bg-yellow-500',
    LOW: 'bg-gray-400'
  };

  const stageConfig = INVESTOR_STAGES[investor.stage] || INVESTOR_STAGES.RESEARCH;

  return (
    <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden group">
      {/* Stage Badge */}
      <div className={`bg-${stageConfig.color}-100 px-4 py-2 flex items-center justify-between border-b border-${stageConfig.color}-200`}>
        <span className="text-xs font-black uppercase tracking-widest text-gray-600">
          {stageConfig.icon} {stageConfig.label}
        </span>
        {investor.priority && (
          <div className={`w-3 h-3 rounded-full ${priorityColors[investor.priority]}`} />
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* Header */}
        <div>
          <h3 className="text-lg font-black text-gray-800 mb-1 leading-tight">
            {investor.name}
          </h3>
          <div className="flex flex-wrap gap-2 text-xs">
            {investor.type && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-bold">
                {investor.type}
              </span>
            )}
            {investor.region && (
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-bold flex items-center gap-1">
                <MapPin size={12} />
                {investor.region}
              </span>
            )}
          </div>
        </div>

        {/* Key Info */}
        {investor.ticketSize && (
          <div className="flex items-center gap-2 text-sm">
            <DollarSign size={16} className="text-green-600" />
            <span className="font-bold text-gray-700">{investor.ticketSize}</span>
          </div>
        )}

        {investor.fit && (
          <div className={`px-3 py-1 rounded-full text-xs font-black uppercase inline-block ${
            investor.fit === 'HIGH' ? 'bg-green-100 text-green-700' :
            investor.fit === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
            'bg-gray-100 text-gray-600'
          }`}>
            {investor.fit} FIT
          </div>
        )}

        {/* Focus Areas */}
        {investor.focus && investor.focus.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {investor.focus.slice(0, 3).map((area, idx) => (
              <span key={idx} className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-bold">
                {area}
              </span>
            ))}
            {investor.focus.length > 3 && (
              <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-bold">
                +{investor.focus.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Contact Info */}
        <div className="space-y-2 text-xs">
          {investor.contactPerson && (
            <div className="flex items-center gap-2 text-gray-600">
              <Users size={14} />
              <span className="font-bold">{investor.contactPerson}</span>
            </div>
          )}
          {investor.email && (
            <div className="flex items-center gap-2 text-gray-600">
              <Mail size={14} />
              <span className="truncate">{investor.email}</span>
            </div>
          )}
        </div>

        {/* Related Contacts Count */}
        {relatedContacts.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-teal-600 font-bold">
            <UserCheck size={14} />
            {relatedContacts.length} Contact{relatedContacts.length !== 1 ? 's' : ''}
          </div>
        )}

        {/* Research Status Indicator */}
        {investor.researchStatus && (
          <div className={`px-3 py-2 rounded-lg border-2 text-xs font-black ${
            investor.researchStatus === 'STRONG_FIT' ? 'bg-green-50 border-green-300 text-green-700' :
            investor.researchStatus === 'ACCEPTABLE' ? 'bg-blue-50 border-blue-300 text-blue-700' :
            investor.researchStatus === 'REJECT' ? 'bg-red-50 border-red-300 text-red-700' :
            'bg-yellow-50 border-yellow-300 text-yellow-700'
          }`}>
            {investor.researchStatus === 'STRONG_FIT' && '✅ STRONG FIT'}
            {investor.researchStatus === 'ACCEPTABLE' && '✓ ACCEPTABLE'}
            {investor.researchStatus === 'REJECT' && '⛔ REJECTED'}
            {investor.researchStatus === 'INCOMPLETE' && '⚠️ RESEARCH INCOMPLETE'}
            {investor.researchScore && ` • Score: ${investor.researchScore}/100`}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2 border-t">
          <button
            onClick={onResearch}
            className="flex-1 px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1"
          >
            <Search size={14} />
            Research
          </button>
          <button
            onClick={onEdit}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ========================================
// INVESTOR LIST ITEM (UPDATED)
// ========================================
const InvestorListItem = ({ investor, onEdit, onDelete, onResearch, contacts }) => {
  const relatedContacts = contacts.filter(c => 
    c.company?.toLowerCase() === investor.name?.toLowerCase()
  );

  const stageConfig = INVESTOR_STAGES[investor.stage] || INVESTOR_STAGES.RESEARCH;

  return (
    <div className="bg-white rounded-2xl shadow hover:shadow-lg transition-all duration-300 border border-gray-100 p-4">
      <div className="flex items-center justify-between gap-4">
        
        {/* Left: Basic Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-base font-black text-gray-800 truncate">
              {investor.name}
            </h3>
            <span className={`text-[10px] px-2 py-0.5 bg-${stageConfig.color}-100 text-${stageConfig.color}-700 rounded-full font-black uppercase tracking-wider`}>
              {stageConfig.icon} {stageConfig.label}
            </span>
          </div>
          
          <div className="flex flex-wrap gap-2 text-xs text-gray-600">
            {investor.type && <span className="font-bold">{investor.type}</span>}
            {investor.region && (
              <span className="flex items-center gap-1">
                <MapPin size={12} />
                {investor.region}
              </span>
            )}
            {investor.ticketSize && (
              <span className="flex items-center gap-1 text-green-600 font-bold">
                <DollarSign size={12} />
                {investor.ticketSize}
              </span>
            )}
            {relatedContacts.length > 0 && (
              <span className="flex items-center gap-1 text-teal-600 font-bold">
                <UserCheck size={12} />
                {relatedContacts.length} Contact{relatedContacts.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Middle: Research Status */}
        {investor.researchStatus && (
          <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${
            investor.researchStatus === 'STRONG_FIT' ? 'bg-green-100 text-green-700' :
            investor.researchStatus === 'ACCEPTABLE' ? 'bg-blue-100 text-blue-700' :
            investor.researchStatus === 'REJECT' ? 'bg-red-100 text-red-700' :
            'bg-yellow-100 text-yellow-700'
          }`}>
            {investor.researchStatus.replace(/_/g, ' ')}
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onResearch}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2"
          >
            <Search size={14} />
            Research
          </button>
          <button
            onClick={onEdit}
            className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={onDelete}
            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvestorsPage;
