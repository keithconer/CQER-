"use client";

import * as React from "react";
import { Eye, Pencil, Plus, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { deleteStudentInvolvement } from "@/lib/actions/student-involvement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StudentInvolvementForm } from "./student-involvement-form";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DocumentPreview } from "./document-preview";

export interface StudentInvolvementRecord {
  id: string;
  college: string;
  department: string;
  curricular_offering: string;
  total_students: number;
  involved_students: number;
  percentage: number;
  remarks: string | null;
  documents: { url: string; name: string }[] | null;
  created_by?: string | null;
}

interface StudentInvolvementManagementProps {
  initialRecords: StudentInvolvementRecord[];
  department: string | null;
  userType?: "super_admin" | "college_coordinator" | "unit_coordinator";
  unit?: string | null;
  unitOptions?: string[];
  currentUserId: string;
}

export function StudentInvolvementManagement({
  initialRecords,
  department,
  userType,
  unit,
  unitOptions = [],
  currentUserId,
}: StudentInvolvementManagementProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editRecord, setEditRecord] = React.useState<StudentInvolvementRecord | null>(null);
  const [viewRecord, setViewRecord] = React.useState<StudentInvolvementRecord | null>(null);
  const [isDeletingId, setIsDeletingId] = React.useState<string | null>(null);
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
      .channel("student-involvement-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "student_involvement" },
        scheduleRefresh
      )
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
        record.college,
        record.department,
        record.curricular_offering,
        String(record.total_students),
        String(record.involved_students),
        String(record.percentage),
        record.remarks || "",
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

  const handleSuccess = () => {
    setCreateOpen(false);
    setEditRecord(null);
    router.refresh();
  };

  const handleDelete = async (record: StudentInvolvementRecord) => {
    const confirmed = window.confirm("Delete this student involvement record?");
    if (!confirmed) return;

    setIsDeletingId(record.id);
    const result = await deleteStudentInvolvement(record.id);
    setIsDeletingId(null);

    if (result.error) {
      alert(`Error: ${result.error}`);
      return;
    }

    router.refresh();
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-xs font-semibold">Student Involvement</CardTitle>
              <CardDescription className="text-[10px]">
                Manage student involvement records for extension activities.
              </CardDescription>
            </div>
            <Button
              size="sm"
              className="h-8 text-xs bg-[#159E44] hover:bg-[#128A3B] text-white"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Create Student Involvement
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
                  <TableHead className="text-[10px] font-semibold h-9">College</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Department</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Curricular Offering</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Total (a)</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Involved (b)</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Percentage</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Remarks</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Documents</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length > 0 ? (
                  filteredRecords.map((record) => (
                    <TableRow key={record.id} className="hover:bg-muted/10 border-border/30">
                      <TableCell className="text-[10px] py-2.5 px-3">{record.college || "-"}</TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">{record.department || "-"}</TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">{record.curricular_offering || "-"}</TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">{record.total_students}</TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">{record.involved_students}</TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">{Number(record.percentage || 0).toFixed(2)}%</TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">{record.remarks || "-"}</TableCell>
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
                            aria-label="View student involvement record"
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
                            aria-label="Update student involvement record"
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
                            aria-label="Delete student involvement record"
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
                    <TableCell colSpan={9} className="h-24 text-center text-xs text-muted-foreground">
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
        <DialogContent className="sm:max-w-[760px] p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-semibold">Create Student Involvement</DialogTitle>
            <DialogDescription className="text-[10px]">
              Fill out the form below to create a student involvement record.
            </DialogDescription>
          </DialogHeader>
          <StudentInvolvementForm
            department={department || ""}
            userType={userType}
            unit={unit}
            unitOptions={unitOptions}
            onSuccess={handleSuccess}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editRecord} onOpenChange={(open) => !open && setEditRecord(null)}>
        <DialogContent className="sm:max-w-[760px] p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-semibold">Update Student Involvement</DialogTitle>
            <DialogDescription className="text-[10px]">
              Update this student involvement record.
            </DialogDescription>
          </DialogHeader>
          {editRecord && (
            <StudentInvolvementForm
              department={department || ""}
              userType={userType}
              unit={unit}
              unitOptions={unitOptions}
              record={editRecord}
              onSuccess={handleSuccess}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewRecord} onOpenChange={(open) => !open && setViewRecord(null)}>
        <DialogContent className="sm:max-w-[760px] p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-semibold">View Student Involvement</DialogTitle>
            <DialogDescription className="text-[10px]">
              View this student involvement record.
            </DialogDescription>
          </DialogHeader>
          {viewRecord && (
            <StudentInvolvementForm
              department={department || ""}
              userType={userType}
              unit={unit}
              unitOptions={unitOptions}
              record={viewRecord}
              isViewOnly
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
