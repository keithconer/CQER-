"use client";

import * as React from "react";
import { Download, Eye, FileSpreadsheet, Search, SlidersHorizontal } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type Project } from "./projects-table";
import { formatThematicAreaLetters } from "@/lib/thematic-area";

interface FundingManagementProps {
  projects: Project[];
  title?: string;
  description?: string;
}

type FundingFilter = "internal" | "external";
type FundingData = Record<string, unknown>;
type FilledField = { label: string; value: string };

function getFundingData(project: Project): FundingData {
  const raw = (project as unknown as { funding_data?: unknown }).funding_data;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as FundingData;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as FundingData;
    } catch {
      // Keep empty object fallback when invalid JSON.
    }
  }
  return {};
}

function pickValue(data: FundingData, ...keys: string[]): unknown {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(data, key) && data[key] != null && String(data[key]).trim() !== "") {
      return data[key];
    }
  }
  return "";
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

function formatDate(value: unknown): string {
  const date = toDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function formatNameList(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object" && "name" in item) return String((item as { name?: unknown }).name || "").trim();
      return "";
    })
    .filter(Boolean)
    .join(", ");
}

function formatStringList(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .join(", ");
}

function formatInclusiveDates(data: FundingData): { range: string; duration: string; selectedDates: string } {
  const inclusiveDates = pickValue(data, "inclusive_dates", "funding_inclusive_dates");
  const startDate = pickValue(data, "start_date", "funding_start_date");
  const endDate = pickValue(data, "end_date", "funding_end_date");
  const durationDays = pickValue(data, "duration_days", "funding_duration_days");

  if (Array.isArray(inclusiveDates) && inclusiveDates.length > 0) {
    const parsedDates = inclusiveDates
      .map((item) => {
        if (item && typeof item === "object") {
          const candidate = (item as { date?: unknown; value?: unknown }).date ?? (item as { value?: unknown }).value ?? item;
          return toDate(candidate);
        }
        return toDate(item);
      })
      .filter((date): date is Date => Boolean(date))
      .sort((a, b) => a.getTime() - b.getTime());

    if (parsedDates.length > 0) {
      const first = parsedDates[0];
      const last = parsedDates[parsedDates.length - 1];
      return {
        range: `${formatDate(first)} to ${formatDate(last)}`,
        duration: `${parsedDates.length} day(s)`,
        selectedDates: parsedDates.map((date) => formatDate(date)).join(", "),
      };
    }
  }

  const parsedStart = formatDate(startDate);
  const parsedEnd = formatDate(endDate);
  if (parsedStart && parsedEnd) {
    return {
      range: `${parsedStart} to ${parsedEnd}`,
      duration: durationDays ? `${String(durationDays)} day(s)` : "",
      selectedDates: "",
    };
  }

  return { range: "", duration: durationDays ? `${String(durationDays)} day(s)` : "", selectedDates: "" };
}

function getFundingDetails(project: Project) {
  const fundingData = getFundingData(project);
  const type = getFundingType(project);
  const totalBudget = getTotalBudget(project, fundingData);
  const dates = formatInclusiveDates(fundingData);
  const thematicAreaSource = pickValue(fundingData, "thematic_area", "funding_thematic_area");
  const thematicArea = formatStringList(thematicAreaSource);
  const thematicAreaDisplay = formatThematicAreaLetters(thematicAreaSource) || thematicArea;

  return {
    type,
    nop: type === "internal" ? "Internal" : "External",
    projectNo: toText(project.project_no || pickValue(fundingData, "project_no")),
    category: toText(project.category),
    collaboratingAgencies: toText(project.collaborating_agencies || pickValue(fundingData, "collaborating_agencies")),
    title: toText(pickValue(fundingData, "title", "funding_title") || project.title),
    location: toText(pickValue(fundingData, "location", "funding_location")),
    typesOfClientele: toText(pickValue(fundingData, "types_of_clientele", "funding_types_of_clientele")),
    numberOfClientele: toText(pickValue(fundingData, "number_of_clientele", "funding_number_of_clientele")),
    inclusiveDateRange: dates.selectedDates || dates.range,
    durationDays: dates.duration,
    dateApprovedRECouncil: formatDate(pickValue(fundingData, "date_approved_re_council", "funding_re_council_approved_date")),
    dateApprovedBOROP: formatDate(pickValue(fundingData, "date_approved_bor_op", "funding_bor_op_approved_date")),
    dateInceptionMeeting: formatDate(pickValue(fundingData, "date_inception_meeting", "funding_inception_meeting_date")),
    beneficiaries: formatNameList(pickValue(fundingData, "beneficiaries", "funding_beneficiaries")),
    sdgs: formatStringList(pickValue(fundingData, "sdg_goals", "funding_sdg_goals")),
    thematicArea,
    thematicAreaDisplay,
    functionNature: toText(pickValue(fundingData, "external_function_nature")),
    fundingAgency: toText(pickValue(fundingData, "external_funding_agency")),
    totalBudget: totalBudget > 0 ? formatPeso(totalBudget) : "",
  };
}

function getFundingType(project: Project): Exclude<FundingFilter | "all", "all"> {
  const source = (project.funding_source || "").toLowerCase();
  if (source.includes("external")) return "external";
  if (source.includes("internal")) return "internal";

  const fundingData = getFundingData(project);
  const hasExternalHints =
    Number(fundingData.external_approved_budget_cvsu || 0) > 0 ||
    Number(fundingData.external_counterpart_budget_cvsu || 0) > 0 ||
    Boolean(fundingData.external_funding_agency) ||
    Boolean(fundingData.external_function_nature);
  return hasExternalHints ? "external" : "internal";
}

function getTotalBudget(project: Project, fundingData: FundingData): number {
  const approved = Number(fundingData.external_approved_budget_cvsu || 0);
  const counterpart = Number(fundingData.external_counterpart_budget_cvsu || 0);
  const combined = approved + counterpart;
  if (combined > 0) return combined;

  const budgetFromFundingData = Number(fundingData.total_budget ?? fundingData.budget_total ?? 0);
  if (budgetFromFundingData > 0) return budgetFromFundingData;

  const budgetFromProject = Number(project.budget_total ?? 0);
  if (budgetFromProject > 0) return budgetFromProject;

  return combined;
}

function formatPeso(value: number): string {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value);
}

function toText(value: unknown): string {
  if (value == null) return "";
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "name" in item) return String((item as { name?: unknown }).name || "");
        return String(item);
      })
      .filter(Boolean)
      .join(", ");
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function getFilledFields(project: Project): FilledField[] {
  const details = getFundingDetails(project);
  const fields: FilledField[] = [
    { label: "NOP", value: details.nop },
    { label: "Project No.", value: details.projectNo },
    { label: "MOA Category", value: details.category },
    { label: "Collaborating Agency/ies", value: details.collaboratingAgencies },
    { label: "Title", value: details.title },
    { label: "Location", value: details.location },
    { label: "Types of Clientele", value: details.typesOfClientele },
    { label: "No. of Clientele", value: details.numberOfClientele },
    { label: "Inclusive Dates", value: details.inclusiveDateRange },
    { label: "Duration", value: details.durationDays },
    { label: "Date approved by R&E Council", value: details.dateApprovedRECouncil },
    { label: "Date approved by Board of Regents / OP", value: details.dateApprovedBOROP },
    { label: "Date of inception meeting", value: details.dateInceptionMeeting },
    { label: "Beneficiaries", value: details.beneficiaries },
    { label: "SDGs", value: details.sdgs },
    { label: "Thematic Area", value: details.thematicAreaDisplay },
    { label: "Funding Type", value: details.nop },
  ];

  if (details.type === "external") {
    fields.push({ label: "Function/Nature of Involvement", value: details.functionNature });
    fields.push({ label: "Total Budget", value: details.totalBudget });
    fields.push({ label: "Funding Agency", value: details.fundingAgency });
  }

  return fields.filter((entry) => entry.value.trim().length > 0);
}

function toExportRows(projects: Project[], type: FundingFilter) {
  return projects
    .filter((project) => (project.entry_type || "project") === "project")
    .filter((project) => getFundingType(project) === type)
    .map((project) => {
      const details = getFundingDetails(project);
      return {
        NOP: details.nop || "-",
        "Project No.": details.projectNo || "-",
        "Category of MOA": details.category || "-",
        "Collaborating Agency/ies": details.collaboratingAgencies || "-",
        Title: details.title || "-",
        Location: details.location || "-",
        "Types of Clientele": details.typesOfClientele || "-",
        "No. of Clientele": details.numberOfClientele || "-",
        "Inclusive Dates": details.inclusiveDateRange || "-",
        "Duration (days)": details.durationDays || "-",
        "Date approved by R&E Council": details.dateApprovedRECouncil || "-",
        "Date approved by Board of Regents / OP": details.dateApprovedBOROP || "-",
        "Date of inception meeting": details.dateInceptionMeeting || "-",
        Beneficiaries: details.beneficiaries || "-",
        SDGs: details.sdgs || "-",
        "Thematic Area": details.thematicAreaDisplay || "-",
        "Function/Nature of Involvement": type === "external" ? details.functionNature || "-" : "-",
        "Total Budget": type === "external" ? details.totalBudget || "-" : "-",
        "Funding Agency": type === "external" ? details.fundingAgency || "-" : "-",
      };
    });
}

export function FundingManagement({
  projects,
  title = "Funding",
  description = "Filter and view funding fields for reporting.",
}: FundingManagementProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [filter, setFilter] = React.useState<FundingFilter | "all">("all");
  const [viewProject, setViewProject] = React.useState<Project | null>(null);
  const [showExportDialog, setShowExportDialog] = React.useState(false);
  const [exportInternal, setExportInternal] = React.useState(true);
  const [exportExternal, setExportExternal] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);

  const records = React.useMemo(() => {
    const term = searchTerm.toLowerCase();
    return projects
      .filter((project) => (project.entry_type || "project") === "project")
      .filter((project) => (filter === "all" ? true : getFundingType(project) === filter))
      .filter((project) => {
        const details = getFundingDetails(project);
        return [
          details.nop,
          details.projectNo,
          details.category,
          details.collaboratingAgencies,
          details.title,
          details.location,
          details.typesOfClientele,
          details.numberOfClientele,
          details.inclusiveDateRange,
          details.durationDays,
          details.dateApprovedRECouncil,
          details.dateApprovedBOROP,
          details.dateInceptionMeeting,
          details.beneficiaries,
          details.sdgs,
          details.thematicArea,
          details.thematicAreaDisplay,
          details.fundingAgency,
          details.functionNature,
          details.totalBudget,
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);
      });
  }, [filter, projects, searchTerm]);

  const handleOpenExportDialog = () => {
    setExportInternal(filter !== "external");
    setExportExternal(filter !== "internal");
    setShowExportDialog(true);
  };

  const handleExportExcel = async () => {
    if (!exportInternal && !exportExternal) {
      alert("Select at least one funding type to export.");
      return;
    }
    setIsExporting(true);
    try {
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "CQER";
      workbook.created = new Date();

      const selectedTypes: FundingFilter[] = [
        ...(exportInternal ? (["internal"] as const) : []),
        ...(exportExternal ? (["external"] as const) : []),
      ];

      selectedTypes.forEach((type) => {
        const rows = toExportRows(projects, type);
        const worksheet = workbook.addWorksheet(type === "internal" ? "Internal Funding" : "External Funding");
        const columns = [
          { header: "NOP", key: "NOP", width: 14 },
          { header: "Project No.", key: "Project No.", width: 18 },
          { header: "Category of MOA", key: "Category of MOA", width: 20 },
          { header: "Collaborating Agency/ies", key: "Collaborating Agency/ies", width: 28 },
          { header: "Title", key: "Title", width: 34 },
          { header: "Location", key: "Location", width: 24 },
          { header: "Types of Clientele", key: "Types of Clientele", width: 24 },
          { header: "No. of Clientele", key: "No. of Clientele", width: 18 },
          { header: "Inclusive Dates", key: "Inclusive Dates", width: 28 },
          { header: "Duration (days)", key: "Duration (days)", width: 16 },
          { header: "Date approved by R&E Council", key: "Date approved by R&E Council", width: 26 },
          { header: "Date approved by Board of Regents / OP", key: "Date approved by Board of Regents / OP", width: 32 },
          { header: "Date of inception meeting", key: "Date of inception meeting", width: 24 },
          { header: "Beneficiaries", key: "Beneficiaries", width: 30 },
          { header: "SDGs", key: "SDGs", width: 30 },
          { header: "Thematic Area", key: "Thematic Area", width: 30 },
          { header: "Function/Nature of Involvement", key: "Function/Nature of Involvement", width: 34 },
          { header: "Total Budget", key: "Total Budget", width: 18 },
          { header: "Funding Agency", key: "Funding Agency", width: 24 },
        ];
        worksheet.columns = columns;
        rows.forEach((row) => worksheet.addRow(row));

        const headerRow = worksheet.getRow(1);
        headerRow.height = 24;
        headerRow.eachCell((cell) => {
          cell.font = { bold: true, color: { argb: "FFFFFFFF" }, name: "Calibri", size: 11 };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF159E44" } };
          cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
          cell.border = {
            top: { style: "thin", color: { argb: "FFD9D9D9" } },
            left: { style: "thin", color: { argb: "FFD9D9D9" } },
            bottom: { style: "thin", color: { argb: "FFD9D9D9" } },
            right: { style: "thin", color: { argb: "FFD9D9D9" } },
          };
        });

        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          row.height = 20;
          row.eachCell((cell) => {
            cell.font = { name: "Calibri", size: 10 };
            cell.alignment = { vertical: "top", horizontal: "left", wrapText: true };
            cell.border = {
              top: { style: "thin", color: { argb: "FFEDEDED" } },
              left: { style: "thin", color: { argb: "FFEDEDED" } },
              bottom: { style: "thin", color: { argb: "FFEDEDED" } },
              right: { style: "thin", color: { argb: "FFEDEDED" } },
            };
          });
        });

        worksheet.views = [{ state: "frozen", ySplit: 1 }];
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const datePart = new Date().toISOString().slice(0, 10);
      anchor.href = url;
      anchor.download = `funding-export-${datePart}.xlsx`;
      anchor.click();
      URL.revokeObjectURL(url);
      setShowExportDialog(false);
    } catch {
      alert("Failed to export Excel file.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-xs font-semibold">{title}</CardTitle>
              <CardDescription className="text-[10px]">{description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-8 h-8 text-xs placeholder:text-[10px] bg-muted/20 border-border/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-[10px] border-border/50 bg-muted/20">
                    <SlidersHorizontal className="h-3 w-3 mr-1" />
                    Filter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel className="text-[10px]">Funding Type</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem className="text-[10px]" checked={filter === "all"} onCheckedChange={() => setFilter("all")}>
                    All
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem className="text-[10px]" checked={filter === "internal"} onCheckedChange={() => setFilter("internal")}>
                    Internally funded
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem className="text-[10px]" checked={filter === "external"} onCheckedChange={() => setFilter("external")}>
                    Externally funded
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" size="sm" className="h-8 text-[10px] border-border/50 bg-muted/20" onClick={handleOpenExportDialog}>
                <FileSpreadsheet className="mr-1 h-3.5 w-3.5" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="rounded-md border border-border/50 overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="text-[10px] font-semibold h-9">NOP</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Project No.</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Category of MOA</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Collaborating Agency/ies</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Title</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Location</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Types of Clientele</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">No. of Clientele</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Inclusive Dates</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Duration</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Date approved by R&E Council</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Date approved by Board of Regents / OP</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Date of inception meeting</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Beneficiaries</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">SDGs</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Thematic Area</TableHead>
                  {filter !== "internal" && <TableHead className="text-[10px] font-semibold h-9">Function/Nature of Involvement</TableHead>}
                  {filter !== "internal" && <TableHead className="text-[10px] font-semibold h-9">Total Budget</TableHead>}
                  {filter !== "internal" && <TableHead className="text-[10px] font-semibold h-9">Funding Agency</TableHead>}
                  <TableHead className="text-[10px] font-semibold h-9 text-right">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length > 0 ? (
                  records.map((project) => {
                    const details = getFundingDetails(project);
                    return (
                      <TableRow key={project.id} className="hover:bg-muted/10 border-border/30">
                        <TableCell className="text-[10px] py-2.5 px-3">{details.nop || "-"}</TableCell>
                        <TableCell className="text-[10px] py-2.5 px-3">{details.projectNo || "-"}</TableCell>
                        <TableCell className="text-[10px] py-2.5 px-3">{details.category || "-"}</TableCell>
                        <TableCell className="text-[10px] py-2.5 px-3">{details.collaboratingAgencies || "-"}</TableCell>
                        <TableCell className="text-[10px] py-2.5 px-3">{details.title || "-"}</TableCell>
                        <TableCell className="text-[10px] py-2.5 px-3">{details.location || "-"}</TableCell>
                        <TableCell className="text-[10px] py-2.5 px-3">{details.typesOfClientele || "-"}</TableCell>
                        <TableCell className="text-[10px] py-2.5 px-3">{details.numberOfClientele || "-"}</TableCell>
                        <TableCell className="text-[10px] py-2.5 px-3">{details.inclusiveDateRange || "-"}</TableCell>
                        <TableCell className="text-[10px] py-2.5 px-3">{details.durationDays || "-"}</TableCell>
                        <TableCell className="text-[10px] py-2.5 px-3">{details.dateApprovedRECouncil || "-"}</TableCell>
                        <TableCell className="text-[10px] py-2.5 px-3">{details.dateApprovedBOROP || "-"}</TableCell>
                        <TableCell className="text-[10px] py-2.5 px-3">{details.dateInceptionMeeting || "-"}</TableCell>
                        <TableCell className="text-[10px] py-2.5 px-3">{details.beneficiaries || "-"}</TableCell>
                        <TableCell className="text-[10px] py-2.5 px-3">{details.sdgs || "-"}</TableCell>
                        <TableCell className="text-[10px] py-2.5 px-3 whitespace-nowrap">{details.thematicAreaDisplay || "-"}</TableCell>
                        {filter !== "internal" && <TableCell className="text-[10px] py-2.5 px-3">{details.type === "external" ? details.functionNature || "-" : "-"}</TableCell>}
                        {filter !== "internal" && <TableCell className="text-[10px] py-2.5 px-3">{details.totalBudget || "-"}</TableCell>}
                        {filter !== "internal" && <TableCell className="text-[10px] py-2.5 px-3">{details.type === "external" ? details.fundingAgency || "-" : "-"}</TableCell>}
                        <TableCell className="py-2.5 px-3 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => setViewProject(project)}
                            aria-label="View funding details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={filter !== "internal" ? 20 : 17} className="h-24 text-center text-[10px] text-muted-foreground">
                      No funding records found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!viewProject} onOpenChange={(open) => !open && setViewProject(null)}>
        <DialogContent className="sm:max-w-[680px]">
          <DialogHeader>
            <DialogTitle className="text-sm">Funding Details</DialogTitle>
            <DialogDescription className="text-[10px]">
              Viewing all filled funding fields.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto rounded-md border border-border/50">
            <Table>
              <TableBody>
                {(viewProject ? getFilledFields(viewProject) : []).map((entry) => (
                  <TableRow key={entry.label} className="border-border/30">
                    <TableCell className="w-[220px] py-2 text-[10px] font-semibold">{entry.label}</TableCell>
                    <TableCell className="py-2 text-[10px]">{entry.value}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="h-8 text-[10px]" onClick={() => setViewProject(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Download className="h-4 w-4 text-[#159E44]" />
              Export Funding to Excel
            </DialogTitle>
            <DialogDescription className="text-[10px]">
              Select which funding records to include in the export.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-md border border-border/50 p-3">
            <label className="flex items-center gap-2 rounded-md border border-border/50 px-2 py-2 text-[10px]">
              <Checkbox
                checked={exportInternal}
                onCheckedChange={(checked) => setExportInternal(checked === true)}
              />
              Internally funded
            </label>
            <label className="flex items-center gap-2 rounded-md border border-border/50 px-2 py-2 text-[10px]">
              <Checkbox
                checked={exportExternal}
                onCheckedChange={(checked) => setExportExternal(checked === true)}
              />
              Externally funded
            </label>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-8 text-[10px]"
              onClick={() => setShowExportDialog(false)}
              disabled={isExporting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-8 text-[10px] bg-[#159E44] hover:bg-[#128A3B]"
              onClick={handleExportExcel}
              disabled={isExporting}
            >
              {isExporting ? "Exporting..." : "Export"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
