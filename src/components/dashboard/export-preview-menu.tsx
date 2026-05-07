"use client";

import * as React from "react";
import {
  Eye,
  FileDown,
  FileSpreadsheet,
  FileText,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type ExportPreviewFormat = "excel" | "pdf";

export type ExportPreviewColumn = {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
};

export type ExportPreviewRow = Record<string, React.ReactNode>;

interface ExportPreviewMenuProps {
  title: string;
  description: string;
  columns: ExportPreviewColumn[];
  rows: ExportPreviewRow[];
  onDownloadExcel: () => Promise<void> | void;
  onDownloadPdf: () => Promise<void> | void;
  triggerLabel?: string;
  triggerClassName?: string;
  dropdownAlign?: "start" | "center" | "end";
  emptyMessage?: string;
}

function getAlignmentClass(align?: ExportPreviewColumn["align"]) {
  if (align === "center") return "text-center";
  if (align === "right") return "text-right";
  return "text-left";
}

export function ExportPreviewMenu({
  title,
  description,
  columns,
  rows,
  onDownloadExcel,
  onDownloadPdf,
  triggerLabel = "Export",
  triggerClassName,
  dropdownAlign = "end",
  emptyMessage = "No records are available for this export yet.",
}: ExportPreviewMenuProps) {
  const [previewFormat, setPreviewFormat] = React.useState<ExportPreviewFormat | null>(null);
  const [downloading, setDownloading] = React.useState(false);

  const isExcel = previewFormat === "excel";
  const formatLabel = isExcel ? "Excel" : "PDF";
  const FormatIcon = isExcel ? FileSpreadsheet : FileText;

  const handleDownload = async () => {
    if (!previewFormat) return;

    setDownloading(true);
    try {
      if (previewFormat === "excel") {
        await onDownloadExcel();
      } else {
        await onDownloadPdf();
      }
      setPreviewFormat(null);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={triggerClassName}>
            <FileDown className="mr-2 h-4 w-4" />
            {triggerLabel}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={dropdownAlign}>
          <DropdownMenuItem onClick={() => setPreviewFormat("excel")}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Preview Excel
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setPreviewFormat("pdf")}>
            <FileText className="mr-2 h-4 w-4" />
            Preview PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={!!previewFormat} onOpenChange={(open) => !open && setPreviewFormat(null)}>
        <DialogContent
          showCloseButton={false}
          className="fixed inset-0 left-0 top-0 flex h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col overflow-hidden rounded-none border-0 bg-background p-0 shadow-none sm:max-w-none"
        >
          <div className="shrink-0 border-b border-border/40 bg-background px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-[#159E44]" />
                  <h1 className="text-xl font-bold text-foreground lg:text-2xl">{title} Preview</h1>
                </div>
                <p className="max-w-4xl text-sm leading-7 text-muted-foreground lg:text-base">
                  {description} Review the content first, then confirm the download.
                </p>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-xl border border-border/40 bg-muted/10 px-3 py-2.5">
                    <div className="flex items-start gap-2">
                      <FormatIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80">Export Format</p>
                        <p className="text-sm font-medium text-foreground lg:text-[15px]">{formatLabel}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/40 bg-muted/10 px-3 py-2.5">
                    <div className="flex items-start gap-2">
                      <FileDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80">Rows Included</p>
                        <p className="text-sm font-medium text-foreground lg:text-[15px]">
                          {rows.length} record{rows.length === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/40 bg-muted/10 px-3 py-2.5">
                    <div className="flex items-start gap-2">
                      <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80">Columns Visible</p>
                        <p className="text-sm font-medium text-foreground lg:text-[15px]">{columns.length} columns</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 rounded-full"
                onClick={() => setPreviewFormat(null)}
              >
                <span className="sr-only">Close preview</span>
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </Button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col bg-background px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
            <div className="shrink-0 rounded-2xl border border-border/60 bg-muted/10 px-4 py-3 text-sm text-muted-foreground lg:px-5 lg:py-4 lg:text-[15px]">
              The file will download only after you click the download button below.
            </div>

            <div className="mt-4 min-h-0 flex-1 overflow-hidden rounded-3xl border border-border/60 bg-card">
              <ScrollArea className="h-full w-full">
                <Table className="w-full table-fixed bg-card text-sm">
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent">
                      {columns.map((column) => (
                        <TableHead
                          key={column.key}
                          className={`h-14 whitespace-normal break-words px-4 text-sm leading-snug font-semibold lg:px-5 lg:text-[15px] ${getAlignmentClass(column.align)}`}
                        >
                          {column.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length > 0 ? (
                      rows.map((row, index) => (
                        <TableRow key={`preview-row-${index}`}>
                          {columns.map((column) => (
                            <TableCell
                              key={`${column.key}-${index}`}
                              className={`whitespace-normal break-words px-4 py-4 align-top text-sm leading-snug lg:px-5 lg:py-4 lg:text-[15px] ${getAlignmentClass(column.align)}`}
                            >
                              {row[column.key] ?? "-"}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length}
                          className="h-32 whitespace-normal px-4 text-center text-sm text-muted-foreground lg:text-[15px]"
                        >
                          {emptyMessage}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border/40 bg-background px-4 py-3 sm:px-6 lg:px-8 lg:py-4">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl px-5 text-sm lg:h-12 lg:px-6 lg:text-base"
              onClick={() => setPreviewFormat(null)}
              disabled={downloading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-11 rounded-xl bg-[#159E44] px-5 text-sm text-white hover:bg-[#128A3B] lg:h-12 lg:px-6 lg:text-base"
              onClick={() => void handleDownload()}
              disabled={downloading || rows.length === 0}
            >
              {downloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <DownloadIcon format={previewFormat} />
              )}
              {downloading ? "Preparing file..." : `Download ${formatLabel}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DownloadIcon({ format }: { format: ExportPreviewFormat | null }) {
  if (format === "excel") {
    return <FileSpreadsheet className="mr-2 h-4 w-4" />;
  }

  return <FileText className="mr-2 h-4 w-4" />;
}
