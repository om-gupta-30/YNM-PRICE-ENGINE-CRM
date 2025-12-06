/**
 * AI Knowledge Sync Service
 * 
 * Automatically refreshes AI knowledge cache when CRM or pricing data changes.
 * This ensures AI always has up-to-date context for reasoning.
 * 
 * All sync operations are fire-and-forget (async, non-blocking).
 */

import { loadBusinessKnowledge } from './knowledgeLoader';

export interface KnowledgeSyncEvent {
  type: 'quotation' | 'contact' | 'activity' | 'engagement' | 'pricingWin' | 'pricingLoss';
  id?: string;
  entityId?: string | number;
}

/**
 * Sync AI knowledge after data changes
 * 
 * This function triggers a refresh of the business knowledge cache.
 * It's intentionally simple - just calls the loader to rebuild cached knowledge.
 * 
 * @param event - Event type and optional entity ID
 */
export async function syncAIKnowledge(event: KnowledgeSyncEvent): Promise<void> {
  console.log('[AI Knowledge Sync] Refresh triggered:', event);

  try {
    // Intentionally simple — call our loader to rebuild cached knowledge
    // The loader will fetch fresh data from the database
    // Note: loadBusinessKnowledge doesn't currently support forceRefresh,
    // but calling it without context will refresh company-level insights
    await loadBusinessKnowledge();
    
    console.log('[AI Knowledge Sync] Knowledge refresh completed');
  } catch (error: any) {
    // Don't throw - this is fire-and-forget
    console.warn('[AI Knowledge Sync] Failed to refresh knowledge:', error.message);
  }
}

/**
 * Helper to trigger sync without blocking
 * Use this for fire-and-forget sync operations
 */
export function triggerKnowledgeSync(event: KnowledgeSyncEvent): void {
  // Fire and forget - don't await
  syncAIKnowledge(event).catch(err => {
    console.warn('[AI Knowledge Sync] Async sync failed:', err.message);
  });
}

