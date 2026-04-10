import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CoordinatorRegistration } from "@/components/dashboard/coordinator-registration";
import { getCollegeProjects, getProjectLeaderProjects, getUnitProjects } from "@/lib/actions/projects";
import { getTrainings } from "@/lib/actions/trainings";
import { getConsultancyExtensions } from "@/lib/actions/consultancy-extension";
import { getTechnicalAdvisoryServices } from "@/lib/actions/technical-advisory-services";
import { getAdoptersWithEnterprise } from "@/lib/actions/adopters-with-enterprise";
import { getTechnologiesInnovationsCommercialized } from "@/lib/actions/technologies-innovations-commercialized";
import { getIecMaterials } from "@/lib/actions/iec-materials";
import { createAdminClient } from "@/lib/supabase/admin";
import { UnitCoordinatorsPanel } from "@/components/dashboard/unit-coordinators-panel";
import { type Project } from "@/components/dashboard/projects-table";
import { TrainingsManagement } from "@/components/dashboard/trainings-management";
import { type TrainingRecord } from "@/components/dashboard/trainings-form";
import { AccountsTable } from "@/components/dashboard/accounts-table";
import { DashboardAnalytics } from "@/components/dashboard/dashboard-analytics";
import { format, startOfMonth, subMonths } from "date-fns";
import { DEPARTMENTS } from "@/lib/departments";
import { ActiveCoordinators, type CoordinatorActivity } from "@/components/dashboard/active-coordinators";
import { CommunityPanel } from "@/components/dashboard/community-panel";
import { getCommunityBootstrap, type CommunityPost } from "@/lib/actions/community";
import { getBackupSummary, type BackupDatasetSummary } from "@/lib/actions/backup";
import { BackupManagement } from "@/components/dashboard/backup-management";
import { ProjectLeaderRegistrationManagement } from "@/components/dashboard/project-leader-registration-management";
import { ConsultancyExtensionManagement } from "@/components/dashboard/consultancy-extension-management";
import { type ConsultancyExtension } from "@/lib/actions/consultancy-extension";
import { TechnicalAdvisoryServicesManagement } from "@/components/dashboard/technical-advisory-services-management";
import { type TechnicalAdvisoryServiceRecord } from "@/lib/actions/technical-advisory-services";
import { AdoptersWithEnterpriseManagement } from "@/components/dashboard/adopters-with-enterprise-management";
import { type AdoptersWithEnterpriseRecord } from "@/lib/actions/adopters-with-enterprise";
import { TechnologiesInnovationsCommercializedManagement } from "@/components/dashboard/technologies-innovations-commercialized-management";
import { type TechnologyCommercializationRecord } from "@/lib/actions/technologies-innovations-commercialized";
import { IecMaterialsManagement } from "@/components/dashboard/iec-materials-management";
import { type IecMaterialRecord } from "@/lib/actions/iec-materials";
import { getBudgetUtilizations, type BudgetUtilizationRecord } from "@/lib/actions/budget-utilization";
import { BudgetUtilizationManagement } from "@/components/dashboard/budget-utilization-management";
import { getOrdinanceResolutions, type OrdinanceResolutionRecord } from "@/lib/actions/ordinance-resolution";
import { OrdinanceResolutionManagement } from "@/components/dashboard/ordinance-resolution-management";
import { getImpactAssessments, type ImpactAssessmentRecord } from "@/lib/actions/impact-assessment";
import { ImpactAssessmentManagement } from "@/components/dashboard/impact-assessment-management";
import { getExtensionPrograms, type ExtensionProgramRecord } from "@/lib/actions/extension-program";
import { ExtensionProgramManagement } from "@/components/dashboard/extension-program-management";
import { getAwardsRecognitions, type AwardsRecognitionRecord } from "@/lib/actions/awards-recognition";
import { AwardsRecognitionManagement } from "@/components/dashboard/awards-recognition-management";
import { getOtherActivities, type OtherActivityRecord } from "@/lib/actions/other-activities";
import { OtherActivitiesManagement } from "@/components/dashboard/other-activities-management";
import { ProjectLeaderDashboard } from "@/components/dashboard/project-leader-dashboard";


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

function extractProjectOptions(projects: Project[]) {
  return projects
    .filter((project) => Boolean(project.id && project.title))
    .map((project) => ({
      id: project.id,
      title: project.title,
    }));
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

type TimelineRecord = {
  created_at?: string | null;
};

type ProjectLeaderRecentActivity = {
  id: string;
  title: string;
  meta: string;
  href: string;
  createdAt: string | null;
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

function normalizeProjectCategory(value: string | null | undefined) {
  const normalized = (value || "").toLowerCase().trim();
  if (normalized === "new") return "New";
  if (normalized === "proposal") return "Proposal";
  if (normalized === "completed") return "Completed";
  if (normalized === "terminated") return "Terminated";
  if (
    normalized === "existing" ||
    normalized === "existing/ongoing" ||
    normalized === "on process" ||
    normalized === "processing"
  ) {
    return "Existing / Ongoing";
  }
  return "Uncategorized";
}

function buildProjectLeaderActivitySeries(
  sources: { label: string; records: TimelineRecord[] }[]
) {
  const buckets = getMonthBuckets();
  const bucketMap = new Map(
    buckets.map((bucket) => [bucket.key, { total: 0, breakdown: new Map<string, number>() }])
  );

  sources.forEach((source) => {
    source.records.forEach((record) => {
      if (!record.created_at) return;
      const createdAt = new Date(record.created_at);
      if (Number.isNaN(createdAt.getTime())) return;
      const key = format(startOfMonth(createdAt), "yyyy-MM");
      const bucket = bucketMap.get(key);
      if (!bucket) return;
      bucket.total += 1;
      bucket.breakdown.set(source.label, (bucket.breakdown.get(source.label) || 0) + 1);
    });
  });

  return buckets.map((bucket) => {
    const snapshot = bucketMap.get(bucket.key);
    return {
      label: bucket.label,
      value: snapshot?.total || 0,
      breakdown: snapshot
        ? Array.from(snapshot.breakdown.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
        : [],
    };
  });
}

function buildProjectLeaderRecentActivities(items: ProjectLeaderRecentActivity[]) {
  return [...items]
    .filter((item) => item.createdAt)
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 5);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string; panel?: string; account?: string }>;
}) {
  const resolvedSearchParams = (await searchParams) || {};
  const panelParam = resolvedSearchParams.panel;
  const accountPanelSelected = panelParam === "account-management" || panelParam === "accounts";
  let activePanel =
    panelParam === "overview" ||
    panelParam === "account-management" ||
    panelParam === "accounts" ||
    panelParam === "community" ||
    panelParam === "backup" ||
    panelParam === "trainings" ||
    panelParam === "consultancy" ||
    panelParam === "technical-advisory" ||
    panelParam === "adopters-with-enterprise" ||
    panelParam === "technologies-innovations-commercialized" ||
    panelParam === "iec-materials" ||
    panelParam === "budget-utilization" ||
    panelParam === "ordinance-resolution" ||
    panelParam === "impact-assessment" ||
    panelParam === "extension-program" ||
    panelParam === "awards-recognition" ||
    panelParam === "other-activities" ||
    panelParam === "projects"
      ? panelParam
      : "overview";
  let hasEntitySelection = activePanel === "projects";
  let showOverview = activePanel === "overview";

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

  const allowedPanelsByRole: Record<string, string[]> = {
    super_admin: ["overview", "community", "backup", "account-management", "accounts"],
    college_coordinator: ["overview", "community", "backup", "account-management", "accounts"],
    unit_coordinator: ["overview", "community", "backup"],
    project_leader: ["overview", "community", "backup", "projects", "budget-utilization", "ordinance-resolution", "impact-assessment", "extension-program", "awards-recognition", "other-activities", "trainings", "consultancy", "technical-advisory", "adopters-with-enterprise", "technologies-innovations-commercialized", "iec-materials"],
    extension_office: ["overview"],
  };
  const allowedPanels = allowedPanelsByRole[profile.user_type] || ["overview"];
  if (!allowedPanels.includes(activePanel)) {
    activePanel = "overview";
  }
  hasEntitySelection = activePanel === "projects";
  showOverview = activePanel === "overview";

  let projects: Project[] = [];
  const unitProjects: Project[] = [];
  let trainingRecords: TrainingRecord[] = [];
  let consultancyRecords: ConsultancyExtension[] = [];
  let technicalAdvisoryRecords: TechnicalAdvisoryServiceRecord[] = [];
  let adoptersWithEnterpriseRecords: AdoptersWithEnterpriseRecord[] = [];
  let technologyCommercializationRecords: TechnologyCommercializationRecord[] = [];
  let iecMaterialRecords: IecMaterialRecord[] = [];
  let budgetUtilizationRecords: BudgetUtilizationRecord[] = [];
  let ordinanceResolutionRecords: OrdinanceResolutionRecord[] = [];
  let impactAssessmentRecords: ImpactAssessmentRecord[] = [];
  let extensionProgramRecords: ExtensionProgramRecord[] = [];
  let awardsRecognitionRecords: AwardsRecognitionRecord[] = [];
  let otherActivityRecords: OtherActivityRecord[] = [];
  let trainingPartnerAgencyOptions: string[] = [];
  let trainingProjectOptions: { id: string; title: string }[] = [];
  let publicCommunityPosts: CommunityPost[] = [];
  let departmentCommunityPosts: CommunityPost[] = [];
  let communityUsers = [] as Awaited<ReturnType<typeof getCommunityBootstrap>>["mentionableUsers"];
  let backupDatasets: BackupDatasetSummary[] = [];
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
    if (activePanel === "backup" && profile.user_type === "unit_coordinator") {
      backupDatasets = (await getBackupSummary()).datasets;
    } else if (activePanel === "community" && profile.user_type === "unit_coordinator") {
      const communityData = await getCommunityBootstrap(profile.department);
      publicCommunityPosts = communityData.publicPosts;
      departmentCommunityPosts = communityData.departmentPosts;
      communityUsers = communityData.mentionableUsers;
    }
  } else if (
    profile.user_type === "college_coordinator" &&
    activePanel !== "unit-coordinators"
  ) {
    if (activePanel === "backup") {
      backupDatasets = (await getBackupSummary()).datasets;
    } else if (activePanel === "community") {
      const communityData = await getCommunityBootstrap(profile.department);
      publicCommunityPosts = communityData.publicPosts;
      departmentCommunityPosts = communityData.departmentPosts;
      communityUsers = communityData.mentionableUsers;
    }
  } else if (profile.user_type === "project_leader") {
    if (activePanel === "backup") {
      backupDatasets = (await getBackupSummary()).datasets;
    } else if (activePanel === "community") {
      const communityData = await getCommunityBootstrap(profile.department);
      publicCommunityPosts = communityData.publicPosts;
      departmentCommunityPosts = communityData.departmentPosts;
      communityUsers = communityData.mentionableUsers;
    } else if (showOverview) {
      const [
        leaderProjectsResult,
        trainingsResult,
        consultancyResult,
        technicalAdvisoryResult,
        adoptersResult,
        technologyResult,
        iecResult,
        budgetResult,
        ordinanceResult,
        impactResult,
        extensionResult,
        awardsResult,
        otherResult,
      ] = await Promise.all([
        getProjectLeaderProjects(),
        getTrainings(),
        getConsultancyExtensions(),
        getTechnicalAdvisoryServices(),
        getAdoptersWithEnterprise(),
        getTechnologiesInnovationsCommercialized(),
        getIecMaterials(),
        getBudgetUtilizations(),
        getOrdinanceResolutions(),
        getImpactAssessments(),
        getExtensionPrograms(),
        getAwardsRecognitions(),
        getOtherActivities(),
      ]);

      projects = (leaderProjectsResult.data || []) as Project[];
      trainingRecords = (trainingsResult.data || []) as TrainingRecord[];
      consultancyRecords = (consultancyResult.data || []) as ConsultancyExtension[];
      technicalAdvisoryRecords = (technicalAdvisoryResult.data || []) as TechnicalAdvisoryServiceRecord[];
      adoptersWithEnterpriseRecords = (adoptersResult.data || []) as AdoptersWithEnterpriseRecord[];
      technologyCommercializationRecords =
        (technologyResult.data || []) as TechnologyCommercializationRecord[];
      iecMaterialRecords = (iecResult.data || []) as IecMaterialRecord[];
      budgetUtilizationRecords = (budgetResult.data || []) as BudgetUtilizationRecord[];
      ordinanceResolutionRecords = (ordinanceResult.data || []) as OrdinanceResolutionRecord[];
      impactAssessmentRecords = (impactResult.data || []) as ImpactAssessmentRecord[];
      extensionProgramRecords = (extensionResult.data || []) as ExtensionProgramRecord[];
      awardsRecognitionRecords = (awardsResult.data || []) as AwardsRecognitionRecord[];
      otherActivityRecords = (otherResult.data || []) as OtherActivityRecord[];
    } else if (activePanel === "trainings") {
      trainingRecords = (await getTrainings()).data || [];
      const leaderProjectsResult = await getProjectLeaderProjects();
      const leaderProjects = (leaderProjectsResult.data || []) as Project[];
      trainingPartnerAgencyOptions = extractPartnerAgencyNames(leaderProjects);
      trainingProjectOptions = extractProjectOptions(leaderProjects);
    } else if (activePanel === "consultancy") {
      consultancyRecords = (await getConsultancyExtensions()).data || [];
      const leaderProjectsResult = await getProjectLeaderProjects();
      projects = (leaderProjectsResult.data || []) as Project[];
    } else if (activePanel === "technical-advisory") {
      technicalAdvisoryRecords = (await getTechnicalAdvisoryServices()).data || [];
    } else if (activePanel === "adopters-with-enterprise") {
      adoptersWithEnterpriseRecords = (await getAdoptersWithEnterprise()).data || [];
      const leaderProjectsResult = await getProjectLeaderProjects();
      projects = (leaderProjectsResult.data || []) as Project[];
    } else if (activePanel === "technologies-innovations-commercialized") {
      technologyCommercializationRecords =
        (await getTechnologiesInnovationsCommercialized()).data || [];
      const leaderProjectsResult = await getProjectLeaderProjects();
      projects = (leaderProjectsResult.data || []) as Project[];
    } else if (activePanel === "iec-materials") {
      iecMaterialRecords = (await getIecMaterials()).data || [];
      const leaderProjectsResult = await getProjectLeaderProjects();
      projects = (leaderProjectsResult.data || []) as Project[];
    } else if (activePanel === "budget-utilization") {
      budgetUtilizationRecords = (await getBudgetUtilizations()).data || [];
      const leaderProjectsResult = await getProjectLeaderProjects();
      projects = (leaderProjectsResult.data || []) as Project[];
    } else if (activePanel === "ordinance-resolution") {
      ordinanceResolutionRecords = (await getOrdinanceResolutions()).data || [];
      const leaderProjectsResult = await getProjectLeaderProjects();
      projects = (leaderProjectsResult.data || []) as Project[];
    } else if (activePanel === "impact-assessment") {
      impactAssessmentRecords = (await getImpactAssessments()).data || [];
      const leaderProjectsResult = await getProjectLeaderProjects();
      projects = (leaderProjectsResult.data || []) as Project[];
    } else if (activePanel === "extension-program") {
      extensionProgramRecords = (await getExtensionPrograms()).data || [];
      const leaderProjectsResult = await getProjectLeaderProjects();
      projects = (leaderProjectsResult.data || []) as Project[];
    } else if (activePanel === "awards-recognition") {
      awardsRecognitionRecords = (await getAwardsRecognitions()).data || [];
      const leaderProjectsResult = await getProjectLeaderProjects();
      projects = (leaderProjectsResult.data || []) as Project[];
    } else if (activePanel === "other-activities") {
      otherActivityRecords = (await getOtherActivities()).data || [];
    } else if (hasEntitySelection) {
      const leaderProjectsResult = await getProjectLeaderProjects();
      projects = (leaderProjectsResult.data || []) as Project[];
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
  let projectLeaderModuleCounts: { label: string; value: number; href: string }[] = [];
  let projectLeaderActivitySeries: { label: string; value: number; breakdown: { name: string; count: number }[] }[] = [];
  let projectLeaderStatusShare: { label: string; value: number }[] = [];
  let projectLeaderRadarSeries: { label: string; value: number; fullMark: number }[] = [];
  let projectLeaderRecentActivities: ProjectLeaderRecentActivity[] = [];
  let projectLeaderOutputCount = 0;
  let projectLeaderActiveProjects = 0;
  let projectLeaderUtilizedBudget = 0;
  let projectLeaderUtilizationRate = 0;

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
    if (activePanel === "backup") {
      backupDatasets = (await getBackupSummary()).datasets;
    } else if (activePanel === "community") {
      const communityData = await getCommunityBootstrap(profile.department);
      publicCommunityPosts = communityData.publicPosts;
      departmentCommunityPosts = communityData.departmentPosts;
      communityUsers = communityData.mentionableUsers;
    } else if (hasEntitySelection) {
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

  if (profile.user_type === "project_leader") {
    const leaderProjects = projects as AnalyticsProject[];
    analyticsProjects = leaderProjects;
    analyticsUsers = 1;
    analyticsTrainings = trainingRecords.length;
    analyticsTotalBudget = leaderProjects.reduce((sum, project) => sum + getProjectBudget(project), 0);
    analyticsScopeLabel = "Based on your own projects, extension outputs, and CQER participation.";

    const fundingCounts = countFunding(leaderProjects);
    analyticsInternalFunding = fundingCounts.internal;
    analyticsExternalFunding = fundingCounts.external;

    const normalizedCategories = leaderProjects.map((project) =>
      normalizeProjectCategory(project.category)
    );
    analyticsMoaNew = normalizedCategories.filter((value) => value === "New" || value === "Proposal").length;
    analyticsMoaExisting = normalizedCategories.filter((value) => value === "Existing / Ongoing").length;
    analyticsMoaCompleted = normalizedCategories.filter((value) => value === "Completed").length;

    projectLeaderModuleCounts = [
      { label: "Project Registration", value: leaderProjects.length, href: "/dashboard?panel=projects&view=project-registration" },
      { label: "Budget Utilization", value: budgetUtilizationRecords.length, href: "/dashboard?panel=budget-utilization" },
      { label: "Ordinance / Resolution", value: ordinanceResolutionRecords.length, href: "/dashboard?panel=ordinance-resolution" },
      { label: "Impact / Assessment", value: impactAssessmentRecords.length, href: "/dashboard?panel=impact-assessment" },
      { label: "Extension Program", value: extensionProgramRecords.length, href: "/dashboard?panel=extension-program" },
      { label: "Awards", value: awardsRecognitionRecords.length, href: "/dashboard?panel=awards-recognition" },
      { label: "Other Activities", value: otherActivityRecords.length, href: "/dashboard?panel=other-activities" },
      { label: "Trainings", value: trainingRecords.length, href: "/dashboard?panel=trainings" },
      { label: "Consultancy", value: consultancyRecords.length, href: "/dashboard?panel=consultancy" },
      { label: "Technical Advisory", value: technicalAdvisoryRecords.length, href: "/dashboard?panel=technical-advisory" },
      { label: "Adopters with Enterprise", value: adoptersWithEnterpriseRecords.length, href: "/dashboard?panel=adopters-with-enterprise" },
      { label: "Technologies", value: technologyCommercializationRecords.length, href: "/dashboard?panel=technologies-innovations-commercialized" },
      { label: "IEC Materials", value: iecMaterialRecords.length, href: "/dashboard?panel=iec-materials" },
    ];

    projectLeaderOutputCount = projectLeaderModuleCounts
      .filter((item) => item.label !== "Project Registration")
      .reduce((sum, item) => sum + item.value, 0);

    projectLeaderActiveProjects = normalizedCategories.filter(
      (value) => value === "New" || value === "Proposal" || value === "Existing / Ongoing"
    ).length;

    projectLeaderUtilizedBudget = budgetUtilizationRecords.reduce(
      (sum, record) => sum + (Number(record.utilized_total) || 0),
      0
    );
    projectLeaderUtilizationRate =
      analyticsTotalBudget > 0 ? (projectLeaderUtilizedBudget / analyticsTotalBudget) * 100 : 0;

    projectLeaderActivitySeries = buildProjectLeaderActivitySeries([
      { label: "Projects", records: leaderProjects },
      { label: "Budget", records: budgetUtilizationRecords },
      { label: "Ordinance", records: ordinanceResolutionRecords },
      { label: "Impact", records: impactAssessmentRecords },
      { label: "Extension", records: extensionProgramRecords },
      { label: "Awards", records: awardsRecognitionRecords },
      { label: "Other", records: otherActivityRecords },
      {
        label: "Trainings",
        records: trainingRecords as Array<TrainingRecord & { created_at?: string | null }>,
      },
      { label: "Consultancy", records: consultancyRecords },
      { label: "Adopters", records: adoptersWithEnterpriseRecords },
      { label: "Technology", records: technologyCommercializationRecords },
      { label: "IEC", records: iecMaterialRecords },
      { label: "Technical Advisory", records: technicalAdvisoryRecords },
    ]);

    projectLeaderStatusShare = Array.from(
      normalizedCategories.reduce((map, value) => {
        map.set(value, (map.get(value) || 0) + 1);
        return map;
      }, new Map<string, number>())
    )
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

    const radarValues = [
      {
        label: "Compliance",
        value: budgetUtilizationRecords.length + ordinanceResolutionRecords.length + impactAssessmentRecords.length,
      },
      {
        label: "Delivery",
        value:
          extensionProgramRecords.length +
          trainingRecords.length +
          consultancyRecords.length +
          technicalAdvisoryRecords.length,
      },
      {
        label: "Adoption",
        value:
          adoptersWithEnterpriseRecords.length +
          technologyCommercializationRecords.length +
          iecMaterialRecords.length,
      },
      {
        label: "Recognition",
        value: awardsRecognitionRecords.length + otherActivityRecords.length,
      },
      {
        label: "Pipeline",
        value: leaderProjects.length,
      },
    ];
    const radarMax = Math.max(1, ...radarValues.map((item) => item.value));
    projectLeaderRadarSeries = radarValues.map((item) => ({
      ...item,
      fullMark: radarMax,
    }));

    projectLeaderRecentActivities = buildProjectLeaderRecentActivities([
      ...leaderProjects.map((project) => ({
        id: `project-${project.id}`,
        title: project.title || "Untitled project",
        meta: "Project Registration",
        href: "/dashboard?panel=projects&view=project-registration",
        createdAt: project.created_at || null,
      })),
      ...budgetUtilizationRecords.map((record) => ({
        id: `budget-${record.id}`,
        title: record.project_title || "Budget utilization record",
        meta: "Budget Utilization",
        href: "/dashboard?panel=budget-utilization",
        createdAt: record.created_at || null,
      })),
      ...ordinanceResolutionRecords.map((record) => ({
        id: `ordinance-${record.id}`,
        title: record.name || "Ordinance / resolution",
        meta: "Ordinance / Resolution",
        href: "/dashboard?panel=ordinance-resolution",
        createdAt: record.created_at || null,
      })),
      ...impactAssessmentRecords.map((record) => ({
        id: `impact-${record.id}`,
        title: record.activity_name || "Impact / assessment",
        meta: "Impact / Assessment",
        href: "/dashboard?panel=impact-assessment",
        createdAt: record.created_at || null,
      })),
      ...extensionProgramRecords.map((record) => ({
        id: `extension-${record.id}`,
        title: record.activity_title || "Extension program",
        meta: "Extension Program",
        href: "/dashboard?panel=extension-program",
        createdAt: record.created_at || null,
      })),
      ...awardsRecognitionRecords.map((record) => ({
        id: `award-${record.id}`,
        title: record.award_title || "Award / recognition",
        meta: "Awards",
        href: "/dashboard?panel=awards-recognition",
        createdAt: record.created_at || null,
      })),
      ...otherActivityRecords.map((record) => ({
        id: `other-${record.id}`,
        title: record.activity_title || "Other activity",
        meta: "Other Activities",
        href: "/dashboard?panel=other-activities",
        createdAt: record.created_at || null,
      })),
      ...trainingRecords.map((record) => ({
        id: `training-${String((record as { id?: string }).id || record.training_title)}`,
        title: record.training_title || "Training record",
        meta: "Trainings",
        href: "/dashboard?panel=trainings",
        createdAt: (record as { created_at?: string | null }).created_at || null,
      })),
      ...consultancyRecords.map((record) => ({
        id: `consultancy-${record.id}`,
        title: record.title_of_consultancy || "Consultancy",
        meta: "Consultancy",
        href: "/dashboard?panel=consultancy",
        createdAt: record.created_at || null,
      })),
      ...technicalAdvisoryRecords.map((record) => ({
        id: `technical-${record.id}`,
        title: record.agency_name || "Technical advisory",
        meta: "Technical Advisory",
        href: "/dashboard?panel=technical-advisory",
        createdAt: record.created_at || null,
      })),
      ...adoptersWithEnterpriseRecords.map((record) => ({
        id: `adopters-${record.id}`,
        title: record.technology_transferred || "Adopters with enterprise",
        meta: "Adopters with Enterprise",
        href: "/dashboard?panel=adopters-with-enterprise",
        createdAt: record.created_at || null,
      })),
      ...technologyCommercializationRecords.map((record) => ({
        id: `technology-${record.id}`,
        title: record.technology_name || "Technology record",
        meta: "Technologies",
        href: "/dashboard?panel=technologies-innovations-commercialized",
        createdAt: record.created_at || null,
      })),
      ...iecMaterialRecords.map((record) => ({
        id: `iec-${record.id}`,
        title: record.title || "IEC material",
        meta: "IEC Materials",
        href: "/dashboard?panel=iec-materials",
        createdAt: record.created_at || null,
      })),
    ]);

    if (projectLeaderStatusShare.length === 0) {
      projectLeaderStatusShare = [{ label: "No Projects Yet", value: 1 }];
    }
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
    projects: "Project Registration",
    consultancy: "Consultancy",
    "technical-advisory": "Technical Advisory",
    "adopters-with-enterprise": "Adopters with Enterprise",
    "technologies-innovations-commercialized": "Technologies / Innovations Commercialized",
    "iec-materials": "IEC Materials",
    "budget-utilization": "Budget Utilization",
    "ordinance-resolution": "Ordinance / Resolution",
    "impact-assessment": "Impact / Assessment",
    "extension-program": "Extension Program",
    "awards-recognition": "Awards and Recognition",
    "other-activities": "Other Activities",
    community: "CQER Community",
    backup: "Create Backup",
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
      {activePanel !== "community" && !(userType === "project_leader" && activePanel === "projects") && (
        <div>
          <h1 className="text-sm font-semibold text-foreground/90">{pageTitle}</h1>
          {showOverview && (
            <p className="text-xs text-muted-foreground">
              Welcome back, {firstName}
            </p>
          )}
        </div>
      )}
      {showOverview && (
        <div className="space-y-4">
          {userType === "project_leader" ? (
            <ProjectLeaderDashboard
              projectCount={projects.length}
              activeProjectCount={projectLeaderActiveProjects}
              outputCount={projectLeaderOutputCount}
              totalBudget={analyticsTotalBudget}
              utilizedBudget={projectLeaderUtilizedBudget}
              utilizationRate={projectLeaderUtilizationRate}
              moduleCounts={projectLeaderModuleCounts}
              monthlyActivitySeries={projectLeaderActivitySeries}
              projectStatusShare={projectLeaderStatusShare}
              radarSeries={projectLeaderRadarSeries}
              recentActivities={projectLeaderRecentActivities}
            />
          ) : (
            <>
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
            </>
          )}
        </div>
      )}

      {activePanel === "community" && (
        <CommunityPanel
          currentUser={{
            id: profile.id,
            firstName: profile.first_name || "User",
            lastName: profile.last_name || "",
            avatarUrl:
              profile.avatar_url ||
              user.user_metadata?.avatar_url ||
              user.user_metadata?.picture ||
              null,
            department: profile.department || null,
            userType: profile.user_type,
          }}
          publicPosts={publicCommunityPosts}
          departmentPosts={departmentCommunityPosts}
          mentionableUsers={communityUsers}
        />
      )}


      {userType === "super_admin" && activePanel !== "community" && (
        <div className="space-y-4">
          {accountPanelSelected ? (
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
          ) : activePanel === "backup" ? (
            <BackupManagement datasets={backupDatasets} />
          ) : null}
        </div>
      )}

      {userType === "college_coordinator" && activePanel !== "community" && (
        <div className="space-y-4">
          {activePanel === "unit-coordinators" || accountPanelSelected ? (
            <UnitCoordinatorsPanel
              accounts={collegeUnitCoordinatorAccounts}
              department={profile.department}
            />
          ) : activePanel === "backup" ? (
            <BackupManagement datasets={backupDatasets} />
          ) : null}
        </div>
      )}

      {userType === "unit_coordinator" && activePanel !== "community" && (
        activePanel === "backup" ? (
          <BackupManagement datasets={backupDatasets} />
        ) : null
      )}

      {userType === "project_leader" && activePanel !== "community" && (
        activePanel === "backup" ? (
          <BackupManagement datasets={backupDatasets} />
        ) : activePanel === "trainings" ? (
          <TrainingsManagement
            initialRecords={trainingRecords}
            department={profile.department}
            userType={userType}
            unit={profile.unit}
            unitOptions={[]}
            partnerAgencyOptions={trainingPartnerAgencyOptions}
            projectOptions={trainingProjectOptions}
            currentUserName={`${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Project Leader"}
            currentUserId={user.id}
          />
        ) : activePanel === "consultancy" ? (
          <ConsultancyExtensionManagement
            initialExtensions={consultancyRecords}
            assignedProjects={projects}
          />
        ) : activePanel === "technical-advisory" ? (
          <TechnicalAdvisoryServicesManagement initialRecords={technicalAdvisoryRecords} />
        ) : activePanel === "adopters-with-enterprise" ? (
          <AdoptersWithEnterpriseManagement initialRecords={adoptersWithEnterpriseRecords} projects={projects} />
        ) : activePanel === "technologies-innovations-commercialized" ? (
          <TechnologiesInnovationsCommercializedManagement
            initialRecords={technologyCommercializationRecords}
            projects={projects}
          />
        ) : activePanel === "iec-materials" ? (
          <IecMaterialsManagement initialRecords={iecMaterialRecords} projects={projects} />
        ) : activePanel === "budget-utilization" ? (
          <BudgetUtilizationManagement records={budgetUtilizationRecords} projects={projects} />
        ) : activePanel === "ordinance-resolution" ? (
          <OrdinanceResolutionManagement records={ordinanceResolutionRecords} projects={projects} />
        ) : activePanel === "impact-assessment" ? (
          <ImpactAssessmentManagement records={impactAssessmentRecords} projects={projects} />
        ) : activePanel === "extension-program" ? (
          <ExtensionProgramManagement records={extensionProgramRecords} projects={projects} />
        ) : activePanel === "awards-recognition" ? (
          <AwardsRecognitionManagement records={awardsRecognitionRecords} projects={projects} />
        ) : activePanel === "other-activities" ? (
          <OtherActivitiesManagement records={otherActivityRecords} />
        ) : hasEntitySelection ? (
          <ProjectLeaderRegistrationManagement
            projects={projects}
            currentUserId={user.id}
            currentUserName={`${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Project Leader"}
            department={profile.department}
            unit={profile.unit}
          />
        ) : null
      )}
    </div>
  );
}
