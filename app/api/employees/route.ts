import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

// Known employee prefixes - only these are valid sales employees
const VALID_EMPLOYEE_PREFIXES = ['sales_', 'sales-'];
const DEFAULT_EMPLOYEES = ['Sales_Shweta', 'Sales_Saumya', 'Sales_Nagender', 'Sales_Abhijeet'];

// Helper function to check if a username is a valid sales employee
const isValidSalesEmployee = (username: string | null | undefined): boolean => {
  if (!username) return false;
  const lowerUsername = username.trim().toLowerCase();
  
  // Exclude admin users
  if (lowerUsername === 'admin' || lowerUsername.includes('admin')) return false;
  
  // Exclude data analysts
  if (lowerUsername.includes('analyst') || lowerUsername.includes('data_analyst')) return false;
  
  // Only include users that start with Sales_ prefix or are in the default list
  return VALID_EMPLOYEE_PREFIXES.some(prefix => lowerUsername.startsWith(prefix)) ||
         DEFAULT_EMPLOYEES.some(emp => emp.toLowerCase() === lowerUsername);
};

// GET - Fetch all sales employees (not admin, not data analysts)
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();

    // First, try to fetch from users table (primary source)
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('username')
      .order('username', { ascending: true });

    if (!usersError && usersData && usersData.length > 0) {
      // Extract unique usernames - only valid sales employees
      const uniqueEmployees = [...new Set(
        usersData
          .map((user: any) => user.username)
          .filter(isValidSalesEmployee)
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
      // Extract unique employee names/usernames - only valid sales employees
      const uniqueEmployees = [...new Set(
        employeesData
          .map((emp: any) => emp.name || emp.username)
          .filter(isValidSalesEmployee)
      )].sort();
      
      if (uniqueEmployees.length > 0) {
        return NextResponse.json({ 
          success: true, 
          employees: uniqueEmployees
        });
      }
    }

    // Final fallback: return default list with sales employee names
    // DO NOT use accounts table as it may contain non-employee data
    return NextResponse.json({ 
      success: true, 
      employees: DEFAULT_EMPLOYEES
    });
  } catch (error: any) {
    console.error('Employees API error:', error);
    // Return fallback list on error
    return NextResponse.json({ 
      success: true, 
      employees: DEFAULT_EMPLOYEES
    });
  }
}


