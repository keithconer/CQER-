"use client";

import * as React from "react";
import { Eye, Pencil, Plus, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

import { type Project } from "./projects-table";
import { TechnologiesInnovationsCommercializedForm } from "./technologies-innovations-commercialized-form";
import {
  deleteTechnologyCommercialization,
  type TechnologyCommercializationRecord,
} from "@/lib/actions/technologies-innovations-commercialized";
import { DocumentPreview } from "@/components/dashboard/document-preview";
import { ExportPreviewMenu, type ExportPreviewColumn } from "@/components/dashboard/export-preview-menu";
import { RecordPagination, useRecordPagination } from "@/components/dashboard/record-pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

interface TechnologiesInnovationsCommercializedManagementProps {
  initialRecords: TechnologyCommercializationRecord[];
  projects: Project[];
}

type FilterMode = "all" | "with_project" | "without_project" | "commercialized";

const exportColumns = [
  { key: "technologyName", label: "Name of the Technology" },
  { key: "yearDeveloped", label: "Year Developed" },
  { key: "technologyGenerator", label: "Technology Generator" },
  { key: "project", label: "Project" },
  { key: "status", label: "Status" },
] satisfies ExportPreviewColumn[];

function buildExportRows(records: TechnologyCommercializationRecord[]) {
  return records.map((record) => ({
    technologyName: record.technology_name,
    yearDeveloped: record.year_developed ? format(new Date(record.year_developed), "MMM d, yyyy") : "-",
    technologyGenerator: record.technology_generator,
    project: record.related_project_title || "-",
    status: record.status,
  }));
}

async function exportExcel(records: TechnologyCommercializationRecord[]) {
  const ExcelJSImport = await import("exceljs/dist/exceljs.min.js");
  const ExcelJS = ExcelJSImport?.default ?? ExcelJSImport;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Technologies / Innovations Commercialized");
  const columns = [
    { header: "Name of the Technology", key: "technology_name", width: 34 },
    { header: "Year Developed", key: "year_developed", width: 18 },
    { header: "Technology Generator", key: "technology_generator", width: 26 },
    { header: "Project", key: "project", width: 30 },
    { header: "Status", key: "status", width: 32 },
  ];
  sheet.columns = columns.map((column) => ({ key: column.key, width: column.width }));
  sheet.mergeCells("A1:E1");
  sheet.getCell("A1").value = "Technologies / Innovations Commercialized";
  sheet.getCell("A1").font = { bold: true, size: 14 };
  sheet.getCell("A1").alignment = { horizontal: "center" };
  sheet.getRow(2).values = columns.map((column) => column.header);
  sheet.getRow(2).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF159E44" } };
  });
  records.forEach((record) => {
    sheet.addRow({
      technology_name: record.technology_name,
      year_developed: record.year_developed ? format(new Date(record.year_developed), "MMM d, yyyy") : "-",
      technology_generator: record.technology_generator,
      project: record.related_project_title || "-",
      status: record.status,
    });
  });
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `technologies-innovations-commercialized-${new Date().toISOString().slice(0, 10)}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function exportPdf(records: TechnologyCommercializationRecord[]) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFontSize(12);
  doc.text("Technologies / Innovations Commercialized", doc.internal.pageSize.getWidth() / 2, 12, { align: "center" });
  autoTable(doc, {
    startY: 18,
    head: [["Name of the Technology", "Year Developed", "Technology Generator", "Project", "Status"]],
    body: records.map((record) => ([
      record.technology_name,
      record.year_developed ? format(new Date(record.year_developed), "MMM d, yyyy") : "-",
      record.technology_generator,
      record.related_project_title || "-",
      record.status,
    ])),
    theme: "grid",
    headStyles: { fillColor: [21, 158, 68], textColor: [255, 255, 255], fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" },
  });
  doc.save(`technologies-innovations-commercialized-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function TechnologiesInnovationsCommercializedManagement({
  initialRecords,
  projects,
}: TechnologiesInnovationsCommercializedManagementProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [filterMode, setFilterMode] = React.useState<FilterMode>("all");
  const [selectedRecord, setSelectedRecord] = React.useState<TechnologyCommercializationRecord | null>(null);
  const [editingRecord, setEditingRecord] = React.useState<TechnologyCommercializationRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<TechnologyCommercializationRecord | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [successOpen, setSuccessOpen] = React.useState(false);

  const filteredRecords = React.useMemo(() => {
    return initialRecords.filter((record) => {
      const haystack = [
        record.technology_name,
        record.technology_generator,
        record.related_project_title || "",
        record.status,
      ].join(" ").toLowerCase();
      if (searchTerm && !haystack.includes(searchTerm.toLowerCase())) return false;
      if (filterMode === "with_project" && !record.related_project_id) return false;
      if (filterMode === "without_project" && record.related_project_id) return false;
      if (filterMode === "commercialized" && record.status !== "commercialized") return false;
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
    const result = await deleteTechnologyCommercialization(deleteTarget.id);
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
              <CardTitle className="text-xl font-semibold">Technologies / Innovations Commercialized</CardTitle>
              <CardDescription className="text-sm">
                Search, filter, export, and manage technologies / innovations commercialized records in one place.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <ExportPreviewMenu
                title="Technologies / Innovations Commercialized"
                description="Preview the filtered technologies or innovations commercialized records before exporting them."
                columns={exportColumns}
                rows={buildExportRows(filteredRecords)}
                onDownloadExcel={() => exportExcel(filteredRecords)}
                onDownloadPdf={() => exportPdf(filteredRecords)}
                triggerClassName="rounded-xl"
              />
              <Button className="rounded-xl bg-[#159E44] text-white hover:bg-[#128A3B]" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Technology
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full max-w-xl">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search technology, generator, project, or status..."
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
                <DropdownMenuCheckboxItem checked={filterMode === "commercialized"} onCheckedChange={() => setFilterMode("commercialized")}>
                  Commercialized only
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
                  <TableHead className="h-12 text-base font-semibold">Name of the Technology</TableHead>
                  <TableHead className="h-12 text-base font-semibold">Year Developed</TableHead>
                  <TableHead className="h-12 text-base font-semibold">Technology Generator</TableHead>
                  <TableHead className="h-12 text-base font-semibold">Project</TableHead>
                  <TableHead className="h-12 text-base font-semibold">Status</TableHead>
                  <TableHead className="h-12 text-base font-semibold">Documents</TableHead>
                  <TableHead className="h-12 text-right text-base font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length > 0 ? (
                  paginatedRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="py-4 text-base font-medium">{record.technology_name}</TableCell>
                      <TableCell className="py-4 text-base">{record.year_developed ? format(new Date(record.year_developed), "MMM d, yyyy") : "-"}</TableCell>
                      <TableCell className="py-4 text-base">{record.technology_generator}</TableCell>
                      <TableCell className="py-4 text-base">{record.related_project_title || "-"}</TableCell>
                      <TableCell className="py-4 text-base">{record.status}</TableCell>
                      <TableCell className="py-4 text-sm">
                        <DocumentPreview documents={record.documents} bucket="cqer-technologies_pdf" />
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
                      No technologies / innovations commercialized records match the current search or filter.
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
            itemLabel="technology records"
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent showCloseButton={false} className="flex flex-col overflow-hidden fixed inset-0 left-0 top-0 h-[100dvh] w-screen max-w-none sm:max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 shadow-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Create Technologies / Innovations Commercialized</DialogTitle>
            <DialogDescription>Create a new technologies / innovations commercialized record.</DialogDescription>
          </DialogHeader>
          <TechnologiesInnovationsCommercializedForm projects={projects} onSuccess={handleSaved} onClose={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        <DialogContent showCloseButton={false} className="flex flex-col overflow-hidden fixed inset-0 left-0 top-0 h-[100dvh] w-screen max-w-none sm:max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 shadow-none">
          <DialogHeader className="sr-only">
            <DialogTitle>View Technologies / Innovations Commercialized</DialogTitle>
            <DialogDescription>View the selected technologies / innovations commercialized record.</DialogDescription>
          </DialogHeader>
          {selectedRecord && (
            <TechnologiesInnovationsCommercializedForm projects={projects} initialData={selectedRecord} isViewOnly onSuccess={() => setSelectedRecord(null)} onClose={() => setSelectedRecord(null)} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingRecord} onOpenChange={(open) => !open && setEditingRecord(null)}>
        <DialogContent showCloseButton={false} className="flex flex-col overflow-hidden fixed inset-0 left-0 top-0 h-[100dvh] w-screen max-w-none sm:max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 shadow-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Update Technologies / Innovations Commercialized</DialogTitle>
            <DialogDescription>Update the selected technologies / innovations commercialized record.</DialogDescription>
          </DialogHeader>
          {editingRecord && (
            <TechnologiesInnovationsCommercializedForm projects={projects} initialData={editingRecord} onSuccess={handleSaved} onClose={() => setEditingRecord(null)} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>Technology saved</DialogTitle>
            <DialogDescription>
              The technologies / innovations commercialized record was saved successfully and the table has been refreshed.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>Delete technology</DialogTitle>
            <DialogDescription>
              This will permanently remove <span className="font-medium text-foreground">{deleteTarget?.technology_name}</span>.
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
