/**
 * Next.js Instrumentation
 * 
 * This file runs code when the Next.js server starts.
 * Used to initialize background services like AI memory sync.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Only run on server-side (Node.js runtime)
    console.log('[Server Startup] Initializing background services...');
    
    try {
      // Import and schedule AI memory sync
      const { scheduleMemorySyncTrigger } = await import('@/lib/ai/liveMemoryEngine');
      scheduleMemorySyncTrigger();
      console.log('[Server Startup] AI memory sync scheduled successfully');
    } catch (error: any) {
      console.error('[Server Startup] Failed to initialize AI memory sync:', error?.message || error);
      // Don't throw - allow server to start even if memory sync fails
    }
  }
}

