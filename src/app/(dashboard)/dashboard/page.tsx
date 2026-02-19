import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProjectManagement } from "@/components/dashboard/project-management";
import { getProjects } from "@/lib/actions/projects";

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

  const { data: projects } = await getProjects();

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
        <ProjectManagement initialProjects={projects || []} />
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
