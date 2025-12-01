import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ type: string }> }
) {
  try {
    const params = await context.params;
    const type = params.type;
    let supabase;
    try {
      supabase = createSupabaseServerClient();
    } catch (error: any) {
      console.error('Error creating Supabase client:', error);
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      );
    }

    if (type === 'places') {
      // Return states as places of supply (since places_of_supply table doesn't exist)
      const { data, error } = await supabase
        .from('states')
        .select('name')
        .order('name', { ascending: true })
        .limit(10000);

      if (error) {
        console.error('Error fetching places:', error);
        // Return empty array instead of error for graceful degradation
        return NextResponse.json({ data: [] });
      }

      return NextResponse.json({ data: data.map((item) => item.name) });
    }

    if (type === 'customers') {
      // Use accounts table instead of non-existent customers table
      const { searchParams } = new URL(request.url);
      const salesEmployee = searchParams.get('salesEmployee');
      const isAdmin = searchParams.get('isAdmin') === 'true';

      let query = supabase
        .from('accounts')
        .select('account_name');

      // Filter by assigned employee if not admin
      if (salesEmployee && !isAdmin) {
        query = query.eq('assigned_employee', salesEmployee);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(10000);

      if (error) {
        console.error('Error fetching accounts as customers:', error);
        // Return empty array instead of error for graceful degradation
        return NextResponse.json({ data: [] });
      }

      return NextResponse.json({ data: data.map((item) => item.account_name) });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ type: string }> }
) {
  try {
    const params = await context.params;
    const type = params.type;
    const body = await request.json();
    const { value } = body;

    if (!value || typeof value !== 'string' || value.trim() === '') {
      return NextResponse.json(
        { error: 'Value is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    let supabase;
    try {
      supabase = createSupabaseServerClient();
    } catch (error: any) {
      console.error('Error creating Supabase client:', error);
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      );
    }
    const trimmedValue = value.trim();

    if (type === 'places') {
      // Places are derived from states - just return the value as confirmation
      // Since we don't have a places_of_supply table, we can't actually insert
      return NextResponse.json({ data: { name: trimmedValue } });
    }

    if (type === 'customers') {
      // Customers are now mapped to accounts
      // For backwards compatibility, just return success without creating
      // New customers should be created through the accounts API
      return NextResponse.json({ 
        data: { name: trimmedValue },
        message: 'Use /api/accounts to create new accounts'
      });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

