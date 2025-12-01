import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

// GET - Get list of all employees
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();

    // Get all users (employees and admin)
    const { data: users, error } = await supabase
      .from('users')
      .select('username')
      .order('username', { ascending: true });

    if (error) {
      console.error('Error fetching employees:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter out Admin if needed, or return all
    const employees = (users || [])
      .map(u => u.username)
      .filter(u => u !== 'Admin'); // Optional: exclude Admin from employee list

    return NextResponse.json({
      success: true,
      employees: employees,
      allUsers: users?.map(u => u.username) || [], // Include admin in allUsers
    });
  } catch (error: any) {
    console.error('Employees API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
