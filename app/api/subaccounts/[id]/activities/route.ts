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

    // Fetch activities where sub_account_id matches in metadata
    // Note: sub_account_id column may not exist in all databases, so we query through metadata only
    let activities: any[] = [];
    let fetchError: any = null;
    
    // Try with sub_account_id column first
    const { data: activitiesData, error: error1 } = await supabase
      .from('activities')
      .select('*')
      .or(`sub_account_id.eq.${subAccountId},metadata->>sub_account_id.eq.${subAccountId}`)
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (error1) {
      // If sub_account_id column doesn't exist, try with just metadata
      if (error1.message?.includes('sub_account_id') && error1.message?.includes('does not exist')) {
        const { data: activitiesFromMetadata, error: error2 } = await supabase
          .from('activities')
          .select('*')
          .or(`metadata->>sub_account_id.eq.${subAccountId},metadata->>sub_account_id.eq."${subAccountId}"`)
          .order('created_at', { ascending: false })
          .limit(100);
        
        if (error2) {
          console.error('Error fetching activities from metadata:', error2);
          fetchError = error2;
        } else {
          activities = activitiesFromMetadata || [];
        }
      } else {
        console.error('Error fetching activities:', error1);
        fetchError = error1;
      }
    } else {
      activities = activitiesData || [];
    }

    if (fetchError) {
      return NextResponse.json(
        { error: `Failed to fetch activities: ${fetchError.message}` },
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
