"use client";

import * as React from "react";
import {
  BookMarked,
  CheckCircle2,
  Clock,
  Eye,
  Pencil,
  Search,
  SlidersHorizontal,
  Trash2,
  UserCheck,
} from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

import {
  type AssignedTrainingRecord,
  type SystemUser,
  deleteAssignedTraining,
  fillAssignedTraining,
  resolveAssignedTraining,
} from "@/lib/actions/assigned-trainings";
import {
  type TrainingFacultyOption,
  type TrainingProjectOption,
  TrainingsForm,
} from "@/components/dashboard/trainings-form";
import { RecordPagination, useRecordPagination } from "@/components/dashboard/record-pagination";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type FilterMode = "all" | "pending" | "filled" | "resolved";

function formatSchedule(value: string, hasDay: boolean): string {
  if (!value) return "-";
  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  try {
    if (hasDay && value.length === 10) {
      const [year, month, day] = value.split("-");
      const monthName = MONTHS[parseInt(month, 10) - 1] || month;
      return `${monthName} ${parseInt(day, 10)}, ${year}`;
    }
    const [year, month] = value.split("-");
    const monthName = MONTHS[parseInt(month, 10) - 1] || month;
    return `${monthName} ${year}`;
  } catch {
    return value;
  }
}

function getUserInitials(user: SystemUser) {
  return `${(user.first_name?.[0] || "").toUpperCase()}${(user.last_name?.[0] || "").toUpperCase()}`;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "pending") {
    return (
      <Badge variant="outline" className="gap-1 rounded-full text-[10px]">
        <Clock className="h-2.5 w-2.5 text-amber-500" />
        Pending
      </Badge>
    );
  }
  if (status === "filled") {
    return (
      <Badge variant="outline" className="gap-1 rounded-full text-[10px]">
        <UserCheck className="h-2.5 w-2.5 text-blue-500" />
        Filled
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 rounded-full text-[10px]">
      <CheckCircle2 className="h-2.5 w-2.5 text-green-600" />
      Resolved
    </Badge>
  );
}

interface AssignedTrainingsManagementProps {
  records: AssignedTrainingRecord[];
  currentUserId: string;
  currentUserName: string;
  userType?: string;
  department: string | null;
  unit?: string | null;
  unitOptions?: string[];
  partnerAgencyOptions?: string[];
  projectOptions?: TrainingProjectOption[];
  facultyOptions?: TrainingFacultyOption[];
}

export function AssignedTrainingsManagement({
  records,
  currentUserId,
  currentUserName,
  userType,
  department,
  unit,
  unitOptions = [],
  partnerAgencyOptions = [],
  projectOptions = [],
  facultyOptions = [],
}: AssignedTrainingsManagementProps) {
  const router = useRouter();
  const isCoordinator = userType === "college_coordinator" || userType === "super_admin";

  const [searchTerm, setSearchTerm] = React.useState("");
  const [filterMode, setFilterMode] = React.useState<FilterMode>("all");

  // Detail/fill-up dialog
  const [viewRecord, setViewRecord] = React.useState<AssignedTrainingRecord | null>(null);
  const [fillRecord, setFillRecord] = React.useState<AssignedTrainingRecord | null>(null);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = React.useState<AssignedTrainingRecord | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  // Resolve dialog
  const [resolveTarget, setResolveTarget] = React.useState<AssignedTrainingRecord | null>(null);
  const [resolving, setResolving] = React.useState(false);
  const [resolveError, setResolveError] = React.useState<string | null>(null);

  // Success
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  const filteredRecords = React.useMemo(() => {
    return records.filter((record) => {
      const haystack = [
        record.training_title,
        record.assigner_full_name || "",
        record.filled_by_full_name || "",
        record.status,
      ]
        .join(" ")
        .toLowerCase();
      if (searchTerm && !haystack.includes(searchTerm.toLowerCase())) return false;
      if (filterMode !== "all" && record.status !== filterMode) return false;
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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    const result = await deleteAssignedTraining(deleteTarget.id);
    setDeleting(false);
    if (result.error) { setDeleteError(result.error); return; }
    setDeleteTarget(null);
    router.refresh();
  };

  const handleResolve = async () => {
    if (!resolveTarget) return;
    setResolving(true);
    setResolveError(null);
    const result = await resolveAssignedTraining(resolveTarget.id);
    setResolving(false);
    if (result.error) { setResolveError(result.error); return; }
    setResolveTarget(null);
    setSuccessMsg("Training has been resolved and added to official trainings.");
    router.refresh();
  };

  // When assigned user saves the filled training form
  const handleFillSaved = async (_action: "created" | "updated", filledData?: Record<string, unknown>) => {
    if (!fillRecord || !filledData) { setFillRecord(null); return; }
    const result = await fillAssignedTraining(fillRecord.id, filledData);
    if (result.error) {
      alert(result.error);
      return;
    }
    setFillRecord(null);
    setSuccessMsg("Training details saved. The coordinator has been notified.");
    router.refresh();
  };

  // Build a pre-filled record from the assignment for the TrainingsForm
  const buildPrefilledRecord = (assignment: AssignedTrainingRecord) => {
    if (assignment.filled_data && Object.keys(assignment.filled_data).length > 0) {
      return {
        ...assignment.filled_data,
        training_title: assignment.training_title,
        id: `assigned:${assignment.id}`,
      } as unknown;
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Search + filter bar */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative w-full max-w-xl">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search title, assigned by, or status..."
            className="h-9 rounded-xl pl-10 text-xs"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="rounded-xl text-xs">
              <SlidersHorizontal className="mr-2 h-3.5 w-3.5" />
              Filter
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel className="text-xs">Show</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem className="text-xs" checked={filterMode === "all"} onCheckedChange={() => setFilterMode("all")}>
              All
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem className="text-xs" checked={filterMode === "pending"} onCheckedChange={() => setFilterMode("pending")}>
              Pending
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem className="text-xs" checked={filterMode === "filled"} onCheckedChange={() => setFilterMode("filled")}>
              Filled
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem className="text-xs" checked={filterMode === "resolved"} onCheckedChange={() => setFilterMode("resolved")}>
              Resolved
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border/60">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-10 text-xs font-semibold">Title</TableHead>
              <TableHead className="h-10 text-xs font-semibold">Schedule</TableHead>
              <TableHead className="h-10 text-xs font-semibold">Assigned To</TableHead>
              <TableHead className="h-10 text-xs font-semibold">Assigned By</TableHead>
              <TableHead className="h-10 text-xs font-semibold">Status</TableHead>
              <TableHead className="h-10 text-right text-xs font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRecords.length > 0 ? (
              paginatedRecords.map((record) => {
                const isMyAssignment = record.assigned_by === currentUserId;
                const iAmAssignee = (record.assigned_user_ids || []).includes(currentUserId);
                const canFill = iAmAssignee && record.status !== "resolved";

                return (
                  <TableRow key={record.id} className="border-border/30">
                    {/* Title */}
                    <TableCell className="py-3 text-xs font-medium">
                      <div className="space-y-0.5">
                        <p>{record.training_title}</p>
                        {iAmAssignee && !isMyAssignment && (
                          <p className="text-[10px] text-muted-foreground">
                            {record.assigner_full_name || "Coordinator"} assigned you on this
                          </p>
                        )}
                      </div>
                    </TableCell>

                    {/* Schedule */}
                    <TableCell className="py-3 text-xs">
                      {formatSchedule(record.schedule_value, record.schedule_has_day)}
                    </TableCell>

                    {/* Assigned To */}
                    <TableCell className="py-3">
                      <div className="flex -space-x-1.5">
                        {(record.assigned_users || []).slice(0, 4).map((user) => (
                          <TooltipProvider key={user.id} delayDuration={150}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Avatar className="h-6 w-6 cursor-default border-2 border-background">
                                  <AvatarImage src={user.avatar_url || undefined} />
                                  <AvatarFallback className="text-[8px]">{getUserInitials(user)}</AvatarFallback>
                                </Avatar>
                              </TooltipTrigger>
                              <TooltipContent className="text-[10px]">
                                {user.first_name} {user.last_name}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                        {(record.assigned_users?.length || 0) > 4 && (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[8px] font-medium">
                            +{(record.assigned_users?.length || 0) - 4}
                          </div>
                        )}
                      </div>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {record.assigned_users?.length || 0} user{(record.assigned_users?.length || 0) === 1 ? "" : "s"}
                      </p>
                    </TableCell>

                    {/* Assigned By */}
                    <TableCell className="py-3 text-xs text-muted-foreground">
                      {record.assigner_full_name || "-"}
                    </TableCell>

                    {/* Status */}
                    <TableCell className="py-3">
                      <StatusBadge status={record.status} />
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="py-3">
                      <div className="flex justify-end gap-1.5">
                        {/* View */}
                        <TooltipProvider delayDuration={150}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-xl"
                                onClick={() => setViewRecord(record)}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="text-[10px]">View details</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        {/* Fill Up (for assignees) */}
                        {canFill && (
                          <TooltipProvider delayDuration={150}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 rounded-xl"
                                  onClick={() => setFillRecord(record)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="text-[10px]">Fill up training</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}

                        {/* Resolve (coordinator, filled only) */}
                        {isCoordinator && record.status === "filled" && (
                          <TooltipProvider delayDuration={150}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 rounded-xl"
                                  onClick={() => setResolveTarget(record)}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="text-[10px]">Resolve — move to official trainings</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}

                        {/* Delete (coordinator, non-resolved) */}
                        {isCoordinator && isMyAssignment && record.status !== "resolved" && (
                          <TooltipProvider delayDuration={150}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 rounded-xl text-destructive hover:bg-destructive/10"
                                  onClick={() => setDeleteTarget(record)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="text-[10px]">Delete assignment</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-28 text-center text-xs text-muted-foreground">
                  <BookMarked className="mx-auto mb-2 h-6 w-6 text-muted-foreground/40" />
                  {filterMode === "all"
                    ? "No assigned trainings yet."
                    : `No ${filterMode} assignments found.`}
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
        itemLabel="assignments"
        onPageChange={setCurrentPage}
      />

      {/* ── View Details Dialog ─────────────────────────────── */}
      <Dialog open={!!viewRecord} onOpenChange={(open) => !open && setViewRecord(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Assignment Details</DialogTitle>
            <DialogDescription className="text-[11px]">
              View the assigned training information.
            </DialogDescription>
          </DialogHeader>
          {viewRecord && (
            <div className="space-y-3 text-xs">
              <div className="space-y-0.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Title</p>
                <p className="font-medium">{viewRecord.training_title}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Schedule</p>
                <p>{formatSchedule(viewRecord.schedule_value, viewRecord.schedule_has_day)}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Assigned By</p>
                <p>{viewRecord.assigner_full_name || "-"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Assigned Users</p>
                <ScrollArea className="max-h-36">
                  <div className="space-y-1.5">
                    {(viewRecord.assigned_users || []).map((user) => (
                      <div key={user.id} className="flex items-center gap-2">
                        <Avatar className="h-6 w-6 border border-border/40">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="text-[8px]">{getUserInitials(user)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">{user.first_name} {user.last_name}</p>
                          <p className="truncate text-[10px] text-muted-foreground">
                            {[user.department, user.unit].filter(Boolean).join(" / ")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Status</p>
                <StatusBadge status={viewRecord.status} />
              </div>
              {viewRecord.filled_by_full_name && (
                <div className="space-y-0.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Filled By</p>
                  <p>{viewRecord.filled_by_full_name}</p>
                </div>
              )}
              <div className="space-y-0.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Created</p>
                <p>{format(new Date(viewRecord.created_at), "MMM d, yyyy")}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Fill Up Dialog (TrainingsForm fullscreen) ───────── */}
      <Dialog open={!!fillRecord} onOpenChange={(open) => !open && setFillRecord(null)}>
        <DialogContent
          showCloseButton={false}
          className="flex flex-col overflow-hidden fixed inset-0 left-0 top-0 h-[100dvh] w-screen max-w-none sm:max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 shadow-none"
        >
          {fillRecord && (
            <div className="flex flex-col h-full">
              {/* Assignment banner */}
              <div className="flex items-center gap-2 border-b border-border/40 bg-muted/30 px-4 py-2">
                <BookMarked className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{fillRecord.assigner_full_name || "Coordinator"}</span>
                  {" "}assigned you on this training · Please fill up the remaining details
                </p>
              </div>
              <div className="flex-1 overflow-hidden">
                <TrainingsForm
                  department={department || ""}
                  currentUserName={currentUserName}
                  userType={userType as React.ComponentProps<typeof TrainingsForm>["userType"]}
                  unit={unit}
                  unitOptions={unitOptions}
                  existingPartnerAgencies={partnerAgencyOptions}
                  projectOptions={projectOptions}
                  facultyOptions={facultyOptions}
                  hideProjectField={userType === "unit_coordinator"}
                  record={buildPrefilledRecord(fillRecord) as Parameters<typeof TrainingsForm>[0]["record"]}
                  prefillTitle={fillRecord.training_title}
                  onSuccess={(action, data) => void handleFillSaved(action, data)}
                  onClose={() => setFillRecord(null)}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Resolve Dialog ───────────────────────────────────── */}
      <Dialog open={!!resolveTarget} onOpenChange={(open) => { if (!open) { setResolveTarget(null); setResolveError(null); } }}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Resolve Assignment</DialogTitle>
            <DialogDescription className="text-[11px]">
              This will promote the filled training data into the official{" "}
              <strong>Create Trainings</strong> table. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
            <p className="text-xs font-medium">{resolveTarget?.training_title}</p>
            <p className="text-[11px] text-muted-foreground">
              Filled by: {resolveTarget?.filled_by_full_name || "-"}
            </p>
          </div>
          {resolveError && (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">{resolveError}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="rounded-xl text-xs" onClick={() => { setResolveTarget(null); setResolveError(null); }} disabled={resolving}>
              Cancel
            </Button>
            <Button
              className="rounded-xl bg-[#159E44] text-xs text-white hover:bg-[#12843a]"
              onClick={handleResolve}
              disabled={resolving}
            >
              {resolving ? "Resolving..." : "Resolve & Move to Trainings"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ────────────────────────────────────── */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeleteError(null); } }}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Delete Assignment</DialogTitle>
            <DialogDescription className="text-[11px]">
              This will permanently remove{" "}
              <span className="font-medium text-foreground">&quot;{deleteTarget?.training_title}&quot;</span>.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">{deleteError}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="rounded-xl text-xs" onClick={() => { setDeleteTarget(null); setDeleteError(null); }} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" className="rounded-xl text-xs" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Success Dialog ───────────────────────────────────── */}
      <Dialog open={!!successMsg} onOpenChange={(open) => !open && setSuccessMsg(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Done
            </DialogTitle>
            <DialogDescription className="text-[11px]">{successMsg}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
