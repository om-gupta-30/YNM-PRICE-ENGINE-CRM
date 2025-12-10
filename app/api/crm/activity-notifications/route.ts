import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

/**
 * GET /api/crm/activity-notifications
 * Fetches unread activity notifications for leads, tasks, and accounts
 * Query params:
 *   - employee: employee username
 *   - isAdmin: 'true' or 'false' (admin sees all activities)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const employee = searchParams.get('employee');
    const isAdmin = searchParams.get('isAdmin') === 'true';

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee parameter is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Get unread activities for each section type
    const sections = ['accounts', 'tasks', 'leads'] as const;
    const notifications: Record<string, any[]> = {
      accounts: [],
      tasks: [],
      leads: [],
    };

    for (const sectionType of sections) {
      // Determine entity type and activity types based on section
      let entityType: string;
      let activityTypes: string[];

      if (sectionType === 'accounts') {
        entityType = 'account';
        activityTypes = ['create', 'edit', 'delete'];
      } else if (sectionType === 'tasks') {
        entityType = 'task';
        activityTypes = ['create', 'edit', 'delete'];
      } else if (sectionType === 'leads') {
        entityType = 'lead';
        activityTypes = ['create', 'edit', 'delete'];
      } else {
        continue;
      }

      // Build query to get activities
      let query = supabase
        .from('activities')
        .select('id, employee_id, activity_type, description, metadata, created_at')
        .in('activity_type', activityTypes)
        .order('created_at', { ascending: false })
        .limit(100); // Limit to recent 100 activities to filter in memory

      // For non-admin users, only show activities related to their assigned accounts/leads/tasks
      if (!isAdmin) {
        // For accounts: show activities for accounts assigned to this employee
        if (sectionType === 'accounts') {
          // Get account IDs assigned to this employee
          const { data: assignedAccounts } = await supabase
            .from('accounts')
            .select('id')
            .eq('assigned_employee', employee);

          if (assignedAccounts && assignedAccounts.length > 0) {
            const accountIds = assignedAccounts.map((acc: any) => acc.id);
            query = query.in('account_id', accountIds);
          } else {
            // No assigned accounts, skip this section
            continue;
          }
        }
        // For leads: show activities for leads assigned to this employee
        else if (sectionType === 'leads') {
          // Get lead IDs assigned to this employee
          const { data: assignedLeads } = await supabase
            .from('leads')
            .select('id')
            .eq('assigned_employee', employee);

          if (assignedLeads && assignedLeads.length > 0) {
            const leadIds = assignedLeads.map((lead: any) => lead.id);
            // Filter by lead_id in metadata - we'll filter in JavaScript after fetching
            // Store leadIds for post-filtering
            (query as any)._leadIds = leadIds;
          } else {
            // No assigned leads, skip this section
            continue;
          }
        }
        // For tasks: show activities for tasks assigned to this employee
        else if (sectionType === 'tasks') {
          // Get task IDs assigned to this employee
          const { data: assignedTasks } = await supabase
            .from('tasks')
            .select('id')
            .eq('assigned_employee', employee);

          if (assignedTasks && assignedTasks.length > 0) {
            const taskIds = assignedTasks.map((task: any) => task.id);
            // Filter by task_id in metadata - we'll filter in JavaScript after fetching
            // Store taskIds for post-filtering
            (query as any)._taskIds = taskIds;
          } else {
            // No assigned tasks, skip this section
            continue;
          }
        }
      }

      const { data: activities, error } = await query;

      if (error) {
        console.error(`Error fetching ${sectionType} activities:`, error);
        continue;
      }

      if (!activities || activities.length === 0) {
        continue;
      }

      // Filter by entity type in metadata (JavaScript filter)
      let filteredActivities = activities.filter((activity: any) => {
        return activity.metadata?.entity_type === entityType;
      });

      // Post-filter for leads and tasks based on assigned IDs
      if (!isAdmin) {
        if (sectionType === 'leads' && (query as any)._leadIds) {
          const leadIds = (query as any)._leadIds;
          filteredActivities = filteredActivities.filter((activity: any) => {
            const metadataLeadId = activity.metadata?.lead_id;
            return metadataLeadId && leadIds.includes(parseInt(metadataLeadId));
          });
        } else if (sectionType === 'tasks' && (query as any)._taskIds) {
          const taskIds = (query as any)._taskIds;
          filteredActivities = filteredActivities.filter((activity: any) => {
            const metadataTaskId = activity.metadata?.task_id;
            return metadataTaskId && taskIds.includes(parseInt(metadataTaskId));
          });
        }
      }

      if (filteredActivities.length === 0) {
        continue;
      }

      // Get activity IDs that have been seen by this employee
      const activityIds = filteredActivities.map((a: any) => a.id);
      const { data: seenActivities } = await supabase
        .from('activity_notifications_seen')
        .select('activity_id')
        .eq('employee_id', employee)
        .eq('section_type', sectionType)
        .in('activity_id', activityIds);

      const seenActivityIds = new Set(
        (seenActivities || []).map((s: any) => s.activity_id)
      );

      // Filter out seen activities
      const unreadActivities = filteredActivities.filter(
        (activity: any) => !seenActivityIds.has(activity.id)
      );

      notifications[sectionType] = unreadActivities;
    }

    return NextResponse.json({
      success: true,
      notifications: {
        accounts: notifications.accounts,
        tasks: notifications.tasks,
        leads: notifications.leads,
      },
      counts: {
        accounts: notifications.accounts.length,
        tasks: notifications.tasks.length,
        leads: notifications.leads.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching activity notifications:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch activity notifications' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/crm/activity-notifications
 * Marks activity notifications as seen
 * Body: { activityIds: number[], sectionType: 'accounts' | 'tasks' | 'leads' }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { activityIds, sectionType, employee } = body;

    if (!activityIds || !Array.isArray(activityIds) || activityIds.length === 0) {
      return NextResponse.json(
        { error: 'activityIds array is required' },
        { status: 400 }
      );
    }

    if (!sectionType || !['accounts', 'tasks', 'leads'].includes(sectionType)) {
      return NextResponse.json(
        { error: 'sectionType must be accounts, tasks, or leads' },
        { status: 400 }
      );
    }

    if (!employee) {
      return NextResponse.json(
        { error: 'employee is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Insert seen records (using upsert to handle duplicates)
    const seenRecords = activityIds.map((activityId: number) => ({
      activity_id: activityId,
      employee_id: employee,
      section_type: sectionType,
    }));

    const { error } = await supabase
      .from('activity_notifications_seen')
      .upsert(seenRecords, {
        onConflict: 'activity_id,employee_id,section_type',
      });

    if (error) {
      console.error('Error marking notifications as seen:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to mark notifications as seen' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Marked ${activityIds.length} notification(s) as seen`,
    });
  } catch (error: any) {
    console.error('Error marking notifications as seen:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to mark notifications as seen' },
      { status: 500 }
    );
  }
}

