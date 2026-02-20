# Implementation Plan: OAuth and Coordinator Registration Fix

## Overview

This implementation plan addresses two critical issues: fixing the OAuth double-login problem and enhancing the coordinator registration system with improved password security and email delivery. The implementation follows a systematic approach, starting with the OAuth fix (highest priority), then password generation improvements, and finally email enhancements.

## Tasks

- [ ] 1. Fix OAuth callback handler for proper session establishment
  - [ ] 1.1 Update OAuth callback to use createServerClient with explicit cookie handling
    - Modify `src/app/auth/callback/route.ts` to import `createServerClient` from `@supabase/ssr`
    - Replace `createClient()` call with `createServerClient` with explicit cookie configuration
    - Implement `getAll()` and `setAll()` cookie handlers in the client configuration
    - _Requirements: 1.1, 1.2_
  
  - [ ] 1.2 Add session verification after code exchange
    - After `exchangeCodeForSession()`, call `getUser()` to verify session was created
    - Only proceed with redirect if user object is returned
    - _Requirements: 1.1, 1.6_
  
  - [ ] 1.3 Explicitly set session cookies on redirect response
    - Get all cookies from cookie store after session creation
    - Create NextResponse.redirect with destination URL
    - Set each auth cookie on the response with proper options (httpOnly, secure, sameSite, maxAge)
    - Return response with cookies attached
    - _Requirements: 1.2, 7.2_
  
  - [ ]* 1.4 Write integration test for OAuth flow
    - Test complete OAuth flow from callback to dashboard redirect
    - Verify session cookies are set on response
    - Verify subsequent requests maintain session
    - _Requirements: 1.1, 1.2, 1.6_

- [ ] 2. Enhance password generation with cryptographic security
  - [ ] 2.1 Implement cryptographically secure password generator
    - Import Node.js `crypto` module in `src/lib/actions/auth.ts`
    - Define character sets (lowercase, uppercase, numbers, special chars)
    - Use `crypto.randomInt()` instead of `Math.random()`
    - Ensure at least one character from each category
    - Generate 12-character passwords (4 guaranteed + 8 random)
    - Implement Fisher-Yates shuffle to randomize character positions
    - _Requirements: 2.1, 2.2, 2.3, 2.5_
  
  - [ ]* 2.2 Write property test for password length
    - **Property 1: Password Length Requirement**
    - **Validates: Requirements 2.1**
    - Use fast-check to generate 100+ passwords
    - Verify all passwords have length >= 12
    - Tag: `Feature: oauth-coordinator-registration-fix, Property 1: Password length >= 12`
  
  - [ ]* 2.3 Write property test for password character diversity
    - **Property 2: Password Character Diversity**
    - **Validates: Requirements 2.2**
    - Use fast-check to generate 100+ passwords
    - Verify each contains uppercase, lowercase, digit, and special character
    - Tag: `Feature: oauth-coordinator-registration-fix, Property 2: Password contains all character types`
  
  - [ ]* 2.4 Write property test for password uniqueness
    - **Property 3: Password Uniqueness**
    - **Validates: Requirements 2.5**
    - Generate 100+ consecutive password pairs
    - Verify each pair contains different passwords
    - Tag: `Feature: oauth-coordinator-registration-fix, Property 3: Consecutive passwords are unique`

- [ ] 3. Checkpoint - Verify password generation and OAuth fix
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Enhance email service with improved template and error handling
  - [ ] 4.1 Update email template with professional design
    - Modify `sendRegistrationEmail()` in `src/lib/actions/auth.ts`
    - Create HTML email template with responsive design
    - Add gradient background for password display (#f0fdf4 to #dcfce7)
    - Style password with large monospace font (28px, letter-spacing: 3px)
    - Include security warning box with yellow background (#fef3c7)
    - Add green CTA button (#159E44) linking to login page
    - Include step-by-step login instructions
    - Add CQER branding and footer
    - _Requirements: 3.2, 3.3, 3.4, 3.7_
  
  - [ ] 4.2 Improve error handling and logging
    - Change return type to `Promise<{ success: boolean; error?: string }>`
    - Return success/error status instead of void
    - Enhance development mode logging with clear formatting
    - Add detailed error logging for API failures
    - Log successful email sends with email ID
    - _Requirements: 3.5, 3.6_
  
  - [ ]* 4.3 Write unit tests for email content
    - Test email HTML contains password in styled div
    - Test email HTML contains login link with correct URL
    - Test email HTML contains password change instructions
    - Test email HTML uses #159E44 color
    - Test development mode logs to console when API key missing
    - Test error handling when API call fails
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [ ] 5. Add email domain validation for coordinator registration
  - [ ] 5.1 Implement email domain validation function
    - Create validation function in `src/lib/actions/auth.ts`
    - Check email ends with "@cvsu.edu.ph"
    - Return validation error for invalid domains
    - _Requirements: 8.2, 8.3_
  
  - [ ] 5.2 Add validation to registerCoordinators function
    - Validate all coordinator emails before processing
    - Return early with error if any email has invalid domain
    - Display clear error message in UI
    - _Requirements: 8.2, 8.3_
  
  - [ ]* 5.3 Write property test for email domain validation
    - **Property 6: Email Domain Validation**
    - **Validates: Requirements 8.2**
    - Generate 100+ email addresses with various domains
    - Verify only cvsu.edu.ph emails are accepted
    - Tag: `Feature: oauth-coordinator-registration-fix, Property 6: Email domain validation`
  
  - [ ]* 5.4 Write unit tests for domain validation edge cases
    - Test "user@cvsu.edu.ph" is valid
    - Test "user@gmail.com" is invalid
    - Test "user@cvsu.edu.ph.fake.com" is invalid
    - Test "user@CVSU.EDU.PH" is valid (case insensitive)
    - _Requirements: 8.2, 8.3_

- [ ] 6. Improve OAuth error handling and user feedback
  - [ ] 6.1 Enhance error handling in OAuth callback
    - Add specific error handling for missing code
    - Add specific error handling for failed code exchange
    - Add specific error handling for unregistered users
    - Ensure all error paths redirect with appropriate error codes
    - _Requirements: 6.1, 6.2, 6.5_
  
  - [ ] 6.2 Update login page error messages
    - Verify error message for "unregistered_oauth" displays correctly
    - Verify error message for "auth_callback_error" displays correctly
    - Ensure error messages match requirements exactly
    - _Requirements: 6.3, 6.4_
  
  - [ ]* 6.3 Write unit tests for error scenarios
    - Test callback with no code redirects with error
    - Test callback with failed exchange redirects with error
    - Test unregistered user shows correct error message
    - Test callback error shows correct error message
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 7. Add property test for avatar synchronization
  - [ ]* 7.1 Write property test for avatar sync
    - **Property 4: Avatar Synchronization**
    - **Validates: Requirements 1.3**
    - Generate 100+ user/avatar URL combinations
    - Verify profile avatar updates when Google avatar differs
    - Tag: `Feature: oauth-coordinator-registration-fix, Property 4: Avatar URL synchronization`

- [ ] 8. Add property test for name extraction
  - [ ]* 8.1 Write property test for name extraction from email
    - **Property 5: Name Extraction from Email**
    - **Validates: Requirements 4.3**
    - Generate 100+ valid cvsu.edu.ph email formats
    - Verify correct first_name and last_name extraction
    - Tag: `Feature: oauth-coordinator-registration-fix, Property 5: Name extraction from email`
  
  - [ ]* 8.2 Write unit tests for name extraction edge cases
    - Test "prefix.john.doe@cvsu.edu.ph" extracts "John" and "Doe"
    - Test "prefix.jane@cvsu.edu.ph" extracts "Jane" and ""
    - Test "prefix@cvsu.edu.ph" extracts "" and ""
    - _Requirements: 4.3_

- [ ] 9. Verify middleware session handling
  - [ ] 9.1 Review middleware implementation
    - Verify `getUser()` is called to refresh session
    - Verify cookie handling in `setAll()` is correct
    - Verify redirect logic for authenticated/unauthenticated users
    - _Requirements: 7.1, 7.3, 7.4, 7.5_
  
  - [ ]* 9.2 Write integration tests for middleware behavior
    - Test authenticated user redirected from /login to /dashboard
    - Test unauthenticated user redirected from /dashboard to /login
    - Test session persists across multiple requests
    - Test session cookies have correct security attributes
    - _Requirements: 7.2, 7.3, 7.4, 7.5_

- [ ] 10. Final checkpoint - Comprehensive testing
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Update coordinator registration UI for better error feedback
  - [ ] 11.1 Enhance error display in registration component
    - Update `src/components/dashboard/coordinator-registration.tsx`
    - Display domain validation errors clearly
    - Show per-coordinator success/failure status with email send status
    - Maintain existing shadcn styling (text-[10px], text-[11px], #159E44)
    - _Requirements: 5.5, 8.3_
  
  - [ ]* 11.2 Write component tests for registration UI
    - Test multi-step flow navigation
    - Test success state display
    - Test error state display
    - Test email validation feedback
    - _Requirements: 5.4, 5.5_

## Notes

- Tasks marked with `*` are optional property-based and unit tests that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at critical milestones
- Property tests validate universal correctness properties with 100+ iterations
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end flows
- The OAuth fix (Task 1) is the highest priority and should be completed first
- Password generation (Task 2) and email improvements (Task 4) can be done in parallel after OAuth fix
- All changes maintain existing UI/UX patterns and shadcn styling
