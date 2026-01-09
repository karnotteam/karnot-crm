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
import InvestorAutoResearch from '../components/InvestorAutoResearch';
import Papa from 'papaparse';
import './investor-card-improved-styles.css';

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
// RESEARCH MODAL (UPDATED WITH AUTO-RESEARCH)
// ========================================
const ResearchModal = ({ investor, user, onClose, onUpdate }) => {
  const [activeResearchTab, setActiveResearchTab] = useState('AUTO');

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
        
        <div className="bg-gradient-to-r from-blue-100 to-purple-100 p-6 border-b border-blue-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black uppercase text-blue-800">Investor Research</h2>
              <p className="text-sm font-bold text-blue-600">{investor.name}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white hover:bg-opacity-50 rounded-full text-blue-700">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex border-b bg-gray-50">
          <button onClick={() => setActiveResearchTab('AUTO')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${activeResearchTab === 'AUTO' ? 'text-blue-600 border-b-4 border-blue-600 bg-white' : 'text-gray-400 hover:text-gray-600'}`}>
            🤖 Auto Research
          </button>
          <button onClick={() => setActiveResearchTab('SCRAPER')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${activeResearchTab === 'SCRAPER' ? 'text-blue-600 border-b-4 border-blue-600 bg-white' : 'text-gray-400 hover:text-gray-600'}`}>
            🌐 Web Research
          </button>
          <button onClick={() => setActiveResearchTab('CHECKLIST')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${activeResearchTab === 'CHECKLIST' ? 'text-red-600 border-b-4 border-red-600 bg-white' : 'text-gray-400 hover:text-gray-600'}`}>
            ✅ Due Diligence
          </button>
          <button onClick={() => setActiveResearchTab('EMAIL')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${activeResearchTab === 'EMAIL' ? 'text-purple-600 border-b-4 border-purple-600 bg-white' : 'text-gray-400 hover:text-gray-600'}`}>
            📧 Email Generator
          </button>
          <button onClick={() => setActiveResearchTab('DEAL')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${activeResearchTab === 'DEAL' ? 'text-orange-600 border-b-4 border-orange-600 bg-white' : 'text-gray-400 hover:text-gray-600'}`}>
            📄 Deal Structure
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {activeResearchTab === 'AUTO' && <InvestorAutoResearch investor={investor} user={user} onComplete={(findings) => { console.log('Research complete:', findings); if (onUpdate) onUpdate(); }} />}
          {activeResearchTab === 'SCRAPER' && <InvestorWebScraper investor={investor} onUpdateInvestor={handleUpdateInvestor} />}
          {activeResearchTab === 'CHECKLIST' && <InvestorResearchChecklist investor={investor} user={user} onComplete={(status) => console.log('Research completed:', status)} />}
          {activeResearchTab === 'EMAIL' && <EmailTemplateGenerator investor={investor} />}
          {activeResearchTab === 'DEAL' && <DealStructureChecker investor={investor} dealTerms={investor.dealTerms || {}} />}
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

// ========================================
// CSV IMPORT MODAL
// ========================================
const CSVImportModal = ({ onClose, onImport, user }) => {
  const [csvData, setCsvData] = useState([]);
  const [preview, setPreview] = useState([]);
  const [mapping, setMapping] = useState({
    name: '',
    type: '',
    region: '',
    city: '',
    contactPerson: '',
    email: '',
    phone: '',
    website: '',
    linkedin: '',
    ticketSize: '',
    priority: '',
    stage: '',
    fit: '',
    notes: ''
  });
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      complete: (results) => {
        setCsvData(results.data);
        setPreview(results.data.slice(0, 6));
        
        const headers = results.data[0];
        const autoMapping = {};
        
        headers.forEach((header, idx) => {
          const lower = header.toLowerCase().trim();
          if (lower.includes('name') || lower.includes('company')) autoMapping.name = header;
          if (lower.includes('type') || lower.includes('investor type')) autoMapping.type = header;
          if (lower.includes('region') || lower.includes('location')) autoMapping.region = header;
          if (lower.includes('city')) autoMapping.city = header;
          if (lower.includes('contact') || lower.includes('person')) autoMapping.contactPerson = header;
          if (lower.includes('email') || lower.includes('e-mail')) autoMapping.email = header;
          if (lower.includes('phone') || lower.includes('tel')) autoMapping.phone = header;
          if (lower.includes('website') || lower.includes('url')) autoMapping.website = header;
          if (lower.includes('linkedin')) autoMapping.linkedin = header;
          if (lower.includes('ticket') || lower.includes('size')) autoMapping.ticketSize = header;
          if (lower.includes('priority')) autoMapping.priority = header;
          if (lower.includes('stage')) autoMapping.stage = header;
          if (lower.includes('fit') || lower.includes('score')) autoMapping.fit = header;
          if (lower.includes('notes') || lower.includes('comment')) autoMapping.notes = header;
        });
        
        setMapping(prev => ({ ...prev, ...autoMapping }));
      },
      header: true,
      skipEmptyLines: true
    });
  };

  const handleImport = async () => {
    if (!mapping.name) {
      alert('⚠️ Please map the "Company Name" field');
      return;
    }

    setImporting(true);
    
    try {
      const batch = writeBatch(db);
      let importCount = 0;
      
      for (let i = 1; i < csvData.length; i++) {
        const row = csvData[i];
        
        const investorData = {
          name: row[mapping.name] || '',
          type: row[mapping.type] || 'Venture Capital',
          region: row[mapping.region] || 'Philippines',
          city: row[mapping.city] || '',
          contactPerson: row[mapping.contactPerson] || '',
          email: row[mapping.email] || '',
          phone: row[mapping.phone] || '',
          website: row[mapping.website] || '',
          linkedin: row[mapping.linkedin] || '',
          ticketSize: row[mapping.ticketSize] || '',
          priority: row[mapping.priority] || 'MEDIUM',
          stage: row[mapping.stage] || 'RESEARCH',
          fit: row[mapping.fit] || 'MODERATE',
          notes: row[mapping.notes] || '',
          focus: [],
          interactions: [],
          amount: 0,
          status: 'ACTIVE',
          createdAt: serverTimestamp()
        };

        if (!investorData.name.trim()) continue;

        const docRef = doc(collection(db, 'users', user.uid, 'investors'));
        batch.set(docRef, investorData);
        importCount++;
      }

      await batch.commit();
      alert(`✅ Successfully imported ${importCount} investors!`);
      onImport();
      onClose();
      
    } catch (error) {
      console.error('Import error:', error);
      alert('❌ Import failed. Please check the console for details.');
    } finally {
      setImporting(false);
    }
  };

  const availableColumns = csvData.length > 0 ? Object.keys(csvData[0]) : [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 border-b">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white bg-opacity-20 rounded-lg text-white">
                <Upload size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black uppercase text-white tracking-tight">Import Investors from CSV</h2>
                <p className="text-sm text-green-100 font-bold">
                  Upload a CSV file and map columns to investor fields
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white hover:bg-opacity-10 rounded-full text-white">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-blue-50 border-2 border-dashed border-blue-300 rounded-2xl p-8 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Upload size={48} className="mx-auto mb-4 text-blue-400" />
            <h3 className="font-black text-gray-800 text-lg mb-2">Upload CSV File</h3>
            <p className="text-sm text-gray-600 mb-4">
              Select a CSV file containing your investor data
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold uppercase text-sm"
            >
              Choose File
            </button>
            {csvData.length > 0 && (
              <p className="mt-4 text-sm font-bold text-green-600">
                ✅ {csvData.length - 1} rows loaded
              </p>
            )}
          </div>

          {csvData.length > 0 && (
            <>
              <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
                <h3 className="font-black text-gray-800 text-lg mb-4 flex items-center gap-2">
                  <Target size={20} className="text-purple-600" />
                  Map CSV Columns to Investor Fields
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase text-gray-500 mb-2">
                      Company Name * (Required)
                    </label>
                    <select
                      value={mapping.name}
                      onChange={(e) => setMapping({...mapping, name: e.target.value})}
                      className="w-full p-2 border-2 border-gray-300 rounded-lg font-bold"
                    >
                      <option value="">-- Select Column --</option>
                      {availableColumns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-gray-500 mb-2">
                      Investor Type
                    </label>
                    <select
                      value={mapping.type}
                      onChange={(e) => setMapping({...mapping, type: e.target.value})}
                      className="w-full p-2 border-2 border-gray-300 rounded-lg font-bold"
                    >
                      <option value="">-- Select Column --</option>
                      {availableColumns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-gray-500 mb-2">
                      Region
                    </label>
                    <select
                      value={mapping.region}
                      onChange={(e) => setMapping({...mapping, region: e.target.value})}
                      className="w-full p-2 border-2 border-gray-300 rounded-lg font-bold"
                    >
                      <option value="">-- Select Column --</option>
                      {availableColumns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-gray-500 mb-2">
                      City
                    </label>
                    <select
                      value={mapping.city}
                      onChange={(e) => setMapping({...mapping, city: e.target.value})}
                      className="w-full p-2 border-2 border-gray-300 rounded-lg font-bold"
                    >
                      <option value="">-- Select Column --</option>
                      {availableColumns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-gray-500 mb-2">
                      Contact Person
                    </label>
                    <select
                      value={mapping.contactPerson}
                      onChange={(e) => setMapping({...mapping, contactPerson: e.target.value})}
                      className="w-full p-2 border-2 border-gray-300 rounded-lg font-bold"
                    >
                      <option value="">-- Select Column --</option>
                      {availableColumns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-gray-500 mb-2">
                      Email
                    </label>
                    <select
                      value={mapping.email}
                      onChange={(e) => setMapping({...mapping, email: e.target.value})}
                      className="w-full p-2 border-2 border-gray-300 rounded-lg font-bold"
                    >
                      <option value="">-- Select Column --</option>
                      {availableColumns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-gray-500 mb-2">
                      Phone
                    </label>
                    <select
                      value={mapping.phone}
                      onChange={(e) => setMapping({...mapping, phone: e.target.value})}
                      className="w-full p-2 border-2 border-gray-300 rounded-lg font-bold"
                    >
                      <option value="">-- Select Column --</option>
                      {availableColumns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-gray-500 mb-2">
                      Website
                    </label>
                    <select
                      value={mapping.website}
                      onChange={(e) => setMapping({...mapping, website: e.target.value})}
                      className="w-full p-2 border-2 border-gray-300 rounded-lg font-bold"
                    >
                      <option value="">-- Select Column --</option>
                      {availableColumns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-gray-500 mb-2">
                      Ticket Size
                    </label>
                    <select
                      value={mapping.ticketSize}
                      onChange={(e) => setMapping({...mapping, ticketSize: e.target.value})}
                      className="w-full p-2 border-2 border-gray-300 rounded-lg font-bold"
                    >
                      <option value="">-- Select Column --</option>
                      {availableColumns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-gray-500 mb-2">
                      Priority
                    </label>
                    <select
                      value={mapping.priority}
                      onChange={(e) => setMapping({...mapping, priority: e.target.value})}
                      className="w-full p-2 border-2 border-gray-300 rounded-lg font-bold"
                    >
                      <option value="">-- Select Column --</option>
                      {availableColumns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-gray-500 mb-2">
                      Notes
                    </label>
                    <select
                      value={mapping.notes}
                      onChange={(e) => setMapping({...mapping, notes: e.target.value})}
                      className="w-full p-2 border-2 border-gray-300 rounded-lg font-bold"
                    >
                      <option value="">-- Select Column --</option>
                      {availableColumns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-6">
                <h3 className="font-black text-gray-800 text-lg mb-4">Preview (First 5 Rows)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-200">
                        {availableColumns.map(col => (
                          <th key={col} className="p-2 text-left font-black uppercase border">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.slice(1, 6).map((row, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-100">
                          {availableColumns.map(col => (
                            <td key={col} className="p-2 border">
                              {row[col]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-6 bg-gray-100 border-t flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {csvData.length > 0 && (
              <p className="font-bold">
                Ready to import <span className="text-green-600">{csvData.length - 1}</span> investors
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-300 rounded-lg hover:bg-gray-400 font-bold"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!mapping.name || importing}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold uppercase text-sm disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {importing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Import Investors
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const InvestorsPage = ({ user, contacts }) => {
  const [investors, setInvestors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRegion, setFilterRegion] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [filterStage, setFilterStage] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingInvestor, setEditingInvestor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showEmailMenu, setShowEmailMenu] = useState(null);
  const [showResearchModal, setShowResearchModal] = useState(false);
  const [researchingInvestor, setResearchingInvestor] = useState(null);

  const REGIONS = ['Philippines', 'United Kingdom', 'Malaysia', 'Southeast Asia', 'Global'];
  const INVESTOR_TYPES = ['Venture Capital', 'Family Office', 'Strategic Corporate', 'Impact Investor', 'Revenue-Based Financing', 'Bank/Lender', 'Angel Investor', 'Accelerator', 'Government Fund', 'Utility', 'Energy Company', 'Crowdfunding Platform', 'Infrastructure Fund', 'Climate Fund'];
  const PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

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

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.size} selected investors?`)) return;
    
    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => {
        batch.delete(doc(db, 'users', user.uid, 'investors', id));
      });
      await batch.commit();
      setSelectedIds(new Set());
      loadInvestors();
      alert(`✅ Deleted ${selectedIds.size} investors!`);
    } catch (error) {
      console.error('Error deleting investors:', error);
      alert('Failed to delete some investors');
    }
  };

  const handleBulkExport = () => {
    const selected = investors.filter(inv => selectedIds.has(inv.id));
    
    const csvData = selected.map(inv => ({
      'Company Name': inv.name,
      'Contact Person': inv.contactPerson || '',
      'Email': inv.email || '',
      'Phone': inv.phone || '',
      'Type': inv.type || '',
      'Region': inv.region || '',
      'City': inv.city || '',
      'Website': inv.website || '',
      'LinkedIn': inv.linkedin || '',
      'Ticket Size': inv.ticketSize || '',
      'Priority': inv.priority || '',
      'Stage': inv.stage || '',
      'Fit Score': inv.fit || '',
      'Focus Areas': (inv.focus || []).join('; '),
      'Notes': inv.notes || ''
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `karnot_investors_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert(`✅ Exported ${selected.length} investors to CSV!`);
  };

  const handleBulkEmail = () => {
    const selected = investors.filter(inv => selectedIds.has(inv.id) && inv.email);
    const emails = selected.map(inv => inv.email).join(',');
    
    if (emails) {
      window.location.href = `mailto:?bcc=${emails}`;
    } else {
      alert('⚠️ No email addresses found for selected investors');
    }
  };

  const handleOpenResearch = (investor) => {
    setResearchingInvestor(investor);
    setShowResearchModal(true);
  };

  const handleCloseResearch = () => {
    setShowResearchModal(false);
    setResearchingInvestor(null);
    loadInvestors();
  };

  const handleResolveDuplicates = async (idsToDelete) => {
    if (!user || idsToDelete.length === 0) return;

    try {
      const batch = writeBatch(db);
      idsToDelete.forEach(id => {
        batch.delete(doc(db, 'users', user.uid, 'investors', id));
      });
      await batch.commit();
      loadInvestors();
    } catch (error) {
      console.error('Error resolving duplicates:', error);
    }
  };

  const toggleSelection = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredInvestors.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredInvestors.map(inv => inv.id)));
    }
  };

  const filteredInvestors = investors.filter(inv => {
    const matchesSearch = inv.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         inv.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         inv.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         inv.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRegion = filterRegion === 'ALL' || inv.region === filterRegion;
    const matchesType = filterType === 'ALL' || inv.type === filterType;
    const matchesPriority = filterPriority === 'ALL' || inv.priority === filterPriority;
    const matchesStage = filterStage === 'ALL' || inv.stage === filterStage;
    
    return matchesSearch && matchesRegion && matchesType && matchesPriority && matchesStage;
  });

  const stats = {
    total: investors.length,
    critical: investors.filter(i => i.priority === 'CRITICAL').length,
    high: investors.filter(i => i.priority === 'HIGH').length,
    emailed: investors.filter(i => i.stage === 'EMAILED' || i.stage === 'INTERESTED' || i.stage === 'DOCS_SENT').length,
    committed: investors.filter(i => i.stage === 'COMMITTED').length,
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
              setEditingInvestor(null);
            } catch (error) {
              console.error('Error saving investor:', error);
              alert('Failed to save investor');
            }
          }}
          onCancel={() => {
            setShowAddModal(false);
            setEditingInvestor(null);
          }}
          regions={REGIONS}
          types={INVESTOR_TYPES}
          priorities={PRIORITIES}
          contacts={contacts}
        />
      )}

      {showDuplicates && (
        <DuplicateResolver
          investors={investors}
          onClose={() => setShowDuplicates(false)}
          onResolve={handleResolveDuplicates}
        />
      )}

      {showCSVImport && (
        <CSVImportModal
          onClose={() => setShowCSVImport(false)}
          onImport={loadInvestors}
          user={user}
        />
      )}

      {showResearchModal && researchingInvestor && (
        <ResearchModal
          investor={researchingInvestor}
          user={user}
          onClose={handleCloseResearch}
          onUpdate={loadInvestors}
        />
      )}

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-800 uppercase tracking-tight">
            💰 Investor Companies
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage investor relationships, contacts, and fundraising pipeline
          </p>
        </div>
        
        <div className="flex gap-2 flex-wrap">
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
              onClick={() => setShowDuplicates(true)}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-bold uppercase text-xs tracking-wider flex items-center gap-2"
            >
              <Copy size={16} />
              Clean Duplicates
            </button>
          )}

          <button
            onClick={() => setShowCSVImport(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-bold uppercase text-xs tracking-wider flex items-center gap-2"
          >
            <Upload size={16} />
            Import CSV
          </button>
          
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

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatBadge
          icon={Building}
          label="Total Investors"
          count={stats.total}
          total={stats.total}
          color="gray"
          active={false}
          onClick={() => {}}
        />
        <StatBadge
          icon={DollarSign}
          label="Critical"
          count={stats.critical}
          total={stats.total}
          color="red"
          active={filterPriority === 'CRITICAL'}
          onClick={() => setFilterPriority(filterPriority === 'CRITICAL' ? 'ALL' : 'CRITICAL')}
        />
        <StatBadge
          icon={Target}
          label="High Priority"
          count={stats.high}
          total={stats.total}
          color="orange"
          active={filterPriority === 'HIGH'}
          onClick={() => setFilterPriority(filterPriority === 'HIGH' ? 'ALL' : 'HIGH')}
        />
        <StatBadge
          icon={Mail}
          label="In Progress"
          count={stats.emailed}
          total={stats.total}
          color="blue"
          active={false}
          onClick={() => {}}
        />
        <StatBadge
          icon={CheckSquare}
          label="Committed"
          count={stats.committed}
          total={stats.total}
          color="teal"
          active={filterStage === 'COMMITTED'}
          onClick={() => setFilterStage(filterStage === 'COMMITTED' ? 'ALL' : 'COMMITTED')}
        />
      </div>

      <div className="bg-white p-4 rounded-lg border-2 border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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

          <select
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Stages</option>
            {Object.entries(INVESTOR_STAGES).map(([key, stage]) => (
              <option key={key} value={key}>
                {stage.icon} {stage.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSelectAll}
              className="text-sm font-bold text-blue-600 hover:underline"
            >
              {selectedIds.size === filteredInvestors.length ? 'Deselect All' : 'Select All'}
            </button>
            <span className="text-sm text-gray-600">
              Showing {filteredInvestors.length} of {investors.length} investors
              {selectedIds.size > 0 && ` • ${selectedIds.size} selected`}
            </span>
          </div>

          {(searchTerm || filterRegion !== 'ALL' || filterType !== 'ALL' || filterPriority !== 'ALL' || filterStage !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterRegion('ALL');
                setFilterType('ALL');
                setFilterPriority('ALL');
                setFilterStage('ALL');
              }}
              className="text-sm text-blue-600 hover:underline font-bold"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>

      {viewMode === 'funnel' ? (
        <InvestorFunnel 
          investors={investors} 
          onRefresh={loadInvestors} 
          user={user} 
        />
      ) : (
        <>
          {filteredInvestors.length === 0 ? (
            <div className="bg-white p-12 rounded-lg border-2 border-dashed border-gray-300 text-center">
              <Building className="mx-auto mb-4 text-gray-400" size={48} />
              <h3 className="text-xl font-bold text-gray-700 mb-2">No Investors Found</h3>
              <p className="text-gray-600 mb-4">
                {investors.length === 0 
                  ? 'Import the investor database, CSV, or add your first investor manually'
                  : 'No investors match your search criteria'}
              </p>
              {investors.length === 0 && (
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleImportDatabase}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold"
                  >
                    📥 Import 43 Investors
                  </button>
                  <button
                    onClick={() => setShowCSVImport(true)}
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-bold"
                  >
                    📊 Import CSV
                  </button>
                </div>
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
                  onResearch={() => handleOpenResearch(investor)}
                  contacts={contacts}
                  isSelected={selectedIds.has(investor.id)}
                  onToggleSelect={() => toggleSelection(investor.id)}
                  showEmailMenu={showEmailMenu === investor.id}
                  onToggleEmailMenu={() => setShowEmailMenu(showEmailMenu === investor.id ? null : investor.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 z-50 animate-in fade-in slide-in-from-bottom-4">
          <span className="font-bold text-sm">{selectedIds.size} Selected</span>
          <button
            onClick={handleBulkEmail}
            className="flex items-center gap-2 hover:text-blue-400 transition-colors"
          >
            <Send size={18} />
            <span className="text-sm font-bold">Email</span>
          </button>
          <button
            onClick={handleBulkExport}
            className="flex items-center gap-2 hover:text-green-400 transition-colors"
          >
            <Download size={18} />
            <span className="text-sm font-bold">Export CSV</span>
          </button>
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-2 hover:text-red-400 transition-colors"
          >
            <Trash2 size={18} />
            <span className="text-sm font-bold">Delete</span>
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-2 text-gray-400 hover:text-white"
          >
            <X size={18}/>
          </button>
        </div>
      )}
    </div>
  );
};

// ========================================
// INVESTOR CARD (UPDATED WITH FORMATTED NOTES)
// ========================================
const InvestorCard = ({ investor, onEdit, onDelete, contacts, isSelected, onToggleSelect, showEmailMenu, onToggleEmailMenu, onResearch }) => {
  const [notesExpanded, setNotesExpanded] = useState(false);
  
  const priorityColors = {
    CRITICAL: 'bg-red-100 text-red-700 border-red-300',
    HIGH: 'bg-orange-100 text-orange-700 border-orange-300',
    MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    LOW: 'bg-gray-100 text-gray-700 border-gray-300'
  };

  const stageConfig = INVESTOR_STAGES[investor.stage] || INVESTOR_STAGES.RESEARCH;

  const formatNotesAsHTML = (notes) => {
    if (!notes) return '';
    
    return notes
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^• (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
      .replace(/\n/g, '<br>');
  };

  const emailTemplates = {
    email1: {
      name: '👋 Warm Intro',
      subject: 'Quick intro - Natural refrigerant heat pumps scaling in ASEAN',
      getBody: (inv) => `Hi ${inv.contactPerson?.split(' ')[0] || 'there'},

I hope this finds you well.

I'm Stuart Cox, CEO of Karnot Energy Solutions. We manufacture natural refrigerant heat pump systems (CO₂ and R290) that are PFAS-free - positioning us ahead of the global regulatory phase-out hitting in 2025-2026.

We're currently raising a $250k convertible note to fund our first commercial installations and scale manufacturing. Given your focus on ${inv.focus?.join(', ') || 'cleantech and sustainable energy'}, I thought this might be of interest.

Would you be open to a brief 15-minute call next week to discuss?

Best regards,
Stuart Cox
CEO, Karnot Energy Solutions Inc.
stuart@karnot.com
www.karnot.com`
    },
    email2: {
      name: '💡 Problem + Solution',
      subject: 'The $10B PFAS phase-out opportunity in ASEAN',
      getBody: (inv) => `Hi ${inv.contactPerson?.split(' ')[0] || 'there'},

Following up on my previous note. We're raising $250k convertible note (20% discount, $2.5M cap) to accelerate installations.

THE PROBLEM:
• $10B+ ASEAN HVAC market still 95%+ PFAS-dependent
• Global PFAS ban hitting 2025-2026

OUR SOLUTION:
• CO₂ and R290 heat pumps - zero PFAS, 40%+ margins
• BOI-SIPP registered, proven European tech

Available for a call next Tuesday or Thursday?

Best,
Stuart Cox
stuart@karnot.com`
    },
    email3: {
      name: '📊 Traction Update',
      subject: 'Karnot traction - $2M revenue projected 2026',
      getBody: (inv) => `Hi ${inv.contactPerson?.split(' ')[0] || 'there'},

Key metrics:
• $2M (2026) → $10M (2030) revenue
• 44% gross margins, 83% on EaaS
• $250k raise: $120k inventory, $50k team, $40k marketing

What questions can I address?

Best,
Stuart Cox
stuart@karnot.com`
    },
    email4: {
      name: '📄 Terms',
      subject: 'Karnot Convertible Note - Term Sheet',
      getBody: (inv) => `Hi ${inv.contactPerson?.split(' ')[0] || 'there'},

Convertible note terms:
• Principal: $250,000
• Interest: 8% per annum
• Maturity: 24 months
• Discount: 20%
• Cap: $2.5M pre-money

Let me know if you'd like to discuss.

Best,
Stuart Cox
stuart@karnot.com`
    },
    email5: {
      name: '⏰ Final Call',
      subject: 'Final call - Karnot note closing soon',
      getBody: (inv) => `Hi ${inv.contactPerson?.split(' ')[0] || 'there'},

Final note on Karnot's $250k convertible:
• $150k committed
• $100k in discussions
• Closing soon

Join now, quick call, or connect for Series A?

Best,
Stuart Cox
stuart@karnot.com`
    }
  };

  const sendEmail = (templateKey) => {
    const template = emailTemplates[templateKey];
    const subject = encodeURIComponent(template.subject);
    const body = encodeURIComponent(template.getBody(investor));
    const to = investor.email || '';
    
    if (!to) {
      alert('⚠️ No email address for this investor. Please add one first.');
      return;
    }
    
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
    onToggleEmailMenu();
  };

  const relatedContacts = contacts?.filter(c => 
    c.company?.toLowerCase() === investor.name?.toLowerCase()
  ) || [];

  return (
    <div className={`bg-white rounded-lg border-2 transition-all p-4 relative ${
      isSelected 
        ? 'border-blue-500 ring-2 ring-blue-400 bg-blue-50' 
        : 'border-gray-100 hover:border-blue-300'
    }`}>
      <div className="absolute top-4 left-4 z-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
        />
      </div>

      <div className="pl-8">
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
          
          <div className="flex flex-col items-end gap-2">
            <span className={`px-2 py-1 rounded text-xs font-bold border ${priorityColors[investor.priority] || priorityColors.MEDIUM}`}>
              {investor.priority}
            </span>
            <span className={`px-2 py-1 rounded text-xs font-bold bg-${stageConfig.color}-100 text-${stageConfig.color}-700 border border-${stageConfig.color}-300`}>
              {stageConfig.icon} {stageConfig.label}
            </span>
          </div>
        </div>

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
        </div>

        {(investor.ticketSize || investor.fit) && (
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
        )}

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

        {investor.interactions && investor.interactions.length > 0 && (
          <div className="mb-3 p-2 bg-indigo-50 rounded border border-indigo-200">
            <div className="text-xs font-bold text-indigo-700">
              📝 {investor.interactions.length} Interaction{investor.interactions.length !== 1 ? 's' : ''} Logged
            </div>
          </div>
        )}

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

        {investor.notes && (
          <div className="mt-4 pt-4 border-t-2 border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-black uppercase text-gray-500 flex items-center gap-2">
                <FileText size={12} />
                Research Intelligence
              </div>
              {investor.lastResearchDate && (
                <span className="text-[10px] text-gray-400">
                  Updated: {new Date(investor.lastResearchDate.seconds * 1000).toLocaleDateString()}
                </span>
              )}
            </div>
            
            <div 
              className={`investor-card-notes-content ${
                !notesExpanded && investor.notes.length > 500 ? 'investor-notes-collapsed' : ''
              }`}
              dangerouslySetInnerHTML={{
                __html: formatNotesAsHTML(investor.notes)
              }}
            />
            
            {investor.notes.length > 500 && (
              <button
                onClick={() => setNotesExpanded(!notesExpanded)}
                className="investor-notes-expand-button w-full"
              >
                {notesExpanded ? '▲ Show Less' : '▼ Show More'}
              </button>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-3 border-t mt-3">
          <button
            onClick={onResearch}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded hover:from-blue-600 hover:to-purple-600 text-sm font-bold"
          >
            <Search size={14} />
            Research
          </button>

          <div className="relative flex-1">
            <button
              onClick={onToggleEmailMenu}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded hover:bg-green-100 text-sm font-bold"
            >
              <Mail size={14} />
              Email {showEmailMenu ? '▲' : '▼'}
            </button>
            
            {showEmailMenu && (
              <div className="absolute bottom-full left-0 mb-2 w-64 bg-white border-2 border-green-200 rounded-lg shadow-lg z-50">
                <div className="p-2 bg-green-50 border-b-2 border-green-200">
                  <div className="text-xs font-bold text-green-800">Quick Email Templates</div>
                </div>
                <div className="p-2 max-h-64 overflow-y-auto">
                  {Object.entries(emailTemplates).map(([key, template]) => (
                    <button
                      key={key}
                      onClick={() => sendEmail(key)}
                      className="w-full text-left p-2 hover:bg-green-50 rounded mb-1 group"
                    >
                      <div className="text-sm font-bold text-gray-800 group-hover:text-green-700">
                        {template.name}
                      </div>
                      <div className="text-xs text-gray-600 line-clamp-1">
                        {template.subject}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="p-2 bg-gray-50 border-t text-xs text-gray-600">
                  Click template to open in Outlook
                </div>
              </div>
            )}
          </div>

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
    </div>
  );
};

// ========================================
// INVESTOR MODAL (EXISTING - NO CHANGES)
// ========================================
const InvestorModal = ({ investor, onSave, onCancel, regions, types, priorities, contacts }) => {
  const [activeTab, setActiveTab] = useState('DETAILS');
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
    status: 'ACTIVE',
    interactions: []
  });

  const [focusInput, setFocusInput] = useState('');
  const [newLogType, setNewLogType] = useState('Call');
  const [newLogOutcome, setNewLogOutcome] = useState('');
  const [newLogDate, setNewLogDate] = useState(new Date().toISOString().split('T')[0]);

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

  const handleAddInteraction = () => {
    if (!newLogOutcome) return;
    
    const newInteraction = {
      id: Date.now(),
      date: newLogDate,
      type: newLogType,
      outcome: newLogOutcome
    };
    
    setFormData({
      ...formData,
      interactions: [newInteraction, ...(formData.interactions || [])].sort((a, b) =>
        new Date(b.date) - new Date(a.date)
      )
    });
    
    setNewLogOutcome('');
  };

  const removeInteraction = (id) => {
    setFormData({
      ...formData,
      interactions: formData.interactions.filter(i => i.id !== id)
    });
  };

  const relatedContacts = contacts?.filter(c =>
    c.company?.toLowerCase() === formData.name?.toLowerCase()
  ) || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col md:flex-row shadow-2xl">
        
        <div className="flex-1 p-8 overflow-y-auto border-r border-gray-100 space-y-6">
          <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tighter">
            {investor ? 'Edit Investor' : 'New Investor'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-1">Company Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold mb-1">Ticket Size</label>
                <input
                  type="text"
                  placeholder="$100k-$500k"
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
                <label className="block text-sm font-bold mb-1">Stage</label>
                <select
                  value={formData.stage || 'RESEARCH'}
                  onChange={(e) => setFormData({...formData, stage: e.target.value})}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(INVESTOR_STAGES).map(([key, stage]) => (
                    <option key={key} value={key}>
                      {stage.icon} {stage.label}
                    </option>
                  ))}
                </select>
              </div>
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

            <div>
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

            <div>
              <label className="block text-sm font-bold mb-1">Notes</label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={4}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </form>
        </div>

        <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden">
          <div className="flex border-b bg-white">
            <button
              onClick={() => setActiveTab('ACTIVITY')}
              className={`flex-1 py-5 text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === 'ACTIVITY'
                  ? 'text-orange-600 border-b-4 border-orange-600'
                  : 'text-gray-400'
              }`}
            >
              Activity
            </button>
            <button
              onClick={() => setActiveTab('PEOPLE')}
              className={`flex-1 py-5 text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === 'PEOPLE'
                  ? 'text-teal-600 border-b-4 border-teal-600'
                  : 'text-gray-400'
              }`}
            >
              People ({relatedContacts.length})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'ACTIVITY' && (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-2xl border shadow-sm space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={newLogDate}
                      onChange={(e) => setNewLogDate(e.target.value)}
                      className="text-xs border rounded-xl p-2"
                    />
                    <select
                      value={newLogType}
                      onChange={(e) => setNewLogType(e.target.value)}
                      className="text-xs border rounded-xl p-2 flex-1 font-black uppercase bg-gray-50"
                    >
                      <option value="Call">Call</option>
                      <option value="Meeting">Meeting</option>
                      <option value="Email">Email</option>
                      <option value="Note">Note</option>
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newLogOutcome}
                      onChange={(e) => setNewLogOutcome(e.target.value)}
                      placeholder="Summary of interaction..."
                      className="flex-1 text-sm p-2.5 border rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={handleAddInteraction}
                      className="px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700"
                    >
                      <PlusCircle size={20}/>
                    </button>
                  </div>
                </div>

                {(formData.interactions || []).map(log => (
                  <div key={log.id} className="bg-white p-4 rounded-2xl border shadow-sm group relative">
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full text-white uppercase tracking-widest ${
                        log.type === 'Meeting' ? 'bg-green-500' :
                        log.type === 'Email' ? 'bg-purple-500' :
                        log.type === 'Note' ? 'bg-gray-500' : 'bg-blue-500'
                      }`}>
                        {log.type}
                      </span>
                      <span className="text-[10px] text-gray-400 font-bold">{log.date}</span>
                    </div>
                    <p className="text-sm text-gray-700 font-bold">{log.outcome}</p>

                    <button
                      type="button"
                      onClick={() => removeInteraction(log.id)}
                      className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={12}/>
                    </button>
                  </div>
                ))}

                {(!formData.interactions || formData.interactions.length === 0) && (
                  <div className="text-center py-8 text-gray-400">
                    <FileText size={48} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-bold">No activity logged yet</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'PEOPLE' && (
              <div className="space-y-3">
                {relatedContacts.length === 0 ? (
                  <div className="text-center py-8">
                    <Users size={48} className="mx-auto text-gray-200 mb-2"/>
                    <p className="text-gray-400 text-sm font-bold">No contacts linked yet.</p>
                    <p className="text-[10px] text-gray-400">Add contacts via the Contacts tab.</p>
                  </div>
                ) : (
                  relatedContacts.map(c => (
                    <div key={c.id} className="p-4 bg-white border border-gray-200 rounded-2xl hover:border-teal-400 transition-all">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-gray-800">{c.firstName} {c.lastName}</h4>
                          <p className="text-xs text-teal-600 font-bold uppercase">{c.jobTitle || 'No Title'}</p>
                        </div>
                        {c.phone && (
                          <a href={`tel:${c.phone}`} className="p-2 bg-gray-50 rounded-full text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors">
                            <Phone size={14} />
                          </a>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                        <Mail size={12} />
                        <span>{c.email || 'No Email'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="p-6 bg-white border-t flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 bg-gray-300 rounded hover:bg-gray-400 font-bold"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold"
            >
              Save Investor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvestorsPage;
