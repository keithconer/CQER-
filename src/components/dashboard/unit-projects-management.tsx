"use client";

import * as React from "react";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface UnitProjectsManagementProps {
  myProjects: Project[];
  unitProjects: Project[];
  userType?: "super_admin" | "college_coordinator" | "unit_coordinator";
  department?: string | null;
  unit?: string | null;
  unitOptions?: string[];
  currentUserId: string;
}

export function UnitProjectsManagement({
  myProjects,
  unitProjects,
  userType,
  department,
  unit,
  unitOptions = [],
  currentUserId,
}: UnitProjectsManagementProps) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedScopes, setSelectedScopes] = React.useState<string[]>([
    "created_by_me",
    "unit_files",
  ]);
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
      .channel("unit-projects-live")
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

  const recordLabel = "Project";

  const filteredMyRecords = React.useMemo(
    () => myProjects.filter((record) => (record.entry_type || "project") === "project"),
    [myProjects]
  );
  const filteredUnitRecords = React.useMemo(
    () => unitProjects.filter((record) => (record.entry_type || "project") === "project"),
    [unitProjects]
  );

  const scopedRecords = React.useMemo(() => {
    const records: Project[] = [];
    const seenIds = new Set<string>();
    const addRecords = (items: Project[]) => {
      items.forEach((record) => {
        if (seenIds.has(record.id)) return;
        seenIds.add(record.id);
        records.push(record);
      });
    };

    if (selectedScopes.includes("created_by_me")) {
      addRecords(filteredMyRecords);
    }
    if (selectedScopes.includes("unit_files")) {
      addRecords(filteredUnitRecords);
    }

    return records;
  }, [filteredMyRecords, filteredUnitRecords, selectedScopes]);

  React.useEffect(() => {
    setSearchTerm("");
    setSelectedScopes(["created_by_me", "unit_files"]);
  }, []);

  const toggleScopeFilter = (value: string) => {
    setSelectedScopes((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-xs font-semibold">Projects</CardTitle>
              <CardDescription className="text-[10px]">
                Manage projects from your unit, including ones you&apos;ve created.
              </CardDescription>
            </div>
            <Button
              size="sm"
              className="h-8 text-[10px] bg-[#159E44] hover:bg-[#128A3B] text-white"
              onClick={() => setOpen(true)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Create {recordLabel}
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
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-[10px]">Results Filter</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  className="text-[10px]"
                  checked={selectedScopes.includes("created_by_me")}
                  onCheckedChange={() => toggleScopeFilter("created_by_me")}
                >
                  Created by me
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  className="text-[10px]"
                  checked={selectedScopes.includes("unit_files")}
                  onCheckedChange={() => toggleScopeFilter("unit_files")}
                >
                  All files from the unit
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <ProjectsTable
            projects={scopedRecords}
            readOnly={false}
            currentUserId={currentUserId}
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
            <DialogTitle className="text-xs font-semibold">
              {recordLabel} Registration Form
            </DialogTitle>
            <DialogDescription className="text-[10px]">
              Fill out the registration form below.
            </DialogDescription>
          </DialogHeader>
          <ProjectForm
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
