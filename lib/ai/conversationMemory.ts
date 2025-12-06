/**
 * Conversation Memory
 * 
 * Hybrid in-memory and database-persisted conversation history.
 * Maintains active sessions in memory for fast access, with database persistence.
 */

import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

interface ConversationEntry {
  message: string;
  timestamp: number;
  response?: string;
  mode?: 'COACH' | 'QUERY';
  intent?: any;
}

interface ConversationTurn {
  userId: string;
  sessionId: string;
  message: string;
  response?: string;
  mode: 'COACH' | 'QUERY';
  intent?: any;
}

// In-memory store: sessionId -> conversation history (for active sessions)
const memoryStore = new Map<string, ConversationEntry[]>();

// Active session tracking: userId -> current sessionId
const activeSessions = new Map<string, string>();

/**
 * Save a conversation turn to database and memory
 * Auto-saves after each conversation turn
 * 
 * @param userId - User identifier
 * @param sessionId - Session identifier (optional, will create new if not provided)
 * @param message - User's message
 * @param response - AI's response (optional)
 * @param mode - Conversation mode: 'COACH' or 'QUERY'
 * @param intent - Intent classification data (optional)
 * @returns Promise resolving to the session ID used
 */
export async function saveConversationTurn(
  userId: string,
  sessionId: string | null,
  message: string,
  response?: string,
  mode: 'COACH' | 'QUERY' = 'QUERY',
  intent?: any
): Promise<string> {
  try {
    // Get or create session ID
    const finalSessionId = sessionId || getOrCreateSession(userId);
    
    // Save to database (async, non-blocking)
    saveToDatabase(userId, finalSessionId, message, response, mode, intent).catch(err => {
      console.error('[Conversation Memory] Database save failed:', err.message);
    });
    
    // Update in-memory cache
    const sessionHistory = memoryStore.get(finalSessionId) || [];
    sessionHistory.push({
      message,
      response,
      timestamp: Date.now(),
      mode,
      intent,
    });
    
    // Limit in-memory cache to last 10 interactions per session
    if (sessionHistory.length > 10) {
      sessionHistory.shift();
    }
    
    memoryStore.set(finalSessionId, sessionHistory);
    activeSessions.set(userId, finalSessionId);
    
    console.log(`[Conversation Memory] Saved turn for user ${userId}, session ${finalSessionId}`);
    
    return finalSessionId;
  } catch (error: any) {
    console.error('[Conversation Memory] Error saving conversation turn:', error.message);
    // Return session ID even if save fails
    return sessionId || getOrCreateSession(userId);
  }
}

/**
 * Save conversation turn to database
 */
async function saveToDatabase(
  userId: string,
  sessionId: string,
  message: string,
  response: string | undefined,
  mode: 'COACH' | 'QUERY',
  intent: any
): Promise<void> {
  try {
    const supabase = createSupabaseServerClient();
    
    const { error } = await supabase
      .from('ai_conversation_history')
      .insert({
        user_id: userId,
        session_id: sessionId,
        message,
        response: response || null,
        mode,
        intent: intent || null,
        created_at: new Date().toISOString(),
      });
    
    if (error) {
      throw error;
    }
  } catch (error: any) {
    console.error('[Conversation Memory] Database save error:', error.message);
    throw error;
  }
}

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
  // Use crypto.randomUUID if available (Node.js 14.17+, browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback: generate UUID v4 manually
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get or create a session ID for a user
 */
function getOrCreateSession(userId: string): string {
  // Check if user has an active session
  const existingSession = activeSessions.get(userId);
  if (existingSession) {
    return existingSession;
  }
  
  // Create new session ID
  const newSessionId = generateUUID();
  activeSessions.set(userId, newSessionId);
  return newSessionId;
}

/**
 * Load conversation history from database
 * 
 * @param userId - User identifier
 * @param sessionId - Session identifier (optional, loads most recent session if not provided)
 * @param limit - Maximum number of turns to load (default: 10)
 * @returns Promise resolving to array of conversation turns
 */
export async function loadConversationHistory(
  userId: string,
  sessionId?: string,
  limit: number = 10
): Promise<Array<{ role: 'user' | 'assistant'; content: string; mode?: 'COACH' | 'QUERY'; timestamp?: string }>> {
  try {
    const supabase = createSupabaseServerClient();
    
    let query = supabase
      .from('ai_conversation_history')
      .select('message, response, mode, created_at, session_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    
    // Filter by session if provided
    if (sessionId) {
      query = query.eq('session_id', sessionId);
    } else {
      // Get most recent session for user
      const { data: recentSession } = await supabase
        .from('ai_conversation_history')
        .select('session_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (recentSession?.session_id) {
        query = query.eq('session_id', recentSession.session_id);
      }
    }
    
    const { data, error } = await query.limit(limit);
    
    if (error) {
      throw error;
    }
    
    if (!data || data.length === 0) {
      return [];
    }
    
    // Convert to conversation history format
    const history: Array<{ role: 'user' | 'assistant'; content: string; mode?: 'COACH' | 'QUERY'; timestamp?: string }> = [];
    
    for (const turn of data) {
      // Add user message
      history.push({
        role: 'user',
        content: turn.message,
        mode: turn.mode as 'COACH' | 'QUERY',
        timestamp: turn.created_at,
      });
      
      // Add assistant response if available
      if (turn.response) {
        history.push({
          role: 'assistant',
          content: turn.response,
          mode: turn.mode as 'COACH' | 'QUERY',
          timestamp: turn.created_at,
        });
      }
    }
    
    // Update in-memory cache
    const finalSessionId = sessionId || data[0]?.session_id;
    if (finalSessionId) {
      const cachedHistory = history.map(h => ({
        message: h.role === 'user' ? h.content : '',
        response: h.role === 'assistant' ? h.content : undefined,
        timestamp: h.timestamp ? new Date(h.timestamp).getTime() : Date.now(),
        mode: h.mode,
      }));
      memoryStore.set(finalSessionId, cachedHistory);
      activeSessions.set(userId, finalSessionId);
    }
    
    return history;
  } catch (error: any) {
    console.error('[Conversation Memory] Error loading history:', error.message);
    return [];
  }
}

/**
 * Clear old conversations from database
 * 
 * @param daysOld - Number of days old to consider for deletion (default: 30)
 * @returns Promise resolving to number of deleted records
 */
export async function clearOldConversations(daysOld: number = 30): Promise<number> {
  try {
    const supabase = createSupabaseServerClient();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const { data, error } = await supabase
      .from('ai_conversation_history')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .select();
    
    if (error) {
      throw error;
    }
    
    const deletedCount = data?.length || 0;
    console.log(`[Conversation Memory] Cleared ${deletedCount} old conversations (older than ${daysOld} days)`);
    
    return deletedCount;
  } catch (error: any) {
    console.error('[Conversation Memory] Error clearing old conversations:', error.message);
    throw error;
  }
}

/**
 * Add a message to the conversation memory for a user (backward compatibility)
 * 
 * @param userId - User identifier
 * @param message - Message text to store
 */
export function addToConversationMemory(userId: string, message: string): void {
  const sessionId = getOrCreateSession(userId);
  const existing = memoryStore.get(sessionId) || [];
  existing.push({ message, timestamp: Date.now() });

  // Limit to last 5 interactions
  if (existing.length > 5) {
    existing.shift();
  }

  memoryStore.set(sessionId, existing);
  activeSessions.set(userId, sessionId);
  console.log(`[Conversation Memory] Added message for user ${userId}, session ${sessionId}, total history: ${existing.length}`);
}

/**
 * Get conversation history for a user from memory cache
 * 
 * @param userId - User identifier
 * @returns Array of conversation entries
 */
export function getConversationMemory(userId: string): ConversationEntry[] {
  const sessionId = activeSessions.get(userId);
  if (!sessionId) {
    return [];
  }
  return memoryStore.get(sessionId) || [];
}

/**
 * Get current session ID for a user
 * 
 * @param userId - User identifier
 * @returns Session ID or null if no active session
 */
export function getCurrentSession(userId: string): string | null {
  return activeSessions.get(userId) || null;
}

/**
 * Start a new session for a user
 * 
 * @param userId - User identifier
 * @returns New session ID
 */
export function startNewSession(userId: string): string {
  const newSessionId = generateUUID();
  activeSessions.set(userId, newSessionId);
  memoryStore.set(newSessionId, []);
  console.log(`[Conversation Memory] Started new session ${newSessionId} for user ${userId}`);
  return newSessionId;
}

/**
 * Format conversation memory as context string for AI prompts
 * 
 * @param userId - User identifier
 * @returns Formatted context string, or empty string if no history
 */
export function formatMemoryContext(userId: string): string {
  const history = getConversationMemory(userId);
  
  if (!history.length) {
    console.log(`[AI] ConversationMemory: No history for user ${userId}`);
    return '';
  }

  const context = `Conversation Context:\n${history.map(x => `• ${x.message}`).join('\n')}`;
  console.log(`[AI] ConversationMemory: Formatted ${history.length} previous messages for user ${userId}`);
  return context;
}

/**
 * Clear conversation memory for a user (useful for testing or reset)
 * Clears in-memory cache only, database records remain
 * 
 * @param userId - User identifier
 */
export function clearConversationMemory(userId: string): void {
  const sessionId = activeSessions.get(userId);
  if (sessionId) {
    memoryStore.delete(sessionId);
  }
  activeSessions.delete(userId);
  console.log(`[Conversation Memory] Cleared memory for user ${userId}`);
}

/**
 * Get memory statistics (for debugging/monitoring)
 * 
 * @returns Object with memory statistics
 */
export function getMemoryStats(): { 
  totalSessions: number; 
  totalMessages: number; 
  activeUsers: number;
} {
  let totalMessages = 0;
  memoryStore.forEach((entries) => {
    totalMessages += entries.length;
  });
  
  return {
    totalSessions: memoryStore.size,
    totalMessages,
    activeUsers: activeSessions.size,
  };
}

/**
 * Get database statistics (async)
 * 
 * @returns Promise resolving to database statistics
 */
export async function getDatabaseStats(): Promise<{
  totalConversations: number;
  totalSessions: number;
  conversationsByMode: Record<string, number>;
}> {
  try {
    const supabase = createSupabaseServerClient();
    
    // Get total conversations
    const { count: totalConversations } = await supabase
      .from('ai_conversation_history')
      .select('*', { count: 'exact', head: true });
    
    // Get unique sessions
    const { data: sessions } = await supabase
      .from('ai_conversation_history')
      .select('session_id')
      .limit(10000); // Reasonable limit
    
    const uniqueSessions = new Set(sessions?.map(s => s.session_id) || []);
    
    // Get conversations by mode
    const { data: modeData } = await supabase
      .from('ai_conversation_history')
      .select('mode')
      .limit(10000);
    
    const conversationsByMode: Record<string, number> = {};
    modeData?.forEach(item => {
      const mode = item.mode || 'UNKNOWN';
      conversationsByMode[mode] = (conversationsByMode[mode] || 0) + 1;
    });
    
    return {
      totalConversations: totalConversations || 0,
      totalSessions: uniqueSessions.size,
      conversationsByMode,
    };
  } catch (error: any) {
    console.error('[Conversation Memory] Error getting database stats:', error.message);
    return {
      totalConversations: 0,
      totalSessions: 0,
      conversationsByMode: {},
    };
  }
}

