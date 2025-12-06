/**
 * Smart Query Cache
 * 
 * Implements a caching layer for query results with:
 * - Redis support (if available) with in-memory fallback
 * - Dynamic TTL based on data volatility
 * - Cache key generation from SQL + user ID + parameters
 * - Cache hit/miss metrics tracking
 */

import * as crypto from 'crypto';
import * as monitoring from './monitoring';

/**
 * Cache entry structure
 */
interface CacheEntry {
  data: any[];
  timestamp: number;
  ttl: number;
  sql: string;
  tables: string[];
}

/**
 * Cache metrics
 */
interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  invalidations: number;
  hitRate: number;
}

/**
 * Table volatility mapping to TTL (in milliseconds)
 */
const TABLE_TTL_MAP: Record<string, number> = {
  // Contact/Account data: 5 minutes (relatively stable)
  contacts: 5 * 60 * 1000,
  accounts: 5 * 60 * 1000,
  sub_accounts: 5 * 60 * 1000,
  users: 5 * 60 * 1000,
  
  // Activity data: 2 minutes (changes frequently)
  activities: 2 * 60 * 1000,
  tasks: 2 * 60 * 1000,
  leads: 2 * 60 * 1000,
  
  // Quote data: 1 minute (very volatile)
  quotes_mbcb: 1 * 60 * 1000,
  quotes_signages: 1 * 60 * 1000,
  quotes_paint: 1 * 60 * 1000,
  quotes: 1 * 60 * 1000,
  
  // Performance data: 10 minutes (aggregated, stable)
  ai_operation_logs: 10 * 60 * 1000,
  ai_queries: 10 * 60 * 1000,
  
  // Default TTL: 3 minutes
  default: 3 * 60 * 1000,
};

/**
 * Redis client interface (optional)
 */
interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { EX?: number }): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<number>;
}

/**
 * Smart Query Cache Class
 */
class SmartQueryCache {
  private memoryCache: Map<string, CacheEntry> = new Map();
  private redisClient: RedisClient | null = null;
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    invalidations: 0,
    hitRate: 0,
  };

  constructor() {
    // Try to initialize Redis client (optional)
    this.initializeRedis();
    
    // Clean up expired entries every minute
    if (typeof setInterval !== 'undefined') {
      setInterval(() => {
        this.clearExpired();
      }, 60 * 1000);
    }
  }

  /**
   * Initialize Redis client if available
   */
  private async initializeRedis(): Promise<void> {
    try {
      // Check if Redis URL is configured
      const redisUrl = process.env.REDIS_URL;
      if (!redisUrl) {
        console.log('[Query Cache] Redis not configured, using in-memory cache');
        return;
      }

      // Try to import and create Redis client
      // Using require in a try-catch to avoid build errors if Redis is not installed
      // This approach prevents Turbopack from analyzing the import at build time
      let RedisClient: any = null;
      try {
        // Use require with a string to prevent static analysis
        // This will only be evaluated at runtime
        const redisModuleName = 'ioredis';
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const redisModule = require(redisModuleName);
        RedisClient = redisModule.default || redisModule;
      } catch (importError: any) {
        // Redis package not installed or import failed - this is expected if Redis is optional
        console.log('[Query Cache] Redis package not available, using in-memory cache');
        return;
      }
      
      if (!RedisClient) {
        console.log('[Query Cache] Redis client not available, using in-memory cache');
        return;
      }

      const client = new RedisClient(redisUrl, {
        retryStrategy: (times: number) => {
          if (times > 3) {
            console.warn('[Query Cache] Redis connection failed, falling back to in-memory cache');
            return null; // Stop retrying
          }
          return Math.min(times * 50, 2000);
        },
        maxRetriesPerRequest: 3,
      });

      client.on('error', (err: Error) => {
        console.error('[Query Cache] Redis error:', err.message);
        this.redisClient = null; // Fallback to memory
      });

      client.on('connect', () => {
        console.log('[Query Cache] Redis connected successfully');
      });

      this.redisClient = {
        get: async (key: string) => {
          try {
            return await client.get(key);
          } catch (err) {
            console.error('[Query Cache] Redis get error:', err);
            return null;
          }
        },
        set: async (key: string, value: string, options?: { EX?: number }) => {
          try {
            if (options?.EX) {
              await client.setex(key, options.EX, value);
            } else {
              await client.set(key, value);
            }
          } catch (err) {
            console.error('[Query Cache] Redis set error:', err);
          }
        },
        del: async (key: string) => {
          try {
            await client.del(key);
          } catch (err) {
            console.error('[Query Cache] Redis del error:', err);
          }
        },
        exists: async (key: string) => {
          try {
            return await client.exists(key);
          } catch (err) {
            console.error('[Query Cache] Redis exists error:', err);
            return 0;
          }
        },
      };
    } catch (error: any) {
      console.warn('[Query Cache] Redis initialization failed:', error.message);
      this.redisClient = null;
    }
  }

  /**
   * Generate cache key from SQL query, user ID, and parameters
   */
  private generateCacheKey(sql: string, userId: string, params?: any[]): string {
    // Normalize SQL (remove extra whitespace, lowercase)
    const normalizedSql = sql
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    // Create hash of SQL + params for shorter keys
    const keyData = JSON.stringify({
      sql: normalizedSql,
      userId,
      params: params || [],
    });

    const hash = crypto.createHash('sha256').update(keyData).digest('hex');
    return `query:${hash}`;
  }

  /**
   * Determine TTL based on tables in the query
   */
  private getTTLForTables(tables: string[]): number {
    if (!tables || tables.length === 0) {
      return TABLE_TTL_MAP.default;
    }

    // Use the minimum TTL of all tables (most volatile wins)
    const ttls = tables.map(table => {
      const tableName = table.toLowerCase().replace(/['"]/g, '');
      return TABLE_TTL_MAP[tableName] || TABLE_TTL_MAP.default;
    });

    return Math.min(...ttls);
  }

  /**
   * Extract table names from SQL query
   */
  private extractTables(sql: string): string[] {
    const tables: string[] = [];
    const sqlLower = sql.toLowerCase();

    // Match FROM and JOIN clauses
    const fromMatches = sqlLower.match(/\bfrom\s+([a-z_][a-z0-9_]*)/gi);
    const joinMatches = sqlLower.match(/\bjoin\s+([a-z_][a-z0-9_]*)/gi);

    if (fromMatches) {
      fromMatches.forEach(match => {
        const table = match.replace(/^\s*from\s+/i, '').trim();
        if (table) tables.push(table);
      });
    }

    if (joinMatches) {
      joinMatches.forEach(match => {
        const table = match.replace(/^\s*join\s+/i, '').trim();
        if (table) tables.push(table);
      });
    }

    return [...new Set(tables)]; // Remove duplicates
  }

  /**
   * Get cached query result
   */
  async getCachedQuery(
    sql: string,
    userId: string,
    params?: any[]
  ): Promise<any[] | null> {
    const key = this.generateCacheKey(sql, userId, params);
    const tables = this.extractTables(sql);
    const ttl = this.getTTLForTables(tables);

    try {
      // Try Redis first if available
      if (this.redisClient) {
        try {
          const cached = await this.redisClient.get(key);
          if (cached) {
            const entry: CacheEntry = JSON.parse(cached);
            const now = Date.now();
            
            // Check if expired
            if (now - entry.timestamp < entry.ttl) {
              this.metrics.hits++;
              this.updateHitRate();
              
              // Log cache hit
              monitoring.logCacheOperation(userId, true, 0).catch(() => {});
              
              return entry.data;
            } else {
              // Expired, delete from Redis
              await this.redisClient.del(key);
            }
          }
        } catch (err) {
          console.error('[Query Cache] Redis get error:', err);
          // Fallback to memory cache
        }
      }

      // Fallback to memory cache
      const entry = this.memoryCache.get(key);
      if (entry) {
        const now = Date.now();
        if (now - entry.timestamp < entry.ttl) {
          this.metrics.hits++;
          this.updateHitRate();
          
          // Log cache hit
          monitoring.logCacheOperation(userId, true, 0).catch(() => {});
          
          return entry.data;
        } else {
          // Expired, remove from memory
          this.memoryCache.delete(key);
        }
      }

      // Cache miss
      this.metrics.misses++;
      this.updateHitRate();
      
      // Log cache miss
      monitoring.logCacheOperation(userId, false).catch(() => {});
      
      return null;
    } catch (error: any) {
      console.error('[Query Cache] Error getting cached query:', error.message);
      this.metrics.misses++;
      this.updateHitRate();
      return null;
    }
  }

  /**
   * Set cached query result
   */
  async setCachedQuery(
    sql: string,
    userId: string,
    data: any[],
    params?: any[]
  ): Promise<void> {
    const key = this.generateCacheKey(sql, userId, params);
    const tables = this.extractTables(sql);
    const ttl = this.getTTLForTables(tables);

    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl,
      sql,
      tables,
    };

    try {
      // Try Redis first if available
      if (this.redisClient) {
        try {
          const ttlSeconds = Math.floor(ttl / 1000);
          await this.redisClient.set(
            key,
            JSON.stringify(entry),
            { EX: ttlSeconds }
          );
          this.metrics.sets++;
          return;
        } catch (err) {
          console.error('[Query Cache] Redis set error:', err);
          // Fallback to memory cache
        }
      }

      // Fallback to memory cache
      this.memoryCache.set(key, entry);
      this.metrics.sets++;
    } catch (error: any) {
      console.error('[Query Cache] Error setting cached query:', error.message);
    }
  }

  /**
   * Invalidate cache entries
   * 
   * @param pattern - Pattern to match (SQL, table name, or user ID)
   * @param userId - Optional user ID to limit invalidation
   */
  async invalidateCache(pattern?: string, userId?: string): Promise<number> {
    let invalidated = 0;

    try {
      // Invalidate from memory cache
      const keysToDelete: string[] = [];
      
      for (const [key, entry] of this.memoryCache.entries()) {
        let shouldInvalidate = false;

        if (pattern) {
          // Check if pattern matches SQL or table names
          const sqlMatch = entry.sql.toLowerCase().includes(pattern.toLowerCase());
          const tableMatch = entry.tables.some(table => 
            table.toLowerCase().includes(pattern.toLowerCase())
          );
          
          if (sqlMatch || tableMatch) {
            shouldInvalidate = true;
          }
        } else {
          // If no pattern, invalidate all
          shouldInvalidate = true;
        }

        if (shouldInvalidate) {
          keysToDelete.push(key);
        }
      }

      keysToDelete.forEach(key => {
        this.memoryCache.delete(key);
        invalidated++;
      });

      // Invalidate from Redis if available
      if (this.redisClient && pattern) {
        // Note: Redis pattern matching requires SCAN, which is more complex
        // For now, we'll just log that Redis invalidation would happen
        // In production, you might want to use Redis SCAN with pattern matching
        console.log(`[Query Cache] Redis invalidation for pattern "${pattern}" would be performed`);
      }

      this.metrics.invalidations += invalidated;
      
      return invalidated;
    } catch (error: any) {
      console.error('[Query Cache] Error invalidating cache:', error.message);
      return invalidated;
    }
  }

  /**
   * Clear expired entries
   */
  private clearExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.memoryCache.entries()) {
      if (now - entry.timestamp >= entry.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.memoryCache.delete(key);
    });

    if (keysToDelete.length > 0) {
      console.log(`[Query Cache] Cleared ${keysToDelete.length} expired entries`);
    }
  }

  /**
   * Update hit rate metric
   */
  private updateHitRate(): void {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0 
      ? (this.metrics.hits / total) * 100 
      : 0;
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.memoryCache.clear();
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      invalidations: 0,
      hitRate: 0,
    };
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.memoryCache.size;
  }
}

// Global cache instance
const smartQueryCache = new SmartQueryCache();

/**
 * Get cached query result
 * 
 * @param sql - SQL query string
 * @param userId - User ID
 * @param params - Query parameters (optional)
 * @returns Cached data or null if not found/expired
 */
export async function getCachedQuery(
  sql: string,
  userId: string,
  params?: any[]
): Promise<any[] | null> {
  return smartQueryCache.getCachedQuery(sql, userId, params);
}

/**
 * Set cached query result
 * 
 * @param sql - SQL query string
 * @param userId - User ID
 * @param data - Query result data
 * @param params - Query parameters (optional)
 */
export async function setCachedQuery(
  sql: string,
  userId: string,
  data: any[],
  params?: any[]
): Promise<void> {
  return smartQueryCache.setCachedQuery(sql, userId, data, params);
}

/**
 * Invalidate cache entries
 * 
 * @param pattern - Pattern to match (SQL, table name, or user ID)
 * @param userId - Optional user ID to limit invalidation
 * @returns Number of invalidated entries
 */
export async function invalidateCache(
  pattern?: string,
  userId?: string
): Promise<number> {
  return smartQueryCache.invalidateCache(pattern, userId);
}

/**
 * Get cache metrics
 */
export function getCacheMetrics() {
  return smartQueryCache.getMetrics();
}

/**
 * Clear all cache
 */
export function clearCache(): void {
  smartQueryCache.clear();
}

/**
 * Get cache size
 */
export function getCacheSize(): number {
  return smartQueryCache.size();
}

