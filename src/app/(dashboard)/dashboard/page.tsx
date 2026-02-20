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
import { CoordinatorRegistration } from "@/components/dashboard/coordinator-registration";
import { getProjects } from "@/lib/actions/projects";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
            {userType === "super_admin" 
              ? "Super Admin" 
              : userType === "college_coordinator" 
                ? "College Coordinator" 
                : "Unit Coordinator"}
          </div>
          {profile.department && (
            <p className="text-[10px] text-muted-foreground font-medium px-1">
              {profile.department} {profile.unit ? `• ${profile.unit}` : ""}
            </p>
          )}
        </div>
      </div>

      {userType === "super_admin" && (
        <CoordinatorRegistration 
          userType="college_coordinator" 
          title="College Coordinators"
          description="Register emails of College coordinators for their specific departments."
        />
      )}

      {userType === "college_coordinator" && (
        <div className="space-y-4">
          <CoordinatorRegistration 
            userType="unit_coordinator" 
            title="Unit Coordinators"
            description="Register emails of Unit coordinators for your department."
            department={profile.department}
          />
          <ProjectManagement initialProjects={projects || []} readOnly />
        </div>
      )}

      {userType === "unit_coordinator" && (
        <ProjectManagement initialProjects={projects || []} />
      )}
    </div>
  );
}
