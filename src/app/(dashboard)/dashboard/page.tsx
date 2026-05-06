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
import { type TrainingFacultyOption, type TrainingProjectOption, type TrainingRecord } from "@/components/dashboard/trainings-form";
import { getAssignedTrainings, getSystemUsers, type AssignedTrainingRecord, type SystemUser } from "@/lib/actions/assigned-trainings";
import { AccountsTable } from "@/components/dashboard/accounts-table";
import { DashboardAnalytics } from "@/components/dashboard/dashboard-analytics";
import { format, startOfMonth, subMonths } from "date-fns";
import {
  fetchDepartmentDirectory,
  getDepartmentNames,
  getUnitsByDepartment,
} from "@/lib/departments";
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
import { getProjectLifecycleStatus, sortProjectStatuses } from "@/lib/project-status";
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
import { ProjectLeaderRecordsManagement } from "@/components/dashboard/project-leader-records-management";
import { ProjectLeaderDashboard } from "@/components/dashboard/project-leader-dashboard";
import { CollegeCoordinatorDashboard } from "@/components/dashboard/college-coordinator-dashboard";
import { SuperAdminDashboard } from "@/components/dashboard/super-admin-dashboard";
import {
  UnitCoordinatorDashboard,
  type UnitDashboardCommitteeMember,
  type UnitDashboardRecord,
  type UnitDashboardTraining,
} from "@/components/dashboard/unit-coordinator-dashboard";
import { normalizeSdgArray } from "@/lib/sdg";
import { getProjectLeaderRecords, type ProjectLeaderRecord } from "@/lib/actions/project-leader-records";
import { getFacultyRegistryRecords, type FacultyRegistryRecord } from "@/lib/actions/faculty-registry";
import { getProjectBudgetSnapshot, getProjectOverallBudget } from "@/lib/project-budget";
import { DepartmentManagement } from "@/components/dashboard/department-management";


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
    .map((project) => {
      const registrationData =
        project.funding_data && typeof project.funding_data === "object"
          ? (project.funding_data as { registration_data?: { sdg_main?: unknown; sdg_sub?: unknown } }).registration_data
          : undefined;
      return {
        id: project.id,
        title: project.title,
        sdg_main: normalizeSdgArray(registrationData?.sdg_main),
        sdg_sub: normalizeSdgArray(registrationData?.sdg_sub),
        partner_agencies: extractPartnerAgencyNames([project]),
      };
    });
}

function formatTrainingFacultyDesignation(profile: Record<string, unknown>) {
  const explicitDesignation = String(profile.designation || "").trim();
  if (explicitDesignation) return explicitDesignation;
  const unit = String(profile.unit || "").trim();
  if (unit) return unit;
  const userType = String(profile.user_type || "").trim();
  if (!userType) return "User";
  return userType
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const TRAINING_CATEGORY_LABELS: Record<string, string> = {
  TVL: "TVL - Technical, Vocational, Livelihood",
  CE: "CE - Continuing Education for Professional",
  GAD: "GAD - Gender and Development",
  AE: "AE - Agricultural and Environmental Training",
  BE: "BE - Basic Education",
  OTHERS: "Others",
};

function formatTrainingCategorySummary(record: TrainingRecord) {
  const categories =
    Array.isArray(record.training_categories) && record.training_categories.length > 0
      ? record.training_categories
      : record.training_category
        ? [record.training_category]
        : [];

  if (categories.length === 0) return "N/A";

  return categories
    .map((value) => {
      if (value === "OTHERS") {
        return record.training_category_other?.trim()
          ? `Others: ${record.training_category_other.trim()}`
          : "Others";
      }
      return TRAINING_CATEGORY_LABELS[value] || value;
    })
    .join(", ");
}

function formatTrainingModeLabel(value: TrainingRecord["training_mode"]) {
  if (value === "FTF") return "F2F - Face-to-face";
  if (value === "O") return "O - Online / Videoconferencing";
  if (value === "H") return "H - Hybrid";
  return "N/A";
}

function extractTrainingFacultyOptions(records: FacultyRegistryRecord[]) {
  return records
    .map((record) => ({
      id: record.id,
      name: `${record.first_name || ""} ${record.last_name || ""}`.trim() || "Unnamed User",
      designation: record.designation || "Faculty Member",
      unit: record.unit || null,
      employment: record.employment,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export type LeaderboardData = CoordinatorActivity & {
  projects: number;
  trainings: number;
  projectDates: string[];
  trainingDates: string[];
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

type ProjectBudgetDetail = {
  id: string;
  title: string;
  totalBudget: number;
  utilizedBudget: number;
  remainingBudget: number;
};

type FacultyInvolvementSummary = {
  name: string;
  hoursRendered: number;
};

function buildUnitRecordTitle(
  value: unknown,
  fallback: string
) {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return fallback;
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

function getProjectBudget(project: Project) {
  return getProjectOverallBudget(project);
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

function getProjectMixCategory(project: AnalyticsProject) {
  const computedStatus = getProjectLifecycleStatus(project);
  return computedStatus === "Unknown" ? "Existing" : computedStatus;
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
  searchParams?: Promise<{ view?: string; panel?: string; account?: string; sub?: string }>;
}) {
  const resolvedSearchParams = (await searchParams) || {};
  const panelParam = resolvedSearchParams.panel;
  const subParam = resolvedSearchParams.sub || "";
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
    panelParam === "project-leader-records" ||
    panelParam === "extension-program" ||
    panelParam === "awards-recognition" ||
    panelParam === "other-activities" ||
    panelParam === "department-management" ||
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
    super_admin: [
      "overview",
      "community",
      "backup",
      "account-management",
      "accounts",
      "department-management",
    ],
    college_coordinator: ["overview", "community", "backup", "account-management", "accounts", "projects", "budget-utilization", "ordinance-resolution", "impact-assessment", "extension-program", "awards-recognition", "other-activities", "trainings", "consultancy", "technical-advisory", "adopters-with-enterprise", "technologies-innovations-commercialized", "iec-materials"],
    unit_coordinator: ["overview", "community", "backup", "trainings", "project-leader-records"],
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
  let projectLeaderRecords: ProjectLeaderRecord[] = [];
  let facultyRegistryRecords: FacultyRegistryRecord[] = [];
  let trainingPartnerAgencyOptions: string[] = [];
  let trainingProjectOptions: TrainingProjectOption[] = [];
  let trainingFacultyOptions: TrainingFacultyOption[] = [];
  let assignedTrainingRecords: AssignedTrainingRecord[] = [];
  let systemUsersList: SystemUser[] = [];
  const departmentDirectory = await fetchDepartmentDirectory(
    supabase as unknown as Parameters<typeof fetchDepartmentDirectory>[0]
  );
  const dashboardDepartments = getDepartmentNames(departmentDirectory);
  const scopedUnitOptions = getUnitsByDepartment(
    profile.department,
    departmentDirectory
  );
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

  async function loadTrainingFacultyOptions() {
    const result = await getFacultyRegistryRecords();
    if (result.error) {
      console.error("Error fetching training faculty options:", result.error);
      return [];
    }

    return extractTrainingFacultyOptions(result.data || []);
  }

  if (profile.user_type === "unit_coordinator" || profile.user_type === "extension_office") {
    if (activePanel === "backup" && profile.user_type === "unit_coordinator") {
      backupDatasets = (await getBackupSummary()).datasets;
    } else if (activePanel === "community" && profile.user_type === "unit_coordinator") {
      const communityData = await getCommunityBootstrap(profile.department);
      publicCommunityPosts = communityData.publicPosts;
      departmentCommunityPosts = communityData.departmentPosts;
      communityUsers = communityData.mentionableUsers;
    } else if (activePanel === "trainings" && profile.user_type === "unit_coordinator") {
      trainingRecords = (await getTrainings()).data || [];
      trainingFacultyOptions = await loadTrainingFacultyOptions();
    } else if (activePanel === "project-leader-records" && profile.user_type === "unit_coordinator") {
      projectLeaderRecords = (await getProjectLeaderRecords()).data || [];
    }
  } else if (profile.user_type === "college_coordinator") {
    if (activePanel === "backup") {
      backupDatasets = (await getBackupSummary()).datasets;
    } else if (activePanel === "community") {
      const communityData = await getCommunityBootstrap(profile.department);
      publicCommunityPosts = communityData.publicPosts;
      departmentCommunityPosts = communityData.departmentPosts;
      communityUsers = communityData.mentionableUsers;
    } else if (activePanel === "trainings") {
      trainingRecords = (await getTrainings()).data || [];
      const collegeProjectsResult = await getCollegeProjects();
      const collegeProjects = (collegeProjectsResult.data || []) as Project[];
      trainingPartnerAgencyOptions = extractPartnerAgencyNames(collegeProjects);
      trainingProjectOptions = extractProjectOptions(collegeProjects);
      trainingFacultyOptions = await loadTrainingFacultyOptions();
      const [assignedResult, usersResult] = await Promise.all([
        getAssignedTrainings(),
        getSystemUsers(),
      ]);
      assignedTrainingRecords = assignedResult.data || [];
      systemUsersList = usersResult.data || [];
    } else if (activePanel === "consultancy") {
      consultancyRecords = (await getConsultancyExtensions()).data || [];
      const collegeProjectsResult = await getCollegeProjects();
      projects = (collegeProjectsResult.data || []) as Project[];
    } else if (activePanel === "technical-advisory") {
      technicalAdvisoryRecords = (await getTechnicalAdvisoryServices()).data || [];
    } else if (activePanel === "adopters-with-enterprise") {
      adoptersWithEnterpriseRecords = (await getAdoptersWithEnterprise()).data || [];
      const collegeProjectsResult = await getCollegeProjects();
      projects = (collegeProjectsResult.data || []) as Project[];
    } else if (activePanel === "technologies-innovations-commercialized") {
      technologyCommercializationRecords = (await getTechnologiesInnovationsCommercialized()).data || [];
      const collegeProjectsResult = await getCollegeProjects();
      projects = (collegeProjectsResult.data || []) as Project[];
    } else if (activePanel === "iec-materials") {
      iecMaterialRecords = (await getIecMaterials()).data || [];
      const collegeProjectsResult = await getCollegeProjects();
      projects = (collegeProjectsResult.data || []) as Project[];
    } else if (activePanel === "budget-utilization") {
      budgetUtilizationRecords = (await getBudgetUtilizations()).data || [];
      const collegeProjectsResult = await getCollegeProjects();
      projects = (collegeProjectsResult.data || []) as Project[];
    } else if (activePanel === "ordinance-resolution") {
      ordinanceResolutionRecords = (await getOrdinanceResolutions()).data || [];
      const collegeProjectsResult = await getCollegeProjects();
      projects = (collegeProjectsResult.data || []) as Project[];
    } else if (activePanel === "impact-assessment") {
      impactAssessmentRecords = (await getImpactAssessments()).data || [];
      const collegeProjectsResult = await getCollegeProjects();
      projects = (collegeProjectsResult.data || []) as Project[];
    } else if (activePanel === "extension-program") {
      extensionProgramRecords = (await getExtensionPrograms()).data || [];
      const collegeProjectsResult = await getCollegeProjects();
      projects = (collegeProjectsResult.data || []) as Project[];
    } else if (activePanel === "awards-recognition") {
      awardsRecognitionRecords = (await getAwardsRecognitions()).data || [];
      const collegeProjectsResult = await getCollegeProjects();
      projects = (collegeProjectsResult.data || []) as Project[];
    } else if (activePanel === "other-activities") {
      otherActivityRecords = (await getOtherActivities()).data || [];
    } else if (hasEntitySelection) {
      const collegeProjectsResult = await getCollegeProjects();
      projects = (collegeProjectsResult.data || []) as Project[];
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
      trainingFacultyOptions = await loadTrainingFacultyOptions();
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
  let projectLeaderActivitySeries: { label: string; value: number; breakdown: { name: string; count: number }[] }[] = [];
  let projectLeaderStatusShare: { label: string; value: number }[] = [];
  let projectLeaderRadarSeries: { label: string; value: number; fullMark: number }[] = [];
  let projectLeaderRecentActivities: ProjectLeaderRecentActivity[] = [];
  let projectLeaderTrainingCount = 0;
  let projectLeaderActiveProjects = 0;
  let projectLeaderUtilizedBudget = 0;
  let projectLeaderUtilizationRate = 0;
  let projectLeaderBudgetDetails: ProjectBudgetDetail[] = [];
  let projectLeaderFacultyInvolvement: FacultyInvolvementSummary[] = [];
  let unitDashboardCommitteeMembers: UnitDashboardCommitteeMember[] = [];
  let unitDashboardTrainings: UnitDashboardTraining[] = [];
  let unitDashboardRecords: UnitDashboardRecord[] = [];
  let collegeOverviewTrainings: TrainingRecord[] = [];

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
    if (showOverview) {
      const overviewTrainings =
        trainingRecords.length > 0 ? trainingRecords : (((await getTrainings()).data || []) as TrainingRecord[]);
      collegeOverviewTrainings = overviewTrainings;
      facultyRegistryRecords = (await getFacultyRegistryRecords()).data || [];

    }
    const fundingCounts = countFunding(resolvedProjects);
    analyticsInternalFunding = fundingCounts.internal;
    analyticsExternalFunding = fundingCounts.external;

    const trainings =
      trainingRecords.length > 0 ? trainingRecords : (await getTrainings()).data || [];
    collegeOverviewTrainings = trainings as TrainingRecord[];
    analyticsTrainings = trainings.length;
    const budgetTotals = resolvedProjects.reduce(
      (acc, project) => {
        const budget = getProjectBudget(project);
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

    if (profile.user_type === "unit_coordinator" && profile.department && profile.unit) {
      const { data: departmentProfiles } = await adminClient
        .from("profiles")
        .select("id, email, first_name, last_name, user_type, unit, department, avatar_url, designation")
        .eq("department", profile.department);

      const scopedUsers = (departmentProfiles || []).filter((item) => item.unit === profile.unit);

      const sameUnitProfiles = (departmentProfiles || []).filter((item) => {
        if (item.unit !== profile.unit) return false;
        // Exclude project leaders with emails
        return item.user_type !== "project_leader";
      });

      const { data: facultyRegistryData } = await adminClient
        .from("faculty_registry_records")
        .select("*")
        .eq("department", profile.department)
        .eq("unit", profile.unit);
      const unitFacultyRegistry = (facultyRegistryData || []) as FacultyRegistryRecord[];

      const { data: projectLeaderCommitteeRecords } = await adminClient
        .from("project_leader_records")
        .select("*")
        .eq("department", profile.department)
        .eq("unit", profile.unit)
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true });

      unitDashboardCommitteeMembers = [
        ...sameUnitProfiles.map((item) => ({
          id: `account-${item.id}`,
          name: `${item.first_name || ""} ${item.last_name || ""}`.trim() || "Unnamed user",
          source: "unit_account" as const,
          email: item.email || null,
          designation: formatTrainingFacultyDesignation(item as Record<string, unknown>),
          employment: null,
          userType: item.user_type || null,
          unit: item.unit || null,
          department: item.department || null,
          avatarUrl: item.avatar_url || null,
        })),
        ...((projectLeaderCommitteeRecords || []) as ProjectLeaderRecord[]).map((item) => ({
          id: `registered-project-leader-${item.id}`,
          name: `${item.first_name || ""} ${item.last_name || ""}`.trim() || "Unnamed project leader",
          source: "registered_project_leader" as const,
          email: null,
          designation: item.designation || "Project Leader",
          employment: null,
          userType: "project_leader_record",
          unit: item.unit || null,
          department: item.department || null,
          avatarUrl: null,
        })),
        ...unitFacultyRegistry.map((item) => ({
          id: `faculty-registry-${item.id}`,
          name: `${item.first_name || ""} ${item.last_name || ""}`.trim() || "Unnamed faculty member",
          source: "unit_account" as const,
          email: null,
          designation: item.designation || "Faculty Member",
          employment: item.employment || null,
          userType: "faculty_member",
          unit: item.unit || null,
          department: item.department || null,
          avatarUrl: null,
        })),
      ].sort((left, right) => left.name.localeCompare(right.name));

      // Build a creator name map from all same-unit users
      const scopedCreatorIds = Array.from(new Set(scopedUsers.map((item) => item.id)));
      const creatorNameMap = new Map(
        scopedUsers.map((item) => [item.id, `${item.first_name || ""} ${item.last_name || ""}`.trim() || "Unnamed user"])
      );

      // Show all trainings returned by getTrainings() (already scoped to same unit on server)
      unitDashboardTrainings = trainings
        .map((training) => ({
          id: training.id,
          title: training.training_title,
          creatorName:
            training.creator_full_name ||
            (training.created_by ? creatorNameMap.get(training.created_by) : null) ||
            "Unknown user",
          createdBy: training.created_by || null,
          createdAt: (training as { created_at?: string | null }).created_at || null,
          venue: training.venue_platform || null,
          participants: training.participants_overall_total || 0,
          categorySummary: formatTrainingCategorySummary(training),
          modeLabel: formatTrainingModeLabel(training.training_mode),
        }));

      const [
        projectsResult,
        budgetResult,
        ordinanceResult,
        impactResult,
        extensionResult,
        awardsResult,
        otherResult,
        consultancyResult,
        technicalResult,
        adoptersResult,
        technologyResult,
        iecResult,
      ] = scopedCreatorIds.length
        ? await Promise.all([
            adminClient.from("projects").select("id, created_by, created_at, title").in("created_by", scopedCreatorIds),
            adminClient.from("budget_utilizations").select("id, created_by, created_at, project_title").in("created_by", scopedCreatorIds),
            adminClient.from("ordinance_resolutions").select("id, created_by, created_at, name").in("created_by", scopedCreatorIds),
            adminClient.from("impact_assessments").select("id, created_by, created_at, activity_name").in("created_by", scopedCreatorIds),
            adminClient.from("extension_programs").select("id, created_by, created_at, activity_title").in("created_by", scopedCreatorIds),
            adminClient.from("awards_recognitions").select("id, created_by, created_at, award_title").in("created_by", scopedCreatorIds),
            adminClient.from("other_activities").select("id, created_by, created_at, activity_title").in("created_by", scopedCreatorIds),
            adminClient.from("consultancy_extensions").select("id, created_by, created_at, title_of_consultancy").in("created_by", scopedCreatorIds),
            adminClient.from("technical_advisory_services").select("id, created_by, created_at, agency_name").in("created_by", scopedCreatorIds),
            adminClient.from("adopters_with_enterprise").select("id, created_by, created_at, technology_transferred").in("created_by", scopedCreatorIds),
            adminClient.from("technologies_innovations_commercialized").select("id, created_by, created_at, technology_name").in("created_by", scopedCreatorIds),
            adminClient.from("iec_materials").select("id, created_by, created_at, title").in("created_by", scopedCreatorIds),
          ])
        : Array(12).fill({ data: [] });

      unitDashboardRecords = [
        ...((projectsResult.data || []).map((record: { id: string; created_by: string; created_at: string | null; title: string | null }) => ({
          id: `projects-${record.id}`,
          title: buildUnitRecordTitle(record.title, "Untitled project"),
          moduleLabel: "Project Registration",
          creatorName: creatorNameMap.get(record.created_by) || "Unknown user",
          createdAt: record.created_at || null,
        })) as UnitDashboardRecord[]),
        ...((unitDashboardTrainings.map((record) => ({
          id: `trainings-${record.id}`,
          title: buildUnitRecordTitle(record.title, "Training record"),
          moduleLabel: "Trainings",
          creatorName: record.creatorName,
          createdAt: record.createdAt,
        })) as UnitDashboardRecord[])),
        ...((budgetResult.data || []).map((record: { id: string; created_by: string; created_at: string | null; project_title: string | null }) => ({
          id: `budget-${record.id}`,
          title: buildUnitRecordTitle(record.project_title, "Budget utilization"),
          moduleLabel: "Budget Utilization",
          creatorName: creatorNameMap.get(record.created_by) || "Unknown user",
          createdAt: record.created_at || null,
        })) as UnitDashboardRecord[]),
        ...((ordinanceResult.data || []).map((record: { id: string; created_by: string; created_at: string | null; name: string | null }) => ({
          id: `ordinance-${record.id}`,
          title: buildUnitRecordTitle(record.name, "Ordinance / resolution"),
          moduleLabel: "Ordinance / Resolution",
          creatorName: creatorNameMap.get(record.created_by) || "Unknown user",
          createdAt: record.created_at || null,
        })) as UnitDashboardRecord[]),
        ...((impactResult.data || []).map((record: { id: string; created_by: string; created_at: string | null; activity_name: string | null }) => ({
          id: `impact-${record.id}`,
          title: buildUnitRecordTitle(record.activity_name, "Impact assessment"),
          moduleLabel: "Impact Assessment",
          creatorName: creatorNameMap.get(record.created_by) || "Unknown user",
          createdAt: record.created_at || null,
        })) as UnitDashboardRecord[]),
        ...((extensionResult.data || []).map((record: { id: string; created_by: string; created_at: string | null; activity_title: string | null }) => ({
          id: `extension-${record.id}`,
          title: buildUnitRecordTitle(record.activity_title, "Extension program"),
          moduleLabel: "Extension Program",
          creatorName: creatorNameMap.get(record.created_by) || "Unknown user",
          createdAt: record.created_at || null,
        })) as UnitDashboardRecord[]),
        ...((awardsResult.data || []).map((record: { id: string; created_by: string; created_at: string | null; award_title: string | null }) => ({
          id: `awards-${record.id}`,
          title: buildUnitRecordTitle(record.award_title, "Award / recognition"),
          moduleLabel: "Awards and Recognition",
          creatorName: creatorNameMap.get(record.created_by) || "Unknown user",
          createdAt: record.created_at || null,
        })) as UnitDashboardRecord[]),
        ...((otherResult.data || []).map((record: { id: string; created_by: string; created_at: string | null; activity_title: string | null }) => ({
          id: `other-${record.id}`,
          title: buildUnitRecordTitle(record.activity_title, "Other activity"),
          moduleLabel: "Other Activities",
          creatorName: creatorNameMap.get(record.created_by) || "Unknown user",
          createdAt: record.created_at || null,
        })) as UnitDashboardRecord[]),
        ...((consultancyResult.data || []).map((record: { id: string; created_by: string; created_at: string | null; title_of_consultancy: string | null }) => ({
          id: `consultancy-${record.id}`,
          title: buildUnitRecordTitle(record.title_of_consultancy, "Consultancy"),
          moduleLabel: "Consultancy",
          creatorName: creatorNameMap.get(record.created_by) || "Unknown user",
          createdAt: record.created_at || null,
        })) as UnitDashboardRecord[]),
        ...((technicalResult.data || []).map((record: { id: string; created_by: string; created_at: string | null; agency_name: string | null }) => ({
          id: `technical-${record.id}`,
          title: buildUnitRecordTitle(record.agency_name, "Technical advisory"),
          moduleLabel: "Technical Advisory",
          creatorName: creatorNameMap.get(record.created_by) || "Unknown user",
          createdAt: record.created_at || null,
        })) as UnitDashboardRecord[]),
        ...((adoptersResult.data || []).map((record: { id: string; created_by: string; created_at: string | null; technology_transferred: string | null }) => ({
          id: `adopters-${record.id}`,
          title: buildUnitRecordTitle(record.technology_transferred, "Adopters with enterprise"),
          moduleLabel: "Adopters with Enterprise",
          creatorName: creatorNameMap.get(record.created_by) || "Unknown user",
          createdAt: record.created_at || null,
        })) as UnitDashboardRecord[]),
        ...((technologyResult.data || []).map((record: { id: string; created_by: string; created_at: string | null; technology_name: string | null }) => ({
          id: `technology-${record.id}`,
          title: buildUnitRecordTitle(record.technology_name, "Technology record"),
          moduleLabel: "Technologies / Innovations Commercialized",
          creatorName: creatorNameMap.get(record.created_by) || "Unknown user",
          createdAt: record.created_at || null,
        })) as UnitDashboardRecord[]),
        ...((iecResult.data || []).map((record: { id: string; created_by: string; created_at: string | null; title: string | null }) => ({
          id: `iec-${record.id}`,
          title: buildUnitRecordTitle(record.title, "IEC material"),
          moduleLabel: "IEC Materials",
          creatorName: creatorNameMap.get(record.created_by) || "Unknown user",
          createdAt: record.created_at || null,
        })) as UnitDashboardRecord[]),
      ].sort((left, right) => {
        const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
        const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
        return rightTime - leftTime;
      });
    }

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
      getProjectMixCategory(project)
    );
    analyticsMoaNew = normalizedCategories.filter((value) => value === "New").length;
    analyticsMoaExisting = normalizedCategories.filter((value) => value === "Existing").length;
    analyticsMoaCompleted = normalizedCategories.filter((value) => value === "Old").length;

    projectLeaderTrainingCount = trainingRecords.length;

    projectLeaderActiveProjects = normalizedCategories.filter(
      (value) => value === "New" || value === "Existing"
    ).length;

    projectLeaderUtilizedBudget = leaderProjects.reduce(
      (sum, project) => sum + getProjectBudgetSnapshot(project).utilizedBudget,
      0
    );
    projectLeaderUtilizationRate =
      analyticsTotalBudget > 0 ? (projectLeaderUtilizedBudget / analyticsTotalBudget) * 100 : 0;
    projectLeaderBudgetDetails = leaderProjects
      .map((project) => {
        const { totalBudget, utilizedBudget, remainingBudget } = getProjectBudgetSnapshot(project);
        return {
          id: project.id,
          title: project.title || "Untitled project",
          totalBudget,
          utilizedBudget,
          remainingBudget,
        };
      })
      .sort((left, right) => right.totalBudget - left.totalBudget);
    const facultyHoursMap = new Map<string, number>();
    trainingRecords.forEach((record) => {
      const sessionHours = Array.isArray(record.conducted_sessions)
        ? record.conducted_sessions.reduce((sum, session) => sum + Number(session.hours || 0), 0)
        : Number(record.manual_hours || 0);
      const facultyEntries = Array.isArray(record.faculty_members) ? record.faculty_members : [];
      facultyEntries.forEach((member) => {
        const name = String(member.name || "").trim();
        if (!name) return;
        facultyHoursMap.set(name, (facultyHoursMap.get(name) || 0) + sessionHours);
      });
    });
    projectLeaderFacultyInvolvement = Array.from(facultyHoursMap.entries())
      .map(([name, hoursRendered]) => ({ name, hoursRendered }))
      .sort((left, right) => right.hoursRendered - left.hoursRendered);

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

    projectLeaderStatusShare = sortProjectStatuses(
      Array.from(
      normalizedCategories.reduce((map, value) => {
        map.set(value, (map.get(value) || 0) + 1);
        return map;
      }, new Map<string, number>())
    )
        .map(([label, value]) => ({ label, value }))
    );

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
        title: record.activity_name || "Impact assessment",
        meta: "Impact Assessment",
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
      .select("created_by, created_at")
      .not("created_by", "is", null);
      
    // 2. Get training counts per creator
    const { data: trainingCounts } = await adminClient
      .from("trainings")
      .select("created_by, created_at")
      .not("created_by", "is", null);

    const projectsMap = {} as Record<string, number>;
    const trainingsMap = {} as Record<string, number>;
    const projectDatesMap = {} as Record<string, string[]>;
    const trainingDatesMap = {} as Record<string, string[]>;
    
    (projectCounts || []).forEach(p => {
      const cid = p.created_by as string;
      projectsMap[cid] = (projectsMap[cid] || 0) + 1;
      if (typeof p.created_at === "string" && p.created_at) {
        projectDatesMap[cid] = [...(projectDatesMap[cid] || []), p.created_at];
      }
    });

    (trainingCounts || []).forEach(t => {
      const cid = t.created_by as string;
      trainingsMap[cid] = (trainingsMap[cid] || 0) + 1;
      if (typeof t.created_at === "string" && t.created_at) {
        trainingDatesMap[cid] = [...(trainingDatesMap[cid] || []), t.created_at];
      }
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
          projectDates: projectDatesMap[p.id] || [],
          trainingDates: trainingDatesMap[p.id] || [],
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
    "impact-assessment": "Impact Assessment",
    "project-leader-records": "Project Leader Registration",
    "extension-program": "Extension Program",
    "awards-recognition": "Awards and Recognition",
    "other-activities": "Other Activities",
    community: "CQER Community",
    backup: "Create Backup",
    "account-management": "Account Management",
    accounts: "Account Management",
    "department-management": "Create Departments",
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
              trainingCount={projectLeaderTrainingCount}
              projects={projects}
              trainings={trainingRecords}
              totalBudget={analyticsTotalBudget}
              utilizedBudget={projectLeaderUtilizedBudget}
              utilizationRate={projectLeaderUtilizationRate}
              monthlyActivitySeries={projectLeaderActivitySeries}
              projectStatusShare={projectLeaderStatusShare}
              radarSeries={projectLeaderRadarSeries}
              recentActivities={projectLeaderRecentActivities}
              budgetDetails={projectLeaderBudgetDetails}
              facultyInvolvement={projectLeaderFacultyInvolvement}
            />
          ) : userType === "unit_coordinator" ? (
            <>
              <UnitCoordinatorDashboard
                currentUserId={user.id}
                scopeLabel={analyticsScopeLabel}
                committeeMembers={unitDashboardCommitteeMembers}
                trainings={unitDashboardTrainings}
                records={unitDashboardRecords}
              />

              <div className="grid gap-4 lg:grid-cols-12">
                <div className="lg:col-span-12">
                  <ActiveCoordinators
                    coordinators={leaderboard}
                    departments={dashboardDepartments}
                  />
                </div>
              </div>
            </>
          ) : userType === "super_admin" ? (
            <SuperAdminDashboard accounts={allAccounts} />
          ) : userType === "college_coordinator" ? (
            <>
              <CollegeCoordinatorDashboard
                department={profile.department || "Department"}
                projects={analyticsProjects}
                trainings={collegeOverviewTrainings}
                facultyRecords={facultyRegistryRecords}
              />

              <div className="grid gap-4 lg:grid-cols-12">
                <div className="lg:col-span-12">
                  <ActiveCoordinators
                    coordinators={leaderboard}
                    departments={dashboardDepartments}
                  />
                </div>
              </div>
            </>
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
                    departments={dashboardDepartments} 
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
          ) : activePanel === "department-management" ? (
            <DepartmentManagement initialDirectory={departmentDirectory} />
          ) : null}
        </div>
      )}

      {userType === "college_coordinator" && activePanel !== "community" && (
        <div className="space-y-4">
          {accountPanelSelected ? (
            <UnitCoordinatorsPanel
              accounts={collegeUnitCoordinatorAccounts}
              department={profile.department}
            />
          ) : activePanel === "backup" ? (
            <BackupManagement datasets={backupDatasets} />
          ) : activePanel === "trainings" ? (
            <TrainingsManagement
              initialRecords={trainingRecords}
              department={profile.department}
              userType={userType}
              unit={profile.unit}
              unitOptions={scopedUnitOptions}
              partnerAgencyOptions={trainingPartnerAgencyOptions}
              projectOptions={trainingProjectOptions}
              facultyOptions={trainingFacultyOptions}
              currentUserName={`${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "College Coordinator"}
              currentUserId={user.id}
              assignedTrainings={assignedTrainingRecords}
              systemUsers={systemUsersList}
              initialSub={subParam}
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
              currentUserName={`${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "College Coordinator"}
              department={profile.department}
              unit={profile.unit}
            />
          ) : null}
        </div>
      )}

      {userType === "unit_coordinator" && activePanel !== "community" && (
        activePanel === "backup" ? (
          <BackupManagement datasets={backupDatasets} />
        ) : activePanel === "trainings" ? (
          <TrainingsManagement
            initialRecords={trainingRecords}
            department={profile.department}
            userType={userType}
            unit={profile.unit}
            unitOptions={scopedUnitOptions}
            partnerAgencyOptions={trainingPartnerAgencyOptions}
            projectOptions={trainingProjectOptions}
            facultyOptions={trainingFacultyOptions}
            currentUserName={`${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Unit Coordinator"}
            currentUserId={user.id}
          />
        ) : activePanel === "project-leader-records" ? (
          <ProjectLeaderRecordsManagement initialRecords={projectLeaderRecords} />
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
            unitOptions={scopedUnitOptions}
            partnerAgencyOptions={trainingPartnerAgencyOptions}
            projectOptions={trainingProjectOptions}
            facultyOptions={trainingFacultyOptions}
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