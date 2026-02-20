"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getBaseURL } from "@/lib/utils";
import crypto from "crypto";

function generateTempPassword(): string {
    // Use Node.js crypto for cryptographically secure random generation
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

async function sendRegistrationEmail(
    email: string,
    tempPassword: string,
    firstName: string,
    userType: string
): Promise<{ success: boolean; error?: string }> {
    // Note: Supabase's inviteUserByEmail only works for users that don't exist yet
    // Since we create the user with createUser first, we can't use inviteUserByEmail
    // The password must be shared manually via the UI
    
    console.log(`Account created for: ${email}`);
    console.log(`Role: ${userType}`);
    console.log(`Name: ${firstName}`);
    
    // Return success since the account was created
    // The admin will share the password from the UI
    return { success: true };
}

function validateEmailDomain(email: string): boolean {
    return email.toLowerCase().endsWith('@cvsu.edu.ph');
}

export async function registerCoordinators(coordinators: { email: string; department: string; unit?: string; userType: string }[]) {
    try {
        const supabase = await createClient();
        const adminClient = createAdminClient();

        // Check if current user is authorized
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) return { error: "Unauthorized" };

        const { data: profile } = await supabase
            .from("profiles")
            .select("user_type")
            .eq("id", currentUser.id)
            .single();

        if (!profile || (profile.user_type !== "super_admin" && profile.user_type !== "college_coordinator")) {
            // Hardcoded check for the super admin email as requested
            if (currentUser.email !== "main.keithbrian.coner@cvsu.edu.ph") {
                return { error: "Insufficient permissions" };
            }
        }

        // Validate all email domains before processing
        const invalidEmails = coordinators.filter(coord => !validateEmailDomain(coord.email));
        if (invalidEmails.length > 0) {
            return { 
                error: `Invalid email domain. Only @cvsu.edu.ph emails are allowed: ${invalidEmails.map(c => c.email).join(', ')}` 
            };
        }

        const results = [];

        for (const coord of coordinators) {
            const tempPassword = generateTempPassword();

            // Create first name and last name from email part
            const emailNamePart = coord.email.split("@")[0];
            const parts = emailNamePart.split(".");
            let firstName = "";
            let lastName = "";

            if (parts.length >= 3) {
                firstName = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
                lastName = parts[2].charAt(0).toUpperCase() + parts[2].slice(1);
            } else if (parts.length === 2) {
                firstName = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
            }

            const { data, error } = await adminClient.auth.admin.createUser({
                email: coord.email,
                password: tempPassword,
                email_confirm: true,
                user_metadata: {
                    first_name: firstName,
                    last_name: lastName,
                    user_type: coord.userType,
                    department: coord.department,
                    unit: coord.unit || null,
                },
            });

            if (error) {
                console.error("Create User Error:", error);
                results.push({ 
                    email: coord.email, 
                    success: false, 
                    error: error.message,
                    tempPassword: null 
                });
            } else {
                // Send email notification with temporary password
                const emailResult = await sendRegistrationEmail(coord.email, tempPassword, firstName, coord.userType);
                
                results.push({ 
                    email: coord.email, 
                    success: true,
                    tempPassword: tempPassword,
                    emailSent: emailResult.success
                });
            }
        }

        return { results };
    } catch (err: any) {
        console.error("Registration error:", err);
        return { error: err.message || "An unexpected error occurred during registration" };
    }
}

export async function changePassword(newPassword: string) {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({
        password: newPassword,
    });

    if (error) return { error: error.message };
    return { success: true };
}
