import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

// GET - Fetch leads with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeUsername = searchParams.get('employee');
    const isAdmin = searchParams.get('isAdmin') === 'true';
    const filterStatus = searchParams.get('status');
    const filterAssignedTo = searchParams.get('assignedTo');

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

    let query = supabase
      .from('leads')
      .select('*');

    // Filter by employee if not admin
    if (!isAdmin && employeeUsername) {
      query = query.eq('assigned_to', employeeUsername);
    } else if (isAdmin && filterAssignedTo) {
      query = query.eq('assigned_to', filterAssignedTo);
    }

    // Filter by status
    if (filterStatus) {
      query = query.eq('status', filterStatus);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching leads:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error: any) {
    console.error('Leads API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new lead
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      lead_name,
      company_name,
      contact_person,
      phone,
      email,
      location,
      address,
      requirements,
      lead_source,
      status,
      assigned_to,
      notes,
      created_by,
    } = body;

    if (!lead_name) {
      return NextResponse.json(
        { error: 'Lead name is required' },
        { status: 400 }
      );
    }

    if (!assigned_to && !created_by) {
      return NextResponse.json(
        { error: 'Lead must be assigned to an employee' },
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
      .insert({
        lead_name: lead_name.trim(),
        company_name: company_name?.trim() || null,
        contact_person: contact_person?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        location: location?.trim() || null,
        address: address?.trim() || null,
        requirements: requirements?.trim() || null,
        lead_source: lead_source?.trim() || null,
        status: status || 'New',
        assigned_to: assigned_to || created_by,
        notes: notes?.trim() || null,
        created_by: created_by || assigned_to,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating lead:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, success: true });
  } catch (error: any) {
    console.error('Create lead error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

