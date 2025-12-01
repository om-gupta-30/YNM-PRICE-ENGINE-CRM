import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, oldPassword, newPassword, captcha } = body;

    if (!userId || !oldPassword || !newPassword || !captcha) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Verify captcha (simple validation - you can enhance this)
    if (!captcha || captcha.length < 4) {
      return NextResponse.json(
        { error: 'Invalid captcha' },
        { status: 400 }
      );
    }

    // Validate new password strength
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Password strength validation
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);

    if (!hasUpperCase) {
      return NextResponse.json(
        { error: 'Password must contain at least one uppercase letter (A-Z)' },
        { status: 400 }
      );
    }

    if (!hasNumber) {
      return NextResponse.json(
        { error: 'Password must contain at least one number (0-9)' },
        { status: 400 }
      );
    }

    if (!hasSpecialChar) {
      return NextResponse.json(
        { error: 'Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Fetch user from database
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id, user_id, password')
      .eq('user_id', userId)
      .single();

    if (fetchError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify old password matches
    if (user.password !== oldPassword) {
      return NextResponse.json(
        { error: 'Current password is incorrect. Please try again.' },
        { status: 401 }
      );
    }

    // Check if new password is same as old password
    if (oldPassword === newPassword) {
      return NextResponse.json(
        { error: 'New password must be different from your current password' },
        { status: 400 }
      );
    }

    // Update password in database (store as plain text)
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password: newPassword,
        last_password_change: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Password update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update password' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error: any) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

