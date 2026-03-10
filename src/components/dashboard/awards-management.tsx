"use client";

import * as React from "react";
import { Eye, Pencil, Plus, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AwardsForm } from "./awards-form";
import { deleteAward } from "@/lib/actions/awards";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DocumentPreview } from "./document-preview";

export interface AwardRecord {
  id: string;
  department: string;
  extension_ppa: string[] | null;
  award_recognition_received: string;
  donor: string;
  level: "local" | "regional" | "national" | "international";
  date_received: string;
  remarks: string | null;
  documents: { url: string; name: string }[] | null;
  created_by?: string | null;
}

interface AwardsManagementProps {
  initialAwards: AwardRecord[];
  department: string | null;
  currentUserId: string;
}

export function AwardsManagement({ initialAwards, department, currentUserId }: AwardsManagementProps) {
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editAward, setEditAward] = React.useState<AwardRecord | null>(null);
  const [viewAward, setViewAward] = React.useState<AwardRecord | null>(null);
  const [isDeletingId, setIsDeletingId] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedScopes, setSelectedScopes] = React.useState<string[]>([
    "created_by_me",
    "department_files",
  ]);
  const refreshTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  React.useEffect(() => {
    const supabase = createClient();
    const scheduleRefresh = () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      refreshTimeoutRef.current = setTimeout(() => {
        router.refresh();
      }, 500);
    };

    const channel = supabase
      .channel("awards-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "awards" }, scheduleRefresh)
      .subscribe();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [router]);

  const filteredAwards = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const scopedAwards = initialAwards.filter((award) => {
      const isMine = award.created_by === currentUserId;
      return (
        (selectedScopes.includes("created_by_me") && isMine) ||
        (selectedScopes.includes("department_files") && !isMine)
      );
    });
    if (!term) return scopedAwards;

    return scopedAwards.filter((award) => {
      const ppaText = Array.isArray(award.extension_ppa) ? award.extension_ppa.join(" ") : "";
      return (
        award.department?.toLowerCase().includes(term) ||
        award.award_recognition_received?.toLowerCase().includes(term) ||
        award.donor?.toLowerCase().includes(term) ||
        award.level?.toLowerCase().includes(term) ||
        award.remarks?.toLowerCase().includes(term) ||
        ppaText.toLowerCase().includes(term)
      );
    });
  }, [currentUserId, initialAwards, searchTerm, selectedScopes]);

  const toggleScopeFilter = (value: string) => {
    setSelectedScopes((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  };

  const handleSuccess = () => {
    setCreateOpen(false);
    setEditAward(null);
    router.refresh();
  };

  const handleDelete = async (award: AwardRecord) => {
    const confirmed = window.confirm("Delete this award record?");
    if (!confirmed) return;

    setIsDeletingId(award.id);
    const result = await deleteAward(award.id);
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
              <CardTitle className="text-xs font-semibold">Awards</CardTitle>
              <CardDescription className="text-[10px]">
                Manage award and recognition records.
              </CardDescription>
            </div>
            <Button
              size="sm"
              className="h-8 text-xs bg-[#159E44] hover:bg-[#128A3B] text-white"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Create Awards
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
                  <TableHead className="text-[10px] font-semibold h-9">Department</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Extension PPA</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Award/Recognition</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Donor</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Level</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Date Received</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Remarks</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Documents</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAwards.length > 0 ? (
                  filteredAwards.map((award) => (
                    <TableRow key={award.id} className="hover:bg-muted/10 border-border/30">
                      <TableCell className="text-[10px] py-2.5 px-3">{award.department || "-"}</TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">
                        {Array.isArray(award.extension_ppa) && award.extension_ppa.length > 0
                          ? award.extension_ppa.join(", ")
                          : "-"}
                      </TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">{award.award_recognition_received || "-"}</TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">{award.donor || "-"}</TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3 capitalize">{award.level || "-"}</TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">
                        {award.date_received ? format(new Date(award.date_received), "MMM d, yyyy") : "-"}
                      </TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">{award.remarks || "-"}</TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">
                        <DocumentPreview documents={award.documents} />
                      </TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 border-border/50"
                            onClick={() => setViewAward(award)}
                            title="View"
                            aria-label="View award"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 border-border/50"
                            onClick={() => setEditAward(award)}
                            title="Update"
                            aria-label="Update award"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 text-destructive border-border/50"
                            onClick={() => handleDelete(award)}
                            disabled={isDeletingId === award.id}
                            title="Delete"
                            aria-label="Delete award"
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
                      No awards found.
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
            <DialogTitle className="text-sm font-semibold">Create Awards</DialogTitle>
            <DialogDescription className="text-[10px]">
              Fill out the form below to register an award or recognition.
            </DialogDescription>
          </DialogHeader>
          <AwardsForm department={department || ""} onSuccess={handleSuccess} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editAward} onOpenChange={(open) => !open && setEditAward(null)}>
        <DialogContent className="sm:max-w-[760px] p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-semibold">Update Award</DialogTitle>
            <DialogDescription className="text-[10px]">
              Update the details for this award record.
            </DialogDescription>
          </DialogHeader>
          {editAward && (
            <AwardsForm department={department || ""} award={editAward} onSuccess={handleSuccess} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewAward} onOpenChange={(open) => !open && setViewAward(null)}>
        <DialogContent className="sm:max-w-[760px] p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-semibold">View Award</DialogTitle>
            <DialogDescription className="text-[10px]">
              View the award details.
            </DialogDescription>
          </DialogHeader>
          {viewAward && (
            <AwardsForm
              department={department || ""}
              award={viewAward}
              isViewOnly
              onSuccess={() => setViewAward(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
