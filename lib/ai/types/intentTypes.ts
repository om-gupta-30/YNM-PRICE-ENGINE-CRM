/**
 * Intent classification types for AI query processing
 */

export enum IntentCategory {
  CONTACT_QUERY = 'CONTACT_QUERY',
  ACCOUNT_QUERY = 'ACCOUNT_QUERY',
  ACTIVITY_QUERY = 'ACTIVITY_QUERY',
  QUOTATION_QUERY = 'QUOTATION_QUERY',
  LEAD_QUERY = 'LEAD_QUERY',
  PERFORMANCE_QUERY = 'PERFORMANCE_QUERY',
  AGGREGATION_QUERY = 'AGGREGATION_QUERY',
  COMPARISON_QUERY = 'COMPARISON_QUERY',
  TREND_QUERY = 'TREND_QUERY',
  PREDICTION_QUERY = 'PREDICTION_QUERY',
}

export interface QueryIntent {
  category: IntentCategory;
  tables: string[];
  filters?: Record<string, any>;
  aggregationType?: string;
  timeRange?: {
    start?: Date | string;
    end?: Date | string;
  };
}

export interface IntentClassificationResult {
  intent: QueryIntent;
  confidence: number;
  explanation: string;
}

