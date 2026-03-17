import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { UnitProjectsManagement } from "@/components/dashboard/unit-projects-management";
import { CoordinatorRegistration } from "@/components/dashboard/coordinator-registration";
import { getCollegeProjects, getProjects, getUnitProjects } from "@/lib/actions/projects";
import { getAwards } from "@/lib/actions/awards";
import { getStudentInvolvement } from "@/lib/actions/student-involvement";
import { getFacultyModuleData } from "@/lib/actions/faculty-involvement";
import { getOrdinances, getTechnologies } from "@/lib/actions/technology-ordinance";
import { getTrainings } from "@/lib/actions/trainings";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAllUnits, getUnitsByDepartment } from "@/lib/departments";
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
import { TrainingsManagement } from "@/components/dashboard/trainings-management";
import { type TrainingRecord } from "@/components/dashboard/trainings-form";
import { AccountsTable } from "@/components/dashboard/accounts-table";
import { TransferCoordinatorPanel } from "@/components/dashboard/transfer-coordinator-panel";
import { DashboardAnalytics } from "@/components/dashboard/dashboard-analytics";

function extractPartnerAgencyNames(projects: Project[]) {
  const values = new Set<string>();
  projects.forEach((project) => {
    const source = (project as unknown as Record<string, unknown>).partner_agencies;
    if (!Array.isArray(source)) return;
    source.forEach((item) => {
      if (typeof item === "string") {
        const normalized = item.trim();
        if (normalized) values.add(normalized);
        return;
      }
      if (item && typeof item === "object") {
        const maybeName =
          typeof (item as { agency_name?: unknown }).agency_name === "string"
            ? (item as { agency_name: string }).agency_name.trim()
            : "";
        if (maybeName) values.add(maybeName);
      }
    });
  });
  return Array.from(values).sort((a, b) => a.localeCompare(b));
}

function getFundingType(project: Project) {
  const source = (project.funding_source || "").toLowerCase();
  if (source.includes("external")) return "external" as const;
  if (source.includes("internal")) return "internal" as const;
  const fundingData = (project.funding_data || {}) as Record<string, unknown>;
  const hasExternalHints =
    Number(fundingData.external_approved_budget_cvsu || 0) > 0 ||
    Number(fundingData.external_counterpart_budget_cvsu || 0) > 0 ||
    Boolean(fundingData.external_funding_agency) ||
    Boolean(fundingData.external_function_nature);
  return hasExternalHints ? "external" : "internal";
}

function countFunding(projects: Project[]) {
  return projects.reduce(
    (acc, project) => {
      const type = getFundingType(project);
      if (type === "internal") acc.internal += 1;
      if (type === "external") acc.external += 1;
      return acc;
    },
    { internal: 0, external: 0 }
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string; panel?: string; account?: string }>;
}) {
  const resolvedSearchParams = (await searchParams) || {};
  const panelParam = resolvedSearchParams.panel;
  const accountViewParam = resolvedSearchParams.account;
  const activeProjectView =
    resolvedSearchParams.view === "project-proposal" ? "project-proposal" : "project-registration";
  const accountView = accountViewParam === "transfer" ? "transfer" : "register";
  const accountPanelSelected = panelParam === "account-management" || panelParam === "accounts";
  const activePanel =
    panelParam === "overview" ||
    panelParam === "records" ||
    panelParam === "unit-coordinators" ||
    panelParam === "account-management" ||
    panelParam === "accounts" ||
    panelParam === "funding" ||
    panelParam === "awards" ||
    panelParam === "student-involvement" ||
    panelParam === "faculty-involvement" ||
    panelParam === "technologies-innovation" ||
    panelParam === "ordinance-resolutions" ||
    panelParam === "trainings" ||
    panelParam === "projects"
      ? panelParam
      : "overview";
  const hasEntitySelection =
    activePanel === "records" &&
    (activeProjectView === "project-registration" || activeProjectView === "project-proposal");
  const hasSuperAdminSelection =
    panelParam === "projects" || panelParam === "records";
  const superAdminPanel: "projects" | "trainings" =
    panelParam === "projects" || panelParam === "trainings"
      ? panelParam
      : "projects";
  const showOverview = activePanel === "overview";

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
  let trainingRecords: TrainingRecord[] = [];
  let trainingPartnerAgencyOptions: string[] = [];
  let collegeUnitCoordinatorAccounts: {
    id: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    user_type: "unit_coordinator";
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
    } else if (activePanel === "trainings") {
      trainingRecords = (await getTrainings()).data || [];
      const visibleProjects = (await getUnitProjects()).data || [];
      trainingPartnerAgencyOptions = extractPartnerAgencyNames(visibleProjects);
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
    } else if (activePanel === "trainings") {
      trainingRecords = (await getTrainings()).data || [];
      const visibleProjects = (await getCollegeProjects()).data || [];
      trainingPartnerAgencyOptions = extractPartnerAgencyNames(visibleProjects);
    } else if (activePanel === "funding" || hasEntitySelection) {
      projects = (await getCollegeProjects()).data || [];
    }
  }

  let allAccounts: {
    id: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    user_type: "super_admin" | "college_coordinator" | "unit_coordinator";
    department: string | null;
    unit: string | null;
  }[] = [];
  let availableUnitsForCollege: string[] = [];
  let availableUnitsForSuperAdmin: string[] = [];

  let allProjects: Project[] = [];
  let analyticsUsers = 0;
  let analyticsInternalFunding = 0;
  let analyticsExternalFunding = 0;
  let analyticsTrainings = 0;
  let analyticsTotalBudget = 0;
  let analyticsInternalBudget = 0;
  let analyticsExternalBudget = 0;
  let analyticsMoaExisting = 0;
  let analyticsMoaCompleted = 0;
  let analyticsMoaNew = 0;
  let analyticsScopeLabel = "Based on your current visibility.";

  if (profile.user_type === "super_admin") {
    const adminClient = createAdminClient();
    const { data: accountsData } = await adminClient
      .from("profiles")
      .select("id, email, first_name, last_name, user_type, department, unit")
      .order("created_at", { ascending: false });

    allAccounts =
      (accountsData as typeof allAccounts | null)?.filter(
        (account) =>
          account.user_type === "super_admin" ||
          account.user_type === "college_coordinator" ||
          account.user_type === "unit_coordinator"
      ) || [];

    availableUnitsForSuperAdmin = getAllUnits();

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
    } else if (activePanel === "trainings" || superAdminPanel === "trainings") {
      trainingRecords = (await getTrainings()).data || [];
      const { data: projectsData } = await adminClient.from("projects").select("*");
      trainingPartnerAgencyOptions = extractPartnerAgencyNames((projectsData as Project[] | null) || []);
    } else if (activePanel === "funding" || hasEntitySelection || superAdminPanel === "projects") {
      const { data: projectsData } = await adminClient
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      const rawProjects = (projectsData as Project[] | null) || [];
      const creatorIds = Array.from(
        new Set(rawProjects.map((project) => project.created_by).filter(Boolean))
      );
      let creatorMap = new Map<
        string,
        { user_type: "super_admin" | "college_coordinator" | "unit_coordinator"; unit: string | null }
      >();
      if (creatorIds.length > 0) {
        const { data: creatorProfiles } = await adminClient
          .from("profiles")
          .select("id, user_type, unit")
          .in("id", creatorIds);
        creatorMap = new Map(
          (creatorProfiles || []).map((profile) => [
            profile.id,
            { user_type: profile.user_type, unit: profile.unit },
          ])
        );
      }

      allProjects =
        rawProjects.map((project) => {
          const creator = creatorMap.get(project.created_by as string);
          return {
            ...project,
            created_by_user_type: creator?.user_type || null,
            created_by_unit: creator?.unit || null,
          };
        }) || [];
      projects = allProjects;
    }

    const { data: analyticsProjects } = await adminClient
      .from("projects")
      .select("id, funding_source, funding_data, budget_total, budget_requirements, category");
    const resolvedAnalyticsProjects = (analyticsProjects as Project[] | null) || [];
    const fundingCounts = countFunding(resolvedAnalyticsProjects);
    analyticsInternalFunding = fundingCounts.internal;
    analyticsExternalFunding = fundingCounts.external;
    const budgetTotals = resolvedAnalyticsProjects.reduce(
      (acc, project) => {
        const budgetFromTotal =
          typeof project.budget_total === "number" ? project.budget_total : 0;
        const budgetFromItems = Array.isArray(project.budget_requirements)
          ? project.budget_requirements.reduce(
              (sum, item) => sum + (Number(item?.amount) || 0),
              0
            )
          : 0;
        const budget = budgetFromTotal > 0 ? budgetFromTotal : budgetFromItems;
        acc.total += budget;
        const type = getFundingType(project);
        if (type === "internal") acc.internal += budget;
        if (type === "external") acc.external += budget;
        const category = (project.category || "").toLowerCase();
        if (category === "new") acc.moaNew += 1;
        if (category === "completed") acc.moaCompleted += 1;
        if (category === "existing" || category === "existing/ongoing") acc.moaExisting += 1;
        return acc;
      },
      { total: 0, internal: 0, external: 0, moaExisting: 0, moaCompleted: 0, moaNew: 0 }
    );
    analyticsTotalBudget = budgetTotals.total;
    analyticsInternalBudget = budgetTotals.internal;
    analyticsExternalBudget = budgetTotals.external;
    analyticsMoaExisting = budgetTotals.moaExisting;
    analyticsMoaCompleted = budgetTotals.moaCompleted;
    analyticsMoaNew = budgetTotals.moaNew;

    const [{ count: usersCount }, { count: trainingsCount }] =
      await Promise.all([
        adminClient
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .in("user_type", ["super_admin", "college_coordinator", "unit_coordinator"]),
        adminClient.from("trainings").select("id", { count: "exact", head: true }),
      ]);

    analyticsUsers = usersCount ?? 0;
    analyticsTrainings = trainingsCount ?? 0;
    analyticsScopeLabel = "University-wide activity and funding summary.";
  }

  if (profile.user_type === "college_coordinator" && profile.department) {
    // Always expose all units in the department for visibility selection.
    availableUnitsForCollege = getUnitsByDepartment(profile.department);

    if (activePanel === "unit-coordinators" || accountPanelSelected) {
      const adminClient = createAdminClient();
      const { data: unitAccounts } = await adminClient
        .from("profiles")
        .select("id, email, first_name, last_name, user_type, department, unit, created_at")
        .eq("user_type", "unit_coordinator")
        .eq("department", profile.department)
        .order("created_at", { ascending: false });

      collegeUnitCoordinatorAccounts = unitAccounts || [];
    }

    const adminClient = createAdminClient();
    const { count: usersCount } = await adminClient
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .in("user_type", ["college_coordinator", "unit_coordinator"])
      .eq("department", profile.department);
    analyticsUsers = usersCount ?? 0;

    let analyticsProjects = projects;
    if (analyticsProjects.length === 0) {
      analyticsProjects = (await getCollegeProjects()).data || [];
    }
    const fundingCounts = countFunding(analyticsProjects);
    analyticsInternalFunding = fundingCounts.internal;
    analyticsExternalFunding = fundingCounts.external;

    const trainings =
      trainingRecords.length > 0 ? trainingRecords : (await getTrainings()).data || [];
    analyticsTrainings = trainings.length;
    const budgetTotals = analyticsProjects.reduce(
      (acc, project) => {
        const budgetFromTotal =
          typeof project.budget_total === "number" ? project.budget_total : 0;
        const budgetFromItems = Array.isArray(project.budget_requirements)
          ? project.budget_requirements.reduce(
              (sum, item) => sum + (Number(item?.amount) || 0),
              0
            )
          : 0;
        const budget = budgetFromTotal > 0 ? budgetFromTotal : budgetFromItems;
        acc.total += budget;
        const type = getFundingType(project);
        if (type === "internal") acc.internal += budget;
        if (type === "external") acc.external += budget;
        const category = (project.category || "").toLowerCase();
        if (category === "new") acc.moaNew += 1;
        if (category === "completed") acc.moaCompleted += 1;
        if (category === "existing" || category === "existing/ongoing") acc.moaExisting += 1;
        return acc;
      },
      { total: 0, internal: 0, external: 0, moaExisting: 0, moaCompleted: 0, moaNew: 0 }
    );
    analyticsTotalBudget = budgetTotals.total;
    analyticsInternalBudget = budgetTotals.internal;
    analyticsExternalBudget = budgetTotals.external;
    analyticsMoaExisting = budgetTotals.moaExisting;
    analyticsMoaCompleted = budgetTotals.moaCompleted;
    analyticsMoaNew = budgetTotals.moaNew;
    analyticsScopeLabel = `Department view for ${profile.department}.`;
  }

  if (profile.user_type === "unit_coordinator") {
    const adminClient = createAdminClient();
    let userCountQuery = adminClient
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("department", profile.department)
      .eq("user_type", "unit_coordinator");
    if (profile.unit) {
      userCountQuery = userCountQuery.eq("unit", profile.unit);
    }
    const { count: usersCount } = await userCountQuery;
    analyticsUsers = usersCount ?? 0;

    let analyticsProjects = unitProjects;
    if (analyticsProjects.length === 0) {
      analyticsProjects = (await getUnitProjects()).data || [];
    }
    const fundingCounts = countFunding(analyticsProjects);
    analyticsInternalFunding = fundingCounts.internal;
    analyticsExternalFunding = fundingCounts.external;

    const trainings =
      trainingRecords.length > 0 ? trainingRecords : (await getTrainings()).data || [];
    analyticsTrainings = trainings.length;
    const budgetTotals = analyticsProjects.reduce(
      (acc, project) => {
        const budgetFromTotal =
          typeof project.budget_total === "number" ? project.budget_total : 0;
        const budgetFromItems = Array.isArray(project.budget_requirements)
          ? project.budget_requirements.reduce(
              (sum, item) => sum + (Number(item?.amount) || 0),
              0
            )
          : 0;
        const budget = budgetFromTotal > 0 ? budgetFromTotal : budgetFromItems;
        acc.total += budget;
        const type = getFundingType(project);
        if (type === "internal") acc.internal += budget;
        if (type === "external") acc.external += budget;
        const category = (project.category || "").toLowerCase();
        if (category === "new") acc.moaNew += 1;
        if (category === "completed") acc.moaCompleted += 1;
        if (category === "existing" || category === "existing/ongoing") acc.moaExisting += 1;
        return acc;
      },
      { total: 0, internal: 0, external: 0, moaExisting: 0, moaCompleted: 0, moaNew: 0 }
    );
    analyticsTotalBudget = budgetTotals.total;
    analyticsInternalBudget = budgetTotals.internal;
    analyticsExternalBudget = budgetTotals.external;
    analyticsMoaExisting = budgetTotals.moaExisting;
    analyticsMoaCompleted = budgetTotals.moaCompleted;
    analyticsMoaNew = budgetTotals.moaNew;
    analyticsScopeLabel = profile.unit
      ? `Unit view for ${profile.unit}.`
      : "Unit activity overview.";
  }

  const userType = profile.user_type;
  const firstName = profile.first_name || "User";
  const panelTitleMap: Record<string, string> = {
    overview: "Dashboard",
    records: "Projects",
    projects: "Projects",
    funding: "Funding",
    awards: "Awards",
    "student-involvement": "Student Involvement",
    "faculty-involvement": "Faculty Involvement",
    "technologies-innovation": "Technologies",
    "ordinance-resolutions": "Ordinance Resolutions",
    trainings: "Trainings",
    "unit-coordinators": "Unit Coordinators",
    "account-management": "Account Management",
    accounts: "Account Management",
  };
  const pageTitle = panelTitleMap[activePanel] || "Dashboard";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-sm font-semibold text-foreground/90">{pageTitle}</h1>
        {showOverview && (
          <p className="text-xs text-muted-foreground">
            Welcome back, {firstName}
          </p>
        )}
      </div>
      {showOverview && (
        <DashboardAnalytics
          users={analyticsUsers}
          internalFunding={analyticsInternalFunding}
          externalFunding={analyticsExternalFunding}
          trainings={analyticsTrainings}
          totalBudget={analyticsTotalBudget}
          internalBudget={analyticsInternalBudget}
          externalBudget={analyticsExternalBudget}
          moaExisting={analyticsMoaExisting}
          moaCompleted={analyticsMoaCompleted}
          moaNew={analyticsMoaNew}
          scopeLabel={analyticsScopeLabel}
        />
      )}

      {userType === "super_admin" && (
        <div className="space-y-4">
          {accountPanelSelected ? (
            accountView === "transfer" ? (
              <TransferCoordinatorPanel
                mode="college"
                accounts={allAccounts}
              />
            ) : (
              <>
                <CoordinatorRegistration
                  userType="college_coordinator"
                  title="College Coordinators"
                  description="Register emails of College coordinators for their specific departments."
                />
                <AccountsTable
                  accounts={allAccounts}
                  title="Registered Coordinators"
                  description="All coordinator accounts across departments."
                />
              </>
            )
          ) : activePanel === "awards" ? (
            <AwardsManagement
              initialAwards={awards}
              department={null}
              userType={userType}
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
              department={null}
              userType={userType}
              unit={null}
              unitOptions={availableUnitsForSuperAdmin}
              currentUserId={user.id}
            />
          ) : activePanel === "faculty-involvement" ? (
            <FacultyInvolvementManagement
              department={null}
              userType={userType}
              facultyRecords={facultyInvolvementRecords}
              poolRecords={poolExpertRecords}
              currentUserId={user.id}
            />
          ) : activePanel === "technologies-innovation" ? (
            <TechnologiesManagement
              initialRecords={technologyRecords}
              department={null}
              userType={userType}
              unit={null}
              unitOptions={availableUnitsForSuperAdmin}
              currentUserId={user.id}
            />
          ) : activePanel === "ordinance-resolutions" ? (
            <OrdinanceResolutionsManagement
              initialRecords={ordinanceRecords}
              department={null}
              userType={userType}
              unit={null}
              unitOptions={availableUnitsForSuperAdmin}
              currentUserId={user.id}
            />
          ) : (hasSuperAdminSelection || superAdminPanel === "trainings") ? (
            <>
              {activeProjectView === "project-proposal" ? (
                <ProjectProposalManagement
                  initialProjects={allProjects as ProjectProposal[]}
                  userType={userType}
                  department={profile.department}
                  unit={profile.unit}
                  unitOptions={availableUnitsForSuperAdmin}
                  currentUserId={user.id}
                />
              ) : superAdminPanel === "trainings" ? (
                <TrainingsManagement
                  initialRecords={trainingRecords}
                  department={profile.department}
                  userType={userType}
                  unit={profile.unit}
                  unitOptions={availableUnitsForSuperAdmin}
                  partnerAgencyOptions={trainingPartnerAgencyOptions}
                  currentUserId={user.id}
                />
              ) : (
                <ProjectManagement
                  initialProjects={allProjects}
                  userType={userType}
                  department={profile.department}
                  unit={profile.unit}
                  unitOptions={availableUnitsForSuperAdmin}
                  currentUserId={user.id}
                />
              )}
            </>
          ) : activePanel === "trainings" ? (
            <TrainingsManagement
              initialRecords={trainingRecords}
              department={profile.department}
              userType={userType}
              unit={profile.unit}
              unitOptions={availableUnitsForSuperAdmin}
              partnerAgencyOptions={trainingPartnerAgencyOptions}
              currentUserId={user.id}
            />
          ) : null}
        </div>
      )}

      {userType === "college_coordinator" && (
        <div className="space-y-4">
          {activePanel === "unit-coordinators" || accountPanelSelected ? (
            accountView === "transfer" ? (
              <TransferCoordinatorPanel
                mode="unit"
                accounts={collegeUnitCoordinatorAccounts}
                department={profile.department}
              />
            ) : (
              <UnitCoordinatorsPanel
                accounts={collegeUnitCoordinatorAccounts}
                department={profile.department}
              />
            )
          ) : activePanel === "awards" ? (
            <AwardsManagement
              initialAwards={awards}
              department={profile.department}
              userType={userType}
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
              userType={userType}
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
          ) : activePanel === "trainings" ? (
            <TrainingsManagement
              initialRecords={trainingRecords}
              department={profile.department}
              userType={userType}
              unit={profile.unit}
              unitOptions={availableUnitsForCollege}
              partnerAgencyOptions={trainingPartnerAgencyOptions}
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
            userType={userType}
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
            userType={userType}
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
        ) : activePanel === "trainings" ? (
          <TrainingsManagement
            initialRecords={trainingRecords}
            department={profile.department}
            userType={userType}
            unit={profile.unit}
            unitOptions={[]}
            partnerAgencyOptions={trainingPartnerAgencyOptions}
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
