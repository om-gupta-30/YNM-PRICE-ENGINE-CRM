import { NextRequest, NextResponse } from 'next/server';
import { analyzePricingPerformance } from '@/lib/services/pricingLearningEngine';
import { getWinningPatterns } from '@/lib/services/pricingOutcomeMemory';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

/**
 * Query parameters interface
 */
interface DashboardQueryParams {
  productType?: 'mbcb' | 'signages' | 'paint';
  timeRange?: string; // e.g., '30', '90', '180', '365'
  clientId?: string; // sub_account_id
}

/**
 * Response interface
 */
interface PricingInsightsDashboard {
  overallAccuracy: {
    aiAccuracy: number;
    overrideAccuracy: number;
    totalQuotesAnalyzed: number;
    quotesWithAI: number;
    quotesWithoutAI: number;
  };
  winRateByPriceRange: Array<{
    range: string;
    winRate: number;
    quoteCount: number;
    averagePrice: number;
  }>;
  averageMarginByProduct: Array<{
    productType: string;
    averageMargin: number;
    quoteCount: number;
    optimalMargin: number;
  }>;
  competitorAnalysis: {
    winsWhenAboveCompetitor: number;
    winsWhenBelowCompetitor: number;
    winsWhenAtCompetitor: number;
    averagePriceDifference: number;
  };
  pricingTrends: Array<{
    period: string;
    averagePrice: number;
    winRate: number;
    averageMargin: number;
    quoteCount: number;
  }>;
  mostProfitableCategories: Array<{
    category: string;
    averageMargin: number;
    totalRevenue: number;
    winRate: number;
    quoteCount: number;
  }>;
  cached: boolean;
  cacheTimestamp: string;
}

/**
 * In-memory cache for dashboard data
 */
interface CacheEntry {
  data: PricingInsightsDashboard;
  timestamp: number;
}

const dashboardCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Generate cache key from query parameters
 */
function getCacheKey(params: DashboardQueryParams): string {
  return `dashboard:${params.productType || 'all'}:${params.timeRange || '90'}:${params.clientId || 'all'}`;
}

/**
 * Check if cache entry is valid
 */
function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp < CACHE_TTL_MS;
}

/**
 * Calculate win rate by price range
 */
async function calculateWinRateByPriceRange(
  productType: 'mbcb' | 'signages' | 'paint' | undefined,
  timeRange: number,
  clientId?: string
): Promise<Array<{ range: string; winRate: number; quoteCount: number; averagePrice: number }>> {
  try {
    const supabase = createSupabaseServerClient();
    const tableName = productType === 'mbcb' 
      ? 'quotes_mbcb' 
      : productType === 'signages' 
      ? 'quotes_signages' 
      : 'quotes_paint';
    
    const priceField = productType === 'mbcb' ? 'total_cost_per_rm' : 'cost_per_piece';
    
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - timeRange);
    
    let query = supabase
      .from(tableName)
      .select(`${priceField}, outcome_status, created_at`)
      .in('outcome_status', ['won', 'lost'])
      .not('outcome_status', 'is', null)
      .gte('created_at', lookbackDate.toISOString())
      .not(priceField, 'is', null);
    
    if (clientId) {
      query = query.eq('sub_account_id', parseInt(clientId));
    }
    
    const { data: quotes } = await query;
    
    if (!quotes || quotes.length === 0) {
      return [];
    }
    
    // Define price ranges
    const prices = quotes.map(q => (q as any)[priceField]).filter((p): p is number => p !== null && p > 0);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const rangeSize = (maxPrice - minPrice) / 5; // 5 ranges
    
    const ranges: Array<{ min: number; max: number; label: string }> = [];
    for (let i = 0; i < 5; i++) {
      ranges.push({
        min: minPrice + (rangeSize * i),
        max: minPrice + (rangeSize * (i + 1)),
        label: `₹${(minPrice + (rangeSize * i)).toFixed(0)} - ₹${(minPrice + (rangeSize * (i + 1))).toFixed(0)}`,
      });
    }
    
    // Calculate win rate for each range
    return ranges.map(range => {
      const rangeQuotes = quotes.filter(q => {
        const price = (q as any)[priceField];
        return price && price >= range.min && price < range.max;
      });
      
      const wins = rangeQuotes.filter(q => q.outcome_status === 'won');
      const winRate = rangeQuotes.length > 0 ? (wins.length / rangeQuotes.length) * 100 : 0;
      const averagePrice = rangeQuotes.length > 0
        ? rangeQuotes.reduce((sum, q) => sum + ((q as any)[priceField] || 0), 0) / rangeQuotes.length
        : (range.min + range.max) / 2;
      
      return {
        range: range.label,
        winRate: Math.round(winRate * 100) / 100,
        quoteCount: rangeQuotes.length,
        averagePrice: Math.round(averagePrice * 100) / 100,
      };
    }).filter(r => r.quoteCount > 0);
  } catch (error: any) {
    console.error('[Pricing Dashboard] Error calculating win rate by price range:', error.message);
    return [];
  }
}

/**
 * Calculate average margin by product type
 */
async function calculateAverageMarginByProduct(
  timeRange: number,
  clientId?: string
): Promise<Array<{ productType: string; averageMargin: number; quoteCount: number; optimalMargin: number }>> {
  try {
    const supabase = createSupabaseServerClient();
    const productTypes: Array<'mbcb' | 'signages' | 'paint'> = ['mbcb', 'signages', 'paint'];
    
    const results = await Promise.all(
      productTypes.map(async (productType) => {
        const tableName = productType === 'mbcb' 
          ? 'quotes_mbcb' 
          : productType === 'signages' 
          ? 'quotes_signages' 
          : 'quotes_paint';
        
        const priceField = productType === 'mbcb' ? 'total_cost_per_rm' : 'cost_per_piece';
        
        const lookbackDate = new Date();
        lookbackDate.setDate(lookbackDate.getDate() - timeRange);
        
        let query = supabase
          .from(tableName)
          .select(`${priceField}, ai_suggested_price_per_unit, outcome_status, created_at`)
          .not(priceField, 'is', null)
          .gte('created_at', lookbackDate.toISOString());
        
        if (clientId) {
          query = query.eq('sub_account_id', parseInt(clientId));
        }
        
        const { data: quotes } = await query;
        
        if (!quotes || quotes.length === 0) {
          return null;
        }
        
        // Estimate margins (using AI price as cost estimate)
        const margins: number[] = [];
        quotes.forEach(quote => {
          const price = (quote as any)[priceField];
          const aiPrice = quote.ai_suggested_price_per_unit;
          
          if (price && aiPrice && aiPrice > 0) {
            const estimatedCost = aiPrice / 1.2; // Assume 20% margin on AI price
            const margin = ((price - estimatedCost) / estimatedCost) * 100;
            if (margin > 0 && margin < 200) {
              margins.push(margin);
            }
          }
        });
        
        if (margins.length === 0) {
          return null;
        }
        
        const averageMargin = margins.reduce((sum, m) => sum + m, 0) / margins.length;
        const sortedMargins = [...margins].sort((a, b) => b - a);
        const optimalMargin = sortedMargins.length > 0
          ? sortedMargins.slice(0, Math.ceil(sortedMargins.length * 0.25)).reduce((sum, m) => sum + m, 0) / Math.ceil(sortedMargins.length * 0.25)
          : averageMargin;
        
        return {
          productType: productType.toUpperCase(),
          averageMargin: Math.round(averageMargin * 100) / 100,
          quoteCount: quotes.length,
          optimalMargin: Math.round(optimalMargin * 100) / 100,
        };
      })
    );
    
    return results.filter((r): r is NonNullable<typeof r> => r !== null);
  } catch (error: any) {
    console.error('[Pricing Dashboard] Error calculating average margin by product:', error.message);
    return [];
  }
}

/**
 * Analyze competitor win/loss patterns
 */
async function analyzeCompetitorWinLoss(
  productType: 'mbcb' | 'signages' | 'paint' | undefined,
  timeRange: number,
  clientId?: string
): Promise<{
  winsWhenAboveCompetitor: number;
  winsWhenBelowCompetitor: number;
  winsWhenAtCompetitor: number;
  averagePriceDifference: number;
}> {
  try {
    const supabase = createSupabaseServerClient();
    const tableName = productType === 'mbcb' 
      ? 'quotes_mbcb' 
      : productType === 'signages' 
      ? 'quotes_signages' 
      : 'quotes_paint';
    
    const priceField = productType === 'mbcb' ? 'total_cost_per_rm' : 'cost_per_piece';
    
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - timeRange);
    
    let query = supabase
      .from(tableName)
      .select(`${priceField}, competitor_price_per_unit, outcome_status, created_at`)
      .not('competitor_price_per_unit', 'is', null)
      .not(priceField, 'is', null)
      .in('outcome_status', ['won', 'lost'])
      .gte('created_at', lookbackDate.toISOString());
    
    if (clientId) {
      query = query.eq('sub_account_id', parseInt(clientId));
    }
    
    const { data: quotes } = await query;
    
    if (!quotes || quotes.length === 0) {
      return {
        winsWhenAboveCompetitor: 0,
        winsWhenBelowCompetitor: 0,
        winsWhenAtCompetitor: 0,
        averagePriceDifference: 0,
      };
    }
    
    let winsAbove = 0;
    let winsBelow = 0;
    let winsAt = 0;
    let totalAbove = 0;
    let totalBelow = 0;
    let totalAt = 0;
    const priceDifferences: number[] = [];
    
    quotes.forEach(quote => {
      const ourPrice = (quote as any)[priceField];
      const competitorPrice = quote.competitor_price_per_unit;
      
      if (ourPrice && competitorPrice) {
        const difference = ((ourPrice - competitorPrice) / competitorPrice) * 100;
        priceDifferences.push(difference);
        
        if (difference > 5) {
          totalAbove++;
          if (quote.outcome_status === 'won') winsAbove++;
        } else if (difference < -5) {
          totalBelow++;
          if (quote.outcome_status === 'won') winsBelow++;
        } else {
          totalAt++;
          if (quote.outcome_status === 'won') winsAt++;
        }
      }
    });
    
    const averagePriceDifference = priceDifferences.length > 0
      ? priceDifferences.reduce((sum, d) => sum + d, 0) / priceDifferences.length
      : 0;
    
    return {
      winsWhenAboveCompetitor: totalAbove > 0 ? (winsAbove / totalAbove) * 100 : 0,
      winsWhenBelowCompetitor: totalBelow > 0 ? (winsBelow / totalBelow) * 100 : 0,
      winsWhenAtCompetitor: totalAt > 0 ? (winsAt / totalAt) * 100 : 0,
      averagePriceDifference: Math.round(averagePriceDifference * 100) / 100,
    };
  } catch (error: any) {
    console.error('[Pricing Dashboard] Error analyzing competitor win/loss:', error.message);
    return {
      winsWhenAboveCompetitor: 0,
      winsWhenBelowCompetitor: 0,
      winsWhenAtCompetitor: 0,
      averagePriceDifference: 0,
    };
  }
}

/**
 * Calculate pricing trends over time
 */
async function calculatePricingTrends(
  productType: 'mbcb' | 'signages' | 'paint' | undefined,
  timeRange: number,
  clientId?: string
): Promise<Array<{
  period: string;
  averagePrice: number;
  winRate: number;
  averageMargin: number;
  quoteCount: number;
}>> {
  try {
    const supabase = createSupabaseServerClient();
    const tableName = productType === 'mbcb' 
      ? 'quotes_mbcb' 
      : productType === 'signages' 
      ? 'quotes_signages' 
      : 'quotes_paint';
    
    const priceField = productType === 'mbcb' ? 'total_cost_per_rm' : 'cost_per_piece';
    
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - timeRange);
    
    let query = supabase
      .from(tableName)
      .select(`${priceField}, ai_suggested_price_per_unit, outcome_status, created_at`)
      .not(priceField, 'is', null)
      .gte('created_at', lookbackDate.toISOString());
    
    if (clientId) {
      query = query.eq('sub_account_id', parseInt(clientId));
    }
    
    const { data: quotes } = await query;
    
    if (!quotes || quotes.length === 0) {
      return [];
    }
    
    // Group by month
    const byMonth: Record<string, Array<typeof quotes[0]>> = {};
    
    quotes.forEach(quote => {
      const month = new Date(quote.created_at).toISOString().substring(0, 7); // YYYY-MM
      if (!byMonth[month]) {
        byMonth[month] = [];
      }
      byMonth[month].push(quote);
    });
    
    // Calculate trends for each month
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, monthQuotes]) => {
        const prices = monthQuotes.map(q => (q as any)[priceField]).filter((p): p is number => p !== null && p > 0);
        const averagePrice = prices.length > 0
          ? prices.reduce((sum, p) => sum + p, 0) / prices.length
          : 0;
        
        const wins = monthQuotes.filter(q => q.outcome_status === 'won');
        const winRate = monthQuotes.length > 0 ? (wins.length / monthQuotes.length) * 100 : 0;
        
        // Calculate average margin
        const margins: number[] = [];
        monthQuotes.forEach(quote => {
          const price = (quote as any)[priceField];
          const aiPrice = quote.ai_suggested_price_per_unit;
          if (price && aiPrice && aiPrice > 0) {
            const estimatedCost = aiPrice / 1.2;
            const margin = ((price - estimatedCost) / estimatedCost) * 100;
            if (margin > 0 && margin < 200) {
              margins.push(margin);
            }
          }
        });
        const averageMargin = margins.length > 0
          ? margins.reduce((sum, m) => sum + m, 0) / margins.length
          : 0;
        
        return {
          period: month,
          averagePrice: Math.round(averagePrice * 100) / 100,
          winRate: Math.round(winRate * 100) / 100,
          averageMargin: Math.round(averageMargin * 100) / 100,
          quoteCount: monthQuotes.length,
        };
      });
  } catch (error: any) {
    console.error('[Pricing Dashboard] Error calculating pricing trends:', error.message);
    return [];
  }
}

/**
 * Find most profitable product categories
 */
async function findMostProfitableCategories(
  timeRange: number,
  clientId?: string
): Promise<Array<{
  category: string;
  averageMargin: number;
  totalRevenue: number;
  winRate: number;
  quoteCount: number;
}>> {
  try {
    const supabase = createSupabaseServerClient();
    const productTypes: Array<'mbcb' | 'signages' | 'paint'> = ['mbcb', 'signages', 'paint'];
    
    const results = await Promise.all(
      productTypes.map(async (productType) => {
        const tableName = productType === 'mbcb' 
          ? 'quotes_mbcb' 
          : productType === 'signages' 
          ? 'quotes_signages' 
          : 'quotes_paint';
        
        const priceField = productType === 'mbcb' ? 'total_cost_per_rm' : 'cost_per_piece';
        
        const lookbackDate = new Date();
        lookbackDate.setDate(lookbackDate.getDate() - timeRange);
        
        let query = supabase
          .from(tableName)
          .select(`${priceField}, ai_suggested_price_per_unit, outcome_status, quantity_rm, quantity, created_at`)
          .not(priceField, 'is', null)
          .in('outcome_status', ['won', 'lost'])
          .gte('created_at', lookbackDate.toISOString());
        
        if (clientId) {
          query = query.eq('sub_account_id', parseInt(clientId));
        }
        
        const { data: quotes } = await query;
        
        if (!quotes || quotes.length === 0) {
          return null;
        }
        
        const margins: number[] = [];
        let totalRevenue = 0;
        let wins = 0;
        
        quotes.forEach(quote => {
          const price = (quote as any)[priceField];
          const aiPrice = quote.ai_suggested_price_per_unit;
          const quantity = quote.quantity_rm || quote.quantity || 1;
          
          if (price && aiPrice && aiPrice > 0) {
            const estimatedCost = aiPrice / 1.2;
            const margin = ((price - estimatedCost) / estimatedCost) * 100;
            if (margin > 0 && margin < 200) {
              margins.push(margin);
            }
            
            if (quote.outcome_status === 'won') {
              totalRevenue += price * quantity;
              wins++;
            }
          }
        });
        
        if (margins.length === 0) {
          return null;
        }
        
        const averageMargin = margins.reduce((sum, m) => sum + m, 0) / margins.length;
        const winRate = quotes.length > 0 ? (wins / quotes.length) * 100 : 0;
        
        return {
          category: productType.toUpperCase(),
          averageMargin: Math.round(averageMargin * 100) / 100,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          winRate: Math.round(winRate * 100) / 100,
          quoteCount: quotes.length,
        };
      })
    );
    
    return results
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => b.averageMargin - a.averageMargin);
  } catch (error: any) {
    console.error('[Pricing Dashboard] Error finding most profitable categories:', error.message);
    return [];
  }
}

/**
 * GET handler for pricing insights dashboard
 */
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const params: DashboardQueryParams = {
      productType: searchParams.get('productType') as 'mbcb' | 'signages' | 'paint' | undefined,
      timeRange: searchParams.get('timeRange') || '90',
      clientId: searchParams.get('clientId') || undefined,
    };
    
    // Check cache
    const cacheKey = getCacheKey(params);
    const cachedEntry = dashboardCache.get(cacheKey);
    if (cachedEntry && isCacheValid(cachedEntry)) {
      console.log('[Pricing Dashboard] Returning cached data');
      return NextResponse.json({
        ...cachedEntry.data,
        cached: true,
      });
    }
    
    // Parse time range
    const timeRange = parseInt(params.timeRange || '90', 10);
    
    // Fetch overall accuracy
    let overallAccuracy = {
      aiAccuracy: 0,
      overrideAccuracy: 0,
      totalQuotesAnalyzed: 0,
      quotesWithAI: 0,
      quotesWithoutAI: 0,
    };
    
    if (params.productType) {
      try {
        const learningStats = await analyzePricingPerformance(params.productType, timeRange);
        overallAccuracy = {
          aiAccuracy: learningStats.ai_accuracy,
          overrideAccuracy: learningStats.override_accuracy,
          totalQuotesAnalyzed: learningStats.total_quotes_analyzed,
          quotesWithAI: learningStats.quotes_with_ai,
          quotesWithoutAI: learningStats.quotes_without_ai,
        };
      } catch (error: any) {
        console.warn('[Pricing Dashboard] Error fetching overall accuracy:', error.message);
      }
    }
    
    // Calculate all insights in parallel
    const [
      winRateByPriceRange,
      averageMarginByProduct,
      competitorAnalysis,
      pricingTrends,
      mostProfitableCategories,
    ] = await Promise.all([
      calculateWinRateByPriceRange(params.productType, timeRange, params.clientId),
      calculateAverageMarginByProduct(timeRange, params.clientId),
      analyzeCompetitorWinLoss(params.productType, timeRange, params.clientId),
      calculatePricingTrends(params.productType, timeRange, params.clientId),
      findMostProfitableCategories(timeRange, params.clientId),
    ]);
    
    // Build response
    const dashboard: PricingInsightsDashboard = {
      overallAccuracy,
      winRateByPriceRange,
      averageMarginByProduct,
      competitorAnalysis,
      pricingTrends,
      mostProfitableCategories,
      cached: false,
      cacheTimestamp: new Date().toISOString(),
    };
    
    // Store in cache
    dashboardCache.set(cacheKey, {
      data: dashboard,
      timestamp: Date.now(),
    });
    
    // Clean up old cache entries
    for (const [key, entry] of dashboardCache.entries()) {
      if (!isCacheValid(entry)) {
        dashboardCache.delete(key);
      }
    }
    
    console.log('[Pricing Dashboard] Generated dashboard data:', {
      productType: params.productType || 'all',
      timeRange,
      clientId: params.clientId || 'all',
      dataPoints: {
        winRateRanges: winRateByPriceRange.length,
        productMargins: averageMarginByProduct.length,
        trends: pricingTrends.length,
        categories: mostProfitableCategories.length,
      },
    });
    
    return NextResponse.json(dashboard);
  } catch (error: any) {
    console.error('[Pricing Dashboard] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate pricing insights dashboard',
        message: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

