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
import { Eye, Pencil, Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Project {
  id: string;
  title: string;
  classification: string;
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
                      <span className="text-[10px] text-muted-foreground">{project.classification}</span>
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
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive/80 hover:bg-destructive/10">
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
    </div>
  );
}
