"use client";

import * as React from "react";
import { ShieldCheck, Users2 } from "lucide-react";

import { AccountsTable, type AccountRow } from "@/components/dashboard/accounts-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SuperAdminDashboardProps {
  accounts: AccountRow[];
}

export function SuperAdminDashboard({
  accounts,
}: SuperAdminDashboardProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Card
        className="max-w-xl cursor-pointer border-border/50 bg-card/50 shadow-sm transition hover:border-primary/25 hover:bg-muted/20"
        onClick={() => setOpen(true)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users2 className="h-4 w-4 text-primary" />
                Total Users
              </CardTitle>
              <CardDescription className="text-xs">
                Open the full user directory with roles, departments, and units.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-[10px]">
              Super Admin
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between gap-4 rounded-2xl border border-border/50 bg-background/70 px-4 py-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Active Accounts
              </p>
              <p className="mt-2 text-3xl font-semibold leading-none text-foreground">
                {accounts.length.toLocaleString()}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>Existing Users</DialogTitle>
            <DialogDescription>
              Review all current accounts and their assigned roles,
              departments, and units.
            </DialogDescription>
          </DialogHeader>
          <AccountsTable
            accounts={accounts}
            title="All Users"
            description="All users currently registered in the system."
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
