exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { latitude, longitude, radius, keyword } = JSON.parse(event.body);

        // Validate inputs
        if (!latitude || !longitude || !radius || !keyword) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing required parameters: latitude, longitude, radius, keyword' })
            };
        }

        // Get API key from environment variable
        const apiKey = process.env.GOOGLE_PLACES_API_KEY;
        
        if (!apiKey) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'API key not configured' })
            };
        }

        // Call Google Places API - Nearby Search with keyword
        const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}&keyword=${encodeURIComponent(keyword)}&key=${apiKey}`;
        
        const response = await fetch(placesUrl);
        const data = await response.json();

        if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
            return {
                statusCode: 500,
                body: JSON.stringify({ 
                    error: `Google Places API error: ${data.status}`,
                    details: data.error_message 
                })
            };
        }

        // Fetch place details for each result to get phone numbers and websites
        const detailedResults = await Promise.all(
            (data.results || []).slice(0, 20).map(async (place) => {
                try {
                    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,opening_hours,business_status&key=${apiKey}`;
                    const detailsResponse = await fetch(detailsUrl);
                    const detailsData = await detailsResponse.json();
                    
                    return {
                        ...place,
                        ...detailsData.result
                    };
                } catch (err) {
                    console.error('Error fetching place details:', err);
                    return place;
                }
            })
        );

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: JSON.stringify({
                results: detailedResults,
                status: data.status
            })
        };

    } catch (error) {
        console.error('Function error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message 
            })
        };
    }
};
