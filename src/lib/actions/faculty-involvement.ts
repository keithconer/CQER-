"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface FacultyInvolvementPayload {
  faculty_name: string;
  sex: "male" | "female";
  rank: string;
  employment_status: "permanent" | "COS" | "JO";
  avg_hours_per_week: number;
  total_hours_period: number;
  remarks?: string;
  department?: string;
  documents?: { url: string; name: string }[];
}

export interface PoolOfExpertsPayload {
  faculty_name: string;
  sex: "male" | "female";
  rank: string;
  employment_status: "permanent" | "COS" | "JO";
  educational_qualifications: string[];
  specialization: string[];
  department?: string;
  other_expertise?: string;
  remarks?: string;
  documents?: { url: string; name: string }[];
}

async function getCurrentUserWithDepartment() {
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

  return { supabase, user, department: profile?.department || "", userType: profile?.user_type || null };
}

export async function getFacultyModuleData() {
  const { userType, department } = await getCurrentUserWithDepartment();
  const adminClient = createAdminClient();

  if (userType === "super_admin") {
    const [facultyResult, poolResult] = await Promise.all([
      adminClient
        .from("faculty_involvement")
        .select("*")
        .order("created_at", { ascending: false }),
      adminClient
        .from("pool_of_experts")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    if (facultyResult.error) {
      console.error("Error fetching all faculty involvement:", facultyResult.error);
      return { error: facultyResult.error.message };
    }
    if (poolResult.error) {
      console.error("Error fetching all pool of experts:", poolResult.error);
      return { error: poolResult.error.message };
    }

    return { data: { faculty: facultyResult.data || [], pool: poolResult.data || [] } };
  }

  if (!department) {
    return { data: { faculty: [], pool: [] } };
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
  const { data: superAdmins } = await adminClient
    .from("profiles")
    .select("id")
    .eq("user_type", "super_admin");
  
  const allCreatorIds = Array.from(new Set([...creatorIds, ...((superAdmins || []).map((item) => item.id))]));

  if (allCreatorIds.length === 0) {
    return { data: { faculty: [], pool: [] } };
  }

  const [facultyResult, poolResult] = await Promise.all([
    adminClient
      .from("faculty_involvement")
      .select("*")
      .in("created_by", allCreatorIds)
      .order("created_at", { ascending: false }),
    adminClient
      .from("pool_of_experts")
      .select("*")
      .in("created_by", allCreatorIds)
      .order("created_at", { ascending: false }),
  ]);

  if (facultyResult.error) {
    console.error("Error fetching faculty involvement:", facultyResult.error);
    return { error: facultyResult.error.message };
  }
  if (poolResult.error) {
    console.error("Error fetching pool of experts:", poolResult.error);
    return { error: poolResult.error.message };
  }

  return { data: { faculty: facultyResult.data || [], pool: poolResult.data || [] } };
}

export async function createFacultyInvolvement(formData: FacultyInvolvementPayload) {
  const { supabase, user, department } = await getCurrentUserWithDepartment();
  const { data, error } = await supabase
    .from("faculty_involvement")
    .insert([{ ...formData, department, created_by: user.id }])
    .select();

  if (error) {
    console.error("Error creating faculty involvement:", error);
    return { error: error.message };
  }
  revalidatePath("/dashboard");
  return { data };
}

export async function updateFacultyInvolvement(id: string, formData: FacultyInvolvementPayload) {
  const { supabase, user, department, userType } = await getCurrentUserWithDepartment();
  const client = userType === "super_admin" ? createAdminClient() : supabase;

  let query = client
    .from("faculty_involvement")
    .update({ 
      ...formData, 
      department: userType === "super_admin" ? (formData.department || department || "") : (department || formData.department || ""),
      updated_at: new Date().toISOString() 
    })
    .eq("id", id);

  if (userType !== "super_admin") {
    query = query.eq("created_by", user.id);
  }

  const { data, error } = await query.select();

  if (error) {
    console.error("Error updating faculty involvement:", error);
    return { error: error.message };
  }
  if (!data || data.length === 0) {
    return { error: "Record not found or insufficient permissions" };
  }
  revalidatePath("/dashboard");
  return { data };
}

export async function deleteFacultyInvolvement(id: string) {
  const { supabase, user, userType } = await getCurrentUserWithDepartment();
  const client = userType === "super_admin" ? createAdminClient() : supabase;

  let query = client
    .from("faculty_involvement")
    .delete()
    .eq("id", id);

  if (userType !== "super_admin") {
    query = query.eq("created_by", user.id);
  }

  const { error } = await query;

  if (error) {
    console.error("Error deleting faculty involvement:", error);
    return { error: error.message };
  }
  revalidatePath("/dashboard");
  return { success: true };
}

export async function createPoolExpert(formData: PoolOfExpertsPayload) {
  const { supabase, user, department } = await getCurrentUserWithDepartment();
  const { data, error } = await supabase
    .from("pool_of_experts")
    .insert([{ ...formData, department, created_by: user.id }])
    .select();

  if (error) {
    console.error("Error creating pool of experts record:", error);
    return { error: error.message };
  }
  revalidatePath("/dashboard");
  return { data };
}

export async function updatePoolExpert(id: string, formData: PoolOfExpertsPayload) {
  const { supabase, user, department, userType } = await getCurrentUserWithDepartment();
  const client = userType === "super_admin" ? createAdminClient() : supabase;

  let query = client
    .from("pool_of_experts")
    .update({ 
      ...formData, 
      department: userType === "super_admin" ? (formData.department || department || "") : (department || formData.department || ""),
      updated_at: new Date().toISOString() 
    })
    .eq("id", id);

  if (userType !== "super_admin") {
    query = query.eq("created_by", user.id);
  }

  const { data, error } = await query.select();

  if (error) {
    console.error("Error updating pool of experts record:", error);
    return { error: error.message };
  }
  if (!data || data.length === 0) {
    return { error: "Record not found or insufficient permissions" };
  }
  revalidatePath("/dashboard");
  return { data };
}

export async function deletePoolExpert(id: string) {
  const { supabase, user, userType } = await getCurrentUserWithDepartment();
  const client = userType === "super_admin" ? createAdminClient() : supabase;

  let query = client
    .from("pool_of_experts")
    .delete()
    .eq("id", id);

  if (userType !== "super_admin") {
    query = query.eq("created_by", user.id);
  }

  const { error } = await query;

  if (error) {
    console.error("Error deleting pool of experts record:", error);
    return { error: error.message };
  }
  revalidatePath("/dashboard");
  return { success: true };
}
