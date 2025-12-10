import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { logActivity } from '@/lib/utils/activityLogger';

// POST - Create new lead
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      lead_name,
      contact_person,
      phone,
      email,
      requirements,
      lead_source,
      status,
      priority,
      assigned_employee,
      accounts,
      sub_accounts,
      contact_id,
      created_by,
    } = body;

    // Map accounts/sub_accounts to account_id/sub_account_id for database
    const account_id = accounts || null;
    const sub_account_id = sub_accounts || null;

    // Validation
    if (!accounts) {
      return NextResponse.json(
        { error: 'Account is required' },
        { status: 400 }
      );
    }

    if (!sub_accounts) {
      return NextResponse.json(
        { error: 'Sub-Account is required' },
        { status: 400 }
      );
    }

    if (!contact_id) {
      return NextResponse.json(
        { error: 'Contact is required. Please select a contact from the sub-account.' },
        { status: 400 }
      );
    }

    if (!lead_name || lead_name.trim() === '') {
      return NextResponse.json(
        { error: 'Lead name is required' },
        { status: 400 }
      );
    }

    if (!phone || phone.trim() === '') {
      return NextResponse.json(
        { error: 'Phone is required' },
        { status: 400 }
      );
    }

    // Email format validation
    if (email && email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        );
      }
    }

    const supabase = createSupabaseServerClient();

    // Normalize priority value to match database constraint
    // Database expects: 'High Priority', 'Medium Priority', 'Low Priority', or null
    // IMPORTANT: Must be exactly one of these values or null - no empty strings allowed
    let normalizedPriority: string | null = null;
    if (priority !== undefined && priority !== null && priority !== '') {
      const priorityStr = String(priority).trim();
      // Exact matches only - database constraint is strict
      if (priorityStr === 'High Priority') {
        normalizedPriority = 'High Priority';
      } else if (priorityStr === 'Medium Priority') {
        normalizedPriority = 'Medium Priority';
      } else if (priorityStr === 'Low Priority') {
        normalizedPriority = 'Low Priority';
      } else {
        // Invalid priority value - set to null (empty string would violate constraint)
        console.warn(`Invalid priority value: "${priority}" (type: ${typeof priority}), setting to null`);
        normalizedPriority = null;
      }
    }
    // If priority is undefined, null, or empty string, normalizedPriority stays null (correct)
    // CRITICAL: Do not pass empty string to database - it will violate the constraint

    // Determine assigned employee:
    // 1. If assigned_employee is explicitly provided, use it
    // 2. If no assigned_employee provided, auto-assign to account's assigned employee
    // 3. Otherwise, leave as null
    let finalAssignedEmployee = assigned_employee && assigned_employee.trim() ? assigned_employee.trim() : null;
    
    // If no assigned employee is provided and account_id exists, check if account has an assigned employee
    if (!finalAssignedEmployee && account_id) {
      try {
        const { data: accountData, error: accountError } = await supabase
          .from('accounts')
          .select('assigned_employee')
          .eq('id', account_id)
          .single();
        
        if (accountError) {
          console.error('Error fetching account assigned employee:', accountError);
          return NextResponse.json(
            { error: `Failed to fetch account details: ${accountError.message}` },
            { status: 500 }
          );
        }
        
        if (accountData && accountData.assigned_employee) {
          // Auto-assign lead to the employee assigned to the account
          finalAssignedEmployee = accountData.assigned_employee;
          console.log(`Auto-assigned lead to employee: ${finalAssignedEmployee} from account ${account_id}`);
        } else {
          // Account has no assigned employee - return error
          return NextResponse.json(
            { error: 'This account has no assigned employee. Please assign an employee to this account first before creating a lead.' },
            { status: 400 }
          );
        }
      } catch (err: any) {
        console.error('Error fetching account assigned employee:', err);
        return NextResponse.json(
          { error: `Failed to fetch account details: ${err.message || 'Unknown error'}` },
          { status: 500 }
        );
      }
    }

    // Build insert object - only include priority if it's not null
    const insertData: any = {
      lead_name: lead_name.trim(),
      contact_person: contact_person?.trim() || null,
      phone: phone.trim(),
      email: email?.trim() || null,
      requirements: requirements?.trim() || null,
      lead_source: lead_source || null,
      status: status || 'New',
      assigned_employee: finalAssignedEmployee,
      account_id: account_id,
      sub_account_id: sub_account_id,
      contact_id: contact_id || null,
      created_by: created_by || null,
    };
    
    // Only include priority if it's a valid value (not null)
    if (normalizedPriority !== null) {
      insertData.priority = normalizedPriority;
    }
    // If normalizedPriority is null, we don't include it in the insert (database will use default/null)

    // Insert lead using service role to bypass RLS
    const { data, error } = await supabase
      .from('leads')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating lead:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity for lead creation
    if (created_by || finalAssignedEmployee) {
      try {
        await logActivity({
          account_id: account_id,
          employee_id: created_by || finalAssignedEmployee || 'System',
          activity_type: 'create',
          description: `Lead created: ${lead_name.trim()}`,
          metadata: {
            entity_type: 'lead',
            lead_id: data.id,
            lead_name: lead_name.trim(),
            status: data.status,
            lead_source: lead_source || null,
          },
        });
      } catch (activityError) {
        console.warn('Failed to log lead creation activity:', activityError);
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Create lead error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

