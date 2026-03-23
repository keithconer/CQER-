"use client";

import * as React from "react";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
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
import { NeedsAssessmentForm } from "./needs-assessment-form";
import { NeedsAssessmentTable } from "./needs-assessment-table";
import { type NeedsAssessment } from "@/lib/actions/needs-assessment";
import { type Project } from "./projects-table";
import { useRouter } from "next/navigation";

interface NeedsAssessmentManagementProps {
  initialAssessments: NeedsAssessment[];
  assignedProjects: Project[];
  readOnly?: boolean;
}

export function NeedsAssessmentManagement({
  initialAssessments,
  assignedProjects,
  readOnly,
}: NeedsAssessmentManagementProps) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([]);
  const router = useRouter();

  const filteredAssessments = React.useMemo(() => {
    let result = initialAssessments;
    if (selectedCategories.length > 0) {
      result = result.filter((a) => selectedCategories.includes(a.category));
    }
    return result;
  }, [initialAssessments, selectedCategories]);

  const handleSuccess = () => {
    setOpen(false);
    router.refresh();
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-xs font-semibold">Needs Assessments</CardTitle>
              <CardDescription className="text-[10px]">
                Manage project needs assessment records.
              </CardDescription>
            </div>
            {!readOnly && (
              <Button
                size="sm"
                className="text-[10px] h-8 bg-[#159E44] hover:bg-[#128A3B] text-white"
                onClick={() => setOpen(true)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Create an Assessment
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
                <DropdownMenuLabel className="text-[10px]">Category</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  className="text-[10px]"
                  checked={selectedCategories.includes("Internal")}
                  onCheckedChange={() => toggleCategory("Internal")}
                >
                  Internal
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  className="text-[10px]"
                  checked={selectedCategories.includes("External")}
                  onCheckedChange={() => toggleCategory("External")}
                >
                  External
                </DropdownMenuCheckboxItem>
                {selectedCategories.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                      className="text-[10px]"
                      checked={false}
                      onCheckedChange={() => setSelectedCategories([])}
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
          <NeedsAssessmentTable
            assessments={filteredAssessments}
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
              <DialogTitle className="text-xs font-semibold">Create Needs Assessment</DialogTitle>
            </DialogHeader>
            <NeedsAssessmentForm
              assignedProjects={assignedProjects}
              onSuccess={handleSuccess}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
