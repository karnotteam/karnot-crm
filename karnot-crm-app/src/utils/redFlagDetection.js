// redFlagDetection.js - Stuart's hard-won lessons encoded
export const criticalRedFlags = {
  
  PUMP_AND_DUMP: {
    keywords: [
      'no published financials',
      'no audited accounts',
      'shell company',
      'SEC investigation',
      'fraud allegation',
      'pump and dump',
      'stock manipulation'
    ],
    severity: 'CRITICAL',
    action: 'REJECT IMMEDIATELY',
    lesson: 'Dalrada - publicly traded but no real accounts = fraud'
  },

  PAYMENT_CONTROL: {
    keywords: [
      'pay invoices for you',
      'manage your payments',
      'control disbursements',
      'we handle payments',
      'payment approval process',
      'signatory on account'
    ],
    severity: 'CRITICAL',
    action: 'REJECT IMMEDIATELY',
    lesson: 'Singapore & Dalrada - payment control = delayed/no payment'
  },

  POLITICAL_DEPENDENCY: {
    keywords: [
      'government connected',
      'political relationship',
      'minister connection',
      'election dependent',
      'regime change risk',
      'politically exposed person'
    ],
    severity: 'CRITICAL',
    action: 'AVOID',
    lesson: 'Malaysia Dato/Najib - 3M evaporated with election loss'
  },

  FAMILY_VOLATILITY: {
    keywords: [
      'family office',
      'single family control',
      'no professional management',
      'owner gambling',
      'casino losses',
      'personal financial issues'
    ],
    severity: 'HIGH',
    action: 'EXTREME CAUTION',
    lesson: 'Singapore JV - son lost millions at casino, deal collapsed'
  },

  ACQUISITION_TRAP: {
    keywords: [
      'acquire 100%',
      'full acquisition',
      'payment in installments',
      'deferred consideration',
      'earnout structure',
      'IP purchase'
    ],
    severity: 'HIGH',
    action: 'VERIFY FUNDS',
    lesson: 'Dalrada bought Likido, paid once, then nothing'
  }
};

export const greenFlags = {
  
  INSTITUTIONAL_BACKING: {
    keywords: [
      'institutional LP',
      'IFC backing',
      'ADB investment',
      'professional fund management',
      'multiple LPs',
      'disclosed fund size'
    ],
    value: '+30 points',
    why: 'Professional structures, not personality-dependent'
  },

  CLEAN_CAPITAL: {
    keywords: [
      'convertible note',
      'SAFE note',
      'direct wire transfer',
      'capital into your account',
      'simple terms',
      'founder friendly'
    ],
    value: '+25 points',
    why: 'Clean structure, no payment control games'
  },

  HANDS_OFF: {
    keywords: [
      'founder led',
      'operational independence',
      'board seat only',
      'quarterly reporting',
      'strategic advisor',
      'non-interference'
    ],
    value: '+20 points',
    why: 'You run operations, they provide capital + network'
  },

  PHILIPPINE_EXPERTISE: {
    keywords: [
      'philippines portfolio',
      'manila office',
      'BOI experience',
      'ASEAN network',
      'local partnerships',
      'philippine real estate'
    ],
    value: '+20 points',
    why: 'Market knowledge, can actually help with introductions'
  },

  REALISTIC_TIMELINE: {
    keywords: [
      '5-7 year horizon',
      'patient capital',
      'long-term build',
      'hardware experience',
      'industrial timeline',
      'not quick flip'
    ],
    value: '+15 points',
    why: 'Aligns with 5-year build plan'
  },

  FOUNDER_EXITS: {
    keywords: [
      'founder secondary',
      'successful exits',
      'founder liquidity',
      'acquisition track record',
      'exit history',
      'portfolio company testimonials'
    ],
    value: '+15 points',
    why: 'Need clean exit in 5 years with good payout'
  }
};

export const detectFlags = (text, websiteContent = '') => {
  const allText = (text + ' ' + websiteContent).toLowerCase();
  const detectedRedFlags = [];
  const detectedGreenFlags = [];

  // Check red flags
  Object.entries(criticalRedFlags).forEach(([flagType, flagData]) => {
    const matches = flagData.keywords.filter(keyword => 
      allText.includes(keyword.toLowerCase())
    );
    
    if (matches.length > 0) {
      detectedRedFlags.push({
        type: flagType,
        severity: flagData.severity,
        action: flagData.action,
        lesson: flagData.lesson,
        matches: matches,
        count: matches.length
      });
    }
  });

  // Check green flags
  Object.entries(greenFlags).forEach(([flagType, flagData]) => {
    const matches = flagData.keywords.filter(keyword => 
      allText.includes(keyword.toLowerCase())
    );
    
    if (matches.length > 0) {
      detectedGreenFlags.push({
        type: flagType,
        value: flagData.value,
        why: flagData.why,
        matches: matches,
        count: matches.length
      });
    }
  });

  return {
    redFlags: detectedRedFlags,
    greenFlags: detectedGreenFlags,
    risk: detectedRedFlags.some(f => f.severity === 'CRITICAL') ? 'CRITICAL' :
          detectedRedFlags.some(f => f.severity === 'HIGH') ? 'HIGH' :
          detectedRedFlags.length > 0 ? 'MEDIUM' : 'LOW'
  };
};
