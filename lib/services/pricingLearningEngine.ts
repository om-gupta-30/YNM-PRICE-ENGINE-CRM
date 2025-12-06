/**
 * Pricing Learning Engine
 * 
 * Analyzes historical quotation outcomes to provide feedback for AI pricing improvement.
 * Calculates win rates, price deviations, and generates insights for AI prompt context.
 */

import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

export interface PricingLearningStats {
  ai_accuracy: number; // % of wins when AI recommendation was used
  override_accuracy: number; // % of wins when user overrode AI
  avg_success_delta: number; // avg price difference between AI and actual winning price
  total_quotes_analyzed: number;
  quotes_with_ai: number;
  quotes_without_ai: number;
  recent_win_factors: string[]; // text insights from recent wins
  last_updated: string;
}

export interface QuoteAnalysisData {
  id: number;
  outcome_status: 'won' | 'lost' | 'pending';
  ai_suggested_price_per_unit: number | null;
  total_cost_per_rm?: number | null; // MBCB
  cost_per_piece?: number | null; // Signages
  ai_pricing_insights: any;
  created_at: string;
  closed_at: string | null;
}

/**
 * Analyzes recent quotations to calculate learning statistics
 * 
 * @param productType - Type of product (mbcb, signages, paint)
 * @param lookbackDays - Number of days to look back (default: 90)
 * @returns Learning statistics object
 */
export async function analyzePricingPerformance(
  productType: 'mbcb' | 'signages' | 'paint',
  lookbackDays: number = 90
): Promise<PricingLearningStats> {
  const supabase = createSupabaseServerClient();
  
  // Determine table and price field
  const tableName = productType === 'mbcb' 
    ? 'quotes_mbcb' 
    : productType === 'signages' 
    ? 'quotes_signages' 
    : 'quotes_paint';
  
  const priceField = productType === 'mbcb' ? 'total_cost_per_rm' : 'cost_per_piece';
  
  // Calculate date threshold
  const lookbackDate = new Date();
  lookbackDate.setDate(lookbackDate.getDate() - lookbackDays);
  
  // Fetch closed quotes (won or lost) from the lookback period
  const { data: quotes, error } = await supabase
    .from(tableName)
    .select(`
      id,
      outcome_status,
      ai_suggested_price_per_unit,
      ${priceField},
      ai_pricing_insights,
      created_at,
      closed_at
    `)
    .in('outcome_status', ['won', 'lost'])
    .not('closed_at', 'is', null)
    .gte('closed_at', lookbackDate.toISOString())
    .order('closed_at', { ascending: false });
  
  if (error) {
    console.error('[Pricing Learning Engine] Error fetching quotes:', error);
    throw new Error('Failed to fetch quotes for analysis');
  }
  
  if (!quotes || quotes.length === 0) {
    // No data available yet
    return {
      ai_accuracy: 0,
      override_accuracy: 0,
      avg_success_delta: 0,
      total_quotes_analyzed: 0,
      quotes_with_ai: 0,
      quotes_without_ai: 0,
      recent_win_factors: ['Insufficient data for analysis'],
      last_updated: new Date().toISOString(),
    };
  }
  
  // Separate quotes into categories
  const quotesWithAI = quotes.filter(q => q.ai_suggested_price_per_unit !== null);
  const quotesWithoutAI = quotes.filter(q => q.ai_suggested_price_per_unit === null);
  
  // Calculate AI accuracy (win rate when AI was used)
  const aiWins = quotesWithAI.filter(q => q.outcome_status === 'won');
  const aiAccuracy = quotesWithAI.length > 0 
    ? (aiWins.length / quotesWithAI.length) * 100 
    : 0;
  
  // Determine which quotes followed AI vs. overrode AI
  const quotesFollowedAI: any[] = [];
  const quotesOverrodeAI: any[] = [];
  
  quotesWithAI.forEach(quote => {
    const finalPrice = priceField === 'total_cost_per_rm' 
      ? (quote as any).total_cost_per_rm 
      : (quote as any).cost_per_piece;
    const aiPrice = quote.ai_suggested_price_per_unit;
    
    if (finalPrice && aiPrice) {
      // Consider "followed AI" if within 5% of AI suggestion
      const deviation = Math.abs(finalPrice - aiPrice) / aiPrice;
      if (deviation <= 0.05) {
        quotesFollowedAI.push(quote);
      } else {
        quotesOverrodeAI.push(quote);
      }
    }
  });
  
  // Calculate override accuracy (win rate when user overrode AI)
  const overrideWins = quotesOverrodeAI.filter(q => q.outcome_status === 'won');
  const overrideAccuracy = quotesOverrodeAI.length > 0
    ? (overrideWins.length / quotesOverrodeAI.length) * 100
    : 0;
  
  // Calculate average success delta (difference between AI and winning price)
  const wonQuotesWithAI = quotesWithAI.filter(q => q.outcome_status === 'won');
  let totalDelta = 0;
  let deltaCount = 0;
  
  wonQuotesWithAI.forEach(quote => {
    const finalPrice = priceField === 'total_cost_per_rm' 
      ? (quote as any).total_cost_per_rm 
      : (quote as any).cost_per_piece;
    const aiPrice = quote.ai_suggested_price_per_unit;
    
    if (finalPrice && aiPrice) {
      totalDelta += (finalPrice - aiPrice);
      deltaCount++;
    }
  });
  
  const avgSuccessDelta = deltaCount > 0 ? totalDelta / deltaCount : 0;
  
  // Extract recent win factors from insights
  const recentWinFactors: string[] = [];
  const recentWins = quotes
    .filter(q => q.outcome_status === 'won')
    .slice(0, 10); // Last 10 wins
  
  recentWins.forEach(quote => {
    if (quote.ai_pricing_insights) {
      // Extract override reason if present
      const insights = quote.ai_pricing_insights;
      if (insights.overrideReason) {
        recentWinFactors.push(insights.overrideReason);
      }
      // Extract AI reasoning if present
      if (insights.reasoning) {
        recentWinFactors.push(insights.reasoning);
      }
    }
  });
  
  // Deduplicate and limit to top insights
  const uniqueFactors = [...new Set(recentWinFactors)].slice(0, 5);
  
  return {
    ai_accuracy: Math.round(aiAccuracy * 100) / 100,
    override_accuracy: Math.round(overrideAccuracy * 100) / 100,
    avg_success_delta: Math.round(avgSuccessDelta * 100) / 100,
    total_quotes_analyzed: quotes.length,
    quotes_with_ai: quotesWithAI.length,
    quotes_without_ai: quotesWithoutAI.length,
    recent_win_factors: uniqueFactors.length > 0 ? uniqueFactors : ['No specific patterns identified yet'],
    last_updated: new Date().toISOString(),
  };
}

/**
 * Client-side wrapper to fetch learning statistics via API
 */
export async function fetchLearningStats(
  productType: 'mbcb' | 'signages' | 'paint'
): Promise<PricingLearningStats> {
  const response = await fetch(`/api/pricing/learning-stats?productType=${productType}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch learning statistics');
  }
  
  const data = await response.json();
  return data.data;
}

/**
 * Formats learning stats into a human-readable prompt context
 */
export function formatLearningStatsForPrompt(stats: PricingLearningStats): string {
  const lines: string[] = [];
  
  lines.push('Based on recent history:');
  
  if (stats.quotes_with_ai > 0) {
    lines.push(`- When prices match AI suggestion, win rate was ${stats.ai_accuracy.toFixed(0)}%.`);
  }
  
  if (stats.avg_success_delta !== 0) {
    const deltaFormatted = Math.abs(stats.avg_success_delta).toFixed(0);
    const direction = stats.avg_success_delta > 0 ? 'above' : 'below';
    lines.push(`- Deals typically close ₹${deltaFormatted} ${direction} recommended price.`);
  }
  
  if (stats.recent_win_factors.length > 0 && stats.recent_win_factors[0] !== 'No specific patterns identified yet') {
    lines.push('- Recent winning strategies:');
    stats.recent_win_factors.slice(0, 3).forEach(factor => {
      lines.push(`  • ${factor}`);
    });
  }
  
  lines.push('Use this to refine suggestion.');
  
  return lines.join('\n');
}

/**
 * Calculates a confidence score based on historical performance
 */
export function calculateConfidenceScore(stats: PricingLearningStats): number {
  // Base confidence on AI accuracy and sample size
  if (stats.quotes_with_ai < 5) {
    return 50; // Low confidence with insufficient data
  }
  
  if (stats.quotes_with_ai < 20) {
    // Moderate confidence, blend AI accuracy with baseline
    return Math.min(Math.max(stats.ai_accuracy * 0.7 + 35, 40), 75);
  }
  
  // High confidence with sufficient data
  return Math.min(Math.max(stats.ai_accuracy, 50), 95);
}

