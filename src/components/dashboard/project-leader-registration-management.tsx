"use client";

import * as React from "react";
import { Eye, FileDown, Pencil, Plus, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

import { ProjectLeaderRegistrationForm } from "@/components/dashboard/project-leader-registration-form";
import { RecordPagination, useRecordPagination } from "@/components/dashboard/record-pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type Project } from "@/components/dashboard/projects-table";
import { DocumentPreview } from "@/components/dashboard/document-preview";
import { ProjectDeleteDialog } from "@/components/dashboard/project-delete-dialog";
import { Badge } from "@/components/ui/badge";
import { formatPhpCurrency } from "@/lib/currency";
import { getProjectLifecycleStatus } from "@/lib/project-status";

interface ProjectLeaderRegistrationManagementProps {
  projects: Project[];
  currentUserId: string;
  currentUserName: string;
  department?: string | null;
  unit?: string | null;
}

type FilterMode = "all" | "with_documents" | "this_year";

function getRegistrationData(project: Project) {
  const source = project.funding_data;
  if (!source || typeof source !== "object") return null;
  const registration = (source as Record<string, unknown>).registration_data;
  return registration && typeof registration === "object"
    ? (registration as Record<string, unknown>)
    : null;
}

function getDateRange(project: Project) {
  if (!project.start_date || !project.end_date) return "-";
  return `${format(new Date(project.start_date), "MMM d, yyyy")} - ${format(new Date(project.end_date), "MMM d, yyyy")}`;
}

function getDuration(project: Project) {
  const registration = getRegistrationData(project);
  return String(registration?.duration || "-");
}

function getDepartmentUnit(project: Project) {
  const registration = getRegistrationData(project);
  return String(registration?.department_unit || project.academic_program || "-");
}

function getBeneficiaries(project: Project) {
  const registration = getRegistrationData(project);
  return String(
    registration?.target_beneficiaries ||
      (Array.isArray(project.target_beneficiaries) ? project.target_beneficiaries.join(", ") : "-")
  );
}

function getBudget(project: Project) {
  if (typeof project.budget_total === "number") return project.budget_total;
  if (!Array.isArray(project.budget_requirements)) return 0;
  return project.budget_requirements.reduce((sum, item) => sum + Number(item?.amount || 0), 0);
}

function getStatus(project: Project) {
  return getProjectLifecycleStatus(project as Project & { created_at?: string | null });
}

async function exportExcel(projects: Project[]) {
  const ExcelJSImport = await import("exceljs/dist/exceljs.min.js");
  const ExcelJS = ExcelJSImport?.default ?? ExcelJSImport;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Project Registration");
  const columns = [
    { header: "Project Title", key: "title", width: 40 },
    { header: "Department / Unit", key: "departmentUnit", width: 28 },
    { header: "Project Dates", key: "inclusiveDates", width: 28 },
    { header: "Duration", key: "duration", width: 16 },
    { header: "Status", key: "status", width: 14 },
    { header: "Target Beneficiaries", key: "beneficiaries", width: 24 },
    { header: "Budget Total", key: "budget", width: 18 },
    { header: "Partner Agencies", key: "partners", width: 34 },
  ];
  sheet.columns = columns.map((column) => ({ key: column.key, width: column.width }));
  sheet.mergeCells("A1:H1");
  sheet.getCell("A1").value = "Project Registration";
  sheet.getCell("A1").font = { bold: true, size: 14 };
  sheet.getCell("A1").alignment = { horizontal: "center" };
  sheet.getRow(2).values = columns.map((column) => column.header);
  sheet.getRow(2).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF159E44" } };
  });
  projects.forEach((project) => {
    const registration = getRegistrationData(project);
    sheet.addRow({
      title: project.title,
      departmentUnit: getDepartmentUnit(project),
      inclusiveDates: getDateRange(project),
      duration: getDuration(project),
      status: getStatus(project),
      beneficiaries: getBeneficiaries(project),
      budget: getBudget(project),
      partners: Array.isArray(registration?.partner_agencies)
        ? registration.partner_agencies.map((item) => String((item as Record<string, unknown>).name || "")).join(", ")
        : project.collaborating_agencies || "",
    });
  });
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `project-registration-${new Date().toISOString().slice(0, 10)}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function exportPdf(projects: Project[]) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFontSize(12);
  doc.text("Project Registration", doc.internal.pageSize.getWidth() / 2, 12, { align: "center" });
  autoTable(doc, {
    startY: 18,
    head: [[
      "Project Title",
      "Department / Unit",
      "Project Dates",
      "Duration",
      "Status",
      "Beneficiaries",
      "Budget",
      "Partner Agencies",
    ]],
    body: projects.map((project) => {
      const registration = getRegistrationData(project);
      return [
        project.title,
        getDepartmentUnit(project),
        getDateRange(project),
        getDuration(project),
        getStatus(project),
        getBeneficiaries(project),
        formatPhpCurrency(getBudget(project)),
        Array.isArray(registration?.partner_agencies)
          ? registration.partner_agencies.map((item) => String((item as Record<string, unknown>).name || "")).join(", ")
          : project.collaborating_agencies || "",
      ];
    }),
    theme: "grid",
    headStyles: { fillColor: [21, 158, 68], textColor: [255, 255, 255], fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" },
  });
  doc.save(`project-registration-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function ProjectLeaderRegistrationManagement({
  projects,
  currentUserId,
  currentUserName,
  department,
  unit,
}: ProjectLeaderRegistrationManagementProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [filterMode, setFilterMode] = React.useState<FilterMode>("all");
  const [selectedProject, setSelectedProject] = React.useState<Project | null>(null);
  const [editingProject, setEditingProject] = React.useState<Project | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [successOpen, setSuccessOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Project | null>(null);

  const filteredProjects = React.useMemo(() => {
    const year = new Date().getFullYear();
    return projects.filter((project) => {
      const registration = getRegistrationData(project);
      const haystack = [
        project.title,
        getDepartmentUnit(project),
        getDateRange(project),
        getDuration(project),
        getStatus(project),
        getBeneficiaries(project),
        formatPhpCurrency(getBudget(project)),
        project.collaborating_agencies || "",
        Array.isArray(registration?.extension_agenda) ? registration.extension_agenda.join(" ") : "",
      ]
        .join(" ")
        .toLowerCase();
      if (searchTerm && !haystack.includes(searchTerm.toLowerCase())) return false;
      if (filterMode === "with_documents" && (!project.documents || project.documents.length === 0)) return false;
      if (filterMode === "this_year") {
        const startYear = project.start_date ? new Date(project.start_date).getFullYear() : null;
        if (startYear !== year) return false;
      }
      return true;
    });
  }, [projects, searchTerm, filterMode]);
  const {
    currentPage,
    paginatedItems: paginatedProjects,
    resetPagination,
    setCurrentPage,
    startIndex,
    totalPages,
  } = useRecordPagination(filteredProjects);

  React.useEffect(() => {
    resetPagination();
  }, [filterMode, resetPagination, searchTerm]);

  const handleSaved = () => {
    setCreateOpen(false);
    setEditingProject(null);
    setSelectedProject(null);
    setSuccessOpen(true);
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="space-y-4 pb-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle className="text-xl font-semibold">Project Registration</CardTitle>
              <CardDescription className="text-sm">
                Register, review, export, and manage your project registrations in one place.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="rounded-xl">
                    <FileDown className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => void exportExcel(filteredProjects)}>Export Excel</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void exportPdf(filteredProjects)}>Export PDF</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button className="rounded-xl bg-[#159E44] text-white hover:bg-[#128A3B]" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Register Project
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full max-w-xl">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search project title, department, partner, or beneficiaries..."
                className="h-11 rounded-xl pl-10 text-sm"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-xl">
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  Results Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Show</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem checked={filterMode === "all"} onCheckedChange={() => setFilterMode("all")}>
                  All projects
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={filterMode === "with_documents"} onCheckedChange={() => setFilterMode("with_documents")}>
                  With documents only
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={filterMode === "this_year"} onCheckedChange={() => setFilterMode("this_year")}>
                  This year only
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-2xl border border-border/60">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-12 text-base font-semibold">Project Title</TableHead>
                  <TableHead className="h-12 text-base font-semibold">Department / Unit</TableHead>
                  <TableHead className="h-12 text-base font-semibold">Beneficiaries</TableHead>
                  <TableHead className="h-12 text-base font-semibold">Project Dates</TableHead>
                  <TableHead className="h-12 text-base font-semibold">Duration</TableHead>
                  <TableHead className="h-12 text-base font-semibold">Status</TableHead>
                  <TableHead className="h-12 text-base font-semibold">Budget Total</TableHead>
                  <TableHead className="h-12 text-base font-semibold">Documents</TableHead>
                  <TableHead className="h-12 text-right text-base font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.length > 0 ? (
                  paginatedProjects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="py-4 text-base font-medium">{project.title}</TableCell>
                      <TableCell className="py-4 text-base">{getDepartmentUnit(project)}</TableCell>
                      <TableCell className="py-4 text-base">{getBeneficiaries(project)}</TableCell>
                      <TableCell className="py-4 text-base">{getDateRange(project)}</TableCell>
                      <TableCell className="py-4 text-base">{getDuration(project)}</TableCell>
                      <TableCell className="py-4 text-base">
                        <Badge variant="outline">{getStatus(project)}</Badge>
                      </TableCell>
                      <TableCell className="py-4 text-base font-medium">
                        {formatPhpCurrency(getBudget(project))}
                      </TableCell>
                      <TableCell className="py-4 text-sm"><DocumentPreview documents={project.documents} /></TableCell>
                      <TableCell className="py-4">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl" onClick={() => setSelectedProject(project)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl" onClick={() => setEditingProject(project)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl text-destructive" onClick={() => setDeleteTarget(project)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="h-28 text-center text-base text-muted-foreground">
                      No project registrations match the current search or filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <RecordPagination
            currentPage={currentPage}
            totalPages={totalPages}
            startIndex={startIndex}
            totalItems={filteredProjects.length}
            itemLabel="project registrations"
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent showCloseButton={false} className="flex flex-col overflow-hidden fixed inset-0 left-0 top-0 h-[100dvh] w-screen max-w-none sm:max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 shadow-none">
          <ProjectLeaderRegistrationForm
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            currentDepartment={department}
            currentUnit={unit}
            onSuccess={handleSaved}
            onClose={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedProject} onOpenChange={(open) => !open && setSelectedProject(null)}>
        <DialogContent showCloseButton={false} className="flex flex-col overflow-hidden fixed inset-0 left-0 top-0 h-[100dvh] w-screen max-w-none sm:max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 shadow-none">
          {selectedProject && (
            <ProjectLeaderRegistrationForm
              project={selectedProject}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              currentDepartment={department}
              currentUnit={unit}
              onSuccess={() => setSelectedProject(null)}
              onClose={() => setSelectedProject(null)}
              isViewOnly
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingProject} onOpenChange={(open) => !open && setEditingProject(null)}>
        <DialogContent showCloseButton={false} className="flex flex-col overflow-hidden fixed inset-0 left-0 top-0 h-[100dvh] w-screen max-w-none sm:max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 shadow-none">
          {editingProject && (
            <ProjectLeaderRegistrationForm
              project={editingProject}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              currentDepartment={department}
              currentUnit={unit}
              onSuccess={handleSaved}
              onClose={() => setEditingProject(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>Project registration saved</DialogTitle>
            <DialogDescription>
              The project registration was saved successfully and the table has been refreshed.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <ProjectDeleteDialog
        projectId={deleteTarget?.id || null}
        projectTitle={deleteTarget?.title}
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onDeleted={() => {
          setDeleteTarget(null);
          router.refresh();
        }}
      />
    </div>
  );
}
