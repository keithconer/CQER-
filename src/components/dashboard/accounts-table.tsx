"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";

type RoleType = "super_admin" | "college_coordinator" | "unit_coordinator";

export interface AccountRow {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  user_type?: RoleType | null;
  department: string | null;
  unit: string | null;
}

interface AccountsTableProps {
  accounts: AccountRow[];
  title: string;
  description: string;
}

const ITEMS_PER_PAGE = 8;

function formatRole(role?: RoleType | null) {
  if (role === "super_admin") return "Super Admin";
  if (role === "college_coordinator") return "College Coordinator";
  return "Unit Coordinator";
}

export function AccountsTable({ accounts, title, description }: AccountsTableProps) {
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
        (account.unit || "").toLowerCase().includes(term) ||
        formatRole(account.user_type || "unit_coordinator").toLowerCase().includes(term)
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
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-3 pt-4 px-4 space-y-3">
        <div>
          <CardTitle className="text-xs font-semibold">{title}</CardTitle>
          <CardDescription className="text-[10px]">{description}</CardDescription>
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
                <TableHead className="text-[10px] font-semibold h-9">User Type</TableHead>
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
                    <TableCell
                      className="text-[10px] py-2.5 px-3 max-w-[220px] truncate"
                      title={account.email || "-"}
                    >
                      {account.email || "-"}
                    </TableCell>
                    <TableCell className="py-2.5 px-3">
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-border/50">
                        {formatRole(account.user_type || "unit_coordinator")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[10px] py-2.5 px-3">
                      {account.department || "-"}
                    </TableCell>
                    <TableCell className="text-[10px] py-2.5 px-3">
                      {account.unit || "-"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-xs text-muted-foreground">
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
  );
}
