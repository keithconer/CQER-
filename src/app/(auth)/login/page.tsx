"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getBaseURL } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Mail } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

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

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${getBaseURL()}/auth/callback`,
        queryParams: {
          hd: "cvsu.edu.ph",
        },
      },
    });

    if (error) {
      setError(error.message);
    }
  };

  // Check for callback errors
  const searchParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;
  const callbackError = searchParams?.get("error");

  return (
    <Card className="border-border/50 shadow-md rounded-2xl overflow-hidden">
      <CardHeader className="pt-8 pb-4 flex flex-col items-center space-y-4">
        <div className="relative w-24 h-24">
          <Image 
            src="/CQERFINAL.png" 
            alt="CQER Logo" 
            fill 
            className="object-contain"
            priority
          />
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-xs font-bold text-foreground">Welcome to</h2>
          <p className="text-sm font-semibold text-foreground/80 tracking-tight">
            CEIT Quarterly Extension Report
          </p>
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-10 space-y-6">
        {/* Manual Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-[11px] font-semibold text-foreground/90 ml-0.5">
              Email:
            </Label>
            <div className="relative">
              <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
              <Input
                id="email"
                type="email"
                placeholder="your.email@cvsu.edu.ph"
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                className="pl-8 h-9 text-[11px] bg-muted/10 border-border/80 placeholder:text-[11px] placeholder:text-muted-foreground/70"
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
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
                className="pr-10 h-9 text-[11px] bg-muted/10 border-border/80 placeholder:text-[11px] placeholder:text-muted-foreground/70"
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
                  ? "This Google account is not registered. Please register with your CvSU email first."
                  : callbackError === "auth_callback_error"
                  ? "Authentication failed. Please try again."
                  : "Email confirmation failed. Please try again.")}
            </p>
          )}

          <Button
            type="submit"
            className="w-full h-9 text-[11px] font-bold bg-[#159E44] hover:bg-[#128A3B] text-white rounded-md shadow-sm transition-all active:scale-[0.98]"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign-in"}
          </Button>
        </form>

        <div className="relative flex items-center">
          <div className="flex-grow border-t border-border/60"></div>
          <span className="flex-shrink mx-4 text-[10px] text-muted-foreground font-medium whitespace-nowrap">
            One click sign-in process with
          </span>
          <div className="flex-grow border-t border-border/60"></div>
        </div>

        {/* Google OAuth */}
        <Button
          variant="outline"
          className="w-full h-9 text-[11px] font-semibold border-border/80 bg-background text-foreground hover:bg-muted/30 transition-all active:scale-[0.98] rounded-md shadow-sm"
          onClick={handleGoogleLogin}
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
          Sign-in with Google
        </Button>

        <p className="text-center text-[10px] text-muted-foreground">
          Doesn&apos;t have an account yet?{" "}
          <Link
            href="/register"
            className="text-[#159E44] hover:underline font-semibold"
          >
            Register
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
