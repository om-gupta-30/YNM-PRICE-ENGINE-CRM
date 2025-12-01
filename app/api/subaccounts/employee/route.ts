import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeUsername = searchParams.get('employee');

    if (!employeeUsername) {
      return NextResponse.json(
        { error: 'employee query parameter is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('id, account_name')
      .eq('assigned_employee', employeeUsername)
      .eq('is_active', true);

    if (accountsError) {
      console.error('Error fetching accounts for employee:', accountsError);
      return NextResponse.json(
        { error: `Failed to fetch accounts: ${accountsError.message}` },
        { status: 500 }
      );
    }

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ success: true, subAccounts: [] });
    }

    const accountIds = accounts.map(acc => acc.id);
    const accountNameMap = new Map(accounts.map(acc => [acc.id, acc.account_name || 'Unnamed']));

    const { data: subAccounts, error } = await supabase
      .from('sub_accounts')
      .select('id, sub_account_name, account_id')
      .in('account_id', accountIds)
      .eq('is_active', true)
      .order('sub_account_name', { ascending: true });

    if (error) {
      console.error('Error fetching sub-accounts:', error);
      return NextResponse.json(
        { error: `Failed to fetch sub-accounts: ${error.message}` },
        { status: 500 }
      );
    }

    const formattedSubAccounts = (subAccounts || []).map(sub => ({
      id: sub.id,
      subAccountName: sub.sub_account_name,
      accountId: sub.account_id,
      accountName: accountNameMap.get(sub.account_id) || '',
      displayName: `${sub.sub_account_name} (${accountNameMap.get(sub.account_id) || 'Unknown'})`,
    }));

    return NextResponse.json({ success: true, subAccounts: formattedSubAccounts });
  } catch (error: any) {
    console.error('API error in /api/subaccounts/employee:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

