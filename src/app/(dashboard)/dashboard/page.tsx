import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { UnitProjectsManagement } from "@/components/dashboard/unit-projects-management";
import { CoordinatorRegistration } from "@/components/dashboard/coordinator-registration";
import { SuperAdminOverview } from "@/components/dashboard/super-admin-overview";
import { getCollegeProjects, getProjects, getUnitProjects } from "@/lib/actions/projects";
import { getAwards } from "@/lib/actions/awards";
import { getStudentInvolvement } from "@/lib/actions/student-involvement";
import { getFacultyModuleData } from "@/lib/actions/faculty-involvement";
import { getOrdinances, getTechnologies } from "@/lib/actions/technology-ordinance";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUnitsByDepartment } from "@/lib/departments";
import { CollegeProjectsManagement } from "@/components/dashboard/college-projects-management";
import { CollegeProjectProposalsManagement } from "@/components/dashboard/college-project-proposals-management";
import { UnitProjectProposalsManagement } from "@/components/dashboard/unit-project-proposals-management";
import { ProjectProposalManagement } from "@/components/dashboard/project-proposal-management";
import { ProjectManagement } from "@/components/dashboard/project-management";
import { type ProjectProposal } from "@/components/dashboard/project-proposals-table";
import { FundingManagement } from "@/components/dashboard/funding-management";
import { UnitCoordinatorsPanel } from "@/components/dashboard/unit-coordinators-panel";
import { AwardsManagement, type AwardRecord } from "@/components/dashboard/awards-management";
import { type Project } from "@/components/dashboard/projects-table";
import {
  StudentInvolvementManagement,
  type StudentInvolvementRecord,
} from "@/components/dashboard/student-involvement-management";
import {
  FacultyInvolvementManagement,
  type FacultyInvolvementRecord,
  type PoolExpertRecord,
} from "@/components/dashboard/faculty-involvement-management";
import {
  OrdinanceResolutionsManagement,
  type OrdinanceRecord,
} from "@/components/dashboard/ordinance-resolutions-management";
import {
  TechnologiesManagement,
  type TechnologyRecord,
} from "@/components/dashboard/technologies-management";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string; panel?: string }>;
}) {
  const resolvedSearchParams = (await searchParams) || {};
  const panelParam = resolvedSearchParams.panel;
  const activeProjectView =
    resolvedSearchParams.view === "project-proposal" ? "project-proposal" : "project-registration";
  const hasEntitySelection =
    activeProjectView === "project-registration" || activeProjectView === "project-proposal";
  const activePanel =
    panelParam === "unit-coordinators" ||
    panelParam === "funding" ||
    panelParam === "awards" ||
    panelParam === "student-involvement" ||
    panelParam === "faculty-involvement" ||
    panelParam === "technologies-innovation" ||
    panelParam === "ordinance-resolutions"
      ? panelParam
      : "records";
  const hasSuperAdminSelection = panelParam === "accounts" || panelParam === "projects";
  const superAdminPanel: "accounts" | "projects" =
    panelParam === "accounts" || panelParam === "projects"
      ? panelParam
      : "projects";

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

  let projects: Project[] = [];
  let unitProjects: Project[] = [];
  let awards: AwardRecord[] = [];
  let studentInvolvementRecords: StudentInvolvementRecord[] = [];
  let facultyInvolvementRecords: FacultyInvolvementRecord[] = [];
  let poolExpertRecords: PoolExpertRecord[] = [];
  let technologyRecords: TechnologyRecord[] = [];
  let ordinanceRecords: OrdinanceRecord[] = [];
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
    if (activePanel === "awards") {
      awards = (await getAwards()).data || [];
    } else if (activePanel === "student-involvement") {
      studentInvolvementRecords = (await getStudentInvolvement()).data || [];
    } else if (activePanel === "faculty-involvement") {
      const moduleData = await getFacultyModuleData();
      facultyInvolvementRecords = moduleData.data?.faculty || [];
      poolExpertRecords = moduleData.data?.pool || [];
    } else if (activePanel === "technologies-innovation") {
      technologyRecords = (await getTechnologies()).data || [];
    } else if (activePanel === "ordinance-resolutions") {
      ordinanceRecords = (await getOrdinances()).data || [];
    } else if (activePanel === "funding" || hasEntitySelection) {
      const [myProjectsResult, unitProjectsResult] = await Promise.all([
        getProjects(),
        getUnitProjects(),
      ]);
      projects = myProjectsResult.data || [];
      unitProjects = unitProjectsResult.data || [];
    }
  } else if (
    profile.user_type === "college_coordinator" &&
    activePanel !== "unit-coordinators"
  ) {
    if (activePanel === "awards") {
      awards = (await getAwards()).data || [];
    } else if (activePanel === "student-involvement") {
      studentInvolvementRecords = (await getStudentInvolvement()).data || [];
    } else if (activePanel === "faculty-involvement") {
      const moduleData = await getFacultyModuleData();
      facultyInvolvementRecords = moduleData.data?.faculty || [];
      poolExpertRecords = moduleData.data?.pool || [];
    } else if (activePanel === "technologies-innovation") {
      technologyRecords = (await getTechnologies()).data || [];
    } else if (activePanel === "ordinance-resolutions") {
      ordinanceRecords = (await getOrdinances()).data || [];
    } else if (activePanel === "funding" || hasEntitySelection) {
      projects = (await getCollegeProjects()).data || [];
    }
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

  let allProjects: Project[] = [];

  if (profile.user_type === "super_admin") {
    const adminClient = createAdminClient();
    const [accountsResult, projectsResult] = await Promise.all([
      adminClient
        .from("profiles")
        .select("id, first_name, last_name, user_type, department, unit")
        .order("created_at", { ascending: false }),
      adminClient
        .from("projects")
        .select("id, created_by, entry_type, title, classification, sdg_goals, academic_program, major, proponents, co_project_leaders, college, collaborating_agencies, target_beneficiaries, community_location, start_date, end_date, category, funding_source, lead_units, related_curricular_offerings, visibility_scope, visible_units, budget_total, budget_requirements, gad_score, documents")
        .order("created_at", { ascending: false }),
    ]);

    allAccounts =
      (accountsResult.data as typeof allAccounts | null)?.filter(
        (account) =>
          account.user_type === "super_admin" ||
          account.user_type === "college_coordinator" ||
          account.user_type === "unit_coordinator"
      ) || [];

    allProjects = (projectsResult.data as Project[] | null) || [];
  }

  if (profile.user_type === "college_coordinator" && profile.department) {
    // Always expose all units in the department for visibility selection.
    availableUnitsForCollege = getUnitsByDepartment(profile.department);

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
          {hasSuperAdminSelection && (
            <>
              {superAdminPanel === "accounts" ? (
                <>
                  <CoordinatorRegistration
                    userType="college_coordinator"
                    title="College Coordinators"
                    description="Register emails of College coordinators for their specific departments."
                  />
                  <SuperAdminOverview
                    accounts={allAccounts}
                    projects={allProjects}
                    panel="accounts"
                    currentUserId={user.id}
                  />
                </>
              ) : activeProjectView === "project-proposal" ? (
                <ProjectProposalManagement
                  initialProjects={allProjects as ProjectProposal[]}
                  userType={userType}
                  department={profile.department}
                  unit={profile.unit}
                />
              ) : (
                <ProjectManagement
                  initialProjects={allProjects}
                  userType={userType}
                  department={profile.department}
                  unit={profile.unit}
                />
              )}
            </>
          )}
        </div>
      )}

      {userType === "college_coordinator" && (
        <div className="space-y-4">
          {activePanel === "unit-coordinators" ? (
            <UnitCoordinatorsPanel
              accounts={collegeUnitCoordinatorAccounts}
              department={profile.department}
            />
          ) : activePanel === "awards" ? (
            <AwardsManagement
              initialAwards={awards}
              department={profile.department}
              currentUserId={user.id}
            />
          ) : activePanel === "funding" ? (
            <FundingManagement
              projects={projects}
              title="Funding"
              description="Filter funding rows by Internal or External."
            />
          ) : activePanel === "student-involvement" ? (
            <StudentInvolvementManagement
              initialRecords={studentInvolvementRecords}
              department={profile.department}
              userType={userType}
              unit={profile.unit}
              unitOptions={availableUnitsForCollege}
              currentUserId={user.id}
            />
          ) : activePanel === "faculty-involvement" ? (
            <FacultyInvolvementManagement
              department={profile.department}
              facultyRecords={facultyInvolvementRecords}
              poolRecords={poolExpertRecords}
              currentUserId={user.id}
            />
          ) : activePanel === "technologies-innovation" ? (
            <TechnologiesManagement
              initialRecords={technologyRecords}
              department={profile.department}
              userType={userType}
              unit={profile.unit}
              unitOptions={availableUnitsForCollege}
              currentUserId={user.id}
            />
          ) : activePanel === "ordinance-resolutions" ? (
            <OrdinanceResolutionsManagement
              initialRecords={ordinanceRecords}
              department={profile.department}
              userType={userType}
              unit={profile.unit}
              unitOptions={availableUnitsForCollege}
              currentUserId={user.id}
            />
          ) : hasEntitySelection ? (
            activeProjectView === "project-proposal" ? (
              <CollegeProjectProposalsManagement
                initialProjects={projects}
                userType={userType}
                department={profile.department}
                unit={profile.unit}
                unitOptions={availableUnitsForCollege}
                currentUserId={user.id}
              />
            ) : (
              <CollegeProjectsManagement
                initialProjects={projects}
                userType={userType}
                department={profile.department}
                unit={profile.unit}
                unitOptions={availableUnitsForCollege}
                currentUserId={user.id}
              />
            )
          ) : null}
        </div>
      )}

      {userType === "unit_coordinator" && (
        activePanel === "awards" ? (
          <AwardsManagement
            initialAwards={awards}
            department={profile.department}
            currentUserId={user.id}
          />
        ) : activePanel === "funding" ? (
          <FundingManagement
            projects={unitProjects}
            title="Funding"
            description="Filter funding rows by Internal or External."
          />
        ) : activePanel === "student-involvement" ? (
          <StudentInvolvementManagement
            initialRecords={studentInvolvementRecords}
            department={profile.department}
            userType={userType}
            unit={profile.unit}
            unitOptions={[]}
            currentUserId={user.id}
          />
        ) : activePanel === "faculty-involvement" ? (
          <FacultyInvolvementManagement
            department={profile.department}
            facultyRecords={facultyInvolvementRecords}
            poolRecords={poolExpertRecords}
            currentUserId={user.id}
          />
        ) : activePanel === "technologies-innovation" ? (
          <TechnologiesManagement
            initialRecords={technologyRecords}
            department={profile.department}
            userType={userType}
            unit={profile.unit}
            unitOptions={[]}
            currentUserId={user.id}
          />
        ) : activePanel === "ordinance-resolutions" ? (
          <OrdinanceResolutionsManagement
            initialRecords={ordinanceRecords}
            department={profile.department}
            userType={userType}
            unit={profile.unit}
            unitOptions={[]}
            currentUserId={user.id}
          />
        ) : hasEntitySelection ? (
          activeProjectView === "project-proposal" ? (
            <UnitProjectProposalsManagement
              myProjects={projects}
              unitProjects={unitProjects}
              userType={userType}
              department={profile.department}
              unit={profile.unit}
              currentUserId={user.id}
            />
          ) : (
            <UnitProjectsManagement
              myProjects={projects}
              unitProjects={unitProjects}
              userType={userType}
              department={profile.department}
              unit={profile.unit}
              unitOptions={[]}
              currentUserId={user.id}
            />
          )
        ) : null
      )}
    </div>
  );
}
