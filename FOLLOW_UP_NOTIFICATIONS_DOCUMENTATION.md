# Follow-Up Notifications Documentation

This document contains all code related to follow-up notifications for both **Contacts** and **Leads** in the CRM system.

---

## Table of Contents

1. [API Routes](#api-routes)
   - [Get Follow-Up Notifications](#get-follow-up-notifications)
   - [Set/Update Lead Follow-Up](#setupdate-lead-follow-up)
   - [Remove Lead Follow-Up](#remove-lead-follow-up)
2. [Utility Functions](#utility-functions)
   - [Contact Notification Sync](#contact-notification-sync)
3. [React Hooks](#react-hooks)
   - [useFollowUpNotifications Hook](#usefollowupnotifications-hook)
4. [React Components](#react-components)
   - [NotificationBell Component](#notificationbell-component)
   - [SetFollowUpModal Component](#setfollowupmodal-component)

---

## API Routes

### Get Follow-Up Notifications

**File:** `app/api/notifications/follow-ups/route.ts`

**Endpoint:** `GET /api/notifications/follow-ups?username={username}`

**Description:** Fetches all follow-up notifications for both contacts and leads for a specific user.

```typescript
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
    
    console.log(`🔔 [FETCH] Username: "${username}", Is admin: ${isAdmin}`);

    // Admin should not see notifications
    if (isAdmin) {
      console.log(`🔔 [FETCH] Admin user - returning empty notifications`);
      return NextResponse.json({ success: true, notifications: [] });
    }

    // Fetch notifications from notifications table
    // Only show notifications for the logged-in employee
    // Only show unseen notifications (is_seen = false)
    // Select all columns except lead_id (which doesn't exist in the table)
    // We'll get lead_id from metadata instead
    let notificationsQuery = supabase
      .from('notifications')
      .select('id, user_id, notification_type, title, message, contact_id, account_id, sub_account_id, is_seen, is_completed, is_snoozed, snooze_until, created_at, metadata')
      .eq('notification_type', 'followup_due')
      .eq('is_completed', false)
      .eq('is_seen', false) // Only show unseen notifications
      .eq('user_id', username) // Only show notifications for this specific employee
      .order('created_at', { ascending: false });
    
    console.log(`Fetching notifications for user: ${username}, isAdmin: ${isAdmin}`);

    // Execute the query
    const { data: notificationsData, error: notificationsError } = await notificationsQuery;

    if (notificationsError) {
      console.error('❌ Error fetching notifications:', notificationsError);
      // Don't fail completely - return empty array so UI doesn't break
      console.log('⚠️ Returning empty notifications array due to fetch error');
      return NextResponse.json({ success: true, notifications: [] });
    }

    console.log(`✅ Found ${notificationsData?.length || 0} notifications before filtering for user: ${username}`);
    
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

    // Get contact IDs and lead IDs to fetch details (only from metadata since lead_id column doesn't exist)
    const contactIds = filteredNotifications.map((notif: any) => notif.contact_id).filter(Boolean);
    
    // Extract lead IDs from metadata (handle both object and string)
    const leadIds: number[] = [];
    filteredNotifications.forEach((notif: any) => {
      let metadata = notif.metadata;
      if (typeof metadata === 'string') {
        try {
          metadata = JSON.parse(metadata);
        } catch (e) {
          metadata = {};
        }
      }
      if (metadata?.lead_id) {
        const leadId = typeof metadata.lead_id === 'number' 
          ? metadata.lead_id 
          : parseInt(metadata.lead_id);
        if (!isNaN(leadId)) {
          leadIds.push(leadId);
        }
      }
    });
    const uniqueLeadIds = [...new Set(leadIds)];
    
    console.log(`📊 Found ${contactIds.length} unique contact IDs and ${uniqueLeadIds.length} unique lead IDs (from metadata)`);
    console.log(`   Lead IDs: ${uniqueLeadIds.join(', ')}`);

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

    console.log(`Fetched ${leadsData.length} leads`);

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
    
    console.log(`Mapped ${leadsData.length} leads, validLeadIds: ${Array.from(validLeadIds).join(', ')}`);

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
          } catch (e) {
            console.warn('⚠️ Failed to parse metadata string:', e);
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
            console.warn(`⚠️ Lead ${leadId} from notification metadata not found in database, using metadata`);
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

    console.log(`✅ Returning ${notifications.length} formatted notifications for user: ${username}`);
    if (notifications.length > 0) {
      console.log(`   - Leads: ${notifications.filter((n: any) => n.isLead).length}`);
      console.log(`   - Contacts: ${notifications.filter((n: any) => !n.isLead).length}`);
      notifications.forEach((n: any, idx: number) => {
        console.log(`   [${idx + 1}] ${n.isLead ? 'LEAD' : 'CONTACT'}: ${n.name} (ID: ${n.id}, NotifID: ${n.notificationId})`);
      });
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
```

**Key Features:**
- Fetches notifications for both contacts and leads
- Filters by user_id (employee username)
- Only shows unseen notifications (`is_seen = false`)
- Filters out snoozed notifications
- Admin users don't receive notifications
- Handles lead IDs from metadata (since `lead_id` column doesn't exist in notifications table)
- Enriches notifications with contact/lead details, account names, and sub-account names

---

### Set/Update Lead Follow-Up

**File:** `app/api/crm/leads/[id]/follow-up/route.ts`

**Endpoint:** `POST /api/crm/leads/[id]/follow-up`

**Description:** Sets or updates a follow-up date for a lead and creates a notification for the assigned employee.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { getCurrentISTTime } from '@/lib/utils/dateFormatters';
import { logActivity } from '@/lib/utils/activityLogger';

// POST - Set/Update follow-up date for a lead
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const leadId = parseInt(params.id);
    const body = await request.json();
    const { follow_up_date, created_by } = body;

    if (isNaN(leadId)) {
      return NextResponse.json(
        { error: 'Invalid lead ID' },
        { status: 400 }
      );
    }

    if (!follow_up_date) {
      return NextResponse.json(
        { error: 'Follow-up date is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Get lead data for activity logging and notification
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .select('id, lead_name, account_id, sub_account_id, assigned_employee, follow_up_date')
      .eq('id', leadId)
      .single();

    if (leadError) {
      console.error('Error fetching lead:', leadError);
      return NextResponse.json({ error: leadError.message }, { status: 500 });
    }

    // Update lead with follow-up date
    const { data: updatedLead, error: updateError } = await supabase
      .from('leads')
      .update({
        follow_up_date: follow_up_date,
        updated_at: getCurrentISTTime(),
      })
      .eq('id', leadId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating lead follow-up date:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log to main activities table
    if (created_by && leadData) {
      try {
        await logActivity({
          account_id: leadData.account_id || null,
          lead_id: leadId,
          employee_id: created_by,
          activity_type: 'followup',
          description: `Follow-up scheduled for lead "${leadData.lead_name}" on ${new Date(follow_up_date).toLocaleDateString('en-IN')}`,
          metadata: {
            entity_type: 'lead',
            lead_id: leadId,
            lead_name: leadData.lead_name,
            follow_up_date: follow_up_date,
          },
        });
      } catch (activityError) {
        console.warn('Failed to log follow-up activity:', activityError);
        // Don't fail the request if activity logging fails
      }
    }

    // Also create activity record in lead_activities table (for lead-specific views)
    if (created_by) {
      try {
        await supabase.from('lead_activities').insert({
          lead_id: leadId,
          employee_id: created_by,
          activity_type: 'follow_up_set',
          description: `Follow-up scheduled for ${new Date(follow_up_date).toLocaleDateString('en-IN')}`,
          metadata: { follow_up_date },
        });
      } catch (activityError) {
        console.error('Error creating lead activity (non-critical):', activityError);
        // Don't fail the request if activity creation fails
      }
    }

    // Create notification for the assigned employee (not for admins)
    // Notifications should go to the assigned employee, regardless of who set the follow-up
    if (leadData) {
      try {
        // Use assigned_employee from leadData (from initial query) or updatedLead
        const assignedEmployee = leadData.assigned_employee || updatedLead.assigned_employee;
        
        console.log(`🔔 [LEAD] Notification check - Assigned employee: ${assignedEmployee}, Lead: ${leadData.lead_name}`);
        
        if (assignedEmployee) {
          // Check if assigned employee is admin - admins should not receive notifications
          const isAssignedEmployeeAdmin = assignedEmployee.toLowerCase() === 'admin';
          
          console.log(`🔔 [LEAD] Is admin? ${isAssignedEmployeeAdmin}`);
          
          if (!isAssignedEmployeeAdmin) {
            // Format the notification message
            const formattedDate = new Date(follow_up_date).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            });
            const message = `New Follow-Up Added for Lead: ${leadData.lead_name} on ${formattedDate}`;
            
            // Delete any existing notification for this lead to avoid duplicates
            // Check metadata for lead_id since column doesn't exist
            const { data: existingNotifications } = await supabase
              .from('notifications')
              .select('id, metadata, account_id, message')
              .eq('user_id', assignedEmployee)
              .eq('notification_type', 'followup_due')
              .eq('is_completed', false);
            
            // Filter in memory to find matching notifications by metadata.lead_id
            const matchingNotifications = (existingNotifications || []).filter((notif: any) => {
              // Parse metadata if it's a string
              let metadata = notif.metadata;
              if (typeof metadata === 'string') {
                try {
                  metadata = JSON.parse(metadata);
                } catch (e) {
                  metadata = {};
                }
              }
              
              // Check if metadata has matching lead_id
              const notifLeadId = metadata?.lead_id;
              const matchesLeadId = notifLeadId && (
                notifLeadId === leadId || 
                parseInt(notifLeadId) === leadId
              );
              
              // Also check by account_id and message as fallback
              const matchesAccountAndName = notif.account_id === leadData.account_id && 
                                          notif.message?.includes(leadData.lead_name);
              
              return matchesLeadId || matchesAccountAndName;
            });
            
            // Delete matching notifications
            if (matchingNotifications.length > 0) {
              const idsToDelete = matchingNotifications.map((n: any) => n.id);
              console.log(`🗑️ [LEAD] Deleting ${idsToDelete.length} existing notifications for lead ${leadId}`);
              await supabase
                .from('notifications')
                .delete()
                .in('id', idsToDelete);
            }
            
            // Create new notification in notifications table
            // First, try with lead_id as a column
            let notificationError = null;
            let notificationCreated = false;
            
            const baseNotificationData: any = {
              user_id: assignedEmployee,
              notification_type: 'followup_due',
              title: `Follow-Up: ${leadData.lead_name}`,
              message: message,
              account_id: leadData.account_id || null,
              sub_account_id: leadData.sub_account_id || null,
              is_seen: false,
              is_completed: false,
              metadata: {
                lead_id: leadId, // Store as number in metadata
                lead_name: leadData.lead_name,
                follow_up_date: follow_up_date,
              }
            };
            
            // Force create notification - lead_id column doesn't exist, use metadata only
            // Try inserting with metadata (which includes lead_id)
            const { error: insertError } = await supabase
              .from('notifications')
              .insert(baseNotificationData);
            
            if (!insertError) {
              notificationCreated = true;
              console.log(`✅ [LEAD] SUCCESS! Created follow-up notification for user_id="${assignedEmployee}": ${message}`);
              console.log(`   Notification data:`, JSON.stringify(baseNotificationData, null, 2));
            } else {
              notificationError = insertError;
              console.error('❌ [LEAD] Error creating notification:', insertError);
              
              // Try without sub_account_id if that's causing issues
              if (insertError.message?.includes('sub_account_id')) {
                const notificationWithoutSubAccount = { ...baseNotificationData };
                delete notificationWithoutSubAccount.sub_account_id;
                
                const { error: retryError } = await supabase
                  .from('notifications')
                  .insert(notificationWithoutSubAccount);
                
                if (!retryError) {
                  notificationCreated = true;
                  console.log(`✅ [LEAD] Created follow-up notification (without sub_account_id) for ${assignedEmployee}: ${message}`);
                } else {
                  console.error('❌ [LEAD] Retry also failed:', retryError);
                  notificationError = retryError;
                }
              }
            }
            
            if (!notificationCreated) {
              console.error('❌ [LEAD] CRITICAL: Failed to create follow-up notification');
              console.error('Assigned employee:', assignedEmployee);
              console.error('Lead ID:', leadId);
              console.error('Lead name:', leadData.lead_name);
              console.error('Error:', notificationError);
              console.error('Notification data:', JSON.stringify(baseNotificationData, null, 2));
              
              // Last resort: Try with minimal data
              try {
                const minimalData = {
                  user_id: assignedEmployee,
                  notification_type: 'followup_due',
                  title: `Follow-Up: ${leadData.lead_name}`,
                  message: message,
                  account_id: leadData.account_id || null,
                  is_seen: false,
                  is_completed: false,
                  metadata: JSON.stringify({
                    lead_id: leadId,
                    lead_name: leadData.lead_name,
                    follow_up_date: follow_up_date,
                  })
                };
                
                const { error: minimalError } = await supabase
                  .from('notifications')
                  .insert(minimalData);
                
                if (!minimalError) {
                  console.log(`✅ [LEAD] Created notification with stringified metadata for ${assignedEmployee}`);
                } else {
                  console.error('❌ [LEAD] Even minimal notification failed:', minimalError);
                }
              } catch (e) {
                console.error('❌ [LEAD] Exception in minimal notification attempt:', e);
              }
            }
          }
        }
      } catch (notificationError) {
        console.error('Error creating follow-up notification (non-critical):', notificationError);
        // Don't fail the request if notification creation fails
      }
    }

    return NextResponse.json({ success: true, lead: updatedLead });
  } catch (error: any) {
    console.error('Set follow-up error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Key Features:**
- Updates the lead's `follow_up_date` field
- Creates activity logs in both `activities` and `lead_activities` tables
- Creates notification for the assigned employee (not admin)
- Deletes existing notifications for the same lead to avoid duplicates
- Stores lead_id in metadata (since `lead_id` column doesn't exist in notifications table)
- Handles errors gracefully with fallback attempts

---

### Remove Lead Follow-Up

**File:** `app/api/crm/leads/[id]/follow-up/route.ts`

**Endpoint:** `DELETE /api/crm/leads/[id]/follow-up`

**Description:** Removes the follow-up date from a lead.

```typescript
// DELETE - Remove follow-up date
export async function DELETE(
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

    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase
      .from('leads')
      .update({
        follow_up_date: null,
        updated_at: getCurrentISTTime(),
      })
      .eq('id', leadId)
      .select()
      .single();

    if (error) {
      console.error('Error removing follow-up date:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, lead: data });
  } catch (error: any) {
    console.error('Remove follow-up error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Key Features:**
- Sets `follow_up_date` to `null` for the lead
- Updates `updated_at` timestamp

---

## Utility Functions

### Contact Notification Sync

**File:** `lib/utils/notificationSync.ts`

**Description:** Utility function to sync notifications for contacts based on follow-up date and call status. This function is typically called when a contact's follow-up date or call status is updated.

```typescript
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

/**
 * Syncs notification for a contact based on follow-up date and call status
 * Creates, updates, or deletes notification as needed
 * Creates notifications for the assigned employee of the sub-account (or Admin if none)
 */
export async function syncContactNotification(
  contactId: number,
  contactName: string,
  followUpDate: string | null | undefined,
  callStatus: string | null | undefined,
  subAccountId: number | null | undefined,
  accountId: number | null | undefined,
  userId: string = 'Admin'
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createSupabaseServerClient();
    
    // If call status is "Connected" or no follow-up date, delete any existing notifications
    if (callStatus === 'Connected' || !followUpDate) {
      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('contact_id', contactId)
        .eq('notification_type', 'followup_due');
      
      if (deleteError) {
        console.error('Error deleting notification:', deleteError);
        return { success: false, error: deleteError.message };
      }
      return { success: true };
    }
    
    // Get sub-account to find assigned employee
    let assignedEmployee = 'Admin';
    let accountName = '';
    let subAccountName = '';
    
    if (subAccountId) {
      const { data: subAccount } = await supabase
        .from('sub_accounts')
        .select('sub_account_name, account_id, accounts:account_id(account_name, assigned_employee)')
        .eq('id', subAccountId)
        .single();
      
      if (subAccount) {
        subAccountName = subAccount.sub_account_name || '';
        accountName = (subAccount.accounts as any)?.account_name || '';
        assignedEmployee = (subAccount.accounts as any)?.assigned_employee || 'Admin';
      }
    } else if (accountId) {
      const { data: account } = await supabase
        .from('accounts')
        .select('account_name, assigned_employee')
        .eq('id', accountId)
        .single();
      
      if (account) {
        accountName = account.account_name || '';
        assignedEmployee = account.assigned_employee || 'Admin';
      }
    }
    
    // Format notification message
    const locationInfo = accountName 
      ? (subAccountName ? `${accountName} - ${subAccountName}` : accountName)
      : '';
    const message = `Follow up with ${contactName}${locationInfo ? ` from ${locationInfo}` : ''}`;
    
    // Check if notification already exists for this contact and user
    const { data: existingNotification, error: fetchError } = await supabase
      .from('notifications')
      .select('id, user_id')
      .eq('contact_id', contactId)
      .eq('notification_type', 'followup_due')
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching existing notification:', fetchError);
      return { success: false, error: fetchError.message };
    }
    
    // Check if assigned employee is admin - admins should not receive notifications
    const isAssignedEmployeeAdmin = assignedEmployee.toLowerCase() === 'admin';
    
    if (isAssignedEmployeeAdmin) {
      console.log(`⚠️ [CONTACT] Skipping notification for admin user: ${assignedEmployee}`);
      return { success: true }; // Don't create notifications for admins
    }
    
    const notificationData: any = {
      user_id: assignedEmployee,
      notification_type: 'followup_due',
      title: `Follow up with ${contactName}`,
      message: message,
      contact_id: contactId,
      account_id: accountId || null,
      sub_account_id: subAccountId || null,
      is_seen: false,
      is_completed: false,
      metadata: {
        contact_name: contactName,
        follow_up_date: followUpDate,
      }
    };
    
    if (existingNotification) {
      // Update existing notification (update user_id in case assignment changed)
      const { error: updateError } = await supabase
        .from('notifications')
        .update({
          ...notificationData,
          // Reset seen/completed status if follow-up date changes
          is_seen: false,
          is_completed: false,
        })
        .eq('id', existingNotification.id);
      
      if (updateError) {
        console.error('❌ [CONTACT] Error updating notification:', updateError);
        return { success: false, error: updateError.message };
      }
      console.log(`✅ [CONTACT] Updated follow-up notification for ${assignedEmployee}: ${message}`);
    } else {
      // Create new notification - try multiple approaches
      let notificationCreated = false;
      let lastError = null;
      let createdNotificationId = null;
      
      // Try inserting notification
      const { data: newNotification, error: insertError } = await supabase
        .from('notifications')
        .insert(notificationData)
        .select()
        .single();
      
      if (!insertError && newNotification) {
        notificationCreated = true;
        createdNotificationId = newNotification.id;
        console.log(`✅ [CONTACT] Created follow-up notification for ${assignedEmployee}: ${message}`);
      } else {
        lastError = insertError;
        console.error('❌ [CONTACT] Error creating notification:', insertError);
        
        // Try without sub_account_id if that's the issue
        if (insertError?.message?.includes('sub_account_id')) {
          const notificationWithoutSubAccount = { ...notificationData };
          delete notificationWithoutSubAccount.sub_account_id;
          
          const { data: retryNotification, error: retryError } = await supabase
            .from('notifications')
            .insert(notificationWithoutSubAccount)
            .select()
            .single();
          
          if (!retryError && retryNotification) {
            notificationCreated = true;
            createdNotificationId = retryNotification.id;
            console.log(`✅ [CONTACT] Created follow-up notification (without sub_account_id) for ${assignedEmployee}: ${message}`);
          } else {
            console.error('❌ [CONTACT] Retry also failed:', retryError);
            lastError = retryError;
          }
        }
      }
      
      if (!notificationCreated) {
        return { success: false, error: lastError?.message || 'Failed to create notification' };
      }

      // Log activity for notification creation
      if (createdNotificationId) {
        try {
          await supabase.from('activities').insert({
            account_id: accountId || null,
            contact_id: contactId,
            employee_id: userId,
            activity_type: 'followup',
            description: `Follow-up notification created: ${message}`,
            metadata: {
              notification_id: createdNotificationId,
              notification_type: 'followup_due',
              contact_name: contactName,
              follow_up_date: followUpDate,
              action: 'notification_created',
            },
          });
        } catch (activityError) {
          console.warn('⚠️ [CONTACT] Failed to log notification creation activity:', activityError);
        }
      }
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('Error syncing notification:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}
```

**Key Features:**
- Deletes notifications if call status is "Connected" or follow-up date is removed
- Finds assigned employee from sub-account or account
- Creates or updates notification based on whether one already exists
- Admin users don't receive notifications
- Logs activity when notification is created
- Handles errors gracefully with fallback attempts

**Usage Example:**
```typescript
// When updating a contact's follow-up date
await syncContactNotification(
  contactId,
  contactName,
  followUpDate,
  callStatus,
  subAccountId,
  accountId,
  userId
);
```

---

## React Hooks

### useFollowUpNotifications Hook

**File:** `hooks/useFollowUpNotifications.ts`

**Description:** Custom React hook that fetches and manages follow-up notifications for the current user.

```typescript
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';

interface Contact {
  id: number;
  subAccountId?: number;
  sub_account_id?: number;
  name: string;
  accountName?: string | null;
  subAccountName?: string | null;
  followUpDate?: Date | null;
  callStatus?: string | null;
  isDueToday?: boolean;
  isLead?: boolean;
  isSeen?: boolean;
  notificationId?: number;
}

const isSameDay = (dateA: Date, dateB: Date) => {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
};

export function useFollowUpNotifications() {
  const [notifications, setNotifications] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const username = typeof window !== 'undefined' ? localStorage.getItem('username') || 'Admin' : 'Admin';
        
        const response = await fetch(`/api/notifications/follow-ups?username=${encodeURIComponent(username)}`);
        const data = await response.json();
        
        console.log('Notifications API response:', { success: data.success, count: data.notifications?.length || 0, username });
        
        if (data.success && data.notifications) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          // Convert followUpDate strings to Date objects
          const formattedNotifications: Contact[] = data.notifications
            .filter((item: any) => !item.isSeen) // Only show unseen notifications
            .map((item: any) => {
              const rawFollowUp =
                item.followUpDate ||
                item.follow_up_date ||
                item.followUp ||
                item.follow_up;
              const followUpDate = rawFollowUp ? new Date(rawFollowUp) : null;
              const isDueToday = followUpDate ? isSameDay(followUpDate, today) : false;

              return {
                ...item,
                id: item.id,
                subAccountId: item.subAccountId || item.sub_account_id,
                name: item.name,
                accountName: item.accountName,
                subAccountName: item.subAccountName,
                followUpDate,
                callStatus: item.callStatus || item.call_status,
                isDueToday,
                isLead: item.isLead || false,
                isSeen: item.isSeen || false,
                notificationId: item.notificationId,
              };
            });
          
          // Sort notifications: Today's items first, then by date (ascending - soonest first)
          formattedNotifications.sort((a: Contact, b: Contact) => {
            const aDate = a.followUpDate;
            const bDate = b.followUpDate;
            
            if (!aDate && !bDate) return 0;
            if (!aDate) return 1; // Put items without dates at the end
            if (!bDate) return -1;
            
            // Today's items first
            if (a.isDueToday && !b.isDueToday) return -1;
            if (!a.isDueToday && b.isDueToday) return 1;
            
            // If both are today or both are not today, sort by date (ascending - soonest first)
            return aDate.getTime() - bDate.getTime();
          });
          
          console.log('Formatted notifications:', formattedNotifications);
          setNotifications(formattedNotifications);
        } else {
          console.warn('No notifications found or API error:', data);
          setNotifications([]);
        }
      } catch (error) {
        console.error('Error fetching follow-up notifications:', error);
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    
    // Listen for manual refresh events
    const handleRefresh = () => {
      fetchNotifications();
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('refreshNotifications', handleRefresh);
    }
    
    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('refreshNotifications', handleRefresh);
      }
    };
  }, [refreshTrigger]);

  const refresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const count = useMemo(() => notifications.length, [notifications]);

  return {
    notifications,
    count,
    loading,
    refresh,
  };
}
```

**Key Features:**
- Fetches notifications from API on mount
- Auto-refreshes every 5 minutes
- Listens for `refreshNotifications` custom event for manual refresh
- Filters out seen notifications
- Calculates `isDueToday` flag for each notification
- Sorts notifications: today's items first, then by date (ascending)
- Returns `notifications`, `count`, `loading`, and `refresh` function

**Usage Example:**
```typescript
const { notifications, count, loading, refresh } = useFollowUpNotifications();
```

---

## React Components

### NotificationBell Component

**File:** `components/crm/NotificationBell.tsx`

**Description:** Component that displays a bell icon with notification count and a dropdown panel showing all follow-up notifications.

```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFollowUpNotifications } from '@/hooks/useFollowUpNotifications';
import AINotificationsPanel from '@/components/crm/AINotificationsPanel';

export default function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [showAINotifications, setShowAINotifications] = useState(false);
  const [username, setUsername] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { notifications, count, loading, refresh } = useFollowUpNotifications();

  // Get username from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUsername(localStorage.getItem('username') || '');
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = async (item: any, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('Notification clicked:', item);
    
    if (!item) {
      console.error('Item is null or undefined');
      return;
    }
    
    const notificationId = item.notificationId;
    
    // Mark notification as seen in database
    if (notificationId) {
      try {
        await fetch(`/api/notifications/${notificationId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_seen: true }),
        });
      } catch (error) {
        console.error('Error marking notification as seen:', error);
        // Continue even if marking as seen fails
      }
    }
    
    // Check if this is a lead notification
    if (item.isLead) {
      // Navigate to leads page with lead ID in query params
      router.push(`/crm/leads?leadId=${item.id}`);
      setIsOpen(false);
      // Trigger a custom event to open the lead details modal
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('openLeadDetails', { detail: { leadId: item.id } }));
        }, 100);
      }
    } else {
      // It's a contact notification
      const subAccountId = item.subAccountId || item.sub_account_id;
      const contactId = item.id;
      
      if (subAccountId) {
        console.log('Navigating to sub-account contacts:', subAccountId, 'with contact:', contactId);
        router.push(`/crm/subaccounts/${subAccountId}/contacts?contact=${contactId}`);
        setIsOpen(false);
      } else {
        console.error('No subAccountId found for contact:', item);
        alert('Unable to navigate: Contact is not associated with a sub-account.');
      }
    }
  };

  const handleMarkAsSeen = async (item: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const notificationId = item.notificationId;
    
    if (notificationId) {
      try {
        const response = await fetch(`/api/notifications/${notificationId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_seen: true }),
        });
        
        if (response.ok) {
          // Trigger refresh to update notifications list
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('refreshNotifications'));
          }
          // Also call refresh function directly
          if (refresh) {
            refresh();
          }
        } else {
          throw new Error('Failed to mark as seen');
        }
      } catch (error) {
        console.error('Error marking notification as seen:', error);
        alert('Failed to mark notification as seen');
      }
    }
  };

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const isToday = (date: Date | null | undefined) => {
    if (!date) return false;
    const d = date instanceof Date ? date : new Date(date);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  };

  const getCallStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'Connected':
        return 'bg-green-500/20 text-green-300';
      case 'DNP':
        return 'bg-yellow-500/20 text-yellow-300';
      case 'ATCBL':
        return 'bg-blue-500/20 text-blue-300';
      case 'Unable to connect':
      case 'Number doesn\'t exist':
      case 'Wrong number':
        return 'bg-red-500/20 text-red-300';
      default:
        return 'bg-slate-500/20 text-slate-300';
    }
  };

  return (
    <div className="relative flex items-center gap-2" ref={dropdownRef}>
      {/* Follow-Up Notifications Bell */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setShowAINotifications(false);
        }}
        className="relative flex items-center justify-center w-10 h-10 rounded-full bg-brand-gold/10 hover:bg-brand-gold/20 border border-brand-gold/30 transition-all duration-200 hover:border-brand-gold/50 hover:shadow-lg hover:shadow-brand-gold/30 group"
        aria-label="Follow-Up Notifications"
      >
        <svg
          className="w-5 h-5 text-brand-gold group-hover:text-brand-gold transition-colors"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        
        {/* Notification Badge */}
        {count > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold text-white bg-red-500 border-2 border-[#1d0f0a80] shadow-lg">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {/* AI Notifications Bell */}
      {username && (
        <button
          onClick={() => {
            setShowAINotifications(!showAINotifications);
            setIsOpen(false);
          }}
          className="relative flex items-center justify-center w-10 h-10 rounded-full bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 transition-all duration-200 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/30 group"
          aria-label="AI Notifications"
        >
          <svg
            className="w-5 h-5 text-purple-400 group-hover:text-purple-300 transition-colors"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        </button>
      )}

      {/* AI Notifications Panel */}
      {username && (
        <AINotificationsPanel
          employee={username}
          isOpen={showAINotifications}
          onClose={() => setShowAINotifications(false)}
        />
      )}

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-80 md:w-96 max-h-[500px] overflow-hidden rounded-2xl border-2 border-premium-gold shadow-2xl z-50 animate-fade-up" style={{ backgroundColor: '#1d0f0a', opacity: '1', background: '#1d0f0a', backdropFilter: 'none', WebkitBackdropFilter: 'none' }}>
          {/* Dropdown Header */}
          <div className="p-4 border-b border-white/30" style={{ backgroundColor: '#2a1a15', opacity: '1', background: '#2a1a15' }}>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>🔔</span>
              <span>Follow-Up Notifications</span>
              {count > 0 && (
                <span className="ml-auto px-2 py-1 rounded-full text-xs font-bold text-premium-gold" style={{ backgroundColor: 'rgba(212, 166, 90, 0.3)' }}>
                  {count}
                </span>
              )}
            </h3>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto max-h-[400px]" style={{ backgroundColor: '#1d0f0a', opacity: '1', background: '#1d0f0a', backdropFilter: 'none', WebkitBackdropFilter: 'none' }}>
            {loading ? (
              <div className="p-8 text-center">
                <p className="text-slate-300 text-sm animate-pulse">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-slate-300 text-sm">No pending follow-ups.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {notifications.map((item) => {
                  const dueToday = item.isDueToday ?? isToday(item.followUpDate);
                  const isSeen = item.isSeen || false;
                  return (
                    <div
                      key={`${item.id}-${item.notificationId}`}
                      className={`p-4 transition-all duration-300 group relative overflow-hidden ${
                        dueToday
                          ? 'border-l-4 border-red-500' 
                          : 'border-l-4 border-transparent'
                      } ${isSeen ? 'opacity-60' : ''} hover:border-l-4 hover:border-premium-gold hover:bg-gradient-to-r hover:from-premium-gold/20 hover:to-transparent hover:shadow-lg hover:shadow-premium-gold/30 hover:scale-[1.02] hover:pl-5 active:scale-[0.98] active:bg-premium-gold/30`}
                      style={{
                        backgroundColor: dueToday ? '#3a1f1a' : '#1d0f0a',
                        opacity: isSeen ? 0.6 : 1
                      }}
                    >
                      {/* Glow effect on hover */}
                      <div className="absolute inset-0 bg-premium-gold/0 group-hover:bg-premium-gold/5 transition-all duration-300 pointer-events-none"></div>
                      <div className="flex items-start gap-3 relative z-10">
                        <div 
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={(e) => handleNotificationClick(item, e)}
                        >
                          <p className="text-white font-semibold text-sm mb-1 truncate group-hover:text-premium-gold transition-colors duration-200">
                            Follow up with <span className="text-premium-gold group-hover:text-white transition-colors duration-200">{item.name}</span>
                            {item.isLead && (
                              <span className="ml-2 px-1.5 py-0.5 rounded text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                Lead
                              </span>
                            )}
                          </p>
                          {item.accountName && (
                            <p className="text-slate-300 text-xs mb-2 truncate group-hover:text-slate-200 transition-colors duration-200">
                              from <span className="text-premium-gold group-hover:text-white transition-colors duration-200">{item.accountName}</span>
                              {item.subAccountName && (
                                <span className="text-slate-400 group-hover:text-slate-300 transition-colors duration-200"> - {item.subAccountName}</span>
                              )}
                            </p>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-slate-400 text-xs flex items-center gap-1 group-hover:text-slate-200 transition-colors duration-200">
                              <span className="group-hover:scale-125 transition-transform duration-200">📅</span>
                              <span className={dueToday ? 'text-red-400 font-bold group-hover:text-red-300' : ''}>
                                {dueToday ? 'Due Today' : formatDate(item.followUpDate)}
                              </span>
                            </span>
                            {item.callStatus && (
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getCallStatusColor(item.callStatus)} group-hover:scale-105 transition-transform duration-200`}>
                                {item.callStatus}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Mark as Seen Button */}
                          {!isSeen && (
                            <button
                              onClick={(e) => handleMarkAsSeen(item, e)}
                              className="px-2 py-1 text-xs font-semibold text-white bg-green-500/80 hover:bg-green-500 rounded transition-all duration-200 opacity-0 group-hover:opacity-100"
                              title="Mark as Seen"
                            >
                              ✓
                            </button>
                          )}
                          {/* Arrow indicator on hover */}
                          <div className="text-premium-gold opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-200">
                            →
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Key Features:**
- Displays bell icon with notification count badge
- Shows dropdown panel with list of notifications
- Highlights notifications due today with red border
- Shows "Lead" badge for lead notifications
- Clicking notification navigates to contact/lead page
- Mark as seen functionality
- Auto-refreshes when notifications change
- Handles both contact and lead notifications

---

### SetFollowUpModal Component

**File:** `components/crm/SetFollowUpModal.tsx`

**Description:** Modal component for setting or updating follow-up dates for leads.

```typescript
'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { bringElementIntoView } from '@/lib/utils/bringElementIntoView';

interface SetFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: number;
  leadName: string;
  currentFollowUpDate: string | null;
  onFollowUpSet: () => void;
}

export default function SetFollowUpModal({ isOpen, onClose, leadId, leadName, currentFollowUpDate, onFollowUpSet }: SetFollowUpModalProps) {
  const [followUpDate, setFollowUpDate] = useState(currentFollowUpDate || '');
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Bring modal into view when it opens
  useEffect(() => {
    if (isOpen && modalRef.current) {
      bringElementIntoView(modalRef.current);
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!followUpDate) {
      alert('Please select a follow-up date');
      return;
    }

    try {
      setSubmitting(true);
      const username = typeof window !== 'undefined' ? localStorage.getItem('username') || 'Admin' : 'Admin';

      const response = await fetch(`/api/crm/leads/${leadId}/follow-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          follow_up_date: followUpDate,
          created_by: username,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to set follow-up');
      }

      // Trigger notification refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('refreshNotifications'));
      }

      onFollowUpSet();
      onClose();
    } catch (error: any) {
      console.error('Error setting follow-up:', error);
      alert(error.message || 'Failed to set follow-up');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm('Are you sure you want to remove the follow-up date?')) {
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/crm/leads/${leadId}/follow-up`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to remove follow-up');
      }

      setFollowUpDate('');
      onFollowUpSet();
      onClose();
    } catch (error: any) {
      console.error('Error removing follow-up:', error);
      alert(error.message || 'Failed to remove follow-up');
    } finally {
      setSubmitting(false);
    }
  };

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  const modalContent = (
    <div 
      className="fixed inset-0 z-[10002] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-up"
      onClick={onClose}
    >
      <div 
        ref={modalRef}
        className="glassmorphic-premium rounded-3xl p-6 max-w-md w-full border-2 border-premium-gold/30 shadow-2xl"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-extrabold text-white">Set Follow-Up</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl font-bold transition-colors"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Lead: <span className="text-premium-gold">{leadName}</span>
            </label>
            <input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              min={today}
              className="w-full px-4 py-3 text-white bg-slate-700/50 hover:bg-slate-600/50 border border-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-premium-gold"
              required
            />
            {currentFollowUpDate && (
              <p className="text-xs text-slate-400 mt-2">
                Current follow-up: {new Date(currentFollowUpDate).toLocaleDateString('en-IN')}
              </p>
            )}
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 text-sm font-semibold text-white bg-slate-600/80 hover:bg-slate-700 rounded-lg transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-premium-gold to-dark-gold hover:from-dark-gold hover:to-premium-gold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving...' : currentFollowUpDate ? 'Update Follow-Up' : 'Set Follow-Up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
```

**Key Features:**
- Modal for setting/updating follow-up dates
- Date input with minimum date validation (today)
- Shows current follow-up date if exists
- Remove follow-up functionality
- Triggers notification refresh after setting follow-up
- Uses portal for proper z-index handling

---

## Summary

The follow-up notification system supports both **Contacts** and **Leads**:

### For Contacts:
- Notifications are synced using `syncContactNotification()` utility function
- Called when contact's follow-up date or call status changes
- Notifications are deleted if call status is "Connected" or follow-up date is removed
- Assigned employee receives notification (not admin)

### For Leads:
- Notifications are created via `POST /api/crm/leads/[id]/follow-up` endpoint
- Lead ID is stored in notification metadata (since `lead_id` column doesn't exist)
- Assigned employee receives notification (not admin)
- Follow-up can be removed via `DELETE /api/crm/leads/[id]/follow-up`

### Common Features:
- Both use the same `notifications` table with `notification_type = 'followup_due'`
- Both filter by `user_id` (employee username)
- Admin users don't receive notifications
- Notifications are fetched via `GET /api/notifications/follow-ups`
- UI displays both types in the same notification bell component
- Notifications are marked with `isLead: true` flag for leads

---

## Database Schema

The notifications table structure:
- `id` - Primary key
- `user_id` - Employee username who should receive the notification
- `notification_type` - Always `'followup_due'` for follow-up notifications
- `title` - Notification title
- `message` - Notification message
- `contact_id` - Contact ID (for contact notifications)
- `account_id` - Account ID
- `sub_account_id` - Sub-account ID
- `is_seen` - Boolean, whether notification has been seen
- `is_completed` - Boolean, whether notification is completed
- `is_snoozed` - Boolean, whether notification is snoozed
- `snooze_until` - Timestamp for snooze expiration
- `metadata` - JSONB field containing additional data (includes `lead_id` for lead notifications)
- `created_at` - Timestamp

**Note:** The `lead_id` column does NOT exist in the notifications table. Lead IDs are stored in the `metadata` JSONB field.
