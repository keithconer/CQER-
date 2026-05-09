"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const RECORD_MANAGER_ROLES = ["project_leader", "college_coordinator", "super_admin"];

export interface ExtensionProgramPayload {
  project_id: string | null;
  project_title: string | null;
  activity_title: string;
  media_channels: string;
  date_featured: string | null;
  remarks: string;
  documents: { url: string; name: string }[];
}

export interface ExtensionProgramRecord extends ExtensionProgramPayload {
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

export async function getExtensionPrograms() {
  const { adminClient, user, userType } = await getContext();

  let query = adminClient
    .from("extension_programs")
    .select("*")
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (userType !== "super_admin") {
    query = query.eq("created_by", user.id);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching extension programs:", error);
    return { error: error.message };
  }

  return { data: (data || []) as ExtensionProgramRecord[] };
}

export async function createExtensionProgram(payload: ExtensionProgramPayload) {
  const { supabase, user, userType } = await getContext();

  if (!RECORD_MANAGER_ROLES.includes(userType || "")) {
    return { error: "Insufficient permissions to create this record." };
  }

  const { data, error } = await supabase
    .from("extension_programs")
    .insert([{ ...payload, created_by: user.id }])
    .select();

  if (error) {
    console.error("Error creating extension program:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { data };
}

export async function updateExtensionProgram(id: string, payload: ExtensionProgramPayload) {
  const { supabase, adminClient, user, userType } = await getContext();

  if (!RECORD_MANAGER_ROLES.includes(userType || "")) {
    return { error: "Insufficient permissions to update this record." };
  }

  let query = (userType === "super_admin" ? adminClient : supabase)
    .from("extension_programs")
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
    console.error("Error updating extension program:", error);
    return { error: error.message };
  }

  if (!data || data.length === 0) {
    return { error: "Record not found or insufficient permissions." };
  }

  revalidatePath("/dashboard");
  return { data };
}

export async function deleteExtensionProgram(id: string) {
  const { supabase, adminClient, user, userType } = await getContext();

  if (!RECORD_MANAGER_ROLES.includes(userType || "")) {
    return { error: "Insufficient permissions to delete this record." };
  }

  let query = (userType === "super_admin" ? adminClient : supabase)
    .from("extension_programs")
    .delete()
    .eq("id", id);

  if (userType !== "super_admin") {
    query = query.eq("created_by", user.id);
  }

  const { error } = await query;

  if (error) {
    console.error("Error deleting extension program:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
