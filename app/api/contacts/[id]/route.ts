import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { getCurrentISTTime } from '@/lib/utils/dateFormatters';
import { syncContactNotification } from '@/lib/utils/notificationSync';

// GET - Fetch single contact
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid contact ID' },
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
      .from('contacts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching contact:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Get contact error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update contact
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
        { error: 'Invalid contact ID' },
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
    };

    // IMPORTANT:
    // After a contact is created, we lock identity fields.
    // Only allow updates to call_status, notes, and follow_up_date from this endpoint.

    if (body.call_status !== undefined) {
      updateData.call_status = body.call_status;
    }
    if (body.notes !== undefined) {
      updateData.notes = body.notes?.trim() || null;
    }
    if (body.follow_up_date !== undefined) {
      updateData.follow_up_date = body.follow_up_date || null;
    }

    const { data, error } = await supabase
      .from('contacts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating contact:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity for contact updates
    if (data) {
      const changes: string[] = [];
      if (body.call_status !== undefined) changes.push(`Call status: ${body.call_status}`);
      if (body.notes !== undefined) changes.push('Notes updated');
      if (body.follow_up_date !== undefined) {
        changes.push(`Follow-up date: ${body.follow_up_date || 'Removed'}`);
      }

      if (changes.length > 0) {
        try {
      await supabase.from('activities').insert({
        account_id: data.account_id,
        contact_id: id,
        employee_id: body.updated_by || 'Admin',
            activity_type: body.call_status ? 'call' : 'note',
            description: `Contact ${data.name} updated - ${changes.join(', ')}`,
            metadata: { 
              call_status: body.call_status || data.call_status,
              changes,
            },
      });
        } catch (activityError) {
          console.warn('Failed to log contact update activity:', activityError);
        }
      }
    }

    // Sync notification when follow-up date or call status changes
    if (data) {
      try {
        // Get updated values (use body values if provided, otherwise use existing data)
        const updatedFollowUpDate = body.follow_up_date !== undefined ? body.follow_up_date : data.follow_up_date;
        const updatedCallStatus = body.call_status !== undefined ? body.call_status : data.call_status;
        
        await syncContactNotification(
          id,
          data.name,
          updatedFollowUpDate,
          updatedCallStatus,
          data.sub_account_id,
          data.account_id,
          body.updated_by || 'Admin'
        );
      } catch (notificationError) {
        console.error('Error syncing notification (non-critical):', notificationError);
        // Don't fail the request if notification sync fails
      }
    }

    return NextResponse.json({ data, success: true });
  } catch (error: any) {
    console.error('Update contact error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete contact
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid contact ID' },
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

    // Get contact info before deletion for activity logging
    const { data: contactData } = await supabase
      .from('contacts')
      .select('account_id, name, created_by')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting contact:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity for contact deletion
    if (contactData) {
      try {
        await supabase.from('activities').insert({
          account_id: contactData.account_id,
          employee_id: contactData.created_by || 'Admin',
          activity_type: 'note',
          description: `Contact deleted: ${contactData.name}`,
          metadata: { action: 'contact_deleted' },
        });
      } catch (activityError) {
        console.warn('Failed to log contact deletion activity:', activityError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete contact error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

