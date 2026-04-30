type BudgetRequirementLike = {
  amount?: number | null;
  name?: string | null;
};

type ProjectBudgetSource = {
  funding_data?: Record<string, unknown> | null;
  budget_total?: number | null;
  budget_requirements?: BudgetRequirementLike[] | null;
};

export type ProjectBudgetSummaryYear = {
  year: number;
  total: number;
};

function toNumber(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getProjectRegistrationData(project?: ProjectBudgetSource | null) {
  if (!project?.funding_data || typeof project.funding_data !== "object") return null;
  const registration = (project.funding_data as Record<string, unknown>).registration_data;
  return registration && typeof registration === "object"
    ? (registration as Record<string, unknown>)
    : null;
}

export function getProjectBudgetSummaryByYear(
  project?: ProjectBudgetSource | null
): ProjectBudgetSummaryYear[] {
  const registration = getProjectRegistrationData(project);
  const summaryRows = Array.isArray(registration?.budget_summary)
    ? registration.budget_summary
    : [];

  if (summaryRows.length > 0) {
    return summaryRows
      .map((row) => {
        const record = row as Record<string, unknown>;
        const year = Number(record.year || 0);
        const total =
          toNumber(record.food_and_beverage) +
          toNumber(record.travel) +
          toNumber(record.suppliers_and_materials) +
          toNumber(record.communication) +
          toNumber(record.other_mooe);
        return {
          year,
          total,
        };
      })
      .filter((row) => row.year > 0)
      .sort((left, right) => left.year - right.year);
  }

  if (!Array.isArray(project?.budget_requirements)) return [];

  return project.budget_requirements
    .map((item) => {
      const match = String(item?.name || "").match(/year\s+(\d{4})/i);
      return {
        year: match ? Number(match[1]) : 0,
        total: toNumber(item?.amount),
      };
    })
    .filter((row) => row.year > 0 && row.total > 0)
    .sort((left, right) => left.year - right.year);
}

export function getProjectBudgetSummaryTotal(project?: ProjectBudgetSource | null) {
  const registration = getProjectRegistrationData(project);
  const explicitTotal = toNumber(registration?.budget_summary_total);
  if (explicitTotal > 0) return explicitTotal;

  const summaryRows = getProjectBudgetSummaryByYear(project);
  if (summaryRows.length > 0) {
    return summaryRows.reduce((sum, row) => sum + row.total, 0);
  }

  return 0;
}

export function getProjectOverallBudget(project?: ProjectBudgetSource | null) {
  const registration = getProjectRegistrationData(project);
  const registrationBudget = toNumber(registration?.budget);
  if (registrationBudget > 0) return registrationBudget;

  const budgetTotal = toNumber(project?.budget_total);
  const budgetRequirementsTotal = Array.isArray(project?.budget_requirements)
    ? project.budget_requirements.reduce((sum, item) => sum + toNumber(item?.amount), 0)
    : 0;

  return budgetTotal > 0 || budgetRequirementsTotal > 0
    ? Math.max(budgetTotal, budgetRequirementsTotal)
    : 0;
}

export function getProjectBudgetSnapshot(project?: ProjectBudgetSource | null) {
  const totalBudget = getProjectOverallBudget(project);
  const utilizedBudget = getProjectBudgetSummaryTotal(project);
  return {
    totalBudget,
    utilizedBudget,
    remainingBudget: Math.max(totalBudget - utilizedBudget, 0),
  };
}
