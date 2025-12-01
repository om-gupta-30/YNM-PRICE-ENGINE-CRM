import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

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

    if (!lead_id || !activity_type || !description || !created_by) {
      return NextResponse.json(
        { error: 'Lead ID, activity type, description, and created_by are required' },
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

    const { data, error } = await supabase
      .from('lead_activities')
      .insert({
        lead_id: parseInt(lead_id),
        activity_type,
        description: description.trim(),
        metadata: metadata || {},
        created_by: created_by.trim(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating lead activity:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
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

