"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

  const { data, error } = await supabase
    .from("awards")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching awards:", error);
    return { error: error.message };
  }

  return { data };
}
