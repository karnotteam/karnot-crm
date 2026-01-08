import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Save } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const InvestorResearchChecklist = ({ investor, user, onComplete }) => {
  const [checklist, setChecklist] = useState({
    // CRITICAL CHECKS (Must pass ALL)
    financialTransparency: null,
    paymentStructure: null,
    politicalIndependence: null,
    professionalManagement: null,
    
    // POSITIVE CHECKS
    philippineExperience: null,
    handsOffReputation: null,
    realisticTimeline: null,
    cleanExits: null,
    
    // NOTES
    researchNotes: '',
    researchedBy: user?.email || '',
    researchDate: null
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (investor.researchChecklist) {
      setChecklist(investor.researchChecklist);
    }
  }, [investor]);

  const criticalChecks = [
    {
      id: 'financialTransparency',
      question: 'Published, audited financials available? (if public/listed)',
      why: 'Dalrada lesson - no accounts = pump & dump',
      redFlag: 'If publicly traded but no financials → IMMEDIATE REJECT',
      priority: 'CRITICAL'
    },
    {
      id: 'paymentStructure',
      question: 'Capital goes directly into YOUR controlled bank account?',
      why: 'Singapore/Dalrada lesson - payment control = no payment',
      redFlag: 'If they want to "pay invoices for you" → IMMEDIATE REJECT',
      priority: 'CRITICAL'
    },
    {
      id: 'politicalIndependence',
      question: 'Funding independent of political connections/elections?',
      why: 'Malaysia lesson - political money disappears overnight',
      redFlag: 'If deal depends on politician staying in power → REJECT',
      priority: 'CRITICAL'
    },
    {
      id: 'professionalManagement',
      question: 'Professional fund management (not single family control)?',
      why: 'Singapore lesson - family volatility killed deal',
      redFlag: 'If single family with gambling/volatility → HIGH RISK',
      priority: 'CRITICAL'
    }
  ];

  const positiveChecks = [
    {
      id: 'philippineExperience',
      question: 'Active Philippine portfolio companies?',
      why: 'Market knowledge, introductions, navigate complexity',
      priority: 'NICE_TO_HAVE'
    },
    {
      id: 'handsOffReputation',
      question: 'Portfolio companies report operational independence?',
      why: 'You\'re proven operator - need capital not micromanagement',
      priority: 'NICE_TO_HAVE'
    },
    {
      id: 'realisticTimeline',
      question: '5-year build timeline acceptable? Hardware experience?',
      why: 'Not looking for quick flip - building real business',
      priority: 'NICE_TO_HAVE'
    },
    {
      id: 'cleanExits',
      question: 'Track record of successful founder exits?',
      why: 'Your exit in 5 years needs to actually happen with good payout',
      priority: 'NICE_TO_HAVE'
    }
  ];

  const updateCheck = (id, value) => {
    setChecklist(prev => ({
      ...prev,
      [id]: value,
      researchDate: new Date().toISOString()
    }));
  };

  const calculateStatus = () => {
    const criticalFailed = criticalChecks.some(check => checklist[check.id] === false);
    
    if (criticalFailed) {
      return {
        status: 'REJECT',
        color: 'bg-red-600',
        icon: XCircle,
        message: '⛔ FAILED CRITICAL CHECKS - DO NOT PROCEED (based on past lessons)'
      };
    }

    const allCriticalPass = criticalChecks.every(check => checklist[check.id] === true);
    
    if (!allCriticalPass) {
      return {
        status: 'INCOMPLETE',
        color: 'bg-yellow-600',
        icon: AlertTriangle,
        message: '⚠️ Complete all critical checks before deciding'
      };
    }

    const positiveScore = positiveChecks.filter(check => checklist[check.id] === true).length;

    if (positiveScore >= 3) {
      return {
        status: 'STRONG_FIT',
        color: 'bg-green-600',
        icon: CheckCircle,
        message: `✅ Passed all critical + ${positiveScore}/4 positive signals - PURSUE`
      };
    } else {
      return {
        status: 'ACCEPTABLE',
        color: 'bg-blue-600',
        icon: CheckCircle,
        message: '✓ Passed critical checks - Proceed with standard caution'
      };
    }
  };

  const saveChecklist = async () => {
    setSaving(true);
    try {
      const status = calculateStatus();
      await updateDoc(doc(db, 'users', user.uid, 'investors', investor.id), {
        researchChecklist: checklist,
        researchStatus: status.status,
        researchScore: calculateResearchScore(checklist),
        updatedAt: new Date()
      });
      
      if (onComplete) {
        onComplete(status);
      }
      
      alert('Research checklist saved!');
    } catch (error) {
      console.error('Error saving checklist:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const status = calculateStatus();
  const StatusIcon = status.icon;

  return (
    <div className="space-y-4">
      
      {/* Status Banner */}
      <div className={`${status.color} text-white p-4 rounded-lg flex items-center gap-3`}>
        <StatusIcon size={24} />
        <div>
          <div className="font-black text-lg">{status.status.replace(/_/g, ' ')}</div>
          <div className="text-sm opacity-90">{status.message}</div>
        </div>
      </div>

      {/* Critical Checks */}
      <div className="space-y-3">
        <h4 className="font-black text-sm uppercase text-red-600 flex items-center gap-2">
          <AlertTriangle size={18} />
          CRITICAL CHECKS (Must Pass ALL)
        </h4>
        
        {criticalChecks.map(check => (
          <div key={check.id} className="border-2 border-red-200 rounded-lg p-4 bg-red-50 space-y-3">
            <div>
              <div className="font-bold text-sm mb-1">{check.question}</div>
              <div className="text-xs text-gray-600 mb-1">
                📚 <strong>Lesson:</strong> {check.why}
              </div>
              <div className="text-xs text-red-700 font-bold">
                🚩 {check.redFlag}
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => updateCheck(check.id, true)}
                className={`flex-1 py-2 px-4 rounded-lg font-bold transition-all ${
                  checklist[check.id] === true 
                    ? 'bg-green-600 text-white shadow-lg' 
                    : 'bg-white border-2 border-green-300 text-green-700 hover:bg-green-50'
                }`}
              >
                ✓ PASS
              </button>
              <button
                onClick={() => updateCheck(check.id, false)}
                className={`flex-1 py-2 px-4 rounded-lg font-bold transition-all ${
                  checklist[check.id] === false 
                    ? 'bg-red-600 text-white shadow-lg' 
                    : 'bg-white border-2 border-red-300 text-red-700 hover:bg-red-50'
                }`}
              >
                ✗ FAIL
              </button>
              <button
                onClick={() => updateCheck(check.id, null)}
                className={`flex-1 py-2 px-4 rounded-lg font-bold transition-all ${
                  checklist[check.id] === null 
                    ? 'bg-yellow-600 text-white shadow-lg' 
                    : 'bg-white border-2 border-yellow-300 text-yellow-700 hover:bg-yellow-50'
                }`}
              >
                ? UNKNOWN
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Positive Checks (only if critical passed) */}
      {criticalChecks.every(c => checklist[c.id] === true) && (
        <div className="space-y-3">
          <h4 className="font-black text-sm uppercase text-green-600 flex items-center gap-2">
            <CheckCircle size={18} />
            POSITIVE SIGNALS (Add Value)
          </h4>
          
          {positiveChecks.map(check => (
            <div key={check.id} className="border-2 border-green-200 rounded-lg p-4 bg-green-50 space-y-3">
              <div>
                <div className="font-bold text-sm mb-1">{check.question}</div>
                <div className="text-xs text-gray-600">
                  💡 {check.why}
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => updateCheck(check.id, true)}
                  className={`flex-1 py-2 px-4 rounded-lg font-bold transition-all ${
                    checklist[check.id] === true 
                      ? 'bg-green-600 text-white shadow-lg' 
                      : 'bg-white border-2 border-green-300 text-green-700 hover:bg-green-50'
                  }`}
                >
                  ✓ YES
                </button>
                <button
                  onClick={() => updateCheck(check.id, false)}
                  className={`flex-1 py-2 px-4 rounded-lg font-bold transition-all ${
                    checklist[check.id] === false 
                      ? 'bg-gray-400 text-white shadow-lg' 
                      : 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  ✗ NO
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Research Notes */}
      <div className="space-y-2">
        <label className="font-bold text-sm">Research Notes & Evidence:</label>
        <textarea
          value={checklist.researchNotes}
          onChange={(e) => setChecklist(prev => ({ ...prev, researchNotes: e.target.value }))}
          placeholder="Document your findings:
- Where verified financials?
- Who confirmed payment structure?
- Links to portfolio company testimonials?
- Any conversations or references?"
          className="w-full border-2 rounded-lg p-3 text-sm focus:border-blue-400 focus:outline-none"
          rows={5}
        />
      </div>

      {/* Save Button */}
      <button
        onClick={saveChecklist}
        disabled={saving}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-black hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <Save size={18} />
        {saving ? 'SAVING...' : 'SAVE RESEARCH'}
      </button>

      {checklist.researchDate && (
        <div className="text-xs text-gray-500 text-center">
          Last updated: {new Date(checklist.researchDate).toLocaleString()}
        </div>
      )}

    </div>
  );
};

const calculateResearchScore = (checklist) => {
  let score = 0;
  
  const criticalIds = ['financialTransparency', 'paymentStructure', 'politicalIndependence', 'professionalManagement'];
  criticalIds.forEach(id => {
    if (checklist[id] === true) score += 20;
    if (checklist[id] === false) score = 0;
  });
  
  const positiveIds = ['philippineExperience', 'handsOffReputation', 'realisticTimeline', 'cleanExits'];
  positiveIds.forEach(id => {
    if (checklist[id] === true) score += 5;
  });
  
  return score;
};

export default InvestorResearchChecklist;
