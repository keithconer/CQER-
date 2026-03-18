"use client";

import * as React from "react";
import { ArrowRightLeft, ShieldMinus, UserMinus, UserRound } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deleteCoordinatorAccount,
  getCoordinatorUsageCounts,
  transferCoordinatorRole,
} from "@/lib/actions/accounts";
import { useRouter } from "next/navigation";

type RoleType = "super_admin" | "college_coordinator" | "unit_coordinator" | "project_leader" | "extension_office";
type TransferMode = "unit" | "college";

export interface TransferAccount {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  user_type: RoleType;
  department: string | null;
  unit: string | null;
}

interface TransferCoordinatorPanelProps {
  mode: TransferMode;
  accounts: TransferAccount[];
  department?: string | null;
}

function formatRole(role: RoleType) {
  if (role === "super_admin") return "Super Admin";
  if (role === "college_coordinator") return "College Coordinator";
  if (role === "project_leader") return "Project Leader";
  if (role === "extension_office") return "Extension Office";
  return "Unit Coordinator";
}

function formatName(account?: TransferAccount | null) {
  if (!account) return "";
  const name = `${account.first_name || ""} ${account.last_name || ""}`.trim();
  return name || account.email || "Unknown";
}

export function TransferCoordinatorPanel({
  mode,
  accounts,
  department,
}: TransferCoordinatorPanelProps) {
  const router = useRouter();
  const [sourceId, setSourceId] = React.useState("");
  const [targetId, setTargetId] = React.useState("");
  const [confirmText, setConfirmText] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [usageCounts, setUsageCounts] = React.useState<Record<string, number> | null>(null);
  const [usageTotal, setUsageTotal] = React.useState<number | null>(null);
  const [usageLoading, setUsageLoading] = React.useState(false);

  const sourceAccounts = React.useMemo(() => {
    if (mode === "unit") {
      return accounts.filter(
        (account) =>
          account.user_type === "unit_coordinator" &&
          account.department &&
          account.department === department
      );
    }
    return accounts.filter((account) => account.user_type === "college_coordinator");
  }, [accounts, department, mode]);

  const sourceAccount = sourceAccounts.find((account) => account.id === sourceId) || null;
  const expectedPhrase = sourceAccount ? `delete ${formatName(sourceAccount)}` : "";
  const confirmationMatched =
    expectedPhrase.length > 0 &&
    confirmText.trim().toLowerCase() === expectedPhrase.trim().toLowerCase();

  const targetAccounts = React.useMemo(() => {
    if (!sourceAccount) return [];
    return sourceAccounts.filter((account) => {
      if (account.id === sourceAccount.id) return false;
      if (mode === "unit") {
        if (account.department !== sourceAccount.department) return false;
        if (sourceAccount.unit && account.unit !== sourceAccount.unit) return false;
      } else {
        if (sourceAccount.department && account.department !== sourceAccount.department) return false;
      }
      return true;
    });
  }, [mode, sourceAccount, sourceAccounts]);

  React.useEffect(() => {
    let active = true;
    if (!sourceId) {
      setUsageCounts(null);
      setUsageTotal(null);
      return;
    }

    setUsageLoading(true);
    getCoordinatorUsageCounts(sourceId).then((result) => {
      if (!active) return;
      if ("error" in result) {
        setUsageCounts(null);
        setUsageTotal(null);
        setStatusMessage(result.error ?? "Failed to load account usage.");
      } else {
        setUsageCounts(result.counts);
        setUsageTotal(result.total);
      }
      setUsageLoading(false);
    });

    return () => {
      active = false;
    };
  }, [sourceId]);

  const canTransfer =
    confirmationMatched && !!sourceId && !!targetId && (usageTotal ?? 0) > 0;
  const canDeleteOnly =
    confirmationMatched && !!sourceId && usageTotal === 0;

  const handleTransfer = async () => {
    if (!canTransfer) return;
    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const result = await transferCoordinatorRole({
        sourceId,
        targetId,
        mode,
      });
      if (result?.error) {
        setStatusMessage(result.error || null);
      } else {
        setStatusMessage("Transfer completed. The old account was removed.");
        setSourceId("");
        setTargetId("");
        setConfirmText("");
        router.refresh();
      }
    } catch {
      setStatusMessage("Transfer failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOnly = async () => {
    if (!canDeleteOnly) return;
    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const result = await deleteCoordinatorAccount({
        sourceId,
        mode,
      });
      if (result?.error) {
        setStatusMessage(result.error || null);
      } else {
        setStatusMessage("Account deleted. No transfers were needed.");
        setSourceId("");
        setTargetId("");
        setConfirmText("");
        setUsageCounts(null);
        setUsageTotal(null);
        router.refresh();
      }
    } catch {
      setStatusMessage("Deletion failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const usageEntries = [
    { key: "projects", label: "Projects" },
    { key: "trainings", label: "Trainings" },
    { key: "awards", label: "Awards" },
    { key: "student_involvement", label: "Student" },
    { key: "faculty_involvement", label: "Faculty" },
    { key: "pool_of_experts", label: "Experts" },
    { key: "technologies_innovations", label: "Technologies" },
    { key: "ordinance_resolutions", label: "Ordinance" },
  ];

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-3 pt-4 px-4 space-y-2">
        <div className="flex items-center gap-2">
          <UserMinus className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-xs font-semibold">Transfer Coordinator Role</CardTitle>
        </div>
        <CardDescription className="text-[10px]">
          Move all records to a new coordinator before deleting the old account.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-semibold">Coordinator</p>
              <Badge variant="outline" className="text-[9px] border-border/50">
                {mode === "unit" ? "Unit Coordinators" : "College Coordinators"}
              </Badge>
            </div>
            <Select
              value={sourceId}
              onValueChange={(value) => {
                setSourceId(value);
                setTargetId("");
                setConfirmText("");
                setStatusMessage(null);
              }}
            >
              <SelectTrigger className="h-8 text-[10px] data-[placeholder]:text-[9px]">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {sourceAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id} className="text-[10px]">
                    {formatName(account)} • {account.department || "-"} {account.unit ? `• ${account.unit}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-semibold">Confirm deletion</p>
            <Input
              placeholder={expectedPhrase ? `Type "${expectedPhrase}"` : "Select account first"}
              className="h-8 text-[10px] placeholder:text-[9px]"
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              disabled={!sourceAccount}
            />
            <p className="text-[9px] text-muted-foreground">
              Type the exact phrase to unlock actions.
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[10px] font-semibold">Receiver account</p>
            </div>
            <Select
              value={targetId}
              onValueChange={setTargetId}
              disabled={!confirmationMatched || (usageTotal ?? 0) === 0}
            >
              <SelectTrigger className="h-8 text-[10px] data-[placeholder]:text-[9px]">
                <SelectValue
                  placeholder={
                    confirmationMatched
                      ? (usageTotal ?? 0) === 0
                        ? "No transfer required"
                        : "Select receiver"
                      : "Confirm deletion phrase"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {targetAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id} className="text-[10px]">
                    {formatName(account)} • {formatRole(account.user_type)} •{" "}
                    {account.department || "-"} {account.unit ? `• ${account.unit}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {sourceAccount && mode === "unit" && sourceAccount.unit && (
              <p className="text-[9px] text-muted-foreground">
                Receiver must be within {sourceAccount.unit}.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-semibold">Records created</p>
            <div className="flex flex-wrap gap-1.5">
              {usageLoading && (
                <Badge variant="outline" className="text-[9px] border-border/50">
                  Loading...
                </Badge>
              )}
              {!usageLoading && usageCounts && usageEntries.map((entry) => (
                <Badge key={entry.key} variant="outline" className="text-[9px] border-border/50">
                  {entry.label}: {usageCounts[entry.key] ?? 0}
                </Badge>
              ))}
              {!usageLoading && !usageCounts && (
                <Badge variant="outline" className="text-[9px] border-border/50">
                  Select an account
                </Badge>
              )}
            </div>
            {!usageLoading && usageTotal === 0 && sourceAccount && (
              <p className="text-[9px] text-muted-foreground">
                No records found. You can delete this account directly.
              </p>
            )}
          </div>
        </div>

        {statusMessage && (
          <div className="rounded-md border border-border/50 bg-muted/20 px-3 py-2 text-[10px] text-muted-foreground">
            {statusMessage}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button
            variant="outline"
            className="h-8 text-[10px]"
            onClick={handleDeleteOnly}
            disabled={!canDeleteOnly || isSubmitting}
          >
            <ShieldMinus className="mr-2 h-3 w-3" />
            Delete Account
          </Button>
          <Button
            onClick={handleTransfer}
            className="h-8 text-[10px]"
            disabled={!canTransfer || isSubmitting}
          >
            <ArrowRightLeft className="mr-2 h-3 w-3" />
            {isSubmitting ? "Transferring..." : "Transfer & Delete"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
