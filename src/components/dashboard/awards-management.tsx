"use client";

import * as React from "react";
import { Plus, Search } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AwardsForm } from "./awards-form";

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
}

interface AwardsManagementProps {
  initialAwards: AwardRecord[];
  department: string | null;
}

export function AwardsManagement({ initialAwards, department }: AwardsManagementProps) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
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
    if (!term) return initialAwards;

    return initialAwards.filter((award) => {
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
  }, [initialAwards, searchTerm]);

  const handleSuccess = () => {
    setOpen(false);
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
              onClick={() => setOpen(true)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Create Awards
            </Button>
          </div>

          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-8 h-8 text-xs placeholder:text-[10px] bg-muted/20 border-border/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
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
                        {Array.isArray(award.documents) ? award.documents.length : 0}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-xs text-muted-foreground">
                      No awards found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
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
    </div>
  );
}
