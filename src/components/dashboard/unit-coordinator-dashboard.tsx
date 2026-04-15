"use client";

import * as React from "react";
import Image from "next/image";
import { format } from "date-fns";
import {
  BookOpenCheck,
  Briefcase,
  Building2,
  ChevronRight,
  FileText,
  Filter,
  Layers3,
  Users,
} from "lucide-react";

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
  const timeoutRef = React.useRef<number | null>(null);

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

      <div className="space-y-4">
        <Card className="border-border/50 bg-card/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Layers3 className="h-4 w-4 text-primary" />
              Unit Overview
            </CardTitle>
            <CardDescription className="text-xs">{scopeLabel}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-2">
            <button
              type="button"
              onClick={() => openDialogWithLoader("users")}
              className="rounded-2xl border border-border/50 bg-background p-5 text-left transition hover:border-primary/40 hover:bg-muted/20"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Users className="h-4 w-4 text-primary" />
                    Total Unit Users
                  </div>
                  <p className="text-3xl font-bold">{users.length}</p>
                  <p className="text-xs text-muted-foreground">
                    View all users in your department and unit, including their role and unit.
                  </p>
                </div>
                <ChevronRight className="mt-1 h-4 w-4 text-muted-foreground" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => openDialogWithLoader("trainings")}
              className="rounded-2xl border border-border/50 bg-background p-5 text-left transition hover:border-primary/40 hover:bg-muted/20"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <BookOpenCheck className="h-4 w-4 text-primary" />
                    Total Created Trainings
                  </div>
                  <p className="text-3xl font-bold">{trainings.length}</p>
                  <p className="text-xs text-muted-foreground">
                    Open the unit training list and filter down to records you created.
                  </p>
                </div>
                <ChevronRight className="mt-1 h-4 w-4 text-muted-foreground" />
              </div>
            </button>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <FileText className="h-4 w-4 text-primary" />
              All Records from Your Unit
            </CardTitle>
            <CardDescription className="text-xs">
              Consolidated records created by users from your department and unit.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[340px] pr-4">
              <div className="space-y-3">
                {records.length > 0 ? (
                  records.map((record) => (
                    <div key={record.id} className="rounded-2xl border border-border/50 bg-background p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">{record.title}</p>
                            <Badge variant="outline" className="text-[10px]">
                              {record.moduleLabel}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Created by {record.creatorName} on {formatDate(record.createdAt)}
                          </p>
                        </div>
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-border/50 px-4 py-8 text-center text-sm text-muted-foreground">
                    No unit records found yet.
                  </div>
                )}
              </div>
            </ScrollArea>
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
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-3">
              {users.map((user) => (
                <div key={user.id} className="rounded-2xl border border-border/50 bg-muted/10 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">{user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.department || "No department"}{user.unit ? ` • ${user.unit}` : ""}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {formatRole(user.userType)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
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
