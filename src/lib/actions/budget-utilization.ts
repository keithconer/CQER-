"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

export interface BudgetUtilizationRecord extends BudgetUtilizationPayload {
  id: string;
  created_at: string | null;
  updated_at: string | null;
  created_by: string;
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

  return { data: (data || []) as BudgetUtilizationRecord[] };
}

export async function createBudgetUtilization(payload: BudgetUtilizationPayload) {
  const { supabase, adminClient, user, userType } = await getContext();

  if (!RECORD_MANAGER_ROLES.includes(userType || "")) {
    return { error: "Insufficient permissions to create this record." };
  }

  const { data: existingRecord, error: existingError } = await adminClient
    .from("budget_utilizations")
    .select("id")
    .eq("project_id", payload.project_id)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    console.error("Error checking existing budget utilization:", existingError);
    return { error: existingError.message };
  }

  if (existingRecord?.id) {
    return { error: "A budget utilization record already exists for this project." };
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
