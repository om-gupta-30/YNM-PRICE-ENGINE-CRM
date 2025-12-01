import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// GET: Fetch all rectangular sizes from rectangle_sizes table
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('rectangle_sizes')
      .select('width_mm, height_mm')
      .order('width_mm', { ascending: true })
      .order('height_mm', { ascending: true });

    if (error) {
      console.error('Error fetching rectangular sizes:', error);
      return NextResponse.json(
        { error: 'Failed to fetch rectangular sizes' },
        { status: 500 }
      );
    }

    // Return sizes with width and height for compatibility
    const sizes = (data || []).map(item => ({
      width: item.width_mm,
      height: item.height_mm,
    }));

    return NextResponse.json({ sizes });
  } catch (error) {
    console.error('Error in GET /api/signages/rectangular-sizes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Save a new rectangular size using UPSERT to prevent duplicates
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { width, height } = body;

    if (!width || !height || width <= 0 || height <= 0) {
      return NextResponse.json(
        { error: 'Invalid width or height' },
        { status: 400 }
      );
    }

    // Use UPSERT with unique constraint on width_mm, height_mm
    // This prevents duplicates automatically
    const { data, error } = await supabase
      .from('rectangle_sizes')
      .upsert(
        {
          width_mm: width,
          height_mm: height,
        },
        {
          onConflict: 'width_mm,height_mm',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error saving rectangular size:', error);
      return NextResponse.json(
        { error: 'Failed to save rectangular size' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: 'Size saved successfully',
      size: { width: data.width_mm, height: data.height_mm }
    });
  } catch (error) {
    console.error('Error in POST /api/signages/rectangular-sizes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

