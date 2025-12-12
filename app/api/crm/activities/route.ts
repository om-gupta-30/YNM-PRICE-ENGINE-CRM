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

// GET - Fetch all activities for an employee (for employees/data analysts to see their own activities)
// or all activities (for admin only)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeUsername = searchParams.get('employee');
    const isAdmin = searchParams.get('isAdmin') === 'true';
    const filterEmployee = searchParams.get('filterEmployee'); // For admin only to filter by employee
    const filterDate = searchParams.get('filterDate'); // Filter by date (YYYY-MM-DD format)

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

    let query = supabase
      .from('activities')
      .select('*');

    // Filter by employee
    // Only admins see all activities; employees see only their own
    if (isAdmin && filterEmployee) {
      // Admin filtering by specific employee
      query = query.eq('employee_id', filterEmployee);
    } else if (!isAdmin) {
      // Employees see only their own activities
      if (employeeUsername) {
      query = query.eq('employee_id', employeeUsername);
      }
    }
    // If isAdmin and no filterEmployee, show all activities (admin only)

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

    // Include all activity types including status changes and inactivity reasons
    // (account_id can be null for status-only activities)
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(500); // Increased limit to show comprehensive daily activities

    if (error) {
      console.error('Error fetching activities:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get employee name mapping to normalize old IDs to current names
    const employeeMapping = await getEmployeeNameMapping(supabase);

    // Format timestamps in IST and normalize employee names
    const formattedData = (data || []).map((activity: any) => ({
      ...activity,
      created_at: formatTimestampIST(activity.created_at),
      employee_id: normalizeEmployeeName(activity.employee_id || '', employeeMapping),
    }));

    return NextResponse.json({ data: formattedData, success: true });
  } catch (error: any) {
    console.error('Get activities error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
