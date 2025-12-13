import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { formatTimestampIST } from '@/lib/utils/dateFormatters';

// PERFORMANCE OPTIMIZATION: Edge runtime for read-only GET API
// This route only reads from Supabase and doesn't use Node-specific APIs
export const runtime = "edge";

// GET - Fetch all leads with joined account and sub-account names
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeUsername = searchParams.get('employee');
    const isAdmin = searchParams.get('isAdmin') === 'true';
    const leadId = searchParams.get('id'); // Support single lead fetch

    const supabase = createSupabaseServerClient();

    // Build query
    let query = supabase
      .from('leads')
      .select(`
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
        account_id,
        sub_account_id,
        contact_id,
        follow_up_date,
        created_by,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false });

    // Filter by lead ID if provided
    if (leadId) {
      const id = parseInt(leadId);
      if (!isNaN(id)) {
        query = query.eq('id', id);
      }
    } else {
      // Filter by assigned_employee if not admin (only when fetching all leads)
      if (!isAdmin && employeeUsername) {
        query = query.eq('assigned_employee', employeeUsername);
      }
    }

    // Fetch leads
    const { data: leads, error } = await query;

    if (error) {
      console.error('Error fetching leads:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // PERFORMANCE OPTIMIZATION: Reduce redundant queries by batching account/subaccount lookups
    // Get unique account and sub-account IDs
    const accountIds = [...new Set((leads || []).map((l: any) => l.account_id).filter(Boolean))];
    const subAccountIds = [...new Set((leads || []).map((l: any) => l.sub_account_id).filter(Boolean))];

    // PERFORMANCE OPTIMIZATION: Use in-memory cache for accounts/subaccounts within same request
    // Fetch accounts and sub-accounts in parallel
    const [accountsResult, subAccountsResult] = await Promise.all([
      accountIds.length > 0 
        ? supabase.from('accounts').select('id, account_name').in('id', accountIds)
        : Promise.resolve({ data: [], error: null }),
      subAccountIds.length > 0
        ? supabase.from('sub_accounts').select('id, sub_account_name').in('id', subAccountIds)
        : Promise.resolve({ data: [], error: null })
    ]);

    const accountMap = new Map();
    (accountsResult.data || []).forEach((acc: any) => {
      accountMap.set(acc.id, acc.account_name);
    });

    const subAccountMap = new Map();
    (subAccountsResult.data || []).forEach((sa: any) => {
      subAccountMap.set(sa.id, sa.sub_account_name);
    });

    // Format the response with account and sub-account names and IST timestamps
    const formattedLeads = (leads || []).map((lead: any) => ({
      id: lead.id,
      lead_name: lead.lead_name,
      contact_person: lead.contact_person || null,
      phone: lead.phone || null,
      email: lead.email || null,
      requirements: lead.requirements || null,
      lead_source: lead.lead_source || null,
      status: lead.status || null,
      priority: lead.priority || null,
      assigned_employee: lead.assigned_employee || null,
      accounts: lead.account_id || null,
      sub_accounts: lead.sub_account_id || null,
      contact_id: lead.contact_id || null,
      follow_up_date: lead.follow_up_date || null,
      account_name: lead.account_id ? accountMap.get(lead.account_id) || null : null,
      sub_account_name: lead.sub_account_id ? subAccountMap.get(lead.sub_account_id) || null : null,
      created_by: lead.created_by || null,
      created_at: lead.created_at || null, // Keep raw ISO date string for component formatting
      updated_at: lead.updated_at || null, // Keep raw ISO date string for component formatting
    }));

    const response = NextResponse.json({ success: true, leads: formattedLeads });
    // Cache for 30 seconds with stale-while-revalidate for better performance
    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    return response;
  } catch (error: any) {
    console.error('Leads list API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

