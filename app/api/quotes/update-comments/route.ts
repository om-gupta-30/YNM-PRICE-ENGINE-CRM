import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { getCurrentISTTime } from '@/lib/utils/dateFormatters';

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
    const { quoteId, section, comments } = body;

    if (!quoteId || !section) {
      return NextResponse.json(
        { error: 'Quote ID and section are required' },
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
    
    const tableName = getTableName(section);

    // Get current quote to append to history
    const { data: currentQuote, error: fetchError } = await supabase
      .from(tableName)
      .select('comments, comments_history')
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

    // Get updated_by from request body (if provided)
    const { updated_by } = body;
    const updatedBy = updated_by || 'Unknown';

    // Append to comments history (only if comment is not empty)
    const currentHistory = (currentQuote?.comments_history as any[]) || [];
    let updatedHistory = [...currentHistory];
    
    if (comments && comments.trim()) {
      const newHistoryEntry = {
        comment: comments.trim(),
        updated_by: updatedBy,
        updated_at: getCurrentISTTime(),
      };
      updatedHistory = [...currentHistory, newHistoryEntry];
    }

    // Update the comments and history
    const { data, error: updateError } = await supabase
      .from(tableName)
      .update({ 
        comments: comments || null,
        comments_history: updatedHistory
      })
      .eq('id', quoteId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating comments:', updateError);
      return NextResponse.json(
        { error: 'Failed to update quotation comments' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Quotation comments updated successfully',
    });
  } catch (error: any) {
    console.error('Update comments error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

