import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employee = searchParams.get('employee');

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Missing employee parameter' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    const { data: streak, error } = await supabase
      .from('employee_streaks')
      .select('streak_count, last_activity_date')
      .eq('employee', employee)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching streak:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch streak data' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      streak: streak || { streak_count: 0, last_activity_date: null },
    });
  } catch (error: any) {
    console.error('Streaks API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
