"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface NeedsAssessment {
  id: string;
  project_no: string;
  project_title: string;
  category: "Internal" | "External";
  needs_assessment: string;
  date_conducted: string;
  place_conducted: string;
  results_used: string;
  document_url?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type CreateNeedsAssessmentPayload = Omit<NeedsAssessment, "id" | "created_at" | "updated_at" | "created_by">;

export async function getNeedsAssessments() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];

  const { data, error } = await supabase
    .from("needs_assessments")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching needs assessments:", error);
    return [];
  }
  return (data || []) as NeedsAssessment[];
}

export async function createNeedsAssessment(payload: CreateNeedsAssessmentPayload) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("needs_assessments")
    .insert([{ ...payload, created_by: session.user.id }])
    .select()
    .single();

  if (error) {
    console.error("Error creating needs assessment:", error);
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  return data;
}

export async function updateNeedsAssessment(id: string, payload: Partial<CreateNeedsAssessmentPayload>) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("needs_assessments")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating needs assessment:", error);
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  return data;
}

export async function deleteNeedsAssessment(id: string) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Unauthorized");

  const { error } = await supabase.from("needs_assessments").delete().eq("id", id);

  if (error) {
    console.error("Error deleting needs assessment:", error);
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  return true;
}
