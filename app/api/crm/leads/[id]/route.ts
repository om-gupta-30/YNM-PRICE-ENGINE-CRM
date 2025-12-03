import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { getCurrentISTTime } from '@/lib/utils/dateFormatters';
import { logActivity } from '@/lib/utils/activityLogger';

// GET - Fetch single lead
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid lead ID' },
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
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching lead:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Get lead error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update lead
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
        { error: 'Invalid lead ID' },
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

    // Get old lead data for comparison before updating
    const { data: oldLead } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    const updateData: any = {
      updated_at: getCurrentISTTime(),
    };

    // Update only provided fields
    if (body.lead_name !== undefined) updateData.lead_name = body.lead_name.trim();
    if (body.company_name !== undefined) updateData.company_name = body.company_name?.trim() || null;
    if (body.contact_person !== undefined) updateData.contact_person = body.contact_person?.trim() || null;
    if (body.phone !== undefined) updateData.phone = body.phone?.trim() || null;
    if (body.email !== undefined) updateData.email = body.email?.trim() || null;
    if (body.location !== undefined) updateData.location = body.location?.trim() || null;
    if (body.address !== undefined) updateData.address = body.address?.trim() || null;
    if (body.requirements !== undefined) updateData.requirements = body.requirements?.trim() || null;
    if (body.lead_source !== undefined) updateData.lead_source = body.lead_source?.trim() || null;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.assigned_to !== undefined) updateData.assigned_to = body.assigned_to;
    if (body.notes !== undefined) updateData.notes = body.notes?.trim() || null;

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
    if (data && oldLead) {
      try {
        const changes: string[] = [];
        Object.keys(updateData).forEach(key => {
          if (key !== 'updated_at' && oldLead[key] !== data[key]) {
            changes.push(`${key}: "${oldLead[key] || 'None'}" → "${data[key] || 'None'}"`);
          }
        });

        if (changes.length > 0) {
          await logActivity({
            account_id: data.account_id,
            employee_id: body.updated_by || oldLead.created_by || 'System',
            activity_type: 'edit',
            description: `Lead "${data.lead_name}" updated: ${changes.join(', ')}`,
            metadata: {
              entity_type: 'lead',
              lead_id: data.id,
              changes,
              old_data: oldLead,
              new_data: data,
            },
          });
        }
      } catch (activityError) {
        console.warn('Failed to log lead update activity:', activityError);
      }
    }

    return NextResponse.json({ data, success: true });
  } catch (error: any) {
    console.error('Update lead error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Convert lead to customer
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const leadId = parseInt(params.id);
    const body = await request.json();
    const { sales_employee, created_by } = body;

    if (isNaN(leadId)) {
      return NextResponse.json(
        { error: 'Invalid lead ID' },
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

    // Get lead data
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

    // Create account from lead (previously created customer)
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .insert({
        account_name: lead.lead_name,
        assigned_employee: sales_employee || lead.assigned_employee,
        notes: lead.requirements || `Converted from lead: ${lead.lead_name}`,
        engagement_score: 0,
      })
      .select()
      .single();

    if (accountError) {
      console.error('Error creating account from lead:', accountError);
      return NextResponse.json({ error: accountError.message }, { status: 500 });
    }

    // Update lead status to Closed
    await supabase
      .from('leads')
      .update({ status: 'Closed', updated_at: getCurrentISTTime() })
      .eq('id', leadId);

    // Return customer-like structure for backwards compatibility
    return NextResponse.json({ 
      data: {
        id: account.id,
        name: account.account_name,
        sales_employee: account.assigned_employee,
        notes: account.notes,
        is_active: true,
        created_at: account.created_at,
      }, 
      success: true 
    });
  } catch (error: any) {
    console.error('Convert lead error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

