import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { getCurrentISTTime } from '@/lib/utils/dateFormatters';
import { logLoginActivity } from '@/lib/utils/activityLogger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, password } = body;

    if (!userId || !password) {
      return NextResponse.json(
        { error: 'User ID and password are required' },
        { status: 400 }
      );
    }

    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables:');
      console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? `Set (${supabaseUrl.substring(0, 20)}...)` : 'MISSING');
      console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? `Set (${supabaseServiceKey.substring(0, 20)}...)` : 'MISSING');
      return NextResponse.json(
        { error: 'Server configuration error. Please contact administrator.' },
        { status: 500 }
      );
    }

    let supabase;
    try {
      supabase = createSupabaseServerClient();
    } catch (supabaseError: any) {
      console.error('Supabase client creation error:', supabaseError);
      console.error('Error details:', supabaseError.message);
      return NextResponse.json(
        { error: 'Database connection error. Please contact administrator.' },
        { status: 500 }
      );
    }

    // Fetch user from database
    // Note: Database uses 'username' column, not 'user_id'
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id, username, password')
      .eq('username', userId)
      .single();

    if (fetchError) {
      console.error('Database fetch error - Full error object:', JSON.stringify(fetchError, null, 2));
      console.error('Error code:', fetchError.code);
      console.error('Error message:', fetchError.message);
      console.error('Error details:', fetchError.details);
      console.error('Error hint:', fetchError.hint);
      
      // Check for RLS errors
      if (fetchError?.message?.includes('permission denied') || fetchError?.code === '42501') {
        console.error('RLS ERROR: Row Level Security is blocking access to users table.');
        console.error('SOLUTION: Run docs/RLS_POLICIES_SETUP.sql in Supabase SQL Editor');
        return NextResponse.json(
          { error: 'Database permission error. Please run RLS policies setup script.' },
          { status: 500 }
        );
      }
      
      // Check if table doesn't exist
      if (fetchError?.message?.includes('does not exist') || fetchError?.code === '42P01') {
        console.error('TABLE ERROR: Users table does not exist.');
        console.error('SOLUTION: Run your database setup script in Supabase SQL Editor');
        return NextResponse.json(
          { error: 'Database not configured. Please run database setup script.' },
          { status: 500 }
        );
      }
      
      // Check if it's a "not found" error or a real database error
      if (fetchError.code === 'PGRST116' || fetchError.message?.includes('No rows')) {
        // No rows returned - invalid user
        return NextResponse.json(
          { error: 'Invalid user ID or password' },
          { status: 401 }
        );
      }
      
      // Check if table doesn't exist
      if (fetchError.code === '42P01' || fetchError.message?.includes('does not exist')) {
        console.error('Users table does not exist. Please run the database setup script.');
        return NextResponse.json(
          { error: 'Database not configured. Please contact administrator.' },
          { status: 500 }
        );
      }
      
      // Other database errors
      return NextResponse.json(
        { error: `Database error: ${fetchError.message || 'Unknown error'}` },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid user ID or password' },
        { status: 401 }
      );
    }

    // Verify password (plain text comparison)
    if (password !== user.password) {
      return NextResponse.json(
        { error: 'Invalid user ID or password' },
        { status: 401 }
      );
    }

    // Detect user role from username
    // Admin = full admin user
    // swamymahesh and mahesh = data analyst users (restricted admin)
    // Employee1, Employee2, Employee3 = sales employees
    const isDataAnalyst = user.username === 'swamymahesh' || user.username === 'mahesh';
    const isAdmin = user.username === 'Admin';
    const department = isAdmin || isDataAnalyst ? 'Sales' : 'Sales'; // All users are in Sales department for now

    // Return success with EXACT format as required
    // NEVER return undefined userId - always return user.username
    const responseData = {
      success: true,
      user: {
        id: user.id,
        username: user.username,
      },
      userId: user.username, // Keep for backward compatibility
      id: user.id, // Keep for backward compatibility
      department, // Add department
      isAdmin: isAdmin || isDataAnalyst, // Data analysts see admin portal but with restrictions
      isDataAnalyst, // Flag for data analyst role
    };

    // Ensure userId is NEVER undefined
    if (!user.username) {
      console.error('CRITICAL: User username is undefined!', user);
      return NextResponse.json(
        { error: 'Invalid user data returned from database' },
        { status: 500 }
      );
    }

    const loginTime = getCurrentISTTime();
    
    // Check if user was previously inactive (check last logout or inactivity)
    let wasInactive = false;
    let inactivityReason = null;
    try {
      // Check for recent logout or inactivity activity
      const { data: recentActivity } = await supabase
        .from('activities')
        .select('activity_type, description, metadata, created_at')
        .eq('employee_id', user.username)
        .in('activity_type', ['logout', 'inactive', 'away'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (recentActivity) {
        const activityTime = new Date(recentActivity.created_at).getTime();
        const now = new Date().getTime();
        const hoursSince = (now - activityTime) / (1000 * 60 * 60);
        
        // If last activity was logout/inactive/away within last 24 hours, consider it a return
        if (hoursSince < 24) {
          wasInactive = true;
          if (recentActivity.metadata?.reason) {
            inactivityReason = recentActivity.metadata.reason;
          } else if (recentActivity.activity_type === 'logout') {
            inactivityReason = 'Logged back in after logout';
          } else if (recentActivity.activity_type === 'inactive') {
            inactivityReason = 'Logged back in after being inactive';
          } else if (recentActivity.activity_type === 'away') {
            inactivityReason = 'Logged back in after being away';
          }
        }
      }
    } catch (error) {
      // Ignore errors in checking previous activity
    }
    
    // Update login_time and last_login in users table
    try {
      await supabase
        .from('users')
        .update({ 
          login_time: loginTime,
          last_login: loginTime,
        })
        .eq('username', user.username);
    } catch (error) {
      console.error('Error updating login_time in users table:', error);
    }

    // Log login activity with inactivity info if applicable
    await logLoginActivity({
      employee_id: user.username,
      loginTime: loginTime,
      metadata: {
        department,
        isAdmin: isAdmin || isDataAnalyst,
        isDataAnalyst,
        wasInactive,
        inactivityReason,
        previousStatus: wasInactive ? 'inactive' : null,
      },
    });

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('Login error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
