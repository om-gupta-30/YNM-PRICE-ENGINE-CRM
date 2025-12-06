/**
 * Intent classification examples for training and validation
 * Contains example questions with their expected intent classifications
 */

import { IntentCategory, QueryIntent } from './types/intentTypes';

export interface IntentExample {
  question: string;
  expectedIntent: QueryIntent;
  expectedTables: string[];
  expectedFilters?: Record<string, any>;
}

/**
 * Collection of intent classification examples
 * Used for training, validation, and testing the intent classifier
 */
export const INTENT_EXAMPLES: IntentExample[] = [
  // CONTACT_QUERY examples
  {
    question: 'How many contacts do I have?',
    expectedIntent: {
      category: IntentCategory.CONTACT_QUERY,
      tables: ['contacts'],
      aggregationType: 'count',
    },
    expectedTables: ['contacts'],
    expectedFilters: {},
  },
  {
    question: 'Show me all contacts for account ABC Corp',
    expectedIntent: {
      category: IntentCategory.CONTACT_QUERY,
      tables: ['contacts', 'accounts'],
      filters: { account_name: 'ABC Corp' },
    },
    expectedTables: ['contacts', 'accounts'],
    expectedFilters: { account_name: 'ABC Corp' },
  },
  {
    question: 'Find contacts with email addresses',
    expectedIntent: {
      category: IntentCategory.CONTACT_QUERY,
      tables: ['contacts'],
      filters: { email: { $ne: null } },
    },
    expectedTables: ['contacts'],
    expectedFilters: { email: { $ne: null } },
  },

  // ACCOUNT_QUERY examples
  {
    question: 'Show accounts with engagement score below 50',
    expectedIntent: {
      category: IntentCategory.ACCOUNT_QUERY,
      tables: ['sub_accounts'],
      filters: { engagement_score: { $lt: 50 } },
    },
    expectedTables: ['sub_accounts'],
    expectedFilters: { engagement_score: { $lt: 50 } },
  },
  {
    question: 'List all active accounts in the manufacturing industry',
    expectedIntent: {
      category: IntentCategory.ACCOUNT_QUERY,
      tables: ['accounts'],
      filters: { industry: 'manufacturing', is_active: true },
    },
    expectedTables: ['accounts'],
    expectedFilters: { industry: 'manufacturing', is_active: true },
  },
  {
    question: 'Which accounts have the highest potential value?',
    expectedIntent: {
      category: IntentCategory.ACCOUNT_QUERY,
      tables: ['accounts'],
      aggregationType: 'max',
    },
    expectedTables: ['accounts'],
    expectedFilters: {},
  },

  // ACTIVITY_QUERY examples
  {
    question: "What's my activity count this week?",
    expectedIntent: {
      category: IntentCategory.ACTIVITY_QUERY,
      tables: ['activities'],
      aggregationType: 'count',
      timeRange: {
        start: '2024-01-01', // This would be calculated dynamically
        end: '2024-01-07',
      },
    },
    expectedTables: ['activities'],
    expectedFilters: {},
  },
  {
    question: 'Show all calls I made last month',
    expectedIntent: {
      category: IntentCategory.ACTIVITY_QUERY,
      tables: ['activities'],
      filters: { type: 'call' },
      timeRange: {
        start: '2024-01-01',
        end: '2024-01-31',
      },
    },
    expectedTables: ['activities'],
    expectedFilters: { type: 'call' },
  },
  {
    question: 'What activities are scheduled for next week?',
    expectedIntent: {
      category: IntentCategory.ACTIVITY_QUERY,
      tables: ['activities'],
      timeRange: {
        start: '2024-01-08',
        end: '2024-01-14',
      },
    },
    expectedTables: ['activities'],
    expectedFilters: {},
  },

  // QUOTATION_QUERY examples
  {
    question: 'How many quotations did I send this quarter?',
    expectedIntent: {
      category: IntentCategory.QUOTATION_QUERY,
      tables: ['quotes_mbcb', 'quotes_signages', 'quotes_paint'],
      aggregationType: 'count',
      timeRange: {
        start: '2024-01-01',
        end: '2024-03-31',
      },
    },
    expectedTables: ['quotes_mbcb', 'quotes_signages', 'quotes_paint'],
    expectedFilters: { status: 'sent' },
  },
  {
    question: 'Show me all accepted quotations',
    expectedIntent: {
      category: IntentCategory.QUOTATION_QUERY,
      tables: ['quotes_mbcb', 'quotes_signages', 'quotes_paint'],
      filters: { status: 'accepted' },
    },
    expectedTables: ['quotes_mbcb', 'quotes_signages', 'quotes_paint'],
    expectedFilters: { status: 'accepted' },
  },
  {
    question: 'What quotations have high AI win probability?',
    expectedIntent: {
      category: IntentCategory.QUOTATION_QUERY,
      tables: ['quotes_mbcb', 'quotes_signages', 'quotes_paint'],
      filters: { ai_win_probability: { $gt: 70 } },
    },
    expectedTables: ['quotes_mbcb', 'quotes_signages', 'quotes_paint'],
    expectedFilters: { ai_win_probability: { $gt: 70 } },
  },

  // LEAD_QUERY examples
  {
    question: 'How many new leads came in this month?',
    expectedIntent: {
      category: IntentCategory.LEAD_QUERY,
      tables: ['leads'],
      filters: { status: 'New' },
      aggregationType: 'count',
      timeRange: {
        start: '2024-01-01',
        end: '2024-01-31',
      },
    },
    expectedTables: ['leads'],
    expectedFilters: { status: 'New' },
  },
  {
    question: 'Show leads with score above 80',
    expectedIntent: {
      category: IntentCategory.LEAD_QUERY,
      tables: ['leads'],
      filters: { score: { $gt: 80 } },
    },
    expectedTables: ['leads'],
    expectedFilters: { score: { $gt: 80 } },
  },
  {
    question: 'Which leads are from website referrals?',
    expectedIntent: {
      category: IntentCategory.LEAD_QUERY,
      tables: ['leads'],
      filters: { source: 'website' },
    },
    expectedTables: ['leads'],
    expectedFilters: { source: 'website' },
  },

  // PERFORMANCE_QUERY examples
  {
    question: 'What is my sales performance this quarter?',
    expectedIntent: {
      category: IntentCategory.PERFORMANCE_QUERY,
      tables: ['quotes_mbcb', 'quotes_signages', 'quotes_paint', 'activities'],
      timeRange: {
        start: '2024-01-01',
        end: '2024-03-31',
      },
    },
    expectedTables: ['quotes_mbcb', 'quotes_signages', 'quotes_paint', 'activities'],
    expectedFilters: {},
  },
  {
    question: 'How do I rank among all employees?',
    expectedIntent: {
      category: IntentCategory.PERFORMANCE_QUERY,
      tables: ['activities', 'quotes_mbcb', 'quotes_signages', 'quotes_paint', 'users'],
    },
    expectedTables: ['activities', 'quotes_mbcb', 'quotes_signages', 'quotes_paint', 'users'],
    expectedFilters: {},
  },
  {
    question: 'What is my conversion rate?',
    expectedIntent: {
      category: IntentCategory.PERFORMANCE_QUERY,
      tables: ['leads', 'quotes_mbcb', 'quotes_signages', 'quotes_paint'],
      aggregationType: 'average',
    },
    expectedTables: ['leads', 'quotes_mbcb', 'quotes_signages', 'quotes_paint'],
    expectedFilters: {},
  },

  // AGGREGATION_QUERY examples
  {
    question: 'Average quotation value by product type',
    expectedIntent: {
      category: IntentCategory.AGGREGATION_QUERY,
      tables: ['quotes_mbcb', 'quotes_signages', 'quotes_paint'],
      aggregationType: 'average',
    },
    expectedTables: ['quotes_mbcb', 'quotes_signages', 'quotes_paint'],
    expectedFilters: {},
  },
  {
    question: 'Total revenue from accepted quotations',
    expectedIntent: {
      category: IntentCategory.AGGREGATION_QUERY,
      tables: ['quotes_mbcb', 'quotes_signages', 'quotes_paint'],
      filters: { status: 'accepted' },
      aggregationType: 'sum',
    },
    expectedTables: ['quotes_mbcb', 'quotes_signages', 'quotes_paint'],
    expectedFilters: { status: 'accepted' },
  },
  {
    question: 'Count of activities per employee',
    expectedIntent: {
      category: IntentCategory.AGGREGATION_QUERY,
      tables: ['activities', 'users'],
      aggregationType: 'count',
    },
    expectedTables: ['activities', 'users'],
    expectedFilters: {},
  },

  // COMPARISON_QUERY examples
  {
    question: 'Compare my quotations won vs lost',
    expectedIntent: {
      category: IntentCategory.COMPARISON_QUERY,
      tables: ['quotes_mbcb', 'quotes_signages', 'quotes_paint'],
      filters: { status: { $in: ['accepted', 'rejected'] } },
    },
    expectedTables: ['quotes_mbcb', 'quotes_signages', 'quotes_paint'],
    expectedFilters: { status: { $in: ['accepted', 'rejected'] } },
  },
  {
    question: 'Compare Q1 vs Q2 sales performance',
    expectedIntent: {
      category: IntentCategory.COMPARISON_QUERY,
      tables: ['quotes_mbcb', 'quotes_signages', 'quotes_paint'],
      timeRange: {
        start: '2024-01-01',
        end: '2024-06-30',
      },
    },
    expectedTables: ['quotes_mbcb', 'quotes_signages', 'quotes_paint'],
    expectedFilters: {},
  },
  {
    question: 'Which accounts have higher engagement than last month?',
    expectedIntent: {
      category: IntentCategory.COMPARISON_QUERY,
      tables: ['sub_accounts'],
      timeRange: {
        start: '2024-01-01',
        end: '2024-02-01',
      },
    },
    expectedTables: ['sub_accounts'],
    expectedFilters: {},
  },

  // TREND_QUERY examples
  {
    question: 'What is the trend in lead conversion over the past 6 months?',
    expectedIntent: {
      category: IntentCategory.TREND_QUERY,
      tables: ['leads'],
      timeRange: {
        start: '2023-07-01',
        end: '2024-01-01',
      },
    },
    expectedTables: ['leads'],
    expectedFilters: {},
  },
  {
    question: 'Show me activity trends for the last year',
    expectedIntent: {
      category: IntentCategory.TREND_QUERY,
      tables: ['activities'],
      timeRange: {
        start: '2023-01-01',
        end: '2024-01-01',
      },
    },
    expectedTables: ['activities'],
    expectedFilters: {},
  },
  {
    question: 'How has engagement score changed over time?',
    expectedIntent: {
      category: IntentCategory.TREND_QUERY,
      tables: ['sub_accounts'],
    },
    expectedTables: ['sub_accounts'],
    expectedFilters: {},
  },

  // PREDICTION_QUERY examples
  {
    question: 'Predict which accounts might churn',
    expectedIntent: {
      category: IntentCategory.PREDICTION_QUERY,
      tables: ['sub_accounts', 'activities', 'follow_ups'],
      filters: { engagement_score: { $lt: 50 } },
    },
    expectedTables: ['sub_accounts', 'activities', 'follow_ups'],
    expectedFilters: { engagement_score: { $lt: 50 } },
  },
  {
    question: 'Which quotations are most likely to be accepted?',
    expectedIntent: {
      category: IntentCategory.PREDICTION_QUERY,
      tables: ['quotes_mbcb', 'quotes_signages', 'quotes_paint'],
      filters: { ai_win_probability: { $gt: 70 } },
    },
    expectedTables: ['quotes_mbcb', 'quotes_signages', 'quotes_paint'],
    expectedFilters: { ai_win_probability: { $gt: 70 } },
  },
  {
    question: 'Forecast next quarter sales',
    expectedIntent: {
      category: IntentCategory.PREDICTION_QUERY,
      tables: ['quotes_mbcb', 'quotes_signages', 'quotes_paint', 'activities'],
    },
    expectedTables: ['quotes_mbcb', 'quotes_signages', 'quotes_paint', 'activities'],
    expectedFilters: {},
  },

  // Complex multi-category examples
  {
    question: 'Show me pending follow-ups for accounts with low engagement',
    expectedIntent: {
      category: IntentCategory.ACCOUNT_QUERY,
      tables: ['follow_ups', 'sub_accounts'],
      filters: { status: 'pending', engagement_score: { $lt: 50 } },
    },
    expectedTables: ['follow_ups', 'sub_accounts'],
    expectedFilters: { status: 'pending', engagement_score: { $lt: 50 } },
  },
  {
    question: 'What is the total value of quotations sent to high-value accounts?',
    expectedIntent: {
      category: IntentCategory.AGGREGATION_QUERY,
      tables: ['quotes_mbcb', 'quotes_signages', 'quotes_paint', 'sub_accounts', 'accounts'],
      filters: { status: 'sent', potential_value: { $gt: 100000 } },
      aggregationType: 'sum',
    },
    expectedTables: ['quotes_mbcb', 'quotes_signages', 'quotes_paint', 'sub_accounts', 'accounts'],
    expectedFilters: { status: 'sent', potential_value: { $gt: 100000 } },
  },
];

/**
 * Get examples for a specific intent category
 */
export function getExamplesByCategory(category: IntentCategory): IntentExample[] {
  return INTENT_EXAMPLES.filter(example => example.expectedIntent.category === category);
}

/**
 * Get examples that use specific tables
 */
export function getExamplesByTables(tables: string[]): IntentExample[] {
  const normalizedTables = tables.map(t => t.toLowerCase());
  return INTENT_EXAMPLES.filter(example =>
    example.expectedTables.some(table => normalizedTables.includes(table.toLowerCase()))
  );
}

