import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Karnot Energy Solutions - Target Investor/Lender Database
// This is the complete investor database inline to avoid import issues
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
    fit: "EXCELLENT",
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
    fit: "EXCELLENT",
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
    fit: "VERY GOOD",
    priority: "HIGH"
  },
  
  {
    id: "PH004",
    name: "Kaya Founders",
    type: "Accelerator",
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
    fit: "GOOD",
    priority: "MEDIUM"
  },
  
  {
    id: "PH005",
    name: "Patamar Capital",
    type: "Impact Investor",
    region: "Philippines",
    city: "Manila operations",
    focus: ["Financial Inclusion", "Climate", "Agriculture"],
    ticketSize: "$250k-$1M",
    stage: "Seed, Series A",
    website: "https://patamarcapital.com",
    email: "info@patamarcapital.com",
    linkedin: "https://linkedin.com/company/patamar-capital",
    notes: "Southeast Asia impact investor. Strong climate focus. Larger tickets but worth approaching.",
    contactPerson: "Benedicta Marzinotto (Partner)",
    fit: "GOOD",
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
    fit: "MODERATE",
    priority: "LOW"
  },
  
  {
    id: "PH007",
    name: "Philippine Business Bank - Innovation Financing",
    type: "Bank/Lender",
    region: "Philippines",
    city: "Makati, Metro Manila",
    focus: ["SME Lending", "Equipment Financing", "Working Capital"],
    ticketSize: "$50k-$500k",
    stage: "Revenue-stage companies",
    website: "https://www.pbb.com.ph",
    email: "corporate@pbb.com.ph",
    notes: "Offers equipment financing and working capital loans. May structure as revenue-based loan rather than equity.",
    contactPerson: "SME Banking Division",
    fit: "GOOD",
    priority: "HIGH"
  },
  
  {
    id: "PH008",
    name: "Robinsons Land Corporation",
    type: "Strategic Corporate",
    region: "Philippines",
    city: "Pasig, Metro Manila",
    focus: ["Real Estate", "Commercial Properties", "Sustainability"],
    ticketSize: "$100k-$500k",
    stage: "Pilot customers → Strategic investor",
    website: "https://www.robinsonsland.com",
    email: "corporate@robinsonsland.com",
    notes: "Major property developer. HVAC is massive OPEX for them. Potential pilot customer → investor pathway.",
    contactPerson: "Sustainability / Facilities Management team",
    fit: "EXCELLENT",
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
    fit: "EXCELLENT",
    priority: "CRITICAL"
  },
  
  {
    id: "UK002",
    name: "Blue Bear Capital",
    type: "Family Office",
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
    fit: "EXCELLENT",
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
    fit: "EXCELLENT",
    priority: "CRITICAL"
  },
  
  {
    id: "UK004",
    name: "Carbon13",
    type: "Climate Fund",
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
    fit: "VERY GOOD",
    priority: "HIGH"
  },
  
  {
    id: "UK005",
    name: "Sustainable Ventures",
    type: "Impact Investor",
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
    fit: "GOOD",
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
    fit: "MODERATE",
    priority: "LOW"
  },
  
  {
    id: "UK007",
    name: "Bethnal Green Ventures",
    type: "Accelerator",
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
    fit: "MODERATE",
    priority: "LOW"
  },
  
  {
    id: "UK008",
    name: "Abundance Investment",
    type: "Crowdfunding Platform",
    region: "United Kingdom",
    city: "London",
    focus: ["Renewable Energy", "Community Projects", "Green Infrastructure"],
    ticketSize: "£100k-£2M",
    stage: "Revenue-stage projects",
    website: "https://www.abundanceinvestment.com",
    email: "invest@abundanceinvestment.com",
    notes: "Crowdfunding for renewable/green projects. Could raise from UK retail investors if have traction.",
    contactPerson: "TBD",
    fit: "MODERATE",
    priority: "LOW"
  },
  
  // ============================================
  // MALAYSIA - REGIONAL INVESTORS & FAMILY OFFICES
  // ============================================
  
  {
    id: "MY001",
    name: "Cradle Fund",
    type: "Government Fund",
    region: "Malaysia",
    city: "Kuala Lumpur",
    focus: ["Technology", "Innovation", "Cleantech"],
    ticketSize: "RM 150k-RM 500k",
    stage: "Pre-seed, Seed",
    website: "https://www.cradlefund.com.my",
    email: "enquiry@cradle.com.my",
    linkedin: "https://linkedin.com/company/cradle-fund-sdn-bhd",
    notes: "Government-backed. Strong cleantech mandate. Would need Malaysian entity or regional partnership.",
    contactPerson: "TBD",
    fit: "GOOD",
    priority: "MEDIUM"
  },
  
  {
    id: "MY002",
    name: "500 Global Southeast Asia",
    type: "Venture Capital",
    region: "Malaysia",
    city: "Kuala Lumpur",
    focus: ["Tech", "Consumer", "Fintech"],
    ticketSize: "$50k-$250k",
    stage: "Pre-seed, Seed",
    website: "https://500.co",
    email: "sea@500.co",
    linkedin: "https://linkedin.com/company/500-global",
    notes: "Global VC with strong SEA presence. Less cleantech-focused but open to B2B SaaS + hardware.",
    contactPerson: "Khailee Ng (Managing Partner, SEA)",
    fit: "MODERATE",
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
    fit: "GOOD",
    priority: "MEDIUM"
  },
  
  {
    id: "MY004",
    name: "MAVCAP",
    type: "Government Fund",
    region: "Malaysia",
    city: "Kuala Lumpur",
    focus: ["Technology", "Innovation", "Strategic Industries"],
    ticketSize: "RM 500k-RM 5M",
    stage: "Seed, Series A",
    website: "https://www.mavcap.com",
    email: "enquiry@mavcap.com",
    linkedin: "https://linkedin.com/company/mavcap",
    notes: "Government-backed VC. Prefers Malaysian companies but open to ASEAN co-investment.",
    contactPerson: "TBD",
    fit: "MODERATE",
    priority: "LOW"
  },
  
  {
    id: "MY005",
    name: "Supernal Pte Ltd",
    type: "Family Office",
    region: "Malaysia",
    city: "Kuala Lumpur",
    focus: ["Infrastructure", "Energy", "Real Estate"],
    ticketSize: "$250k-$2M",
    stage: "Growth, Infrastructure",
    website: "",
    email: "",
    notes: "Connected to Singapore sovereign wealth. Infrastructure focus. Need warm intro.",
    contactPerson: "TBD - Seek introduction via network",
    fit: "VERY GOOD",
    priority: "HIGH"
  },
  
  {
    id: "MY006",
    name: "Khazanah Nasional - Dana Impak",
    type: "Government Fund",
    region: "Malaysia",
    city: "Kuala Lumpur",
    focus: ["Impact", "Sustainability", "Social Enterprise"],
    ticketSize: "RM 500k-RM 5M",
    stage: "Seed, Growth",
    website: "https://www.khazanah.com.my",
    email: "danaimpak@khazanah.com.my",
    linkedin: "https://linkedin.com/company/khazanah-nasional-berhad",
    notes: "Malaysia's sovereign wealth fund impact investing arm. Long process but credible stamp.",
    contactPerson: "TBD",
    fit: "GOOD",
    priority: "LOW"
  },
  
  // ============================================
  // REGIONAL / ASEAN-FOCUSED INVESTORS
  // ============================================
  
  {
    id: "ASEAN001",
    name: "AC Ventures Indonesia",
    type: "Venture Capital",
    region: "Southeast Asia",
    city: "Jakarta",
    focus: ["Tech", "Sustainability", "Impact"],
    ticketSize: "$250k-$1M",
    stage: "Seed, Series A",
    website: "https://www.acvfund.com",
    email: "hello@acvfund.com",
    linkedin: "https://linkedin.com/company/ac-ventures",
    notes: "Strong regional presence. Climate and sustainability mandate. Fast-moving.",
    contactPerson: "TBD",
    fit: "VERY GOOD",
    priority: "HIGH"
  },
  
  {
    id: "ASEAN002",
    name: "Wavemaker Partners",
    type: "Venture Capital",
    region: "Southeast Asia",
    city: "Singapore",
    focus: ["Deep Tech", "Enterprise SaaS", "Climate"],
    ticketSize: "$100k-$500k",
    stage: "Seed, Series A",
    website: "https://www.wavemaker.vc",
    email: "hello@wavemaker.vc",
    linkedin: "https://linkedin.com/company/wavemaker-partners",
    notes: "Pan-SEA investor. Deep tech focus. Portfolio includes climate companies.",
    contactPerson: "Paul Santos (Managing Partner)",
    fit: "EXCELLENT",
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
    fit: "MODERATE",
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
    fit: "GOOD",
    priority: "MEDIUM"
  },
  
  // ============================================
  // REVENUE-BASED FINANCING / ALTERNATIVE LENDERS
  // ============================================
  
  {
    id: "RBF001",
    name: "Uncapped",
    type: "Revenue-Based Financing",
    region: "United Kingdom",
    city: "London",
    focus: ["SaaS", "E-commerce", "Subscription Businesses"],
    ticketSize: "£10k-£5M",
    stage: "Revenue-stage",
    website: "https://weareuncapped.com",
    email: "hello@weareuncapped.com",
    notes: "Fast funding (1-2 weeks). Repay 6-12% of monthly revenue until 1.5x repaid. Good for working capital.",
    contactPerson: "Automated application process",
    fit: "MODERATE",
    priority: "MEDIUM"
  },
  
  {
    id: "RBF002",
    name: "Clearco",
    type: "Revenue-Based Financing",
    region: "Global",
    city: "Toronto",
    focus: ["E-commerce", "SaaS", "DTC Brands"],
    ticketSize: "$10k-$10M",
    stage: "Revenue-stage",
    website: "https://clear.co",
    email: "support@clear.co",
    notes: "Largest RBF platform. Fast approval. 6-12% revenue share model. Non-dilutive.",
    contactPerson: "Automated application",
    fit: "MODERATE",
    priority: "MEDIUM"
  },
  
  {
    id: "RBF003",
    name: "Pipe",
    type: "Revenue-Based Financing",
    region: "Global",
    city: "Miami",
    focus: ["SaaS", "Subscription", "Recurring Revenue"],
    ticketSize: "$25k-$10M",
    stage: "Revenue-stage with contracts",
    website: "https://pipe.com",
    email: "support@pipe.com",
    notes: "Converts recurring contracts into upfront cash. Great if have long-term EaaS contracts.",
    contactPerson: "Automated application",
    fit: "GOOD",
    priority: "HIGH"
  },
  
  {
    id: "RBF004",
    name: "Klub",
    type: "Revenue-Based Financing",
    region: "Southeast Asia",
    city: "Bangalore",
    focus: ["E-commerce", "D2C", "SaaS"],
    ticketSize: "$50k-$2M",
    stage: "Revenue-stage",
    website: "https://klub.co",
    email: "hello@klub.co",
    notes: "SEA-focused RBF. Understands regional market. Fast deployment.",
    contactPerson: "TBD",
    fit: "GOOD",
    priority: "MEDIUM"
  },
  
  // ============================================
  // STRATEGIC / CORPORATE INVESTORS
  // ============================================
  
  {
    id: "CORP001",
    name: "SM Investments - Sustainability",
    type: "Strategic Corporate",
    region: "Philippines",
    city: "Pasay, Metro Manila",
    focus: ["Real Estate", "Retail", "Sustainability"],
    ticketSize: "$100k-$1M",
    stage: "Pilot → Strategic Investment",
    website: "https://www.sminvestments.com",
    email: "sustainability@sminvestments.com",
    notes: "Largest conglomerate in PH. Massive real estate portfolio = huge HVAC opportunity. Pilot → investor pathway.",
    contactPerson: "Sustainability team",
    fit: "EXCELLENT",
    priority: "CRITICAL"
  },
  
  {
    id: "CORP002",
    name: "Meralco - Innovation Fund",
    type: "Utility",
    region: "Philippines",
    city: "Pasig, Metro Manila",
    focus: ["Energy Efficiency", "Demand Response", "Customer Solutions"],
    ticketSize: "$100k-$500k",
    stage: "Pilot programs",
    website: "https://www.meralco.com.ph",
    email: "innovation@meralco.com.ph",
    notes: "Largest utility in PH. Heat pumps reduce electricity demand peaks. Win-win: EaaS partnership + strategic investment.",
    contactPerson: "Innovation / Customer Solutions team",
    fit: "EXCELLENT",
    priority: "CRITICAL"
  },
  
  {
    id: "CORP003",
    name: "Petron Corporation - Sustainability",
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
    fit: "GOOD",
    priority: "MEDIUM"
  }
  
];

/**
 * Import all investors from the database into Firebase
 * @param {Object} user - Firebase authenticated user object
 * @returns {Promise<number>} - Number of investors successfully imported
 */
export async function importInvestors(user) {
  if (!user) {
    console.error('❌ No user provided to importInvestors');
    alert('Error: You must be logged in to import investors.');
    return 0;
  }

  if (!user.uid) {
    console.error('❌ User object missing uid');
    alert('Error: Invalid user object.');
    return 0;
  }

  console.log('🚀 Starting investor import for user:', user.uid);
  console.log(`📊 Total investors to import: ${investorDatabase.length}`);
  
  let imported = 0;
  let failed = 0;
  
  for (const investor of investorDatabase) {
    try {
      await addDoc(collection(db, 'users', user.uid, 'investors'), {
        // Core Info
        name: investor.name || 'Unknown Investor',
        type: investor.type || 'Venture Capital',
        region: investor.region || '',
        city: investor.city || '',
        
        // Contact Info
        email: investor.email || '',
        phone: investor.phone || '',
        website: investor.website || '',
        linkedin: investor.linkedin || '',
        contactPerson: investor.contactPerson || '',
        
        // Investment Details
        ticketSize: investor.ticketSize || '',
        focus: Array.isArray(investor.focus) ? investor.focus : [],
        
        // Priority & Fit
        priority: investor.priority || 'MEDIUM',
        fit: investor.fit || 'MODERATE',
        
        // Notes
        notes: investor.notes || '',
        
        // CRM Fields (defaults)
        stage: 'RESEARCH', // All start at RESEARCH stage
        amount: 0, // No amount set initially
        status: 'ACTIVE',
        lastContact: new Date().toISOString(),
        stageEnteredDate: new Date().toISOString(),
        documentsShared: [],
        meetings: [],
        nextAction: 'Initial outreach',
        nextActionDate: '',
        
        // Metadata
        createdAt: serverTimestamp(),
        importedAt: new Date().toISOString(),
        importSource: 'investorDatabase'
      });
      
      imported++;
      console.log(`✅ ${imported}/${investorDatabase.length}: ${investor.name}`);
      
    } catch (error) {
      failed++;
      console.error(`❌ Failed to import ${investor.name}:`, error);
    }
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 IMPORT COMPLETE!');
  console.log(`✅ Successfully imported: ${imported}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total in database: ${investorDatabase.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  return imported;
}

// Export database for reference
export { investorDatabase };

// Summary stats for console
export const investorStats = {
  total: investorDatabase.length,
  byRegion: {
    Philippines: investorDatabase.filter(i => i.region === "Philippines").length,
    UK: investorDatabase.filter(i => i.region === "United Kingdom").length,
    Malaysia: investorDatabase.filter(i => i.region === "Malaysia").length,
    SEA: investorDatabase.filter(i => i.region === "Southeast Asia").length,
    Global: investorDatabase.filter(i => i.region === "Global").length
  },
  byPriority: {
    CRITICAL: investorDatabase.filter(i => i.priority === "CRITICAL").length,
    HIGH: investorDatabase.filter(i => i.priority === "HIGH").length,
    MEDIUM: investorDatabase.filter(i => i.priority === "MEDIUM").length,
    LOW: investorDatabase.filter(i => i.priority === "LOW").length
  },
  byFit: {
    EXCELLENT: investorDatabase.filter(i => i.fit === "EXCELLENT").length,
    VERY_GOOD: investorDatabase.filter(i => i.fit === "VERY GOOD").length,
    GOOD: investorDatabase.filter(i => i.fit === "GOOD").length,
    MODERATE: investorDatabase.filter(i => i.fit === "MODERATE").length
  }
};

console.log('📊 Investor Database Loaded:', investorStats);
