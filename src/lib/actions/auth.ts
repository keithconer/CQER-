"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

        const normalizedEmails = coordinators.map((coord) => coord.email.toLowerCase());
        const duplicateEmails = normalizedEmails.filter((email, index) => normalizedEmails.indexOf(email) !== index);
        if (duplicateEmails.length > 0) {
            return {
                error: `Duplicate emails are not allowed: ${Array.from(new Set(duplicateEmails)).join(", ")}`
            };
        }

        const { data: existingProfiles, error: existingProfilesError } = await adminClient
            .from("profiles")
            .select("email")
            .in("email", normalizedEmails);

        if (existingProfilesError) {
            return { error: "Failed to validate existing accounts." };
        }

        const existingProfileEmails = new Set((existingProfiles || []).map((profile) => profile.email?.toLowerCase()));

        const results = [];

        for (const coord of coordinators) {
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

            if (existingProfileEmails.has(coord.email.toLowerCase())) {
                results.push({
                    email: coord.email,
                    success: false,
                    error: "This account already exists and can already sign in."
                });
                continue;
            }

            const { error } = await adminClient
                .from("coordinator_invitations")
                .upsert({
                    email: coord.email.toLowerCase(),
                    first_name: firstName,
                    last_name: lastName,
                    user_type: coord.userType,
                    department: coord.department,
                    unit: coord.unit || null,
                    invited_by: currentUser.id,
                }, {
                    onConflict: "email",
                });

            if (error) {
                results.push({ 
                    email: coord.email, 
                    success: false, 
                    error: error.message,
                });
            } else {
                results.push({ 
                    email: coord.email, 
                    success: true,
                    activationRequired: true,
                });
            }
        }

        return { results };
    } catch (err: unknown) {
        return {
            error: err instanceof Error
                ? err.message
                : "An unexpected error occurred during registration"
        };
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
