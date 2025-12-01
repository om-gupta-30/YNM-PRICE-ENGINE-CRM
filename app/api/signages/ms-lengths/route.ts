import { NextRequest, NextResponse } from 'next/server';
import { getMsDimensions } from '@/data/master/signMsMaster';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shape, sizeCode } = body;

    if (!shape || !sizeCode) {
      return NextResponse.json(
        { error: 'Missing required fields: shape, sizeCode' },
        { status: 400 }
      );
    }

    // Find matching MS dimensions from master data
    const result = getMsDimensions(shape, sizeCode);

    if (!result) {
      return NextResponse.json(
        { error: 'No matching MS structure found for the given shape and size' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      postLengthM: result.postLengthM,
      frameLengthM: result.frameLengthM,
      remarks: result.remarks,
    });
  } catch (error) {
    console.error('Error in POST /api/signages/ms-lengths:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

