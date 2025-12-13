import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { formatTimestampIST } from '@/lib/utils/dateFormatters';
import { syncContactNotification } from '@/lib/utils/notificationSync';

// GET - Fetch contacts for an account
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const accountId = parseInt(params.id);

    if (isNaN(accountId)) {
      return NextResponse.json(
        { error: 'Invalid account ID' },
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

    // Fetch contacts from all sub-accounts under this account
    // First get all sub-accounts for this account
    const { data: subAccounts, error: subAccountsError } = await supabase
      .from('sub_accounts')
      .select('id')
      .eq('account_id', accountId)
      .eq('is_active', true);

    if (subAccountsError) {
      console.error('Error fetching sub-accounts:', subAccountsError);
      return NextResponse.json({ error: subAccountsError.message }, { status: 500 });
    }

    const subAccountIds = subAccounts?.map(sa => sa.id) || [];

    if (subAccountIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const { data, error } = await supabase
      .from('contacts')
      .select(`
        *,
        sub_accounts:sub_account_id(
          id,
          sub_account_name
        )
      `)
      .in('sub_account_id', subAccountIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching contacts:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Format timestamps in IST
    const formattedData = (data || []).map((contact: any) => ({
      ...contact,
      created_at: formatTimestampIST(contact.created_at),
      updated_at: formatTimestampIST(contact.updated_at),
    }));

    return NextResponse.json({ data: formattedData });
  } catch (error: any) {
    console.error('Get contacts error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new contact
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const accountId = parseInt(params.id);
    const body = await request.json();

    if (isNaN(accountId)) {
      return NextResponse.json(
        { error: 'Invalid account ID' },
        { status: 400 }
      );
    }

    const { name, designation, email, phone, call_status, notes, follow_up_date, created_by, sub_account_id } = body;

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

    // If sub_account_id is provided, use it. Otherwise, get the first sub-account for this account
    let finalSubAccountId = sub_account_id;
    if (!finalSubAccountId) {
      const { data: firstSubAccount } = await supabase
        .from('sub_accounts')
        .select('id')
        .eq('account_id', accountId)
        .eq('is_active', true)
        .limit(1)
        .single();
      
      if (!firstSubAccount) {
        return NextResponse.json(
          { error: 'No active sub-account found for this account. Please create a sub-account first.' },
          { status: 400 }
        );
      }
      finalSubAccountId = firstSubAccount.id;
    }

    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .insert({
        account_id: accountId,
        sub_account_id: finalSubAccountId,
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
      return NextResponse.json({ error: contactError.message }, { status: 500 });
    }

    // Create activity record
    if (created_by) {
      await supabase.from('activities').insert({
        account_id: accountId,
        contact_id: contact.id,
        employee_id: created_by,
        activity_type: 'note',
        description: `Contact ${name} added`,
        metadata: { action: 'contact_created' },
      });
    }

    // CRITICAL: Sync notification when follow-up date is set during contact creation
    // This MUST be called for every contact with a follow-up date
    if (follow_up_date) {
      try {
        console.log(`🔔 [API] Creating notification for contact ${contact.id} (${name})`);
        const syncResult = await syncContactNotification(
          contact.id,
          name,
          follow_up_date,
          call_status || null,
          finalSubAccountId,
          accountId,
          created_by || 'Admin'
        );
        
        if (!syncResult.success) {
          console.error(`❌ [API] Failed to sync notification for contact ${contact.id}:`, syncResult.error);
          // Log but don't fail - notification can be created manually later
        } else {
          console.log(`✅ [API] Successfully synced notification for contact ${contact.id}`);
        }
      } catch (notificationError: any) {
        console.error(`❌ [API] Exception while syncing notification for contact ${contact.id}:`, notificationError);
        console.error('   Error stack:', notificationError?.stack);
        // Don't fail the request if notification sync fails, but log it clearly
      }
    } else {
      console.log(`⚠️ [API] Contact ${contact.id} created without follow-up date - no notification needed`);
    }

    return NextResponse.json({ data: contact, success: true });
  } catch (error: any) {
    console.error('Create contact error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

