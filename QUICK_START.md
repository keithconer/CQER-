# Quick Start Guide - CQER System

## ✅ What's Fixed

### 1. OAuth Double-Login Issue - FIXED!
- Google sign-in now works on the **first attempt**
- No more redirecting back to login page
- Session persists correctly across pages

### 2. Temporary Password System - ENHANCED!
- Passwords are **12 characters** (was 10)
- Uses **cryptographically secure** random generation
- Includes uppercase, lowercase, numbers, and special characters
- **Passwords are sent directly in the email** to coordinators
- **Passwords also shown in UI** for admin as backup
- **No console logging** for security

### 3. Email System - SIMPLIFIED!
- **No Resend needed** - uses Supabase's built-in email
- **No SMTP configuration needed** - works out of the box
- Professional email template with CQER branding
- Temporary password included in the email

## 🚀 Setup Steps (5 minutes)

### Step 1: Update Supabase Email Template
1. Go to: https://supabase.com/dashboard/project/brwlmztkojrxvabfwrph/auth/templates
2. Click on **"Invite user"** template
3. Copy the HTML template from `SUPABASE_EMAIL_SETUP.md` (Step 2)
4. Paste it into the template editor
5. Click **Save**

### Step 2: Configure URLs
1. Go to: https://supabase.com/dashboard/project/brwlmztkojrxvabfwrph/auth/url-configuration
2. Set **Site URL**:
   - For development: `http://localhost:3000`
   - For production: `https://cqer.vercel.app`
3. Add **Redirect URLs**:
   - `http://localhost:3000/auth/callback`
   - `https://cqer.vercel.app/auth/callback`
4. Click **Save**

### Step 3: Test It!
1. Start your dev server: `npm run dev`
2. Log in as super admin: `main.keithbrian.coner@cvsu.edu.ph`
3. Go to Dashboard
4. Click "Add College Coordinator"
5. Enter a test email (must be @cvsu.edu.ph)
6. Complete the registration
7. ✅ Password will be shown in the UI
8. ✅ Coordinator will receive email with password
9. ✅ Test Google sign-in (should work first try!)

## 📧 How Emails Work Now

### What Coordinators Receive:
```
Subject: Welcome to CQER

Hello [Name],

Your account has been created as a [Role] on the CQER platform.

Your Email: coordinator@cvsu.edu.ph

Your Temporary Password: [12-char password displayed prominently]

⚠️ Important: Change your password after first login.

[Log in to CQER Dashboard Button]
```

### What Admins See:
After registration, a success screen shows:
- ✅ Email address
- ✅ Temporary password (with copy button)
- ✅ Email sent status

## 🔐 Security Features

✅ Cryptographically secure password generation
✅ 12-character passwords with character diversity
✅ Email domain validation (@cvsu.edu.ph only)
✅ No console logging of passwords
✅ Secure session cookies (httpOnly, secure, sameSite)
✅ OAuth restricted to cvsu.edu.ph domain

## ❓ FAQ

**Q: Do I need to configure SMTP settings in Supabase?**
A: **NO!** Leave "Custom SMTP" disabled. Supabase's default email works perfectly.

**Q: Will coordinators receive the password via email?**
A: **YES!** The password is included in the email template automatically.

**Q: Can I still see the password in the UI?**
A: **YES!** After registration, passwords are displayed with a copy button.

**Q: Are passwords logged to the console?**
A: **NO!** For security, passwords are NOT logged to console or terminal.

**Q: Does Google sign-in still require two attempts?**
A: **NO!** This is fixed. Google sign-in works on the first attempt now.

**Q: What if the email doesn't send?**
A: The password is still shown in the UI, so you can manually share it.

**Q: Can I use non-cvsu.edu.ph emails?**
A: **NO!** Only @cvsu.edu.ph emails are allowed for security.

## 🎨 UI Features

- ✅ Maintains shadcn/ui design system
- ✅ Small text sizes (text-[10px], text-[11px])
- ✅ Green primary color (#159E44)
- ✅ Multi-step registration flow
- ✅ Copy-to-clipboard for passwords
- ✅ Success/error states with visual feedback

## 📝 Next Steps

1. ✅ Update Supabase email template (see Step 1 above)
2. ✅ Configure Site URL and Redirect URLs (see Step 2 above)
3. ✅ Test registration with a coordinator
4. ✅ Test Google sign-in
5. ✅ Remind coordinators to change their password after first login

## 🆘 Need Help?

See `SUPABASE_EMAIL_SETUP.md` for:
- Detailed email template HTML
- Troubleshooting guide
- Security considerations
- Complete configuration steps

---

**Everything is ready to go! Just update the email template and you're done.** 🎉
