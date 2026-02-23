"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function createProject(formData: object) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Unauthorized");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("user_type, unit")
        .eq("id", user.id)
        .single();

    const payload = { ...(formData as Record<string, unknown>) };

    if (profile?.user_type === "unit_coordinator") {
        payload.visibility_scope = "specific_units";
        payload.visible_units = profile.unit ? [profile.unit] : [];
    } else if (profile?.user_type === "college_coordinator") {
        const scope = payload.visibility_scope === "specific_units" ? "specific_units" : "public";
        payload.visibility_scope = scope;
        payload.visible_units =
            scope === "specific_units" && Array.isArray(payload.visible_units)
                ? payload.visible_units
                : [];
    } else {
        payload.visibility_scope = "public";
        payload.visible_units = [];
    }

    const { data, error } = await supabase
        .from("projects")
        .insert([
            {
                ...payload,
                created_by: user.id,
            },
        ])
        .select();

    if (error) {
        console.error("Error creating project:", error);
        return { error: error.message };
    }

    revalidatePath("/dashboard");
    return { data };
}

export async function getProjects() {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching projects:", error);
        return { error: error.message };
    }

    return { data };
}

export async function getCollegeProjects() {
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

    if (!profile || profile.user_type !== "college_coordinator" || !profile.department) {
        return { data: [] };
    }

    const { data: deptProfiles, error: deptProfilesError } = await adminClient
        .from("profiles")
        .select("id, user_type, unit")
        .in("user_type", ["college_coordinator", "unit_coordinator"])
        .eq("department", profile.department);

    if (deptProfilesError) {
        console.error("Error fetching department profiles:", deptProfilesError);
        return { error: deptProfilesError.message };
    }

    const profileMap = new Map(
        (deptProfiles || []).map((p) => [p.id, { user_type: p.user_type, unit: p.unit }])
    );
    const creatorIds = deptProfiles?.map((p) => p.id) || [];
    if (creatorIds.length === 0) {
        return { data: [] };
    }

    const { data, error } = await adminClient
        .from("projects")
        .select("*")
        .in("created_by", creatorIds)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching college projects:", error);
        return { error: error.message };
    }

    const enriched =
        (data || []).map((project) => {
            const creator = profileMap.get(project.created_by);
            return {
                ...project,
                created_by_user_type: creator?.user_type || null,
                created_by_unit: creator?.unit || null,
            };
        }) || [];

    return { data: enriched };
}

export async function getUnitProjects() {
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

    if (
        !profile ||
        profile.user_type !== "unit_coordinator" ||
        !profile.department ||
        !profile.unit
    ) {
        return { data: [] };
    }

    const { data: deptProfiles, error: deptProfilesError } = await adminClient
        .from("profiles")
        .select("id, user_type, unit")
        .in("user_type", ["unit_coordinator", "college_coordinator"])
        .eq("department", profile.department);

    if (deptProfilesError) {
        console.error("Error fetching department profiles:", deptProfilesError);
        return { error: deptProfilesError.message };
    }

    const profileMap = new Map(
        (deptProfiles || []).map((p) => [p.id, { user_type: p.user_type, unit: p.unit }])
    );
    const creatorIds = (deptProfiles || []).map((p) => p.id);

    if (creatorIds.length === 0) {
        return { data: [] };
    }

    const { data, error } = await adminClient
        .from("projects")
        .select("*")
        .in("created_by", creatorIds)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching unit projects:", error);
        return { error: error.message };
    }

    const filtered =
        data?.filter((project) => {
            const creator = profileMap.get(project.created_by);
            if (!creator) return false;

            if (creator.user_type === "unit_coordinator") {
                return creator.unit === profile.unit;
            }

            if (creator.user_type === "college_coordinator") {
                if (project.visibility_scope === "public") return true;
                if (project.visibility_scope === "specific_units") {
                    const visibleUnits = Array.isArray(project.visible_units) ? project.visible_units : [];
                    return visibleUnits.includes(profile.unit);
                }
                return false;
            }

            return false;
        }) || [];

    return { data: filtered };
}
export async function updateProject(id: string, formData: object) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Unauthorized");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("user_type, unit")
        .eq("id", user.id)
        .single();

    const payload = { ...(formData as Record<string, unknown>) };

    if (profile?.user_type === "unit_coordinator") {
        payload.visibility_scope = "specific_units";
        payload.visible_units = profile.unit ? [profile.unit] : [];
    } else if (profile?.user_type === "college_coordinator") {
        const scope = payload.visibility_scope === "specific_units" ? "specific_units" : "public";
        payload.visibility_scope = scope;
        payload.visible_units =
            scope === "specific_units" && Array.isArray(payload.visible_units)
                ? payload.visible_units
                : [];
    }

    const { data, error } = await supabase
        .from("projects")
        .update({
            ...payload,
            updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("created_by", user.id)
        .select();

    if (error) {
        console.error("Error updating project:", error);
        return { error: error.message };
    }

    revalidatePath("/dashboard");
    return { data };
}

export async function deleteProject(id: string) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Unauthorized");
    }

    const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", id)
        .eq("created_by", user.id);

    if (error) {
        console.error("Error deleting project:", error);
        return { error: error.message };
    }

    revalidatePath("/dashboard");
    return { success: true };
}
