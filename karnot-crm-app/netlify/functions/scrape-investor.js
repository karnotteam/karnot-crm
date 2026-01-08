// netlify/functions/scrape-investor.js
const axios = require('axios');
const cheerio = require('cheerio');

// Helper: Extract clean text from HTML
const cleanText = (text) => {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, ' ')
    .trim();
};

// Helper: Detect sectors from text
const detectSectors = (text) => {
  const lowerText = text.toLowerCase();
  const sectors = new Set();
  
  const sectorKeywords = {
    'cleantech': ['cleantech', 'clean tech', 'clean energy', 'renewable'],
    'climate': ['climate', 'carbon', 'decarbonization', 'net zero'],
    'energy': ['energy', 'power', 'electricity', 'solar', 'wind'],
    'fintech': ['fintech', 'financial technology', 'payments', 'banking'],
    'healthcare': ['healthcare', 'health', 'medical', 'biotech', 'pharma'],
    'saas': ['saas', 'software', 'cloud', 'enterprise software'],
    'ecommerce': ['ecommerce', 'e-commerce', 'retail', 'marketplace'],
    'edtech': ['edtech', 'education', 'learning', 'online courses'],
    'agtech': ['agtech', 'agriculture', 'farming', 'food tech'],
    'proptech': ['proptech', 'real estate', 'property technology'],
    'infrastructure': ['infrastructure', 'construction', 'built environment'],
    'mobility': ['mobility', 'transportation', 'automotive', 'ev', 'electric vehicle'],
    'hardware': ['hardware', 'manufacturing', 'iot', 'robotics'],
    'ai': ['artificial intelligence', 'machine learning', 'ai', 'ml']
  };

  Object.entries(sectorKeywords).forEach(([sector, keywords]) => {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      sectors.add(sector);
    }
  });

  return Array.from(sectors);
};

// Helper: Detect geography from text
const detectGeography = (text) => {
  const lowerText = text.toLowerCase();
  const regions = new Set();
  
  const geoKeywords = {
    'Philippines': ['philippines', 'philippine', 'manila', 'cebu', 'davao'],
    'Southeast Asia': ['southeast asia', 'asean', 'sea region'],
    'Singapore': ['singapore'],
    'Malaysia': ['malaysia', 'kuala lumpur'],
    'Thailand': ['thailand', 'bangkok'],
    'Vietnam': ['vietnam', 'hanoi', 'ho chi minh'],
    'Indonesia': ['indonesia', 'jakarta'],
    'India': ['india', 'bangalore', 'mumbai', 'delhi'],
    'China': ['china', 'beijing', 'shanghai'],
    'Japan': ['japan', 'tokyo'],
    'United Kingdom': ['uk', 'united kingdom', 'london', 'britain'],
    'Europe': ['europe', 'european'],
    'United States': ['usa', 'united states', 'us', 'silicon valley', 'new york', 'san francisco'],
    'Global': ['global', 'worldwide', 'international']
  };

  Object.entries(geoKeywords).forEach(([region, keywords]) => {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      regions.add(region);
    }
  });

  return Array.from(regions);
};

// Helper: Extract portfolio companies
const extractPortfolio = ($) => {
  const portfolio = [];
  
  // Common selectors for portfolio sections
  const portfolioSelectors = [
    '.portfolio-item',
    '.company-card',
    '[class*="portfolio"]',
    '[class*="company"]',
    'article',
    '.investment'
  ];

  portfolioSelectors.forEach(selector => {
    $(selector).each((i, elem) => {
      const $elem = $(elem);
      const companyName = $elem.find('h1, h2, h3, h4, .title, .name').first().text().trim();
      const description = $elem.find('p, .description').first().text().trim();
      
      if (companyName && companyName.length > 2 && companyName.length < 100) {
        portfolio.push({
          company: cleanText(companyName),
          description: cleanText(description).substring(0, 200),
          sector: detectSectors(description)[0] || 'Unknown'
        });
      }
    });
  });

  // Limit to first 20 companies
  return portfolio.slice(0, 20);
};

// Helper: Extract investment thesis
const extractThesis = ($, fullText) => {
  const thesis = [];
  
  // Look for common thesis sections
  const thesisSelectors = [
    'section:contains("thesis")',
    'section:contains("approach")',
    'section:contains("focus")',
    'div:contains("invest in")',
    'div:contains("we believe")',
    '.mission',
    '.vision',
    '.about'
  ];

  thesisSelectors.forEach(selector => {
    try {
      $(selector).each((i, elem) => {
        const text = $(elem).text();
        if (text.length > 50 && text.length < 1000) {
          thesis.push(cleanText(text));
        }
      });
    } catch (e) {
      // Ignore selector errors
    }
  });

  // If no thesis found, use meta description
  if (thesis.length === 0) {
    const metaDesc = $('meta[name="description"]').attr('content');
    if (metaDesc) {
      thesis.push(cleanText(metaDesc));
    }
  }

  return thesis.slice(0, 3); // Return top 3 thesis statements
};

// Main scraping function
exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only accept POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { url, investorName } = JSON.parse(event.body);

    if (!url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'URL is required' })
      };
    }

    console.log(`Scraping: ${url}`);

    // Fetch the website
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Remove script and style tags
    $('script, style, noscript').remove();

    // Get full text
    const fullText = $('body').text();
    const cleanedText = cleanText(fullText);

    // Extract data
    const sectors = detectSectors(cleanedText);
    const geography = detectGeography(cleanedText);
    const portfolio = extractPortfolio($);
    const thesis = extractThesis($, cleanedText);

    // Extract basic info
    const title = $('title').text() || investorName;
    const metaDescription = $('meta[name="description"]').attr('content') || '';

    // Look for check size mentions
    let checkSize = null;
    const checkSizeRegex = /\$?\d+[kmb]?\s*-?\s*\$?\d+[kmb]?/gi;
    const matches = cleanedText.match(checkSizeRegex);
    if (matches && matches.length > 0) {
      checkSize = matches[0];
    }

    // Compile results
    const results = {
      success: true,
      url,
      investorName: title.substring(0, 100),
      scrapedAt: new Date().toISOString(),
      
      // Structured data
      sectors: sectors.length > 0 ? sectors : ['Unknown'],
      geography: geography.length > 0 ? geography : ['Unknown'],
      checkSize: checkSize || 'Not specified',
      
      // Portfolio
      portfolio: portfolio.length > 0 ? portfolio : [],
      portfolioCount: portfolio.length,
      
      // Thesis
      investmentThesis: thesis.length > 0 ? thesis : [metaDescription],
      
      // Raw data for analysis
      websiteText: cleanedText.substring(0, 5000), // First 5000 chars
      metaDescription: metaDescription.substring(0, 500)
    };

    console.log(`Successfully scraped ${url}: ${sectors.length} sectors, ${portfolio.length} companies`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(results)
    };

  } catch (error) {
    console.error('Scraping error:', error.message);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        details: error.code || 'Unknown error'
      })
    };
  }
};
