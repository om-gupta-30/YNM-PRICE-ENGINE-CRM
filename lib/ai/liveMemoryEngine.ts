/**
 * Live Memory Engine
 * 
 * Continuously updates AI knowledge in the background, ensuring AI always has
 * the latest business context even when not actively queried.
 */

import { loadBusinessKnowledge } from './knowledgeLoader';
import { syncAIKnowledge } from './knowledgeSync';

let lastRefresh = 0;
const MIN_REFRESH_INTERVAL = 60 * 1000; // 1 minute

let syncInterval: NodeJS.Timeout | null = null;

/**
 * Update AI memory with latest business knowledge
 * 
 * Throttled to prevent excessive database queries.
 * 
 * @param event - Optional event that triggered the update
 */
export async function updateAIMemory(event?: any): Promise<void> {
  const now = Date.now();

  // Throttle calls so we don't spam DB
  if (now - lastRefresh < MIN_REFRESH_INTERVAL) {
    console.log('[AI Live Memory] Skipped (throttled)');
    return;
  }

  lastRefresh = now;

  console.log('[AI Live Memory] Refreshing knowledge snapshot...');

  try {
    await loadBusinessKnowledge({ forceRefresh: true });
    console.log('[AI Live Memory] Refreshed successfully');
  } catch (err: any) {
    console.error('[AI Live Memory] Failed to refresh:', err?.message || err);
  }
}

/**
 * Schedule background memory sync to run continuously
 * 
 * Starts an interval that refreshes AI memory every MIN_REFRESH_INTERVAL.
 * This ensures AI always has up-to-date business knowledge even when not queried.
 * 
 * Note: In Next.js, this should be called from instrumentation.ts or server startup.
 */
export function scheduleMemorySyncTrigger(): void {
  // Prevent multiple intervals from being created
  if (syncInterval) {
    console.log('[AI Live Memory] Sync already scheduled, skipping');
    return;
  }

  console.log('[AI Live Memory] Scheduling background memory sync');

  // Initial refresh after a short delay to let server fully start
  setTimeout(() => {
    updateAIMemory({ type: 'initial' }).catch(err => {
      console.error('[AI Live Memory] Initial refresh failed:', err);
    });
  }, 5000); // 5 seconds after server start

  // Schedule periodic refreshes
  syncInterval = setInterval(() => {
    updateAIMemory({ type: 'scheduled' }).catch(err => {
      console.error('[AI Live Memory] Scheduled refresh failed:', err);
    });
  }, MIN_REFRESH_INTERVAL);

  console.log(`[AI Live Memory] Background sync scheduled (interval: ${MIN_REFRESH_INTERVAL / 1000}s)`);
}

/**
 * Stop the background memory sync
 * 
 * Useful for cleanup or testing
 */
export function stopMemorySync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log('[AI Live Memory] Background sync stopped');
  }
}

