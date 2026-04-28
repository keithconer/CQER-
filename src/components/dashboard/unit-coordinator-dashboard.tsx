"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  BookOpenCheck,
  ChevronRight,
  FileDown,
  Filter,
  Layers3,
  Mail,
  Users,
} from "lucide-react";

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
  relatedProjectTitle: string | null;
  linkedToProject: boolean;
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
type TrainingFilter = "all" | "linked_only" | "standalone_only" | "created_by_me";
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

async function exportTrainingsExcel(records: UnitDashboardTraining[]) {
  const ExcelJSImport = await import("exceljs/dist/exceljs.min.js");
  const ExcelJS = ExcelJSImport?.default ?? ExcelJSImport;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Unit Trainings");
  const columns = [
    { header: "Training", key: "title", width: 34 },
    { header: "Related Project", key: "project", width: 28 },
    { header: "Linked to Project", key: "linked", width: 18 },
    { header: "Category", key: "category", width: 28 },
    { header: "Mode", key: "mode", width: 18 },
    { header: "Venue", key: "venue", width: 24 },
    { header: "Created By", key: "creator", width: 24 },
  ];
  sheet.columns = columns.map((column) => ({ key: column.key, width: column.width }));
  sheet.mergeCells("A1:G1");
  sheet.getCell("A1").value = "Unit Training Container";
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
      project: record.relatedProjectTitle || "-",
      linked: record.linkedToProject ? "Yes" : "No",
      category: record.categorySummary,
      mode: record.modeLabel,
      venue: record.venue || "-",
      creator: record.creatorName,
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

async function exportTrainingsPdf(records: UnitDashboardTraining[]) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFontSize(12);
  doc.text("Unit Training Container", doc.internal.pageSize.getWidth() / 2, 12, { align: "center" });
  autoTable(doc, {
    startY: 18,
    head: [["Training", "Related Project", "Linked", "Category", "Mode", "Venue", "Created By"]],
    body: records.map((record) => [
      record.title,
      record.relatedProjectTitle || "-",
      record.linkedToProject ? "Yes" : "No",
      record.categorySummary,
      record.modeLabel,
      record.venue || "-",
      record.creatorName,
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
  currentUserId,
  scopeLabel,
  committeeMembers,
  trainings,
  records,
}: UnitCoordinatorDashboardProps) {
  const [activeDialog, setActiveDialog] = React.useState<ActiveDialog>(null);
  const [trainingSearch, setTrainingSearch] = React.useState("");
  const [committeeSearch, setCommitteeSearch] = React.useState("");
  const [trainingFilter, setTrainingFilter] = React.useState<TrainingFilter>("all");
  const [committeeFilter, setCommitteeFilter] = React.useState<CommitteeFilter>("all");
  const [recordsPage, setRecordsPage] = React.useState(1);

  const filteredTrainings = React.useMemo(() => {
    const query = trainingSearch.trim().toLowerCase();
    return trainings.filter((training) => {
      const haystack = [
        training.title,
        training.relatedProjectTitle || "",
        training.categorySummary,
        training.modeLabel,
        training.venue || "",
        training.creatorName,
      ]
        .join(" ")
        .toLowerCase();
      if (query && !haystack.includes(query)) return false;
      if (trainingFilter === "linked_only" && !training.linkedToProject) return false;
      if (trainingFilter === "standalone_only" && training.linkedToProject) return false;
      if (trainingFilter === "created_by_me" && training.createdBy !== currentUserId) return false;
      return true;
    });
  }, [currentUserId, trainingFilter, trainingSearch, trainings]);

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
  }, [resetTrainingPagination, trainingFilter, trainingSearch]);

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
              title="Training Container"
              description="View all unit training records with project link, category, and mode details."
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
            <DialogTitle>Training Container</DialogTitle>
            <DialogDescription>
              All trainings from your scoped unit view, including project link, category, and mode.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2 md:grid-cols-[minmax(0,1.5fr)_180px_auto]">
              <Input
                value={trainingSearch}
                onChange={(event) => setTrainingSearch(event.target.value)}
                placeholder="Search training, project, category, mode, or creator..."
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
                  <DropdownMenuItem onClick={() => setTrainingFilter("all")}>All trainings</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTrainingFilter("linked_only")}>Linked to project</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTrainingFilter("standalone_only")}>No linked project</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTrainingFilter("created_by_me")}>Created by me</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-9 text-xs">
                    <FileDown className="mr-2 h-3.5 w-3.5" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => void exportTrainingsExcel(filteredTrainings)}>Export Excel</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void exportTrainingsPdf(filteredTrainings)}>Export PDF</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <ScrollArea className="max-h-[60vh] rounded-xl border border-border/50">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-border/40">
                    <TableHead className="text-[10px]">Training</TableHead>
                    <TableHead className="text-[10px]">Related Project</TableHead>
                    <TableHead className="text-[10px]">Linked</TableHead>
                    <TableHead className="text-[10px]">Category</TableHead>
                    <TableHead className="text-[10px]">Mode</TableHead>
                    <TableHead className="text-[10px]">Venue</TableHead>
                    <TableHead className="text-[10px]">Created By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTrainings.length > 0 ? (
                    paginatedTrainings.map((training) => (
                      <TableRow key={training.id} className="border-border/30">
                        <TableCell className="py-3 text-[11px] font-medium">{training.title}</TableCell>
                        <TableCell className="py-3 text-[11px]">{training.relatedProjectTitle || "-"}</TableCell>
                        <TableCell className="py-3 text-[11px]">{training.linkedToProject ? "Yes" : "No"}</TableCell>
                        <TableCell className="py-3 text-[11px]">{training.categorySummary}</TableCell>
                        <TableCell className="py-3 text-[11px]">{training.modeLabel}</TableCell>
                        <TableCell className="py-3 text-[11px]">{training.venue || "-"}</TableCell>
                        <TableCell className="py-3 text-[11px]">
                          <div className="space-y-1">
                            <p>{training.creatorName}</p>
                            <p className="text-[10px] text-muted-foreground">{formatDate(training.createdAt)}</p>
                          </div>
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-9 text-xs">
                    <FileDown className="mr-2 h-3.5 w-3.5" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => void exportCommitteeExcel(filteredCommitteeMembers)}>Export Excel</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void exportCommitteePdf(filteredCommitteeMembers)}>Export PDF</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
