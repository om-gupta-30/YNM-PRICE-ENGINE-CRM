import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      accountName,
      companyStage,
      companyTag,
      gstNumber,
      website,
      address,
      city,
      assignedEmployee,
      notes,
      relatedProducts,
      contacts,
      createdBy,
    } = body;

    // Validate required fields
    if (!accountName || !companyStage || !companyTag || !assignedEmployee || !createdBy) {
      return NextResponse.json(
        { error: 'Missing required fields: accountName, companyStage, companyTag, assignedEmployee, createdBy' },
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

    // Insert account
    const { data: accountData, error: accountError } = await supabase
      .from('accounts')
      .insert({
        account_name: accountName,
        company_stage: companyStage,
        company_tag: companyTag,
        gst_number: gstNumber || null,
        website: website || null,
        address: address || null,
        assigned_employee: assignedEmployee,
        notes: notes || null,
        related_products: relatedProducts || [],
        is_active: true,
        engagement_score: 0,
      })
      .select('id')
      .single();

    if (accountError) {
      console.error('Error creating account:', accountError);
      return NextResponse.json(
        { error: `Failed to create account: ${accountError.message}` },
        { status: 500 }
      );
    }

    const accountId = accountData.id;

    // Insert contacts if any
    if (contacts && Array.isArray(contacts) && contacts.length > 0) {
      const contactsToInsert = contacts
        .filter(contact => contact.name && contact.name.trim() !== '')
        .map(contact => ({
          account_id: accountId,
          name: contact.name,
          designation: contact.designation || null,
          email: contact.email || null,
          phone: contact.phone || null,
          call_status: null,
          notes: null,
          follow_up_date: null,
          created_by: createdBy,
        }));

      if (contactsToInsert.length > 0) {
        const { error: contactsError } = await supabase
          .from('contacts')
          .insert(contactsToInsert);

        if (contactsError) {
          console.error('Error creating contacts:', contactsError);
          // Don't fail the whole request if contacts fail, but log it
          console.warn('Account created but contacts failed to insert');
        }
      }
    }

    // Create activity log for account creation
    try {
      await supabase
        .from('activities')
        .insert({
          account_id: accountId,
          employee_id: createdBy,
          activity_type: 'note',
          description: `Account "${accountName}" created`,
          metadata: {},
        });
    } catch (activityError) {
      // Don't fail if activity logging fails
      console.warn('Failed to log activity:', activityError);
    }

    return NextResponse.json({
      success: true,
      accountId: accountId,
      message: 'Account created successfully',
    });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

