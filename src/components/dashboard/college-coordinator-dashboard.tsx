"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  BookOpenCheck,
  Download,
  Filter,
  FolderKanban,
  PiggyBank,
  Users2,
  Wallet,
} from "lucide-react";

import { type Project } from "@/components/dashboard/projects-table";
import { type TrainingRecord } from "@/components/dashboard/trainings-form";
import { FacultyRegistryManagement } from "@/components/dashboard/faculty-registry-management";
import { RecordPagination, useRecordPagination } from "@/components/dashboard/record-pagination";
import { type FacultyRegistryRecord } from "@/lib/actions/faculty-registry";
import { getProjectBudgetSnapshot, getProjectOverallBudget } from "@/lib/project-budget";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ProjectBudgetRow = {
  id: string;
  title: string;
  totalBudget: number;
  utilizedBudget: number;
  remainingBudget: number;
};

type ProjectCreatorRole = "all" | "college_coordinator" | "unit_coordinator" | "project_leader" | "super_admin";
type ParticipantFilter = "all" | "up_to_25" | "26_to_50" | "51_to_100" | "101_plus";
type WeightedDaysFilter = "all" | "up_to_1" | "1_to_5" | "above_5";

interface CollegeCoordinatorDashboardProps {
  department: string;
  projects: Project[];
  trainings: TrainingRecord[];
  facultyRecords: FacultyRegistryRecord[];
}

function currency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "-" : format(parsed, "MMM d, yyyy");
}

function formatProjectDuration(project: Project) {
  if (!project.start_date || !project.end_date) return "-";
  return `${formatDate(project.start_date)} - ${formatDate(project.end_date)}`;
}

function getProjectBudget(project: Project) {
  return getProjectOverallBudget(project);
}

function getProjectLeaderNames(project: Project) {
  const leaders = Array.isArray(project.proponents)
    ? project.proponents.map((item) => item?.name?.trim()).filter(Boolean)
    : [];
  return leaders.length > 0 ? leaders.join(", ") : "-";
}

function getCreatorLabel(project: Project) {
  const role = (project.created_by_user_type || "").replace(/_/g, " ");
  const roleLabel = role
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  return {
    name: project.creator_full_name || "Unknown user",
    role: roleLabel || "Unknown role",
    unit: project.created_by_unit || "-",
    department:
      project.created_by_department ||
      (Array.isArray(project.lead_units) && project.lead_units.length > 0 ? project.lead_units[0] : null) ||
      "-",
  };
}

function getTrainingDate(record: TrainingRecord) {
  if (record.conducted_sessions?.length) {
    return (record as TrainingRecord & { created_at?: string | null }).created_at || null;
  }
  const sortedDates = [...(record.inclusive_dates || [])].sort();
  if (sortedDates.length > 0) return sortedDates[0];
  return null;
}

function getTrainingSchedule(record: TrainingRecord) {
  if (record.conducted_sessions?.length) {
    const totalHours = record.conducted_sessions.reduce((sum, session) => sum + Number(session.hours || 0), 0);
    return `${record.conducted_sessions.length} date(s) / ${totalHours} hour/s`;
  }
  if (record.date_mode === "hours") {
    return `${record.manual_hours || 0} hour/s`;
  }
  const sortedDates = [...(record.inclusive_dates || [])].sort();
  if (sortedDates.length === 0) return "-";
  const start = sortedDates[0];
  const end = sortedDates[sortedDates.length - 1];
  return start === end ? formatDate(start) : `${formatDate(start)} - ${formatDate(end)}`;
}

function getTrainingCreator(record: TrainingRecord) {
  return record.creator_full_name || "Unknown user";
}

function isActiveProject(project: Project) {
  const category = (project.category || "").toLowerCase();
  return category !== "completed" && category !== "terminated";
}

function matchesParticipantFilter(record: TrainingRecord, filter: ParticipantFilter) {
  const participants = Number(record.participants_overall_total || 0);
  if (filter === "up_to_25") return participants <= 25;
  if (filter === "26_to_50") return participants >= 26 && participants <= 50;
  if (filter === "51_to_100") return participants >= 51 && participants <= 100;
  if (filter === "101_plus") return participants >= 101;
  return true;
}

function matchesWeightedDaysFilter(record: TrainingRecord, filter: WeightedDaysFilter) {
  const weightedDays = Number(record.weighted_days_trained || 0);
  if (filter === "up_to_1") return weightedDays <= 1;
  if (filter === "1_to_5") return weightedDays > 1 && weightedDays <= 5;
  if (filter === "above_5") return weightedDays > 5;
  return true;
}

async function exportProjectsExcel(records: Project[]) {
  const ExcelJSImport = await import("exceljs/dist/exceljs.min.js");
  const ExcelJS = ExcelJSImport?.default ?? ExcelJSImport;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Projects");
  const columns = [
    { header: "Project Name", key: "title", width: 36 },
    { header: "Duration", key: "duration", width: 28 },
    { header: "Project Leader", key: "leader", width: 26 },
    { header: "Total Budget", key: "budget", width: 18 },
    { header: "Created By", key: "creator", width: 24 },
    { header: "Creator Role", key: "role", width: 18 },
    { header: "Unit / Department", key: "scope", width: 30 },
  ];
  sheet.columns = columns.map((column) => ({ key: column.key, width: column.width }));
  sheet.mergeCells("A1:G1");
  sheet.getCell("A1").value = "Active Projects Report";
  sheet.getCell("A1").font = { bold: true, size: 14 };
  sheet.getCell("A1").alignment = { horizontal: "center" };
  sheet.getRow(2).values = columns.map((column) => column.header);
  sheet.getRow(2).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF159E44" } };
  });
  records.forEach((project) => {
    const creator = getCreatorLabel(project);
    sheet.addRow({
      title: project.title || "Untitled project",
      duration: formatProjectDuration(project),
      leader: getProjectLeaderNames(project),
      budget: getProjectBudget(project),
      creator: creator.name,
      role: creator.role,
      scope: `${creator.unit} / ${creator.department}`,
    });
  });
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `college-projects-${new Date().toISOString().slice(0, 10)}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function exportProjectsPdf(records: Project[]) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFontSize(12);
  doc.text("Active Projects Report", doc.internal.pageSize.getWidth() / 2, 12, { align: "center" });
  autoTable(doc, {
    startY: 18,
    head: [[
      "Project Name",
      "Duration",
      "Project Leader",
      "Total Budget",
      "Created By",
      "Creator Role",
      "Unit / Department",
    ]],
    body: records.map((project) => {
      const creator = getCreatorLabel(project);
      return [
        project.title || "Untitled project",
        formatProjectDuration(project),
        getProjectLeaderNames(project),
        currency(getProjectBudget(project)),
        creator.name,
        creator.role,
        `${creator.unit} / ${creator.department}`,
      ];
    }),
    theme: "grid",
    headStyles: { fillColor: [21, 158, 68], textColor: [255, 255, 255], fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" },
  });
  doc.save(`college-projects-${new Date().toISOString().slice(0, 10)}.pdf`);
}

async function exportTrainingsExcel(records: TrainingRecord[]) {
  const ExcelJSImport = await import("exceljs/dist/exceljs.min.js");
  const ExcelJS = ExcelJSImport?.default ?? ExcelJSImport;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Trainings");
  const columns = [
    { header: "Training Title", key: "title", width: 34 },
    { header: "Related Project", key: "project", width: 28 },
    { header: "Schedule", key: "schedule", width: 24 },
    { header: "Participants", key: "participants", width: 16 },
    { header: "Weighted Days", key: "weightedDays", width: 16 },
    { header: "Created By", key: "creator", width: 24 },
  ];
  sheet.columns = columns.map((column) => ({ key: column.key, width: column.width }));
  sheet.mergeCells("A1:F1");
  sheet.getCell("A1").value = "Project Trainings Report";
  sheet.getCell("A1").font = { bold: true, size: 14 };
  sheet.getCell("A1").alignment = { horizontal: "center" };
  sheet.getRow(2).values = columns.map((column) => column.header);
  sheet.getRow(2).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF159E44" } };
  });
  records.forEach((record) => {
    sheet.addRow({
      title: record.training_title,
      project: record.related_project_title || "-",
      schedule: getTrainingSchedule(record),
      participants: Number(record.participants_overall_total || 0),
      weightedDays: Number(record.weighted_days_trained || 0),
      creator: getTrainingCreator(record),
    });
  });
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `college-trainings-${new Date().toISOString().slice(0, 10)}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function exportTrainingsPdf(records: TrainingRecord[]) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFontSize(12);
  doc.text("Project Trainings Report", doc.internal.pageSize.getWidth() / 2, 12, { align: "center" });
  autoTable(doc, {
    startY: 18,
    head: [[
      "Training Title",
      "Related Project",
      "Schedule",
      "Participants",
      "Weighted Days",
      "Created By",
    ]],
    body: records.map((record) => [
      record.training_title,
      record.related_project_title || "-",
      getTrainingSchedule(record),
      String(record.participants_overall_total || 0),
      String(record.weighted_days_trained || 0),
      getTrainingCreator(record),
    ]),
    theme: "grid",
    headStyles: { fillColor: [21, 158, 68], textColor: [255, 255, 255], fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" },
  });
  doc.save(`college-trainings-${new Date().toISOString().slice(0, 10)}.pdf`);
}

function OverviewCard({
  title,
  description,
  value,
  icon: Icon,
  onClick,
}: {
  title: string;
  description: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-border/50 bg-card/70 text-left shadow-sm transition hover:border-primary/30 hover:bg-muted/20"
    >
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-foreground">
              <Icon className="h-4 w-4" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
          </div>
          <p className="text-lg font-semibold leading-none text-foreground">{value}</p>
          <p className="text-[11px] leading-4 text-muted-foreground">{description}</p>
        </div>
      </div>
    </button>
  );
}

export function CollegeCoordinatorDashboard({
  department,
  projects,
  trainings,
  facultyRecords,
}: CollegeCoordinatorDashboardProps) {
  const [activeDialog, setActiveDialog] = React.useState<"projects" | "trainings" | "budget" | "utilized" | "faculty_involvement" | null>(null);
  const [projectSearch, setProjectSearch] = React.useState("");
  const [projectRoleFilter, setProjectRoleFilter] = React.useState<ProjectCreatorRole>("all");
  const [projectDepartmentFilter, setProjectDepartmentFilter] = React.useState("all");
  const [projectUnitFilter, setProjectUnitFilter] = React.useState("all");

  const [trainingSearch, setTrainingSearch] = React.useState("");
  const [trainingTimeFilter, setTrainingTimeFilter] = React.useState<"all" | "this_month" | "custom_period">("all");
  const [trainingParticipantsFilter, setTrainingParticipantsFilter] = React.useState<ParticipantFilter>("all");
  const [trainingWeightedDaysFilter, setTrainingWeightedDaysFilter] = React.useState<WeightedDaysFilter>("all");
  const [trainingPeriodFrom, setTrainingPeriodFrom] = React.useState("");
  const [trainingPeriodTo, setTrainingPeriodTo] = React.useState("");

  const projectLinkedTrainings = React.useMemo(
    () =>
      trainings.filter((record) =>
        Boolean(
          (record.related_project_id && String(record.related_project_id).trim()) ||
            (record.related_project_title && String(record.related_project_title).trim())
        )
      ),
    [trainings]
  );

  const projectDepartmentOptions = React.useMemo(() => {
    const values = new Set<string>();
    projects.forEach((project) => {
      const creator = getCreatorLabel(project);
      if (creator.department && creator.department !== "-") {
        values.add(creator.department);
      }
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [projects]);

  const projectUnitOptions = React.useMemo(() => {
    const values = new Set<string>();
    projects.forEach((project) => {
      const creator = getCreatorLabel(project);
      if (creator.unit && creator.unit !== "-") {
        values.add(creator.unit);
      }
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [projects]);

  const filteredProjects = React.useMemo(() => {
    return projects.filter((project) => {
      const creator = getCreatorLabel(project);
      const haystack = [
        project.title,
        getProjectLeaderNames(project),
        creator.name,
        creator.unit,
        creator.department,
      ]
        .join(" ")
        .toLowerCase();
      if (projectSearch && !haystack.includes(projectSearch.toLowerCase())) return false;
      if (projectRoleFilter !== "all" && project.created_by_user_type !== projectRoleFilter) return false;
      if (projectDepartmentFilter !== "all" && creator.department !== projectDepartmentFilter) return false;
      if (projectUnitFilter !== "all" && creator.unit !== projectUnitFilter) return false;
      return true;
    });
  }, [projectDepartmentFilter, projectRoleFilter, projectSearch, projectUnitFilter, projects]);

  const filteredTrainings = React.useMemo(() => {
    const now = new Date();
    return projectLinkedTrainings.filter((record) => {
      const trainingDate = getTrainingDate(record);
      const haystack = [
        record.training_title,
        record.related_project_title || "",
        record.venue_platform || "",
        getTrainingCreator(record),
      ]
        .join(" ")
        .toLowerCase();
      if (trainingSearch && !haystack.includes(trainingSearch.toLowerCase())) return false;
      if (!matchesParticipantFilter(record, trainingParticipantsFilter)) return false;
      if (!matchesWeightedDaysFilter(record, trainingWeightedDaysFilter)) return false;
      if (trainingTimeFilter === "this_month") {
        if (!trainingDate) return false;
        const parsed = new Date(trainingDate);
        if (parsed.getMonth() !== now.getMonth() || parsed.getFullYear() !== now.getFullYear()) return false;
      }
      if (trainingTimeFilter === "custom_period") {
        if (!trainingDate || !trainingPeriodFrom || !trainingPeriodTo) return false;
        const parsed = new Date(trainingDate).getTime();
        const start = new Date(trainingPeriodFrom).getTime();
        const end = new Date(trainingPeriodTo).getTime();
        if (Number.isNaN(parsed) || Number.isNaN(start) || Number.isNaN(end)) return false;
        if (parsed < start || parsed > end) return false;
      }
      return true;
    });
  }, [
    trainingParticipantsFilter,
    trainingPeriodFrom,
    trainingPeriodTo,
    trainingSearch,
    trainingTimeFilter,
    trainingWeightedDaysFilter,
    projectLinkedTrainings,
  ]);
  const {
    currentPage: projectPage,
    paginatedItems: paginatedProjects,
    resetPagination: resetProjectPagination,
    setCurrentPage: setProjectPage,
    startIndex: projectStartIndex,
    totalPages: projectTotalPages,
  } = useRecordPagination(filteredProjects);
  const {
    currentPage: trainingPage,
    paginatedItems: paginatedTrainings,
    resetPagination: resetTrainingPagination,
    setCurrentPage: setTrainingPage,
    startIndex: trainingStartIndex,
    totalPages: trainingTotalPages,
  } = useRecordPagination(filteredTrainings);

  React.useEffect(() => {
    resetProjectPagination();
  }, [projectDepartmentFilter, projectRoleFilter, projectSearch, projectUnitFilter, resetProjectPagination]);

  React.useEffect(() => {
    resetTrainingPagination();
  }, [
    resetTrainingPagination,
    trainingParticipantsFilter,
    trainingPeriodFrom,
    trainingPeriodTo,
    trainingSearch,
    trainingTimeFilter,
    trainingWeightedDaysFilter,
  ]);

  const projectBudgetRows = React.useMemo<ProjectBudgetRow[]>(
    () =>
      projects
        .map((project) => {
          const { totalBudget, utilizedBudget, remainingBudget } = getProjectBudgetSnapshot(project);
          return {
            id: project.id,
            title: project.title || "Untitled project",
            totalBudget,
            utilizedBudget,
            remainingBudget,
          };
        })
        .sort((left, right) => right.totalBudget - left.totalBudget),
    [projects]
  );

  const overallBudget = React.useMemo(
    () => projectBudgetRows.reduce((sum, item) => sum + item.totalBudget, 0),
    [projectBudgetRows]
  );
  const overallUtilized = React.useMemo(
    () => projectBudgetRows.reduce((sum, item) => sum + item.utilizedBudget, 0),
    [projectBudgetRows]
  );

  return (
    <>
      <Card className="border-border/50 bg-card/40 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">College Coordinator Dashboard</CardTitle>
          <CardDescription className="text-[11px]">
            Compact department-level controls for {department}.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <OverviewCard
            title="Projects"
            value={String(projects.length)}
            description="Department-wide project records with creator-based filtering."
            icon={FolderKanban}
            onClick={() => setActiveDialog("projects")}
          />
          <OverviewCard
            title="Trainings"
            value={String(projectLinkedTrainings.length)}
            description="Project-related trainings with month, period, participant, and weighted-day filters."
            icon={BookOpenCheck}
            onClick={() => setActiveDialog("trainings")}
          />
          <OverviewCard
            title="Budget"
            value={currency(overallBudget)}
            description="Per-project budget totals and the department grand total."
            icon={PiggyBank}
            onClick={() => setActiveDialog("budget")}
          />
          <OverviewCard
            title="Utilized"
            value={currency(overallUtilized)}
            description="Budget utilized and remaining balance per project."
            icon={Wallet}
            onClick={() => setActiveDialog("utilized")}
          />
          <OverviewCard
            title="Faculty Involvement"
            value={String(facultyRecords.length)}
            description="Register faculty records by unit and reuse them in training committee selection."
            icon={Users2}
            onClick={() => setActiveDialog("faculty_involvement")}
          />
        </CardContent>
      </Card>

      <Dialog open={activeDialog === "projects"} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent className="sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>Department Projects</DialogTitle>
            <DialogDescription>
              View all accessible projects, then narrow results by creator role, department, or unit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2 lg:grid-cols-12">
              <div className="min-w-0 lg:col-span-4">
                <Input
                  value={projectSearch}
                  onChange={(event) => setProjectSearch(event.target.value)}
                  placeholder="Search project, leader, or creator..."
                  className="h-9 w-full min-w-0 text-xs"
                />
              </div>
              <div className="min-w-0 sm:grid sm:grid-cols-2 sm:gap-2 lg:col-span-7 lg:grid-cols-3">
                <Select value={projectRoleFilter} onValueChange={(value: ProjectCreatorRole) => setProjectRoleFilter(value)}>
                  <SelectTrigger className="h-9 w-full min-w-0 text-xs">
                    <Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                    <SelectValue placeholder="Creator role" className="truncate" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All creators</SelectItem>
                    <SelectItem value="college_coordinator" className="text-xs">College coordinator</SelectItem>
                    <SelectItem value="unit_coordinator" className="text-xs">Unit coordinator</SelectItem>
                    <SelectItem value="project_leader" className="text-xs">Project leader</SelectItem>
                    <SelectItem value="super_admin" className="text-xs">Super admin</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={projectDepartmentFilter} onValueChange={setProjectDepartmentFilter}>
                  <SelectTrigger className="h-9 w-full min-w-0 text-xs">
                    <SelectValue placeholder="Department" className="truncate" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All departments</SelectItem>
                    {projectDepartmentOptions.map((option) => (
                      <SelectItem key={option} value={option} className="text-xs">{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={projectUnitFilter} onValueChange={setProjectUnitFilter}>
                  <SelectTrigger className="h-9 w-full min-w-0 text-xs">
                    <SelectValue placeholder="Unit" className="truncate" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All units</SelectItem>
                    {projectUnitOptions.map((option) => (
                      <SelectItem key={option} value={option} className="text-xs">{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0 lg:col-span-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-9 w-full text-xs">
                      <Download className="mr-2 h-3.5 w-3.5" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => void exportProjectsExcel(filteredProjects.filter(isActiveProject))}>Export Excel</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => void exportProjectsPdf(filteredProjects.filter(isActiveProject))}>Export PDF</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <ScrollArea className="max-h-[60vh] rounded-xl border border-border/50">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-border/40">
                    <TableHead className="text-[10px]">Project</TableHead>
                    <TableHead className="text-[10px]">Duration</TableHead>
                    <TableHead className="text-[10px]">Project Leader</TableHead>
                    <TableHead className="text-[10px]">Budget</TableHead>
                    <TableHead className="text-[10px]">Created By</TableHead>
                    <TableHead className="text-[10px]">Scope</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedProjects.map((project) => {
                    const creator = getCreatorLabel(project);
                    return (
                      <TableRow key={project.id} className="border-border/30">
                        <TableCell className="text-[11px] font-medium">{project.title || "Untitled project"}</TableCell>
                        <TableCell className="text-[11px]">{formatProjectDuration(project)}</TableCell>
                        <TableCell className="text-[11px]">{getProjectLeaderNames(project)}</TableCell>
                        <TableCell className="text-[11px]">{currency(getProjectBudget(project))}</TableCell>
                        <TableCell className="text-[11px]">
                          <div className="space-y-1">
                            <p>{creator.name}</p>
                            <Badge variant="outline" className="text-[9px]">{creator.role}</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-[11px]">{creator.unit} / {creator.department}</TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredProjects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                        No projects match the active filters.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </ScrollArea>
            <RecordPagination
              currentPage={projectPage}
              totalPages={projectTotalPages}
              startIndex={projectStartIndex}
              totalItems={filteredProjects.length}
              itemLabel="projects"
              onPageChange={setProjectPage}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === "trainings"} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent className="sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>Project Trainings</DialogTitle>
            <DialogDescription>
              Filter related trainings by time window, participant size, and weighted training days.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2 md:grid-cols-[minmax(0,1.5fr)_170px_170px_170px_auto]">
              <Input
                value={trainingSearch}
                onChange={(event) => setTrainingSearch(event.target.value)}
                placeholder="Search training, project, venue, or creator..."
                className="h-9 text-xs"
              />
              <Select value={trainingTimeFilter} onValueChange={(value: "all" | "this_month" | "custom_period") => setTrainingTimeFilter(value)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Time filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All records</SelectItem>
                  <SelectItem value="this_month" className="text-xs">This month</SelectItem>
                  <SelectItem value="custom_period" className="text-xs">This period</SelectItem>
                </SelectContent>
              </Select>
              <Select value={trainingParticipantsFilter} onValueChange={(value: ParticipantFilter) => setTrainingParticipantsFilter(value)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Participants" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All participants</SelectItem>
                  <SelectItem value="up_to_25" className="text-xs">Up to 25</SelectItem>
                  <SelectItem value="26_to_50" className="text-xs">26 to 50</SelectItem>
                  <SelectItem value="51_to_100" className="text-xs">51 to 100</SelectItem>
                  <SelectItem value="101_plus" className="text-xs">101 and above</SelectItem>
                </SelectContent>
              </Select>
              <Select value={trainingWeightedDaysFilter} onValueChange={(value: WeightedDaysFilter) => setTrainingWeightedDaysFilter(value)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Weighted days" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All weighted days</SelectItem>
                  <SelectItem value="up_to_1" className="text-xs">Up to 1</SelectItem>
                  <SelectItem value="1_to_5" className="text-xs">1 to 5</SelectItem>
                  <SelectItem value="above_5" className="text-xs">Above 5</SelectItem>
                </SelectContent>
              </Select>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-9 text-xs">
                    <Download className="mr-2 h-3.5 w-3.5" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => void exportTrainingsExcel(filteredTrainings)}>Export Excel</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void exportTrainingsPdf(filteredTrainings)}>Export PDF</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {trainingTimeFilter === "custom_period" ? (
              <div className="grid gap-2 md:grid-cols-2">
                <Input type="date" value={trainingPeriodFrom} onChange={(event) => setTrainingPeriodFrom(event.target.value)} className="h-9 text-xs" />
                <Input type="date" value={trainingPeriodTo} onChange={(event) => setTrainingPeriodTo(event.target.value)} className="h-9 text-xs" />
              </div>
            ) : null}
            <ScrollArea className="max-h-[60vh] rounded-xl border border-border/50">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-border/40">
                    <TableHead className="text-[10px]">Training</TableHead>
                    <TableHead className="text-[10px]">Related Project</TableHead>
                    <TableHead className="text-[10px]">Schedule</TableHead>
                    <TableHead className="text-[10px]">Participants</TableHead>
                    <TableHead className="text-[10px]">Weighted Days</TableHead>
                    <TableHead className="text-[10px]">Created By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTrainings.map((record) => (
                    <TableRow key={record.id} className="border-border/30">
                      <TableCell className="text-[11px] font-medium">{record.training_title}</TableCell>
                      <TableCell className="text-[11px]">{record.related_project_title || "-"}</TableCell>
                      <TableCell className="text-[11px]">{getTrainingSchedule(record)}</TableCell>
                      <TableCell className="text-[11px]">{record.participants_overall_total || 0}</TableCell>
                      <TableCell className="text-[11px]">{record.weighted_days_trained || 0}</TableCell>
                      <TableCell className="text-[11px]">{getTrainingCreator(record)}</TableCell>
                    </TableRow>
                  ))}
                  {filteredTrainings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                        No trainings match the active filters.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </ScrollArea>
            <RecordPagination
              currentPage={trainingPage}
              totalPages={trainingTotalPages}
              startIndex={trainingStartIndex}
              totalItems={filteredTrainings.length}
              itemLabel="trainings"
              onPageChange={setTrainingPage}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === "budget"} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Project Budgets</DialogTitle>
            <DialogDescription>
              View every project budget in the department and the overall total.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Overall Total</p>
                  <p className="mt-1 text-xl font-semibold">{currency(overallBudget)}</p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Projects Covered</p>
                  <p className="mt-1 text-xl font-semibold">{projectBudgetRows.length}</p>
                </CardContent>
              </Card>
            </div>
            <ScrollArea className="max-h-[60vh] rounded-xl border border-border/50">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-border/40">
                    <TableHead className="text-[10px]">Project</TableHead>
                    <TableHead className="text-[10px]">Total Budget</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectBudgetRows.map((item) => (
                    <TableRow key={item.id} className="border-border/30">
                      <TableCell className="text-[11px] font-medium">{item.title}</TableCell>
                      <TableCell className="text-[11px]">{currency(item.totalBudget)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === "utilized"} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Budget Utilized</DialogTitle>
            <DialogDescription>
              Project budgets, utilized amounts, and remaining balances in one compact view.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Total Budget</p>
                  <p className="mt-1 text-xl font-semibold">{currency(overallBudget)}</p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Utilized</p>
                  <p className="mt-1 text-xl font-semibold">{currency(overallUtilized)}</p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Remaining</p>
                  <p className="mt-1 text-xl font-semibold">{currency(Math.max(overallBudget - overallUtilized, 0))}</p>
                </CardContent>
              </Card>
            </div>
            <ScrollArea className="max-h-[60vh] rounded-xl border border-border/50">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-border/40">
                    <TableHead className="text-[10px]">Project</TableHead>
                    <TableHead className="text-[10px]">Total Budget</TableHead>
                    <TableHead className="text-[10px]">Utilized</TableHead>
                    <TableHead className="text-[10px]">Remaining</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectBudgetRows.map((item) => (
                    <TableRow key={item.id} className="border-border/30">
                      <TableCell className="text-[11px] font-medium">{item.title}</TableCell>
                      <TableCell className="text-[11px]">{currency(item.totalBudget)}</TableCell>
                      <TableCell className="text-[11px]">{currency(item.utilizedBudget)}</TableCell>
                      <TableCell className="text-[11px]">{currency(item.remainingBudget)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === "faculty_involvement"} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent className="sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>Faculty Involvement</DialogTitle>
            <DialogDescription>
              Create and manage faculty records from {department} for committee selection and staffing reference.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-2">
            <FacultyRegistryManagement department={department} records={facultyRecords} />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
