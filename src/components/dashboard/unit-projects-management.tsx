"use client";

import * as React from "react";
import { Plus, Search } from "lucide-react";
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
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const [searchTerm, setSearchTerm] = React.useState("");
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

    const intervalId = window.setInterval(() => {
      router.refresh();
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(intervalId);
    };
  }, [router]);

  const handleSuccess = () => {
    setOpen(false);
    router.refresh();
  };

  const isMyProjects = activeTab === "my_projects";

  React.useEffect(() => {
    setSearchTerm("");
  }, [activeTab]);

  return (
    <div className="space-y-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            className="h-8 text-xs bg-[#159E44] hover:bg-[#128A3B] text-white"
          >
            <Plus className="h-3 w-3 mr-1" />
            Create
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          <DropdownMenuItem
            onClick={() => setOpen(true)}
            className="text-xs cursor-pointer"
          >
            Create Project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-xs font-semibold">Projects</CardTitle>
              <CardDescription className="text-[10px]">
                {isMyProjects
                  ? "Projects that you created."
                  : "All projects created under your unit."}
              </CardDescription>
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
          </div>
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-8 h-8 text-xs bg-muted/20 border-border/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <ProjectsTable
            projects={isMyProjects ? myProjects : unitProjects}
            readOnly={!isMyProjects}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            showSearch={false}
            paginationAlign="right"
          />
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
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
  );
}
