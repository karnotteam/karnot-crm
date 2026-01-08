import React, { useState } from 'react';
import { Globe, Search, AlertCircle, CheckCircle, TrendingUp, MapPin, DollarSign, Building } from 'lucide-react';
import { calculateInvestorScore } from '../utils/investorScoring';
import { detectFlags } from '../utils/redFlagDetection';

const InvestorWebScraper = ({ investor, onUpdateInvestor }) => {
  const [scraping, setScraping] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleScrape = async () => {
    if (!investor.website) {
      setError('No website URL found for this investor. Please add a website first.');
      return;
    }

    setScraping(true);
    setError(null);
    setResults(null);

    try {
      // Call the Netlify function
      const response = await fetch('/.netlify/functions/scrape-investor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: investor.website,
          investorName: investor.name
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Scraping failed');
      }

      // Analyze the scraped data
      const flagAnalysis = detectFlags(
        data.websiteText || '',
        data.metaDescription || ''
      );

      const scoring = calculateInvestorScore({
        ...investor,
        sectors: data.sectors.join(', '),
        geography: data.geography[0] || investor.region
      });

      const enrichedResults = {
        ...data,
        flagAnalysis,
        scoring,
        scrapedAt: new Date().toISOString()
      };

      setResults(enrichedResults);

      // Update investor record with scraped data
      if (onUpdateInvestor) {
        await onUpdateInvestor(investor.id, {
          scrapedData: enrichedResults,
          lastScraped: new Date().toISOString(),
          fitScore: scoring.score,
          riskLevel: flagAnalysis.risk
        });
      }

    } catch (err) {
      console.error('Scraping error:', err);
      setError(err.message || 'Failed to scrape website');
    } finally {
      setScraping(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border-2 border-blue-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Globe className="text-blue-600" size={20} />
            <h3 className="font-black text-gray-800">WEB RESEARCH AGENT</h3>
          </div>
          <button
            onClick={handleScrape}
            disabled={scraping || !investor.website}
            className={`px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-wider flex items-center gap-2 transition-all ${
              scraping || !investor.website
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <Search size={16} />
            {scraping ? 'Scraping...' : 'Research'}
          </button>
        </div>

        {investor.website && (
          <div className="text-sm text-gray-600">
            <span className="font-bold">Target:</span>{' '}
            <a href={investor.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              {investor.website}
            </a>
          </div>
        )}

        {!investor.website && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
            <AlertCircle size={16} className="inline mr-2" />
            No website URL found. Please add a website to this investor first.
          </div>
        )}
      </div>

      {/* Loading State */}
      {scraping && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="font-bold text-blue-800">Scraping investor website...</p>
          <p className="text-sm text-blue-600 mt-1">Analyzing portfolio, sectors, and geography</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-800 mb-2">
            <AlertCircle size={20} />
            <span className="font-bold">Error:</span>
          </div>
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-4">
          {/* Risk Assessment */}
          <div className={`border-2 rounded-xl p-4 ${
            results.flagAnalysis.risk === 'CRITICAL' ? 'bg-red-50 border-red-300' :
            results.flagAnalysis.risk === 'HIGH' ? 'bg-orange-50 border-orange-300' :
            results.flagAnalysis.risk === 'MEDIUM' ? 'bg-yellow-50 border-yellow-300' :
            'bg-green-50 border-green-300'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-black text-gray-800">RISK ASSESSMENT</h4>
              <span className={`px-3 py-1 rounded-full font-black text-xs ${
                results.flagAnalysis.risk === 'CRITICAL' ? 'bg-red-600 text-white' :
                results.flagAnalysis.risk === 'HIGH' ? 'bg-orange-600 text-white' :
                results.flagAnalysis.risk === 'MEDIUM' ? 'bg-yellow-600 text-white' :
                'bg-green-600 text-white'
              }`}>
                {results.flagAnalysis.risk} RISK
              </span>
            </div>

            {/* Red Flags */}
            {results.flagAnalysis.redFlags.length > 0 && (
              <div className="mb-3">
                <div className="font-bold text-red-800 mb-2">🚨 Red Flags Detected:</div>
                {results.flagAnalysis.redFlags.map((flag, idx) => (
                  <div key={idx} className="bg-white border border-red-200 rounded-lg p-3 mb-2">
                    <div className="font-bold text-red-700">{flag.type.replace(/_/g, ' ')}</div>
                    <div className="text-sm text-gray-700 mt-1">
                      <strong>Action:</strong> {flag.action}
                    </div>
                    <div className="text-xs text-gray-600 mt-1 italic">
                      💡 {flag.lesson}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Matches: {flag.matches.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Green Flags */}
            {results.flagAnalysis.greenFlags.length > 0 && (
              <div>
                <div className="font-bold text-green-800 mb-2">✅ Positive Signals:</div>
                {results.flagAnalysis.greenFlags.map((flag, idx) => (
                  <div key={idx} className="bg-white border border-green-200 rounded-lg p-3 mb-2">
                    <div className="font-bold text-green-700">{flag.type.replace(/_/g, ' ')}</div>
                    <div className="text-sm text-gray-700">{flag.why}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fit Score */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="text-blue-600" size={20} />
                <h4 className="font-black text-gray-800">FIT SCORE</h4>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black text-blue-600">{results.scoring.score}/100</div>
                <div className="text-sm font-bold text-blue-700">{results.scoring.grade}</div>
              </div>
            </div>
            
            <div className="mb-3">
              <div className="font-bold text-sm text-gray-700 mb-1">Reasons:</div>
              {results.scoring.reasons.map((reason, idx) => (
                <div key={idx} className="text-sm text-gray-600">• {reason}</div>
              ))}
            </div>

            {results.scoring.warnings.length > 0 && (
              <div>
                <div className="font-bold text-sm text-orange-700 mb-1">Warnings:</div>
                {results.scoring.warnings.map((warning, idx) => (
                  <div key={idx} className="text-sm text-orange-600">⚠️ {warning}</div>
                ))}
              </div>
            )}

            <div className={`mt-3 px-3 py-2 rounded-lg font-black text-center ${
              results.scoring.recommendation === 'HIGH PRIORITY' ? 'bg-green-100 text-green-800' :
              results.scoring.recommendation === 'MEDIUM PRIORITY' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {results.scoring.recommendation}
            </div>
          </div>

          {/* Extracted Data */}
          <div className="grid grid-cols-2 gap-4">
            {/* Sectors */}
            <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Building className="text-purple-600" size={18} />
                <h4 className="font-black text-gray-800 text-sm">SECTORS</h4>
              </div>
              <div className="flex flex-wrap gap-1">
                {results.sectors.map((sector, idx) => (
                  <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-bold">
                    {sector}
                  </span>
                ))}
              </div>
            </div>

            {/* Geography */}
            <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="text-green-600" size={18} />
                <h4 className="font-black text-gray-800 text-sm">GEOGRAPHY</h4>
              </div>
              <div className="flex flex-wrap gap-1">
                {results.geography.map((geo, idx) => (
                  <span key={idx} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">
                    {geo}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Check Size */}
          {results.checkSize && results.checkSize !== 'Not specified' && (
            <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="text-green-600" size={18} />
                <h4 className="font-black text-gray-800 text-sm">CHECK SIZE</h4>
              </div>
              <div className="text-lg font-bold text-green-700">{results.checkSize}</div>
            </div>
          )}

          {/* Portfolio Companies */}
          {results.portfolio && results.portfolio.length > 0 && (
            <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
              <h4 className="font-black text-gray-800 mb-3">
                PORTFOLIO COMPANIES ({results.portfolioCount})
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {results.portfolio.map((company, idx) => (
                  <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="font-bold text-gray-800">{company.company}</div>
                    {company.description && (
                      <div className="text-xs text-gray-600 mt-1">{company.description}</div>
                    )}
                    {company.sector && (
                      <div className="mt-1">
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-bold">
                          {company.sector}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Investment Thesis */}
          {results.investmentThesis && results.investmentThesis.length > 0 && (
            <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
              <h4 className="font-black text-gray-800 mb-3">INVESTMENT THESIS</h4>
              <div className="space-y-2">
                {results.investmentThesis.map((thesis, idx) => (
                  <div key={idx} className="text-sm text-gray-700 italic bg-gray-50 p-3 rounded-lg border-l-4 border-blue-500">
                    "{thesis}"
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Success Message */}
          <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle size={20} />
              <span className="font-bold">Research Complete!</span>
            </div>
            <div className="text-sm text-green-700 mt-1">
              Data has been saved to the investor record. You can now proceed to Due Diligence or Email Generator tabs.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestorWebScraper;
