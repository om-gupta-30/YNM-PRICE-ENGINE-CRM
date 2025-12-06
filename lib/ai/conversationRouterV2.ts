/**
 * Conversation Router V2
 * Routes conversations to COACH or QUERY mode based on message analysis
 * Uses Gemini AI with fallback heuristics for classification
 */

import { 
  getConversationMemory as getMemoryFromStore, 
  formatMemoryContext 
} from './conversationMemory';
import { runGeminiWithFallback } from '@/utils/ai';
import * as monitoring from './monitoring';

/**
 * Route decision result
 */
export interface RouteDecision {
  mode: 'COACH' | 'QUERY';
  confidence: number; // 0.0 to 1.0
  reason: string;
  suggestedMode?: 'COACH' | 'QUERY'; // Alternative mode if confidence is low
}

/**
 * Route conversation to appropriate mode (COACH or QUERY)
 * 
 * @param message - User's message
 * @param userId - User identifier
 * @param conversationHistory - Optional conversation history array
 * @returns RouteDecision with mode, confidence, reason, and optional suggestedMode
 */
export async function routeConversation(
  message: string,
  userId: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<RouteDecision> {
  const routingStartTime = Date.now();
  
  try {
    // Step 1: Get conversation memory if history not provided
    const history = conversationHistory || getConversationHistoryFromMemory(userId);
    
    // Step 2: Try Gemini classification first
    try {
      const geminiDecision = await classifyWithGemini(message, history);
      
      // Log routing decision
      const routingTime = Date.now() - routingStartTime;
      monitoring.logIntent({
        userId,
        question: message,
        intent: {
          category: geminiDecision.mode === 'QUERY' ? 'QUERY' as any : 'COACH' as any,
          tables: [],
        },
        confidence: geminiDecision.confidence,
        executionTime: routingTime,
      }).catch(err => console.error('[Conversation Router] Failed to log routing:', err));
      
      // If Gemini confidence is high, use it
      if (geminiDecision.confidence >= 0.7) {
        return geminiDecision;
      }
      
      // If Gemini confidence is medium, use heuristics as fallback
      if (geminiDecision.confidence >= 0.5) {
        const heuristicDecision = classifyWithHeuristics(message, history);
        
        // If heuristics agree, boost confidence
        if (heuristicDecision.mode === geminiDecision.mode) {
          return {
            ...geminiDecision,
            confidence: Math.min(0.95, geminiDecision.confidence + 0.1),
            reason: `${geminiDecision.reason} (confirmed by heuristics)`,
          };
        }
        
        // If they disagree, use heuristics with lower confidence and suggest alternative
        return {
          ...heuristicDecision,
          confidence: 0.6,
          suggestedMode: geminiDecision.mode,
          reason: `Heuristics suggest ${heuristicDecision.mode}, but AI suggests ${geminiDecision.mode}. Using heuristics.`,
        };
      }
      
      // Low confidence from Gemini, use heuristics and suggest Gemini's mode
      const heuristicDecision = classifyWithHeuristics(message, history);
      return {
        ...heuristicDecision,
        suggestedMode: geminiDecision.mode,
        reason: `Low AI confidence. Heuristics suggest ${heuristicDecision.mode}, AI suggests ${geminiDecision.mode}.`,
      };
    } catch (error: any) {
      console.warn('[Conversation Router] Gemini classification failed, using heuristics:', error.message);
      
      // Log error
      monitoring.logError({
        userId,
        operation: 'CONVERSATION_ROUTING',
        error,
        context: { message: message.substring(0, 100) },
        executionTime: Date.now() - routingStartTime,
      }).catch(err => console.error('[Conversation Router] Failed to log error:', err));
      
      // Fallback to heuristics if Gemini fails
      const heuristicDecision = classifyWithHeuristics(message, history);
      
      // Log heuristic decision
      const routingTime = Date.now() - routingStartTime;
      monitoring.logIntent({
        userId,
        question: message,
        intent: {
          category: heuristicDecision.mode === 'QUERY' ? 'QUERY' as any : 'COACH' as any,
          tables: [],
        },
        confidence: heuristicDecision.confidence,
        executionTime: routingTime,
      }).catch(err => console.error('[Conversation Router] Failed to log routing:', err));
      
      return heuristicDecision;
    }
  } catch (error: any) {
    console.error('[Conversation Router] Routing error:', error.message);
    
    // Log error
    monitoring.logError({
      userId,
      operation: 'CONVERSATION_ROUTING',
      error,
      context: { message: message.substring(0, 100) },
      executionTime: Date.now() - routingStartTime,
    }).catch(err => console.error('[Conversation Router] Failed to log error:', err));
    
    // Ultimate fallback: default to QUERY with low confidence
    return {
      mode: 'QUERY',
      confidence: 0.3,
      reason: 'Classification failed, defaulting to QUERY mode',
    };
  }
}

/**
 * Classify message using Gemini AI
 */
async function classifyWithGemini(
  message: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<RouteDecision> {
  const systemPrompt = `You are a conversation router for a CRM AI assistant. Your task is to classify user messages into one of two modes:

1. QUERY mode: User wants to retrieve data, see information, get facts, or query the database
   Examples: "How many contacts do I have?", "Show me my activities", "List all accounts", "What's my sales performance?"

2. COACH mode: User wants advice, guidance, strategic help, or coaching
   Examples: "How can I improve my sales?", "What should I do next?", "Give me tips", "Help me understand this"

Consider the conversation history to understand context. Follow-up questions often relate to the previous mode.

Respond with JSON:
{
  "mode": "QUERY" or "COACH",
  "confidence": 0.0 to 1.0,
  "reason": "brief explanation"
}`;

  let historyContext = '';
  if (history.length > 0) {
    historyContext = `\n\nConversation History:\n${history
      .slice(-3)
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n')}`;
  }

  const userPrompt = `Message to classify: "${message}"${historyContext}

Classify this message and return JSON with mode, confidence, and reason.`;

  const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

  try {
    interface GeminiResponse {
      mode?: 'COACH' | 'QUERY';
      confidence?: number;
      reason?: string;
    }

    const response = await runGeminiWithFallback<GeminiResponse>(fullPrompt);

    const mode = (response.mode === 'COACH' || response.mode === 'QUERY') 
      ? response.mode 
      : 'QUERY'; // Default fallback

    const confidence = typeof response.confidence === 'number'
      ? Math.max(0, Math.min(1, response.confidence))
      : 0.5;

    const reason = response.reason || 'Classified by AI';

    return {
      mode,
      confidence,
      reason,
    };
  } catch (error: any) {
    throw new Error(`Gemini classification failed: ${error.message}`);
  }
}

/**
 * Classify message using heuristic rules (fallback)
 */
function classifyWithHeuristics(
  message: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): RouteDecision {
  const messageLower = message.toLowerCase().trim();
  
  // QUERY mode keywords and patterns
  const queryKeywords = [
    'how many', 'how much', 'count', 'total', 'sum', 'average',
    'show me', 'list', 'display', 'find', 'search', 'get',
    'what is', 'what are', 'which', 'when did', 'where is',
    'tell me about', 'give me', 'show', 'see', 'view',
    'quotation', 'quote', 'contact', 'account', 'activity', 'lead',
    'performance', 'statistics', 'data', 'report', 'analytics',
  ];
  
  // COACH mode keywords and patterns
  const coachKeywords = [
    'how can i', 'how should i', 'what should i', 'what can i',
    'help me', 'advice', 'suggest', 'recommend', 'tip', 'tips',
    'improve', 'better', 'strategy', 'strategic', 'guidance',
    'coach', 'mentor', 'learn', 'understand', 'explain',
    'next step', 'what to do', 'how to', 'best practice',
    'encourage', 'motivate', 'support',
  ];
  
  // Check for query patterns
  const queryScore = queryKeywords.reduce((score, keyword) => {
    if (messageLower.includes(keyword)) {
      return score + 1;
    }
    return score;
  }, 0);
  
  // Check for coach patterns
  const coachScore = coachKeywords.reduce((score, keyword) => {
    if (messageLower.includes(keyword)) {
      return score + 1;
    }
    return score;
  }, 0);
  
  // Check for question words (tend to be queries)
  const questionWords = ['what', 'when', 'where', 'who', 'which', 'how many', 'how much'];
  const hasQuestionWord = questionWords.some(word => messageLower.startsWith(word));
  
  // Check conversation history for context
  let historyBias = 0; // -1 for COACH, +1 for QUERY
  if (history.length > 0) {
    const lastMessage = history[history.length - 1].content.toLowerCase();
    if (queryKeywords.some(kw => lastMessage.includes(kw))) {
      historyBias = 0.3; // Previous was query, follow-up might be too
    } else if (coachKeywords.some(kw => lastMessage.includes(kw))) {
      historyBias = -0.3; // Previous was coach, follow-up might be too
    }
  }
  
  // Calculate final scores
  const finalQueryScore = queryScore + (hasQuestionWord ? 1 : 0) + historyBias;
  const finalCoachScore = coachScore - historyBias;
  
  // Determine mode
  let mode: 'COACH' | 'QUERY';
  let confidence: number;
  let reason: string;
  
  if (finalQueryScore > finalCoachScore) {
    mode = 'QUERY';
    const totalScore = finalQueryScore + finalCoachScore;
    confidence = totalScore > 0 ? Math.min(0.9, 0.5 + (finalQueryScore / Math.max(1, totalScore)) * 0.4) : 0.5;
    reason = `Detected query patterns: ${queryScore} query keywords, ${hasQuestionWord ? 'question word detected' : ''}`;
  } else if (finalCoachScore > finalQueryScore) {
    mode = 'COACH';
    const totalScore = finalQueryScore + finalCoachScore;
    confidence = totalScore > 0 ? Math.min(0.9, 0.5 + (finalCoachScore / Math.max(1, totalScore)) * 0.4) : 0.5;
    reason = `Detected coaching patterns: ${coachScore} coach keywords`;
  } else {
    // Tie or ambiguous - default to QUERY but with lower confidence
    mode = 'QUERY';
    confidence = 0.4;
    reason = 'Ambiguous message, defaulting to QUERY mode';
  }
  
  // Add history context to reason if relevant
  if (history.length > 0 && Math.abs(historyBias) > 0) {
    reason += ` (influenced by conversation history)`;
  }
  
  return {
    mode,
    confidence,
    reason,
  };
}

/**
 * Get conversation history from memory store
 */
function getConversationHistoryFromMemory(
  userId: string
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const memory = getMemoryFromStore(userId);
  
  // Convert memory entries to conversation history format
  // Note: conversationMemory only stores messages, not roles
  // We'll assume all stored messages are from the user
  return memory.map(entry => ({
    role: 'user' as const,
    content: entry.message,
  }));
}

