import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { logActivity } from '@/lib/utils/activityLogger';

// POST - Delete lead
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Get lead data before deletion for activity logging
    const { data: leadData } = await supabase
      .from('leads')
      .select('account_id, lead_name, created_by')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting lead:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity for lead deletion
    if (leadData) {
      try {
        await logActivity({
          account_id: leadData.account_id,
          employee_id: leadData.created_by || 'System',
          activity_type: 'delete',
          description: `Lead deleted: ${leadData.lead_name}`,
          metadata: {
            entity_type: 'lead',
            lead_id: id,
            deleted_data: leadData,
          },
        });
      } catch (activityError) {
        console.warn('Failed to log lead deletion activity:', activityError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete lead error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

