"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface TechnologyPayload {
  college: string;
  department: string;
  curricular_offering: string;
  technology_title: string;
  year_develop: number;
  end_users_clientele: string[];
  technology_generators: string;
  status: "Commercialized" | "Multi-Modal Deployment" | "Pre-launch activities completed";
  remarks?: string;
  documents?: { url: string; name: string }[];
}

export interface OrdinancePayload {
  department: string;
  curricular_offering: string;
  extension_project_activity: string;
  ordinance_resolution: string;
  status: "Submitted/Endorse" | "approved";
  date_approved?: string | null;
  remarks?: string;
  documents?: { url: string; name: string }[];
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

export async function getTechnologies() {
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
    .from("technologies_innovations")
    .select("*")
    .in("created_by", creatorIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching technologies:", error);
    return { error: error.message };
  }

  return { data };
}

export async function createTechnology(formData: TechnologyPayload) {
  const { supabase, user, department } = await getCurrentContext();
  const { data, error } = await supabase
    .from("technologies_innovations")
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
    console.error("Error creating technology record:", error);
    return { error: error.message };
  }
  revalidatePath("/dashboard");
  return { data };
}

export async function updateTechnology(id: string, formData: TechnologyPayload) {
  const { supabase, user, department } = await getCurrentContext();
  const { data, error } = await supabase
    .from("technologies_innovations")
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
    console.error("Error updating technology record:", error);
    return { error: error.message };
  }
  if (!data || data.length === 0) {
    return { error: "Record not found or insufficient permissions" };
  }
  revalidatePath("/dashboard");
  return { data };
}

export async function deleteTechnology(id: string) {
  const { supabase, user } = await getCurrentContext();
  const { error } = await supabase
    .from("technologies_innovations")
    .delete()
    .eq("id", id)
    .eq("created_by", user.id);

  if (error) {
    console.error("Error deleting technology record:", error);
    return { error: error.message };
  }
  revalidatePath("/dashboard");
  return { success: true };
}

export async function getOrdinances() {
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
    .from("ordinance_resolutions")
    .select("*")
    .in("created_by", creatorIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching ordinance/resolutions:", error);
    return { error: error.message };
  }

  return { data };
}

export async function createOrdinance(formData: OrdinancePayload) {
  const { supabase, user, department } = await getCurrentContext();
  const { data, error } = await supabase
    .from("ordinance_resolutions")
    .insert([
      {
        ...formData,
        department: department || formData.department || "",
        created_by: user.id,
      },
    ])
    .select();

  if (error) {
    console.error("Error creating ordinance/resolution:", error);
    return { error: error.message };
  }
  revalidatePath("/dashboard");
  return { data };
}

export async function updateOrdinance(id: string, formData: OrdinancePayload) {
  const { supabase, user, department } = await getCurrentContext();
  const { data, error } = await supabase
    .from("ordinance_resolutions")
    .update({
      ...formData,
      department: department || formData.department || "",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("created_by", user.id)
    .select();

  if (error) {
    console.error("Error updating ordinance/resolution:", error);
    return { error: error.message };
  }
  if (!data || data.length === 0) {
    return { error: "Record not found or insufficient permissions" };
  }
  revalidatePath("/dashboard");
  return { data };
}

export async function deleteOrdinance(id: string) {
  const { supabase, user } = await getCurrentContext();
  const { error } = await supabase
    .from("ordinance_resolutions")
    .delete()
    .eq("id", id)
    .eq("created_by", user.id);

  if (error) {
    console.error("Error deleting ordinance/resolution:", error);
    return { error: error.message };
  }
  revalidatePath("/dashboard");
  return { success: true };
}
