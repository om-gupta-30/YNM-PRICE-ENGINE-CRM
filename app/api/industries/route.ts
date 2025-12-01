import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

// GET - Fetch all industries with their sub-industries
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();

    // Fetch all industries
    const { data: industries, error: industriesError } = await supabase
      .from('industries')
      .select('id, name')
      .order('name');

    if (industriesError) {
      console.error('Error fetching industries:', industriesError);
      return NextResponse.json({ error: industriesError.message }, { status: 500 });
    }

    // Fetch all sub-industries
    const { data: subIndustries, error: subIndustriesError } = await supabase
      .from('sub_industries')
      .select('id, industry_id, name')
      .order('name');

    if (subIndustriesError) {
      console.error('Error fetching sub-industries:', subIndustriesError);
      return NextResponse.json({ error: subIndustriesError.message }, { status: 500 });
    }

    // Group sub-industries by industry
    const industriesWithSubIndustries = (industries || []).map((industry: any) => ({
      id: industry.id,
      name: industry.name,
      subIndustries: (subIndustries || [])
        .filter((si: any) => si.industry_id === industry.id)
        .map((si: any) => ({
          id: si.id,
          name: si.name,
        })),
    }));

    return NextResponse.json({
      success: true,
      industries: industriesWithSubIndustries,
    });
  } catch (error: any) {
    console.error('Industries API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
