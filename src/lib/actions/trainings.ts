"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface TrainingPayload {
  college: string;
  department: string;
  lead_units: string[];
  contact_person: string;
  contact_details: string;
  related_curricular_offerings: string[];
  training_title: string;
  date_mode: "days" | "hours";
  inclusive_dates: string[];
  manual_hours: number | null;
  venue_platform: string;
  sdg_goals: string[];
  training_category: "TVL" | "CE" | "GAD" | "AE" | "BE" | "OTHERS";
  training_category_other: string;
  training_mode: "FTF" | "O" | "H";
  faculty_male: number;
  faculty_female: number;
  non_academic_male: number;
  non_academic_female: number;
  cvsu_students_male: number;
  cvsu_students_female: number;
  partner_agencies_male: number;
  partner_agencies_female: number;
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
  total_clients_requesting_trainings: number;
  total_requests_responded_next_3_days: number;
  amount_charged_to_cvsu: number;
  amount_charged_to_partner_agency: number;
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
    .select("department")
    .eq("id", user.id)
    .single();

  return { supabase, user, department: profile?.department || "" };
}

export async function getTrainings() {
  const { department } = await getCurrentContext();
  const adminClient = createAdminClient();
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
  if (creatorIds.length === 0) {
    return { data: [] };
  }

  const { data, error } = await adminClient
    .from("trainings")
    .select("*")
    .in("created_by", creatorIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching trainings:", error);
    return { error: error.message };
  }

  return { data };
}

export async function createTraining(formData: TrainingPayload) {
  const { supabase, user, department } = await getCurrentContext();
  const { data, error } = await supabase
    .from("trainings")
    .insert([
      {
        ...formData,
        college: "CEIT",
        department: department || formData.department || "",
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
  const { supabase, user, department } = await getCurrentContext();
  const { data, error } = await supabase
    .from("trainings")
    .update({
      ...formData,
      college: "CEIT",
      department: department || formData.department || "",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("created_by", user.id)
    .select();

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
  const { supabase, user } = await getCurrentContext();
  const { error } = await supabase
    .from("trainings")
    .delete()
    .eq("id", id)
    .eq("created_by", user.id);

  if (error) {
    console.error("Error deleting training record:", error);
    return { error: error.message };
  }
  revalidatePath("/dashboard");
  return { success: true };
}
