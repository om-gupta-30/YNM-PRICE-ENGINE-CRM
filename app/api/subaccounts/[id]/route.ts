import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { formatTimestampIST, getCurrentISTTime } from '@/lib/utils/dateFormatters';

// GET - Fetch single sub-account by ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid sub-account ID' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase
      .from('sub_accounts')
      .select('id, account_id, sub_account_name, state_id, city_id, address, pincode, gst_number, website, is_headquarter, office_type, engagement_score, is_active, created_at, updated_at, ai_insights, assigned_employee')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching sub-account:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Sub-account not found' },
        { status: 404 }
      );
    }

    // Fetch state and city names if they exist
    let stateName = null;
    let cityName = null;

    if (data.state_id) {
      try {
        const { data: stateData } = await supabase
          .from('states')
          .select('state_name')
          .eq('id', data.state_id)
          .single();
        stateName = stateData?.state_name || null;
      } catch (err) {
        console.error(`Error fetching state for sub-account ${data.id}:`, err);
      }
    }

    if (data.city_id) {
      try {
        const { data: cityData } = await supabase
          .from('cities')
          .select('city_name')
          .eq('id', data.city_id)
          .single();
        cityName = cityData?.city_name || null;
      } catch (err) {
        console.error(`Error fetching city for sub-account ${data.id}:`, err);
      }
    }

    // Fetch account name
    let accountName = null;
    if (data.account_id) {
      try {
        const { data: accountData } = await supabase
          .from('accounts')
          .select('account_name')
          .eq('id', data.account_id)
          .single();
        accountName = accountData?.account_name || null;
      } catch (err) {
        console.error(`Error fetching account for sub-account ${data.id}:`, err);
      }
    }

    const formattedSubAccount = {
      id: data.id,
      accountId: data.account_id,
      accountName,
      subAccountName: data.sub_account_name,
      stateId: data.state_id || null,
      cityId: data.city_id || null,
      stateName,
      cityName,
      address: data.address || null,
      pincode: data.pincode || null,
      gstNumber: data.gst_number || null,
      website: data.website || null,
      isHeadquarter: data.is_headquarter || false,
      officeType: data.office_type || null,
      engagementScore: parseFloat(data.engagement_score?.toString() || '0') || 0,
      isActive: data.is_active,
      assignedEmployee: data.assigned_employee || null,
      aiInsights: data.ai_insights || null,
      createdAt: formatTimestampIST(data.created_at),
      updatedAt: formatTimestampIST(data.updated_at),
    };

    return NextResponse.json({ success: true, subAccount: formattedSubAccount });
  } catch (error: any) {
    console.error('Get sub-account error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete sub-account (soft delete by setting is_active to false)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid sub-account ID' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Soft delete - set is_active to false
    const { data, error } = await supabase
      .from('sub_accounts')
      .update({ 
        is_active: false, 
        updated_at: getCurrentISTTime(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error deleting sub-account:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, success: true });
  } catch (error: any) {
    console.error('Delete sub-account error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
