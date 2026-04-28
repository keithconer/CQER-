"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export interface ProjectLeaderRecord {
  id: string;
  created_by: string;
  department: string | null;
  unit: string | null;
  first_name: string;
  last_name: string;
  designation: string;
  created_at: string;
  updated_at: string;
}

interface CreateProjectLeaderRecordPayload {
  first_name: string;
  last_name: string;
  designation: string;
}

async function getUnitCoordinatorProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, profile: null, error: "Unauthorized" };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, user_type, department, unit")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return { supabase, user, profile: null, error: "Profile not found" };
  }

  if (profile.user_type !== "unit_coordinator") {
    return { supabase, user, profile, error: "Only unit coordinators can manage project leader records." };
  }

  return { supabase, user, profile, error: null };
}

export async function getProjectLeaderRecords() {
  const { supabase, user, error } = await getUnitCoordinatorProfile();
  if (!user || error) {
    return { data: [] as ProjectLeaderRecord[], error };
  }

  const { data, error: fetchError } = await supabase
    .from("project_leader_records")
    .select("*")
    .order("created_at", { ascending: false });

  if (fetchError) {
    console.error("Error fetching project leader records:", fetchError);
    return { data: [] as ProjectLeaderRecord[], error: fetchError.message };
  }

  return { data: (data || []) as ProjectLeaderRecord[], error: null };
}

export async function createProjectLeaderRecord(payload: CreateProjectLeaderRecordPayload) {
  const { supabase, user, profile, error } = await getUnitCoordinatorProfile();
  if (!user || !profile || error) {
    return { error: error || "Unauthorized" };
  }

  const firstName = payload.first_name.trim();
  const lastName = payload.last_name.trim();
  const designation = payload.designation.trim();

  if (!firstName || !lastName || !designation) {
    return { error: "First name, last name, and designation are required." };
  }

  const { data, error: insertError } = await supabase
    .from("project_leader_records")
    .insert([
      {
        created_by: user.id,
        department: profile.department || null,
        unit: profile.unit || null,
        first_name: firstName,
        last_name: lastName,
        designation,
      },
    ])
    .select()
    .single();

  if (insertError) {
    console.error("Error creating project leader record:", insertError);
    return { error: insertError.message };
  }

  revalidatePath("/dashboard");
  return { data: data as ProjectLeaderRecord };
}

export async function deleteProjectLeaderRecord(id: string) {
  const { supabase, user, error } = await getUnitCoordinatorProfile();
  if (!user || error) {
    return { error: error || "Unauthorized" };
  }

  const { error: deleteError } = await supabase
    .from("project_leader_records")
    .delete()
    .eq("id", id);

  if (deleteError) {
    console.error("Error deleting project leader record:", deleteError);
    return { error: deleteError.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
