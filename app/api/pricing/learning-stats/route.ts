import { NextRequest, NextResponse } from 'next/server';
import { analyzePricingPerformance } from '@/lib/services/pricingLearningEngine';

/**
 * GET /api/pricing/learning-stats?productType=mbcb&lookbackDays=90
 * 
 * Returns learning statistics for AI pricing calibration
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const productType = searchParams.get('productType');
    const lookbackDays = searchParams.get('lookbackDays');
    
    // Validation
    if (!productType || !['mbcb', 'signages', 'paint'].includes(productType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing productType. Must be: mbcb, signages, or paint' },
        { status: 400 }
      );
    }
    
    const days = lookbackDays ? parseInt(lookbackDays, 10) : 90;
    
    if (isNaN(days) || days < 1 || days > 365) {
      return NextResponse.json(
        { success: false, error: 'Invalid lookbackDays. Must be between 1 and 365' },
        { status: 400 }
      );
    }
    
    // Analyze pricing performance
    const stats = await analyzePricingPerformance(
      productType as 'mbcb' | 'signages' | 'paint',
      days
    );
    
    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('[API /api/pricing/learning-stats] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to calculate learning statistics' },
      { status: 500 }
    );
  }
}

