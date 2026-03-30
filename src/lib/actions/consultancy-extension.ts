"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ConsultancyCategory = "Internally" | "Externally";
export type ConsultancyStatus = "On-going" | "Completed";

export interface ConsultancyExtension {
  id: string;
  title_of_consultancy: string;
  base_agency_institute: string;
  nature_of_consultancy: string;
  related_project_id: string | null;
  related_project_title: string | null;
  category: ConsultancyCategory;
  status: ConsultancyStatus;
  documents: { url: string; name: string }[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ConsultancyPayload {
  title_of_consultancy: string;
  base_agency_institute: string;
  nature_of_consultancy: string;
  related_project_id?: string | null;
  related_project_title?: string | null;
  category: ConsultancyCategory;
  status: ConsultancyStatus;
  documents: { url: string; name: string }[];
}

async function getCurrentContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_type, department")
    .eq("id", user.id)
    .single();

  return {
    supabase,
    user,
    userType: profile?.user_type || null,
    department: profile?.department || null,
  };
}

export async function getConsultancyExtensions() {
  const { user, userType, department } = await getCurrentContext();
  const adminClient = createAdminClient();

  if (userType === "super_admin") {
    const { data, error } = await adminClient
      .from("consultancy_extensions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching consultancy records:", error);
      return { error: error.message };
    }

    return { data: (data || []) as ConsultancyExtension[] };
  }

  if (userType === "project_leader") {
    const { data, error } = await adminClient
      .from("consultancy_extensions")
      .select("*")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching consultancy records:", error);
      return { error: error.message };
    }

    return { data: (data || []) as ConsultancyExtension[] };
  }

  if (!department) {
    return { data: [] as ConsultancyExtension[] };
  }

  const { data: departmentProfiles, error: departmentProfilesError } = await adminClient
    .from("profiles")
    .select("id")
    .in("user_type", ["college_coordinator", "unit_coordinator"])
    .eq("department", department);

  if (departmentProfilesError) {
    console.error("Error fetching consultancy profile scope:", departmentProfilesError);
    return { error: departmentProfilesError.message };
  }

  const creatorIds = (departmentProfiles || []).map((item) => item.id);
  const { data: superAdmins, error: superAdminError } = await adminClient
    .from("profiles")
    .select("id")
    .eq("user_type", "super_admin");

  if (superAdminError) {
    console.error("Error fetching super admins for consultancy:", superAdminError);
    return { error: superAdminError.message };
  }

  const allowedCreatorIds = Array.from(
    new Set([...creatorIds, ...((superAdmins || []).map((item) => item.id))])
  );

  if (allowedCreatorIds.length === 0) {
    return { data: [] as ConsultancyExtension[] };
  }

  const { data, error } = await adminClient
    .from("consultancy_extensions")
    .select("*")
    .in("created_by", allowedCreatorIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching consultancy records:", error);
    return { error: error.message };
  }

  return { data: (data || []) as ConsultancyExtension[] };
}

export async function createConsultancyExtension(payload: ConsultancyPayload) {
  const { supabase, user } = await getCurrentContext();

  const { data, error } = await supabase
    .from("consultancy_extensions")
    .insert([
      {
        ...payload,
        created_by: user.id,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error creating consultancy record:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { data: data as ConsultancyExtension };
}

export async function updateConsultancyExtension(id: string, payload: ConsultancyPayload) {
  const { supabase, userType } = await getCurrentContext();
  const client = userType === "super_admin" ? createAdminClient() : supabase;

  const { data, error } = await client
    .from("consultancy_extensions")
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating consultancy record:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { data: data as ConsultancyExtension };
}

export async function deleteConsultancyExtension(id: string) {
  const { supabase, userType } = await getCurrentContext();
  const client = userType === "super_admin" ? createAdminClient() : supabase;

  const { error } = await client.from("consultancy_extensions").delete().eq("id", id);

  if (error) {
    console.error("Error deleting consultancy record:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
