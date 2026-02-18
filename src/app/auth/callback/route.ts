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
                    // PROFILE RECOVERY LOGIC:
                    // If no profile exists, check if this was a manual sign-up attempt
                    // that failed to trigger the DB trigger (bacause the user already existed).
                    const metaData = user.user_metadata;
                    if (metaData && metaData.user_type) {
                        const { error: recoveryError } = await supabase.from("profiles").insert({
                            id: user.id,
                            email: user.email!,
                            first_name: metaData.first_name || "",
                            last_name: metaData.last_name || "",
                            user_type: metaData.user_type,
                            avatar_url: metaData.avatar_url || metaData.picture || null,
                        });

                        if (!recoveryError) {
                            return NextResponse.redirect(`${origin}${next}`);
                        }
                    }

                    // RESTRICTION: Google Sign-in is for registered users only.
                    // If no profile exists and no recovery metadata, sign out and error.
                    await supabase.auth.signOut();
                    return NextResponse.redirect(`${origin}/login?error=unregistered_oauth`);
                }
            }
        }
    }

    // Return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
