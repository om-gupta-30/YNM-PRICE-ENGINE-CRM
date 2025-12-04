import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

interface ActivityRecord {
  id: number;
  activity_type: string;
  description: string;
  employee_id: string;
  created_at: string;
  metadata?: any;
}

interface AnalystReport {
  analyst: string;
  period: {
    from: string;
    to: string;
  };
  summary: {
    totalActivities: number;
    accountsEdited: number;
    subAccountsEdited: number;
    contactsEdited: number;
    notesAdded: number;
    otherActivities: number;
  };
  activities: Array<{
    date: string;
    type: string;
    description: string;
    entityType?: string;
    entityName?: string;
  }>;
  generatedAt: string;
}

// GET - Generate activity report for a data analyst
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const analyst = searchParams.get('analyst');
    const days = parseInt(searchParams.get('days') || '30');
    
    if (!analyst) {
      return NextResponse.json(
        { success: false, error: 'Missing analyst parameter' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();
    
    // Calculate date range
    const now = new Date();
    const fromDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    // Fetch activities for this analyst
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select('*')
      .eq('employee_id', analyst)
      .gte('created_at', fromDate.toISOString())
      .order('created_at', { ascending: false });

    if (activitiesError) {
      console.error('Error fetching activities:', activitiesError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch activities' },
        { status: 500 }
      );
    }

    // Process activities and categorize them
    const activityRecords = activities || [];
    
    let accountsEdited = 0;
    let subAccountsEdited = 0;
    let contactsEdited = 0;
    let notesAdded = 0;
    let otherActivities = 0;

    const processedActivities = activityRecords.map((act: ActivityRecord) => {
      const metadata = act.metadata || {};
      const description = act.description?.toLowerCase() || '';
      const activityType = act.activity_type?.toLowerCase() || '';
      
      // Categorize activity
      if (description.includes('account') && (description.includes('edit') || description.includes('update'))) {
        if (description.includes('sub-account') || description.includes('subaccount')) {
          subAccountsEdited++;
        } else {
          accountsEdited++;
        }
      } else if (description.includes('contact') && (description.includes('edit') || description.includes('update') || description.includes('add'))) {
        contactsEdited++;
      } else if (activityType === 'note' || description.includes('note')) {
        notesAdded++;
      } else {
        otherActivities++;
      }

      return {
        date: new Date(act.created_at).toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        type: act.activity_type || 'Unknown',
        description: act.description || 'No description',
        entityType: metadata.entity_type || null,
        entityName: metadata.entity_name || metadata.account_name || null,
      };
    });

    const report: AnalystReport = {
      analyst,
      period: {
        from: fromDate.toLocaleDateString('en-IN'),
        to: now.toLocaleDateString('en-IN'),
      },
      summary: {
        totalActivities: activityRecords.length,
        accountsEdited,
        subAccountsEdited,
        contactsEdited,
        notesAdded,
        otherActivities,
      },
      activities: processedActivities,
      generatedAt: now.toLocaleString('en-IN'),
    };

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: any) {
    console.error('Analyst report API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
