import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

// Known employee prefixes - these are valid sales employees
const VALID_SALES_PREFIXES = ['sales_', 'sales-'];
// Known data analyst prefixes
const VALID_ANALYST_PREFIXES = ['data_analyst', 'analyst_', 'dataanalyst'];
const DEFAULT_SALES_EMPLOYEES = ['Sales_Shweta', 'Sales_Saumya', 'Sales_Nagender', 'Sales_Abhijeet'];

// Helper function to check if a username is admin
const isAdminUser = (username: string): boolean => {
  const lowerUsername = username.trim().toLowerCase();
  return lowerUsername === 'admin' || lowerUsername.startsWith('admin_');
};

// Helper function to check if a username is a valid sales employee (for account assignment)
const isValidSalesEmployee = (username: string | null | undefined): boolean => {
  if (!username) return false;
  const lowerUsername = username.trim().toLowerCase();
  
  // Exclude admin users
  if (isAdminUser(username)) return false;
  
  // Exclude data analysts from sales employees
  if (VALID_ANALYST_PREFIXES.some(prefix => lowerUsername.includes(prefix))) return false;
  
  // Only include users that start with Sales_ prefix or are in the default list
  return VALID_SALES_PREFIXES.some(prefix => lowerUsername.startsWith(prefix)) ||
         DEFAULT_SALES_EMPLOYEES.some(emp => emp.toLowerCase() === lowerUsername);
};

// Helper function to check if a username is a valid employee (for AI insights - includes data analysts)
const isValidEmployee = (username: string | null | undefined): boolean => {
  if (!username) return false;
  const lowerUsername = username.trim().toLowerCase();
  
  // Exclude admin users
  if (isAdminUser(username)) return false;
  
  // Include sales employees
  if (VALID_SALES_PREFIXES.some(prefix => lowerUsername.startsWith(prefix))) return true;
  if (DEFAULT_SALES_EMPLOYEES.some(emp => emp.toLowerCase() === lowerUsername)) return true;
  
  // Include data analysts
  if (VALID_ANALYST_PREFIXES.some(prefix => lowerUsername.includes(prefix))) return true;
  
  return false;
};

// GET - Fetch employees
// Query param: type=sales (for account assignment - excludes data analysts)
// Query param: type=all (for AI insights - includes data analysts)
// Default: type=all
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const filterFn = type === 'sales' ? isValidSalesEmployee : isValidEmployee;
    
    const supabase = createSupabaseServerClient();

    // First, try to fetch from users table (primary source)
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('username')
      .order('username', { ascending: true });

    if (!usersError && usersData && usersData.length > 0) {
      // Extract unique usernames based on filter
      const uniqueEmployees = [...new Set(
        usersData
          .map((user: any) => user.username)
          .filter(filterFn)
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
      // Extract unique employee names/usernames based on filter
      const uniqueEmployees = [...new Set(
        employeesData
          .map((emp: any) => emp.name || emp.username)
          .filter(filterFn)
      )].sort();
      
      if (uniqueEmployees.length > 0) {
        return NextResponse.json({ 
          success: true, 
          employees: uniqueEmployees
        });
      }
    }

    // Final fallback: return default list with sales employee names
    return NextResponse.json({ 
      success: true, 
      employees: DEFAULT_SALES_EMPLOYEES
    });
  } catch (error: any) {
    console.error('Employees API error:', error);
    // Return fallback list on error
    return NextResponse.json({ 
      success: true, 
      employees: DEFAULT_SALES_EMPLOYEES
    });
  }
}


