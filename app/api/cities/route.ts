import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stateId = searchParams.get('state_id');

    if (!stateId) {
      return NextResponse.json(
        { error: 'state_id query parameter is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    const { data: cities, error } = await supabase
      .from('cities')
      .select('id, city_name, state_id')
      .eq('state_id', parseInt(stateId))
      .order('city_name', { ascending: true });

    if (error) {
      console.error('Error fetching cities:', error);
      return NextResponse.json(
        { error: `Failed to fetch cities: ${error.message}` },
        { status: 500 }
      );
    }

    // Transform to match expected format (id, name, state_id)
    const transformedCities = (cities || []).map((c: any) => ({
      id: c.id,
      name: c.city_name,
      state_id: c.state_id
    }));
    
    return NextResponse.json({ success: true, cities: transformedCities });
  } catch (error: any) {
    console.error('API error in /api/cities:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

