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

    // Log incoming priority value for debugging
    console.log('Received priority value:', priority, 'Type:', typeof priority);

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
    // Database expects: 'High Priority', 'Medium Priority', 'Low Priority', or NULL
    // CRITICAL: Empty string will violate the constraint - must be NULL or valid value
    let normalizedPriority: string | null = null;
    
    // Handle all possible priority values - be very strict
    if (priority !== undefined && priority !== null) {
      // Convert to string and trim
      const priorityStr = String(priority).trim();
      
      // Only accept exact matches - database constraint is strict
      if (priorityStr === 'High Priority') {
        normalizedPriority = 'High Priority';
      } else if (priorityStr === 'Medium Priority') {
        normalizedPriority = 'Medium Priority';
      } else if (priorityStr === 'Low Priority') {
        normalizedPriority = 'Low Priority';
      } else if (priorityStr === '' || priorityStr === 'null' || priorityStr === 'undefined') {
        // Explicitly handle empty strings and string representations of null/undefined
        normalizedPriority = null;
      } else {
        // Any other value is invalid - set to null
        console.warn(`Invalid priority value: "${priority}" (type: ${typeof priority}, string: "${priorityStr}"), setting to null`);
        normalizedPriority = null;
      }
    }
    
    console.log('Priority normalization:', { received: priority, type: typeof priority, normalized: normalizedPriority });

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

    // Build insert object - NEVER include priority if it's null or empty
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
    
    // CRITICAL: Only include priority if it's EXACTLY one of the three valid values
    // Database constraint requires: 'High Priority', 'Medium Priority', 'Low Priority', or NULL
    // We MUST NOT include priority field at all if it's null/empty/invalid
    // This allows the database to use NULL (default) which satisfies the constraint
    const validPriorities = ['High Priority', 'Medium Priority', 'Low Priority'];
    if (normalizedPriority && validPriorities.includes(normalizedPriority)) {
      insertData.priority = normalizedPriority;
    }
    // If normalizedPriority is null or invalid, we don't include it in the insert at all
    // This is the correct behavior - database will use NULL which satisfies the constraint

    // Log the insert data for debugging (without sensitive info)
    console.log('Inserting lead with data:', {
      lead_name: insertData.lead_name,
      account_id: insertData.account_id,
      sub_account_id: insertData.sub_account_id,
      assigned_employee: insertData.assigned_employee,
      priority: insertData.priority || 'NULL (excluded)',
      has_priority_field: 'priority' in insertData,
    });

    // Insert lead using service role to bypass RLS
    const { data, error } = await supabase
      .from('leads')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating lead:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Insert data that caused error:', JSON.stringify(insertData, null, 2));
      
      // Provide helpful error message for constraint violations
      if (error.message && error.message.includes('leads_priority_check')) {
        return NextResponse.json(
          { 
            error: 'Invalid priority value. Priority must be "High Priority", "Medium Priority", "Low Priority", or empty.',
            details: `Received priority: "${priority}", Normalized: "${normalizedPriority}", Valid values: High Priority, Medium Priority, Low Priority, or null`,
            validValues: ['High Priority', 'Medium Priority', 'Low Priority', null]
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json({ 
        error: error.message || 'Failed to create lead',
        details: error.details || 'Check server logs for more information'
      }, { status: 500 });
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

