import { NextRequest, NextResponse } from 'next/server';
// TODO: will implement new AI-based daily summary later (v2).
// import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
// import { generateDailyEmployeeSummary } from '@/utils/ai';

export async function POST(request: NextRequest) {
  // TODO: AI v2 coming soon - placeholder response
    return NextResponse.json({
    message: 'AI v2 coming soon',
    success: false 
  });
  
  // Old implementation commented out:
  // try {
  //   const { username } = await request.json();
  //
  //   if (!username) {
  //     return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  //   }
  //
  //   const supabase = createSupabaseServerClient();
  //   const now = new Date();
  //   const end = new Date(now);
  //   end.setHours(0, 0, 0, 0);
  //   const start = new Date(end);
  //   start.setDate(start.getDate() - 1);
  //
  //   const { data: activities, error } = await supabase
  //     .from('activities')
  //     .select('id, activity_type, description, metadata, created_at, account_id')
  //     .eq('employee_id', username)
  //     .gte('created_at', start.toISOString())
  //     .lt('created_at', end.toISOString())
  //     .order('created_at', { ascending: true });
  //
  //   if (error) {
  //     console.error('Daily summary activity fetch error:', error.message);
  //     return NextResponse.json({ error: 'Unable to load activities' }, { status: 500 });
  //   }
  //
  //   const summary = await generateDailyEmployeeSummary(activities || []);
  //
  //   return NextResponse.json({
  //     success: true,
  //     summary,
  //     window: {
  //       start: start.toISOString(),
  //       end: end.toISOString(),
  //     },
  //   });
  // } catch (error: any) {
  //   console.error('Daily summary API error:', error);
  //   return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  // }
}

