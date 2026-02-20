import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
    // Debug logs (will show in terminal)
    if (typeof window === 'undefined') {
        console.log("DEBUG: SUPABASE_SERVICE_ROLE_KEY present:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
        console.log("DEBUG: URL present:", !!process.env.NEXT_PUBLIC_SUPABASE_URL);
    }

    const serviceRoleKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SERVICE_ROLE_KEY ||
        process.env.SUPABASE_SERVICE_KEY;

    if (!serviceRoleKey) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing in environment variables.");
    }

    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    );
}
