import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { formatTimestampIST, getCurrentISTTime } from '@/lib/utils/dateFormatters';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('account_id');

    if (!accountId) {
      return NextResponse.json(
        { error: 'account_id query parameter is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    const { data: subAccounts, error } = await supabase
      .from('sub_accounts')
      .select('id, account_id, sub_account_name, state_id, city_id, address, engagement_score, is_active, created_at, updated_at, accounts:account_id(account_name)')
      .eq('account_id', parseInt(accountId))
      .eq('is_active', true)
      .order('sub_account_name', { ascending: true });

    if (error) {
      console.error('Error fetching sub-accounts:', error);
      // Log the actual error for debugging
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      
      // Return empty array with error message in development, but don't break the page
      return NextResponse.json({ 
        success: true, 
        subAccounts: [],
        error: `Database error: ${error.message}. Please ensure sub_accounts table exists with all required columns.`
      });
    }

    // Fetch state and city names for each sub-account
    const formattedSubAccounts = await Promise.all(
      (subAccounts || []).map(async (sub: any) => {
        let stateName = null;
        let cityName = null;

        // Fetch state name if state_id exists
        if (sub.state_id) {
          try {
            const { data: stateData } = await supabase
              .from('states')
              .select('state_name')
              .eq('id', sub.state_id)
              .single();
            stateName = stateData?.state_name || null;
          } catch (err) {
            console.error(`Error fetching state for sub-account ${sub.id}:`, err);
          }
        }

        // Fetch city name if city_id exists
        if (sub.city_id) {
          try {
            const { data: cityData } = await supabase
              .from('cities')
              .select('city_name')
              .eq('id', sub.city_id)
              .single();
            cityName = cityData?.city_name || null;
          } catch (err) {
            console.error(`Error fetching city for sub-account ${sub.id}:`, err);
          }
        }

        const accountName = sub.accounts?.account_name || null;

        return {
          id: sub.id,
          accountId: sub.account_id,
          subAccountName: sub.sub_account_name,
          accountName,
          displayName: accountName ? `${accountName} - ${sub.sub_account_name}` : sub.sub_account_name,
          stateId: sub.state_id || null,
          cityId: sub.city_id || null,
          stateName,
          cityName,
          address: sub.address || null,
          engagementScore: parseFloat(sub.engagement_score?.toString() || '0') || 0,
          isActive: sub.is_active,
          createdAt: formatTimestampIST(sub.created_at),
          updatedAt: formatTimestampIST(sub.updated_at),
        };
      })
    );

    return NextResponse.json({ success: true, subAccounts: formattedSubAccounts });
  } catch (error: any) {
    console.error('API error in /api/subaccounts GET:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      accountId,
      subAccountName,
      stateId,
      cityId,
      address,
    } = body;

    // Validation
    if (!accountId || !subAccountName || !stateId || !cityId) {
      return NextResponse.json(
        { error: 'Missing required fields: accountId, subAccountName, stateId, cityId' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Insert sub-account
    const { data: subAccount, error } = await supabase
      .from('sub_accounts')
      .insert({
        account_id: parseInt(accountId),
        sub_account_name: subAccountName,
        state_id: parseInt(stateId),
        city_id: parseInt(cityId),
        address: address && address.trim() !== '' ? address.trim() : null,
        engagement_score: 0,
        is_active: true,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating sub-account:', error);
      // Check for table does not exist error
      if (error.code === '42703' || error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json(
          { error: 'sub_accounts table does not exist. Please run docs/CREATE_SUB_ACCOUNTS_TABLE.sql in Supabase SQL Editor.' },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: `Failed to create sub-account: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, subAccountId: subAccount.id }, { status: 201 });
  } catch (error: any) {
    console.error('API error in /api/subaccounts POST:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      subAccountName,
      stateId,
      cityId,
      address,
    } = body;

    // Validation
    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Update sub-account
    const updateData: any = {
      updated_at: getCurrentISTTime(),
    };

    if (subAccountName !== undefined) {
      updateData.sub_account_name = subAccountName;
    }
    if (stateId !== undefined && stateId !== null) {
      updateData.state_id = parseInt(stateId);
    }
    if (cityId !== undefined && cityId !== null) {
      updateData.city_id = parseInt(cityId);
    }
    if (address !== undefined) {
      updateData.address = address && address.trim() !== '' ? address.trim() : null;
    }

    const { error } = await supabase
      .from('sub_accounts')
      .update(updateData)
      .eq('id', parseInt(id));

    if (error) {
      console.error('Error updating sub-account:', error);
      return NextResponse.json(
        { error: `Failed to update sub-account: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API error in /api/subaccounts PUT:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

