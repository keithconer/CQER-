"use client";

import * as React from "react";
import { Briefcase, Plus, Search, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";

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
import { type TechnicalAdvisoryServiceRecord } from "@/lib/actions/technical-advisory-services";
import { type Project } from "./projects-table";
import { TechnicalAdvisoryServicesForm } from "./technical-advisory-services-form";
import { TechnicalAdvisoryServicesTable } from "./technical-advisory-services-table";

interface TechnicalAdvisoryServicesManagementProps {
  initialRecords: TechnicalAdvisoryServiceRecord[];
  assignedProjects: Project[];
  currentUserId: string;
  userType: "super_admin" | "college_coordinator" | "unit_coordinator";
  department?: string | null;
}

export function TechnicalAdvisoryServicesManagement({
  initialRecords,
  assignedProjects,
  currentUserId,
  userType,
  department,
}: TechnicalAdvisoryServicesManagementProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedScope, setSelectedScope] = React.useState<string>("all");
  const [selectedGroups, setSelectedGroups] = React.useState<string[]>([]);

  const groupLabel = userType === "super_admin" ? "Departments" : "Units";
  const groupOptions = React.useMemo(() => {
    const source = userType === "super_admin"
      ? initialRecords.map((record) => record.department || "").filter(Boolean)
      : initialRecords.map((record) => record.unit || "").filter(Boolean);
    return Array.from(new Set(source)).sort((a, b) => a.localeCompare(b));
  }, [initialRecords, userType]);

  const filteredRecords = React.useMemo(() => {
    const scoped = initialRecords.filter((record) => {
      if (selectedScope === "created_by_me") return record.created_by === currentUserId;
      if (selectedScope === "specific_groups") {
        if (selectedGroups.length === 0) return false;
        return userType === "super_admin"
          ? selectedGroups.includes(record.department || "")
          : selectedGroups.includes(record.unit || "");
      }
      return true;
    });

    const term = searchTerm.trim().toLowerCase();
    if (!term) return scoped;

    return scoped.filter((record) =>
      [
        record.project_no,
        record.project_title,
        record.venue,
        record.service_provided,
        record.service_provided_other || "",
        record.department || "",
        record.unit || "",
        record.contact_person,
        (record.clients || []).map((client) => client.name).join(" "),
        (record.service_persons || []).map((person) => person.name).join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [currentUserId, initialRecords, searchTerm, selectedGroups, selectedScope, userType]);

  const toggleGroup = (value: string) => {
    setSelectedGroups((previous) =>
      previous.includes(value) ? previous.filter((item) => item !== value) : [...previous, value]
    );
  };

  const handleSuccess = () => {
    setCreateOpen(false);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="space-y-3 px-4 pb-3 pt-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-1.5">
                <Briefcase className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xs font-semibold">Technical Advisory Services</CardTitle>
                <CardDescription className="text-[10px]">Manage technical advisory services records in the same table style as the existing dashboard modules.</CardDescription>
              </div>
            </div>
            <Button size="sm" className="h-8 bg-[#159E44] text-[10px] text-white hover:bg-[#128A3B]" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1 h-3 w-3" />
              Add Technical Advisory Services
            </Button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search..." className="h-8 border-border/50 bg-muted/20 pl-8 text-xs placeholder:text-[10px]" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 border-border/50 bg-muted/20 text-[10px]">
                  <SlidersHorizontal className="mr-1 h-3 w-3" />
                  Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="text-[10px]">Results Filter</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem className="text-[10px]" checked={selectedScope === "created_by_me"} onCheckedChange={() => setSelectedScope("created_by_me")}>Created by me</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem className="text-[10px]" checked={selectedScope === "all"} onCheckedChange={() => { setSelectedScope("all"); setSelectedGroups([]); }}>All</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem className="text-[10px]" checked={selectedScope === "specific_groups"} onCheckedChange={() => setSelectedScope("specific_groups")}>Specific {userType === "super_admin" ? "departments" : "units"}</DropdownMenuCheckboxItem>
                {selectedScope === "specific_groups" && groupOptions.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-[10px]">{groupLabel}</DropdownMenuLabel>
                    {groupOptions.map((option) => (
                      <DropdownMenuCheckboxItem key={option} className="text-[10px]" checked={selectedGroups.includes(option)} onCheckedChange={() => toggleGroup(option)}>
                        {option}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="px-4 pb-4">
          <TechnicalAdvisoryServicesTable
            records={filteredRecords}
            assignedProjects={assignedProjects}
            currentUserId={currentUserId}
            userType={userType}
            department={department}
          />
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[900px] p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-semibold">Add Technical Advisory Services</DialogTitle>
            <DialogDescription className="text-[10px]">Create a new technical advisory services record.</DialogDescription>
          </DialogHeader>
          <TechnicalAdvisoryServicesForm assignedProjects={assignedProjects} onSuccess={handleSuccess} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
