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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { ProjectProposalForm } from "./project-proposal-form";
import { ProjectProposalsTable, type ProjectProposal } from "./project-proposals-table";

interface ProjectProposalManagementProps {
  initialProjects: ProjectProposal[];
  readOnly?: boolean;
  userType?: "super_admin" | "college_coordinator" | "unit_coordinator";
  department?: string | null;
  unit?: string | null;
}

export function ProjectProposalManagement({
  initialProjects,
  readOnly,
  userType,
  department,
  unit,
}: ProjectProposalManagementProps) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const filteredRecords = React.useMemo(
    () => initialProjects.filter((record) => (record.entry_type || "") === "project_proposal"),
    [initialProjects]
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
            <CardTitle className="text-xs font-semibold">Project Proposals</CardTitle>
            <CardDescription className="text-[10px]">Manage project proposal records.</CardDescription>
          </div>
          {!readOnly && (
            <Button size="sm" className="text-[10px] h-8 bg-[#159E44] hover:bg-[#128A3B] text-white" onClick={() => setOpen(true)}>
              <Plus className="h-3 w-3 mr-1" />
              Create Project Proposal
            </Button>
          )}
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <ProjectProposalsTable
            proposals={filteredRecords}
            readOnly={readOnly}
            formContext={{ userType, department, unit }}
          />
        </CardContent>
      </Card>

      {!readOnly && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-[800px] p-6 max-h-[90vh] overflow-hidden">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-xs font-semibold">Create Project Proposal</DialogTitle>
              <DialogDescription className="text-[10px]">
                Fill out the form below to register a new project proposal.
              </DialogDescription>
            </DialogHeader>
            <ProjectProposalForm
              onSuccess={handleSuccess}
              currentUserType={userType}
              currentDepartment={department}
              currentUnit={unit}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
