/**
 * Test suite for Intent Classifier
 * Tests intent classification using examples and edge cases
 */

import { classifyIntent } from '@/lib/ai/intentClassifier';
import { INTENT_EXAMPLES } from '@/lib/ai/intentExamples';
import { IntentCategory, IntentClassificationResult } from '@/lib/ai/types/intentTypes';
import { runGemini } from '@/utils/ai';

// Mock the Gemini AI utility
jest.mock('@/utils/ai', () => ({
  runGemini: jest.fn(),
}));

const mockedRunGemini = runGemini as jest.MockedFunction<typeof runGemini>;

describe('Intent Classifier', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Example Questions from INTENT_EXAMPLES', () => {
    INTENT_EXAMPLES.forEach((example, index) => {
      it(`should correctly classify example ${index + 1}: "${example.question}"`, async () => {
        // Mock Gemini response to match expected intent
        mockedRunGemini.mockResolvedValueOnce({
          intent: example.expectedIntent,
          confidence: 0.85,
          explanation: `Classified as ${example.expectedIntent.category} based on question analysis.`,
        } as IntentClassificationResult);

        const result = await classifyIntent(example.question);

        // Verify correct category
        expect(result.intent.category).toBe(example.expectedIntent.category);

        // Verify tables match (order may vary, so check if all expected tables are present)
        const resultTables = result.intent.tables.map(t => t.toLowerCase()).sort();
        const expectedTables = example.expectedTables.map(t => t.toLowerCase()).sort();
        expect(resultTables).toEqual(expectedTables);

        // Verify confidence is reasonable
        expect(result.confidence).toBeGreaterThanOrEqual(0.7);
        expect(result.confidence).toBeLessThanOrEqual(1.0);

        // Verify explanation exists
        expect(result.explanation).toBeTruthy();
        expect(typeof result.explanation).toBe('string');
      });
    });
  });

  describe('Confidence Scores', () => {
    it('should return confidence > 0.7 for clear questions', async () => {
      const clearQuestions = [
        'How many contacts do I have?',
        'Show me all active accounts',
        'List all quotations',
      ];

      for (const question of clearQuestions) {
        mockedRunGemini.mockResolvedValueOnce({
          intent: {
            category: IntentCategory.CONTACT_QUERY,
            tables: ['contacts'],
            filters: {},
          },
          confidence: 0.9,
          explanation: 'Clear intent detected',
        } as IntentClassificationResult);

        const result = await classifyIntent(question);
        expect(result.confidence).toBeGreaterThan(0.7);
      }
    });

    it('should handle lower confidence for ambiguous questions', async () => {
      mockedRunGemini.mockResolvedValueOnce({
        intent: {
          category: IntentCategory.CONTACT_QUERY,
          tables: ['contacts'],
          filters: {},
        },
        confidence: 0.6,
        explanation: 'Ambiguous question, lower confidence',
      } as IntentClassificationResult);

      const result = await classifyIntent('What about that thing?');
      expect(result.confidence).toBeGreaterThanOrEqual(0.0);
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string gracefully', async () => {
      mockedRunGemini.mockResolvedValueOnce({
        intent: {
          category: IntentCategory.CONTACT_QUERY,
          tables: ['contacts'],
          filters: {},
        },
        confidence: 0.3,
        explanation: 'Empty question, defaulting to safe fallback',
      } as IntentClassificationResult);

      const result = await classifyIntent('');
      
      // Should return a valid result (fallback)
      expect(result.intent.category).toBeDefined();
      expect(result.intent.tables.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThanOrEqual(0.0);
    });

    it('should handle questions with typos', async () => {
      const typoQuestions = [
        'How many contatcs do I have?', // typo: contatcs
        'Show me all acounts', // typo: acounts
        'List all quoatations', // typo: quoatations
      ];

      for (const question of typoQuestions) {
        mockedRunGemini.mockResolvedValueOnce({
          intent: {
            category: IntentCategory.CONTACT_QUERY,
            tables: ['contacts'],
            filters: {},
          },
          confidence: 0.75,
          explanation: 'Intent detected despite typos',
        } as IntentClassificationResult);

        const result = await classifyIntent(question);
        expect(result.intent.category).toBeDefined();
        expect(result.intent.tables.length).toBeGreaterThan(0);
      }
    });

    it('should handle ambiguous questions', async () => {
      const ambiguousQuestions = [
        'What about that?',
        'Show me stuff',
        'Tell me something',
        'I need help',
      ];

      for (const question of ambiguousQuestions) {
        mockedRunGemini.mockResolvedValueOnce({
          intent: {
            category: IntentCategory.CONTACT_QUERY,
            tables: ['contacts'],
            filters: {},
          },
          confidence: 0.5,
          explanation: 'Ambiguous question, using default classification',
        } as IntentClassificationResult);

        const result = await classifyIntent(question);
        expect(result.intent.category).toBeDefined();
        // Ambiguous questions may have lower confidence
        expect(result.confidence).toBeGreaterThanOrEqual(0.0);
      }
    });

    it('should handle very long questions', async () => {
      const longQuestion = 'Can you please show me all of the contacts that I have in my database that are associated with accounts that have a high engagement score and are located in major cities and have been active in the last month?';
      
      mockedRunGemini.mockResolvedValueOnce({
        intent: {
          category: IntentCategory.CONTACT_QUERY,
          tables: ['contacts', 'sub_accounts', 'accounts'],
          filters: {
            engagement_score: { $gt: 50 },
            is_active: true,
          },
        },
        confidence: 0.85,
        explanation: 'Complex query with multiple conditions',
      } as IntentClassificationResult);

      const result = await classifyIntent(longQuestion);
      expect(result.intent.category).toBeDefined();
      expect(result.intent.tables.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should handle questions with special characters', async () => {
      const specialCharQuestions = [
        'Show contacts with email: test@example.com',
        'Find accounts with value > $100,000',
        'List quotations from 2024-01-01 to 2024-12-31',
      ];

      for (const question of specialCharQuestions) {
        mockedRunGemini.mockResolvedValueOnce({
          intent: {
            category: IntentCategory.CONTACT_QUERY,
            tables: ['contacts'],
            filters: {},
          },
          confidence: 0.8,
          explanation: 'Question with special characters processed',
        } as IntentClassificationResult);

        const result = await classifyIntent(question);
        expect(result.intent.category).toBeDefined();
        expect(result.intent.tables.length).toBeGreaterThan(0);
      }
    });

    it('should handle questions in different cases', async () => {
      const caseVariations = [
        'HOW MANY CONTACTS DO I HAVE?', // UPPERCASE
        'how many contacts do i have?', // lowercase
        'HoW mAnY cOnTaCtS dO i HaVe?', // MiXeD cAsE
      ];

      for (const question of caseVariations) {
        mockedRunGemini.mockResolvedValueOnce({
          intent: {
            category: IntentCategory.CONTACT_QUERY,
            tables: ['contacts'],
            filters: {},
            aggregationType: 'count',
          },
          confidence: 0.85,
          explanation: 'Case-insensitive classification',
        } as IntentClassificationResult);

        const result = await classifyIntent(question);
        expect(result.intent.category).toBe(IntentCategory.CONTACT_QUERY);
        expect(result.intent.tables).toContain('contacts');
      }
    });
  });

  describe('Error Handling', () => {
    it('should return fallback result when Gemini API fails', async () => {
      mockedRunGemini.mockRejectedValueOnce(new Error('API Error'));

      const result = await classifyIntent('How many contacts do I have?');

      // Should return safe fallback
      expect(result.intent.category).toBe(IntentCategory.CONTACT_QUERY);
      expect(result.intent.tables).toContain('contacts');
      expect(result.confidence).toBe(0.3); // Default low confidence for errors
      expect(result.explanation).toContain('Failed to classify intent');
    });

    it('should handle invalid JSON response from Gemini', async () => {
      // Mock a response that's not valid JSON structure
      mockedRunGemini.mockResolvedValueOnce({
        invalid: 'response',
      } as any);

      const result = await classifyIntent('How many contacts?');

      // Should still return a valid result (fallback)
      expect(result.intent.category).toBeDefined();
      expect(result.intent.tables.length).toBeGreaterThan(0);
    });

    it('should handle null/undefined response', async () => {
      mockedRunGemini.mockResolvedValueOnce(null as any);

      const result = await classifyIntent('Test question');

      // Should return fallback
      expect(result.intent.category).toBe(IntentCategory.CONTACT_QUERY);
      expect(result.intent.tables).toContain('contacts');
    });
  });

  describe('Intent Category Validation', () => {
    it('should only return valid IntentCategory values', async () => {
      const allCategories = Object.values(IntentCategory);

      for (const category of allCategories) {
        mockedRunGemini.mockResolvedValueOnce({
          intent: {
            category: category,
            tables: ['contacts'],
            filters: {},
          },
          confidence: 0.85,
          explanation: `Testing ${category} category`,
        } as IntentClassificationResult);

        const result = await classifyIntent(`Test question for ${category}`);
        expect(allCategories).toContain(result.intent.category);
      }
    });

    it('should fallback to CONTACT_QUERY for invalid category', async () => {
      mockedRunGemini.mockResolvedValueOnce({
        intent: {
          category: 'INVALID_CATEGORY' as any,
          tables: ['contacts'],
          filters: {},
        },
        confidence: 0.85,
        explanation: 'Invalid category test',
      } as IntentClassificationResult);

      const result = await classifyIntent('Test question');
      expect(result.intent.category).toBe(IntentCategory.CONTACT_QUERY);
    });
  });

  describe('Table Detection', () => {
    it('should return at least one table for all queries', async () => {
      const testQuestions = [
        'How many contacts?',
        'Show accounts',
        'List activities',
        'What quotations?',
      ];

      for (const question of testQuestions) {
        mockedRunGemini.mockResolvedValueOnce({
          intent: {
            category: IntentCategory.CONTACT_QUERY,
            tables: ['contacts'],
            filters: {},
          },
          confidence: 0.85,
          explanation: 'Table detection test',
        } as IntentClassificationResult);

        const result = await classifyIntent(question);
        expect(result.intent.tables.length).toBeGreaterThan(0);
        expect(Array.isArray(result.intent.tables)).toBe(true);
      }
    });

    it('should handle empty tables array by providing default', async () => {
      mockedRunGemini.mockResolvedValueOnce({
        intent: {
          category: IntentCategory.CONTACT_QUERY,
          tables: [],
          filters: {},
        },
        confidence: 0.85,
        explanation: 'Empty tables test',
      } as IntentClassificationResult);

      const result = await classifyIntent('Test question');
      // Should default to ['contacts']
      expect(result.intent.tables.length).toBeGreaterThan(0);
      expect(result.intent.tables).toContain('contacts');
    });
  });

  describe('Filter Extraction', () => {
    it('should extract filters from questions', async () => {
      mockedRunGemini.mockResolvedValueOnce({
        intent: {
          category: IntentCategory.ACCOUNT_QUERY,
          tables: ['sub_accounts'],
          filters: {
            engagement_score: { $lt: 50 },
            is_active: true,
          },
        },
        confidence: 0.9,
        explanation: 'Filters extracted successfully',
      } as IntentClassificationResult);

      const result = await classifyIntent('Show accounts with engagement score below 50');
      
      expect(result.intent.filters).toBeDefined();
      expect(typeof result.intent.filters).toBe('object');
    });

    it('should handle questions without filters', async () => {
      mockedRunGemini.mockResolvedValueOnce({
        intent: {
          category: IntentCategory.CONTACT_QUERY,
          tables: ['contacts'],
          filters: {},
        },
        confidence: 0.85,
        explanation: 'No filters needed',
      } as IntentClassificationResult);

      const result = await classifyIntent('How many contacts do I have?');
      
      expect(result.intent.filters).toBeDefined();
      expect(typeof result.intent.filters).toBe('object');
    });
  });

  describe('Aggregation Detection', () => {
    it('should detect aggregation types in questions', async () => {
      const aggregationTests = [
        {
          question: 'How many contacts?',
          expectedAggregation: 'count',
        },
        {
          question: 'What is the total revenue?',
          expectedAggregation: 'sum',
        },
        {
          question: 'What is the average engagement score?',
          expectedAggregation: 'average',
        },
      ];

      for (const test of aggregationTests) {
        mockedRunGemini.mockResolvedValueOnce({
          intent: {
            category: IntentCategory.AGGREGATION_QUERY,
            tables: ['contacts'],
            filters: {},
            aggregationType: test.expectedAggregation,
          },
          confidence: 0.9,
          explanation: `Aggregation type: ${test.expectedAggregation}`,
        } as IntentClassificationResult);

        const result = await classifyIntent(test.question);
        expect(result.intent.aggregationType).toBe(test.expectedAggregation);
      }
    });
  });

  describe('Time Range Detection', () => {
    it('should detect time ranges in questions', async () => {
      mockedRunGemini.mockResolvedValueOnce({
        intent: {
          category: IntentCategory.ACTIVITY_QUERY,
          tables: ['activities'],
          filters: {},
          timeRange: {
            start: '2024-01-01',
            end: '2024-01-31',
          },
        },
        confidence: 0.9,
        explanation: 'Time range detected',
      } as IntentClassificationResult);

      const result = await classifyIntent("What's my activity count this week?");
      
      expect(result.intent.timeRange).toBeDefined();
      expect(result.intent.timeRange?.start).toBeDefined();
    });

    it('should handle questions without time ranges', async () => {
      mockedRunGemini.mockResolvedValueOnce({
        intent: {
          category: IntentCategory.CONTACT_QUERY,
          tables: ['contacts'],
          filters: {},
        },
        confidence: 0.85,
        explanation: 'No time range needed',
      } as IntentClassificationResult);

      const result = await classifyIntent('How many contacts do I have?');
      
      // timeRange should be undefined or not present
      expect(result.intent.timeRange === undefined || result.intent.timeRange === null).toBe(true);
    });
  });

  describe('User Context Handling', () => {
    it('should pass user context to classifier', async () => {
      const userContext = {
        userId: 'user123',
        role: 'employee',
      };

      mockedRunGemini.mockResolvedValueOnce({
        intent: {
          category: IntentCategory.CONTACT_QUERY,
          tables: ['contacts'],
          filters: {},
        },
        confidence: 0.85,
        explanation: 'User context considered',
      } as IntentClassificationResult);

      await classifyIntent('How many contacts do I have?', userContext);

      // Verify that runGemini was called with user context
      expect(mockedRunGemini).toHaveBeenCalled();
      const callArgs = mockedRunGemini.mock.calls[0];
      expect(callArgs.length).toBeGreaterThanOrEqual(2);
    });
  });
});

