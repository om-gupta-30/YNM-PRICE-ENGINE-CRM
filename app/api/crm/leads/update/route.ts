import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { getCurrentISTTime } from '@/lib/utils/dateFormatters';

// POST - Update lead
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
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
      follow_up_date,
    } = body;

    // Map accounts/sub_accounts to account_id/sub_account_id for database
    const account_id = accounts !== undefined ? (accounts || null) : undefined;
    const sub_account_id = sub_accounts !== undefined ? (sub_accounts || null) : undefined;

    if (!id) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
        { status: 400 }
      );
    }

    // Validation
    if (lead_name !== undefined && (!lead_name || lead_name.trim() === '')) {
      return NextResponse.json(
        { error: 'Lead name cannot be empty' },
        { status: 400 }
      );
    }

    if (phone !== undefined && (!phone || phone.trim() === '')) {
      return NextResponse.json(
        { error: 'Phone cannot be empty' },
        { status: 400 }
      );
    }

    // Email format validation
    if (email !== undefined && email && email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        );
      }
    }

    const supabase = createSupabaseServerClient();

    const updateData: any = {
      updated_at: getCurrentISTTime(),
    };

    // Update only provided fields
    if (lead_name !== undefined) updateData.lead_name = lead_name.trim();
    if (contact_person !== undefined) updateData.contact_person = contact_person?.trim() || null;
    if (phone !== undefined) updateData.phone = phone.trim();
    if (email !== undefined) updateData.email = email?.trim() || null;
    if (requirements !== undefined) updateData.requirements = requirements?.trim() || null;
    if (lead_source !== undefined) updateData.lead_source = lead_source || null;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority || null;
    if (assigned_employee !== undefined) updateData.assigned_employee = assigned_employee || null;
    if (account_id !== undefined) updateData.account_id = account_id;
    if (sub_account_id !== undefined) updateData.sub_account_id = sub_account_id;
    if (contact_id !== undefined) updateData.contact_id = contact_id || null;
    if (follow_up_date !== undefined) updateData.follow_up_date = follow_up_date || null;

    const { data, error } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating lead:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity for lead update
    try {
      const changes: string[] = [];
      if (lead_name !== undefined) changes.push(`Name: ${lead_name.trim()}`);
      if (status !== undefined) changes.push(`Status: ${status}`);
      if (assigned_employee !== undefined) changes.push(`Assigned: ${assigned_employee || 'Unassigned'}`);
      if (priority !== undefined) changes.push(`Priority: ${priority || 'None'}`);

      if (changes.length > 0) {
        await supabase.from('activities').insert({
          account_id: data.account_id || null,
          employee_id: data.assigned_employee || 'System',
          activity_type: 'note',
          description: `Lead updated: ${data.lead_name} - ${changes.join(', ')}`,
          metadata: {
            lead_id: data.id,
            changes,
            status: data.status,
          },
        });
      }
    } catch (activityError) {
      console.warn('Failed to log lead update activity:', activityError);
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Update lead error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

