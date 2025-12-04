import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST() {
  try {
    // Check if Supabase is configured
    if (!supabaseUrl || !supabaseKey) {
      // Return fallback without logging error
      return NextResponse.json({
        estimateNumber: 'YNM/EST-1'
      });
    }

    // Try to get next estimate number using the function
    // If the function or table doesn't exist, silently use fallback
    const { data, error } = await supabase.rpc('get_next_estimate_number');

    // If error occurs (function/table doesn't exist), silently use fallback
    // No need to log - this is expected behavior when database function doesn't exist
    if (error) {
      return NextResponse.json({ 
        estimateNumber: 'YNM/EST-1'
      });
    }

    // Ensure we return a valid estimate number
    if (!data) {
      return NextResponse.json({ 
        estimateNumber: 'YNM/EST-1'
      });
    }

    return NextResponse.json({ estimateNumber: data });
  } catch (error: any) {
    // Silently return fallback for any errors
    // This endpoint is designed to gracefully degrade
    return NextResponse.json({ 
      estimateNumber: 'YNM/EST-1'
    });
  }
}

