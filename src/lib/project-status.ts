import { differenceInCalendarDays, differenceInMonths } from "date-fns";

type ProjectStatusSource = {
  created_at?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  category?: string | null;
};

export type ProjectLifecycleStatus = "New" | "Existing" | "Old" | "Unknown";

export const PROJECT_STATUS_ORDER: ProjectLifecycleStatus[] = [
  "New",
  "Existing",
  "Old",
  "Unknown",
];

function parseDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeStoredProjectCategory(
  value?: string | null
): ProjectLifecycleStatus {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "new" || normalized === "proposal" || normalized === "on process") {
    return "New";
  }

  if (
    normalized === "existing" ||
    normalized === "existing/ongoing" ||
    normalized === "processing"
  ) {
    return "Existing";
  }

  if (normalized === "completed" || normalized === "terminated" || normalized === "old") {
    return "Old";
  }

  return "Unknown";
}

export function getProjectPlannedDurationDays(project: ProjectStatusSource) {
  const startDate = parseDate(project.start_date);
  const endDate = parseDate(project.end_date);

  if (!startDate || !endDate) return null;

  const durationDays = differenceInCalendarDays(endDate, startDate);
  return durationDays >= 0 ? durationDays : null;
}

export function getProjectLifecycleStatus(
  project: ProjectStatusSource
): ProjectLifecycleStatus {
  const createdAt = parseDate(project.created_at);
  if (!createdAt) {
    const fallbackStatus = normalizeStoredProjectCategory(project.category);
    return fallbackStatus === "Unknown" ? "Existing" : fallbackStatus;
  }

  const ageInDays = Math.max(0, differenceInCalendarDays(new Date(), createdAt));
  const plannedDurationDays = getProjectPlannedDurationDays(project);

  if (plannedDurationDays != null && ageInDays > plannedDurationDays) {
    return "Old";
  }

  const ageInMonths = Math.max(0, differenceInMonths(new Date(), createdAt));
  if (ageInMonths < 2) {
    return "New";
  }

  return "Existing";
}

export function sortProjectStatuses<T extends { label: string }>(
  statuses: T[]
) {
  const getOrder = (label: string) => {
    const index = PROJECT_STATUS_ORDER.indexOf(label as ProjectLifecycleStatus);
    return index >= 0 ? index : PROJECT_STATUS_ORDER.length;
  };

  return [...statuses].sort(
    (left, right) => getOrder(left.label) - getOrder(right.label)
  );
}
