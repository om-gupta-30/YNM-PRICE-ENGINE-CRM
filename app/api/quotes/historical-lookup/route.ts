import { NextRequest, NextResponse } from 'next/server';
import { 
  findLastMatchingMBCBQuote, 
  findLastMatchingSignagesQuote,
  type MBCBSpecs,
  type SignagesSpecs
} from '@/lib/services/historicalQuoteLookup';

/**
 * POST /api/quotes/historical-lookup
 * 
 * Finds the most recent quote matching the given specifications
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productType, specs } = body;

    if (!productType || !specs) {
      return NextResponse.json(
        { success: false, error: 'Missing productType or specs' },
        { status: 400 }
      );
    }

    let match = null;

    if (productType === 'mbcb') {
      match = await findLastMatchingMBCBQuote(specs as MBCBSpecs);
    } else if (productType === 'signages') {
      match = await findLastMatchingSignagesQuote(specs as SignagesSpecs);
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid productType' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: match,
    });
  } catch (error: any) {
    console.error('[API /api/quotes/historical-lookup] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Lookup failed' },
      { status: 500 }
    );
  }
}

