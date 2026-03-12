"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

function sanitizeNextPath(nextPath: string | null) {
  if (!nextPath) return "/dashboard";
  if (!nextPath.startsWith("/")) return "/dashboard";
  return nextPath;
}

export default function OauthLoadingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = sanitizeNextPath(searchParams.get("next"));
  const supabase = useMemo(() => createClient(), []);
  const [message, setMessage] = useState("Checking your account...");

  useEffect(() => {
    let active = true;

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
      router.replace(nextPath);
    };

    resolveRedirect();

    return () => {
      active = false;
    };
  }, [nextPath, router, supabase]);

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
