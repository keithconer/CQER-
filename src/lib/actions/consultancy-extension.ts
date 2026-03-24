"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface ConsultancyExtension {
  id: string;
  project_no: string;
  project_title: string;
  category: string;
  is_part_of_project: boolean;
  consultancy_project_title?: string | null;
  base_agency?: string | null;
  nature_of_consultancy?: string | null;
  status: "On-going" | "Completed";
  document_url?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type CreateConsultancyExtensionPayload = Omit<
  ConsultancyExtension,
  "id" | "created_at" | "updated_at" | "created_by"
>;

export async function getConsultancyExtensions() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return [];

  const { data, error } = await supabase
    .from("consultancy_extensions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching consultancy extensions:", error);
    return [];
  }
  return (data || []) as ConsultancyExtension[];
}

export async function createConsultancyExtension(
  payload: CreateConsultancyExtensionPayload
) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("consultancy_extensions")
    .insert([{ ...payload, created_by: session.user.id }])
    .select()
    .single();

  if (error) {
    console.error("Error creating consultancy extension:", error);
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  return data;
}

export async function updateConsultancyExtension(
  id: string,
  payload: Partial<CreateConsultancyExtensionPayload>
) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("consultancy_extensions")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating consultancy extension:", error);
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  return data;
}

export async function deleteConsultancyExtension(id: string) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("consultancy_extensions")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting consultancy extension:", error);
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  return true;
}
