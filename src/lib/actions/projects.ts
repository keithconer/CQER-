"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createProject(formData: any) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Unauthorized");
    }

    const { data, error } = await supabase
        .from("projects")
        .insert([
            {
                ...formData,
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
export async function updateProject(id: string, formData: any) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Unauthorized");
    }

    const { data, error } = await supabase
        .from("projects")
        .update({
            ...formData,
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
