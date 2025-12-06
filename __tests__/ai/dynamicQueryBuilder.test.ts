/**
 * Test suite for Dynamic Query Builder
 * Tests SQL query generation, JOINs, filters, aggregations, and security
 */

import { DynamicQueryBuilder, createQueryBuilder, UserContext } from '@/lib/ai/dynamicQueryBuilder';
import { QueryIntent, IntentCategory } from '@/lib/ai/types/intentTypes';
import { QueryOptions } from '@/lib/ai/types/queryTypes';
import { DATABASE_SCHEMA, TABLE_RELATIONSHIPS } from '@/lib/ai/databaseSchemaContext';

// Mock the database schema context
jest.mock('@/lib/ai/databaseSchemaContext', () => ({
  DATABASE_SCHEMA: {
    contacts: {
      tableName: 'contacts',
      columns: [
        { name: 'id', type: 'integer' },
        { name: 'name', type: 'string' },
        { name: 'email', type: 'string' },
        { name: 'phone', type: 'string' },
        { name: 'account_id', type: 'integer' },
        { name: 'sub_account_id', type: 'integer' },
        { name: 'created_at', type: 'timestamp' },
      ],
      primaryKey: 'id',
    },
    sub_accounts: {
      tableName: 'sub_accounts',
      columns: [
        { name: 'id', type: 'integer' },
        { name: 'name', type: 'string' },
        { name: 'engagement_score', type: 'number' },
        { name: 'assigned_employee_id', type: 'integer' },
      ],
      primaryKey: 'id',
    },
    accounts: {
      tableName: 'accounts',
      columns: [
        { name: 'id', type: 'integer' },
        { name: 'name', type: 'string' },
        { name: 'industry', type: 'string' },
        { name: 'potential_value', type: 'number' },
      ],
      primaryKey: 'id',
    },
    activities: {
      tableName: 'activities',
      columns: [
        { name: 'id', type: 'integer' },
        { name: 'type', type: 'string' },
        { name: 'description', type: 'text' },
        { name: 'sub_account_id', type: 'integer' },
        { name: 'created_by', type: 'integer' },
        { name: 'created_at', type: 'timestamp' },
      ],
      primaryKey: 'id',
    },
    quotes_mbcb: {
      tableName: 'quotes_mbcb',
      columns: [
        { name: 'id', type: 'integer' },
        { name: 'sub_account_id', type: 'integer' },
        { name: 'total_price', type: 'number' },
        { name: 'status', type: 'string' },
        { name: 'ai_win_probability', type: 'number' },
      ],
      primaryKey: 'id',
    },
    leads: {
      tableName: 'leads',
      columns: [
        { name: 'id', type: 'integer' },
        { name: 'name', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'score', type: 'number' },
        { name: 'assigned_to', type: 'integer' },
      ],
      primaryKey: 'id',
    },
    users: {
      tableName: 'users',
      columns: [
        { name: 'id', type: 'integer' },
        { name: 'name', type: 'string' },
        { name: 'email', type: 'string' },
        { name: 'role', type: 'string' },
      ],
      primaryKey: 'id',
    },
  },
  TABLE_RELATIONSHIPS: [
    {
      fromTable: 'contacts',
      toTable: 'accounts',
      foreignKey: 'account_id',
      relationshipType: 'many-to-one',
    },
    {
      fromTable: 'contacts',
      toTable: 'sub_accounts',
      foreignKey: 'sub_account_id',
      relationshipType: 'many-to-one',
    },
    {
      fromTable: 'sub_accounts',
      toTable: 'users',
      foreignKey: 'assigned_employee_id',
      relationshipType: 'many-to-one',
    },
    {
      fromTable: 'activities',
      toTable: 'sub_accounts',
      foreignKey: 'sub_account_id',
      relationshipType: 'many-to-one',
    },
    {
      fromTable: 'activities',
      toTable: 'users',
      foreignKey: 'created_by',
      relationshipType: 'many-to-one',
    },
    {
      fromTable: 'quotes_mbcb',
      toTable: 'sub_accounts',
      foreignKey: 'sub_account_id',
      relationshipType: 'many-to-one',
    },
    {
      fromTable: 'leads',
      toTable: 'users',
      foreignKey: 'assigned_to',
      relationshipType: 'many-to-one',
    },
  ],
  getRelationshipsForTables: jest.fn((tables: string[]) => {
    return TABLE_RELATIONSHIPS.filter(rel =>
      tables.includes(rel.fromTable) || tables.includes(rel.toTable)
    );
  }),
  getSchemaForTables: jest.fn((tables: string[]) => {
    const result: any = {};
    for (const table of tables) {
      if (DATABASE_SCHEMA[table]) {
        result[table] = DATABASE_SCHEMA[table];
      }
    }
    return result;
  }),
}));

describe('Dynamic Query Builder', () => {
  let builder: DynamicQueryBuilder;

  beforeEach(() => {
    builder = createQueryBuilder();
  });

  describe('Query Building for Each Intent Type', () => {
    it('should build CONTACT_QUERY correctly', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.CONTACT_QUERY,
        tables: ['contacts'],
        filters: { name: 'John Doe' },
      };

      const result = await builder.buildQuery(intent);

      expect(result.sql).toContain('SELECT');
      expect(result.sql).toContain('FROM contacts');
      expect(result.sql).toContain('WHERE');
      expect(result.affectedTables).toEqual(['contacts']);
      expect(result.params.length).toBeGreaterThan(0);
    });

    it('should build ACCOUNT_QUERY correctly', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.ACCOUNT_QUERY,
        tables: ['sub_accounts'],
        filters: { engagement_score: { $gt: 50 } },
      };

      const result = await builder.buildQuery(intent);

      expect(result.sql).toContain('FROM sub_accounts');
      expect(result.sql).toContain('engagement_score');
      expect(result.affectedTables).toEqual(['sub_accounts']);
    });

    it('should build ACTIVITY_QUERY correctly', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.ACTIVITY_QUERY,
        tables: ['activities'],
        filters: { type: 'call' },
      };

      const result = await builder.buildQuery(intent);

      expect(result.sql).toContain('FROM activities');
      expect(result.affectedTables).toEqual(['activities']);
    });

    it('should build QUOTATION_QUERY correctly', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.QUOTATION_QUERY,
        tables: ['quotes_mbcb'],
        filters: { status: 'accepted' },
      };

      const result = await builder.buildQuery(intent);

      expect(result.sql).toContain('FROM quotes_mbcb');
      expect(result.affectedTables).toEqual(['quotes_mbcb']);
    });

    it('should build LEAD_QUERY correctly', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.LEAD_QUERY,
        tables: ['leads'],
        filters: { status: 'New' },
      };

      const result = await builder.buildQuery(intent);

      expect(result.sql).toContain('FROM leads');
      expect(result.affectedTables).toEqual(['leads']);
    });

    it('should build PERFORMANCE_QUERY correctly', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.PERFORMANCE_QUERY,
        tables: ['activities', 'quotes_mbcb'],
      };

      const result = await builder.buildQuery(intent);

      expect(result.sql).toContain('FROM');
      expect(result.affectedTables).toEqual(['activities', 'quotes_mbcb']);
    });

    it('should build AGGREGATION_QUERY correctly', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.AGGREGATION_QUERY,
        tables: ['contacts'],
        aggregationType: 'count',
      };

      const result = await builder.buildQuery(intent);

      expect(result.sql).toContain('COUNT');
      expect(result.sql).toContain('FROM contacts');
    });

    it('should build COMPARISON_QUERY correctly', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.COMPARISON_QUERY,
        tables: ['quotes_mbcb'],
        filters: { status: { $in: ['accepted', 'rejected'] } },
      };

      const result = await builder.buildQuery(intent);

      expect(result.sql).toContain('FROM quotes_mbcb');
      expect(result.sql).toContain('WHERE');
    });

    it('should build TREND_QUERY correctly', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.TREND_QUERY,
        tables: ['activities'],
        timeRange: {
          start: '2024-01-01',
          end: '2024-12-31',
        },
      };

      const result = await builder.buildQuery(intent);

      expect(result.sql).toContain('FROM activities');
      expect(result.sql).toContain('created_at');
    });

    it('should build PREDICTION_QUERY correctly', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.PREDICTION_QUERY,
        tables: ['sub_accounts', 'activities'],
        filters: { engagement_score: { $lt: 50 } },
      };

      const result = await builder.buildQuery(intent);

      expect(result.sql).toContain('FROM');
      expect(result.affectedTables).toEqual(['sub_accounts', 'activities']);
    });
  });

  describe('SQL Syntax Validation', () => {
    it('should generate valid SQL with SELECT, FROM, WHERE', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.CONTACT_QUERY,
        tables: ['contacts'],
        filters: { name: 'Test' },
      };

      const result = await builder.buildQuery(intent);

      // Check SQL structure
      expect(result.sql).toMatch(/^SELECT\s+/i);
      expect(result.sql).toMatch(/FROM\s+\w+/i);
      expect(result.sql).toMatch(/WHERE\s+/i);
      
      // Check for SQL injection patterns (should use parameters)
      expect(result.sql).not.toContain("'; DROP TABLE");
      expect(result.sql).not.toContain("'; --");
      expect(result.params.length).toBeGreaterThan(0);
    });

    it('should use parameterized queries (no direct value injection)', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.CONTACT_QUERY,
        tables: ['contacts'],
        filters: { name: "'; DROP TABLE contacts; --" },
      };

      const result = await builder.buildQuery(intent);

      // Should use $1, $2, etc. for parameters
      expect(result.sql).toMatch(/\$\d+/);
      expect(result.sql).not.toContain("'; DROP TABLE contacts; --");
      expect(result.params).toContain("'; DROP TABLE contacts; --");
    });

    it('should handle complex WHERE clauses correctly', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.CONTACT_QUERY,
        tables: ['contacts'],
        filters: {
          name: 'John',
          email: { $ne: null },
        },
      };

      const result = await builder.buildQuery(intent);

      expect(result.sql).toContain('WHERE');
      expect(result.sql).toContain('AND');
      expect(result.params.length).toBeGreaterThanOrEqual(1);
    });

    it('should generate valid SQL for aggregation queries', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.AGGREGATION_QUERY,
        tables: ['contacts'],
        aggregationType: 'count',
      };

      const result = await builder.buildQuery(intent);

      expect(result.sql).toMatch(/SELECT\s+COUNT/i);
      expect(result.sql).toContain('FROM contacts');
    });
  });

  describe('JOIN Logic', () => {
    it('should generate correct JOIN for contacts and accounts', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.CONTACT_QUERY,
        tables: ['contacts', 'accounts'],
      };

      const result = await builder.buildQuery(intent);

      expect(result.sql).toContain('JOIN');
      expect(result.sql).toMatch(/accounts\s+ON/i);
      expect(result.sql).toContain('account_id');
    });

    it('should generate correct JOIN for contacts and sub_accounts', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.CONTACT_QUERY,
        tables: ['contacts', 'sub_accounts'],
      };

      const result = await builder.buildQuery(intent);

      expect(result.sql).toContain('JOIN');
      expect(result.sql).toMatch(/sub_accounts\s+ON/i);
      expect(result.sql).toContain('sub_account_id');
    });

    it('should generate multi-hop JOINs correctly', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.ACTIVITY_QUERY,
        tables: ['activities', 'sub_accounts', 'users'],
      };

      const result = await builder.buildQuery(intent);

      // Should have multiple JOINs
      const joinCount = (result.sql.match(/JOIN/gi) || []).length;
      expect(joinCount).toBeGreaterThanOrEqual(2);
      expect(result.sql).toContain('sub_account_id');
      expect(result.sql).toContain('assigned_employee_id');
    });

    it('should use INNER JOIN by default', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.CONTACT_QUERY,
        tables: ['contacts', 'accounts'],
      };

      const result = await builder.buildQuery(intent);

      expect(result.sql).toMatch(/INNER\s+JOIN/i);
    });

    it('should avoid duplicate JOINs', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.CONTACT_QUERY,
        tables: ['contacts', 'accounts', 'accounts'], // Duplicate
      };

      const result = await builder.buildQuery(intent);

      // Should only have one JOIN for accounts
      const accountsJoinCount = (result.sql.match(/JOIN\s+accounts/gi) || []).length;
      expect(accountsJoinCount).toBeLessThanOrEqual(1);
    });
  });

  describe('Time Range Filters', () => {
    it('should generate correct SQL for absolute date range', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.ACTIVITY_QUERY,
        tables: ['activities'],
        timeRange: {
          start: '2024-01-01',
          end: '2024-12-31',
        },
      };

      const result = await builder.buildQuery(intent);

      expect(result.sql).toContain('created_at');
      expect(result.sql).toContain('>=');
      expect(result.sql).toContain('<=');
      expect(result.params.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle relative time ranges', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.ACTIVITY_QUERY,
        tables: ['activities'],
        timeRange: {
          start: 'last 7 days',
        },
      };

      const result = await builder.buildQuery(intent);

      expect(result.sql).toContain('created_at');
      expect(result.sql).toContain('CURRENT_DATE');
      expect(result.sql).toContain('INTERVAL');
    });

    it('should handle "this week" time range', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.ACTIVITY_QUERY,
        tables: ['activities'],
        timeRange: {
          start: 'this week',
        },
      };

      const result = await builder.buildQuery(intent);

      expect(result.sql).toContain('created_at');
      expect(result.sql).toMatch(/DATE_TRUNC|CURRENT_DATE/i);
    });

    it('should handle "this month" time range', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.ACTIVITY_QUERY,
        tables: ['activities'],
        timeRange: {
          start: 'this month',
        },
      };

      const result = await builder.buildQuery(intent);

      expect(result.sql).toContain('created_at');
      expect(result.sql).toMatch(/DATE_TRUNC|CURRENT_DATE/i);
    });

    it('should handle time range with only start date', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.ACTIVITY_QUERY,
        tables: ['activities'],
        timeRange: {
          start: '2024-01-01',
        },
      };

      const result = await builder.buildQuery(intent);

      expect(result.sql).toContain('created_at');
      expect(result.sql).toContain('>=');
    });

    it('should handle time range with only end date', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.ACTIVITY_QUERY,
        tables: ['activities'],
        timeRange: {
          end: '2024-12-31',
        },
      };

      const result = await builder.buildQuery(intent);

      expect(result.sql).toContain('created_at');
      expect(result.sql).toContain('<=');
    });
  });

  describe('Aggregation Queries', () => {
    it('should build COUNT aggregation correctly', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.AGGREGATION_QUERY,
        tables: ['contacts'],
        aggregationType: 'count',
      };

      const result = await builder.buildQuery(intent);

      expect(result.sql).toMatch(/COUNT\(\*/i);
      expect(result.sql).toContain('as count');
    });

    it('should build SUM aggregation correctly', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.AGGREGATION_QUERY,
        tables: ['quotes_mbcb'],
        aggregationType: 'sum',
      };

      const result = await builder.buildQuery(intent);

      expect(result.sql).toMatch(/SUM\(/i);
      expect(result.sql).toContain('total_price');
    });

    it('should build AVG aggregation correctly', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.AGGREGATION_QUERY,
        tables: ['sub_accounts'],
        aggregationType: 'average',
      };

      const result = await builder.buildQuery(intent);

      expect(result.sql).toMatch(/AVG\(/i);
      expect(result.sql).toContain('engagement_score');
    });

    it('should build MAX aggregation correctly', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.AGGREGATION_QUERY,
        tables: ['quotes_mbcb'],
        aggregationType: 'max',
      };

      const result = await builder.buildQuery(intent);

      expect(result.sql).toMatch(/MAX\(/i);
    });

    it('should build MIN aggregation correctly', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.AGGREGATION_QUERY,
        tables: ['quotes_mbcb'],
        aggregationType: 'min',
      };

      const result = await builder.buildQuery(intent);

      expect(result.sql).toMatch(/MIN\(/i);
    });

    it('should handle GROUP BY with aggregation', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.AGGREGATION_QUERY,
        tables: ['activities'],
        aggregationType: 'count',
      };

      const options: QueryOptions = {
        groupBy: ['activities.type'],
      };

      const result = await builder.buildQuery(intent, undefined, options);

      expect(result.sql).toContain('GROUP BY');
      expect(result.sql).toContain('activities.type');
    });

    it('should handle HAVING clause for post-aggregation filters', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.AGGREGATION_QUERY,
        tables: ['activities'],
        aggregationType: 'count',
        filters: {
          count: { $gt: 10 }, // Post-aggregation filter
        },
      };

      const options: QueryOptions = {
        groupBy: ['activities.type'],
      };

      const result = await builder.buildQuery(intent, undefined, options);

      expect(result.sql).toContain('HAVING');
    });
  });

  describe('User Context Filters', () => {
    it('should apply employee filter for non-admin users', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.ACTIVITY_QUERY,
        tables: ['activities'],
      };

      const userContext: UserContext = {
        userId: '123',
        employeeId: '456',
        role: 'employee',
      };

      const result = await builder.buildQuery(intent, userContext);

      // Employee should only see their own activities
      expect(result.sql).toContain('created_by');
      expect(result.params).toContain('456');
    });

    it('should NOT apply employee filter for admin users', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.ACTIVITY_QUERY,
        tables: ['activities'],
      };

      const userContext: UserContext = {
        userId: '123',
        employeeId: '456',
        role: 'admin',
      };

      const result = await builder.buildQuery(intent, userContext);

      // Admin should see all activities
      expect(result.sql).not.toContain('created_by = $');
    });

    it('should apply assigned_to filter for leads for employees', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.LEAD_QUERY,
        tables: ['leads'],
      };

      const userContext: UserContext = {
        userId: '123',
        employeeId: '456',
        role: 'employee',
      };

      const result = await builder.buildQuery(intent, userContext);

      expect(result.sql).toContain('assigned_to');
      expect(result.params).toContain('456');
    });

    it('should apply assigned_employee_id filter for sub_accounts for employees', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.ACCOUNT_QUERY,
        tables: ['sub_accounts'],
      };

      const userContext: UserContext = {
        userId: '123',
        employeeId: '456',
        role: 'employee',
      };

      const result = await builder.buildQuery(intent, userContext);

      expect(result.sql).toContain('assigned_employee_id');
      expect(result.params).toContain('456');
    });

    it('should handle Data Analyst role correctly', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.AGGREGATION_QUERY,
        tables: ['contacts'],
        aggregationType: 'count',
      };

      const userContext: UserContext = {
        userId: '123',
        employeeId: '456',
        role: 'data_analyst',
      };

      const result = await builder.buildQuery(intent, userContext);

      // Data analysts might have different permissions
      // This depends on your implementation
      expect(result.sql).toBeDefined();
      expect(result.params).toBeDefined();
    });

    it('should handle missing user context gracefully', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.CONTACT_QUERY,
        tables: ['contacts'],
      };

      const result = await builder.buildQuery(intent);

      // Should still generate valid SQL
      expect(result.sql).toContain('SELECT');
      expect(result.sql).toContain('FROM contacts');
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in filter values', async () => {
      const maliciousInputs = [
        "'; DROP TABLE contacts; --",
        "' OR '1'='1",
        "'; DELETE FROM contacts; --",
        "1'; UPDATE contacts SET name='hacked'; --",
      ];

      for (const maliciousInput of maliciousInputs) {
        const intent: QueryIntent = {
          category: IntentCategory.CONTACT_QUERY,
          tables: ['contacts'],
          filters: { name: maliciousInput },
        };

        const result = await builder.buildQuery(intent);

        // Should use parameterized queries
        expect(result.sql).toMatch(/\$\d+/);
        expect(result.sql).not.toContain(maliciousInput);
        expect(result.params).toContain(maliciousInput);
      }
    });

    it('should prevent SQL injection in table names', async () => {
      // Table names should be validated against schema
      const intent: QueryIntent = {
        category: IntentCategory.CONTACT_QUERY,
        tables: ['contacts; DROP TABLE contacts; --'],
      };

      // This should either fail or sanitize the table name
      const result = await builder.buildQuery(intent);

      // Should not contain the malicious SQL
      expect(result.sql).not.toContain('DROP TABLE');
    });

    it('should prevent SQL injection in filter operators', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.CONTACT_QUERY,
        tables: ['contacts'],
        filters: {
          name: { $gt: "'; DROP TABLE contacts; --" },
        },
      };

      const result = await builder.buildQuery(intent);

      expect(result.sql).toMatch(/\$\d+/);
      expect(result.sql).not.toContain('DROP TABLE');
      expect(result.params).toContain("'; DROP TABLE contacts; --");
    });

    it('should sanitize special characters in values', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.CONTACT_QUERY,
        tables: ['contacts'],
        filters: {
          email: "test@example.com'; DROP TABLE contacts; --",
        },
      };

      const result = await builder.buildQuery(intent);

      // Should use parameters, not string concatenation
      expect(result.sql).toMatch(/\$\d+/);
      expect(result.params).toContain("test@example.com'; DROP TABLE contacts; --");
    });
  });

  describe('Query Options', () => {
    it('should apply LIMIT correctly', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.CONTACT_QUERY,
        tables: ['contacts'],
      };

      const options: QueryOptions = {
        limit: 10,
      };

      const result = await builder.buildQuery(intent, undefined, options);

      expect(result.sql).toContain('LIMIT');
      expect(result.sql).toContain('10');
    });

    it('should apply OFFSET correctly', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.CONTACT_QUERY,
        tables: ['contacts'],
      };

      const options: QueryOptions = {
        limit: 10,
        offset: 20,
      };

      const result = await builder.buildQuery(intent, undefined, options);

      expect(result.sql).toContain('OFFSET');
      expect(result.sql).toContain('20');
    });

    it('should apply ORDER BY correctly', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.CONTACT_QUERY,
        tables: ['contacts'],
      };

      const options: QueryOptions = {
        orderBy: [
          { field: 'contacts.name', direction: 'ASC' },
          { field: 'contacts.created_at', direction: 'DESC' },
        ],
      };

      const result = await builder.buildQuery(intent, undefined, options);

      expect(result.sql).toContain('ORDER BY');
      expect(result.sql).toContain('contacts.name');
      expect(result.sql).toContain('ASC');
      expect(result.sql).toContain('DESC');
    });

    it('should apply GROUP BY correctly', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.AGGREGATION_QUERY,
        tables: ['activities'],
        aggregationType: 'count',
      };

      const options: QueryOptions = {
        groupBy: ['activities.type', 'activities.created_by'],
      };

      const result = await builder.buildQuery(intent, undefined, options);

      expect(result.sql).toContain('GROUP BY');
      expect(result.sql).toContain('activities.type');
      expect(result.sql).toContain('activities.created_by');
    });
  });

  describe('Complex Queries', () => {
    it('should handle multiple filters with different operators', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.CONTACT_QUERY,
        tables: ['contacts'],
        filters: {
          name: 'John',
          email: { $ne: null },
          account_id: { $gt: 100 },
        },
      };

      const result = await builder.buildQuery(intent);

      expect(result.sql).toContain('WHERE');
      expect(result.sql.split('AND').length).toBeGreaterThanOrEqual(3);
      expect(result.params.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle query with JOIN, filters, and aggregation', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.AGGREGATION_QUERY,
        tables: ['contacts', 'accounts'],
        filters: {
          'accounts.industry': 'manufacturing',
        },
        aggregationType: 'count',
      };

      const result = await builder.buildQuery(intent);

      expect(result.sql).toContain('JOIN');
      expect(result.sql).toContain('COUNT');
      expect(result.sql).toContain('WHERE');
      expect(result.sql).toContain('industry');
    });

    it('should handle query with time range, filters, and sorting', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.ACTIVITY_QUERY,
        tables: ['activities'],
        filters: { type: 'call' },
        timeRange: {
          start: '2024-01-01',
          end: '2024-12-31',
        },
      };

      const options: QueryOptions = {
        orderBy: [{ field: 'activities.created_at', direction: 'DESC' }],
        limit: 50,
      };

      const result = await builder.buildQuery(intent, undefined, options);

      expect(result.sql).toContain('WHERE');
      expect(result.sql).toContain('ORDER BY');
      expect(result.sql).toContain('LIMIT');
      expect(result.sql).toContain('created_at');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty filters object', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.CONTACT_QUERY,
        tables: ['contacts'],
        filters: {},
      };

      const result = await builder.buildQuery(intent);

      expect(result.sql).toContain('SELECT');
      expect(result.sql).toContain('FROM contacts');
    });

    it('should handle undefined filters', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.CONTACT_QUERY,
        tables: ['contacts'],
      };

      const result = await builder.buildQuery(intent);

      expect(result.sql).toBeDefined();
      expect(result.sql).toContain('FROM contacts');
    });

    it('should handle empty tables array gracefully', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.CONTACT_QUERY,
        tables: [],
      };

      // Should use default table or handle gracefully
      const result = await builder.buildQuery(intent);

      expect(result.sql).toBeDefined();
    });

    it('should handle invalid table names', async () => {
      const intent: QueryIntent = {
        category: IntentCategory.CONTACT_QUERY,
        tables: ['non_existent_table'],
      };

      const result = await builder.buildQuery(intent);

      // Should still generate SQL (may use table name as-is or default)
      expect(result.sql).toBeDefined();
    });
  });
});

