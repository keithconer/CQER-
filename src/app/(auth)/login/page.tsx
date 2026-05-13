"use client";

import Image from "next/image";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Eye, EyeOff, Mail, Moon, Sun } from "lucide-react";
import { Loader2 } from "lucide-react";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isThemeReady, setIsThemeReady] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      router.replace(`/oauth-loading?next=${encodeURIComponent(nextPath)}`);
      router.refresh();
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setOauthLoading(true);
    const redirectBase =
      typeof window !== "undefined" ? window.location.origin : "";

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${redirectBase}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        queryParams: {
          hd: "cvsu.edu.ph",
          prompt: "select_account",
        },
      },
    });

    if (error) {
      setError(error.message);
      setOauthLoading(false);
    }
  };

  useEffect(() => {
    const warmRoutes = async () => {
      router.prefetch("/dashboard");
      router.prefetch("/oauth-loading");
    };

    const syncSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        router.replace(`/oauth-loading?next=${encodeURIComponent(nextPath)}`);
      }
    };

    warmRoutes();
    syncSession();
  }, [router, supabase, nextPath]);

  const callbackError = searchParams.get("error");

  useEffect(() => {
    const root = document.documentElement;
    const savedTheme = window.localStorage.getItem("theme");
    const preferDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const useDark = savedTheme ? savedTheme === "dark" : preferDark;
    root.classList.toggle("dark", useDark);
    setIsDark(useDark);
    setIsThemeReady(true);
  }, []);

  const handleThemeToggle = () => {
    const nextIsDark = !isDark;
    const root = document.documentElement;
    root.classList.toggle("dark", nextIsDark);
    window.localStorage.setItem("theme", nextIsDark ? "dark" : "light");
    setIsDark(nextIsDark);
  };

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
        className="fixed right-4 top-4 z-20 h-9 w-9 rounded-full border-border/70 bg-background/90 backdrop-blur-sm"
        onClick={handleThemeToggle}
        disabled={!isThemeReady}
      >
        {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
      </Button>
      <Card
        className={`border-border/60 bg-card/92 shadow-lg rounded-2xl overflow-hidden backdrop-blur-sm ${
          loading || oauthLoading ? "cursor-wait" : ""
        }`}
      >
        <CardHeader className="pt-5 pb-1.5 flex flex-col items-center space-y-2">
        <div className="relative w-20 h-20">
          <Image 
            src="/CQERFINAL.png" 
            alt="CQER Logo" 
            fill 
            className="object-contain"
            priority
          />
        </div>
        <div className="text-center space-y-0.5">
          <h2 className="text-[10px] font-bold text-foreground">Welcome to</h2>
          <p className="text-xs font-semibold text-foreground/80 tracking-tight">
            CEIT Quarterly Extension Report
          </p>
        </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
        {/* Manual Login Form */}
        <form onSubmit={handleLogin} className="space-y-2.5">
          <div className="space-y-1">
            <Label htmlFor="email" className="text-[11px] font-semibold text-foreground/90 ml-0.5">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
              <Input
                id="email"
                type="email"
                placeholder="your.email@cvsu.edu.ph"
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                className="pl-8 h-8.5 text-[11px] bg-muted/10 border-border/80 placeholder:text-[11px] placeholder:text-muted-foreground/70"
                required
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="password" className="text-[11px] font-semibold text-foreground/90 ml-0.5">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10 h-8.5 text-[11px] bg-muted/10 border-border/80 placeholder:text-[11px] placeholder:text-muted-foreground/70"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>

          {(error || callbackError) && (
            <p className="text-[11px] text-destructive font-medium">
              {error ||
                (callbackError === "unregistered_oauth"
                  ? "Account is not registered, please contact either the super admin or your college coordinator."
                  : callbackError === "auth_callback_error"
                  ? "Authentication failed. Please try again."
                  : callbackError === "session_expired"
                  ? "Session expired. Please sign in again."
                  : "Email confirmation failed. Please try again.")}
            </p>
          )}

          <Button
            type="submit"
            className="w-full h-8.5 text-[11px] font-bold bg-[#138A3B] hover:bg-[#0F7532] text-white rounded-md shadow-sm transition-all active:scale-[0.98]"
            disabled={loading || oauthLoading}
          >
            {loading ? "Signing in..." : "Login"}
          </Button>
        </form>

        <div className="relative flex items-center">
          <div className="flex-grow border-t border-border/60"></div>
          <span className="flex-shrink mx-4 text-[10px] text-muted-foreground font-medium whitespace-nowrap">
            Or
          </span>
          <div className="flex-grow border-t border-border/60"></div>
        </div>

        {/* Google OAuth */}
        <Button
          variant="outline"
          className="w-full h-8.5 text-[11px] font-semibold border-border/80 bg-background text-foreground hover:bg-muted/30 transition-all active:scale-[0.98] rounded-md shadow-sm"
          onClick={handleGoogleLogin}
          disabled={loading || oauthLoading}
        >
          <svg className="mr-2 h-3.5 w-3.5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          {oauthLoading ? "Please wait..." : "Sign-in with Google"}
        </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-5 w-5 animate-spin text-[#159E44]" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
