import { createClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function UpdatePassword() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // When the user clicks the invite link, Supabase handles the session exchange automatically.
    // We just need to check if we have a session.
    const checkSession = async () => {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            router.push("/login?error=Invalid or expired link");
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-6 bg-white p-6 rounded-lg shadow-sm border border-border/50">
        <div className="space-y-2 text-center">
          <h1 className="text-xl font-bold tracking-tight text-[#159E44]">Set Your Password</h1>
          <p className="text-xs text-muted-foreground">
            Welcome to CQER! Please set a secure password for your account.
          </p>
        </div>

        {success ? (
          <div className="p-4 bg-green-50 text-green-700 rounded-md text-xs text-center font-medium">
             Password set successfully! Redirecting...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">New Password</Label>
              <Input
                type="password"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Confirm Password</Label>
              <Input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {error && <p className="text-xs text-destructive font-medium">{error}</p>}

            <Button
              className="w-full h-9 bg-[#159E44] hover:bg-[#128A3B] text-white text-xs font-semibold"
              onClick={handleUpdatePassword}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              Set Password & Login
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
