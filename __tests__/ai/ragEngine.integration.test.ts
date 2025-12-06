/**
 * Integration tests for RAG Engine
 * Tests complete flow: Question → Intent → Query → Results → Answer
 */

import { executeRAGQuery, RAGResponse } from '@/lib/ai/ragEngine';
import { IntentCategory } from '@/lib/ai/types/intentTypes';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { runGemini, runGeminiWithFallback } from '@/utils/ai';
import { classifyIntent } from '@/lib/ai/intentClassifier';
import { loadConversationHistory } from '@/lib/ai/conversationMemory';

// Mock dependencies
jest.mock('@/lib/utils/supabaseClient');
jest.mock('@/utils/ai');
jest.mock('@/lib/ai/intentClassifier');
jest.mock('@/lib/ai/conversationMemory');

const mockedCreateSupabaseServerClient = createSupabaseServerClient as jest.MockedFunction<typeof createSupabaseServerClient>;
const mockedRunGemini = runGemini as jest.MockedFunction<typeof runGemini>;
const mockedRunGeminiWithFallback = runGeminiWithFallback as jest.MockedFunction<typeof runGeminiWithFallback>;
const mockedClassifyIntent = classifyIntent as jest.MockedFunction<typeof classifyIntent>;
const mockedLoadConversationHistory = loadConversationHistory as jest.MockedFunction<typeof loadConversationHistory>;

// Sample test data
const sampleContacts = [
  { id: 1, name: 'John Doe', email: 'john@example.com', phone: '123-456-7890', account_id: 1, sub_account_id: 1, created_at: '2024-01-15T10:00:00Z' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', phone: '123-456-7891', account_id: 1, sub_account_id: 1, created_at: '2024-01-16T10:00:00Z' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', phone: '123-456-7892', account_id: 2, sub_account_id: 2, created_at: '2024-01-17T10:00:00Z' },
];

const sampleAccounts = [
  { id: 1, name: 'Acme Corp', industry: 'manufacturing', potential_value: 100000 },
  { id: 2, name: 'Tech Inc', industry: 'technology', potential_value: 200000 },
];

const sampleActivities = [
  { id: 1, type: 'call', description: 'Initial contact call', sub_account_id: 1, created_by: 1, created_at: '2024-01-15T10:00:00Z' },
  { id: 2, type: 'meeting', description: 'Product demo', sub_account_id: 1, created_by: 1, created_at: '2024-01-16T10:00:00Z' },
  { id: 3, type: 'email', description: 'Follow-up email', sub_account_id: 2, created_by: 2, created_at: '2024-01-17T10:00:00Z' },
];

const sampleUsers = [
  { id: 1, name: 'Alice Admin', email: 'alice@example.com', role: 'admin' },
  { id: 2, name: 'Bob Employee', email: 'bob@example.com', role: 'employee' },
];

// Mock Supabase client with simplified chainable API
function createMockSupabaseClient() {
  const createChainableQuery = (table: string, filters: any = {}) => {
    let data = getTableData(table);
    
    // Apply filters
    if (filters.eq) {
      Object.entries(filters.eq).forEach(([col, val]: [string, any]) => {
        data = data.filter((row: any) => row[col] === val);
      });
    }
    if (filters.gte) {
      Object.entries(filters.gte).forEach(([col, val]: [string, any]) => {
        data = data.filter((row: any) => row[col] >= val);
      });
    }
    if (filters.lte) {
      Object.entries(filters.lte).forEach(([col, val]: [string, any]) => {
        data = data.filter((row: any) => row[col] <= val);
      });
    }

    return Promise.resolve({ data, error: null });
  };

  const mockClient = {
    from: jest.fn((table: string) => {
      const queryBuilder: any = {
        select: jest.fn((columns?: string) => {
          const chain: any = {
            eq: jest.fn((column: string, value: any) => {
              chain.filters = { ...chain.filters, eq: { ...chain.filters?.eq, [column]: value } };
              return chain;
            }),
            gte: jest.fn((column: string, value: any) => {
              chain.filters = { ...chain.filters, gte: { ...chain.filters?.gte, [column]: value } };
              return chain;
            }),
            lte: jest.fn((column: string, value: any) => {
              chain.filters = { ...chain.filters, lte: { ...chain.filters?.lte, [column]: value } };
              return chain;
            }),
            order: jest.fn((column: string, options?: any) => chain),
            limit: jest.fn((n: number) => chain),
            single: jest.fn(() => createChainableQuery(table, chain.filters).then((result: any) => ({
              data: result.data[0] || null,
              error: result.error,
            }))),
            then: jest.fn((callback: any) => createChainableQuery(table, chain.filters).then(callback)),
          };
          chain.filters = {};
          return chain;
        }),
        rpc: jest.fn((functionName: string, params?: any) => {
          // Mock execute_query RPC - parse SQL and return appropriate data
          if (functionName === 'execute_query' && params?.query_sql) {
            const sql = params.query_sql.toLowerCase();
            // Handle COUNT queries
            if (sql.includes('count')) {
              const tableMatch = sql.match(/from\s+(\w+)/);
              if (tableMatch) {
                const table = tableMatch[1];
                return Promise.resolve({ data: [{ count: getTableData(table).length }], error: null });
              }
            }
            // Handle SELECT * queries
            if (sql.includes('select') && sql.includes('from')) {
              const tableMatch = sql.match(/from\s+(\w+)/);
              if (tableMatch) {
                const table = tableMatch[1];
                let data = getTableData(table);
                // Apply WHERE filters if present
                if (sql.includes('where')) {
                  // Simple filter matching (for test purposes)
                  if (sql.includes('account_id = 1')) {
                    data = data.filter((row: any) => row.account_id === 1);
                  }
                  if (sql.includes('created_by = 1')) {
                    data = data.filter((row: any) => row.created_by === 1);
                  }
                }
                return Promise.resolve({ data, error: null });
              }
            }
          }
          return Promise.resolve({ data: getTableData(table), error: null });
        }),
      };
      return queryBuilder;
    }),
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'test-user-1' } }, error: null })),
    },
  };

  return mockClient as any;
}

function getTableData(table: string): any[] {
  switch (table) {
    case 'contacts':
      return sampleContacts;
    case 'accounts':
      return sampleAccounts;
    case 'activities':
      return sampleActivities;
    case 'users':
      return sampleUsers;
    default:
      return [];
  }
}

describe('RAG Engine Integration Tests', () => {
  const testUserId = 'test-user-1';
  const testUserContext = {
    userId: testUserId,
    employeeId: '1',
    role: 'employee',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockedCreateSupabaseServerClient.mockReturnValue(createMockSupabaseClient() as any);
    mockedLoadConversationHistory.mockResolvedValue([]);
  });

  describe('Complete RAG Flow - QUERY Mode', () => {
    it('should complete full flow: Question → Intent → Query → Results → Answer', async () => {
      const question = 'How many contacts do I have?';

      // Mock intent classification
      mockedClassifyIntent.mockResolvedValueOnce({
        intent: {
          category: IntentCategory.CONTACT_QUERY,
          tables: ['contacts'],
          aggregationType: 'count',
        },
        confidence: 0.9,
        explanation: 'Counting contacts',
      });

      // Mock Gemini for answer generation
      // Mock the RPC call for SQL execution
      const mockClient = createMockSupabaseClient();
      mockClient.from = jest.fn(() => ({
        select: jest.fn(() => ({
          then: jest.fn((callback: any) => Promise.resolve(callback({ data: sampleContacts, error: null }))),
        })),
        rpc: jest.fn((fnName: string, params?: any) => {
          // Mock execute_query RPC
          return Promise.resolve({ data: sampleContacts, error: null });
        }),
      })) as any;
      mockedCreateSupabaseServerClient.mockReturnValue(mockClient as any);

      mockedRunGeminiWithFallback.mockResolvedValueOnce({
        answer: 'You have 3 contacts in your database.',
        data: sampleContacts,
        sql: 'SELECT COUNT(*) as count FROM contacts',
        confidence: 0.9,
        sources: ['contacts'],
      } as any);

      const startTime = Date.now();
      const result = await executeRAGQuery(question, testUserId, 'QUERY');
      const responseTime = Date.now() - startTime;

      // Verify complete flow
      expect(mockedClassifyIntent).toHaveBeenCalledWith(question, expect.any(Object));
      expect(result.answer).toBeTruthy();
      expect(result.data).toBeDefined();
      expect(result.sql).toBeTruthy();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.sources).toContain('contacts');
      
      // Verify response time
      expect(responseTime).toBeLessThan(3000); // < 3 seconds
    });

    it('should handle contact query with filters', async () => {
      const question = 'Show me contacts for Acme Corp';

      mockedClassifyIntent.mockResolvedValueOnce({
        intent: {
          category: IntentCategory.CONTACT_QUERY,
          tables: ['contacts', 'accounts'],
          filters: { 'accounts.name': 'Acme Corp' },
        },
        confidence: 0.85,
        explanation: 'Filtering contacts by account',
      });

      mockedRunGeminiWithFallback.mockResolvedValueOnce({ answer: 'You have 2 contacts for Acme Corp: John Doe and Jane Smith.' } as any);

      const result = await executeRAGQuery(question, testUserId, 'QUERY');

      expect(result.answer).toContain('Acme Corp');
      expect(result.data.length).toBe(2);
      expect(result.sources).toContain('accounts');
    });

    it('should handle aggregation queries', async () => {
      const question = 'What is the total value of all accounts?';

      mockedClassifyIntent.mockResolvedValueOnce({
        intent: {
          category: IntentCategory.AGGREGATION_QUERY,
          tables: ['accounts'],
          aggregationType: 'sum',
        },
        confidence: 0.9,
        explanation: 'Summing account values',
      });

      mockedRunGeminiWithFallback.mockResolvedValueOnce({ answer: 'The total potential value of all accounts is ₹300,000.' } as any);

      const result = await executeRAGQuery(question, testUserId, 'QUERY');

      expect(result.answer).toContain('300,000');
      expect(result.data).toBeDefined();
    });

    it('should handle activity queries with time range', async () => {
      const question = "What activities did I have this week?";

      mockedClassifyIntent.mockResolvedValueOnce({
        intent: {
          category: IntentCategory.ACTIVITY_QUERY,
          tables: ['activities'],
          timeRange: {
            start: '2024-01-15',
            end: '2024-01-21',
          },
        },
        confidence: 0.85,
        explanation: 'Filtering activities by time range',
      });

      mockedRunGeminiWithFallback.mockResolvedValueOnce({ answer: 'You had 3 activities this week: a call, a meeting, and an email.' } as any);

      const result = await executeRAGQuery(question, testUserId, 'QUERY');

      expect(result.answer).toContain('activities');
      expect(result.sql).toContain('created_at');
    });
  });

  describe('COACH Mode', () => {
    it('should provide coaching advice in COACH mode', async () => {
      const question = 'How can I improve my performance?';

      mockedClassifyIntent.mockResolvedValueOnce({
        intent: {
          category: IntentCategory.PERFORMANCE_QUERY,
          tables: ['activities', 'quotes_mbcb'],
        },
        confidence: 0.8,
        explanation: 'Performance coaching query',
      });

      mockedRunGeminiWithFallback.mockResolvedValueOnce({ answer: 'Based on your activity data, I recommend focusing on follow-up calls and increasing your quotation conversion rate. You have 3 activities this month, which is good, but consider reaching out to more high-value accounts.' } as any);

      const result = await executeRAGQuery(question, testUserId, 'COACH');

      expect(result.answer).toContain('recommend');
      expect(result.answer.length).toBeGreaterThan(50); // Substantial answer
      // NOTE: RAGResponse doesn't have mode property, removed this assertion
      // expect(result.mode).toBe('COACH');
    });

    it('should provide strategic advice based on data', async () => {
      const question = 'Which accounts need attention?';

      mockedClassifyIntent.mockResolvedValueOnce({
        intent: {
          category: IntentCategory.ACCOUNT_QUERY,
          tables: ['sub_accounts'],
          filters: { engagement_score: { $lt: 50 } },
        },
        confidence: 0.85,
        explanation: 'Finding low engagement accounts',
      });

      mockedRunGeminiWithFallback.mockResolvedValueOnce({ answer: 'I found 2 accounts with low engagement scores that need attention. I recommend scheduling follow-up calls and providing personalized value propositions to re-engage these accounts.' } as any);

      const result = await executeRAGQuery(question, testUserId, 'COACH');

      expect(result.answer).toContain('recommend');
      expect(result.answer).toContain('attention');
    });
  });

  describe('Conversation Continuity', () => {
    it('should handle follow-up questions with context', async () => {
      const initialQuestion = 'How many contacts do I have?';
      const followUpQuestion = 'What about for Acme Corp?';

      // Initial question
      mockedClassifyIntent.mockResolvedValueOnce({
        intent: {
          category: IntentCategory.CONTACT_QUERY,
          tables: ['contacts'],
          aggregationType: 'count',
        },
        confidence: 0.9,
        explanation: 'Counting contacts',
      });

      mockedRunGeminiWithFallback.mockResolvedValueOnce({
        answer: 'You have 3 contacts.',
        data: sampleContacts,
        sql: 'SELECT COUNT(*) FROM contacts',
        confidence: 0.9,
        sources: ['contacts'],
      } as any);

      await executeRAGQuery(initialQuestion, testUserId, 'QUERY');

      // Follow-up question (should use conversation history)
      mockedLoadConversationHistory.mockResolvedValueOnce([
        {
          role: 'user' as const,
          content: initialQuestion,
          mode: 'QUERY' as const,
          timestamp: String(Date.now() - 1000),
        },
        {
          role: 'assistant' as const,
          content: 'You have 3 contacts.',
          mode: 'QUERY' as const,
          timestamp: String(Date.now() - 1000),
        },
      ]);

      mockedClassifyIntent.mockResolvedValueOnce({
        intent: {
          category: IntentCategory.CONTACT_QUERY,
          tables: ['contacts', 'accounts'],
          filters: { 'accounts.name': 'Acme Corp' },
        },
        confidence: 0.9,
        explanation: 'Filtering contacts by account from previous context',
      });

      mockedRunGeminiWithFallback.mockResolvedValueOnce({ answer: 'You have 2 contacts for Acme Corp: John Doe and Jane Smith.' } as any);

      const result = await executeRAGQuery(followUpQuestion, testUserId, 'QUERY');

      expect(mockedLoadConversationHistory).toHaveBeenCalled();
      expect(result.answer).toContain('Acme Corp');
      expect(result.answer).toContain('2 contacts');
    });

    it('should maintain context across multiple turns', async () => {
      const questions = [
        'How many contacts do I have?',
        'What about for Acme Corp?',
        'Show me their email addresses',
      ];

      for (let i = 0; i < questions.length; i++) {
        const userMessages = i > 0 ? Array.from({ length: i }, (_, idx) => ({
          role: 'user' as const,
          content: questions[idx],
          mode: 'QUERY' as const,
          timestamp: String(Date.now() - (questions.length - idx) * 1000),
        })) : [];
        const assistantMessages = i > 0 ? Array.from({ length: i }, (_, idx) => ({
          role: 'assistant' as const,
          content: `Response ${idx + 1}`,
          mode: 'QUERY' as const,
          timestamp: String(Date.now() - (questions.length - idx) * 1000),
        })) : [];
        mockedLoadConversationHistory.mockResolvedValueOnce([...userMessages, ...assistantMessages]);

        mockedClassifyIntent.mockResolvedValueOnce({
          intent: {
            category: IntentCategory.CONTACT_QUERY,
            tables: ['contacts'],
          },
          confidence: 0.85,
          explanation: `Query ${i + 1}`,
        });

        mockedRunGeminiWithFallback.mockResolvedValueOnce({ answer: `Response to: ${questions[i]}` } as any);

        const result = await executeRAGQuery(questions[i], testUserId, 'QUERY');
        expect(result.answer).toBeTruthy();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid queries gracefully', async () => {
      const question = 'Invalid query that will fail';

      mockedClassifyIntent.mockRejectedValueOnce(new Error('Intent classification failed'));

      const result = await executeRAGQuery(question, testUserId, 'QUERY');

      expect(result.answer).toContain('error');
      expect(result.answer).toContain('rephrasing');
      expect(result.confidence).toBe(0);
      expect(result.data).toEqual([]);
    });

    it('should handle empty results in QUERY mode', async () => {
      const question = 'Show me contacts from non-existent account';

      mockedClassifyIntent.mockResolvedValueOnce({
        intent: {
          category: IntentCategory.CONTACT_QUERY,
          tables: ['contacts'],
          filters: { account_id: 999 },
        },
        confidence: 0.8,
        explanation: 'Filtering by account',
      });

      // Mock empty results
      // Mock empty results
      const mockClient = createMockSupabaseClient();
      const emptyQueryBuilder: any = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            then: jest.fn((callback: any) => Promise.resolve(callback({ data: [], error: null }))),
          })),
          then: jest.fn((callback: any) => Promise.resolve(callback({ data: [], error: null }))),
        })),
        rpc: jest.fn(() => Promise.resolve({ data: [], error: null })),
      };
      mockClient.from = jest.fn(() => emptyQueryBuilder);
      mockedCreateSupabaseServerClient.mockReturnValue(mockClient as any);

      mockedRunGeminiWithFallback.mockResolvedValueOnce({ answer: 'No contacts found for the specified criteria.' } as any);

      const result = await executeRAGQuery(question, testUserId, 'QUERY');

      expect(result.data).toEqual([]);
      expect(result.answer).toContain('No contacts found');
    });

    it('should handle database connection errors', async () => {
      const question = 'How many contacts do I have?';

      mockedClassifyIntent.mockResolvedValueOnce({
        intent: {
          category: IntentCategory.CONTACT_QUERY,
          tables: ['contacts'],
        },
        confidence: 0.9,
        explanation: 'Counting contacts',
      });

      // Mock database error
      const mockClient = createMockSupabaseClient();
      mockClient.from = jest.fn(() => ({
        select: jest.fn(() => ({
          then: jest.fn((callback: any) => Promise.resolve(callback({ data: null, error: { message: 'Database connection failed' } }))),
        })),
      })) as any;
      mockedCreateSupabaseServerClient.mockReturnValue(mockClient as any);

      const result = await executeRAGQuery(question, testUserId, 'QUERY');

      expect(result.answer).toContain('error');
      expect(result.data).toEqual([]);
    });

    it('should handle query building failures', async () => {
      const question = 'Complex query that fails to build';

      mockedClassifyIntent.mockResolvedValueOnce({
        intent: {
          category: IntentCategory.CONTACT_QUERY,
          tables: ['invalid_table'],
        },
        confidence: 0.7,
        explanation: 'Invalid table',
      });

      // Query building will fail, but should still return a response
      const result = await executeRAGQuery(question, testUserId, 'QUERY');

      expect(result.answer).toBeTruthy();
      expect(result.confidence).toBeLessThan(0.9); // Reduced confidence
    });
  });

  describe('Response Time', () => {
    it('should respond in less than 3 seconds for simple queries', async () => {
      const question = 'How many contacts do I have?';

      mockedClassifyIntent.mockResolvedValueOnce({
        intent: {
          category: IntentCategory.CONTACT_QUERY,
          tables: ['contacts'],
          aggregationType: 'count',
        },
        confidence: 0.9,
        explanation: 'Counting contacts',
      });

      mockedRunGeminiWithFallback.mockResolvedValueOnce({
        answer: 'You have 3 contacts.',
        data: sampleContacts,
        sql: 'SELECT COUNT(*) FROM contacts',
        confidence: 0.9,
        sources: ['contacts'],
      } as any);

      const startTime = Date.now();
      await executeRAGQuery(question, testUserId, 'QUERY');
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(3000);
    });

    it('should respond in less than 3 seconds for complex queries', async () => {
      const question = 'Show me contacts with their account information and recent activities';

      mockedClassifyIntent.mockResolvedValueOnce({
        intent: {
          category: IntentCategory.CONTACT_QUERY,
          tables: ['contacts', 'accounts', 'activities'],
        },
        confidence: 0.85,
        explanation: 'Complex multi-table query',
      });

      mockedRunGeminiWithFallback.mockResolvedValueOnce({ answer: 'Here are your contacts with account and activity information.' } as any);

      const startTime = Date.now();
      await executeRAGQuery(question, testUserId, 'QUERY');
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(3000);
    });
  });

  describe('Answer Quality', () => {
    it('should provide relevant answers based on data', async () => {
      const question = 'Who are my contacts?';

      mockedClassifyIntent.mockResolvedValueOnce({
        intent: {
          category: IntentCategory.CONTACT_QUERY,
          tables: ['contacts'],
        },
        confidence: 0.9,
        explanation: 'Listing contacts',
      });

      mockedRunGeminiWithFallback.mockResolvedValueOnce({ answer: 'You have 3 contacts: John Doe (john@example.com), Jane Smith (jane@example.com), and Bob Johnson (bob@example.com).' } as any);

      const result = await executeRAGQuery(question, testUserId, 'QUERY');

      expect(result.answer).toContain('John Doe');
      expect(result.answer).toContain('Jane Smith');
      expect(result.answer).toContain('Bob Johnson');
      expect(result.data.length).toBe(3);
    });

    it('should provide accurate numerical answers', async () => {
      const question = 'How many contacts do I have?';

      mockedClassifyIntent.mockResolvedValueOnce({
        intent: {
          category: IntentCategory.CONTACT_QUERY,
          tables: ['contacts'],
          aggregationType: 'count',
        },
        confidence: 0.9,
        explanation: 'Counting contacts',
      });

      mockedRunGeminiWithFallback.mockResolvedValueOnce({ answer: 'You have 3 contacts in your database.' } as any);

      const result = await executeRAGQuery(question, testUserId, 'QUERY');

      expect(result.answer).toContain('3');
      expect(result.data[0].count).toBe(3);
    });

    it('should cite data sources in answers', async () => {
      const question = 'Show me account information';

      mockedClassifyIntent.mockResolvedValueOnce({
        intent: {
          category: IntentCategory.ACCOUNT_QUERY,
          tables: ['accounts'],
        },
        confidence: 0.9,
        explanation: 'Fetching accounts',
      });

      mockedRunGeminiWithFallback.mockResolvedValueOnce({ answer: 'Here are your accounts: Acme Corp (manufacturing, ₹100,000) and Tech Inc (technology, ₹200,000).' } as any);

      const result = await executeRAGQuery(question, testUserId, 'QUERY');

      expect(result.sources).toContain('accounts');
      expect(result.answer).toContain('Acme Corp');
      expect(result.answer).toContain('Tech Inc');
    });
  });

  describe('User Context and Permissions', () => {
    it('should apply employee filters correctly', async () => {
      const question = 'Show my activities';

      mockedClassifyIntent.mockResolvedValueOnce({
        intent: {
          category: IntentCategory.ACTIVITY_QUERY,
          tables: ['activities'],
        },
        confidence: 0.9,
        explanation: 'Fetching user activities',
      });

      // Employee should only see their own activities
      const mockClient = createMockSupabaseClient();
      const employeeQueryBuilder: any = {
        select: jest.fn(() => ({
          eq: jest.fn((column: string, value: any) => {
            const chain: any = {
              then: jest.fn((callback: any) => {
                if (column === 'created_by' && value === '1') {
                  return Promise.resolve(callback({ 
                    data: sampleActivities.filter(a => a.created_by === 1), 
                    error: null 
                  }));
                }
                return Promise.resolve(callback({ data: [], error: null }));
              }),
            };
            return chain;
          }),
          then: jest.fn((callback: any) => Promise.resolve(callback({ data: sampleActivities.filter(a => a.created_by === 1), error: null }))),
        })),
        rpc: jest.fn((fnName: string, params?: any) => {
          // Mock RPC to return filtered activities
          return Promise.resolve({ data: sampleActivities.filter(a => a.created_by === 1), error: null });
        }),
      };
      mockClient.from = jest.fn(() => employeeQueryBuilder);
      mockedCreateSupabaseServerClient.mockReturnValue(mockClient as any);

      mockedRunGeminiWithFallback.mockResolvedValueOnce({ answer: 'You have 2 activities: a call and a meeting.' } as any);

      const result = await executeRAGQuery(question, testUserId, 'QUERY');

      expect(result.data.length).toBe(2);
      expect(result.sql).toContain('created_by');
    });

    it('should not apply filters for admin users', async () => {
      const adminUserId = 'admin-user-1';
      const question = 'Show all activities';

      mockedClassifyIntent.mockResolvedValueOnce({
        intent: {
          category: IntentCategory.ACTIVITY_QUERY,
          tables: ['activities'],
        },
        confidence: 0.9,
        explanation: 'Fetching all activities',
      });

      mockedRunGeminiWithFallback.mockResolvedValueOnce({ answer: 'There are 3 activities in total.' } as any);

      const result = await executeRAGQuery(question, adminUserId, 'QUERY');

      // Admin should see all activities (no created_by filter)
      expect(result.sql).not.toContain('created_by =');
      expect(result.data.length).toBe(3);
    });
  });

  describe('Caching', () => {
    it('should use cached results for repeated queries', async () => {
      const question = 'How many contacts do I have?';

      mockedClassifyIntent.mockResolvedValue({
        intent: {
          category: IntentCategory.CONTACT_QUERY,
          tables: ['contacts'],
          aggregationType: 'count',
        },
        confidence: 0.9,
        explanation: 'Counting contacts',
      });

      mockedRunGeminiWithFallback.mockResolvedValue({ answer: 'You have 3 contacts.' } as any);

      // First query
      const result1 = await executeRAGQuery(question, testUserId, 'QUERY');
      
      // Second query (should use cache)
      const result2 = await executeRAGQuery(question, testUserId, 'QUERY');

      expect(result1.answer).toBe(result2.answer);
      expect(result1.data).toEqual(result2.data);
    });
  });
});

