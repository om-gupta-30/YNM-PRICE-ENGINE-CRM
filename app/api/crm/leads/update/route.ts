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

    // Normalize priority value to match database constraint
    // Database expects EXACTLY: 'High Priority', 'Medium Priority', 'Low Priority', or NULL
    let normalizedPriority: string | null = null;
    if (priority !== undefined) {
      // Handle null, empty string, or falsy values
      if (!priority || priority === null || priority === '' || priority === 'null' || priority === 'None' || String(priority).trim() === '') {
        normalizedPriority = null;
      } else {
        // Ensure priority matches expected format exactly
        const priorityStr = String(priority).trim();
        
        // Exact matches first
        if (priorityStr === 'High Priority') {
          normalizedPriority = 'High Priority';
        } else if (priorityStr === 'Medium Priority') {
          normalizedPriority = 'Medium Priority';
        } else if (priorityStr === 'Low Priority') {
          normalizedPriority = 'Low Priority';
        } 
        // Handle variations
        else if (priorityStr === 'High' || priorityStr.toLowerCase() === 'high priority') {
          normalizedPriority = 'High Priority';
        } else if (priorityStr === 'Medium' || priorityStr.toLowerCase() === 'medium priority') {
          normalizedPriority = 'Medium Priority';
        } else if (priorityStr === 'Low' || priorityStr.toLowerCase() === 'low priority') {
          normalizedPriority = 'Low Priority';
        } else {
          // Invalid priority value - log and set to null
          console.error(`Invalid priority value received: "${priority}" (type: ${typeof priority}), setting to null`);
          normalizedPriority = null;
        }
      }
    }
    
    // Log for debugging (only in development)
    if (process.env.NODE_ENV === 'development' && priority !== undefined) {
      console.log(`Priority normalization: "${priority}" -> "${normalizedPriority}"`);
    }

    // Update only provided fields
    if (lead_name !== undefined) updateData.lead_name = lead_name.trim();
    if (contact_person !== undefined) updateData.contact_person = contact_person?.trim() || null;
    if (phone !== undefined) updateData.phone = phone.trim();
    if (email !== undefined) updateData.email = email?.trim() || null;
    if (requirements !== undefined) updateData.requirements = requirements?.trim() || null;
    if (lead_source !== undefined) updateData.lead_source = lead_source || null;
    if (status !== undefined) updateData.status = status;
    // Always set priority if it was provided (even if null) - this ensures we can clear priority
    if (priority !== undefined) {
      updateData.priority = normalizedPriority; // This will be null or one of the valid values
    }
    if (assigned_employee !== undefined) updateData.assigned_employee = assigned_employee || null;
    if (account_id !== undefined) updateData.account_id = account_id;
    if (sub_account_id !== undefined) updateData.sub_account_id = sub_account_id;
    if (contact_id !== undefined) updateData.contact_id = contact_id || null;
    if (follow_up_date !== undefined) updateData.follow_up_date = follow_up_date || null;
    
    // Log update data for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('Update data being sent:', JSON.stringify(updateData, null, 2));
    }

    // Final validation before update - ensure priority is valid
    if (updateData.priority !== undefined && updateData.priority !== null) {
      const validPriorities = ['High Priority', 'Medium Priority', 'Low Priority'];
      if (!validPriorities.includes(updateData.priority)) {
        console.error(`Invalid priority value before update: "${updateData.priority}"`);
        return NextResponse.json(
          { 
            error: `Invalid priority value. Must be one of: ${validPriorities.join(', ')} or null`,
            received: updateData.priority
          },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating lead:', error);
      console.error('Update data that caused error:', JSON.stringify(updateData, null, 2));
      
      // Provide more helpful error message for constraint violations
      if (error.message && error.message.includes('leads_priority_check')) {
        return NextResponse.json(
          { 
            error: 'Invalid priority value. Priority must be "High Priority", "Medium Priority", "Low Priority", or empty.',
            details: `Received: "${updateData.priority}"`,
            validValues: ['High Priority', 'Medium Priority', 'Low Priority', null]
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get old lead data for comparison
    const { data: oldLead } = await supabase
      .from('leads')
      .select('lead_name, contact_person, phone, email, requirements, lead_source, status, priority, assigned_employee, account_id, sub_account_id, contact_id, follow_up_date')
      .eq('id', id)
      .single();

    // Log activity for lead update
    try {
      const changes: string[] = [];
      if (lead_name !== undefined && lead_name.trim() !== oldLead?.lead_name) {
        changes.push(`Name: "${oldLead?.lead_name}" → "${lead_name.trim()}"`);
      }
      if (contact_person !== undefined && contact_person !== oldLead?.contact_person) {
        changes.push(`Contact Person: "${oldLead?.contact_person || 'None'}" → "${contact_person || 'None'}"`);
      }
      if (phone !== undefined && phone !== oldLead?.phone) {
        changes.push(`Phone: "${oldLead?.phone}" → "${phone}"`);
      }
      if (email !== undefined && email !== oldLead?.email) {
        changes.push(`Email: "${oldLead?.email || 'None'}" → "${email || 'None'}"`);
      }
      if (requirements !== undefined && requirements !== oldLead?.requirements) {
        changes.push('Requirements updated');
      }
      if (lead_source !== undefined && lead_source !== oldLead?.lead_source) {
        changes.push(`Source: "${oldLead?.lead_source || 'None'}" → "${lead_source || 'None'}"`);
      }
      if (status !== undefined && status !== oldLead?.status) {
        changes.push(`Status: "${oldLead?.status}" → "${status}"`);
      }
      if (priority !== undefined && priority !== oldLead?.priority) {
        changes.push(`Priority: "${oldLead?.priority || 'None'}" → "${priority || 'None'}"`);
      }
      if (assigned_employee !== undefined && assigned_employee !== oldLead?.assigned_employee) {
        changes.push(`Assigned: "${oldLead?.assigned_employee || 'Unassigned'}" → "${assigned_employee || 'Unassigned'}"`);
      }
      if (account_id !== undefined && account_id !== oldLead?.account_id) {
        changes.push(`Account: ${oldLead?.account_id || 'None'} → ${account_id || 'None'}`);
      }
      if (sub_account_id !== undefined && sub_account_id !== oldLead?.sub_account_id) {
        changes.push(`Sub-Account: ${oldLead?.sub_account_id || 'None'} → ${sub_account_id || 'None'}`);
      }
      if (contact_id !== undefined && contact_id !== oldLead?.contact_id) {
        changes.push(`Contact: ${oldLead?.contact_id || 'None'} → ${contact_id || 'None'}`);
      }
      if (follow_up_date !== undefined && follow_up_date !== oldLead?.follow_up_date) {
        changes.push(`Follow-up: ${oldLead?.follow_up_date || 'None'} → ${follow_up_date || 'None'}`);
      }

      if (changes.length > 0) {
        await supabase.from('activities').insert({
          account_id: data.account_id || oldLead?.account_id || null,
          lead_id: data.id,
          employee_id: data.assigned_employee || body.assigned_employee || 'System',
          activity_type: 'note',
          description: `Lead "${data.lead_name}" edited - ${changes.join(', ')}`,
          metadata: {
            lead_id: data.id,
            changes,
            status: data.status,
            old_data: oldLead,
            new_data: data,
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

