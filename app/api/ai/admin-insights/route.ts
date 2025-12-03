import { NextRequest, NextResponse } from 'next/server';
import { runAdminAIScoring } from '@/lib/ai/engagement';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeUsername = searchParams.get('employeeUsername');

    // Validate employeeUsername
    if (!employeeUsername) {
      return NextResponse.json(
        { error: 'Missing employeeUsername' },
        { status: 400 }
      );
    }

    // Call admin AI scoring function
    const result = await runAdminAIScoring(employeeUsername);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Admin insights API error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        success: false,
      },
      { status: 500 }
    );
  }
}

