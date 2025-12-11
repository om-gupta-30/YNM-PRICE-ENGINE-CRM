import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { formatTimestampIST, getCurrentISTTime } from '@/lib/utils/dateFormatters';
import { logEditActivity, logCreateActivity } from '@/lib/utils/activityLogger';
import { createDashboardNotification } from '@/lib/utils/dashboardNotificationLogger';

// PERFORMANCE OPTIMIZATION: Edge runtime for read-only GET API
// This route only reads from Supabase and doesn't use Node-specific APIs
export const runtime = "edge";

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
      .select('id, account_id, sub_account_name, state_id, city_id, address, pincode, gst_number, website, is_headquarter, office_type, engagement_score, is_active, created_at, updated_at, accounts:account_id(account_name)')
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

    // PERFORMANCE OPTIMIZATION: Batch state and city lookups instead of individual queries
    const stateIds = [...new Set((subAccounts || []).map((sub: any) => sub.state_id).filter(Boolean))];
    const cityIds = [...new Set((subAccounts || []).map((sub: any) => sub.city_id).filter(Boolean))];

    // Fetch all states and cities in parallel
    const [statesResult, citiesResult] = await Promise.all([
      stateIds.length > 0
        ? supabase.from('states').select('id, state_name').in('id', stateIds)
        : Promise.resolve({ data: [], error: null }),
      cityIds.length > 0
        ? supabase.from('cities').select('id, city_name').in('id', cityIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    // Create lookup maps
    const stateMap = new Map();
    (statesResult.data || []).forEach((state: any) => {
      stateMap.set(state.id, state.state_name);
    });

    const cityMap = new Map();
    (citiesResult.data || []).forEach((city: any) => {
      cityMap.set(city.id, city.city_name);
    });

    // Fetch state and city names for each sub-account (using cached lookups)
    const formattedSubAccounts = (subAccounts || []).map((sub: any) => {
        const stateName = sub.state_id ? (stateMap.get(sub.state_id) || null) : null;
        const cityName = sub.city_id ? (cityMap.get(sub.city_id) || null) : null;

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
    });

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
      pincode,
      gstNumber,
      website,
      isHeadquarter,
      officeType,
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
        pincode: pincode && pincode.trim() !== '' ? pincode.trim() : null,
        gst_number: gstNumber && gstNumber.trim() !== '' ? gstNumber.trim() : null,
        website: website && website.trim() !== '' ? website.trim() : null,
        is_headquarter: isHeadquarter || false,
        office_type: officeType && officeType.trim() !== '' ? officeType.trim() : null,
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

    // Log activity for sub-account creation
    try {
      await logCreateActivity({
        account_id: parseInt(accountId),
        sub_account_id: subAccount.id,
        employee_id: body.created_by || 'System',
        entityName: subAccountName,
        entityType: 'sub_account',
        createdData: {
          sub_account_name: subAccountName,
          state_id: stateId,
          city_id: cityId,
          address,
          pincode,
        },
      });
    } catch (activityError) {
      console.warn('Failed to log sub-account creation activity:', activityError);
    }

    // Create dashboard notification for sub-account creation
    // Get account's assigned employee to notify them
    try {
      const { data: accountData } = await supabase
        .from('accounts')
        .select('assigned_employee, account_name')
        .eq('id', parseInt(accountId))
        .single();
      
      const notificationEmployee = accountData?.assigned_employee || body.created_by || 'Admin';
      createDashboardNotification({
        type: 'sub_account_added',
        employee: notificationEmployee,
        message: `New sub-account "${subAccountName}" has been added to account "${accountData?.account_name || 'Unknown'}"`,
        entityName: subAccountName,
        entityId: subAccount.id,
        priority: 'normal',
        metadata: {
          sub_account_id: subAccount.id,
          account_id: parseInt(accountId),
        },
      }).catch(() => {
        // Silently fail - notification creation is non-critical
      });
    } catch (err) {
      // Silently fail - notification creation is non-critical
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
      pincode,
      gstNumber,
      website,
      isHeadquarter,
      officeType,
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
    if (pincode !== undefined) {
      updateData.pincode = pincode && pincode.trim() !== '' ? pincode.trim() : null;
    }
    if (gstNumber !== undefined) {
      updateData.gst_number = gstNumber && gstNumber.trim() !== '' ? gstNumber.trim() : null;
    }
    if (website !== undefined) {
      updateData.website = website && website.trim() !== '' ? website.trim() : null;
    }
    if (isHeadquarter !== undefined) {
      updateData.is_headquarter = isHeadquarter || false;
    }
    if (officeType !== undefined) {
      updateData.office_type = officeType && officeType.trim() !== '' ? officeType.trim() : null;
    }

    // Get old sub-account data for activity logging
    const { data: oldSubAccount } = await supabase
      .from('sub_accounts')
      .select('account_id, sub_account_name, state_id, city_id, address, pincode, gst_number, website, is_headquarter, office_type')
      .eq('id', parseInt(id))
      .single();

    const { data: updatedSubAccount, error } = await supabase
      .from('sub_accounts')
      .update(updateData)
      .eq('id', parseInt(id))
      .select()
      .single();

    if (error) {
      console.error('Error updating sub-account:', error);
      return NextResponse.json(
        { error: `Failed to update sub-account: ${error.message}` },
        { status: 500 }
      );
    }

    // Log activity for sub-account update with change detection
    if (oldSubAccount?.account_id) {
      const updatedBy = body.updated_by || body.updatedBy || 'System';
      const entityName = updatedSubAccount?.sub_account_name || oldSubAccount?.sub_account_name || 'Sub-account';
      
      // Create newData object with all fields from oldSubAccount, then update changed ones
      const newData: any = {
        ...oldSubAccount,
        sub_account_name: subAccountName !== undefined ? subAccountName : oldSubAccount.sub_account_name,
        state_id: stateId !== undefined ? stateId : oldSubAccount.state_id,
        city_id: cityId !== undefined ? cityId : oldSubAccount.city_id,
        address: address !== undefined ? address : oldSubAccount.address,
        pincode: pincode !== undefined ? pincode : oldSubAccount.pincode,
        gst_number: gstNumber !== undefined ? gstNumber : oldSubAccount.gst_number,
        website: website !== undefined ? website : oldSubAccount.website,
        is_headquarter: isHeadquarter !== undefined ? isHeadquarter : oldSubAccount.is_headquarter,
        office_type: officeType !== undefined ? officeType : oldSubAccount.office_type,
      };
      
      await logEditActivity({
        account_id: oldSubAccount.account_id,
        employee_id: updatedBy,
        entityName,
        entityType: 'sub_account',
        oldData: oldSubAccount,
        newData,
        fieldLabels: {
          sub_account_name: 'Sub-Account Name',
          account_id: 'Account ID',
          state_id: 'State',
          city_id: 'City',
          address: 'Address',
          pincode: 'Pincode',
          gst_number: 'GST Number',
          website: 'Website',
          is_headquarter: 'Headquarter',
          office_type: 'Office Type',
        },
      });

      // Create dashboard notification for sub-account edit
      // Get account's assigned employee to notify them
      try {
        const { data: accountData } = await supabase
          .from('accounts')
          .select('assigned_employee, account_name')
          .eq('id', oldSubAccount.account_id)
          .single();
        
        const notificationEmployee = accountData?.assigned_employee || updatedBy || 'Admin';
        createDashboardNotification({
          type: 'sub_account_edited',
          employee: notificationEmployee,
          message: `Sub-account "${entityName}" has been updated`,
          entityName,
          entityId: parseInt(id),
          priority: 'normal',
          metadata: {
            sub_account_id: parseInt(id),
            account_id: oldSubAccount.account_id,
          },
        }).catch(() => {
          // Silently fail - notification creation is non-critical
        });
      } catch (err) {
        // Silently fail - notification creation is non-critical
      }
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

