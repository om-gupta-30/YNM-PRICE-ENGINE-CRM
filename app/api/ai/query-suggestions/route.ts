/**
 * API Route for Query Suggestions
 * Returns personalized query suggestions based on user context
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { getSuggestions } from '@/lib/ai/querySuggestions';
import { fetchUserContext } from '@/lib/ai/ragEngine';

/**
 * POST /api/ai/query-suggestions
 * Returns personalized query suggestions
 */
export async function POST(request: NextRequest) {
  try {
    // Get user from request
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized: User ID required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const recentQueries = body.recentQueries || [];
    const mode = body.mode || 'QUERY';

    // Fetch user context
    let userContext;
    try {
      userContext = await fetchUserContext(userId);
    } catch (error: any) {
      console.error('[Query Suggestions] Error fetching user context:', error.message);
      userContext = {
        userId,
        role: 'employee',
      };
    }

    // Get suggestions
    const suggestions = await getSuggestions(userContext, recentQueries);

    return NextResponse.json({
      suggestions,
      count: suggestions.length,
    });
  } catch (error: any) {
    console.error('[Query Suggestions API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions', message: error.message },
      { status: 500 }
    );
  }
}

