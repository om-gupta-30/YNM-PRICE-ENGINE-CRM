import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { triggerKnowledgeSync } from '@/lib/ai/knowledgeSync';
import { recordPricingOutcome } from '@/lib/services/pricingOutcomeMemory';

/**
 * PATCH /api/quotes/outcome
 * 
 * Updates the outcome status of a quotation
 * 
 * Request Body:
 * {
 *   quoteId: number;
 *   productType: 'mbcb' | 'signages' | 'paint';
 *   outcomeStatus: 'pending' | 'won' | 'lost';
 *   outcomeNotes?: string;
 * }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { quoteId, productType, outcomeStatus, outcomeNotes } = body;

    // Validation
    if (!quoteId || typeof quoteId !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Invalid quoteId' },
        { status: 400 }
      );
    }

    if (!productType || !['mbcb', 'signages', 'paint'].includes(productType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid productType. Must be: mbcb, signages, or paint' },
        { status: 400 }
      );
    }

    if (!outcomeStatus || !['pending', 'won', 'lost'].includes(outcomeStatus)) {
      return NextResponse.json(
        { success: false, error: 'Invalid outcomeStatus. Must be: pending, won, or lost' },
        { status: 400 }
      );
    }

    // Determine table name based on product type
    const tableName = productType === 'mbcb' 
      ? 'quotes_mbcb' 
      : productType === 'signages' 
      ? 'quotes_signages' 
      : 'quotes_paint';

    // Create Supabase client
    const supabase = createSupabaseServerClient();

    // Prepare update data
    const updateData: any = {
      outcome_status: outcomeStatus,
      outcome_notes: outcomeNotes || null,
      updated_at: new Date().toISOString(),
    };

    // Set closed_at timestamp when marking as won or lost
    if (outcomeStatus === 'won' || outcomeStatus === 'lost') {
      updateData.closed_at = new Date().toISOString();
    } else {
      // Clear closed_at if reverting to pending
      updateData.closed_at = null;
    }

    // Update the quote (select pricing fields needed for outcome recording)
    const { data, error } = await supabase
      .from(tableName)
      .update(updateData)
      .eq('id', quoteId)
      .select('id, outcome_status, outcome_notes, closed_at, updated_at, ai_suggested_price_per_unit, total_cost_per_rm, cost_per_piece, final_total_cost, quantity_rm, quantity, competitor_price_per_unit, client_demand_price_per_unit')
      .single();

    if (error) {
      console.error('[API /api/quotes/outcome] Database error:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to update outcome' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Quote not found' },
        { status: 404 }
      );
    }

    // Record pricing outcome for AI learning (fire-and-forget)
    if (outcomeStatus === 'won' || outcomeStatus === 'lost') {
      try {
        // Extract pricing data from the quote
        const quotedPrice = data.ai_suggested_price_per_unit || 
                          (data.total_cost_per_rm || data.cost_per_piece) ||
                          (data.final_total_cost && (data.quantity_rm || data.quantity) 
                            ? data.final_total_cost / (data.quantity_rm || data.quantity)
                            : null);

        if (quotedPrice && typeof quotedPrice === 'number' && quotedPrice > 0) {
          // Fire-and-forget: record outcome without blocking
          recordPricingOutcome({
            productType: productType,
            quotedPrice: quotedPrice,
            competitorPrice: data.competitor_price_per_unit || null,
            clientDemandPrice: data.client_demand_price_per_unit || null,
            outcome: outcomeStatus,
          }).catch(err => {
            console.warn('[API] Failed to record pricing outcome (non-critical):', err.message);
          });
        }
      } catch (error: any) {
        console.warn('[API] Error recording pricing outcome (non-critical):', error.message);
        // Don't fail the request if outcome recording fails
      }
    }

    // Trigger AI knowledge sync based on outcome (fire-and-forget)
    if (outcomeStatus === 'won') {
      triggerKnowledgeSync({ type: 'pricingWin', entityId: quoteId });
    } else if (outcomeStatus === 'lost') {
      triggerKnowledgeSync({ type: 'pricingLoss', entityId: quoteId });
    } else {
      triggerKnowledgeSync({ type: 'quotation', entityId: quoteId });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        outcome_status: data.outcome_status,
        outcome_notes: data.outcome_notes,
        closed_at: data.closed_at,
        updated_at: data.updated_at,
      },
      message: `Outcome updated to "${outcomeStatus}" successfully`,
    });
  } catch (error: any) {
    console.error('[API /api/quotes/outcome] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/quotes/outcome?quoteId=123&productType=mbcb
 * 
 * Retrieves the outcome status of a quotation
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const quoteId = searchParams.get('quoteId');
    const productType = searchParams.get('productType');

    // Validation
    if (!quoteId || isNaN(Number(quoteId))) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing quoteId' },
        { status: 400 }
      );
    }

    if (!productType || !['mbcb', 'signages', 'paint'].includes(productType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing productType' },
        { status: 400 }
      );
    }

    // Determine table name
    const tableName = productType === 'mbcb' 
      ? 'quotes_mbcb' 
      : productType === 'signages' 
      ? 'quotes_signages' 
      : 'quotes_paint';

    // Create Supabase client
    const supabase = createSupabaseServerClient();

    // Fetch the quote
    const { data, error } = await supabase
      .from(tableName)
      .select('id, outcome_status, outcome_notes, closed_at')
      .eq('id', Number(quoteId))
      .single();

    if (error) {
      console.error('[API /api/quotes/outcome] Database error:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to fetch outcome' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Quote not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        outcome_status: data.outcome_status || 'pending',
        outcome_notes: data.outcome_notes,
        closed_at: data.closed_at,
      },
    });
  } catch (error: any) {
    console.error('[API /api/quotes/outcome] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
      );
  }
}

