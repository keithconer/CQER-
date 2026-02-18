import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, CheckCircle2 } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.first_name) {
    redirect("/register?step=2");
  }

  const userType = profile.user_type;
  const firstName = profile.first_name || "User";

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-sm font-semibold text-foreground/90">Dashboard</h1>
          <p className="text-xs text-muted-foreground">
            Welcome back, {firstName}
          </p>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-1">
          <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#159E44]/10 text-[#159E44] text-[10px] font-medium border border-[#159E44]/20">
            {userType === "college_coordinator" ? "College Coordinator" : "Unit Coordinator"}
          </div>
          <p className="text-[10px] text-muted-foreground font-medium px-1">
            {profile.department} {profile.unit ? `• ${profile.unit}` : ""}
          </p>
        </div>
      </div>

      {userType === "college_coordinator" ? (
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-xs font-semibold">Projects</CardTitle>
            <CardDescription className="text-[10px]">
              Manage your college extension projects
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <Button
              size="sm"
              className="text-xs h-8 bg-[#159E44] hover:bg-[#128A3B] text-white"
            >
              <Plus className="h-3 w-3 mr-1" />
              Create Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#159E44]" />
              You&apos;re logged in
            </CardTitle>
            <CardDescription className="text-[10px]">
              You&apos;re signed in as a Unit Coordinator. Your dashboard
              features are coming soon.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
