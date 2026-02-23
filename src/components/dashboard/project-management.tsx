"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProjectForm } from "./project-form";
import { ProjectsTable } from "./projects-table";
import { useRouter } from "next/navigation";

interface ProjectManagementProps {
  initialProjects: any[];
  readOnly?: boolean;
}

export function ProjectManagement({ initialProjects, readOnly }: ProjectManagementProps) {
  const [open, setOpen] = React.useState(false);
  const [createMode, setCreateMode] = React.useState<"project" | "program">("project");
  const [recordType, setRecordType] = React.useState<"project" | "program">("project");
  const router = useRouter();
  const filteredRecords = React.useMemo(
    () => initialProjects.filter((record) => (record.entry_type || "project") === recordType),
    [initialProjects, recordType]
  );

  const handleSuccess = () => {
    setOpen(false);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4 flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-xs font-semibold">{recordType === "program" ? "Programs" : "Projects"}</CardTitle>
            <CardDescription className="text-[10px]">
              Manage your college extension {recordType === "program" ? "programs" : "projects"}
            </CardDescription>
          </div>
          <div className="inline-flex rounded-md border border-border/60 p-0.5 bg-muted/20">
            <Button
              size="sm"
              onClick={() => setRecordType("project")}
              className={`h-7 text-[10px] px-2.5 ${
                recordType === "project"
                  ? "bg-[#159E44] hover:bg-[#128A3B] text-white"
                  : "bg-transparent text-foreground hover:bg-muted"
              }`}
            >
              Project Tables
            </Button>
            <Button
              size="sm"
              onClick={() => setRecordType("program")}
              className={`h-7 text-[10px] px-2.5 ${
                recordType === "program"
                  ? "bg-[#159E44] hover:bg-[#128A3B] text-white"
                  : "bg-transparent text-foreground hover:bg-muted"
              }`}
            >
              Program Tables
            </Button>
          </div>
          {!readOnly && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    className="text-xs h-8 bg-[#159E44] hover:bg-[#128A3B] text-white"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Create
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem
                    onClick={() => {
                      setCreateMode("project");
                      setOpen(true);
                    }}
                    className="text-xs cursor-pointer"
                  >
                    Create Project
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setCreateMode("program");
                      setOpen(true);
                    }}
                    className="text-xs cursor-pointer"
                  >
                    Create Program
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <ProjectsTable projects={filteredRecords} entityType={recordType} readOnly={readOnly} />
        </CardContent>
      </Card>

      {!readOnly && (
        <Dialog open={open} onOpenChange={setOpen}>
              <DialogContent className="sm:max-w-[800px] p-6 max-h-[90vh] overflow-hidden">
                <DialogHeader className="pb-2">
                  <DialogTitle className="text-sm font-semibold">Create New {createMode === "program" ? "Program" : "Project"}</DialogTitle>
                  <DialogDescription className="text-[10px]">
                    Fill out the form below to register a new college extension {createMode}.
                  </DialogDescription>
                </DialogHeader>
                <ProjectForm mode={createMode} onSuccess={handleSuccess} />
              </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
