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
    
    // CRITICAL: Only delete notification if there's NO follow-up date
    // Call status doesn't matter - if there's a follow-up date, show the notification
    if (!followUpDate) {
      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('contact_id', contactId) // CRITICAL: Only delete for this specific contact
        .eq('notification_type', 'followup_due');
      
      if (deleteError) {
        console.error('❌ [CONTACT] Error deleting notification:', deleteError);
        return { success: false, error: deleteError.message };
      }
      console.log(`✅ [CONTACT] Deleted notification for contact ${contactId} (no follow-up date)`);
      return { success: true };
    }
    
    // If we have a follow-up date, create/update notification regardless of call status
    console.log(`🔔 [CONTACT] Processing notification for contact ${contactId} with follow-up date (call status: ${callStatus || 'none'} - doesn't matter)`);
    
    // Get sub-account to find assigned employee
    let assignedEmployee = 'Admin';
    let accountName = '';
    let subAccountName = '';
    
    console.log(`🔔 [CONTACT] Syncing notification for contact ${contactId} (${contactName})`);
    console.log(`   Follow-up date: ${followUpDate}, Call status: ${callStatus}`);
    console.log(`   Sub-account ID: ${subAccountId}, Account ID: ${accountId}`);
    
    if (subAccountId) {
      const { data: subAccount, error: subAccountError } = await supabase
        .from('sub_accounts')
        .select('sub_account_name, account_id, accounts:account_id(account_name, assigned_employee)')
        .eq('id', subAccountId)
        .single();
      
      if (subAccountError) {
        console.error(`❌ [CONTACT] Error fetching sub-account ${subAccountId}:`, subAccountError);
      }
      
      if (subAccount) {
        subAccountName = subAccount.sub_account_name || '';
        accountName = (subAccount.accounts as any)?.account_name || '';
        assignedEmployee = (subAccount.accounts as any)?.assigned_employee || 'Admin';
        console.log(`🔔 [CONTACT] Found sub-account "${subAccountName}", assigned employee: "${assignedEmployee}"`);
      }
    } else if (accountId) {
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .select('account_name, assigned_employee')
        .eq('id', accountId)
        .single();
      
      if (accountError) {
        console.error(`❌ [CONTACT] Error fetching account ${accountId}:`, accountError);
      }
      
      if (account) {
        accountName = account.account_name || '';
        assignedEmployee = account.assigned_employee || 'Admin';
        console.log(`🔔 [CONTACT] Found account "${accountName}", assigned employee: "${assignedEmployee}"`);
      }
    }
    
    // Normalize assigned employee to lowercase for consistent storage
    const normalizedAssignedEmployee = assignedEmployee.toLowerCase();
    
    // Format notification message
    const locationInfo = accountName 
      ? (subAccountName ? `${accountName} - ${subAccountName}` : accountName)
      : '';
    const message = `Follow up with ${contactName}${locationInfo ? ` from ${locationInfo}` : ''}`;
    
    // Check if notification already exists for this contact and user
    // CRITICAL: Use case-insensitive matching for user_id and ensure we're checking for THIS specific contact
    const { data: existingNotifications, error: fetchError } = await supabase
      .from('notifications')
      .select('id, user_id, contact_id')
      .eq('contact_id', contactId) // CRITICAL: Only check for THIS specific contact
      .eq('notification_type', 'followup_due')
      .ilike('user_id', normalizedAssignedEmployee); // Case-insensitive match
    
    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ [CONTACT] Error fetching existing notification:', fetchError);
      return { success: false, error: fetchError.message };
    }
    
    const existingNotification = existingNotifications && existingNotifications.length > 0 
      ? existingNotifications[0] 
      : null;
    
    console.log(`🔔 [CONTACT] Found ${existingNotifications?.length || 0} existing notifications for contact ${contactId} (user: ${normalizedAssignedEmployee})`);
    if (existingNotifications && existingNotifications.length > 0) {
      console.log(`   Existing notification IDs: ${existingNotifications.map((n: any) => n.id).join(', ')}`);
    }
    
    // Check if assigned employee is admin - admins should not receive notifications
    const isAssignedEmployeeAdmin = normalizedAssignedEmployee === 'admin';
    
    if (isAssignedEmployeeAdmin) {
      console.log(`⚠️ [CONTACT] Skipping notification for admin user: ${assignedEmployee} (normalized: ${normalizedAssignedEmployee})`);
      return { success: true }; // Don't create notifications for admins
    }
    
    // Ensure metadata is stored as JSON string for consistency
    const metadataObj = {
      contact_name: contactName,
      follow_up_date: followUpDate,
    };
    
    const notificationData: any = {
      user_id: normalizedAssignedEmployee, // Use normalized (lowercase) username for consistent matching
      notification_type: 'followup_due',
      title: `Follow up with ${contactName}`,
      message: message,
      contact_id: contactId,
      account_id: accountId || null,
      sub_account_id: subAccountId || null,
      is_seen: false,
      is_completed: false,
      metadata: JSON.stringify(metadataObj), // Store as JSON string for consistency
    };
    
    console.log(`🔔 [CONTACT] Notification data:`, JSON.stringify(notificationData, null, 2));
    
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
      
      // CRITICAL: Try inserting notification - ensure each contact gets its own notification
      console.log(`🔔 [CONTACT] Attempting to create notification for contact ${contactId}...`);
      const { data: newNotification, error: insertError } = await supabase
        .from('notifications')
        .insert(notificationData)
        .select()
        .single();
      
      if (!insertError && newNotification) {
        notificationCreated = true;
        createdNotificationId = newNotification.id;
        console.log(`✅ [CONTACT] SUCCESS: Created follow-up notification for contact ${contactId}`);
        console.log(`   Contact: ${contactName}`);
        console.log(`   User: ${normalizedAssignedEmployee} (original: ${assignedEmployee})`);
        console.log(`   Notification ID: ${createdNotificationId}`);
        console.log(`   Message: ${message}`);
      } else {
        lastError = insertError;
        console.error(`❌ [CONTACT] ERROR: Failed to create notification for contact ${contactId}`);
        console.error(`   Contact: ${contactName}`);
        console.error(`   User: ${normalizedAssignedEmployee} (original: ${assignedEmployee})`);
        console.error('   Error:', insertError);
        console.error('   Error details:', JSON.stringify(insertError, null, 2));
        
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
            console.log(`✅ [CONTACT] Created follow-up notification (without sub_account_id) for ${normalizedAssignedEmployee} (original: ${assignedEmployee}): ${message}`);
            console.log(`   Notification ID: ${createdNotificationId}`);
          } else {
            console.error('❌ [CONTACT] Retry also failed:', retryError);
            console.error('   Retry error details:', JSON.stringify(retryError, null, 2));
            lastError = retryError;
          }
        }
      }
      
      if (!notificationCreated) {
        console.error('❌ [CONTACT] CRITICAL: Failed to create notification after all attempts');
        console.error('   Contact ID:', contactId);
        console.error('   Contact name:', contactName);
        console.error('   Assigned employee:', assignedEmployee, '(normalized:', normalizedAssignedEmployee, ')');
        console.error('   Follow-up date:', followUpDate);
        console.error('   Last error:', lastError);
        console.error('   Notification data attempted:', JSON.stringify(notificationData, null, 2));
        
        // CRITICAL: Don't fail silently - log this as a critical error
        // But still return success so the contact creation doesn't fail
        // The notification can be created manually later if needed
        console.error('⚠️ [CONTACT] WARNING: Contact was created but notification was not. This needs manual investigation.');
        return { success: true, error: lastError?.message || 'Failed to create notification (non-critical)' };
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

