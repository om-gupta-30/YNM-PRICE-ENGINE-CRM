import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { formatTimestampIST } from '@/lib/utils/dateFormatters';

// PERFORMANCE OPTIMIZATION: Edge runtime for read-only GET API
// This route only reads from Supabase and doesn't use Node-specific APIs
export const runtime = "edge";

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
    
    // Normalize username to lowercase for consistent matching
    const normalizedUsername = username.toLowerCase();
    
    // PERFORMANCE OPTIMIZATION: Reduce console logging in production
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🔔 [FETCH] Username: "${username}" (normalized: "${normalizedUsername}"), Is admin: ${isAdmin}`);
    }

    // Admin should not see notifications
    if (isAdmin) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`🔔 [FETCH] Admin user - returning empty notifications`);
      }
      return NextResponse.json({ success: true, notifications: [] });
    }

    // Fetch notifications from notifications table
    // Only show notifications for the logged-in employee
    // Only show unseen notifications (is_seen = false)
    // Select all columns except lead_id (which doesn't exist in the table)
    // We'll get lead_id from metadata instead
    // Use ilike for case-insensitive matching (PostgreSQL)
    // CRITICAL: Filter by user_id to ensure only this user's notifications are shown
    // This prevents notifications from other users or unrelated notifications from appearing/disappearing
    let notificationsQuery = supabase
      .from('notifications')
      .select('id, user_id, notification_type, title, message, contact_id, account_id, sub_account_id, is_seen, is_completed, is_snoozed, snooze_until, created_at, metadata')
      .eq('notification_type', 'followup_due')
      .eq('is_completed', false)
      .eq('is_seen', false) // Only show unseen notifications
      .ilike('user_id', username) // Case-insensitive matching for user_id - CRITICAL: ensures only this user's notifications
      .order('created_at', { ascending: false });
    
    // PERFORMANCE OPTIMIZATION: Reduce console logging in production
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🔔 [FETCH] Query: notification_type='followup_due', is_completed=false, is_seen=false, user_id ILIKE '${username}'`);
    }

    // Execute the query
    const { data: notificationsData, error: notificationsError } = await notificationsQuery;

    if (notificationsError) {
      console.error('❌ [FETCH] Error fetching notifications:', notificationsError);
      if (process.env.NODE_ENV !== 'production') {
        console.error('❌ [FETCH] Error details:', JSON.stringify(notificationsError, null, 2));
        console.log('⚠️ [FETCH] Returning empty notifications array due to fetch error');
      }
      // Don't fail completely - return empty array so UI doesn't break
      return NextResponse.json({ success: true, notifications: [] });
    }

    // PERFORMANCE OPTIMIZATION: Reduce console logging in production
    if (process.env.NODE_ENV !== 'production') {
      console.log(`✅ [FETCH] Found ${notificationsData?.length || 0} raw notifications from database for user: ${username}`);
      if (notificationsData && notificationsData.length > 0) {
        console.log(`📋 [FETCH] Sample notification user_ids:`, notificationsData.slice(0, 3).map((n: any) => n.user_id));
        console.log(`📋 [FETCH] Contact IDs in notifications:`, notificationsData.map((n: any) => n.contact_id).filter(Boolean));
        console.log(`📋 [FETCH] Notification IDs:`, notificationsData.map((n: any) => n.id));
      }
    }
    
    if (!notificationsData || notificationsData.length === 0) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('No notifications found in database');
      }
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

    // PERFORMANCE OPTIMIZATION: Reduce console logging in production
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Found ${activeNotifications.length} active notifications out of ${notificationsData.length} total (after snooze filter)`);
    }

    // CRITICAL: Show ALL active notifications - don't filter anything out
    // Both contact and lead notifications should be returned
    // They are independent and should not affect each other
    const filteredNotifications = activeNotifications;
    
    // PERFORMANCE OPTIMIZATION: Reduce console logging in production
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📊 [FETCH] Total filtered notifications: ${filteredNotifications.length}`);
      const contactCount = filteredNotifications.filter((n: any) => n.contact_id).length;
      const leadCount = filteredNotifications.filter((n: any) => n.metadata && (typeof n.metadata === 'string' ? JSON.parse(n.metadata) : n.metadata).lead_id).length;
      console.log(`   - Contact notifications: ${contactCount}`);
      console.log(`   - Lead notifications: ${leadCount}`);
    }

    // Get contact IDs and lead IDs to fetch details (only from metadata since lead_id column doesn't exist)
    const contactIds = filteredNotifications.map((notif: any) => notif.contact_id).filter(Boolean);
    
    // Extract lead IDs from metadata (handle both object and string)
    const leadIds: number[] = [];
    filteredNotifications.forEach((notif: any) => {
      let metadata = notif.metadata;
      if (typeof metadata === 'string') {
        try {
          metadata = JSON.parse(metadata);
          if (process.env.NODE_ENV !== 'production') {
            console.log(`✅ [FETCH] Parsed metadata string for notification ${notif.id}:`, metadata);
          }
        } catch (e) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn(`⚠️ [FETCH] Failed to parse metadata string for notification ${notif.id}:`, e);
            console.warn(`   Raw metadata:`, notif.metadata);
          }
          metadata = {};
        }
      }
      if (metadata?.lead_id) {
        const leadId = typeof metadata.lead_id === 'number' 
          ? metadata.lead_id 
          : parseInt(metadata.lead_id);
        if (!isNaN(leadId)) {
          leadIds.push(leadId);
          if (process.env.NODE_ENV !== 'production') {
            console.log(`📌 [FETCH] Found lead_id ${leadId} in notification ${notif.id}`);
          }
        } else {
          if (process.env.NODE_ENV !== 'production') {
            console.warn(`⚠️ [FETCH] Invalid lead_id in notification ${notif.id}:`, metadata.lead_id);
          }
        }
      } else {
        // Log if notification doesn't have lead_id but might be a lead notification
        if (process.env.NODE_ENV !== 'production' && (notif.message?.includes('Lead:') || notif.title?.includes('Lead'))) {
          console.warn(`⚠️ [FETCH] Notification ${notif.id} mentions Lead but has no lead_id in metadata`);
        }
      }
    });
    const uniqueLeadIds = [...new Set(leadIds)];
    
    // PERFORMANCE OPTIMIZATION: Reduce console logging in production
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📊 [FETCH] Found ${contactIds.length} unique contact IDs and ${uniqueLeadIds.length} unique lead IDs (from metadata)`);
      console.log(`   Contact IDs: ${contactIds.join(', ') || 'none'}`);
      console.log(`   Lead IDs: ${uniqueLeadIds.join(', ') || 'none'}`);
    }

    // CRITICAL: Fetch contacts with their sub-account and account info
    // Fetch ALL contacts that have notifications, regardless of follow-up date status
    // This ensures contact notifications don't disappear when leads are updated
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
    
    // CRITICAL: Also fetch any contacts that might have follow-up dates but weren't in contactIds
    // This is a safety measure to ensure we don't miss any contact notifications
    const allContactIdsFromNotifications = new Set(contactIds);
    filteredNotifications.forEach((notif: any) => {
      if (notif.contact_id && !allContactIdsFromNotifications.has(notif.contact_id)) {
        allContactIdsFromNotifications.add(notif.contact_id);
      }
    });
    
    // If we found additional contact IDs, fetch them too
    const additionalContactIds = Array.from(allContactIdsFromNotifications).filter(id => !contactIds.includes(id));
    if (additionalContactIds.length > 0) {
      const { data: additionalContacts } = await supabase
        .from('contacts')
        .select('id, name, designation, email, phone, call_status, notes, follow_up_date, sub_account_id, account_id')
        .in('id', additionalContactIds);
      
      if (additionalContacts) {
        contactsData = [...contactsData, ...additionalContacts];
      }
    }

    // PERFORMANCE OPTIMIZATION: Reduce console logging in production
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Fetched ${contactsData.length} contacts`);
    }

    // CRITICAL: Include ALL contacts from notifications, even if they don't have follow_up_date in contacts table
    // The existence of a notification in the notifications table is proof that there's a follow-up
    // This ensures contact notifications don't disappear when leads are updated
    const validContacts = contactsData; // Don't filter - include all contacts that have notifications
    
    // PERFORMANCE OPTIMIZATION: Reduce console logging in production
    if (process.env.NODE_ENV !== 'production') {
      console.log(`${validContacts.length} valid contacts (not filtering by call_status)`);
    }

    // Fetch leads with follow-up dates
    let leadsData: any[] = [];
    if (uniqueLeadIds.length > 0) {
      const { data, error: leadsError } = await supabase
        .from('leads')
        .select('id, lead_name, contact_person, phone, email, follow_up_date, account_id, sub_account_id, assigned_employee')
        .in('id', uniqueLeadIds);

      if (leadsError) {
        console.error('Error fetching leads:', leadsError);
        // Don't return error, just log it and continue with empty leads
      } else {
        leadsData = data || [];
      }
    }

    // PERFORMANCE OPTIMIZATION: Reduce console logging in production
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Fetched ${leadsData.length} leads`);
    }

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

    // Create lookup maps - use all contactsData, not just validContacts
    const contactMap = new Map();
    contactsData.forEach((c: any) => {
      contactMap.set(c.id, c);
    });
    
    // CRITICAL: Create a set of ALL contact IDs from notifications table
    // This ensures we return ALL contact notifications, regardless of contact data availability
    // Contact notifications should NEVER disappear when leads are updated
    const validContactIds = new Set();
    
    // Add all contact IDs from the notifications table
    filteredNotifications.forEach((notif: any) => {
      if (notif.contact_id) {
        validContactIds.add(notif.contact_id);
      }
    });
    
    // Also add contact IDs from contactsData as a backup
    contactsData.forEach((c: any) => {
      validContactIds.add(c.id);
    });

    const subAccountMap = new Map();
    (subAccountsData || []).forEach((sa: any) => {
      subAccountMap.set(sa.id, sa);
    });

    const accountMap = new Map();
    (accountsData || []).forEach((a: any) => {
      accountMap.set(a.id, a.account_name);
    });

    // Create lead map
    const leadMap = new Map();
    leadsData.forEach((l: any) => {
      leadMap.set(l.id, l);
    });
    const validLeadIds = new Set(leadsData.map((l: any) => l.id));
    
    // PERFORMANCE OPTIMIZATION: Reduce console logging in production
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Mapped ${leadsData.length} leads, validLeadIds: ${Array.from(validLeadIds).join(', ')}`);
    }

    // CRITICAL: Format the response - ensure ALL notifications are returned
    // Process in order: leads first, then contacts, then fallbacks
    // This ensures both contact and lead notifications are always included
    const notifications = filteredNotifications
      .map((notif: any) => {
        // CRITICAL: Store original notification ID - this is the key identifier
        const notificationId = notif.id;
        // Check for lead_id in metadata (column doesn't exist in table)
        // Metadata might be a JSON string or an object
        let leadId = null;
        let metadataObj = notif.metadata;
        
        // If metadata is a string, parse it
        if (typeof metadataObj === 'string') {
          try {
            metadataObj = JSON.parse(metadataObj);
            if (process.env.NODE_ENV !== 'production') {
              console.log(`✅ [FETCH] Parsed metadata for notification ${notif.id}:`, metadataObj);
            }
          } catch (e) {
            if (process.env.NODE_ENV !== 'production') {
              console.warn(`⚠️ [FETCH] Failed to parse metadata string for notification ${notif.id}:`, e);
              console.warn(`   Raw metadata string:`, notif.metadata);
            }
            metadataObj = {};
          }
        }
        
        if (metadataObj?.lead_id) {
          leadId = typeof metadataObj.lead_id === 'number' 
            ? metadataObj.lead_id 
            : parseInt(metadataObj.lead_id);
        }
        
        // CRITICAL: Filter out lead notifications - only return contact notifications
        if (leadId && !isNaN(leadId)) {
          return null; // Skip lead notifications
        }
        
        // Also check if notification message mentions a lead (fallback)
        if (!leadId && notif.message && notif.message.includes('Lead:')) {
          return null; // Skip lead notifications
        }
        
        // CRITICAL: If notification has contact_id, ALWAYS return it - NO EXCEPTIONS
        // Contact notifications are INDEPENDENT of lead notifications
        // They should NEVER disappear when leads are updated
        if (notif.contact_id) {
          let contact = contactMap.get(notif.contact_id);
          
          // If contact not in map, try to find it in contactsData
          if (!contact) {
            contact = contactsData.find((c: any) => c.id === notif.contact_id);
          }
          
          // ALWAYS return contact notification, even if contact data is missing
          const subAccount = contact?.sub_account_id ? subAccountMap.get(contact.sub_account_id) : null;
          const accountName = contact?.account_id ? accountMap.get(contact.account_id) : null;
          const subAccountName = subAccount?.sub_account_name || null;

          // CRITICAL: Get follow-up date from contact data or metadata
          // Priority: contact.follow_up_date > metadata.follow_up_date > null
          let followUpDate = contact?.follow_up_date || null;
          if (!followUpDate && metadataObj?.follow_up_date) {
            followUpDate = metadataObj.follow_up_date;
          }

          return {
            id: contact?.id || notif.contact_id, // Use contact ID or fallback to notification contact_id
            notificationId: notificationId, // CRITICAL: Use stored notification ID
            subAccountId: contact?.sub_account_id || notif.sub_account_id || null,
            sub_account_id: contact?.sub_account_id || notif.sub_account_id || null,
            name: contact?.name || notif.title?.replace('Follow-Up: ', '') || notif.message || 'Unknown Contact',
            designation: contact?.designation || null,
            email: contact?.email || null,
            phone: contact?.phone || null,
            callStatus: contact?.call_status || null,
            notes: contact?.notes || null,
            followUpDate: followUpDate, // Use extracted follow-up date
            accountName: accountName || null,
            subAccountName: subAccountName || null,
            isSeen: notif.is_seen || false,
            isCompleted: notif.is_completed || false,
            created_at: formatTimestampIST(notif.created_at),
          };
        }
        
        // If notification has sub_account_id but no contact_id, try to find contact via sub_account
        if (notif.sub_account_id && !notif.contact_id) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn(`Notification ${notif.id} has sub_account_id (${notif.sub_account_id}) but no contact_id`);
          }
          // Could potentially fetch contacts from this sub_account, but for now return minimal data
        }
        
        // If notification doesn't have contact_id or contact doesn't exist, still include it with minimal data
        // This ensures all notifications show up even if there are data issues
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`Notification ${notif.id} has missing contact_id or contact doesn't exist. Title: ${notif.title}, Message: ${notif.message}`);
        }
        return {
          id: notificationId, // Use notification ID as fallback
          notificationId: notificationId, // Use stored notification ID
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

    // CRITICAL: Sort notifications by follow-up date in chronological order (earliest first)
    // This ensures notifications appear in the correct order
    notifications.sort((a: any, b: any) => {
      const dateA = a.followUpDate ? new Date(a.followUpDate).getTime() : Infinity;
      const dateB = b.followUpDate ? new Date(b.followUpDate).getTime() : Infinity;
      
      // If both have dates, sort by date (earliest first)
      if (dateA !== Infinity && dateB !== Infinity) {
        return dateA - dateB;
      }
      
      // If only one has a date, put it first
      if (dateA !== Infinity) return -1;
      if (dateB !== Infinity) return 1;
      
      // If neither has a date, maintain original order (by created_at)
      return 0;
    });

    // PERFORMANCE OPTIMIZATION: Reduce console logging in production
    if (process.env.NODE_ENV !== 'production') {
      console.log(`✅ Returning ${notifications.length} formatted notifications for user: ${username}`);
      if (notifications.length > 0) {
        console.log(`   - Leads: ${notifications.filter((n: any) => n.isLead).length}`);
        console.log(`   - Contacts: ${notifications.filter((n: any) => !n.isLead).length}`);
        notifications.forEach((n: any, idx: number) => {
          console.log(`   [${idx + 1}] ${n.isLead ? 'LEAD' : 'CONTACT'}: ${n.name} (ID: ${n.id}, NotifID: ${n.notificationId}, FollowUp: ${n.followUpDate || 'none'})`);
        });
      }
    }

    return NextResponse.json({ success: true, notifications });
  } catch (error: any) {
    console.error('Get follow-up notifications error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

