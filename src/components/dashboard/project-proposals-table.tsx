"use client";

import * as React from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteProject } from "@/lib/actions/projects";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProjectProposalForm } from "./project-proposal-form";

export interface ProjectProposal {
  id: string;
  created_by?: string | null;
  created_by_user_type?: "super_admin" | "college_coordinator" | "unit_coordinator" | null;
  created_by_unit?: string | null;
  entry_type?: "project_proposal" | string | null;
  title?: string | null;
  project_title?: string | null;
  classification?: string[] | null;
  proponents?: { name?: string }[] | null;
  co_project_leaders?: { name?: string }[] | null;
  proposal_department?: string | null;
  proposal_unit?: string | null;
  collaborating_agencies?: string | null;
  target_beneficiaries?: string[] | null;
  target_beneficiary_others?: string | null;
  community_location?: string | null;
  budget_total?: number | null;
  sdg_goals?: string[] | null;
  faculty_involved?: { name?: string }[] | null;
  documents?: { url: string; name: string }[] | null;
}

interface ProjectProposalsTableProps {
  proposals: ProjectProposal[];
  readOnly?: boolean;
  currentUserId?: string;
  searchTerm?: string;
  onSearchTermChange?: (value: string) => void;
  showSearch?: boolean;
  paginationAlign?: "between" | "right";
  formContext?: {
    userType?: "super_admin" | "college_coordinator" | "unit_coordinator";
    department?: string | null;
    unit?: string | null;
  };
}

export function ProjectProposalsTable({
  proposals,
  readOnly = false,
  currentUserId,
  searchTerm: controlledSearchTerm,
  onSearchTermChange,
  showSearch = true,
  paginationAlign = "between",
  formContext,
}: ProjectProposalsTableProps) {
  const [internalSearchTerm, setInternalSearchTerm] = React.useState("");
  const searchTerm = controlledSearchTerm ?? internalSearchTerm;
  const setSearchTerm = onSearchTermChange ?? setInternalSearchTerm;
  const [currentPage, setCurrentPage] = React.useState(1);
  const [viewProposal, setViewProposal] = React.useState<ProjectProposal | null>(null);
  const [editProposal, setEditProposal] = React.useState<ProjectProposal | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const router = useRouter();
  const itemsPerPage = 5;

  const filtered = React.useMemo(() => {
    const term = searchTerm.toLowerCase();
    return proposals.filter((proposal) =>
      [
        proposal.project_title || proposal.title || "",
        (proposal.classification || []).join(", "),
        (proposal.proponents || []).map((p) => p?.name || "").join(", "),
        proposal.proposal_department || "",
        proposal.proposal_unit || "",
        proposal.collaborating_agencies || "",
        (proposal.target_beneficiaries || []).join(", "),
        proposal.community_location || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [proposals, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const formatNames = (values?: { name?: string }[] | null) =>
    Array.isArray(values) && values.length > 0
      ? values.map((item) => item?.name || "").filter(Boolean).join(", ") || "-"
      : "-";

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const result = await deleteProject(deleteId);
      if (result.error) {
        alert(`Error: ${result.error}`);
      } else {
        setDeleteId(null);
        router.refresh();
      }
    } catch {
      alert("Something went wrong");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!proposals || proposals.length === 0) {
    return (
      <div className="text-center py-8 border border-dashed rounded-lg bg-muted/20">
        <p className="text-[10px] text-muted-foreground">No project proposals found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showSearch && (
        <div className="flex items-center justify-end gap-2">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="h-8 border-border/50 bg-muted/20 pl-8 text-[10px] placeholder:text-[10px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="rounded-md border border-border/50 overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent border-border/50">
              <TableHead className="text-[10px] font-semibold h-9">Project Title</TableHead>
              <TableHead className="text-[10px] font-semibold h-9">Classification</TableHead>
              <TableHead className="text-[10px] font-semibold h-9">Proponents</TableHead>
              <TableHead className="text-[10px] font-semibold h-9">Department</TableHead>
              <TableHead className="text-[10px] font-semibold h-9">Collaborating Agency</TableHead>
              <TableHead className="text-[10px] font-semibold h-9">Target Beneficiary</TableHead>
              <TableHead className="text-[10px] font-semibold h-9">Target Budget</TableHead>
              {!readOnly && <TableHead className="text-[10px] font-semibold h-9 text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length > 0 ? (
              paginated.map((proposal) => (
                <TableRow key={proposal.id} className="hover:bg-muted/10 border-border/30">
                  <TableCell className="text-[10px] py-2.5 px-3 font-medium max-w-[240px] truncate" title={proposal.project_title || proposal.title || "-"}>
                    {proposal.project_title || proposal.title || "-"}
                  </TableCell>
                  <TableCell className="text-[10px] py-2.5 px-3 max-w-[220px]">
                    <span className="line-clamp-2">{(proposal.classification || []).join(", ") || "-"}</span>
                  </TableCell>
                  <TableCell className="text-[10px] py-2.5 px-3 max-w-[220px]">
                    <span className="line-clamp-2">{formatNames(proposal.proponents)}</span>
                  </TableCell>
                  <TableCell className="text-[10px] py-2.5 px-3">
                    {[proposal.proposal_department, proposal.proposal_unit].filter(Boolean).join(" / ") || "-"}
                  </TableCell>
                  <TableCell className="text-[10px] py-2.5 px-3">{proposal.collaborating_agencies || "-"}</TableCell>
                  <TableCell className="text-[10px] py-2.5 px-3 max-w-[200px]">
                    <span className="line-clamp-2">
                      {[...(proposal.target_beneficiaries || []), proposal.target_beneficiary_others ? `others: ${proposal.target_beneficiary_others}` : ""].filter(Boolean).join(", ") || "-"}
                    </span>
                  </TableCell>
                  <TableCell className="text-[10px] py-2.5 px-3">
                    {typeof proposal.budget_total === "number"
                      ? new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(proposal.budget_total)
                      : "-"}
                  </TableCell>
                  {!readOnly && (
                    <TableCell className="py-2.5 px-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setViewProposal(proposal)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {(!currentUserId || proposal.created_by === currentUserId) && (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setEditProposal(proposal)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive/80 hover:bg-destructive/10" onClick={() => setDeleteId(proposal.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={readOnly ? 7 : 8} className="h-24 text-center text-[10px] text-muted-foreground">
                  No project proposals found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {filtered.length > 0 && (
        <div className={`flex items-center ${paginationAlign === "right" ? "justify-end" : "justify-between"} gap-2 px-2`}>
          {paginationAlign !== "right" && (
            <p className="text-[10px] text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filtered.length)} of {filtered.length} proposals
            </p>
          )}
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-7 w-7 border-border/50" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span className="text-[10px] font-medium px-2">Page {currentPage} of {totalPages}</span>
            <Button variant="outline" size="icon" className="h-7 w-7 border-border/50" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={!!viewProposal} onOpenChange={(open) => !open && setViewProposal(null)}>
        <DialogContent className="sm:max-w-[800px] p-6 max-h-[90vh] overflow-hidden">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-semibold">Project Proposal Details</DialogTitle>
            <DialogDescription className="text-[10px]">Viewing complete proposal information.</DialogDescription>
          </DialogHeader>
          {viewProposal && (
            <ProjectProposalForm
              proposal={viewProposal}
              isViewOnly
              currentUserType={formContext?.userType}
              currentDepartment={formContext?.department}
              currentUnit={formContext?.unit}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editProposal} onOpenChange={(open) => !open && setEditProposal(null)}>
        <DialogContent className="sm:max-w-[800px] p-6 max-h-[90vh] overflow-hidden">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-semibold">Edit Project Proposal</DialogTitle>
            <DialogDescription className="text-[10px]">Modify proposal information below.</DialogDescription>
          </DialogHeader>
          {editProposal && (
            <ProjectProposalForm
              proposal={editProposal}
              currentUserType={formContext?.userType}
              currentDepartment={formContext?.department}
              currentUnit={formContext?.unit}
              onSuccess={() => {
                setEditProposal(null);
                router.refresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader className="flex flex-col items-center justify-center pt-4">
            <div className="rounded-full bg-destructive/10 p-3 mb-4"><AlertTriangle className="h-10 w-10 text-destructive" /></div>
            <DialogTitle className="text-lg font-semibold text-center">Delete proposal?</DialogTitle>
            <DialogDescription className="text-[10px] text-center">This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)} className="h-9 text-[10px]">Cancel</Button>
            <Button variant="destructive" className="h-9 text-[10px] px-8" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
