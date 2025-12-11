import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

// PERFORMANCE OPTIMIZATION: Edge runtime for read-only GET API
// This route only reads from Supabase and doesn't use Node-specific APIs
export const runtime = "edge";

/**
 * PERFORMANCE OPTIMIZATION: Consolidated initial load endpoint
 * 
 * This endpoint combines multiple API calls into a single request to reduce
 * round trips and improve page load performance. Returns:
 * - Basic accounts list (id, account_name, assigned_employee)
 * - Basic subaccounts list (id, sub_account_name, account_id)
 * - Assigned contacts count
 * - Assigned leads count
 * - Basic user info (from query params)
 * 
 * IMPORTANT: This is an additive optimization. Existing APIs remain unchanged.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeUsername = searchParams.get('employee');
    const isAdmin = searchParams.get('isAdmin') === 'true';

    if (!employeeUsername && !isAdmin) {
      return NextResponse.json(
        { error: 'Employee username or admin status required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // PERFORMANCE OPTIMIZATION: Fetch all data in parallel
    const [accountsResult, subAccountsResult, contactsResult, leadsResult] = await Promise.all([
      // Fetch basic accounts
      isAdmin
        ? supabase.from('accounts').select('id, account_name, assigned_employee').eq('is_active', true)
        : supabase.from('accounts').select('id, account_name, assigned_employee').eq('is_active', true).eq('assigned_employee', employeeUsername),
      
      // Fetch basic subaccounts (filtered by account assignment if not admin)
      isAdmin
        ? supabase.from('sub_accounts').select('id, sub_account_name, account_id').eq('is_active', true)
        : supabase
            .from('sub_accounts')
            .select('id, sub_account_name, account_id, accounts:account_id(assigned_employee)')
            .eq('is_active', true),
      
      // Count assigned contacts
      // Note: Contacts may not have assigned_employee directly - they're assigned via sub_accounts
      // For now, get total count (will be handled in error handling if column doesn't exist)
      isAdmin
        ? supabase.from('contacts').select('id', { count: 'exact', head: true })
        : supabase
            .from('contacts')
            .select('id', { count: 'exact', head: true })
            .eq('assigned_employee', employeeUsername),
      
      // Count assigned leads
      isAdmin
        ? supabase.from('leads').select('id', { count: 'exact', head: true })
        : supabase
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .eq('assigned_employee', employeeUsername),
    ]);

    // Handle errors gracefully
    if (accountsResult.error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error fetching accounts:', accountsResult.error);
      }
    }
    if (subAccountsResult.error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error fetching subaccounts:', subAccountsResult.error);
      }
    }
    // Handle contacts error - column might not exist, use total count as fallback
    let contactsCount = 0;
    if (contactsResult.error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error fetching contacts count:', contactsResult.error);
      }
      // If assigned_employee column doesn't exist, try to get total count
      if (contactsResult.error.code === '42703' || contactsResult.error.message?.includes('does not exist')) {
        const { count } = await supabase.from('contacts').select('id', { count: 'exact', head: true });
        contactsCount = count || 0;
      }
    } else {
      contactsCount = contactsResult.count || 0;
    }
    if (leadsResult.error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error fetching leads count:', leadsResult.error);
      }
    }

    // Filter subaccounts by account assignment if not admin
    let filteredSubAccounts = subAccountsResult.data || [];
    if (!isAdmin && subAccountsResult.data) {
      filteredSubAccounts = subAccountsResult.data.filter((sa: any) => {
        const account = sa.accounts;
        return account && account.assigned_employee === employeeUsername;
      });
    }

    // Format response
    const response = {
      success: true,
      data: {
        accounts: (accountsResult.data || []).map((acc: any) => ({
          id: acc.id,
          account_name: acc.account_name,
          assigned_employee: acc.assigned_employee,
        })),
        subAccounts: filteredSubAccounts.map((sa: any) => ({
          id: sa.id,
          sub_account_name: sa.sub_account_name,
          account_id: sa.account_id,
        })),
        assignedContactsCount: contactsCount,
        assignedLeadsCount: leadsResult.count || 0,
        userInfo: {
          username: employeeUsername || 'admin',
          isAdmin,
        },
      },
    };

    const nextResponse = NextResponse.json(response);
    // Cache for 30 seconds
    nextResponse.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    return nextResponse;
  } catch (error: any) {
    console.error('Initial load API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
