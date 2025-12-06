/**
 * AI Pricing Analysis Service
 * 
 * Uses Gemini AI to analyze pricing context and provide intelligent recommendations.
 * Uses SAME Gemini client as CRM AI module (utils/ai.ts)
 */

import { runGemini } from '@/utils/ai';
import { loadBusinessKnowledge } from '@/lib/ai/knowledgeLoader';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

// Confirm pricing engine uses same client as CRM
console.log('[AI] Pricing engine now using same Gemini client as CRM');
import { analyzePricingPerformance, formatLearningStatsForPrompt, type PricingLearningStats } from './pricingLearningEngine';
import { findSimilarPastPrice } from './pricingMemory';
import { getWinningPatterns } from './pricingOutcomeMemory';
import { adjustPriceForRole, roleBasedInsightMessage } from '@/lib/ai/pricingRoleBehavior';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface PricingAnalysisInput {
  productType: 'mbcb' | 'signages' | 'paint';
  ourPricePerUnit: number; // Current quoted price to client
  competitorPricePerUnit?: number | null; // Cost price (price we buy from competitor) - this is our cost
  clientDemandPricePerUnit?: number | null; // What client wants to pay
  quantity?: number; // Optional: quantity for analysis
  costPerUnit?: number | null; // Optional: cost per unit for margin calculation (same as competitorPricePerUnit)
  productSpecs?: Record<string, any>; // Optional: thickness, size, coating, etc.
  includeLearningContext?: boolean; // Whether to include historical learning data (default: true)
  quotationId?: number; // Optional: quotation ID for loading business knowledge context
  subAccountId?: number; // Optional: Sub-account ID for client-specific negotiation patterns
  userRole?: string; // Optional: User role (admin, employee, etc.) for role-based pricing adjustments
}

export interface PricingAnalysisOutput {
  winProbability: number; // 0-100 - Win probability at current quoted price (ourPricePerUnit)
  guaranteedWinPrice: number; // Price that would guarantee 100% win probability (must be >= competitor price)
  reasoning: string | {
    competitorAnalysis?: string; // Detailed competitor analysis
    historicalComparison?: string; // What past data shows
    demandAssessment?: string; // Market demand impact
    marginConsideration?: string; // Profit margin analysis
  };
  suggestions: string[];
  historicalInsight?: string; // Interpretation of historical patterns
  negotiationNotes?: string[]; // Negotiation guidance and talking points
  warnings?: string[]; // Warnings about pricing risks or concerns
  competitivePosition?: 'ABOVE_MARKET' | 'AT_MARKET' | 'BELOW_MARKET'; // Price positioning relative to competitors
  pricingStrategy?: string; // Market positioning strategy recommendation
  negotiationLeverage?: string[]; // Competitive advantages to highlight in negotiation
  confidenceFactors?: {
    dataQuality?: 'high' | 'medium' | 'low'; // Quality of input data
    historicalRelevance?: 'high' | 'medium' | 'low'; // Relevance of historical data
    competitorDataReliability?: 'high' | 'medium' | 'low'; // Reliability of competitor data
  };
  learningInsights?: {
    aiAccuracy: number; // AI accuracy percentage
    overrideAccuracy: number; // Human override accuracy percentage
    recentWins: string[]; // What made recent wins successful
    recentLosses: string[]; // Why recent losses occurred
    priceSensitivity: string; // Price sensitivity patterns
    productInsights: string[]; // Product-specific insights
    trendAnalysis: string; // Are we getting better or worse?
  };
  marginAnalysis?: {
    suggestedMargin: number; // Margin % for recommended price
    minimumAcceptableMargin: number; // Minimum margin threshold
    optimalMargin: number; // Optimal margin based on historical data
    marketAverageMargin: number; // Average margin in market
    marginVsMarket: number; // Difference from market average
  };
  marginWarnings?: string[]; // Warnings if margin is too low
  marginTrends?: {
    byQuantity: string; // How margins change with quantity
    byClientType: string; // How margins change by client type
    bySeason: string; // How margins change by season
    overallTrend: string; // Overall margin trend
  };
  negotiationStrategy?: {
    openingPrice: number; // Suggested opening price (can be higher than recommended)
    walkAwayPrice: number; // Minimum acceptable price
    concessionPlan: {
      firstConcession: number; // First price drop amount
      secondConcession: number; // Second price drop amount (if needed)
      finalConcession: number; // Final price drop amount
      strategy: string; // Concession strategy description
    };
    valueAddSuggestions: string[]; // Non-price negotiation levers
    alternativeOffers: string[]; // Alternative offers (volume discount, payment terms, etc.)
    psychologicalInsights: string; // Client negotiation behavior insights
    clientPatterns: string; // Client-specific negotiation patterns
  };
  openingPrice?: number; // Alias for negotiationStrategy.openingPrice
  walkAwayPrice?: number; // Alias for negotiationStrategy.walkAwayPrice
  concessionPlan?: {
    firstConcession: number;
    secondConcession: number;
    finalConcession: number;
    strategy: string;
  };
}

// ============================================
// SYSTEM PROMPT BUILDER
// ============================================

function buildSystemPrompt(): string {
  return `You are a senior pricing strategist for a trading company specializing in road safety infrastructure products.

BUSINESS CONTEXT:
- Business Model: We BUY products from competitors and SELL to clients (trading/reselling)
- Competitor Price = Our Cost: The competitor price is the price we pay to buy the product (our cost)
- We NEVER quote below competitor price: We must always quote above our cost (competitor price) to make profit
- Target Profit Margins: Minimum 15%, Optimal 25-30%, Maximum 40%
- Market Positioning: Quality-focused provider with strong service reputation
- Negotiation Flow: We quote a price → Client tells us what they want → We negotiate until consensus → Close deal

PRICING CONSTRAINTS:
1. NEVER go below competitor price: Our quoted price must ALWAYS be above competitor price (our cost)
2. Minimum Acceptable Margin: 15% above competitor price (never go below this threshold)
3. Win Probability: Calculate based on current quoted price vs client demand and market conditions
4. Guaranteed Win Price: Suggest a price that ensures 100% win probability while maintaining minimum 15% margin above competitor price

YOUR ANALYSIS PROCESS - THINK STEP-BY-STEP:
1. CURRENT PRICE ANALYSIS:
   - Analyze the CURRENT QUOTED PRICE (ourPricePerUnit) that we've already quoted to the client
   - Calculate win probability (0-100) at this current quoted price
   - Compare current price vs competitor price (our cost) - ensure we're above cost
   - Compare current price vs client demand price (if provided)
   - Assess margin at current price: (current price - competitor price) / competitor price * 100

2. COMPETITOR PRICE (COST) ANALYSIS:
   - Competitor price = Our cost (we buy from competitor)
   - Calculate margin: (our price - competitor price) / competitor price * 100
   - Ensure our quoted price is ALWAYS above competitor price (minimum 15% margin)
   - Reference historical win/loss patterns at similar margins
   - Rate confidence in competitor data (high/medium/low)

3. CLIENT DEMAND ASSESSMENT:
   - Evaluate client demand price vs our current quoted price
   - Assess negotiation room: How much can we negotiate down while maintaining margin?
   - Consider price sensitivity based on historical patterns
   - Factor in urgency, client type, and relationship

4. HISTORICAL COMPARISON:
   - Find similar past quotations (same product type, similar specs)
   - Analyze outcomes: win/loss rate at similar price points
   - Identify patterns: what prices led to wins vs losses
   - Rate relevance of historical data (high/medium/low)

5. GUARANTEED WIN PRICE CALCULATION:
   - Calculate the price that would guarantee 100% win probability
   - This price must be >= competitor price + 15% (minimum margin)
   - Consider client demand price: if client wants ₹X, guaranteed win might be close to ₹X but above our cost
   - Balance between competitiveness (to win) and profitability (to maintain margin)

OUTPUT FORMAT - Return JSON strictly in this structure:
{
  "winProbability": number (0-100) - Win probability at CURRENT QUOTED PRICE (ourPricePerUnit),
  "guaranteedWinPrice": number - Price that would guarantee 100% win probability (MUST be >= competitor price + 15%),
  "reasoning": {
    "competitorAnalysis": "Detailed analysis of competitor price positioning, market comparison, competitive advantages, and win/loss history. Include specific percentages and data points.",
    "historicalComparison": "What past similar quotations show - win/loss patterns, price gaps, margin performance. Reference specific examples if available.",
    "demandAssessment": "Market demand evaluation - client budget constraints, price sensitivity, quantity impact, urgency factors.",
    "marginConsideration": "Profit margin analysis - calculated margin, comparison to targets, sustainability assessment, risk evaluation."
  },
  "suggestions": ["actionable tip 1", "actionable tip 2", "actionable tip 3"],
  "warnings": ["risk 1", "risk 2"],
  "confidenceFactors": {
    "dataQuality": "high" | "medium" | "low",
    "historicalRelevance": "high" | "medium" | "low",
    "competitorDataReliability": "high" | "medium" | "low"
  },
  "historicalInsight": "Summary interpretation of historical patterns",
  "negotiationNotes": ["talking point 1", "talking point 2"],
  "competitivePosition": "ABOVE_MARKET" | "AT_MARKET" | "BELOW_MARKET",
  "pricingStrategy": "Market positioning strategy recommendation",
  "negotiationLeverage": ["advantage 1", "advantage 2"]
}

EXAMPLE SCENARIOS:

Example 1 - Competitive Win Scenario:
Input: Our quoted price ₹500, Competitor (cost) ₹480, Client demand ₹470, Quantity 1000
Expected Output:
{
  "winProbability": 75,
  "guaranteedWinPrice": 485,
  "reasoning": {
    "competitorAnalysis": "We are 4.2% above competitor/cost (₹500 vs ₹480). Margin = 4.17% which is below minimum 15%. We must maintain at least 15% margin above cost. Competitor data reliability: high (verified quote).",
    "historicalComparison": "Last 5 similar quotes: 3 wins at ₹485-495 range (avg margin 21%), 2 losses at ₹510+ (too high). Pattern: Sweet spot is ₹485-495 for this quantity. Historical relevance: high (same product, similar quantity).",
    "demandAssessment": "Client demand ₹470 is 6% below our quoted price ₹500. At current price, win probability is 75%. Client wants ₹470 but we can't go below cost ₹480. Negotiation room: ₹500 down to ₹485-490 range.",
    "marginConsideration": "At current price ₹500: Margin = 4.17% (BELOW minimum 15% - WARNING). At guaranteed win price ₹485: Margin = 1.04% (STILL BELOW minimum - need to recalculate). Must ensure guaranteed win price maintains 15% margin minimum."
  },
  "confidenceFactors": {
    "dataQuality": "high",
    "historicalRelevance": "high",
    "competitorDataReliability": "high"
  }
}

Example 2 - Premium Positioning Scenario:
Input: Our quoted price ₹600, Competitor (cost) ₹550, Client demand ₹580, Quantity 500
Expected Output:
{
  "winProbability": 65,
  "guaranteedWinPrice": 590,
  "reasoning": {
    "competitorAnalysis": "We are 9.1% above competitor/cost (₹600 vs ₹550). Margin = 9.09% which is below minimum 15%. We must maintain at least 15% margin above cost. Competitor data reliability: medium (estimated quote).",
    "historicalComparison": "Similar premium quotes: 2 wins at ₹585-595 (clients valued quality), 3 losses at ₹600+ (too high). Pattern: Premium acceptable up to ₹595. Historical relevance: medium (similar specs, different quantity).",
    "demandAssessment": "Client demand ₹580 is 3.4% below our quoted price ₹600. At current price, win probability is 65%. Client wants ₹580, we can negotiate down to ₹590-595 range while maintaining margin.",
    "marginConsideration": "At current price ₹600: Margin = 9.09% (BELOW minimum 15% - WARNING). At guaranteed win price ₹590: Margin = 7.27% (STILL BELOW minimum - need to recalculate). Must ensure guaranteed win price maintains 15% margin minimum (₹632.50 minimum)."
  },
  "confidenceFactors": {
    "dataQuality": "high",
    "historicalRelevance": "medium",
    "competitorDataReliability": "medium"
  }
}

Example 3 - Market Entry / Low Data Scenario:
Input: Our quoted price ₹400, Competitor (cost) ₹350, Client demand ₹380, Quantity 200
Expected Output:
{
  "winProbability": 70,
  "guaranteedWinPrice": 402.50,
  "reasoning": {
    "competitorAnalysis": "We are 14.3% above competitor/cost (₹400 vs ₹350). Margin = 14.29% which is just below minimum 15%. We must maintain at least 15% margin above cost. Competitor data reliability: high (verified cost).",
    "historicalComparison": "Limited historical data for this product/quantity combination. Available data shows 65% win rate at ₹390-400 range. Historical relevance: low (insufficient similar quotes).",
    "demandAssessment": "Client demand ₹380 is 5% below our quoted price ₹400. At current price, win probability is 70%. Client wants ₹380 but we can't go below cost ₹350. Minimum price with 15% margin = ₹402.50.",
    "marginConsideration": "At current price ₹400: Margin = 14.29% (just below minimum 15%). At guaranteed win price ₹402.50: Margin = 15% (meets minimum requirement). This ensures profitability while maximizing win probability."
  },
  "confidenceFactors": {
    "dataQuality": "medium",
    "historicalRelevance": "low",
    "competitorDataReliability": "low"
  }
}

CRITICAL REQUIREMENTS:
- Calculate win probability (0-100) at the CURRENT QUOTED PRICE (ourPricePerUnit)
- Calculate guaranteedWinPrice that ensures 100% win probability
- guaranteedWinPrice MUST be >= competitor price + 15% (minimum margin requirement)
- NEVER suggest a price below competitor price (our cost)
- Always provide step-by-step reasoning in the reasoning object
- Include specific percentages, numbers, and data points in your analysis
- Rate confidence for each factor (dataQuality, historicalRelevance, competitorDataReliability)
- Always explain what specific data influenced your recommendation
- If historical data is missing, state clearly and use analytical reasoning
- Provide actionable suggestions for negotiation strategy
- Focus on: What's the win probability at current price? What price should we close at for 100% win?`;
}

// ============================================
// USER PROMPT BUILDER
// ============================================

async function buildUserPrompt(
  input: PricingAnalysisInput, 
  learningContext?: string,
  learningContextObj?: {
    historySummary: string | null;
    winPatterns: string[];
    lossPatterns: string[];
    similarQuotes: any[];
  },
  previousPricingContext?: string,
  winningInsights?: string,
  detailedLearningContext?: string
): Promise<string> {
  const {
    productType,
    ourPricePerUnit,
    competitorPricePerUnit,
    clientDemandPricePerUnit,
    quantity,
    productSpecs,
  } = input;

  // Format product type
  const productName = productType === 'mbcb' 
    ? 'Metal Beam Crash Barrier (MBCB)'
    : productType === 'signages'
    ? 'Road Signages'
    : 'Thermoplastic Paint';

  // Build pricing context with detailed competitor analysis
  let pricingContext = `Product: ${productName}
Our Current Quoted Price: ₹${ourPricePerUnit.toFixed(2)} per unit${quantity ? `\nQuantity: ${quantity} units` : ''}`;

  // Detailed competitor price analysis (competitor price = our cost)
  if (competitorPricePerUnit && competitorPricePerUnit > 0) {
    const priceDifference = ourPricePerUnit - competitorPricePerUnit;
    const priceDifferencePercent = (priceDifference / competitorPricePerUnit) * 100;
    const margin = (priceDifference / competitorPricePerUnit) * 100;
    
    pricingContext += `\n\nCost Analysis (Competitor Price = Our Cost):
Competitor Price (Our Cost): ₹${competitorPricePerUnit.toFixed(2)} per unit
Our Quoted Price: ₹${ourPricePerUnit.toFixed(2)} per unit
Margin: ${margin.toFixed(2)}% ${margin >= 15 ? '(✓ Meets minimum 15%)' : '(⚠️ Below minimum 15%)'}
Price Above Cost: ₹${priceDifference.toFixed(2)} (${priceDifferencePercent.toFixed(1)}% above cost)`;
    
    if (ourPricePerUnit < competitorPricePerUnit) {
      pricingContext += `\n⚠️ WARNING: Our quoted price is BELOW our cost! This is not allowed. We must quote above competitor price.`;
    }
  } else {
    pricingContext += `\n\nCompetitor Price (Our Cost): Not provided`;
  }

  if (clientDemandPricePerUnit && clientDemandPricePerUnit > 0) {
    pricingContext += `\nClient Demand Price: ₹${clientDemandPricePerUnit.toFixed(2)} per unit`;
    
    // Calculate positioning relative to client demand
    if (competitorPricePerUnit && competitorPricePerUnit > 0) {
      const ourVsClient = ((ourPricePerUnit - clientDemandPricePerUnit) / clientDemandPricePerUnit) * 100;
      const competitorVsClient = ((competitorPricePerUnit - clientDemandPricePerUnit) / clientDemandPricePerUnit) * 100;
      
      pricingContext += `\nPrice vs Client Demand:
- Our price: ${ourVsClient > 0 ? '+' : ''}${ourVsClient.toFixed(1)}% ${ourVsClient > 0 ? 'above' : 'below'} client demand
- Competitor price: ${competitorVsClient > 0 ? '+' : ''}${competitorVsClient.toFixed(1)}% ${competitorVsClient > 0 ? 'above' : 'below'} client demand`;
    }
  }

  // Add product specs if available
  if (productSpecs && Object.keys(productSpecs).length > 0) {
    pricingContext += `\n\nProduct Specifications:`;
    Object.entries(productSpecs).forEach(([key, value]) => {
      pricingContext += `\n- ${key}: ${value}`;
    });
  }

  // Add learning context from historical data
  if (learningContext) {
    pricingContext += `\n\n${learningContext}`;
  }

  // Add structured learning context for reasoning
  if (learningContextObj) {
    pricingContext += `\n\nRelevant history:\n${JSON.stringify(learningContextObj, null, 2)}`;
  }

  // Add previous pricing context if available
  if (previousPricingContext) {
    pricingContext += `\n\n${previousPricingContext}`;
  }

  // Add winning insights if available
  if (winningInsights) {
    pricingContext += `\n\n${winningInsights}`;
  }

  // Add detailed "What We Learned" section
  if (detailedLearningContext) {
    pricingContext += `\n\n${detailedLearningContext}`;
  }

  // Add competitor win/loss history section
  let competitorHistorySection = '';
  if (competitorPricePerUnit && competitorPricePerUnit > 0) {
    competitorHistorySection = `\n\nCompetitor Win/Loss History:
When competitor price was around ₹${competitorPricePerUnit.toFixed(2)}:
- Analyze historical outcomes where competitor prices were similar
- Identify patterns: Did we win more when above/below/at competitor price?
- Note any competitive advantages that led to wins`;
  }

  pricingContext += competitorHistorySection;

  pricingContext += `\n\nAnalyze the pricing situation and provide:
1. Win probability (0-100) at the CURRENT QUOTED PRICE (₹${ourPricePerUnit.toFixed(2)})
2. A guaranteed win price (price that would ensure 100% win probability)
   - MUST be >= competitor price + 15% (minimum margin requirement)
   - Balance between competitiveness (to win) and profitability (to maintain margin)
   - Consider client demand price if provided
3. Clear reasoning for your analysis
4. 2-3 actionable suggestions for negotiation strategy
5. Margin analysis at current price and guaranteed win price

CRITICAL CONSTRAINTS:
- We NEVER quote below competitor price (our cost)
- Minimum margin: 15% above competitor price
- Guaranteed win price must maintain minimum 15% margin
- If client demand is below our minimum price (cost + 15%), explain the situation

Consider:
- Current quoted price vs client demand (negotiation room)
- Margin at current price (must be >= 15%)
- Historical win/loss patterns at similar price points
- How much can we negotiate down while maintaining minimum margin?
- What price should we close at for 100% guaranteed win?`;

  return pricingContext;
}

// ============================================
// MARGIN ANALYSIS FUNCTIONS
// ============================================

/**
 * Calculate margin percentage
 */
function calculateMargin(price: number, cost: number): number {
  if (!cost || cost <= 0) return 0;
  return ((price - cost) / cost) * 100;
}

/**
 * Fetch historical margin data for analysis
 */
async function fetchHistoricalMargins(
  productType: 'mbcb' | 'signages' | 'paint',
  lookbackDays: number = 90
): Promise<{
  margins: number[];
  averageMargin: number;
  optimalMargin: number;
  minimumMargin: number;
  marketAverageMargin: number;
  marginsByQuantity: Record<string, number[]>;
  marginsByMonth: Record<string, number[]>;
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
    lookbackDate.setDate(lookbackDate.getDate() - lookbackDays);
    
    const { data: quotes } = await supabase
      .from(tableName)
      .select(`${priceField}, quantity_rm, quantity, created_at, outcome_status, competitor_price_per_unit, ai_suggested_price_per_unit`)
      .not(priceField, 'is', null)
      .gte('created_at', lookbackDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(200);
    
    if (!quotes || quotes.length === 0) {
      return {
        margins: [],
        averageMargin: 0,
        optimalMargin: 0,
        minimumMargin: 15,
        marketAverageMargin: 0,
        marginsByQuantity: {},
        marginsByMonth: {},
      };
    }
    
    const margins: number[] = [];
    const marginsByQuantity: Record<string, number[]> = {};
    const marginsByMonth: Record<string, number[]> = {};
    
    quotes.forEach(quote => {
      const price = priceField === 'total_cost_per_rm' 
        ? (quote as any).total_cost_per_rm 
        : (quote as any).cost_per_piece;
      const aiPrice = quote.ai_suggested_price_per_unit;
      
      if (price && aiPrice && aiPrice > 0) {
        const estimatedCost = aiPrice / 1.2;
        const margin = calculateMargin(price, estimatedCost);
        if (margin > 0 && margin < 200) {
          margins.push(margin);
          
          const quantity = quote.quantity_rm || quote.quantity || 0;
          let qtyRange = 'small';
          if (quantity >= 1000) qtyRange = 'large';
          else if (quantity >= 500) qtyRange = 'medium';
          
          if (!marginsByQuantity[qtyRange]) {
            marginsByQuantity[qtyRange] = [];
          }
          marginsByQuantity[qtyRange].push(margin);
          
          const month = new Date(quote.created_at).toISOString().substring(0, 7);
          if (!marginsByMonth[month]) {
            marginsByMonth[month] = [];
          }
          marginsByMonth[month].push(margin);
        }
      }
    });
    
    const averageMargin = margins.length > 0
      ? margins.reduce((sum, m) => sum + m, 0) / margins.length
      : 0;
    
    const sortedMargins = [...margins].sort((a, b) => b - a);
    const topQuartile = Math.ceil(sortedMargins.length * 0.25);
    const optimalMargin = topQuartile > 0
      ? sortedMargins.slice(0, topQuartile).reduce((sum, m) => sum + m, 0) / topQuartile
      : averageMargin;
    
    const minimumMargin = sortedMargins.length > 0
      ? sortedMargins[Math.floor(sortedMargins.length * 0.9)]
      : 15;
    
    const quotesWithCompetitor = quotes.filter(q => {
      const price = priceField === 'total_cost_per_rm' 
        ? (q as any).total_cost_per_rm 
        : (q as any).cost_per_piece;
      return q.competitor_price_per_unit && price && q.ai_suggested_price_per_unit;
    });
    let marketAverageMargin = 0;
    if (quotesWithCompetitor.length > 0) {
      const marketMargins = quotesWithCompetitor.map(q => {
        const competitorPrice = q.competitor_price_per_unit;
        const aiPrice = q.ai_suggested_price_per_unit;
        if (competitorPrice && aiPrice && aiPrice > 0) {
          const estimatedCost = aiPrice / 1.2;
          return calculateMargin(competitorPrice, estimatedCost);
        }
        return null;
      }).filter((m): m is number => m !== null && m > 0);
      
      marketAverageMargin = marketMargins.length > 0
        ? marketMargins.reduce((sum, m) => sum + m, 0) / marketMargins.length
        : averageMargin;
    } else {
      marketAverageMargin = averageMargin;
    }
    
    return {
      margins,
      averageMargin,
      optimalMargin,
      minimumMargin,
      marketAverageMargin,
      marginsByQuantity,
      marginsByMonth,
    };
  } catch (error: any) {
    console.error('[AI Pricing] Error fetching historical margins:', error.message);
    return {
      margins: [],
      averageMargin: 0,
      optimalMargin: 0,
      minimumMargin: 15,
      marketAverageMargin: 0,
      marginsByQuantity: {},
      marginsByMonth: {},
    };
  }
}

/**
 * Analyze margin trends
 */
function analyzeMarginTrends(
  marginsByQuantity: Record<string, number[]>,
  marginsByMonth: Record<string, number[]>
): {
  byQuantity: string;
  byClientType: string;
  bySeason: string;
  overallTrend: string;
} {
  let byQuantity = 'No quantity trend data available';
  if (Object.keys(marginsByQuantity).length > 0) {
    const trends: string[] = [];
    Object.entries(marginsByQuantity).forEach(([range, margins]) => {
      if (margins.length > 0) {
        const avg = margins.reduce((sum, m) => sum + m, 0) / margins.length;
        trends.push(`${range} orders (${margins.length} quotes): ${avg.toFixed(1)}% avg margin`);
      }
    });
    if (trends.length > 0) {
      byQuantity = trends.join('; ');
    }
  }
  
  let bySeason = 'No seasonal trend data available';
  if (Object.keys(marginsByMonth).length >= 2) {
    const months = Object.keys(marginsByMonth).sort();
    const recentMonths = months.slice(-3);
    const olderMonths = months.slice(0, -3);
    
    if (recentMonths.length > 0 && olderMonths.length > 0) {
      const recentAvg = recentMonths.reduce((sum, month) => {
        const margins = marginsByMonth[month];
        return sum + (margins.reduce((s, m) => s + m, 0) / margins.length);
      }, 0) / recentMonths.length;
      
      const olderAvg = olderMonths.reduce((sum, month) => {
        const margins = marginsByMonth[month];
        return sum + (margins.reduce((s, m) => s + m, 0) / margins.length);
      }, 0) / olderMonths.length;
      
      const change = recentAvg - olderAvg;
      bySeason = `Margins ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change).toFixed(1)}% in recent months (${recentAvg.toFixed(1)}% vs ${olderAvg.toFixed(1)}%)`;
    }
  }
  
  let overallTrend = 'Insufficient data for trend analysis';
  if (Object.keys(marginsByMonth).length >= 3) {
    const months = Object.keys(marginsByMonth).sort();
    const firstHalf = months.slice(0, Math.floor(months.length / 2));
    const secondHalf = months.slice(Math.floor(months.length / 2));
    
    if (firstHalf.length > 0 && secondHalf.length > 0) {
      const firstAvg = firstHalf.reduce((sum, month) => {
        const margins = marginsByMonth[month];
        return sum + (margins.reduce((s, m) => s + m, 0) / margins.length);
      }, 0) / firstHalf.length;
      
      const secondAvg = secondHalf.reduce((sum, month) => {
        const margins = marginsByMonth[month];
        return sum + (margins.reduce((s, m) => s + m, 0) / margins.length);
      }, 0) / secondHalf.length;
      
      const change = secondAvg - firstAvg;
      overallTrend = `Overall margin trend: ${change > 0 ? 'improving' : 'declining'} (${change > 0 ? '+' : ''}${change.toFixed(1)}% change)`;
    }
  }
  
  return {
    byQuantity,
    byClientType: 'Client type analysis requires additional data',
    bySeason,
    overallTrend,
  };
}

// ============================================
// MAIN AI PRICING ANALYSIS FUNCTION
// ============================================

/**
 * Analyze pricing context using Gemini AI and return recommendations
 * 
 * @param input - Pricing context including our price, competitor price, client demand, etc.
 * @returns AI-generated pricing recommendations with win probability
 * 
 * @throws Error if AI service fails (caller should handle gracefully)
 */
export async function analyzePricingWithAI(
  input: PricingAnalysisInput
): Promise<PricingAnalysisOutput> {
  console.log(`[AI] Pricing AI: Starting analysis`);
  console.log('[AI Pricing] Starting analysis for', input.productType);
  console.log(`[AI] Pricing AI: Input`, {
    productType: input.productType,
    quantity: input.quantity,
    hasCompetitorPrice: !!input.competitorPricePerUnit,
    hasClientDemand: !!input.clientDemandPricePerUnit,
    userRole: input.userRole || 'not provided',
    quotationId: input.quotationId || 'not provided',
  });

    // Validate input
  if (!input.ourPricePerUnit || input.ourPricePerUnit <= 0) {
    throw new Error('Invalid our price per unit');
  }

  // Quantity is now optional - no validation needed

  try {
    // Fetch learning context if enabled (default: true)
    let learningStats: Awaited<ReturnType<typeof analyzePricingPerformance>> | null = null;
    let learningContext: string | undefined;
    let detailedLearningContext: string | undefined;
    if (input.includeLearningContext !== false) {
      try {
        learningStats = await analyzePricingPerformance(input.productType, 90);
        learningContext = formatLearningStatsForPrompt(learningStats);
        // detailedLearningContext = await buildDetailedLearningContext(learningStats, input.productType);
        // Note: buildDetailedLearningContext function not implemented, using learningContext instead
        detailedLearningContext = learningContext;
        console.log('[AI Pricing] Including learning context:', learningContext);
        console.log('[AI Pricing] Including detailed learning context');
      } catch (error) {
        console.warn('[AI Pricing] Failed to fetch learning context, continuing without it:', error);
        // Continue without learning context if it fails
      }
    }
    
    // Build learning context object for reasoning
    const learningContextObj = learningStats ? {
      historySummary: learningStats.total_quotes_analyzed > 0
        ? `Analyzed ${learningStats.total_quotes_analyzed} recent quotations. AI accuracy: ${learningStats.ai_accuracy.toFixed(1)}%, Override accuracy: ${learningStats.override_accuracy.toFixed(1)}%.`
        : null,
      winPatterns: learningStats.recent_win_factors || [],
      lossPatterns: [], // Not directly available in PricingLearningStats, will be empty
      similarQuotes: [], // Not directly available, will be empty
    } : {
      historySummary: null,
      winPatterns: [],
      lossPatterns: [],
      similarQuotes: [],
    };

    // Find similar past pricing decisions
    console.log(`[AI] Pricing AI: Fetching pricingMemory (findSimilarPastPrice)`);
    let previousPricing: Awaited<ReturnType<typeof findSimilarPastPrice>> | null = null;
    try {
      if (input.quantity !== undefined && input.quantity !== null) {
        previousPricing = await findSimilarPastPrice({
          productType: input.productType,
          specs: input.productSpecs,
          quantity: input.quantity,
        });
        if (previousPricing) {
          console.log('[AI Pricing] Found similar past price:', previousPricing.lastPrice);
          console.log(`[AI] Pricing AI: pricingMemory returned: ₹${previousPricing.lastPrice} from ${previousPricing.createdAt}`);
        } else {
          console.log(`[AI] Pricing AI: pricingMemory returned: no similar past price found`);
        }
      } else {
        console.log(`[AI] Pricing AI: Skipping pricingMemory - quantity not provided`);
      }
    } catch (error) {
      console.warn('[AI Pricing] Failed to fetch similar past price, continuing without it:', error);
      console.warn(`[AI] Pricing AI: pricingMemory error (non-critical)`);
      // Continue without previous pricing if it fails
    }

    // Get winning patterns for this product type
    console.log(`[AI] Pricing AI: Fetching pricingOutcomeMemory (getWinningPatterns)`);
    let winPatterns: Awaited<ReturnType<typeof getWinningPatterns>> | null = null;
    try {
      winPatterns = await getWinningPatterns(input.productType);
      if (winPatterns) {
        console.log('[AI Pricing] Found winning patterns:', winPatterns);
        console.log(`[AI] Pricing AI: pricingOutcomeMemory returned: ${winPatterns.count} wins, avg ₹${winPatterns.averageWinningPrice}`);
      } else {
        console.log(`[AI] Pricing AI: pricingOutcomeMemory returned: no winning patterns found`);
      }
    } catch (error) {
      console.warn('[AI Pricing] Failed to fetch winning patterns, continuing without it:', error);
      console.warn(`[AI] Pricing AI: pricingOutcomeMemory error (non-critical)`);
      // Continue without winning patterns if it fails
    }

    // Format previous pricing context
    const previousPricingContext = previousPricing
      ? `Previous Pricing Context:
Last similar sale price: ₹${previousPricing.lastPrice.toFixed(2)} per unit
Date: ${new Date(previousPricing.createdAt).toLocaleDateString()}
Quantity: ${previousPricing.quantity}
${previousPricing.outcome ? `Outcome: ${previousPricing.outcome}` : ''}`
      : 'No historical match found.';

    // Format winning insights
    const winningInsights = winPatterns
      ? `Winning Insights:
In the last ${winPatterns.count} wins:
- Avg winning price was: ₹${winPatterns.averageWinningPrice.toFixed(2)} per unit
- Best recorded margin: ${(winPatterns.bestMargin * 100).toFixed(1)}%`
      : 'No win/loss learning available yet.';

    // Load business knowledge context
    console.log(`[AI] Pricing AI: Loading business knowledge`);
    let knowledge;
    try {
      knowledge = await loadBusinessKnowledge({
        quotationId: input.quotationId,
        productType: input.productType,
      });
      console.log('[AI Pricing] Loaded business knowledge context');
      console.log(`[AI] Pricing AI: Knowledge loaded successfully`);
    } catch (error) {
      console.warn('[AI Pricing] Failed to load business knowledge, continuing without it:', error);
      console.warn(`[AI] Pricing AI: Knowledge load failed (non-critical)`);
      // Continue without knowledge context if loading fails
      knowledge = undefined;
    }

    // Build base context for enhanced prompt
    const baseContext = await buildUserPrompt(
      input, 
      learningContext, 
      learningContextObj, 
      previousPricingContext, 
      winningInsights,
      detailedLearningContext
    );

    // Fetch competitor win/loss history if competitor price is available
    let competitorHistory: any = null;
    if (input.competitorPricePerUnit && input.competitorPricePerUnit > 0) {
      try {
        const supabase = createSupabaseServerClient();
        const tableName = input.productType === 'mbcb' ? 'quotes_mbcb' 
          : input.productType === 'signages' ? 'quotes_signages' 
          : 'quotes_paint';
        
        // Find quotations with similar competitor prices (±10% range)
        const priceRange = input.competitorPricePerUnit * 0.1;
        const minPrice = input.competitorPricePerUnit - priceRange;
        const maxPrice = input.competitorPricePerUnit + priceRange;
        
        const { data: similarQuotes } = await supabase
          .from(tableName)
          .select('id, competitor_price_per_unit, ai_suggested_price_per_unit, outcome_status, outcome_notes, created_at')
          .not('competitor_price_per_unit', 'is', null)
          .gte('competitor_price_per_unit', minPrice)
          .lte('competitor_price_per_unit', maxPrice)
          .in('outcome_status', ['won', 'lost'])
          .order('created_at', { ascending: false })
          .limit(20);
        
        if (similarQuotes && similarQuotes.length > 0) {
          const wins = similarQuotes.filter(q => q.outcome_status === 'won');
          const losses = similarQuotes.filter(q => q.outcome_status === 'lost');
          const winRate = (wins.length / similarQuotes.length) * 100;
          
          competitorHistory = {
            totalQuotes: similarQuotes.length,
            wins: wins.length,
            losses: losses.length,
            winRate: winRate.toFixed(1),
            averageCompetitorPrice: similarQuotes.reduce((sum, q) => sum + (q.competitor_price_per_unit || 0), 0) / similarQuotes.length,
            averageOurPrice: similarQuotes
              .filter(q => q.ai_suggested_price_per_unit)
              .reduce((sum, q) => sum + (q.ai_suggested_price_per_unit || 0), 0) / 
              similarQuotes.filter(q => q.ai_suggested_price_per_unit).length,
          };
          
          console.log('[AI Pricing] Found competitor history:', competitorHistory);
        }
      } catch (error: any) {
        console.warn('[AI Pricing] Failed to fetch competitor history:', error.message);
      }
    }

    // Build enhanced prompt with step-by-step reasoning instructions
    const enhancedPrompt = `
PRICING ANALYSIS REQUEST

Follow the step-by-step reasoning process outlined in the system prompt:
1. Competitor Analysis - Compare prices, assess positioning, evaluate competitive advantages
2. Historical Comparison - Reference similar past quotations and outcomes
3. Demand Assessment - Evaluate client budget, price sensitivity, market demand
4. Margin Consideration - Calculate margins, compare to targets, assess sustainability

${competitorHistory ? `\nCompetitor Win/Loss History:
Total similar quotes: ${competitorHistory.totalQuotes}
Wins: ${competitorHistory.wins}, Losses: ${competitorHistory.losses}
Win Rate: ${competitorHistory.winRate}%
Average competitor price in history: ₹${competitorHistory.averageCompetitorPrice.toFixed(2)}
Average our price in wins: ₹${competitorHistory.averageOurPrice ? competitorHistory.averageOurPrice.toFixed(2) : 'N/A'}` : ''}

CRITICAL: Provide detailed reasoning in the structured format with specific data points, percentages, and confidence scores.

Deliver output strictly in JSON format as specified in the system prompt:
{
  "winProbability": number (0-100) - Win probability at CURRENT QUOTED PRICE,
  "guaranteedWinPrice": number - Price for 100% win probability (MUST be >= competitor price + 15%),
  "reasoning": {
    "competitorAnalysis": "Detailed analysis with specific percentages and data points",
    "historicalComparison": "What past data shows with specific examples",
    "demandAssessment": "Market demand impact analysis",
    "marginConsideration": "Profit margin analysis with calculations"
  },
  "suggestions": ["actionable tip 1", "actionable tip 2", "actionable tip 3"],
  "warnings": ["risk 1", "risk 2"],
  "confidenceFactors": {
    "dataQuality": "high" | "medium" | "low",
    "historicalRelevance": "high" | "medium" | "low",
    "competitorDataReliability": "high" | "medium" | "low"
  },
  "historicalInsight": "Summary interpretation",
  "negotiationNotes": ["talking point 1", "talking point 2"],
  "competitivePosition": "ABOVE_MARKET" | "AT_MARKET" | "BELOW_MARKET",
  "pricingStrategy": "Market positioning strategy",
  "negotiationLeverage": ["advantage 1", "advantage 2"]
}

Context data provided:
${baseContext}
`;

    // Build system prompt
    const systemPrompt = buildSystemPrompt();

    // Call Gemini AI with business knowledge context (reuses existing client from utils/ai.ts)
    console.log(`[AI] Pricing AI: Calling runGemini with knowledge context`);
    const response = await runGemini<PricingAnalysisOutput>(
      systemPrompt,
      enhancedPrompt,
      knowledge
    );
    console.log(`[AI] Pricing AI: runGemini completed`);

    // Get cost (competitor price is our cost) - use let since we may reassign it later
    let costPerUnit = input.competitorPricePerUnit || input.costPerUnit || null;
    
    // Check if user is Data Analyst (bypasses pricing role adjustments)
    const normalizedRole = input.userRole?.toLowerCase().replace(/_/g, '') || '';
    const isDataAnalyst = normalizedRole === 'dataanalyst' || normalizedRole === 'analyst';
    console.log(`[AI] Pricing AI: Role detected: ${input.userRole || 'none'} (normalized: ${normalizedRole}, isDataAnalyst: ${isDataAnalyst})`);
    
    const winProbability = typeof response.winProbability === 'number'
      ? Math.max(0, Math.min(100, response.winProbability))
      : 50; // Fallback to neutral probability

    // Parse guaranteed win price (price that would ensure 100% win probability)
    let guaranteedWinPrice: number;
    if (typeof response.guaranteedWinPrice === 'number' && response.guaranteedWinPrice > 0) {
      guaranteedWinPrice = response.guaranteedWinPrice;
    } else {
      // Calculate guaranteed win price if not provided by AI
      // Use client demand price if available, otherwise calculate from current price
      if (input.clientDemandPricePerUnit && input.clientDemandPricePerUnit > 0) {
        // If client demand is provided, guaranteed win should be close to it but above minimum
        guaranteedWinPrice = input.clientDemandPricePerUnit;
      } else {
        // Fallback: 5% below current quoted price
        guaranteedWinPrice = input.ourPricePerUnit * 0.95;
      }
    }
    
    // CRITICAL: Ensure guaranteed win price is NEVER below competitor price (our cost)
    if (costPerUnit && costPerUnit > 0) {
      const minimumPrice = costPerUnit * 1.15; // 15% minimum margin above cost
      if (guaranteedWinPrice < minimumPrice) {
        console.log(`[AI Pricing] Guaranteed win price ${guaranteedWinPrice} is below minimum (${minimumPrice}), adjusting...`);
        guaranteedWinPrice = minimumPrice;
      }
      // Also ensure it's not below cost
      if (guaranteedWinPrice < costPerUnit) {
        console.warn(`[AI Pricing] WARNING: Guaranteed win price ${guaranteedWinPrice} is below cost ${costPerUnit}, setting to minimum`);
        guaranteedWinPrice = minimumPrice;
      }
    }

    // Parse and validate new fields
    const negotiationNotes = Array.isArray(response.negotiationNotes) && response.negotiationNotes.length > 0
      ? response.negotiationNotes.filter((n): n is string => typeof n === 'string' && n.trim().length > 0)
      : [];

    const warnings = Array.isArray(response.warnings) && response.warnings.length > 0
      ? response.warnings.filter((w): w is string => typeof w === 'string' && w.trim().length > 0)
      : [];

    // Parse reasoning - handle both string (legacy) and object (new) formats
    let reasoning: string | PricingAnalysisOutput['reasoning'];
    if (typeof response.reasoning === 'object' && response.reasoning !== null) {
      // New structured format
      const reasoningObj = response.reasoning as {
        competitorAnalysis?: string;
        historicalComparison?: string;
        demandAssessment?: string;
        marginConsideration?: string;
      };
      reasoning = {
        competitorAnalysis: typeof reasoningObj.competitorAnalysis === 'string' 
          ? reasoningObj.competitorAnalysis.trim() 
          : undefined,
        historicalComparison: typeof reasoningObj.historicalComparison === 'string'
          ? reasoningObj.historicalComparison.trim()
          : undefined,
        demandAssessment: typeof reasoningObj.demandAssessment === 'string'
          ? reasoningObj.demandAssessment.trim()
          : undefined,
        marginConsideration: typeof reasoningObj.marginConsideration === 'string'
          ? reasoningObj.marginConsideration.trim()
          : undefined,
      };
    } else {
      // Legacy string format - convert to object for consistency
      const reasoningStr = typeof response.reasoning === 'string' && response.reasoning.trim()
      ? response.reasoning.trim()
      : 'AI analysis completed';
      reasoning = reasoningStr;
    }

    // Parse confidence factors
    const confidenceFactors: PricingAnalysisOutput['confidenceFactors'] | undefined = 
      response.confidenceFactors && typeof response.confidenceFactors === 'object'
        ? {
            dataQuality: ['high', 'medium', 'low'].includes(response.confidenceFactors.dataQuality || '')
              ? response.confidenceFactors.dataQuality as 'high' | 'medium' | 'low'
              : undefined,
            historicalRelevance: ['high', 'medium', 'low'].includes(response.confidenceFactors.historicalRelevance || '')
              ? response.confidenceFactors.historicalRelevance as 'high' | 'medium' | 'low'
              : undefined,
            competitorDataReliability: ['high', 'medium', 'low'].includes(response.confidenceFactors.competitorDataReliability || '')
              ? response.confidenceFactors.competitorDataReliability as 'high' | 'medium' | 'low'
              : undefined,
          }
        : undefined;

    let suggestions = Array.isArray(response.suggestions) && response.suggestions.length > 0
      ? response.suggestions.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
      : ['Review pricing strategy', 'Consider market conditions'];

    // Append role-based insight message if available (only Admin and Employee)
    // Data Analyst should never receive pricing insight messages
    if (!isDataAnalyst) {
      const roleInsight = roleBasedInsightMessage(input.userRole);
      if (roleInsight && suggestions) {
        suggestions.push(roleInsight);
        console.log(`[AI Pricing] Added role-based insight for ${input.userRole}`);
      }
    } else {
      console.log(`[AI Pricing] Data Analyst role detected - skipping pricing insight messages`);
    }

    const historicalInsight = typeof response.historicalInsight === 'string' && response.historicalInsight.trim()
      ? response.historicalInsight.trim()
      : 'No relevant historical learning identified';

    // Parse new competitive analysis fields
    const competitivePosition = response.competitivePosition && 
      ['ABOVE_MARKET', 'AT_MARKET', 'BELOW_MARKET'].includes(response.competitivePosition)
      ? response.competitivePosition
      : (input.competitorPricePerUnit && input.competitorPricePerUnit > 0
          ? (input.ourPricePerUnit > input.competitorPricePerUnit * 1.05 
              ? 'ABOVE_MARKET' 
              : input.ourPricePerUnit < input.competitorPricePerUnit * 0.95 
              ? 'BELOW_MARKET' 
              : 'AT_MARKET')
          : undefined);

    const pricingStrategy = typeof response.pricingStrategy === 'string' && response.pricingStrategy.trim()
      ? response.pricingStrategy.trim()
      : (competitivePosition === 'ABOVE_MARKET' 
          ? 'Premium positioning - emphasize quality and value'
          : competitivePosition === 'BELOW_MARKET'
          ? 'Competitive positioning - leverage price advantage'
          : 'Market-aligned positioning - focus on service and reliability');

    const negotiationLeverage = Array.isArray(response.negotiationLeverage) && response.negotiationLeverage.length > 0
      ? response.negotiationLeverage.filter((l): l is string => typeof l === 'string' && l.trim().length > 0)
      : (competitivePosition === 'BELOW_MARKET'
          ? ['Price advantage over competitors', 'Better value proposition']
          : competitivePosition === 'ABOVE_MARKET'
          ? ['Superior quality and specifications', 'Enhanced service and support']
          : ['Competitive pricing', 'Reliable delivery and service']);

    // Quality calibration: Check if reasoning is poor or missing
    const isPoorReasoning = typeof reasoning === 'string'
      ? (!reasoning || reasoning.length < 30 || reasoning === 'AI analysis completed' || /^(ok|done|complete|finished|analyzed)/i.test(reasoning.trim()))
      : (!reasoning || (!reasoning.competitorAnalysis && !reasoning.historicalComparison && !reasoning.demandAssessment && !reasoning.marginConsideration));

    // Apply fallback logic if AI fails or gives poor reasoning
    const finalReasoning: string | PricingAnalysisOutput['reasoning'] = isPoorReasoning
      ? 'Suggested based on pricing history and competitive benchmark.'
      : reasoning;

    const finalNegotiationNotes = negotiationNotes.length > 0
      ? negotiationNotes
      : ['Consider offering phased discount based on order size.'];

    const finalWarnings = warnings.length > 0 ? warnings : [];

    // Build learning insights for response
    let learningInsights: PricingAnalysisOutput['learningInsights'] | undefined;
    if (learningStats) {
      // Fetch recent wins and losses for insights
      const supabase = createSupabaseServerClient();
      const tableName = input.productType === 'mbcb' 
        ? 'quotes_mbcb' 
        : input.productType === 'signages' 
        ? 'quotes_signages' 
        : 'quotes_paint';
      
      const lookbackDate = new Date();
      lookbackDate.setDate(lookbackDate.getDate() - 90);
      
      const { data: recentQuotes } = await supabase
        .from(tableName)
        .select('outcome_status, outcome_notes, competitor_price_per_unit, client_demand_price_per_unit')
        .in('outcome_status', ['won', 'lost'])
        .not('closed_at', 'is', null)
        .gte('closed_at', lookbackDate.toISOString())
        .order('closed_at', { ascending: false })
        .limit(20);
      
      const wins = recentQuotes?.filter(q => q.outcome_status === 'won') || [];
      const losses = recentQuotes?.filter(q => q.outcome_status === 'lost') || [];
      
      // Analyze price sensitivity
      let priceSensitivity = 'No clear pattern identified';
      if (wins.length > 0 && losses.length > 0) {
        const winsWithClientDemand = wins.filter(w => w.client_demand_price_per_unit);
        const lossesWithClientDemand = losses.filter(l => l.client_demand_price_per_unit);
        
        if (winsWithClientDemand.length > 0 && lossesWithClientDemand.length > 0) {
          const avgWinVsDemand = winsWithClientDemand.reduce((sum, w) => {
            // This would need actual price data, simplified for now
            return sum;
          }, 0);
          priceSensitivity = 'Client shows moderate price sensitivity - competitive pricing important';
        }
      }
      
      // Trend analysis
      let trendAnalysis = 'Insufficient data for trend analysis';
      if (recentQuotes && recentQuotes.length >= 10) {
        const midpoint = Math.floor(recentQuotes.length / 2);
        const recentHalf = recentQuotes.slice(0, midpoint);
        const olderHalf = recentQuotes.slice(midpoint);
        
        const recentWinRate = (recentHalf.filter(q => q.outcome_status === 'won').length / recentHalf.length) * 100;
        const olderWinRate = (olderHalf.filter(q => q.outcome_status === 'won').length / olderHalf.length) * 100;
        
        const trend = recentWinRate - olderWinRate;
        if (Math.abs(trend) > 5) {
          trendAnalysis = `Win rate ${trend > 0 ? 'improving' : 'declining'} (${recentWinRate.toFixed(1)}% recent vs ${olderWinRate.toFixed(1)}% earlier)`;
        } else {
          trendAnalysis = `Win rate stable (${recentWinRate.toFixed(1)}% recent vs ${olderWinRate.toFixed(1)}% earlier)`;
        }
      }
      
      learningInsights = {
        aiAccuracy: learningStats.ai_accuracy,
        overrideAccuracy: learningStats.override_accuracy,
        recentWins: wins.slice(0, 5).map(w => w.outcome_notes || 'Won deal').filter((n, i, arr) => arr.indexOf(n) === i),
        recentLosses: losses.slice(0, 5).map(l => l.outcome_notes || 'Lost deal').filter((n, i, arr) => arr.indexOf(n) === i),
        priceSensitivity,
        productInsights: learningStats.recent_win_factors.slice(0, 5),
        trendAnalysis,
      };
    }

    // ============================================
    // MARGIN ANALYSIS
    // ============================================
    
    let marginAnalysis: PricingAnalysisOutput['marginAnalysis'] | undefined;
    let marginWarnings: string[] = [];
    let marginTrends: PricingAnalysisOutput['marginTrends'] | undefined;
    
    // Try to get from quotation if not provided (costPerUnit already declared above)
    if (!costPerUnit && input.quotationId) {
      try {
        const supabase = createSupabaseServerClient();
        const tableName = input.productType === 'mbcb' 
          ? 'quotes_mbcb' 
          : input.productType === 'signages' 
          ? 'quotes_signages' 
          : 'quotes_paint';
        
        const costField = input.productType === 'mbcb' ? 'total_cost_per_rm' : 'cost_per_piece';
        const { data: quote } = await supabase
          .from(tableName)
          .select(costField)
          .eq('id', input.quotationId)
          .single();
        
        if (quote) {
          const cost = costField === 'total_cost_per_rm' 
            ? (quote as any).total_cost_per_rm 
            : (quote as any).cost_per_piece;
          if (cost) {
            costPerUnit = cost;
          }
        }
      } catch (error) {
        console.warn('[AI Pricing] Could not fetch cost from quotation:', error);
      }
    }
    
    if (costPerUnit && costPerUnit > 0) {
      try {
        // Calculate margin at current quoted price
        const currentMargin = calculateMargin(input.ourPricePerUnit, costPerUnit);
        // Calculate margin at guaranteed win price
        const guaranteedWinMargin = calculateMargin(guaranteedWinPrice, costPerUnit);
        
        // Fetch historical margin data
        const historicalMargins = await fetchHistoricalMargins(input.productType, 90);
        
        // Calculate margin analysis
        marginAnalysis = {
          suggestedMargin: currentMargin, // Margin at current quoted price
          minimumAcceptableMargin: historicalMargins.minimumMargin || 15,
          optimalMargin: historicalMargins.optimalMargin || 25,
          marketAverageMargin: historicalMargins.marketAverageMargin || historicalMargins.averageMargin,
          marginVsMarket: currentMargin - (historicalMargins.marketAverageMargin || historicalMargins.averageMargin),
        };
        
        // Generate margin warnings
        if (currentMargin < marginAnalysis.minimumAcceptableMargin) {
          marginWarnings.push(`⚠️ Margin at current price (${currentMargin.toFixed(1)}%) is below minimum acceptable (${marginAnalysis.minimumAcceptableMargin.toFixed(1)}%)`);
        }
        
        if (guaranteedWinMargin < marginAnalysis.minimumAcceptableMargin) {
          marginWarnings.push(`⚠️ Margin at guaranteed win price (${guaranteedWinMargin.toFixed(1)}%) is below minimum acceptable (${marginAnalysis.minimumAcceptableMargin.toFixed(1)}%)`);
        }
        
        if (currentMargin < marginAnalysis.optimalMargin - 5) {
          marginWarnings.push(`⚠️ Current margin is ${(marginAnalysis.optimalMargin - currentMargin).toFixed(1)}% below optimal margin (${marginAnalysis.optimalMargin.toFixed(1)}%)`);
        }
        
        // Analyze margin trends
        marginTrends = analyzeMarginTrends(
          historicalMargins.marginsByQuantity,
          historicalMargins.marginsByMonth
        );
        
        // Add margin insights to negotiation notes
        if (currentMargin >= marginAnalysis.optimalMargin) {
          finalNegotiationNotes.push(`Strong margin position at current price (${currentMargin.toFixed(1)}%) - room for negotiation if needed`);
        } else if (currentMargin >= marginAnalysis.minimumAcceptableMargin) {
          finalNegotiationNotes.push(`Margin at current price: ${currentMargin.toFixed(1)}% - maintain price discipline`);
        } else {
          finalNegotiationNotes.push(`Low margin at current price (${currentMargin.toFixed(1)}%) - consider value-add services to justify price`);
        }
        
        if (marginAnalysis.marginVsMarket > 5) {
          finalNegotiationNotes.push(`Margin ${marginAnalysis.marginVsMarket.toFixed(1)}% above market - highlight premium value proposition`);
        }
        
        console.log('[AI Pricing] Margin analysis complete:', {
          currentMargin: currentMargin.toFixed(1) + '%',
          guaranteedWinMargin: guaranteedWinMargin.toFixed(1) + '%',
          minimumMargin: marginAnalysis.minimumAcceptableMargin.toFixed(1) + '%',
          optimalMargin: marginAnalysis.optimalMargin.toFixed(1) + '%',
          warningsCount: marginWarnings.length,
        });
      } catch (error: any) {
        console.warn('[AI Pricing] Error in margin analysis:', error.message);
        // Continue without margin analysis if it fails
      }
    } else {
      console.log('[AI Pricing] No cost data available for margin analysis');
    }

    // ============================================
    // NEGOTIATION STRATEGY
    // ============================================
    
    let negotiationStrategy: PricingAnalysisOutput['negotiationStrategy'] | undefined;
    let openingPrice: number | undefined;
    let walkAwayPrice: number | undefined;
    let concessionPlan: PricingAnalysisOutput['concessionPlan'] | undefined;
    
    try {
      // Analyze client-specific negotiation patterns
      // NOTE: analyzeClientNegotiationPatterns function not implemented
      // TODO: Implement this function or remove this feature
      type ClientPatterns = {
        averageNegotiationPercent: number;
        valueAddPreferences: string[];
        patterns: string;
        negotiationFrequency: number;
      };
      const clientPatterns: ClientPatterns | null = null; // await analyzeClientNegotiationPatterns(
        // input.productType,
        // input.subAccountId,
        // 180
      // );
      
      // Calculate average negotiation percent from client patterns
      const avgNegPercent = (clientPatterns as ClientPatterns | null)?.averageNegotiationPercent ?? 0;
      
      // Calculate opening price (current quoted price is our opening)
      openingPrice = input.ourPricePerUnit;
      
      // Calculate walk-away price (minimum acceptable based on margin = guaranteed win price)
      const minimumMargin = marginAnalysis?.minimumAcceptableMargin || 15;
      if (costPerUnit && costPerUnit > 0) {
        walkAwayPrice = Math.max(guaranteedWinPrice, costPerUnit * (1 + minimumMargin / 100));
      } else {
        // Fallback: use guaranteed win price
        walkAwayPrice = guaranteedWinPrice;
      }
      
      // Build concession plan
      const totalNegotiationRoom = openingPrice - walkAwayPrice;
      const firstConcession = totalNegotiationRoom * 0.3; // 30% of room
      const secondConcession = totalNegotiationRoom * 0.4; // 40% of room
      const finalConcession = totalNegotiationRoom * 0.3; // 30% of room
      
      let concessionStrategy = '';
      if (avgNegPercent > 0) {
        const openingPricePercent = Math.min(15, Math.max(5, avgNegPercent + 3));
        concessionStrategy = `Client typically negotiates ${avgNegPercent.toFixed(1)}% down. Start with ${openingPricePercent.toFixed(1)}% buffer. `;
        concessionStrategy += `First concession: ₹${firstConcession.toFixed(2)} (${((firstConcession / openingPrice) * 100).toFixed(1)}%). `;
        concessionStrategy += `Second concession: ₹${secondConcession.toFixed(2)} (${((secondConcession / openingPrice) * 100).toFixed(1)}%). `;
        concessionStrategy += `Final position: ₹${walkAwayPrice.toFixed(2)} (walk-away price).`;
      } else {
        concessionStrategy = `Standard concession strategy: Start at ₹${openingPrice.toFixed(2)}, first drop to ₹${(openingPrice - firstConcession).toFixed(2)}, second drop to ₹${(openingPrice - firstConcession - secondConcession).toFixed(2)}, final position at ₹${walkAwayPrice.toFixed(2)}.`;
      }
      
      // Value-add suggestions
      const valueAddSuggestions: string[] = [];
      const valueAddPrefs = (clientPatterns as ClientPatterns | null)?.valueAddPreferences ?? [];
      if (valueAddPrefs.length > 0) {
        valueAddSuggestions.push(...valueAddPrefs);
      } else {
        valueAddSuggestions.push(
          'Extended warranty coverage',
          'Priority technical support',
          'Flexible payment terms (30/60/90 days)',
          'Free installation support',
          'Bulk delivery scheduling'
        );
      }
      
      // Alternative offers
      const alternativeOffers: string[] = [];
      if (input.quantity && input.quantity >= 1000) {
        alternativeOffers.push(`Volume discount: Offer ${((input.quantity / 1000) * 2).toFixed(0)}% discount for orders above 1000 units`);
      }
      if (input.quantity && input.quantity >= 500) {
        alternativeOffers.push('Extended payment terms: 60-90 days for large orders');
      }
      alternativeOffers.push('Phased delivery: Split order into multiple shipments to ease cash flow');
      alternativeOffers.push('Bundled services: Include installation/maintenance as package deal');
      
      // Psychological insights
      let psychologicalInsights = '';
      if (avgNegPercent > 15) {
        psychologicalInsights = `Client is an aggressive negotiator (typically negotiates ${avgNegPercent.toFixed(1)}% down). Start higher and be prepared for multiple rounds.`;
      } else if (avgNegPercent > 5) {
        psychologicalInsights = `Client is a moderate negotiator (typically negotiates ${avgNegPercent.toFixed(1)}% down). Standard negotiation approach should work.`;
      } else if (avgNegPercent > 0) {
        psychologicalInsights = `Client is a light negotiator (typically negotiates ${avgNegPercent.toFixed(1)}% down). May accept initial offer with minor adjustments.`;
      } else {
        psychologicalInsights = 'No clear negotiation pattern identified. Use standard negotiation approach.';
      }
      
      const negFreq = (clientPatterns as ClientPatterns | null)?.negotiationFrequency ?? 0;
      if (negFreq > 70) {
        psychologicalInsights += ' High negotiation frequency - expect pushback on price.';
      } else if (negFreq < 30) {
        psychologicalInsights += ' Low negotiation frequency - client may accept fair pricing more readily.';
      }
      
      negotiationStrategy = {
        openingPrice,
        walkAwayPrice,
        concessionPlan: {
          firstConcession,
          secondConcession,
          finalConcession,
          strategy: concessionStrategy,
        },
        valueAddSuggestions: valueAddSuggestions.slice(0, 5),
        alternativeOffers: alternativeOffers.slice(0, 4),
        psychologicalInsights,
        clientPatterns: (clientPatterns as ClientPatterns | null)?.patterns || 'No client-specific negotiation patterns available.',
      };
      
      // Set aliases for backward compatibility
      openingPrice = negotiationStrategy.openingPrice;
      walkAwayPrice = negotiationStrategy.walkAwayPrice;
      concessionPlan = negotiationStrategy.concessionPlan;
      
      console.log('[AI Pricing] Negotiation strategy complete:', {
        openingPrice: openingPrice.toFixed(2),
        walkAwayPrice: walkAwayPrice.toFixed(2),
        negotiationRoom: (openingPrice - walkAwayPrice).toFixed(2),
        clientNegotiationPercent: avgNegPercent > 0 ? avgNegPercent.toFixed(1) + '%' : 'N/A',
      });
    } catch (error: any) {
      console.warn('[AI Pricing] Error building negotiation strategy:', error.message);
      // Continue without negotiation strategy if it fails
    }

    console.log('[AI Pricing] Analysis complete:', {
      currentPrice: input.ourPricePerUnit,
      winProbability,
      guaranteedWinPrice,
      suggestionsCount: suggestions.length,
      negotiationNotesCount: finalNegotiationNotes.length,
      warningsCount: finalWarnings.length + marginWarnings.length,
      hasHistoricalInsight: historicalInsight !== 'No relevant historical learning identified',
      reasoningQuality: isPoorReasoning ? 'poor (fallback applied)' : 'good',
      competitivePosition,
      pricingStrategy: pricingStrategy.substring(0, 50),
      negotiationLeverageCount: negotiationLeverage.length,
      hasLearningInsights: !!learningInsights,
      hasMarginAnalysis: !!marginAnalysis,
      hasNegotiationStrategy: !!negotiationStrategy,
    });
    console.log(`[AI] Pricing AI: Analysis complete - Current Price: ₹${input.ourPricePerUnit}, Win Prob: ${winProbability}%, Guaranteed Win: ₹${guaranteedWinPrice}, Position: ${competitivePosition || 'N/A'}`);

    return {
      winProbability,
      guaranteedWinPrice,
      reasoning: finalReasoning,
      suggestions,
      historicalInsight,
      negotiationNotes: finalNegotiationNotes,
      warnings: [...finalWarnings, ...marginWarnings],
      competitivePosition,
      pricingStrategy,
      negotiationLeverage,
      confidenceFactors,
      learningInsights,
      marginAnalysis,
      marginWarnings: marginWarnings.length > 0 ? marginWarnings : undefined,
      marginTrends,
      negotiationStrategy,
      openingPrice,
      walkAwayPrice,
      concessionPlan,
    };
  } catch (error: any) {
    console.error('[AI Pricing] Analysis failed:', error.message);
    throw new Error(`AI pricing analysis failed: ${error.message}`);
  }
}

/**
 * Helper function to format pricing analysis for display
 */
export function formatPricingAnalysis(analysis: PricingAnalysisOutput): string {
  let formatted = `Win Probability: ${analysis.winProbability}%\n`;
  formatted += `Guaranteed Win Price: ₹${analysis.guaranteedWinPrice.toLocaleString('en-IN', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}\n\n`;
  
  // Format reasoning - handle both string and object formats
  if (typeof analysis.reasoning === 'object' && analysis.reasoning !== null) {
    formatted += `REASONING ANALYSIS:\n`;
    if (analysis.reasoning.competitorAnalysis) {
      formatted += `\nCompetitor Analysis:\n${analysis.reasoning.competitorAnalysis}\n`;
    }
    if (analysis.reasoning.historicalComparison) {
      formatted += `\nHistorical Comparison:\n${analysis.reasoning.historicalComparison}\n`;
    }
    if (analysis.reasoning.demandAssessment) {
      formatted += `\nDemand Assessment:\n${analysis.reasoning.demandAssessment}\n`;
    }
    if (analysis.reasoning.marginConsideration) {
      formatted += `\nMargin Consideration:\n${analysis.reasoning.marginConsideration}\n`;
    }
    formatted += `\n`;
  } else {
    formatted += `Reasoning: ${analysis.reasoning}\n\n`;
  }
  
  // Add confidence factors if available
  if (analysis.confidenceFactors) {
    formatted += `CONFIDENCE FACTORS:\n`;
    if (analysis.confidenceFactors.dataQuality) {
      formatted += `Data Quality: ${analysis.confidenceFactors.dataQuality}\n`;
    }
    if (analysis.confidenceFactors.historicalRelevance) {
      formatted += `Historical Relevance: ${analysis.confidenceFactors.historicalRelevance}\n`;
    }
    if (analysis.confidenceFactors.competitorDataReliability) {
      formatted += `Competitor Data Reliability: ${analysis.confidenceFactors.competitorDataReliability}\n`;
    }
    formatted += `\n`;
  }
  
  if (analysis.suggestions.length > 0) {
    formatted += `Suggestions:\n`;
    analysis.suggestions.forEach((suggestion, index) => {
      formatted += `${index + 1}. ${suggestion}\n`;
    });
    formatted += `\n`;
  }

  if (analysis.negotiationNotes && analysis.negotiationNotes.length > 0) {
    formatted += `Negotiation Notes:\n`;
    analysis.negotiationNotes.forEach((note, index) => {
      formatted += `${index + 1}. ${note}\n`;
    });
    formatted += `\n`;
  }

  if (analysis.warnings && analysis.warnings.length > 0) {
    formatted += `⚠️ Warnings:\n`;
    analysis.warnings.forEach((warning, index) => {
      formatted += `${index + 1}. ${warning}\n`;
    });
    formatted += `\n`;
  }

  if (analysis.historicalInsight) {
    formatted += `Historical Insight: ${analysis.historicalInsight}\n`;
  }

  if (analysis.competitivePosition) {
    const positionLabels = {
      'ABOVE_MARKET': 'Above Market',
      'AT_MARKET': 'At Market',
      'BELOW_MARKET': 'Below Market',
    };
    formatted += `\nCompetitive Position: ${positionLabels[analysis.competitivePosition]}\n`;
  }

  if (analysis.pricingStrategy) {
    formatted += `Pricing Strategy: ${analysis.pricingStrategy}\n`;
  }

  if (analysis.negotiationLeverage && analysis.negotiationLeverage.length > 0) {
    formatted += `\nNegotiation Leverage:\n`;
    analysis.negotiationLeverage.forEach((leverage, index) => {
      formatted += `${index + 1}. ${leverage}\n`;
    });
  }

    if (analysis.learningInsights) {
      formatted += `\n═══════════════════════════════════════\n`;
      formatted += `LEARNING INSIGHTS\n`;
      formatted += `═══════════════════════════════════════\n`;
      formatted += `AI Accuracy: ${analysis.learningInsights.aiAccuracy.toFixed(1)}%\n`;
      formatted += `Human Override Accuracy: ${analysis.learningInsights.overrideAccuracy.toFixed(1)}%\n`;
      formatted += `Trend: ${analysis.learningInsights.trendAnalysis}\n`;
      formatted += `Price Sensitivity: ${analysis.learningInsights.priceSensitivity}\n`;
      
      if (analysis.learningInsights.recentWins.length > 0) {
        formatted += `\nRecent Wins:\n`;
        analysis.learningInsights.recentWins.forEach((win, index) => {
          formatted += `${index + 1}. ${win}\n`;
        });
      }
      
      if (analysis.learningInsights.recentLosses.length > 0) {
        formatted += `\nRecent Losses:\n`;
        analysis.learningInsights.recentLosses.forEach((loss, index) => {
          formatted += `${index + 1}. ${loss}\n`;
        });
      }
      
      if (analysis.learningInsights.productInsights.length > 0) {
        formatted += `\nProduct Insights:\n`;
        analysis.learningInsights.productInsights.forEach((insight, index) => {
          formatted += `${index + 1}. ${insight}\n`;
        });
      }
    }

    if (analysis.marginAnalysis) {
      formatted += `\n═══════════════════════════════════════\n`;
      formatted += `MARGIN ANALYSIS\n`;
      formatted += `═══════════════════════════════════════\n`;
      formatted += `Suggested Margin: ${analysis.marginAnalysis.suggestedMargin.toFixed(1)}%\n`;
      formatted += `Minimum Acceptable: ${analysis.marginAnalysis.minimumAcceptableMargin.toFixed(1)}%\n`;
      formatted += `Optimal Margin: ${analysis.marginAnalysis.optimalMargin.toFixed(1)}%\n`;
      formatted += `Market Average: ${analysis.marginAnalysis.marketAverageMargin.toFixed(1)}%\n`;
      formatted += `vs Market: ${analysis.marginAnalysis.marginVsMarket > 0 ? '+' : ''}${analysis.marginAnalysis.marginVsMarket.toFixed(1)}%\n`;
    }

    if (analysis.marginWarnings && analysis.marginWarnings.length > 0) {
      formatted += `\n⚠️ Margin Warnings:\n`;
      analysis.marginWarnings.forEach((warning, index) => {
        formatted += `${index + 1}. ${warning}\n`;
      });
    }

    if (analysis.marginTrends) {
      formatted += `\n═══════════════════════════════════════\n`;
      formatted += `MARGIN TRENDS\n`;
      formatted += `═══════════════════════════════════════\n`;
      formatted += `By Quantity: ${analysis.marginTrends.byQuantity}\n`;
      formatted += `By Season: ${analysis.marginTrends.bySeason}\n`;
      formatted += `Overall Trend: ${analysis.marginTrends.overallTrend}\n`;
    }

    if (analysis.negotiationStrategy) {
      formatted += `\n═══════════════════════════════════════\n`;
      formatted += `NEGOTIATION STRATEGY\n`;
      formatted += `═══════════════════════════════════════\n`;
      formatted += `Opening Price: ₹${analysis.negotiationStrategy.openingPrice.toLocaleString('en-IN', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })}\n`;
      formatted += `Walk-Away Price: ₹${analysis.negotiationStrategy.walkAwayPrice.toLocaleString('en-IN', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })}\n`;
      formatted += `Negotiation Room: ₹${(analysis.negotiationStrategy.openingPrice - analysis.negotiationStrategy.walkAwayPrice).toLocaleString('en-IN', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })}\n\n`;
      
      formatted += `Concession Plan:\n`;
      formatted += `${analysis.negotiationStrategy.concessionPlan.strategy}\n\n`;
      
      formatted += `Psychological Insights:\n`;
      formatted += `${analysis.negotiationStrategy.psychologicalInsights}\n\n`;
      
      formatted += `Client Patterns:\n`;
      formatted += `${analysis.negotiationStrategy.clientPatterns}\n\n`;
      
      if (analysis.negotiationStrategy.valueAddSuggestions.length > 0) {
        formatted += `Value-Add Suggestions:\n`;
        analysis.negotiationStrategy.valueAddSuggestions.forEach((suggestion, index) => {
          formatted += `${index + 1}. ${suggestion}\n`;
        });
        formatted += `\n`;
      }
      
      if (analysis.negotiationStrategy.alternativeOffers.length > 0) {
        formatted += `Alternative Offers:\n`;
        analysis.negotiationStrategy.alternativeOffers.forEach((offer, index) => {
          formatted += `${index + 1}. ${offer}\n`;
        });
      }
    }

  return formatted;
}

