import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST() {
  try {
    // Check if Supabase is configured
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        estimateNumber: 'YNM/EST-1',
        error: 'Supabase not configured'
      });
    }

    // First, try to use the database function (most reliable, atomic)
    const { data: funcData, error: funcError } = await supabase.rpc('get_next_estimate_number');

    if (!funcError && funcData) {
      return NextResponse.json({ estimateNumber: funcData });
    }

    // Fallback: Try direct table update if function doesn't exist
    // First, try to increment the counter
    const { data: updateData, error: updateError } = await supabase
      .from('estimate_counter')
      .update({ 
        current_number: supabase.rpc('increment_counter'),
        updated_at: new Date().toISOString()
      })
      .eq('id', 1)
      .select('current_number, prefix')
      .single();

    if (!updateError && updateData) {
      return NextResponse.json({ 
        estimateNumber: `${updateData.prefix}${updateData.current_number}` 
      });
    }

    // If table exists but update failed, try a manual increment
    const { data: currentData } = await supabase
      .from('estimate_counter')
      .select('current_number, prefix')
      .eq('id', 1)
      .single();

    if (currentData) {
      const newNumber = (currentData.current_number || 0) + 1;
      await supabase
        .from('estimate_counter')
        .update({ current_number: newNumber, updated_at: new Date().toISOString() })
        .eq('id', 1);
      
      return NextResponse.json({ 
        estimateNumber: `${currentData.prefix}${newNumber}` 
      });
    }

    // Last resort: Return fallback
    return NextResponse.json({ 
      estimateNumber: 'YNM/EST-1',
      warning: 'Using fallback. Please run CREATE_ESTIMATE_COUNTER.sql in Supabase.'
    });

  } catch (error: any) {
    console.error('Error getting next estimate number:', error);
    return NextResponse.json({ 
      estimateNumber: 'YNM/EST-1',
      error: error.message
    });
  }
}

// GET endpoint to check current estimate number without incrementing
export async function GET() {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ currentNumber: 0, prefix: 'YNM/EST-' });
    }

    const { data, error } = await supabase
      .from('estimate_counter')
      .select('current_number, prefix')
      .eq('id', 1)
      .single();

    if (error || !data) {
      return NextResponse.json({ currentNumber: 0, prefix: 'YNM/EST-' });
    }

    return NextResponse.json({ 
      currentNumber: data.current_number,
      prefix: data.prefix,
      nextEstimate: `${data.prefix}${data.current_number + 1}`
    });
  } catch (error) {
    return NextResponse.json({ currentNumber: 0, prefix: 'YNM/EST-' });
  }
}
