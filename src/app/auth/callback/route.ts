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
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (user) {
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", user.id)
                    .single();

                if (profile) {
                    // Sync avatar from Google if it exists and profile doesn't have one or it changed
                    const googleAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture;
                    if (googleAvatar && profile.avatar_url !== googleAvatar) {
                        await supabase
                            .from("profiles")
                            .update({ avatar_url: googleAvatar })
                            .eq("id", user.id);
                    }

                    // Registered user, go to dashboard
                    return NextResponse.redirect(`${origin}${next}`);
                } else {
                    // RESTRICTION: Google Sign-in is for registered users only.
                    // If no profile exists, sign out and redirect to login with error.
                    await supabase.auth.signOut();
                    return NextResponse.redirect(`${origin}/login?error=unregistered_oauth`);
                }
            }
        }
    }

    // Return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
