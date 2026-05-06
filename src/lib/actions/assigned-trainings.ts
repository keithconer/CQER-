"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AssignedTrainingPayload {
  training_title: string;
  schedule_value: string; // "2026-01" or "2026-01-23"
  schedule_has_day: boolean;
  assigned_user_ids: string[];
}

export interface AssignedTrainingRecord {
  id: string;
  training_title: string;
  schedule_value: string;
  schedule_has_day: boolean;
  assigned_user_ids: string[];
  assigned_by: string;
  department: string;
  status: "pending" | "filled" | "resolved";
  filled_data: Record<string, unknown> | null;
  filled_by: string | null;
  filled_training_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined / enriched fields
  assigner_full_name?: string | null;
  assigner_avatar_url?: string | null;
  filled_by_full_name?: string | null;
  assigned_users?: SystemUser[];
}

export interface SystemUser {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  user_type: string | null;
  department: string | null;
  unit: string | null;
  avatar_url: string | null;
}

async function getCurrentContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("department, user_type, unit, first_name, last_name, avatar_url")
    .eq("id", user.id)
    .single();

  return {
    supabase,
    user,
    department: profile?.department || "",
    unit: profile?.unit || "",
    userType: profile?.user_type || null,
    firstName: profile?.first_name || "",
    lastName: profile?.last_name || "",
    avatarUrl: profile?.avatar_url || null,
  };
}

function buildFullName(firstName: string | null, lastName: string | null) {
  return `${firstName || ""} ${lastName || ""}`.trim();
}

/** Fetch all system users visible to the current user (for the assignee picker) */
export async function getSystemUsers(): Promise<{ data?: SystemUser[]; error?: string }> {
  try {
    const { userType, department } = await getCurrentContext();
    const adminClient = createAdminClient();

    let query = adminClient
      .from("profiles")
      .select("id, email, first_name, last_name, user_type, department, unit, avatar_url")
      .order("first_name", { ascending: true });

    // College coordinators can only see users in their department
    if (userType === "college_coordinator" && department) {
      query = query.eq("department", department);
    }

    const { data, error } = await query;
    if (error) return { error: error.message };
    return { data: (data as SystemUser[]) || [] };
  } catch (err) {
    return { error: String(err) };
  }
}

/** Enrich a list of assigned training records with profile data */
async function enrichRecords(
  records: AssignedTrainingRecord[]
): Promise<AssignedTrainingRecord[]> {
  if (records.length === 0) return [];
  const adminClient = createAdminClient();

  // Collect all unique user IDs we need profiles for
  const profileIdSet = new Set<string>();
  records.forEach((record) => {
    if (record.assigned_by) profileIdSet.add(record.assigned_by);
    if (record.filled_by) profileIdSet.add(record.filled_by);
    (record.assigned_user_ids || []).forEach((id) => profileIdSet.add(id));
  });

  const profileIds = Array.from(profileIdSet);
  if (profileIds.length === 0) return records;

  const { data: profiles } = await adminClient
    .from("profiles")
    .select("id, first_name, last_name, email, user_type, department, unit, avatar_url")
    .in("id", profileIds);

  const profileMap = new Map<string, SystemUser>(
    (profiles || []).map((p) => [
      p.id,
      {
        id: p.id,
        email: p.email,
        first_name: p.first_name,
        last_name: p.last_name,
        user_type: p.user_type,
        department: p.department,
        unit: p.unit,
        avatar_url: p.avatar_url,
      },
    ])
  );

  return records.map((record) => {
    const assigner = profileMap.get(record.assigned_by);
    const filler = record.filled_by ? profileMap.get(record.filled_by) : null;
    const assignedUsers = (record.assigned_user_ids || [])
      .map((id) => profileMap.get(id))
      .filter((u): u is SystemUser => Boolean(u));

    return {
      ...record,
      assigner_full_name: assigner ? buildFullName(assigner.first_name, assigner.last_name) : null,
      assigner_avatar_url: assigner?.avatar_url || null,
      filled_by_full_name: filler ? buildFullName(filler.first_name, filler.last_name) : null,
      assigned_users: assignedUsers,
    };
  });
}

/** Fetch assigned trainings for coordinator (own) or assignee (assigned to them) */
export async function getAssignedTrainings(): Promise<{
  data?: AssignedTrainingRecord[];
  error?: string;
}> {
  try {
    const { user, userType, department } = await getCurrentContext();
    const adminClient = createAdminClient();

    if (userType === "super_admin") {
      const { data, error } = await adminClient
        .from("assigned_trainings")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) return { error: error.message };
      const enriched = await enrichRecords((data as AssignedTrainingRecord[]) || []);
      return { data: enriched };
    }

    if (userType === "college_coordinator") {
      // College coordinators see assignments they created + assignments targeted at their department
      const { data, error } = await adminClient
        .from("assigned_trainings")
        .select("*")
        .eq("department", department)
        .order("created_at", { ascending: false });
      if (error) return { error: error.message };
      const enriched = await enrichRecords((data as AssignedTrainingRecord[]) || []);
      return { data: enriched };
    }

    // Other roles: see only assignments that contain their user id
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("assigned_trainings")
      .select("*")
      .contains("assigned_user_ids", [user.id])
      .order("created_at", { ascending: false });
    if (error) return { error: error.message };
    const enriched = await enrichRecords((data as AssignedTrainingRecord[]) || []);
    return { data: enriched };
  } catch (err) {
    return { error: String(err) };
  }
}

/** College coordinator creates a new training assignment */
export async function createAssignedTraining(
  payload: AssignedTrainingPayload
): Promise<{ data?: AssignedTrainingRecord; error?: string }> {
  try {
    const { supabase, user, department, userType, firstName, lastName, avatarUrl } =
      await getCurrentContext();

    if (userType !== "college_coordinator" && userType !== "super_admin") {
      return { error: "Only college coordinators can assign trainings." };
    }
    if (!payload.training_title?.trim()) return { error: "Training title is required." };
    if (!payload.schedule_value?.trim()) return { error: "Schedule is required." };
    if (!payload.assigned_user_ids?.length) return { error: "Assign at least one user." };

    const { data, error } = await supabase
      .from("assigned_trainings")
      .insert([
        {
          training_title: payload.training_title.trim(),
          schedule_value: payload.schedule_value.trim(),
          schedule_has_day: payload.schedule_has_day,
          assigned_user_ids: payload.assigned_user_ids,
          assigned_by: user.id,
          department,
          status: "pending",
        },
      ])
      .select()
      .single();

    if (error) return { error: error.message };

    const adminClient = createAdminClient();
    const actorName = buildFullName(firstName, lastName);

    // Send notifications to each assigned user
    const notificationRows = payload.assigned_user_ids
      .filter((uid) => uid !== user.id)
      .map((recipientId) => ({
        recipient_id: recipientId,
        actor_id: user.id,
        actor_name: actorName,
        actor_avatar_url: avatarUrl,
        entity_table: "assigned_trainings",
        entity_id: (data as AssignedTrainingRecord).id,
        entity_kind: "training",
        entity_title: payload.training_title.trim(),
        action_type: "training_assigned",
        route: `/dashboard?panel=trainings&sub=assigned`,
      }));

    if (notificationRows.length > 0) {
      await adminClient.from("notifications").insert(notificationRows);
    }

    revalidatePath("/dashboard");
    return { data: data as AssignedTrainingRecord };
  } catch (err) {
    return { error: String(err) };
  }
}

/** Assigned user fills up the training form data */
export async function fillAssignedTraining(
  id: string,
  filledData: Record<string, unknown>
): Promise<{ error?: string }> {
  try {
    const { user, firstName, lastName, avatarUrl } = await getCurrentContext();
    const supabase = await createClient();

    // Verify this user is in the assignment
    const { data: existing, error: fetchError } = await supabase
      .from("assigned_trainings")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !existing) return { error: "Assignment not found." };

    const assignment = existing as AssignedTrainingRecord;
    if (!(assignment.assigned_user_ids || []).includes(user.id)) {
      return { error: "You are not assigned to this training." };
    }
    if (assignment.status === "resolved") {
      return { error: "This assignment has already been resolved." };
    }

    const { error: updateError } = await supabase
      .from("assigned_trainings")
      .update({
        filled_data: filledData,
        filled_by: user.id,
        status: "filled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) return { error: updateError.message };

    // Notify the coordinator
    const adminClient = createAdminClient();
    const actorName = buildFullName(firstName, lastName);

    await adminClient.from("notifications").insert([
      {
        recipient_id: assignment.assigned_by,
        actor_id: user.id,
        actor_name: actorName,
        actor_avatar_url: avatarUrl,
        entity_table: "assigned_trainings",
        entity_id: id,
        entity_kind: "training",
        entity_title: assignment.training_title,
        action_type: "training_filled",
        route: `/dashboard?panel=trainings&sub=assigned`,
      },
    ]);

    revalidatePath("/dashboard");
    return {};
  } catch (err) {
    return { error: String(err) };
  }
}

/** College coordinator resolves an assignment → creates official training record */
export async function resolveAssignedTraining(
  id: string
): Promise<{ error?: string; trainingId?: string }> {
  try {
    const { user, userType, department } = await getCurrentContext();
    const adminClient = createAdminClient();

    if (userType !== "college_coordinator" && userType !== "super_admin") {
      return { error: "Only college coordinators can resolve training assignments." };
    }

    const { data: existing, error: fetchError } = await adminClient
      .from("assigned_trainings")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !existing) return { error: "Assignment not found." };
    const assignment = existing as AssignedTrainingRecord;

    if (assignment.status !== "filled") {
      return { error: "Only filled assignments can be resolved." };
    }

    const filledData = assignment.filled_data || {};

    // Insert into trainings table using the filled data
    const { data: newTraining, error: insertError } = await adminClient
      .from("trainings")
      .insert([
        {
          ...filledData,
          training_title: assignment.training_title,
          department: department || assignment.department,
          college: "CEIT",
          created_by: user.id,
        },
      ])
      .select()
      .single();

    if (insertError) return { error: insertError.message };

    // Mark assignment as resolved
    await adminClient
      .from("assigned_trainings")
      .update({
        status: "resolved",
        filled_training_id: (newTraining as { id: string }).id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    revalidatePath("/dashboard");
    return { trainingId: (newTraining as { id: string }).id };
  } catch (err) {
    return { error: String(err) };
  }
}

/** Update an assigned training (coordinator edits title/schedule/assignees) */
export async function updateAssignedTraining(
  id: string,
  payload: Partial<AssignedTrainingPayload>
): Promise<{ error?: string }> {
  try {
    const { user, userType } = await getCurrentContext();
    const adminClient = createAdminClient();

    if (userType !== "college_coordinator" && userType !== "super_admin") {
      return { error: "Only coordinators can update training assignments." };
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (payload.training_title !== undefined) updates.training_title = payload.training_title.trim();
    if (payload.schedule_value !== undefined) updates.schedule_value = payload.schedule_value.trim();
    if (payload.schedule_has_day !== undefined) updates.schedule_has_day = payload.schedule_has_day;
    if (payload.assigned_user_ids !== undefined) updates.assigned_user_ids = payload.assigned_user_ids;

    const query = userType === "super_admin"
      ? adminClient.from("assigned_trainings").update(updates).eq("id", id)
      : adminClient.from("assigned_trainings").update(updates).eq("id", id).eq("assigned_by", user.id);

    const { error } = await query;
    if (error) return { error: error.message };

    revalidatePath("/dashboard");
    return {};
  } catch (err) {
    return { error: String(err) };
  }
}

/** Delete an assigned training (coordinator only, non-resolved) */
export async function deleteAssignedTraining(id: string): Promise<{ error?: string }> {
  try {
    const { user, userType } = await getCurrentContext();
    const adminClient = createAdminClient();

    if (userType !== "college_coordinator" && userType !== "super_admin") {
      return { error: "Only coordinators can delete training assignments." };
    }

    const query = userType === "super_admin"
      ? adminClient.from("assigned_trainings").delete().eq("id", id)
      : adminClient.from("assigned_trainings").delete().eq("id", id).eq("assigned_by", user.id);

    const { error } = await query;
    if (error) return { error: error.message };

    revalidatePath("/dashboard");
    return {};
  } catch (err) {
    return { error: String(err) };
  }
}
