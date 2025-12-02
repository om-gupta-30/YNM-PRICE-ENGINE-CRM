import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { formatTimestampIST, getCurrentISTTime } from '@/lib/utils/dateFormatters';

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
    if (body.stateId !== undefined) updateData.state_id = body.stateId || null;
    if (body.cityId !== undefined) updateData.city_id = body.cityId || null;
    if (body.address !== undefined) updateData.address = body.address && body.address.trim() !== '' ? body.address.trim() : null;
    if (body.website !== undefined) updateData.website = body.website?.trim() || null;
    if (body.gstNumber !== undefined) updateData.gst_number = body.gstNumber?.trim() || null;
    if (body.relatedProducts !== undefined) updateData.related_products = body.relatedProducts || [];
    if (body.notes !== undefined) updateData.notes = body.notes?.trim() || null;
    if (body.industries !== undefined) updateData.industries = body.industries || [];
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
      .select('account_name, assigned_employee, website, gst_number, notes, industries, address')
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

    // Log activity for account update
    try {
      const changes: string[] = [];
      if (body.accountName && body.accountName !== oldAccount?.account_name) {
        changes.push(`Name: "${oldAccount?.account_name}" → "${body.accountName}"`);
      }
      if (body.companyStage) changes.push(`Stage: ${body.companyStage}`);
      if (body.companyTag) changes.push(`Tag: ${body.companyTag}`);
      if (body.website !== undefined && body.website !== oldAccount?.website) {
        changes.push(`Website: "${oldAccount?.website || 'None'}" → "${body.website || 'None'}"`);
      }
      if (body.gstNumber !== undefined && body.gstNumber !== oldAccount?.gst_number) {
        changes.push(`GST: "${oldAccount?.gst_number || 'None'}" → "${body.gstNumber || 'None'}"`);
      }
      if (body.notes !== undefined && body.notes !== oldAccount?.notes) {
        changes.push(`Notes updated`);
      }
      if (body.industries !== undefined) {
        const oldIndustryCount = oldAccount?.industries?.length || 0;
        const newIndustryCount = body.industries?.length || 0;
        if (oldIndustryCount !== newIndustryCount) {
          changes.push(`Industries: ${oldIndustryCount} → ${newIndustryCount} selections`);
        }
      }
      if (body.assignedEmployee && body.assignedEmployee !== oldAccount?.assigned_employee) {
        changes.push(`Assigned: "${oldAccount?.assigned_employee}" → "${body.assignedEmployee}"`);
      }
      if (body.stateId !== undefined) changes.push(`State updated`);
      if (body.cityId !== undefined) changes.push(`City updated`);
      if (body.address !== undefined && body.address !== oldAccount?.address) {
        changes.push(`Address updated`);
      }
      if (body.is_active !== undefined) {
        changes.push(`Status: ${body.is_active ? 'Activated' : 'Deactivated'}`);
      }

      if (changes.length > 0) {
        const updatedBy = body.updatedBy || 'System';
        await supabase.from('activities').insert({
          account_id: id,
          employee_id: updatedBy,
          activity_type: 'note',
          description: `Account "${data.account_name}" updated: ${changes.join(', ')}`,
          metadata: {
            changes,
            old_data: oldAccount,
            new_data: data,
          },
        });
      }
    } catch (activityError) {
      console.warn('Failed to log account update activity:', activityError);
    }

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

