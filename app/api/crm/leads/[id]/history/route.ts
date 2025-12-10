import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { formatTimestampIST } from '@/lib/utils/dateFormatters';

// GET - Fetch complete lead history including creation and all activities
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const leadId = parseInt(params.id);

    if (isNaN(leadId)) {
      return NextResponse.json(
        { error: 'Invalid lead ID' },
        { status: 400 }
      );
    }

    let supabase;
    try {
      supabase = createSupabaseServerClient();
    } catch (error: any) {
      console.error('Error creating Supabase client:', error);
      return NextResponse.json(
        { 
          success: false,
          error: 'Database connection error. Please check environment variables.',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 500 }
      );
    }

    // Fetch lead details and activities in parallel for better performance
    const [leadResult, activitiesResult] = await Promise.all([
      supabase
        .from('leads')
        .select('id, lead_name, created_by, created_at, status, priority, account_id, sub_account_id')
        .eq('id', leadId)
        .single(),
      supabase
        .from('activities')
        .select('id, employee_id, activity_type, description, metadata, created_at')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: true })
    ]);

    const { data: lead, error: leadError } = leadResult;
    const { data: allActivities, error: activitiesError } = activitiesResult;

    if (leadError || !lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

    // Build history array
    const history: any[] = [];

    // Add lead creation as first entry
    history.push({
      type: 'created',
      action: 'Lead created',
      description: `Lead "${lead.lead_name}" was created`,
      changed_by: lead.created_by || 'System',
      changed_at: lead.created_at,
      metadata: {
        lead_name: lead.lead_name,
        status: lead.status,
        priority: lead.priority,
        account_id: lead.account_id,
        sub_account_id: lead.sub_account_id,
      },
    });

    // Add activities (status changes, edits, notes, etc.)
    if (allActivities && !activitiesError) {
      allActivities.forEach((activity: any) => {
        const metadata = activity.metadata || {};

        // Status change
        if (activity.activity_type === 'status_change' || (metadata.old_data?.status && metadata.new_data?.status)) {
          const oldStatus = metadata.old_data?.status || metadata.old_status || 'Unknown';
          const newStatus = metadata.new_data?.status || metadata.new_status || activity.description?.match(/to (.+)$/)?.[1] || 'Unknown';
          history.push({
            type: 'status_change',
            action: 'Status updated',
            description: activity.description || `Status changed: ${oldStatus} → ${newStatus}`,
            changed_by: activity.employee_id || 'System',
            changed_at: activity.created_at,
            metadata: {
              old_status: oldStatus,
              new_status: newStatus,
            },
          });
        }
        // Priority change
        else if (metadata.changes?.some((c: string) => c.includes('Priority'))) {
          const priorityMatch = metadata.changes?.find((c: string) => c.includes('Priority'))?.match(/Priority: "?([^"]*)"? → "?([^"]*)"?/);
          history.push({
            type: 'priority_change',
            action: 'Priority updated',
            description: activity.description || (priorityMatch ? `Priority changed: ${priorityMatch[1] || 'None'} → ${priorityMatch[2] || 'None'}` : 'Priority was updated'),
            changed_by: activity.employee_id || 'System',
            changed_at: activity.created_at,
            metadata: {
              old_priority: priorityMatch?.[1] || null,
              new_priority: priorityMatch?.[2] || null,
            },
          });
        }
        // Employee reassignment
        else if (activity.activity_type === 'employee_reassigned' || metadata.changes?.some((c: string) => c.includes('Assigned'))) {
          history.push({
            type: 'employee_reassigned',
            action: 'Employee reassigned',
            description: activity.description || 'Lead was reassigned to a different employee',
            changed_by: activity.employee_id || 'System',
            changed_at: activity.created_at,
            metadata: metadata,
          });
        }
        // Notes
        else if (activity.activity_type === 'note') {
          history.push({
            type: 'note',
            action: 'Note added',
            description: activity.description || 'A note was added',
            changed_by: activity.employee_id || 'System',
            changed_at: activity.created_at,
            metadata: metadata,
          });
        }
        // Follow-up set
        else if (activity.activity_type === 'follow_up_set' || metadata.changes?.some((c: string) => c.includes('Follow-up'))) {
          history.push({
            type: 'follow_up',
            action: 'Follow-up set',
            description: activity.description || 'A follow-up date was set',
            changed_by: activity.employee_id || 'System',
            changed_at: activity.created_at,
            metadata: metadata,
          });
        }
        // Other edits
        else {
          history.push({
            type: 'edit',
            action: 'Lead updated',
            description: activity.description || 'Lead was updated',
            changed_by: activity.employee_id || 'System',
            changed_at: activity.created_at,
            metadata: metadata,
          });
        }
      });
    }

    // Sort by timestamp (newest first - reverse chronological)
    history.sort((a, b) => {
      const timeA = new Date(a.changed_at).getTime();
      const timeB = new Date(b.changed_at).getTime();
      return timeB - timeA; // Reverse order - newest first
    });

    return NextResponse.json({
      success: true,
      history: history.map(entry => ({
        ...entry,
        changed_at: formatTimestampIST(entry.changed_at),
      })),
    });
  } catch (error: any) {
    console.error('Lead history API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

