// Karnot Energy Solutions - Target Investor/Lender Database
// Target: $250k Convertible Note in tranches of $50k-$100k
// Focus: Cleantech, Impact Investing, Revenue-Based Financing, Family Offices

const investorDatabase = [
  
  // ============================================
  // PHILIPPINES - FAMILY OFFICES & IMPACT INVESTORS
  // ============================================
  
  {
    id: "PH001",
    name: "Ayala Corporation - AC Ventures",
    type: "Corporate VC",
    region: "Philippines",
    city: "Makati, Metro Manila",
    focus: ["Cleantech", "Energy", "Infrastructure"],
    ticketSize: "$100k-$500k",
    stage: "Seed, Series A",
    website: "https://www.acventures.com.ph",
    email: "info@acventures.com.ph",
    linkedin: "https://linkedin.com/company/ac-ventures",
    notes: "Part of Ayala conglomerate. Strong interest in sustainable energy. Connected to property development (potential customers).",
    contactPerson: "Paolo Benigno A. Aquino IV (Managing Director)",
    fit: "EXCELLENT - Infrastructure play, cleantech focus, corporate development potential",
    priority: "CRITICAL"
  },
  
  {
    id: "PH002",
    name: "Kickstart Ventures",
    type: "Venture Capital",
    region: "Philippines",
    city: "Pasig, Metro Manila",
    focus: ["Tech", "Impact", "Sustainability"],
    ticketSize: "$50k-$250k",
    stage: "Pre-seed, Seed",
    website: "https://kickstart.ph",
    email: "hello@kickstart.ph",
    linkedin: "https://linkedin.com/company/kickstart-ventures-inc",
    notes: "Globe Telecom's VC arm. Active in cleantech. Fast decision-making. Open to hardware.",
    contactPerson: "Minette Navarrete (President)",
    fit: "EXCELLENT - Hardware-friendly, fast moving, strong local network",
    priority: "CRITICAL"
  },
  
  {
    id: "PH003",
    name: "Foxmont Capital Partners",
    type: "Family Office",
    region: "Philippines",
    city: "Makati, Metro Manila",
    focus: ["Manufacturing", "Infrastructure", "Renewable Energy"],
    ticketSize: "$100k-$500k",
    stage: "Seed, Growth",
    website: "https://foxmontcapital.com",
    email: "inquiries@foxmontcapital.com",
    linkedin: "https://linkedin.com/company/foxmont-capital-partners",
    notes: "Focused on industrial/manufacturing. Understands capital equipment business models. Patient capital.",
    contactPerson: "TBD - Request introduction",
    fit: "VERY GOOD - Industrial manufacturing focus, understands CAPEX models",
    priority: "HIGH"
  },
  
  {
    id: "PH004",
    name: "Kaya Founders",
    type: "Accelerator/Micro-VC",
    region: "Philippines",
    city: "Manila",
    focus: ["Impact", "Sustainability", "Tech-enabled"],
    ticketSize: "$25k-$100k",
    stage: "Pre-seed, Seed",
    website: "https://kayafounders.com",
    email: "hello@kayafounders.com",
    linkedin: "https://linkedin.com/company/kaya-founders",
    notes: "Impact-first investor. Smaller checks but valuable network and acceleration support.",
    contactPerson: "Earl Valencia Martin (Managing Partner)",
    fit: "GOOD - Impact angle strong, smaller check size",
    priority: "MEDIUM"
  },
  
  {
    id: "PH005",
    name: "Patamar Capital",
    type: "Impact VC",
    region: "Philippines (Singapore-based)",
    city: "Manila operations",
    focus: ["Financial Inclusion", "Climate", "Agriculture"],
    ticketSize: "$250k-$1M",
    stage: "Seed, Series A",
    website: "https://patamarcapital.com",
    email: "info@patamarcapital.com",
    linkedin: "https://linkedin.com/company/patamar-capital",
    notes: "Southeast Asia impact investor. Strong climate focus. Larger tickets but worth approaching.",
    contactPerson: "Benedicta Marzinotto (Partner)",
    fit: "GOOD - Climate focus, but may be too early stage for them",
    priority: "MEDIUM"
  },
  
  {
    id: "PH006",
    name: "Gobi Partners Philippines",
    type: "Venture Capital",
    region: "Philippines",
    city: "Makati, Metro Manila",
    focus: ["Tech", "Logistics", "Fintech"],
    ticketSize: "$100k-$500k",
    stage: "Seed, Series A",
    website: "https://www.gobi.vc",
    email: "info@gobi.vc",
    linkedin: "https://linkedin.com/company/gobivc",
    notes: "Pan-Asian VC with Manila presence. Less cleantech-focused but open to B2B SaaS/hardware.",
    contactPerson: "Justin Yu (General Partner)",
    fit: "MODERATE - Not core focus but large fund, worth a pitch",
    priority: "LOW"
  },
  
  {
    id: "PH007",
    name: "Philippine Business Bank - Innovation Financing",
    type: "Bank / Revenue-Based Lending",
    region: "Philippines",
    city: "Makati, Metro Manila",
    focus: ["SME Lending", "Equipment Financing", "Working Capital"],
    ticketSize: "$50k-$500k",
    stage: "Revenue-stage companies",
    website: "https://www.pbb.com.ph",
    email: "corporate@pbb.com.ph",
    notes: "Offers equipment financing and working capital loans. May structure as revenue-based loan rather than equity.",
    contactPerson: "SME Banking Division",
    fit: "GOOD - Non-dilutive option, good for equipment purchases",
    priority: "HIGH"
  },
  
  {
    id: "PH008",
    name: "Robinsons Land - Corporate Development",
    type: "Strategic Corporate",
    region: "Philippines",
    city: "Pasig, Metro Manila",
    focus: ["Real Estate", "Commercial Properties", "Sustainability"],
    ticketSize: "$100k-$500k (strategic investment)",
    stage: "Pilot customers → Strategic investor",
    website: "https://www.robinsonsland.com",
    email: "corporate@robinsonsland.com",
    notes: "Major property developer. HVAC is massive OPEX for them. Potential pilot customer → investor pathway.",
    contactPerson: "Sustainability / Facilities Management team",
    fit: "EXCELLENT - Strategic fit, potential anchor customer + investor",
    priority: "CRITICAL"
  },
  
  // ============================================
  // UK - CLEANTECH & IMPACT INVESTORS
  // ============================================
  
  {
    id: "UK001",
    name: "Seedcamp",
    type: "Venture Capital",
    region: "United Kingdom",
    city: "London",
    focus: ["Deep Tech", "Climate", "B2B SaaS"],
    ticketSize: "£100k-£500k",
    stage: "Pre-seed, Seed",
    website: "https://seedcamp.com",
    email: "hello@seedcamp.com",
    linkedin: "https://linkedin.com/company/seedcamp",
    notes: "Europe's leading pre-seed fund. Active in climate tech. Strong network for follow-on funding.",
    contactPerson: "Carlos Espinal (Managing Partner) or Reshma Sohoni (Managing Partner)",
    fit: "EXCELLENT - Climate focus, pre-seed sweet spot, European expansion angle",
    priority: "CRITICAL"
  },
  
  {
    id: "UK002",
    name: "Blue Bear Capital",
    type: "Family Office / Angel Syndicate",
    region: "United Kingdom",
    city: "London",
    focus: ["Cleantech", "Energy Efficiency", "Built Environment"],
    ticketSize: "£50k-£250k",
    stage: "Seed, Series A",
    website: "https://bluebearcapital.com",
    email: "info@bluebearcapital.com",
    linkedin: "https://linkedin.com/company/blue-bear-capital",
    notes: "Focused on energy efficiency and built environment. Perfect fit for HVAC/heat pump technology.",
    contactPerson: "TBD",
    fit: "EXCELLENT - Sector expertise, thesis alignment",
    priority: "CRITICAL"
  },
  
  {
    id: "UK003",
    name: "Mustard Seed MAZE",
    type: "Impact Investor",
    region: "United Kingdom",
    city: "London",
    focus: ["Impact", "Emerging Markets", "Climate"],
    ticketSize: "£100k-£500k",
    stage: "Seed, Series A",
    website: "https://mustardseedmaze.com",
    email: "hello@mustardseedmaze.com",
    linkedin: "https://linkedin.com/company/mustard-seed-maze",
    notes: "Invests in emerging markets with impact thesis. Southeast Asia focus. Climate mandate.",
    contactPerson: "TBD",
    fit: "EXCELLENT - Emerging markets + climate = perfect match",
    priority: "CRITICAL"
  },
  
  {
    id: "UK004",
    name: "Carbon13",
    type: "Venture Builder / Climate Fund",
    region: "United Kingdom",
    city: "London",
    focus: ["Climate Tech", "Net Zero", "Sustainability"],
    ticketSize: "£100k-£400k",
    stage: "Seed",
    website: "https://carbon13.com",
    email: "hello@carbon13.com",
    linkedin: "https://linkedin.com/company/carbon13",
    notes: "Climate-focused venture builder. Strong ecosystem for climate startups. Great network.",
    contactPerson: "TBD",
    fit: "VERY GOOD - Climate mission-aligned, strong ecosystem access",
    priority: "HIGH"
  },
  
  {
    id: "UK005",
    name: "Sustainable Ventures",
    type: "Investor + Workspace Provider",
    region: "United Kingdom",
    city: "London",
    focus: ["Cleantech", "Circular Economy", "Energy"],
    ticketSize: "£50k-£300k",
    stage: "Seed",
    website: "https://sustainableventures.co.uk",
    email: "info@sustainableventures.co.uk",
    linkedin: "https://linkedin.com/company/sustainable-ventures",
    notes: "Combines workspace + capital. Good for UK entity operations if needed.",
    contactPerson: "Andrew Wordsworth (Founder)",
    fit: "GOOD - Strategic value beyond just capital",
    priority: "MEDIUM"
  },
  
  {
    id: "UK006",
    name: "Triple Point Heat Networks Investment Management",
    type: "Infrastructure Fund",
    region: "United Kingdom",
    city: "London",
    focus: ["Heat Networks", "Energy Efficiency", "Infrastructure"],
    ticketSize: "£500k-£5M",
    stage: "Growth, Project Finance",
    website: "https://triplepointheatednetworks.com",
    email: "info@tphneim.com",
    linkedin: "https://linkedin.com/company/triple-point-heat-networks",
    notes: "Specialists in heat network infrastructure. May be interested in technology licensing or partnership.",
    contactPerson: "TBD",
    fit: "MODERATE - Larger fund, but strategic partnership potential",
    priority: "LOW"
  },
  
  {
    id: "UK007",
    name: "Bethnal Green Ventures",
    type: "Accelerator / Investor",
    region: "United Kingdom",
    city: "London",
    focus: ["Tech for Good", "Climate", "Social Impact"],
    ticketSize: "£20k-£100k",
    stage: "Pre-seed",
    website: "https://www.bethnal.green",
    email: "hello@bethnal.green",
    linkedin: "https://linkedin.com/company/bethnal-green-ventures",
    notes: "Smaller checks but great for UK ecosystem access and PR.",
    contactPerson: "TBD",
    fit: "MODERATE - Smaller tickets, but good network",
    priority: "LOW"
  },
  
  {
    id: "UK008",
    name: "Abundance Investment",
    type: "Crowdfunding / Retail Investors",
    region: "United Kingdom",
    city: "London",
    focus: ["Renewable Energy", "Community Projects", "Green Infrastructure"],
    ticketSize: "£100k-£2M (aggregated from retail)",
    stage: "Revenue-stage projects",
    website: "https://www.abundanceinvestment.com",
    email: "invest@abundanceinvestment.com",
    notes: "Crowdfunding for renewable/green projects. Could raise from UK retail investors if have traction.",
    contactPerson: "TBD",
    fit: "MODERATE - Requires more traction, but interesting route",
    priority: "LOW"
  },
  
  // ============================================
  // MALAYSIA - REGIONAL INVESTORS & FAMILY OFFICES
  // ============================================
  
  {
    id: "MY001",
    name: "Cradle Fund",
    type: "Government-backed Seed Fund",
    region: "Malaysia",
    city: "Kuala Lumpur",
    focus: ["Technology", "Innovation", "Cleantech"],
    ticketSize: "RM 150k-RM 500k (~$35k-$115k USD)",
    stage: "Pre-seed, Seed",
    website: "https://www.cradlefund.com.my",
    email: "enquiry@cradle.com.my",
    linkedin: "https://linkedin.com/company/cradle-fund-sdn-bhd",
    notes: "Government-backed. Strong cleantech mandate. Would need Malaysian entity or regional partnership.",
    contactPerson: "TBD",
    fit: "GOOD - If can structure Malaysian operations or partnership",
    priority: "MEDIUM"
  },
  
  {
    id: "MY002",
    name: "500 Global (Southeast Asia)",
    type: "Venture Capital",
    region: "Malaysia / Regional",
    city: "Kuala Lumpur",
    focus: ["Tech", "Consumer", "Fintech"],
    ticketSize: "$50k-$250k",
    stage: "Pre-seed, Seed",
    website: "https://500.co",
    email: "sea@500.co",
    linkedin: "https://linkedin.com/company/500-global",
    notes: "Global VC with strong SEA presence. Less cleantech-focused but open to B2B SaaS + hardware.",
    contactPerson: "Khailee Ng (Managing Partner, SEA)",
    fit: "MODERATE - Large network, less sector focus",
    priority: "MEDIUM"
  },
  
  {
    id: "MY003",
    name: "Altara Ventures",
    type: "Venture Capital",
    region: "Malaysia",
    city: "Kuala Lumpur",
    focus: ["Technology", "Sustainability", "Consumer"],
    ticketSize: "$100k-$500k",
    stage: "Seed, Series A",
    website: "https://altaraventures.com",
    email: "hello@altaraventures.com",
    linkedin: "https://linkedin.com/company/altara-ventures",
    notes: "Malaysian VC with sustainability thesis. Regional focus.",
    contactPerson: "TBD",
    fit: "GOOD - Regional focus, sustainability angle",
    priority: "MEDIUM"
  },
  
  {
    id: "MY004",
    name: "MAVCAP (Malaysian Venture Capital)",
    type: "Government Venture Capital",
    region: "Malaysia",
    city: "Kuala Lumpur",
    focus: ["Technology", "Innovation", "Strategic Industries"],
    ticketSize: "RM 500k-RM 5M (~$115k-$1.15M USD)",
    stage: "Seed, Series A",
    website: "https://www.mavcap.com",
    email: "enquiry@mavcap.com",
    linkedin: "https://linkedin.com/company/mavcap",
    notes: "Government-backed VC. Prefers Malaysian companies but open to ASEAN co-investment.",
    contactPerson: "TBD",
    fit: "MODERATE - Requires Malaysian angle or regional fund structure",
    priority: "LOW"
  },
  
  {
    id: "MY005",
    name: "Supernal Pte Ltd (GIC-backed)",
    type: "Family Office / Investment Office",
    region: "Malaysia / Singapore",
    city: "Kuala Lumpur / Singapore",
    focus: ["Infrastructure", "Energy", "Real Estate"],
    ticketSize: "$250k-$2M",
    stage: "Growth, Infrastructure",
    website: "TBD - Private family office",
    email: "TBD - Requires warm introduction",
    notes: "Connected to Singapore sovereign wealth. Infrastructure focus. Need warm intro.",
    contactPerson: "TBD - Seek introduction via network",
    fit: "VERY GOOD - If can get warm intro, infrastructure thesis fit",
    priority: "HIGH (pending intro)"
  },
  
  {
    id: "MY006",
    name: "Khazanah Nasional - Dana Impak",
    type: "Sovereign Wealth Fund - Impact Arm",
    region: "Malaysia",
    city: "Kuala Lumpur",
    focus: ["Impact", "Sustainability", "Social Enterprise"],
    ticketSize: "RM 500k-RM 5M (~$115k-$1.15M USD)",
    stage: "Seed, Growth",
    website: "https://www.khazanah.com.my",
    email: "danaimpak@khazanah.com.my",
    linkedin: "https://linkedin.com/company/khazanah-nasional-berhad",
    notes: "Malaysia's sovereign wealth fund impact investing arm. Long process but credible stamp.",
    contactPerson: "TBD",
    fit: "GOOD - Credibility boost, slow process",
    priority: "LOW"
  },
  
  // ============================================
  // REGIONAL / ASEAN-FOCUSED INVESTORS
  // ============================================
  
  {
    id: "ASEAN001",
    name: "AC Ventures (Indonesia-based, regional reach)",
    type: "Venture Capital",
    region: "Southeast Asia",
    city: "Jakarta (regional)",
    focus: ["Tech", "Sustainability", "Impact"],
    ticketSize: "$250k-$1M",
    stage: "Seed, Series A",
    website: "https://www.acvfund.com",
    email: "hello@acvfund.com",
    linkedin: "https://linkedin.com/company/ac-ventures",
    notes: "Strong regional presence. Climate and sustainability mandate. Fast-moving.",
    contactPerson: "TBD",
    fit: "VERY GOOD - Regional reach, sustainability focus",
    priority: "HIGH"
  },
  
  {
    id: "ASEAN002",
    name: "Wavemaker Partners",
    type: "Venture Capital",
    region: "Southeast Asia",
    city: "Singapore (regional offices)",
    focus: ["Deep Tech", "Enterprise SaaS", "Climate"],
    ticketSize: "$100k-$500k",
    stage: "Seed, Series A",
    website: "https://www.wavemaker.vc",
    email: "hello@wavemaker.vc",
    linkedin: "https://linkedin.com/company/wavemaker-partners",
    notes: "Pan-SEA investor. Deep tech focus. Portfolio includes climate companies.",
    contactPerson: "Paul Santos (Managing Partner)",
    fit: "EXCELLENT - Deep tech + climate + regional = perfect",
    priority: "CRITICAL"
  },
  
  {
    id: "ASEAN003",
    name: "Openspace Ventures",
    type: "Venture Capital",
    region: "Southeast Asia",
    city: "Singapore",
    focus: ["Consumer", "Logistics", "Enterprise"],
    ticketSize: "$500k-$5M",
    stage: "Series A, Series B",
    website: "https://openspace.vc",
    email: "hello@openspace.vc",
    linkedin: "https://linkedin.com/company/openspace-ventures",
    notes: "Larger fund, typically Series A+. Worth approaching if can show strong traction.",
    contactPerson: "TBD",
    fit: "MODERATE - May be too early, but great if can hit metrics",
    priority: "LOW"
  },
  
  {
    id: "ASEAN004",
    name: "Cento Ventures",
    type: "Venture Capital",
    region: "Southeast Asia",
    city: "Singapore",
    focus: ["B2B", "Enterprise SaaS", "Infrastructure"],
    ticketSize: "$250k-$1M",
    stage: "Seed, Series A",
    website: "https://www.cento.vc",
    email: "hello@cento.vc",
    linkedin: "https://linkedin.com/company/cento-ventures",
    notes: "B2B focused. Understands hardware + software hybrid models.",
    contactPerson: "TBD",
    fit: "GOOD - B2B focus, understands CAPEX models",
    priority: "MEDIUM"
  },
  
  // ============================================
  // REVENUE-BASED FINANCING / ALTERNATIVE LENDERS
  // ============================================
  
  {
    id: "RBF001",
    name: "Uncapped",
    type: "Revenue-Based Financing",
    region: "UK / Global",
    city: "London (serves globally)",
    focus: ["SaaS", "E-commerce", "Subscription Businesses"],
    ticketSize: "£10k-£5M",
    stage: "Revenue-stage (£10k+ MRR)",
    website: "https://weareuncapped.com",
    email: "hello@weareuncapped.com",
    notes: "Fast funding (1-2 weeks). Repay 6-12% of monthly revenue until 1.5x repaid. Good for working capital.",
    contactPerson: "Automated application process",
    fit: "MODERATE - Need recurring revenue, but great for inventory/working capital",
    priority: "MEDIUM"
  },
  
  {
    id: "RBF002",
    name: "Clearco (formerly Clearbanc)",
    type: "Revenue-Based Financing",
    region: "Global",
    city: "Toronto (serves globally)",
    focus: ["E-commerce", "SaaS", "DTC Brands"],
    ticketSize: "$10k-$10M",
    stage: "Revenue-stage",
    website: "https://clear.co",
    email: "support@clear.co",
    notes: "Largest RBF platform. Fast approval. 6-12% revenue share model. Non-dilutive.",
    contactPerson: "Automated application",
    fit: "MODERATE - Need consistent revenue, good supplement to equity",
    priority: "MEDIUM"
  },
  
  {
    id: "RBF003",
    name: "Pipe",
    type: "Revenue-Based Financing (Trading Platform)",
    region: "Global",
    city: "Miami (serves globally)",
    focus: ["SaaS", "Subscription", "Recurring Revenue"],
    ticketSize: "$25k-$10M",
    stage: "Revenue-stage with contracts",
    website: "https://pipe.com",
    email: "support@pipe.com",
    notes: "Converts recurring contracts into upfront cash. Great if have long-term EaaS contracts.",
    contactPerson: "Automated application",
    fit: "GOOD - Perfect for EaaS contracts with recurring revenue",
    priority: "HIGH (once EaaS contracts signed)"
  },
  
  {
    id: "RBF004",
    name: "Klub (India/SEA-focused)",
    type: "Revenue-Based Financing",
    region: "India / Southeast Asia",
    city: "Bangalore",
    focus: ["E-commerce", "D2C", "SaaS"],
    ticketSize: "$50k-$2M",
    stage: "Revenue-stage",
    website: "https://klub.co",
    email: "hello@klub.co",
    notes: "SEA-focused RBF. Understands regional market. Fast deployment.",
    contactPerson: "TBD",
    fit: "GOOD - Regional focus, understands SEA business models",
    priority: "MEDIUM"
  },
  
  // ============================================
  // STRATEGIC / CORPORATE INVESTORS
  // ============================================
  
  {
    id: "CORP001",
    name: "SM Investments Corporation - Sustainability Office",
    type: "Strategic Corporate",
    region: "Philippines",
    city: "Pasay, Metro Manila",
    focus: ["Real Estate", "Retail", "Sustainability Initiatives"],
    ticketSize: "$100k-$1M (strategic)",
    stage: "Pilot → Strategic Investment",
    website: "https://www.sminvestments.com",
    email: "sustainability@sminvestments.com",
    notes: "Largest conglomerate in PH. Massive real estate portfolio = huge HVAC opportunity. Pilot → investor pathway.",
    contactPerson: "Sustainability team",
    fit: "EXCELLENT - Strategic customer → investor, massive deployment potential",
    priority: "CRITICAL"
  },
  
  {
    id: "CORP002",
    name: "Manila Electric Company (Meralco) - Innovation Fund",
    type: "Utility / Strategic Investor",
    region: "Philippines",
    city: "Pasig, Metro Manila",
    focus: ["Energy Efficiency", "Demand Response", "Customer Solutions"],
    ticketSize: "$100k-$500k",
    stage: "Pilot programs",
    website: "https://www.meralco.com.ph",
    email: "innovation@meralco.com.ph",
    notes: "Largest utility in PH. Heat pumps reduce electricity demand peaks. Win-win: EaaS partnership + strategic investment.",
    contactPerson: "Innovation / Customer Solutions team",
    fit: "EXCELLENT - Strategic alignment (demand management), EaaS co-marketing potential",
    priority: "CRITICAL"
  },
  
  {
    id: "CORP003",
    name: "Petron Corporation - Sustainability Division",
    type: "Energy Company",
    region: "Philippines",
    city: "Makati, Metro Manila",
    focus: ["Energy Transition", "Carbon Reduction", "Diversification"],
    ticketSize: "$100k-$1M",
    stage: "Strategic partnerships",
    website: "https://www.petron.com",
    email: "corporateaffairs@petron.com",
    notes: "Transitioning from fossil fuels. Heat pumps replace gas boilers. Strategic diversification play.",
    contactPerson: "Sustainability / Corporate Affairs",
    fit: "GOOD - Energy transition story, but may have internal conflicts",
    priority: "MEDIUM"
  }
  
];

// Export as JSON for CRM import
export default investorDatabase;

// Summary Stats
const summary = {
  totalProspects: investorDatabase.length,
  byRegion: {
    Philippines: investorDatabase.filter(i => i.region === "Philippines").length,
    UK: investorDatabase.filter(i => i.region === "United Kingdom").length,
    Malaysia: investorDatabase.filter(i => i.region === "Malaysia").length,
    Regional: investorDatabase.filter(i => i.region === "Southeast Asia").length,
    Global: investorDatabase.filter(i => i.region === "Global").length
  },
  byType: {
    VC: investorDatabase.filter(i => i.type.includes("Venture Capital")).length,
    FamilyOffice: investorDatabase.filter(i => i.type.includes("Family Office")).length,
    Strategic: investorDatabase.filter(i => i.type.includes("Strategic") || i.type.includes("Corporate")).length,
    RBF: investorDatabase.filter(i => i.type.includes("Revenue-Based")).length,
    Government: investorDatabase.filter(i => i.type.includes("Government")).length,
    Impact: investorDatabase.filter(i => i.type.includes("Impact")).length
  },
  criticalPriority: investorDatabase.filter(i => i.priority === "CRITICAL").length,
  highPriority: investorDatabase.filter(i => i.priority === "HIGH").length
};

console.log("Investor Database Summary:", summary);
