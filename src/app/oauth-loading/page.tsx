"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import Image from "next/image";

function sanitizeNextPath(nextPath: string | null) {
  if (!nextPath) return "/dashboard";
  if (!nextPath.startsWith("/")) return "/dashboard";
  return nextPath;
}

function OauthLoadingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = sanitizeNextPath(searchParams.get("next"));
  const supabase = useMemo(() => createClient(), []);
  const [message, setMessage] = useState("Checking your account...");
  const [showPreloader, setShowPreloader] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    let active = true;
    let fadeTimer: NodeJS.Timeout | null = null;
    let redirectTimer: NodeJS.Timeout | null = null;

    const resolveRedirect = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) return;

      if (!session?.user) {
        router.replace("/login?error=session_expired");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, first_name, user_type")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!active) return;

      if (!profile) {
        await supabase.auth.signOut();
        router.replace("/login?error=unregistered_oauth");
        return;
      }

      if (!profile.first_name && profile.user_type !== "super_admin") {
        const emailParam = session.user.email ? `&email=${encodeURIComponent(session.user.email)}` : "";
        router.replace(`/register?step=2${emailParam}`);
        return;
      }

      setMessage("Redirecting...");
      setShowPreloader(true);
      fadeTimer = setTimeout(() => {
        if (active) setFadeOut(true);
      }, 550);
      redirectTimer = setTimeout(() => {
        if (active) router.replace(nextPath);
      }, 900);
    };

    resolveRedirect();

    return () => {
      active = false;
      if (fadeTimer) clearTimeout(fadeTimer);
      if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, [nextPath, router, supabase]);

  if (showPreloader) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center bg-white transition-opacity duration-300 ${
          fadeOut ? "opacity-0" : "opacity-100"
        }`}
      >
        <div className="relative h-24 w-24 preloader-logo">
          <Image src="/CQERFINAL.png" alt="CQER Logo" fill className="object-contain" />
        </div>
        <p className="mt-3 text-[10px] font-medium text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm border-border/50 shadow-md">
        <CardHeader className="pt-6 pb-2 text-center">
          <p className="text-[10px] font-semibold text-foreground">Signing you in</p>
          <p className="text-[9px] text-muted-foreground">{message}</p>
        </CardHeader>
        <CardContent className="pb-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function OauthLoadingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <Card className="w-full max-w-sm border-border/50 shadow-md">
            <CardHeader className="pt-6 pb-2 text-center">
              <p className="text-[10px] font-semibold text-foreground">Signing you in</p>
              <p className="text-[9px] text-muted-foreground">Preparing your session...</p>
            </CardHeader>
            <CardContent className="pb-6 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        </div>
      }
    >
      <OauthLoadingContent />
    </Suspense>
  );
}
