import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { getCurrentISTTime } from '@/lib/utils/dateFormatters';

// POST - Set/Update follow-up date for a lead
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const leadId = parseInt(params.id);
    const body = await request.json();
    const { follow_up_date, created_by } = body;

    if (isNaN(leadId)) {
      return NextResponse.json(
        { error: 'Invalid lead ID' },
        { status: 400 }
      );
    }

    if (!follow_up_date) {
      return NextResponse.json(
        { error: 'Follow-up date is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Update lead with follow-up date
    const { data: leadData, error: updateError } = await supabase
      .from('leads')
      .update({
        follow_up_date: follow_up_date,
        updated_at: getCurrentISTTime(),
      })
      .eq('id', leadId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating lead follow-up date:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Create activity record
    if (created_by) {
      try {
        await supabase.from('lead_activities').insert({
          lead_id: leadId,
          activity_type: 'follow_up_set',
          description: `Follow-up scheduled for ${new Date(follow_up_date).toLocaleDateString('en-IN')}`,
          metadata: { follow_up_date },
          created_by: created_by,
        });
      } catch (activityError) {
        console.error('Error creating activity (non-critical):', activityError);
        // Don't fail the request if activity creation fails
      }
    }

    // TODO: Sync notification (similar to contacts follow-up notifications)
    // This can be implemented later using the notification sync utility

    return NextResponse.json({ success: true, lead: leadData });
  } catch (error: any) {
    console.error('Set follow-up error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove follow-up date
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const leadId = parseInt(params.id);

    if (isNaN(leadId)) {
      return NextResponse.json(
        { error: 'Invalid lead ID' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase
      .from('leads')
      .update({
        follow_up_date: null,
        updated_at: getCurrentISTTime(),
      })
      .eq('id', leadId)
      .select()
      .single();

    if (error) {
      console.error('Error removing follow-up date:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, lead: data });
  } catch (error: any) {
    console.error('Remove follow-up error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

