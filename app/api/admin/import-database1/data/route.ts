import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const subAccountId = searchParams.get('subAccountId');

    // If specific account ID is requested
    if (accountId) {
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .select(`
          id,
          account_name,
          company_stage,
          company_tag,
          created_at,
          sub_accounts (
            id,
            sub_account_name,
            address,
            state_id,
            city_id,
            pincode,
            created_at,
            contacts (
              id,
              name,
              designation,
              phone,
              email,
              created_at
            )
          )
        `)
        .eq('id', accountId)
        .single();

      if (accountError) {
        return NextResponse.json(
          { error: accountError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, data: account });
    }

    // If specific sub-account ID is requested
    if (subAccountId) {
      const { data: subAccount, error: subAccountError } = await supabase
        .from('sub_accounts')
        .select(`
          id,
          sub_account_name,
          address,
          state_id,
          city_id,
          pincode,
          account_id,
          accounts (
            id,
            account_name,
            company_stage,
            company_tag
          ),
          contacts (
            id,
            name,
            designation,
            phone,
            email,
            created_at
          )
        `)
        .eq('id', subAccountId)
        .single();

      if (subAccountError) {
        return NextResponse.json(
          { error: subAccountError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, data: subAccount });
    }

    // Fetch all accounts with their sub-accounts and contacts
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select(`
        id,
        account_name,
        company_stage,
        company_tag,
        created_at,
        sub_accounts (
          id,
          sub_account_name,
          address,
          state_id,
          city_id,
          pincode,
          created_at,
          contacts (
            id,
            name,
            designation,
            phone,
            email,
            created_at
          )
        )
      `)
      .order('account_name', { ascending: true });

    if (accountsError) {
      return NextResponse.json(
        { error: accountsError.message },
        { status: 500 }
      );
    }

    // Fetch state and city names for sub-accounts
    const stateIds = new Set<number>();
    const cityIds = new Set<number>();

    accounts?.forEach(account => {
      account.sub_accounts?.forEach((subAccount: any) => {
        if (subAccount.state_id) stateIds.add(subAccount.state_id);
        if (subAccount.city_id) cityIds.add(subAccount.city_id);
      });
    });

    // Fetch states
    let states: any[] = [];
    if (stateIds.size > 0) {
      const { data: statesData } = await supabase
        .from('states')
        .select('id, state_name, name')
        .in('id', Array.from(stateIds));
      states = statesData || [];
    }

    // Fetch cities
    let cities: any[] = [];
    if (cityIds.size > 0) {
      const { data: citiesData } = await supabase
        .from('cities')
        .select('id, city_name, name, state_id')
        .in('id', Array.from(cityIds));
      cities = citiesData || [];
    }

    // Create lookup maps
    const stateMap = new Map();
    states?.forEach(state => {
      stateMap.set(state.id, state.state_name || state.name);
    });

    const cityMap = new Map();
    cities?.forEach(city => {
      cityMap.set(city.id, city.city_name || city.name);
    });

    // Enrich accounts with state and city names
    const enrichedAccounts = accounts?.map(account => ({
      ...account,
      sub_accounts: account.sub_accounts?.map((subAccount: any) => ({
        ...subAccount,
        state_name: subAccount.state_id ? stateMap.get(subAccount.state_id) : null,
        city_name: subAccount.city_id ? cityMap.get(subAccount.city_id) : null,
      })),
    }));

    return NextResponse.json({
      success: true,
      data: enrichedAccounts,
      totalAccounts: accounts?.length || 0,
      totalSubAccounts: accounts?.reduce((sum, acc) => sum + (acc.sub_accounts?.length || 0), 0) || 0,
      totalContacts: accounts?.reduce((sum, acc) => 
        sum + (acc.sub_accounts?.reduce((subSum: number, subAcc: any) => 
          subSum + (subAcc.contacts?.length || 0), 0) || 0), 0) || 0,
    });
  } catch (error: any) {
    console.error('Error fetching imported data:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
