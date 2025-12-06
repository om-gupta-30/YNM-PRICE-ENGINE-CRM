/**
 * Historical Quote Lookup Service
 * 
 * Finds previous quotations with matching specifications to help users
 * maintain consistent pricing and recall past configurations.
 */

import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

export interface HistoricalQuoteMatch {
  pricePerUnit: number;
  aiSuggestedPrice?: number | null;
  aiWinProbability?: number | null;
  createdAt: Date;
}

export interface MBCBSpecs {
  wBeamThickness?: number;
  wBeamCoating?: number;
  postThickness?: number;
  postLength?: number;
  postCoating?: number;
  spacerThickness?: number;
  spacerLength?: number;
  spacerCoating?: number;
  includeWBeam?: boolean;
  includePost?: boolean;
  includeSpacer?: boolean;
}

export interface SignagesSpecs {
  shape: string;
  boardType: string;
  reflectivityType: string;
  // Dimensions vary by shape
  diameter?: number;
  width?: number;
  height?: number;
  base?: number;
  triangleHeight?: number;
  octagonalSize?: number;
}

/**
 * Find the most recent matching MBCB quote
 * Note: Specs are stored in raw_payload JSONB, so we fetch recent quotes and filter in-memory
 */
export async function findLastMatchingMBCBQuote(
  specs: MBCBSpecs
): Promise<HistoricalQuoteMatch | null> {
  try {
    const supabase = createSupabaseServerClient();

    // Fetch recent quotes and filter by raw_payload contents
    // Since specs are in JSONB, we query broadly and filter client-side
    const { data, error } = await supabase
      .from('quotes_mbcb')
      .select('total_cost_per_rm, ai_suggested_price_per_unit, ai_win_probability, created_at, raw_payload')
      .eq('is_saved', true)
      .order('created_at', { ascending: false })
      .limit(50); // Fetch more to increase match chances

    if (error) {
      console.error('[Historical Lookup] Error querying MBCB quotes:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    // Filter matches based on raw_payload specs
    for (const quote of data) {
      const payload = quote.raw_payload;
      if (!payload) continue;

      let isMatch = true;

      // Match W-Beam specs if included
      if (specs.includeWBeam && specs.wBeamThickness && specs.wBeamCoating) {
        const payloadThickness = payload.wBeamThickness || payload.thickness;
        const payloadCoating = payload.wBeamCoating || payload.coatingGsm;
        if (payloadThickness !== specs.wBeamThickness || payloadCoating !== specs.wBeamCoating) {
          isMatch = false;
        }
      }

      // Match Post specs if included
      if (isMatch && specs.includePost && specs.postThickness && specs.postLength && specs.postCoating) {
        const payloadPostThickness = payload.postThickness;
        const payloadPostLength = payload.postLength;
        const payloadPostCoating = payload.postCoating || payload.postCoatingGsm;
        if (payloadPostThickness !== specs.postThickness || 
            payloadPostLength !== specs.postLength || 
            payloadPostCoating !== specs.postCoating) {
          isMatch = false;
        }
      }

      // Match Spacer specs if included
      if (isMatch && specs.includeSpacer && specs.spacerThickness && specs.spacerLength && specs.spacerCoating) {
        const payloadSpacerThickness = payload.spacerThickness;
        const payloadSpacerLength = payload.spacerLength;
        const payloadSpacerCoating = payload.spacerCoating || payload.spacerCoatingGsm;
        if (payloadSpacerThickness !== specs.spacerThickness || 
            payloadSpacerLength !== specs.spacerLength || 
            payloadSpacerCoating !== specs.spacerCoating) {
          isMatch = false;
        }
      }

      if (isMatch && quote.total_cost_per_rm) {
        return {
          pricePerUnit: quote.total_cost_per_rm,
          aiSuggestedPrice: quote.ai_suggested_price_per_unit,
          aiWinProbability: quote.ai_win_probability,
          createdAt: new Date(quote.created_at),
        };
      }
    }

    return null;
  } catch (error) {
    console.error('[Historical Lookup] Error in findLastMatchingMBCBQuote:', error);
    return null;
  }
}

/**
 * Find the most recent matching Signages quote
 * Note: Specs are stored in raw_payload JSONB, so we fetch recent quotes and filter in-memory
 */
export async function findLastMatchingSignagesQuote(
  specs: SignagesSpecs
): Promise<HistoricalQuoteMatch | null> {
  try {
    const supabase = createSupabaseServerClient();

    // Fetch recent quotes and filter by raw_payload contents
    const { data, error } = await supabase
      .from('quotes_signages')
      .select('cost_per_piece, ai_suggested_price_per_unit, ai_win_probability, created_at, raw_payload')
      .eq('is_saved', true)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[Historical Lookup] Error querying Signages quotes:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    // Filter matches based on raw_payload specs
    for (const quote of data) {
      const payload = quote.raw_payload;
      if (!payload) continue;

      // Match basic specs
      if (payload.shape !== specs.shape || 
          payload.boardType !== specs.boardType || 
          payload.reflectivityType !== specs.reflectivityType) {
        continue;
      }

      // Match dimensions based on shape
      let dimensionMatch = false;
      if (specs.shape === 'Circular' && specs.diameter) {
        dimensionMatch = payload.diameter === specs.diameter;
      } else if (specs.shape === 'Rectangular' && specs.width && specs.height) {
        dimensionMatch = payload.width === specs.width && payload.height === specs.height;
      } else if (specs.shape === 'Triangle' && specs.base && specs.triangleHeight) {
        dimensionMatch = payload.base === specs.base && payload.triangleHeight === specs.triangleHeight;
      } else if (specs.shape === 'Octagonal' && specs.octagonalSize) {
        dimensionMatch = payload.octagonalSize === specs.octagonalSize;
      } else {
        dimensionMatch = true; // No specific dimension to match
      }

      if (dimensionMatch && quote.cost_per_piece) {
        return {
          pricePerUnit: quote.cost_per_piece,
          aiSuggestedPrice: quote.ai_suggested_price_per_unit,
          aiWinProbability: quote.ai_win_probability,
          createdAt: new Date(quote.created_at),
        };
      }
    }

    return null;
  } catch (error) {
    console.error('[Historical Lookup] Error in findLastMatchingSignagesQuote:', error);
    return null;
  }
}

/**
 * Client-side API call wrapper for MBCB quotes
 */
export async function lookupHistoricalMBCBQuote(
  specs: MBCBSpecs
): Promise<HistoricalQuoteMatch | null> {
  try {
    const response = await fetch('/api/quotes/historical-lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productType: 'mbcb',
        specs,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return null;
    }

    if (!data.data) {
      return null;
    }

    return {
      ...data.data,
      createdAt: new Date(data.data.createdAt),
    };
  } catch (error) {
    console.error('[Historical Lookup] Client-side error:', error);
    return null;
  }
}

/**
 * Client-side API call wrapper for Signages quotes
 */
export async function lookupHistoricalSignagesQuote(
  specs: SignagesSpecs
): Promise<HistoricalQuoteMatch | null> {
  try {
    const response = await fetch('/api/quotes/historical-lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productType: 'signages',
        specs,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return null;
    }

    if (!data.data) {
      return null;
    }

    return {
      ...data.data,
      createdAt: new Date(data.data.createdAt),
    };
  } catch (error) {
    console.error('[Historical Lookup] Client-side error:', error);
    return null;
  }
}

