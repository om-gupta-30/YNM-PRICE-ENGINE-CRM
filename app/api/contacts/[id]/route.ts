import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { getCurrentISTTime } from '@/lib/utils/dateFormatters';
import { syncContactNotification } from '@/lib/utils/notificationSync';
import { logEditActivity, logDeleteActivity } from '@/lib/utils/activityLogger';
import { triggerKnowledgeSync } from '@/lib/ai/knowledgeSync';
import { createDashboardNotification } from '@/lib/utils/dashboardNotificationLogger';

// PERFORMANCE OPTIMIZATION: Edge runtime for read-only GET API
// This route only reads from Supabase and doesn't use Node-specific APIs
export const runtime = "edge";

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

    // Allow updates to all fields when editing
    if (body.name !== undefined) {
      updateData.name = body.name?.trim() || null;
    }
    if (body.designation !== undefined) {
      updateData.designation = body.designation?.trim() || null;
    }
    if (body.email !== undefined) {
      updateData.email = body.email?.trim() || null;
    }
    if (body.phone !== undefined) {
      updateData.phone = body.phone?.trim() || null;
    }
    if (body.call_status !== undefined) {
      updateData.call_status = body.call_status;
    }
    if (body.notes !== undefined) {
      updateData.notes = body.notes?.trim() || null;
    }
    if (body.follow_up_date !== undefined) {
      updateData.follow_up_date = body.follow_up_date || null;
    }
    if (body.sub_account_id !== undefined) {
      updateData.sub_account_id = body.sub_account_id || null;
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

    // Get old contact data for comparison
    const { data: oldContact } = await supabase
      .from('contacts')
      .select('name, designation, email, phone, call_status, notes, follow_up_date')
      .eq('id', id)
      .single();

    // Log activity for contact updates using activity logger
    if (data && oldContact) {
      const updatedBy = body.updated_by || 'Admin';
      try {
        await logEditActivity({
          account_id: data.account_id,
          contact_id: id,
          employee_id: updatedBy,
          entityName: data.name || 'Contact',
          entityType: 'contact',
          oldData: oldContact,
          newData: {
            call_status: body.call_status !== undefined ? body.call_status : oldContact.call_status,
            notes: body.notes !== undefined ? body.notes : oldContact.notes,
            follow_up_date: body.follow_up_date !== undefined ? body.follow_up_date : oldContact.follow_up_date,
            name: body.name !== undefined ? body.name : oldContact.name,
            designation: body.designation !== undefined ? body.designation : oldContact.designation,
            email: body.email !== undefined ? body.email : oldContact.email,
            phone: body.phone !== undefined ? body.phone : oldContact.phone,
          },
          fieldLabels: {
            call_status: 'Call Status',
            notes: 'Notes',
            follow_up_date: 'Follow-up Date',
            name: 'Name',
            designation: 'Designation',
            email: 'Email',
            phone: 'Phone',
          },
        });

        // Create dashboard notification for contact edit
        // Get account's assigned employee to notify them
        try {
          const { data: accountData } = await supabase
            .from('accounts')
            .select('assigned_employee, account_name')
            .eq('id', data.account_id)
            .single();
          
          const notificationEmployee = accountData?.assigned_employee || updatedBy || 'Admin';
          createDashboardNotification({
            type: 'contact_edited',
            employee: notificationEmployee,
            message: `Contact "${data.name || 'Contact'}" has been updated`,
            entityName: data.name || 'Contact',
            entityId: id,
            priority: 'normal',
            metadata: {
              contact_id: id,
              account_id: data.account_id,
            },
          }).catch(() => {
            // Silently fail - notification creation is non-critical
          });
        } catch (err) {
          // Silently fail - notification creation is non-critical
        }
      } catch (activityError) {
        console.warn('Failed to log contact update activity:', activityError);
      }
    }

    // CRITICAL: Sync notification when follow-up date is added, edited, or changed
    // This MUST be called for every contact update with a follow-up date
    if (data) {
      try {
        // Get updated values (use body values if provided, otherwise use existing data)
        const updatedFollowUpDate = body.follow_up_date !== undefined ? body.follow_up_date : data.follow_up_date;
        const updatedCallStatus = body.call_status !== undefined ? body.call_status : data.call_status;
        
        // Always sync notification if follow_up_date is present (added, edited, or changed)
        if (updatedFollowUpDate) {
          console.log(`🔔 [API] Updating notification for contact ${id} (${data.name})`);
          const syncResult = await syncContactNotification(
            id,
            data.name,
            updatedFollowUpDate,
            updatedCallStatus,
            data.sub_account_id,
            data.account_id,
            body.updated_by || 'Admin'
          );
          
          if (!syncResult.success) {
            console.error(`❌ [API] Failed to sync notification for contact ${id}:`, syncResult.error);
            // Log but don't fail - notification can be created manually later
          } else {
            console.log(`✅ [API] Successfully synced notification for contact ${id}`);
          }
        } else {
          console.log(`⚠️ [API] Contact ${id} updated without follow-up date - notification will be deleted if exists`);
        }
      } catch (notificationError: any) {
        console.error(`❌ [API] Exception while syncing notification for contact ${id}:`, notificationError);
        console.error('   Error stack:', notificationError?.stack);
        // Don't fail the request if notification sync fails, but log it clearly
      }
    }

    // Trigger AI knowledge sync (fire-and-forget)
    triggerKnowledgeSync({ type: 'contact', entityId: id });

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

    // Log activity for contact deletion using activity logger
    if (contactData) {
      try {
        await logDeleteActivity({
          account_id: contactData.account_id,
          contact_id: id,
          employee_id: contactData.created_by || 'Admin',
          entityName: contactData.name || 'Contact',
          entityType: 'contact',
          deletedData: contactData,
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

