import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

// PERFORMANCE OPTIMIZATION: Edge runtime for read-only GET API
// This route only reads from Supabase and doesn't use Node-specific APIs
export const runtime = "edge";

// PERFORMANCE OPTIMIZATION: In-memory cache for static data (industries change rarely)
// Cache for 5 minutes max (simple timestamp check)
const industriesCache = {
  data: null as any,
  timestamp: 0,
  TTL: 5 * 60 * 1000, // 5 minutes
};

// GET - Fetch all industries with their sub-industries
export async function GET(request: NextRequest) {
  try {
    // PERFORMANCE OPTIMIZATION: Check cache first
    const now = Date.now();
    if (industriesCache.data && (now - industriesCache.timestamp) < industriesCache.TTL) {
      return NextResponse.json({
        success: true,
        industries: industriesCache.data,
      });
    }

    const supabase = createSupabaseServerClient();

    // PERFORMANCE OPTIMIZATION: Fetch industries and sub-industries in parallel
    const [industriesResult, subIndustriesResult] = await Promise.all([
      supabase.from('industries').select('id, name').order('name'),
      supabase.from('sub_industries').select('id, industry_id, name').order('name')
    ]);

    if (industriesResult.error) {
      console.error('Error fetching industries:', industriesResult.error);
      return NextResponse.json({ error: industriesResult.error.message }, { status: 500 });
    }

    if (subIndustriesResult.error) {
      console.error('Error fetching sub-industries:', subIndustriesResult.error);
      return NextResponse.json({ error: subIndustriesResult.error.message }, { status: 500 });
    }

    // Group sub-industries by industry
    const industriesWithSubIndustries = (industriesResult.data || []).map((industry: any) => ({
      id: industry.id,
      name: industry.name,
      subIndustries: (subIndustriesResult.data || [])
        .filter((si: any) => si.industry_id === industry.id)
        .map((si: any) => ({
          id: si.id,
          name: si.name,
        })),
    }));

    // PERFORMANCE OPTIMIZATION: Update cache
    industriesCache.data = industriesWithSubIndustries;
    industriesCache.timestamp = now;

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
