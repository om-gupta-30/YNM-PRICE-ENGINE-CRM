import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

/**
 * GET /api/pricing/insights
 * 
 * Returns pricing intelligence metrics aggregated from quotation tables
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();

    // ============================================
    // 1. Fetch data from all quotation tables
    // ============================================
    
    // Fetch MBCB quotes (W-Beam, Thrie, Double W-Beam)
    const { data: mbcbQuotes, error: mbcbError } = await supabase
      .from('quotes_mbcb')
      .select('total_cost_per_rm, competitor_price_per_unit, client_demand_price_per_unit, ai_suggested_price_per_unit, ai_win_probability, ai_pricing_insights, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (mbcbError) {
      console.error('[API /api/pricing/insights] Error fetching MBCB quotes:', mbcbError);
    }

    // Fetch Signages quotes
    const { data: signagesQuotes, error: signagesError } = await supabase
      .from('quotes_signages')
      .select('cost_per_piece, competitor_price_per_unit, client_demand_price_per_unit, ai_suggested_price_per_unit, ai_win_probability, ai_pricing_insights, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (signagesError) {
      console.error('[API /api/pricing/insights] Error fetching Signages quotes:', signagesError);
    }

    // Combine all quotes
    const allQuotes = [
      ...(mbcbQuotes || []).map(q => ({
        quotedPrice: q.total_cost_per_rm,
        competitorPrice: q.competitor_price_per_unit,
        clientDemand: q.client_demand_price_per_unit,
        aiSuggestedPrice: q.ai_suggested_price_per_unit,
        aiWinProbability: q.ai_win_probability,
        aiPricingInsights: q.ai_pricing_insights,
        createdAt: q.created_at,
      })),
      ...(signagesQuotes || []).map(q => ({
        quotedPrice: q.cost_per_piece,
        competitorPrice: q.competitor_price_per_unit,
        clientDemand: q.client_demand_price_per_unit,
        aiSuggestedPrice: q.ai_suggested_price_per_unit,
        aiWinProbability: q.ai_win_probability,
        aiPricingInsights: q.ai_pricing_insights,
        createdAt: q.created_at,
      })),
    ];

    // ============================================
    // 2. Calculate Metrics
    // ============================================

    // Metric 1: Avg competitor vs quoted price difference %
    const quotesWithCompetitor = allQuotes.filter(q => q.competitorPrice && q.quotedPrice);
    const avgCompetitorDifference = quotesWithCompetitor.length > 0
      ? quotesWithCompetitor.reduce((sum, q) => {
          const diff = ((q.quotedPrice! - q.competitorPrice!) / q.competitorPrice!) * 100;
          return sum + diff;
        }, 0) / quotesWithCompetitor.length
      : 0;

    // Metric 2: Avg win probability suggested by AI
    const quotesWithAI = allQuotes.filter(q => q.aiWinProbability !== null && q.aiWinProbability !== undefined);
    const avgWinProbability = quotesWithAI.length > 0
      ? quotesWithAI.reduce((sum, q) => sum + q.aiWinProbability!, 0) / quotesWithAI.length
      : 0;

    // Metric 3: Count of times user accepted AI suggested price
    const aiAcceptedCount = allQuotes.filter(q => {
      if (!q.aiPricingInsights) return false;
      const insights = typeof q.aiPricingInsights === 'string' 
        ? JSON.parse(q.aiPricingInsights) 
        : q.aiPricingInsights;
      return insights?.appliedByUser === true;
    }).length;

    // Metric 4: Count of times user changed/overrode AI suggestion
    const aiOverrideCount = allQuotes.filter(q => {
      if (!q.aiPricingInsights) return false;
      const insights = typeof q.aiPricingInsights === 'string' 
        ? JSON.parse(q.aiPricingInsights) 
        : q.aiPricingInsights;
      return insights?.overrideReason !== null && insights?.overrideReason !== undefined;
    }).length;

    // Metric 5: Historical pricing trend (last 20 quotes)
    const last20Quotes = allQuotes
      .filter(q => q.quotedPrice && q.createdAt)
      .slice(0, 20)
      .reverse(); // Oldest to newest

    const pricingTrend = last20Quotes.map((q, index) => ({
      index: index + 1,
      quotedPrice: q.quotedPrice,
      aiSuggestedPrice: q.aiSuggestedPrice,
      competitorPrice: q.competitorPrice,
      date: new Date(q.createdAt!).toLocaleDateString('en-IN', { 
        month: 'short', 
        day: 'numeric' 
      }),
    }));

    // ============================================
    // 3. Return Metrics
    // ============================================

    const metrics = {
      avgCompetitorDifference: Number(avgCompetitorDifference.toFixed(2)),
      avgWinProbability: Number(avgWinProbability.toFixed(1)),
      aiAcceptedCount,
      aiOverrideCount,
      totalQuotesWithAI: quotesWithAI.length,
      totalQuotesWithCompetitor: quotesWithCompetitor.length,
      pricingTrend,
    };

    console.log('[API /api/pricing/insights] Metrics calculated:', {
      totalQuotes: allQuotes.length,
      quotesWithAI: quotesWithAI.length,
      aiAcceptedCount,
      aiOverrideCount,
    });

    return NextResponse.json({
      success: true,
      data: metrics,
    }, { status: 200 });

  } catch (error: any) {
    console.error('[API /api/pricing/insights] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch pricing insights',
      },
      { status: 500 }
    );
  }
}

