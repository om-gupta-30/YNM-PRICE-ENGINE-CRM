/**
 * Intent Classification Service
 * 
 * Analyzes natural language questions to determine user intent and required database operations.
 * Uses Gemini AI to classify queries into categories and extract relevant information.
 * 
 * Supported Intent Categories:
 * - CONTACT_QUERY: Questions about contacts
 * - ACCOUNT_QUERY: Questions about accounts
 * - ACTIVITY_QUERY: Questions about activities/tasks
 * - QUOTATION_QUERY: Questions about quotations
 * - LEAD_QUERY: Questions about leads
 * - PERFORMANCE_QUERY: Questions about performance metrics
 * - AGGREGATION_QUERY: Questions requiring counts/sums/averages
 * - COMPARISON_QUERY: Questions comparing entities or time periods
 * - TREND_QUERY: Questions about trends over time
 * - PREDICTION_QUERY: Questions asking for predictions
 * 
 * @module lib/ai/intentClassifier
 * @see {@link IntentCategory} for all supported categories
 * @see {@link QueryIntent} for intent structure
 */

import { runGemini } from '@/utils/ai';
import {
  IntentCategory,
  QueryIntent,
  IntentClassificationResult,
} from './types/intentTypes';

/**
 * Classify user intent from a natural language question
 * 
 * Analyzes the user's question to determine:
 * - Intent category (CONTACT_QUERY, ACCOUNT_QUERY, etc.)
 * - Relevant database tables
 * - Required filters
 * - Aggregation needs
 * - Time range requirements
 * 
 * @param question - The user's natural language question
 *   Example: "How many contacts do I have in Mumbai?"
 * @param userContext - Optional user context for personalization:
 *   - employeeId: Employee ID for filtering
 *   - role: User role (admin, employee, data_analyst)
 *   - permissions: Array of permission strings
 * @returns Promise<IntentClassificationResult> containing:
 *   - intent: QueryIntent with category, tables, filters, etc.
 *   - confidence: Confidence score (0.0 to 1.0)
 *   - explanation: Human-readable explanation of classification
 * 
 * @example
 * ```typescript
 * const result = await classifyIntent(
 *   "Show me my top 5 accounts by engagement",
 *   { employeeId: "emp123", role: "employee" }
 * );
 * console.log(result.intent.category); // "ACCOUNT_QUERY"
 * console.log(result.intent.tables); // ["accounts", "sub_accounts"]
 * console.log(result.confidence); // 0.95
 * ```
 * 
 * @throws {Error} If AI classification fails
 * @throws {Error} If response parsing fails
 * 
 * @see {@link IntentCategory} for all supported categories
 * @see {@link QueryIntent} for intent structure
 */
export async function classifyIntent(
  question: string,
  userContext?: any
): Promise<IntentClassificationResult> {
  const systemPrompt = `You are an intent classification system for a CRM database query engine.

Your task is to analyze user questions and classify them into one of the following intent categories:

1. CONTACT_QUERY - Questions about contacts, their details, contact information, or contact-related data
2. ACCOUNT_QUERY - Questions about accounts, account details, account relationships, or account status
3. ACTIVITY_QUERY - Questions about activities, tasks, meetings, calls, or interactions
4. QUOTATION_QUERY - Questions about quotations, quotes, pricing, or quotation status
5. LEAD_QUERY - Questions about leads, lead status, lead conversion, or lead information
6. PERFORMANCE_QUERY - Questions about performance metrics, KPIs, rankings, or employee performance
7. AGGREGATION_QUERY - Questions requiring counts, sums, averages, or other aggregations
8. COMPARISON_QUERY - Questions comparing entities, metrics, or time periods
9. TREND_QUERY - Questions about trends, changes over time, or historical patterns
10. PREDICTION_QUERY - Questions asking for predictions, forecasts, or future estimates

For each question, you must:
- Identify the primary intent category
- Determine which database tables are relevant (e.g., "contacts", "accounts", "activities", "quotations", "leads")
- Extract any filters needed (e.g., {"status": "active", "assigned_employee": "john"})
- Identify if aggregation is needed (e.g., "count", "sum", "average", "max", "min")
- Determine if a time range is relevant (start/end dates)
- Provide a confidence score (0.0 to 1.0)
- Explain your classification reasoning

CRITICAL: You must respond with valid JSON only. No markdown, no code blocks, no additional text.`;

  const userPrompt = `Analyze this user question and classify the intent:

Question: "${question}"

${userContext ? `User Context: ${JSON.stringify(userContext, null, 2)}` : ''}

Return a JSON object with this exact structure:
{
  "intent": {
    "category": "<one of the 10 intent categories>",
    "tables": ["<table1>", "<table2>", ...],
    "filters": { "<key>": "<value>", ... },
    "aggregationType": "<count|sum|average|max|min|none>",
    "timeRange": {
      "start": "<ISO date string or null>",
      "end": "<ISO date string or null>"
    }
  },
  "confidence": <number between 0.0 and 1.0>,
  "explanation": "<brief explanation of why this classification was chosen>"
}

Examples:
- "Show me all active contacts" → CONTACT_QUERY, tables: ["contacts"], filters: {"is_active": true}
- "How many quotations were created last month?" → QUOTATION_QUERY + AGGREGATION_QUERY, tables: ["quotations"], aggregationType: "count", timeRange: {start: "2024-01-01", end: "2024-01-31"}
- "Compare sales performance between Q1 and Q2" → COMPARISON_QUERY + PERFORMANCE_QUERY, tables: ["quotations", "activities"]
- "What's the trend in lead conversion over the past 6 months?" → TREND_QUERY + LEAD_QUERY, tables: ["leads"], timeRange: {start: "6 months ago", end: "now"}`;

  try {
    const result = await runGemini<IntentClassificationResult>(
      systemPrompt,
      userPrompt,
      userContext
    );

    // Validate and normalize the result
    if (!result || !result.intent) {
      throw new Error('Invalid response from intent classifier');
    }

    // Ensure category is a valid IntentCategory
    const category = Object.values(IntentCategory).includes(result.intent.category as IntentCategory)
      ? result.intent.category as IntentCategory
      : IntentCategory.CONTACT_QUERY; // Default fallback

    // Normalize confidence to 0-1 range
    const confidence = typeof result.confidence === 'number'
      ? Math.max(0, Math.min(1, result.confidence))
      : 0.5;

    // Ensure tables is an array
    const tables = Array.isArray(result.intent.tables) && result.intent.tables.length > 0
      ? result.intent.tables
      : ['contacts']; // Default fallback

    const finalResult = {
      intent: {
        category,
        tables,
        filters: result.intent.filters || {},
        aggregationType: result.intent.aggregationType || undefined,
        timeRange: result.intent.timeRange || undefined,
      },
      confidence,
      explanation: result.explanation || 'Intent classified based on question analysis',
    };

    // Log the classification result for debugging
    console.log('[Intent Classifier] Question:', question);
    console.log('[Intent Classifier] Detected intent:', {
      category: finalResult.intent.category,
      tables: finalResult.intent.tables,
      filters: finalResult.intent.filters,
      aggregationType: finalResult.intent.aggregationType,
      timeRange: finalResult.intent.timeRange,
      confidence: finalResult.confidence,
      explanation: finalResult.explanation
    });
    console.log('[Intent Classifier] Raw AI response:', result);

    return finalResult;
  } catch (error: any) {
    console.error('[Intent Classifier] Error classifying intent:', error.message);
    
    // Return safe fallback
    const fallbackResult = {
      intent: {
        category: IntentCategory.CONTACT_QUERY,
        tables: ['contacts'],
        filters: {},
      },
      confidence: 0.3,
      explanation: `Failed to classify intent: ${error.message}. Defaulting to CONTACT_QUERY.`,
    };
    
    // Log the fallback result
    console.log('[Intent Classifier] Question:', question);
    console.log('[Intent Classifier] Detected intent (FALLBACK):', {
      category: fallbackResult.intent.category,
      tables: fallbackResult.intent.tables,
      filters: fallbackResult.intent.filters,
      aggregationType: fallbackResult.intent.aggregationType,
      timeRange: fallbackResult.intent.timeRange,
      confidence: fallbackResult.confidence,
      explanation: fallbackResult.explanation,
      error: error.message
    });
    
    return fallbackResult;
  }
}

