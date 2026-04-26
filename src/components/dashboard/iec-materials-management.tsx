"use client";

import * as React from "react";
import { Eye, FileDown, Pencil, Plus, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { type Project } from "./projects-table";
import { IecMaterialsForm } from "./iec-materials-form";
import { deleteIecMaterial, type IecMaterialRecord } from "@/lib/actions/iec-materials";
import { DocumentPreview } from "@/components/dashboard/document-preview";
import { RecordPagination, useRecordPagination } from "@/components/dashboard/record-pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

interface IecMaterialsManagementProps {
  initialRecords: IecMaterialRecord[];
  projects: Project[];
}

type FilterMode = "all" | "with_project" | "without_project" | "with_documents" | "video";

function getSexTotal(record: IecMaterialRecord) {
  return Number(record.male_count || 0) + Number(record.female_count || 0);
}

function getCategoryTotal(record: IecMaterialRecord) {
  return (
    Number(record.student_count || 0) +
    Number(record.farmer_count || 0) +
    Number(record.fisherfolk_count || 0) +
    Number(record.ag_technician_count || 0) +
    Number(record.government_employee_count || 0) +
    Number(record.private_employee_count || 0) +
    Number(record.others_count || 0)
  );
}

function getGrandTotal(record: IecMaterialRecord) {
  return Math.max(getSexTotal(record), getCategoryTotal(record));
}

async function exportExcel(records: IecMaterialRecord[]) {
  const ExcelJSImport = await import("exceljs/dist/exceljs.min.js");
  const ExcelJS = ExcelJSImport?.default ?? ExcelJSImport;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("IEC Materials");
  const columns = [
    { header: "Title", key: "title", width: 34 },
    { header: "Format", key: "format", width: 18 },
    { header: "Project", key: "project", width: 30 },
    { header: "SDGs", key: "sdgs", width: 24 },
    { header: "Thematic Area", key: "thematic_area", width: 30 },
    { header: "Grand Total", key: "grand_total", width: 16 },
  ];
  sheet.columns = columns.map((column) => ({ key: column.key, width: column.width }));
  sheet.mergeCells("A1:F1");
  sheet.getCell("A1").value = "IEC Materials";
  sheet.getCell("A1").font = { bold: true, size: 14 };
  sheet.getCell("A1").alignment = { horizontal: "center" };
  sheet.getRow(2).values = columns.map((column) => column.header);
  sheet.getRow(2).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF159E44" } };
  });
  records.forEach((record) => {
    sheet.addRow({
      title: record.title,
      format: record.format,
      project: record.related_project_title || "-",
      sdgs: record.sdg_goals.join(", "),
      thematic_area: record.thematic_area.join(", "),
      grand_total: getGrandTotal(record),
    });
  });
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `iec-materials-${new Date().toISOString().slice(0, 10)}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function exportPdf(records: IecMaterialRecord[]) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFontSize(12);
  doc.text("IEC Materials", doc.internal.pageSize.getWidth() / 2, 12, { align: "center" });
  autoTable(doc, {
    startY: 18,
    head: [["Title", "Format", "Project", "SDGs", "Thematic Area", "Grand Total"]],
    body: records.map((record) => ([
      record.title,
      record.format,
      record.related_project_title || "-",
      record.sdg_goals.join(", "),
      record.thematic_area.join(", "),
      getGrandTotal(record),
    ])),
    theme: "grid",
    headStyles: { fillColor: [21, 158, 68], textColor: [255, 255, 255], fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" },
  });
  doc.save(`iec-materials-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function IecMaterialsManagement({
  initialRecords,
  projects,
}: IecMaterialsManagementProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [filterMode, setFilterMode] = React.useState<FilterMode>("all");
  const [selectedRecord, setSelectedRecord] = React.useState<IecMaterialRecord | null>(null);
  const [editingRecord, setEditingRecord] = React.useState<IecMaterialRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<IecMaterialRecord | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [successOpen, setSuccessOpen] = React.useState(false);

  const filteredRecords = React.useMemo(() => {
    return initialRecords.filter((record) => {
      const haystack = [
        record.title,
        record.format,
        record.related_project_title || "",
        record.sdg_goals.join(" "),
        record.thematic_area.join(" "),
      ].join(" ").toLowerCase();

      if (searchTerm && !haystack.includes(searchTerm.toLowerCase())) return false;
      if (filterMode === "with_project" && !record.related_project_id) return false;
      if (filterMode === "without_project" && record.related_project_id) return false;
      if (filterMode === "with_documents" && record.documents.length === 0) return false;
      if (filterMode === "video" && record.format !== "video") return false;
      return true;
    });
  }, [filterMode, initialRecords, searchTerm]);
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
    setEditingRecord(null);
    setSuccessOpen(true);
    router.refresh();
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    const result = await deleteIecMaterial(deleteTarget.id);
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
              <CardTitle className="text-xl font-semibold">IEC Materials</CardTitle>
              <CardDescription className="text-sm">
                Search, filter, export, and manage IEC materials records in one place.
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
              <Button className="rounded-xl bg-[#159E44] text-white hover:bg-[#128A3B]" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create IEC Materials
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full max-w-xl">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search title, format, project, SDG, or thematic area..."
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
                <DropdownMenuCheckboxItem checked={filterMode === "with_project"} onCheckedChange={() => setFilterMode("with_project")}>
                  Linked to project
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={filterMode === "without_project"} onCheckedChange={() => setFilterMode("without_project")}>
                  Not linked to project
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={filterMode === "with_documents"} onCheckedChange={() => setFilterMode("with_documents")}>
                  With documents only
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={filterMode === "video"} onCheckedChange={() => setFilterMode("video")}>
                  Video only
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
                  <TableHead className="h-12 text-base font-semibold">Title</TableHead>
                  <TableHead className="h-12 text-base font-semibold">Format</TableHead>
                  <TableHead className="h-12 text-base font-semibold">Project</TableHead>
                  <TableHead className="h-12 text-base font-semibold">SDGs</TableHead>
                  <TableHead className="h-12 text-base font-semibold">Grand Total</TableHead>
                  <TableHead className="h-12 text-base font-semibold">Documents</TableHead>
                  <TableHead className="h-12 text-right text-base font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length > 0 ? (
                  paginatedRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="py-4 text-base font-medium">{record.title}</TableCell>
                      <TableCell className="py-4 text-base capitalize">{record.format}</TableCell>
                      <TableCell className="py-4 text-base">{record.related_project_title || "-"}</TableCell>
                      <TableCell className="py-4 text-sm">{record.sdg_goals.join(", ") || "-"}</TableCell>
                      <TableCell className="py-4 text-base">{getGrandTotal(record)}</TableCell>
                      <TableCell className="py-4 text-sm">
                        <DocumentPreview documents={record.documents} bucket="cqer-iecmat_pdf" />
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
                    <TableCell colSpan={7} className="h-28 text-center text-base text-muted-foreground">
                      No IEC materials records match the current search or filter.
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
            itemLabel="IEC records"
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent showCloseButton={false} className="fixed inset-0 left-0 top-0 flex h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col overflow-hidden rounded-none border-0 p-0 shadow-none sm:max-w-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Create IEC Materials</DialogTitle>
            <DialogDescription>Create a new IEC materials record.</DialogDescription>
          </DialogHeader>
          <IecMaterialsForm projects={projects} onSuccess={handleSaved} onClose={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        <DialogContent showCloseButton={false} className="fixed inset-0 left-0 top-0 flex h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col overflow-hidden rounded-none border-0 p-0 shadow-none sm:max-w-none">
          <DialogHeader className="sr-only">
            <DialogTitle>View IEC Materials</DialogTitle>
            <DialogDescription>View the selected IEC materials record.</DialogDescription>
          </DialogHeader>
          {selectedRecord && (
            <IecMaterialsForm projects={projects} initialData={selectedRecord} isViewOnly onSuccess={() => setSelectedRecord(null)} onClose={() => setSelectedRecord(null)} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingRecord} onOpenChange={(open) => !open && setEditingRecord(null)}>
        <DialogContent showCloseButton={false} className="fixed inset-0 left-0 top-0 flex h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col overflow-hidden rounded-none border-0 p-0 shadow-none sm:max-w-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Update IEC Materials</DialogTitle>
            <DialogDescription>Update the selected IEC materials record.</DialogDescription>
          </DialogHeader>
          {editingRecord && (
            <IecMaterialsForm projects={projects} initialData={editingRecord} onSuccess={handleSaved} onClose={() => setEditingRecord(null)} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>IEC materials saved</DialogTitle>
            <DialogDescription>
              The IEC materials record was saved successfully and the table has been refreshed.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>Delete IEC materials</DialogTitle>
            <DialogDescription>
              This will permanently remove <span className="font-medium text-foreground">{deleteTarget?.title}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" className="rounded-xl" onClick={() => void handleDelete()}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
