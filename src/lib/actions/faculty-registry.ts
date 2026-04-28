"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type FacultyRegistryEmployment = "Permanent" | "Contract of Service";

export interface FacultyRegistryRecord {
  id: string;
  created_by: string;
  department: string | null;
  unit: string | null;
  first_name: string;
  last_name: string;
  designation: string;
  employment: FacultyRegistryEmployment;
  created_at: string;
  updated_at: string;
}

export interface FacultyRegistryPayload {
  first_name: string;
  last_name: string;
  designation: string;
  unit: string;
  employment: FacultyRegistryEmployment;
}

async function getScopedProfile() {
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

  return { supabase, user, profile, error: null };
}

function canManageFacultyRegistry(userType: string | null) {
  return userType === "super_admin" || userType === "college_coordinator" || userType === "unit_coordinator";
}

export async function getFacultyRegistryRecords() {
  const { profile, error } = await getScopedProfile();
  if (!profile || error) {
    return { data: [] as FacultyRegistryRecord[], error };
  }

  if (!canManageFacultyRegistry(profile.user_type)) {
    return { data: [] as FacultyRegistryRecord[], error: "Insufficient permissions" };
  }

  const client = createAdminClient();
  let query = client
    .from("faculty_registry_records")
    .select("*")
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (profile.user_type === "college_coordinator" && profile.department) {
    query = query.eq("department", profile.department);
  } else if (profile.user_type === "unit_coordinator") {
    query = query
      .eq("department", profile.department || "")
      .eq("unit", profile.unit || "");
  }

  const { data, error: fetchError } = await query;
  if (fetchError) {
    console.error("Error fetching faculty registry records:", fetchError);
    return { data: [] as FacultyRegistryRecord[], error: fetchError.message };
  }

  return { data: (data || []) as FacultyRegistryRecord[], error: null };
}

export async function createFacultyRegistryRecord(payload: FacultyRegistryPayload) {
  const { supabase, user, profile, error } = await getScopedProfile();
  if (!user || !profile || error) {
    return { error: error || "Unauthorized" };
  }

  if (!canManageFacultyRegistry(profile.user_type)) {
    return { error: "Insufficient permissions" };
  }

  const firstName = payload.first_name.trim();
  const lastName = payload.last_name.trim();
  const designation = payload.designation.trim();
  const unit =
    profile.user_type === "unit_coordinator"
      ? (profile.unit || "")
      : payload.unit.trim();

  if (!firstName || !lastName || !designation || !unit) {
    return { error: "First name, last name, designation, and unit are required." };
  }

  const { data, error: insertError } = await supabase
    .from("faculty_registry_records")
    .insert([
      {
        created_by: user.id,
        department: profile.department || null,
        unit,
        first_name: firstName,
        last_name: lastName,
        designation,
        employment: payload.employment,
      },
    ])
    .select()
    .single();

  if (insertError) {
    console.error("Error creating faculty registry record:", insertError);
    return { error: insertError.message };
  }

  revalidatePath("/dashboard");
  return { data: data as FacultyRegistryRecord };
}

export async function updateFacultyRegistryRecord(id: string, payload: FacultyRegistryPayload) {
  const { user, profile, error } = await getScopedProfile();
  if (!user || !profile || error) {
    return { error: error || "Unauthorized" };
  }

  if (!canManageFacultyRegistry(profile.user_type)) {
    return { error: "Insufficient permissions" };
  }

  const client = createAdminClient();
  const { data: existing, error: existingError } = await client
    .from("faculty_registry_records")
    .select("id, department, unit, created_by")
    .eq("id", id)
    .single();

  if (existingError || !existing) {
    return { error: "Record not found" };
  }

  if (profile.user_type === "college_coordinator" && existing.department !== profile.department) {
    return { error: "You can only update records from your department." };
  }

  if (profile.user_type === "unit_coordinator" && (existing.department !== profile.department || existing.unit !== profile.unit)) {
    return { error: "You can only update records from your unit." };
  }

  const nextUnit = profile.user_type === "unit_coordinator" ? (profile.unit || "") : payload.unit.trim();
  if (!nextUnit) {
    return { error: "Unit is required." };
  }

  const { data, error: updateError } = await client
    .from("faculty_registry_records")
    .update({
      first_name: payload.first_name.trim(),
      last_name: payload.last_name.trim(),
      designation: payload.designation.trim(),
      unit: nextUnit,
      employment: payload.employment,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    console.error("Error updating faculty registry record:", updateError);
    return { error: updateError.message };
  }

  revalidatePath("/dashboard");
  return { data: data as FacultyRegistryRecord };
}

export async function deleteFacultyRegistryRecord(id: string) {
  const { user, profile, error } = await getScopedProfile();
  if (!user || !profile || error) {
    return { error: error || "Unauthorized" };
  }

  if (!canManageFacultyRegistry(profile.user_type)) {
    return { error: "Insufficient permissions" };
  }

  const client = createAdminClient();
  const { data: existing, error: existingError } = await client
    .from("faculty_registry_records")
    .select("id, department, unit")
    .eq("id", id)
    .single();

  if (existingError || !existing) {
    return { error: "Record not found" };
  }

  if (profile.user_type === "college_coordinator" && existing.department !== profile.department) {
    return { error: "You can only delete records from your department." };
  }

  if (profile.user_type === "unit_coordinator" && (existing.department !== profile.department || existing.unit !== profile.unit)) {
    return { error: "You can only delete records from your unit." };
  }

  const { error: deleteError } = await client
    .from("faculty_registry_records")
    .delete()
    .eq("id", id);

  if (deleteError) {
    console.error("Error deleting faculty registry record:", deleteError);
    return { error: deleteError.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
