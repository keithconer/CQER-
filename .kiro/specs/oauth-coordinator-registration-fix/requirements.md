# Requirements Document

## Introduction

This specification addresses two critical issues in the CEIT Quarterly Extension Report (CQER) system: fixing the Google OAuth double-login problem and improving the coordinator registration flow with secure temporary password delivery. The system is a Next.js application using Supabase for authentication and PostgreSQL database, managing role-based access for super admins, college coordinators, and unit coordinators.

## Glossary

- **OAuth_Handler**: The authentication callback system that processes Google OAuth responses
- **Session_Manager**: The Supabase session management system handling user authentication state
- **Coordinator_Registration_System**: The system component responsible for creating coordinator accounts
- **Password_Generator**: The component that generates cryptographically secure temporary passwords
- **Email_Service**: The Resend API integration for sending registration emails
- **Super_Admin**: User with email main.keithbrian.coner@cvsu.edu.ph who can register coordinators
- **College_Coordinator**: User role managing college-level extension reports
- **Unit_Coordinator**: User role managing unit-level extension reports
- **Temporary_Password**: A randomly generated secure password sent to new coordinators
- **Profile_Recovery**: The mechanism to create missing profile records for existing auth users
- **Middleware**: The Next.js middleware that manages session refresh and route protection

## Requirements

### Requirement 1: Fix OAuth Double-Login Issue

**User Story:** As a coordinator, I want to sign in with Google once and be redirected to my dashboard, so that I don't have to authenticate twice.

#### Acceptance Criteria

1. WHEN a user completes Google OAuth authentication THEN the OAuth_Handler SHALL exchange the authorization code for a session and redirect to the dashboard without requiring a second login
2. WHEN the OAuth_Handler receives a valid authorization code THEN the Session_Manager SHALL establish a persistent session with proper cookie configuration
3. WHEN a registered user authenticates via OAuth THEN the system SHALL sync their Google avatar to their profile if it has changed
4. IF an OAuth user has no profile record but has valid user_metadata THEN the Profile_Recovery SHALL create the missing profile and allow access
5. IF an OAuth user has no profile record and no recovery metadata THEN the OAuth_Handler SHALL sign out the user and redirect to login with error "unregistered_oauth"
6. WHEN the OAuth callback completes successfully THEN the Middleware SHALL maintain the session across subsequent requests without requiring re-authentication

### Requirement 2: Generate Secure Temporary Passwords

**User Story:** As the system, I want to generate cryptographically secure temporary passwords, so that new coordinator accounts are protected.

#### Acceptance Criteria

1. WHEN a coordinator account is created THEN the Password_Generator SHALL generate a password with minimum 12 characters
2. THE Password_Generator SHALL include uppercase letters, lowercase letters, numbers, and special characters in generated passwords
3. THE Password_Generator SHALL use cryptographically secure random number generation
4. FOR ALL generated passwords, each character SHALL be selected from the character set with equal probability
5. THE Password_Generator SHALL NOT use predictable patterns or sequences in password generation

### Requirement 3: Send Registration Emails with Temporary Passwords

**User Story:** As a newly registered coordinator, I want to receive an email with my temporary password clearly displayed, so that I can log in to the system.

#### Acceptance Criteria

1. WHEN a coordinator account is created THEN the Email_Service SHALL send a registration email to the coordinator's email address
2. THE Email_Service SHALL display the temporary password prominently in the email body with clear visual formatting
3. THE Email_Service SHALL include a direct link to the login page in the email
4. THE Email_Service SHALL include instructions to change the password after first login
5. WHEN the Resend API key is not configured THEN the system SHALL log the email details to the console for development purposes
6. WHEN the Email_Service fails to send an email THEN the system SHALL log the error details without blocking the registration process
7. THE Email_Service SHALL use professional email formatting with the CQER branding and green color scheme (#159E44)

### Requirement 4: Create Coordinator Accounts via Admin API

**User Story:** As a super admin, I want to register multiple coordinators at once, so that I can efficiently onboard new users.

#### Acceptance Criteria

1. WHEN the Super_Admin submits coordinator registration data THEN the Coordinator_Registration_System SHALL validate that the current user has super_admin privileges
2. WHEN creating a coordinator account THEN the system SHALL use the Supabase Admin client to create the user with email_confirm set to true
3. WHEN creating a coordinator account THEN the system SHALL extract first_name and last_name from the email prefix
4. WHEN creating a coordinator account THEN the system SHALL store user_type, department, and unit in user_metadata
5. WHEN a coordinator account creation fails THEN the system SHALL record the error for that specific coordinator without stopping other registrations
6. WHEN all coordinator registrations complete THEN the system SHALL return a results array indicating success or failure for each coordinator

### Requirement 5: Maintain Existing UI/UX Patterns

**User Story:** As a user, I want the registration interface to maintain the existing design language, so that the experience is consistent.

#### Acceptance Criteria

1. THE Coordinator_Registration_System SHALL use shadcn/ui components for all UI elements
2. THE Coordinator_Registration_System SHALL use text sizes of text-[10px] and text-[11px] for consistency
3. THE Coordinator_Registration_System SHALL use the green primary color #159E44 for buttons and accents
4. THE Coordinator_Registration_System SHALL maintain the existing multi-step registration flow
5. THE Coordinator_Registration_System SHALL display success and error states with appropriate visual feedback

### Requirement 6: Handle OAuth Edge Cases

**User Story:** As a system administrator, I want the OAuth flow to handle edge cases gracefully, so that users receive clear error messages.

#### Acceptance Criteria

1. WHEN the OAuth callback receives no authorization code THEN the OAuth_Handler SHALL redirect to login with error "auth_callback_error"
2. WHEN the code exchange fails THEN the OAuth_Handler SHALL redirect to login with error "auth_callback_error"
3. WHEN an unregistered user attempts OAuth login THEN the system SHALL display the message "This Google account is not registered. Please contact your coordinator."
4. WHEN a callback error occurs THEN the system SHALL display the message "Authentication failed. Please try again."
5. THE OAuth_Handler SHALL only allow email addresses from the cvsu.edu.ph domain

### Requirement 7: Ensure Session Persistence

**User Story:** As a coordinator, I want my login session to persist across page navigations, so that I don't get logged out unexpectedly.

#### Acceptance Criteria

1. WHEN the Middleware processes a request THEN the Session_Manager SHALL refresh the user session
2. WHEN setting authentication cookies THEN the Session_Manager SHALL configure cookies with appropriate security options
3. WHEN a user navigates between pages THEN the Middleware SHALL maintain the session without requiring re-authentication
4. WHEN an authenticated user visits /login or /register THEN the Middleware SHALL redirect them to /dashboard
5. WHEN an unauthenticated user visits protected routes THEN the Middleware SHALL redirect them to /login

### Requirement 8: Validate Email Domains

**User Story:** As a system administrator, I want to ensure only cvsu.edu.ph email addresses can be registered, so that access is restricted to authorized users.

#### Acceptance Criteria

1. WHEN a user attempts Google OAuth login THEN the OAuth_Handler SHALL include the hd parameter set to "cvsu.edu.ph"
2. THE Coordinator_Registration_System SHALL accept coordinator emails only from the cvsu.edu.ph domain
3. WHEN an invalid email domain is provided THEN the system SHALL reject the registration with an appropriate error message
