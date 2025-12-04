import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { formatTimestampIST } from '@/lib/utils/dateFormatters';

// GET - Fetch all sub-accounts (admin only)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isAdmin = searchParams.get('isAdmin') === 'true';
    const accountId = searchParams.get('account_id');
    const stateId = searchParams.get('state_id');
    const cityId = searchParams.get('city_id');
    const officeType = searchParams.get('office_type');
    const isActive = searchParams.get('is_active');
    const industryId = searchParams.get('industry_id');
    const subIndustryId = searchParams.get('sub_industry_id');

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const supabase = createSupabaseServerClient();

    let query = supabase
      .from('sub_accounts')
      .select(`
        id,
        account_id,
        sub_account_name,
        state_id,
        city_id,
        address,
        pincode,
        gst_number,
        website,
        is_headquarter,
        office_type,
        engagement_score,
        is_active,
        created_at,
        updated_at,
        accounts:account_id(account_name, assigned_employee, industries)
      `)
      .order('sub_account_name', { ascending: true });

    // Apply filters
    if (accountId) {
      query = query.eq('account_id', parseInt(accountId));
    }
    if (stateId) {
      query = query.eq('state_id', parseInt(stateId));
    }
    if (cityId) {
      query = query.eq('city_id', parseInt(cityId));
    }
    if (officeType) {
      query = query.eq('office_type', officeType);
    }
    if (isActive !== null && isActive !== undefined) {
      query = query.eq('is_active', isActive === 'true');
    }

    const { data: subAccounts, error } = await query;

    if (error) {
      console.error('Error fetching sub-accounts:', error);
      return NextResponse.json(
        { error: `Failed to fetch sub-accounts: ${error.message}` },
        { status: 500 }
      );
    }

    // Filter by industry/sub-industry if specified
    let filteredSubAccounts = subAccounts || [];
    if (industryId || subIndustryId) {
      filteredSubAccounts = filteredSubAccounts.filter((sub: any) => {
        const accountIndustries = sub.accounts?.industries || [];
        if (!accountIndustries || accountIndustries.length === 0) return false;
        
        // Filter by industry only
        if (industryId && !subIndustryId) {
          return accountIndustries.some((ind: any) => 
            ind.industry_id === parseInt(industryId)
          );
        }
        
        // Filter by both industry and sub-industry
        if (industryId && subIndustryId) {
          return accountIndustries.some((ind: any) => 
            ind.industry_id === parseInt(industryId) && 
            ind.sub_industry_id === parseInt(subIndustryId)
          );
        }
        
        return false;
      });
    }

    // Format sub-accounts with state and city names
    const formattedSubAccounts = await Promise.all(
      filteredSubAccounts.map(async (sub: any) => {
        let stateName = null;
        let cityName = null;

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

        return {
          id: sub.id,
          accountId: sub.account_id,
          accountName: sub.accounts?.account_name || null,
          assignedEmployee: sub.accounts?.assigned_employee || null,
          subAccountName: sub.sub_account_name,
          stateId: sub.state_id || null,
          cityId: sub.city_id || null,
          stateName,
          cityName,
          address: sub.address || null,
          pincode: sub.pincode || null,
          gstNumber: sub.gst_number || null,
          website: sub.website || null,
          isHeadquarter: sub.is_headquarter || false,
          officeType: sub.office_type || null,
          engagementScore: parseFloat(sub.engagement_score?.toString() || '0') || 0,
          isActive: sub.is_active,
          createdAt: formatTimestampIST(sub.created_at),
          updatedAt: formatTimestampIST(sub.updated_at),
        };
      })
    );

    return NextResponse.json({ success: true, subAccounts: formattedSubAccounts });
  } catch (error: any) {
    console.error('API error in /api/admin/subaccounts:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
