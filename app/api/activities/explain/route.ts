import { NextRequest, NextResponse } from 'next/server';
import { explainActivity } from '@/utils/ai';

export async function POST(request: NextRequest) {
  try {
    const { activity } = await request.json();

    if (!activity) {
      return NextResponse.json({ error: 'Activity payload is required' }, { status: 400 });
    }

    const summary = await explainActivity(activity);

    return NextResponse.json({ success: true, summary });
  } catch (error: any) {
    console.error('Activity explain API error:', error);
    return NextResponse.json({ error: 'Unable to generate explanation' }, { status: 500 });
  }
}

