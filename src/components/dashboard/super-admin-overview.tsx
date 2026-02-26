"use client";

import * as React from "react";
import { Search, ChevronLeft, ChevronRight, Eye, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { deleteProject } from "@/lib/actions/projects";
import { ProjectForm } from "./project-form";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type RoleType = "super_admin" | "college_coordinator" | "unit_coordinator";

interface RegisteredAccount {
  id: string;
  first_name: string | null;
  last_name: string | null;
  user_type: RoleType;
  department: string | null;
  unit: string | null;
}

interface ExistingProject {
  id: string;
  entry_type?: "project" | "program" | null;
  title: string;
  classification?: string[] | null;
  sdg_goals?: string[] | null;
  academic_program: string | null;
  major?: string | null;
  proponents?: { name: string }[] | null;
  co_project_leaders?: { name: string }[] | null;
  college?: string | null;
  collaborating_agencies?: string | null;
  target_beneficiaries?: string[] | null;
  community_location?: string | null;
  start_date: string | null;
  end_date: string | null;
  category: "new" | "existing" | "on process" | null;
  funding_source: "internally funded" | "externally funded" | null;
  visibility_scope?: "public" | "specific_units" | null;
  visible_units?: string[] | null;
  lead_units?: string[] | null;
  related_curricular_offerings?: string[] | null;
  budget_total: number | null;
  budget_requirements: { name: string; amount: number }[] | null;
  gad_score?: number | null;
  documents?: { url: string; name: string }[] | null;
}

interface SuperAdminOverviewProps {
  accounts: RegisteredAccount[];
  projects: ExistingProject[];
  initialTab?: "accounts" | "projects" | "programs";
}

const ITEMS_PER_PAGE = 6;

function formatRole(role: RoleType) {
  if (role === "super_admin") return "Super Admin";
  if (role === "college_coordinator") return "College Coordinator";
  return "Unit Coordinator";
}

export function SuperAdminOverview({
  accounts,
  projects,
  initialTab = "projects",
}: SuperAdminOverviewProps) {
  const [activeTab, setActiveTab] = React.useState<"accounts" | "projects" | "programs">(
    initialTab
  );
  const [searchTerm, setSearchTerm] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [viewProject, setViewProject] = React.useState<ExistingProject | null>(null);
  const [editProject, setEditProject] = React.useState<ExistingProject | null>(null);
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

  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm]);

  React.useEffect(() => {
    setActiveTab(initialTab);
    setSearchTerm("");
  }, [initialTab]);

  const filteredAccounts = React.useMemo(() => {
    const term = searchTerm.toLowerCase();
    return accounts.filter((account) => {
      const fullName =
        `${account.first_name || ""} ${account.last_name || ""}`.toLowerCase();
      return (
        fullName.includes(term) ||
        formatRole(account.user_type).toLowerCase().includes(term) ||
        (account.department || "").toLowerCase().includes(term) ||
        (account.unit || "").toLowerCase().includes(term)
      );
    });
  }, [accounts, searchTerm]);

  const filteredProjects = React.useMemo(() => {
    const term = searchTerm.toLowerCase();
    return projects.filter((project) => {
      if ((project.entry_type || "project") !== "project") return false;
      return (
        project.title.toLowerCase().includes(term) ||
        (project.academic_program || "").toLowerCase().includes(term) ||
        (project.proponents || [])
          .map((person) => person?.name || "")
          .join(", ")
          .toLowerCase()
          .includes(term) ||
        (project.co_project_leaders || [])
          .map((person) => person?.name || "")
          .join(", ")
          .toLowerCase()
          .includes(term) ||
        (project.category || "").toLowerCase().includes(term) ||
        (project.funding_source || "").toLowerCase().includes(term)
      );
    });
  }, [projects, searchTerm]);

  const filteredPrograms = React.useMemo(() => {
    const term = searchTerm.toLowerCase();
    return projects.filter((project) => {
      if ((project.entry_type || "project") !== "program") return false;
      return (
        project.title.toLowerCase().includes(term) ||
        (project.academic_program || "").toLowerCase().includes(term) ||
        (project.proponents || [])
          .map((person) => person?.name || "")
          .join(", ")
          .toLowerCase()
          .includes(term) ||
        (project.co_project_leaders || [])
          .map((person) => person?.name || "")
          .join(", ")
          .toLowerCase()
          .includes(term) ||
        (project.category || "").toLowerCase().includes(term) ||
        (project.funding_source || "").toLowerCase().includes(term)
      );
    });
  }, [projects, searchTerm]);

  const formatProjectLeaders = (proponents: ExistingProject["proponents"]) => {
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

  const getBudgetTotal = (project: ExistingProject) => {
    if (typeof project.budget_total === "number") return project.budget_total;
    if (!Array.isArray(project.budget_requirements)) return 0;
    return project.budget_requirements.reduce((sum, item) => sum + (Number(item?.amount) || 0), 0);
  };

  const formatCoProjectLeaders = (leaders: ExistingProject["co_project_leaders"]) => {
    if (!Array.isArray(leaders) || leaders.length === 0) return "-";
    const names = leaders
      .map((item) => item?.name?.trim())
      .filter(Boolean) as string[];
    return names.length > 0 ? names.join(", ") : "-";
  };

  const toTitleCase = (value?: string | null) =>
    (value || "")
      .split(" ")
      .map((word) => (word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : ""))
      .join(" ");

  const formatBudgetTotal = (value: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  const activeItems =
    activeTab === "accounts"
      ? filteredAccounts
      : activeTab === "projects"
        ? filteredProjects
        : filteredPrograms;
  const totalPages = Math.max(1, Math.ceil(activeItems.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;

  const paginatedAccounts = filteredAccounts.slice(startIndex, endIndex);
  const paginatedProjects = filteredProjects.slice(startIndex, endIndex);
  const paginatedPrograms = filteredPrograms.slice(startIndex, endIndex);

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-3 pt-4 px-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-xs font-semibold">System Records</CardTitle>
            <CardDescription className="text-[10px]">
              View all registered accounts and existing projects.
            </CardDescription>
          </div>
          <div className="inline-flex rounded-md border border-border/60 p-0.5 bg-muted/20">
            <Button
              size="sm"
              onClick={() => setActiveTab("accounts")}
              className={`h-7 text-[10px] px-2.5 ${
                activeTab === "accounts"
                  ? "bg-[#159E44] hover:bg-[#128A3B] text-white"
                  : "bg-transparent text-foreground hover:bg-muted"
              }`}
            >
              Registered Accounts
            </Button>
            <Button
              size="sm"
              onClick={() => setActiveTab("projects")}
              className={`h-7 text-[10px] px-2.5 ${
                activeTab === "projects"
                  ? "bg-[#159E44] hover:bg-[#128A3B] text-white"
                  : "bg-transparent text-foreground hover:bg-muted"
              }`}
            >
              Project Tables
            </Button>
            <Button
              size="sm"
              onClick={() => setActiveTab("programs")}
              className={`h-7 text-[10px] px-2.5 ${
                activeTab === "programs"
                  ? "bg-[#159E44] hover:bg-[#128A3B] text-white"
                  : "bg-transparent text-foreground hover:bg-muted"
              }`}
            >
              Program Tables
            </Button>
          </div>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={
              activeTab === "accounts"
                ? "Search accounts..."
                : "Search..."
            }
            className="pl-8 h-8 text-xs placeholder:text-[10px] bg-muted/20 border-border/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-3">
        <div className="rounded-md border border-border/50 overflow-hidden">
          {activeTab === "accounts" ? (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="text-[10px] font-semibold h-9">First Name</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Last Name</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">User Type</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Department</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Unit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedAccounts.length > 0 ? (
                  paginatedAccounts.map((account) => (
                    <TableRow key={account.id} className="hover:bg-muted/10 border-border/30">
                      <TableCell className="text-[10px] py-2.5 px-3 font-medium">
                        {account.first_name || "-"}
                      </TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">
                        {account.last_name || "-"}
                      </TableCell>
                      <TableCell className="py-2.5 px-3">
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1.5 py-0 h-4 border-[#159E44]/25 text-[#159E44] bg-[#159E44]/5"
                        >
                          {formatRole(account.user_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">
                        {account.department || "-"}
                      </TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">
                        {account.unit || "-"}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-xs text-muted-foreground">
                      No accounts found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          ) : activeTab === "projects" ? (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="text-[10px] font-semibold h-9">Project Title</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Project Leader</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Co-Project Leaders</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Program</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Duration (Year)</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Period (Date)</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Category</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Funding</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Budget Total</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProjects.length > 0 ? (
                  paginatedProjects.map((project) => (
                    <TableRow key={project.id} className="hover:bg-muted/10 border-border/30">
                      <TableCell className="text-[10px] py-2.5 px-3 font-medium max-w-[260px] truncate" title={project.title}>
                        {project.title}
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
                      <TableCell className="text-[10px] py-2.5 px-3">
                        {project.academic_program || "-"}
                      </TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">
                        {formatDurationYears(project.start_date, project.end_date)}
                      </TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">
                        {project.start_date && project.end_date
                          ? `${format(new Date(project.start_date), "MMM d, yyyy")} - ${format(new Date(project.end_date), "MMM d, yyyy")}`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">
                        {project.category ? toTitleCase(project.category) : "-"}
                      </TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">
                        {project.funding_source || "-"}
                      </TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3 font-medium whitespace-nowrap">
                        {formatBudgetTotal(getBudgetTotal(project))}
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
                    <TableCell colSpan={10} className="h-24 text-center text-xs text-muted-foreground">
                      No projects found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="text-[10px] font-semibold h-9">Program Title</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Project Leader</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Co-Project Leaders</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Program</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Duration (Year)</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Period (Date)</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Category</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Funding</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Budget Total</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPrograms.length > 0 ? (
                  paginatedPrograms.map((program) => (
                    <TableRow key={program.id} className="hover:bg-muted/10 border-border/30">
                      <TableCell className="text-[10px] py-2.5 px-3 font-medium max-w-[260px] truncate" title={program.title}>
                        {program.title}
                      </TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3 max-w-[220px]">
                        <span className="line-clamp-2" title={formatProjectLeaders(program.proponents)}>
                          {formatProjectLeaders(program.proponents)}
                        </span>
                      </TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3 max-w-[220px]">
                        <span className="line-clamp-2" title={formatCoProjectLeaders(program.co_project_leaders)}>
                          {formatCoProjectLeaders(program.co_project_leaders)}
                        </span>
                      </TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">
                        {program.academic_program || "-"}
                      </TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">
                        {formatDurationYears(program.start_date, program.end_date)}
                      </TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">
                        {program.start_date && program.end_date
                          ? `${format(new Date(program.start_date), "MMM d, yyyy")} - ${format(new Date(program.end_date), "MMM d, yyyy")}`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">
                        {program.category ? toTitleCase(program.category) : "-"}
                      </TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">
                        {program.funding_source || "-"}
                      </TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3 font-medium whitespace-nowrap">
                        {formatBudgetTotal(getBudgetTotal(program))}
                      </TableCell>
                      <TableCell className="py-2.5 px-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => setViewProject(program)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => setEditProject(program)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                            onClick={() => setDeleteId(program.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center text-xs text-muted-foreground">
                      No programs found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>

        {activeItems.length > 0 && (
          <div className="flex items-center justify-between px-2 pt-1">
            <p className="text-[10px] text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(endIndex, activeItems.length)} of{" "}
              {activeItems.length} {activeTab === "accounts" ? "records" : activeTab === "projects" ? "projects" : "programs"}
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
      </CardContent>

      <Dialog open={!!viewProject} onOpenChange={(open) => !open && setViewProject(null)}>
        <DialogContent className="sm:max-w-[800px] p-6 max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-semibold">
              {(viewProject?.entry_type || "project") === "program" ? "Program" : "Project"} Details
            </DialogTitle>
            <DialogDescription className="text-[10px]">
              Viewing complete information for {viewProject?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {viewProject && (
              <ProjectForm
                project={viewProject}
                mode={(viewProject.entry_type || "project") as "project" | "program"}
                isViewOnly
                currentUserType="super_admin"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editProject} onOpenChange={(open) => !open && setEditProject(null)}>
        <DialogContent className="sm:max-w-[800px] p-6 max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-semibold">
              Edit {(editProject?.entry_type || "project") === "program" ? "Program" : "Project"}
            </DialogTitle>
            <DialogDescription className="text-[10px]">
              Modify record information below.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {editProject && (
              <ProjectForm
                project={editProject}
                mode={(editProject.entry_type || "project") as "project" | "program"}
                currentUserType="super_admin"
                onSuccess={() => {
                  setEditProject(null);
                  router.refresh();
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader className="flex flex-col items-center justify-center pt-4">
            <div className="rounded-full bg-destructive/10 p-3 mb-4">
              <AlertTriangle className="h-10 w-10 text-destructive" />
            </div>
            <DialogTitle className="text-lg font-semibold text-center">Delete record?</DialogTitle>
            <DialogDescription className="text-xs text-center">
              This action cannot be undone. This will permanently delete the selected record.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)} className="h-9 text-xs">
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
    </Card>
  );
}
