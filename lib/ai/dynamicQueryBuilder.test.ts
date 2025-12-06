/**
 * Test cases for DynamicQueryBuilder
 * Demonstrates aggregation query building capabilities
 */

import { DynamicQueryBuilder, createQueryBuilder } from './dynamicQueryBuilder';
import { QueryIntent, IntentCategory } from './types/intentTypes';
import { QueryOptions } from './types/queryTypes';

/**
 * Test case 1: "Total quotation value this month" (with absolute dates)
 * Expected: SUM aggregation on total_price with time range filter
 */
export async function testTotalQuotationValueThisMonth() {
  const builder = createQueryBuilder();
  
  const intent: QueryIntent = {
    category: IntentCategory.AGGREGATION_QUERY,
    tables: ['quotes_mbcb', 'quotes_signages', 'quotes_paint'],
    aggregationType: 'sum',
    timeRange: {
      start: new Date('2024-01-01').toISOString(),
      end: new Date('2024-01-31').toISOString(),
    },
  };

  const result = await builder.buildQuery(intent);
  
  console.log('Test 1: Total quotation value this month (absolute dates)');
  console.log('SQL:', result.sql);
  console.log('Params:', result.params);
  console.log('Explanation:', result.explanation);
  console.log('---\n');

  return result;
}

/**
 * Test case 1b: "Total quotation value this month" (with relative time)
 * Expected: SUM aggregation on total_price with relative time range filter
 */
export async function testTotalQuotationValueThisMonthRelative() {
  const builder = createQueryBuilder();
  
  const intent: QueryIntent = {
    category: IntentCategory.AGGREGATION_QUERY,
    tables: ['quotes_mbcb'],
    aggregationType: 'sum',
    timeRange: {
      start: 'this month', // Relative time expression
    },
  };

  const result = await builder.buildQuery(intent);
  
  console.log('Test 1b: Total quotation value this month (relative time)');
  console.log('SQL:', result.sql);
  console.log('Params:', result.params);
  console.log('Explanation:', result.explanation);
  console.log('---\n');

  return result;
}

/**
 * Test case 2: "Average engagement score by employee"
 * Expected: AVG aggregation on engagement_score grouped by assigned_employee_id
 */
export async function testAverageEngagementScoreByEmployee() {
  const builder = createQueryBuilder();
  
  const intent: QueryIntent = {
    category: IntentCategory.AGGREGATION_QUERY,
    tables: ['sub_accounts'],
    aggregationType: 'avg',
    filters: {
      assigned_employee_id: { $ne: null }, // Only accounts with assigned employees
    },
  };

  const options: QueryOptions = {
    groupBy: ['sub_accounts.assigned_employee_id'],
  };

  const result = await builder.buildQuery(intent, undefined, options);
  
  console.log('Test 2: Average engagement score by employee');
  console.log('SQL:', result.sql);
  console.log('Params:', result.params);
  console.log('Explanation:', result.explanation);
  console.log('---\n');

  return result;
}

/**
 * Test case 3: "Count of activities by type"
 * Expected: COUNT aggregation grouped by activity type
 */
export async function testCountActivitiesByType() {
  const builder = createQueryBuilder();
  
  const intent: QueryIntent = {
    category: IntentCategory.AGGREGATION_QUERY,
    tables: ['activities'],
    aggregationType: 'count',
  };

  const options: QueryOptions = {
    groupBy: ['activities.type'],
    orderBy: [
      { field: 'count', direction: 'DESC' },
    ],
  };

  const result = await builder.buildQuery(intent, undefined, options);
  
  console.log('Test 3: Count of activities by type');
  console.log('SQL:', result.sql);
  console.log('Params:', result.params);
  console.log('Explanation:', result.explanation);
  console.log('---\n');

  return result;
}

/**
 * Test case 4: "Total quotation value with HAVING clause"
 * Expected: SUM aggregation with post-aggregation filter (e.g., total > 10000)
 */
export async function testTotalQuotationValueWithHaving() {
  const builder = createQueryBuilder();
  
  const intent: QueryIntent = {
    category: IntentCategory.AGGREGATION_QUERY,
    tables: ['quotes_mbcb'],
    aggregationType: 'sum',
    filters: {
      status: 'accepted',
      // Note: In a real scenario, HAVING filters would be specified separately
      // For this test, we'll use options to demonstrate the concept
    },
  };

  const result = await builder.buildQuery(intent);
  
  console.log('Test 4: Total quotation value (accepted only)');
  console.log('SQL:', result.sql);
  console.log('Params:', result.params);
  console.log('Explanation:', result.explanation);
  console.log('---\n');

  return result;
}

/**
 * Test case 5: "Average engagement score by employee with time range"
 * Expected: AVG aggregation grouped by employee with time-based filtering
 */
export async function testAverageEngagementByEmployeeWithTimeRange() {
  const builder = createQueryBuilder();
  
  const intent: QueryIntent = {
    category: IntentCategory.AGGREGATION_QUERY,
    tables: ['sub_accounts'],
    aggregationType: 'avg',
    timeRange: {
      start: new Date('2024-01-01').toISOString(),
      end: new Date('2024-03-31').toISOString(),
    },
  };

  const options: QueryOptions = {
    groupBy: ['sub_accounts.assigned_employee_id'],
    orderBy: [
      { field: 'average', direction: 'DESC' },
    ],
  };

  const result = await builder.buildQuery(intent, undefined, options);
  
  console.log('Test 5: Average engagement score by employee (Q1 2024)');
  console.log('SQL:', result.sql);
  console.log('Params:', result.params);
  console.log('Explanation:', result.explanation);
  console.log('---\n');

  return result;
}

/**
 * Test case 6: "Activities from last 7 days" (relative time)
 * Expected: Query with relative time range filter
 */
export async function testActivitiesLast7Days() {
  const builder = createQueryBuilder();
  
  const intent: QueryIntent = {
    category: IntentCategory.ACTIVITY_QUERY,
    tables: ['activities'],
    timeRange: {
      start: 'last 7 days', // Relative time expression
    },
  };

  const result = await builder.buildQuery(intent);
  
  console.log('Test 6: Activities from last 7 days (relative time)');
  console.log('SQL:', result.sql);
  console.log('Params:', result.params);
  console.log('Explanation:', result.explanation);
  console.log('---\n');

  return result;
}

/**
 * Test case 7: "Quotations from this quarter" (relative time)
 * Expected: Query with relative time range filter for quarter
 */
export async function testQuotationsThisQuarter() {
  const builder = createQueryBuilder();
  
  const intent: QueryIntent = {
    category: IntentCategory.QUOTATION_QUERY,
    tables: ['quotes_mbcb'],
    timeRange: {
      start: 'this quarter', // Relative time expression
    },
  };

  const result = await builder.buildQuery(intent);
  
  console.log('Test 7: Quotations from this quarter (relative time)');
  console.log('SQL:', result.sql);
  console.log('Params:', result.params);
  console.log('Explanation:', result.explanation);
  console.log('---\n');

  return result;
}

/**
 * Test case 8: "Today's activities" (relative time)
 * Expected: Query with "today" relative time filter
 */
export async function testTodaysActivities() {
  const builder = createQueryBuilder();
  
  const intent: QueryIntent = {
    category: IntentCategory.ACTIVITY_QUERY,
    tables: ['activities'],
    timeRange: {
      start: 'today', // Relative time expression
    },
  };

  const result = await builder.buildQuery(intent);
  
  console.log('Test 8: Today\'s activities (relative time)');
  console.log('SQL:', result.sql);
  console.log('Params:', result.params);
  console.log('Explanation:', result.explanation);
  console.log('---\n');

  return result;
}

/**
 * Test case 9: "Contacts and activities" (multi-hop join through sub_accounts)
 * Expected: Should automatically join contacts → sub_accounts → activities
 */
export async function testContactsAndActivitiesMultiHop() {
  const builder = createQueryBuilder();
  
  const intent: QueryIntent = {
    category: IntentCategory.CONTACT_QUERY,
    tables: ['contacts', 'activities'], // No sub_accounts in tables, but should join through it
  };

  const result = await builder.buildQuery(intent);
  
  console.log('Test 9: Contacts and activities (multi-hop join)');
  console.log('SQL:', result.sql);
  console.log('Params:', result.params);
  console.log('Explanation:', result.explanation);
  console.log('---\n');

  return result;
}

/**
 * Test case 10: "Contacts, activities, and accounts" (complex multi-hop)
 * Expected: Should join contacts → sub_accounts → activities, and contacts → accounts
 */
export async function testContactsActivitiesAccounts() {
  const builder = createQueryBuilder();
  
  const intent: QueryIntent = {
    category: IntentCategory.CONTACT_QUERY,
    tables: ['contacts', 'activities', 'accounts'],
  };

  const result = await builder.buildQuery(intent);
  
  console.log('Test 10: Contacts, activities, and accounts (complex multi-hop)');
  console.log('SQL:', result.sql);
  console.log('Params:', result.params);
  console.log('Explanation:', result.explanation);
  console.log('---\n');

  return result;
}

/**
 * Test case 11: "Activities and users" (direct join)
 * Expected: Should join activities → users via created_by
 */
export async function testActivitiesAndUsers() {
  const builder = createQueryBuilder();
  
  const intent: QueryIntent = {
    category: IntentCategory.ACTIVITY_QUERY,
    tables: ['activities', 'users'],
  };

  const result = await builder.buildQuery(intent);
  
  console.log('Test 11: Activities and users (direct join)');
  console.log('SQL:', result.sql);
  console.log('Params:', result.params);
  console.log('Explanation:', result.explanation);
  console.log('---\n');

  return result;
}

/**
 * Run all test cases
 */
export async function runAllTests() {
  console.log('=== DynamicQueryBuilder Test Suite ===\n');
  
  try {
    await testTotalQuotationValueThisMonth();
    await testTotalQuotationValueThisMonthRelative();
    await testAverageEngagementScoreByEmployee();
    await testCountActivitiesByType();
    await testTotalQuotationValueWithHaving();
    await testAverageEngagementByEmployeeWithTimeRange();
    await testActivitiesLast7Days();
    await testQuotationsThisQuarter();
    await testTodaysActivities();
    await testContactsAndActivitiesMultiHop();
    await testContactsActivitiesAccounts();
    await testActivitiesAndUsers();
    
    console.log('All tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  }
}

// Uncomment to run tests directly
// runAllTests().catch(console.error);

