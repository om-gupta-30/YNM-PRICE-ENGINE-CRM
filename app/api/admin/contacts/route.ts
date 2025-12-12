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
    const employeeId = searchParams.get('employee_id'); // For filtering by account's assigned_employee

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

    const { data: contacts, error } = await query;

    // Filter by account's assigned_employee if specified (done after query to access joined account data)
    let filteredContacts = contacts || [];
    if (employeeId && employeeId !== 'all') {
      filteredContacts = filteredContacts.filter((contact: any) => {
        return contact.accounts?.assigned_employee === employeeId;
      });
    }

    if (error) {
      console.error('Error fetching contacts:', error);
      return NextResponse.json(
        { error: `Failed to fetch contacts: ${error.message}` },
        { status: 500 }
      );
    }

    // OPTIMIZED: Batch fetch states and cities to avoid N+1 queries
    const stateIds = new Set<number>();
    const cityIds = new Set<number>();
    
    (contacts || []).forEach((contact: any) => {
      if (contact.sub_accounts?.state_id) {
        stateIds.add(contact.sub_accounts.state_id);
      }
      if (contact.sub_accounts?.city_id) {
        cityIds.add(contact.sub_accounts.city_id);
      }
    });

    // Batch fetch all states and cities in parallel
    const [statesResult, citiesResult] = await Promise.all([
      stateIds.size > 0
        ? supabase
            .from('states')
            .select('id, state_name')
            .in('id', Array.from(stateIds))
        : Promise.resolve({ data: [], error: null }),
      cityIds.size > 0
        ? supabase
            .from('cities')
            .select('id, city_name')
            .in('id', Array.from(cityIds))
        : Promise.resolve({ data: [], error: null }),
    ]);

    // Create lookup maps for O(1) access
    const statesMap = new Map(
      (statesResult.data || []).map((state: any) => [state.id, state.state_name])
    );
    const citiesMap = new Map(
      (citiesResult.data || []).map((city: any) => [city.id, city.city_name])
    );

    // Format contacts using lookup maps (no additional queries)
    const formattedContacts = filteredContacts.map((contact: any) => ({
      id: contact.id,
      accountId: contact.account_id,
      accountName: contact.accounts?.account_name || null,
      assignedEmployee: contact.accounts?.assigned_employee || null,
      subAccountId: contact.sub_account_id || null,
      subAccountName: contact.sub_accounts?.sub_account_name || null,
      stateName: contact.sub_accounts?.state_id 
        ? (statesMap.get(contact.sub_accounts.state_id) || null)
        : null,
      cityName: contact.sub_accounts?.city_id
        ? (citiesMap.get(contact.sub_accounts.city_id) || null)
        : null,
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
    }));

    return NextResponse.json({ success: true, contacts: formattedContacts });
  } catch (error: any) {
    console.error('API error in /api/admin/contacts:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
