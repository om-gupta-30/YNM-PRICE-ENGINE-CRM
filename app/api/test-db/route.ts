import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        error: 'Missing environment variables',
        details: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseServiceKey,
        }
      }, { status: 500 });
    }

    // Test Supabase connection
    let supabase;
    try {
      supabase = createSupabaseServerClient();
    } catch (error: any) {
      return NextResponse.json({
        error: 'Failed to create Supabase client',
        details: error.message
      }, { status: 500 });
    }

    // Test query to users table
    const { data: users, error: queryError } = await supabase
      .from('users')
      .select('id, username')
      .limit(5);

    if (queryError) {
      return NextResponse.json({
        error: 'Database query failed',
        details: {
          code: queryError.code,
          message: queryError.message,
          hint: queryError.hint,
          details: queryError.details
        }
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      usersFound: users?.length || 0,
      users: users
    });
  } catch (error: any) {
    return NextResponse.json({
      error: 'Internal error',
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

