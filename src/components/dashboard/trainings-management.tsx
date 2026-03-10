"use client";

import * as React from "react";
import { CheckCircle2, Eye, GraduationCap, Pencil, Plus, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { deleteTraining } from "@/lib/actions/trainings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DocumentPreview } from "./document-preview";
import { TrainingRecord, TrainingsForm } from "./trainings-form";

interface TrainingsManagementProps {
  initialRecords: TrainingRecord[];
  department: string | null;
  userType?: "super_admin" | "college_coordinator" | "unit_coordinator";
  unit?: string | null;
  unitOptions?: string[];
  partnerAgencyOptions?: string[];
  currentUserId: string;
}

export function TrainingsManagement({
  initialRecords,
  department,
  userType,
  unit,
  unitOptions = [],
  partnerAgencyOptions = [],
  currentUserId,
}: TrainingsManagementProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editRecord, setEditRecord] = React.useState<TrainingRecord | null>(null);
  const [viewRecord, setViewRecord] = React.useState<TrainingRecord | null>(null);
  const [isDeletingId, setIsDeletingId] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState("");
  const [successOpen, setSuccessOpen] = React.useState(false);
  const [selectedScopes, setSelectedScopes] = React.useState<string[]>([
    "created_by_me",
    "department_files",
  ]);
  const refreshTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  React.useEffect(() => {
    const supabase = createClient();
    const scheduleRefresh = () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = setTimeout(() => router.refresh(), 500);
    };

    const channel = supabase
      .channel("trainings-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "trainings" }, scheduleRefresh)
      .subscribe();

    return () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [router]);

  const filteredRecords = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const scopedRecords = initialRecords.filter((record) => {
      const isMine = record.created_by === currentUserId;
      return (
        (selectedScopes.includes("created_by_me") && isMine) ||
        (selectedScopes.includes("department_files") && !isMine)
      );
    });

    if (!term) return scopedRecords;

    return scopedRecords.filter((record) =>
      [
        record.training_title,
        record.contact_person,
        record.contact_details,
        record.venue_platform,
        record.training_category,
        record.training_mode,
        (record.related_curricular_offerings || []).join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [currentUserId, initialRecords, searchTerm, selectedScopes]);

  const toggleScopeFilter = (value: string) => {
    setSelectedScopes((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  };

  const handleSuccess = (action: "created" | "updated") => {
    setCreateOpen(false);
    setEditRecord(null);
    setSuccessMessage(action === "created" ? "Training created successfully." : "Training updated successfully.");
    setSuccessOpen(true);
    router.refresh();
  };

  const handleDelete = async (record: TrainingRecord) => {
    const confirmed = window.confirm("Delete this training record?");
    if (!confirmed) return;

    setIsDeletingId(record.id);
    const result = await deleteTraining(record.id);
    setIsDeletingId(null);

    if (result.error) {
      alert(`Error: ${result.error}`);
      return;
    }

    setSuccessMessage("Training deleted successfully.");
    setSuccessOpen(true);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-xs font-semibold">Trainings</CardTitle>
              <CardDescription className="text-[10px]">
                Manage training records and monitor participant metrics.
              </CardDescription>
            </div>
            <Button
              size="sm"
              className="h-8 text-[10px] bg-[#159E44] hover:bg-[#128A3B] text-white"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Create Training
            </Button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-8 h-8 text-xs placeholder:text-[10px] bg-muted/20 border-border/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-[10px] border-border/50 bg-muted/20"
                >
                  <SlidersHorizontal className="h-3 w-3 mr-1" />
                  Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-[10px]">Results Filter</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  className="text-[10px]"
                  checked={selectedScopes.includes("created_by_me")}
                  onCheckedChange={() => toggleScopeFilter("created_by_me")}
                >
                  Created by me
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  className="text-[10px]"
                  checked={selectedScopes.includes("department_files")}
                  onCheckedChange={() => toggleScopeFilter("department_files")}
                >
                  All files from the department
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="px-4 pb-4">
          <div className="rounded-md border border-border/50 overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="text-[10px] font-semibold h-9">Title</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Contact Person</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Category</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Mode</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Dates / Hours</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Participants</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Documents</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length > 0 ? (
                  filteredRecords.map((record) => (
                    <TableRow key={record.id} className="hover:bg-muted/10 border-border/30">
                      <TableCell className="text-[10px] py-2.5 px-3 font-medium max-w-[220px] truncate" title={record.training_title}>
                        {record.training_title || "-"}
                      </TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">
                        <div>{record.contact_person || "-"}</div>
                        <div className="text-muted-foreground">{record.contact_details || "-"}</div>
                      </TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">
                        {record.training_category === "OTHERS"
                          ? `Others: ${record.training_category_other || "-"}`
                          : record.training_category}
                      </TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">{record.training_mode}</TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">
                        {record.date_mode === "hours"
                          ? `${record.manual_hours || 0} hour/s`
                          : `${record.inclusive_dates?.length || 0} day/s`}
                      </TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">{record.participants_overall_total}</TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">
                        <DocumentPreview documents={record.documents} />
                      </TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 border-border/50"
                            title="View"
                            aria-label="View training record"
                            onClick={() => setViewRecord(record)}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 border-border/50"
                            title="Update"
                            aria-label="Update training record"
                            onClick={() => setEditRecord(record)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 border-border/50 text-destructive"
                            title="Delete"
                            aria-label="Delete training record"
                            disabled={isDeletingId === record.id}
                            onClick={() => handleDelete(record)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-xs text-muted-foreground">
                      No records found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[920px] p-6 max-h-[90vh] overflow-hidden">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-xs font-semibold flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4" /> Create Training
            </DialogTitle>
            <DialogDescription className="text-[10px]">
              Fill out the training form below.
            </DialogDescription>
          </DialogHeader>
          <TrainingsForm
            department={department || ""}
            userType={userType}
            unit={unit}
            unitOptions={unitOptions}
            existingPartnerAgencies={partnerAgencyOptions}
            onSuccess={handleSuccess}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editRecord} onOpenChange={(open) => !open && setEditRecord(null)}>
        <DialogContent className="sm:max-w-[920px] p-6 max-h-[90vh] overflow-hidden">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-semibold flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4" /> Update Training
            </DialogTitle>
            <DialogDescription className="text-[10px]">
              Update this training record.
            </DialogDescription>
          </DialogHeader>
          {editRecord && (
            <TrainingsForm
              department={department || ""}
              userType={userType}
              unit={unit}
              unitOptions={unitOptions}
              existingPartnerAgencies={partnerAgencyOptions}
              record={editRecord}
              onSuccess={handleSuccess}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewRecord} onOpenChange={(open) => !open && setViewRecord(null)}>
        <DialogContent className="sm:max-w-[920px] p-6 max-h-[90vh] overflow-hidden">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-semibold flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4" /> View Training
            </DialogTitle>
            <DialogDescription className="text-[10px]">
              View this training record.
            </DialogDescription>
          </DialogHeader>
          {viewRecord && (
            <TrainingsForm
              department={department || ""}
              userType={userType}
              unit={unit}
              unitOptions={unitOptions}
              existingPartnerAgencies={partnerAgencyOptions}
              record={viewRecord}
              isViewOnly
              onSuccess={() => setViewRecord(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader className="items-center text-center">
            <div className="rounded-full bg-[#159E44]/10 p-2">
              <CheckCircle2 className="h-7 w-7 text-[#159E44]" />
            </div>
            <DialogTitle className="text-sm">Success</DialogTitle>
            <DialogDescription className="text-[10px]">{successMessage}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center">
            <Button
              type="button"
              className="h-8 text-[10px] bg-[#159E44] hover:bg-[#128A3B]"
              onClick={() => setSuccessOpen(false)}
            >
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
