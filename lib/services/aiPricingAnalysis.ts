/**
 * Simplified AI Pricing Analysis Service
 * 
 * Simple rule-based pricing logic:
 * 1. Compare quotation price vs competitor price, choose the lower one
 * 2. Check if client demand price gives at least 1% margin above the chosen quotation price
 * 3. If yes, proceed; if no, reject
 * 4. AI provides suggestions based on this logic
 */

import { runGemini } from '@/utils/ai';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface PricingAnalysisInput {
  productType: 'mbcb' | 'signages' | 'paint';
  ourPricePerUnit: number; // Our quotation price
  competitorPricePerUnit?: number | null; // Competitor price
  clientDemandPricePerUnit?: number | null; // Client demand price
  quantity?: number; // Optional: quantity for analysis
  productSpecs?: Record<string, any>; // Optional: product specifications
}

export interface PricingAnalysisOutput {
  winProbability: number; // 0-100 - Win probability based on margin check
  guaranteedWinPrice: number; // Price that would guarantee acceptance (chosen price + 1% minimum)
  reasoning: string | {
    priceSelection?: string; // Which price was chosen (quotation vs competitor)
    marginCheck?: string; // Margin analysis against client demand
    recommendation?: string; // Whether to proceed or reject
  };
  suggestions: string[]; // AI suggestions based on the logic
  warnings?: string[]; // Warnings if margin is insufficient
  canProceed: boolean; // Whether we can proceed with the deal (margin >= 1%)
  calculatedMargin: number; // Calculated margin percentage
  chosenBasePrice: number; // The price we chose (lower of quotation or competitor)
}

// ============================================
// PRICING LOGIC FUNCTIONS
// ============================================

/**
 * Calculate the chosen base price (lower of quotation or competitor price)
 */
function calculateChosenPrice(
  quotationPrice: number,
  competitorPrice: number | null | undefined
): number {
  if (!competitorPrice || competitorPrice <= 0) {
    return quotationPrice;
  }
  
  // Choose the lower price
  return Math.min(quotationPrice, competitorPrice);
}

/**
 * Calculate margin percentage
 */
function calculateMargin(clientDemandPrice: number, basePrice: number): number {
  if (basePrice <= 0) return 0;
  return ((clientDemandPrice - basePrice) / basePrice) * 100;
}

/**
 * Check if we can proceed (margin >= 1%)
 */
function canProceedWithDeal(
  clientDemandPrice: number | null | undefined,
  chosenPrice: number
): { canProceed: boolean; margin: number } {
  if (!clientDemandPrice || clientDemandPrice <= 0) {
    return { canProceed: false, margin: 0 };
  }
  
  const margin = calculateMargin(clientDemandPrice, chosenPrice);
  return {
    canProceed: margin >= 1.0, // Minimum 1% margin required
    margin,
  };
}

/**
 * Calculate guaranteed win price (chosen price + 1% minimum)
 */
function calculateGuaranteedWinPrice(chosenPrice: number): number {
  return chosenPrice * 1.01; // 1% minimum margin
}

// ============================================
// SYSTEM PROMPT BUILDER
// ============================================

function buildSystemPrompt(): string {
  return `You are a pricing assistant for a trading company. Your job is to analyze pricing decisions based on simple, clear rules.

PRICING LOGIC RULES:
1. PRICE SELECTION:
   - Compare quotation price vs competitor price
   - Choose the LOWER price as the base price
   - Example: If quotation is ₹100 and competitor is ₹110, choose ₹100
   - Example: If quotation is ₹110 and competitor is ₹100, choose ₹100

2. MARGIN CHECK:
   - Client demand price must be at least 1% above the chosen base price
   - Formula: Margin = ((Client Demand Price - Chosen Price) / Chosen Price) × 100
   - Minimum required margin: 1%
   - If margin >= 1%: We can proceed with the deal
   - If margin < 1%: We cannot proceed (insufficient margin)

3. EXAMPLES:
   Example 1:
   - Quotation price: ₹100
   - Competitor price: ₹110
   - Chosen price: ₹100 (lower of the two)
   - Client demand: ₹102
   - Margin: ((102 - 100) / 100) × 100 = 2%
   - Result: ✅ Can proceed (2% >= 1%)

   Example 2:
   - Quotation price: ₹100
   - Competitor price: ₹110
   - Chosen price: ₹100 (lower of the two)
   - Client demand: ₹101.5
   - Margin: ((101.5 - 100) / 100) × 100 = 1.5%
   - Result: ✅ Can proceed (1.5% >= 1%)

   Example 3:
   - Quotation price: ₹100
   - Competitor price: ₹110
   - Chosen price: ₹100 (lower of the two)
   - Client demand: ₹100.5
   - Margin: ((100.5 - 100) / 100) × 100 = 0.5%
   - Result: ❌ Cannot proceed (0.5% < 1%)

YOUR TASK:
1. Analyze which price was chosen (quotation or competitor, whichever is lower)
2. Calculate the margin if client demand price is provided
3. Determine if we can proceed (margin >= 1%)
4. Provide clear, actionable suggestions based on the analysis
5. Give warnings if margin is insufficient

OUTPUT FORMAT - Return JSON strictly in this structure:
{
  "reasoning": {
    "priceSelection": "Explanation of which price was chosen and why",
    "marginCheck": "Detailed margin calculation and analysis",
    "recommendation": "Clear recommendation: proceed or reject, with explanation"
  },
  "suggestions": [
    "Suggestion 1 based on the analysis",
    "Suggestion 2 based on the analysis",
    "Suggestion 3 based on the analysis"
  ],
  "warnings": ["Warning 1 if any", "Warning 2 if any"]
}

IMPORTANT:
- Be clear and direct in your analysis
- Focus on the simple logic: choose lower price, check 1% margin
- Provide practical suggestions for negotiation or next steps
- If margin is insufficient, suggest what price would be acceptable
- Keep suggestions actionable and relevant to the pricing decision`;
}

// ============================================
// USER PROMPT BUILDER
// ============================================

async function buildUserPrompt(input: PricingAnalysisInput): Promise<string> {
  const {
    productType,
    ourPricePerUnit,
    competitorPricePerUnit,
    clientDemandPricePerUnit,
    quantity,
  } = input;

  // Calculate chosen price
  const chosenPrice = calculateChosenPrice(ourPricePerUnit, competitorPricePerUnit);
  
  // Check margin
  const marginCheck = canProceedWithDeal(clientDemandPricePerUnit, chosenPrice);
  
  // Format product type
  const productName = productType === 'mbcb' 
    ? 'Metal Beam Crash Barrier (MBCB)'
    : productType === 'signages'
    ? 'Road Signages'
    : 'Thermoplastic Paint';

  let prompt = `PRICING ANALYSIS REQUEST

Product Type: ${productName}
${quantity ? `Quantity: ${quantity} units` : ''}

PRICING INFORMATION:
- Our Quotation Price: ₹${ourPricePerUnit.toFixed(2)} per unit`;

  if (competitorPricePerUnit && competitorPricePerUnit > 0) {
    prompt += `\n- Competitor Price: ₹${competitorPricePerUnit.toFixed(2)} per unit`;
    prompt += `\n- Chosen Base Price: ₹${chosenPrice.toFixed(2)} per unit (${chosenPrice === ourPricePerUnit ? 'quotation price' : 'competitor price'} - lower of the two)`;
  } else {
    prompt += `\n- Competitor Price: Not provided`;
    prompt += `\n- Chosen Base Price: ₹${chosenPrice.toFixed(2)} per unit (quotation price, no competitor data)`;
  }

  if (clientDemandPricePerUnit && clientDemandPricePerUnit > 0) {
    prompt += `\n- Client Demand Price: ₹${clientDemandPricePerUnit.toFixed(2)} per unit`;
    prompt += `\n- Calculated Margin: ${marginCheck.margin.toFixed(2)}%`;
    prompt += `\n- Minimum Required Margin: 1%`;
    
    if (marginCheck.canProceed) {
      prompt += `\n- Status: ✅ CAN PROCEED (margin ${marginCheck.margin.toFixed(2)}% >= 1%)`;
    } else {
      prompt += `\n- Status: ❌ CANNOT PROCEED (margin ${marginCheck.margin.toFixed(2)}% < 1%)`;
      const minimumAcceptablePrice = chosenPrice * 1.01;
      prompt += `\n- Minimum Acceptable Price: ₹${minimumAcceptablePrice.toFixed(2)} per unit (to achieve 1% margin)`;
    }
  } else {
    prompt += `\n- Client Demand Price: Not provided`;
    prompt += `\n- Status: ⚠️ Cannot determine if we can proceed (client demand price required)`;
  }

  prompt += `\n\nAnalyze this pricing situation and provide:
1. Clear explanation of which price was chosen and why
2. Detailed margin calculation and analysis (if client demand is provided)
3. Clear recommendation: Can we proceed with this deal?
4. 2-3 actionable suggestions based on the analysis
5. Any warnings if margin is insufficient

Remember:
- Chosen price is the LOWER of quotation price and competitor price
- Client demand must be at least 1% above chosen price to proceed
- Be clear and direct in your recommendations`;

  return prompt;
}

// ============================================
// MAIN AI PRICING ANALYSIS FUNCTION
// ============================================

/**
 * Analyze pricing context using simplified rule-based logic with AI suggestions
 */
export async function analyzePricingWithAI(
  input: PricingAnalysisInput
): Promise<PricingAnalysisOutput> {
  console.log('[AI Pricing] Starting simplified pricing analysis', {
    productType: input.productType,
    ourPrice: input.ourPricePerUnit,
    competitorPrice: input.competitorPricePerUnit,
    clientDemand: input.clientDemandPricePerUnit,
  });

  // Validate input
  if (!input.ourPricePerUnit || input.ourPricePerUnit <= 0) {
    throw new Error('Invalid quotation price per unit');
  }

  try {
    // Step 1: Calculate chosen price (lower of quotation or competitor)
    const chosenPrice = calculateChosenPrice(
      input.ourPricePerUnit,
      input.competitorPricePerUnit
    );

    // Step 2: Check margin if client demand is provided
    const marginCheck = canProceedWithDeal(
      input.clientDemandPricePerUnit,
      chosenPrice
    );

    // Step 3: Calculate guaranteed win price (chosen price + 1%)
    const guaranteedWinPrice = calculateGuaranteedWinPrice(chosenPrice);

    // Step 4: Calculate win probability based on margin
    let winProbability = 50; // Default neutral
    if (input.clientDemandPricePerUnit && input.clientDemandPricePerUnit > 0) {
      if (marginCheck.canProceed) {
        // If margin is good, high win probability
        // Scale based on margin: 1% = 80%, higher margins = higher probability
        winProbability = Math.min(100, 80 + (marginCheck.margin - 1) * 2);
      } else {
        // If margin is insufficient, low win probability
        winProbability = Math.max(0, 30 - (1 - marginCheck.margin) * 20);
      }
    }

    // Step 5: Build prompts and call AI for suggestions
    const systemPrompt = buildSystemPrompt();
    const userPrompt = await buildUserPrompt(input);

    console.log('[AI Pricing] Calling AI for suggestions...');
    const aiResponse = await runGemini<{
      reasoning?: {
        priceSelection?: string;
        marginCheck?: string;
        recommendation?: string;
      };
      suggestions?: string[];
      warnings?: string[];
    }>(
      systemPrompt,
      userPrompt
    );

    // Parse AI response
    const reasoning = aiResponse.reasoning || {
      priceSelection: `Chose ₹${chosenPrice.toFixed(2)} (${chosenPrice === input.ourPricePerUnit ? 'quotation price' : 'competitor price'} - lower of the two)`,
      marginCheck: input.clientDemandPricePerUnit && input.clientDemandPricePerUnit > 0
        ? `Margin: ${marginCheck.margin.toFixed(2)}% (${marginCheck.canProceed ? 'meets' : 'below'} 1% minimum)`
        : 'Client demand price not provided',
      recommendation: marginCheck.canProceed
        ? '✅ Can proceed with deal - margin requirement met'
        : '❌ Cannot proceed - insufficient margin (minimum 1% required)',
    };

    const suggestions = Array.isArray(aiResponse.suggestions) && aiResponse.suggestions.length > 0
      ? aiResponse.suggestions.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
      : [];

    // Add default suggestions if AI didn't provide enough
    if (suggestions.length === 0) {
      if (marginCheck.canProceed) {
        suggestions.push(
          `✅ Deal can proceed - client demand price (₹${input.clientDemandPricePerUnit?.toFixed(2)}) provides ${marginCheck.margin.toFixed(2)}% margin above chosen price (₹${chosenPrice.toFixed(2)})`,
          `Consider finalizing the deal at client demand price of ₹${input.clientDemandPricePerUnit?.toFixed(2)} per unit`,
          `Monitor the deal to ensure terms are met as agreed`
        );
      } else {
        const minimumPrice = chosenPrice * 1.01;
        suggestions.push(
          `❌ Deal cannot proceed - client demand price (₹${input.clientDemandPricePerUnit?.toFixed(2)}) only provides ${marginCheck.margin.toFixed(2)}% margin, below 1% minimum`,
          `Suggest negotiating client demand price to at least ₹${minimumPrice.toFixed(2)} per unit to meet 1% margin requirement`,
          `If client cannot meet minimum price, consider walking away from the deal`
        );
      }
    }

    const warnings: string[] = [];
    if (input.clientDemandPricePerUnit && input.clientDemandPricePerUnit > 0) {
      if (!marginCheck.canProceed) {
        warnings.push(
          `⚠️ Insufficient margin: Client demand price provides only ${marginCheck.margin.toFixed(2)}% margin, below 1% minimum requirement`
        );
        const minimumPrice = chosenPrice * 1.01;
        warnings.push(
          `⚠️ Minimum acceptable price: ₹${minimumPrice.toFixed(2)} per unit (to achieve 1% margin)`
        );
      }
    } else {
      warnings.push('⚠️ Client demand price not provided - cannot determine if deal can proceed');
    }

    // Add AI warnings if provided
    if (Array.isArray(aiResponse.warnings) && aiResponse.warnings.length > 0) {
      warnings.push(...aiResponse.warnings.filter((w): w is string => typeof w === 'string' && w.trim().length > 0));
    }

    console.log('[AI Pricing] Analysis complete:', {
      chosenPrice: chosenPrice.toFixed(2),
      margin: marginCheck.margin.toFixed(2) + '%',
      canProceed: marginCheck.canProceed,
      winProbability: winProbability + '%',
      suggestionsCount: suggestions.length,
    });

    return {
      winProbability,
      guaranteedWinPrice,
      reasoning,
      suggestions,
      warnings: warnings.length > 0 ? warnings : undefined,
      canProceed: marginCheck.canProceed,
      calculatedMargin: marginCheck.margin,
      chosenBasePrice: chosenPrice,
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
  let formatted = `Pricing Analysis Results\n`;
  formatted += `═══════════════════════════════════════\n\n`;
  
  formatted += `Chosen Base Price: ₹${analysis.chosenBasePrice.toLocaleString('en-IN', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}\n`;
  
  formatted += `Guaranteed Win Price: ₹${analysis.guaranteedWinPrice.toLocaleString('en-IN', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}\n`;
  
  formatted += `Calculated Margin: ${analysis.calculatedMargin.toFixed(2)}%\n`;
  formatted += `Minimum Required Margin: 1%\n`;
  formatted += `Can Proceed: ${analysis.canProceed ? '✅ Yes' : '❌ No'}\n`;
  formatted += `Win Probability: ${analysis.winProbability}%\n\n`;
  
  // Format reasoning
  if (typeof analysis.reasoning === 'object' && analysis.reasoning !== null) {
    formatted += `REASONING:\n`;
    if (analysis.reasoning.priceSelection) {
      formatted += `\nPrice Selection:\n${analysis.reasoning.priceSelection}\n`;
    }
    if (analysis.reasoning.marginCheck) {
      formatted += `\nMargin Check:\n${analysis.reasoning.marginCheck}\n`;
    }
    if (analysis.reasoning.recommendation) {
      formatted += `\nRecommendation:\n${analysis.reasoning.recommendation}\n`;
    }
  } else {
    formatted += `Reasoning: ${analysis.reasoning}\n\n`;
  }
  
  if (analysis.suggestions.length > 0) {
    formatted += `\nSUGGESTIONS:\n`;
    analysis.suggestions.forEach((suggestion, index) => {
      formatted += `${index + 1}. ${suggestion}\n`;
    });
  }
  
  if (analysis.warnings && analysis.warnings.length > 0) {
    formatted += `\n⚠️ WARNINGS:\n`;
    analysis.warnings.forEach((warning, index) => {
      formatted += `${index + 1}. ${warning}\n`;
    });
  }
  
  return formatted;
}
