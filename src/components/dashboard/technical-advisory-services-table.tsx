"use client";

import * as React from "react";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Eye, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  deleteTechnicalAdvisoryService,
  type TechnicalAdvisoryServiceRecord,
} from "@/lib/actions/technical-advisory-services";
import { type Project } from "./projects-table";
import { TechnicalAdvisoryServicesForm } from "./technical-advisory-services-form";

interface TechnicalAdvisoryServicesTableProps {
  records: TechnicalAdvisoryServiceRecord[];
  assignedProjects: Project[];
  currentUserId: string;
  userType: "super_admin" | "college_coordinator" | "unit_coordinator";
  department?: string | null;
}

export function TechnicalAdvisoryServicesTable({
  records,
  assignedProjects,
  currentUserId,
  userType,
  department,
}: TechnicalAdvisoryServicesTableProps) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = React.useState(1);
  const [viewRecord, setViewRecord] = React.useState<TechnicalAdvisoryServiceRecord | null>(null);
  const [editRecord, setEditRecord] = React.useState<TechnicalAdvisoryServiceRecord | null>(null);
  const itemsPerPage = 5;

  const totalPages = Math.ceil(records.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentRecords = records.slice(startIndex, startIndex + itemsPerPage);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [records]);

  const canManageRecord = (record: TechnicalAdvisoryServiceRecord) => {
    if (userType === "super_admin") return true;
    if (userType === "college_coordinator") return record.department === department;
    return record.created_by === currentUserId;
  };

  const handleDelete = async (record: TechnicalAdvisoryServiceRecord) => {
    if (!confirm("Delete this technical advisory services record?")) return;
    try {
      await deleteTechnicalAdvisoryService(record.id);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Failed to delete record.");
    }
  };

  const closeAndRefresh = () => {
    setViewRecord(null);
    setEditRecord(null);
    router.refresh();
  };

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-border/50 overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent border-border/50">
              <TableHead className="h-9 text-[10px] font-semibold">Project No.</TableHead>
              <TableHead className="h-9 text-[10px] font-semibold">Project Title</TableHead>
              <TableHead className="h-9 text-[10px] font-semibold">Date</TableHead>
              <TableHead className="h-9 text-[10px] font-semibold">Venue</TableHead>
              <TableHead className="h-9 text-[10px] font-semibold">Service Provided</TableHead>
              <TableHead className="h-9 text-[10px] font-semibold">Clients</TableHead>
              <TableHead className="h-9 text-[10px] font-semibold">Department/Unit</TableHead>
              <TableHead className="h-9 text-[10px] font-semibold">Created By</TableHead>
              <TableHead className="h-9 text-right text-[10px] font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentRecords.length > 0 ? (
              currentRecords.map((record) => (
                <TableRow key={record.id} className="border-border/30 hover:bg-muted/10">
                  <TableCell className="py-2.5 px-3 text-[10px] font-medium">{record.project_no}</TableCell>
                  <TableCell className="py-2.5 px-3 text-[10px] max-w-[220px]">
                    <span className="line-clamp-2" title={record.project_title}>{record.project_title}</span>
                  </TableCell>
                  <TableCell className="py-2.5 px-3 text-[10px]">
                    {record.advisory_date ? format(new Date(record.advisory_date), "MMM d, yyyy") : "-"}
                  </TableCell>
                  <TableCell className="py-2.5 px-3 text-[10px]">{record.venue || "-"}</TableCell>
                  <TableCell className="py-2.5 px-3 text-[10px]">
                    {record.service_provided === "Others" ? record.service_provided_other || "Others" : record.service_provided}
                  </TableCell>
                  <TableCell className="py-2.5 px-3 text-[10px]">{record.clients?.length || 0}</TableCell>
                  <TableCell className="py-2.5 px-3 text-[10px]">{[record.department, record.unit].filter(Boolean).join(" / ") || "-"}</TableCell>
                  <TableCell className="py-2.5 px-3 text-[10px]">{record.created_by_name || "-"}</TableCell>
                  <TableCell className="py-2.5 px-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button type="button" variant="outline" size="icon" className="h-7 w-7 border-border/50" onClick={() => setViewRecord(record)} title="View">
                        <Eye className="h-3 w-3" />
                      </Button>
                      {canManageRecord(record) && (
                        <>
                          <Button type="button" variant="outline" size="icon" className="h-7 w-7 border-border/50" onClick={() => setEditRecord(record)} title="Update">
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button type="button" variant="outline" size="icon" className="h-7 w-7 border-border/50 text-destructive" onClick={() => void handleDelete(record)} title="Delete">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-xs text-muted-foreground">No technical advisory services found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-1">
          <Button variant="outline" size="icon" className="h-7 w-7 border-border/50" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1}>
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <span className="px-2 text-[10px] font-medium">Page {currentPage} of {totalPages}</span>
          <Button variant="outline" size="icon" className="h-7 w-7 border-border/50" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages}>
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      )}

      <Dialog open={!!viewRecord} onOpenChange={(open) => !open && setViewRecord(null)}>
        <DialogContent className="sm:max-w-[900px] p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-semibold">Technical Advisory Services Details</DialogTitle>
            <DialogDescription className="text-[10px]">View the complete record details.</DialogDescription>
          </DialogHeader>
          {viewRecord && <TechnicalAdvisoryServicesForm assignedProjects={assignedProjects} initialData={viewRecord} isViewOnly />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editRecord} onOpenChange={(open) => !open && setEditRecord(null)}>
        <DialogContent className="sm:max-w-[900px] p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-semibold">Update Technical Advisory Services</DialogTitle>
            <DialogDescription className="text-[10px]">Update the selected record below.</DialogDescription>
          </DialogHeader>
          {editRecord && <TechnicalAdvisoryServicesForm assignedProjects={assignedProjects} initialData={editRecord} onSuccess={closeAndRefresh} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
