"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const RECORD_MANAGER_ROLES = ["project_leader", "college_coordinator", "super_admin"];

export interface ImpactAssessmentPayload {
  project_id: string | null;
  activity_name: string;
  proponent: string;
  lead_evaluator: string;
  date_of_assessment: string | null;
  documents: { url: string; name: string }[];
}

export interface ImpactAssessmentRecord extends ImpactAssessmentPayload {
  id: string;
  created_by: string;
  created_at: string | null;
  updated_at: string | null;
}

async function getContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

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

export async function getImpactAssessments() {
  const { adminClient, user, userType } = await getContext();

  let query = adminClient
    .from("impact_assessments")
    .select("*")
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (userType !== "super_admin") {
    query = query.eq("created_by", user.id);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching impact assessments:", error);
    return { error: error.message };
  }

  return { data: (data || []) as ImpactAssessmentRecord[] };
}

export async function createImpactAssessment(payload: ImpactAssessmentPayload) {
  const { supabase, user, userType } = await getContext();

  if (!RECORD_MANAGER_ROLES.includes(userType || "")) {
    return { error: "Insufficient permissions to create this record." };
  }

  const { data, error } = await supabase
    .from("impact_assessments")
    .insert([{ ...payload, created_by: user.id }])
    .select();

  if (error) {
    console.error("Error creating impact assessment:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { data };
}

export async function updateImpactAssessment(id: string, payload: ImpactAssessmentPayload) {
  const { supabase, adminClient, user, userType } = await getContext();

  if (!RECORD_MANAGER_ROLES.includes(userType || "")) {
    return { error: "Insufficient permissions to update this record." };
  }

  let query = (userType === "super_admin" ? adminClient : supabase)
    .from("impact_assessments")
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
    console.error("Error updating impact assessment:", error);
    return { error: error.message };
  }

  if (!data || data.length === 0) {
    return { error: "Record not found or insufficient permissions." };
  }

  revalidatePath("/dashboard");
  return { data };
}

export async function deleteImpactAssessment(id: string) {
  const { supabase, adminClient, user, userType } = await getContext();

  if (!RECORD_MANAGER_ROLES.includes(userType || "")) {
    return { error: "Insufficient permissions to delete this record." };
  }

  let query = (userType === "super_admin" ? adminClient : supabase)
    .from("impact_assessments")
    .delete()
    .eq("id", id);

  if (userType !== "super_admin") {
    query = query.eq("created_by", user.id);
  }

  const { error } = await query;

  if (error) {
    console.error("Error deleting impact assessment:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
