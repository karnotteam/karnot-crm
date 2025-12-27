/**
 * Google Places Search - Netlify Function
 * Enhanced to support both keyword-based and location-based searches
 * Used by ASEAN Export and UK Export pages for lead generation
 */

exports.handler = async (event, context) => {
    // CORS preflight handling
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: ''
        };
    }

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const requestBody = JSON.parse(event.body);
        const { 
            latitude, 
            longitude, 
            radius, 
            keyword, 
            type = 'establishment' 
        } = requestBody;

        // Get API key from environment variable
        const apiKey = process.env.GOOGLE_PLACES_API_KEY;
        
        if (!apiKey) {
            console.error('❌ Google Places API key not configured in environment variables');
            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ 
                    error: 'API key not configured',
                    message: 'Server configuration error. Please contact administrator.'
                })
            };
        }

        // Validate inputs - support two search modes
        const hasLocationSearch = latitude && longitude && radius;
        const hasKeywordSearch = keyword;

        if (!hasLocationSearch && !hasKeywordSearch) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ 
                    error: 'Missing required parameters',
                    message: 'Either provide (latitude, longitude, radius) OR keyword'
                })
            };
        }

        let placesUrl;
        
        // MODE 1: Location-based search (legacy support)
        if (hasLocationSearch) {
            console.log(`🔍 Location Search: ${latitude},${longitude} | Radius: ${radius}m | Keyword: ${keyword || 'none'}`);
            placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}${keyword ? `&keyword=${encodeURIComponent(keyword)}` : ''}&type=${type}&key=${apiKey}`;
        } 
        // MODE 2: Text/keyword search (for ASEAN/UK export pages)
        else if (hasKeywordSearch) {
            console.log(`🔍 Keyword Search: "${keyword}"`);
            // Use Text Search API for better city-based results
            placesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(keyword)}&type=${type}&key=${apiKey}`;
        }

        // Call Google Places API
        const response = await fetch(placesUrl);
        const data = await response.json();

        // Handle API response status
        if (data.status === 'ZERO_RESULTS') {
            console.log('⚠️ No results found for search criteria');
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    results: [],
                    status: 'ZERO_RESULTS',
                    message: 'No results found. Try different search terms or location.'
                })
            };
        }

        if (data.status === 'OVER_QUERY_LIMIT') {
            console.error('❌ Google Places API quota exceeded');
            return {
                statusCode: 429,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ 
                    error: 'API quota exceeded',
                    message: 'Daily search limit reached. Please try again tomorrow.',
                    status: data.status
                })
            };
        }

        if (data.status === 'REQUEST_DENIED') {
            console.error('❌ Google Places API request denied:', data.error_message);
            return {
                statusCode: 403,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ 
                    error: 'API request denied',
                    message: 'API configuration error. Please check API key and billing.',
                    details: data.error_message,
                    status: data.status
                })
            };
        }

        if (data.status !== 'OK') {
            console.error('❌ Google Places API error:', data.status, data.error_message);
            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ 
                    error: `Google Places API error: ${data.status}`,
                    details: data.error_message,
                    status: data.status
                })
            };
        }

        console.log(`✅ Found ${data.results?.length || 0} initial results`);

        // Fetch detailed information for each result (up to 20 to control costs)
        const resultsToEnrich = (data.results || []).slice(0, 20);
        
        const detailedResults = await Promise.all(
            resultsToEnrich.map(async (place, index) => {
                try {
                    // Small delay to avoid rate limiting (50ms between requests)
                    await new Promise(resolve => setTimeout(resolve, index * 50));

                    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,international_phone_number,website,rating,user_ratings_total,opening_hours,business_status,url,types&key=${apiKey}`;
                    
                    const detailsResponse = await fetch(detailsUrl);
                    const detailsData = await detailsResponse.json();
                    
                    if (detailsData.status === 'OK' && detailsData.result) {
                        return {
                            place_id: place.place_id,
                            name: detailsData.result.name || place.name,
                            formatted_address: detailsData.result.formatted_address || place.vicinity,
                            formatted_phone_number: detailsData.result.formatted_phone_number || null,
                            international_phone_number: detailsData.result.international_phone_number || null,
                            website: detailsData.result.website || null,
                            rating: detailsData.result.rating || place.rating || null,
                            user_ratings_total: detailsData.result.user_ratings_total || place.user_ratings_total || null,
                            business_status: detailsData.result.business_status || place.business_status || null,
                            types: detailsData.result.types || place.types || [],
                            google_maps_url: detailsData.result.url || `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
                            geometry: place.geometry // Keep original location data
                        };
                    } else {
                        console.warn(`⚠️ Could not fetch details for ${place.name}:`, detailsData.status);
                        // Return basic info if details fetch fails
                        return {
                            place_id: place.place_id,
                            name: place.name,
                            formatted_address: place.vicinity || 'Address not available',
                            formatted_phone_number: null,
                            rating: place.rating || null,
                            user_ratings_total: place.user_ratings_total || null,
                            business_status: place.business_status || null,
                            types: place.types || [],
                            geometry: place.geometry
                        };
                    }
                } catch (err) {
                    console.error(`❌ Error fetching details for place ${place.place_id}:`, err.message);
                    // Return basic place data on error
                    return {
                        place_id: place.place_id,
                        name: place.name,
                        formatted_address: place.vicinity || 'Address not available',
                        formatted_phone_number: null,
                        rating: place.rating || null,
                        user_ratings_total: place.user_ratings_total || null,
                        geometry: place.geometry
                    };
                }
            })
        );

        // Filter out any null results and results without business status issues
        const validResults = detailedResults.filter(result => 
            result && 
            result.business_status !== 'CLOSED_PERMANENTLY' &&
            result.business_status !== 'CLOSED_TEMPORARILY'
        );

        console.log(`✅ Returning ${validResults.length} enriched results`);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: JSON.stringify({
                results: validResults,
                status: 'OK',
                total_results: validResults.length,
                search_type: hasLocationSearch ? 'location' : 'keyword',
                metadata: {
                    search_query: keyword || `Location: ${latitude},${longitude}`,
                    radius: radius || null,
                    timestamp: new Date().toISOString()
                }
            })
        };

    } catch (error) {
        console.error('💥 Function error:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            })
        };
    }
};
