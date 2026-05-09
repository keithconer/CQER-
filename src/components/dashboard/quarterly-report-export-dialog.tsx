"use client";

import * as React from "react";
import { CheckSquare, Download, FileSpreadsheet, Loader2, Search, Square } from "lucide-react";

import { QUARTERLY_REPORT_TABLES } from "@/lib/quarterly-report/config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

interface QuarterlyReportExportDialogProps {
  college: string;
  generatedBy: string;
}

const quarterOptions = ["First Quarter", "Second Quarter", "Third Quarter", "Fourth Quarter"];

function currentAcademicYear() {
  const now = new Date();
  const year = now.getFullYear();
  return `${year}-${year + 1}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function QuarterlyReportExportDialog({ college, generatedBy }: QuarterlyReportExportDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [academicYear, setAcademicYear] = React.useState(currentAcademicYear);
  const [quarter, setQuarter] = React.useState("First Quarter");
  const [collegeValue, setCollegeValue] = React.useState(college);
  const [generatedByValue, setGeneratedByValue] = React.useState(generatedBy);
  const [dateGenerated, setDateGenerated] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [search, setSearch] = React.useState("");
  const [selectedTables, setSelectedTables] = React.useState<string[]>(
    QUARTERLY_REPORT_TABLES.map((table) => table.sheetName)
  );
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => setCollegeValue(college), [college]);
  React.useEffect(() => setGeneratedByValue(generatedBy), [generatedBy]);

  const filteredTables = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return QUARTERLY_REPORT_TABLES;
    return QUARTERLY_REPORT_TABLES.filter((table) =>
      `${table.sheetName} ${table.title}`.toLowerCase().includes(needle)
    );
  }, [search]);

  const allSelected = selectedTables.length === QUARTERLY_REPORT_TABLES.length;

  function toggleTable(sheetName: string, checked: boolean) {
    setSelectedTables((current) => {
      if (checked) return Array.from(new Set([...current, sheetName]));
      return current.filter((item) => item !== sheetName);
    });
  }

  async function generateReport() {
    if (selectedTables.length === 0) {
      setError("Select at least one table to export.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/quarterly-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYear,
          quarter,
          college: collegeValue,
          generatedBy: generatedByValue,
          dateGenerated,
          selectedTables,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "Unable to generate the quarterly report.");
      }

      const blob = await response.blob();
      downloadBlob(
        blob,
        `quarterly-report-${quarter.toLowerCase().replace(/\s+/g, "-")}-${dateGenerated}.xlsx`
      );
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate the quarterly report.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 text-xs">
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Generate Quarterly Report
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-sm">Generate Quarterly Report</DialogTitle>
          <DialogDescription className="text-xs">
            Select one or more official EXTN-QF-02 worksheets. Matching system data is filled in; unavailable
            template columns remain blank for manual completion.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div className="space-y-3">
            <div className="rounded-lg border border-border/60 p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-medium">Quarter Information</p>
                  <p className="text-[11px] text-muted-foreground">Included on the preserved cover page.</p>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {selectedTables.length} selected
                </Badge>
              </div>
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-[11px]">Academic Year</Label>
                  <Input value={academicYear} onChange={(event) => setAcademicYear(event.target.value)} className="h-8 text-xs" />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-[11px]">Quarter</Label>
                  <Select value={quarter} onValueChange={setQuarter}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select quarter" />
                    </SelectTrigger>
                    <SelectContent>
                      {quarterOptions.map((option) => (
                        <SelectItem key={option} value={option} className="text-xs">
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-[11px]">College/Campus</Label>
                  <Input value={collegeValue} onChange={(event) => setCollegeValue(event.target.value)} className="h-8 text-xs" />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-[11px]">Generated By</Label>
                  <Input value={generatedByValue} onChange={(event) => setGeneratedByValue(event.target.value)} className="h-8 text-xs" />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-[11px]">Date Generated</Label>
                  <Input
                    type="date"
                    value={dateGenerated}
                    onChange={(event) => setDateGenerated(event.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="min-w-0 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search official table tabs..."
                  className="h-8 pl-8 text-xs"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setSelectedTables(QUARTERLY_REPORT_TABLES.map((table) => table.sheetName))}
                >
                  <CheckSquare className="mr-2 h-3.5 w-3.5" />
                  All
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setSelectedTables([])}
                >
                  <Square className="mr-2 h-3.5 w-3.5" />
                  None
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[420px] rounded-lg border border-border/60">
              <div className="divide-y divide-border/50">
                {filteredTables.map((table) => {
                  const checked = selectedTables.includes(table.sheetName);
                  return (
                    <label
                      key={table.sheetName}
                      className="flex cursor-pointer items-start gap-3 px-3 py-2.5 transition hover:bg-muted/40"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) => toggleTable(table.sheetName, value === true)}
                        className="mt-0.5"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-medium">{table.sheetName}</span>
                        <span className="block truncate text-[10px] text-muted-foreground">{table.title}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </ScrollArea>

            <Separator />
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] text-muted-foreground">
                {allSelected ? "All official tables will be included." : "Only selected tabs will be included."}
              </p>
              <Button size="sm" className="h-8 text-xs" onClick={generateReport} disabled={isGenerating || selectedTables.length === 0}>
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Generate Excel
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
