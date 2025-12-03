import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const subAccountId = searchParams.get('subAccountId');

    if (!subAccountId) {
      return NextResponse.json(
        { success: false, error: 'subAccountId is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Try to query the table - if it doesn't exist, we'll get an error and return empty array
    // The table should be created via the migration script: docs/CREATE_ENGAGEMENT_HISTORY_TABLE.sql

    // Fetch engagement history for this sub-account
    const { data: history, error: fetchError } = await supabase
      .from('engagement_history')
      .select('score, created_at')
      .eq('sub_account_id', parseInt(subAccountId))
      .order('created_at', { ascending: true });

    if (fetchError) {
      // If table doesn't exist, return empty array
      if (fetchError.message.includes('relation "engagement_history" does not exist')) {
        return NextResponse.json({
          success: true,
          data: [],
        });
      }
      throw fetchError;
    }

    // Format data for chart: group by date and take latest score per day
    const dateMap = new Map<string, number>();
    
    (history || []).forEach((entry) => {
      const date = new Date(entry.created_at).toISOString().split('T')[0]; // YYYY-MM-DD
      // Keep the latest score for each date
      const existingScore = dateMap.get(date);
      if (!existingScore || new Date(entry.created_at) > new Date(existingScore)) {
        dateMap.set(date, Number(entry.score));
      }
    });

    // Convert to array format: [{ date: "2025-02-01", score: 72 }, ...]
    const formattedData = Array.from(dateMap.entries())
      .map(([date, score]) => ({
        date,
        score: Number(score),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      success: true,
      data: formattedData,
    });
  } catch (error: any) {
    console.error('Error fetching engagement history:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch engagement history' },
      { status: 500 }
    );
  }
}
