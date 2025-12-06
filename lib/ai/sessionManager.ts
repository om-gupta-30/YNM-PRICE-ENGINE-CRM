/**
 * Session Manager
 * 
 * Manages conversation sessions with automatic expiration and database persistence.
 * Sessions expire after 30 minutes of inactivity.
 */

import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

/**
 * Session metadata stored in memory
 */
interface SessionMetadata {
  sessionId: string;
  userId: string;
  startedAt: Date;
  lastActivityAt: Date;
  endedAt?: Date;
}

/**
 * In-memory store for active sessions: sessionId -> SessionMetadata
 */
const activeSessions = new Map<string, SessionMetadata>();

/**
 * User to session mapping: userId -> sessionId
 */
const userSessions = new Map<string, string>();

/**
 * Session expiration time in milliseconds (30 minutes)
 */
const SESSION_EXPIRATION_MS = 30 * 60 * 1000;

/**
 * Cleanup interval in milliseconds (5 minutes)
 */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

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
 * Check if a session is expired
 */
function isSessionExpired(session: SessionMetadata): boolean {
  const now = Date.now();
  const lastActivity = session.lastActivityAt.getTime();
  return (now - lastActivity) > SESSION_EXPIRATION_MS;
}

/**
 * Clean up expired sessions
 */
async function cleanupExpiredSessions(): Promise<void> {
  const now = Date.now();
  const expiredSessions: string[] = [];
  
  for (const [sessionId, session] of activeSessions.entries()) {
    if (isSessionExpired(session)) {
      expiredSessions.push(sessionId);
    }
  }
  
  // End expired sessions
  for (const sessionId of expiredSessions) {
    await endSession(sessionId).catch(err => {
      console.error(`[Session Manager] Error ending expired session ${sessionId}:`, err.message);
    });
  }
  
  if (expiredSessions.length > 0) {
    console.log(`[Session Manager] Cleaned up ${expiredSessions.length} expired sessions`);
  }
}

/**
 * Start automatic cleanup interval
 */
function startCleanupInterval(): void {
  if (typeof setInterval !== 'undefined') {
    setInterval(() => {
      cleanupExpiredSessions().catch(err => {
        console.error('[Session Manager] Cleanup error:', err.message);
      });
    }, CLEANUP_INTERVAL_MS);
    
    console.log('[Session Manager] Started automatic cleanup interval');
  }
}

// Start cleanup on module load
startCleanupInterval();

/**
 * Get or create a session for a user
 * 
 * @param userId - User identifier
 * @returns Promise resolving to session ID
 */
export async function getOrCreateSession(userId: string): Promise<string> {
  try {
    // Check if user has an active session
    const existingSessionId = userSessions.get(userId);
    
    if (existingSessionId) {
      const session = activeSessions.get(existingSessionId);
      
      if (session && !isSessionExpired(session)) {
        // Update last activity
        session.lastActivityAt = new Date();
        
        // Update database (async, non-blocking)
        updateSessionActivity(existingSessionId).catch(err => {
          console.error(`[Session Manager] Error updating session activity:`, err.message);
        });
        
        return existingSessionId;
      } else if (session) {
        // Session expired, end it
        await endSession(existingSessionId).catch(() => {
          // Continue even if ending fails
        });
      }
    }
    
    // Create new session
    const newSessionId = generateUUID();
    const now = new Date();
    
    const sessionMetadata: SessionMetadata = {
      sessionId: newSessionId,
      userId,
      startedAt: now,
      lastActivityAt: now,
    };
    
    // Store in memory
    activeSessions.set(newSessionId, sessionMetadata);
    userSessions.set(userId, newSessionId);
    
    // Save to database (async, non-blocking)
    saveSessionToDatabase(newSessionId, userId, now).catch(err => {
      console.error(`[Session Manager] Error saving session to database:`, err.message);
    });
    
    console.log(`[Session Manager] Created new session ${newSessionId} for user ${userId}`);
    
    return newSessionId;
  } catch (error: any) {
    console.error('[Session Manager] Error getting/creating session:', error.message);
    // Fallback: return a new session ID even if database fails
    const fallbackSessionId = generateUUID();
    const now = new Date();
    
    activeSessions.set(fallbackSessionId, {
      sessionId: fallbackSessionId,
      userId,
      startedAt: now,
      lastActivityAt: now,
    });
    userSessions.set(userId, fallbackSessionId);
    
    return fallbackSessionId;
  }
}

/**
 * Get active session for a user
 * 
 * @param userId - User identifier
 * @returns Promise resolving to session ID or null if no active session
 */
export async function getActiveSession(userId: string): Promise<string | null> {
  try {
    // Check in-memory cache first
    const sessionId = userSessions.get(userId);
    
    if (sessionId) {
      const session = activeSessions.get(sessionId);
      
      if (session && !isSessionExpired(session)) {
        return sessionId;
      } else if (session) {
        // Session expired, clean it up
        await endSession(sessionId).catch(() => {
          // Continue even if ending fails
        });
        return null;
      }
    }
    
    // Check database for active session
    const dbSessionId = await getActiveSessionFromDatabase(userId);
    
    if (dbSessionId) {
      // Load session into memory
      const sessionMetadata = await loadSessionFromDatabase(dbSessionId);
      
      if (sessionMetadata && !isSessionExpired(sessionMetadata)) {
        activeSessions.set(dbSessionId, sessionMetadata);
        userSessions.set(userId, dbSessionId);
        return dbSessionId;
      }
    }
    
    return null;
  } catch (error: any) {
    console.error('[Session Manager] Error getting active session:', error.message);
    return null;
  }
}

/**
 * End a session
 * 
 * @param sessionId - Session identifier
 * @returns Promise that resolves when session is ended
 */
export async function endSession(sessionId: string): Promise<void> {
  try {
    const session = activeSessions.get(sessionId);
    
    if (!session) {
      console.warn(`[Session Manager] Session ${sessionId} not found in memory`);
      // Still try to end it in database
      await endSessionInDatabase(sessionId);
      return;
    }
    
    // Mark as ended
    session.endedAt = new Date();
    
    // Remove from active sessions
    activeSessions.delete(sessionId);
    userSessions.delete(session.userId);
    
    // Update database (async, non-blocking)
    await endSessionInDatabase(sessionId);
    
    console.log(`[Session Manager] Ended session ${sessionId} for user ${session.userId}`);
  } catch (error: any) {
    console.error(`[Session Manager] Error ending session ${sessionId}:`, error.message);
    throw error;
  }
}

/**
 * Save session to database
 */
async function saveSessionToDatabase(
  sessionId: string,
  userId: string,
  startedAt: Date
): Promise<void> {
  try {
    const supabase = createSupabaseServerClient();
    
    const { error } = await supabase
      .from('ai_sessions')
      .insert({
        id: sessionId,
        user_id: userId,
        started_at: startedAt.toISOString(),
        last_activity_at: startedAt.toISOString(),
        ended_at: null,
        metadata: {},
        created_at: startedAt.toISOString(),
      });
    
    if (error) {
      throw error;
    }
  } catch (error: any) {
    console.error('[Session Manager] Database save error:', error.message);
    throw error;
  }
}

/**
 * Update session activity in database
 */
async function updateSessionActivity(sessionId: string): Promise<void> {
  try {
    const supabase = createSupabaseServerClient();
    
    const { error } = await supabase
      .from('ai_sessions')
      .update({
        last_activity_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .is('ended_at', null);
    
    if (error) {
      throw error;
    }
  } catch (error: any) {
    console.error('[Session Manager] Database update error:', error.message);
    // Don't throw - this is a non-critical operation
  }
}

/**
 * Get active session from database
 */
async function getActiveSessionFromDatabase(userId: string): Promise<string | null> {
  try {
    const supabase = createSupabaseServerClient();
    
    const { data, error } = await supabase
      .from('ai_sessions')
      .select('id, last_activity_at')
      .eq('user_id', userId)
      .is('ended_at', null)
      .order('last_activity_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    // Check if session is expired
    const lastActivity = new Date(data.last_activity_at);
    const now = new Date();
    const timeSinceActivity = now.getTime() - lastActivity.getTime();
    
    if (timeSinceActivity > SESSION_EXPIRATION_MS) {
      // Session expired, end it
      await endSessionInDatabase(data.id);
      return null;
    }
    
    return data.id;
  } catch (error: any) {
    console.error('[Session Manager] Error getting active session from database:', error.message);
    return null;
  }
}

/**
 * Load session metadata from database
 */
async function loadSessionFromDatabase(sessionId: string): Promise<SessionMetadata | null> {
  try {
    const supabase = createSupabaseServerClient();
    
    const { data, error } = await supabase
      .from('ai_sessions')
      .select('id, user_id, started_at, last_activity_at, ended_at')
      .eq('id', sessionId)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return {
      sessionId: data.id,
      userId: data.user_id,
      startedAt: new Date(data.started_at),
      lastActivityAt: new Date(data.last_activity_at),
      endedAt: data.ended_at ? new Date(data.ended_at) : undefined,
    };
  } catch (error: any) {
    console.error('[Session Manager] Error loading session from database:', error.message);
    return null;
  }
}

/**
 * End session in database
 */
async function endSessionInDatabase(sessionId: string): Promise<void> {
  try {
    const supabase = createSupabaseServerClient();
    
    const { error } = await supabase
      .from('ai_sessions')
      .update({
        ended_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .is('ended_at', null);
    
    if (error) {
      throw error;
    }
  } catch (error: any) {
    console.error('[Session Manager] Error ending session in database:', error.message);
    throw error;
  }
}

/**
 * Get session statistics
 * 
 * @returns Object with session statistics
 */
export function getSessionStats(): {
  activeSessions: number;
  totalUsers: number;
} {
  return {
    activeSessions: activeSessions.size,
    totalUsers: userSessions.size,
  };
}

/**
 * Get database session statistics
 * 
 * @returns Promise resolving to database statistics
 */
export async function getDatabaseSessionStats(): Promise<{
  totalSessions: number;
  activeSessions: number;
  expiredSessions: number;
}> {
  try {
    const supabase = createSupabaseServerClient();
    const expirationTime = new Date(Date.now() - SESSION_EXPIRATION_MS).toISOString();
    
    // Get total sessions
    const { count: totalSessions } = await supabase
      .from('ai_sessions')
      .select('*', { count: 'exact', head: true });
    
    // Get active sessions
    const { count: activeSessions } = await supabase
      .from('ai_sessions')
      .select('*', { count: 'exact', head: true })
      .is('ended_at', null);
    
    // Get expired sessions (active but inactive for > 30 minutes)
    const { count: expiredSessions } = await supabase
      .from('ai_sessions')
      .select('*', { count: 'exact', head: true })
      .is('ended_at', null)
      .lt('last_activity_at', expirationTime);
    
    return {
      totalSessions: totalSessions || 0,
      activeSessions: activeSessions || 0,
      expiredSessions: expiredSessions || 0,
    };
  } catch (error: any) {
    console.error('[Session Manager] Error getting database stats:', error.message);
    return {
      totalSessions: 0,
      activeSessions: 0,
      expiredSessions: 0,
    };
  }
}

