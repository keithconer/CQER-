"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { getBaseURL } from "@/lib/utils";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const supabase = createClient();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${getBaseURL()}/auth/callback?next=/settings`,
      });

      if (resetError) {
        setError(resetError.message);
      } else {
        setSuccess(true);
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border/50 shadow-md rounded-2xl overflow-hidden">
      <CardHeader className="pt-6 pb-2 flex flex-col items-center space-y-3">
        <div className="relative w-20 h-20">
          <Image 
            src="/CQERFINAL.png" 
            alt="CQER Logo" 
            fill 
            className="object-contain"
            priority
          />
        </div>
        <div className="text-center space-y-1">
          <CardTitle className="text-sm font-bold">Forgot Password?</CardTitle>
          <CardDescription className="text-[10px]">
            Enter your email and we&apos;ll send you a link to reset your password.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-6 space-y-4">
        {success ? (
          <div className="space-y-4 py-4 text-center">
            <div className="w-10 h-10 rounded-full bg-[#159E44]/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-5 w-5 text-[#159E44]" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold">Check your email</p>
              <p className="text-[10px] text-muted-foreground">
                We have sent a password reset link to <br />
                <span className="font-medium text-foreground">{email}</span>
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full h-9 text-[11px] font-semibold"
              onClick={() => setSuccess(false)}
            >
              Try another email
            </Button>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-1.5">
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
                  className="pl-8 h-9 text-[11px] bg-muted/10 border-border/80"
                  required
                />
              </div>
            </div>

            {error && (
              <p className="text-[11px] text-destructive font-medium">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full h-9 text-[11px] font-bold bg-[#159E44] hover:bg-[#128A3B] text-white rounded-md shadow-sm"
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>
          </form>
        )}

        <div className="flex justify-center">
          <Link
            href="/login"
            className="inline-flex items-center text-[10px] text-muted-foreground hover:text-[#159E44] transition-colors font-medium"
          >
            <ArrowLeft className="mr-1 h-3 w-3" />
            Back to login
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
