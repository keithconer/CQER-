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
import { Eye, Pencil, Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConsultancyExtensionForm } from "./consultancy-extension-form";
import { type ConsultancyExtension, deleteConsultancyExtension } from "@/lib/actions/consultancy-extension";
import { type Project } from "./projects-table";
import { useRouter } from "next/navigation";

interface ConsultancyExtensionTableProps {
  extensions: ConsultancyExtension[];
  assignedProjects: Project[];
  readOnly?: boolean;
  searchTerm?: string;
  onSearchTermChange?: (value: string) => void;
  showSearch?: boolean;
}

export function ConsultancyExtensionTable({
  extensions,
  assignedProjects,
  readOnly = false,
  searchTerm: controlledSearchTerm,
  onSearchTermChange,
  showSearch = true,
}: ConsultancyExtensionTableProps) {
  const router = useRouter();
  const [internalSearchTerm, setInternalSearchTerm] = React.useState("");
  const searchTerm = controlledSearchTerm !== undefined ? controlledSearchTerm : internalSearchTerm;

  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 5;

  const [viewDialogOpen, setViewDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [selectedExtension, setSelectedExtension] = React.useState<ConsultancyExtension | null>(null);

  const filteredExtensions = React.useMemo(() => {
    return extensions.filter((e) => {
      const searchStr = searchTerm.toLowerCase();
      return (
        e.project_no?.toLowerCase().includes(searchStr) ||
        e.project_title?.toLowerCase().includes(searchStr) ||
        e.category?.toLowerCase().includes(searchStr) ||
        e.base_agency?.toLowerCase().includes(searchStr) ||
        e.nature_of_consultancy?.toLowerCase().includes(searchStr)
      );
    });
  }, [extensions, searchTerm]);

  const totalPages = Math.ceil(filteredExtensions.length / itemsPerPage);
  const currentData = filteredExtensions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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

  const handleView = (extension: ConsultancyExtension) => {
    setSelectedExtension(extension);
    setViewDialogOpen(true);
  };

  const handleEdit = (extension: ConsultancyExtension) => {
    setSelectedExtension(extension);
    setEditDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    try {
      await deleteConsultancyExtension(id);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Failed to delete record");
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
              placeholder="Search extensions..."
              className="pl-8 h-8 text-[10px] bg-muted/20 border-border/50"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
        </div>
      )}

      <div className="rounded-md border border-border/50 overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent border-border/50">
              <TableHead className="text-[10px] font-semibold h-9 w-[100px]">Project No.</TableHead>
              <TableHead className="text-[10px] font-semibold h-9 max-w-[200px]">Project Title</TableHead>
              <TableHead className="text-[10px] font-semibold h-9">Category</TableHead>
              <TableHead className="text-[10px] font-semibold h-9">Agency</TableHead>
              <TableHead className="text-[10px] font-semibold h-9">Status</TableHead>
              <TableHead className="text-[10px] font-semibold h-9 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentData.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="h-24 text-center text-[10px] text-muted-foreground bg-muted/30">
                  No consultancy extensions found.
                </TableCell>
              </TableRow>
            ) : (
              currentData.map((extension) => (
                <TableRow key={extension.id} className="hover:bg-muted/10 border-border/30 text-[10px]">
                  <TableCell className="py-2.5 px-3 font-medium truncate" title={extension.project_no}>
                    {extension.project_no}
                  </TableCell>
                  <TableCell className="py-2.5 px-3 truncate max-w-[200px]" title={extension.project_title}>
                    {extension.project_title}
                  </TableCell>
                  <TableCell className="py-2.5 px-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium text-[9px]">
                      {extension.category}
                    </span>
                  </TableCell>
                  <TableCell className="py-2.5 px-3 truncate max-w-[150px]" title={extension.base_agency || ""}>
                    {extension.base_agency}
                  </TableCell>
                  <TableCell className="py-2.5 px-3">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full font-medium text-[8px]",
                      extension.status === "Completed" 
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    )}>
                      {extension.status}
                    </span>
                  </TableCell>
                  <TableCell className="py-2.5 px-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/80" onClick={() => handleView(extension)} title="View records">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {!readOnly && (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/80" onClick={() => handleEdit(extension)} title="Edit Record">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(extension.id)} title="Delete Data">
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

      {selectedExtension && (
        <>
          <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
            <DialogContent className="sm:max-w-[700px] p-6 max-h-[90vh] overflow-y-auto">
              <DialogHeader className="pb-2 text-left">
                <DialogTitle className="text-xs font-semibold">Consultancy Extension Details</DialogTitle>
              </DialogHeader>
              <ConsultancyExtensionForm
                initialData={selectedExtension}
                assignedProjects={assignedProjects}
                isViewOnly={true}
                onSuccess={handleSuccess}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent className="sm:max-w-[700px] p-6 max-h-[90vh] overflow-y-auto">
              <DialogHeader className="pb-2 text-left">
                <DialogTitle className="text-xs font-semibold">Edit Consultancy Extension</DialogTitle>
              </DialogHeader>
              <ConsultancyExtensionForm
                initialData={selectedExtension}
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
