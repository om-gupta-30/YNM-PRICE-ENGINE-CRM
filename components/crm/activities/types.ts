export type ActivityType =
  | 'call'
  | 'note'
  | 'followup'
  | 'task'
  | 'email'
  | 'meeting'
  | 'quotation'
  | 'login'
  | 'logout';

export interface Activity {
  id: number;
  account_id?: number | null;
  activity_type: ActivityType;
  description: string;
  account_name?: string | null;
  contact_name?: string | null;
  employee_id: string;
  metadata?: Record<string, any> | null;
  created_at: string;
}
