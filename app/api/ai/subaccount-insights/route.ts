import { NextRequest, NextResponse } from 'next/server';
import { runSubaccountAIScoring } from '@/lib/ai/engagement';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subAccountId = searchParams.get('subAccountId');

    // Validate subAccountId
    if (!subAccountId) {
      return NextResponse.json(
        { error: 'Missing subAccountId' },
        { status: 400 }
      );
    }

    // Parse and validate it's a number
    const subAccountIdNum = Number(subAccountId);
    if (isNaN(subAccountIdNum) || subAccountIdNum <= 0) {
      return NextResponse.json(
        { error: 'Invalid subAccountId: must be a positive number' },
        { status: 400 }
      );
    }

    // Call AI scoring function
    const result = await runSubaccountAIScoring(subAccountIdNum);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Subaccount AI insights API error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        success: false 
      },
      { status: 500 }
    );
  }
}
