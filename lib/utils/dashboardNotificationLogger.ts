import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { getCurrentISTTime } from '@/lib/utils/dateFormatters';

export type NotificationType = 
  | 'task_added' 
  | 'task_edited' 
  | 'lead_added' 
  | 'lead_edited' 
  | 'account_added' 
  | 'account_edited' 
  | 'account_assigned' 
  | 'sub_account_added' 
  | 'sub_account_edited' 
  | 'contact_added' 
  | 'contact_edited';

interface CreateDashboardNotificationParams {
  type: NotificationType;
  employee: string; // Employee who should see the notification
  message: string;
  entityName?: string; // Name of the task/lead/account/etc
  entityId?: number; // ID of the entity
  priority?: 'low' | 'normal' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

/**
 * Creates a dashboard notification in the employee_notifications table
 * These notifications appear in the dashboard notifications section
 * (separate from follow-up notifications which appear in the notification bell)
 */
export async function createDashboardNotification(params: CreateDashboardNotificationParams): Promise<void> {
  try {
    const supabase = createSupabaseServerClient();
    
    const notificationData = {
      employee: params.employee,
      message: params.message,
      priority: params.priority || 'normal',
      is_read: false,
      created_at: getCurrentISTTime(),
      metadata: {
        type: params.type, // Include type in metadata for filtering
        ...(params.metadata || {}),
      },
    };

    const { error } = await supabase
      .from('employee_notifications')
      .insert(notificationData);

    if (error) {
      console.error('Error creating dashboard notification:', error);
      // Don't throw - notification creation is non-critical
    }
  } catch (error) {
    console.error('Error in createDashboardNotification:', error);
    // Don't throw - notification creation is non-critical
  }
}

/**
 * Helper function to create notifications for multiple employees (e.g., admin sees all)
 */
export async function createDashboardNotificationsForEmployees(
  employees: string[],
  params: Omit<CreateDashboardNotificationParams, 'employee'>
): Promise<void> {
  const promises = employees.map(employee =>
    createDashboardNotification({ ...params, employee })
  );
  await Promise.allSettled(promises);
}

