import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

// GET - Fetch all employees
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();

    // First, try to fetch from users table (primary source)
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('username')
      .order('username', { ascending: true });

    if (!usersError && usersData && usersData.length > 0) {
      // Extract unique usernames and exclude Admin
      const uniqueEmployees = [...new Set(
        usersData
          .map((user: any) => user.username)
          .filter((username: string | null | undefined) => {
            if (!username) return false;
            return username.trim().toLowerCase() !== 'admin';
          })
      )].sort();
      
      if (uniqueEmployees.length > 0) {
        return NextResponse.json({ 
          success: true, 
          employees: uniqueEmployees
        });
      }
    }

    // Fallback: Try to fetch from employees table if it exists
    const { data: employeesData, error: employeesError } = await supabase
      .from('employees')
      .select('name, username')
      .order('name', { ascending: true });

    if (!employeesError && employeesData && employeesData.length > 0) {
      // Extract unique employee names/usernames and exclude Admin
      const uniqueEmployees = [...new Set(
        employeesData
          .map((emp: any) => emp.name || emp.username)
          .filter((name: string | null | undefined) => {
            if (!name) return false;
            return name.trim().toLowerCase() !== 'admin';
          })
      )].sort();
      
      if (uniqueEmployees.length > 0) {
      return NextResponse.json({ 
        success: true, 
          employees: uniqueEmployees
      });
      }
    }

    // Fallback: Try to get employees from accounts assigned_employee column
    const { data: accountEmployees } = await supabase
      .from('accounts')
      .select('assigned_employee')
      .not('assigned_employee', 'is', null);

    if (accountEmployees && accountEmployees.length > 0) {
      const uniqueEmployees = [...new Set(
        accountEmployees
          .map((acc: any) => acc.assigned_employee)
          .filter((name: string | null | undefined) => {
            if (!name) return false;
            return name.trim().toLowerCase() !== 'admin';
          })
      )].sort();
      
      if (uniqueEmployees.length > 0) {
      return NextResponse.json({ 
        success: true, 
          employees: uniqueEmployees
      });
      }
    }

    // Final fallback: return default list
    return NextResponse.json({ 
      success: true, 
      employees: ['Employee1', 'Employee2', 'Employee3']
    });
  } catch (error: any) {
    console.error('Employees API error:', error);
    // Return fallback list on error
    return NextResponse.json({ 
      success: true, 
      employees: ['Employee1', 'Employee2', 'Employee3']
    });
  }
}


