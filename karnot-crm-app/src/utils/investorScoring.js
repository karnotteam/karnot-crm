// investorScoring.js - Complete scoring and profiling system
export const karnotProfile = {
  name: 'Karnot Energy Solutions Inc.',
  targetAmount: 250000,
  stage: 'Seed/Pre-Series A',
  sector: 'Clean Tech / Energy Efficiency',
  geography: 'Philippines',
  description: 'Natural refrigerant heat pump systems using CO₂ and R290',
  targetCustomers: ['Commercial', 'Industrial', 'Agricultural', 'Hotels', 'Food Processing'],
  technology: 'PFAS-free HVAC systems',
  maturity: 'BOI-SIPP registered, operational',
  fundingType: 'Convertible Note',
  founderAge: 61,
  exitHorizon: '5 years',
  
  idealInvestor: {
    sectors: ['cleantech', 'energy', 'climate tech', 'industrial tech', 'hardware'],
    geography: ['Philippines', 'ASEAN', 'Southeast Asia'],
    checkSize: [100000, 500000],
    stage: ['Seed', 'Pre-Series A'],
    investorTypes: ['VC Fund', 'Family Office', 'Corporate VC', 'Impact Investor'],
    valuableConnections: ['Real estate developers', 'Hotel groups', 'Manufacturing', 'Government']
  }
};

export const calculateInvestorScore = (investor, companyProfile = karnotProfile) => {
  let score = 0;
  let reasons = [];
  let warnings = [];

  // Sector Match (0-30 points)
  const relevantSectors = [
    'cleantech', 'climate', 'energy', 'industrial', 'hardware',
    'sustainability', 'manufacturing', 'impact', 'infrastructure'
  ];
  
  const investorSectors = (investor.sectors || '').toLowerCase();
  const sectorMatches = relevantSectors.filter(s => investorSectors.includes(s));
  
  if (sectorMatches.length > 0) {
    const sectorScore = Math.min(30, sectorMatches.length * 10);
    score += sectorScore;
    reasons.push(`✓ Sector match: ${sectorMatches.join(', ')} (+${sectorScore})`);
  } else {
    warnings.push('⚠ No clear sector match - may need education');
  }

  // Geography Match (0-25 points)
  const geoFocus = (investor.geography || '').toLowerCase();
  if (geoFocus.includes('philippines')) {
    score += 25;
    reasons.push('✓ Philippines focus (+25)');
  } else if (geoFocus.includes('asean') || geoFocus.includes('southeast asia')) {
    score += 20;
    reasons.push('✓ ASEAN focus (+20)');
  } else if (geoFocus.includes('asia')) {
    score += 15;
    reasons.push('✓ Asia focus (+15)');
  } else {
    warnings.push('⚠ Geographic focus unclear');
  }

  // Check Size Match (0-20 points)
  const targetAmount = companyProfile.targetAmount || 250000;
  const minCheck = investor.minCheck || 0;
  const maxCheck = investor.maxCheck || Infinity;
  
  if (targetAmount >= minCheck && targetAmount <= maxCheck) {
    score += 20;
    reasons.push(`✓ Check size matches ($${targetAmount/1000}k) (+20)`);
  } else if (minCheck > targetAmount) {
    warnings.push(`⚠ Min check ($${minCheck/1000}k) higher than target`);
  } else if (maxCheck < targetAmount) {
    warnings.push(`⚠ Max check ($${maxCheck/1000}k) lower than target`);
  }

  // Stage Match (0-15 points)
  const investorStages = (investor.stages || '').toLowerCase();
  if (investorStages.includes('seed') || investorStages.includes('pre-series a')) {
    score += 15;
    reasons.push('✓ Stage match: Early stage focus (+15)');
  } else if (investorStages.includes('series a')) {
    score += 10;
    reasons.push('✓ Stage match: Series A (+10)');
  }

  // ESG/Impact Focus (0-10 points)
  const investorThesis = (investor.thesis || '').toLowerCase();
  if (investorThesis.includes('esg') || investorThesis.includes('impact') || 
      investorThesis.includes('sustainable')) {
    score += 10;
    reasons.push('✓ ESG/Impact focus (+10)');
  }

  return {
    score,
    grade: score >= 85 ? 'A+' : score >= 75 ? 'A' : score >= 65 ? 'B+' : 
           score >= 55 ? 'B' : score >= 45 ? 'C+' : score >= 35 ? 'C' : 'D',
    reasons,
    warnings,
    recommendation: score >= 65 ? 'HIGH PRIORITY' : 
                    score >= 45 ? 'MEDIUM PRIORITY' : 'LOW PRIORITY'
  };
};
