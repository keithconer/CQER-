"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Activity,
  ArrowUpRight,
  BriefcaseBusiness,
  BookOpenCheck,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Cpu,
  Factory,
  FolderKanban,
  Landmark,
  Megaphone,
  Newspaper,
  NotepadText,
  PiggyBank,
  Sparkles,
  Trophy,
  Users2,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

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
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { type Project } from "@/components/dashboard/projects-table";
import { type TrainingRecord } from "@/components/dashboard/trainings-form";
import { RecordPagination, useRecordPagination } from "@/components/dashboard/record-pagination";

type ModuleCount = {
  label: string;
  value: number;
  href: string;
};

type MonthlyActivityPoint = {
  label: string;
  value: number;
  breakdown: { name: string; count: number }[];
};

type ProjectStatusPoint = {
  label: string;
  value: number;
};

type RadarPoint = {
  label: string;
  value: number;
  fullMark: number;
};

type RecentActivity = {
  id: string;
  title: string;
  meta: string;
  href: string;
  createdAt: string | null;
};

type ProjectBudgetDetail = {
  id: string;
  title: string;
  totalBudget: number;
  utilizedBudget: number;
  remainingBudget: number;
};

type FacultyInvolvementSummary = {
  name: string;
  hoursRendered: number;
};

interface ProjectLeaderDashboardProps {
  projectCount: number;
  activeProjectCount: number;
  trainingCount: number;
  projects: Project[];
  trainings: TrainingRecord[];
  totalBudget: number;
  utilizedBudget: number;
  utilizationRate: number;
  moduleCounts: ModuleCount[];
  monthlyActivitySeries: MonthlyActivityPoint[];
  projectStatusShare: ProjectStatusPoint[];
  radarSeries: RadarPoint[];
  recentActivities: RecentActivity[];
  budgetDetails: ProjectBudgetDetail[];
  facultyInvolvement: FacultyInvolvementSummary[];
}

const COLORS = [
  "hsl(142, 72%, 29%)",
  "hsl(142, 71%, 45%)",
  "hsl(142, 60%, 65%)",
  "hsl(142, 50%, 85%)",
];

const moduleIcons: Record<string, LucideIcon> = {
  "Project Registration": FolderKanban,
  "Budget Utilization": Wallet,
  "Ordinance / Resolution": Landmark,
  "Impact / Assessment": ClipboardCheck,
  "Extension Program": Newspaper,
  "Awards": Trophy,
  "Other Activities": NotepadText,
  Trainings: BookOpenCheck,
  Consultancy: BriefcaseBusiness,
  "Technical Advisory": Wrench,
  "Adopters with Enterprise": Factory,
  Technologies: Cpu,
  "IEC Materials": Megaphone,
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const chartTextColor = "var(--foreground)";
const chartGridColor = "var(--border)";

type TrainingTimeFilter = "all" | "this_month" | "custom_period";
type ParticipantFilter = "all" | "up_to_25" | "26_to_50" | "51_to_100" | "101_plus";
type WeightedDaysFilter = "all" | "up_to_1" | "1_to_5" | "above_5";

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "-" : format(parsed, "MMM d, yyyy");
}

function formatProjectDuration(project: Project) {
  if (!project.start_date || !project.end_date) return "-";
  return `${formatDate(project.start_date)} - ${formatDate(project.end_date)}`;
}

function getProjectLeaderNames(project: Project) {
  const leaders = Array.isArray(project.proponents)
    ? project.proponents.map((item) => item?.name?.trim()).filter(Boolean)
    : [];
  return leaders.length > 0 ? leaders.join(", ") : "-";
}

function getProjectBudget(project: Project) {
  if (typeof project.budget_total === "number") return project.budget_total;
  if (!Array.isArray(project.budget_requirements)) return 0;
  return project.budget_requirements.reduce((sum, item) => sum + (Number(item?.amount) || 0), 0);
}

function getTrainingDate(record: TrainingRecord) {
  if (record.conducted_sessions?.length) {
    return (record as TrainingRecord & { created_at?: string | null }).created_at || null;
  }
  const sortedDates = [...(record.inclusive_dates || [])].sort();
  return sortedDates.length > 0 ? sortedDates[0] : null;
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
    { header: "Category", key: "category", width: 20 },
  ];
  sheet.columns = columns.map((column) => ({ key: column.key, width: column.width }));
  sheet.mergeCells("A1:E1");
  sheet.getCell("A1").value = "Project Records";
  sheet.getCell("A1").font = { bold: true, size: 14 };
  sheet.getCell("A1").alignment = { horizontal: "center" };
  sheet.getRow(2).values = columns.map((column) => column.header);
  sheet.getRow(2).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF159E44" } };
  });
  records.forEach((project) => {
    sheet.addRow({
      title: project.title || "Untitled project",
      duration: formatProjectDuration(project),
      leader: getProjectLeaderNames(project),
      budget: getProjectBudget(project),
      category: project.category || "-",
    });
  });
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `project-leader-projects-${new Date().toISOString().slice(0, 10)}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function exportProjectsPdf(records: Project[]) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFontSize(12);
  doc.text("Project Records", doc.internal.pageSize.getWidth() / 2, 12, { align: "center" });
  autoTable(doc, {
    startY: 18,
    head: [["Project Name", "Duration", "Project Leader", "Total Budget", "Category"]],
    body: records.map((project) => [
      project.title || "Untitled project",
      formatProjectDuration(project),
      getProjectLeaderNames(project),
      formatCurrency(getProjectBudget(project)),
      project.category || "-",
    ]),
    theme: "grid",
    headStyles: { fillColor: [21, 158, 68], textColor: [255, 255, 255], fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" },
  });
  doc.save(`project-leader-projects-${new Date().toISOString().slice(0, 10)}.pdf`);
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
  ];
  sheet.columns = columns.map((column) => ({ key: column.key, width: column.width }));
  sheet.mergeCells("A1:E1");
  sheet.getCell("A1").value = "Training Records";
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
    });
  });
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `project-leader-trainings-${new Date().toISOString().slice(0, 10)}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function exportTrainingsPdf(records: TrainingRecord[]) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFontSize(12);
  doc.text("Training Records", doc.internal.pageSize.getWidth() / 2, 12, { align: "center" });
  autoTable(doc, {
    startY: 18,
    head: [["Training Title", "Related Project", "Schedule", "Participants", "Weighted Days"]],
    body: records.map((record) => [
      record.training_title,
      record.related_project_title || "-",
      getTrainingSchedule(record),
      String(record.participants_overall_total || 0),
      String(record.weighted_days_trained || 0),
    ]),
    theme: "grid",
    headStyles: { fillColor: [21, 158, 68], textColor: [255, 255, 255], fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" },
  });
  doc.save(`project-leader-trainings-${new Date().toISOString().slice(0, 10)}.pdf`);
}

function ChartTooltip({
  active,
  payload,
  label,
  suffix = "",
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string; payload?: MonthlyActivityPoint }>;
  label?: string;
  suffix?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="min-w-[170px] rounded-lg border border-border/50 bg-background/95 p-3 shadow-xl backdrop-blur-sm">
      <p className="mb-2 border-b border-border/50 pb-1 text-[11px] font-bold text-foreground">{label}</p>
      <div className="space-y-2">
        {payload.map((entry, index) => (
          <div key={`${entry.name || "item"}-${index}`} className="space-y-1.5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-[10px] text-muted-foreground">{entry.name}</span>
              </div>
              <span className="text-[10px] font-bold text-foreground">
                {(entry.value || 0).toLocaleString()}
                {suffix}
              </span>
            </div>
            {entry.payload?.breakdown?.length ? (
              <div className="ml-1 space-y-1 border-l border-emerald-500/30 pl-3.5">
                {entry.payload.breakdown.slice(0, 4).map((item) => (
                  <div key={`${item.name}-${item.count}`} className="flex justify-between text-[9px] text-muted-foreground/90">
                    <span className="max-w-[140px] truncate">{item.name}</span>
                    <span className="font-medium">{item.count}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function SimpleChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="min-w-[160px] rounded-lg border border-border/50 bg-background/95 p-3 shadow-xl backdrop-blur-sm">
      {label ? <p className="mb-2 border-b border-border/50 pb-1 text-[11px] font-bold text-foreground">{label}</p> : null}
      <div className="space-y-2">
        {payload.map((entry, index) => (
          <div key={`${entry.name || "item"}-${index}`} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-[10px] text-muted-foreground">{entry.name}</span>
            </div>
            <span className="text-[10px] font-bold text-foreground">{(entry.value || 0).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  icon: Icon,
  href,
  onClick,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: LucideIcon;
  href?: string;
  onClick?: () => void;
}) {
  const content = (
    <Card className="border-border/50 bg-card/50 shadow-sm transition-colors hover:bg-muted/30">
      <CardContent className="flex items-start justify-between p-4">
        <div className="space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold leading-none text-foreground">{value}</p>
          <p className="text-[10px] text-muted-foreground">{sub}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground">
          <Icon className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href} className="block">{content}</Link>;
  }

  return (
    <button type="button" onClick={onClick} className="block w-full text-left">
      {content}
    </button>
  );
}

function CompactMetricCard({
  title,
  description,
  value,
  icon: Icon,
  onClick,
}: {
  title: string;
  description: string;
  value: string;
  icon: LucideIcon;
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

function getInitials(name: string) {
  const parts = name
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return "NA";
  return parts.map((part) => part[0]?.toUpperCase() || "").join("");
}

function BudgetDetailsDialog({
  open,
  onOpenChange,
  title,
  description,
  items,
  mode,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  title: string;
  description: string;
  items: ProjectBudgetDetail[];
  mode: "budget" | "utilized";
}) {
  const totalBudget = items.reduce((sum, item) => sum + item.totalBudget, 0);
  const totalUtilized = items.reduce((sum, item) => sum + item.utilizedBudget, 0);
  const totalRemaining = items.reduce((sum, item) => sum + item.remainingBudget, 0);
  const primaryValue = mode === "budget" ? totalBudget : totalUtilized;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Card className="border-border/50">
              <CardContent className="p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {mode === "budget" ? "Overall Budget" : "Overall Utilized"}
                </p>
                <p className="mt-1 text-xl font-semibold">{formatCurrency(primaryValue)}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {mode === "budget" ? "Utilized" : "Total Budget"}
                </p>
                <p className="mt-1 text-xl font-semibold">
                  {formatCurrency(mode === "budget" ? totalUtilized : totalBudget)}
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Remaining</p>
                <p className="mt-1 text-xl font-semibold">{formatCurrency(totalRemaining)}</p>
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
                {items.length > 0 ? (
                  items.map((item) => (
                    <TableRow key={item.id} className="border-border/30">
                      <TableCell className="text-[11px] font-medium">{item.title}</TableCell>
                      <TableCell className="text-[11px]">{formatCurrency(item.totalBudget)}</TableCell>
                      <TableCell className="text-[11px]">{formatCurrency(item.utilizedBudget)}</TableCell>
                      <TableCell className="text-[11px]">{formatCurrency(item.remainingBudget)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-xs text-muted-foreground">
                      No project budget records found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ProjectLeaderDashboard({
  projectCount,
  activeProjectCount,
  trainingCount,
  projects,
  trainings,
  totalBudget,
  utilizedBudget,
  utilizationRate,
  moduleCounts,
  monthlyActivitySeries,
  projectStatusShare,
  radarSeries,
  recentActivities,
  budgetDetails,
  facultyInvolvement,
}: ProjectLeaderDashboardProps) {
  const [projectsOpen, setProjectsOpen] = React.useState(false);
  const [trainingsOpen, setTrainingsOpen] = React.useState(false);
  const [budgetOpen, setBudgetOpen] = React.useState(false);
  const [utilizedOpen, setUtilizedOpen] = React.useState(false);
  const [facultyPage, setFacultyPage] = React.useState(1);
  const [projectSearch, setProjectSearch] = React.useState("");
  const [projectCategoryFilter, setProjectCategoryFilter] = React.useState("all");
  const [trainingSearch, setTrainingSearch] = React.useState("");
  const [trainingTimeFilter, setTrainingTimeFilter] = React.useState<TrainingTimeFilter>("all");
  const [trainingParticipantsFilter, setTrainingParticipantsFilter] = React.useState<ParticipantFilter>("all");
  const [trainingWeightedDaysFilter, setTrainingWeightedDaysFilter] = React.useState<WeightedDaysFilter>("all");
  const [trainingPeriodFrom, setTrainingPeriodFrom] = React.useState("");
  const [trainingPeriodTo, setTrainingPeriodTo] = React.useState("");
  const populatedModules = moduleCounts.filter((item) => item.value > 0);
  const maxRadar = Math.max(1, ...radarSeries.map((item) => item.fullMark));
  const facultyPageSize = 10;
  const facultyTotalPages = Math.max(1, Math.ceil(facultyInvolvement.length / facultyPageSize));
  const facultyPageItems = facultyInvolvement.slice(
    (facultyPage - 1) * facultyPageSize,
    facultyPage * facultyPageSize
  );

  React.useEffect(() => {
    setFacultyPage((current) => Math.min(current, facultyTotalPages));
  }, [facultyTotalPages]);

  const filteredProjects = React.useMemo(() => {
    return projects.filter((project) => {
      const haystack = [
        project.title,
        getProjectLeaderNames(project),
        project.category || "",
      ]
        .join(" ")
        .toLowerCase();
      if (projectSearch && !haystack.includes(projectSearch.toLowerCase())) return false;
      if (projectCategoryFilter !== "all" && (project.category || "") !== projectCategoryFilter) return false;
      return true;
    });
  }, [projectCategoryFilter, projectSearch, projects]);

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

  const filteredTrainings = React.useMemo(() => {
    const now = new Date();
    return projectLinkedTrainings.filter((record) => {
      const haystack = [
        record.training_title,
        record.related_project_title || "",
        record.venue_platform || "",
      ]
        .join(" ")
        .toLowerCase();
      if (trainingSearch && !haystack.includes(trainingSearch.toLowerCase())) return false;
      if (!matchesParticipantFilter(record, trainingParticipantsFilter)) return false;
      if (!matchesWeightedDaysFilter(record, trainingWeightedDaysFilter)) return false;

      const trainingDate = getTrainingDate(record);
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
    projectLinkedTrainings,
    trainingParticipantsFilter,
    trainingPeriodFrom,
    trainingPeriodTo,
    trainingSearch,
    trainingTimeFilter,
    trainingWeightedDaysFilter,
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
  }, [projectCategoryFilter, projectSearch, resetProjectPagination]);

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

  const projectCategories = React.useMemo(
    () =>
      Array.from(new Set(projects.map((project) => project.category).filter(Boolean) as string[])).sort((a, b) =>
        a.localeCompare(b)
      ),
    [projects]
  );

  return (
    <>
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryCard
            label="Projects"
            value={projectCount}
            sub={`${activeProjectCount} active or ongoing`}
            icon={FolderKanban}
            onClick={() => setProjectsOpen(true)}
          />
          <SummaryCard
            label="Trainings"
            value={trainingCount}
            sub="Training records created"
            icon={BookOpenCheck}
            onClick={() => setTrainingsOpen(true)}
          />
          <CompactMetricCard
            title="Budget"
            value={formatCurrency(totalBudget)}
            description="Per-project budget totals and your overall budget."
            icon={PiggyBank}
            onClick={() => setBudgetOpen(true)}
          />
          <CompactMetricCard
            title="Utilized"
            value={formatCurrency(utilizedBudget)}
            description={`${Math.round(utilizationRate)}% of tracked budget already utilized.`}
            icon={Wallet}
            onClick={() => setUtilizedOpen(true)}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-12 lg:grid-rows-2">
          <Card className="border-border/50 bg-card/50 shadow-sm lg:col-span-8">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-[13px] font-bold">
                <CalendarRange className="h-3.5 w-3.5 text-emerald-600" />
                Activity Flow
              </CardTitle>
              <CardDescription className="text-[10px]">
                Monthly movement across project registration and your extension outputs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[240px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyActivitySeries} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="leaderActivityGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={chartGridColor} strokeDasharray="3 3" vertical={false} opacity={0.6} />
                    <XAxis dataKey="label" fontSize={9} tickLine={false} axisLine={false} tick={{ fill: chartTextColor }} tickFormatter={(value) => String(value).split(" ")[0]} />
                    <YAxis fontSize={9} tickLine={false} axisLine={false} tick={{ fill: chartTextColor }} />
                    <RechartsTooltip content={<ChartTooltip suffix=" records" />} />
                    <Area type="monotone" dataKey="value" name="Activity" stroke="hsl(142, 71%, 45%)" strokeWidth={2} fill="url(#leaderActivityGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 shadow-sm lg:col-span-4">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-[13px] font-bold">
                <Activity className="h-3.5 w-3.5 text-emerald-600" />
                Project Mix
              </CardTitle>
              <CardDescription className="text-[10px]">
                Distribution of your registered projects by current category.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={projectStatusShare} dataKey="value" nameKey="label" innerRadius={48} outerRadius={72} paddingAngle={6} stroke="none">
                      {projectStatusShare.map((_, index) => (
                        <Cell key={`project-status-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<SimpleChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                {projectStatusShare.map((item, index) => (
                  <div key={item.label} className="rounded-xl border border-border/50 bg-background/60 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-[9px] text-muted-foreground">{item.label}</span>
                    </div>
                    <p className="mt-1 text-xs font-semibold">{item.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 shadow-sm lg:col-span-5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-[13px] font-bold">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                Output Coverage
              </CardTitle>
              <CardDescription className="text-[10px]">
                How your records are distributed across the modules you manage.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={populatedModules} margin={{ top: 0, right: 0, left: -20, bottom: 20 }}>
                    <CartesianGrid stroke={chartGridColor} strokeDasharray="3 3" vertical={false} opacity={0.5} />
                    <XAxis dataKey="label" angle={-20} textAnchor="end" height={48} interval={0} fontSize={8} tickLine={false} axisLine={false} tick={{ fill: chartTextColor }} />
                    <YAxis fontSize={9} tickLine={false} axisLine={false} allowDecimals={false} tick={{ fill: chartTextColor }} />
                    <RechartsTooltip content={<SimpleChartTooltip />} />
                    <Bar dataKey="value" name="Records" radius={[8, 8, 0, 0]} fill="hsl(142, 71%, 45%)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 shadow-sm lg:col-span-4">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-[13px] font-bold">
                <Activity className="h-3.5 w-3.5 text-emerald-600" />
                Focus Radar
              </CardTitle>
              <CardDescription className="text-[10px]">
                Balance of compliance, delivery, adoption, and recognition work.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarSeries} outerRadius="70%">
                    <PolarGrid stroke={chartGridColor} />
                    <PolarAngleAxis dataKey="label" tick={{ fontSize: 9, fill: chartTextColor }} />
                    <PolarRadiusAxis domain={[0, maxRadar]} tick={false} axisLine={false} />
                    <Radar name="Coverage" dataKey="value" stroke="hsl(142, 71%, 45%)" fill="hsl(142, 71%, 45%)" fillOpacity={0.2} strokeWidth={2} />
                    <RechartsTooltip content={<SimpleChartTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 shadow-sm lg:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-[13px] font-bold">
                <Users2 className="h-3.5 w-3.5 text-emerald-600" />
                Recent Entries
              </CardTitle>
              <CardDescription className="text-[10px]">
                Latest records from your dashboard modules and community access.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border border-border/50 bg-background/60 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-medium text-foreground">Budget utilization progress</p>
                    <p className="text-[9px] text-muted-foreground">Tracked against your registered project budget.</p>
                  </div>
                  <Badge variant="outline" className="text-[9px]">
                    {Math.round(utilizationRate)}%
                  </Badge>
                </div>
                <Progress value={Math.max(0, Math.min(100, utilizationRate))} className="mt-3 h-2" />
              </div>

              <div className="space-y-2">
                {recentActivities.length > 0 ? (
                  recentActivities.map((item) => {
                    const Icon = moduleIcons[item.meta] || Activity;
                    return (
                      <Link key={item.id} href={item.href} className="flex items-start gap-3 rounded-xl border border-border/40 bg-background/60 px-3 py-2 transition-colors hover:bg-muted/40">
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[10px] font-medium text-foreground">{item.title}</p>
                          <p className="text-[9px] text-muted-foreground">{item.meta}</p>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <p className="text-[10px] text-muted-foreground">No recent records yet. Start with project registration or post in CQER Community.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/50 bg-card/50 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Users2 className="h-4 w-4 text-foreground" />
                  Faculty Involvement
                </CardTitle>
                <CardDescription className="text-xs">
                  Faculty members and rendered hours from training records.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {facultyInvolvement.length} total
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {facultyInvolvement.length > 0 ? (
              <>
                <div className="space-y-2">
                  {facultyPageItems.map((item) => (
                    <div key={`${item.name}-${item.hoursRendered}`} className="flex items-center justify-between rounded-xl border border-border/40 bg-background/70 px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar size="sm" className="border border-border/50">
                          <AvatarFallback>{getInitials(item.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pl-3">
                        <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium text-foreground">{item.hoursRendered.toLocaleString()} hrs</span>
                      </div>
                    </div>
                  ))}
                </div>
                {facultyTotalPages > 1 ? (
                  <div className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/20 px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">
                      Page {facultyPage} of {facultyTotalPages}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFacultyPage((page) => Math.max(1, page - 1))}
                        disabled={facultyPage === 1}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/50 bg-background text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setFacultyPage((page) => Math.min(facultyTotalPages, page + 1))}
                        disabled={facultyPage === facultyTotalPages}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/50 bg-background text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-border/50 px-4 py-6 text-sm text-muted-foreground">
                No faculty involvement records found.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={projectsOpen} onOpenChange={setProjectsOpen}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Project Records</DialogTitle>
            <DialogDescription>
              View and export the projects you created without routing away from the dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2 lg:grid-cols-12">
              <div className="min-w-0 lg:col-span-8">
                <Input
                  value={projectSearch}
                  onChange={(event) => setProjectSearch(event.target.value)}
                  placeholder="Search project, leader, or category..."
                  className="h-9 w-full min-w-0 text-xs"
                />
              </div>
              <div className="min-w-0 sm:grid sm:grid-cols-2 sm:gap-2 lg:col-span-4">
                <Select value={projectCategoryFilter} onValueChange={setProjectCategoryFilter}>
                  <SelectTrigger className="h-9 w-full min-w-0 text-xs">
                    <SelectValue placeholder="Category" className="truncate" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All categories</SelectItem>
                    {projectCategories.map((category) => (
                      <SelectItem key={category} value={category} className="text-xs">
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-9 w-full text-xs">
                      <ArrowUpRight className="mr-2 h-3.5 w-3.5" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => void exportProjectsExcel(filteredProjects)}>Export Excel</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => void exportProjectsPdf(filteredProjects)}>Export PDF</DropdownMenuItem>
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
                    <TableHead className="text-[10px]">Category</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedProjects.map((project) => (
                    <TableRow key={project.id} className="border-border/30">
                      <TableCell className="text-[11px] font-medium">{project.title || "Untitled project"}</TableCell>
                      <TableCell className="text-[11px]">{formatProjectDuration(project)}</TableCell>
                      <TableCell className="text-[11px]">{getProjectLeaderNames(project)}</TableCell>
                      <TableCell className="text-[11px]">{formatCurrency(getProjectBudget(project))}</TableCell>
                      <TableCell className="text-[11px]">{project.category || "-"}</TableCell>
                    </TableRow>
                  ))}
                  {filteredProjects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-xs text-muted-foreground">
                        No project records match the active filters.
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
      <Dialog open={trainingsOpen} onOpenChange={setTrainingsOpen}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Training Records</DialogTitle>
            <DialogDescription>
              View and export your project-linked training records from the dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2 lg:grid-cols-12">
              <div className="min-w-0 lg:col-span-6">
                <Input
                  value={trainingSearch}
                  onChange={(event) => setTrainingSearch(event.target.value)}
                  placeholder="Search training, project, or venue..."
                  className="h-9 w-full min-w-0 text-xs"
                />
              </div>
              <div className="min-w-0 sm:grid sm:grid-cols-2 sm:gap-2 lg:col-span-5 lg:grid-cols-3">
                <Select value={trainingTimeFilter} onValueChange={(value: TrainingTimeFilter) => setTrainingTimeFilter(value)}>
                  <SelectTrigger className="h-9 w-full min-w-0 text-xs">
                    <SelectValue placeholder="Time filter" className="truncate" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All records</SelectItem>
                    <SelectItem value="this_month" className="text-xs">This month</SelectItem>
                    <SelectItem value="custom_period" className="text-xs">This period</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={trainingParticipantsFilter} onValueChange={(value: ParticipantFilter) => setTrainingParticipantsFilter(value)}>
                  <SelectTrigger className="h-9 w-full min-w-0 text-xs">
                    <SelectValue placeholder="Participants" className="truncate" />
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
                  <SelectTrigger className="h-9 w-full min-w-0 text-xs">
                    <SelectValue placeholder="Weighted days" className="truncate" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All weighted days</SelectItem>
                    <SelectItem value="up_to_1" className="text-xs">Up to 1</SelectItem>
                    <SelectItem value="1_to_5" className="text-xs">1 to 5</SelectItem>
                    <SelectItem value="above_5" className="text-xs">Above 5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0 lg:col-span-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-9 w-full text-xs">
                      <ArrowUpRight className="mr-2 h-3.5 w-3.5" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => void exportTrainingsExcel(filteredTrainings)}>Export Excel</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => void exportTrainingsPdf(filteredTrainings)}>Export PDF</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
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
                    </TableRow>
                  ))}
                  {filteredTrainings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-xs text-muted-foreground">
                        No training records match the active filters.
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
      <BudgetDetailsDialog
        open={budgetOpen}
        onOpenChange={setBudgetOpen}
        title="Project Budgets"
        description="Project budgets with utilized amounts and remaining balances."
        items={budgetDetails}
        mode="budget"
      />
      <BudgetDetailsDialog
        open={utilizedOpen}
        onOpenChange={setUtilizedOpen}
        title="Utilized Budget"
        description="Utilized budget per project based on recorded budget utilization entries."
        items={budgetDetails}
        mode="utilized"
      />
    </>
  );
}
