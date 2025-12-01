import { Activity } from './types';

export const sampleActivities: Activity[] = [
  {
    id: 1,
    activity_type: 'call',
    description: 'Call with Raj from ABC Infra. Talked about payment terms.',
    account_name: 'ABC Corp',
    subaccount_name: 'ABC Infra Project',
    contact_name: 'Raj Gupta',
    metadata: {
      call_status: 'Connected',
    },
    created_by: 'Employee1',
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    activity_type: 'note',
    description: 'Internal note: Customer liked the new pricing grid.',
    account_name: 'Zenith Industries',
    created_by: 'Employee2',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 3,
    activity_type: 'followup',
    description: 'Reminder to send revised proposal tomorrow morning.',
    account_name: 'Horizon Builders',
    metadata: {
      followup_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
    created_by: 'Employee1',
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
];
