/**
 * PERFORMANCE OPTIMIZATION: Lightweight Client Cache for Page Switching
 * 
 * This cache stores recently loaded data in memory to make navigating
 * between CRM pages feel instantaneous.
 * 
 * Features:
 * - Stores leads, contacts, and accounts lists
 * - Automatic expiration (5 minutes)
 * - Lightweight - only stores essential data
 * - Works across page navigations
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CRMCache {
  [key: string]: CacheEntry<any>;
}

// Initialize cache on globalThis if it doesn't exist
const getCache = (): CRMCache => {
  if (typeof globalThis === 'undefined') {
    return {};
  }
  if (!globalThis.crmCache) {
    globalThis.crmCache = {};
  }
  return globalThis.crmCache as CRMCache;
};

const TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached data if it exists and hasn't expired
 */
export function getCachedData<T>(
  key: string
): T | null {
  const cache = getCache();
  const entry = cache[key] as CacheEntry<T> | undefined;

  if (!entry) {
    return null;
  }

  // Check if expired
  if (Date.now() > entry.expiresAt) {
    delete cache[key];
    return null;
  }

  return entry.data;
}

/**
 * Set data in cache with TTL
 */
export function setCachedData<T>(
  key: string,
  data: T
): void {
  const cache = getCache();
  const now = Date.now();

  cache[key] = {
    data,
    timestamp: now,
    expiresAt: now + TTL,
  } as CacheEntry<T>;
}

/**
 * Clear specific cache entry
 */
export function clearCachedData(key: string): void {
  const cache = getCache();
  delete cache[key];
}

/**
 * Clear all cache
 */
export function clearAllCache(): void {
  if (typeof globalThis !== 'undefined' && globalThis.crmCache) {
    globalThis.crmCache = {};
  }
}

/**
 * Get contacts for a specific sub-account (cached)
 */
export function getCachedSubAccounts(subAccountId: number): any[] | null {
  const cacheKey = `contacts_subaccount_${subAccountId}`;
  return getCachedData<any[]>(cacheKey);
}

/**
 * Set contacts for a specific sub-account (cached)
 */
export function setCachedSubAccounts(subAccountId: number, contacts: any[]): void {
  const cacheKey = `contacts_subaccount_${subAccountId}`;
  setCachedData(cacheKey, contacts);
}

// Type declaration for globalThis
declare global {
  var crmCache: CRMCache | undefined;
}
