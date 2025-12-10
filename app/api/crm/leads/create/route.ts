import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { logActivity } from '@/lib/utils/activityLogger';
import { createDashboardNotification } from '@/lib/utils/dashboardNotificationLogger';

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
        normalizedPriority = null;
      }
    }
    
    // Determine assigned employee:
    // 1. If assigned_employee is explicitly provided, use it
    // 2. If no assigned_employee provided, auto-assign to account's assigned employee
    // 3. Otherwise, leave as null
    let finalAssignedEmployee = assigned_employee && assigned_employee.trim() ? assigned_employee.trim() : null;
    
    // If no assigned employee is provided and account_id exists, check if account has an assigned employee
    // OPTIMIZED: Use a single query with select to get only what we need
    if (!finalAssignedEmployee && account_id) {
      const { data: accountData, error: accountError } = await supabase
        .from('accounts')
        .select('assigned_employee')
        .eq('id', account_id)
        .single();
      
      if (accountError) {
        return NextResponse.json(
          { error: `Failed to fetch account details: ${accountError.message}` },
          { status: 500 }
        );
      }
      
      if (accountData?.assigned_employee) {
        finalAssignedEmployee = accountData.assigned_employee;
      } else {
        return NextResponse.json(
          { error: 'This account has no assigned employee. Please assign an employee to this account first before creating a lead.' },
          { status: 400 }
        );
      }
    }

    // Build insert object
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
    
    // CRITICAL: Handle priority - database constraint requires exact values or NULL
    // The constraint is: CHECK (priority IN ('High Priority', 'Medium Priority', 'Low Priority'))
    // PostgreSQL CHECK constraints allow NULL by default, but we'll be explicit
    const validPriorities = ['High Priority', 'Medium Priority', 'Low Priority'];
    if (normalizedPriority && validPriorities.includes(normalizedPriority)) {
      // Only set if it's a valid value
      insertData.priority = normalizedPriority;
    } else {
      // Explicitly set to NULL if invalid/missing - this satisfies the constraint
      insertData.priority = null;
    }

    // Insert lead using service role to bypass RLS
    const { data, error } = await supabase
      .from('leads')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      // Provide helpful error message for constraint violations
      if (error.message && error.message.includes('leads_priority_check')) {
        return NextResponse.json(
          { 
            error: 'Invalid priority value. Priority must be "High Priority", "Medium Priority", "Low Priority", or empty.',
            validValues: ['High Priority', 'Medium Priority', 'Low Priority', null]
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json({ 
        error: error.message || 'Failed to create lead'
      }, { status: 500 });
    }

    // Log activity asynchronously (don't block response)
    if (created_by || finalAssignedEmployee) {
      logActivity({
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
      }).catch(() => {
        // Silently fail - activity logging shouldn't block the response
      });
    }

    // Create dashboard notification for lead creation
    const notificationEmployee = finalAssignedEmployee || created_by || 'Admin';
    createDashboardNotification({
      type: 'lead_added',
      employee: notificationEmployee,
      message: `New lead "${lead_name.trim()}" has been created${finalAssignedEmployee ? ` and assigned to you` : ''}`,
      entityName: lead_name.trim(),
      entityId: data.id,
      priority: 'normal',
      metadata: {
        lead_id: data.id,
        status: data.status,
        lead_source: lead_source || null,
      },
    }).catch(() => {
      // Silently fail - notification creation is non-critical
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Create lead error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

