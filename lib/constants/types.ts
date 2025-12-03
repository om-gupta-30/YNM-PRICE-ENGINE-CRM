// TypeScript type definitions for Supabase database entities
// All tables now use SERIAL integer primary keys (not UUIDs)

export interface PlaceOfSupply {
  id: number;
  name: string;
  created_at: string;
}

export interface Customer {
  id: number;
  name: string;
  created_at: string;
}

export interface Purpose {
  id: number;
  name: string;
  created_at: string;
}

export interface Quote {
  id: number;
  section: string;
  place_of_supply?: string | null; // Deprecated, use state_name and city_name instead
  state_id?: number | null;
  city_id?: number | null;
  state_name?: string | null;
  city_name?: string | null;
  customer_name: string;
  sub_account_name?: string | null; // Sub-account name for employee quotations
  sub_account_id?: number | null; // Link to sub_accounts table
  purpose: string | null;
  date: string;
  // MBCB fields
  quantity_rm?: number | null;
  total_weight_per_rm?: number | null;
  total_cost_per_rm?: number | null;
  // Signages/Paint fields
  quantity?: number | null;
  area_sq_ft?: number | null;
  cost_per_piece?: number | null;
  // Common fields
  final_total_cost: number | null;
  raw_payload: Record<string, any> | null;
  created_by: string | null;
  is_saved: boolean;
  status?: string | null; // Quotation status: 'draft', 'sent', 'negotiation', 'on_hold', 'closed_won', 'closed_lost'
  comments?: string | null; // Comments/notes for this quotation
  customer_id?: number | null; // Link to customers table
  account_id?: number | null; // Link to accounts table
  status_history?: any[] | null; // Status change history
  comments_history?: any[] | null; // Comments history
  created_at: string;
  updated_at?: string | null;
}

export interface Customer {
  id: number;
  name: string;
  company_name?: string | null;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  location?: string | null;
  address?: string | null;
  gst_number?: string | null;
  category?: 'Contractor' | 'Government' | 'Trader' | 'Other' | null;
  related_products?: string[] | null;
  notes?: string | null;
  sales_employee?: string | null;
  city?: string | null;
  is_active?: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface Lead {
  id: number;
  lead_name: string;
  company_name?: string | null;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  location?: string | null;
  address?: string | null;
  requirements?: string | null;
  lead_source?: string | null;
  status: 'New' | 'In Progress' | 'Quotation Sent' | 'Follow-up' | 'Closed' | 'Lost';
  assigned_employee?: string | null; // Alias for assigned_to
  assigned_to: string;
  account_id?: number | null;
  sub_account_id?: number | null;
  contact_id?: number | null;
  priority?: 'High Priority' | 'Medium Priority' | 'Low Priority' | null;
  follow_up_date?: string | null;
  notes?: string | null;
  created_by: string;
  created_at: string;
  updated_at?: string | null;
}

export interface TaskStatusHistory {
  old_status: string;
  new_status: string;
  changed_by: string;
  changed_at: string;
  note?: string | null;
}

export interface Task {
  id: number;
  title: string;
  customer_id?: number | null;
  customer_name?: string | null;
  account_id?: number | null;
  sub_account_id?: number | null;
  contact_id?: number | null;
  task_type: 'Follow-up' | 'Meeting' | 'Call';
  due_date: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
  description?: string | null;
  assigned_employee?: string | null; // Alias for assigned_to
  assigned_to: string;
  created_by: string;
  created_at: string;
  updated_at?: string | null;
  completed_at?: string | null;
  status_history?: TaskStatusHistory[] | null;
}

export type CompanyStage = 
  | 'Enterprise'
  | 'SMB'
  | 'Pan India'
  | 'APAC'
  | 'Middle East & Africa'
  | 'Europe'
  | 'North America'
  | 'LATAM_SouthAmerica';

export type CompanyTag = 
  | 'New'
  | 'Prospect'
  | 'Customer'
  | 'Onboard'
  | 'Lapsed'
  | 'Needs Attention'
  | 'Retention'
  | 'Renewal'
  | 'Upselling';

export interface Account {
  id: number;
  account_name: string;
  company_stage: CompanyStage;
  company_tag: CompanyTag;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  gst_number?: string | null;
  related_products?: string[] | null;
  assigned_employee: string;
  notes?: string | null;
  is_active?: boolean;
  engagement_score?: number | null;
  industries?: Array<{ industry_id: number; industry_name: string; sub_industry_id: number; sub_industry_name: string }> | null;
  industry_projects?: Record<string, number> | null; // JSONB: {"industry_id-sub_industry_id": number_of_projects}
  created_at: string;
  updated_at?: string | null;
  last_activity_at?: string | null;
}

export type CallStatus = 
  | 'Connected'
  | 'DNP'
  | 'ATCBL'
  | 'Unable to connect'
  | 'Number doesn\'t exist'
  | 'Wrong number';

export interface Contact {
  id: number;
  account_id: number;
  sub_account_id?: number | null;
  name: string;
  designation?: string | null;
  email?: string | null;
  phone?: string | null;
  call_status?: CallStatus | null;
  notes?: string | null;
  follow_up_date?: string | null;
  created_by: string;
  created_at: string;
  updated_at?: string | null;
}

export type ActivityType = 
  | 'call'
  | 'note'
  | 'followup'
  | 'quotation'
  | 'email'
  | 'task'
  | 'meeting'
  | 'login'
  | 'logout'
  | 'away'
  | 'inactive'
  | 'edit'
  | 'create'
  | 'delete'
  | 'quotation_saved';

export interface Activity {
  id: number;
  account_id?: number | null;
  sub_account_id?: number | null;
  contact_id?: number | null;
  employee_id: string;
  activity_type: ActivityType;
  description: string;
  metadata?: Record<string, any> | null;
  account_name?: string | null;
  contact_name?: string | null;
  timestamp?: string | null; // Alias for created_at
  created_at: string;
  logout_reason?: {
    reason_tag: string;
    reason_text: string;
    created_at: string | null;
  } | null;
  login_time?: string | null;
  logout_time?: string | null;
}

export type NotificationType = 
  | 'followup_due'
  | 'callback_scheduled'
  | 'task_due'
  | 'quotation_update';

export interface Notification {
  id: number;
  user_id: string;
  notification_type: NotificationType;
  title: string;
  message: string;
  account_id?: number | null;
  sub_account_id?: number | null;
  contact_id?: number | null;
  task_id?: number | null;
  quotation_id?: number | null;
  is_seen: boolean;
  is_completed: boolean;
  is_snoozed: boolean;
  snooze_until?: string | null;
  created_at: string;
}

// State and City interfaces
export interface State {
  id: number;
  state_name: string;
  created_at: string;
}

export interface City {
  id: number;
  city_name: string;
  state_id: number;
  created_at: string;
}

// SubAccount interface
export interface SubAccount {
  id: number;
  account_id: number;
  sub_account_name: string;
  engagement_score?: number | null;
  is_active?: boolean;
  created_at: string;
  updated_at?: string | null;
  state_id?: number | null;
  city_id?: number | null;
  address?: string | null;
  pincode?: string | null;
  is_headquarter?: boolean | null;
  office_type?: 'Headquarter' | 'Zonal Office' | 'Regional Office' | 'Site Office' | null;
}

// Activity Log interface
export interface ActivityLog {
  id: number;
  user_id: string;
  event_type: string;
  metadata?: Record<string, any> | null;
  created_at: string;
}

// Engagement AI State interface
export interface EngagementAIState {
  account_id: number;
  last_run: string;
}

// Engagement Suggestion interface
export interface EngagementSuggestion {
  id: number;
  account_id: number;
  generated_by: string;
  suggestion_text: string;
  suggested_score_change?: number | null;
  data_snapshot?: Record<string, any> | null;
  created_at: string;
}

// Logout Reason interface
export interface LogoutReason {
  id: number;
  user_id: string;
  reason_tag?: string | null;
  reason_text?: string | null;
  created_at: string;
}

