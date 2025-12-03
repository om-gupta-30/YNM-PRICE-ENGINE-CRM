import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { triggerAIScoringForActivity } from '@/lib/ai/engagement';

export interface ActivityLogParams {
  account_id?: number | null;
  sub_account_id?: number | null;
  contact_id?: number | null;
  lead_id?: number | null;
  task_id?: number | null;
  employee_id: string;
  activity_type: 'login' | 'logout' | 'away' | 'inactive' | 'note' | 'edit' | 'delete' | 'create' | 'quotation_saved' | 'return_from_inactive' | 'followup';
  description: string;
  metadata?: Record<string, any>;
}

/**
 * Logs an activity to the database
 */
export async function logActivity(params: ActivityLogParams): Promise<void> {
  try {
    const supabase = createSupabaseServerClient();
    
    // Build insert object - include sub_account_id in metadata for portability
    const insertData: Record<string, any> = {
      account_id: params.account_id || null,
      contact_id: params.contact_id || null,
      employee_id: params.employee_id,
      activity_type: params.activity_type,
      description: params.description,
      metadata: {
        ...(params.metadata || {}),
        // Always include sub_account_id in metadata for backwards compatibility
        ...(params.sub_account_id ? { sub_account_id: params.sub_account_id } : {}),
        ...(params.lead_id ? { lead_id: params.lead_id } : {}),
        ...(params.task_id ? { task_id: params.task_id } : {}),
      },
    };
    
    // Try to insert with sub_account_id column if it exists
    const { error: insertError } = await supabase.from('activities').insert(insertData);
    
    // If there's an error about sub_account_id column, it's already in metadata so that's fine
    if (insertError && !insertError.message?.includes('does not exist')) {
      console.error('Failed to log activity:', insertError);
    }

    // Trigger AI scoring after activity is logged
    // Extract sub_account_id from metadata if present, otherwise use account_id
    const subAccountId = params.metadata?.sub_account_id 
      ? (typeof params.metadata.sub_account_id === 'number' 
          ? params.metadata.sub_account_id 
          : parseInt(params.metadata.sub_account_id))
      : null;

    await triggerAIScoringForActivity({
      account_id: params.account_id || null,
      sub_account_id: subAccountId,
    });

    // Update employee streak (only for non-login/logout activities)
    // Skip streak updates for login/logout to avoid inflating streaks
    if (params.activity_type !== 'login' && params.activity_type !== 'logout') {
      await updateEmployeeStreak(params.employee_id);
    }
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw - activity logging should not break the main operation
  }
}

/**
 * Updates employee streak based on activity date
 * - If last_activity_date = today → do nothing
 * - If last_activity_date = yesterday → streak_count + 1
 * - Else → streak_count = 1
 */
async function updateEmployeeStreak(employee: string): Promise<void> {
  try {
    const supabase = createSupabaseServerClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

    // Get yesterday
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Fetch current streak
    const { data: currentStreak, error: fetchError } = await supabase
      .from('employee_streaks')
      .select('streak_count, last_activity_date')
      .eq('employee', employee)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching streak:', fetchError);
      return;
    }

    let newStreakCount = 1;
    let shouldUpdate = true;

    if (currentStreak) {
      const lastDate = currentStreak.last_activity_date 
        ? new Date(currentStreak.last_activity_date).toISOString().split('T')[0]
        : null;

      if (lastDate === todayStr) {
        // Already logged today, do nothing
        shouldUpdate = false;
      } else if (lastDate === yesterdayStr) {
        // Consecutive day - increment streak
        newStreakCount = (currentStreak.streak_count || 0) + 1;
      } else {
        // Gap in streak - reset to 1
        newStreakCount = 1;
      }
    }

    if (shouldUpdate) {
      // Upsert streak record
      const { error: upsertError } = await supabase
        .from('employee_streaks')
        .upsert({
          employee,
          streak_count: newStreakCount,
          last_activity_date: todayStr,
        }, {
          onConflict: 'employee',
        });

      if (upsertError) {
        console.error('Error updating streak:', upsertError);
      }
    }
  } catch (error) {
    console.error('Failed to update employee streak:', error);
    // Don't throw - streak update should not break activity logging
  }
}

/**
 * Detects changes between old and new data and returns only changed fields
 */
export function detectChanges<T extends Record<string, any>>(
  oldData: T | null,
  newData: Partial<T>,
  fieldLabels: Record<keyof T, string>
): string[] {
  if (!oldData) return [];
  
  const changes: string[] = [];
  
  for (const [key, label] of Object.entries(fieldLabels)) {
    const oldValue = oldData[key];
    const newValue = newData[key];
    
    // Skip if field not in update
    if (newValue === undefined) continue;
    
    // Handle different data types
    if (Array.isArray(oldValue) && Array.isArray(newValue)) {
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push(`${label}: ${oldValue.length} → ${newValue.length} items`);
      }
    } else if (typeof oldValue === 'object' && oldValue !== null && typeof newValue === 'object' && newValue !== null) {
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        const oldKeys = Object.keys(oldValue).length;
        const newKeys = Object.keys(newValue).length;
        changes.push(`${label}: ${oldKeys} → ${newKeys} entries`);
      }
    } else {
      // Simple value comparison
      const oldStr = oldValue?.toString().trim() || '';
      const newStr = newValue?.toString().trim() || '';
      
      if (oldStr !== newStr) {
        if (oldStr && newStr) {
          changes.push(`${label}: "${oldStr}" → "${newStr}"`);
        } else if (newStr) {
          changes.push(`${label}: set to "${newStr}"`);
        } else if (oldStr) {
          changes.push(`${label}: removed`);
        }
      }
    }
  }
  
  return changes;
}

/**
 * Logs an edit activity with change detection
 */
export async function logEditActivity<T extends Record<string, any>>(
  params: {
    account_id?: number | null;
    sub_account_id?: number | null;
    contact_id?: number | null;
    lead_id?: number | null;
    task_id?: number | null;
    employee_id: string;
    entityName: string;
    entityType: 'account' | 'contact' | 'sub_account' | 'quotation' | 'lead' | 'task';
    oldData: T | null;
    newData: Partial<T>;
    fieldLabels: Record<keyof T, string>;
  }
): Promise<void> {
  const changes = detectChanges(params.oldData, params.newData, params.fieldLabels);
  
  if (changes.length === 0) {
    // No changes detected, skip logging
    return;
  }
  
  await logActivity({
    account_id: params.account_id,
    sub_account_id: params.sub_account_id,
    contact_id: params.contact_id,
    lead_id: params.lead_id,
    task_id: params.task_id,
    employee_id: params.employee_id,
    activity_type: 'edit',
    description: `${params.entityName} updated: ${changes.join(', ')}`,
    metadata: {
      entity_type: params.entityType,
      changes,
      old_data: params.oldData,
      new_data: params.newData,
    },
  });
}

/**
 * Logs a delete activity
 */
export async function logDeleteActivity(params: {
  account_id?: number | null;
  sub_account_id?: number | null;
  contact_id?: number | null;
  lead_id?: number | null;
  task_id?: number | null;
  employee_id: string;
  entityName: string;
  entityType: 'account' | 'contact' | 'sub_account' | 'quotation' | 'lead' | 'task';
  deletedData?: Record<string, any>;
}): Promise<void> {
  await logActivity({
    account_id: params.account_id,
    sub_account_id: params.sub_account_id,
    contact_id: params.contact_id,
    lead_id: params.lead_id,
    task_id: params.task_id,
    employee_id: params.employee_id,
    activity_type: 'delete',
    description: `${params.entityName} deleted`,
    metadata: {
      entity_type: params.entityType,
      deleted_data: params.deletedData,
    },
  });
}

/**
 * Logs a create activity
 */
export async function logCreateActivity(params: {
  account_id?: number | null;
  sub_account_id?: number | null;
  contact_id?: number | null;
  lead_id?: number | null;
  task_id?: number | null;
  employee_id: string;
  entityName: string;
  entityType: 'account' | 'contact' | 'sub_account' | 'quotation' | 'lead' | 'task';
  createdData?: Record<string, any>;
}): Promise<void> {
  await logActivity({
    account_id: params.account_id,
    sub_account_id: params.sub_account_id,
    contact_id: params.contact_id,
    lead_id: params.lead_id,
    task_id: params.task_id,
    employee_id: params.employee_id,
    activity_type: 'create',
    description: `${params.entityName} created`,
    metadata: {
      entity_type: params.entityType,
      created_data: params.createdData,
    },
  });
}

/**
 * Logs login activity
 */
export async function logLoginActivity(params: {
  employee_id: string;
  loginTime?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  await logActivity({
    employee_id: params.employee_id,
    activity_type: 'login',
    description: `${params.employee_id} logged in`,
    metadata: {
      login_time: params.loginTime,
      ...params.metadata,
    },
  });
}

/**
 * Logs logout activity with reason
 */
export async function logLogoutActivity(params: {
  employee_id: string;
  logoutTime?: string;
  reason?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  const description = params.reason 
    ? `${params.employee_id} logged out: ${params.reason}`
    : `${params.employee_id} logged out`;
    
  await logActivity({
    employee_id: params.employee_id,
    activity_type: 'logout',
    description,
    metadata: {
      logout_time: params.logoutTime,
      reason: params.reason,
      ...params.metadata,
    },
  });
}

/**
 * Logs away/inactive activity with reason
 */
export async function logAwayActivity(params: {
  employee_id: string;
  status: 'away' | 'inactive';
  reason?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  const description = params.reason
    ? `${params.employee_id} marked as ${params.status}: ${params.reason}`
    : `${params.employee_id} marked as ${params.status}`;
    
  await logActivity({
    employee_id: params.employee_id,
    activity_type: params.status,
    description,
    metadata: {
      reason: params.reason,
      ...params.metadata,
    },
  });
}

/**
 * Logs return from inactive activity with reason
 */
export async function logReturnFromInactiveActivity(params: {
  employee_id: string;
  inactiveDuration?: string;
  reason: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  const description = `${params.employee_id} returned from inactive${params.inactiveDuration ? ` (was inactive for ${params.inactiveDuration})` : ''}: ${params.reason}`;
    
  await logActivity({
    employee_id: params.employee_id,
    activity_type: 'return_from_inactive',
    description,
    metadata: {
      inactive_duration: params.inactiveDuration,
      reason: params.reason,
      return_time: new Date().toISOString(),
      ...params.metadata,
    },
  });
}

/**
 * Logs quotation save activity
 */
export async function logQuotationSaveActivity(params: {
  employee_id: string;
  quotationId: number;
  section: string;
  accountName?: string;
  subAccountName?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  const description = `Quotation saved for ${params.section}${params.subAccountName ? ` - ${params.subAccountName}` : ''}${params.accountName ? ` (${params.accountName})` : ''}`;
  
  await logActivity({
    employee_id: params.employee_id,
    activity_type: 'quotation_saved',
    description,
    metadata: {
      quotation_id: params.quotationId,
      section: params.section,
      account_name: params.accountName,
      sub_account_name: params.subAccountName,
      ...params.metadata,
    },
  });
}
