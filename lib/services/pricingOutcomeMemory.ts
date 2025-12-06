/**
 * Pricing Outcome Memory Service
 * 
 * Records and retrieves pricing win/loss outcomes to help AI learn from past victories.
 * Enables AI to reference patterns like "Average winning price was ₹X" or "Best margin achieved was Y%"
 */

import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

export interface PricingOutcomeInput {
  productType: 'mbcb' | 'signages' | 'paint';
  quotedPrice: number;
  competitorPrice?: number | null;
  clientDemandPrice?: number | null;
  outcome: 'won' | 'lost';
}

export interface WinningPatterns {
  averageWinningPrice: number;
  bestMargin: number;
  count: number;
}

/**
 * Record a pricing outcome (won or lost)
 * 
 * @param input - Pricing outcome details
 */
export async function recordPricingOutcome(
  input: PricingOutcomeInput
): Promise<void> {
  console.log('[AI Pricing Memory] Recording pricing outcome', input);

  try {
    const supabase = createSupabaseServerClient();
    
    // Calculate margin if client demand price is available
    const margin = input.clientDemandPrice && input.clientDemandPrice > 0
      ? (input.quotedPrice - input.clientDemandPrice) / input.clientDemandPrice
      : null;

    const { error } = await supabase
      .from('pricing_outcomes')
      .insert({
        product_type: input.productType,
        quoted_price: input.quotedPrice,
        outcome: input.outcome,
        competitor_price: input.competitorPrice || null,
        client_demand_price: input.clientDemandPrice || null,
        margin: margin,
      });

    if (error) {
      console.error('[AI Pricing Memory] Error recording outcome:', error.message);
      throw error;
    }

    console.log('[AI Pricing Memory] Successfully recorded pricing outcome');
  } catch (error: any) {
    console.error('[AI Pricing Memory] Failed to record pricing outcome:', error.message);
    // Don't throw - this is non-critical
  }
}

/**
 * Get winning patterns for a product type
 * 
 * Analyzes recent wins to extract patterns like average winning price and best margin.
 * 
 * @param productType - Product type to analyze
 * @returns Winning patterns or null if no wins found
 */
export async function getWinningPatterns(
  productType: 'mbcb' | 'signages' | 'paint'
): Promise<WinningPatterns | null> {
  try {
    const supabase = createSupabaseServerClient();
    
    const { data, error } = await supabase
      .from('pricing_outcomes')
      .select('quoted_price, margin, competitor_price, client_demand_price, outcome')
      .eq('product_type', productType)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.warn('[AI Pricing Memory] Error fetching winning patterns:', error.message);
      return null;
    }

    if (!data || data.length === 0) {
      console.log('[AI Pricing Memory] No pricing outcomes found for', productType);
      return null;
    }

    const wins = data.filter(d => d.outcome === 'won');

    if (!wins.length) {
      console.log('[AI Pricing Memory] No wins found for', productType);
      return null;
    }

    const averageWinningPrice = wins.reduce((sum, p) => sum + (p.quoted_price || 0), 0) / wins.length;
    
    const margins = wins
      .map(p => p.margin)
      .filter((m): m is number => m !== null && typeof m === 'number');
    
    const bestMargin = margins.length > 0
      ? Math.max(...margins)
      : 0;

    console.log('[AI Pricing Memory] Found winning patterns:', {
      count: wins.length,
      averageWinningPrice,
      bestMargin,
    });

    return {
      averageWinningPrice,
      bestMargin,
      count: wins.length,
    };
  } catch (error: any) {
    console.warn('[AI Pricing Memory] Error in getWinningPatterns:', error.message);
    return null;
  }
}

