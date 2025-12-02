import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { formatTimestampIST } from '@/lib/utils/dateFormatters';

// GET - Fetch activities for a sub-account
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const subAccountId = parseInt(params.id);

    if (isNaN(subAccountId)) {
      return NextResponse.json(
        { error: 'Invalid sub-account ID' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Fetch activities where sub_account_id matches
    const { data: activities, error } = await supabase
      .from('activities')
      .select('*')
      .or(`sub_account_id.eq.${subAccountId},metadata->>sub_account_id.eq.${subAccountId}`)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching activities:', error);
      return NextResponse.json(
        { error: `Failed to fetch activities: ${error.message}` },
        { status: 500 }
      );
    }

    // Format activities
    const formattedActivities = (activities || []).map((activity: any) => ({
      id: activity.id,
      activity_type: activity.activity_type,
      description: activity.description,
      created_by: activity.created_by,
      created_at: formatTimestampIST(activity.created_at),
      metadata: activity.metadata,
      account_id: activity.account_id,
      sub_account_id: activity.sub_account_id || (activity.metadata?.sub_account_id ? parseInt(activity.metadata.sub_account_id) : null),
    }));

    return NextResponse.json({
      success: true,
      data: formattedActivities,
    });
  } catch (error: any) {
    console.error('Error fetching sub-account activities:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
