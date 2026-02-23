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
  DialogTrigger,
} from "@/components/ui/dialog";
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
  const router = useRouter();

  const handleSuccess = () => {
    setOpen(false);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4 flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-xs font-semibold">Projects</CardTitle>
            <CardDescription className="text-[10px]">
              Manage your college extension projects
            </CardDescription>
          </div>
          {!readOnly && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="text-xs h-8 bg-[#159E44] hover:bg-[#128A3B] text-white"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Create Project
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[800px] p-6 max-h-[90vh] overflow-hidden">
                <DialogHeader className="pb-2">
                  <DialogTitle className="text-sm font-semibold">Create New Project</DialogTitle>
                  <DialogDescription className="text-[10px]">
                    Fill out the form below to register a new college extension project.
                  </DialogDescription>
                </DialogHeader>
                <ProjectForm onSuccess={handleSuccess} />
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <ProjectsTable projects={initialProjects} readOnly={readOnly} />
        </CardContent>
      </Card>
    </div>
  );
}
