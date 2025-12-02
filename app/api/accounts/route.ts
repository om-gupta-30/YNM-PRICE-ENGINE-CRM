import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { formatTimestampIST } from '@/lib/utils/dateFormatters';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeUsername = searchParams.get('employee');
    const isAdmin = searchParams.get('isAdmin') === 'true';

    const supabase = createSupabaseServerClient();

    // Fetch accounts with all required fields
    // Try to query with is_active filter, but fallback if column doesn't exist
    let query = supabase
      .from('accounts')
      .select(`
        id,
        account_name,
        company_stage,
        company_tag,
        engagement_score,
        gst_number,
        website,
        notes,
        industries,
        assigned_employee,
        state_id,
        city_id,
        address,
        created_at,
        updated_at
      `)
      .order('account_name', { ascending: true });
    
    // Filter by assigned_employee if not admin
    if (!isAdmin && employeeUsername) {
      query = query.eq('assigned_employee', employeeUsername);
    }
    
    // Note: We removed is_active filter to avoid errors if column doesn't exist
    // The query will work regardless of whether is_active column exists

    const { data: accounts, error } = await query;

    if (error) {
      console.error('Error fetching accounts:', error);
      // Check for column does not exist error
      if (error.code === '42703' || error.message?.includes('does not exist')) {
        return NextResponse.json(
          { error: 'Database schema mismatch. Please run the database migration script.' },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: `Failed to fetch accounts: ${error.message}` },
        { status: 500 }
      );
    }

    // Calculate total engagement score and fetch state/city names for each account
    const accountsWithScores = await Promise.all(
      (accounts || []).map(async (account) => {
        try {
          // Get sub-accounts to calculate engagement score
          const { data: subAccounts, error: subAccountsError } = await supabase
            .from('sub_accounts')
            .select('id, engagement_score, sub_account_name')
            .eq('account_id', account.id)
            .eq('is_active', true)
            .order('engagement_score', { ascending: false });
          
          // Fetch state and city names if they exist
          let stateName = null;
          let cityName = null;
          
          if (account.state_id) {
            try {
              const { data: stateData } = await supabase
                .from('states')
                .select('state_name')
                .eq('id', account.state_id)
                .single();
              stateName = stateData?.state_name || null;
            } catch (err) {
              console.error(`Error fetching state for account ${account.id}:`, err);
            }
          }
          
          if (account.city_id) {
            try {
              const { data: cityData } = await supabase
                .from('cities')
                .select('city_name')
                .eq('id', account.city_id)
                .single();
              cityName = cityData?.city_name || null;
            } catch (err) {
              console.error(`Error fetching city for account ${account.id}:`, err);
            }
          }

          // If sub_accounts table doesn't exist, just use empty array
          if (subAccountsError && (subAccountsError.code === '42P01' || subAccountsError.message?.includes('does not exist'))) {
            return {
              id: account.id,
              accountName: account.account_name,
              companyStage: account.company_stage,
              companyTag: account.company_tag,
              engagementScore: 0,
              gstNumber: account.gst_number || null,
              website: account.website || null,
              notes: account.notes || null,
              industries: account.industries || [],
              assignedEmployee: account.assigned_employee || null,
              stateId: account.state_id || null,
              cityId: account.city_id || null,
              stateName,
              cityName,
              address: account.address || null,
              createdAt: formatTimestampIST(account.created_at),
              updatedAt: formatTimestampIST(account.updated_at),
            };
          }

          const totalEngagementScore = subAccounts?.reduce(
            (sum, sub) => sum + (parseFloat(sub.engagement_score?.toString() || '0') || 0),
            0
          ) || 0;

          return {
            id: account.id,
            accountName: account.account_name,
            companyStage: account.company_stage,
            companyTag: account.company_tag,
            engagementScore: totalEngagementScore,
            gstNumber: account.gst_number || null,
            website: account.website || null,
            notes: account.notes || null,
            industries: account.industries || [],
            assignedEmployee: account.assigned_employee || null,
            stateId: account.state_id || null,
            cityId: account.city_id || null,
            stateName,
            cityName,
            address: account.address || null,
            createdAt: formatTimestampIST(account.created_at),
            updatedAt: formatTimestampIST(account.updated_at),
          };
        } catch (err: any) {
          console.error(`Error processing account ${account.id}:`, err);
          // Return account with 0 engagement score on error
          return {
            id: account.id,
            accountName: account.account_name,
            companyStage: account.company_stage,
            companyTag: account.company_tag,
            engagementScore: 0,
            gstNumber: account.gst_number || null,
            website: account.website || null,
            notes: account.notes || null,
            industries: account.industries || [],
            assignedEmployee: account.assigned_employee || null,
            stateId: account.state_id || null,
            cityId: account.city_id || null,
            stateName: null,
            cityName: null,
            address: account.address || null,
            createdAt: formatTimestampIST(account.created_at),
            updatedAt: formatTimestampIST(account.updated_at),
          };
        }
      })
    );

    return NextResponse.json({ success: true, accounts: accountsWithScores });
  } catch (error: any) {
    console.error('API error in /api/accounts:', error);
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
      accountName,
      companyStage,
      companyTag,
      assignedEmployee,
      stateId,
      cityId,
      address,
      website,
      gstNumber,
      notes,
      industries,
      createdBy,
    } = body;

    // Validation - only account name is required
    if (!accountName) {
      return NextResponse.json(
        { error: 'Missing required field: accountName' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Determine assigned employee:
    // 1. If assignedEmployee is provided (admin assigning), use it
    // 2. If createdBy is provided and is an employee (not Admin), auto-assign to them
    // 3. Otherwise, leave as null (admin can assign later)
    let finalAssignedEmployee = assignedEmployee || null;
    if (!finalAssignedEmployee && createdBy && createdBy.toLowerCase() !== 'admin') {
      // Auto-assign to the employee who created the account
      finalAssignedEmployee = createdBy;
    }

    // Insert account
    // Stage, Tag, and Employee are optional - admin can assign later
    // Convert empty strings to null for enum fields (database doesn't accept empty strings for enums)
    // assigned_to is an alias for assigned_employee (both columns updated for compatibility)
    const { data: account, error } = await supabase
      .from('accounts')
      .insert({
        account_name: accountName,
        company_stage: (companyStage && companyStage.trim() !== '') ? companyStage : null,
        company_tag: (companyTag && companyTag.trim() !== '') ? companyTag : null,
        assigned_employee: finalAssignedEmployee,
        assigned_to: finalAssignedEmployee, // Also update assigned_to column
        state_id: stateId || null,
        city_id: cityId || null,
        address: address && address.trim() !== '' ? address.trim() : null,
        website: website || null,
        gst_number: gstNumber || null,
        notes: notes || null,
        industries: industries || [],
        engagement_score: 0,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating account:', error);
      return NextResponse.json(
        { error: `Failed to create account: ${error.message}` },
        { status: 500 }
      );
    }

    // Log activity for account creation
    try {
      await supabase.from('activities').insert({
        account_id: account.id,
        employee_id: createdBy || finalAssignedEmployee || 'System',
        activity_type: 'note',
        description: `Account "${accountName}" created${finalAssignedEmployee ? ` and assigned to ${finalAssignedEmployee}` : ''}`,
        metadata: {
          website: website || null,
          gst_number: gstNumber || null,
          assigned_employee: finalAssignedEmployee,
        },
      });
    } catch (activityError) {
      console.warn('Failed to log activity:', activityError);
    }

    return NextResponse.json({ success: true, accountId: account.id }, { status: 201 });
  } catch (error: any) {
    console.error('API error in /api/accounts POST:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
