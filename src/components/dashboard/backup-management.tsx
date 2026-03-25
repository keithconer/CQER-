"use client";

import { useMemo, useRef, useState, useTransition, type ChangeEvent } from "react";
import { Download, FileUp, Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  createBackupExport,
  importBackupFile,
  type BackupDatasetSummary,
  type BackupFilePayload,
  type BackupSelection,
} from "@/lib/actions/backup";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type BackupManagementProps = {
  datasets: BackupDatasetSummary[];
};

export function BackupManagement({ datasets }: BackupManagementProps) {
  const router = useRouter();
  const [selection, setSelection] = useState<BackupSelection>("all");
  const [status, setStatus] = useState<{
    type: "idle" | "success" | "error";
    message: string;
  }>({
    type: "idle",
    message: "",
  });
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const availableDatasets = useMemo(
    () => datasets.filter((dataset) => dataset.available),
    [datasets]
  );

  const totalRecords = useMemo(
    () => availableDatasets.reduce((sum, dataset) => sum + dataset.count, 0),
    [availableDatasets]
  );

  const downloadBackup = () => {
    setStatus({ type: "idle", message: "" });
    startTransition(async () => {
      const result = await createBackupExport(selection);
      if (result.error || !result.data) {
        setStatus({
          type: "error",
          message: result.error || "Unable to create backup file.",
        });
        return;
      }

      const backup = result.data;
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const suffix = selection === "all" ? "all-records" : selection;
      const dateStamp = backup.createdAt.slice(0, 10);

      link.href = url;
      link.download = `cqer-backup-${suffix}-${dateStamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setStatus({
        type: "success",
        message: `Backup ready. ${backup.datasets.reduce(
          (sum, dataset) => sum + dataset.count,
          0
        )} record(s) exported.`,
      });
    });
  };

  const handleImportFile = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setStatus({ type: "idle", message: "" });

    let parsed: BackupFilePayload;
    try {
      const raw = await file.text();
      parsed = JSON.parse(raw) as BackupFilePayload;
    } catch {
      setStatus({
        type: "error",
        message: "The selected file is not a valid CQER backup JSON file.",
      });
      event.target.value = "";
      return;
    }

    startTransition(async () => {
      const result = await importBackupFile(parsed);
      if (result.error || !result.success) {
        setStatus({
          type: "error",
          message: result.error || "Unable to import backup file.",
        });
        return;
      }

      const skipped =
        result.skippedDatasets && result.skippedDatasets.length > 0
          ? ` Skipped: ${result.skippedDatasets.join(", ")}.`
          : "";

      setStatus({
        type: "success",
        message: `${result.restoredCount || 0} record(s) restored.${skipped}`,
      });
      router.refresh();
    });

    event.target.value = "";
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/50 shadow-none">
        <CardHeader className="gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-sm font-semibold">Create Backup</CardTitle>
              <CardDescription className="text-[11px] leading-5">
                Export the records created by your account, then import the same
                backup later to restore deleted rows on supported pages.
              </CardDescription>
            </div>
            <div className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-right">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Total records
              </div>
              <div className="text-sm font-semibold text-foreground">{totalRecords}</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
            <div className="space-y-2">
              <Label htmlFor="backup-selection" className="text-[11px] font-medium">
                Backup scope
              </Label>
              <Select
                value={selection}
                onValueChange={(value) => setSelection(value as BackupSelection)}
              >
                <SelectTrigger id="backup-selection" className="h-9 text-[11px]">
                  <SelectValue placeholder="Select what to back up" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-[11px]">
                    All supported records
                  </SelectItem>
                  {availableDatasets.map((dataset) => (
                    <SelectItem
                      key={dataset.key}
                      value={dataset.key}
                      className="text-[11px]"
                    >
                      {dataset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={downloadBackup}
              disabled={isPending || availableDatasets.length === 0}
              className="h-9 text-[11px]"
            >
              {isPending ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="mr-2 h-3.5 w-3.5" />
              )}
              Export Backup
            </Button>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={handleImportFile}
              />
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => fileInputRef.current?.click()}
                className="h-9 w-full text-[11px] md:w-auto"
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileUp className="mr-2 h-3.5 w-3.5" />
                )}
                Import Backup
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-[11px] leading-5 text-muted-foreground">
            The import is locked to the same account that created the backup file.
            This keeps restore ownership safe and prevents another user from
            importing someone else&apos;s records into their account.
          </div>

          {status.type !== "idle" && (
            <div
              className={`rounded-lg border px-3 py-2 text-[11px] leading-5 ${
                status.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {status.message}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-none">
        <CardHeader className="gap-2">
          <CardTitle className="text-sm font-semibold">Available Datasets</CardTitle>
          <CardDescription className="text-[11px] leading-5">
            Each export keeps the table rows exactly as your account created them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Page
                </TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Table
                </TableHead>
                <TableHead className="text-right text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Records
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {datasets.map((dataset) => (
                <TableRow key={dataset.key}>
                  <TableCell className="text-[11px] font-medium">{dataset.label}</TableCell>
                  <TableCell className="text-[11px] text-muted-foreground">
                    {dataset.table}
                  </TableCell>
                  <TableCell className="text-right text-[11px]">
                    {dataset.available ? dataset.count : "Unavailable"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-muted/10 shadow-none">
        <CardContent className="flex gap-3 pt-6">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="space-y-1 text-[11px] leading-5 text-muted-foreground">
            <p>
              Use one file per page if you want a smaller restore, or export
              everything if you want a full account-level backup.
            </p>
            <p>
              After import, the restored rows should appear again on their
              original tables once the dashboard refreshes.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
