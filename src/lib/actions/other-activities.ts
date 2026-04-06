"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type OtherActivityCategory =
  | "Meeting"
  | "Workshop"
  | "Planning"
  | "Capacity Building for Extensionists"
  | "Community Outreach Activity";

export type OtherActivityFundSource =
  | "GAA"
  | "Income"
  | "External Project Fund"
  | "Donation"
  | "Others";

export interface OtherActivityPayload {
  activity_date: string | null;
  activity_title: string;
  category: OtherActivityCategory;
  purpose: string;
  participants: string;
  budget_involved: number;
  source_of_fund: OtherActivityFundSource;
  source_of_fund_other: string | null;
  remarks: string;
  documents: { url: string; name: string }[];
}

export interface OtherActivityRecord extends OtherActivityPayload {
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

export async function getOtherActivities() {
  const { adminClient, user, userType } = await getContext();

  let query = adminClient
    .from("other_activities")
    .select("*")
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (userType !== "super_admin") {
    query = query.eq("created_by", user.id);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching other activities:", error);
    return { error: error.message };
  }

  return { data: (data || []) as OtherActivityRecord[] };
}

export async function createOtherActivity(payload: OtherActivityPayload) {
  const { supabase, user, userType } = await getContext();

  if (!["project_leader", "super_admin"].includes(userType || "")) {
    return { error: "Insufficient permissions to create this record." };
  }

  const { data, error } = await supabase
    .from("other_activities")
    .insert([{ ...payload, created_by: user.id }])
    .select();

  if (error) {
    console.error("Error creating other activity:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { data };
}

export async function updateOtherActivity(id: string, payload: OtherActivityPayload) {
  const { supabase, adminClient, user, userType } = await getContext();

  if (!["project_leader", "super_admin"].includes(userType || "")) {
    return { error: "Insufficient permissions to update this record." };
  }

  let query = (userType === "super_admin" ? adminClient : supabase)
    .from("other_activities")
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
    console.error("Error updating other activity:", error);
    return { error: error.message };
  }

  if (!data || data.length === 0) {
    return { error: "Record not found or insufficient permissions." };
  }

  revalidatePath("/dashboard");
  return { data };
}

export async function deleteOtherActivity(id: string) {
  const { supabase, adminClient, user, userType } = await getContext();

  if (!["project_leader", "super_admin"].includes(userType || "")) {
    return { error: "Insufficient permissions to delete this record." };
  }

  let query = (userType === "super_admin" ? adminClient : supabase)
    .from("other_activities")
    .delete()
    .eq("id", id);

  if (userType !== "super_admin") {
    query = query.eq("created_by", user.id);
  }

  const { error } = await query;

  if (error) {
    console.error("Error deleting other activity:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
