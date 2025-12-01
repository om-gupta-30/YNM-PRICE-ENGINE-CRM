import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { getCurrentISTTime } from '@/lib/utils/dateFormatters';

// This endpoint is called by cron jobs to automatically generate notifications
// It can be called by:
// 1. Vercel Cron Jobs (via vercel.json)
// 2. External cron services (cron-job.org, etc.)
// 3. GitHub Actions scheduled workflows
// 4. Any other scheduled task service

export async function GET(request: NextRequest) {
  // Verify the request is from a cron job (optional security check)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  // If CRON_SECRET is set, require it for security
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const supabase = createSupabaseServerClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all contacts with follow-up dates (today or in the past, not completed)
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select(`
        id,
        name,
        follow_up_date,
        sub_account_id
      `)
      .not('follow_up_date', 'is', null)
      .lte('follow_up_date', today.toISOString().split('T')[0]);

    if (contactsError) {
      console.error('Error fetching contacts:', contactsError);
      return NextResponse.json({ error: contactsError.message }, { status: 500 });
    }

    if (!contacts || contacts.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No contacts with follow-up dates found',
        created: 0 
      });
    }

    // Get existing notifications to avoid duplicates
    const { data: existingNotifications } = await supabase
      .from('notifications')
      .select('contact_id')
      .eq('notification_type', 'followup_due')
      .eq('is_completed', false);

    const existingContactIds = new Set(
      (existingNotifications || []).map((n: any) => n.contact_id).filter(Boolean)
    );

    // Get sub-account IDs
    const subAccountIds = [...new Set(contacts.map((c: any) => c.sub_account_id).filter(Boolean))];
    
    // Fetch sub-accounts with their account info
    let subAccountsMap = new Map();
    if (subAccountIds.length > 0) {
      const { data: subAccountsData } = await supabase
        .from('sub_accounts')
        .select('id, account_id')
        .in('id', subAccountIds);
      
      (subAccountsData || []).forEach((sa: any) => {
        subAccountsMap.set(sa.id, sa.account_id);
      });
    }

    // Get account IDs
    const accountIds = [...new Set(Array.from(subAccountsMap.values()).filter(Boolean))];
    
    // Fetch accounts with assigned employees
    let accountsMap = new Map();
    if (accountIds.length > 0) {
      const { data: accountsData } = await supabase
        .from('accounts')
        .select('id, assigned_employee')
        .in('id', accountIds);
      
      (accountsData || []).forEach((acc: any) => {
        accountsMap.set(acc.id, acc.assigned_employee);
      });
    }

    // Create notifications for contacts that don't have one yet
    const notificationsToCreate = [];
    
    for (const contact of contacts) {
      // Skip if notification already exists
      if (existingContactIds.has(contact.id)) {
        continue;
      }

      // Get account ID from sub-account
      const accountId = contact.sub_account_id ? subAccountsMap.get(contact.sub_account_id) : null;
      
      // Get assigned employee from account
      const assignedEmployee = accountId ? accountsMap.get(accountId) : null;

      // Skip if no assigned employee
      if (!assignedEmployee) {
        continue;
      }

      const followUpDate = new Date(contact.follow_up_date);
      const isDueToday = followUpDate.toDateString() === today.toDateString();
      const isOverdue = followUpDate < today;

      notificationsToCreate.push({
        user_id: assignedEmployee,
        notification_type: 'followup_due',
        title: isOverdue 
          ? `Overdue Follow-up: ${contact.name}`
          : `Follow-up Due: ${contact.name}`,
        message: isOverdue
          ? `Follow-up with ${contact.name} was due on ${followUpDate.toLocaleDateString('en-IN')}. Please follow up.`
          : `Follow-up with ${contact.name} is due today.`,
        contact_id: contact.id,
        sub_account_id: contact.sub_account_id,
        account_id: accountId,
        is_seen: false,
        is_completed: false,
        is_snoozed: false,
        created_at: getCurrentISTTime(),
      });
    }

    if (notificationsToCreate.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'All contacts already have notifications',
        created: 0 
      });
    }

    // Insert notifications in batch
    const { data: createdNotifications, error: insertError } = await supabase
      .from('notifications')
      .insert(notificationsToCreate)
      .select();

    if (insertError) {
      console.error('Error creating notifications:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Created ${createdNotifications?.length || 0} notifications`,
      created: createdNotifications?.length || 0,
      notifications: createdNotifications,
    });
  } catch (error: any) {
    console.error('Generate follow-up notifications error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Also support POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request);
}
