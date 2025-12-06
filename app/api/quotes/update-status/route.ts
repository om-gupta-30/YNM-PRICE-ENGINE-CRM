import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { getCurrentISTTime } from '@/lib/utils/dateFormatters';
import { triggerKnowledgeSync } from '@/lib/ai/knowledgeSync';

// Helper function to determine which table to use based on section
function getTableName(section: string): string {
  const sectionLower = section.toLowerCase();
  
  if (sectionLower.includes('signages') || sectionLower.includes('reflective')) {
    return 'quotes_signages';
  } else if (sectionLower.includes('paint')) {
    return 'quotes_paint';
  } else {
    // Default to MBCB for W-Beam, Thrie, Double W-Beam, etc.
    return 'quotes_mbcb';
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { quoteId, section, status } = body;

    if (!quoteId || !section || !status) {
      return NextResponse.json(
        { error: 'Quote ID, section, and status are required' },
        { status: 400 }
      );
    }

    // Validate status value
    const validStatuses = ['draft', 'sent', 'negotiation', 'on_hold', 'closed_won', 'closed_lost'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();
    const tableName = getTableName(section);

    // Get current quote to append to history
    // Note: account_id column doesn't exist in quotes tables, get it via sub_account_id
    const { data: currentQuote, error: fetchError } = await supabase
      .from(tableName)
      .select('status, status_history, sub_account_id, final_total_cost, created_by')
      .eq('id', quoteId)
      .single();

    if (fetchError) {
      console.error(`Error fetching quote from ${tableName}:`, fetchError);
      return NextResponse.json(
        { error: `Quote not found: ${fetchError.message}` },
        { status: 404 }
      );
    }

    if (!currentQuote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      );
    }

    // Get account_id from sub_account if needed
    let accountId: number | null = null;
    if (currentQuote.sub_account_id) {
      const { data: subAccount } = await supabase
        .from('sub_accounts')
        .select('account_id')
        .eq('id', currentQuote.sub_account_id)
        .single();
      accountId = subAccount?.account_id || null;
    }

    // Get updated_by from request body (if provided)
    const { updated_by } = body;
    const updatedBy = updated_by || 'Unknown';

    // Append to status history
    const currentHistory = (currentQuote?.status_history as any[]) || [];
    const newHistoryEntry = {
      status: status,
      updated_by: updatedBy,
      updated_at: getCurrentISTTime(),
    };
    const updatedHistory = [...currentHistory, newHistoryEntry];

    // Update the status and history
    const { data, error: updateError } = await supabase
      .from(tableName)
      .update({ 
        status,
        status_history: updatedHistory
      })
      .eq('id', quoteId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update quotation status' },
        { status: 500 }
      );
    }

    // Log activity for all status changes (not just closed_won)
    if (accountId && currentQuote.status !== status) {
      try {
        // Get sub-account name for better description
        let subAccountName = 'Unknown';
        if (currentQuote.sub_account_id) {
          const { data: subAccount } = await supabase
            .from('sub_accounts')
            .select('sub_account_name')
            .eq('id', currentQuote.sub_account_id)
            .single();
          subAccountName = subAccount?.sub_account_name || 'Unknown';
        }

        await supabase.from('activities').insert({
          account_id: accountId,
          employee_id: updatedBy,
          activity_type: 'quotation',
          description: `Quotation #${quoteId} status changed: ${currentQuote.status || 'draft'} → ${status}${subAccountName !== 'Unknown' ? ` (${subAccountName})` : ''}`,
          metadata: {
            quotation_id: quoteId,
            old_status: currentQuote.status,
            new_status: status,
            section: section,
            value: currentQuote.final_total_cost || 0,
          },
        });
      } catch (activityError) {
        // Log error but don't fail the status update
        console.error('Error creating activity for status change:', activityError);
      }
    }

    // Trigger AI knowledge sync (fire-and-forget)
    triggerKnowledgeSync({ type: 'quotation', entityId: quoteId });

    return NextResponse.json({
      success: true,
      data,
      message: 'Quotation status updated successfully',
    });
  } catch (error: any) {
    console.error('Update status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

