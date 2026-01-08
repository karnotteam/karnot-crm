import React, { useState } from 'react';
import { Globe, Search, AlertTriangle, CheckCircle, XCircle, Loader } from 'lucide-react';
import { detectFlags } from '../utils/redFlagDetection';
import { calculateInvestorScore } from '../utils/investorScoring';

const InvestorWebScraper = ({ investor, onUpdateInvestor }) => {
  const [scraping, setScraping] = useState(false);
  const [scrapedData, setScrapedData] = useState(null);
  const [error, setError] = useState(null);

  const scrapeInvestorWebsite = async () => {
    if (!investor.website) {
      setError('No website URL provided');
      return;
    }

    setScraping(true);
    setError(null);

    try {
      // Call your backend scraping API
      const response = await fetch('/api/scrape-investor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          investorId: investor.id,
          website: investor.website,
          linkedinUrl: investor.linkedinUrl
        })
      });

      if (!response.ok) throw new Error('Scraping failed');

      const data = await response.json();
      
      // Analyze scraped content for red/green flags
      const flagAnalysis = detectFlags(
        `${investor.notes || ''} ${investor.type || ''} ${investor.sectors || ''}`,
        data.websiteText || ''
      );

      // Calculate fit score
      const scoring = calculateInvestorScore({
        ...investor,
        sectors: data.detectedSectors || investor.sectors,
        geography: data.detectedGeography || investor.geography,
        thesis: data.investmentThesis || investor.thesis
      });

      const enrichedData = {
        ...data,
        flagAnalysis,
        scoring,
        scrapedAt: new Date().toISOString()
      };

      setScrapedData(enrichedData);

      // Auto-update investor record
      if (onUpdateInvestor) {
        await onUpdateInvestor(investor.id, {
          scrapedData: enrichedData,
          fitScore: scoring.score,
          riskLevel: flagAnalysis.risk,
          lastScraped: new Date().toISOString()
        });
      }

    } catch (err) {
      console.error('Scraping error:', err);
      setError(err.message);
    } finally {
      setScraping(false);
    }
  };

  return (
    <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50 space-y-4">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe size={20} className="text-blue-600" />
          <h3 className="font-black text-sm uppercase">Web Research Agent</h3>
        </div>
        <button
          onClick={scrapeInvestorWebsite}
          disabled={scraping || !investor.website}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {scraping ? (
            <>
              <Loader className="animate-spin" size={16} />
              Researching...
            </>
          ) : (
            <>
              <Search size={16} />
              Research
            </>
          )}
        </button>
      </div>

      {/* Progress Indicators */}
      {scraping && (
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-blue-700">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
            Fetching website content...
          </div>
          <div className="flex items-center gap-2 text-blue-700">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
            Analyzing for red flags...
          </div>
          <div className="flex items-center gap-2 text-blue-700">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
            Calculating fit score...
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border-2 border-red-300 rounded p-3 text-sm text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Results */}
      {scrapedData && !scraping && (
        <ScrapedDataDisplay data={scrapedData} investor={investor} />
      )}

    </div>
  );
};

const ScrapedDataDisplay = ({ data, investor }) => {
  const { flagAnalysis, scoring } = data;

  return (
    <div className="space-y-4">
      
      {/* Risk Level Banner */}
      <div className={`p-4 rounded-lg border-2 ${
        flagAnalysis.risk === 'CRITICAL' ? 'bg-red-100 border-red-400' :
        flagAnalysis.risk === 'HIGH' ? 'bg-orange-100 border-orange-400' :
        flagAnalysis.risk === 'MEDIUM' ? 'bg-yellow-100 border-yellow-400' :
        'bg-green-100 border-green-400'
      }`}>
        <div className="flex items-center gap-2 mb-2">
          {flagAnalysis.risk === 'CRITICAL' || flagAnalysis.risk === 'HIGH' ? (
            <XCircle className="text-red-600" size={24} />
          ) : (
            <CheckCircle className="text-green-600" size={24} />
          )}
          <div>
            <div className="font-black text-lg">{flagAnalysis.risk} RISK</div>
            <div className="text-sm">Fit Score: {scoring.score}/100 ({scoring.grade})</div>
          </div>
        </div>
      </div>

      {/* RED FLAGS */}
      {flagAnalysis.redFlags.length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
          <h4 className="font-black text-sm uppercase text-red-700 mb-3 flex items-center gap-2">
            <AlertTriangle size={18} />
            🚩 RED FLAGS DETECTED ({flagAnalysis.redFlags.length})
          </h4>
          <div className="space-y-3">
            {flagAnalysis.redFlags.map((flag, idx) => (
              <div key={idx} className="bg-white rounded p-3 border-2 border-red-200">
                <div className="font-bold text-red-700 mb-1">
                  {flag.type.replace(/_/g, ' ')} - {flag.severity}
                </div>
                <div className="text-sm text-red-600 mb-2">
                  🎓 Lesson Learned: {flag.lesson}
                </div>
                <div className="text-sm font-bold text-red-800 mb-2">
                  ⚠️ Action: {flag.action}
                </div>
                <div className="text-xs text-gray-600">
                  Detected keywords: {flag.matches.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GREEN FLAGS */}
      {flagAnalysis.greenFlags.length > 0 && (
        <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
          <h4 className="font-black text-sm uppercase text-green-700 mb-3 flex items-center gap-2">
            <CheckCircle size={18} />
            ✅ POSITIVE SIGNALS ({flagAnalysis.greenFlags.length})
          </h4>
          <div className="space-y-2">
            {flagAnalysis.greenFlags.map((flag, idx) => (
              <div key={idx} className="bg-white rounded p-3 border border-green-200">
                <div className="font-bold text-green-700 mb-1">
                  {flag.type.replace(/_/g, ' ')} {flag.value}
                </div>
                <div className="text-sm text-gray-700 mb-1">
                  💡 {flag.why}
                </div>
                <div className="text-xs text-gray-500">
                  Found: {flag.matches.slice(0, 3).join(', ')}
                  {flag.matches.length > 3 && ` +${flag.matches.length - 3} more`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fit Score Details */}
      <div className="bg-white border-2 rounded-lg p-4">
        <h4 className="font-black text-sm uppercase mb-2">Fit Analysis</h4>
        <div className="space-y-1 text-sm">
          {scoring.reasons.map((reason, idx) => (
            <div key={idx} className="text-green-700">{reason}</div>
          ))}
          {scoring.warnings.map((warning, idx) => (
            <div key={idx} className="text-orange-700">{warning}</div>
          ))}
        </div>
      </div>

      {/* Detected Info */}
      {(data.detectedSectors || data.detectedGeography || data.recentDeals) && (
        <div className="bg-white border-2 rounded-lg p-4">
          <h4 className="font-black text-sm uppercase mb-2">Scraped Information</h4>
          <div className="text-sm space-y-2">
            {data.detectedSectors && (
              <div>
                <span className="font-bold">Sectors:</span> {data.detectedSectors}
              </div>
            )}
            {data.detectedGeography && (
              <div>
                <span className="font-bold">Geography:</span> {data.detectedGeography}
              </div>
            )}
            {data.recentDeals && data.recentDeals.length > 0 && (
              <div>
                <span className="font-bold">Recent Deals:</span>
                <ul className="list-disc list-inside ml-4">
                  {data.recentDeals.slice(0, 5).map((deal, idx) => (
                    <li key={idx}>{deal.company} ({deal.sector})</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500">
        Researched: {new Date(data.scrapedAt).toLocaleString()}
      </div>

    </div>
  );
};

export default InvestorWebScraper;
