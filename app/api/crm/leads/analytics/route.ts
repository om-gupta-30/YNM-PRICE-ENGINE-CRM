import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

// GET - Fetch analytics data for leads
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();

    // Get all leads
    const { data: allLeads, error: leadsError } = await supabase
      .from('leads')
      .select('id, status, lead_source, created_at, follow_up_date');

    if (leadsError) {
      console.error('Error fetching leads for analytics:', leadsError);
      return NextResponse.json({ error: leadsError.message }, { status: 500 });
    }

    const leads = allLeads || [];
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Calculate analytics
    const totalLeads = leads.length;

    // New leads this week
    const newLeadsThisWeek = leads.filter(lead => {
      const createdAt = new Date(lead.created_at);
      return createdAt >= oneWeekAgo;
    }).length;

    // Leads by status
    const leadsByStatus: Record<string, number> = {};
    leads.forEach(lead => {
      const status = lead.status || 'New';
      leadsByStatus[status] = (leadsByStatus[status] || 0) + 1;
    });

    // Leads by source
    const leadsBySource: Record<string, number> = {};
    leads.forEach(lead => {
      if (lead.lead_source) {
        leadsBySource[lead.lead_source] = (leadsBySource[lead.lead_source] || 0) + 1;
      }
    });

    // Follow-ups due today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const followUpsDueToday = leads.filter(lead => {
      if (!lead.follow_up_date) return false;
      const followUpDate = new Date(lead.follow_up_date);
      followUpDate.setHours(0, 0, 0, 0);
      return followUpDate.getTime() === today.getTime();
    }).length;

    return NextResponse.json({
      success: true,
      analytics: {
        totalLeads,
        newLeadsThisWeek,
        leadsByStatus,
        leadsBySource,
        followUpsDueToday,
      },
    });
  } catch (error: any) {
    console.error('Get leads analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

