import React, { useState } from 'react';
import { FileText, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

const DealStructureChecker = ({ investor, dealTerms = {} }) => {
  const [terms, setTerms] = useState({
    instrumentType: dealTerms.instrumentType || '',
    capitalDestination: dealTerms.capitalDestination || '',
    paymentSchedule: dealTerms.paymentSchedule || '',
    bankAccountControl: dealTerms.bankAccountControl || '',
    invoiceControl: dealTerms.invoiceControl || '',
    operationalControl: dealTerms.operationalControl || '',
    reportingFrequency: dealTerms.reportingFrequency || '',
    exitMechanism: dealTerms.exitMechanism || '',
    ...dealTerms
  });

  const [analysis, setAnalysis] = useState(null);

  const analyzeDealStructure = () => {
    const flags = [];
    const warnings = [];
    const greenSignals = [];

    // CRITICAL RED FLAGS
    if (terms.bankAccountControl === 'INVESTOR_CONTROLLED' || 
        terms.invoiceControl === 'INVESTOR_PAYS') {
      flags.push({
        severity: 'CRITICAL',
        type: 'PAYMENT_CONTROL',
        message: '🚨 REJECT IMMEDIATELY - Investor wants payment control',
        lesson: 'Singapore & Dalrada: Payment control = delayed/no payment',
        action: 'Insist capital goes into YOUR controlled bank account'
      });
    }

    if (terms.paymentSchedule && terms.paymentSchedule.includes('MULTIPLE_TRANCHES') &&
        terms.paymentSchedule.split('_').length > 3) {
      warnings.push({
        severity: 'HIGH',
        type: 'COMPLEX_TRANCHES',
        message: '⚠️ Multiple payment tranches with vague milestones',
        lesson: 'Dalrada: First payment made, then excuses',
        action: 'Maximum 2 tranches with clear, achievable milestones'
      });
    }

    if (terms.instrumentType === 'FULL_ACQUISITION' || 
        terms.instrumentType === 'IP_PURCHASE') {
      flags.push({
        severity: 'CRITICAL',
        type: 'ACQUISITION_TRAP',
        message: '🚨 HIGH RISK - Full acquisition with deferred payment',
        lesson: 'Dalrada bought Likido, paid once, then nothing',
        action: 'Convertible note or equity only - no acquisition structures'
      });
    }

    if (terms.operationalControl === 'INVESTOR_LED' ||
        terms.reportingFrequency === 'WEEKLY') {
      warnings.push({
        severity: 'MEDIUM',
        type: 'MICROMANAGEMENT',
        message: '⚠️ Heavy operational control/reporting requirements',
        lesson: 'You need capital, not babysitting - proven operator at 61',
        action: 'Insist on operational independence, board seat only'
      });
    }

    // GREEN SIGNALS
    if (terms.instrumentType === 'CONVERTIBLE_NOTE' || 
        terms.instrumentType === 'SAFE') {
      greenSignals.push({
        type: 'CLEAN_STRUCTURE',
        message: '✅ Clean convertible structure',
        why: 'Standard founder-friendly terms'
      });
    }

    if (terms.capitalDestination === 'FOUNDER_ACCOUNT' ||
        terms.capitalDestination === 'COMPANY_ACCOUNT') {
      greenSignals.push({
        type: 'CLEAN_CAPITAL',
        message: '✅ Capital into YOUR controlled account',
        why: 'You control deployment - no payment games'
      });
    }

    if (terms.paymentSchedule === 'UPFRONT' || 
        terms.paymentSchedule === 'TWO_TRANCHES_SIMPLE') {
      greenSignals.push({
        type: 'SIMPLE_PAYMENT',
        message: '✅ Simple payment structure',
        why: 'Less room for delays or excuses'
      });
    }

    if (terms.operationalControl === 'FOUNDER_LED' &&
        terms.reportingFrequency === 'QUARTERLY') {
      greenSignals.push({
        type: 'HANDS_OFF',
        message: '✅ Operational independence with reasonable reporting',
        why: 'You run business, they provide capital + strategic support'
      });
    }

    if (terms.exitMechanism && 
        (terms.exitMechanism.includes('FOUNDER_LIQUIDITY') ||
         terms.exitMechanism.includes('ACQUISITION_EXIT'))) {
      greenSignals.push({
        type: 'CLEAR_EXIT',
        message: '✅ Clear exit path with founder liquidity',
        why: 'Your 5-year exit plan can actually happen'
      });
    }

    // Calculate overall safety
    const riskLevel = flags.length > 0 ? 'REJECT' :
                     warnings.length > 2 ? 'HIGH_RISK' :
                     warnings.length > 0 ? 'CAUTION' :
                     greenSignals.length >= 3 ? 'SAFE' : 'NEUTRAL';

    setAnalysis({
      riskLevel,
      flags,
      warnings,
      greenSignals,
      recommendation: getRecommendation(riskLevel, flags, warnings, greenSignals)
    });
  };

  return (
    <div className="border-2 border-orange-200 rounded-lg p-4 bg-orange-50 space-y-4">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={20} className="text-orange-600" />
          <h3 className="font-black text-sm uppercase">Deal Structure Checker</h3>
        </div>
        <button
          onClick={analyzeDealStructure}
          className="bg-orange-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-700"
        >
          Analyze Terms
        </button>
      </div>

      {/* Deal Terms Input */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        
        <div>
          <label className="text-xs font-bold block mb-1">INSTRUMENT TYPE</label>
          <select
            value={terms.instrumentType}
            onChange={(e) => setTerms(prev => ({...prev, instrumentType: e.target.value}))}
            className="w-full p-2 rounded border-2 text-sm"
          >
            <option value="">Select...</option>
            <option value="CONVERTIBLE_NOTE">Convertible Note</option>
            <option value="SAFE">SAFE</option>
            <option value="EQUITY">Direct Equity</option>
            <option value="FULL_ACQUISITION">Full Acquisition</option>
            <option value="IP_PURCHASE">IP Purchase</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-bold block mb-1">CAPITAL DESTINATION</label>
          <select
            value={terms.capitalDestination}
            onChange={(e) => setTerms(prev => ({...prev, capitalDestination: e.target.value}))}
            className="w-full p-2 rounded border-2 text-sm"
          >
            <option value="">Select...</option>
            <option value="FOUNDER_ACCOUNT">Your Controlled Account</option>
            <option value="COMPANY_ACCOUNT">Company Account (You Control)</option>
            <option value="INVESTOR_CONTROLLED">Investor Controlled Account</option>
            <option value="ESCROW">Escrow Account</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-bold block mb-1">PAYMENT SCHEDULE</label>
          <select
            value={terms.paymentSchedule}
            onChange={(e) => setTerms(prev => ({...prev, paymentSchedule: e.target.value}))}
            className="w-full p-2 rounded border-2 text-sm"
          >
            <option value="">Select...</option>
            <option value="UPFRONT">100% Upfront</option>
            <option value="TWO_TRANCHES_SIMPLE">2 Tranches (Clear Milestones)</option>
            <option value="MULTIPLE_TRANCHES">3+ Tranches</option>
            <option value="MILESTONE_BASED">Milestone-Based (Vague)</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-bold block mb-1">INVOICE CONTROL</label>
          <select
            value={terms.invoiceControl}
            onChange={(e) => setTerms(prev => ({...prev, invoiceControl: e.target.value}))}
            className="w-full p-2 rounded border-2 text-sm"
          >
            <option value="">Select...</option>
            <option value="FOUNDER_PAYS">You Pay Your Invoices</option>
            <option value="INVESTOR_APPROVAL">Investor Approval Required</option>
            <option value="INVESTOR_PAYS">Investor "Pays For You"</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-bold block mb-1">OPERATIONAL CONTROL</label>
          <select
            value={terms.operationalControl}
            onChange={(e) => setTerms(prev => ({...prev, operationalControl: e.target.value}))}
            className="w-full p-2 rounded border-2 text-sm"
          >
            <option value="">Select...</option>
            <option value="FOUNDER_LED">Founder Led (Board Seat Only)</option>
            <option value="JOINT_DECISIONS">Joint Decision Making</option>
            <option value="INVESTOR_LED">Investor Led Operations</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-bold block mb-1">REPORTING FREQUENCY</label>
          <select
            value={terms.reportingFrequency}
            onChange={(e) => setTerms(prev => ({...prev, reportingFrequency: e.target.value}))}
            className="w-full p-2 rounded border-2 text-sm"
          >
            <option value="">Select...</option>
            <option value="QUARTERLY">Quarterly</option>
            <option value="MONTHLY">Monthly</option>
            <option value="WEEKLY">Weekly</option>
          </select>
        </div>

      </div>

      {/* Analysis Results */}
      {analysis && (
        <DealAnalysisResults analysis={analysis} />
      )}

    </div>
  );
};

const DealAnalysisResults = ({ analysis }) => {
  const { riskLevel, flags, warnings, greenSignals, recommendation } = analysis;

  const riskColors = {
    REJECT: 'bg-red-600',
    HIGH_RISK: 'bg-orange-600',
    CAUTION: 'bg-yellow-600',
    SAFE: 'bg-green-600',
    NEUTRAL: 'bg-gray-600'
  };

  const riskIcons = {
    REJECT: XCircle,
    HIGH_RISK: AlertTriangle,
    CAUTION: AlertTriangle,
    SAFE: CheckCircle,
    NEUTRAL: FileText
  };

  const RiskIcon = riskIcons[riskLevel];

  return (
    <div className="space-y-4">
      
      {/* Risk Level Banner */}
      <div className={`${riskColors[riskLevel]} text-white p-4 rounded-lg flex items-center gap-3`}>
        <RiskIcon size={24} />
        <div>
          <div className="font-black text-lg">{riskLevel.replace(/_/g, ' ')}</div>
          <div className="text-sm opacity-90">{recommendation}</div>
        </div>
      </div>

      {/* Critical Red Flags */}
      {flags.length > 0 && (
        <div className="bg-red-50 border-2 border-red-400 rounded-lg p-4 space-y-3">
          <h4 className="font-black text-sm uppercase text-red-700">
            🚨 CRITICAL RED FLAGS
          </h4>
          {flags.map((flag, idx) => (
            <div key={idx} className="bg-white rounded p-3 border-2 border-red-200">
              <div className="font-bold text-red-700 mb-1">{flag.message}</div>
              <div className="text-sm text-red-600 mb-2">
                📚 <strong>Lesson:</strong> {flag.lesson}
              </div>
              <div className="text-sm font-bold text-red-800">
                ⚡ <strong>Action:</strong> {flag.action}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 space-y-2">
          <h4 className="font-black text-sm uppercase text-yellow-700">
            ⚠️ WARNINGS
          </h4>
          {warnings.map((warning, idx) => (
            <div key={idx} className="bg-white rounded p-3 border border-yellow-200">
              <div className="font-bold text-yellow-700 mb-1">{warning.message}</div>
              <div className="text-sm text-gray-700">
                💡 {warning.action}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Green Signals */}
      {greenSignals.length > 0 && (
        <div className="bg-green-50 border-2 border-green-400 rounded-lg p-4 space-y-2">
          <h4 className="font-black text-sm uppercase text-green-700">
            ✅ POSITIVE STRUCTURE ELEMENTS
          </h4>
          {greenSignals.map((signal, idx) => (
            <div key={idx} className="bg-white rounded p-3 border border-green-200">
              <div className="font-bold text-green-700 mb-1">{signal.message}</div>
              <div className="text-sm text-gray-700">
                {signal.why}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

const getRecommendation = (riskLevel, flags, warnings, greenSignals) => {
  if (riskLevel === 'REJECT') {
    return 'DO NOT PROCEED - Deal structure has critical flaws based on past painful lessons';
  } else if (riskLevel === 'HIGH_RISK') {
    return 'Renegotiate terms - too many warning signs from previous failed deals';
  } else if (riskLevel === 'CAUTION') {
    return 'Proceed carefully - address warnings before signing';
  } else if (riskLevel === 'SAFE') {
    return `Good structure - ${greenSignals.length} positive elements aligned with your requirements`;
  } else {
    return 'Neutral structure - ensure terms protect your interests';
  }
};

export default DealStructureChecker;
