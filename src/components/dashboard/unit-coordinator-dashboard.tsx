"use client";

import * as React from "react";
import Image from "next/image";
import { format } from "date-fns";
import {
  ChevronLeft,
  BookOpenCheck,
  Briefcase,
  Building2,
  ChevronRight,
  FileText,
  Filter,
  Layers3,
  Users,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type UnitDashboardUser = {
  id: string;
  name: string;
  userType: string;
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
  users: UnitDashboardUser[];
  trainings: UnitDashboardTraining[];
  records: UnitDashboardRecord[];
}

function formatRole(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: string | null) {
  if (!value) return "No date";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "No date" : format(parsed, "MMM d, yyyy");
}

export function UnitCoordinatorDashboard({
  currentUserId,
  scopeLabel,
  users,
  trainings,
  records,
}: UnitCoordinatorDashboardProps) {
  const [activeDialog, setActiveDialog] = React.useState<"users" | "trainings" | null>(null);
  const [loadingDialog, setLoadingDialog] = React.useState<"users" | "trainings" | null>(null);
  const [trainingFilter, setTrainingFilter] = React.useState<"all" | "created_by_me">("all");
  const [usersPage, setUsersPage] = React.useState(1);
  const [recordsPage, setRecordsPage] = React.useState(1);
  const timeoutRef = React.useRef<number | null>(null);
  const pageSize = 10;

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const openDialogWithLoader = React.useCallback((target: "users" | "trainings") => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    setActiveDialog(null);
    setLoadingDialog(target);
    timeoutRef.current = window.setTimeout(() => {
      setLoadingDialog(null);
      setActiveDialog(target);
    }, 650);
  }, []);

  const filteredTrainings = React.useMemo(() => {
    if (trainingFilter === "created_by_me") {
      return trainings.filter((training) => training.createdBy === currentUserId);
    }
    return trainings;
  }, [currentUserId, trainingFilter, trainings]);

  const totalUsersPages = Math.max(1, Math.ceil(users.length / pageSize));
  const paginatedUsers = React.useMemo(() => {
    const start = (usersPage - 1) * pageSize;
    return users.slice(start, start + pageSize);
  }, [users, usersPage]);

  const totalRecordsPages = Math.max(1, Math.ceil(records.length / pageSize));
  const paginatedRecords = React.useMemo(() => {
    const start = (recordsPage - 1) * pageSize;
    return records.slice(start, start + pageSize);
  }, [records, recordsPage]);

  React.useEffect(() => {
    setUsersPage(1);
  }, [users]);

  React.useEffect(() => {
    setRecordsPage(1);
  }, [records]);

  return (
    <>
      {loadingDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center rounded-3xl border border-border/60 bg-background px-8 py-7 shadow-lg">
            <div className="relative h-20 w-20 preloader-logo">
              <Image src="/CQERFINAL.png" alt="CQER Logo" fill className="object-contain" />
            </div>
            <p className="mt-3 text-[10px] font-medium text-muted-foreground">
              Loading {loadingDialog === "users" ? "unit users" : "trainings"}...
            </p>
          </div>
        </div>
      ) : null}

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
            <button
              type="button"
              onClick={() => openDialogWithLoader("users")}
              className="rounded-xl border border-border/50 bg-background p-4 text-left transition hover:border-primary/40 hover:bg-muted/20"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-[12px] font-semibold">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    Total Unit Users
                  </div>
                  <p className="text-2xl font-bold leading-none">{users.length}</p>
                  <p className="text-[11px] text-muted-foreground">
                    View all users in your department and unit, including their role and unit.
                  </p>
                </div>
                <ChevronRight className="mt-1 h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => openDialogWithLoader("trainings")}
              className="rounded-xl border border-border/50 bg-background p-4 text-left transition hover:border-primary/40 hover:bg-muted/20"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-[12px] font-semibold">
                    <BookOpenCheck className="h-3.5 w-3.5 text-primary" />
                    Total Created Trainings
                  </div>
                  <p className="text-2xl font-bold leading-none">{trainings.length}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Open the unit training list and filter down to records you created.
                  </p>
                </div>
                <ChevronRight className="mt-1 h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </button>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/40 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-[13px] font-semibold">
              <FileText className="h-3.5 w-3.5 text-primary" />
              All Records from Your Unit
            </CardTitle>
            <CardDescription className="text-[11px]">
              Consolidated records created by users from your department and unit.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {paginatedRecords.length > 0 ? (
                paginatedRecords.map((record) => (
                    <div key={record.id} className="rounded-xl border border-border/50 bg-background p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[12px] font-semibold text-foreground">{record.title}</p>
                            <Badge variant="outline" className="text-[9px]">
                              {record.moduleLabel}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Created by {record.creatorName} on {formatDate(record.createdAt)}
                          </p>
                        </div>
                        <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-border/50 px-4 py-8 text-center text-sm text-muted-foreground">
                    No unit records found yet.
                  </div>
                )}
            </div>
            {records.length > pageSize ? (
              <div className="flex items-center justify-between border-t border-border/40 pt-2">
                <span className="text-[10px] text-muted-foreground">
                  Page {recordsPage} of {totalRecordsPages}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 rounded-lg"
                    disabled={recordsPage === 1}
                    onClick={() => setRecordsPage((current) => Math.max(1, current - 1))}
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 rounded-lg"
                    disabled={recordsPage === totalRecordsPages}
                    onClick={() => setRecordsPage((current) => Math.min(totalRecordsPages, current + 1))}
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Dialog open={activeDialog === "users"} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Total Unit Users</DialogTitle>
            <DialogDescription>
              Users visible from your department and unit, including their role and assigned unit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              {paginatedUsers.map((user) => (
                <div key={user.id} className="rounded-xl border border-border/50 bg-muted/10 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-9 w-9 border border-border/40">
                        <AvatarImage src={user.avatarUrl || ""} alt={user.name} />
                        <AvatarFallback className="text-[10px] font-semibold">
                          {user.name
                            .split(" ")
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((part) => part[0])
                            .join("")
                            .toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-0.5">
                        <p className="text-[12px] font-semibold">{user.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {user.department || "No department"}{user.unit ? ` • ${user.unit}` : ""}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[9px]">
                      {formatRole(user.userType)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            {users.length > pageSize ? (
              <div className="flex items-center justify-between border-t border-border/40 pt-2">
                <span className="text-[10px] text-muted-foreground">
                  Page {usersPage} of {totalUsersPages}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 rounded-lg"
                    disabled={usersPage === 1}
                    onClick={() => setUsersPage((current) => Math.max(1, current - 1))}
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 rounded-lg"
                    disabled={usersPage === totalUsersPages}
                    onClick={() => setUsersPage((current) => Math.min(totalUsersPages, current + 1))}
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === "trainings"} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Total Created Trainings</DialogTitle>
            <DialogDescription>
              Trainings created by users from your department and unit.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Select value={trainingFilter} onValueChange={(value: "all" | "created_by_me") => setTrainingFilter(value)}>
              <SelectTrigger className="h-9 w-[180px] rounded-xl text-xs">
                <Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All trainings</SelectItem>
                <SelectItem value="created_by_me" className="text-xs">Created by me</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-3">
              {filteredTrainings.length > 0 ? (
                filteredTrainings.map((training) => (
                  <div key={training.id} className="rounded-2xl border border-border/50 bg-muted/10 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">{training.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Created by {training.creatorName} on {formatDate(training.createdAt)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {training.venue || "No venue"} • {training.participants} participants
                        </p>
                      </div>
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border/50 px-4 py-8 text-center text-sm text-muted-foreground">
                  No trainings match the selected filter.
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="flex justify-end">
            <Button variant="outline" className="rounded-xl" onClick={() => setActiveDialog(null)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
