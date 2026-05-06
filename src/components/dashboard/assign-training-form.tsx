"use client";

import * as React from "react";
import {
  BookMarked,
  Calendar,
  Check,
  ChevronDown,
  Search,
  UserPlus,
  X,
} from "lucide-react";

import {
  type AssignedTrainingPayload,
  type SystemUser,
  createAssignedTraining,
} from "@/lib/actions/assigned-trainings";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR + i - 2);

function formatScheduleDisplay(value: string, hasDay: boolean): string {
  if (!value) return "";
  if (hasDay) {
    // "2026-01-23" → "January 23, 2026"
    const parts = value.split("-");
    if (parts.length === 3) {
      const [year, month, day] = parts;
      const monthName = MONTHS[parseInt(month, 10) - 1] || month;
      return `${monthName} ${parseInt(day, 10)}, ${year}`;
    }
  } else {
    // "2026-01" → "January 2026"
    const parts = value.split("-");
    if (parts.length >= 2) {
      const [year, month] = parts;
      const monthName = MONTHS[parseInt(month, 10) - 1] || month;
      return `${monthName} ${year}`;
    }
  }
  return value;
}

function getUserRoleLabel(userType: string | null) {
  if (!userType) return "User";
  return userType
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function getUserInitials(user: SystemUser) {
  return `${(user.first_name?.[0] || "").toUpperCase()}${(user.last_name?.[0] || "").toUpperCase()}`;
}

interface AssignTrainingFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  systemUsers: SystemUser[];
  onSuccess?: () => void;
}

export function AssignTrainingForm({
  open,
  onOpenChange,
  systemUsers,
  onSuccess,
}: AssignTrainingFormProps) {
  const router = useRouter();

  // Form state
  const [title, setTitle] = React.useState("");
  const [scheduleMonth, setScheduleMonth] = React.useState("");
  const [scheduleYear, setScheduleYear] = React.useState(String(CURRENT_YEAR));
  const [includeDay, setIncludeDay] = React.useState(false);
  const [scheduleDay, setScheduleDay] = React.useState("");

  // User picker
  const [userSearch, setUserSearch] = React.useState("");
  const [selectedUsers, setSelectedUsers] = React.useState<SystemUser[]>([]);
  const [pickerOpen, setPickerOpen] = React.useState(false);

  // Submission
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const filteredUsers = React.useMemo(() => {
    const q = userSearch.toLowerCase().trim();
    return systemUsers.filter((u) => {
      const name = `${u.first_name || ""} ${u.last_name || ""}`.toLowerCase();
      const dept = (u.department || "").toLowerCase();
      const unit = (u.unit || "").toLowerCase();
      const role = (u.user_type || "").toLowerCase().replace(/_/g, " ");
      return !q || name.includes(q) || dept.includes(q) || unit.includes(q) || role.includes(q);
    });
  }, [systemUsers, userSearch]);

  const daysInMonth = React.useMemo(() => {
    if (!scheduleMonth || !scheduleYear) return 31;
    return new Date(parseInt(scheduleYear, 10), parseInt(scheduleMonth, 10), 0).getDate();
  }, [scheduleMonth, scheduleYear]);

  const buildScheduleValue = (): string => {
    if (!scheduleMonth || !scheduleYear) return "";
    const mm = scheduleMonth.padStart(2, "0");
    if (includeDay && scheduleDay) {
      const dd = scheduleDay.padStart(2, "0");
      return `${scheduleYear}-${mm}-${dd}`;
    }
    return `${scheduleYear}-${mm}`;
  };

  const toggleUser = (user: SystemUser) => {
    setSelectedUsers((prev) =>
      prev.some((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user]
    );
  };

  const removeUser = (userId: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const resetForm = () => {
    setTitle("");
    setScheduleMonth("");
    setScheduleYear(String(CURRENT_YEAR));
    setIncludeDay(false);
    setScheduleDay("");
    setSelectedUsers([]);
    setUserSearch("");
    setPickerOpen(false);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    setError(null);
    if (!title.trim()) { setError("Training title is required."); return; }
    if (!scheduleMonth || !scheduleYear) { setError("Schedule month and year are required."); return; }
    if (selectedUsers.length === 0) { setError("Assign at least one user."); return; }

    const scheduleValue = buildScheduleValue();
    const payload: AssignedTrainingPayload = {
      training_title: title.trim(),
      schedule_value: scheduleValue,
      schedule_has_day: includeDay && Boolean(scheduleDay),
      assigned_user_ids: selectedUsers.map((u) => u.id),
    };

    setSubmitting(true);
    const result = await createAssignedTraining(payload);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    handleClose();
    router.refresh();
    onSuccess?.();
  };

  const scheduleDisplay = buildScheduleValue()
    ? formatScheduleDisplay(buildScheduleValue(), includeDay && Boolean(scheduleDay))
    : "";

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) handleClose(); else onOpenChange(true); }}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted">
              <BookMarked className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold">Assign Training</DialogTitle>
              <DialogDescription className="text-[11px]">
                Start a training assignment for selected users to fill up.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Title of Training <span className="text-destructive">*</span></Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Seminar on Climate Adaptation"
              className="h-9 rounded-xl text-xs"
            />
          </div>

          {/* Schedule */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">
                <Calendar className="mr-1 inline h-3 w-3 text-muted-foreground" />
                Schedule <span className="text-destructive">*</span>
              </Label>
              <label className="flex cursor-pointer items-center gap-1.5 select-none">
                <input
                  type="checkbox"
                  className="h-3 w-3 accent-green-600"
                  checked={includeDay}
                  onChange={(e) => {
                    setIncludeDay(e.target.checked);
                    if (!e.target.checked) setScheduleDay("");
                  }}
                />
                <span className="text-[11px] text-muted-foreground">Include specific day</span>
              </label>
            </div>

            <div className={`grid gap-2 ${includeDay ? "grid-cols-3" : "grid-cols-2"}`}>
              <Select value={scheduleMonth} onValueChange={setScheduleMonth}>
                <SelectTrigger className="h-9 rounded-xl text-xs">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month, idx) => (
                    <SelectItem key={month} value={String(idx + 1)} className="text-xs">
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={scheduleYear} onValueChange={setScheduleYear}>
                <SelectTrigger className="h-9 rounded-xl text-xs">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {YEAR_OPTIONS.map((year) => (
                    <SelectItem key={year} value={String(year)} className="text-xs">
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {includeDay && (
                <Select value={scheduleDay} onValueChange={setScheduleDay} disabled={!scheduleMonth || !scheduleYear}>
                  <SelectTrigger className="h-9 rounded-xl text-xs">
                    <SelectValue placeholder="Day" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                      <SelectItem key={d} value={String(d)} className="text-xs">
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {scheduleDisplay && (
              <p className="text-[11px] text-muted-foreground">
                Preview: <span className="font-medium text-foreground">{scheduleDisplay}</span>
              </p>
            )}
          </div>

          {/* Assign Users */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              <UserPlus className="mr-1 inline h-3 w-3 text-muted-foreground" />
              Assign Users <span className="text-destructive">*</span>
            </Label>

            {/* Selected user tags */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedUsers.map((user) => (
                  <Badge
                    key={user.id}
                    variant="secondary"
                    className="flex items-center gap-1 rounded-full py-0.5 pl-1 pr-1.5 text-[11px]"
                  >
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={user.avatar_url || undefined} alt={`${user.first_name}`} />
                      <AvatarFallback className="text-[8px]">{getUserInitials(user)}</AvatarFallback>
                    </Avatar>
                    <span>{user.first_name} {user.last_name}</span>
                    <button
                      type="button"
                      onClick={() => removeUser(user.id)}
                      className="ml-0.5 rounded-full text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Picker trigger */}
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              className="flex h-9 w-full items-center justify-between rounded-xl border border-border/60 bg-background px-3 text-xs text-muted-foreground hover:bg-muted/30 transition-colors"
            >
              <span>
                {selectedUsers.length > 0
                  ? `${selectedUsers.length} user${selectedUsers.length > 1 ? "s" : ""} selected — click to add more`
                  : "Click to select users..."}
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${pickerOpen ? "rotate-180" : ""}`} />
            </button>

            {/* User picker panel */}
            {pickerOpen && (
              <div className="rounded-xl border border-border/60 bg-background shadow-sm">
                <div className="p-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search by name, department, unit, or role..."
                      className="h-8 rounded-lg pl-8 text-xs"
                      autoFocus
                    />
                  </div>
                </div>
                <Separator />
                <ScrollArea className="max-h-52">
                  <div className="p-1">
                    {filteredUsers.length === 0 ? (
                      <p className="py-3 text-center text-[11px] text-muted-foreground">No users found.</p>
                    ) : (
                      filteredUsers.map((user) => {
                        const isSelected = selectedUsers.some((u) => u.id === user.id);
                        return (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => toggleUser(user)}
                            className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted/50 ${isSelected ? "bg-green-50/60 dark:bg-green-950/20" : ""}`}
                          >
                            {/* Avatar */}
                            <Avatar className="h-7 w-7 shrink-0 border border-border/40">
                              <AvatarImage src={user.avatar_url || undefined} alt={`${user.first_name}`} />
                              <AvatarFallback className="text-[9px] font-medium">{getUserInitials(user)}</AvatarFallback>
                            </Avatar>

                            {/* Info */}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-medium leading-4">
                                {user.first_name} {user.last_name}
                              </p>
                              <p className="truncate text-[10px] text-muted-foreground leading-3.5">
                                {[user.department, user.unit].filter(Boolean).join(" / ")}
                              </p>
                              <p className="text-[10px] text-muted-foreground leading-3.5">
                                {getUserRoleLabel(user.user_type)}
                              </p>
                            </div>

                            {/* Check */}
                            {isSelected && (
                              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
                                <Check className="h-3 w-3" />
                              </div>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl text-xs"
              onClick={handleClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-[#159E44] text-xs text-white hover:bg-[#12843a]"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Assigning..." : "Assign Training"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
