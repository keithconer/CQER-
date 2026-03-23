"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Eye, Pencil, Trash2, Search, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NeedsAssessmentForm } from "./needs-assessment-form";
import { type NeedsAssessment, deleteNeedsAssessment } from "@/lib/actions/needs-assessment";
import { type Project } from "./projects-table";
import { useRouter } from "next/navigation";

interface NeedsAssessmentTableProps {
  assessments: NeedsAssessment[];
  assignedProjects: Project[];
  readOnly?: boolean;
  searchTerm?: string;
  onSearchTermChange?: (value: string) => void;
  showSearch?: boolean;
}

export function NeedsAssessmentTable({
  assessments,
  assignedProjects,
  readOnly = false,
  searchTerm: controlledSearchTerm,
  onSearchTermChange,
  showSearch = true,
}: NeedsAssessmentTableProps) {
  const router = useRouter();
  const [internalSearchTerm, setInternalSearchTerm] = React.useState("");
  const searchTerm = controlledSearchTerm !== undefined ? controlledSearchTerm : internalSearchTerm;

  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 5;

  const [viewDialogOpen, setViewDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [selectedAssessment, setSelectedAssessment] = React.useState<NeedsAssessment | null>(null);

  const filteredAssessments = React.useMemo(() => {
    return assessments.filter((a) => {
      const searchStr = searchTerm.toLowerCase();
      return (
        a.project_no?.toLowerCase().includes(searchStr) ||
        a.project_title?.toLowerCase().includes(searchStr) ||
        a.category?.toLowerCase().includes(searchStr) ||
        a.needs_assessment?.toLowerCase().includes(searchStr)
      );
    });
  }, [assessments, searchTerm]);

  const totalPages = Math.ceil(filteredAssessments.length / itemsPerPage);
  const currentData = filteredAssessments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onSearchTermChange) {
      onSearchTermChange(e.target.value);
    } else {
      setInternalSearchTerm(e.target.value);
    }
  };

  const handleView = (assessment: NeedsAssessment) => {
    setSelectedAssessment(assessment);
    setViewDialogOpen(true);
  };

  const handleEdit = (assessment: NeedsAssessment) => {
    setSelectedAssessment(assessment);
    setEditDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this needs assessment?")) return;
    try {
      await deleteNeedsAssessment(id);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Failed to delete assessment");
    }
  };

  const handleSuccess = () => {
    setEditDialogOpen(false);
    setViewDialogOpen(false);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      {showSearch && (
        <div className="flex items-center gap-2 max-w-sm">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search assessments..."
              className="pl-8 h-8 text-[10px] bg-muted/20 border-border/50"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
        </div>
      )}

      <div className="rounded-md border border-border/50 bg-background overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent border-b-border/50 text-[10px]">
              <TableHead className="font-medium h-9 w-[100px]">Project No.</TableHead>
              <TableHead className="font-medium h-9 max-w-[200px]">Project Title</TableHead>
              <TableHead className="font-medium h-9">Category</TableHead>
              <TableHead className="font-medium h-9">Date Conducted</TableHead>
              <TableHead className="font-medium h-9 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-[10px] text-muted-foreground">
                  No needs assessments found.
                </TableCell>
              </TableRow>
            ) : (
              currentData.map((assessment) => (
                <TableRow key={assessment.id} className="border-b-border/50 text-[10px]">
                  <TableCell className="font-medium truncate" title={assessment.project_no}>
                    {assessment.project_no}
                  </TableCell>
                  <TableCell className="truncate max-w-[200px]" title={assessment.project_title}>
                    {assessment.project_title}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium text-[9px]">
                      {assessment.category}
                    </span>
                  </TableCell>
                  <TableCell>{format(new Date(assessment.date_conducted), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/80" onClick={() => handleView(assessment)} title="View records">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {!readOnly && (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/80" onClick={() => handleEdit(assessment)} title="Edit Record">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(assessment.id)} title="Delete Data">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 text-[10px]">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <div className="flex items-center justify-center min-w-[3rem] px-2 h-6 border rounded-md text-muted-foreground">
              {currentPage} / {totalPages}
            </div>
            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {selectedAssessment && (
        <>
          <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
            <DialogContent className="sm:max-w-[700px] p-6 max-h-[90vh] overflow-y-auto">
              <DialogHeader className="pb-2 text-left">
                <DialogTitle className="text-xs font-semibold">Assessment Details</DialogTitle>
              </DialogHeader>
              <NeedsAssessmentForm
                initialData={selectedAssessment}
                assignedProjects={assignedProjects}
                isViewOnly={true}
                onSuccess={handleSuccess}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent className="sm:max-w-[700px] p-6 max-h-[90vh] overflow-y-auto">
              <DialogHeader className="pb-2 text-left">
                <DialogTitle className="text-xs font-semibold">Edit Needs Assessment</DialogTitle>
              </DialogHeader>
              <NeedsAssessmentForm
                initialData={selectedAssessment}
                assignedProjects={assignedProjects}
                onSuccess={handleSuccess}
              />
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
