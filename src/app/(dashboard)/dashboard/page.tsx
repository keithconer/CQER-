import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProjectManagement } from "@/components/dashboard/project-management";
import { UnitProjectsManagement } from "@/components/dashboard/unit-projects-management";
import { CoordinatorRegistration } from "@/components/dashboard/coordinator-registration";
import { SuperAdminOverview } from "@/components/dashboard/super-admin-overview";
import { getProjects, getUnitProjects } from "@/lib/actions/projects";
import { createAdminClient } from "@/lib/supabase/admin";

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

  const projects =
    profile.user_type !== "super_admin" ? (await getProjects()).data || [] : [];
  const unitProjects =
    profile.user_type === "unit_coordinator"
      ? (await getUnitProjects()).data || []
      : [];

  let allAccounts: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    user_type: "super_admin" | "college_coordinator" | "unit_coordinator";
    department: string | null;
    unit: string | null;
  }[] = [];

  let allProjects: {
    id: string;
    entry_type?: "project" | "program" | null;
    title: string;
    academic_program: string | null;
    start_date: string | null;
    end_date: string | null;
    proponents: { name: string }[] | null;
    co_project_leaders: { name: string }[] | null;
    category: "new" | "existing" | "on process" | null;
    funding_source: "internally funded" | "externally funded" | null;
    budget_total: number | null;
    budget_requirements: { name: string; amount: number }[] | null;
  }[] = [];

  if (profile.user_type === "super_admin") {
    const adminClient = createAdminClient();

    const [{ data: accountsData }, { data: projectsData }] = await Promise.all([
      adminClient
        .from("profiles")
        .select("id, first_name, last_name, user_type, department, unit")
        .order("created_at", { ascending: false }),
      adminClient
        .from("projects")
        .select("id, entry_type, title, academic_program, start_date, end_date, proponents, co_project_leaders, category, funding_source, budget_total, budget_requirements")
        .order("created_at", { ascending: false }),
    ]);

    allAccounts =
      (accountsData as typeof allAccounts | null)?.filter(
        (account) =>
          account.user_type === "super_admin" ||
          account.user_type === "college_coordinator" ||
          account.user_type === "unit_coordinator"
      ) || [];

    allProjects = (projectsData as typeof allProjects | null) || [];
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
        <div className="space-y-4">
          <CoordinatorRegistration 
            userType="college_coordinator" 
            title="College Coordinators"
            description="Register emails of College coordinators for their specific departments."
          />
          <SuperAdminOverview accounts={allAccounts} projects={allProjects} />
        </div>
      )}

      {userType === "college_coordinator" && (
        <div className="space-y-4">
          <CoordinatorRegistration 
            userType="unit_coordinator" 
            title="Unit Coordinators"
            description="Register emails of Unit coordinators for your department."
            department={profile.department}
          />
          <ProjectManagement initialProjects={projects} readOnly />
        </div>
      )}

      {userType === "unit_coordinator" && (
        <UnitProjectsManagement
          myProjects={projects}
          unitProjects={unitProjects}
        />
      )}
    </div>
  );
}
