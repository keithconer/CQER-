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
import { format } from "date-fns";
import {
  Eye,
  Pencil,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteProject } from "@/lib/actions/projects";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProjectForm } from "./project-form";
import { useRouter } from "next/navigation";

export interface Project {
  id: string;
  created_by?: string | null;
  created_by_user_type?: "super_admin" | "college_coordinator" | "unit_coordinator" | null;
  created_by_unit?: string | null;
  entry_type?: "project" | "project_proposal" | null;
  project_no?: string | null;
  moa_no?: string | null;
  collaborating_agencies?: string | null;
  funding_data?: Record<string, unknown> | null;
  contact_person?: string | null;
  contact_details?: string | null;
  title: string;
  classification: string[];
  academic_program: string;
  start_date: string | null;
  end_date: string | null;
  proponents: { name: string }[];
  co_project_leaders: { name: string }[];
  category: "new" | "existing" | "on process" | "existing/ongoing" | "completed" | "terminated" | "proposal" | null;
  funding_source: "internally funded" | "externally funded" | null;
  lead_units?: string[];
  related_curricular_offerings?: string[];
  visibility_scope?: "public" | "specific_units" | null;
  visible_units?: string[];
  budget_total: number | null;
  budget_requirements: { name: string; amount: number }[];
  gad_score: number;
  sdg_goals: string[];
  target_beneficiaries: string[];
  documents: { url: string; name: string }[];
}

interface ProjectsTableProps {
  projects: Project[];
  readOnly?: boolean;
  currentUserId?: string;
  searchTerm?: string;
  onSearchTermChange?: (value: string) => void;
  showSearch?: boolean;
  paginationAlign?: "between" | "right";
  allowViewOnlyAction?: boolean;
  formContext?: {
    userType?: "super_admin" | "college_coordinator" | "unit_coordinator";
    department?: string | null;
    unit?: string | null;
    unitOptions?: string[];
  };
}

export function ProjectsTable({
  projects,
  readOnly = false,
  currentUserId,
  searchTerm: controlledSearchTerm,
  onSearchTermChange,
  showSearch = true,
  paginationAlign = "between",
  allowViewOnlyAction = false,
  formContext,
}: ProjectsTableProps) {
  const recordLabel = "Project";
  const recordLabelPlural = "projects";

  const [internalSearchTerm, setInternalSearchTerm] = React.useState("");
  const searchTerm = controlledSearchTerm ?? internalSearchTerm;
  const setSearchTerm = onSearchTermChange ?? setInternalSearchTerm;
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 5;
  const showActionsColumn = !readOnly || allowViewOnlyAction;

  const filteredProjects = React.useMemo(() => {
    return projects.filter((project) =>
      [
        project.project_no || "",
        project.moa_no || "",
        project.title,
        project.academic_program,
        (project.proponents || []).map((person) => person?.name || "").join(", "),
        (project.co_project_leaders || []).map((person) => person?.name || "").join(", "),
        project.category || "",
        project.funding_source || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
  }, [projects, searchTerm]);

  const formatProjectLeaders = (proponents: Project["proponents"]) => {
    if (!Array.isArray(proponents) || proponents.length === 0) return "-";
    const names = proponents
      .map((item) => item?.name?.trim())
      .filter(Boolean) as string[];
    return names.length > 0 ? names.join(", ") : "-";
  };

  const formatDurationYears = (startDate?: string | null, endDate?: string | null) => {
    if (!startDate || !endDate) return "-";
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "-";
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();
    return startYear === endYear ? String(startYear) : `${startYear}-${endYear}`;
  };

  const toTitleCase = (value?: string | null) =>
    (value || "")
      .split(" ")
      .map((word) => (word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : ""))
      .join(" ");

  const formatCoProjectLeaders = (leaders: Project["co_project_leaders"]) => {
    if (!Array.isArray(leaders) || leaders.length === 0) return "-";
    const names = leaders
      .map((item) => item?.name?.trim())
      .filter(Boolean) as string[];
    return names.length > 0 ? names.join(", ") : "-";
  };

  const getBudgetTotal = (project: Project) => {
    if (typeof project.budget_total === "number") return project.budget_total;
    if (!Array.isArray(project.budget_requirements)) return 0;
    return project.budget_requirements.reduce((sum, item) => sum + (Number(item?.amount) || 0), 0);
  };

  const formatBudgetTotal = (value: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProjects = filteredProjects.slice(startIndex, startIndex + itemsPerPage);

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
    } catch {
      alert("Something went wrong");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = async (url: string) => {
    if (!url) return;

    const supabase = createClient();
    const { data: dataResponse, error } = await supabase.storage
      .from("cqer-projects_pdfs")
      .createSignedUrl(url, 60);

    if (error) {
      console.error("Error creating signed URL:", error);
      alert("Error fetching document link.");
      return;
    }

    if (dataResponse?.signedUrl) {
      window.open(dataResponse.signedUrl, "_blank");
    }
  };

  if (!projects || projects.length === 0) {
    return (
      <div className="text-center py-8 border border-dashed rounded-lg bg-muted/20">
        <p className="text-xs text-muted-foreground">No {recordLabelPlural} found. Create one to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showSearch && (
        <div className="flex items-center justify-end gap-2">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="h-8 border-border/50 bg-muted/20 pl-8 text-xs placeholder:text-[10px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="rounded-md border border-border/50 overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent border-border/50">
              <TableHead className="text-[10px] font-semibold h-9">{recordLabel} Title</TableHead>
              <TableHead className="text-[10px] font-semibold h-9">Project Leader</TableHead>
              <TableHead className="text-[10px] font-semibold h-9">Co-Project Leaders</TableHead>
              <TableHead className="text-[10px] font-semibold h-9">Program</TableHead>
              <TableHead className="text-[10px] font-semibold h-9">Duration (Year)</TableHead>
              <TableHead className="text-[10px] font-semibold h-9">Period (Date)</TableHead>
              <TableHead className="text-[10px] font-semibold h-9">Category</TableHead>
              <TableHead className="text-[10px] font-semibold h-9">Funding</TableHead>
              <TableHead className="text-[10px] font-semibold h-9">Budget Total</TableHead>
              {showActionsColumn && (
                <TableHead className="text-[10px] font-semibold h-9 text-right">Actions</TableHead>
              )}
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
                      <span
                        className="text-[10px] text-muted-foreground line-clamp-1"
                        title={Array.isArray(project.classification) ? project.classification.join(", ") : String(project.classification).replace(/[\[\]"]/g, "")}
                      >
                        {Array.isArray(project.classification) ? project.classification.join(", ") : String(project.classification).replace(/[\[\]"]/g, "")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-[10px] py-2.5 px-3 max-w-[220px]">
                    <span className="line-clamp-2" title={formatProjectLeaders(project.proponents)}>
                      {formatProjectLeaders(project.proponents)}
                    </span>
                  </TableCell>
                  <TableCell className="text-[10px] py-2.5 px-3 max-w-[220px]">
                    <span className="line-clamp-2" title={formatCoProjectLeaders(project.co_project_leaders)}>
                      {formatCoProjectLeaders(project.co_project_leaders)}
                    </span>
                  </TableCell>
                  <TableCell className="text-[10px] py-2.5 px-3">{project.academic_program}</TableCell>
                  <TableCell className="text-[10px] py-2.5 px-3">{formatDurationYears(project.start_date, project.end_date)}</TableCell>
                  <TableCell className="text-[10px] py-2.5 px-3">
                    {project.start_date && project.end_date ? (
                      <>
                        <span className="whitespace-nowrap">{format(new Date(project.start_date), "MMM d, yyyy")}</span>
                        <span className="mx-1 text-muted-foreground">-</span>
                        <span className="whitespace-nowrap">{format(new Date(project.end_date), "MMM d, yyyy")}</span>
                      </>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-[10px] py-2.5 px-3">{project.category ? toTitleCase(project.category) : "-"}</TableCell>
                  <TableCell className="text-[10px] py-2.5 px-3">{project.funding_source || "-"}</TableCell>
                  <TableCell className="text-[10px] py-2.5 px-3 font-medium whitespace-nowrap">
                    {formatBudgetTotal(getBudgetTotal(project))}
                  </TableCell>
                  {showActionsColumn && (
                    <TableCell className="py-2.5 px-3 text-right">
                      <div className="flex justify-end gap-1">
                        {project.documents && project.documents.length > 0 && (
                          project.documents.length === 1 ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-primary hover:text-primary/80 hover:bg-primary/10"
                              onClick={() => handleDownload(project.documents[0].url)}
                              title={project.documents[0].name}
                            >
                              <FileText className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-primary hover:text-primary/80 hover:bg-primary/10"
                                  title={`${project.documents.length} document(s)`}
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56">
                                <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                  Select Document
                                </div>
                                {project.documents.map((doc, idx) => (
                                  <DropdownMenuItem
                                    key={idx}
                                    onClick={() => handleDownload(doc.url)}
                                    className="text-xs py-2 cursor-pointer"
                                  >
                                    <FileText className="h-3 w-3 mr-2 text-primary" />
                                    <span className="truncate">{doc.name}</span>
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => setViewProject(project)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {!readOnly && (!currentUserId || project.created_by === currentUserId) && (
                          <>
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
                          </>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={showActionsColumn ? 10 : 9} className="h-24 text-center text-xs text-muted-foreground">
                  No matches found for &quot;{searchTerm}&quot;
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className={`flex items-center px-2 pt-1 ${paginationAlign === "right" ? "justify-end" : "justify-between"}`}>
          {paginationAlign === "between" && (
            <p className="text-[10px] text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredProjects.length)} of {filteredProjects.length} {recordLabelPlural}
            </p>
          )}
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
            <span className="text-[10px] font-medium px-2">Page {currentPage} of {totalPages}</span>
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

      <Dialog open={!!viewProject} onOpenChange={(open) => !open && setViewProject(null)}>
        <DialogContent className="sm:max-w-[920px] p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-semibold">{recordLabel} Details</DialogTitle>
            <DialogDescription className="text-[10px]">Viewing complete information for {viewProject?.title}</DialogDescription>
          </DialogHeader>
          {viewProject && (
            <ProjectForm
              project={viewProject}
              isViewOnly
              onSuccess={() => setViewProject(null)}
              currentUserType={formContext?.userType}
              currentDepartment={formContext?.department}
              currentUnit={formContext?.unit}
              unitOptions={formContext?.unitOptions}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editProject} onOpenChange={(open) => !open && setEditProject(null)}>
        <DialogContent className="sm:max-w-[920px] p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-semibold">Edit {recordLabel}</DialogTitle>
            <DialogDescription className="text-[10px]">Modify {recordLabel.toLowerCase()} information below.</DialogDescription>
          </DialogHeader>
          {editProject && (
            <ProjectForm
              project={editProject}
              currentUserType={formContext?.userType}
              currentDepartment={formContext?.department}
              currentUnit={formContext?.unit}
              unitOptions={formContext?.unitOptions}
              onSuccess={() => {
                setEditProject(null);
                router.refresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader className="items-center text-center">
            <div className="rounded-full bg-destructive/10 p-2">
              <AlertTriangle className="h-7 w-7 text-destructive" />
            </div>
            <DialogTitle className="text-sm">Delete {recordLabel}?</DialogTitle>
            <DialogDescription className="text-[10px]">
              This action cannot be undone. This will permanently delete the {recordLabel.toLowerCase()} data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)} className="h-8 text-[10px]">
              Cancel
            </Button>
            <Button variant="destructive" className="h-8 text-[10px] px-6" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
