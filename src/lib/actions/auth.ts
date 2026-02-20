"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function generateTempPassword() {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 10; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

async function sendRegistrationEmail(email: string, tempPassword: string, firstName: string, userType: string) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        console.log("--- Simulated Email (RESEND_API_KEY missing) ---");
        console.log(`To: ${email}`);
        console.log(`Subject: Your CQER Account Credentials`);
        console.log(`Body: Hello ${firstName || 'Coordinator'}, your temporary password for CQER (${userType.replace('_', ' ')}) is: ${tempPassword}`);
        console.log("----------------------------------------------");
        return;
    }

    const roleName = userType === 'college_coordinator' ? 'College Coordinator' : 'Unit Coordinator';

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
                subject: 'Temporary Account Credentials - CQER Platform',
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                        <h2 style="color: #159E44; margin-bottom: 16px;">Welcome to CQER!</h2>
                        <p style="font-size: 14px; color: #475569;">Hello ${firstName || 'Coordinator'},</p>
                        <p style="font-size: 14px; color: #475569;">An account has been created for you as a <strong>${roleName}</strong> on the CvSU CQER Platform.</p>
                        
                        <div style="background-color: #f8fafc; padding: 16px; border-radius: 6px; margin: 24px 0;">
                            <p style="margin: 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: bold; letter-spacing: 0.05em;">Temporary Password</p>
                            <p style="margin: 8px 0 0; font-size: 24px; font-family: monospace; color: #159E44; font-weight: bold; letter-spacing: 2px;">${tempPassword}</p>
                        </div>
                        
                        <p style="font-size: 14px; color: #475569;">For security reasons, we recommend that you change your password immediately after your first login.</p>
                        
                        <div style="margin-top: 32px;">
                            <a href="https://cqer.vercel.app/login" style="background-color: #159E44; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 14px;">Log in to your Dashboard</a>
                        </div>
                        
                        <hr style="margin-top: 40px; border: 0; border-top: 1px solid #e2e8f0;" />
                        <p style="font-size: 12px; color: #94a3b8; text-align: center;">This is an automated message. Please do not reply directly to this email.</p>
                    </div>
                `
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error("Resend API Error:", error);
        }
    } catch (err) {
        console.error("Failed to send email:", err);
    }
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
                results.push({ email: coord.email, success: false, error: error.message });
            } else {
                results.push({ email: coord.email, success: true, tempPassword });
                // Send automated email (don't await so it doesn't slow down the response)
                sendRegistrationEmail(coord.email, tempPassword, firstName, coord.userType);
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
