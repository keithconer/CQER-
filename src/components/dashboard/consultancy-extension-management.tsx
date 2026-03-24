"use client";

import * as React from "react";
import { Plus, Search, SlidersHorizontal, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConsultancyExtensionForm } from "./consultancy-extension-form";
import { ConsultancyExtensionTable } from "./consultancy-extension-table";
import { type ConsultancyExtension } from "@/lib/actions/consultancy-extension";
import { type Project } from "./projects-table";
import { useRouter } from "next/navigation";

interface ConsultancyExtensionManagementProps {
  initialExtensions: ConsultancyExtension[];
  assignedProjects: Project[];
  readOnly?: boolean;
}

export function ConsultancyExtensionManagement({
  initialExtensions,
  assignedProjects,
  readOnly,
}: ConsultancyExtensionManagementProps) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedStatus, setSelectedStatus] = React.useState<string[]>([]);
  const router = useRouter();

  const filteredExtensions = React.useMemo(() => {
    let result = initialExtensions;
    if (selectedStatus.length > 0) {
      result = result.filter((e) => selectedStatus.includes(e.status));
    }
    return result;
  }, [initialExtensions, selectedStatus]);

  const handleSuccess = () => {
    setOpen(false);
    router.refresh();
  };

  const toggleStatus = (status: string) => {
    setSelectedStatus((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Briefcase className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xs font-semibold">Consultancy Extension</CardTitle>
                <CardDescription className="text-[10px]">
                  Manage consultancy extension records.
                </CardDescription>
              </div>
            </div>
            {!readOnly && (
              <Button
                size="sm"
                className="text-[10px] h-8 bg-[#159E44] hover:bg-[#128A3B] text-white"
                onClick={() => setOpen(true)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Consultancy Extension
              </Button>
            )}
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
                <DropdownMenuLabel className="text-[10px]">Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  className="text-[10px]"
                  checked={selectedStatus.includes("On-going")}
                  onCheckedChange={() => toggleStatus("On-going")}
                >
                  On-going
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  className="text-[10px]"
                  checked={selectedStatus.includes("Completed")}
                  onCheckedChange={() => toggleStatus("Completed")}
                >
                  Completed
                </DropdownMenuCheckboxItem>
                {selectedStatus.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                      className="text-[10px]"
                      checked={false}
                      onCheckedChange={() => setSelectedStatus([])}
                    >
                      Clear Filters
                    </DropdownMenuCheckboxItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <ConsultancyExtensionTable
            extensions={filteredExtensions}
            assignedProjects={assignedProjects}
            readOnly={readOnly}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            showSearch={false}
          />
        </CardContent>
      </Card>

      {!readOnly && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-[700px] p-6 max-h-[90vh] overflow-y-auto">
            <DialogHeader className="pb-2 text-left">
              <DialogTitle className="text-xs font-semibold">Add Consultancy Extension</DialogTitle>
            </DialogHeader>
            <ConsultancyExtensionForm
              assignedProjects={assignedProjects}
              onSuccess={handleSuccess}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
