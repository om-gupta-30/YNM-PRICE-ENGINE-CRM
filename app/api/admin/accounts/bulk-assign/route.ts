import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { getCurrentISTTime } from '@/lib/utils/dateFormatters';
import { logEditActivity } from '@/lib/utils/activityLogger';

// POST - Bulk assign accounts to an employee
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountIds, assignedEmployee, updatedBy } = body;

    // Validation
    if (!accountIds || !Array.isArray(accountIds) || accountIds.length === 0) {
      return NextResponse.json(
        { error: 'accountIds must be a non-empty array' },
        { status: 400 }
      );
    }

    // assignedEmployee can be null (to unassign)
    const assignedValue = (assignedEmployee && assignedEmployee.trim() !== '') 
      ? assignedEmployee.trim() 
      : null;

    const supabase = createSupabaseServerClient();

    // Fetch old account data for activity logging
    const { data: oldAccounts, error: fetchError } = await supabase
      .from('accounts')
      .select('id, account_name, assigned_employee')
      .in('id', accountIds);

    if (fetchError) {
      console.error('Error fetching accounts:', fetchError);
      return NextResponse.json(
        { error: `Failed to fetch accounts: ${fetchError.message}` },
        { status: 500 }
      );
    }

    if (!oldAccounts || oldAccounts.length === 0) {
      return NextResponse.json(
        { error: 'No accounts found with the provided IDs' },
        { status: 404 }
      );
    }

    // Update all accounts in bulk
    const { data: updatedAccounts, error: updateError } = await supabase
      .from('accounts')
      .update({
        assigned_employee: assignedValue,
        assigned_to: assignedValue, // Also update assigned_to column for compatibility
        updated_at: getCurrentISTTime(),
        last_activity_at: getCurrentISTTime(),
      })
      .in('id', accountIds)
      .select('id, account_name, assigned_employee');

    if (updateError) {
      console.error('Error updating accounts:', updateError);
      return NextResponse.json(
        { error: `Failed to update accounts: ${updateError.message}` },
        { status: 500 }
      );
    }

    // Log activity for each account (non-blocking)
    const employeeId = updatedBy || 'System';
    Promise.all(
      oldAccounts.map(async (oldAccount) => {
        try {
          await logEditActivity({
            account_id: oldAccount.id,
            employee_id: employeeId,
            entityName: oldAccount.account_name,
            entityType: 'account',
            oldData: {
              assigned_employee: oldAccount.assigned_employee,
            },
            newData: {
              assigned_employee: assignedValue,
            },
            fieldLabels: {
              assigned_employee: 'Assigned Employee',
            },
          });
        } catch (activityError) {
          console.warn(`Failed to log activity for account ${oldAccount.id}:`, activityError);
        }
      })
    ).catch(() => {
      // Silent fail for background activity logging
    });

    return NextResponse.json({
      success: true,
      message: `Successfully assigned ${updatedAccounts.length} account(s) to ${assignedValue || 'Unassigned'}`,
      updatedCount: updatedAccounts.length,
    });
  } catch (error: any) {
    console.error('API error in /api/admin/accounts/bulk-assign:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

