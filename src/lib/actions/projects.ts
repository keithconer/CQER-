"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { DEPARTMENTS, getUnitsByDepartment } from "@/lib/departments";

function normalizeLeadUnits(raw: unknown, allowedUnits: string[] = []) {
    if (!Array.isArray(raw)) return [];
    const allowed = new Set(allowedUnits);
    return Array.from(
        new Set(
            raw
                .map((unit) => String(unit || "").trim())
                .filter((unit) => unit && (allowed.size === 0 || allowed.has(unit)))
        )
    );
}

function getDepartmentUnits(department: string | null | undefined) {
    return getUnitsByDepartment(department);
}

function normalizePartnerAgencyCount(payload: Record<string, unknown>) {
    const partnerAgencies = Array.isArray(payload.partner_agencies) ? payload.partner_agencies : [];
    payload.partner_agency_count = partnerAgencies.length;
}

function generateRecordNo(prefix: "PRJ" | "PRG") {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const random = Math.floor(Math.random() * 9000 + 1000);
    return `${prefix}-${yyyy}${mm}${dd}-${random}`;
}

export async function createProject(formData: object) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Unauthorized");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("user_type, unit, department")
        .eq("id", user.id)
        .single();

    const payload = { ...(formData as Record<string, unknown>) };
    normalizePartnerAgencyCount(payload);
    const isProgram = payload.entry_type === "program";
    const numberColumn = isProgram ? "program_no" : "project_no";
    if (!payload[numberColumn] || String(payload[numberColumn]).trim() === "") {
        payload[numberColumn] = generateRecordNo(isProgram ? "PRG" : "PRJ");
    }

    if (profile?.user_type === "unit_coordinator") {
        const unitOptions = getDepartmentUnits(profile.department);
        const fallbackUnit = profile.unit ? [profile.unit] : [];
        payload.visibility_scope = "specific_units";
        payload.visible_units = profile.unit ? [profile.unit] : [];
        payload.lead_units = profile.department ? [profile.department] : [];
        payload.related_curricular_offerings = normalizeLeadUnits(
            payload.related_curricular_offerings,
            unitOptions.length > 0 ? unitOptions : fallbackUnit
        );
    } else if (profile?.user_type === "college_coordinator") {
        const scope = payload.visibility_scope === "specific_units" ? "specific_units" : "public";
        payload.visibility_scope = scope;
        payload.visible_units =
            scope === "specific_units" && Array.isArray(payload.visible_units)
                ? payload.visible_units
                : [];
        payload.lead_units = normalizeLeadUnits(payload.lead_units, [...DEPARTMENTS]);
        const allowedUnits = getDepartmentUnits(profile.department);
        payload.related_curricular_offerings = normalizeLeadUnits(
            payload.related_curricular_offerings,
            allowedUnits
        );
    } else {
        payload.visibility_scope = "public";
        payload.visible_units = [];
        payload.lead_units = [];
        payload.related_curricular_offerings = [];
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
    const adminClient = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Unauthorized");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("user_type, unit, department")
        .eq("id", user.id)
        .single();
    if (!profile) {
        return { error: "Profile not found" };
    }

    const { data: existingProject, error: existingProjectError } = await adminClient
        .from("projects")
        .select("id, created_by")
        .eq("id", id)
        .single();
    if (existingProjectError || !existingProject) {
        return { error: "Project not found" };
    }

    const isOwner = existingProject.created_by === user.id;
    let canManage = isOwner || profile.user_type === "super_admin";

    if (!canManage && profile.user_type === "college_coordinator" && profile.department) {
        const { data: creatorProfile } = await adminClient
            .from("profiles")
            .select("department")
            .eq("id", existingProject.created_by)
            .single();
        canManage = !!creatorProfile?.department && creatorProfile.department === profile.department;
    }

    if (!canManage) {
        return { error: "Insufficient permissions to update this record" };
    }

    const payload = { ...(formData as Record<string, unknown>) };
    normalizePartnerAgencyCount(payload);
    const isProgram = payload.entry_type === "program";
    const numberColumn = isProgram ? "program_no" : "project_no";
    if (!payload[numberColumn] || String(payload[numberColumn]).trim() === "") {
        delete payload[numberColumn];
    }

    if (profile?.user_type === "unit_coordinator") {
        const unitOptions = getDepartmentUnits(profile.department);
        const fallbackUnit = profile.unit ? [profile.unit] : [];
        payload.visibility_scope = "specific_units";
        payload.visible_units = profile.unit ? [profile.unit] : [];
        payload.lead_units = profile.department ? [profile.department] : [];
        payload.related_curricular_offerings = normalizeLeadUnits(
            payload.related_curricular_offerings,
            unitOptions.length > 0 ? unitOptions : fallbackUnit
        );
    } else if (profile?.user_type === "college_coordinator") {
        const scope = payload.visibility_scope === "specific_units" ? "specific_units" : "public";
        payload.visibility_scope = scope;
        payload.visible_units =
            scope === "specific_units" && Array.isArray(payload.visible_units)
                ? payload.visible_units
                : [];
        payload.lead_units = normalizeLeadUnits(payload.lead_units, [...DEPARTMENTS]);
        const allowedUnits = getDepartmentUnits(profile.department);
        payload.related_curricular_offerings = normalizeLeadUnits(
            payload.related_curricular_offerings,
            allowedUnits
        );
    }

    const { data, error } = await adminClient
        .from("projects")
        .update({
            ...payload,
            updated_at: new Date().toISOString(),
        })
        .eq("id", id)
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
    const adminClient = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Unauthorized");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("user_type, department")
        .eq("id", user.id)
        .single();
    if (!profile) {
        return { error: "Profile not found" };
    }

    const { data: existingProject, error: existingProjectError } = await adminClient
        .from("projects")
        .select("id, created_by")
        .eq("id", id)
        .single();
    if (existingProjectError || !existingProject) {
        return { error: "Project not found" };
    }

    const isOwner = existingProject.created_by === user.id;
    let canManage = isOwner || profile.user_type === "super_admin";

    if (!canManage && profile.user_type === "college_coordinator" && profile.department) {
        const { data: creatorProfile } = await adminClient
            .from("profiles")
            .select("department")
            .eq("id", existingProject.created_by)
            .single();
        canManage = !!creatorProfile?.department && creatorProfile.department === profile.department;
    }

    if (!canManage) {
        return { error: "Insufficient permissions to delete this record" };
    }

    const { error } = await adminClient
        .from("projects")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Error deleting project:", error);
        return { error: error.message };
    }

    revalidatePath("/dashboard");
    return { success: true };
}
