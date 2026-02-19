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
  if (!projects || projects.length === 0) {
    return (
      <div className="text-center py-8 border border-dashed rounded-lg bg-muted/20">
        <p className="text-xs text-muted-foreground">No projects found. Create one to get started.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border/50 overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-[10px] font-semibold h-9">Project Title</TableHead>
            <TableHead className="text-[10px] font-semibold h-9">Program</TableHead>
            <TableHead className="text-[10px] font-semibold h-9">Period</TableHead>
            <TableHead className="text-[10px] font-semibold h-9">GAD Score</TableHead>
            <TableHead className="text-[10px] font-semibold h-9">SDGs</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => (
            <TableRow key={project.id} className="hover:bg-muted/10 border-border/30">
              <TableCell className="py-2.5 px-3">
                <div className="flex flex-col">
                  <span className="text-xs font-medium">{project.title}</span>
                  <span className="text-[10px] text-muted-foreground">{project.classification}</span>
                </div>
              </TableCell>
              <TableCell className="text-[10px] py-2.5 px-3">
                {project.academic_program}
              </TableCell>
              <TableCell className="text-[10px] py-2.5 px-3">
                {format(new Date(project.start_date), "MMM d, yyyy")} - {format(new Date(project.end_date), "MMM d, yyyy")}
              </TableCell>
              <TableCell className="text-[10px] py-2.5 px-3 font-medium">
                {project.gad_score}
              </TableCell>
              <TableCell className="py-2.5 px-3">
                <div className="flex flex-wrap gap-1">
                  {project.sdg_goals.slice(0, 2).map((sdg) => (
                    <Badge key={sdg} variant="outline" className="text-[9px] px-1.5 py-0 leading-none h-4 bg-[#159E44]/5 text-[#159E44] border-[#159E44]/20">
                      {sdg}
                    </Badge>
                  ))}
                  {project.sdg_goals.length > 2 && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 leading-none h-4">
                      +{project.sdg_goals.length - 2} more
                    </Badge>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
