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

export interface TechnicalAdvisoryClient {
  name: string;
  sex: "male" | "female" | "";
  address: string;
  agency_office_unit: string;
  position: string;
  contact_no?: string;
  email: string;
  category:
    | "student"
    | "farmer"
    | "fisherfolk"
    | "government"
    | "employee"
    | "private_employee"
    | "organization"
    | "others";
  category_other?: string;
}

export interface TechnicalAdvisoryServicePerson {
  name: string;
}

export interface TechnicalAdvisoryServiceRecord {
  id: string;
  project_no: string;
  project_title: string;
  lead_unit: string;
  college: string;
  contact_person: string;
  related_curricular_offerings: string[] | null;
  department: string | null;
  unit: string | null;
  advisory_date: string;
  venue: string;
  service_persons: TechnicalAdvisoryServicePerson[];
  service_provided:
    | "Technical assistance"
    | "Consultation"
    | "Resource person"
    | "Technology promotion"
    | "Value adding"
    | "Others";
  service_provided_other?: string | null;
  clients: TechnicalAdvisoryClient[];
  quality_score: number | null;
  relevance_score: number | null;
  timeliness_score: number | null;
  overall_satisfaction_score: number | null;
  comments_suggestions?: string | null;
  document_url?: string | null;
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

function normalizeRecord(record: Record<string, unknown>, creator?: ProfileLite | null) {
  const fullName = [creator?.first_name, creator?.last_name].filter(Boolean).join(" ").trim();
  return {
    ...record,
    related_curricular_offerings: Array.isArray(record.related_curricular_offerings)
      ? (record.related_curricular_offerings as string[])
      : [],
    service_persons: Array.isArray(record.service_persons)
      ? (record.service_persons as TechnicalAdvisoryServicePerson[])
      : [],
    clients: Array.isArray(record.clients)
      ? (record.clients as TechnicalAdvisoryClient[])
      : [],
    created_by_name: fullName || null,
  } as TechnicalAdvisoryServiceRecord;
}

function canViewRecordForProfile(record: Record<string, unknown>, profile: ProfileLite) {
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
  return false;
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

  if (!["super_admin", "college_coordinator", "unit_coordinator"].includes(profile.user_type || "")) {
    throw new Error("Insufficient permissions");
  }

  return { user, profile: profile as ProfileLite };
}

export async function getTechnicalAdvisoryServices() {
  const { profile } = await getAuthorizedProfile();
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("technical_advisory_services")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching technical advisory services:", error);
    return [];
  }

  const records = (data || []).filter((record) => canViewRecordForProfile(record, profile));
  const creatorIds = Array.from(
    new Set(records.map((record) => String(record.created_by || "")).filter(Boolean))
  );

  let creatorMap = new Map<string, ProfileLite>();
  if (creatorIds.length > 0) {
    const { data: creators } = await adminClient
      .from("profiles")
      .select("id, user_type, department, unit, first_name, last_name")
      .in("id", creatorIds);
    creatorMap = new Map((creators || []).map((item) => [item.id, item as ProfileLite]));
  }

  return records.map((record) => normalizeRecord(record, creatorMap.get(String(record.created_by))));
}

export async function createTechnicalAdvisoryService(
  payload: CreateTechnicalAdvisoryServicePayload
) {
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
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  return data;
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

  if (existingError || !existing) throw new Error("Record not found");

  if (!canManageRecordForProfile(existing as TechnicalAdvisoryServiceRecord, profile, user.id)) {
    throw new Error("Insufficient permissions to update this record");
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
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  return data;
}

export async function deleteTechnicalAdvisoryService(id: string) {
  const { user, profile } = await getAuthorizedProfile();
  const adminClient = createAdminClient();

  const { data: existing, error: existingError } = await adminClient
    .from("technical_advisory_services")
    .select("id, created_by, department")
    .eq("id", id)
    .single();

  if (existingError || !existing) throw new Error("Record not found");

  if (!canManageRecordForProfile(existing as TechnicalAdvisoryServiceRecord, profile, user.id)) {
    throw new Error("Insufficient permissions to delete this record");
  }

  const { error } = await adminClient
    .from("technical_advisory_services")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting technical advisory service:", error);
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  return true;
}
