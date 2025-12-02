import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { formatTimestampIST, getCurrentISTTime } from '@/lib/utils/dateFormatters';
import { logEditActivity, logDeleteActivity } from '@/lib/utils/activityLogger';

// GET - Fetch single account by ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const id = parseInt(params.id);
    const { searchParams } = new URL(request.url);
    const employeeUsername = searchParams.get('employee');
    const isAdmin = searchParams.get('isAdmin') === 'true';

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid account ID' },
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

    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching account:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    // Check access: non-admin users can only access accounts assigned to them
    if (!isAdmin && employeeUsername) {
      if (data.assigned_employee !== employeeUsername) {
        return NextResponse.json(
          { error: 'Access denied. This account is not assigned to you.' },
          { status: 403 }
        );
      }
    }

    // Format timestamps in IST
    const formattedData = {
      ...data,
      created_at: formatTimestampIST(data.created_at),
      updated_at: formatTimestampIST(data.updated_at),
      last_activity_at: data.last_activity_at ? formatTimestampIST(data.last_activity_at) : null,
    };

    return NextResponse.json({ data: formattedData });
  } catch (error: any) {
    console.error('Get account error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update account
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const id = parseInt(params.id);
    const body = await request.json();

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid account ID' },
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

    const updateData: any = {
      updated_at: getCurrentISTTime(),
      last_activity_at: getCurrentISTTime(),
    };

    // Update only provided fields
    if (body.accountName !== undefined) updateData.account_name = body.accountName.trim();
    // Convert empty strings to null for enum fields (database doesn't accept empty strings for enums)
    if (body.companyStage !== undefined) updateData.company_stage = (body.companyStage && body.companyStage.trim() !== '') ? body.companyStage : null;
    if (body.companyTag !== undefined) updateData.company_tag = (body.companyTag && body.companyTag.trim() !== '') ? body.companyTag : null;
    if (body.notes !== undefined) updateData.notes = body.notes?.trim() || null;
    if (body.industries !== undefined) updateData.industries = body.industries || [];
    if (body.industryProjects !== undefined) updateData.industry_projects = body.industryProjects || {};
    // Update both assigned_employee and assigned_to columns (assigned_to is an alias for compatibility)
    if (body.assignedEmployee !== undefined) {
      const assignedValue = (body.assignedEmployee && body.assignedEmployee.trim() !== '') ? body.assignedEmployee : null;
      updateData.assigned_employee = assignedValue;
      updateData.assigned_to = assignedValue; // Also update assigned_to column
    }
    if (body.is_active !== undefined) updateData.is_active = body.is_active;

    // Get old account data for activity logging
    const { data: oldAccount } = await supabase
      .from('accounts')
      .select('account_name, company_stage, company_tag, assigned_employee, notes, industries, industry_projects, is_active')
      .eq('id', id)
      .single();

    const { data, error } = await supabase
      .from('accounts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating account:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity for account update with change detection
    const updatedBy = body.updatedBy || 'System';
    await logEditActivity({
      account_id: id,
      employee_id: updatedBy,
      entityName: data.account_name,
      entityType: 'account',
      oldData: oldAccount,
      newData: {
        account_name: body.accountName,
        company_stage: body.companyStage,
        company_tag: body.companyTag,
        assigned_employee: body.assignedEmployee,
        notes: body.notes,
        industries: body.industries,
        industry_projects: body.industryProjects,
        is_active: body.is_active,
      },
      fieldLabels: {
        account_name: 'Account Name',
        company_stage: 'Company Stage',
        company_tag: 'Company Tag',
        assigned_employee: 'Assigned Employee',
        notes: 'Notes',
        industries: 'Industries',
        industry_projects: 'Industry Projects',
        is_active: 'Status',
      },
    });

    // Format timestamps in IST
    const formattedData = {
      ...data,
      created_at: formatTimestampIST(data.created_at),
      updated_at: formatTimestampIST(data.updated_at),
      last_activity_at: data.last_activity_at ? formatTimestampIST(data.last_activity_at) : null,
    };

    return NextResponse.json({ data: formattedData, success: true });
  } catch (error: any) {
    console.error('Update account error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete account (soft delete by setting is_active to false)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid account ID' },
        { status: 400 }
      );
    }

    // Allow deletion for all users (can add admin check later if needed)
    // const { searchParams } = new URL(request.url);
    // const isAdmin = searchParams.get('isAdmin') === 'true';

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

    // Get old account data for activity logging
    const { data: oldAccount } = await supabase
      .from('accounts')
      .select('account_name, assigned_employee, is_active')
      .eq('id', id)
      .single();

    if (!oldAccount) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    // Soft delete - set is_active to false
    const { data, error } = await supabase
      .from('accounts')
      .update({ 
        is_active: false, 
        updated_at: getCurrentISTTime(),
        last_activity_at: getCurrentISTTime(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error deleting account:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity for account deletion
    const { searchParams } = new URL(request.url);
    const deletedBy = searchParams.get('deletedBy') || searchParams.get('updatedBy') || 'System';
    
    await logDeleteActivity({
      account_id: id,
      employee_id: deletedBy,
      entityName: oldAccount.account_name,
      entityType: 'account',
      deletedData: oldAccount,
    });

    // Format timestamps in IST
    const formattedData = {
      ...data,
      created_at: formatTimestampIST(data.created_at),
      updated_at: formatTimestampIST(data.updated_at),
      last_activity_at: data.last_activity_at ? formatTimestampIST(data.last_activity_at) : null,
    };

    return NextResponse.json({ data: formattedData, success: true });
  } catch (error: any) {
    console.error('Delete account error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

