"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { ProjectForm } from "./project-form";
import { ProjectsTable, type Project } from "./projects-table";

interface UnitProjectsManagementProps {
  myProjects: Project[];
  unitProjects: Project[];
}

export function UnitProjectsManagement({
  myProjects,
  unitProjects,
}: UnitProjectsManagementProps) {
  const [open, setOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"my_projects" | "existing_projects">(
    "my_projects"
  );
  const router = useRouter();

  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("unit-projects-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        () => router.refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  const handleSuccess = () => {
    setOpen(false);
    router.refresh();
  };

  const isMyProjects = activeTab === "my_projects";

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-3 pt-4 px-4 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <CardTitle className="text-xs font-semibold">Projects</CardTitle>
          <CardDescription className="text-[10px]">
            {isMyProjects
              ? "Projects that you created."
              : "All projects created under your unit."}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
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
              My Projects
            </Button>
            <Button
              size="sm"
              onClick={() => setActiveTab("existing_projects")}
              className={`h-7 text-[10px] px-2.5 ${
                !isMyProjects
                  ? "bg-[#159E44] hover:bg-[#128A3B] text-white"
                  : "bg-transparent text-foreground hover:bg-muted"
              }`}
            >
              Existing Projects
            </Button>
          </div>
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
                <DialogTitle className="text-sm font-semibold">
                  Create New Project
                </DialogTitle>
                <DialogDescription className="text-[10px]">
                  Fill out the form below to register a new college extension project.
                </DialogDescription>
              </DialogHeader>
              <ProjectForm onSuccess={handleSuccess} />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <ProjectsTable
          projects={isMyProjects ? myProjects : unitProjects}
          readOnly={!isMyProjects}
        />
      </CardContent>
    </Card>
  );
}
