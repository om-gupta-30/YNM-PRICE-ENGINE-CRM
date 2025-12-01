import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    let supabase;
    try {
      supabase = createSupabaseServerClient();
    } catch (error: any) {
      return NextResponse.json({
        error: 'Failed to create Supabase client',
        details: error.message
      }, { status: 500 });
    }

    // Test each table (only existing tables)
    const tests = {
      users: await supabase.from('users').select('id').limit(1),
      quotes_mbcb: await supabase.from('quotes_mbcb').select('id').limit(1),
      quotes_signages: await supabase.from('quotes_signages').select('id').limit(1),
      quotes_paint: await supabase.from('quotes_paint').select('id').limit(1),
      accounts: await supabase.from('accounts').select('id').limit(1),
      sub_accounts: await supabase.from('sub_accounts').select('id').limit(1),
      contacts: await supabase.from('contacts').select('id').limit(1),
      notifications: await supabase.from('notifications').select('id').limit(1),
      tasks: await supabase.from('tasks').select('id').limit(1),
      leads: await supabase.from('leads').select('id').limit(1),
      activities: await supabase.from('activities').select('id').limit(1),
    };

    const results: Record<string, any> = {};
    
    for (const [tableName, result] of Object.entries(tests)) {
      if (result.error) {
        results[tableName] = {
          exists: false,
          error: result.error.message,
          code: result.error.code,
          details: result.error.details,
          hint: result.error.hint,
          isRLSError: result.error.message?.includes('permission denied') || result.error.code === '42501',
          isTableNotFound: result.error.message?.includes('does not exist') || result.error.code === '42P01',
        };
      } else {
        results[tableName] = {
          exists: true,
          accessible: true,
          rowCount: result.data?.length || 0,
        };
      }
    }

    return NextResponse.json({
      success: true,
      tables: results,
      recommendations: {
        rlsIssue: Object.values(results).some((r: any) => r.isRLSError),
        missingTables: Object.values(results).some((r: any) => r.isTableNotFound),
        action: Object.values(results).some((r: any) => r.isRLSError) 
          ? 'Run docs/RLS_POLICIES_SETUP.sql in Supabase SQL Editor'
          : Object.values(results).some((r: any) => r.isTableNotFound)
          ? 'Run your database setup script in Supabase SQL Editor'
          : 'All tables are accessible'
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      error: 'Internal error',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

