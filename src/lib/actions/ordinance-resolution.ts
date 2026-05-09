"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const RECORD_MANAGER_ROLES = ["project_leader", "college_coordinator", "super_admin"];

export type OrdinanceResolutionStatus = "submitted" | "endorsed" | "approved";

export interface OrdinanceResolutionPayload {
  name: string;
  implementing_agency: string;
  status: OrdinanceResolutionStatus;
  date_of_approval: string | null;
  project_id: string | null;
  project_title: string | null;
  documents: { url: string; name: string }[];
}

export interface OrdinanceResolutionRecord extends OrdinanceResolutionPayload {
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

export async function getOrdinanceResolutions() {
  const { adminClient, user, userType } = await getContext();

  let query = adminClient
    .from("ordinance_resolutions")
    .select("*")
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (userType !== "super_admin") {
    query = query.eq("created_by", user.id);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching ordinance/resolution records:", error);
    return { error: error.message };
  }

  return { data: (data || []) as OrdinanceResolutionRecord[] };
}

export async function createOrdinanceResolution(payload: OrdinanceResolutionPayload) {
  const { supabase, user, userType } = await getContext();

  if (!RECORD_MANAGER_ROLES.includes(userType || "")) {
    return { error: "Insufficient permissions to create this record." };
  }

  const { data, error } = await supabase
    .from("ordinance_resolutions")
    .insert([
      {
        ...payload,
        created_by: user.id,
      },
    ])
    .select();

  if (error) {
    console.error("Error creating ordinance/resolution:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { data };
}

export async function updateOrdinanceResolution(id: string, payload: OrdinanceResolutionPayload) {
  const { supabase, adminClient, user, userType } = await getContext();

  if (!RECORD_MANAGER_ROLES.includes(userType || "")) {
    return { error: "Insufficient permissions to update this record." };
  }

  let query = (userType === "super_admin" ? adminClient : supabase)
    .from("ordinance_resolutions")
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
    console.error("Error updating ordinance/resolution:", error);
    return { error: error.message };
  }

  if (!data || data.length === 0) {
    return { error: "Record not found or insufficient permissions." };
  }

  revalidatePath("/dashboard");
  return { data };
}

export async function deleteOrdinanceResolution(id: string) {
  const { supabase, adminClient, user, userType } = await getContext();

  if (!RECORD_MANAGER_ROLES.includes(userType || "")) {
    return { error: "Insufficient permissions to delete this record." };
  }

  let query = (userType === "super_admin" ? adminClient : supabase)
    .from("ordinance_resolutions")
    .delete()
    .eq("id", id);

  if (userType !== "super_admin") {
    query = query.eq("created_by", user.id);
  }

  const { error } = await query;

  if (error) {
    console.error("Error deleting ordinance/resolution:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
