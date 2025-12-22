// Netlify Scheduled Function - Runs Weekly
// This function scrapes BOI and PEZA websites for new project data
// Schedule: Every Monday at 8:00 AM (Manila Time)

const { schedule } = require('@netlify/functions');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

// Main scraper handler
const scraperHandler = async (event) => {
    console.log('🚀 Starting weekly BOI/PEZA scraper...');
    
    const results = {
        timestamp: new Date().toISOString(),
        boiProjects: [],
        pezaUpdates: [],
        errors: []
    };

    try {
        // SCRAPE BOI PROJECTS
        console.log('📋 Scraping BOI projects...');
        const boiData = await scrapeBOIProjects();
        results.boiProjects = boiData;
        
        // SCRAPE PEZA UPDATES
        console.log('🏭 Scraping PEZA zones...');
        const pezaData = await scrapePEZAZones();
        results.pezaUpdates = pezaData;

        // TODO: Store results in Firebase/database
        // await storeInDatabase(results);

        console.log('✅ Scraping completed successfully!');
        console.log(`Found ${boiData.length} BOI projects and ${pezaData.length} PEZA updates`);

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: 'Scraping completed',
                results: results
            })
        };

    } catch (error) {
        console.error('❌ Scraper error:', error);
        results.errors.push(error.message);
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: error.message,
                results: results
            })
        };
    }
};

// BOI PROJECT SCRAPER
async function scrapeBOIProjects() {
    const projects = [];
    
    try {
        // BOI OPTION 1: Official BOI Website
        const boiUrl = 'https://boi.gov.ph/investment-projects/';
        const response = await fetch(boiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        if (!response.ok) {
            console.log('⚠️ BOI website not accessible, using fallback method');
            return await scrapeBOIFallback();
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // SCRAPING LOGIC (adjust selectors based on actual BOI website structure)
        $('.project-item, .boi-project, article').each((i, elem) => {
            try {
                const companyName = $(elem).find('.company-name, h2, h3').first().text().trim();
                const projectName = $(elem).find('.project-name, .title').text().trim();
                const location = $(elem).find('.location, .address').text().trim();
                const investmentText = $(elem).find('.investment, .amount').text().trim();
                
                if (companyName && projectName) {
                    projects.push({
                        companyName,
                        projectName,
                        location,
                        investmentAmount: parseInvestment(investmentText),
                        source: 'BOI Website',
                        scrapedDate: new Date().toISOString()
                    });
                }
            } catch (err) {
                console.error('Error parsing BOI project:', err);
            }
        });

        console.log(`✅ Scraped ${projects.length} BOI projects`);
        return projects;

    } catch (error) {
        console.error('BOI scraping error:', error);
        return await scrapeBOIFallback();
    }
}

// BOI FALLBACK: Try alternative sources
async function scrapeBOIFallback() {
    const projects = [];
    
    try {
        // OPTION 2: BusinessWorld Online
        const bworldUrl = 'https://www.bworldonline.com/tag/boi/';
        const response = await fetch(bworldUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const html = await response.text();
        const $ = cheerio.load(html);

        $('article, .post-item').each((i, elem) => {
            try {
                const title = $(elem).find('h2, h3, .entry-title').text().trim();
                const excerpt = $(elem).find('.excerpt, .entry-summary, p').first().text().trim();
                
                // Extract company names and investment amounts from article text
                if (title.toLowerCase().includes('boi') || excerpt.toLowerCase().includes('investment')) {
                    const companyMatch = title.match(/([A-Z][a-z]+(?: [A-Z][a-z]+)*)/);
                    const investmentMatch = excerpt.match(/(?:P|₱|PHP)\s*(\d+(?:\.\d+)?)\s*(?:billion|million)/i);
                    
                    if (companyMatch) {
                        projects.push({
                            companyName: companyMatch[0],
                            projectName: title,
                            description: excerpt.substring(0, 200),
                            investmentAmount: investmentMatch ? parseInvestmentFromText(investmentMatch[0]) : 0,
                            source: 'BusinessWorld News',
                            scrapedDate: new Date().toISOString()
                        });
                    }
                }
            } catch (err) {
                console.error('Error parsing news article:', err);
            }
        });

        console.log(`✅ Scraped ${projects.length} BOI projects from news`);
        return projects;

    } catch (error) {
        console.error('BOI fallback scraping error:', error);
        return [];
    }
}

// PEZA ZONES SCRAPER
async function scrapePEZAZones() {
    const zones = [];
    
    try {
        // PEZA Official Website
        const pezaUrl = 'https://www.peza.gov.ph/index.php/economic-zones';
        const response = await fetch(pezaUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) {
            console.log('⚠️ PEZA website not accessible');
            return zones;
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // SCRAPING LOGIC (adjust selectors based on actual PEZA website structure)
        $('.zone-item, .economic-zone, tr').each((i, elem) => {
            try {
                const zoneName = $(elem).find('.zone-name, td:first, h3').text().trim();
                const location = $(elem).find('.location, td:nth-child(2)').text().trim();
                const companies = $(elem).find('.companies, td:nth-child(3)').text().trim();
                
                if (zoneName && location) {
                    zones.push({
                        zoneName,
                        location,
                        companies: companies || 'Multiple',
                        source: 'PEZA Website',
                        scrapedDate: new Date().toISOString()
                    });
                }
            } catch (err) {
                console.error('Error parsing PEZA zone:', err);
            }
        });

        console.log(`✅ Scraped ${zones.length} PEZA zones`);
        return zones;

    } catch (error) {
        console.error('PEZA scraping error:', error);
        return zones;
    }
}

// UTILITY: Parse investment amounts
function parseInvestment(text) {
    if (!text) return 0;
    
    const billionMatch = text.match(/(\d+(?:\.\d+)?)\s*b/i);
    if (billionMatch) return parseFloat(billionMatch[1]) * 1000000000;
    
    const millionMatch = text.match(/(\d+(?:\.\d+)?)\s*m/i);
    if (millionMatch) return parseFloat(millionMatch[1]) * 1000000;
    
    const numberMatch = text.match(/(\d+(?:,\d{3})*(?:\.\d+)?)/);
    if (numberMatch) return parseFloat(numberMatch[1].replace(/,/g, ''));
    
    return 0;
}

function parseInvestmentFromText(text) {
    const lowerText = text.toLowerCase();
    const numberMatch = text.match(/(\d+(?:\.\d+)?)/);
    
    if (!numberMatch) return 0;
    
    const number = parseFloat(numberMatch[1]);
    
    if (lowerText.includes('billion')) {
        return number * 1000000000;
    } else if (lowerText.includes('million')) {
        return number * 1000000;
    }
    
    return number;
}

// Schedule: Every Monday at 8:00 AM Manila Time (UTC+8 = 00:00 UTC)
// Cron: "0 0 * * 1" = minute hour day month weekday
const handler = schedule('0 0 * * 1', scraperHandler);

module.exports = { handler };

/*
SETUP INSTRUCTIONS:
1. Install dependencies: npm install cheerio node-fetch
2. Deploy to Netlify
3. Netlify will automatically run this every Monday at 8 AM Manila time
4. View logs in Netlify Functions dashboard

MANUAL TEST:
- Go to: https://your-site.netlify.app/.netlify/functions/weekly-scraper
- Or trigger from Netlify Functions UI

NEXT STEPS:
- Store scraped data in Firebase
- Send email alerts for new projects
- Auto-assign to territories based on location
*/
