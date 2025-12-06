/**
 * Pricing Memory Service
 * 
 * Finds similar past pricing decisions to help AI reference historical context.
 * Enables AI to say things like "Last time you sold this same spec at ₹X/RM and won the deal."
 */

import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

export interface SimilarPastPrice {
  lastPrice: number;
  quantity: number;
  createdAt: string;
  outcome?: string | null; // Optional: win/loss outcome if available
}

export interface PricingMemoryInput {
  productType: 'mbcb' | 'signages' | 'paint';
  specs?: Record<string, any>;
  quantity: number;
}

/**
 * Find similar past pricing decisions
 * 
 * Naive matching first - future matching can evolve to be more sophisticated
 * (e.g., matching by product specs, similar quantity ranges, etc.)
 * 
 * @param input - Product type, specs, and quantity to match against
 * @returns Similar past price information or null if no match found
 */
export async function findSimilarPastPrice(
  input: PricingMemoryInput
): Promise<SimilarPastPrice | null> {
  console.log('[AI Pricing Memory] Searching historical matches for', input.productType);

  try {
    const supabase = createSupabaseServerClient();
    
    // Map productType to table name
    const tableName = `quotes_${input.productType}`;
    
    // Naive matching first — future matching can evolve
    // For now, just get the most recent quote of this product type
    // Future: could match by specs, similar quantity ranges, etc.
    const { data, error } = await supabase
      .from(tableName)
      .select('ai_suggested_price_per_unit, final_total_cost, quantity_rm, quantity, total_cost_per_rm, cost_per_piece, created_at, outcome_status')
      .order('created_at', { ascending: false })
      .limit(10); // Get last 10 to find one with pricing data

    if (error) {
      console.warn('[AI Pricing Memory] Error fetching historical prices:', error.message);
      return null;
    }

    if (!data || data.length === 0) {
      console.log('[AI Pricing Memory] No historical quotes found');
      return null;
    }

    // Find the first quote with pricing data
    for (const quote of data) {
      // Try to extract price per unit from various fields
      let pricePerUnit: number | null = null;
      
      // For MBCB: use total_cost_per_rm if available, or calculate from final_total_cost / quantity_rm
      if (input.productType === 'mbcb') {
        if (quote.total_cost_per_rm && typeof quote.total_cost_per_rm === 'number' && quote.total_cost_per_rm > 0) {
          pricePerUnit = quote.total_cost_per_rm;
        } else if (quote.final_total_cost && quote.quantity_rm && typeof quote.final_total_cost === 'number' && typeof quote.quantity_rm === 'number' && quote.quantity_rm > 0) {
          pricePerUnit = quote.final_total_cost / quote.quantity_rm;
        } else if (quote.ai_suggested_price_per_unit && typeof quote.ai_suggested_price_per_unit === 'number' && quote.ai_suggested_price_per_unit > 0) {
          pricePerUnit = quote.ai_suggested_price_per_unit;
        }
      } else {
        // For signages/paint: use cost_per_piece or calculate from final_total_cost / quantity
        if (quote.cost_per_piece && typeof quote.cost_per_piece === 'number' && quote.cost_per_piece > 0) {
          pricePerUnit = quote.cost_per_piece;
        } else if (quote.final_total_cost && (quote.quantity || quote.quantity_rm)) {
          const qty = (quote.quantity || quote.quantity_rm) as number;
          if (typeof quote.final_total_cost === 'number' && typeof qty === 'number' && qty > 0) {
            pricePerUnit = quote.final_total_cost / qty;
          }
        } else if (quote.ai_suggested_price_per_unit && typeof quote.ai_suggested_price_per_unit === 'number' && quote.ai_suggested_price_per_unit > 0) {
          pricePerUnit = quote.ai_suggested_price_per_unit;
        }
      }

      if (pricePerUnit && pricePerUnit > 0) {
        const result: SimilarPastPrice = {
          lastPrice: pricePerUnit,
          quantity: quote.quantity || quote.quantity_rm || input.quantity,
          createdAt: quote.created_at,
        };
        
        // Include outcome if available (field name is outcome_status)
        if (quote.outcome_status) {
          result.outcome = quote.outcome_status;
        }
        
        console.log('[AI Pricing Memory] Found similar past price:', result.lastPrice, 'from', result.createdAt);
        return result;
      }
    }

    console.log('[AI Pricing Memory] No quotes with pricing data found');
    return null;
  } catch (error: any) {
    console.warn('[AI Pricing Memory] Error in findSimilarPastPrice:', error.message);
    return null;
  }
}

