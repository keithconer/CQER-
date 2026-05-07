"use client";

import * as React from "react";
import {
  Eye,
  FileDown,
  FileSpreadsheet,
  FileText,
  Loader2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  const tableMinWidth = React.useMemo(() => {
    if (columns.length <= 4) return 880;
    return Math.max(980, columns.length * 170);
  }, [columns.length]);

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
        <DialogContent className="flex h-[min(92vh,880px)] w-[min(96vw,1520px)] max-w-none flex-col overflow-hidden rounded-[28px] border border-border/70 bg-background p-0 shadow-2xl">
          <DialogHeader className="shrink-0 border-b bg-background px-6 py-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <Eye className="h-5 w-5 text-[#159E44]" />
                  {title} Preview
                </DialogTitle>
                <DialogDescription>
                  {description} Review the content first, then confirm the download.
                </DialogDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-wide">
                  <FormatIcon className="mr-1.5 h-3.5 w-3.5" />
                  {formatLabel}
                </Badge>
                <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px]">
                  {rows.length} record{rows.length === 1 ? "" : "s"}
                </Badge>
              </div>
            </div>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col bg-background px-6 py-5">
            <div className="shrink-0 rounded-2xl border border-border/60 bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
              The file will download only after you click the download button below.
            </div>

            <div className="mt-4 min-h-0 flex-1 overflow-hidden rounded-2xl border border-border/60 bg-card">
              <ScrollArea className="h-full w-full">
                <Table className="min-w-full bg-card" style={{ minWidth: `${tableMinWidth}px` }}>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent">
                      {columns.map((column) => (
                        <TableHead
                          key={column.key}
                          className={`h-11 text-sm font-semibold ${getAlignmentClass(column.align)}`}
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
                              className={`py-3 text-sm ${getAlignmentClass(column.align)}`}
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
                          className="h-28 whitespace-normal text-center text-sm text-muted-foreground"
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

          <div className="flex shrink-0 items-center justify-end gap-2 border-t bg-background px-6 py-4">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => setPreviewFormat(null)}
              disabled={downloading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-[#159E44] text-white hover:bg-[#128A3B]"
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
