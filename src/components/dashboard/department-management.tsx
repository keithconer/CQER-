"use client";

import * as React from "react";
import {
  Building2,
  FolderTree,
  PencilLine,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

import {
  addDepartmentUnit,
  createDepartment,
  deleteDepartment,
  deleteDepartmentUnit,
  updateDepartmentName,
  updateDepartmentUnit,
} from "@/lib/actions/departments";
import { type DepartmentOption } from "@/lib/departments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface DepartmentManagementProps {
  initialDirectory: DepartmentOption[];
}

export function DepartmentManagement({
  initialDirectory,
}: DepartmentManagementProps) {
  const [directory, setDirectory] = React.useState(initialDirectory);
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [newDepartmentName, setNewDepartmentName] = React.useState("");
  const [newDepartmentUnits, setNewDepartmentUnits] = React.useState("");
  const [editingDepartmentNames, setEditingDepartmentNames] = React.useState<
    Record<string, string>
  >({});
  const [newUnitsByDepartment, setNewUnitsByDepartment] = React.useState<
    Record<string, string>
  >({});
  const [editingUnitNames, setEditingUnitNames] = React.useState<
    Record<string, string>
  >({});
  const [isPending, startTransition] = React.useTransition();
  const totalUnits = React.useMemo(
    () => directory.reduce((sum, department) => sum + department.units.length, 0),
    [directory]
  );

  const applyResult = (
    result:
      | { success: true; directory: DepartmentOption[]; message?: string }
      | { error: string }
  ) => {
    if ("error" in result) {
      setFeedback({ type: "error", message: result.error });
      return;
    }

    setDirectory(result.directory);
    setFeedback({
      type: "success",
      message: result.message || "Department catalog updated.",
    });
  };

  const handleCreateDepartment = () => {
    const units = newDepartmentUnits
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    startTransition(async () => {
      const result = await createDepartment({
        name: newDepartmentName,
        units,
      });
      applyResult(result);
      if (!("error" in result)) {
        setNewDepartmentName("");
        setNewDepartmentUnits("");
      }
    });
  };

  const handleDepartmentRename = (department: DepartmentOption) => {
    const nextName =
      editingDepartmentNames[department.id] ?? department.name;

    startTransition(async () => {
      const result = await updateDepartmentName({
        departmentId: department.id,
        oldName: department.name,
        newName: nextName,
      });
      applyResult(result);
    });
  };

  const handleAddUnit = (department: DepartmentOption) => {
    const name = newUnitsByDepartment[department.id] || "";

    startTransition(async () => {
      const result = await addDepartmentUnit({
        departmentId: department.id,
        name,
      });
      applyResult(result);
      if (!("error" in result)) {
        setNewUnitsByDepartment((current) => ({
          ...current,
          [department.id]: "",
        }));
      }
    });
  };

  const handleUnitRename = (
    department: DepartmentOption,
    unit: DepartmentOption["units"][number]
  ) => {
    const nextName = editingUnitNames[unit.id] ?? unit.name;

    startTransition(async () => {
      const result = await updateDepartmentUnit({
        departmentName: department.name,
        unitId: unit.id,
        oldName: unit.name,
        newName: nextName,
      });
      applyResult(result);
    });
  };

  const handleDeleteDepartment = (department: DepartmentOption) => {
    if (
      !window.confirm(
        `Delete "${department.name}"? This only works when no records still use it.`
      )
    ) {
      return;
    }

    startTransition(async () => {
      const result = await deleteDepartment({
        departmentId: department.id,
        departmentName: department.name,
      });
      applyResult(result);
    });
  };

  const handleDeleteUnit = (unit: DepartmentOption["units"][number]) => {
    if (
      !window.confirm(
        `Delete "${unit.name}"? This only works when no records still use it.`
      )
    ) {
      return;
    }

    startTransition(async () => {
      const result = await deleteDepartmentUnit({
        unitId: unit.id,
        unitName: unit.name,
      });
      applyResult(result);
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Card className="border-border/50 bg-card/50 shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Departments
              </p>
              <p className="mt-1 text-xl font-semibold">{directory.length}</p>
            </div>
            <Building2 className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50 shadow-sm">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Units
              </p>
              <p className="mt-1 text-xl font-semibold">{totalUnits}</p>
            </div>
            <FolderTree className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50 shadow-sm">
          <CardContent className="p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Catalog Scope
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Changes reflect in registration, account assignment, and related profile logic.
            </p>
          </CardContent>
        </Card>
      </div>

      {feedback ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-xs ${
            feedback.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-destructive/30 bg-destructive/5 text-destructive"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="border-border/50 bg-card/50 shadow-sm xl:sticky xl:top-4">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-primary" />
              Create Departments
            </CardTitle>
            <CardDescription className="text-xs">
              Add a new department and seed it with units in one compact step.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Department Name</Label>
              <Input
                value={newDepartmentName}
                onChange={(event) => setNewDepartmentName(event.target.value)}
                placeholder="Department of Information Technology"
                className="h-10 rounded-xl text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Initial Units</Label>
              <Input
                value={newDepartmentUnits}
                onChange={(event) => setNewDepartmentUnits(event.target.value)}
                placeholder="BS Information Technology, BS Computer Science"
                className="h-10 rounded-xl text-xs"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Separate multiple initial units with commas.
            </p>
            <Button
              type="button"
              className="h-10 w-full rounded-xl"
              onClick={handleCreateDepartment}
              disabled={isPending}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Department
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4">
        {directory.map((department) => (
          <Card key={department.id} className="border-border/50 bg-card/50 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FolderTree className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm">{department.name}</CardTitle>
                    <Badge variant="outline" className="text-[10px]">
                      {department.units.length} unit
                      {department.units.length === 1 ? "" : "s"}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Update the department name or manage its units inline.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-xl text-xs text-destructive"
                  onClick={() => handleDeleteDepartment(department)}
                  disabled={isPending}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Delete Department
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                <Input
                  value={editingDepartmentNames[department.id] ?? department.name}
                  onChange={(event) =>
                    setEditingDepartmentNames((current) => ({
                      ...current,
                      [department.id]: event.target.value,
                    }))
                  }
                  className="h-10 rounded-xl text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl text-xs"
                  onClick={() => handleDepartmentRename(department)}
                  disabled={isPending}
                >
                  <PencilLine className="mr-2 h-3.5 w-3.5" />
                  Save Department Name
                </Button>
              </div>

              <Separator />

              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium">Units</h3>
                  <p className="text-xs text-muted-foreground">
                    Add a new unit or rename current ones.
                  </p>
                </div>

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                  <Input
                    value={newUnitsByDepartment[department.id] || ""}
                    onChange={(event) =>
                      setNewUnitsByDepartment((current) => ({
                        ...current,
                        [department.id]: event.target.value,
                      }))
                    }
                    placeholder="New unit name"
                    className="h-10 rounded-xl text-xs"
                  />
                  <Button
                    type="button"
                    className="h-10 rounded-xl text-xs"
                    onClick={() => handleAddUnit(department)}
                    disabled={isPending}
                  >
                    <Plus className="mr-2 h-3.5 w-3.5" />
                    Add Unit
                  </Button>
                </div>

                <div className="space-y-3">
                  {department.units.length > 0 ? (
                    <div className="grid gap-3 lg:grid-cols-2">
                      {department.units.map((unit) => (
                        <div
                          key={unit.id}
                          className="space-y-3 rounded-2xl border border-border/50 bg-background/70 p-3"
                        >
                          <Input
                            value={editingUnitNames[unit.id] ?? unit.name}
                            onChange={(event) =>
                              setEditingUnitNames((current) => ({
                                ...current,
                                [unit.id]: event.target.value,
                              }))
                            }
                            className="h-10 rounded-xl text-xs"
                          />
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              className="h-9 flex-1 rounded-xl text-xs"
                              onClick={() => handleUnitRename(department, unit)}
                              disabled={isPending}
                            >
                              <Save className="mr-2 h-3.5 w-3.5" />
                              Save
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-9 flex-1 rounded-xl text-xs text-destructive"
                              onClick={() => handleDeleteUnit(unit)}
                              disabled={isPending}
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border/50 px-4 py-5 text-xs text-muted-foreground">
                      No units yet. Add the first unit for this department.
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        </div>
      </div>
    </div>
  );
}
