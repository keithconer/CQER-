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

interface FundingManagementProps {
  projects: Project[];
  title?: string;
  description?: string;
}

type FundingFilter = "internal" | "external";
type FundingData = Record<string, unknown>;
type FilledField = { label: string; value: string };

function getFundingType(project: Project): FundingFilter {
  const source = (project.funding_source || "").toLowerCase();
  if (source.includes("internal")) return "internal";
  return "external";
}

function getFundingData(project: Project): FundingData {
  return ((project as unknown as { funding_data?: FundingData }).funding_data || {}) as FundingData;
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
  const fundingData = getFundingData(project);
  const approved = Number(fundingData.external_approved_budget_cvsu || 0);
  const counterpart = Number(fundingData.external_counterpart_budget_cvsu || 0);
  const totalBudget = approved + counterpart;
  const fields: FilledField[] = [
    { label: "Project No.", value: toText(project.project_no || fundingData.project_no) },
    { label: "MOA Category", value: toText(project.category) },
    { label: "Collaborating Agency/ies", value: toText(project.collaborating_agencies || fundingData.collaborating_agencies) },
    { label: "Title", value: toText(fundingData.title || project.title) },
    { label: "Location", value: toText(fundingData.location) },
    { label: "Types of Clientele", value: toText(fundingData.types_of_clientele) },
    { label: "No. of Clientele", value: toText(fundingData.number_of_clientele) },
    { label: "Funding Type", value: getFundingType(project) === "internal" ? "Internal" : "External" },
  ];

  if (getFundingType(project) === "external") {
    fields.push({ label: "Function/Nature", value: toText(fundingData.external_function_nature) });
    fields.push({
      label: "Total Budget",
      value: new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(totalBudget),
    });
    fields.push({ label: "Funding Agency", value: toText(fundingData.external_funding_agency) });
  }

  return fields.filter((entry) => entry.value.trim().length > 0);
}

function toExportRows(projects: Project[], type: FundingFilter) {
  return projects
    .filter((project) => (project.entry_type || "project") === "project")
    .filter((project) => getFundingType(project) === type)
    .map((project) => {
      const fundingData = getFundingData(project);
      const approved = Number(fundingData.external_approved_budget_cvsu || 0);
      const counterpart = Number(fundingData.external_counterpart_budget_cvsu || 0);
      const totalBudget = approved + counterpart;
      return {
        "Project No.": toText(project.project_no || fundingData.project_no) || "-",
        "Category of MOA": toText(project.category) || "-",
        "Collaborating Agency/ies": toText(project.collaborating_agencies || fundingData.collaborating_agencies) || "-",
        Title: toText(fundingData.title || project.title) || "-",
        Location: toText(fundingData.location) || "-",
        "Types of Clientele": toText(fundingData.types_of_clientele) || "-",
        "No. of Clientele": toText(fundingData.number_of_clientele) || "-",
        "Function/Nature": type === "external" ? toText(fundingData.external_function_nature) || "-" : "-",
        "Total Budget":
          type === "external"
            ? new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(totalBudget)
            : "-",
        "Funding Agency": type === "external" ? toText(fundingData.external_funding_agency) || "-" : "-",
      };
    });
}

export function FundingManagement({
  projects,
  title = "Funding",
  description = "Filter and view funding fields for reporting.",
}: FundingManagementProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [filter, setFilter] = React.useState<FundingFilter>("internal");
  const [viewProject, setViewProject] = React.useState<Project | null>(null);
  const [showExportDialog, setShowExportDialog] = React.useState(false);
  const [exportInternal, setExportInternal] = React.useState(true);
  const [exportExternal, setExportExternal] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);

  const records = React.useMemo(() => {
    const term = searchTerm.toLowerCase();
    return projects
      .filter((project) => (project.entry_type || "project") === "project")
      .filter((project) => getFundingType(project) === filter)
      .filter((project) => {
        const fundingData = getFundingData(project);
        return [
          project.title || "",
          String(project.project_no || ""),
          String(project.moa_no || ""),
          String((fundingData?.title as string) || ""),
          String((fundingData?.location as string) || ""),
          String((fundingData?.types_of_clientele as string) || ""),
          String((fundingData?.external_funding_agency as string) || ""),
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);
      });
  }, [filter, projects, searchTerm]);

  const handleOpenExportDialog = () => {
    setExportInternal(filter === "internal");
    setExportExternal(filter === "external");
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
          { header: "Project No.", key: "Project No.", width: 18 },
          { header: "Category of MOA", key: "Category of MOA", width: 20 },
          { header: "Collaborating Agency/ies", key: "Collaborating Agency/ies", width: 28 },
          { header: "Title", key: "Title", width: 34 },
          { header: "Location", key: "Location", width: 24 },
          { header: "Types of Clientele", key: "Types of Clientele", width: 24 },
          { header: "No. of Clientele", key: "No. of Clientele", width: 18 },
          { header: "Function/Nature", key: "Function/Nature", width: 28 },
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
                <DropdownMenuCheckboxItem className="text-[10px]" checked={filter === "internal"} onCheckedChange={() => setFilter("internal")}>
                  Internal
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem className="text-[10px]" checked={filter === "external"} onCheckedChange={() => setFilter("external")}>
                  External
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" className="h-8 text-[10px] border-border/50 bg-muted/20" onClick={handleOpenExportDialog}>
              <FileSpreadsheet className="mr-1 h-3.5 w-3.5" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="rounded-md border border-border/50 overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="text-[10px] font-semibold h-9">Project No.</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Category of MOA</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Collaborating Agency/ies</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Title</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Location</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Types of Clientele</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">No. of Clientele</TableHead>
                  {filter === "external" && <TableHead className="text-[10px] font-semibold h-9">Function/Nature</TableHead>}
                  {filter === "external" && <TableHead className="text-[10px] font-semibold h-9">Total Budget</TableHead>}
                  {filter === "external" && <TableHead className="text-[10px] font-semibold h-9">Funding Agency</TableHead>}
                  <TableHead className="text-[10px] font-semibold h-9 text-right">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length > 0 ? (
                  records.map((project) => {
                    const fundingData = getFundingData(project);
                    const approved = Number(fundingData.external_approved_budget_cvsu || 0);
                    const counterpart = Number(fundingData.external_counterpart_budget_cvsu || 0);
                    const totalBudget = approved + counterpart;
                    return (
                      <TableRow key={project.id} className="hover:bg-muted/10 border-border/30">
                        <TableCell className="text-[10px] py-2.5 px-3">{String(project.project_no || fundingData.project_no || "-")}</TableCell>
                        <TableCell className="text-[10px] py-2.5 px-3">{String(project.category || "-")}</TableCell>
                        <TableCell className="text-[10px] py-2.5 px-3">{String(project.collaborating_agencies || fundingData.collaborating_agencies || "-")}</TableCell>
                        <TableCell className="text-[10px] py-2.5 px-3">{String(fundingData.title || project.title || "-")}</TableCell>
                        <TableCell className="text-[10px] py-2.5 px-3">{String(fundingData.location || "-")}</TableCell>
                        <TableCell className="text-[10px] py-2.5 px-3">{String(fundingData.types_of_clientele || "-")}</TableCell>
                        <TableCell className="text-[10px] py-2.5 px-3">{String(fundingData.number_of_clientele ?? "-")}</TableCell>
                        {filter === "external" && <TableCell className="text-[10px] py-2.5 px-3">{String(fundingData.external_function_nature || "-")}</TableCell>}
                        {filter === "external" && <TableCell className="text-[10px] py-2.5 px-3">{new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(totalBudget)}</TableCell>}
                        {filter === "external" && <TableCell className="text-[10px] py-2.5 px-3">{String(fundingData.external_funding_agency || "-")}</TableCell>}
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
                    <TableCell colSpan={filter === "external" ? 11 : 8} className="h-24 text-center text-[10px] text-muted-foreground">
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
