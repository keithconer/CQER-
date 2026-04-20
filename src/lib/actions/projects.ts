"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { DEPARTMENTS, getAllUnits, getUnitsByDepartment } from "@/lib/departments";

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

function normalizeDepartments(raw: unknown) {
    if (!Array.isArray(raw)) return [];
    const allowed = new Set(DEPARTMENTS);
    return Array.from(
        new Set(
            raw
                .map((department) => String(department || "").trim())
                .filter((department) => department && allowed.has(department as typeof DEPARTMENTS[number]))
        )
    );
}

function projectVisibleToDepartment(
    project: { visibility_scope?: string | null; visible_units?: unknown; visible_departments?: unknown },
    department: string | null | undefined
) {
    if (!department) return false;
    const visibleDepartments = normalizeDepartments(project.visible_departments);
    return project.visibility_scope === "all_departments" ||
        (project.visibility_scope === "specific_departments" && visibleDepartments.includes(department));
}

function normalizePartnerAgencyCount(payload: Record<string, unknown>) {
    const partnerAgencies = Array.isArray(payload.partner_agencies) ? payload.partner_agencies : [];
    payload.partner_agency_count = partnerAgencies.length;
}

function stripMissingSchemaCacheColumn(payload: Record<string, unknown>, message?: string) {
    if (!message) return false;
    const match = message.match(/could not find the '([^']+)' column of 'projects' in the schema cache/i);
    if (!match?.[1]) return false;
    const missingColumn = match[1];
    if (missingColumn in payload) {
        delete payload[missingColumn];
        return true;
    }
    return false;
}

function generateRecordNo(prefix: "PRJ") {
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
    if (!profile || !["unit_coordinator", "college_coordinator", "super_admin", "project_leader"].includes(profile.user_type)) {
        return { error: "Insufficient permissions to create projects." };
    }

    const payload = { ...(formData as Record<string, unknown>) };
    normalizePartnerAgencyCount(payload);
    if (!payload.entry_type) {
        payload.entry_type = "project";
    }
    if (!payload.title && typeof payload.project_title === "string" && payload.project_title.trim()) {
        payload.title = payload.project_title.trim();
    }
    if (payload.entry_type === "project" && (!payload.project_no || String(payload.project_no).trim() === "")) {
        payload.project_no = generateRecordNo("PRJ");
    }

    if (profile?.user_type === "unit_coordinator") {
        const unitOptions = getDepartmentUnits(profile.department);
        const fallbackUnit = profile.unit ? [profile.unit] : [];
        payload.visibility_scope = "specific_units";
        payload.visible_units = profile.unit ? [profile.unit] : [];
        payload.visible_departments = profile.department ? [profile.department] : [];
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
        payload.visible_departments = profile.department ? [profile.department] : [];
        payload.lead_units = normalizeLeadUnits(payload.lead_units, [...DEPARTMENTS]);
        const allowedUnits = getDepartmentUnits(profile.department);
        payload.related_curricular_offerings = normalizeLeadUnits(
            payload.related_curricular_offerings,
            allowedUnits
        );
    } else if (profile?.user_type === "super_admin") {
        const scope =
            payload.visibility_scope === "specific_departments" ? "specific_departments" : "all_departments";
        const visibleDepartments =
            scope === "specific_departments" ? normalizeDepartments(payload.visible_departments) : [...DEPARTMENTS];
        const allowedUnits =
            visibleDepartments.length > 0
                ? visibleDepartments.flatMap((department) => getDepartmentUnits(department))
                : getAllUnits();

        payload.visibility_scope = scope;
        payload.visible_departments = visibleDepartments;
        payload.visible_units = [];
        payload.lead_units = normalizeLeadUnits(payload.lead_units, [...DEPARTMENTS]);
        payload.related_curricular_offerings = normalizeLeadUnits(
            payload.related_curricular_offerings,
            allowedUnits
        );
    } else if (profile?.user_type === "project_leader") {
        payload.visibility_scope = "specific_units";
        payload.visible_units = profile.unit ? [profile.unit] : [];
        payload.visible_departments = profile.department ? [profile.department] : [];
        payload.lead_units = profile.department ? [profile.department] : [];
        payload.related_curricular_offerings = profile.unit ? [profile.unit] : [];
        payload.project_leader_id = user.id;
    } else {
        payload.visibility_scope = "all_departments";
        payload.visible_units = [];
        payload.visible_departments = [...DEPARTMENTS];
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
        const fallbackPayload = { ...payload };
        const stripped = stripMissingSchemaCacheColumn(fallbackPayload, error.message);
        if (stripped) {
            const { data: fallbackData, error: fallbackError } = await supabase
                .from("projects")
                .insert([
                    {
                        ...fallbackPayload,
                        created_by: user.id,
                    },
                ])
                .select();
            if (fallbackError) {
                console.error("Error creating project (schema-cache fallback):", fallbackError);
                return { error: fallbackError.message };
            }
            revalidatePath("/dashboard");
            return { data: fallbackData };
        }
        if (error.message?.toLowerCase().includes("funding_data") && error.message?.toLowerCase().includes("schema cache")) {
            return {
                error:
                    "Database schema cache is missing projects.funding_data. Please run the Funding Report Fields SQL block in supabase-schema.sql, then retry.",
            };
        }
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
        .select("id, user_type, unit, department, first_name, last_name")
        .in("user_type", ["college_coordinator", "unit_coordinator", "project_leader", "super_admin"])
        .eq("department", profile.department);

    if (deptProfilesError) {
        console.error("Error fetching department profiles:", deptProfilesError);
        return { error: deptProfilesError.message };
    }

    const profileMap = new Map(
        (deptProfiles || []).map((p) => [
            p.id,
            {
                user_type: p.user_type,
                unit: p.unit,
                department: p.department,
                first_name: p.first_name,
                last_name: p.last_name,
            },
        ])
    );
    const { data: superAdmins, error: superAdminError } = await adminClient
        .from("profiles")
        .select("id, user_type, unit, department, first_name, last_name")
        .eq("user_type", "super_admin");

    if (superAdminError) {
        console.error("Error fetching super admin profiles:", superAdminError);
        return { error: superAdminError.message };
    }

    (superAdmins || []).forEach((entry) =>
        profileMap.set(entry.id, {
            user_type: entry.user_type,
            unit: entry.unit,
            department: entry.department,
            first_name: entry.first_name,
            last_name: entry.last_name,
        })
    );

    const creatorIds = Array.from(new Set([...(deptProfiles?.map((p) => p.id) || []), ...((superAdmins || []).map((p) => p.id))]));
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
        (data || []).filter((project) => {
            const creator = profileMap.get(project.created_by);
            if (!creator) return false;

            if (creator.user_type === "super_admin") {
                return projectVisibleToDepartment(project, profile.department);
            }

            return true;
        }).map((project) => {
            const creator = profileMap.get(project.created_by);
            return {
                ...project,
                created_by_user_type: creator?.user_type || null,
                created_by_unit: creator?.unit || null,
                created_by_department: creator?.department || null,
                creator_first_name: creator?.first_name || null,
                creator_last_name: creator?.last_name || null,
                creator_full_name: `${creator?.first_name || ""} ${creator?.last_name || ""}`.trim() || null,
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
        !["unit_coordinator", "extension_office", "project_leader"].includes(profile.user_type) ||
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
    const { data: superAdmins, error: superAdminError } = await adminClient
        .from("profiles")
        .select("id, user_type, unit")
        .eq("user_type", "super_admin");

    if (superAdminError) {
        console.error("Error fetching super admin profiles:", superAdminError);
        return { error: superAdminError.message };
    }

    (superAdmins || []).forEach((entry) => profileMap.set(entry.id, { user_type: entry.user_type, unit: entry.unit }));

    const creatorIds = Array.from(new Set([...(deptProfiles || []).map((p) => p.id), ...((superAdmins || []).map((p) => p.id))]));

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

            if (creator.user_type === "super_admin") {
                return projectVisibleToDepartment(project, profile.department);
            }

            return false;
        }) || [];

    return { data: filtered };
}

export async function getProjectLeaderProjects() {
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
        .select("user_type")
        .eq("id", user.id)
        .single();

    if (!profile || profile.user_type !== "project_leader") {
        return { data: [] };
    }

    const { data, error } = await adminClient
        .from("projects")
        .select("*")
        .or(`project_leader_id.eq.${user.id},created_by.eq.${user.id}`)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching project leader projects:", error);
        return { error: error.message };
    }

    const creatorIds = Array.from(
        new Set((data || []).map((project) => project.created_by).filter(Boolean))
    ) as string[];

    let creatorMap = new Map<string, { user_type: string | null; unit: string | null }>();
    if (creatorIds.length > 0) {
        const { data: creatorProfiles } = await adminClient
            .from("profiles")
            .select("id, user_type, unit")
            .in("id", creatorIds);
        creatorMap = new Map(
            (creatorProfiles || []).map((entry) => [
                entry.id,
                { user_type: entry.user_type, unit: entry.unit },
            ])
        );
    }

    const enriched =
        (data || []).map((project) => {
            const creator = creatorMap.get(project.created_by);
            return {
                ...project,
                created_by_user_type: creator?.user_type || null,
                created_by_unit: creator?.unit || null,
            };
        }) || [];

    return { data: enriched };
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
    if (!["unit_coordinator", "college_coordinator", "super_admin", "project_leader"].includes(profile.user_type)) {
        return { error: "Insufficient permissions to update this record" };
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

    if (!canManage && profile.user_type === "project_leader") {
        canManage = existingProject.created_by === user.id;
    }

    if (!canManage) {
        return { error: "Insufficient permissions to update this record" };
    }

    const payload = { ...(formData as Record<string, unknown>) };
    normalizePartnerAgencyCount(payload);
    if (!payload.entry_type) {
        payload.entry_type = "project";
    } else if (profile?.user_type === "project_leader") {
        payload.visibility_scope = "specific_units";
        payload.visible_units = profile.unit ? [profile.unit] : [];
        payload.visible_departments = profile.department ? [profile.department] : [];
        payload.lead_units = profile.department ? [profile.department] : [];
        payload.related_curricular_offerings = profile.unit ? [profile.unit] : [];
        payload.project_leader_id = user.id;
    }
    if (!payload.title && typeof payload.project_title === "string" && payload.project_title.trim()) {
        payload.title = payload.project_title.trim();
    }
    if (payload.entry_type === "project" && (!payload.project_no || String(payload.project_no).trim() === "")) {
        delete payload.project_no;
    }

    if (profile?.user_type === "unit_coordinator") {
        const unitOptions = getDepartmentUnits(profile.department);
        const fallbackUnit = profile.unit ? [profile.unit] : [];
        payload.visibility_scope = "specific_units";
        payload.visible_units = profile.unit ? [profile.unit] : [];
        payload.visible_departments = profile.department ? [profile.department] : [];
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
        payload.visible_departments = profile.department ? [profile.department] : [];
        payload.lead_units = normalizeLeadUnits(payload.lead_units, [...DEPARTMENTS]);
        const allowedUnits = getDepartmentUnits(profile.department);
        payload.related_curricular_offerings = normalizeLeadUnits(
            payload.related_curricular_offerings,
            allowedUnits
        );
    } else if (profile?.user_type === "super_admin") {
        const scope =
            payload.visibility_scope === "specific_departments" ? "specific_departments" : "all_departments";
        const visibleDepartments =
            scope === "specific_departments" ? normalizeDepartments(payload.visible_departments) : [...DEPARTMENTS];
        const allowedUnits =
            visibleDepartments.length > 0
                ? visibleDepartments.flatMap((department) => getDepartmentUnits(department))
                : getAllUnits();

        payload.visibility_scope = scope;
        payload.visible_departments = visibleDepartments;
        payload.visible_units = [];
        payload.lead_units = normalizeLeadUnits(payload.lead_units, [...DEPARTMENTS]);
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
        const fallbackPayload = { ...payload };
        const stripped = stripMissingSchemaCacheColumn(fallbackPayload, error.message);
        if (stripped) {
            const { data: fallbackData, error: fallbackError } = await adminClient
                .from("projects")
                .update({
                    ...fallbackPayload,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", id)
                .select();
            if (fallbackError) {
                console.error("Error updating project (schema-cache fallback):", fallbackError);
                return { error: fallbackError.message };
            }
            revalidatePath("/dashboard");
            return { data: fallbackData };
        }
        if (error.message?.toLowerCase().includes("funding_data") && error.message?.toLowerCase().includes("schema cache")) {
            return {
                error:
                    "Database schema cache is missing projects.funding_data. Please run the Funding Report Fields SQL block in supabase-schema.sql, then retry.",
            };
        }
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
    if (!["unit_coordinator", "college_coordinator", "super_admin", "project_leader"].includes(profile.user_type)) {
        return { error: "Insufficient permissions to delete this record" };
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

    if (!canManage && profile.user_type === "project_leader") {
        canManage = existingProject.created_by === user.id;
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

export async function getProjectLeaderProposals() {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        return { error: 'Unauthorized' };
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .single();

    if (!profile || profile.user_type !== 'project_leader') {
        return { data: [] };
    }

    const { data, error } = await adminClient
        .from('project_proposals')
        .select('*')
        .eq('project_leader_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching project leader proposals:', error);
        return { error: error.message };
    }

    const creatorIds = Array.from(
        new Set((data || []).map((proposal) => proposal.created_by).filter(Boolean))
    ) as string[];

    let creatorMap = new Map<string, { user_type: string | null; unit: string | null }>();
    if (creatorIds.length > 0) {
        const { data: creatorProfiles } = await adminClient
            .from('profiles')
            .select('id, user_type, unit')
            .in('id', creatorIds);
        creatorMap = new Map(
            (creatorProfiles || []).map((entry) => [
                entry.id,
                { user_type: entry.user_type, unit: entry.unit },
            ])
        );
    }

    const enriched =
        (data || []).map((proposal) => {
            const creator = creatorMap.get(proposal.created_by);
            return {
                ...proposal,
                created_by_user_type: creator?.user_type || null,
                created_by_unit: creator?.unit || null,
            };
        });

    return { data: enriched };
}
