import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST() {
  try {
    // Check if Supabase is configured
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase configuration missing');
      return NextResponse.json(
        { error: 'Server configuration error', estimateNumber: 'YNM/EST-1' },
        { status: 500 }
      );
    }

    // Get next estimate number using the function
    const { data, error } = await supabase.rpc('get_next_estimate_number');

    if (error) {
      console.error('Error getting next estimate number:', error);
      // Return a fallback estimate number instead of failing
      return NextResponse.json({ 
        estimateNumber: 'YNM/EST-1',
        warning: 'Using fallback estimate number'
      });
    }

    // Ensure we return a valid estimate number
    if (!data) {
      return NextResponse.json({ 
        estimateNumber: 'YNM/EST-1',
        warning: 'No data returned, using fallback'
      });
    }

    return NextResponse.json({ estimateNumber: data });
  } catch (error) {
    console.error('Error in next estimate number API:', error);
    // Return fallback instead of error
    return NextResponse.json({ 
      estimateNumber: 'YNM/EST-1',
      warning: 'Error occurred, using fallback estimate number'
    });
  }
}

