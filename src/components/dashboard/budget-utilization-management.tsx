"use client";

import * as React from "react";
import { Eye, FileDown, Plus, Search, SlidersHorizontal, Trash2, Wallet } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

import { type Project } from "@/components/dashboard/projects-table";
import { BudgetUtilizationForm } from "@/components/dashboard/budget-utilization-form";
import { DocumentPreview } from "@/components/dashboard/document-preview";
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
import {
  deleteBudgetUtilization,
  type BudgetUtilizationRecord,
} from "@/lib/actions/budget-utilization";
import { getProjectBudgetSummaryTotal } from "@/lib/project-budget";

type FilterMode = "all" | "with_documents" | "this_year" | "over_budget";

interface BudgetUtilizationManagementProps {
  records: BudgetUtilizationRecord[];
  projects: Project[];
}

function currency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function getCoverageLabel(record: BudgetUtilizationRecord) {
  if (!record.coverage_start || !record.coverage_end) return "-";
  return `${format(new Date(record.coverage_start), "MMM d, yyyy")} - ${format(new Date(record.coverage_end), "MMM d, yyyy")}`;
}

async function exportExcel(records: BudgetUtilizationRecord[]) {
  const ExcelJSImport = await import("exceljs/dist/exceljs.min.js");
  const ExcelJS = ExcelJSImport?.default ?? ExcelJSImport;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Budget Utilization");
  const columns = [
    { header: "Project Title", key: "projectTitle", width: 36 },
    { header: "Inclusive Dates", key: "coverage", width: 32 },
    { header: "Budget Summary", key: "totalBudget", width: 18 },
    { header: "Assigned Budget", key: "utilizedBudget", width: 18 },
    { header: "Left to Assign", key: "remainingBudget", width: 18 },
    { header: "Months Covered", key: "monthsCovered", width: 18 },
  ];
  sheet.columns = columns.map((column) => ({ key: column.key, width: column.width }));
  sheet.mergeCells("A1:F1");
  sheet.getCell("A1").value = "Budget Utilization";
  sheet.getCell("A1").font = { bold: true, size: 14 };
  sheet.getCell("A1").alignment = { horizontal: "center" };
  sheet.getRow(2).values = columns.map((column) => column.header);
  sheet.getRow(2).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF159E44" } };
  });
  records.forEach((record) => {
    sheet.addRow({
      projectTitle: record.project_title,
      coverage: getCoverageLabel(record),
      totalBudget: Number(record.total_budget || 0),
      utilizedBudget: Number(record.utilized_total || 0),
      remainingBudget: Number(record.total_budget || 0) - Number(record.utilized_total || 0),
      monthsCovered: record.monthly_breakdown?.length || 0,
    });
  });
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `budget-utilization-${new Date().toISOString().slice(0, 10)}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function exportPdf(records: BudgetUtilizationRecord[]) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFontSize(12);
  doc.text("Budget Utilization", doc.internal.pageSize.getWidth() / 2, 12, { align: "center" });
  autoTable(doc, {
    startY: 18,
    head: [[
      "Project Title",
      "Inclusive Dates",
      "Budget Summary",
      "Assigned Budget",
      "Left to Assign",
      "Months Covered",
    ]],
    body: records.map((record) => ([
      record.project_title,
      getCoverageLabel(record),
      currency(Number(record.total_budget || 0)),
      currency(Number(record.utilized_total || 0)),
      currency(Number(record.total_budget || 0) - Number(record.utilized_total || 0)),
      String(record.monthly_breakdown?.length || 0),
    ])),
    theme: "grid",
    headStyles: { fillColor: [21, 158, 68], textColor: [255, 255, 255], fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" },
  });
  doc.save(`budget-utilization-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function BudgetUtilizationManagement({
  records,
  projects,
}: BudgetUtilizationManagementProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [filterMode, setFilterMode] = React.useState<FilterMode>("all");
  const [selectedRecord, setSelectedRecord] = React.useState<BudgetUtilizationRecord | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [successOpen, setSuccessOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<BudgetUtilizationRecord | null>(null);
  const availableProjects = React.useMemo(() => {
    const usedProjectIds = new Set(records.map((record) => record.project_id));
    return projects.filter(
      (project) =>
        !usedProjectIds.has(project.id) &&
        getProjectBudgetSummaryTotal(project) > 0
    );
  }, [projects, records]);

  const filteredRecords = React.useMemo(() => {
    const year = new Date().getFullYear();
    return records.filter((record) => {
      const haystack = [
        record.project_title,
        getCoverageLabel(record),
        String(record.total_budget || 0),
        String(record.utilized_total || 0),
      ]
        .join(" ")
        .toLowerCase();

      if (searchTerm && !haystack.includes(searchTerm.toLowerCase())) return false;
      if (filterMode === "with_documents" && (!record.documents || record.documents.length === 0)) return false;
      if (filterMode === "this_year") {
        const startYear = record.coverage_start ? new Date(record.coverage_start).getFullYear() : null;
        if (startYear !== year) return false;
      }
      if (filterMode === "over_budget" && Number(record.utilized_total || 0) <= Number(record.total_budget || 0)) {
        return false;
      }
      return true;
    });
  }, [records, searchTerm, filterMode]);
  const {
    currentPage,
    paginatedItems: paginatedRecords,
    resetPagination,
    setCurrentPage,
    startIndex,
    totalPages,
  } = useRecordPagination(filteredRecords);

  React.useEffect(() => {
    resetPagination();
  }, [filterMode, resetPagination, searchTerm]);

  const handleSaved = () => {
    setCreateOpen(false);
    setSelectedRecord(null);
    setSuccessOpen(true);
    router.refresh();
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    const result = await deleteBudgetUtilization(deleteTarget.id);
    if (result?.error) {
      alert(result.error);
      return;
    }
    setDeleteTarget(null);
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="space-y-4 pb-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle className="text-xl font-semibold">Budget Utilization</CardTitle>
              <CardDescription className="text-sm">
                Track the final monthly breakdown of each project budget summary.
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
                  <DropdownMenuItem onClick={() => void exportExcel(filteredRecords)}>Export Excel</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void exportPdf(filteredRecords)}>Export PDF</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                className="rounded-xl bg-[#159E44] text-white hover:bg-[#128A3B]"
                onClick={() => setCreateOpen(true)}
                disabled={availableProjects.length === 0}
              >
                <Plus className="mr-2 h-4 w-4" />
                Utilize Budget
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full max-w-xl">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search project title, dates, total budget, or utilized amount..."
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
                  All records
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={filterMode === "with_documents"} onCheckedChange={() => setFilterMode("with_documents")}>
                  With documents only
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={filterMode === "this_year"} onCheckedChange={() => setFilterMode("this_year")}>
                  This year only
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={filterMode === "over_budget"} onCheckedChange={() => setFilterMode("over_budget")}>
                  Over budget only
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
                  <TableHead className="h-12 text-base font-semibold">Inclusive Dates</TableHead>
                  <TableHead className="h-12 text-base font-semibold">Budget Summary</TableHead>
                  <TableHead className="h-12 text-base font-semibold">Assigned</TableHead>
                  <TableHead className="h-12 text-base font-semibold">Left to Assign</TableHead>
                  <TableHead className="h-12 text-base font-semibold">Documents</TableHead>
                  <TableHead className="h-12 text-right text-base font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length > 0 ? (
                  paginatedRecords.map((record) => {
                    const remaining = Number(record.total_budget || 0) - Number(record.utilized_total || 0);
                    return (
                      <TableRow key={record.id}>
                        <TableCell className="py-4 text-base font-medium">
                          <div className="flex items-start gap-2">
                            <Wallet className="mt-0.5 h-4 w-4 text-[#159E44]" />
                            <div>
                              <div>{record.project_title}</div>
                              <div className="text-sm text-muted-foreground">
                                {record.monthly_breakdown?.length || 0} month(s) covered
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 text-base">{getCoverageLabel(record)}</TableCell>
                        <TableCell className="py-4 text-base font-medium">{currency(Number(record.total_budget || 0))}</TableCell>
                        <TableCell className="py-4 text-base font-medium text-[#159E44]">{currency(Number(record.utilized_total || 0))}</TableCell>
                        <TableCell className="py-4 text-base font-medium">{currency(remaining)}</TableCell>
                        <TableCell className="py-4 text-sm">
                          <DocumentPreview documents={record.documents} bucket="cqer-budgetutil_pdf" />
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl" onClick={() => setSelectedRecord(record)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl text-destructive" onClick={() => setDeleteTarget(record)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-28 text-center text-base text-muted-foreground">
                      No budget utilization records match the current search or filter.
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
            totalItems={filteredRecords.length}
            itemLabel="budget records"
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent showCloseButton={false} className="flex flex-col overflow-hidden fixed inset-0 left-0 top-0 h-[100dvh] w-screen max-w-none sm:max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 shadow-none">
          <BudgetUtilizationForm
            projects={availableProjects}
            onSuccess={handleSaved}
            onClose={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        <DialogContent showCloseButton={false} className="flex flex-col overflow-hidden fixed inset-0 left-0 top-0 h-[100dvh] w-screen max-w-none sm:max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 shadow-none">
          {selectedRecord && (
            <BudgetUtilizationForm
              record={selectedRecord}
              projects={projects}
              onSuccess={() => setSelectedRecord(null)}
              onClose={() => setSelectedRecord(null)}
              isViewOnly
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>Budget utilization saved</DialogTitle>
            <DialogDescription>
              The monthly breakdown was saved successfully and is now locked for viewing only.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>Delete budget utilization</DialogTitle>
            <DialogDescription>
              This will permanently remove <span className="font-medium text-foreground">{deleteTarget?.project_title}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" className="rounded-xl" onClick={() => void handleDelete()}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
