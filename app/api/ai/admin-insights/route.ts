import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { generateAdminEmployeeInsights } from '@/utils/ai';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7', 10);
    const range = Math.min(Math.max(days, 1), 30);

    const supabase = createSupabaseServerClient();
    const since = new Date();
    since.setDate(since.getDate() - range);

    const { data: activities, error } = await supabase
      .from('activities')
      .select('employee_id, activity_type, metadata, created_at, account_id')
      .gte('created_at', since.toISOString());

    if (error) {
      console.error('Admin insights fetch error:', error.message);
      return NextResponse.json({ error: 'Unable to load activity data' }, { status: 500 });
    }

    const insights = await generateAdminEmployeeInsights(activities || []);

    return NextResponse.json({
      success: true,
      insights,
      window: {
        start: since.toISOString(),
        end: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Admin insights API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

