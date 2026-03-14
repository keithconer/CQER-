"use client";

import * as React from "react";
import { ArrowRightLeft, UserMinus, UserRound } from "lucide-react";
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
import { transferCoordinatorRole } from "@/lib/actions/accounts";
import { useRouter } from "next/navigation";

type RoleType = "super_admin" | "college_coordinator" | "unit_coordinator";
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

  const handleTransfer = async () => {
    if (!sourceId || !targetId || !confirmationMatched) return;
    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const result = await transferCoordinatorRole({
        sourceId,
        targetId,
        mode,
      });
      if (result?.error) {
        setStatusMessage(result.error);
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
      <CardContent className="px-4 pb-4 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-semibold">Coordinator to remove</p>
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
            <SelectTrigger className="h-8 text-[10px]">
              <SelectValue placeholder="Select account to transfer" />
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
          <p className="text-[10px] font-semibold">Deletion confirmation</p>
          <Input
            placeholder={expectedPhrase ? `Type "${expectedPhrase}"` : "Select an account first"}
            className="h-8 text-[10px]"
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            disabled={!sourceAccount}
          />
          <p className="text-[9px] text-muted-foreground">
            Type the exact phrase to unlock the transfer.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-[10px] font-semibold">New coordinator account</p>
          </div>
          <Select
            value={targetId}
            onValueChange={setTargetId}
            disabled={!confirmationMatched}
          >
            <SelectTrigger className="h-8 text-[10px]">
              <SelectValue
                placeholder={
                  confirmationMatched ? "Select receiver account" : "Confirm deletion phrase to continue"
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

        {statusMessage && (
          <div className="rounded-md border border-border/50 bg-muted/20 px-3 py-2 text-[10px] text-muted-foreground">
            {statusMessage}
          </div>
        )}

        <Button
          onClick={handleTransfer}
          className="h-8 text-[10px] w-full"
          disabled={!confirmationMatched || !sourceId || !targetId || isSubmitting}
        >
          <ArrowRightLeft className="mr-2 h-3 w-3" />
          {isSubmitting ? "Transferring..." : "Transfer & Delete"}
        </Button>
      </CardContent>
    </Card>
  );
}
