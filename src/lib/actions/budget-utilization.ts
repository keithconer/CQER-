"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { attachCreatorProfiles, type CreatorProfileFields } from "@/lib/actions/creator-details";

const RECORD_MANAGER_ROLES = ["project_leader", "college_coordinator", "super_admin"];

export interface BudgetUtilizationMonthEntry {
  year: number;
  month: number;
  month_key: string;
  month_label: string;
  coverage_start: string;
  coverage_end: string;
  food_and_beverage: number;
  travel: number;
  suppliers_and_materials: number;
  communication: number;
  other_mooe: number;
  total: number;
}

export interface BudgetUtilizationPayload {
  project_id: string;
  project_title: string;
  total_budget: number;
  utilized_total: number;
  coverage_start: string;
  coverage_end: string;
  monthly_breakdown: BudgetUtilizationMonthEntry[];
  documents: { url: string; name: string }[];
}

export interface BudgetUtilizationRecord extends BudgetUtilizationPayload, CreatorProfileFields {
  id: string;
  created_at: string | null;
  updated_at: string | null;
  created_by: string;
}

function sumMonthEntry(entry: Partial<BudgetUtilizationMonthEntry>) {
  return (
    Number(entry.food_and_beverage || 0) +
    Number(entry.travel || 0) +
    Number(entry.suppliers_and_materials || 0) +
    Number(entry.communication || 0) +
    Number(entry.other_mooe || 0)
  );
}

function normalizeMonthlyBreakdown(entries: unknown): BudgetUtilizationMonthEntry[] {
  if (!Array.isArray(entries)) return [];

  return entries
    .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === "object"))
    .map((entry) => {
      const normalized = {
        year: Number(entry.year || 0),
        month: Number(entry.month || 0),
        month_key: String(entry.month_key || ""),
        month_label: String(entry.month_label || ""),
        coverage_start: String(entry.coverage_start || ""),
        coverage_end: String(entry.coverage_end || ""),
        food_and_beverage: Number(entry.food_and_beverage || 0),
        travel: Number(entry.travel || 0),
        suppliers_and_materials: Number(entry.suppliers_and_materials || 0),
        communication: Number(entry.communication || 0),
        other_mooe: Number(entry.other_mooe || 0),
        total: 0,
      };

      return {
        ...normalized,
        total: sumMonthEntry(normalized),
      };
    })
    .filter((entry) => entry.year > 0 && entry.month > 0 && entry.month_key);
}

function mergeMonthlyBreakdowns(
  existingEntries: BudgetUtilizationMonthEntry[],
  nextEntries: BudgetUtilizationMonthEntry[]
) {
  const nextMap = new Map(nextEntries.map((entry) => [entry.month_key, entry]));
  const mergedEntries = existingEntries.map((entry) => {
    const nextEntry = nextMap.get(entry.month_key);
    const merged = {
      ...entry,
      food_and_beverage: Number(entry.food_and_beverage || 0) + Number(nextEntry?.food_and_beverage || 0),
      travel: Number(entry.travel || 0) + Number(nextEntry?.travel || 0),
      suppliers_and_materials:
        Number(entry.suppliers_and_materials || 0) + Number(nextEntry?.suppliers_and_materials || 0),
      communication: Number(entry.communication || 0) + Number(nextEntry?.communication || 0),
      other_mooe: Number(entry.other_mooe || 0) + Number(nextEntry?.other_mooe || 0),
    };

    return {
      ...merged,
      total: sumMonthEntry(merged),
    };
  });

  const existingKeys = new Set(existingEntries.map((entry) => entry.month_key));
  nextEntries.forEach((entry) => {
    if (!existingKeys.has(entry.month_key)) {
      mergedEntries.push({
        ...entry,
        total: sumMonthEntry(entry),
      });
    }
  });

  return mergedEntries.sort((left, right) => left.month_key.localeCompare(right.month_key));
}

function normalizeDocuments(documents: unknown): { url: string; name: string }[] {
  if (!Array.isArray(documents)) return [];

  return documents.filter(
    (document): document is { url: string; name: string } =>
      Boolean(
        document &&
          typeof document === "object" &&
          typeof (document as { url?: unknown }).url === "string" &&
          typeof (document as { name?: unknown }).name === "string"
      )
  );
}

function mergeDocuments(
  existingDocuments: { url: string; name: string }[],
  nextDocuments: { url: string; name: string }[]
) {
  const documentMap = new Map<string, { url: string; name: string }>();
  [...existingDocuments, ...nextDocuments].forEach((document) => {
    if (document.url) documentMap.set(document.url, document);
  });
  return Array.from(documentMap.values());
}

async function getContext() {
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

  return {
    supabase,
    adminClient: createAdminClient(),
    user,
    userType: profile?.user_type || null,
  };
}

export async function getBudgetUtilizations() {
  const { adminClient, user, userType } = await getContext();

  let query = adminClient
    .from("budget_utilizations")
    .select("*")
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (userType !== "super_admin") {
    query = query.eq("created_by", user.id);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching budget utilization records:", error);
    return { error: error.message };
  }

  return { data: await attachCreatorProfiles(adminClient, (data || []) as BudgetUtilizationRecord[]) };
}

export async function createBudgetUtilization(payload: BudgetUtilizationPayload) {
  const { supabase, adminClient, user, userType } = await getContext();

  if (!RECORD_MANAGER_ROLES.includes(userType || "")) {
    return { error: "Insufficient permissions to create this record." };
  }

  const { data: existingRecord, error: existingError } = await adminClient
    .from("budget_utilizations")
    .select("id, created_by, monthly_breakdown, documents, utilized_total")
    .eq("project_id", payload.project_id)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    console.error("Error checking existing budget utilization:", existingError);
    return { error: existingError.message };
  }

  if (existingRecord?.id) {
    if (userType !== "super_admin" && existingRecord.created_by !== user.id) {
      return { error: "A budget utilization record already exists for this project." };
    }

    const existingBreakdown = normalizeMonthlyBreakdown(existingRecord.monthly_breakdown);
    const nextBreakdown = normalizeMonthlyBreakdown(payload.monthly_breakdown);
    const mergedBreakdown = mergeMonthlyBreakdowns(existingBreakdown, nextBreakdown);
    const nextUtilizedTotal = nextBreakdown.reduce((sum, entry) => sum + sumMonthEntry(entry), 0);
    const existingDocuments = normalizeDocuments(existingRecord.documents);
    const nextDocuments = normalizeDocuments(payload.documents);
    const updateClient = userType === "super_admin" ? adminClient : supabase;

    const { data, error } = await updateClient
      .from("budget_utilizations")
      .update({
        ...payload,
        utilized_total: Number(existingRecord.utilized_total || 0) + nextUtilizedTotal,
        monthly_breakdown: mergedBreakdown,
        documents: mergeDocuments(existingDocuments, nextDocuments),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingRecord.id)
      .select();

    if (error) {
      console.error("Error updating existing budget utilization:", error);
      return { error: error.message };
    }

    revalidatePath("/dashboard");
    return { data };
  }

  const { data, error } = await supabase
    .from("budget_utilizations")
    .insert([
      {
        ...payload,
        created_by: user.id,
      },
    ])
    .select();

  if (error) {
    console.error("Error creating budget utilization:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { data };
}

export async function updateBudgetUtilization(id: string, payload: BudgetUtilizationPayload) {
  const { supabase, adminClient, user, userType } = await getContext();

  if (!RECORD_MANAGER_ROLES.includes(userType || "")) {
    return { error: "Insufficient permissions to update this record." };
  }

  let query = (userType === "super_admin" ? adminClient : supabase)
    .from("budget_utilizations")
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (userType !== "super_admin") {
    query = query.eq("created_by", user.id);
  }

  const { data, error } = await query.select();

  if (error) {
    console.error("Error updating budget utilization:", error);
    return { error: error.message };
  }

  if (!data || data.length === 0) {
    return { error: "Record not found or insufficient permissions." };
  }

  revalidatePath("/dashboard");
  return { data };
}

export async function deleteBudgetUtilization(id: string) {
  const { supabase, adminClient, user, userType } = await getContext();

  if (!RECORD_MANAGER_ROLES.includes(userType || "")) {
    return { error: "Insufficient permissions to delete this record." };
  }

  let query = (userType === "super_admin" ? adminClient : supabase)
    .from("budget_utilizations")
    .delete()
    .eq("id", id);

  if (userType !== "super_admin") {
    query = query.eq("created_by", user.id);
  }

  const { error } = await query;

  if (error) {
    console.error("Error deleting budget utilization:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
