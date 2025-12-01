import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();

    const { data: states, error } = await supabase
      .from('states')
      .select('id, state_name')
      .order('state_name', { ascending: true });

    if (error) {
      console.error('Error fetching states:', error);
      return NextResponse.json(
        { error: `Failed to fetch states: ${error.message}` },
        { status: 500 }
      );
    }

    // Transform to match expected format (id, name)
    const transformedStates = (states || []).map((s: any) => ({
      id: s.id,
      name: s.state_name
    }));
    
    return NextResponse.json({ success: true, states: transformedStates });
  } catch (error: any) {
    console.error('API error in /api/states:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

