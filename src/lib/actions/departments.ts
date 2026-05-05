"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  fetchDepartmentDirectory,
  type DepartmentOption,
} from "@/lib/departments";

type MutationResult =
  | { success: true; directory: DepartmentOption[]; message?: string }
  | { error: string };

async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" } as const;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("user_type")
    .eq("id", user.id)
    .single();

  if (error || !profile || profile.user_type !== "super_admin") {
    return { error: "Only super admins can manage departments." } as const;
  }

  return { userId: user.id } as const;
}

async function getDirectorySnapshot() {
  const adminClient = createAdminClient();
  return fetchDepartmentDirectory(
    adminClient as unknown as Parameters<typeof fetchDepartmentDirectory>[0]
  );
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function isMissingCatalog(error: unknown) {
  const message =
    typeof error === "object" && error && "message" in error
      ? String((error as { message?: unknown }).message || "")
      : "";
  return message.toLowerCase().includes("does not exist");
}

function sqlSetupError() {
  return "Department catalog is not ready yet. Please run the SQL block in Supabase first.";
}

export async function createDepartment(input: {
  name: string;
  units: string[];
}): Promise<MutationResult> {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return { error: auth.error || "Unauthorized" };

  const name = normalizeName(input.name);
  const units = Array.from(
    new Set(
      input.units
        .map((unit) => normalizeName(unit))
        .filter(Boolean)
    )
  );

  if (!name) return { error: "Department name is required." };

  const adminClient = createAdminClient();

  try {
    const { data: department, error } = await adminClient
      .from("departments")
      .insert({ name })
      .select("id")
      .single();

    if (error || !department?.id) {
      return { error: error?.message || "Failed to create department." };
    }

    if (units.length > 0) {
      const { error: unitsError } = await adminClient
        .from("department_units")
        .insert(
          units.map((unit) => ({
            department_id: department.id,
            name: unit,
          }))
        );

      if (unitsError) {
        return { error: unitsError.message || "Department created, but units could not be added." };
      }
    }

    return {
      success: true,
      directory: await getDirectorySnapshot(),
      message: "Department created successfully.",
    };
  } catch (error) {
    return { error: isMissingCatalog(error) ? sqlSetupError() : "Failed to create department." };
  }
}

export async function updateDepartmentName(input: {
  departmentId: string;
  oldName: string;
  newName: string;
}): Promise<MutationResult> {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return { error: auth.error || "Unauthorized" };

  const newName = normalizeName(input.newName);
  const oldName = normalizeName(input.oldName);

  if (!input.departmentId || !newName) {
    return { error: "Department details are incomplete." };
  }

  const adminClient = createAdminClient();

  try {
    const { error: updateError } = await adminClient
      .from("departments")
      .update({ name: newName })
      .eq("id", input.departmentId);

    if (updateError) {
      return { error: updateError.message || "Failed to update department." };
    }

    if (oldName && oldName !== newName) {
      const { error: syncError } = await adminClient.rpc(
        "sync_department_reference_name",
        { old_name: oldName, new_name: newName }
      );

      if (syncError) {
        return {
          error:
            syncError.message ||
            "Department name updated, but linked records could not be synced.",
        };
      }
    }

    return {
      success: true,
      directory: await getDirectorySnapshot(),
      message: "Department updated successfully.",
    };
  } catch (error) {
    return { error: isMissingCatalog(error) ? sqlSetupError() : "Failed to update department." };
  }
}

export async function deleteDepartment(input: {
  departmentId: string;
  departmentName: string;
}): Promise<MutationResult> {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return { error: auth.error || "Unauthorized" };

  const departmentName = normalizeName(input.departmentName);
  if (!input.departmentId || !departmentName) {
    return { error: "Department details are incomplete." };
  }

  const adminClient = createAdminClient();

  try {
    const { data: references, error: referenceError } = await adminClient.rpc(
      "count_department_references",
      { target_name: departmentName }
    );

    if (referenceError) {
      return { error: referenceError.message || "Failed to validate department usage." };
    }

    if (Number(references || 0) > 0) {
      return {
        error:
          "This department is still being used by existing records. Rename it instead, or move those records first.",
      };
    }

    const { error } = await adminClient
      .from("departments")
      .delete()
      .eq("id", input.departmentId);

    if (error) {
      return { error: error.message || "Failed to delete department." };
    }

    return {
      success: true,
      directory: await getDirectorySnapshot(),
      message: "Department deleted successfully.",
    };
  } catch (error) {
    return { error: isMissingCatalog(error) ? sqlSetupError() : "Failed to delete department." };
  }
}

export async function addDepartmentUnit(input: {
  departmentId: string;
  name: string;
}): Promise<MutationResult> {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return { error: auth.error || "Unauthorized" };

  const name = normalizeName(input.name);
  if (!input.departmentId || !name) {
    return { error: "Unit details are incomplete." };
  }

  const adminClient = createAdminClient();

  try {
    const { error } = await adminClient.from("department_units").insert({
      department_id: input.departmentId,
      name,
    });

    if (error) {
      return { error: error.message || "Failed to add unit." };
    }

    return {
      success: true,
      directory: await getDirectorySnapshot(),
      message: "Unit added successfully.",
    };
  } catch (error) {
    return { error: isMissingCatalog(error) ? sqlSetupError() : "Failed to add unit." };
  }
}

export async function updateDepartmentUnit(input: {
  departmentName: string;
  unitId: string;
  oldName: string;
  newName: string;
}): Promise<MutationResult> {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return { error: auth.error || "Unauthorized" };

  const departmentName = normalizeName(input.departmentName);
  const oldName = normalizeName(input.oldName);
  const newName = normalizeName(input.newName);

  if (!input.unitId || !departmentName || !newName) {
    return { error: "Unit details are incomplete." };
  }

  const adminClient = createAdminClient();

  try {
    const { error: updateError } = await adminClient
      .from("department_units")
      .update({ name: newName })
      .eq("id", input.unitId);

    if (updateError) {
      return { error: updateError.message || "Failed to update unit." };
    }

    if (oldName && oldName !== newName) {
      const { error: syncError } = await adminClient.rpc(
        "sync_unit_reference_name",
        {
          department_name: departmentName,
          old_name: oldName,
          new_name: newName,
        }
      );

      if (syncError) {
        return {
          error:
            syncError.message ||
            "Unit name updated, but linked records could not be synced.",
        };
      }
    }

    return {
      success: true,
      directory: await getDirectorySnapshot(),
      message: "Unit updated successfully.",
    };
  } catch (error) {
    return { error: isMissingCatalog(error) ? sqlSetupError() : "Failed to update unit." };
  }
}

export async function deleteDepartmentUnit(input: {
  unitId: string;
  unitName: string;
}): Promise<MutationResult> {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return { error: auth.error || "Unauthorized" };

  const unitName = normalizeName(input.unitName);
  if (!input.unitId || !unitName) {
    return { error: "Unit details are incomplete." };
  }

  const adminClient = createAdminClient();

  try {
    const { data: references, error: referenceError } = await adminClient.rpc(
      "count_unit_references",
      { target_name: unitName }
    );

    if (referenceError) {
      return { error: referenceError.message || "Failed to validate unit usage." };
    }

    if (Number(references || 0) > 0) {
      return {
        error:
          "This unit is still being used by existing records. Rename it instead, or move those records first.",
      };
    }

    const { error } = await adminClient
      .from("department_units")
      .delete()
      .eq("id", input.unitId);

    if (error) {
      return { error: error.message || "Failed to delete unit." };
    }

    return {
      success: true,
      directory: await getDirectorySnapshot(),
      message: "Unit deleted successfully.",
    };
  } catch (error) {
    return { error: isMissingCatalog(error) ? sqlSetupError() : "Failed to delete unit." };
  }
}
