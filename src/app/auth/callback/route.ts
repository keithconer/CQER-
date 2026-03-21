import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL?.toLowerCase() ?? "";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const origin = process.env.NEXT_PUBLIC_SITE_URL!;
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? "/dashboard";

    if (!code) {
        return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
    }

    const redirectUrl = `${origin}/oauth-loading?next=${encodeURIComponent(next)}`;
    const response = NextResponse.redirect(redirectUrl);

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        response.cookies.set(name, value, options);
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

    let resolvedProfile = profile;

    if (!resolvedProfile) {
        if (SUPER_ADMIN_EMAIL && user.email?.toLowerCase() === SUPER_ADMIN_EMAIL) {
            await supabase.from("profiles").upsert({
                id: user.id,
                email: user.email,
                first_name: "Keith Brian",
                last_name: "Coner",
                user_type: "super_admin",
            });
            return response;
        }

        const normalizedEmail = user.email?.toLowerCase();
        if (normalizedEmail) {
            const adminClient = createAdminClient();
            const { data: invitation } = await adminClient
                .from("coordinator_invitations")
                .select("id, email, first_name, last_name, user_type, department, unit")
                .eq("email", normalizedEmail)
                .maybeSingle();

            if (invitation) {
                const googleAvatar =
                    user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null;

                const { error: profileInsertError } = await supabase.from("profiles").upsert({
                    id: user.id,
                    email: normalizedEmail,
                    first_name: invitation.first_name,
                    last_name: invitation.last_name,
                    user_type: invitation.user_type,
                    department: invitation.department,
                    unit: invitation.unit,
                    avatar_url: googleAvatar,
                });

                if (!profileInsertError) {
                    await adminClient
                        .from("coordinator_invitations")
                        .delete()
                        .eq("id", invitation.id);

                    resolvedProfile = {
                        id: user.id,
                        user_type: invitation.user_type,
                        avatar_url: googleAvatar,
                    };
                }
            }
        }

        if (!resolvedProfile) {
            try {
                await createAdminClient().auth.admin.deleteUser(user.id);
            } catch {
                // Best effort cleanup to avoid orphaned OAuth accounts.
            }
            await supabase.auth.signOut();
            return NextResponse.redirect(`${origin}/login?error=unregistered_oauth`);
        }
    }

    const allowedTypes = new Set([
        "super_admin",
        "college_coordinator",
        "unit_coordinator",
        "project_leader",
        "extension_office",
    ]);

    if (!allowedTypes.has(resolvedProfile.user_type)) {
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
    if (googleAvatar && resolvedProfile.avatar_url !== googleAvatar) {
        await supabase
            .from("profiles")
            .update({ avatar_url: googleAvatar })
            .eq("id", user.id);
    }

    return response;
}
