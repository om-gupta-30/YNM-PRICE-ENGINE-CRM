import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { formatTimestampIST } from '@/lib/utils/dateFormatters';

// GET - Fetch notifications from the notifications table
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    
    // Get username from query params (from frontend)
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username') || '';

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const isAdmin = username?.toLowerCase() === 'admin';

    // Admin should not see notifications
    if (isAdmin) {
      return NextResponse.json({ success: true, notifications: [] });
    }

    // Fetch notifications from notifications table
    // Only show notifications for the logged-in employee
    let notificationsQuery = supabase
      .from('notifications')
      .select('id, user_id, notification_type, title, message, contact_id, account_id, sub_account_id, is_seen, is_completed, is_snoozed, snooze_until, created_at')
      .eq('notification_type', 'followup_due')
      .eq('is_completed', false)
      .eq('user_id', username) // Only show notifications for this specific employee
      .order('created_at', { ascending: false });
    
    console.log(`Fetching notifications for user: ${username}, isAdmin: ${isAdmin}`);

    // Execute the query
    const { data: notificationsData, error: notificationsError } = await notificationsQuery;

    if (notificationsError) {
      console.error('Error fetching notifications:', notificationsError);
      return NextResponse.json({ error: notificationsError.message }, { status: 500 });
    }

    console.log(`Found ${notificationsData?.length || 0} notifications before filtering`);
    
    if (!notificationsData || notificationsData.length === 0) {
      console.log('No notifications found in database');
      return NextResponse.json({ success: true, notifications: [] });
    }

    // Filter out snoozed notifications that haven't passed their snooze time
    const now = new Date();
    const activeNotifications = notificationsData.filter((notif: any) => {
      if (notif.is_snoozed && notif.snooze_until) {
        const snoozeUntil = new Date(notif.snooze_until);
        return snoozeUntil <= now;
      }
      return !notif.is_snoozed;
    });

    console.log(`Found ${activeNotifications.length} active notifications out of ${notificationsData.length} total (after snooze filter)`);

    // Show all active notifications (already filtered by user_id if not admin)
    const filteredNotifications = activeNotifications;

    // Get contact IDs to fetch contact details
    const contactIds = filteredNotifications.map((notif: any) => notif.contact_id).filter(Boolean);
    
    console.log(`Found ${contactIds.length} unique contact IDs`);

    // Fetch contacts with their sub-account and account info
    let contactsData: any[] = [];
    if (contactIds.length > 0) {
      const { data, error: contactsError } = await supabase
        .from('contacts')
        .select('id, name, designation, email, phone, call_status, notes, follow_up_date, sub_account_id, account_id')
        .in('id', contactIds);

      if (contactsError) {
        console.error('Error fetching contacts:', contactsError);
        // Don't return error, just log it and continue with empty contacts
      } else {
        contactsData = data || [];
      }
    }

    console.log(`Fetched ${contactsData.length} contacts`);

    // Filter out contacts with 'Connected' call status (temporarily disabled to show all notifications)
    // TODO: Re-enable this filter if needed
    const validContacts = contactsData; // .filter((c: any) => c.call_status !== 'Connected');
    
    console.log(`${validContacts.length} valid contacts (not filtering by call_status)`);

    // Get sub-account IDs
    const subAccountIds = [...new Set(validContacts.map((c: any) => c.sub_account_id).filter(Boolean))];
    
    // Fetch sub-accounts
    let subAccountsQuery = supabase
      .from('sub_accounts')
      .select('id, sub_account_name, account_id');
    
    if (subAccountIds.length > 0) {
      subAccountsQuery = subAccountsQuery.in('id', subAccountIds);
    }

    const { data: subAccountsData } = await subAccountsQuery;
    
    // Get account IDs
    const accountIds = [...new Set([
      ...validContacts.map((c: any) => c.account_id).filter(Boolean),
      ...(subAccountsData || []).map((sa: any) => sa.account_id).filter(Boolean)
    ])];
    
    // Fetch accounts
    let accountsQuery = supabase
      .from('accounts')
      .select('id, account_name');
    
    if (accountIds.length > 0) {
      accountsQuery = accountsQuery.in('id', accountIds);
    }

    const { data: accountsData } = await accountsQuery;

    // Create lookup maps - use validContacts instead of contactsData
    const contactMap = new Map();
    validContacts.forEach((c: any) => {
      contactMap.set(c.id, c);
    });
    
    // Create a set of valid contact IDs for filtering notifications
    const validContactIds = new Set(validContacts.map((c: any) => c.id));

    const subAccountMap = new Map();
    (subAccountsData || []).forEach((sa: any) => {
      subAccountMap.set(sa.id, sa);
    });

    const accountMap = new Map();
    (accountsData || []).forEach((a: any) => {
      accountMap.set(a.id, a.account_name);
    });

    // Format the response to match expected structure
    const notifications = filteredNotifications
      .map((notif: any) => {
        // If notification has contact_id and contact exists, use contact data
        if (notif.contact_id && validContactIds.has(notif.contact_id)) {
          const contact = contactMap.get(notif.contact_id);
          if (!contact) {
            console.warn(`Contact ${notif.contact_id} not found in contactMap`);
            return null; // Skip if contact map doesn't have it
          }

          const subAccount = contact.sub_account_id ? subAccountMap.get(contact.sub_account_id) : null;
          const accountName = contact.account_id ? accountMap.get(contact.account_id) : null;
          const subAccountName = subAccount?.sub_account_name || null;

          return {
            id: contact.id, // Use contact ID for compatibility
            notificationId: notif.id, // Include notification ID
            subAccountId: contact.sub_account_id || notif.sub_account_id,
            sub_account_id: contact.sub_account_id || notif.sub_account_id,
            name: contact.name,
            designation: contact.designation || null,
            email: contact.email || null,
            phone: contact.phone || null,
            callStatus: contact.call_status || null,
            notes: contact.notes || null,
            followUpDate: contact.follow_up_date,
            accountName: accountName || null,
            subAccountName: subAccountName || null,
            isSeen: notif.is_seen || false,
            isCompleted: notif.is_completed || false,
            created_at: formatTimestampIST(notif.created_at),
          };
        }
        
        // If notification has sub_account_id but no contact_id, try to find contact via sub_account
        if (notif.sub_account_id && !notif.contact_id) {
          console.warn(`Notification ${notif.id} has sub_account_id (${notif.sub_account_id}) but no contact_id`);
          // Could potentially fetch contacts from this sub_account, but for now return minimal data
        }
        
        // If notification doesn't have contact_id or contact doesn't exist, still include it with minimal data
        // This ensures all notifications show up even if there are data issues
        console.warn(`Notification ${notif.id} has missing contact_id or contact doesn't exist. Title: ${notif.title}, Message: ${notif.message}`);
        return {
          id: notif.id, // Use notification ID as fallback
          notificationId: notif.id,
          subAccountId: notif.sub_account_id || null,
          sub_account_id: notif.sub_account_id || null,
          name: notif.title || notif.message || 'Unknown Contact',
          designation: null,
          email: null,
          phone: null,
          callStatus: null,
          notes: null,
          followUpDate: null,
          accountName: null,
          subAccountName: null,
          isSeen: notif.is_seen || false,
          isCompleted: notif.is_completed || false,
          created_at: formatTimestampIST(notif.created_at),
        };
      })
      .filter(Boolean); // Remove null entries

    console.log(`Returning ${notifications.length} formatted notifications`);

    return NextResponse.json({ success: true, notifications });
  } catch (error: any) {
    console.error('Get follow-up notifications error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

