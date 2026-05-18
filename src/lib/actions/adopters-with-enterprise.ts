"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type UserRole =
  | "super_admin"
  | "college_coordinator"
  | "unit_coordinator"
  | "extension_office"
  | "project_leader";

export type AdopterCategory = "internal" | "external";
export type AdopterSex = "male" | "female";
export type ContactThrough = "email" | "phone" | "both";
export type IncomeType = "estimated" | "exact";

export interface AdopterContact {
  name: string;
  address: string;
  contact_through: ContactThrough;
  email?: string;
  phone_number?: string;
  sex: AdopterSex;
  category: AdopterCategory;
  monthly_income_before_type: IncomeType;
  monthly_income_before_value: number;
  monthly_income_after_type: IncomeType;
  monthly_income_after_value: number;
  monthly_income_difference_type: IncomeType;
  monthly_income_difference_value: number;
}

export interface AdoptersWithEnterpriseRecord {
  id: string;
  technology_transferred: string;
  transfer_date: string;
  related_project_id: string | null;
  related_project_title: string | null;
  adopters: AdopterContact[];
  documents: { url: string; name: string }[];
  department: string | null;
  unit: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  created_by_name?: string | null;
  created_by_avatar_url?: string | null;
  creator_user_type?: string | null;
}

export type CreateAdoptersWithEnterprisePayload = Omit<
  AdoptersWithEnterpriseRecord,
  "id" | "created_at" | "updated_at" | "created_by" | "created_by_name" | "department" | "unit"
>;

type ProfileLite = {
  id: string;
  user_type: UserRole | null;
  department: string | null;
  unit: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url?: string | null;
};

function normalizeRecord(record: Record<string, unknown>, creator?: ProfileLite | null) {
  const fullName = [creator?.first_name, creator?.last_name].filter(Boolean).join(" ").trim();
  return {
    ...record,
    adopters: Array.isArray(record.adopters) ? (record.adopters as AdopterContact[]) : [],
    documents: Array.isArray(record.documents) ? (record.documents as { url: string; name: string }[]) : [],
    created_by_name: fullName || null,
    created_by_avatar_url: creator?.avatar_url || null,
    creator_user_type: creator?.user_type || null,
  } as AdoptersWithEnterpriseRecord;
}

async function getAuthorizedProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, user_type, department, unit, first_name, last_name, avatar_url")
    .eq("id", user.id)
    .single();

  if (error || !profile) throw new Error("Profile not found");
  if (!["super_admin", "college_coordinator", "unit_coordinator", "project_leader"].includes(profile.user_type || "")) {
    throw new Error("Insufficient permissions");
  }

  return { user, profile: profile as ProfileLite };
}

function canViewRecordForProfile(record: Record<string, unknown>, profile: ProfileLite, userId: string) {
  if (profile.user_type === "super_admin") return true;
  if (profile.user_type === "college_coordinator") return (record.department as string | null) === profile.department;
  if (profile.user_type === "unit_coordinator") {
    return (record.department as string | null) === profile.department && (record.unit as string | null) === profile.unit;
  }
  return String(record.created_by || "") === userId;
}

function canManageRecordForProfile(
  record: Pick<AdoptersWithEnterpriseRecord, "created_by" | "department">,
  profile: ProfileLite,
  userId: string
) {
  if (profile.user_type === "super_admin") return true;
  if (profile.user_type === "college_coordinator") return record.department === profile.department;
  return record.created_by === userId;
}

export async function getAdoptersWithEnterprise() {
  const { profile, user } = await getAuthorizedProfile();
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("adopters_with_enterprise")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching adopters with enterprise:", error);
    return { error: error.message };
  }

  const visibleRecords = (data || []).filter((record) => canViewRecordForProfile(record, profile, user.id));
  const creatorIds = Array.from(new Set(visibleRecords.map((record) => String(record.created_by || "")).filter(Boolean)));

  let creatorMap = new Map<string, ProfileLite>();
  if (creatorIds.length > 0) {
    const { data: creators } = await adminClient
      .from("profiles")
      .select("id, user_type, department, unit, first_name, last_name, avatar_url")
      .in("id", creatorIds);
    creatorMap = new Map((creators || []).map((item) => [item.id, item as ProfileLite]));
  }

  return {
    data: visibleRecords.map((record) => normalizeRecord(record, creatorMap.get(String(record.created_by)))),
  };
}

export async function createAdoptersWithEnterprise(payload: CreateAdoptersWithEnterprisePayload) {
  const {
    user,
    profile: { department, unit },
  } = await getAuthorizedProfile();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("adopters_with_enterprise")
    .insert([{ ...payload, department, unit, created_by: user.id }])
    .select()
    .single();

  if (error) {
    console.error("Error creating adopters with enterprise record:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { data: normalizeRecord(data as Record<string, unknown>) };
}

export async function updateAdoptersWithEnterprise(
  id: string,
  payload: Partial<CreateAdoptersWithEnterprisePayload>
) {
  const { user, profile } = await getAuthorizedProfile();
  const adminClient = createAdminClient();

  const { data: existing, error: existingError } = await adminClient
    .from("adopters_with_enterprise")
    .select("id, created_by, department")
    .eq("id", id)
    .single();

  if (existingError || !existing) return { error: "Record not found" };
  if (!canManageRecordForProfile(existing as AdoptersWithEnterpriseRecord, profile, user.id)) {
    return { error: "Insufficient permissions to update this record" };
  }

  const { data, error } = await adminClient
    .from("adopters_with_enterprise")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating adopters with enterprise record:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { data: normalizeRecord(data as Record<string, unknown>) };
}

export async function deleteAdoptersWithEnterprise(id: string) {
  const { user, profile } = await getAuthorizedProfile();
  const adminClient = createAdminClient();

  const { data: existing, error: existingError } = await adminClient
    .from("adopters_with_enterprise")
    .select("id, created_by, department")
    .eq("id", id)
    .single();

  if (existingError || !existing) return { error: "Record not found" };
  if (!canManageRecordForProfile(existing as AdoptersWithEnterpriseRecord, profile, user.id)) {
    return { error: "Insufficient permissions to delete this record" };
  }

  const { error } = await adminClient.from("adopters_with_enterprise").delete().eq("id", id);
  if (error) {
    console.error("Error deleting adopters with enterprise record:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
