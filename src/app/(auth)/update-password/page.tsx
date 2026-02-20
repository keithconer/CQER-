"use client";

import { createClient } from "@/lib/supabase/client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, X } from "lucide-react";

function UpdatePasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            // Session check
        }
    };
    checkSession();
  }, [router]);

  const handleUpdatePassword = async () => {
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-4 bg-card p-5 rounded-lg shadow-sm border border-border/50 relative">
        <button
          onClick={() => router.push("/dashboard")}
          className="absolute top-3 right-3 p-1 rounded-md hover:bg-muted transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>

        <div className="space-y-1 text-center">
          <h1 className="text-sm font-bold tracking-tight">Set Your Password</h1>
          <p className="text-[10px] text-muted-foreground">
            Please set a secure password for your account.
          </p>
        </div>

        {success ? (
          <div className="p-3 bg-green-50 text-green-700 rounded-md text-[10px] text-center font-medium">
             Password set successfully! Redirecting...
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold">New Password</Label>
              <Input
                type="password"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-8 text-[11px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold">Confirm Password</Label>
              <Input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-8 text-[11px]"
              />
            </div>

            {error && <p className="text-[10px] text-destructive font-medium">{error}</p>}

            <Button
              className="w-full h-8 bg-[#159E44] hover:bg-[#128A3B] text-white text-[11px] font-semibold cursor-pointer"
              onClick={handleUpdatePassword}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              Set Password
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function UpdatePasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-[#159E44]" />
      </div>
    }>
      <UpdatePasswordContent />
    </Suspense>
  );
}
