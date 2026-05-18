"use client";

import * as React from "react";
import { CalendarDays, ClipboardList, Eye, Pencil, Plus, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

import { OtherActivitiesForm } from "@/components/dashboard/other-activities-form";
import { DocumentPreview } from "@/components/dashboard/document-preview";
import { ExportPreviewMenu, type ExportPreviewColumn } from "@/components/dashboard/export-preview-menu";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreatorIndicator } from "@/components/dashboard/creator-indicator";
import {
  deleteOtherActivity,
  type OtherActivityRecord,
} from "@/lib/actions/other-activities";

type FilterMode = "all" | "with_documents" | "this_year" | "external_fund";

interface OtherActivitiesManagementProps {
  records: OtherActivityRecord[];
}

function getDateLabel(record: OtherActivityRecord) {
  return record.activity_date ? format(new Date(record.activity_date), "MMM d, yyyy") : "-";
}

const exportColumns = [
  { key: "date", label: "Date" },
  { key: "activity", label: "Activity" },
  { key: "category", label: "Category" },
  { key: "participants", label: "Participants" },
  { key: "budget", label: "Budget Involved", align: "right" },
  { key: "fund", label: "Source of Fund" },
] satisfies ExportPreviewColumn[];

function buildExportRows(records: OtherActivityRecord[]) {
  return records.map((record) => ({
    date: getDateLabel(record),
    activity: record.activity_title,
    category: record.category,
    participants: record.participants,
    budget: Number(record.budget_involved || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    fund: record.source_of_fund === "Others" ? `Others: ${record.source_of_fund_other || "-"}` : record.source_of_fund,
  }));
}

async function exportExcel(records: OtherActivityRecord[]) {
  const ExcelJSImport = await import("exceljs/dist/exceljs.min.js");
  const ExcelJS = ExcelJSImport?.default ?? ExcelJSImport;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Other Activities");
  const columns = [
    { header: "Date", key: "date", width: 18 },
    { header: "Activity", key: "activity", width: 36 },
    { header: "Category", key: "category", width: 28 },
    { header: "Participants", key: "participants", width: 24 },
    { header: "Budget Involved", key: "budget", width: 18 },
    { header: "Source of Fund", key: "fund", width: 24 },
  ];
  sheet.columns = columns.map((column) => ({ key: column.key, width: column.width }));
  sheet.mergeCells("A1:F1");
  sheet.getCell("A1").value = "Other Activities";
  sheet.getCell("A1").font = { bold: true, size: 14 };
  sheet.getCell("A1").alignment = { horizontal: "center" };
  sheet.getRow(2).values = columns.map((column) => column.header);
  sheet.getRow(2).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF159E44" } };
  });
  records.forEach((record) => {
    sheet.addRow({
      date: getDateLabel(record),
      activity: record.activity_title,
      category: record.category,
      participants: record.participants,
      budget: Number(record.budget_involved || 0),
      fund: record.source_of_fund === "Others" ? `Others: ${record.source_of_fund_other || "-"}` : record.source_of_fund,
    });
  });
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `other-activities-${new Date().toISOString().slice(0, 10)}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function exportPdf(records: OtherActivityRecord[]) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFontSize(12);
  doc.text("Other Activities", doc.internal.pageSize.getWidth() / 2, 12, { align: "center" });
  autoTable(doc, {
    startY: 18,
    head: [[
      "Date",
      "Activity",
      "Category",
      "Participants",
      "Budget Involved",
      "Source of Fund",
    ]],
    body: records.map((record) => ([
      getDateLabel(record),
      record.activity_title,
      record.category,
      record.participants,
      Number(record.budget_involved || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      record.source_of_fund === "Others" ? `Others: ${record.source_of_fund_other || "-"}` : record.source_of_fund,
    ])),
    theme: "grid",
    headStyles: { fillColor: [21, 158, 68], textColor: [255, 255, 255], fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" },
  });
  doc.save(`other-activities-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function OtherActivitiesManagement({
  records,
}: OtherActivitiesManagementProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [filterMode, setFilterMode] = React.useState<FilterMode>("all");
  const [selectedRecord, setSelectedRecord] = React.useState<OtherActivityRecord | null>(null);
  const [editingRecord, setEditingRecord] = React.useState<OtherActivityRecord | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [successOpen, setSuccessOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<OtherActivityRecord | null>(null);

  const filteredRecords = React.useMemo(() => {
    const year = new Date().getFullYear();
    return records.filter((record) => {
      const haystack = [
        getDateLabel(record),
        record.activity_title,
        record.category,
        record.purpose,
        record.participants,
        record.remarks,
        record.source_of_fund,
        record.source_of_fund_other || "",
      ].join(" ").toLowerCase();

      if (searchTerm && !haystack.includes(searchTerm.toLowerCase())) return false;
      if (filterMode === "with_documents" && (!record.documents || record.documents.length === 0)) return false;
      if (filterMode === "this_year") {
        const dateYear = record.activity_date ? new Date(record.activity_date).getFullYear() : null;
        if (dateYear !== year) return false;
      }
      if (filterMode === "external_fund" && record.source_of_fund !== "External Project Fund") return false;
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
    setEditingRecord(null);
    setSelectedRecord(null);
    setSuccessOpen(true);
    router.refresh();
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    const result = await deleteOtherActivity(deleteTarget.id);
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
              <CardTitle className="text-xl font-semibold">Other Activities</CardTitle>
              <CardDescription className="text-sm">
                Search, filter, export, and manage other activity records in one place.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <ExportPreviewMenu
                title="Other Activities"
                description="Preview the filtered other activity records before exporting them."
                columns={exportColumns}
                rows={buildExportRows(filteredRecords)}
                onDownloadExcel={() => exportExcel(filteredRecords)}
                onDownloadPdf={() => exportPdf(filteredRecords)}
                triggerClassName="rounded-xl"
              />
              <Button className="rounded-xl bg-[#159E44] text-white hover:bg-[#128A3B]" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Manage Other Activities
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full max-w-xl">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search date, activity, category, participants, fund source, or remarks..."
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
                <DropdownMenuCheckboxItem checked={filterMode === "external_fund"} onCheckedChange={() => setFilterMode("external_fund")}>
                  External project fund only
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
                  <TableHead className="h-12 text-base font-semibold">Date</TableHead>
                  <TableHead className="h-12 text-base font-semibold">Created By</TableHead>
                  <TableHead className="h-12 text-base font-semibold">Activity</TableHead>
                  <TableHead className="h-12 text-base font-semibold">Category</TableHead>
                  <TableHead className="h-12 text-base font-semibold">Participants</TableHead>
                  <TableHead className="h-12 text-base font-semibold">Budget</TableHead>
                  <TableHead className="h-12 text-base font-semibold">Documents</TableHead>
                  <TableHead className="h-12 text-right text-base font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length > 0 ? (
                  paginatedRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="py-4 text-base">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-muted-foreground" />
                          <span>{getDateLabel(record)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <CreatorIndicator
                          name={record.created_by_name || record.creator_full_name}
                          avatarUrl={record.created_by_avatar_url || record.creator_avatar_url}
                          role={record.creator_user_type}
                        />
                      </TableCell>
                      <TableCell className="py-4 text-base font-medium">
                        <div className="flex items-start gap-2">
                          <ClipboardList className="mt-0.5 h-4 w-4 text-[#159E44]" />
                          <span>{record.activity_title}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-base">{record.category}</TableCell>
                      <TableCell className="py-4 text-base">{record.participants}</TableCell>
                      <TableCell className="py-4 text-base">
                        PHP {Number(record.budget_involved || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="py-4 text-sm">
                        <DocumentPreview documents={record.documents} bucket="cqer-otheract_pdf" />
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl" onClick={() => setSelectedRecord(record)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl" onClick={() => setEditingRecord(record)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl text-destructive" onClick={() => setDeleteTarget(record)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-28 text-center text-base text-muted-foreground">
                      No other activity records match the current search or filter.
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
            itemLabel="activity records"
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent showCloseButton={false} className="flex flex-col overflow-hidden fixed inset-0 left-0 top-0 h-[100dvh] w-screen max-w-none sm:max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 shadow-none">
          <OtherActivitiesForm
            onSuccess={handleSaved}
            onClose={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        <DialogContent showCloseButton={false} className="flex flex-col overflow-hidden fixed inset-0 left-0 top-0 h-[100dvh] w-screen max-w-none sm:max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 shadow-none">
          {selectedRecord && (
            <OtherActivitiesForm
              record={selectedRecord}
              onSuccess={() => setSelectedRecord(null)}
              onClose={() => setSelectedRecord(null)}
              isViewOnly
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingRecord} onOpenChange={(open) => !open && setEditingRecord(null)}>
        <DialogContent showCloseButton={false} className="flex flex-col overflow-hidden fixed inset-0 left-0 top-0 h-[100dvh] w-screen max-w-none sm:max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 shadow-none">
          {editingRecord && (
            <OtherActivitiesForm
              record={editingRecord}
              onSuccess={handleSaved}
              onClose={() => setEditingRecord(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>Other activity saved</DialogTitle>
            <DialogDescription>
              The other activity record was saved successfully and the table has been refreshed.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>Delete other activity</DialogTitle>
            <DialogDescription>
              This will permanently remove <span className="font-medium text-foreground">{deleteTarget?.activity_title}</span>.
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
