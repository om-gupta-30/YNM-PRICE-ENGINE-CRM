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
    
    const notificationData = {
      user_id: assignedEmployee,
      notification_type: 'followup_due',
      title: `Follow up with ${contactName}`,
      message: message,
      contact_id: contactId,
      account_id: accountId || null,
      is_seen: false,
      is_completed: false,
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
        console.error('Error updating notification:', updateError);
        return { success: false, error: updateError.message };
      }
    } else {
      // Create new notification
      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notificationData);
      
      if (insertError) {
        console.error('Error creating notification:', insertError);
        return { success: false, error: insertError.message };
      }
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('Error syncing notification:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

