"use client";

import * as React from "react";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProjectForm } from "./project-form";
import { ProjectsTable, type Project } from "./projects-table";

interface CollegeProjectsManagementProps {
  initialProjects: Project[];
  entityType?: "project" | "program";
  userType?: "super_admin" | "college_coordinator" | "unit_coordinator";
  department?: string | null;
  unit?: string | null;
  unitOptions?: string[];
  currentUserId: string;
}

export function CollegeProjectsManagement({
  initialProjects,
  entityType = "project",
  userType,
  department,
  unit,
  unitOptions = [],
  currentUserId,
}: CollegeProjectsManagementProps) {
  const [open, setOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"my_projects" | "department_projects">(
    "my_projects"
  );
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedUnits, setSelectedUnits] = React.useState<string[]>([]);
  const refreshTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  React.useEffect(() => {
    const supabase = createClient();
    const scheduleRefresh = () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      refreshTimeoutRef.current = setTimeout(() => {
        router.refresh();
      }, 500);
    };
    const channel = supabase
      .channel("college-projects-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        scheduleRefresh
      )
      .subscribe();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [router]);

  const handleSuccess = () => {
    setOpen(false);
    router.refresh();
  };

  const isProgramsView = entityType === "program";
  const recordLabel = isProgramsView ? "Program" : "Project";
  const isMyProjects = activeTab === "my_projects";

  const filteredByEntity = React.useMemo(
    () => initialProjects.filter((record) => (record.entry_type || "project") === entityType),
    [initialProjects, entityType]
  );

  const myRecords = React.useMemo(
    () => filteredByEntity.filter((record) => record.created_by === currentUserId),
    [filteredByEntity, currentUserId]
  );

  const departmentUnitRecords = React.useMemo(
    () =>
      filteredByEntity.filter(
        (record) =>
          record.created_by !== currentUserId &&
          record.created_by_user_type === "unit_coordinator"
      ),
    [filteredByEntity, currentUserId]
  );

  const departmentRecords = React.useMemo(
    () => {
      if (selectedUnits.length === 0) return departmentUnitRecords;
      return departmentUnitRecords.filter((record) =>
        selectedUnits.includes(record.created_by_unit || "")
      );
    },
    [departmentUnitRecords, selectedUnits]
  );

  React.useEffect(() => {
    setSearchTerm("");
    setSelectedUnits([]);
  }, [activeTab]);

  React.useEffect(() => {
    setActiveTab("my_projects");
    setSearchTerm("");
    setSelectedUnits([]);
  }, [entityType]);

  const toggleUnitFilter = (unitValue: string) => {
    setSelectedUnits((prev) =>
      prev.includes(unitValue)
        ? prev.filter((unit) => unit !== unitValue)
        : [...prev, unitValue]
    );
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-xs font-semibold">{isProgramsView ? "Programs" : "Projects"}</CardTitle>
              <CardDescription className="text-[10px]">
                {isMyProjects
                  ? isProgramsView
                    ? "Programs that you've created."
                    : "Projects that you've created."
                  : isProgramsView
                    ? "Programs from units under your department."
                    : "Projects from units under your department."}
              </CardDescription>
            </div>
            <Button
              size="sm"
              className="h-8 text-xs bg-[#159E44] hover:bg-[#128A3B] text-white"
              onClick={() => setOpen(true)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Create {recordLabel}
            </Button>
          </div>
          <div className="inline-flex rounded-md border border-border/60 p-0.5 bg-muted/20">
            <Button
              size="sm"
              onClick={() => setActiveTab("my_projects")}
              className={`h-7 text-[10px] px-2.5 ${
                isMyProjects
                  ? "bg-[#159E44] hover:bg-[#128A3B] text-white"
                  : "bg-transparent text-foreground hover:bg-muted"
              }`}
            >
              {isProgramsView ? "My Programs" : "My Projects"}
            </Button>
            <Button
              size="sm"
              onClick={() => setActiveTab("department_projects")}
              className={`h-7 text-[10px] px-2.5 ${
                !isMyProjects
                  ? "bg-[#159E44] hover:bg-[#128A3B] text-white"
                  : "bg-transparent text-foreground hover:bg-muted"
              }`}
            >
              {isProgramsView ? "Department Programs" : "Department Projects"}
            </Button>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-8 h-8 text-xs placeholder:text-[10px] bg-muted/20 border-border/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {!isMyProjects && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-[10px] border-border/50 bg-muted/20"
                  >
                    <SlidersHorizontal className="h-3 w-3 mr-1" />
                    Filter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel className="text-[10px]">Scope</DropdownMenuLabel>
                  <DropdownMenuCheckboxItem
                    className="text-[10px]"
                    checked={selectedUnits.length === 0}
                    onCheckedChange={(checked) => {
                      if (checked) setSelectedUnits([]);
                    }}
                  >
                    All Projects
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[10px]">Unit Projects</DropdownMenuLabel>
                  {unitOptions.map((unitOption) => (
                    <DropdownMenuCheckboxItem
                      key={unitOption}
                      className="text-[10px]"
                      checked={selectedUnits.includes(unitOption)}
                      onCheckedChange={() => toggleUnitFilter(unitOption)}
                    >
                      {unitOption}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <ProjectsTable
            projects={isMyProjects ? myRecords : departmentRecords}
            entityType={entityType}
            readOnly={false}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            showSearch={false}
            paginationAlign="right"
            formContext={{ userType, department, unit, unitOptions }}
          />
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[800px] p-6 max-h-[90vh] overflow-hidden">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-semibold">
              Create New {recordLabel}
            </DialogTitle>
            <DialogDescription className="text-[10px]">
              Fill out the form below to register a new college extension {recordLabel.toLowerCase()}.
            </DialogDescription>
          </DialogHeader>
          <ProjectForm
            mode={entityType}
            onSuccess={handleSuccess}
            currentUserType={userType}
            currentDepartment={department}
            currentUnit={unit}
            unitOptions={unitOptions}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
