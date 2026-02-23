"use client";

import * as React from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { CoordinatorRegistration } from "./coordinator-registration";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface UnitCoordinatorAccount {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  department: string | null;
  unit: string | null;
  created_at: string | null;
}

interface UnitCoordinatorsPanelProps {
  accounts: UnitCoordinatorAccount[];
  department?: string | null;
}

const ITEMS_PER_PAGE = 8;

export function UnitCoordinatorsPanel({ accounts, department }: UnitCoordinatorsPanelProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);

  const filteredAccounts = React.useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return accounts.filter((account) => {
      const fullName = `${account.first_name || ""} ${account.last_name || ""}`.toLowerCase();
      return (
        fullName.includes(term) ||
        (account.email || "").toLowerCase().includes(term) ||
        (account.department || "").toLowerCase().includes(term) ||
        (account.unit || "").toLowerCase().includes(term)
      );
    });
  }, [accounts, searchTerm]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredAccounts.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedAccounts = filteredAccounts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="space-y-4">
      <CoordinatorRegistration
        userType="unit_coordinator"
        title="Unit Coordinators"
        description="Register emails of Unit coordinators for your department."
        department={department || undefined}
      />

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4 space-y-3">
          <div>
            <CardTitle className="text-xs font-semibold">Registered Unit Coordinators</CardTitle>
            <CardDescription className="text-[10px]">
              Accounts under your department units.
            </CardDescription>
          </div>
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-8 h-8 text-xs placeholder:text-[10px] bg-muted/20 border-border/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>

        <CardContent className="px-4 pb-4 space-y-3">
          <div className="rounded-md border border-border/50 overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="text-[10px] font-semibold h-9">First Name</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Last Name</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Email</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Department</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Unit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedAccounts.length > 0 ? (
                  paginatedAccounts.map((account) => (
                    <TableRow key={account.id} className="hover:bg-muted/10 border-border/30">
                      <TableCell className="text-[10px] py-2.5 px-3 font-medium">
                        {account.first_name || "-"}
                      </TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">
                        {account.last_name || "-"}
                      </TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3 max-w-[240px] truncate" title={account.email || "-"}>
                        {account.email || "-"}
                      </TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">{account.department || "-"}</TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">{account.unit || "-"}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-xs text-muted-foreground">
                      No accounts found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {filteredAccounts.length > 0 && (
            <div className="flex items-center justify-end gap-1 px-2 pt-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 border-border/50"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <span className="text-[10px] font-medium px-2">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 border-border/50"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

