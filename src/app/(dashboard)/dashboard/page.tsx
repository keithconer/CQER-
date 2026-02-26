import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { UnitProjectsManagement } from "@/components/dashboard/unit-projects-management";
import { CoordinatorRegistration } from "@/components/dashboard/coordinator-registration";
import { SuperAdminOverview } from "@/components/dashboard/super-admin-overview";
import { getCollegeProjects, getProjects, getUnitProjects } from "@/lib/actions/projects";
import { createAdminClient } from "@/lib/supabase/admin";
import { UNITS_BY_DEPARTMENT, type DepartmentCode } from "@/lib/departments";
import { CollegeProjectsManagement } from "@/components/dashboard/college-projects-management";
import { UnitCoordinatorsPanel } from "@/components/dashboard/unit-coordinators-panel";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string; panel?: string }>;
}) {
  const resolvedSearchParams = (await searchParams) || {};
  const activeEntityType: "project" | "program" =
    resolvedSearchParams.view === "programs" ? "program" : "project";
  const activePanel = resolvedSearchParams.panel === "unit-coordinators" ? "unit-coordinators" : "records";

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

  let projects: any[] = [];
  let unitProjects: any[] = [];
  let collegeUnitCoordinatorAccounts: {
    id: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    department: string | null;
    unit: string | null;
    created_at: string | null;
  }[] = [];

  if (profile.user_type === "unit_coordinator") {
    const [myProjectsResult, unitProjectsResult] = await Promise.all([
      getProjects(),
      getUnitProjects(),
    ]);
    projects = myProjectsResult.data || [];
    unitProjects = unitProjectsResult.data || [];
  } else if (profile.user_type === "college_coordinator" && activePanel !== "unit-coordinators") {
    projects = (await getCollegeProjects()).data || [];
  }

  let allAccounts: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    user_type: "super_admin" | "college_coordinator" | "unit_coordinator";
    department: string | null;
    unit: string | null;
  }[] = [];
  let availableUnitsForCollege: string[] = [];

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
    lead_units?: string[] | null;
    visibility_scope?: "public" | "specific_units" | null;
    visible_units?: string[] | null;
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
        .select("id, entry_type, title, academic_program, start_date, end_date, proponents, co_project_leaders, category, funding_source, lead_units, visibility_scope, visible_units, budget_total, budget_requirements")
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

  if (profile.user_type === "college_coordinator" && profile.department) {
    // Always expose all units in the department for visibility selection.
    availableUnitsForCollege = UNITS_BY_DEPARTMENT[profile.department as DepartmentCode] || [];

    if (activePanel === "unit-coordinators") {
      const adminClient = createAdminClient();
      const { data: unitAccounts } = await adminClient
        .from("profiles")
        .select("id, email, first_name, last_name, department, unit, created_at")
        .eq("user_type", "unit_coordinator")
        .eq("department", profile.department)
        .order("created_at", { ascending: false });

      collegeUnitCoordinatorAccounts = unitAccounts || [];
    }
  }

  const userType = profile.user_type;
  const firstName = profile.first_name || "User";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-sm font-semibold text-foreground/90">Dashboard</h1>
        <p className="text-xs text-muted-foreground">
          Welcome back, {firstName}
        </p>
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
          {activePanel === "unit-coordinators" ? (
            <UnitCoordinatorsPanel
              accounts={collegeUnitCoordinatorAccounts}
              department={profile.department}
            />
          ) : (
            <CollegeProjectsManagement
              initialProjects={projects}
              entityType={activeEntityType}
              userType={userType}
              department={profile.department}
              unit={profile.unit}
              unitOptions={availableUnitsForCollege}
              currentUserId={user.id}
            />
          )}
        </div>
      )}

      {userType === "unit_coordinator" && (
        <UnitProjectsManagement
          myProjects={projects}
          unitProjects={unitProjects}
          entityType={activeEntityType}
          userType={userType}
          department={profile.department}
          unit={profile.unit}
          unitOptions={[]}
        />
      )}
    </div>
  );
}
