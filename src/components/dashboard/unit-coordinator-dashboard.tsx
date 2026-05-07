"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  BookOpenCheck,
  ChevronRight,
  Filter,
  Layers3,
  Mail,
  Users,
} from "lucide-react";

import { ExportPreviewMenu, type ExportPreviewColumn } from "@/components/dashboard/export-preview-menu";
import { RecordPagination, useRecordPagination } from "@/components/dashboard/record-pagination";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type UnitDashboardCommitteeMember = {
  id: string;
  name: string;
  source: "registered_project_leader" | "unit_account";
  email: string | null;
  designation: string | null;
  employment: string | null;
  userType: string | null;
  unit: string | null;
  department: string | null;
  avatarUrl: string | null;
};

export type UnitDashboardTraining = {
  id: string;
  title: string;
  creatorName: string;
  createdBy: string | null;
  createdAt: string | null;
  venue: string | null;
  participants: number;
  categorySummary: string;
  modeLabel: string;
};

export type UnitDashboardRecord = {
  id: string;
  title: string;
  moduleLabel: string;
  creatorName: string;
  createdAt: string | null;
};

interface UnitCoordinatorDashboardProps {
  currentUserId: string;
  scopeLabel: string;
  committeeMembers: UnitDashboardCommitteeMember[];
  trainings: UnitDashboardTraining[];
  records: UnitDashboardRecord[];
}

type ActiveDialog = "committee" | "trainings" | null;
type CommitteeFilter = "all" | "registered_project_leaders" | "unit_accounts";

function formatDate(value: string | null) {
  if (!value) return "No date";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "No date" : format(parsed, "MMM d, yyyy");
}

function formatRole(value: string | null) {
  if (!value) return "Member";
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getCommitteeSourceLabel(source: UnitDashboardCommitteeMember["source"]) {
  return source === "registered_project_leader" ? "Registered project leader" : "Unit account";
}

async function exportTrainingsExcel(trainings: UnitDashboardTraining[]) {
  const ExcelJSImport = await import("exceljs/dist/exceljs.min.js");
  const ExcelJS = ExcelJSImport?.default ?? ExcelJSImport;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Unit Trainings");
  const columns = [
    { header: "Training Title", key: "title", width: 45 },
    { header: "Category", key: "category", width: 35 },
    { header: "Mode", key: "mode", width: 20 },
    { header: "Participants", key: "participants", width: 15 },
    { header: "Venue/Platform", key: "venue", width: 30 },
    { header: "Created By", key: "createdBy", width: 25 },
    { header: "Created At", key: "createdAt", width: 20 },
  ];
  sheet.columns = columns.map((column) => ({ key: column.key, width: column.width }));
  sheet.mergeCells("A1:G1");
  sheet.getCell("A1").value = "Unit Training Records";
  sheet.getCell("A1").font = { bold: true, size: 14 };
  sheet.getCell("A1").alignment = { horizontal: "center" };
  sheet.getRow(2).values = columns.map((column) => column.header);
  sheet.getRow(2).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF159E44" } };
  });
  trainings.forEach((training) => {
    sheet.addRow({
      title: training.title,
      category: training.categorySummary,
      mode: training.modeLabel,
      participants: training.participants,
      venue: training.venue || "-",
      createdBy: training.creatorName,
      createdAt: training.createdAt ? format(new Date(training.createdAt), "yyyy-MM-dd") : "-",
    });
  });
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `unit-trainings-${new Date().toISOString().slice(0, 10)}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function exportTrainingsPdf(trainings: UnitDashboardTraining[]) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFontSize(12);
  doc.text("Unit Training Container", doc.internal.pageSize.getWidth() / 2, 12, { align: "center" });
  autoTable(doc, {
    startY: 18,
    head: [["Training Title", "Category", "Mode", "Participants", "Venue", "Created By"]],
    body: trainings.map((training) => [
      training.title,
      training.categorySummary,
      training.modeLabel,
      training.participants,
      training.venue || "-",
      training.creatorName,
    ]),
    theme: "grid",
    headStyles: { fillColor: [21, 158, 68], textColor: [255, 255, 255], fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" },
  });
  doc.save(`unit-trainings-${new Date().toISOString().slice(0, 10)}.pdf`);
}

async function exportCommitteeExcel(records: UnitDashboardCommitteeMember[]) {
  const ExcelJSImport = await import("exceljs/dist/exceljs.min.js");
  const ExcelJS = ExcelJSImport?.default ?? ExcelJSImport;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Committee");
  const columns = [
    { header: "Name", key: "name", width: 28 },
    { header: "Source", key: "source", width: 24 },
    { header: "Designation", key: "designation", width: 28 },
    { header: "Email", key: "email", width: 32 },
    { header: "Role", key: "role", width: 22 },
    { header: "Unit", key: "unit", width: 24 },
  ];
  sheet.columns = columns.map((column) => ({ key: column.key, width: column.width }));
  sheet.mergeCells("A1:F1");
  sheet.getCell("A1").value = "Unit Committee";
  sheet.getCell("A1").font = { bold: true, size: 14 };
  sheet.getCell("A1").alignment = { horizontal: "center" };
  sheet.getRow(2).values = columns.map((column) => column.header);
  sheet.getRow(2).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF159E44" } };
  });
  records.forEach((record) => {
    sheet.addRow({
      name: record.name,
      source: getCommitteeSourceLabel(record.source),
      designation: record.designation || "-",
      email: record.email || "-",
      role: formatRole(record.userType),
      unit: record.unit || "-",
    });
  });
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `unit-committee-${new Date().toISOString().slice(0, 10)}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function exportCommitteePdf(records: UnitDashboardCommitteeMember[]) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFontSize(12);
  doc.text("Unit Committee", doc.internal.pageSize.getWidth() / 2, 12, { align: "center" });
  autoTable(doc, {
    startY: 18,
    head: [["Name", "Source", "Designation", "Email", "Role", "Unit"]],
    body: records.map((record) => [
      record.name,
      getCommitteeSourceLabel(record.source),
      record.designation || "-",
      record.email || "-",
      formatRole(record.userType),
      record.unit || "-",
    ]),
    theme: "grid",
    headStyles: { fillColor: [21, 158, 68], textColor: [255, 255, 255], fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" },
  });
  doc.save(`unit-committee-${new Date().toISOString().slice(0, 10)}.pdf`);
}

const trainingExportColumns = [
  { key: "title", label: "Training Title" },
  { key: "category", label: "Category" },
  { key: "mode", label: "Mode" },
  { key: "participants", label: "Participants", align: "right" },
  { key: "venue", label: "Venue/Platform" },
  { key: "createdBy", label: "Created By" },
  { key: "createdAt", label: "Created At" },
] satisfies ExportPreviewColumn[];

const committeeExportColumns = [
  { key: "name", label: "Name" },
  { key: "source", label: "Source" },
  { key: "designation", label: "Designation" },
  { key: "email", label: "Email" },
  { key: "role", label: "Role" },
  { key: "unit", label: "Unit" },
] satisfies ExportPreviewColumn[];

function buildTrainingExportRows(records: UnitDashboardTraining[]) {
  return records.map((training) => ({
    title: training.title,
    category: training.categorySummary,
    mode: training.modeLabel,
    participants: String(training.participants),
    venue: training.venue || "-",
    createdBy: training.creatorName,
    createdAt: training.createdAt ? format(new Date(training.createdAt), "yyyy-MM-dd") : "-",
  }));
}

function buildCommitteeExportRows(records: UnitDashboardCommitteeMember[]) {
  return records.map((record) => ({
    name: record.name,
    source: getCommitteeSourceLabel(record.source),
    designation: record.designation || "-",
    email: record.email || "-",
    role: formatRole(record.userType),
    unit: record.unit || "-",
  }));
}

function OverviewCard({
  title,
  description,
  value,
  icon: Icon,
  onClick,
}: {
  title: string;
  description: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
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
        <ChevronRight className="mt-1 h-4 w-4 text-muted-foreground" />
      </div>
    </button>
  );
}

export function UnitCoordinatorDashboard({
  scopeLabel,
  committeeMembers,
  trainings,
  records,
}: UnitCoordinatorDashboardProps) {
  const [activeDialog, setActiveDialog] = React.useState<ActiveDialog>(null);
  const [trainingSearch, setTrainingSearch] = React.useState("");
  const [committeeSearch, setCommitteeSearch] = React.useState("");
  const [committeeFilter, setCommitteeFilter] = React.useState<CommitteeFilter>("all");
  const [recordsPage, setRecordsPage] = React.useState(1);

  const filteredTrainings = React.useMemo(() => {
    const query = trainingSearch.trim().toLowerCase();
    return trainings.filter((training) => {
      const haystack = [
        training.title,
        training.categorySummary,
        training.modeLabel,
        training.venue || "",
        training.creatorName,
      ]
        .join(" ")
        .toLowerCase();
      if (query && !haystack.includes(query)) return false;
      return true;
    });
  }, [trainingSearch, trainings]);

  const filteredCommitteeMembers = React.useMemo(() => {
    const query = committeeSearch.trim().toLowerCase();
    return committeeMembers.filter((member) => {
      const haystack = [
        member.name,
        member.designation || "",
        member.email || "",
        member.unit || "",
        member.department || "",
        formatRole(member.userType),
      ]
        .join(" ")
        .toLowerCase();
      if (query && !haystack.includes(query)) return false;
      if (committeeFilter === "registered_project_leaders" && member.source !== "registered_project_leader") return false;
      if (committeeFilter === "unit_accounts" && member.source !== "unit_account") return false;
      return true;
    });
  }, [committeeFilter, committeeMembers, committeeSearch]);

  const {
    currentPage: trainingPage,
    paginatedItems: paginatedTrainings,
    resetPagination: resetTrainingPagination,
    setCurrentPage: setTrainingPage,
    startIndex: trainingStartIndex,
    totalPages: trainingTotalPages,
  } = useRecordPagination(filteredTrainings);

  const {
    currentPage: committeePage,
    paginatedItems: paginatedCommitteeMembers,
    resetPagination: resetCommitteePagination,
    setCurrentPage: setCommitteePage,
    startIndex: committeeStartIndex,
    totalPages: committeeTotalPages,
  } = useRecordPagination(filteredCommitteeMembers);

  const {
    currentPage: recordsCurrentPage,
    paginatedItems: paginatedRecords,
    setCurrentPage: setRecordsCurrentPage,
    startIndex: recordsStartIndex,
    totalPages: recordsTotalPages,
  } = useRecordPagination(records);

  React.useEffect(() => {
    resetTrainingPagination();
  }, [resetTrainingPagination, trainingSearch]);

  React.useEffect(() => {
    resetCommitteePagination();
  }, [committeeFilter, committeeSearch, resetCommitteePagination]);

  React.useEffect(() => {
    setRecordsPage(1);
  }, [records]);

  React.useEffect(() => {
    setRecordsCurrentPage(recordsPage);
  }, [recordsPage, setRecordsCurrentPage]);

  return (
    <>
      <div className="space-y-3">
        <Card className="border-border/50 bg-card/40 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-[13px] font-semibold">
              <Layers3 className="h-3.5 w-3.5 text-primary" />
              Unit Overview
            </CardTitle>
            <CardDescription className="text-[11px]">{scopeLabel}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 lg:grid-cols-2">
            <OverviewCard
              title="Unit Training Hub"
              description="Review and manage all training records conducted by your unit team members."
              value={String(trainings.length)}
              icon={BookOpenCheck}
              onClick={() => setActiveDialog("trainings")}
            />
            <OverviewCard
              title="Committee"
              description="Review registered project leaders and same-unit people in one searchable list."
              value={String(committeeMembers.length)}
              icon={Users}
              onClick={() => setActiveDialog("committee")}
            />
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/40 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-[13px] font-semibold">
              <Layers3 className="h-3.5 w-3.5 text-primary" />
              All Records from Your Unit
            </CardTitle>
            <CardDescription className="text-[11px]">
              Consolidated records created by users from your department and unit.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border border-border/50">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-border/40">
                    <TableHead className="text-[10px]">Record</TableHead>
                    <TableHead className="text-[10px]">Module</TableHead>
                    <TableHead className="text-[10px]">Created By</TableHead>
                    <TableHead className="text-[10px]">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRecords.length > 0 ? (
                    paginatedRecords.map((record) => (
                      <TableRow key={record.id} className="border-border/30">
                        <TableCell className="py-3 text-[11px] font-medium">{record.title}</TableCell>
                        <TableCell className="py-3 text-[11px]">
                          <Badge variant="outline" className="text-[9px]">
                            {record.moduleLabel}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 text-[11px]">{record.creatorName}</TableCell>
                        <TableCell className="py-3 text-[11px]">{formatDate(record.createdAt)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-xs text-muted-foreground">
                        No unit records found yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <RecordPagination
              currentPage={recordsCurrentPage}
              totalPages={recordsTotalPages}
              startIndex={recordsStartIndex}
              totalItems={records.length}
              itemLabel="records"
              onPageChange={setRecordsCurrentPage}
            />
          </CardContent>
        </Card>
      </div>

      <Dialog open={activeDialog === "trainings"} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent className="sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>Unit Training Records</DialogTitle>
            <DialogDescription>
              All trainings from your scoped unit view, including participant count, category, and mode.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
              <Input
                value={trainingSearch}
                onChange={(event) => setTrainingSearch(event.target.value)}
                placeholder="Search training, category, mode, venue, or creator..."
                className="h-9 text-xs"
              />
              <ExportPreviewMenu
                title="Unit Training Records"
                description="Preview the filtered unit training records before exporting them."
                columns={trainingExportColumns}
                rows={buildTrainingExportRows(filteredTrainings)}
                onDownloadExcel={() => exportTrainingsExcel(filteredTrainings)}
                onDownloadPdf={() => exportTrainingsPdf(filteredTrainings)}
                triggerClassName="h-9 text-xs"
              />
            </div>

            <ScrollArea className="max-h-[60vh] rounded-xl border border-border/50">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-border/40">
                    <TableHead className="text-[10px]">Training Title</TableHead>
                    <TableHead className="text-[10px]">Category</TableHead>
                    <TableHead className="text-[10px]">Mode</TableHead>
                    <TableHead className="text-[10px]">Participants</TableHead>
                    <TableHead className="text-[10px]">Venue / Platform</TableHead>
                    <TableHead className="text-[10px]">Author</TableHead>
                    <TableHead className="text-[10px]">Date Recorded</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTrainings.length > 0 ? (
                    paginatedTrainings.map((training) => (
                      <TableRow key={training.id} className="border-border/30">
                        <TableCell className="py-3 text-[11px] font-medium leading-relaxed max-w-[280px]">
                          {training.title}
                        </TableCell>
                        <TableCell className="py-3 text-[11px]">{training.categorySummary}</TableCell>
                        <TableCell className="py-3 text-[11px]">
                          <Badge variant="outline" className="text-[9px] bg-muted/50 font-normal">
                            {training.modeLabel}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 text-[11px] font-semibold text-primary">
                          {training.participants}
                        </TableCell>
                        <TableCell className="py-3 text-[11px]">{training.venue || "-"}</TableCell>
                        <TableCell className="py-3 text-[11px] text-muted-foreground">{training.creatorName}</TableCell>
                        <TableCell className="py-3 text-[11px] text-muted-foreground whitespace-nowrap">
                          {training.createdAt ? format(new Date(training.createdAt), "MMM d, yyyy") : "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-xs text-muted-foreground">
                        No trainings match the current search or filter.
                      </TableCell>
                    </TableRow>
                  )}
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

      <Dialog open={activeDialog === "committee"} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent className="sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>Committee</DialogTitle>
            <DialogDescription>
              Registered project leaders in your unit are listed without emails, while same-unit people show their emails.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2 md:grid-cols-[minmax(0,1.5fr)_180px_auto]">
              <Input
                value={committeeSearch}
                onChange={(event) => setCommitteeSearch(event.target.value)}
                placeholder="Search name, designation, email, unit, or role..."
                className="h-9 text-xs"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-9 text-xs">
                    <Filter className="mr-2 h-3.5 w-3.5" />
                    Results Filter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setCommitteeFilter("all")}>All members</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCommitteeFilter("registered_project_leaders")}>
                    Registered project leaders
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCommitteeFilter("unit_accounts")}>Same-unit people</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <ExportPreviewMenu
                title="Unit Committee"
                description="Preview the filtered unit committee records before exporting them."
                columns={committeeExportColumns}
                rows={buildCommitteeExportRows(filteredCommitteeMembers)}
                onDownloadExcel={() => exportCommitteeExcel(filteredCommitteeMembers)}
                onDownloadPdf={() => exportCommitteePdf(filteredCommitteeMembers)}
                triggerClassName="h-9 text-xs"
              />
            </div>

            <ScrollArea className="max-h-[60vh] rounded-xl border border-border/50">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-border/40">
                    <TableHead className="text-[10px]">Name</TableHead>
                    <TableHead className="text-[10px]">Source</TableHead>
                    <TableHead className="text-[10px]">Designation</TableHead>
                    <TableHead className="text-[10px]">Email</TableHead>
                    <TableHead className="text-[10px]">Role</TableHead>
                    <TableHead className="text-[10px]">Unit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCommitteeMembers.length > 0 ? (
                    paginatedCommitteeMembers.map((member) => (
                      <TableRow key={member.id} className="border-border/30">
                        <TableCell className="py-3 text-[11px] font-medium">{member.name}</TableCell>
                        <TableCell className="py-3 text-[11px]">
                          <Badge variant="outline" className="text-[9px]">
                            {getCommitteeSourceLabel(member.source)}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 text-[11px]">{member.designation || "-"}</TableCell>
                        <TableCell className="py-3 text-[11px]">
                          {member.email ? (
                            <span className="inline-flex items-center gap-1">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              {member.email}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="py-3 text-[11px]">{formatRole(member.userType)}</TableCell>
                        <TableCell className="py-3 text-[11px]">{member.unit || "-"}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-xs text-muted-foreground">
                        No committee members match the current search or filter.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>

            <RecordPagination
              currentPage={committeePage}
              totalPages={committeeTotalPages}
              startIndex={committeeStartIndex}
              totalItems={filteredCommitteeMembers.length}
              itemLabel="committee members"
              onPageChange={setCommitteePage}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
