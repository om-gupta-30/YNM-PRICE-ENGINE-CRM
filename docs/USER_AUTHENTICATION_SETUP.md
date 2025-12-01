# User Authentication Setup Guide

This guide explains how to set up user authentication with password management in the YNM Safety Price Engine.

## 📋 Prerequisites

1. Supabase project set up
2. Environment variables configured
3. Node.js dependencies installed

## 🗄️ Database Setup

### Step 1: Create Users Table

Run the SQL script in your Supabase SQL Editor:

```sql
-- File: docs/supabase-users-schema.sql
```

This will create:
- `users` table with `id`, `user_id`, `password_hash`, `created_at`, `updated_at`, `last_password_change`
- Index on `user_id` for faster lookups
- Trigger to auto-update `updated_at` timestamp

### Step 2: Generate Password Hash

1. Run the password hash generator:
   ```bash
   node scripts/generate-password-hash.js
   ```

2. Copy the generated hash

3. Update the SQL schema file (`docs/supabase-users-schema.sql`) with the actual hash:
   ```sql
   INSERT INTO users (user_id, password_hash) 
   VALUES ('Admin', 'YOUR_GENERATED_HASH_HERE')
   ON CONFLICT (user_id) DO NOTHING;
   ```

4. Run the updated INSERT statement in Supabase SQL Editor

## 🔐 Default Credentials

- **User ID**: `Admin`
- **Password**: `Admin@123`

**⚠️ IMPORTANT**: 
- Passwords are stored in **plain text** in the database for recovery purposes
- You can view any user's password by querying the `users` table
- Change the default password immediately after first login!

## 🚀 Features

### 1. Login
- Authenticates users against Supabase `users` table
- Uses bcrypt for password verification
- Stores session in localStorage

### 2. Change Password
- Requires:
  - User ID
  - Old password (for verification)
  - New password (min 6 characters)
  - Confirm new password
  - Captcha verification
- Validates old password before allowing change
- Automatically logs out after successful password change

### 3. Security Features
- Passwords are stored in **plain text** for recovery purposes (visible in database)
- Captcha verification for password changes
- Old password verification required
- Password strength validation (min 6 characters)
- **Note**: Passwords are stored in plain text so administrators can recover them if users forget

## 📁 File Structure

```
app/
├── api/
│   └── auth/
│       ├── login/
│       │   └── route.ts          # Login API endpoint
│       └── change-password/
│           └── route.ts          # Change password API endpoint
├── login/
│   └── page.tsx                  # Login page
└── change-password/
    └── page.tsx                  # Change password page

components/
└── layout/
    └── LogoutButton.tsx          # Updated with Change Password button

docs/
├── supabase-users-schema.sql     # Database schema
└── USER_AUTHENTICATION_SETUP.md  # This file

scripts/
└── generate-password-hash.js     # Password hash generator
```

## 🔧 API Endpoints

### POST `/api/auth/login`
**Request:**
```json
{
  "userId": "Admin",
  "password": "Admin@123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "userId": "Admin",
  "id": 1
}
```

**Response (Error):**
```json
{
  "error": "Invalid user ID or password"
}
```

### POST `/api/auth/change-password`
**Request:**
```json
{
  "userId": "Admin",
  "oldPassword": "Admin@123",
  "newPassword": "NewPassword123",
  "captcha": "ABC12"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Response (Error):**
```json
{
  "error": "Old password is incorrect"
}
```

## 🎨 UI Features

### Login Page
- User ID and password inputs
- Show/hide password toggle
- Error messages
- Loading states

### Change Password Page
- User ID input (auto-filled if logged in)
- Old password input
- New password input
- Confirm password input
- Captcha with refresh option
- All fields validated before submission

### Logout Button
- Now includes "Change Password" button
- Both buttons visible on all pages (except login/change-password)

## 🔒 Security Best Practices

1. **Password Storage**: Passwords are stored in **plain text** for recovery purposes
2. **Captcha**: Required for password changes to prevent automated attacks
3. **Old Password Verification**: Users must provide old password before changing
4. **Session Management**: Uses localStorage (consider upgrading to httpOnly cookies for production)
5. **Input Validation**: All inputs validated on both client and server side
6. **Password Recovery**: Administrators can view passwords in the database if users forget them

## 🐛 Troubleshooting

### Login not working
1. Check Supabase connection
2. Verify user exists in database
3. Check password hash is correct
4. Verify environment variables are set

### Password change failing
1. Verify old password is correct
2. Check captcha is entered correctly
3. Ensure new password meets requirements (min 6 characters)
4. Check Supabase connection

### Build errors
1. Run `npm install` to ensure bcryptjs is installed
2. Check TypeScript types are installed: `@types/bcryptjs`

## 📝 Notes

- **Passwords are stored in plain text** in the database for recovery purposes
- Administrators can view passwords by querying the `users` table
- Session is stored in localStorage (client-side)
- Consider implementing JWT tokens for production use
- For password recovery, use: `SELECT user_id, password FROM users WHERE user_id = 'Username';`

