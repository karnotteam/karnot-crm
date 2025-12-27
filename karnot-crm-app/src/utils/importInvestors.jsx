import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Copy, Mail, Send, FileText, CheckCircle } from 'lucide-react';

const InvestorEmailManager = ({ user }) => {
  const [selectedTemplate, setSelectedTemplate] = useState('email1');
  const [selectedInvestor, setSelectedInvestor] = useState(null);
  const [investors, setInvestors] = useState([]);
  const [personalizedEmail, setPersonalizedEmail] = useState('');
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  // Load investors
  useEffect(() => {
    loadInvestors();
  }, [user]);

  const loadInvestors = async () => {
    try {
      const investorsRef = collection(db, 'investors');
      const snapshot = await getDocs(investorsRef);
      const investorData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setInvestors(investorData);
    } catch (error) {
      console.error('Error loading investors:', error);
      setInvestors([]);
    }
  };

  // Email templates
  const emailTemplates = {
    email1: {
      name: 'Email 1: Warm Introduction',
      subject: 'Quick intro - Natural refrigerant heat pumps scaling in ASEAN',
      altSubject: '[Mutual Connection] mentioned you might be interested in cleantech opportunities',
      body: `Hi [First Name],

I hope this finds you well. [Mutual Connection / LinkedIn context / Why reaching out].

I'm Stuart Cox, CEO of Karnot Energy Solutions. We manufacture natural refrigerant heat pump systems (CO₂ and R290) that are PFAS-free - positioning us ahead of the global regulatory phase-out hitting in 2025-2026.

Why this matters: The Philippines and ASEAN have a $10B+ HVAC market still dominated by PFAS-based refrigerants. We're bringing proven European technology (my previous company Likido was acquired by NASDAQ-listed Dalrada) to capture this regulatory tailwind.

We're currently raising a $250k convertible note to fund our first commercial installations and scale manufacturing. Given your focus on [cleantech/impact investing/ASEAN markets], I thought this might be of interest.

Would you be open to a brief 15-minute call next week to discuss? I can share our deck and financials if helpful.

Best regards,
Stuart Cox
CEO, Karnot Energy Solutions Inc.
+63 [phone]
stuart@karnot.com
www.karnot.com

P.S. We're BOI-SIPP registered in the Philippines and have secured our first export orders. Happy to share traction metrics upfront if that's useful.`,
      tags: ['[First Name]', '[Mutual Connection]', '[cleantech/impact investing/ASEAN markets]', '[phone]'],
      attachments: [],
      timing: 'Initial outreach - Day 0',
      nextStep: 'Wait 3 days, send Email 2 if no response'
    },
    
    email2: {
      name: 'Email 2: Problem + Solution',
      subject: 'The $10B PFAS phase-out opportunity in ASEAN',
      altSubject: 'Re: Natural refrigerant heat pumps - following up',
      body: `Hi [First Name],

Following up on my previous note. I wanted to share why we're excited about this moment for Karnot:

THE PROBLEM:
• Global PFAS refrigerant ban hitting 2025-2026 (EU already phasing out)
• $10B+ ASEAN HVAC market still 95%+ PFAS-dependent
• Major brands (Daikin, Mitsubishi) moving too slowly - entrenched in old tech
• SMEs and industrial users need affordable natural refrigerant solutions NOW

OUR SOLUTION:
• CO₂ and R290 (propane) heat pumps - zero PFAS, high efficiency
• Proven technology (100+ units deployed in Europe via Likido)
• 40%+ gross margins with Energy-as-a-Service (EaaS) model
• BOI-SIPP registered = duty-free imports + tax incentives

EARLY TRACTION:
✅ First export sales closed (₱1.5M in Q1 2026)
✅ 3 domestic EaaS contracts signed (₱97k recurring revenue)
✅ Installation team operational
✅ Manufacturing partnership secured with European suppliers

We're raising $250k convertible note (20% discount, $2.5M cap) to accelerate installations and capture market share before big players catch up.

Deck attached. Would love 15 minutes to walk you through the financials and market opportunity.

Available for a call next Tuesday or Thursday?

Best,
Stuart

---
Stuart Cox | CEO, Karnot Energy Solutions
📧 stuart@karnot.com | 📱 +63 [phone]
🌐 www.karnot.com`,
      tags: ['[First Name]', '[phone]'],
      attachments: ['Karnot_Pitch_Deck_v6.pdf'],
      timing: 'Day 3 - If no response to Email 1',
      nextStep: 'Wait 4 days, send Email 3 if interested but no commit'
    },

    email3: {
      name: 'Email 3: Traction Metrics',
      subject: 'Karnot traction update - $2M revenue projected 2026',
      altSubject: 'Re: Heat pump opportunity - key metrics inside',
      body: `Hi [First Name],

Thanks for your interest in Karnot! Here are the key metrics you asked about:

REVENUE TRAJECTORY:
• 2026: $1.99M revenue (Year 1)
• 2027: $3.65M revenue (+83% growth)
• 2028: $5.11M revenue  
• 2029: $7.20M revenue
• 2030: $10.2M revenue

MARGIN STORY:
• Gross Margin: 44% (2026) → 40%+ steady state
• Export margins: 50% (premium pricing for proven tech)
• EaaS margins: 83% (software-like economics on service contracts)
• EBITDA positive by Q3 2026

USE OF FUNDS ($250k):
1. Inventory & Working Capital: $120k (4-6 units for immediate deployment)
2. Installation Team Expansion: $50k (hire 2 additional technicians)
3. Sales & Marketing: $40k (territory development, lead generation)
4. Legal & Compliance: $25k (intercompany agreements, IP protection)
5. Operating Buffer: $15k (runway extension)

MILESTONES (Next 90 Days):
✅ Close 2 export sales (₱400k each)
✅ Sign 5 new EaaS contracts (₱150k ARR)
✅ Complete first 3 installations (reference customers)
✅ Achieve ₱500k+ monthly revenue run rate
✅ Secure distribution partnership with major HVAC player

KEY DIFFERENTIATORS:
1. Regulatory Tailwind: PFAS ban = forced upgrade cycle
2. Proven Track Record: Previous exit (Likido → Dalrada) validates team
3. EaaS Model: Recurring revenue + customer lock-in
4. Geographic Advantage: Low-cost manufacturing in PH + ASEAN market access
5. First-Mover: 12-18 month head start before incumbents shift

Detailed financial model (R6) attached if you want to dig into the numbers.

What concerns or questions can I address?

Best,
Stuart

---
Stuart Cox | CEO & Founder
Karnot Energy Solutions Inc.
📧 stuart@karnot.com | 📞 +63 [phone]`,
      tags: ['[First Name]', '[phone]'],
      attachments: ['Karnot_Financial_Model_R6.xlsx', 'Karnot_Traction_Dashboard.pdf'],
      timing: 'After positive response / meeting scheduled',
      nextStep: 'Schedule call, then send Email 4 post-call'
    },

    email4: {
      name: 'Email 4: Investment Terms',
      subject: 'Karnot Convertible Note - Term Sheet',
      altSubject: 'Following up - investment terms for your review',
      body: `Hi [First Name],

Great speaking with you [yesterday/last week]. As discussed, here are the formal terms for Karnot's convertible note offering:

INVESTMENT TERMS:

Security Type: Convertible Promissory Note
Issuer: Karnot Energy Solutions Ltd (UK entity)
Principal Amount: $250,000 (accepting $50k-$100k tranches)
Interest Rate: 8% per annum (simple interest)
Maturity Date: 24 months from closing
Conversion Discount: 20% to next equity round price
Valuation Cap: $2,500,000 pre-money
Pro-Rata Rights: Investors maintain right to participate in Series A at pro-rata share

CONVERSION MECHANICS:
• Automatic conversion at qualified financing (>$500k raise)
• Optional conversion at maturity or change of control
• Converts to Ordinary Shares in Karnot Energy Solutions Ltd (UK)

INVESTOR RIGHTS:
• Standard information rights (quarterly financials)
• Observer seat at board meetings (for investments >$100k)
• Most Favored Nation clause (if better terms offered later)

GOVERNANCE:
• Funds flow from UK entity to Philippines operations via intercompany agreement
• UK entity provides management services and technology licensing to PH subsidiary
• Dual entity structure optimizes tax efficiency and investor protection

CLOSING TIMELINE:
• Terms acceptance: By [date + 7 days]
• Due diligence: 2 weeks
• Legal documentation: 1 week  
• Wire transfer & closing: By [date + 30 days]

NEXT STEPS:
1. Review term sheet and financial model
2. Submit any questions or requests for clarification
3. We can schedule a follow-up call to discuss due diligence process
4. Once comfortable, we'll introduce you to our UK legal counsel to finalize docs

Our target close date is [date + 30 days]. We have strong interest from several other investors, so I'd encourage a timely decision if this fits your thesis.

Looking forward to potentially partnering with you on this journey.

Best regards,
Stuart

---
Stuart Cox | CEO & Founder
Karnot Energy Solutions Inc.
📧 stuart@karnot.com | 📱 +63 [phone]
📅 Book a follow-up call: [Calendly link]`,
      tags: ['[First Name]', '[yesterday/last week]', '[date + 7 days]', '[date + 30 days]', '[phone]', '[Calendly link]'],
      attachments: ['Convertible_Note_Term_Sheet.pdf', 'Karnot_Financial_Model_R6.xlsx', 'Cap_Table_Pre_Post_Investment.xlsx', 'Due_Diligence_Checklist.pdf'],
      timing: 'After successful meeting',
      nextStep: 'Wait 7 days for review, then send Email 5 if no decision'
    },

    email5: {
      name: 'Email 5: Final Call',
      subject: 'Final call - Karnot convertible note closing soon',
      altSubject: 'Karnot investment - any final questions?',
      body: `Hi [First Name],

I wanted to reach out one final time regarding Karnot's $250k convertible note.

We're fortunate to have strong momentum:
• $150k committed from existing investor network
• $100k in active term sheet discussions
• Target to close the full round by [date + 14 days]

Given your initial interest and [specific point from previous conversation], I wanted to make sure you had the opportunity to participate before we close this round.

QUICK RECAP:
✅ $2M revenue Year 1, path to $10M by 2030
✅ 40%+ gross margins with proven European technology
✅ Previous successful exit (Likido → Dalrada)
✅ BOI-SIPP registered + first revenue already flowing
✅ 8% interest, 20% discount, $2.5M cap

THREE OPTIONS:

1️⃣ FULL COMMITMENT ($50k-$100k): Let's get you into the round now. I can send final docs today and close by [date + 7 days].

2️⃣ QUESTIONS REMAINING: Happy to schedule a 30-min call to address any concerns. What does your calendar look like this week?

3️⃣ NOT THE RIGHT FIT: Totally understand if timing isn't right. Would love to keep you posted on our progress and reconnect for Series A in 12-18 months.

Which makes most sense for you?

Appreciate your time and consideration.

Best,
Stuart

---
Stuart Cox | CEO, Karnot Energy Solutions
stuart@karnot.com | +63 [phone]

P.S. If you'd like to speak with any of our existing investors or customers for references, happy to facilitate introductions.`,
      tags: ['[First Name]', '[date + 14 days]', '[specific point from previous conversation]', '[date + 7 days]', '[phone]'],
      attachments: [],
      timing: 'Day 14 - Final push if no decision',
      nextStep: 'If no response after 5 days, mark as "Passed" in CRM'
    }
  };

  const template = emailTemplates[selectedTemplate];

  // Personalize email with investor data
  useEffect(() => {
    if (selectedInvestor && template) {
      let personalizedBody = template.body;
      
      // Replace placeholders with investor data
      const firstName = selectedInvestor.contactPerson?.split(' ')[0] || selectedInvestor.name;
      personalizedBody = personalizedBody.replace(/\[First Name\]/g, firstName);
      
      // Add context based on investor type
      if (personalizedBody.includes('[cleantech/impact investing/ASEAN markets]')) {
        const focus = selectedInvestor.focus?.join(', ') || 'cleantech and sustainable energy';
        personalizedBody = personalizedBody.replace('[cleantech/impact investing/ASEAN markets]', focus);
      }

      setPersonalizedEmail(personalizedBody);
    } else {
      setPersonalizedEmail(template?.body || '');
    }
  }, [selectedInvestor, selectedTemplate, template]);

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToClipboard(true);
      setTimeout(() => setCopiedToClipboard(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const openInOutlook = () => {
    const subject = encodeURIComponent(template.subject);
    const body = encodeURIComponent(personalizedEmail);
    const to = selectedInvestor?.email || '';
    
    // Open mailto link (works with Outlook desktop and web)
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tight">
            Investor Email Templates
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Professional email templates for investor outreach and fundraising
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => copyToClipboard(personalizedEmail)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {copiedToClipboard ? (
              <>
                <CheckCircle size={16} />
                Copied!
              </>
            ) : (
              <>
                <Copy size={16} />
                Copy to Clipboard
              </>
            )}
          </button>
          {selectedInvestor && (
            <button
              onClick={openInOutlook}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Send size={16} />
              Open in Outlook
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template Selector */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b bg-gray-50">
              <h3 className="font-bold text-gray-800">Email Sequence</h3>
              <p className="text-xs text-gray-600 mt-1">5-email drip campaign</p>
            </div>
            <div className="p-2">
              {Object.entries(emailTemplates).map(([key, tmpl]) => (
                <button
                  key={key}
                  onClick={() => setSelectedTemplate(key)}
                  className={`w-full text-left p-3 rounded-lg mb-2 transition-all ${
                    selectedTemplate === key
                      ? 'bg-blue-50 border-2 border-blue-500 shadow-sm'
                      : 'hover:bg-gray-50 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Mail size={16} className={selectedTemplate === key ? 'text-blue-600' : 'text-gray-400'} />
                    <span className="font-bold text-sm">{tmpl.name}</span>
                  </div>
                  <p className="text-xs text-gray-600 ml-6">{tmpl.timing}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Investor Selector */}
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <label className="block text-sm font-bold text-gray-800 mb-2">
              Select Investor (Optional)
            </label>
            <select
              value={selectedInvestor?.id || ''}
              onChange={(e) => {
                const investor = investors.find(i => i.id === e.target.value);
                setSelectedInvestor(investor);
              }}
              className="w-full p-2 border rounded-lg text-sm"
            >
              <option value="">Generic Template</option>
              {investors.map(inv => (
                <option key={inv.id} value={inv.id}>
                  {inv.name}
                </option>
              ))}
            </select>
            {selectedInvestor && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg text-xs">
                <div className="font-bold text-blue-900 mb-1">{selectedInvestor.name}</div>
                <div className="text-blue-700">{selectedInvestor.email}</div>
                <div className="text-blue-600 mt-1">{selectedInvestor.contactPerson}</div>
              </div>
            )}
          </div>
        </div>

        {/* Email Preview */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border">
            {/* Email Header */}
            <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="mb-3">
                <label className="text-xs font-bold text-gray-600 uppercase">Subject:</label>
                <div className="font-bold text-gray-900 mt-1">{template.subject}</div>
                <div className="text-sm text-gray-600 mt-1">
                  <span className="text-xs font-bold">Alt:</span> {template.altSubject}
                </div>
              </div>
              
              {template.attachments.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <FileText size={14} />
                  <span className="font-medium">Attachments:</span>
                  <span className="text-xs">{template.attachments.join(', ')}</span>
                </div>
              )}
            </div>

            {/* Email Body */}
            <div className="p-6">
              <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 leading-relaxed">
                {personalizedEmail}
              </pre>
            </div>

            {/* Email Footer */}
            <div className="p-4 border-t bg-gray-50 space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-bold text-gray-700">Timing:</span>
                  <p className="text-gray-600">{template.timing}</p>
                </div>
                <div>
                  <span className="font-bold text-gray-700">Next Step:</span>
                  <p className="text-gray-600">{template.nextStep}</p>
                </div>
              </div>

              {template.tags.length > 0 && (
                <div>
                  <span className="text-xs font-bold text-gray-600 uppercase mb-2 block">
                    Personalization Tags:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {template.tags.map(tag => (
                      <span key={tag} className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full font-mono">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Usage Tips */}
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-bold text-blue-900 mb-2 text-sm">💡 Usage Tips</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• <strong>Personalize:</strong> Always customize [bracketed] placeholders</li>
              <li>• <strong>Select Investor:</strong> Choose from dropdown to auto-fill name and focus areas</li>
              <li>• <strong>Copy:</strong> Click "Copy to Clipboard" then paste into Outlook</li>
              <li>• <strong>Open in Outlook:</strong> Click to create a new email with template pre-filled</li>
              <li>• <strong>Track:</strong> Log sends in the Investor Pipeline tab</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvestorEmailManager;
