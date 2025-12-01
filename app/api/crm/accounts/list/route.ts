import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stage = searchParams.get('stage');
    const tag = searchParams.get('tag');
    const employee = searchParams.get('employee');
    const search = searchParams.get('search');

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

    // Build query with filters
    let query = supabase
      .from('accounts')
      .select(`
        id,
        account_name,
        company_stage,
        company_tag,
        gst_number,
        website,
        address,
        assigned_employee,
        notes,
        related_products,
        is_active,
        engagement_score,
        created_at,
        updated_at,
        last_activity_at,
        contacts (
          id,
          name,
          designation,
          email,
          phone
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    // Apply filters
    if (stage) {
      query = query.eq('company_stage', stage);
    }

    if (tag) {
      query = query.eq('company_tag', tag);
    }

    if (employee) {
      query = query.eq('assigned_employee', employee);
    }

    // Search by account name
    if (search) {
      query = query.ilike('account_name', `%${search}%`);
    }

    const { data: accounts, error } = await query;

    if (error) {
      console.error('Error fetching accounts:', error);
      return NextResponse.json(
        { error: `Failed to fetch accounts: ${error.message}` },
        { status: 500 }
      );
    }

    // Transform data to include contact count
    const transformedAccounts = accounts?.map(account => ({
      id: account.id,
      accountName: account.account_name,
      companyStage: account.company_stage,
      companyTag: account.company_tag,
      gstNumber: account.gst_number,
      website: account.website,
      address: account.address,
      assignedEmployee: account.assigned_employee,
      notes: account.notes,
      relatedProducts: account.related_products || [],
      isActive: account.is_active,
      engagementScore: account.engagement_score || 0,
      createdAt: account.created_at,
      updatedAt: account.updated_at,
      lastActivityAt: account.last_activity_at,
      contacts: account.contacts || [],
      contactCount: Array.isArray(account.contacts) ? account.contacts.length : 0,
    })) || [];

    return NextResponse.json({
      success: true,
      accounts: transformedAccounts,
      count: transformedAccounts.length,
    });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

