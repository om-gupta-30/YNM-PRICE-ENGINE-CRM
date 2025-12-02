import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { formatTimestampIST } from '@/lib/utils/dateFormatters';

// GET - Fetch all contacts (admin only)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isAdmin = searchParams.get('isAdmin') === 'true';
    const accountId = searchParams.get('account_id');
    const subAccountId = searchParams.get('sub_account_id');
    const callStatus = searchParams.get('call_status');
    const employeeId = searchParams.get('employee_id');

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const supabase = createSupabaseServerClient();

    let query = supabase
      .from('contacts')
      .select(`
        id,
        account_id,
        sub_account_id,
        name,
        designation,
        email,
        phone,
        call_status,
        notes,
        follow_up_date,
        created_by,
        created_at,
        updated_at,
        accounts:account_id(account_name, assigned_employee),
        sub_accounts:sub_account_id(sub_account_name, state_id, city_id)
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (accountId) {
      query = query.eq('account_id', parseInt(accountId));
    }
    if (subAccountId) {
      query = query.eq('sub_account_id', parseInt(subAccountId));
    }
    if (callStatus) {
      query = query.eq('call_status', callStatus);
    }
    if (employeeId) {
      query = query.eq('created_by', employeeId);
    }

    const { data: contacts, error } = await query;

    if (error) {
      console.error('Error fetching contacts:', error);
      return NextResponse.json(
        { error: `Failed to fetch contacts: ${error.message}` },
        { status: 500 }
      );
    }

    // Format contacts with additional information
    const formattedContacts = await Promise.all(
      (contacts || []).map(async (contact: any) => {
        let stateName = null;
        let cityName = null;

        if (contact.sub_accounts?.state_id) {
          try {
            const { data: stateData } = await supabase
              .from('states')
              .select('state_name')
              .eq('id', contact.sub_accounts.state_id)
              .single();
            stateName = stateData?.state_name || null;
          } catch (err) {
            console.error(`Error fetching state for contact ${contact.id}:`, err);
          }
        }

        if (contact.sub_accounts?.city_id) {
          try {
            const { data: cityData } = await supabase
              .from('cities')
              .select('city_name')
              .eq('id', contact.sub_accounts.city_id)
              .single();
            cityName = cityData?.city_name || null;
          } catch (err) {
            console.error(`Error fetching city for contact ${contact.id}:`, err);
          }
        }

        return {
          id: contact.id,
          accountId: contact.account_id,
          accountName: contact.accounts?.account_name || null,
          assignedEmployee: contact.accounts?.assigned_employee || null,
          subAccountId: contact.sub_account_id || null,
          subAccountName: contact.sub_accounts?.sub_account_name || null,
          stateName,
          cityName,
          name: contact.name,
          designation: contact.designation || null,
          email: contact.email || null,
          phone: contact.phone || null,
          callStatus: contact.call_status || null,
          notes: contact.notes || null,
          followUpDate: contact.follow_up_date ? formatTimestampIST(contact.follow_up_date) : null,
          createdBy: contact.created_by,
          createdAt: formatTimestampIST(contact.created_at),
          updatedAt: formatTimestampIST(contact.updated_at),
        };
      })
    );

    return NextResponse.json({ success: true, contacts: formattedContacts });
  } catch (error: any) {
    console.error('API error in /api/admin/contacts:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
