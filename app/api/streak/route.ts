import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const employee = searchParams.get('employee');

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'employee parameter is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Fetch streak data
    const { data: streakData, error: fetchError } = await supabase
      .from('employee_streaks')
      .select('streak_count, last_activity_date')
      .eq('employee', employee)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is fine (streak is 0)
      console.error('Error fetching streak:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch streak data' },
        { status: 500 }
      );
    }

    const streakCount = streakData?.streak_count || 0;
    const lastActivityDate = streakData?.last_activity_date || null;

    // Check if streak is still valid (last activity was yesterday or today)
    let isValidStreak = false;
    if (lastActivityDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const lastDate = new Date(lastActivityDate);
      lastDate.setHours(0, 0, 0, 0);
      
      const todayStr = today.toISOString().split('T')[0];
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const lastDateStr = lastDate.toISOString().split('T')[0];

      isValidStreak = lastDateStr === todayStr || lastDateStr === yesterdayStr;
    }

    // Generate motivational message
    let message = '';
    if (streakCount === 0 || !isValidStreak) {
      message = '⚠️ You missed yesterday, streak reset. Let\'s bounce back.';
    } else if (streakCount === 1) {
      message = '🔥 Great start! You\'re on a 1-day streak!';
    } else if (streakCount < 7) {
      message = `🔥 Great! You're on a ${streakCount}-day streak!`;
    } else if (streakCount < 30) {
      message = `🔥 Amazing! You're on a ${streakCount}-day streak! Keep it up!`;
    } else {
      message = `🔥 Incredible! You're on a ${streakCount}-day streak! You're unstoppable!`;
    }

    return NextResponse.json({
      success: true,
      streak: isValidStreak ? streakCount : 0,
      message,
      lastActivityDate,
    });
  } catch (error: any) {
    console.error('Error fetching streak:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch streak' },
      { status: 500 }
    );
  }
}
