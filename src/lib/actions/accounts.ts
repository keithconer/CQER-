"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const TRANSFER_TABLES = [
  "projects",
  "awards",
  "student_involvement",
  "faculty_involvement",
  "pool_of_experts",
  "technologies_innovations",
  "ordinance_resolutions",
  "trainings",
];

type TransferMode = "unit" | "college";

export async function transferCoordinatorRole(params: {
  sourceId: string;
  targetId: string;
  mode: TransferMode;
}) {
  const { sourceId, targetId, mode } = params;
  if (!sourceId || !targetId) return { error: "Missing transfer details." };
  if (sourceId === targetId) return { error: "Source and target must be different accounts." };

  const supabase = await createClient();
  const adminClient = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, user_type, department")
    .eq("id", user.id)
    .single();

  if (!currentProfile) return { error: "Profile not found." };

  const { data: profiles } = await adminClient
    .from("profiles")
    .select("id, email, first_name, last_name, user_type, department, unit")
    .in("id", [sourceId, targetId]);

  if (!profiles || profiles.length < 2) {
    return { error: "Both source and target accounts must exist." };
  }

  const sourceProfile = profiles.find((profile) => profile.id === sourceId);
  const targetProfile = profiles.find((profile) => profile.id === targetId);

  if (!sourceProfile || !targetProfile) {
    return { error: "Source or target account is missing." };
  }

  if (mode === "unit") {
    if (currentProfile.user_type !== "college_coordinator") {
      return { error: "Only college coordinators can transfer unit roles." };
    }
    if (sourceProfile.user_type !== "unit_coordinator" || targetProfile.user_type !== "unit_coordinator") {
      return { error: "Only unit coordinator accounts can be transferred." };
    }
    if (!currentProfile.department || sourceProfile.department !== currentProfile.department) {
      return { error: "You can only transfer unit coordinators in your department." };
    }
    if (targetProfile.department !== currentProfile.department) {
      return { error: "Target account must belong to your department." };
    }
    if (sourceProfile.unit && targetProfile.unit !== sourceProfile.unit) {
      return { error: "Target account must be in the same unit as the source." };
    }
  } else {
    if (currentProfile.user_type !== "super_admin") {
      return { error: "Only super admins can transfer college coordinator roles." };
    }
    if (
      sourceProfile.user_type !== "college_coordinator" ||
      targetProfile.user_type !== "college_coordinator"
    ) {
      return { error: "Only college coordinator accounts can be transferred." };
    }
    if (sourceProfile.department && targetProfile.department !== sourceProfile.department) {
      return { error: "Target account must be in the same department as the source." };
    }
  }

  for (const table of TRANSFER_TABLES) {
    const { error } = await adminClient
      .from(table)
      .update({ created_by: targetId })
      .eq("created_by", sourceId);
    if (error) {
      return { error: `Failed to transfer records in ${table}.` };
    }
  }

  const { error: profileDeleteError } = await adminClient
    .from("profiles")
    .delete()
    .eq("id", sourceId);
  if (profileDeleteError) {
    return { error: "Transfer completed, but failed to delete old profile." };
  }

  const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(sourceId);
  if (authDeleteError) {
    return { error: "Transfer completed, but failed to delete old login." };
  }

  return { success: true };
}
