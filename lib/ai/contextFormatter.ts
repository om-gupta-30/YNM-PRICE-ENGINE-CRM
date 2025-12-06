/**
 * Context formatter for AI query processing
 * Converts database results, user context, and business knowledge into natural language
 */

import { QueryIntent, IntentCategory } from './types/intentTypes';

/**
 * Format database query results into natural language context for AI
 * 
 * @param results - Array of database query results
 * @param query - The original user query
 * @param intent - The classified query intent
 * @returns Formatted natural language context string
 */
export function formatQueryResultsForAI(
  results: any[],
  query: string,
  intent: QueryIntent
): string {
  if (!results || results.length === 0) {
    return `No results found for the query: "${query}". The database returned an empty result set.`;
  }

  // Handle large result sets by summarizing
  if (results.length > 50) {
    return formatLargeResultSet(results, query, intent);
  }

  // Format based on result type
  if (isAggregationResult(results)) {
    return formatAggregationResults(results, query, intent);
  }

  if (isComparisonResult(results, intent)) {
    return formatComparisonResults(results, query, intent);
  }

  // Default: format as table
  return formatTableResults(results, query, intent);
}

/**
 * Format large result sets by summarizing instead of listing all rows
 */
function formatLargeResultSet(
  results: any[],
  query: string,
  intent: QueryIntent
): string {
  const totalCount = results.length;
  const sampleSize = Math.min(10, totalCount);
  const sample = results.slice(0, sampleSize);
  
  let summary = `Found ${formatNumber(totalCount)} results for "${query}". Showing summary and first ${sampleSize} rows:\n\n`;
  
  // Calculate summary statistics if numeric columns exist
  const numericColumns = detectNumericColumns(results);
  if (numericColumns.length > 0) {
    summary += 'Summary Statistics:\n';
    for (const col of numericColumns) {
      const values = results.map(r => parseFloat(r[col])).filter(v => !isNaN(v));
      if (values.length > 0) {
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        
        summary += `  - ${col}: Total=${formatNumber(sum)}, Average=${formatNumber(avg)}, Min=${formatNumber(min)}, Max=${formatNumber(max)}\n`;
      }
    }
    summary += '\n';
  }
  
  summary += formatTableResults(sample, query, intent);
  summary += `\n... and ${formatNumber(totalCount - sampleSize)} more rows (truncated for brevity)`;
  
  return summary;
}

/**
 * Format aggregation results (count, sum, avg, etc.)
 */
function formatAggregationResults(
  results: any[],
  query: string,
  intent: QueryIntent
): string {
  if (results.length === 1) {
    const result = results[0];
    const keys = Object.keys(result);
    
    // Single aggregation result
    if (keys.length === 1) {
      const key = keys[0];
      const value = result[key];
      const formattedValue = formatValue(value, key);
      
      return `Query: "${query}"\nResult: ${formattedValue}`;
    }
    
    // Multiple aggregations
    let formatted = `Query: "${query}"\nResults:\n`;
    for (const key of keys) {
      const value = result[key];
      formatted += `  - ${formatColumnName(key)}: ${formatValue(value, key)}\n`;
    }
    return formatted;
  }
  
  // Grouped aggregations
  return formatTableResults(results, query, intent);
}

/**
 * Format comparison results
 */
function formatComparisonResults(
  results: any[],
  query: string,
  intent: QueryIntent
): string {
  let formatted = `Query: "${query}"\nComparison Results:\n\n`;
  formatted += formatTableResults(results, query, intent);
  
  // Add insights for comparisons
  const insights = generateComparisonInsights(results);
  if (insights.length > 0) {
    formatted += '\n\nKey Insights:\n';
    insights.forEach(insight => {
      formatted += `  • ${insight}\n`;
    });
  }
  
  return formatted;
}

/**
 * Format results as a table
 */
function formatTableResults(
  results: any[],
  query: string,
  intent: QueryIntent
): string {
  if (results.length === 0) {
    return `No results found for: "${query}"`;
  }
  
  const columns = Object.keys(results[0]);
  const maxColumnWidth = 30;
  const maxRows = 50;
  
  // Truncate if too many rows
  const displayResults = results.slice(0, maxRows);
  
  // Calculate column widths
  const columnWidths: Record<string, number> = {};
  for (const col of columns) {
    columnWidths[col] = Math.min(
      maxColumnWidth,
      Math.max(col.length, ...displayResults.map(r => String(formatValue(r[col], col)).length))
    );
  }
  
  // Build table
  let table = '';
  
  // Header
  table += '┌' + columns.map(col => '─'.repeat(columnWidths[col] + 2)).join('┬') + '┐\n';
  table += '│' + columns.map(col => ` ${padString(formatColumnName(col), columnWidths[col])} `).join('│') + '│\n';
  table += '├' + columns.map(col => '─'.repeat(columnWidths[col] + 2)).join('┼') + '┤\n';
  
  // Rows
  for (const row of displayResults) {
    table += '│' + columns.map(col => {
      const value = formatValue(row[col], col);
      return ` ${padString(String(value), columnWidths[col])} `;
    }).join('│') + '│\n';
  }
  
  table += '└' + columns.map(col => '─'.repeat(columnWidths[col] + 2)).join('┴') + '┘\n';
  
  if (results.length > maxRows) {
    table += `\n(Showing ${maxRows} of ${results.length} rows)`;
  }
  
  return table;
}

/**
 * Format user context for AI
 * 
 * @param userContext - User context object
 * @returns Formatted user context string
 */
export function formatUserContextForAI(userContext: any): string {
  if (!userContext) {
    return 'User context: Not available';
  }
  
  let formatted = 'User Context:\n';
  
  if (userContext.name) {
    formatted += `  Name: ${userContext.name}\n`;
  }
  
  if (userContext.email) {
    formatted += `  Email: ${userContext.email}\n`;
  }
  
  if (userContext.role) {
    formatted += `  Role: ${userContext.role}\n`;
  }
  
  if (userContext.userId || userContext.employeeId) {
    formatted += `  ID: ${userContext.userId || userContext.employeeId}\n`;
  }
  
  if (userContext.permissions && Array.isArray(userContext.permissions)) {
    formatted += `  Permissions: ${userContext.permissions.join(', ')}\n`;
  }
  
  // Format current stats if available
  if (userContext.stats) {
    formatted += '\nCurrent Statistics:\n';
    const stats = userContext.stats;
    
    if (stats.totalAccounts !== undefined) {
      formatted += `  Total Accounts: ${formatNumber(stats.totalAccounts)}\n`;
    }
    if (stats.totalLeads !== undefined) {
      formatted += `  Total Leads: ${formatNumber(stats.totalLeads)}\n`;
    }
    if (stats.totalActivities !== undefined) {
      formatted += `  Total Activities: ${formatNumber(stats.totalActivities)}\n`;
    }
    if (stats.quotationsLast30Days !== undefined) {
      formatted += `  Quotations (Last 30 Days): ${formatNumber(stats.quotationsLast30Days)}\n`;
    }
    if (stats.engagementScore !== undefined) {
      formatted += `  Average Engagement Score: ${formatNumber(stats.engagementScore, 1)}\n`;
    }
    if (stats.streak !== undefined) {
      formatted += `  Activity Streak: ${formatNumber(stats.streak)} days\n`;
    }
  }
  
  return formatted.trim();
}

/**
 * Format business knowledge for AI
 * 
 * @param relevantKnowledge - Array of relevant business knowledge strings
 * @returns Formatted business knowledge string
 */
export function formatBusinessKnowledgeForAI(relevantKnowledge: string[]): string {
  if (!relevantKnowledge || relevantKnowledge.length === 0) {
    return 'Business Knowledge: No relevant knowledge available for this query.';
  }
  
  let formatted = 'Relevant Business Knowledge:\n\n';
  
  relevantKnowledge.forEach((knowledge, index) => {
    formatted += `${index + 1}. ${knowledge.trim()}\n\n`;
  });
  
  return formatted.trim();
}

// ============================================
// Helper Functions
// ============================================

/**
 * Check if results are aggregation results
 */
function isAggregationResult(results: any[]): boolean {
  if (results.length !== 1) {
    return false;
  }
  
  const result = results[0];
  const keys = Object.keys(result);
  
  // Aggregation results typically have keys like count, sum, avg, total, etc.
  const aggregationKeys = ['count', 'sum', 'total', 'average', 'avg', 'min_value', 'max_value'];
  return keys.some(key => aggregationKeys.includes(key.toLowerCase()));
}

/**
 * Check if results are comparison results
 */
function isComparisonResult(results: any[], intent: QueryIntent): boolean {
  return intent.category === IntentCategory.COMPARISON_QUERY || 
         intent.category === IntentCategory.TREND_QUERY ||
         (results.length > 1 && results.length <= 10);
}

/**
 * Detect numeric columns in results
 */
function detectNumericColumns(results: any[]): string[] {
  if (results.length === 0) {
    return [];
  }
  
  const columns = Object.keys(results[0]);
  const numericColumns: string[] = [];
  
  for (const col of columns) {
    const sampleValues = results.slice(0, 10).map(r => r[col]);
    const numericCount = sampleValues.filter(v => {
      const num = parseFloat(String(v));
      return !isNaN(num) && isFinite(num);
    }).length;
    
    // If most sample values are numeric, consider it a numeric column
    if (numericCount >= sampleValues.length * 0.7) {
      numericColumns.push(col);
    }
  }
  
  return numericColumns;
}

/**
 * Format a value based on its type and column name
 */
function formatValue(value: any, columnName: string): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  
  // Format dates
  if (value instanceof Date) {
    return value.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
  
  // Format date strings
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    try {
      const date = new Date(value);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return value;
    }
  }
  
  // Format currency
  if (columnName.toLowerCase().includes('price') || 
      columnName.toLowerCase().includes('cost') ||
      columnName.toLowerCase().includes('value') ||
      columnName.toLowerCase().includes('amount') ||
      columnName.toLowerCase().includes('revenue')) {
    const num = parseFloat(String(value));
    if (!isNaN(num)) {
      return formatCurrency(num);
    }
  }
  
  // Format numbers
  if (typeof value === 'number' || !isNaN(parseFloat(String(value)))) {
    const num = parseFloat(String(value));
    if (!isNaN(num)) {
      // Check if it's a whole number
      if (Number.isInteger(num)) {
        return formatNumber(num);
      }
      return formatNumber(num, 2);
    }
  }
  
  // Format booleans
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  
  // Format JSON/objects
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  
  // Default: return as string (truncate if too long)
  const str = String(value);
  return str.length > 50 ? str.substring(0, 47) + '...' : str;
}

/**
 * Format number with thousand separators
 */
function formatNumber(num: number, decimals: number = 0): string {
  if (isNaN(num) || !isFinite(num)) {
    return String(num);
  }
  
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format currency
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format column name for display
 */
function formatColumnName(columnName: string): string {
  // Convert snake_case to Title Case
  return columnName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Pad string to specified width
 */
function padString(str: string, width: number): string {
  if (str.length > width) {
    return str.substring(0, width - 3) + '...';
  }
  return str.padEnd(width);
}

/**
 * Generate insights for comparison results
 */
function generateComparisonInsights(results: any[]): string[] {
  const insights: string[] = [];
  
  if (results.length < 2) {
    return insights;
  }
  
  // Detect numeric columns
  const numericColumns = detectNumericColumns(results);
  
  for (const col of numericColumns) {
    const values = results.map(r => parseFloat(r[col])).filter(v => !isNaN(v));
    if (values.length >= 2) {
      const max = Math.max(...values);
      const min = Math.min(...values);
      const maxIndex = values.indexOf(max);
      const minIndex = values.indexOf(min);
      
      if (max !== min) {
        const diff = ((max - min) / min) * 100;
        insights.push(
          `${formatColumnName(col)} ranges from ${formatValue(min, col)} to ${formatValue(max, col)} (${formatNumber(diff, 1)}% difference)`
        );
      }
    }
  }
  
  return insights;
}

