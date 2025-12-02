import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

export interface ActivityLogParams {
  account_id?: number | null;
  contact_id?: number | null;
  employee_id: string;
  activity_type: 'login' | 'logout' | 'away' | 'inactive' | 'note' | 'edit' | 'delete' | 'create' | 'quotation_saved';
  description: string;
  metadata?: Record<string, any>;
}

/**
 * Logs an activity to the database
 */
export async function logActivity(params: ActivityLogParams): Promise<void> {
  try {
    const supabase = createSupabaseServerClient();
    
    await supabase.from('activities').insert({
      account_id: params.account_id || null,
      contact_id: params.contact_id || null,
      employee_id: params.employee_id,
      activity_type: params.activity_type,
      description: params.description,
      metadata: params.metadata || {},
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw - activity logging should not break the main operation
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
    contact_id?: number | null;
    employee_id: string;
    entityName: string;
    entityType: 'account' | 'contact' | 'sub_account' | 'quotation';
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
    contact_id: params.contact_id,
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
  contact_id?: number | null;
  employee_id: string;
  entityName: string;
  entityType: 'account' | 'contact' | 'sub_account' | 'quotation';
  deletedData?: Record<string, any>;
}): Promise<void> {
  await logActivity({
    account_id: params.account_id,
    contact_id: params.contact_id,
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
  contact_id?: number | null;
  employee_id: string;
  entityName: string;
  entityType: 'account' | 'contact' | 'sub_account' | 'quotation';
  createdData?: Record<string, any>;
}): Promise<void> {
  await logActivity({
    account_id: params.account_id,
    contact_id: params.contact_id,
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
