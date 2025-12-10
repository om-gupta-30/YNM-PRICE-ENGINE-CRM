import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fromPincode, toPincode } = body;

    if (!fromPincode || !toPincode) {
      return NextResponse.json(
        { error: 'Both from and to pincodes are required' },
        { status: 400 }
      );
    }

    // Validate pincode format (6 digits for Indian pincodes)
    const pincodeRegex = /^\d{6}$/;
    if (!pincodeRegex.test(fromPincode) || !pincodeRegex.test(toPincode)) {
      return NextResponse.json(
        { error: 'Invalid pincode format. Please enter 6-digit pincodes' },
        { status: 400 }
      );
    }

    // Get Google Maps API key from environment variables
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.error('GOOGLE_MAPS_API_KEY is not set in environment variables');
      return NextResponse.json(
        { error: 'Google Maps API key is not configured' },
        { status: 500 }
      );
    }

    // Use Google Maps Distance Matrix API
    // Format: origin and destination as "pincode,India" for better accuracy
    const origin = `${fromPincode},India`;
    const destination = `${toPincode},India`;
    
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&units=metric&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.rows && data.rows.length > 0) {
      const element = data.rows[0].elements[0];
      
      if (element.status === 'OK') {
        const distanceInKm = element.distance.value / 1000; // Convert meters to kilometers
        const distanceText = element.distance.text;
        
        return NextResponse.json({
          success: true,
          distance: {
            value: distanceInKm,
            text: distanceText,
            meters: element.distance.value,
          },
          duration: {
            text: element.duration.text,
            seconds: element.duration.value,
          },
        });
      } else {
        return NextResponse.json(
          { error: `Could not calculate distance: ${element.status}` },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: `API error: ${data.status}${data.error_message ? ' - ' + data.error_message : ''}` },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error calculating distance:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to calculate distance' },
      { status: 500 }
    );
  }
}

