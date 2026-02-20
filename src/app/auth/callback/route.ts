import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getBaseURL } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const origin = getBaseURL();
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? "/dashboard";

    if (code) {
        const cookieStore = await cookies();
        
        // Create client with explicit cookie handling for proper session establishment
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

        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            // Verify session was actually created
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

                    // Revalidate the dashboard path to ensure fresh data
                    revalidatePath('/dashboard', 'page');
                    
                    // Create response with explicit cookie forwarding
                    const response = NextResponse.redirect(`${origin}${next}`);
                    
                    // Ensure all auth cookies are set on the response
                    const allCookies = cookieStore.getAll();
                    allCookies.forEach(cookie => {
                        response.cookies.set(cookie.name, cookie.value, {
                            path: '/',
                            httpOnly: true,
                            secure: process.env.NODE_ENV === 'production',
                            sameSite: 'lax',
                            maxAge: 60 * 60 * 24 * 7, // 7 days
                        });
                    });
                    
                    return response;
                } else {
                    // PROFILE RECOVERY LOGIC:
                    // If no profile exists, check if this was a manual sign-up attempt
                    // that failed to trigger the DB trigger (because the user already existed).
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
                            // Revalidate after profile recovery
                            revalidatePath('/dashboard', 'page');
                            
                            // Create response with cookies for recovered profile
                            const response = NextResponse.redirect(`${origin}${next}`);
                            const allCookies = cookieStore.getAll();
                            allCookies.forEach(cookie => {
                                response.cookies.set(cookie.name, cookie.value, {
                                    path: '/',
                                    httpOnly: true,
                                    secure: process.env.NODE_ENV === 'production',
                                    sameSite: 'lax',
                                    maxAge: 60 * 60 * 24 * 7,
                                });
                            });
                            return response;
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
