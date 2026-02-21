import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getBaseURL } from "@/lib/utils";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const origin = getBaseURL();
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? "/dashboard";

    if (!code) {
        return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        cookieStore.set(name, value, options);
                    });
                },
            },
        }
    );

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
        return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
    }

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("id, user_type, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

    if (!profile) {
        try {
            await createAdminClient().auth.admin.deleteUser(user.id);
        } catch {
            // Best effort cleanup to avoid orphaned OAuth accounts.
        }
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login?error=unregistered_oauth`);
    }

    const allowedTypes = new Set([
        "super_admin",
        "college_coordinator",
        "unit_coordinator",
    ]);

    if (!allowedTypes.has(profile.user_type)) {
        try {
            await createAdminClient().auth.admin.deleteUser(user.id);
        } catch {
            // Best effort cleanup to avoid orphaned OAuth accounts.
        }
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login?error=unregistered_oauth`);
    }

    const googleAvatar =
        user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null;
    if (googleAvatar && profile.avatar_url !== googleAvatar) {
        await supabase
            .from("profiles")
            .update({ avatar_url: googleAvatar })
            .eq("id", user.id);
    }

    return NextResponse.redirect(`${origin}${next}`);
}
