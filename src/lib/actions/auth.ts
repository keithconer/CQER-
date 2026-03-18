"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

function generateTempPassword(): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const allChars = lowercase + uppercase + numbers + special;
    
    let password = '';
    password += lowercase[crypto.randomInt(0, lowercase.length)];
    password += uppercase[crypto.randomInt(0, uppercase.length)];
    password += numbers[crypto.randomInt(0, numbers.length)];
    password += special[crypto.randomInt(0, special.length)];
    
    for (let i = 0; i < 8; i++) {
        password += allChars[crypto.randomInt(0, allChars.length)];
    }
    
    const passwordArray = password.split('');
    for (let i = passwordArray.length - 1; i > 0; i--) {
        const j = crypto.randomInt(0, i + 1);
        [passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]];
    }
    
    return passwordArray.join('');
}

function validateEmailDomain(email: string): boolean {
    return email.toLowerCase().endsWith('@cvsu.edu.ph');
}

function validateCoordinatorEmailFormat(email: string): boolean {
    const regex = /^main\.[a-zA-Z]+\.[a-zA-Z]+@cvsu\.edu\.ph$/;
    return regex.test(email);
}

export async function registerCoordinators(coordinators: { email: string; department: string; unit?: string; userType: string }[]) {
    try {
        const supabase = await createClient();
        const adminClient = createAdminClient();

        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) return { error: "Unauthorized" };

        const { data: profile } = await supabase
            .from("profiles")
            .select("user_type, department")
            .eq("id", currentUser.id)
            .single();

        if (!profile || (profile.user_type !== "super_admin" && profile.user_type !== "college_coordinator")) {
            if (currentUser.email !== "main.keithbrian.coner@cvsu.edu.ph") {
                return { error: "Insufficient permissions" };
            }
        }

        if (profile?.user_type === "college_coordinator") {
            const allowedTypes = new Set(["unit_coordinator", "project_leader", "extension_office"]);
            if (coordinators.some((coord) => !allowedTypes.has(coord.userType))) {
                return { error: "College coordinators can only register unit-based accounts." };
            }
            if (!profile.department) {
                return { error: "College coordinator department is not configured." };
            }
            if (coordinators.some((coord) => coord.department !== profile.department)) {
                return { error: "You can only register coordinators in your own department." };
            }
        }

        const invalidEmails = coordinators.filter(coord => !validateEmailDomain(coord.email));
        if (invalidEmails.length > 0) {
            return { 
                error: `Invalid email domain. Only @cvsu.edu.ph emails are allowed: ${invalidEmails.map(c => c.email).join(', ')}` 
            };
        }

        const invalidFormat = coordinators.filter(coord => !validateCoordinatorEmailFormat(coord.email));
        if (invalidFormat.length > 0) {
            return {
                error: `Invalid email format. Use main.firstname.lastname@cvsu.edu.ph: ${invalidFormat.map(c => c.email).join(', ')}`
            };
        }

        const missingUnits = coordinators.filter(
            (coord) => ["unit_coordinator", "project_leader", "extension_office"].includes(coord.userType) && !coord.unit
        );
        if (missingUnits.length > 0) {
            return {
                error: `Unit is required for: ${missingUnits.map(c => c.email).join(", ")}`
            };
        }

        const results = [];

        for (const coord of coordinators) {
            const tempPassword = generateTempPassword();

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
                results.push({ 
                    email: coord.email, 
                    success: false, 
                    error: error.message,
                    tempPassword: null 
                });
            } else {
                results.push({ 
                    email: coord.email, 
                    success: true,
                    tempPassword: tempPassword
                });
            }
        }

        return { results };
    } catch (err: any) {
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
