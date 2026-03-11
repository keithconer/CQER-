"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AwardPayload {
  department: string;
  extension_ppa: string[];
  award_recognition_received: string;
  donor: string;
  level: "local" | "regional" | "national" | "international";
  date_received: string;
  remarks?: string;
  documents?: { url: string; name: string }[];
}

export async function createAward(formData: AwardPayload) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("department")
    .eq("id", user.id)
    .single();

  const payload = {
    ...formData,
    department: profile?.department || formData.department || "",
    created_by: user.id,
  };

  const { data, error } = await supabase.from("awards").insert([payload]).select();

  if (error) {
    console.error("Error creating award:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { data };
}

export async function getAwards() {
  const supabase = await createClient();
  const adminClient = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Unauthorized" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_type, department")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { data: [] };
  }

  if (profile.user_type === "super_admin") {
    const { data, error } = await adminClient
      .from("awards")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching all awards:", error);
      return { error: error.message };
    }
    return { data };
  }

  if (!profile.department) {
    return { data: [] };
  }

  const { data: deptProfiles, error: deptProfilesError } = await adminClient
    .from("profiles")
    .select("id")
    .in("user_type", ["college_coordinator", "unit_coordinator"])
    .eq("department", profile.department);

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
    return { data: [] };
  }

  const { data, error } = await adminClient
    .from("awards")
    .select("*")
    .in("created_by", allCreatorIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching awards:", error);
    return { error: error.message };
  }

  return { data };
}

export async function updateAward(id: string, formData: AwardPayload) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("department, user_type")
    .eq("id", user.id)
    .single();

  const userType = profile?.user_type || null;
  const client = userType === "super_admin" ? createAdminClient() : supabase;

  const payload = {
    ...formData,
    department: userType === "super_admin" ? (formData.department || profile?.department || "") : (profile?.department || formData.department || ""),
    updated_at: new Date().toISOString(),
  };

  let query = client
    .from("awards")
    .update(payload)
    .eq("id", id);

  if (userType !== "super_admin") {
    query = query.eq("created_by", user.id);
  }

  const { data, error } = await query.select();

  if (error) {
    console.error("Error updating award:", error);
    return { error: error.message };
  }

  if (!data || data.length === 0) {
    return { error: "Award not found or insufficient permissions" };
  }

  revalidatePath("/dashboard");
  return { data };
}

export async function deleteAward(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_type")
    .eq("id", user.id)
    .single();

  const userType = profile?.user_type || null;
  const client = userType === "super_admin" ? createAdminClient() : supabase;

  let query = client
    .from("awards")
    .delete()
    .eq("id", id);

  if (userType !== "super_admin") {
    query = query.eq("created_by", user.id);
  }

  const { error } = await query;

  if (error) {
    console.error("Error deleting award:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
