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
    let notificationsQuery = supabase
      .from('notifications')
      .select('id, user_id, notification_type, title, message, contact_id, account_id, sub_account_id, is_seen, is_completed, is_snoozed, snooze_until, created_at, metadata')
      .eq('notification_type', 'followup_due')
      .eq('is_completed', false)
      .eq('is_seen', false) // Only show unseen notifications
      .ilike('user_id', username) // Case-insensitive matching for user_id
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

    // Show all active notifications (already filtered by user_id if not admin)
    const filteredNotifications = activeNotifications;

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

    // PERFORMANCE OPTIMIZATION: Reduce console logging in production
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Fetched ${contactsData.length} contacts`);
    }

    // Filter out contacts with 'Connected' call status (temporarily disabled to show all notifications)
    // TODO: Re-enable this filter if needed
    const validContacts = contactsData; // .filter((c: any) => c.call_status !== 'Connected');
    
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

    // Format the response to match expected structure
    const notifications = filteredNotifications
      .map((notif: any) => {
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
        
        // If notification has lead_id, use lead data
        if (leadId && !isNaN(leadId)) {
          const lead = leadMap.get(leadId);
          
          if (lead && validLeadIds.has(leadId)) {
            // Lead found in database - use full lead data
            const subAccount = lead.sub_account_id ? subAccountMap.get(lead.sub_account_id) : null;
            const accountName = lead.account_id ? accountMap.get(lead.account_id) : null;
            const subAccountName = subAccount?.sub_account_name || null;

            return {
              id: lead.id, // Use lead ID for compatibility
              notificationId: notif.id,
              subAccountId: lead.sub_account_id || notif.sub_account_id,
              sub_account_id: lead.sub_account_id || notif.sub_account_id,
              name: lead.lead_name,
              designation: null,
              email: lead.email || null,
              phone: lead.phone || null,
              callStatus: null,
              notes: null,
              followUpDate: lead.follow_up_date,
              accountName: accountName || null,
              subAccountName: subAccountName || null,
              isSeen: notif.is_seen || false,
              isCompleted: notif.is_completed || false,
              created_at: formatTimestampIST(notif.created_at),
              isLead: true, // Flag to indicate this is a lead notification
            };
          } else {
            // Lead not found in database, but still show notification with metadata
            if (process.env.NODE_ENV !== 'production') {
              console.warn(`⚠️ Lead ${leadId} from notification metadata not found in database, using metadata`);
            }
            const subAccount = metadataObj?.sub_account_id ? subAccountMap.get(metadataObj.sub_account_id) : null;
            const accountName = metadataObj?.account_id ? accountMap.get(metadataObj.account_id) : null;
            const subAccountName = subAccount?.sub_account_name || null;
            
            return {
              id: leadId,
              notificationId: notif.id,
              subAccountId: metadataObj?.sub_account_id || null,
              sub_account_id: metadataObj?.sub_account_id || null,
              name: metadataObj?.lead_name || notif.title?.replace('Follow-Up: ', '') || 'Unknown Lead',
              designation: null,
              email: null,
              phone: null,
              callStatus: null,
              notes: null,
              followUpDate: metadataObj?.follow_up_date || null,
              accountName: accountName || null,
              subAccountName: subAccountName || null,
              isSeen: notif.is_seen || false,
              isCompleted: notif.is_completed || false,
              created_at: formatTimestampIST(notif.created_at),
              isLead: true,
            };
          }
        }
        
        // Also check if notification message mentions a lead (fallback)
        if (!leadId && notif.message && notif.message.includes('Lead:')) {
          // Try to extract lead name from message and find matching lead
          const leadNameMatch = notif.message.match(/Lead: ([^,]+)/);
          if (leadNameMatch) {
            const leadName = leadNameMatch[1].trim();
            const matchingLead = leadsData.find((l: any) => l.lead_name === leadName);
            if (matchingLead && validLeadIds.has(matchingLead.id)) {
              const lead = matchingLead;
              const subAccount = lead.sub_account_id ? subAccountMap.get(lead.sub_account_id) : null;
              const accountName = lead.account_id ? accountMap.get(lead.account_id) : null;
              const subAccountName = subAccount?.sub_account_name || null;
              
              return {
                id: lead.id,
                notificationId: notif.id,
                subAccountId: lead.sub_account_id || notif.sub_account_id,
                sub_account_id: lead.sub_account_id || notif.sub_account_id,
                name: lead.lead_name,
                designation: null,
                email: lead.email || null,
                phone: lead.phone || null,
                callStatus: null,
                notes: null,
                followUpDate: lead.follow_up_date,
                accountName: accountName || null,
                subAccountName: subAccountName || null,
                isSeen: notif.is_seen || false,
                isCompleted: notif.is_completed || false,
                created_at: formatTimestampIST(notif.created_at),
                isLead: true,
              };
            }
          }
        }
        
        // If notification has contact_id and contact exists, use contact data
        if (notif.contact_id && validContactIds.has(notif.contact_id)) {
          const contact = contactMap.get(notif.contact_id);
          if (!contact) {
            if (process.env.NODE_ENV !== 'production') {
              console.warn(`Contact ${notif.contact_id} not found in contactMap`);
            }
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

    // PERFORMANCE OPTIMIZATION: Reduce console logging in production
    if (process.env.NODE_ENV !== 'production') {
      console.log(`✅ Returning ${notifications.length} formatted notifications for user: ${username}`);
      if (notifications.length > 0) {
        console.log(`   - Leads: ${notifications.filter((n: any) => n.isLead).length}`);
        console.log(`   - Contacts: ${notifications.filter((n: any) => !n.isLead).length}`);
        notifications.forEach((n: any, idx: number) => {
          console.log(`   [${idx + 1}] ${n.isLead ? 'LEAD' : 'CONTACT'}: ${n.name} (ID: ${n.id}, NotifID: ${n.notificationId})`);
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

