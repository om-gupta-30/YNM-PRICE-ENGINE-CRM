import { NextRequest, NextResponse } from 'next/server';
import { analyzePricingWithAI, type PricingAnalysisInput } from '@/lib/services/aiPricingAnalysis';

/**
 * POST /api/pricing/analyze
 * 
 * AI-powered pricing analysis endpoint
 * Accepts pricing context and returns AI recommendations
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Extract and validate input
    const {
      productType,
      ourPricePerUnit,
      competitorPricePerUnit,
      clientDemandPricePerUnit,
      quantity,
      productSpecs,
      userRole, // Optional: user role (ADMIN, EMPLOYEE, DATA_ANALYST) for role-based pricing adjustments
    } = body;

    // Validation
    if (!productType || !['mbcb', 'signages', 'paint'].includes(productType)) {
      return NextResponse.json(
        { error: 'Invalid or missing productType. Must be: mbcb, signages, or paint' },
        { status: 400 }
      );
    }

    if (typeof ourPricePerUnit !== 'number' || ourPricePerUnit <= 0) {
      return NextResponse.json(
        { error: 'Invalid ourPricePerUnit. Must be a positive number' },
        { status: 400 }
      );
    }

    // Quantity is now optional - only validate if provided
    if (quantity !== undefined && (typeof quantity !== 'number' || quantity <= 0)) {
      return NextResponse.json(
        { error: 'Invalid quantity. If provided, must be a positive number' },
        { status: 400 }
      );
    }

    // Build input for AI service
    // Role mapping: ADMIN → admin, EMPLOYEE → employee, DATA_ANALYST → data_analyst (bypasses pricing logic)
    const input: PricingAnalysisInput = {
      productType,
      ourPricePerUnit,
      competitorPricePerUnit: competitorPricePerUnit || null,
      clientDemandPricePerUnit: clientDemandPricePerUnit || null,
      quantity: quantity || undefined, // Optional
      productSpecs: productSpecs || {},
      userRole: userRole || undefined, // Pass user role if provided (ADMIN/EMPLOYEE/DATA_ANALYST)
    };

    console.log('[API /api/pricing/analyze] Processing request:', {
      productType,
      ourPricePerUnit,
      quantity,
      hasCompetitorPrice: !!competitorPricePerUnit,
      hasClientDemand: !!clientDemandPricePerUnit,
    });

    // Call AI service
    const analysis = await analyzePricingWithAI(input);

    console.log('[API /api/pricing/analyze] Analysis complete:', {
      winProbability: analysis.winProbability,
      guaranteedWinPrice: analysis.guaranteedWinPrice,
    });

    // Return success response
    return NextResponse.json({
      success: true,
      data: analysis,
    }, { status: 200 });

  } catch (error: any) {
    console.error('[API /api/pricing/analyze] Error:', error);

    // Return error response
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'AI pricing analysis failed',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/pricing/analyze
 * 
 * Returns API documentation
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/pricing/analyze',
    method: 'POST',
    description: 'AI-powered pricing analysis using Gemini',
    requestBody: {
      productType: 'string (required) - "mbcb" | "signages" | "paint"',
      ourPricePerUnit: 'number (required) - Our calculated price per unit',
      competitorPricePerUnit: 'number (optional) - Competitor price per unit',
      clientDemandPricePerUnit: 'number (optional) - Client requested price per unit',
      quantity: 'number (optional) - Quantity of units',
      productSpecs: 'object (optional) - Product specifications (thickness, size, etc.)',
    },
    responseBody: {
      success: 'boolean',
      data: {
        winProbability: 'number - Win probability at current quoted price (0-100)',
        guaranteedWinPrice: 'number - Price that would guarantee 100% win probability',
        reasoning: 'string | object - AI explanation of analysis',
        suggestions: 'string[] - Actionable pricing suggestions',
      },
    },
    example: {
      request: {
        productType: 'mbcb',
        ourPricePerUnit: 150.50,
        competitorPricePerUnit: 155.00,
        clientDemandPricePerUnit: 145.00,
        quantity: 1000,
        productSpecs: {
          thickness: '2.5mm',
          coating: '450 GSM',
          type: 'W-Beam',
        },
      },
      response: {
        success: true,
        data: {
          winProbability: 78,
          guaranteedWinPrice: 148.50,
          reasoning: 'At your current quoted price, win probability is 78%. For 100% guaranteed win, suggest closing at ₹148.50...',
          suggestions: [
            'Consider negotiating down to ₹148.50 for guaranteed win',
            'Emphasize quality advantage over competitor',
          ],
        },
      },
    },
  });
}

