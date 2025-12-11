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
        
        // Normalize to lowercase for consistent storage and matching
        const normalizedAssignedEmployee = assignedEmployee ? assignedEmployee.toLowerCase() : null;
        
        console.log(`🔔 [LEAD] Notification check - Assigned employee: "${assignedEmployee}" (normalized: "${normalizedAssignedEmployee}"), Lead: ${leadData.lead_name}, Lead ID: ${leadId}`);
        
        if (assignedEmployee && normalizedAssignedEmployee) {
          // Check if assigned employee is admin - admins should not receive notifications
          const isAssignedEmployeeAdmin = normalizedAssignedEmployee === 'admin';
          
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
            // Use case-insensitive matching for user_id
            const { data: existingNotifications, error: existingError } = await supabase
              .from('notifications')
              .select('id, metadata, account_id, message, user_id')
              .ilike('user_id', normalizedAssignedEmployee) // Case-insensitive match
              .eq('notification_type', 'followup_due')
              .eq('is_completed', false);
            
            if (existingError) {
              console.warn(`⚠️ [LEAD] Error fetching existing notifications:`, existingError);
            }
            
            console.log(`🔔 [LEAD] Found ${existingNotifications?.length || 0} existing notifications for user "${normalizedAssignedEmployee}"`);
            
            // Filter in memory to find matching notifications by metadata.lead_id
            const matchingNotifications = (existingNotifications || []).filter((notif: any) => {
              // Parse metadata if it's a string
              let metadata = notif.metadata;
              if (typeof metadata === 'string') {
                try {
                  metadata = JSON.parse(metadata);
                } catch (e) {
                  console.warn(`⚠️ [LEAD] Failed to parse metadata for notification ${notif.id}:`, e);
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
              
              if (matchesLeadId || matchesAccountAndName) {
                console.log(`🔔 [LEAD] Found matching notification ${notif.id} (lead_id match: ${matchesLeadId}, account/name match: ${matchesAccountAndName})`);
              }
              
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
            
            // Ensure metadata is stored as JSON string for consistency
            const metadataObj = {
              lead_id: leadId, // Store as number in metadata
              lead_name: leadData.lead_name,
              follow_up_date: follow_up_date,
            };
            
            const baseNotificationData: any = {
              user_id: normalizedAssignedEmployee, // Use normalized (lowercase) username for consistent matching
              notification_type: 'followup_due',
              title: `Follow-Up: ${leadData.lead_name}`,
              message: message,
              account_id: leadData.account_id || null,
              sub_account_id: leadData.sub_account_id || null,
              is_seen: false,
              is_completed: false,
              metadata: JSON.stringify(metadataObj), // Store as JSON string for consistency
            };
            
            console.log(`🔔 [LEAD] Creating notification with data:`, JSON.stringify(baseNotificationData, null, 2));
            
            // Force create notification - lead_id column doesn't exist, use metadata only
            // Try inserting with metadata (which includes lead_id)
            const { error: insertError } = await supabase
              .from('notifications')
              .insert(baseNotificationData);
            
            if (!insertError) {
              notificationCreated = true;
              console.log(`✅ [LEAD] SUCCESS! Created follow-up notification for user_id="${normalizedAssignedEmployee}": ${message}`);
              console.log(`   Notification data:`, JSON.stringify(baseNotificationData, null, 2));
            } else {
              notificationError = insertError;
              console.error('❌ [LEAD] Error creating notification:', insertError);
              console.error('❌ [LEAD] Error details:', JSON.stringify(insertError, null, 2));
              
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
              console.error('   Assigned employee:', assignedEmployee, '(normalized:', normalizedAssignedEmployee, ')');
              console.error('   Lead ID:', leadId);
              console.error('   Lead name:', leadData.lead_name);
              console.error('   Error:', notificationError);
              console.error('   Notification data:', JSON.stringify(baseNotificationData, null, 2));
              
              // Last resort: Try with minimal data
              try {
                const minimalData = {
                  user_id: normalizedAssignedEmployee, // Use normalized username
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
                
                console.log(`🔄 [LEAD] Attempting minimal notification creation:`, JSON.stringify(minimalData, null, 2));
                
                const { error: minimalError, data: minimalDataResult } = await supabase
                  .from('notifications')
                  .insert(minimalData)
                  .select();
                
                if (!minimalError) {
                  console.log(`✅ [LEAD] Created notification with minimal data for ${normalizedAssignedEmployee}`);
                  console.log(`   Created notification ID:`, minimalDataResult?.[0]?.id);
                  notificationCreated = true;
                } else {
                  console.error('❌ [LEAD] Even minimal notification failed:', minimalError);
                  console.error('   Minimal error details:', JSON.stringify(minimalError, null, 2));
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

    // Get lead data to find assigned employee for notification cleanup
    const { data: leadData } = await supabase
      .from('leads')
      .select('assigned_employee')
      .eq('id', leadId)
      .single();

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
      console.error('❌ [LEAD DELETE] Error removing follow-up date:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Delete any existing notifications for this lead
    if (leadData?.assigned_employee) {
      const normalizedEmployee = leadData.assigned_employee.toLowerCase();
      
      try {
        // Find notifications by metadata.lead_id
        const { data: existingNotifications } = await supabase
          .from('notifications')
          .select('id, metadata')
          .ilike('user_id', normalizedEmployee)
          .eq('notification_type', 'followup_due')
          .eq('is_completed', false);
        
        if (existingNotifications && existingNotifications.length > 0) {
          const matchingNotifications = existingNotifications.filter((notif: any) => {
            let metadata = notif.metadata;
            if (typeof metadata === 'string') {
              try {
                metadata = JSON.parse(metadata);
              } catch (e) {
                return false;
              }
            }
            const notifLeadId = metadata?.lead_id;
            return notifLeadId && (notifLeadId === leadId || parseInt(notifLeadId) === leadId);
          });
          
          if (matchingNotifications.length > 0) {
            const idsToDelete = matchingNotifications.map((n: any) => n.id);
            console.log(`🗑️ [LEAD DELETE] Deleting ${idsToDelete.length} notifications for lead ${leadId}`);
            await supabase
              .from('notifications')
              .delete()
              .in('id', idsToDelete);
          }
        }
      } catch (notificationError) {
        console.warn('⚠️ [LEAD DELETE] Error cleaning up notifications (non-critical):', notificationError);
      }
    }

    console.log(`✅ [LEAD DELETE] Removed follow-up date for lead ${leadId}`);
    return NextResponse.json({ success: true, lead: data });
  } catch (error: any) {
    console.error('❌ [LEAD DELETE] Remove follow-up error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

