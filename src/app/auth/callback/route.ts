import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? "/dashboard";

    if (code) {
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            // Check if profile exists, if not create one (for OAuth users)
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (user) {
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("id")
                    .eq("id", user.id)
                    .single();

                if (!profile) {
                    // Extract name from email or user metadata
                    const email = user.email || "";
                    const metadata = user.user_metadata;
                    let firstName = metadata?.first_name || metadata?.full_name?.split(" ")[0] || "";
                    let lastName = metadata?.last_name || metadata?.full_name?.split(" ").slice(1).join(" ") || "";

                    // Try parsing from CvSU email format: main.firstname.lastname@cvsu.edu.ph
                    if (!firstName && email.includes("@cvsu.edu.ph")) {
                        const parts = email.split("@")[0].split(".");
                        if (parts.length >= 3) {
                            firstName = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
                            lastName = parts[2].charAt(0).toUpperCase() + parts[2].slice(1);
                        }
                    }

                    await supabase.from("profiles").insert({
                        id: user.id,
                        email: email,
                        first_name: firstName,
                        last_name: lastName,
                        user_type: "unit_coordinator", // Default for OAuth, can be changed later
                        avatar_url: metadata?.avatar_url || metadata?.picture || null,
                    });
                }
            }

            const forwardedHost = request.headers.get("x-forwarded-host");
            const isLocalEnv = process.env.NODE_ENV === "development";

            if (isLocalEnv) {
                return NextResponse.redirect(`${origin}${next}`);
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${next}`);
            } else {
                return NextResponse.redirect(`${origin}${next}`);
            }
        }
    }

    // Return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
