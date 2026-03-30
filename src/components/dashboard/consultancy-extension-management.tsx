"use client";

import * as React from "react";
import {
  BriefcaseBusiness,
  Eye,
  FileDown,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { ConsultancyExtensionForm } from "./consultancy-extension-form";
import {
  deleteConsultancyExtension,
  type ConsultancyExtension,
} from "@/lib/actions/consultancy-extension";
import { type Project } from "./projects-table";
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
import { DocumentPreview } from "@/components/dashboard/document-preview";

interface ConsultancyExtensionManagementProps {
  initialExtensions: ConsultancyExtension[];
  assignedProjects: Project[];
  isViewOnly?: boolean;
}

type FilterMode = "all" | "on-going" | "completed" | "with_project" | "without_project";

async function exportExcel(records: ConsultancyExtension[]) {
  const ExcelJSImport = await import("exceljs/dist/exceljs.min.js");
  const ExcelJS = ExcelJSImport?.default ?? ExcelJSImport;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Consultancy");
  const columns = [
    { header: "Title of Consultancy", key: "title", width: 36 },
    { header: "Base Agency / Institute", key: "agency", width: 30 },
    { header: "Nature of Consultancy", key: "nature", width: 30 },
    { header: "Project", key: "project", width: 30 },
    { header: "Category", key: "category", width: 16 },
    { header: "Status", key: "status", width: 16 },
  ];
  sheet.columns = columns.map((column) => ({ key: column.key, width: column.width }));
  sheet.mergeCells("A1:F1");
  sheet.getCell("A1").value = "Consultancy";
  sheet.getCell("A1").font = { bold: true, size: 14 };
  sheet.getCell("A1").alignment = { horizontal: "center" };
  sheet.getRow(2).values = columns.map((column) => column.header);
  sheet.getRow(2).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF159E44" } };
  });
  records.forEach((record) => {
    sheet.addRow({
      title: record.title_of_consultancy,
      agency: record.base_agency_institute,
      nature: record.nature_of_consultancy,
      project: record.related_project_title || "-",
      category: record.category,
      status: record.status,
    });
  });
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `consultancy-${new Date().toISOString().slice(0, 10)}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function exportPdf(records: ConsultancyExtension[]) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFontSize(12);
  doc.text("Consultancy", doc.internal.pageSize.getWidth() / 2, 12, { align: "center" });
  autoTable(doc, {
    startY: 18,
    head: [[
      "Title of Consultancy",
      "Base Agency / Institute",
      "Nature of Consultancy",
      "Project",
      "Category",
      "Status",
    ]],
    body: records.map((record) => ([
      record.title_of_consultancy,
      record.base_agency_institute,
      record.nature_of_consultancy,
      record.related_project_title || "-",
      record.category,
      record.status,
    ])),
    theme: "grid",
    headStyles: { fillColor: [21, 158, 68], textColor: [255, 255, 255], fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" },
  });
  doc.save(`consultancy-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function ConsultancyExtensionManagement({
  initialExtensions,
  assignedProjects,
  isViewOnly = false,
}: ConsultancyExtensionManagementProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [filterMode, setFilterMode] = React.useState<FilterMode>("all");
  const [selectedRecord, setSelectedRecord] = React.useState<ConsultancyExtension | null>(null);
  const [editingRecord, setEditingRecord] = React.useState<ConsultancyExtension | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<ConsultancyExtension | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [successOpen, setSuccessOpen] = React.useState(false);

  const filteredRecords = React.useMemo(() => {
    return initialExtensions.filter((record) => {
      const haystack = [
        record.title_of_consultancy,
        record.base_agency_institute,
        record.nature_of_consultancy,
        record.related_project_title || "",
        record.category,
        record.status,
      ]
        .join(" ")
        .toLowerCase();

      if (searchTerm && !haystack.includes(searchTerm.toLowerCase())) return false;
      if (filterMode === "on-going" && record.status !== "On-going") return false;
      if (filterMode === "completed" && record.status !== "Completed") return false;
      if (filterMode === "with_project" && !record.related_project_id) return false;
      if (filterMode === "without_project" && record.related_project_id) return false;
      return true;
    });
  }, [filterMode, initialExtensions, searchTerm]);

  const handleSaved = () => {
    setCreateOpen(false);
    setSelectedRecord(null);
    setEditingRecord(null);
    setSuccessOpen(true);
    router.refresh();
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    const result = await deleteConsultancyExtension(deleteTarget.id);
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
              <CardTitle className="text-xl font-semibold">Consultancy</CardTitle>
              <CardDescription className="text-sm">
                Search, filter, review, and manage consultancy records in one place.
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
              {!isViewOnly && (
                <Button className="rounded-xl bg-[#159E44] text-white hover:bg-[#128A3B]" onClick={() => setCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Consultancy
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full max-w-xl">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search title, base agency, project, category, or status..."
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
                  All consultancy
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={filterMode === "on-going"} onCheckedChange={() => setFilterMode("on-going")}>
                  On-going only
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={filterMode === "completed"} onCheckedChange={() => setFilterMode("completed")}>
                  Completed only
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={filterMode === "with_project"} onCheckedChange={() => setFilterMode("with_project")}>
                  Linked to project
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={filterMode === "without_project"} onCheckedChange={() => setFilterMode("without_project")}>
                  Not linked to project
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
                  <TableHead className="h-12 text-base font-semibold">Title of Consultancy</TableHead>
                  <TableHead className="h-12 text-base font-semibold">Base Agency / Institute</TableHead>
                  <TableHead className="h-12 text-base font-semibold">Nature of Consultancy</TableHead>
                  <TableHead className="h-12 text-base font-semibold">Project</TableHead>
                  <TableHead className="h-12 text-base font-semibold">Category</TableHead>
                  <TableHead className="h-12 text-base font-semibold">Status</TableHead>
                  <TableHead className="h-12 text-base font-semibold">Documents</TableHead>
                  <TableHead className="h-12 text-right text-base font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length > 0 ? (
                  filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="py-4 text-base font-medium">{record.title_of_consultancy}</TableCell>
                      <TableCell className="py-4 text-base">{record.base_agency_institute}</TableCell>
                      <TableCell className="py-4 text-base">{record.nature_of_consultancy}</TableCell>
                      <TableCell className="py-4 text-base">{record.related_project_title || "-"}</TableCell>
                      <TableCell className="py-4 text-base">{record.category}</TableCell>
                      <TableCell className="py-4 text-base">{record.status}</TableCell>
                      <TableCell className="py-4 text-sm">
                        <DocumentPreview documents={record.documents} bucket="cqer-consultancy_pdf" />
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl" onClick={() => setSelectedRecord(record)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!isViewOnly && (
                            <>
                              <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl" onClick={() => setEditingRecord(record)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl text-destructive" onClick={() => setDeleteTarget(record)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-28 text-center text-base text-muted-foreground">
                      No consultancy records match the current search or filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent showCloseButton={false} className="flex flex-col overflow-hidden fixed inset-0 left-0 top-0 h-[100dvh] w-screen max-w-none sm:max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 shadow-none">
          <ConsultancyExtensionForm
            assignedProjects={assignedProjects}
            onSuccess={handleSaved}
            onClose={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        <DialogContent showCloseButton={false} className="flex flex-col overflow-hidden fixed inset-0 left-0 top-0 h-[100dvh] w-screen max-w-none sm:max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 shadow-none">
          {selectedRecord && (
            <ConsultancyExtensionForm
              initialData={selectedRecord}
              assignedProjects={assignedProjects}
              isViewOnly
              onSuccess={() => setSelectedRecord(null)}
              onClose={() => setSelectedRecord(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingRecord} onOpenChange={(open) => !open && setEditingRecord(null)}>
        <DialogContent showCloseButton={false} className="flex flex-col overflow-hidden fixed inset-0 left-0 top-0 h-[100dvh] w-screen max-w-none sm:max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 shadow-none">
          {editingRecord && (
            <ConsultancyExtensionForm
              initialData={editingRecord}
              assignedProjects={assignedProjects}
              onSuccess={handleSaved}
              onClose={() => setEditingRecord(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>Consultancy saved</DialogTitle>
            <DialogDescription>
              The consultancy record was saved successfully and the table has been refreshed.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>Delete consultancy</DialogTitle>
            <DialogDescription>
              This will permanently remove{" "}
              <span className="font-medium text-foreground">{deleteTarget?.title_of_consultancy}</span>.
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
