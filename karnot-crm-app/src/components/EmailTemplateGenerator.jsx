import React, { useState } from 'react';
import { Mail, Copy, Send, Sparkles, RefreshCw } from 'lucide-react';
import { calculateInvestorScore, karnotProfile } from '../utils/investorScoring';

const EmailTemplateGenerator = ({ investor }) => {
  const [generatedEmail, setGeneratedEmail] = useState(null);
  const [emailStrategy, setEmailStrategy] = useState('auto');
  const [copied, setCopied] = useState(false);

  const scoring = calculateInvestorScore(investor, karnotProfile);

  const determineStrategy = () => {
    if (emailStrategy !== 'auto') return emailStrategy;

    const sectors = (investor.sectors || '').toLowerCase();
    const thesis = (investor.thesis || '').toLowerCase();
    const geo = (investor.geography || '').toLowerCase();
    
    if (sectors.includes('climate') || sectors.includes('cleantech') || thesis.includes('impact')) {
      return 'climate';
    } else if (investor.type === 'Corporate VC' || investor.type === 'Strategic') {
      return 'strategic';
    } else if (geo.includes('philippines') || geo.includes('asean')) {
      return 'market';
    } else {
      return 'technology';
    }
  };

  const generateEmail = () => {
    const strategy = determineStrategy();
    const template = createEmailTemplate(strategy, investor, scoring);
    setGeneratedEmail(template);
  };

  const copyToClipboard = () => {
    if (generatedEmail) {
      navigator.clipboard.writeText(generatedEmail.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50 space-y-4">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={20} className="text-purple-600" />
          <h3 className="font-black text-sm uppercase">Email Generator</h3>
        </div>
        <button
          onClick={generateEmail}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-700 flex items-center gap-2"
        >
          <RefreshCw size={16} />
          Generate
        </button>
      </div>

      {/* Strategy Selector */}
      <div>
        <label className="text-xs font-bold block mb-2">EMAIL APPROACH:</label>
        <select
          value={emailStrategy}
          onChange={(e) => setEmailStrategy(e.target.value)}
          className="w-full p-2 rounded-lg border-2 border-purple-300 font-bold text-sm focus:border-purple-500 focus:outline-none"
        >
          <option value="auto">🤖 Auto-Detect Best Approach</option>
          <option value="climate">🌍 Climate/Impact Angle</option>
          <option value="technology">⚡ Technology Innovation Angle</option>
          <option value="market">🇵🇭 Philippine Market Opportunity</option>
          <option value="strategic">🤝 Strategic Partnership Angle</option>
        </select>
      </div>

      {/* Generated Email Preview */}
      {generatedEmail && (
        <EmailPreview 
          email={generatedEmail}
          investor={investor}
          scoring={scoring}
          onCopy={copyToClipboard}
          copied={copied}
        />
      )}

    </div>
  );
};

const EmailPreview = ({ email, investor, scoring, onCopy, copied }) => {
  return (
    <div className="space-y-3">
      
      {/* Strategy & Fit Info */}
      <div className="bg-white rounded-lg p-3 border-2 border-purple-200 flex justify-between items-center">
        <div>
          <div className="text-xs font-bold text-gray-600">STRATEGY</div>
          <div className="font-black text-sm uppercase">{email.strategy.replace(/_/g, ' ')}</div>
        </div>
        <div>
          <div className="text-xs font-bold text-gray-600">FIT SCORE</div>
          <div className={`text-2xl font-black ${
            scoring.score >= 75 ? 'text-green-600' : 
            scoring.score >= 50 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {scoring.score}
          </div>
        </div>
      </div>

      {/* Email Content */}
      <div className="bg-white rounded-lg border-2 border-gray-200 p-4 max-h-96 overflow-y-auto">
        <div className="font-bold mb-1 text-xs text-gray-600">SUBJECT:</div>
        <div className="font-bold mb-4 text-sm">{email.subject}</div>
        <div className="text-xs text-gray-600 mb-2">BODY:</div>
        <div className="whitespace-pre-wrap text-sm leading-relaxed">{email.body}</div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onCopy}
          className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg font-bold hover:bg-green-700 flex items-center justify-center gap-2"
        >
          <Copy size={18} />
          {copied ? 'COPIED!' : 'COPY EMAIL'}
        </button>
        <button
          onClick={() => window.open(`mailto:${investor.email}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`)}
          className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg font-bold hover:bg-blue-700 flex items-center justify-center gap-2"
        >
          <Send size={18} />
          OPEN IN EMAIL
        </button>
      </div>

      {/* Personalization Tips */}
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-3">
        <div className="font-black text-xs mb-2 uppercase">✏️ Before Sending:</div>
        <ul className="text-xs space-y-1 text-gray-700">
          <li>• Add specific meeting times in their timezone</li>
          <li>• Attach 5-slide teaser deck (NOT full pitch)</li>
          {!investor.connections && <li>• Consider finding warm intro first (10x better response rate)</li>}
          {investor.recentInvestments && investor.recentInvestments.length > 0 && (
            <li>• Mention their {investor.recentInvestments[0].company} investment specifically</li>
          )}
          <li>• Keep subject line under 50 characters for mobile</li>
        </ul>
      </div>

    </div>
  );
};

const createEmailTemplate = (strategy, investor, scoring) => {
  const contactName = investor.contactPerson || 'there';
  const investorName = investor.name;
  
  const templates = {
    climate: {
      subject: `Natural Refrigerant HVAC – Eliminating PFAS in Philippines`,
      body: `Dear ${contactName},

I'm reaching out because ${investorName}'s focus on ${investor.sectors || 'climate tech'} aligns with Karnot Energy's mission to eliminate high-GWP refrigerants from commercial cooling.

**What We Do:**
We deploy CO₂ and R290 heat pump systems across Philippines commercial, industrial, and agricultural facilities – delivering both climate impact and strong ROI.

**Why This Matters:**
- Buildings = 40% of global energy use
- Philippines has 20M+ AC units growing 15% annually
- Switching to natural refrigerants eliminates 2,000+ tonnes CO₂-eq per MW of cooling
- PFAS regulations tightening globally (2025-2030 phase-out)

**Our Traction:**
- BOI-SIPP registered with government incentives
- Operating systems: hotels, food processing, agriculture
- 35-50% energy savings vs conventional HVAC
- Strong pipeline in high-demand sectors

**This Round: $250K Convertible Note**
Use of funds:
  - Scale operations team (Luzon, Visayas, Mindanao)
  - Expand into data centers & cold storage
  - Capture first-mover advantage

**Next Step:**
I have a 5-slide teaser deck ready. Would you be open to reviewing it? If it resonates, we can schedule a brief call.

Happy to work around your schedule.

Best regards,
Stuart Campbell
CEO & Founder, Karnot Energy Solutions Inc.
stuart@karnot.com

P.S. – ${getPSLine(investor, scoring)}`
    },

    strategic: {
      subject: `Strategic Opportunity: Natural Refrigerant HVAC in Philippines`,
      body: `Dear ${contactName},

Given ${investorName}'s strategic position${investor.parentCompany ? ` within ${investor.parentCompany}` : ''}, I thought Karnot Energy's technology could offer interesting synergies.

**What We Do:**
Commercial HVAC systems using natural refrigerants (CO₂/R290) – PFAS-free, high-efficiency, and delivering strong energy savings across Philippine commercial and industrial markets.

**Strategic Fit:**
Your focus on ${investor.sectors || 'the sector'} suggests potential partnerships around:
  - Technology licensing for ${investor.geography || 'regional'} markets
  - Joint go-to-market with real estate/hospitality groups
  - Supply chain integration

**Traction Snapshot:**
- BOI-SIPP registered (Philippines government incentives)
- Live systems: hotels, food processing, agriculture
- 35-50% energy savings vs conventional
- Growing pipeline in data centers, cold storage

**This Round: $250K Convertible Note**
Scaling operations across Luzon, Visayas, Mindanao territories to meet growing demand as PFAS regulations tighten.

**Next Step:**
I've prepared a concise overview deck. Would you be interested in reviewing it? We can explore if there's strategic value beyond just capital.

Best regards,
Stuart Campbell
CEO & Founder, Karnot Energy Solutions Inc.
stuart@karnot.com

P.S. – ${getPSLine(investor, scoring)}`
    },

    market: {
      subject: `First-Mover: Natural Refrigerant HVAC in Philippines`,
      body: `Dear ${contactName},

As ${investorName} knows well, the Philippine market is entering a critical infrastructure phase. Karnot Energy is positioned at the intersection of:
  - Energy efficiency (rising electricity costs)
  - Climate compliance (government 35% renewable by 2030)
  - Commercial real estate growth (5.6% GDP growth)

**What We Do:**
Natural refrigerant (CO₂/R290) HVAC systems for commercial, industrial, and agricultural facilities – PFAS-free and delivering 35-50% energy savings.

**The Philippine Advantage:**
- USD 199B infrastructure gap being addressed
- Government mandating renewable energy transition
- Rising middle class = commercial real estate boom
- First-mover in natural refrigerant adoption (ahead of ASEAN)

**Our Traction:**
- BOI-SIPP registered (tax incentives, duty-free imports)
- Operating systems across hotels, food processing, agriculture
- Strong pipeline in sectors requiring climate compliance + cost savings
- Proven technology in tropical climate conditions

**This Round: $250K Convertible Note**
To scale operations team across territories and capture high-demand sectors (data centers, cold storage, food processing).

**Next Step:**
I have a 5-slide teaser deck outlining the market opportunity. Would you be open to reviewing it?

Happy to schedule a brief call if it resonates.

Best regards,
Stuart Campbell
CEO & Founder, Karnot Energy Solutions Inc.
stuart@karnot.com

P.S. – ${getPSLine(investor, scoring)}`
    },

    technology: {
      subject: `Overlooked CleanTech: Commercial HVAC in SE Asia`,
      body: `Dear ${contactName},

I wanted to share a compelling cleantech opportunity: commercial HVAC in Southeast Asia.

**The Technology Shift:**
Karnot Energy has developed CO₂ and R290 heat pump systems that outperform traditional refrigerants while meeting global PFAS regulations years ahead of mandate.

**Technical Edge:**
- CO₂ (R744) transcritical cycles for high-temp applications
- R290 (propane) for efficient air conditioning
- IoT monitoring for predictive maintenance
- PFAS-free by design (ahead of 2025-2030 phase-out)

This isn't incremental – it's a platform shift as regulatory pressure mounts globally.

**Market Opportunity:**
- Philippines: 20M+ AC units growing 15% annually
- Government: 35% renewable energy by 2030
- Commercial/industrial facilities need both compliance + cost savings
- We deliver 35-50% energy reduction vs conventional systems

**Traction:**
- BOI-SIPP registered (Philippines)
- Operating systems: hotels, food processing, agriculture
- Strong pipeline in data centers, cold storage
- Proven in tropical high-humidity conditions

**This Round: $250K Convertible Note**
Scale operations, expand into high-demand sectors, capture first-mover advantage.

**Next Step:**
I have a technical overview deck ready. Would you be open to reviewing it? If it resonates, we can schedule a call to discuss further.

Best regards,
Stuart Campbell
CEO & Founder, Karnot Energy Solutions Inc.
stuart@karnot.com

P.S. – ${getPSLine(investor, scoring)}`
    }
  };

  return {
    ...templates[strategy],
    strategy: strategy.toUpperCase()
  };
};

const getPSLine = (investor, scoring) => {
  if (investor.recentInvestments && investor.recentInvestments.length > 0) {
    const recent = investor.recentInvestments[0];
    return `I saw your recent investment in ${recent.company} – the parallel to HVAC efficiency is compelling.`;
  } else if (scoring.score >= 75) {
    return `Given ${investor.name}'s thesis, I think Karnot could be a strong portfolio fit.`;
  } else {
    return `Attaching one-pager for quick overview. Open to feedback.`;
  }
};

export default EmailTemplateGenerator;
