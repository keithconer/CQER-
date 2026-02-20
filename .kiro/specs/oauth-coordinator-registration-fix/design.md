# Design Document

## Overview

This design addresses two critical authentication and user management issues in the CQER system:

1. **OAuth Double-Login Fix**: The current OAuth flow redirects users back to the login page after successful Google authentication, requiring a second login attempt. This is caused by improper session handling in the callback route and middleware interaction.

2. **Coordinator Registration Enhancement**: The current registration system generates temporary passwords but needs improvements in password security strength and email delivery reliability.

The solution maintains the existing Next.js App Router architecture, Supabase authentication patterns, and shadcn/ui design system while fixing the core authentication flow and strengthening security.

## Architecture

### Current Authentication Flow (Problematic)

```
User clicks "Sign in with Google"
  ↓
Redirect to Google OAuth (hd: cvsu.edu.ph)
  ↓
User selects account
  ↓
Redirect to /auth/callback?code=...
  ↓
exchangeCodeForSession() called
  ↓
Session created but cookies not properly set
  ↓
Middleware runs, doesn't detect session
  ↓
Redirect to /login (PROBLEM)
  ↓
User clicks Google sign-in again
  ↓
This time session persists → /dashboard
```

### Root Cause Analysis

The issue stems from the interaction between:
1. **OAuth Callback Route** (`/auth/callback/route.ts`): Creates session but returns `NextResponse.redirect()` without ensuring cookies are committed
2. **Middleware** (`middleware.ts`): Runs after callback and may not see the newly created session cookies
3. **Cookie Timing**: The session cookies set by `exchangeCodeForSession()` may not be available to the middleware on the same request cycle

### Fixed Authentication Flow

```
User clicks "Sign in with Google"
  ↓
Redirect to Google OAuth (hd: cvsu.edu.ph)
  ↓
User selects account
  ↓
Redirect to /auth/callback?code=...
  ↓
Create Supabase client with proper cookie handling
  ↓
exchangeCodeForSession() with cookie commitment
  ↓
Explicitly set session cookies in response
  ↓
Verify session before redirect
  ↓
Redirect to /dashboard with session cookies
  ↓
Middleware detects valid session
  ↓
User lands on /dashboard (SUCCESS)
```

## Components and Interfaces

### 1. OAuth Callback Handler

**File**: `src/app/auth/callback/route.ts`

**Current Issues**:
- Uses `createClient()` from server.ts which may not properly handle cookie setting in route handlers
- Doesn't explicitly ensure cookies are set before redirecting
- No verification that session is actually established

**Design Changes**:

```typescript
// Use createServerClient directly in the callback for explicit cookie control
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = getBaseURL();
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

  if (code) {
    const cookieStore = await cookies();
    
    // Create client with explicit cookie handling
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // Exchange code for session
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Verify session was created
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Profile check and recovery logic (existing)
        // ...
        
        // Create response with explicit cookie forwarding
        const response = NextResponse.redirect(`${origin}${next}`);
        
        // Ensure all auth cookies are set on the response
        const allCookies = cookieStore.getAll();
        allCookies.forEach(cookie => {
          response.cookies.set(cookie.name, cookie.value, {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
          });
        });
        
        return response;
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
```

**Key Design Decisions**:
- Use `createServerClient` directly instead of the wrapper to have explicit control over cookie handling
- Call `getUser()` after `exchangeCodeForSession()` to verify the session was actually created
- Explicitly set all cookies on the response object before redirecting
- Use proper cookie options (httpOnly, secure, sameSite) for security

### 2. Password Generator Enhancement

**File**: `src/lib/actions/auth.ts`

**Current Implementation**:
```typescript
function generateTempPassword() {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 10; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}
```

**Issues**:
- Uses `Math.random()` which is not cryptographically secure
- Only 10 characters (should be 12+ for better security)
- Limited special character set

**Enhanced Design**:

```typescript
function generateTempPassword(): string {
    // Use Node.js crypto for cryptographically secure random generation
    const crypto = require('crypto');
    
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const allChars = lowercase + uppercase + numbers + special;
    
    // Ensure at least one character from each category
    let password = '';
    password += lowercase[crypto.randomInt(0, lowercase.length)];
    password += uppercase[crypto.randomInt(0, uppercase.length)];
    password += numbers[crypto.randomInt(0, numbers.length)];
    password += special[crypto.randomInt(0, special.length)];
    
    // Fill remaining characters (12 total - 4 guaranteed = 8 random)
    for (let i = 0; i < 8; i++) {
        password += allChars[crypto.randomInt(0, allChars.length)];
    }
    
    // Shuffle the password to avoid predictable patterns
    const passwordArray = password.split('');
    for (let i = passwordArray.length - 1; i > 0; i--) {
        const j = crypto.randomInt(0, i + 1);
        [passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]];
    }
    
    return passwordArray.join('');
}
```

**Key Design Decisions**:
- Use `crypto.randomInt()` for cryptographically secure random number generation
- Increase password length to 12 characters
- Guarantee at least one character from each category (lowercase, uppercase, number, special)
- Shuffle the password to avoid predictable patterns (e.g., always starting with lowercase)
- Expand special character set for more entropy

### 3. Email Service Enhancement

**File**: `src/lib/actions/auth.ts`

**Current Implementation**: Functional but could be more robust

**Enhanced Design**:

```typescript
async function sendRegistrationEmail(
  email: string,
  tempPassword: string,
  firstName: string,
  userType: string
): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  
  // Development mode logging
  if (!apiKey) {
    console.log("=== DEVELOPMENT MODE: Email Simulation ===");
    console.log(`To: ${email}`);
    console.log(`Subject: Temporary Account Credentials - CQER Platform`);
    console.log(`Temporary Password: ${tempPassword}`);
    console.log(`User Type: ${userType}`);
    console.log(`First Name: ${firstName}`);
    console.log("==========================================");
    return { success: true };
  }

  const roleName = userType === 'college_coordinator' 
    ? 'College Coordinator' 
    : 'Unit Coordinator';
  
  const loginUrl = `${getBaseURL()}/login`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'CQER System <onboarding@resend.dev>',
        to: email,
        subject: 'Your CQER Account - Temporary Password',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
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
                  Hello <strong>${firstName || 'Coordinator'}</strong>,
                </p>
                
                <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
                  Your account has been created as a <strong>${roleName}</strong> on the CQER platform. 
                  Below are your login credentials:
                </p>

                <!-- Password Box -->
                <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 2px solid #159E44; border-radius: 8px; padding: 24px; margin: 24px 0; text-align: center;">
                  <p style="color: #166534; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 12px;">
                    Your Temporary Password
                  </p>
                  <p style="color: #159E44; font-size: 28px; font-weight: 700; font-family: 'Courier New', monospace; letter-spacing: 3px; margin: 0; word-break: break-all;">
                    ${tempPassword}
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
                  <a href="${loginUrl}" style="display: inline-block; background-color: #159E44; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 14px;">
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
                    <li>Enter your email: <strong>${email}</strong></li>
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
                  © ${new Date().getFullYear()} CvSU CEIT - Quarterly Extension Report System
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Resend API Error:", errorData);
      return { 
        success: false, 
        error: `Email service error: ${errorData.message || 'Unknown error'}` 
      };
    }

    const data = await response.json();
    console.log(`✓ Registration email sent to ${email} (ID: ${data.id})`);
    return { success: true };
    
  } catch (error) {
    console.error("Failed to send registration email:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Network error' 
    };
  }
}
```

**Key Design Decisions**:
- Return success/error status for better error handling
- Enhanced HTML email template with:
  - Professional gradient background for password display
  - Large, monospace font for password (28px, letter-spacing)
  - Security warning with visual emphasis
  - Step-by-step login instructions
  - Responsive design for mobile devices
  - CQER branding with #159E44 green color
- Better error logging with specific error messages
- Development mode simulation when API key is missing

### 4. Middleware Session Handling

**File**: `src/lib/supabase/middleware.ts`

**Current Implementation**: Generally correct but can be optimized

**Design Enhancement**:

```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    // Set cookies on both request and response
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // CRITICAL: This refreshes the session and ensures cookies are up to date
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Protected routes logic (existing)
    if (
        !user &&
        !request.nextUrl.pathname.startsWith("/login") &&
        !request.nextUrl.pathname.startsWith("/register") &&
        !request.nextUrl.pathname.startsWith("/auth") &&
        !request.nextUrl.pathname.startsWith("/forgot-password") &&
        !request.nextUrl.pathname.startsWith("/update-password")
    ) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    // Redirect authenticated users away from auth pages
    if (
        user &&
        (request.nextUrl.pathname.startsWith("/login") ||
            request.nextUrl.pathname.startsWith("/register"))
    ) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
    }

    return supabaseResponse;
}
```

**Key Design Decisions**:
- The existing middleware is actually well-structured
- The `getUser()` call is critical - it refreshes the session
- Cookie handling in `setAll` ensures cookies are propagated correctly
- No major changes needed, but understanding the flow is important for debugging

## Data Models

No changes to existing data models. The system continues to use:

**profiles table**:
- `id` (uuid, primary key, references auth.users)
- `email` (text)
- `first_name` (text)
- `last_name` (text)
- `user_type` (text: 'super_admin' | 'college_coordinator' | 'unit_coordinator')
- `department` (text, nullable)
- `unit` (text, nullable)
- `avatar_url` (text, nullable)

**auth.users** (Supabase managed):
- Standard Supabase auth fields
- `user_metadata` (jsonb): stores first_name, last_name, user_type, department, unit


## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Password Length Requirement

*For any* generated temporary password, the password length should be at least 12 characters.

**Validates: Requirements 2.1**

### Property 2: Password Character Diversity

*For any* generated temporary password, the password should contain at least one uppercase letter, at least one lowercase letter, at least one digit, and at least one special character.

**Validates: Requirements 2.2**

### Property 3: Password Uniqueness

*For any* two consecutively generated passwords, they should be different from each other, demonstrating non-predictable generation.

**Validates: Requirements 2.5**

### Property 4: Avatar Synchronization

*For any* registered user authenticating via OAuth, if their Google avatar URL differs from their stored profile avatar URL, the profile avatar URL should be updated to match the Google avatar URL.

**Validates: Requirements 1.3**

### Property 5: Name Extraction from Email

*For any* valid cvsu.edu.ph email address in the format "prefix.firstname.lastname@cvsu.edu.ph", the system should correctly extract the first name and last name from the email prefix.

**Validates: Requirements 4.3**

### Property 6: Email Domain Validation

*For any* email address provided for coordinator registration, the system should only accept emails from the cvsu.edu.ph domain and reject all other domains.

**Validates: Requirements 8.2**

### Example Test Cases

The following are specific scenarios that should be tested as unit tests or integration tests:

**OAuth Flow Examples:**
- OAuth callback with valid code should redirect to dashboard with session cookies (Requirements 1.1, 1.2)
- OAuth callback with no code should redirect to login with error (Requirements 6.1)
- OAuth callback with failed code exchange should redirect to login with error (Requirements 6.2)
- OAuth user with no profile but valid metadata should trigger profile recovery (Requirements 1.4)
- OAuth user with no profile and no metadata should be signed out with error (Requirements 1.5)

**Email Service Examples:**
- Email HTML should contain the temporary password in a styled div (Requirements 3.2)
- Email HTML should contain a link to the login page (Requirements 3.3)
- Email HTML should contain password change instructions (Requirements 3.4)
- Email HTML should use #159E44 color for branding (Requirements 3.7)
- When API key is missing, email details should be logged to console (Requirements 3.5)
- When email sending fails, error should be logged without throwing (Requirements 3.6)

**Registration System Examples:**
- Only super_admin users should be able to register coordinators (Requirements 4.1)
- Coordinator creation should use admin client with email_confirm: true (Requirements 4.2)
- User metadata should include user_type, department, and unit (Requirements 4.4)
- Failed coordinator creation should not stop other registrations (Requirements 4.5)
- Registration should return results array with success/failure for each (Requirements 4.6)

**Middleware Examples:**
- Authenticated users visiting /login should redirect to /dashboard (Requirements 7.4)
- Unauthenticated users visiting /dashboard should redirect to /login (Requirements 7.5)
- Session cookies should have httpOnly, secure, and sameSite attributes (Requirements 7.2)

**Error Message Examples:**
- Unregistered OAuth user should see "This Google account is not registered" message (Requirements 6.3)
- Callback error should show "Authentication failed. Please try again." message (Requirements 6.4)

**OAuth Configuration Examples:**
- Google OAuth should include hd: "cvsu.edu.ph" parameter (Requirements 8.1)

## Error Handling

### OAuth Callback Errors

**Scenario**: Authorization code is missing or invalid
- **Handling**: Redirect to `/login?error=auth_callback_error`
- **User Message**: "Authentication failed. Please try again."
- **Logging**: Log the error details for debugging

**Scenario**: Code exchange fails
- **Handling**: Redirect to `/login?error=auth_callback_error`
- **User Message**: "Authentication failed. Please try again."
- **Logging**: Log the Supabase error

**Scenario**: User has no profile and no recovery metadata
- **Handling**: Sign out user, redirect to `/login?error=unregistered_oauth`
- **User Message**: "This Google account is not registered. Please contact your coordinator."
- **Logging**: Log the unregistered email attempt

**Scenario**: Profile recovery fails
- **Handling**: Redirect to `/login?error=auth_callback_error`
- **User Message**: "Authentication failed. Please try again."
- **Logging**: Log the recovery error

### Registration Errors

**Scenario**: User lacks super_admin privileges
- **Handling**: Return `{ error: "Insufficient permissions" }`
- **User Message**: Display error in UI
- **Logging**: Log unauthorized attempt with user email

**Scenario**: Individual coordinator creation fails
- **Handling**: Record error in results array, continue with other coordinators
- **User Message**: Show per-coordinator success/failure status
- **Logging**: Log the specific Supabase error

**Scenario**: Email sending fails
- **Handling**: Return error status but don't block registration
- **User Message**: Indicate email may not have been sent
- **Logging**: Log the Resend API error or network error

**Scenario**: Invalid email domain
- **Handling**: Reject during validation before API call
- **User Message**: "Please use a valid @cvsu.edu.ph email address"
- **Logging**: Log validation failure

### Session Errors

**Scenario**: Session refresh fails in middleware
- **Handling**: Treat as unauthenticated, redirect to login
- **User Message**: None (transparent redirect)
- **Logging**: Log session refresh failure

**Scenario**: Cookie setting fails
- **Handling**: Attempt to continue, may result in re-authentication
- **User Message**: None initially, may see login prompt
- **Logging**: Log cookie setting error

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and integration tests to ensure comprehensive coverage:

**Unit Tests**: Focus on individual functions and components
- Password generation logic
- Email HTML generation
- Name extraction from email
- Domain validation
- Error message formatting

**Integration Tests**: Focus on end-to-end flows
- Complete OAuth authentication flow
- Coordinator registration with email sending
- Session persistence across requests
- Middleware routing behavior

### Property-Based Testing

For universal properties that should hold across all inputs, we will use property-based testing with a minimum of 100 iterations per test.

**Testing Library**: Use `fast-check` for TypeScript/JavaScript property-based testing

**Property Test Configuration**:
```typescript
import fc from 'fast-check';

// Example property test structure
fc.assert(
  fc.property(
    fc.string(), // arbitrary input generator
    (input) => {
      // Test the property
      const result = functionUnderTest(input);
      return result.meetsProperty();
    }
  ),
  { numRuns: 100 } // minimum 100 iterations
);
```

**Property Tests to Implement**:

1. **Password Length Property** (Property 1)
   - Tag: `Feature: oauth-coordinator-registration-fix, Property 1: Password length >= 12`
   - Generate 100+ passwords, verify all have length >= 12

2. **Password Character Diversity Property** (Property 2)
   - Tag: `Feature: oauth-coordinator-registration-fix, Property 2: Password contains all character types`
   - Generate 100+ passwords, verify each contains uppercase, lowercase, digit, special char

3. **Password Uniqueness Property** (Property 3)
   - Tag: `Feature: oauth-coordinator-registration-fix, Property 3: Consecutive passwords are unique`
   - Generate 100+ password pairs, verify each pair is different

4. **Avatar Sync Property** (Property 4)
   - Tag: `Feature: oauth-coordinator-registration-fix, Property 4: Avatar URL synchronization`
   - Generate 100+ user/avatar combinations, verify avatar updates when different

5. **Name Extraction Property** (Property 5)
   - Tag: `Feature: oauth-coordinator-registration-fix, Property 5: Name extraction from email`
   - Generate 100+ valid email formats, verify correct name extraction

6. **Email Domain Validation Property** (Property 6)
   - Tag: `Feature: oauth-coordinator-registration-fix, Property 6: Email domain validation`
   - Generate 100+ email addresses with various domains, verify only cvsu.edu.ph accepted

### Unit Testing

Unit tests should cover specific examples and edge cases:

**Password Generation**:
- Test that password includes at least one of each required character type
- Test that password length is exactly 12 characters
- Test that consecutive calls produce different passwords

**Email Service**:
- Test email HTML contains password in correct format
- Test email HTML contains login link
- Test email HTML contains instructions
- Test email HTML uses correct color scheme
- Test development mode logging when API key missing
- Test error handling when API call fails

**Name Extraction**:
- Test "prefix.john.doe@cvsu.edu.ph" → firstName: "John", lastName: "Doe"
- Test "prefix.jane@cvsu.edu.ph" → firstName: "Jane", lastName: ""
- Test "prefix@cvsu.edu.ph" → firstName: "", lastName: ""

**Domain Validation**:
- Test "user@cvsu.edu.ph" → valid
- Test "user@gmail.com" → invalid
- Test "user@cvsu.edu.ph.fake.com" → invalid

### Integration Testing

Integration tests should cover end-to-end flows:

**OAuth Flow**:
- Test complete OAuth flow from button click to dashboard landing
- Test OAuth with unregistered user shows correct error
- Test OAuth with missing profile triggers recovery
- Test session persists across page navigations

**Registration Flow**:
- Test super_admin can register coordinators
- Test non-super_admin cannot register coordinators
- Test batch registration with mixed success/failure
- Test email is sent (mock Resend API)

**Middleware**:
- Test authenticated user redirected from /login to /dashboard
- Test unauthenticated user redirected from /dashboard to /login
- Test session cookies have correct attributes

### Manual Testing Checklist

After implementation, manually verify:

1. ✓ Google OAuth login works on first attempt (no double login)
2. ✓ Session persists when navigating between pages
3. ✓ Coordinator registration sends email with visible password
4. ✓ Email has professional formatting with CQER branding
5. ✓ Temporary password is 12+ characters with mixed character types
6. ✓ Only @cvsu.edu.ph emails can be registered
7. ✓ Error messages display correctly for various failure scenarios
8. ✓ UI maintains shadcn styling with small text and green colors

### Test Environment Setup

**Required Environment Variables**:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
RESEND_API_KEY=your_resend_key (optional for dev)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Test Database**:
- Use a separate Supabase project for testing
- Seed with test users (super_admin, coordinators)
- Reset database between test runs

**Mocking Strategy**:
- Mock Supabase auth methods for unit tests
- Mock Resend API for email tests
- Use real Supabase instance for integration tests (test project)
