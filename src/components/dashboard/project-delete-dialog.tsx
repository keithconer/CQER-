"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Link2, Loader2, Trash2 } from "lucide-react";

import { deleteProject, getProjectDeletionImpact } from "@/lib/actions/projects";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ProjectDeleteDialogProps {
  projectId: string | null;
  projectTitle?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

interface DeleteImpactState {
  totalConnectedRecords: number;
  breakdown: { label: string; count: number }[];
}

export function ProjectDeleteDialog({
  projectId,
  projectTitle,
  open,
  onOpenChange,
  onDeleted,
}: ProjectDeleteDialogProps) {
  const [impact, setImpact] = React.useState<DeleteImpactState | null>(null);
  const [loadingImpact, setLoadingImpact] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [successOpen, setSuccessOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open || !projectId) {
      setImpact(null);
      return;
    }

    let isActive = true;
    setLoadingImpact(true);
    void getProjectDeletionImpact(projectId)
      .then((result) => {
        if (!isActive) return;
        if (result.error) {
          setImpact({ totalConnectedRecords: 0, breakdown: [] });
          return;
        }
        setImpact(result.data ?? { totalConnectedRecords: 0, breakdown: [] });
      })
      .finally(() => {
        if (isActive) setLoadingImpact(false);
      });

    return () => {
      isActive = false;
    };
  }, [open, projectId]);

  const handleDelete = async () => {
    if (!projectId) return;
    setIsDeleting(true);
    try {
      const result = await deleteProject(projectId);
      if (result.error) {
        alert(result.error);
        return;
      }

      onOpenChange(false);
      setSuccessOpen(true);
      onDeleted?.();
    } catch {
      alert("Something went wrong while deleting this record.");
    } finally {
      setIsDeleting(false);
    }
  };

  const connectedCount = impact?.totalConnectedRecords || 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader className="space-y-3">
            <div className="mx-auto rounded-full bg-destructive/10 p-3">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div className="space-y-1 text-center">
              <DialogTitle className="text-sm">Delete project record</DialogTitle>
              <DialogDescription className="text-[11px] leading-relaxed">
                This will permanently remove <span className="font-medium text-foreground">{projectTitle || "this project"}</span>.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
              {loadingImpact ? (
                <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Checking connected records...
                </div>
              ) : connectedCount > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-[11px]">
                    <Link2 className="mt-0.5 h-3.5 w-3.5 text-amber-600" />
                    <p className="leading-relaxed text-foreground">
                      This record is connected to <span className="font-semibold">{connectedCount}</span> record{connectedCount === 1 ? "" : "s"}. Are you sure you want to delete it?
                    </p>
                  </div>
                  <div className="space-y-1 pl-5">
                    {impact?.breakdown.map((item) => (
                      <p key={item.label} className="text-[10px] text-muted-foreground">
                        {item.count} {item.label}
                      </p>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  No connected records were found. This action cannot be undone.
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="outline" className="h-8 rounded-xl text-[10px]" onClick={() => onOpenChange(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" className="h-8 rounded-xl text-[10px]" onClick={() => void handleDelete()} disabled={isDeleting || loadingImpact}>
              {isDeleting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="sm:max-w-sm rounded-3xl">
          <DialogHeader className="space-y-3">
            <div className="mx-auto rounded-full bg-emerald-500/10 p-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="space-y-1 text-center">
              <DialogTitle className="text-sm">Deleted successfully</DialogTitle>
              <DialogDescription className="text-[11px]">
                The record was deleted successfully.
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button className="h-8 rounded-xl text-[10px]" onClick={() => setSuccessOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
