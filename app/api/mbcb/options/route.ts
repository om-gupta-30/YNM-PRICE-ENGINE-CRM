import { NextResponse } from 'next/server';
import { getDistinctValues } from '@/lib/utils/mbcbData';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section') || 'W-Beam Section';

    // Get options for the specified section
    const wBeamThickness = getDistinctValues('W-Beam', 'thickness', section);
    const wBeamLength = getDistinctValues('W-Beam', 'length', section);
    const wBeamCoating = getDistinctValues('W-Beam', 'coatingGsm', section);
    
    const postThickness = getDistinctValues('Post', 'thickness', section);
    const postLength = getDistinctValues('Post', 'length', section);
    const postCoating = getDistinctValues('Post', 'coatingGsm', section);
    
    const spacerThickness = getDistinctValues('Spacer', 'thickness', section);
    const spacerLength = getDistinctValues('Spacer', 'length', section);
    const spacerCoating = getDistinctValues('Spacer', 'coatingGsm', section);

    return NextResponse.json({
      section,
      wBeam: {
        thickness: wBeamThickness.filter((v): v is number => v !== null),
        length: wBeamLength.filter((v): v is number => v !== null),
        coatingGsm: wBeamCoating.filter((v): v is number => v !== null),
      },
      post: {
        thickness: postThickness.filter((v): v is number => v !== null),
        length: postLength.filter((v): v is number => v !== null),
        coatingGsm: postCoating.filter((v): v is number => v !== null),
      },
      spacer: {
        thickness: spacerThickness.filter((v): v is number => v !== null),
        length: spacerLength.filter((v): v is number => v !== null),
        coatingGsm: spacerCoating.filter((v): v is number => v !== null),
      },
    });
  } catch (error) {
    console.error('Error fetching MBCB options:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

