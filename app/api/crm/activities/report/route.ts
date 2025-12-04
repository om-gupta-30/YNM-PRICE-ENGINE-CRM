import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { formatTimestampIST } from '@/lib/utils/dateFormatters';

// Helper function to normalize employee names (map old IDs to current names)
async function getEmployeeNameMapping(supabase: any): Promise<Record<string, string>> {
  const mapping: Record<string, string> = {};
  
  try {
    // Fetch current employees from users table
    const { data: usersData } = await supabase
      .from('users')
      .select('username')
      .order('username', { ascending: true });

    if (usersData) {
      // Create a mapping: normalize variations to current names
      for (const user of usersData) {
        const username = user.username;
        if (!username) continue;
        
        // Map the username to itself (current name)
        mapping[username.toLowerCase()] = username;
        
        // Map common variations
        // If username is "Sales_Shweta", also map "shweta", "Shweta", etc.
        const nameParts = username.split('_');
        if (nameParts.length > 1) {
          const lastName = nameParts[nameParts.length - 1];
          mapping[lastName.toLowerCase()] = username;
          mapping[lastName] = username;
        }
      }
    }
  } catch (error) {
    console.error('Error creating employee name mapping:', error);
  }
  
  return mapping;
}

// Helper function to normalize an employee name using the mapping
function normalizeEmployeeName(employeeId: string, mapping: Record<string, string>): string {
  if (!employeeId) return employeeId;
  
  // First try exact match (case-insensitive)
  const normalized = mapping[employeeId.toLowerCase()];
  if (normalized) return normalized;
  
  // Try to match by last part of name (e.g., "swamymahesh" -> "Sales_SwamyMahesh")
  const nameParts = employeeId.split(/[_-]/);
  if (nameParts.length > 0) {
    const lastPart = nameParts[nameParts.length - 1].toLowerCase();
    const matched = mapping[lastPart];
    if (matched) return matched;
  }
  
  // If no match found, return as-is (might be a valid current name)
  return employeeId;
}

// GET - Generate activities report
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeUsername = searchParams.get('employee');
    const isAdmin = searchParams.get('isAdmin') === 'true';
    const isDataAnalyst = searchParams.get('isDataAnalyst') === 'true';
    const filterEmployee = searchParams.get('filterEmployee');
    const filterDate = searchParams.get('filterDate');
    const format = searchParams.get('format') || 'json';

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

    // Get employee name mapping
    const employeeMapping = await getEmployeeNameMapping(supabase);

    let query = supabase
      .from('activities')
      .select('*');

    // Filter by employee
    if (isAdmin && !isDataAnalyst && filterEmployee) {
      query = query.eq('employee_id', filterEmployee);
    } else if (!isAdmin || isDataAnalyst) {
      if (employeeUsername) {
        query = query.eq('employee_id', employeeUsername);
      }
    }

    // Filter by date if provided
    if (filterDate) {
      const startDate = new Date(filterDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(filterDate);
      endDate.setHours(23, 59, 59, 999);
      
      query = query
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(10000); // Large limit for comprehensive report

    if (error) {
      console.error('Error fetching activities for report:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Normalize employee names and format timestamps
    const normalizedActivities = (data || []).map((activity: any) => ({
      ...activity,
      created_at: formatTimestampIST(activity.created_at),
      employee_id: normalizeEmployeeName(activity.employee_id || '', employeeMapping),
    }));

    // Generate summary statistics
    const summary = {
      totalActivities: normalizedActivities.length,
      byType: {} as Record<string, number>,
      byEmployee: {} as Record<string, number>,
    };

    for (const activity of normalizedActivities) {
      // Count by type
      const type = activity.activity_type || 'unknown';
      summary.byType[type] = (summary.byType[type] || 0) + 1;

      // Count by employee
      const employee = activity.employee_id || 'Unknown';
      summary.byEmployee[employee] = (summary.byEmployee[employee] || 0) + 1;
    }

    return NextResponse.json({
      success: true,
      activities: normalizedActivities,
      summary,
    });
  } catch (error: any) {
    console.error('Generate activities report error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
