import React, { useState } from 'react';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { DollarSign, TrendingUp, Users, Mail, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const InvestorFunnel = ({ investors, onRefresh, user }) => {
  const [draggedInvestor, setDraggedInvestor] = useState(null);

  // Funnel stages with metadata
  const STAGES = [
    { 
      id: 'RESEARCH', 
      label: 'Research', 
      color: 'bg-gray-100 border-gray-300',
      icon: AlertCircle,
      description: 'Identifying potential investors'
    },
    { 
      id: 'OUTREACH', 
      label: 'Initial Outreach', 
      color: 'bg-blue-100 border-blue-300',
      icon: Mail,
      description: 'First email sent'
    },
    { 
      id: 'MEETING', 
      label: 'In Conversation', 
      color: 'bg-yellow-100 border-yellow-300',
      icon: Users,
      description: 'Call scheduled or completed'
    },
    { 
      id: 'DILIGENCE', 
      label: 'Due Diligence', 
      color: 'bg-orange-100 border-orange-300',
      icon: FileText,
      description: 'Data room shared'
    },
    { 
      id: 'TERM_SHEET', 
      label: 'Term Sheet', 
      color: 'bg-purple-100 border-purple-300',
      icon: FileText,
      description: 'Terms being negotiated'
    },
    { 
      id: 'LEGAL', 
      label: 'Legal/Closing', 
      color: 'bg-green-100 border-green-300',
      icon: CheckCircle,
      description: 'Finalizing documents'
    },
    { 
      id: 'CLOSED', 
      label: 'Closed Won', 
      color: 'bg-green-500 border-green-600 text-white',
      icon: CheckCircle,
      description: 'Investment received'
    },
    { 
      id: 'PASSED', 
      label: 'Passed', 
      color: 'bg-red-100 border-red-300',
      icon: XCircle,
      description: 'Not interested'
    }
  ];

  // Calculate stats per stage
  const stageStats = STAGES.map(stage => {
    const stageInvestors = investors.filter(inv => inv.stage === stage.id);
    const totalAmount = stageInvestors.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const criticalCount = stageInvestors.filter(inv => inv.priority === 'CRITICAL').length;
    
    return {
      ...stage,
      count: stageInvestors.length,
      amount: totalAmount,
      criticalCount,
      investors: stageInvestors
    };
  });

  // Overall funnel metrics
  const metrics = {
    total: investors.length,
    inProgress: investors.filter(inv => 
      ['OUTREACH', 'MEETING', 'DILIGENCE', 'TERM_SHEET', 'LEGAL'].includes(inv.stage)
    ).length,
    totalPipeline: investors
      .filter(inv => inv.stage !== 'PASSED' && inv.stage !== 'CLOSED')
      .reduce((sum, inv) => sum + (inv.amount || 0), 0),
    closedAmount: investors
      .filter(inv => inv.stage === 'CLOSED')
      .reduce((sum, inv) => sum + (inv.amount || 0), 0),
    closedCount: investors.filter(inv => inv.stage === 'CLOSED').length,
    passedCount: investors.filter(inv => inv.stage === 'PASSED').length
  };

  // Handle drag and drop
  const handleDragStart = (e, investor) => {
    setDraggedInvestor(investor);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, newStage) => {
    e.preventDefault();
    
    if (!draggedInvestor || draggedInvestor.stage === newStage) {
      setDraggedInvestor(null);
      return;
    }

    try {
      await updateDoc(doc(db, 'users', user.uid, 'investors', draggedInvestor.id), {
        stage: newStage,
        stageEnteredDate: new Date().toISOString(),
        lastContact: new Date().toISOString(),
        updatedAt: serverTimestamp()
      });
      
      onRefresh();
      setDraggedInvestor(null);
    } catch (error) {
      console.error('Error updating investor stage:', error);
      alert('Failed to update stage');
    }
  };

  return (
    <div className="space-y-6">
      {/* Funnel Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg border-2 border-gray-100">
          <div className="text-xs font-bold text-gray-500 uppercase">Total Investors</div>
          <div className="text-2xl font-black text-gray-800">{metrics.total}</div>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
          <div className="text-xs font-bold text-blue-600 uppercase">In Progress</div>
          <div className="text-2xl font-black text-blue-700">{metrics.inProgress}</div>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
          <div className="text-xs font-bold text-green-600 uppercase">Pipeline Value</div>
          <div className="text-2xl font-black text-green-700">
            ${(metrics.totalPipeline / 1000).toFixed(0)}k
          </div>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200">
          <div className="text-xs font-bold text-purple-600 uppercase">Closed Won</div>
          <div className="text-2xl font-black text-purple-700">
            ${(metrics.closedAmount / 1000).toFixed(0)}k
          </div>
          <div className="text-xs text-purple-600">{metrics.closedCount} investor{metrics.closedCount !== 1 ? 's' : ''}</div>
        </div>
        
        <div className="bg-red-50 p-4 rounded-lg border-2 border-red-200">
          <div className="text-xs font-bold text-red-600 uppercase">Passed</div>
          <div className="text-2xl font-black text-red-700">{metrics.passedCount}</div>
        </div>
      </div>

      {/* Funnel Stages */}
      <div className="bg-white rounded-lg border-2 border-gray-100 p-4">
        <h2 className="text-xl font-black mb-4 uppercase">Fundraising Funnel</h2>
        <p className="text-sm text-gray-600 mb-6">
          Drag & drop investors between stages to update their status
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stageStats.filter(stage => stage.id !== 'CLOSED' && stage.id !== 'PASSED').map(stage => (
            <div
              key={stage.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
              className={`${stage.color} border-2 rounded-lg p-4 min-h-[300px] transition-all ${
                draggedInvestor && draggedInvestor.stage !== stage.id ? 'ring-2 ring-blue-400' : ''
              }`}
            >
              {/* Stage Header */}
              <div className="mb-3 pb-3 border-b-2 border-current">
                <div className="flex items-center gap-2 mb-1">
                  <stage.icon size={18} />
                  <h3 className="font-black text-sm uppercase">{stage.label}</h3>
                </div>
                <p className="text-xs opacity-75">{stage.description}</p>
                
                {/* Stage Stats */}
                <div className="flex items-center gap-3 mt-2 text-xs font-bold">
                  <span>{stage.count} investor{stage.count !== 1 ? 's' : ''}</span>
                  {stage.amount > 0 && (
                    <>
                      <span>•</span>
                      <span>${(stage.amount / 1000).toFixed(0)}k</span>
                    </>
                  )}
                  {stage.criticalCount > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-red-600">{stage.criticalCount} CRITICAL</span>
                    </>
                  )}
                </div>
              </div>

              {/* Investor Cards */}
              <div className="space-y-2">
                {stage.investors.map(investor => (
                  <InvestorCard
                    key={investor.id}
                    investor={investor}
                    onDragStart={handleDragStart}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Closed & Passed (Full Width) */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          {stageStats.filter(stage => stage.id === 'CLOSED' || stage.id === 'PASSED').map(stage => (
            <div
              key={stage.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
              className={`${stage.color} border-2 rounded-lg p-4 transition-all ${
                draggedInvestor && draggedInvestor.stage !== stage.id ? 'ring-2 ring-blue-400' : ''
              }`}
            >
              {/* Stage Header */}
              <div className="mb-3 pb-3 border-b-2 border-current">
                <div className="flex items-center gap-2 mb-1">
                  <stage.icon size={18} />
                  <h3 className="font-black text-sm uppercase">{stage.label}</h3>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold">
                  <span>{stage.count} investor{stage.count !== 1 ? 's' : ''}</span>
                  {stage.amount > 0 && (
                    <>
                      <span>•</span>
                      <span>${(stage.amount / 1000).toFixed(0)}k</span>
                    </>
                  )}
                </div>
              </div>

              {/* Investor List (Compact) */}
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {stage.investors.map(investor => (
                  <div
                    key={investor.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, investor)}
                    className="bg-white bg-opacity-50 p-2 rounded cursor-move hover:bg-opacity-75 transition-all text-xs"
                  >
                    <div className="font-bold">{investor.name}</div>
                    {investor.amount > 0 && (
                      <div className="text-gray-700">${(investor.amount / 1000).toFixed(0)}k</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Funnel Conversion Stats */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200 p-6">
        <h3 className="text-lg font-black uppercase mb-4">Conversion Rates</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ConversionMetric
            from="Research"
            to="Outreach"
            fromCount={stageStats.find(s => s.id === 'RESEARCH')?.count || 0}
            toCount={stageStats.find(s => s.id === 'OUTREACH')?.count || 0}
          />
          <ConversionMetric
            from="Outreach"
            to="Meeting"
            fromCount={stageStats.find(s => s.id === 'OUTREACH')?.count || 0}
            toCount={stageStats.find(s => s.id === 'MEETING')?.count || 0}
          />
          <ConversionMetric
            from="Meeting"
            to="Due Diligence"
            fromCount={stageStats.find(s => s.id === 'MEETING')?.count || 0}
            toCount={stageStats.find(s => s.id === 'DILIGENCE')?.count || 0}
          />
          <ConversionMetric
            from="Due Diligence"
            to="Closed"
            fromCount={stageStats.find(s => s.id === 'DILIGENCE')?.count || 0}
            toCount={stageStats.find(s => s.id === 'CLOSED')?.count || 0}
          />
        </div>
      </div>
    </div>
  );
};

// Investor Card Component for Funnel
const InvestorCard = ({ investor, onDragStart }) => {
  const priorityColors = {
    CRITICAL: 'bg-red-500',
    HIGH: 'bg-orange-500',
    MEDIUM: 'bg-yellow-500',
    LOW: 'bg-gray-400'
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, investor)}
      className="bg-white rounded-lg p-3 cursor-move hover:shadow-md transition-all border border-gray-200"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="font-bold text-sm leading-tight mb-1">{investor.name}</div>
          <div className="text-xs text-gray-600">{investor.type}</div>
        </div>
        <div className={`w-2 h-2 rounded-full ${priorityColors[investor.priority] || priorityColors.MEDIUM}`} />
      </div>

      {investor.amount > 0 && (
        <div className="text-sm font-bold text-green-600 mb-1">
          ${(investor.amount / 1000).toFixed(0)}k
        </div>
      )}

      {investor.contactPerson && (
        <div className="text-xs text-gray-600 truncate">
          👤 {investor.contactPerson}
        </div>
      )}

      {investor.nextAction && (
        <div className="text-xs text-gray-600 mt-2 pt-2 border-t truncate">
          📋 {investor.nextAction}
        </div>
      )}
    </div>
  );
};

// Conversion Metric Component
const ConversionMetric = ({ from, to, fromCount, toCount }) => {
  const rate = fromCount > 0 ? ((toCount / fromCount) * 100).toFixed(0) : 0;
  
  return (
    <div className="bg-white rounded-lg p-3 border">
      <div className="text-xs text-gray-600 mb-1">{from} → {to}</div>
      <div className="text-2xl font-black text-blue-600">{rate}%</div>
      <div className="text-xs text-gray-500">{toCount} of {fromCount}</div>
    </div>
  );
};

export default InvestorFunnel;
