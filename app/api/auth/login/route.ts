import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { getCurrentISTTime } from '@/lib/utils/dateFormatters';

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

    // Detect department and admin status from username
    // Admin = admin user
    // Employee1, Employee2, Employee3 = sales employees
    const isAdmin = user.username === 'Admin';
    const department = isAdmin ? 'Sales' : 'Sales'; // All users are in Sales department for now

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
      isAdmin, // Add isAdmin
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

    // Log login activity
    try {
      await supabase.from('activities').insert({
        account_id: null,
        employee_id: user.username,
        activity_type: 'login',
        description: `${user.username} logged in`,
        metadata: {
          login_time: loginTime,
        },
      });
    } catch (activityError) {
      console.error('Login activity logging failed (non-critical):', activityError);
    }

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
