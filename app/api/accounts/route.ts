import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { formatTimestampIST } from '@/lib/utils/dateFormatters';
import { logCreateActivity } from '@/lib/utils/activityLogger';
import { createDashboardNotification, createDashboardNotificationsForEmployees } from '@/lib/utils/dashboardNotificationLogger';

// PERFORMANCE OPTIMIZATION: Edge runtime for read-only GET API
// This route only reads from Supabase and doesn't use Node-specific APIs
export const runtime = "edge";

// PERFORMANCE OPTIMIZATION: In-memory cache for accounts/subaccounts lookups
// Cache for 5 minutes max (simple timestamp check)
const accountsCache = {
  data: null as any,
  timestamp: 0,
  TTL: 5 * 60 * 1000, // 5 minutes
};

const subAccountsCache = {
  data: null as any,
  timestamp: 0,
  TTL: 5 * 60 * 1000, // 5 minutes
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeUsername = searchParams.get('employee');
    const isAdmin = searchParams.get('isAdmin') === 'true';

    const supabase = createSupabaseServerClient();

    // Fetch accounts with all required fields
    // Filter by is_active to exclude deleted accounts
    // Note: gst_number and website are in sub_accounts, not accounts
    let query = supabase
      .from('accounts')
      .select(`
        id,
        account_name,
        company_stage,
        company_tag,
        engagement_score,
        notes,
        industries,
        industry_projects,
        assigned_employee,
        is_active,
        created_at,
        updated_at
      `)
      .order('account_name', { ascending: true });
    
    // Filter by is_active to only show active accounts (exclude deleted ones)
    query = query.eq('is_active', true);
    
    // Removed filter: All users can now see all accounts (not just assigned ones)
    // Previously filtered by assigned_employee if not admin, but now everyone sees all accounts

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

          // Calculate total engagement score for each account
    const accountsWithScores = await Promise.all(
      (accounts || []).map(async (account) => {
        try {
          // Get sub-accounts to calculate engagement score and get state/city
          const { data: subAccounts, error: subAccountsError } = await supabase
            .from('sub_accounts')
            .select('id, engagement_score, sub_account_name, state_id, city_id')
            .eq('account_id', account.id)
            .eq('is_active', true)
            .order('engagement_score', { ascending: false });
          
          // If sub_accounts table doesn't exist, just use empty array
          if (subAccountsError && (subAccountsError.code === '42P01' || subAccountsError.message?.includes('does not exist'))) {
            return {
              id: account.id,
              accountName: account.account_name,
              companyStage: account.company_stage,
              companyTag: account.company_tag,
              engagementScore: 0,
              notes: account.notes || null,
              industries: account.industries || [],
              industryProjects: account.industry_projects || {},
              assignedEmployee: account.assigned_employee || null,
              stateId: null,
              cityId: null,
              stateName: null,
              cityName: null,
              createdAt: formatTimestampIST(account.created_at),
              updatedAt: formatTimestampIST(account.updated_at),
            };
          }

          const totalEngagementScore = subAccounts?.reduce(
            (sum, sub) => sum + (parseFloat(sub.engagement_score?.toString() || '0') || 0),
            0
          ) || 0;

          // Get state and city from first sub-account (since all accounts have only one sub-account for now)
          let stateId = null;
          let cityId = null;
          let stateName = null;
          let cityName = null;

          if (subAccounts && subAccounts.length > 0) {
            const firstSubAccount = subAccounts[0];
            stateId = firstSubAccount.state_id || null;
            cityId = firstSubAccount.city_id || null;

            // Fetch state name if state_id exists
            if (stateId) {
              try {
                const { data: stateData } = await supabase
                  .from('states')
                  .select('state_name')
                  .eq('id', stateId)
                  .single();
                stateName = stateData?.state_name || null;
              } catch (err) {
                console.error(`Error fetching state for account ${account.id}:`, err);
              }
            }

            // Fetch city name if city_id exists
            if (cityId) {
              try {
                const { data: cityData } = await supabase
                  .from('cities')
                  .select('city_name')
                  .eq('id', cityId)
                  .single();
                cityName = cityData?.city_name || null;
              } catch (err) {
                console.error(`Error fetching city for account ${account.id}:`, err);
              }
            }
          }

          return {
            id: account.id,
            accountName: account.account_name,
            companyStage: account.company_stage,
            companyTag: account.company_tag,
            engagementScore: totalEngagementScore,
            notes: account.notes || null,
            industries: account.industries || [],
            industryProjects: account.industry_projects || {},
            assignedEmployee: account.assigned_employee || null,
            stateId,
            cityId,
            stateName,
            cityName,
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
            notes: account.notes || null,
            industries: account.industries || [],
            industryProjects: account.industry_projects || {},
            assignedEmployee: account.assigned_employee || null,
            stateId: null,
            cityId: null,
            stateName: null,
            cityName: null,
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
      notes,
      industries,
      industryProjects,
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
        notes: notes || null,
        industries: industries || [],
        industry_projects: industryProjects || {},
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
    await logCreateActivity({
      account_id: account.id,
      employee_id: createdBy || finalAssignedEmployee || 'System',
      entityName: accountName,
      entityType: 'account',
      createdData: {
        account_name: accountName,
        company_stage: companyStage,
        company_tag: companyTag,
        assigned_employee: finalAssignedEmployee,
      },
    });

    // Create dashboard notification for account creation
    // If assigned to an employee, notify them; otherwise notify admin
    const notificationEmployee = finalAssignedEmployee || 'Admin';
    createDashboardNotification({
      type: 'account_added',
      employee: notificationEmployee,
      message: `New account "${accountName}" has been created${finalAssignedEmployee ? ` and assigned to you` : ''}`,
      entityName: accountName,
      entityId: account.id,
      priority: 'normal',
      metadata: {
        account_id: account.id,
        company_stage: companyStage,
        company_tag: companyTag,
      },
    }).catch(() => {
      // Silently fail - notification creation is non-critical
    });

    return NextResponse.json({ success: true, accountId: account.id }, { status: 201 });
  } catch (error: any) {
    console.error('API error in /api/accounts POST:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
