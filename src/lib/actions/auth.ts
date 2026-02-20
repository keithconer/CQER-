"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";



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

        const results = [];

        for (const coord of coordinators) {
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

            // Use inviteUserByEmail instead of createUser
            // This sends a Supabase-managed email with a link to set their password
            const redirectTo = `${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'https://cqer.vercel.app' : 'http://localhost:3000'}/update-password`;

            const { data, error } = await adminClient.auth.admin.inviteUserByEmail(coord.email, {
                redirectTo: redirectTo,
                data: {
                    first_name: firstName,
                    last_name: lastName,
                    user_type: coord.userType,
                    department: coord.department,
                    unit: coord.unit || null,
                }
            });

            if (error) {
                console.error("Invite Error:", error);
                let errorMessage = error.message;
                // Check for rate limit status (429)
                if (error.status === 429 || (error as any)?.code === 429 || error.message.toLowerCase().includes("rate limit")) {
                    errorMessage = "Rate limit reached. Please wait a while before sending more invites.";
                }
                results.push({ email: coord.email, success: false, error: errorMessage });
            } else {
                results.push({ email: coord.email, success: true });
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
