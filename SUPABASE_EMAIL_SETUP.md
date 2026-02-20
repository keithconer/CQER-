# Supabase Email Configuration Guide

## Overview
Your CQER system now uses Supabase's built-in email service instead of Resend. This guide will help you configure email templates in Supabase.

## What Changed

### 1. OAuth Double-Login Fix ✅
- Fixed the callback handler to properly set session cookies
- Google sign-in now works on the first attempt
- Session persists correctly across page navigations

### 2. Password Generation ✅
- Now uses cryptographically secure `crypto.randomInt()`
- Generates 12-character passwords (was 10)
- Guarantees at least one: uppercase, lowercase, number, and special character
- Passwords are shuffled to avoid predictable patterns

### 3. Email System ✅
- Removed Resend dependency
- Now uses Supabase Auth's `inviteUserByEmail()` method
- Temporary passwords are displayed in the UI for the admin to share
- Passwords are also logged to the console for reference

### 4. Email Domain Validation ✅
- Only @cvsu.edu.ph emails can be registered
- Validation happens before account creation
- Clear error messages for invalid domains

## Supabase Email Template Setup

### Step 1: Access Email Templates
1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `brwlmztkojrxvabfwrph`
3. Navigate to **Authentication** → **Email Templates**

### Step 2: Configure "Invite User" Template

Click on the **Invite user** template and replace the content with this HTML:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #159E44; font-size: 24px; font-weight: 700; margin: 0;">
        Welcome to CQER
      </h1>
      <p style="color: #64748b; font-size: 14px; margin: 8px 0 0;">
        CvSU CEIT Quarterly Extension Report
      </p>
    </div>

    <!-- Main Content -->
    <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px;">
      <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
        Hello <strong>{{ .Data.first_name }}</strong>,
      </p>
      
      <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
        Your account has been created as a <strong>{{ .Data.role_name }}</strong> on the CQER platform. 
        Below are your login credentials:
      </p>

      <!-- Email Box -->
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px;">
          Your Email
        </p>
        <p style="color: #334155; font-size: 14px; font-weight: 600; font-family: monospace; margin: 0; word-break: break-all;">
          {{ .Email }}
        </p>
      </div>

      <!-- Password Box -->
      <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 2px solid #159E44; border-radius: 8px; padding: 24px; margin: 24px 0; text-align: center;">
        <p style="color: #166534; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 12px;">
          Your Temporary Password
        </p>
        <p style="color: #159E44; font-size: 28px; font-weight: 700; font-family: 'Courier New', monospace; letter-spacing: 3px; margin: 0; word-break: break-all;">
          {{ .Data.temporary_password }}
        </p>
      </div>

      <!-- Security Notice -->
      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 4px;">
        <p style="color: #92400e; font-size: 13px; line-height: 1.5; margin: 0;">
          <strong>⚠️ Important:</strong> For security reasons, please change your password immediately after your first login.
        </p>
      </div>

      <!-- Login Button -->
      <div style="text-align: center; margin: 32px 0 24px;">
        <a href="{{ .Data.login_url }}" style="display: inline-block; background-color: #159E44; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 14px;">
          Log in to CQER Dashboard
        </a>
      </div>

      <!-- Instructions -->
      <div style="border-top: 1px solid #e2e8f0; padding-top: 24px; margin-top: 24px;">
        <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin: 0 0 12px;">
          <strong>How to log in:</strong>
        </p>
        <ol style="color: #64748b; font-size: 13px; line-height: 1.8; margin: 0; padding-left: 20px;">
          <li>Visit the CQER login page using the button above</li>
          <li>Enter your email address</li>
          <li>Enter the temporary password shown above</li>
          <li>Change your password in your account settings</li>
        </ol>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
      <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin: 0;">
        This is an automated message from the CQER system.<br>
        Please do not reply to this email.
      </p>
      <p style="color: #cbd5e1; font-size: 11px; margin: 12px 0 0;">
        © 2024 CvSU CEIT - Quarterly Extension Report System
      </p>
    </div>
  </div>
</body>
</html>
```

### Step 3: Configure Basic Settings (NO SMTP NEEDED!)

1. Go to **Authentication** → **Settings**
2. **DO NOT enable "Custom SMTP"** - leave it OFF (Supabase's default email works fine!)
3. Under **General Settings**:
   - Set **Site URL** to:
     - Development: `http://localhost:3000`
     - Production: `https://cqer.vercel.app`
   - Add **Redirect URLs**:
     - `http://localhost:3000/auth/callback`
     - `https://cqer.vercel.app/auth/callback`

**Important**: You don't need to configure SMTP settings! Supabase's built-in email service will work automatically for development and testing. Only configure custom SMTP if you need a custom email domain for production.

### Step 4: Test the Flow

1. Log in as super admin: `main.keithbrian.coner@cvsu.edu.ph`
2. Go to Dashboard
3. Click "Add College Coordinator" or "Add Unit Coordinator"
4. Enter a test email (must be @cvsu.edu.ph)
5. Complete the registration flow
6. The temporary password will be displayed in the success screen
7. Copy the password and share it with the coordinator
8. The coordinator will also receive an invite email from Supabase

## How It Works Now

### Registration Flow:
1. Super admin enters coordinator email(s)
2. System validates email domain (@cvsu.edu.ph only)
3. System generates secure 12-character temporary password
4. System creates user account with `email_confirm: true`
5. System sends Supabase invite email **with the temporary password included**
6. **Temporary password is displayed in the UI** for admin to copy (backup)
7. Coordinator receives email with their temporary password

### Login Flow:
1. Coordinator receives email with temporary password
2. Coordinator goes to login page
3. Coordinator enters email and temporary password from email
4. System authenticates and redirects to dashboard
5. Coordinator should change password in settings immediately

## Important Notes

- **Temporary passwords are included in the email** that coordinators receive
- **Passwords are also shown in the UI** after registration as a backup
- **No console logging** of passwords for security
- **No custom SMTP needed** - Supabase's default email service works out of the box
- All passwords are 12 characters with mixed case, numbers, and special characters
- Only @cvsu.edu.ph email addresses can be registered
- OAuth (Google sign-in) now works correctly on the first attempt

## Troubleshooting

### OAuth still requires double login?
- Clear your browser cookies and cache
- Make sure you're using the latest code
- Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set correctly

### Email not being sent?
- **Make sure you updated the email template** in Supabase (see Step 2 above)
- Check Supabase email settings in Authentication → Settings
- Verify Site URL and Redirect URLs are configured
- Check Supabase logs for email errors
- Passwords are still displayed in the UI as backup

### Password not showing in email?
- Make sure you copied the **exact email template** from Step 2
- The template uses `{{ .Data.temporary_password }}` to display the password
- Check that the email template was saved correctly
- Test with a new registration

### Password not showing in UI?
- Check browser console for errors
- Verify the registration completed successfully

### Invalid email domain error?
- Only @cvsu.edu.ph emails are allowed
- Check for typos in the email address
- Email validation is case-insensitive

## Security Considerations

✅ Passwords use cryptographically secure random generation
✅ Passwords are 12+ characters with character diversity
✅ Email domain validation prevents unauthorized registrations
✅ Session cookies use httpOnly, secure, and sameSite flags
✅ OAuth restricted to cvsu.edu.ph domain
✅ Temporary passwords should be changed after first login

## Next Steps

1. Configure Supabase email templates (see Step 2 above)
2. Test the registration flow with a test coordinator
3. Verify OAuth login works on first attempt
4. Ensure coordinators change their passwords after first login
5. Monitor server logs for any issues
