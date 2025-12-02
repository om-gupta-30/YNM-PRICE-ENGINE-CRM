import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { syncContactNotification } from '@/lib/utils/notificationSync';
import { formatDateIST, formatTimestampIST, getCurrentISTTime } from '@/lib/utils/dateFormatters';
import { logEditActivity, logCreateActivity } from '@/lib/utils/activityLogger';

// GET - Fetch contacts for a sub-account
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const subAccountId = parseInt(params.id);

    if (isNaN(subAccountId)) {
      return NextResponse.json(
        { error: 'Invalid sub-account ID' },
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
      .select('id, name, designation, email, phone, call_status, follow_up_date, notes, created_by, created_at, updated_at')
      .eq('sub_account_id', subAccountId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching contacts:', error);
      // Check for column does not exist error
      if (error.code === '42703' || error.message?.includes('does not exist')) {
        return NextResponse.json(
          { error: 'Database schema mismatch. The contacts table may not have sub_account_id column. Please run the database migration script.' },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formattedContacts = (data || []).map(contact => ({
      id: contact.id,
      name: contact.name,
      designation: contact.designation || null,
      email: contact.email || null,
      phone: contact.phone || null,
      callStatus: contact.call_status || null,
      followUpDate: contact.follow_up_date || null,
      notes: contact.notes || null,
      createdBy: contact.created_by || null,
      createdAt: formatTimestampIST(contact.created_at),
      updatedAt: formatTimestampIST(contact.updated_at),
    }));

    return NextResponse.json({ success: true, contacts: formattedContacts });
  } catch (error: any) {
    console.error('Get contacts error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new contact for a sub-account
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const subAccountId = parseInt(params.id);
    const body = await request.json();

    if (isNaN(subAccountId)) {
      return NextResponse.json(
        { error: 'Invalid sub-account ID' },
        { status: 400 }
      );
    }

    const { name, designation, email, phone, call_status, notes, follow_up_date, created_by } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Contact name is required' },
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

    // Get account_id from sub_account
    const { data: subAccount, error: subAccountError } = await supabase
      .from('sub_accounts')
      .select('account_id')
      .eq('id', subAccountId)
      .single();

    if (subAccountError || !subAccount) {
      return NextResponse.json(
        { error: 'Sub-account not found' },
        { status: 404 }
      );
    }

    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .insert({
        sub_account_id: subAccountId,
        account_id: subAccount.account_id, // Keep for backward compatibility
        name: name.trim(),
        designation: designation?.trim() || null,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        call_status: call_status || null,
        notes: notes?.trim() || null,
        follow_up_date: follow_up_date || null,
        created_by: created_by || 'Admin',
      })
      .select()
      .single();

    if (contactError) {
      console.error('Error creating contact:', contactError);
      // Check for column does not exist error
      if (contactError.code === '42703' || contactError.message?.includes('does not exist')) {
        return NextResponse.json(
          { error: 'Database schema mismatch. The contacts table may not have sub_account_id column. Please run the database migration script.' },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: contactError.message }, { status: 500 });
    }

    // Log contact creation activity
    if (created_by) {
      await logCreateActivity({
        account_id: subAccount.account_id,
        contact_id: contact.id,
        employee_id: created_by,
        entityName: name,
        entityType: 'contact',
        createdData: {
          name,
          designation,
          email,
          phone,
          call_status,
          follow_up_date,
        },
      });
    }

    // Sync notification if follow-up date exists and call status is not "Connected"
    if (follow_up_date && call_status !== 'Connected') {
      try {
        await syncContactNotification(
          contact.id,
          name,
          follow_up_date,
          call_status,
          subAccountId,
          subAccount.account_id,
          created_by || 'Admin'
        );
      } catch (notificationError) {
        console.error('Error syncing notification (non-critical):', notificationError);
        // Don't fail the request if notification sync fails
      }
    }

    return NextResponse.json({ success: true, contact });
  } catch (error: any) {
    console.error('Create contact error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update an existing contact
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const subAccountId = parseInt(params.id);

    if (isNaN(subAccountId)) {
      return NextResponse.json(
        { error: 'Invalid sub-account ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      contact_id,
      name,
      designation,
      email,
      phone,
      call_status,
      notes,
      follow_up_date,
      created_by,
    } = body;

    if (!contact_id) {
      return NextResponse.json(
        { error: 'Contact ID is required for updates' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Ensure the contact belongs to this sub-account
    const { data: existingContact, error: existingError } = await supabase
      .from('contacts')
      .select('id, account_id, name, call_status, follow_up_date, notes')
      .eq('id', contact_id)
      .eq('sub_account_id', subAccountId)
      .single();

    if (existingError || !existingContact) {
      return NextResponse.json(
        { error: 'Contact not found for this sub-account' },
        { status: 404 }
      );
    }

    const updateData: Record<string, any> = {
      updated_at: getCurrentISTTime(),
    };

    const normalize = (value?: string | null) => (value ?? '').trim();

    // IMPORTANT: After creation, lock down identity fields.
    // Only allow updates to call_status, notes, and follow_up_date.

    if (call_status !== undefined && call_status !== existingContact.call_status) {
      updateData.call_status = call_status || null;
    }

    if (notes !== undefined) {
      const newNotes = normalize(notes) || null;
      const oldNotes = existingContact.notes ? existingContact.notes.trim() : null;
      if (newNotes !== oldNotes) {
        updateData.notes = newNotes;
      }
    }

    if (follow_up_date !== undefined) {
      const newFollowRaw = follow_up_date || null;
      const newIso = newFollowRaw ? new Date(newFollowRaw).toISOString() : null;
      const oldIso = existingContact.follow_up_date ? new Date(existingContact.follow_up_date).toISOString() : null;
      if (newIso !== oldIso) {
        updateData.follow_up_date = newFollowRaw;
      }
    }

    const { data: updatedContact, error: updateError } = await supabase
      .from('contacts')
      .update(updateData)
      .eq('id', contact_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating contact:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const formatChangeDate = (value: string | null | undefined) =>
      value ? formatDateIST(value) : 'None';

    const changes: string[] = [];
    if (updateData.call_status !== undefined) {
      changes.push(
        `Call Status: ${existingContact.call_status || 'None'} → ${updateData.call_status || 'None'}`
      );
    }
    if (updateData.follow_up_date !== undefined) {
      const before = formatChangeDate(existingContact.follow_up_date);
      const after = formatChangeDate(updateData.follow_up_date);
      changes.push(`Follow-up: ${before} → ${after}`);
    }
    if (updateData.notes !== undefined) {
      const before = normalize(existingContact.notes) || 'None';
      const after = normalize(updateData.notes) || 'None';
      changes.push(`Notes: ${before} → ${after}`);
    }

    // Log activity with change detection
    if (changes.length > 0) {
      const displayName = updateData.name || existingContact.name || 'Contact';
      const employeeId = created_by || body.updated_by || 'System';
      
      // Create newData object with all fields from existingContact, then update changed ones
      const newData: any = {
        ...existingContact,
        call_status: updateData.call_status !== undefined ? updateData.call_status : existingContact.call_status,
        follow_up_date: updateData.follow_up_date !== undefined ? updateData.follow_up_date : existingContact.follow_up_date,
        notes: updateData.notes !== undefined ? updateData.notes : existingContact.notes,
      };
      
      await logEditActivity({
        account_id: existingContact.account_id,
        contact_id,
        employee_id: employeeId,
        entityName: displayName,
        entityType: 'contact',
        oldData: existingContact,
        newData,
        fieldLabels: {
          id: 'ID',
          name: 'Name',
          account_id: 'Account ID',
          call_status: 'Call Status',
          follow_up_date: 'Follow-up Date',
          notes: 'Notes',
        },
      });
    }

    // Sync notifications when call status or follow-up date changes
    if (updateData.follow_up_date !== undefined || updateData.call_status !== undefined) {
      try {
        await syncContactNotification(
          contact_id,
          updatedContact.name,
          updateData.follow_up_date !== undefined ? updateData.follow_up_date : existingContact.follow_up_date,
          updateData.call_status !== undefined ? updateData.call_status : existingContact.call_status,
          subAccountId,
          existingContact.account_id,
          created_by || 'Admin'
        );
      } catch (notificationError) {
        console.error('Error syncing notification (non-critical):', notificationError);
      }
    }

    return NextResponse.json({ success: true, contact: updatedContact });
  } catch (error: any) {
    console.error('Update contact error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

