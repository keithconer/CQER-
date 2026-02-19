"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Eye, Pencil, Trash2, Search, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteProject } from "@/lib/actions/projects";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ProjectForm } from "./project-form";
import { useRouter } from "next/navigation";

interface Project {
  id: string;
  title: string;
  classification: string[];
  academic_program: string;
  start_date: string;
  end_date: string;
  gad_score: number;
  sdg_goals: string[];
}

interface ProjectsTableProps {
  projects: Project[];
}

export function ProjectsTable({ projects }: ProjectsTableProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 5;

  const filteredProjects = React.useMemo(() => {
    return projects.filter((project) =>
      project.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [projects, searchTerm]);

  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProjects = filteredProjects.slice(startIndex, startIndex + itemsPerPage);

  // Reset to page 1 when search term changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const [viewProject, setViewProject] = React.useState<Project | null>(null);
  const [editProject, setEditProject] = React.useState<Project | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const result = await deleteProject(deleteId);
      if (result.error) {
        alert("Error: " + result.error);
      } else {
        setDeleteId(null);
        router.refresh();
      }
    } catch (error) {
      alert("Something went wrong");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!projects || projects.length === 0) {
    return (
      <div className="text-center py-8 border border-dashed rounded-lg bg-muted/20">
        <p className="text-xs text-muted-foreground">No projects found. Create one to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search projects..."
          className="pl-8 h-8 text-xs bg-muted/20 border-border/50"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="rounded-md border border-border/50 overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent border-border/50">
              <TableHead className="text-[10px] font-semibold h-9">Project Title</TableHead>
              <TableHead className="text-[10px] font-semibold h-9">Program</TableHead>
              <TableHead className="text-[10px] font-semibold h-9">Period</TableHead>
              <TableHead className="text-[10px] font-semibold h-9">GAD Score</TableHead>
              <TableHead className="text-[10px] font-semibold h-9">SDGs</TableHead>
              <TableHead className="text-[10px] font-semibold h-9 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedProjects.length > 0 ? (
              paginatedProjects.map((project) => (
                <TableRow key={project.id} className="hover:bg-muted/10 border-border/30">
                  <TableCell className="py-2.5 px-3 max-w-[250px]">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium truncate" title={project.title}>
                        {project.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground line-clamp-1" title={Array.isArray(project.classification) ? project.classification.join(", ") : project.classification}>
                        {Array.isArray(project.classification) ? project.classification.join(", ") : project.classification}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-[10px] py-2.5 px-3">
                    {project.academic_program}
                  </TableCell>
                  <TableCell className="text-[10px] py-2.5 px-3">
                    <span className="whitespace-nowrap">
                      {format(new Date(project.start_date), "MMM d, yyyy")}
                    </span>
                    <span className="mx-1 text-muted-foreground">-</span>
                    <span className="whitespace-nowrap">
                      {format(new Date(project.end_date), "MMM d, yyyy")}
                    </span>
                  </TableCell>
                  <TableCell className="text-[10px] py-2.5 px-3 font-medium">
                    {project.gad_score}
                  </TableCell>
                  <TableCell className="py-2.5 px-3">
                    <div className="flex flex-wrap gap-1">
                      {project.sdg_goals.slice(0, 1).map((sdg) => (
                        <Badge key={sdg} variant="outline" className="text-[9px] px-1.5 py-0 leading-none h-4 bg-[#159E44]/5 text-[#159E44] border-[#159E44]/20">
                          {sdg}
                        </Badge>
                      ))}
                      {project.sdg_goals.length > 1 && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 leading-none h-4">
                          +{project.sdg_goals.length - 1} more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5 px-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => setViewProject(project)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => setEditProject(project)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                        onClick={() => setDeleteId(project.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-xs text-muted-foreground">
                  No matches found for "{searchTerm}"
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 pt-1">
          <p className="text-[10px] text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredProjects.length)} of {filteredProjects.length} projects
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 border-border/50"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span className="text-[10px] font-medium px-2">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 border-border/50"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* View Modal */}
      <Dialog open={!!viewProject} onOpenChange={(open) => !open && setViewProject(null)}>
        <DialogContent className="sm:max-w-[800px] p-6 max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-semibold">Project Details</DialogTitle>
            <DialogDescription className="text-[10px]">
              Viewing complete information for {viewProject?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {viewProject && <ProjectForm project={viewProject} isViewOnly onSuccess={() => setViewProject(null)} />}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editProject} onOpenChange={(open) => !open && setEditProject(null)}>
        <DialogContent className="sm:max-w-[800px] p-6 max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-semibold">Edit Project</DialogTitle>
            <DialogDescription className="text-[10px]">
              Modify project information below.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {editProject && (
              <ProjectForm 
                project={editProject} 
                onSuccess={() => {
                  setEditProject(null);
                  router.refresh();
                }} 
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader className="flex flex-col items-center justify-center pt-4">
            <div className="rounded-full bg-destructive/10 p-3 mb-4">
              <AlertTriangle className="h-10 w-10 text-destructive" />
            </div>
            <DialogTitle className="text-lg font-semibold text-center">Delete Project?</DialogTitle>
            <DialogDescription className="text-xs text-center">
              This action cannot be undone. This will permanently delete the project data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center gap-2">
            <Button 
              variant="outline"
              onClick={() => setDeleteId(null)}
              className="h-9 text-xs"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              className="h-9 text-xs px-8"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
