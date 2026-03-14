"use client";

import * as React from "react";
import { CheckCircle2, Download, Eye, FileSpreadsheet, FileText, GraduationCap, LayoutPanelLeft, MousePointer2, Pencil, Plus, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { deleteTraining } from "@/lib/actions/trainings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DocumentPreview } from "./document-preview";
import { TrainingRecord, TrainingsForm } from "./trainings-form";
import { formatThematicAreaLetters } from "@/lib/thematic-area";

interface TrainingsManagementProps {
  initialRecords: TrainingRecord[];
  department: string | null;
  userType?: "super_admin" | "college_coordinator" | "unit_coordinator";
  unit?: string | null;
  unitOptions?: string[];
  partnerAgencyOptions?: string[];
  currentUserId: string;
}

function formatList(value: string[] | null): string {
  if (!value || !Array.isArray(value)) return "-";
  return value.join(", ");
}

function formatThematicAreas(value: string[] | null): string {
  const letters = formatThematicAreaLetters(value);
  return letters || "-";
}

function formatTrainingCategory(record: TrainingRecord): string {
  if (record.training_category === "OTHERS") {
    return `Others: ${record.training_category_other || "-"}`;
  }
  return record.training_category;
}

function toExportRows(records: TrainingRecord[]) {
  return records.map((record) => ({
    "College": record.college || "-",
    "Department": record.department || "-",
    "Lead Unit(s)": formatList(record.lead_units),
    "Contact Person": record.contact_person || "-",
    "Contact Details": record.contact_details || "-",
    "Title of Training": record.training_title || "-",
    "Category": formatTrainingCategory(record),
    "Mode": record.training_mode || "-",
    "Venue/Platform": record.venue_platform || "-",
    "Inclusive Dates / Hours": record.date_mode === "hours" 
      ? `${record.manual_hours || 0} hours` 
      : formatList(record.inclusive_dates),
    "Overall Total Participants": record.participants_overall_total || 0,
    "Male Total": record.participants_male_total || 0,
    "Female Total": record.participants_female_total || 0,
    "SDGs": formatList(record.sdg_goals),
    "Thematic Area": formatThematicAreas(record.thematic_area),
    "Partner Agencies": formatList(record.partner_agencies),
    "Remarks": record.remarks || "-",
  }));
}

export function TrainingsManagement({
  initialRecords,
  department,
  userType,
  unit,
  unitOptions = [],
  partnerAgencyOptions = [],
  currentUserId,
}: TrainingsManagementProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editRecord, setEditRecord] = React.useState<TrainingRecord | null>(null);
  const [viewRecord, setViewRecord] = React.useState<TrainingRecord | null>(null);
  const [isDeletingId, setIsDeletingId] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState("");
  const [successOpen, setSuccessOpen] = React.useState(false);
  const [selectedScopes, setSelectedScopes] = React.useState<string[]>([
    "created_by_me",
    "department_files",
  ]);
  const [showExportDialog, setShowExportDialog] = React.useState(false);
  const [selectedExportIds, setSelectedExportIds] = React.useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = React.useState(false);
  const [exportStep, setExportStep] = React.useState<1 | 2>(1);
  const [exportFormat, setExportFormat] = React.useState<"excel" | "pdf" | "both">("excel");

  const refreshTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  React.useEffect(() => {
    const supabase = createClient();
    const scheduleRefresh = () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = setTimeout(() => router.refresh(), 500);
    };

    const channel = supabase
      .channel("trainings-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "trainings" }, scheduleRefresh)
      .subscribe();

    return () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [router]);

  const filteredRecords = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const scopedRecords = initialRecords.filter((record) => {
      const isMine = record.created_by === currentUserId;
      return (
        (selectedScopes.includes("created_by_me") && isMine) ||
        (selectedScopes.includes("department_files") && !isMine)
      );
    });

    if (!term) return scopedRecords;

    return scopedRecords.filter((record) =>
      [
        record.training_title,
        record.contact_person,
        record.contact_details,
        record.venue_platform,
        record.training_category,
        record.training_mode,
        (record.related_curricular_offerings || []).join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [currentUserId, initialRecords, searchTerm, selectedScopes]);

  const toggleScopeFilter = (value: string) => {
    setSelectedScopes((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  };

  const handleSuccess = (action: "created" | "updated") => {
    setCreateOpen(false);
    setEditRecord(null);
    setSuccessMessage(action === "created" ? "Training created successfully." : "Training updated successfully.");
    setSuccessOpen(true);
    router.refresh();
  };

  const handleDelete = async (record: TrainingRecord) => {
    const confirmed = window.confirm("Delete this training record?");
    if (!confirmed) return;

    setIsDeletingId(record.id);
    const result = await deleteTraining(record.id);
    setIsDeletingId(null);

    if (result.error) {
      alert(`Error: ${result.error}`);
      return;
    }

    setSuccessMessage("Training deleted successfully.");
    setSuccessOpen(true);
    router.refresh();
  };

  const handleOpenExportDialog = () => {
    setExportStep(1);
    setSelectedExportIds(new Set(filteredRecords.map((r) => r.id)));
    setShowExportDialog(true);
  };

  const toggleExportSelection = (id: string) => {
    const next = new Set(selectedExportIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedExportIds(next);
  };

  const toggleExportAll = () => {
    if (selectedExportIds.size === filteredRecords.length) {
      setSelectedExportIds(new Set());
    } else {
      setSelectedExportIds(new Set(filteredRecords.map((r) => r.id)));
    }
  };

  const handleExportPDF = async (records: TrainingRecord[]) => {
    const { jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    
    // Always Landscape for better fit
    const doc = new jsPDF({
      orientation: "l",
      unit: "mm",
      format: "a4",
    });

    const year = new Date().getFullYear();
    const title = `Trainings (${year})`;
    
    // Add Title
    doc.setFontSize(12);
    doc.text(title, doc.internal.pageSize.getWidth() / 2, 12, { align: "center" });

    const rows = toExportRows(records);
    const tableData = rows.map(r => Object.values(r));
    const tableHeaders = [
      "College", "Department", "Lead Unit(s)", "Contact Person", "Contact Details", 
      "Title of Training", "Category", "Mode", "Venue/Platform", "Inclusive Dates / Hours", 
      "Overall Total Participants", "Male Total", "Female Total", "SDGs", "Thematic Area", 
      "Partner Agencies", "Remarks"
    ];

    autoTable(doc, {
      startY: 20,
      head: [tableHeaders],
      body: tableData,
      theme: "grid",
      headStyles: { 
        fillColor: [21, 158, 68], // #159E44
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: "bold",
        halign: "left"
      },
      styles: {
        fontSize: 7,
        cellPadding: 1.5,
        overflow: "linebreak",
        cellWidth: "auto",
        textColor: [0, 0, 0],
        lineWidth: 0.1,
      },
      columnStyles: {
        0: { cellWidth: 12 },  // College
        1: { cellWidth: 20 },  // Dept
        2: { cellWidth: 20 },  // Lead
        3: { cellWidth: 18 },  // Person
        4: { cellWidth: 18 },  // Details
        5: { cellWidth: 35 },  // Title
        6: { cellWidth: 15 },  // Category
        7: { cellWidth: 10 },  // Mode
        8: { cellWidth: 15 },  // Venue
        9: { cellWidth: 20 },  // Dates
        10: { cellWidth: 12 }, // Overall
        11: { cellWidth: 10 }, // Male
        12: { cellWidth: 10 }, // Female
        13: { cellWidth: 20 }, // SDGs
        14: { cellWidth: 15 }, // Thematic
        15: { cellWidth: 15 }, // Partners
        16: { cellWidth: 20 }, // Remarks
      },
      margin: { top: 15, left: 10, right: 10, bottom: 10 },
      didDrawPage: (data) => {
        // Optional: Add page numbering
        const str = "Page " + doc.getNumberOfPages();
        doc.setFontSize(8);
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
        doc.text(str, data.settings.margin.left, pageHeight - 5);
      }
    });

    const datePart = new Date().toISOString().slice(0, 10);
    doc.save(`trainings-export-${datePart}.pdf`);
  };

  const handleExportExcel = async (records: TrainingRecord[]) => {
    try {
      const ExcelJSImport = await import("exceljs/dist/exceljs.min.js");
      const ExcelJS = ExcelJSImport?.default ?? ExcelJSImport;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "CQER";
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet("Trainings");

      const rows = toExportRows(records);

      const columns = [
        { header: "College", key: "College", width: 15 },
        { header: "Department", key: "Department", width: 25 },
        { header: "Lead Unit(s)", key: "Lead Unit(s)", width: 25 },
        { header: "Contact Person", key: "Contact Person", width: 25 },
        { header: "Contact Details", key: "Contact Details", width: 25 },
        { header: "Title of Training", key: "Title of Training", width: 40 },
        { header: "Category", key: "Category", width: 20 },
        { header: "Mode", key: "Mode", width: 15 },
        { header: "Venue/Platform", key: "Venue/Platform", width: 25 },
        { header: "Inclusive Dates / Hours", key: "Inclusive Dates / Hours", width: 30 },
        { header: "Overall Total Participants", key: "Overall Total Participants", width: 22 },
        { header: "Male Total", key: "Male Total", width: 12 },
        { header: "Female Total", key: "Female Total", width: 12 },
        { header: "SDGs", key: "SDGs", width: 30 },
        { header: "Thematic Area", key: "Thematic Area", width: 25 },
        { header: "Partner Agencies", key: "Partner Agencies", width: 25 },
        { header: "Remarks", key: "Remarks", width: 30 },
      ];

      // Define columns first (this might populate Row 1 headers by default)
      worksheet.columns = columns.map(col => ({ key: col.key, width: col.width }));

      // Now override Row 1 with the Title
      const year = new Date().getFullYear();
      worksheet.mergeCells("A1:Q1");
      const titleCell = worksheet.getCell("A1");
      titleCell.value = `Trainings (${year})`;
      titleCell.font = { bold: true, size: 12, color: { argb: "FF000000" }, name: "Calibri" };
      titleCell.alignment = { vertical: "middle", horizontal: "center" };
      worksheet.getRow(1).height = 25;

      // Now set Row 2 for the Headers
      const headerRow = worksheet.getRow(2);
      headerRow.values = columns.map(c => c.header);
      headerRow.height = 24;
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, name: "Calibri", size: 11 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF159E44" } };
        cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
        cell.border = {
          top: { style: "thin", color: { argb: "FFD9D9D9" } },
          left: { style: "thin", color: { argb: "FFD9D9D9" } },
          bottom: { style: "thin", color: { argb: "FFD9D9D9" } },
          right: { style: "thin", color: { argb: "FFD9D9D9" } },
        };
      });

      // Add data rows
      rows.forEach((row) => worksheet.addRow(row));

      // Format data rows
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber <= 2) return;
        row.height = 20;
        row.eachCell((cell) => {
          cell.font = { name: "Calibri", size: 10, color: { argb: "FF000000" } };
          cell.alignment = { vertical: "top", horizontal: "left", wrapText: true };
          cell.border = {
            top: { style: "thin", color: { argb: "FFEDEDED" } },
            left: { style: "thin", color: { argb: "FFEDEDED" } },
            bottom: { style: "thin", color: { argb: "FFEDEDED" } },
            right: { style: "thin", color: { argb: "FFEDEDED" } },
          };
        });
      });

      worksheet.views = [{ state: "frozen", ySplit: 2 }];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const datePart = new Date().toISOString().slice(0, 10);
      anchor.href = url;
      anchor.download = `trainings-export-${datePart}.xlsx`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Failed to export Excel file.");
    }
  };

  const handleStartExport = async () => {
    if (selectedExportIds.size === 0) {
      alert("Please select at least one record to export.");
      return;
    }

    setIsExporting(true);
    const recordsToExport = filteredRecords.filter((r) => selectedExportIds.has(r.id));
    
    try {
      if (exportFormat === "excel" || exportFormat === "both") {
        await handleExportExcel(recordsToExport);
      }
      
      if (exportFormat === "pdf" || exportFormat === "both") {
        await handleExportPDF(recordsToExport);
      }
      
      setShowExportDialog(false);
    } catch (err) {
      console.error(err);
      alert("Error during export process.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-xs font-semibold">Trainings</CardTitle>
              <CardDescription className="text-[10px]">
                Manage training records and monitor participant metrics.
              </CardDescription>
            </div>
            <Button
              size="sm"
              className="h-8 text-[10px] bg-[#159E44] hover:bg-[#128A3B] text-white"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Create Training
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
            <div className="flex items-center gap-2 shrink-0">
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
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[10px] border-border/50 bg-muted/20"
                onClick={handleOpenExportDialog}
              >
                <FileSpreadsheet className="mr-1 h-3.5 w-3.5" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-4 pb-4">
          <div className="rounded-md border border-border/50 overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="text-[10px] font-semibold h-9">Title</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Contact Person</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Category</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Mode</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Dates / Hours</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Participants</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Documents</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length > 0 ? (
                  filteredRecords.map((record) => (
                    <TableRow key={record.id} className="hover:bg-muted/10 border-border/30">
                      <TableCell className="text-[10px] py-2.5 px-3 font-medium max-w-[220px] truncate" title={record.training_title}>
                        {record.training_title || "-"}
                      </TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">
                        <div>{record.contact_person || "-"}</div>
                        <div className="text-muted-foreground">{record.contact_details || "-"}</div>
                      </TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">
                        {record.training_category === "OTHERS"
                          ? `Others: ${record.training_category_other || "-"}`
                          : record.training_category}
                      </TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">{record.training_mode}</TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">
                        {record.date_mode === "hours"
                          ? `${record.manual_hours || 0} hour/s`
                          : `${record.inclusive_dates?.length || 0} day/s`}
                      </TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">{record.participants_overall_total}</TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">
                        <DocumentPreview documents={record.documents} />
                      </TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 border-border/50"
                            title="View"
                            aria-label="View training record"
                            onClick={() => setViewRecord(record)}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 border-border/50"
                            title="Update"
                            aria-label="Update training record"
                            onClick={() => setEditRecord(record)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 border-border/50 text-destructive"
                            title="Delete"
                            aria-label="Delete training record"
                            disabled={isDeletingId === record.id}
                            onClick={() => handleDelete(record)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-xs text-muted-foreground">
                      No records found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[920px] p-6 max-h-[90vh] overflow-hidden">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-xs font-semibold flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4" /> Create Training
            </DialogTitle>
            <DialogDescription className="text-[10px]">
              Fill out the training form below.
            </DialogDescription>
          </DialogHeader>
          <TrainingsForm
            department={department || ""}
            userType={userType}
            unit={unit}
            unitOptions={unitOptions}
            existingPartnerAgencies={partnerAgencyOptions}
            onSuccess={handleSuccess}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editRecord} onOpenChange={(open) => !open && setEditRecord(null)}>
        <DialogContent className="sm:max-w-[920px] p-6 max-h-[90vh] overflow-hidden">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-semibold flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4" /> Update Training
            </DialogTitle>
            <DialogDescription className="text-[10px]">
              Update this training record.
            </DialogDescription>
          </DialogHeader>
          {editRecord && (
            <TrainingsForm
              department={department || ""}
              userType={userType}
              unit={unit}
              unitOptions={unitOptions}
              existingPartnerAgencies={partnerAgencyOptions}
              record={editRecord}
              onSuccess={handleSuccess}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewRecord} onOpenChange={(open) => !open && setViewRecord(null)}>
        <DialogContent className="sm:max-w-[920px] p-6 max-h-[90vh] overflow-hidden">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-semibold flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4" /> View Training
            </DialogTitle>
            <DialogDescription className="text-[10px]">
              View this training record.
            </DialogDescription>
          </DialogHeader>
          {viewRecord && (
            <TrainingsForm
              department={department || ""}
              userType={userType}
              unit={unit}
              unitOptions={unitOptions}
              existingPartnerAgencies={partnerAgencyOptions}
              record={viewRecord}
              isViewOnly
              onSuccess={() => setViewRecord(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader className="items-center text-center">
            <div className="rounded-full bg-[#159E44]/10 p-2">
              <CheckCircle2 className="h-7 w-7 text-[#159E44]" />
            </div>
            <DialogTitle className="text-sm">Success</DialogTitle>
            <DialogDescription className="text-[10px]">{successMessage}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center">
            <Button
              type="button"
              className="h-8 text-[10px] bg-[#159E44] hover:bg-[#128A3B]"
              onClick={() => setSuccessOpen(false)}
            >
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Download className="h-4 w-4 text-[#159E44]" />
              {exportStep === 1 ? "Select Export Format" : "Select Records to Export"}
            </DialogTitle>
            <DialogDescription className="text-[10px]">
              {exportStep === 1 
                ? "Choose the format for your exported trainings report." 
                : "Choose which training records you want to include in the file."}
            </DialogDescription>
          </DialogHeader>

          {exportStep === 1 && (
            <div className="grid grid-cols-1 gap-2 py-4">
              <button
                onClick={() => {
                  setExportFormat("excel");
                  setExportStep(2);
                }}
                className={`flex items-center gap-3 w-full p-3 rounded-md border text-left transition-all hover:bg-muted/50 ${
                  exportFormat === "excel" ? "border-[#159E44] bg-[#159E44]/5" : "border-border/50"
                }`}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-[#159E44]/10 shrink-0">
                  <FileSpreadsheet className="h-4 w-4 text-[#159E44]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium leading-none mb-1">Spreadsheet (.xlsx)</p>
                  <p className="text-[9px] text-muted-foreground truncate">Best for data analysis and editing.</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setExportFormat("pdf");
                  setExportStep(2);
                }}
                className={`flex items-center gap-3 w-full p-3 rounded-md border text-left transition-all hover:bg-muted/50 ${
                  exportFormat === "pdf" ? "border-[#159E44] bg-[#159E44]/5" : "border-border/50"
                }`}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-muted/50 shrink-0">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium leading-none mb-1">Document (.pdf)</p>
                  <p className="text-[9px] text-muted-foreground truncate">Best for sharing and printing. Always in landscape.</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setExportFormat("both");
                  setExportStep(2);
                }}
                className={`flex items-center gap-3 w-full p-3 rounded-md border text-left transition-all hover:bg-muted/50 ${
                  exportFormat === "both" ? "border-[#159E44] bg-[#159E44]/5" : "border-border/50"
                }`}
              >
                <div className="flex -space-x-2 shrink-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-muted/50 border border-background">
                    <Download className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <div className="min-w-0 pl-1">
                  <p className="text-[10px] font-medium leading-none mb-1">Combined (Excel & PDF)</p>
                  <p className="text-[9px] text-muted-foreground truncate">Download both formats at once.</p>
                </div>
              </button>
            </div>
          )}

          {exportStep === 2 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-medium text-muted-foreground">
                  {selectedExportIds.size} of {filteredRecords.length} selected
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 text-[9px] px-2 h-auto"
                  onClick={toggleExportAll}
                >
                  {selectedExportIds.size === filteredRecords.length ? "Deselect All" : "Select All"}
                </Button>
              </div>
              <ScrollArea className="h-[300px] rounded-md border border-border/50 p-1">
                <div className="space-y-1">
                  {filteredRecords.map((record) => (
                    <label
                      key={record.id}
                      className="flex items-start gap-3 rounded-md border border-transparent px-2 py-2 hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        className="mt-0.5"
                        checked={selectedExportIds.has(record.id)}
                        onCheckedChange={() => toggleExportSelection(record.id)}
                      />
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-[10px] font-medium leading-none truncate">
                          {record.training_title}
                        </p>
                        <p className="text-[9px] text-muted-foreground truncate">
                          {record.department} • {record.training_category}
                        </p>
                      </div>
                    </label>
                  ))}
                  {filteredRecords.length === 0 && (
                    <div className="py-8 text-center text-[10px] text-muted-foreground">
                      No results found for current search/filter.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {exportStep === 2 && (
              <Button
                type="button"
                variant="outline"
                className="h-8 text-[10px]"
                onClick={() => setExportStep(1)}
                disabled={isExporting}
              >
                Back
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              className="h-8 text-[10px]"
              onClick={() => setShowExportDialog(false)}
              disabled={isExporting}
            >
              Cancel
            </Button>
            {exportStep === 2 && (
              <Button
                type="button"
                className="h-8 text-[10px] bg-[#159E44] hover:bg-[#128A3B]"
                onClick={handleStartExport}
                disabled={isExporting || selectedExportIds.size === 0}
              >
                {isExporting ? "Exporting..." : `Export ${selectedExportIds.size} Records`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
