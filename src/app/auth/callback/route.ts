import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBaseURL } from "@/lib/utils";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const origin = getBaseURL();
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? "/dashboard";

    if (code) {
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            // Check if profile exists
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (user) {
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("id")
                    .eq("id", user.id)
                    .single();

                if (profile) {
                    // Profile exists, go to dashboard
                    return NextResponse.redirect(`${origin}${next}`);
                } else {
                    // No profile, redirect to complete registration from step 2
                    return NextResponse.redirect(`${origin}/register?step=2`);
                }
            }
        }
    }

    // Return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
