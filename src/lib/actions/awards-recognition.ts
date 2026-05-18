"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { attachCreatorProfiles, type CreatorProfileFields } from "@/lib/actions/creator-details";

const RECORD_MANAGER_ROLES = ["project_leader", "college_coordinator", "super_admin"];

export type AwardLevel = "local" | "regional" | "national" | "international";

export interface AwardsRecognitionPayload {
  award_title: string;
  donor_body: string;
  level: AwardLevel;
  date_received: string | null;
  event_title: string;
  project_id: string | null;
  project_title: string | null;
  documents: { url: string; name: string }[];
}

export interface AwardsRecognitionRecord extends AwardsRecognitionPayload, CreatorProfileFields {
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

export async function getAwardsRecognitions() {
  const { adminClient, user, userType } = await getContext();

  let query = adminClient
    .from("awards_recognitions")
    .select("*")
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (userType !== "super_admin") {
    query = query.eq("created_by", user.id);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching awards and recognitions:", error);
    return { error: error.message };
  }

  return { data: await attachCreatorProfiles(adminClient, (data || []) as AwardsRecognitionRecord[]) };
}

export async function createAwardsRecognition(payload: AwardsRecognitionPayload) {
  const { supabase, user, userType } = await getContext();

  if (!RECORD_MANAGER_ROLES.includes(userType || "")) {
    return { error: "Insufficient permissions to create this record." };
  }

  const { data, error } = await supabase
    .from("awards_recognitions")
    .insert([{ ...payload, created_by: user.id }])
    .select();

  if (error) {
    console.error("Error creating awards and recognition record:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { data };
}

export async function updateAwardsRecognition(id: string, payload: AwardsRecognitionPayload) {
  const { supabase, adminClient, user, userType } = await getContext();

  if (!RECORD_MANAGER_ROLES.includes(userType || "")) {
    return { error: "Insufficient permissions to update this record." };
  }

  let query = (userType === "super_admin" ? adminClient : supabase)
    .from("awards_recognitions")
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
    console.error("Error updating awards and recognition record:", error);
    return { error: error.message };
  }

  if (!data || data.length === 0) {
    return { error: "Record not found or insufficient permissions." };
  }

  revalidatePath("/dashboard");
  return { data };
}

export async function deleteAwardsRecognition(id: string) {
  const { supabase, adminClient, user, userType } = await getContext();

  if (!RECORD_MANAGER_ROLES.includes(userType || "")) {
    return { error: "Insufficient permissions to delete this record." };
  }

  let query = (userType === "super_admin" ? adminClient : supabase)
    .from("awards_recognitions")
    .delete()
    .eq("id", id);

  if (userType !== "super_admin") {
    query = query.eq("created_by", user.id);
  }

  const { error } = await query;

  if (error) {
    console.error("Error deleting awards and recognition record:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
