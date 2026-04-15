"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEPARTMENTS } from "@/lib/departments";

export interface TrainingPayload {
  college: string;
  department: string;
  lead_units: string[];
  visibility_scope?: "department" | "all_departments" | "specific_departments";
  visible_departments?: string[];
  contact_person: string;
  contact_details: string;
  related_curricular_offerings: string[];
  training_title: string;
  related_project_id?: string | null;
  related_project_title?: string;
  number_of_days?: number;
  date_mode: "days" | "hours";
  inclusive_dates: string[];
  manual_hours: number | null;
  venue_platform: string;
  sdg_goals: string[];
  sdg_main?: string[];
  sdg_sub?: string[];
  training_category: "TVL" | "CE" | "GAD" | "AE" | "BE" | "OTHERS";
  training_categories?: ("TVL" | "CE" | "GAD" | "AE" | "BE" | "OTHERS")[];
  training_category_other: string;
  training_mode: "FTF" | "O" | "H";
  faculty_male: number;
  faculty_female: number;
  faculty_permanent?: number;
  faculty_cos?: number;
  non_academic_male: number;
  non_academic_female: number;
  cvsu_students?: { name: string; program: string }[];
  cvsu_students_male: number;
  cvsu_students_female: number;
  partner_agencies_male: number;
  partner_agencies_female: number;
  participant_breakdown?: Record<string, { male: number; female: number }>;
  participants_prefer_not_say: number;
  participants_male_total: number;
  participants_female_total: number;
  participants_overall_total: number;
  category_student: number;
  category_farmer: number;
  category_fisherfolk: number;
  category_ag_technical: number;
  category_government_employee: number;
  category_private_employee: number;
  category_4ps: number;
  category_others: number;
  category_total: number;
  tvl_solo_parent: number;
  tvl_4ps_members: number;
  tvl_disabilities_count: number;
  tvl_disability_breakdown: { disability_type: string; notes?: string }[];
  tvl_total_persons_trained: number;
  conducted_days_count: number;
  days_multiplier: number;
  weighted_days_trained: number;
  days_trained_per_weight: number;
  total_trainees_surveyed: number;
  rating_relevance: number;
  rating_equality: number;
  rating_timeliness: number;
  rating_relevance_breakdown?: Record<string, number>;
  rating_quality_breakdown?: Record<string, number>;
  rating_timeliness_breakdown?: Record<string, number>;
  total_clients_requesting_trainings: number;
  total_requests_responded_next_3_days: number;
  amount_charged_to_cvsu: number;
  amount_charged_to_partner_agency: number;
  expense_partner_agency_name?: string;
  partner_agencies: string[];
  thematic_area: string[];
  remarks: string;
  documents: { url: string; name: string }[];
}

async function getCurrentContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("department, user_type")
    .eq("id", user.id)
    .single();

  return {
    supabase,
    user,
    department: profile?.department || "",
    userType: profile?.user_type || null,
  };
}

function normalizeDepartments(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  const allowed = new Set(DEPARTMENTS);
  return Array.from(
    new Set(
      raw
        .map((department) => String(department || "").trim())
        .filter((department) => department && allowed.has(department as typeof DEPARTMENTS[number]))
    )
  );
}

function trainingVisibleToDepartment(
  training: { visibility_scope?: string | null; visible_departments?: unknown; department?: string | null },
  department: string | null | undefined
) {
  if (!department) return false;
  const visibleDepartments = normalizeDepartments(training.visible_departments);
  if (training.visibility_scope === "all_departments") return true;
  if (training.visibility_scope === "specific_departments") {
    return visibleDepartments.includes(department);
  }
  return training.department === department;
}

export async function getTrainings() {
  const { user, department, userType } = await getCurrentContext();
  const adminClient = createAdminClient();
  if (userType === "super_admin") {
    const { data, error } = await adminClient
      .from("trainings")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching trainings:", error);
      return { error: error.message };
    }

    return { data };
  }

  if (userType === "project_leader") {
    const { data, error } = await adminClient
      .from("trainings")
      .select("*")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching trainings:", error);
      return { error: error.message };
    }

    return { data };
  }

  if (!department) {
    return { data: [] };
  }

  const { data: deptProfiles, error: deptProfilesError } = await adminClient
    .from("profiles")
    .select("id")
    .in("user_type", ["college_coordinator", "unit_coordinator"])
    .eq("department", department);

  if (deptProfilesError) {
    console.error("Error fetching department profiles:", deptProfilesError);
    return { error: deptProfilesError.message };
  }

  const creatorIds = (deptProfiles || []).map((item) => item.id);
  const { data: superAdmins, error: superAdminError } = await adminClient
    .from("profiles")
    .select("id")
    .eq("user_type", "super_admin");

  if (superAdminError) {
    console.error("Error fetching super admin profiles:", superAdminError);
    return { error: superAdminError.message };
  }

  const allCreatorIds = Array.from(new Set([...creatorIds, ...((superAdmins || []).map((item) => item.id))]));
  if (allCreatorIds.length === 0) {
    return { data: [] };
  }

  const { data, error } = await adminClient
    .from("trainings")
    .select("*")
    .in("created_by", allCreatorIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching trainings:", error);
    return { error: error.message };
  }

  return {
    data: (data || []).filter((training) => {
      if (creatorIds.includes(training.created_by)) return true;
      return trainingVisibleToDepartment(training, department);
    }),
  };
}

export async function createTraining(formData: TrainingPayload) {
  const { supabase, user, department, userType } = await getCurrentContext();
  const visibilityScope =
    userType === "super_admin"
      ? formData.visibility_scope === "specific_departments"
        ? "specific_departments"
        : "all_departments"
      : "department";
  const visibleDepartments =
    userType === "super_admin"
      ? visibilityScope === "specific_departments"
        ? normalizeDepartments(formData.visible_departments)
        : [...DEPARTMENTS]
      : department
        ? [department]
        : [];

  const { data, error } = await supabase
    .from("trainings")
    .insert([
      {
        ...formData,
        college: "CEIT",
        department: userType === "super_admin" ? formData.department || "" : department || formData.department || "",
        visibility_scope: visibilityScope,
        visible_departments: visibleDepartments,
        created_by: user.id,
      },
    ])
    .select();

  if (error) {
    console.error("Error creating training record:", error);
    return { error: error.message };
  }
  revalidatePath("/dashboard");
  return { data };
}

export async function updateTraining(id: string, formData: TrainingPayload) {
  const { supabase, user, department, userType } = await getCurrentContext();
  const client = userType === "super_admin" ? createAdminClient() : supabase;
  const visibilityScope =
    userType === "super_admin"
      ? formData.visibility_scope === "specific_departments"
        ? "specific_departments"
        : "all_departments"
      : "department";
  const visibleDepartments =
    userType === "super_admin"
      ? visibilityScope === "specific_departments"
        ? normalizeDepartments(formData.visible_departments)
        : [...DEPARTMENTS]
      : department
        ? [department]
        : [];

  let query = client
    .from("trainings")
    .update({
      ...formData,
      college: "CEIT",
      department: userType === "super_admin" ? formData.department || "" : department || formData.department || "",
      visibility_scope: visibilityScope,
      visible_departments: visibleDepartments,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (userType !== "super_admin") {
    query = query.eq("created_by", user.id);
  }

  const { data, error } = await query.select();

  if (error) {
    console.error("Error updating training record:", error);
    return { error: error.message };
  }
  if (!data || data.length === 0) {
    return { error: "Record not found or insufficient permissions" };
  }
  revalidatePath("/dashboard");
  return { data };
}

export async function deleteTraining(id: string) {
  const { supabase, user, userType } = await getCurrentContext();
  let query = (userType === "super_admin" ? createAdminClient() : supabase)
    .from("trainings")
    .delete()
    .eq("id", id);

  if (userType !== "super_admin") {
    query = query.eq("created_by", user.id);
  }

  const { error } = await query;

  if (error) {
    console.error("Error deleting training record:", error);
    return { error: error.message };
  }
  revalidatePath("/dashboard");
  return { success: true };
}
