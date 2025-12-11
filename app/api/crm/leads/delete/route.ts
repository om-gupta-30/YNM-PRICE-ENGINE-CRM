import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { logActivity } from '@/lib/utils/activityLogger';

// POST - Delete lead (Admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, isAdmin } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
        { status: 400 }
      );
    }

    // Check if user is admin
    if (!isAdmin || isAdmin !== true) {
      return NextResponse.json(
        { error: 'Only admins can delete leads' },
        { status: 403 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Get lead data before deletion for activity logging
    const { data: leadData } = await supabase
      .from('leads')
      .select('account_id, lead_name, created_by')
      .eq('id', id)
      .single();

    // Delete lead
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log activity asynchronously (don't block response)
    if (leadData) {
      logActivity({
        account_id: leadData.account_id,
        employee_id: leadData.created_by || 'System',
        activity_type: 'delete',
        description: `Lead deleted: ${leadData.lead_name}`,
        metadata: {
          entity_type: 'lead',
          lead_id: id,
        },
      }).catch(() => {
        // Silently fail - activity logging shouldn't block the response
      });
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

