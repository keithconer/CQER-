"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ProjectLeaderOption = {
  id: string;
  name: string;
  email: string | null;
  department: string | null;
  unit: string | null;
};

export async function searchProjectLeaders(params: {
  query: string;
  department?: string | null;
  unit?: string | null;
  limit?: number;
}) {
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
    .select("user_type, department, unit")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { error: "Profile not found" };
  }

  const allowed = new Set([
    "super_admin",
    "college_coordinator",
    "unit_coordinator",
    "extension_office",
  ]);
  if (!allowed.has(profile.user_type)) {
    return { error: "Insufficient permissions" };
  }

  const safeQuery = (params.query || "").replace(/[%,]/g, " ").trim();
  const departmentFilter = params.department ?? profile.department ?? null;
  const unitFilter = params.unit ?? profile.unit ?? null;
  const limit = Math.min(Math.max(params.limit ?? 8, 1), 20);

  let queryBuilder = adminClient
    .from("profiles")
    .select("id, first_name, last_name, email, department, unit")
    .eq("user_type", "project_leader");

  if (unitFilter) {
    queryBuilder = queryBuilder.eq("unit", unitFilter);
  } else if (departmentFilter) {
    queryBuilder = queryBuilder.eq("department", departmentFilter);
  }

  if (safeQuery) {
    queryBuilder = queryBuilder.or(
      `first_name.ilike.%${safeQuery}%,last_name.ilike.%${safeQuery}%,email.ilike.%${safeQuery}%`
    );
  }

  const { data, error } = await queryBuilder
    .order("last_name", { ascending: true })
    .limit(limit);

  if (error) {
    return { error: error.message };
  }

  const options: ProjectLeaderOption[] =
    (data || []).map((leader) => ({
      id: leader.id,
      name: `${leader.first_name || ""} ${leader.last_name || ""}`.trim() || leader.email || "Unnamed",
      email: leader.email,
      department: leader.department,
      unit: leader.unit,
    })) || [];

  return { data: options };
}
