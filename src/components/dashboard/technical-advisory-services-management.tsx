"use client";

import * as React from "react";
import {
  Briefcase,
  Eye,
  FileDown,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RecordPagination, useRecordPagination } from "@/components/dashboard/record-pagination";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DocumentPreview } from "@/components/dashboard/document-preview";
import {
  deleteTechnicalAdvisoryService,
  type RatingBreakdown,
  type TechnicalAdvisoryServiceRecord,
} from "@/lib/actions/technical-advisory-services";
import { TechnicalAdvisoryServicesForm } from "./technical-advisory-services-form";

interface TechnicalAdvisoryServicesManagementProps {
  initialRecords: TechnicalAdvisoryServiceRecord[];
}

type FilterMode = "all" | "internal" | "external" | "with_documents";

function sumBreakdown(breakdown: RatingBreakdown) {
  return Number(breakdown["5"] || 0) + Number(breakdown["4"] || 0) + Number(breakdown["3"] || 0) + Number(breakdown["2"] || 0) + Number(breakdown["1"] || 0);
}

function getGrandTotal(record: TechnicalAdvisoryServiceRecord) {
  return (
    sumBreakdown(record.rating_relevance_breakdown) +
    sumBreakdown(record.rating_quality_breakdown) +
    sumBreakdown(record.rating_timeliness_breakdown) +
    sumBreakdown(record.rating_overall_breakdown)
  );
}

async function exportExcel(records: TechnicalAdvisoryServiceRecord[]) {
  const ExcelJSImport = await import("exceljs/dist/exceljs.min.js");
  const ExcelJS = ExcelJSImport?.default ?? ExcelJSImport;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Technical Advisory");
  const columns = [
    { header: "Agency Name", key: "agency_name", width: 28 },
    { header: "Category", key: "category", width: 16 },
    { header: "Date", key: "advisory_date", width: 18 },
    { header: "Venue", key: "venue", width: 24 },
    { header: "No. of Hours", key: "number_of_hours", width: 16 },
    { header: "Clients", key: "clients", width: 18 },
    { header: "Faculty Members", key: "faculty_members", width: 28 },
    { header: "Grand Total Ratings", key: "grand_total", width: 20 },
  ];
  sheet.columns = columns.map((column) => ({ key: column.key, width: column.width }));
  sheet.mergeCells("A1:H1");
  sheet.getCell("A1").value = "Technical Advisory";
  sheet.getCell("A1").font = { bold: true, size: 14 };
  sheet.getCell("A1").alignment = { horizontal: "center" };
  sheet.getRow(2).values = columns.map((column) => column.header);
  sheet.getRow(2).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF159E44" } };
  });
  records.forEach((record) => {
    sheet.addRow({
      agency_name: record.agency_name,
      category: record.category,
      advisory_date: record.advisory_date ? format(new Date(record.advisory_date), "MMM d, yyyy") : "-",
      venue: record.venue,
      number_of_hours: record.number_of_hours,
      clients: record.clients.length,
      faculty_members: record.faculty_members.map((item) => item.name).join(", "),
      grand_total: getGrandTotal(record),
    });
  });
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `technical-advisory-${new Date().toISOString().slice(0, 10)}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function exportPdf(records: TechnicalAdvisoryServiceRecord[]) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFontSize(12);
  doc.text("Technical Advisory", doc.internal.pageSize.getWidth() / 2, 12, { align: "center" });
  autoTable(doc, {
    startY: 18,
    head: [[
      "Agency Name",
      "Category",
      "Date",
      "Venue",
      "No. of Hours",
      "Clients",
      "Faculty Members",
      "Grand Total Ratings",
    ]],
    body: records.map((record) => ([
      record.agency_name,
      record.category,
      record.advisory_date ? format(new Date(record.advisory_date), "MMM d, yyyy") : "-",
      record.venue,
      record.number_of_hours,
      record.clients.length,
      record.faculty_members.map((item) => item.name).join(", "),
      getGrandTotal(record),
    ])),
    theme: "grid",
    headStyles: { fillColor: [21, 158, 68], textColor: [255, 255, 255], fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" },
  });
  doc.save(`technical-advisory-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function TechnicalAdvisoryServicesManagement({
  initialRecords,
}: TechnicalAdvisoryServicesManagementProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [filterMode, setFilterMode] = React.useState<FilterMode>("all");
  const [selectedRecord, setSelectedRecord] = React.useState<TechnicalAdvisoryServiceRecord | null>(null);
  const [editingRecord, setEditingRecord] = React.useState<TechnicalAdvisoryServiceRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<TechnicalAdvisoryServiceRecord | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [successOpen, setSuccessOpen] = React.useState(false);

  const filteredRecords = React.useMemo(() => {
    return initialRecords.filter((record) => {
      const haystack = [
        record.agency_name,
        record.agency_address,
        record.venue,
        record.category,
        record.clients.map((client) => client.name).join(" "),
        record.faculty_members.map((member) => member.name).join(" "),
      ].join(" ").toLowerCase();

      if (searchTerm && !haystack.includes(searchTerm.toLowerCase())) return false;
      if (filterMode === "internal" && record.category !== "internal") return false;
      if (filterMode === "external" && record.category !== "external") return false;
      if (filterMode === "with_documents" && record.documents.length === 0) return false;
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
    const result = await deleteTechnicalAdvisoryService(deleteTarget.id);
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
              <CardTitle className="text-xl font-semibold">Technical Advisory</CardTitle>
              <CardDescription className="text-sm">
                Search, filter, export, and manage technical advisory records in one place.
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
                Create Technical Advisory
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full max-w-xl">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search agency, address, venue, client, or faculty member..."
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
                <DropdownMenuCheckboxItem checked={filterMode === "internal"} onCheckedChange={() => setFilterMode("internal")}>
                  Internal only
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={filterMode === "external"} onCheckedChange={() => setFilterMode("external")}>
                  External only
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={filterMode === "with_documents"} onCheckedChange={() => setFilterMode("with_documents")}>
                  With documents only
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
                  <TableHead className="h-12 text-base font-semibold">Agency Name</TableHead>
                  <TableHead className="h-12 text-base font-semibold">Category</TableHead>
                  <TableHead className="h-12 text-base font-semibold">Date</TableHead>
                  <TableHead className="h-12 text-base font-semibold">Venue</TableHead>
                  <TableHead className="h-12 text-base font-semibold">Clients</TableHead>
                  <TableHead className="h-12 text-base font-semibold">Faculty Members</TableHead>
                  <TableHead className="h-12 text-base font-semibold">Documents</TableHead>
                  <TableHead className="h-12 text-right text-base font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length > 0 ? (
                  paginatedRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="py-4 text-base font-medium">{record.agency_name}</TableCell>
                      <TableCell className="py-4 text-base capitalize">{record.category}</TableCell>
                      <TableCell className="py-4 text-base">
                        {record.advisory_date ? format(new Date(record.advisory_date), "MMM d, yyyy") : "-"}
                      </TableCell>
                      <TableCell className="py-4 text-base">{record.venue}</TableCell>
                      <TableCell className="py-4 text-base">{record.clients.length}</TableCell>
                      <TableCell className="py-4 text-base">
                        {record.faculty_members.map((member) => member.name).join(", ") || "-"}
                      </TableCell>
                      <TableCell className="py-4 text-sm">
                        <DocumentPreview documents={record.documents} bucket="cqer-technicaladv_pdf" />
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
                      No technical advisory records match the current search or filter.
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
            itemLabel="technical advisory records"
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent showCloseButton={false} className="flex flex-col overflow-hidden fixed inset-0 left-0 top-0 h-[100dvh] w-screen max-w-none sm:max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 shadow-none">
          <TechnicalAdvisoryServicesForm onSuccess={handleSaved} onClose={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        <DialogContent showCloseButton={false} className="flex flex-col overflow-hidden fixed inset-0 left-0 top-0 h-[100dvh] w-screen max-w-none sm:max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 shadow-none">
          {selectedRecord && (
            <TechnicalAdvisoryServicesForm initialData={selectedRecord} isViewOnly onSuccess={() => setSelectedRecord(null)} onClose={() => setSelectedRecord(null)} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingRecord} onOpenChange={(open) => !open && setEditingRecord(null)}>
        <DialogContent showCloseButton={false} className="flex flex-col overflow-hidden fixed inset-0 left-0 top-0 h-[100dvh] w-screen max-w-none sm:max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 shadow-none">
          {editingRecord && (
            <TechnicalAdvisoryServicesForm initialData={editingRecord} onSuccess={handleSaved} onClose={() => setEditingRecord(null)} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>Technical advisory saved</DialogTitle>
            <DialogDescription>
              The technical advisory record was saved successfully and the table has been refreshed.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>Delete technical advisory</DialogTitle>
            <DialogDescription>
              This will permanently remove <span className="font-medium text-foreground">{deleteTarget?.agency_name}</span>.
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
