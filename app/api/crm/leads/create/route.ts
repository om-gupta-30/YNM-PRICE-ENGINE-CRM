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
    let normalizedPriority = null;
    if (priority) {
      const priorityStr = String(priority).trim();
      if (priorityStr === 'High Priority' || priorityStr === 'Medium Priority' || priorityStr === 'Low Priority') {
        normalizedPriority = priorityStr;
      } else if (priorityStr === 'High') {
        normalizedPriority = 'High Priority';
      } else if (priorityStr === 'Medium') {
        normalizedPriority = 'Medium Priority';
      } else if (priorityStr === 'Low') {
        normalizedPriority = 'Low Priority';
      } else {
        // Invalid priority value - set to null
        console.warn(`Invalid priority value: ${priority}, setting to null`);
        normalizedPriority = null;
      }
    }

    // Insert lead using service role to bypass RLS
    const { data, error } = await supabase
      .from('leads')
      .insert({
        lead_name: lead_name.trim(),
        contact_person: contact_person?.trim() || null,
        phone: phone.trim(),
        email: email?.trim() || null,
        requirements: requirements?.trim() || null,
        lead_source: lead_source || null,
        status: status || 'New',
        priority: normalizedPriority,
        assigned_employee: assigned_employee || null,
        account_id: account_id,
        sub_account_id: sub_account_id,
        contact_id: contact_id || null,
        created_by: created_by || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating lead:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity for lead creation
    if (created_by || assigned_employee) {
      try {
        await logActivity({
          account_id: account_id,
          employee_id: created_by || assigned_employee || 'System',
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

