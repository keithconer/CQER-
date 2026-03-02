"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface StudentInvolvementPayload {
  college: string;
  department: string;
  curricular_offering: string;
  total_students: number;
  involved_students: number;
  percentage: number;
  remarks?: string;
  documents?: { url: string; name: string }[];
}

export async function createStudentInvolvement(formData: StudentInvolvementPayload) {
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
    college: "CEIT",
    department: profile?.department || formData.department || "",
    created_by: user.id,
  };

  const { data, error } = await supabase
    .from("student_involvement")
    .insert([payload])
    .select();

  if (error) {
    console.error("Error creating student involvement record:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { data };
}

export async function getStudentInvolvement() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_involvement")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching student involvement records:", error);
    return { error: error.message };
  }

  return { data };
}

export async function updateStudentInvolvement(id: string, formData: StudentInvolvementPayload) {
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
    college: "CEIT",
    department: profile?.department || formData.department || "",
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("student_involvement")
    .update(payload)
    .eq("id", id)
    .eq("created_by", user.id)
    .select();

  if (error) {
    console.error("Error updating student involvement record:", error);
    return { error: error.message };
  }

  if (!data || data.length === 0) {
    return { error: "Record not found or insufficient permissions" };
  }

  revalidatePath("/dashboard");
  return { data };
}

export async function deleteStudentInvolvement(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { error } = await supabase
    .from("student_involvement")
    .delete()
    .eq("id", id)
    .eq("created_by", user.id);

  if (error) {
    console.error("Error deleting student involvement record:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
