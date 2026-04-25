"use client";

import * as React from "react";
import { Eye, FileDown, Pencil, Plus, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

import {
  type TrainingFacultyOption,
  type TrainingProjectOption,
  type TrainingRecord,
  TrainingsForm,
} from "@/components/dashboard/trainings-form";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { deleteTraining } from "@/lib/actions/trainings";
import { DocumentPreview } from "@/components/dashboard/document-preview";

interface TrainingsManagementProps {
  initialRecords: TrainingRecord[];
  department: string | null;
  userType?: "super_admin" | "college_coordinator" | "unit_coordinator" | "extension_office" | "project_leader";
  unit?: string | null;
  unitOptions?: string[];
  partnerAgencyOptions?: string[];
  projectOptions?: TrainingProjectOption[];
  facultyOptions?: TrainingFacultyOption[];
  currentUserId: string;
  currentUserName: string;
  isViewOnly?: boolean;
}

type FilterMode = "all" | "with_documents" | "this_year" | "created_by_me";

function getDateRange(record: TrainingRecord) {
  if (record.conducted_sessions?.length) {
    const totalHours = record.conducted_sessions.reduce((sum, session) => sum + Number(session.hours || 0), 0);
    return `${record.conducted_sessions.length} date(s) • ${totalHours} hour/s`;
  }
  if (record.date_mode === "hours") {
    return `${record.manual_hours || 0} hour/s`;
  }
  if (!record.inclusive_dates || record.inclusive_dates.length === 0) return "-";
  const sorted = [...record.inclusive_dates].sort();
  const start = new Date(sorted[0]);
  const end = new Date(sorted[sorted.length - 1]);
  return start.getTime() === end.getTime()
    ? format(start, "MMM d, yyyy")
    : `${format(start, "MMM d, yyyy")} - ${format(end, "MMM d, yyyy")}`;
}

function getDuration(record: TrainingRecord) {
  if (record.conducted_sessions?.length) {
    return `${record.conducted_sessions.length} day/s`;
  }
  if (record.date_mode === "hours") {
    return `${record.manual_hours || 0} hour/s`;
  }
  return `${record.number_of_days || record.conducted_days_count || record.inclusive_dates?.length || 0} day/s`;
}

function getCategoryLabel(record: TrainingRecord) {
  const categories = record.training_categories?.length ? record.training_categories : [record.training_category];
  const labels = categories.map((value) => {
    if (value === "OTHERS") {
      return record.training_category_other ? `Others: ${record.training_category_other}` : "Others";
    }
    return value;
  });
  return labels.join(", ");
}

async function exportExcel(records: TrainingRecord[]) {
  const ExcelJSImport = await import("exceljs/dist/exceljs.min.js");
  const ExcelJS = ExcelJSImport?.default ?? ExcelJSImport;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Trainings");
  const columns = [
    { header: "Title of Training", key: "title", width: 38 },
    { header: "Project", key: "project", width: 30 },
    { header: "Category", key: "category", width: 18 },
    { header: "Mode", key: "mode", width: 14 },
    { header: "Venue / Platform", key: "venue", width: 24 },
    { header: "Dates / Hours", key: "dates", width: 28 },
    { header: "Participants", key: "participants", width: 16 },
  ];
  sheet.columns = columns.map((column) => ({ key: column.key, width: column.width }));
  sheet.mergeCells("A1:G1");
  sheet.getCell("A1").value = "Trainings";
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
      category: getCategoryLabel(record),
      mode: record.training_mode,
      venue: record.venue_platform,
      dates: getDateRange(record),
      participants: record.participants_overall_total || 0,
    });
  });
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `trainings-${new Date().toISOString().slice(0, 10)}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function exportPdf(records: TrainingRecord[]) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFontSize(12);
  doc.text("Trainings", doc.internal.pageSize.getWidth() / 2, 12, { align: "center" });
  autoTable(doc, {
    startY: 18,
    head: [[
      "Title of Training",
      "Project",
      "Category",
      "Mode",
      "Venue / Platform",
      "Dates / Hours",
      "Participants",
    ]],
    body: records.map((record) => ([
      record.training_title,
      record.related_project_title || "-",
      getCategoryLabel(record),
      record.training_mode,
      record.venue_platform,
      getDateRange(record),
      record.participants_overall_total || 0,
    ])),
    theme: "grid",
    headStyles: { fillColor: [21, 158, 68], textColor: [255, 255, 255], fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" },
  });
  doc.save(`trainings-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function TrainingsManagement({
  initialRecords,
  department,
  userType,
  unit,
  unitOptions = [],
  partnerAgencyOptions = [],
  projectOptions = [],
  facultyOptions = [],
  currentUserId,
  currentUserName,
  isViewOnly = false,
}: TrainingsManagementProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [filterMode, setFilterMode] = React.useState<FilterMode>("all");
  const [selectedRecord, setSelectedRecord] = React.useState<TrainingRecord | null>(null);
  const [editingRecord, setEditingRecord] = React.useState<TrainingRecord | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [successOpen, setSuccessOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<TrainingRecord | null>(null);
  const hideProjectField = userType === "unit_coordinator";

  const filteredRecords = React.useMemo(() => {
    const year = new Date().getFullYear();
    return initialRecords.filter((record) => {
      const haystack = [
        record.training_title,
        record.related_project_title || "",
        record.venue_platform,
        getCategoryLabel(record),
        record.training_category_other || "",
        getDateRange(record),
      ]
        .join(" ")
        .toLowerCase();
      if (searchTerm && !haystack.includes(searchTerm.toLowerCase())) return false;
      if (filterMode === "with_documents" && (!record.documents || record.documents.length === 0)) return false;
      if (filterMode === "created_by_me" && record.created_by !== currentUserId) return false;
      if (filterMode === "this_year") {
        const startDate =
          record.inclusive_dates?.[0] ||
          ((record as TrainingRecord & { created_at?: string | null }).created_at ?? null);
        const startYear = startDate ? new Date(startDate).getFullYear() : null;
        if (startYear !== year) return false;
      }
      return true;
    });
  }, [currentUserId, filterMode, initialRecords, searchTerm]);

  const handleSaved = () => {
    setCreateOpen(false);
    setEditingRecord(null);
    setSelectedRecord(null);
    setSuccessOpen(true);
    router.refresh();
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    const result = await deleteTraining(deleteTarget.id);
    if (result?.error) {
      alert(result.error);
      return;
    }
    setDeleteTarget(null);
    router.refresh();
  };

  const canMutateRecord = React.useCallback(
    (record: TrainingRecord) => !isViewOnly && record.created_by === currentUserId,
    [currentUserId, isViewOnly]
  );

  return (
    <div className="space-y-5">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="space-y-4 pb-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle className="text-xl font-semibold">Trainings</CardTitle>
              <CardDescription className="text-sm">
                Search, filter, export, and manage training records in one place.
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
                <Button className="rounded-xl" onClick={() => setCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Training
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
                placeholder="Search title, project, venue, category, or dates..."
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
                  All trainings
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={filterMode === "with_documents"} onCheckedChange={() => setFilterMode("with_documents")}>
                  With documents only
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={filterMode === "created_by_me"} onCheckedChange={() => setFilterMode("created_by_me")}>
                  Created by me
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={filterMode === "this_year"} onCheckedChange={() => setFilterMode("this_year")}>
                  This year only
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
                  <TableHead className="h-12 text-base font-semibold">Title of Training</TableHead>
                  <TableHead className="h-12 text-base font-semibold">Project</TableHead>
                  <TableHead className="h-12 text-base font-semibold">Category</TableHead>
                  <TableHead className="h-12 text-base font-semibold">Venue / Platform</TableHead>
                  <TableHead className="h-12 text-base font-semibold">Dates / Duration</TableHead>
                  <TableHead className="h-12 text-base font-semibold">Participants</TableHead>
                  <TableHead className="h-12 text-base font-semibold">Documents</TableHead>
                  <TableHead className="h-12 text-right text-base font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length > 0 ? (
                  filteredRecords.map((record) => (
                    <TableRow
                      key={record.id}
                      title={
                        userType === "unit_coordinator" &&
                        record.created_by !== currentUserId &&
                        record.creator_full_name
                          ? `Training is created by: ${record.creator_full_name}`
                          : undefined
                      }
                    >
                      <TableCell className="py-4 text-base font-medium">
                        <div className="flex items-center gap-2">
                          <span>{record.training_title}</span>
                          {userType === "unit_coordinator" && record.created_by !== currentUserId && record.creator_full_name ? (
                            <TooltipProvider delayDuration={150}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="cursor-help text-xs text-muted-foreground underline decoration-dotted underline-offset-4">
                                    coworker
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Training is created by: {record.creator_full_name}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-base">{record.related_project_title || "-"}</TableCell>
                      <TableCell className="py-4 text-base">
                        {getCategoryLabel(record)}
                      </TableCell>
                      <TableCell className="py-4 text-base">{record.venue_platform}</TableCell>
                      <TableCell className="py-4 text-base">
                        <div>{getDateRange(record)}</div>
                        <div className="text-sm text-muted-foreground">{getDuration(record)}</div>
                      </TableCell>
                      <TableCell className="py-4 text-base font-medium">{record.participants_overall_total || 0}</TableCell>
                      <TableCell className="py-4 text-sm"><DocumentPreview documents={record.documents} /></TableCell>
                      <TableCell className="py-4">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl" onClick={() => setSelectedRecord(record)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canMutateRecord(record) && (
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
                      No training records match the current search or filter.
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
          <TrainingsForm
            department={department || ""}
            currentUserName={currentUserName}
            userType={userType}
            unit={unit}
            unitOptions={unitOptions}
            existingPartnerAgencies={partnerAgencyOptions}
            projectOptions={projectOptions}
            facultyOptions={facultyOptions}
            hideProjectField={hideProjectField}
            onSuccess={handleSaved}
            onClose={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        <DialogContent showCloseButton={false} className="flex flex-col overflow-hidden fixed inset-0 left-0 top-0 h-[100dvh] w-screen max-w-none sm:max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 shadow-none">
          {selectedRecord && (
            <TrainingsForm
              department={department || ""}
              currentUserName={currentUserName}
              userType={userType}
              unit={unit}
              unitOptions={unitOptions}
              existingPartnerAgencies={partnerAgencyOptions}
              projectOptions={projectOptions}
              facultyOptions={facultyOptions}
              hideProjectField={hideProjectField}
              record={selectedRecord}
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
            <TrainingsForm
              department={department || ""}
              currentUserName={currentUserName}
              userType={userType}
              unit={unit}
              unitOptions={unitOptions}
              existingPartnerAgencies={partnerAgencyOptions}
              projectOptions={projectOptions}
              facultyOptions={facultyOptions}
              hideProjectField={hideProjectField}
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
            <DialogTitle>Training saved</DialogTitle>
            <DialogDescription>
              The training record was saved successfully and the table has been refreshed.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>Delete training record</DialogTitle>
            <DialogDescription>
              This will permanently remove <span className="font-medium text-foreground">{deleteTarget?.training_title}</span>.
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
