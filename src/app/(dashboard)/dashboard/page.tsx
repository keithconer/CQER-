import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { UnitProjectsManagement } from "@/components/dashboard/unit-projects-management";
import { CoordinatorRegistration } from "@/components/dashboard/coordinator-registration";
import { getCollegeProjects, getProjects, getProjectLeaderProjects, getUnitProjects } from "@/lib/actions/projects";
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
import { format, startOfMonth, subMonths } from "date-fns";
import { DEPARTMENTS } from "@/lib/departments";
import { ActiveCoordinators, type CoordinatorActivity } from "@/components/dashboard/active-coordinators";


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

export type LeaderboardData = CoordinatorActivity & {
  projects: number;
  trainings: number;
};

type AnalyticsProject = Project & {
  created_at?: string | null;
  created_by_department?: string | null;
  created_by_unit?: string | null;
};

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

function getProjectBudget(project: Project) {
  if (typeof project.budget_total === "number") return project.budget_total;
  if (!Array.isArray(project.budget_requirements)) return 0;
  return project.budget_requirements.reduce(
    (sum, item) => sum + (Number(item?.amount) || 0),
    0
  );
}

function getMonthBuckets(months = 6) {
  const now = new Date();
  return Array.from({ length: months }, (_, index) => {
    const date = startOfMonth(subMonths(now, months - 1 - index));
    return {
      key: format(date, "yyyy-MM"),
      label: format(date, "MMM yyyy"),
      date,
    };
  });
}

function buildActivitySeries(
  projects: AnalyticsProject[],
  getBreakdownLabel: (project: AnalyticsProject) => string
) {
  const buckets = getMonthBuckets();
  const bucketMap = new Map(
    buckets.map((bucket) => [bucket.key, { total: 0, breakdown: new Map<string, number>() }])
  );

  projects.forEach((project) => {
    if (!project.created_at) return;
    const key = format(startOfMonth(new Date(project.created_at)), "yyyy-MM");
    const bucket = bucketMap.get(key);
    if (!bucket) return;
    bucket.total += 1;
    const label = getBreakdownLabel(project) || "Unassigned";
    bucket.breakdown.set(label, (bucket.breakdown.get(label) || 0) + 1);
  });

  return buckets.map((bucket) => {
    const snapshot = bucketMap.get(bucket.key);
    const breakdown =
      snapshot
        ? Array.from(snapshot.breakdown.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
        : [];
    return {
      label: bucket.label,
      value: snapshot?.total || 0,
      breakdown,
    };
  });
}

function buildBudgetSeries(projects: AnalyticsProject[]) {
  const buckets = getMonthBuckets();
  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, 0]));
  projects.forEach((project) => {
    if (!project.created_at) return;
    const key = format(startOfMonth(new Date(project.created_at)), "yyyy-MM");
    if (!bucketMap.has(key)) return;
    bucketMap.set(key, (bucketMap.get(key) || 0) + getProjectBudget(project));
  });
  return buckets.map((bucket) => ({
    label: bucket.label,
    value: bucketMap.get(bucket.key) || 0,
  }));
}

function buildRadarSeries(projects: AnalyticsProject[]) {
  const buckets = getMonthBuckets();
  const bucketMap = new Map(
    buckets.map((bucket) => [bucket.key, { internal: 0, external: 0 }])
  );
  projects.forEach((project) => {
    if (!project.created_at) return;
    const key = format(startOfMonth(new Date(project.created_at)), "yyyy-MM");
    const bucket = bucketMap.get(key);
    if (!bucket) return;
    const type = getFundingType(project);
    if (type === "internal") bucket.internal += 1;
    if (type === "external") bucket.external += 1;
  });
  return buckets.map((bucket) => {
    const snapshot = bucketMap.get(bucket.key) || { internal: 0, external: 0 };
    return {
      label: bucket.label,
      internal: snapshot.internal,
      external: snapshot.external,
    };
  });
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
    user_type: "unit_coordinator" | "project_leader" | "extension_office";
    department: string | null;
    unit: string | null;
    created_at: string | null;
  }[] = [];

  if (profile.user_type === "unit_coordinator" || profile.user_type === "extension_office") {
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
      if (profile.user_type === "unit_coordinator") {
        const [myProjectsResult, unitProjectsResult] = await Promise.all([
          getProjects(),
          getUnitProjects(),
        ]);
        projects = myProjectsResult.data || [];
        unitProjects = unitProjectsResult.data || [];
      } else {
        unitProjects = (await getUnitProjects()).data || [];
        projects = [];
      }
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
  } else if (profile.user_type === "project_leader") {
    if (hasEntitySelection) {
      projects = (await getProjectLeaderProjects()).data || [];
    }
  }

  let allAccounts: {
    id: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    user_type: "super_admin" | "college_coordinator" | "unit_coordinator" | "project_leader" | "extension_office";
    department: string | null;
    unit: string | null;
  }[] = [];
  let availableUnitsForCollege: string[] = [];
  let availableUnitsForSuperAdmin: string[] = [];

  let allProjects: Project[] = [];
  let analyticsProjects: AnalyticsProject[] = [];
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
          account.user_type === "unit_coordinator" ||
          account.user_type === "project_leader" ||
          account.user_type === "extension_office"
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
        { user_type: "super_admin" | "college_coordinator" | "unit_coordinator" | "project_leader" | "extension_office"; unit: string | null }
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

    const { data: analyticsProjectsData } = await adminClient
      .from("projects")
      .select(
        "id, created_by, created_at, funding_source, funding_data, budget_total, budget_requirements, category"
      );
    const resolvedAnalyticsProjects = (analyticsProjectsData as AnalyticsProject[] | null) || [];
    const creatorIds = Array.from(
      new Set(resolvedAnalyticsProjects.map((project) => project.created_by).filter(Boolean))
    ) as string[];
    if (creatorIds.length > 0) {
      const { data: creatorProfiles } = await adminClient
        .from("profiles")
        .select("id, department, unit")
        .in("id", creatorIds);
      const creatorMap = new Map(
        (creatorProfiles || []).map((entry) => [
          entry.id,
          { department: entry.department, unit: entry.unit },
        ])
      );
      analyticsProjects = resolvedAnalyticsProjects.map((project) => {
        const creator = creatorMap.get(project.created_by as string);
        return {
          ...project,
          created_by_department: creator?.department || null,
          created_by_unit: creator?.unit || null,
        };
      });
    } else {
      analyticsProjects = resolvedAnalyticsProjects;
    }
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
        if (category === "new" || category === "on process" || category === "proposal") acc.moaNew += 1;
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
        .in("user_type", ["super_admin", "college_coordinator", "unit_coordinator", "project_leader", "extension_office"]),
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
        .in("user_type", ["unit_coordinator", "project_leader", "extension_office"])
        .eq("department", profile.department)
        .order("created_at", { ascending: false });

      collegeUnitCoordinatorAccounts = unitAccounts || [];
    }

    const adminClient = createAdminClient();
    const { count: usersCount } = await adminClient
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .in("user_type", ["college_coordinator", "unit_coordinator", "project_leader", "extension_office"])
      .eq("department", profile.department);
    analyticsUsers = usersCount ?? 0;

    let resolvedProjects = projects as AnalyticsProject[];
    if (resolvedProjects.length === 0) {
      resolvedProjects = ((await getCollegeProjects()).data || []) as AnalyticsProject[];
    }
    analyticsProjects = resolvedProjects;
    const fundingCounts = countFunding(resolvedProjects);
    analyticsInternalFunding = fundingCounts.internal;
    analyticsExternalFunding = fundingCounts.external;

    const trainings =
      trainingRecords.length > 0 ? trainingRecords : (await getTrainings()).data || [];
    analyticsTrainings = trainings.length;
    const budgetTotals = resolvedProjects.reduce(
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
        if (category === "new" || category === "on process" || category === "proposal") acc.moaNew += 1;
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

  if (profile.user_type === "unit_coordinator" || profile.user_type === "extension_office") {
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

    let resolvedProjects = unitProjects as AnalyticsProject[];
    if (resolvedProjects.length === 0) {
      resolvedProjects = ((await getUnitProjects()).data || []) as AnalyticsProject[];
    }
    analyticsProjects = resolvedProjects;
    const fundingCounts = countFunding(resolvedProjects);
    analyticsInternalFunding = fundingCounts.internal;
    analyticsExternalFunding = fundingCounts.external;

    const trainings =
      trainingRecords.length > 0 ? trainingRecords : (await getTrainings()).data || [];
    analyticsTrainings = trainings.length;
    const budgetTotals = resolvedProjects.reduce(
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
        if (category === "new" || category === "on process" || category === "proposal") acc.moaNew += 1;
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

  // --- Leaderboard Logic (University-wide) ---
  let leaderboard: LeaderboardData[] = [];
  if (showOverview) {
    const adminClient = createAdminClient();
    
    // 1. Get project counts per creator
    const { data: projectCounts } = await adminClient
      .from("projects")
      .select("created_by")
      .not("created_by", "is", null);
      
    // 2. Get training counts per creator
    const { data: trainingCounts } = await adminClient
      .from("trainings")
      .select("created_by")
      .not("created_by", "is", null);

    const projectsMap = {} as Record<string, number>;
    const trainingsMap = {} as Record<string, number>;
    
    (projectCounts || []).forEach(p => {
      const cid = p.created_by as string;
      projectsMap[cid] = (projectsMap[cid] || 0) + 1;
    });

    (trainingCounts || []).forEach(t => {
      const cid = t.created_by as string;
      trainingsMap[cid] = (trainingsMap[cid] || 0) + 1;
    });
    
    const allCids = new Set([...Object.keys(projectsMap), ...Object.keys(trainingsMap)]);
    const topCreatorIds = Array.from(allCids);
    
    if (topCreatorIds.length > 0) {
      // 3. Fetch profiles for these creators
      const { data: creatorProfiles } = await adminClient
        .from("profiles")
        .select("id, first_name, last_name, department, user_type, avatar_url")
        .in("id", topCreatorIds);
        
      leaderboard = (creatorProfiles || []).map(p => {
        const pCount = projectsMap[p.id] || 0;
        const tCount = trainingsMap[p.id] || 0;
        return {
          id: p.id,
          name: `${p.first_name || ""} ${p.last_name || ""}`.trim(),
          department: p.department || "General",
          role: p.user_type || "Coordinator",
          projectCount: pCount + tCount,
          projects: pCount,
          trainings: tCount,
          avatar_url: p.avatar_url
        };
      }).sort((a, b) => b.projectCount - a.projectCount);
    }


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
  const activityBreakdownLabel =
    profile.user_type === "super_admin"
      ? "Department"
      : profile.user_type === "college_coordinator"
        ? "Unit"
        : "Unit";
  const activitySeries = buildActivitySeries(analyticsProjects, (project) => {
    if (profile.user_type === "super_admin") {
      return project.created_by_department || "Unassigned";
    }
    if (profile.user_type === "college_coordinator") {
      return project.created_by_unit || "Unassigned";
    }
    return profile.unit || "Unit";
  });
  const budgetSeries = buildBudgetSeries(analyticsProjects);
  const radarSeries = buildRadarSeries(analyticsProjects);
  const totalActivities = analyticsProjects.length + analyticsTrainings;
  const trainingShareTotal = totalActivities > 0 ? totalActivities : 1;

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
        <div className="space-y-4">
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
            activitySeries={activitySeries}
            activityBreakdownLabel={activityBreakdownLabel}
            budgetSeries={budgetSeries}
            radarSeries={radarSeries}
            trainingsShare={analyticsTrainings}
            trainingsShareTotal={trainingShareTotal}
            fundingShare={[
              { label: "Internal", value: analyticsInternalFunding },
              { label: "External", value: analyticsExternalFunding },
            ]}
            scopeLabel={analyticsScopeLabel}
          />
          
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-12">
              <ActiveCoordinators 
                coordinators={leaderboard} 
                departments={[...DEPARTMENTS]} 
              />
            </div>
          </div>
        </div>
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

      {userType === "extension_office" && (
        activePanel === "awards" ? (
          <AwardsManagement
            initialAwards={awards}
            department={profile.department}
            userType={userType}
            currentUserId={user.id}
            isViewOnly
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
            isViewOnly
          />
        ) : activePanel === "faculty-involvement" ? (
          <FacultyInvolvementManagement
            department={profile.department}
            userType={userType}
            facultyRecords={facultyInvolvementRecords}
            poolRecords={poolExpertRecords}
            currentUserId={user.id}
            isViewOnly
          />
        ) : activePanel === "technologies-innovation" ? (
          <TechnologiesManagement
            initialRecords={technologyRecords}
            department={profile.department}
            userType={userType}
            unit={profile.unit}
            unitOptions={[]}
            currentUserId={user.id}
            isViewOnly
          />
        ) : activePanel === "ordinance-resolutions" ? (
          <OrdinanceResolutionsManagement
            initialRecords={ordinanceRecords}
            department={profile.department}
            userType={userType}
            unit={profile.unit}
            unitOptions={[]}
            currentUserId={user.id}
            isViewOnly
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
            isViewOnly
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
              readOnly
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
              readOnly
            />
          )
        ) : null
      )}

      {userType === "project_leader" && (
        hasEntitySelection ? (
          activeProjectView === "project-proposal" ? (
            <ProjectProposalManagement
              initialProjects={projects as ProjectProposal[]}
              userType={userType}
              department={profile.department}
              unit={profile.unit}
              unitOptions={[]}
              currentUserId={user.id}
              readOnly
            />
          ) : (
            <ProjectManagement
              initialProjects={projects}
              userType={userType}
              department={profile.department}
              unit={profile.unit}
              unitOptions={[]}
              currentUserId={user.id}
              readOnly
            />
          )
        ) : null
      )}
    </div>
  );
}
