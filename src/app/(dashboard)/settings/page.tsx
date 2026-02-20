"use client";

import { useState } from "react";
import { Key, Eye, EyeOff, CheckCircle2 } from "lucide-react";
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
import { changePassword } from "@/lib/actions/auth";

export default function SettingsPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const result = await changePassword(newPassword);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-4">
      <h1 className="text-sm font-semibold text-foreground/90">Settings</h1>
      
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
            <Key className="h-3.5 w-3.5 text-[#159E44]" />
            Change Password
          </CardTitle>
          <CardDescription className="text-[10px]">
            Update your account password for better security.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <form onSubmit={handlePasswordChange} className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold">New Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-9 text-[11px] bg-muted/10 border-border/80 pr-10"
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

            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold">Confirm Password</Label>
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-9 text-[11px] bg-muted/10 border-border/80"
                required
              />
            </div>

            {error && <p className="text-[10px] text-destructive font-medium">{error}</p>}
            {success && (
              <div className="flex items-center gap-1.5 p-2 bg-[#159E44]/10 border border-[#159E44]/20 rounded-md">
                <CheckCircle2 className="h-3 w-3 text-[#159E44]" />
                <p className="text-[10px] text-[#159E44] font-medium">Password updated successfully!</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-8 text-xs bg-[#159E44] hover:bg-[#128A3B] text-white"
              disabled={loading}
            >
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
