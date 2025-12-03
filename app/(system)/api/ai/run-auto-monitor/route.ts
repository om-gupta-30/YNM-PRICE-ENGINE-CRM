export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { detectSlippingEngagementAndSuggestActions } from '@/lib/ai/engagement';

export async function GET() {
  try {
    const result = await detectSlippingEngagementAndSuggestActions();

    return NextResponse.json({
      success: true,
      message: 'AI monitoring run completed',
      updated: result.updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message ?? 'AI monitoring failed',
      },
      { status: 500 }
    );
  }
}
