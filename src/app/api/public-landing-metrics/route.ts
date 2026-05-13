import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProjectBudgetSummaryTotal } from "@/lib/project-budget";

type ProjectLike = {
  created_at?: string | null;
  funding_data?: Record<string, unknown> | null;
  budget_total?: number | null;
  budget_requirements?: Array<{ amount?: number | null; name?: string | null }> | null;
};

type TrainingLike = {
  created_at?: string | null;
};

function getYear(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.getFullYear();
}

function getMonthKey(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleString("en-PH", { month: "short", year: "numeric" });
}

export async function GET() {
  try {
    const admin = createAdminClient();

    const [{ data: projects, error: projectError }, { data: trainings, error: trainingError }] = await Promise.all([
      admin
        .from("projects")
        .select("created_at, funding_data, budget_total, budget_requirements"),
      admin.from("trainings").select("created_at"),
    ]);

    if (projectError) {
      return NextResponse.json({ error: projectError.message }, { status: 500 });
    }

    if (trainingError) {
      return NextResponse.json({ error: trainingError.message }, { status: 500 });
    }

    const projectRows = ((projects || []) as ProjectLike[]);
    const trainingRows = ((trainings || []) as TrainingLike[]);

    const yearlyMap = new Map<number, { projects: number; trainings: number; budget: number }>();
    const monthlyMap = new Map<string, { projects: number; trainings: number; budget: number }>();

    let overallBudget = 0;

    for (const project of projectRows) {
      const year = getYear(project.created_at);
      const month = getMonthKey(project.created_at);
      const projectBudget = getProjectBudgetSummaryTotal(project);
      overallBudget += projectBudget;

      if (year !== null) {
        const current = yearlyMap.get(year) || { projects: 0, trainings: 0, budget: 0 };
        current.projects += 1;
        current.budget += projectBudget;
        yearlyMap.set(year, current);
      }

      if (month) {
        const current = monthlyMap.get(month) || { projects: 0, trainings: 0, budget: 0 };
        current.projects += 1;
        current.budget += projectBudget;
        monthlyMap.set(month, current);
      }
    }

    for (const training of trainingRows) {
      const year = getYear(training.created_at);
      const month = getMonthKey(training.created_at);

      if (year !== null) {
        const current = yearlyMap.get(year) || { projects: 0, trainings: 0, budget: 0 };
        current.trainings += 1;
        yearlyMap.set(year, current);
      }

      if (month) {
        const current = monthlyMap.get(month) || { projects: 0, trainings: 0, budget: 0 };
        current.trainings += 1;
        monthlyMap.set(month, current);
      }
    }

    const yearly = Array.from(yearlyMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([year, values]) => ({ year, ...values }));

    const monthly = Array.from(monthlyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, values]) => ({ key, label: monthLabel(key), ...values }));

    const years = yearly.map((entry) => entry.year);

    return NextResponse.json({
      totals: {
        projects: projectRows.length,
        trainings: trainingRows.length,
        overallBudget,
      },
      years,
      yearly,
      monthly,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load landing metrics.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

