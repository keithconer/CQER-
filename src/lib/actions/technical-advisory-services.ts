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

export type TechnicalAdvisoryCategory = "internal" | "external";
export type TechnicalAdvisorySex = "male" | "female";
export type TechnicalAdvisoryContactThrough = "email" | "phone" | "both";

export interface TechnicalAdvisoryClient {
  name: string;
  sex: TechnicalAdvisorySex;
  position: string;
  contact_through: TechnicalAdvisoryContactThrough;
  email?: string;
  phone_number?: string;
}

export interface TechnicalAdvisoryFacultyMember {
  name: string;
}

export interface RatingBreakdown {
  "5": number;
  "4": number;
  "3": number;
  "2": number;
  "1": number;
}

export interface TechnicalAdvisoryServiceRecord {
  id: string;
  agency_name: string;
  agency_address: string;
  clients: TechnicalAdvisoryClient[];
  category: TechnicalAdvisoryCategory;
  advisory_date: string;
  venue: string;
  faculty_members: TechnicalAdvisoryFacultyMember[];
  number_of_hours: number;
  rating_relevance_breakdown: RatingBreakdown;
  rating_quality_breakdown: RatingBreakdown;
  rating_timeliness_breakdown: RatingBreakdown;
  rating_overall_breakdown: RatingBreakdown;
  documents: { url: string; name: string }[];
  department: string | null;
  unit: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  created_by_name?: string | null;
}

export type CreateTechnicalAdvisoryServicePayload = Omit<
  TechnicalAdvisoryServiceRecord,
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

const emptyRatings: RatingBreakdown = { "5": 0, "4": 0, "3": 0, "2": 0, "1": 0 };

function normalizeRatings(raw: unknown): RatingBreakdown {
  if (!raw || typeof raw !== "object") return emptyRatings;
  const source = raw as Record<string, unknown>;
  return {
    "5": Number(source["5"] || 0),
    "4": Number(source["4"] || 0),
    "3": Number(source["3"] || 0),
    "2": Number(source["2"] || 0),
    "1": Number(source["1"] || 0),
  };
}

function normalizeRecord(record: Record<string, unknown>, creator?: ProfileLite | null) {
  const fullName = [creator?.first_name, creator?.last_name].filter(Boolean).join(" ").trim();
  return {
    ...record,
    clients: Array.isArray(record.clients) ? (record.clients as TechnicalAdvisoryClient[]) : [],
    faculty_members: Array.isArray(record.faculty_members)
      ? (record.faculty_members as TechnicalAdvisoryFacultyMember[])
      : [],
    documents: Array.isArray(record.documents)
      ? (record.documents as { url: string; name: string }[])
      : [],
    rating_relevance_breakdown: normalizeRatings(record.rating_relevance_breakdown),
    rating_quality_breakdown: normalizeRatings(record.rating_quality_breakdown),
    rating_timeliness_breakdown: normalizeRatings(record.rating_timeliness_breakdown),
    rating_overall_breakdown: normalizeRatings(record.rating_overall_breakdown),
    created_by_name: fullName || null,
  } as TechnicalAdvisoryServiceRecord;
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
  if (profile.user_type === "college_coordinator") {
    return (record.department as string | null) === profile.department;
  }
  if (profile.user_type === "unit_coordinator") {
    return (
      (record.department as string | null) === profile.department &&
      (record.unit as string | null) === profile.unit
    );
  }
  return String(record.created_by || "") === userId;
}

function canManageRecordForProfile(
  record: Pick<TechnicalAdvisoryServiceRecord, "created_by" | "department">,
  profile: ProfileLite,
  userId: string
) {
  if (profile.user_type === "super_admin") return true;
  if (profile.user_type === "college_coordinator") return record.department === profile.department;
  return record.created_by === userId;
}

export async function getTechnicalAdvisoryServices() {
  const { profile, user } = await getAuthorizedProfile();
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("technical_advisory_services")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching technical advisory services:", error);
    return { error: error.message };
  }

  const visibleRecords = (data || []).filter((record) => canViewRecordForProfile(record, profile, user.id));
  const creatorIds = Array.from(
    new Set(visibleRecords.map((record) => String(record.created_by || "")).filter(Boolean))
  );

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

export async function createTechnicalAdvisoryService(payload: CreateTechnicalAdvisoryServicePayload) {
  const {
    user,
    profile: { department, unit },
  } = await getAuthorizedProfile();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("technical_advisory_services")
    .insert([
      {
        ...payload,
        department,
        unit,
        created_by: user.id,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error creating technical advisory service:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { data: normalizeRecord(data as Record<string, unknown>) };
}

export async function updateTechnicalAdvisoryService(
  id: string,
  payload: Partial<CreateTechnicalAdvisoryServicePayload>
) {
  const { user, profile } = await getAuthorizedProfile();
  const adminClient = createAdminClient();

  const { data: existing, error: existingError } = await adminClient
    .from("technical_advisory_services")
    .select("id, created_by, department")
    .eq("id", id)
    .single();

  if (existingError || !existing) {
    return { error: "Record not found" };
  }

  if (!canManageRecordForProfile(existing as TechnicalAdvisoryServiceRecord, profile, user.id)) {
    return { error: "Insufficient permissions to update this record" };
  }

  const { data, error } = await adminClient
    .from("technical_advisory_services")
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating technical advisory service:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { data: normalizeRecord(data as Record<string, unknown>) };
}

export async function deleteTechnicalAdvisoryService(id: string) {
  const { user, profile } = await getAuthorizedProfile();
  const adminClient = createAdminClient();

  const { data: existing, error: existingError } = await adminClient
    .from("technical_advisory_services")
    .select("id, created_by, department")
    .eq("id", id)
    .single();

  if (existingError || !existing) {
    return { error: "Record not found" };
  }

  if (!canManageRecordForProfile(existing as TechnicalAdvisoryServiceRecord, profile, user.id)) {
    return { error: "Insufficient permissions to delete this record" };
  }

  const { error } = await adminClient
    .from("technical_advisory_services")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting technical advisory service:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
