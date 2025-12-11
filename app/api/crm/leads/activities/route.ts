import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { logActivity } from '@/lib/utils/activityLogger';

// GET - Fetch activities for a lead
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('lead_id');

    if (!leadId) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase
      .from('lead_activities')
      .select('*')
      .eq('lead_id', parseInt(leadId))
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching lead activities:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, activities: data || [] });
  } catch (error: any) {
    console.error('Get lead activities error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new activity for a lead
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      lead_id,
      activity_type,
      description,
      metadata,
      created_by,
    } = body;

    if (!lead_id || !activity_type || !description) {
      return NextResponse.json(
        { error: 'Lead ID, activity type, and description are required' },
        { status: 400 }
      );
    }

    const validActivityTypes = ['note', 'call', 'status_change', 'follow_up_set', 'follow_up_completed', 'employee_reassigned', 'email_sent', 'meeting_scheduled'];
    if (!validActivityTypes.includes(activity_type)) {
      return NextResponse.json(
        { error: `Invalid activity type. Must be one of: ${validActivityTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Get employee_id from created_by (username)
    // If created_by is not provided, we can't create the activity
    if (!created_by) {
      return NextResponse.json(
        { error: 'created_by (username) is required to identify the employee' },
        { status: 400 }
      );
    }

    // Get lead data to fetch account_id for activity logging
    const { data: leadData } = await supabase
      .from('leads')
      .select('id, account_id, sub_account_id')
      .eq('id', parseInt(lead_id))
      .single();

    // Insert into lead_activities table
    const { data, error } = await supabase
      .from('lead_activities')
      .insert({
        lead_id: parseInt(lead_id),
        employee_id: created_by.trim(),
        activity_type,
        description: description.trim(),
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating lead activity:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Also log to main activities table for history
    if (leadData) {
      try {
        await logActivity({
          account_id: leadData.account_id || null,
          sub_account_id: leadData.sub_account_id || null,
          lead_id: parseInt(lead_id),
          employee_id: created_by.trim(),
          activity_type: activity_type === 'note' ? 'note' : activity_type === 'follow_up_set' ? 'followup' : 'edit',
          description: description.trim(),
          metadata: {
            ...(metadata || {}),
            activity_type: activity_type,
          },
        });
      } catch (activityError) {
        console.warn('Failed to log activity to activities table (non-critical):', activityError);
        // Don't fail the request if activity logging fails
      }
    }

    return NextResponse.json({ success: true, activity: data });
  } catch (error: any) {
    console.error('Create lead activity error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

