"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type SupportedRole =
  | "super_admin"
  | "college_coordinator"
  | "unit_coordinator"
  | "project_leader";

type DatasetKey =
  | "project_registration"
  | "trainings";

export type BackupSelection = DatasetKey | "all";

type DatasetConfig = {
  key: DatasetKey;
  label: string;
  table: string;
  roles: SupportedRole[];
};

export type BackupDatasetSummary = {
  key: DatasetKey;
  label: string;
  table: string;
  count: number;
  available: boolean;
};

export type BackupFilePayload = {
  version: 1;
  createdAt: string;
  createdBy: string;
  createdByRole: SupportedRole;
  selection: BackupSelection;
  datasets: Array<{
    key: DatasetKey;
    label: string;
    table: string;
    count: number;
    records: Record<string, unknown>[];
  }>;
};

const DATASETS: DatasetConfig[] = [
  {
    key: "project_registration",
    label: "Project Registration",
    table: "projects",
    roles: ["super_admin", "college_coordinator", "unit_coordinator", "project_leader"],
  },
  {
    key: "trainings",
    label: "Trainings",
    table: "trainings",
    roles: ["super_admin", "college_coordinator", "unit_coordinator", "project_leader"],
  },
];

function isSupportedRole(role: string | null | undefined): role is SupportedRole {
  return (
    role === "super_admin" ||
    role === "college_coordinator" ||
    role === "unit_coordinator" ||
    role === "project_leader"
  );
}

async function getAuthorizedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_type")
    .eq("id", user.id)
    .single();

  if (!isSupportedRole(profile?.user_type)) {
    throw new Error("Insufficient permissions");
  }

  return {
    user,
    role: profile.user_type,
    adminClient: createAdminClient(),
  };
}

function getAllowedDatasets(role: SupportedRole) {
  return DATASETS.filter((dataset) => dataset.roles.includes(role));
}

function splitProjectRecords(records: Record<string, unknown>[]) {
  return {
    project_registration: records.filter(
      (record) => record.entry_type !== "project_proposal"
    ),
    project_proposal: records.filter(
      (record) => record.entry_type === "project_proposal"
    ),
  };
}

async function fetchOwnTableRecords(
  adminClient: ReturnType<typeof createAdminClient>,
  table: string,
  userId: string
) {
  const result = await adminClient
    .from(table)
    .select("*")
    .eq("created_by", userId)
    .order("created_at", { ascending: false });

  if (result.error) {
    const message = result.error.message.toLowerCase();
    if (
      message.includes("does not exist") ||
      message.includes("schema cache") ||
      message.includes("relation") ||
      message.includes("could not find")
    ) {
      return { available: false, records: [] as Record<string, unknown>[] };
    }
    throw new Error(result.error.message);
  }

  return {
    available: true,
    records: (result.data || []) as Record<string, unknown>[],
  };
}

async function getDatasetRecords(
  config: DatasetConfig,
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string,
  cachedProjects?: Record<string, unknown>[],
  projectsAvailable = true
) {
  if (config.table === "projects") {
    const projectRecords =
      cachedProjects ||
      (await fetchOwnTableRecords(adminClient, "projects", userId)).records;
    const split = splitProjectRecords(projectRecords);
    return {
      available: projectsAvailable,
      records: split.project_registration,
    };
  }

  return fetchOwnTableRecords(adminClient, config.table, userId);
}

function sanitizeImportRecord(
  record: Record<string, unknown>,
  userId: string
) {
  const sanitized = { ...record };
  sanitized.created_by = userId;
  if (typeof sanitized.updated_at !== "undefined") {
    sanitized.updated_at = new Date().toISOString();
  }
  return sanitized;
}

export async function getBackupSummary(): Promise<{
  role: SupportedRole;
  datasets: BackupDatasetSummary[];
}> {
  const { user, role, adminClient } = await getAuthorizedUser();
  const allowedDatasets = getAllowedDatasets(role);

  let cachedProjects: Record<string, unknown>[] | undefined;
  let projectsAvailable = true;
  if (allowedDatasets.some((dataset) => dataset.table === "projects")) {
    const projectResult = await fetchOwnTableRecords(adminClient, "projects", user.id);
    projectsAvailable = projectResult.available;
    cachedProjects = projectResult.available ? projectResult.records : [];
  }

  const datasets = await Promise.all(
    allowedDatasets.map(async (dataset) => {
      const result = await getDatasetRecords(
        dataset,
        adminClient,
        user.id,
        cachedProjects,
        projectsAvailable
      );
      return {
        key: dataset.key,
        label: dataset.label,
        table: dataset.table,
        count: result.records.length,
        available: result.available,
      };
    })
  );

  return { role, datasets };
}

export async function createBackupExport(
  selection: BackupSelection
): Promise<{ data?: BackupFilePayload; error?: string }> {
  try {
    const { user, role, adminClient } = await getAuthorizedUser();
    const allowedDatasets = getAllowedDatasets(role);
    const selectedDatasets =
      selection === "all"
        ? allowedDatasets
        : allowedDatasets.filter((dataset) => dataset.key === selection);

    if (selectedDatasets.length === 0) {
      return { error: "No datasets are available for this backup selection." };
    }

    let cachedProjects: Record<string, unknown>[] | undefined;
    let projectsAvailable = true;
    if (selectedDatasets.some((dataset) => dataset.table === "projects")) {
      const projectResult = await fetchOwnTableRecords(adminClient, "projects", user.id);
      projectsAvailable = projectResult.available;
      if (projectResult.available) {
        cachedProjects = projectResult.records;
      }
    }

    const datasets = await Promise.all(
      selectedDatasets.map(async (dataset) => {
        const result = await getDatasetRecords(
          dataset,
          adminClient,
          user.id,
          cachedProjects,
          projectsAvailable
        );
        return {
          key: dataset.key,
          label: dataset.label,
          table: dataset.table,
          count: result.records.length,
          records: result.records,
        };
      })
    );

    return {
      data: {
        version: 1,
        createdAt: new Date().toISOString(),
        createdBy: user.id,
        createdByRole: role,
        selection,
        datasets,
      },
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to create backup.",
    };
  }
}

export async function importBackupFile(
  payload: BackupFilePayload
): Promise<{
  success?: boolean;
  restoredCount?: number;
  restoredDatasets?: string[];
  skippedDatasets?: string[];
  error?: string;
}> {
  try {
    const { user, role, adminClient } = await getAuthorizedUser();

    if (!payload || payload.version !== 1 || !Array.isArray(payload.datasets)) {
      return { error: "Invalid backup file format." };
    }

    if (payload.createdBy !== user.id) {
      return {
        error:
          "This backup belongs to a different account. Please import it using the same account that created it.",
      };
    }

    const allowedDatasetKeys = new Set(getAllowedDatasets(role).map((dataset) => dataset.key));
    const restoredDatasets: string[] = [];
    const skippedDatasets: string[] = [];
    let restoredCount = 0;

    for (const dataset of payload.datasets) {
      if (!allowedDatasetKeys.has(dataset.key)) {
        skippedDatasets.push(dataset.label || dataset.key);
        continue;
      }

      const config = DATASETS.find((entry) => entry.key === dataset.key);
      if (!config) {
        skippedDatasets.push(dataset.label || dataset.key);
        continue;
      }

      const records = Array.isArray(dataset.records) ? dataset.records : [];
      if (records.length === 0) {
        restoredDatasets.push(config.label);
        continue;
      }

      const sanitizedRecords = records.map((record) =>
        sanitizeImportRecord(record, user.id)
      );

      const { error } = await adminClient
        .from(config.table)
        .upsert(sanitizedRecords, { onConflict: "id" });

      if (error) {
        const message = error.message.toLowerCase();
        if (
          message.includes("does not exist") ||
          message.includes("schema cache") ||
          message.includes("relation") ||
          message.includes("could not find")
        ) {
          skippedDatasets.push(config.label);
          continue;
        }
        return { error: `Failed to import ${config.label}: ${error.message}` };
      }

      restoredCount += sanitizedRecords.length;
      restoredDatasets.push(config.label);
    }

    revalidatePath("/dashboard");

    return {
      success: true,
      restoredCount,
      restoredDatasets,
      skippedDatasets,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to import backup.",
    };
  }
}
