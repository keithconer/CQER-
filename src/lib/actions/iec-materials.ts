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

export type IecMaterialFormat = "video" | "brochure" | "pamphlet" | "e-formats";

export interface IecMaterialRecord {
  id: string;
  title: string;
  format: IecMaterialFormat;
  related_project_id: string | null;
  related_project_title: string | null;
  sdg_goals: string[];
  thematic_area: string[];
  male_count: number;
  female_count: number;
  student_count: number;
  farmer_count: number;
  fisherfolk_count: number;
  ag_technician_count: number;
  government_employee_count: number;
  private_employee_count: number;
  others_label: string | null;
  others_count: number;
  documents: { url: string; name: string }[];
  department: string | null;
  unit: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  created_by_name?: string | null;
}

export type CreateIecMaterialPayload = Omit<
  IecMaterialRecord,
  "id" | "created_at" | "updated_at" | "created_by" | "created_by_name" | "department" | "unit"
>;

type ProfileLite = {
  id: string;
  user_type: UserRole | null;
  department: string | null;
  unit: string | null;
  first_name: string | null;
  last_name: string | null;
};

function normalizeRecord(record: Record<string, unknown>, creator?: ProfileLite | null) {
  const fullName = [creator?.first_name, creator?.last_name].filter(Boolean).join(" ").trim();
  return {
    ...record,
    sdg_goals: Array.isArray(record.sdg_goals) ? (record.sdg_goals as string[]) : [],
    thematic_area: Array.isArray(record.thematic_area) ? (record.thematic_area as string[]) : [],
    documents: Array.isArray(record.documents) ? (record.documents as { url: string; name: string }[]) : [],
    male_count: Number(record.male_count || 0),
    female_count: Number(record.female_count || 0),
    student_count: Number(record.student_count || 0),
    farmer_count: Number(record.farmer_count || 0),
    fisherfolk_count: Number(record.fisherfolk_count || 0),
    ag_technician_count: Number(record.ag_technician_count || 0),
    government_employee_count: Number(record.government_employee_count || 0),
    private_employee_count: Number(record.private_employee_count || 0),
    others_count: Number(record.others_count || 0),
    created_by_name: fullName || null,
  } as IecMaterialRecord;
}

async function getAuthorizedProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, user_type, department, unit, first_name, last_name")
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
  record: Pick<IecMaterialRecord, "created_by" | "department">,
  profile: ProfileLite,
  userId: string
) {
  if (profile.user_type === "super_admin") return true;
  if (profile.user_type === "college_coordinator") return record.department === profile.department;
  return record.created_by === userId;
}

export async function getIecMaterials() {
  const { profile, user } = await getAuthorizedProfile();
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("iec_materials")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching IEC materials:", error);
    return { error: error.message };
  }

  const visibleRecords = (data || []).filter((record) => canViewRecordForProfile(record, profile, user.id));
  const creatorIds = Array.from(new Set(visibleRecords.map((record) => String(record.created_by || "")).filter(Boolean)));

  let creatorMap = new Map<string, ProfileLite>();
  if (creatorIds.length > 0) {
    const { data: creators } = await adminClient
      .from("profiles")
      .select("id, user_type, department, unit, first_name, last_name")
      .in("id", creatorIds);
    creatorMap = new Map((creators || []).map((item) => [item.id, item as ProfileLite]));
  }

  return {
    data: visibleRecords.map((record) => normalizeRecord(record, creatorMap.get(String(record.created_by)))),
  };
}

export async function createIecMaterial(payload: CreateIecMaterialPayload) {
  const {
    user,
    profile: { department, unit },
  } = await getAuthorizedProfile();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("iec_materials")
    .insert([{ ...payload, department, unit, created_by: user.id }])
    .select()
    .single();

  if (error) {
    console.error("Error creating IEC material:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { data: normalizeRecord(data as Record<string, unknown>) };
}

export async function updateIecMaterial(id: string, payload: Partial<CreateIecMaterialPayload>) {
  const { user, profile } = await getAuthorizedProfile();
  const adminClient = createAdminClient();

  const { data: existing, error: existingError } = await adminClient
    .from("iec_materials")
    .select("id, created_by, department")
    .eq("id", id)
    .single();

  if (existingError || !existing) return { error: "Record not found" };
  if (!canManageRecordForProfile(existing as IecMaterialRecord, profile, user.id)) {
    return { error: "Insufficient permissions to update this record" };
  }

  const { data, error } = await adminClient
    .from("iec_materials")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating IEC material:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { data: normalizeRecord(data as Record<string, unknown>) };
}

export async function deleteIecMaterial(id: string) {
  const { user, profile } = await getAuthorizedProfile();
  const adminClient = createAdminClient();

  const { data: existing, error: existingError } = await adminClient
    .from("iec_materials")
    .select("id, created_by, department")
    .eq("id", id)
    .single();

  if (existingError || !existing) return { error: "Record not found" };
  if (!canManageRecordForProfile(existing as IecMaterialRecord, profile, user.id)) {
    return { error: "Insufficient permissions to delete this record" };
  }

  const { error } = await adminClient.from("iec_materials").delete().eq("id", id);
  if (error) {
    console.error("Error deleting IEC material:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
