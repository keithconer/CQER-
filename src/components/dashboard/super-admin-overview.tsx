"use client";

import * as React from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

type RoleType = "super_admin" | "college_coordinator" | "unit_coordinator";

interface RegisteredAccount {
  id: string;
  first_name: string | null;
  last_name: string | null;
  user_type: RoleType;
  department: string | null;
  unit: string | null;
}

interface ExistingProject {
  id: string;
  title: string;
  academic_program: string | null;
  start_date: string | null;
  end_date: string | null;
  proponents: { name: string }[] | null;
  category: "new" | "existing" | "on process" | null;
  funding_source: "internally funded" | "externally funded" | null;
  budget_total: number | null;
  budget_requirements: { name: string; amount: number }[] | null;
}

interface SuperAdminOverviewProps {
  accounts: RegisteredAccount[];
  projects: ExistingProject[];
}

const ITEMS_PER_PAGE = 6;

function formatRole(role: RoleType) {
  if (role === "super_admin") return "Super Admin";
  if (role === "college_coordinator") return "College Coordinator";
  return "Unit Coordinator";
}

export function SuperAdminOverview({
  accounts,
  projects,
}: SuperAdminOverviewProps) {
  const [activeTab, setActiveTab] = React.useState<"accounts" | "projects">(
    "accounts"
  );
  const [searchTerm, setSearchTerm] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm]);

  const filteredAccounts = React.useMemo(() => {
    const term = searchTerm.toLowerCase();
    return accounts.filter((account) => {
      const fullName =
        `${account.first_name || ""} ${account.last_name || ""}`.toLowerCase();
      return (
        fullName.includes(term) ||
        formatRole(account.user_type).toLowerCase().includes(term) ||
        (account.department || "").toLowerCase().includes(term) ||
        (account.unit || "").toLowerCase().includes(term)
      );
    });
  }, [accounts, searchTerm]);

  const filteredProjects = React.useMemo(() => {
    const term = searchTerm.toLowerCase();
    return projects.filter((project) => {
      return (
        project.title.toLowerCase().includes(term) ||
        (project.academic_program || "").toLowerCase().includes(term) ||
        (project.proponents || [])
          .map((person) => person?.name || "")
          .join(", ")
          .toLowerCase()
          .includes(term) ||
        (project.category || "").toLowerCase().includes(term) ||
        (project.funding_source || "").toLowerCase().includes(term)
      );
    });
  }, [projects, searchTerm]);

  const formatProjectLeaders = (proponents: ExistingProject["proponents"]) => {
    if (!Array.isArray(proponents) || proponents.length === 0) return "-";
    const names = proponents
      .map((item) => item?.name?.trim())
      .filter(Boolean) as string[];
    return names.length > 0 ? names.join(", ") : "-";
  };

  const formatDurationYears = (startDate?: string | null, endDate?: string | null) => {
    if (!startDate || !endDate) return "-";
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return "-";
    const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
    return `${years.toFixed(1)} year${years >= 1.95 ? "s" : ""}`;
  };

  const getBudgetTotal = (project: ExistingProject) => {
    if (typeof project.budget_total === "number") return project.budget_total;
    if (!Array.isArray(project.budget_requirements)) return 0;
    return project.budget_requirements.reduce((sum, item) => sum + (Number(item?.amount) || 0), 0);
  };

  const formatBudgetTotal = (value: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  const activeItems = activeTab === "accounts" ? filteredAccounts : filteredProjects;
  const totalPages = Math.max(1, Math.ceil(activeItems.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;

  const paginatedAccounts = filteredAccounts.slice(startIndex, endIndex);
  const paginatedProjects = filteredProjects.slice(startIndex, endIndex);

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-3 pt-4 px-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-xs font-semibold">System Records</CardTitle>
            <CardDescription className="text-[10px]">
              View all registered accounts and existing projects.
            </CardDescription>
          </div>
          <div className="inline-flex rounded-md border border-border/60 p-0.5 bg-muted/20">
            <Button
              size="sm"
              onClick={() => setActiveTab("accounts")}
              className={`h-7 text-[10px] px-2.5 ${
                activeTab === "accounts"
                  ? "bg-[#159E44] hover:bg-[#128A3B] text-white"
                  : "bg-transparent text-foreground hover:bg-muted"
              }`}
            >
              Registered Accounts
            </Button>
            <Button
              size="sm"
              onClick={() => setActiveTab("projects")}
              className={`h-7 text-[10px] px-2.5 ${
                activeTab === "projects"
                  ? "bg-[#159E44] hover:bg-[#128A3B] text-white"
                  : "bg-transparent text-foreground hover:bg-muted"
              }`}
            >
              Existing Projects
            </Button>
          </div>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={
              activeTab === "accounts"
                ? "Search accounts..."
                : "Search projects..."
            }
            className="pl-8 h-8 text-xs bg-muted/20 border-border/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-3">
        <div className="rounded-md border border-border/50 overflow-hidden">
          {activeTab === "accounts" ? (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="text-[10px] font-semibold h-9">First Name</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Last Name</TableHead>
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
                      <TableCell className="py-2.5 px-3">
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1.5 py-0 h-4 border-[#159E44]/25 text-[#159E44] bg-[#159E44]/5"
                        >
                          {formatRole(account.user_type)}
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
                    <TableCell colSpan={5} className="h-24 text-center text-xs text-muted-foreground">
                      No accounts found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="text-[10px] font-semibold h-9">Project Title</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Project Leader/s (Proponents)</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Program</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Duration (Year)</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Period</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Category</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Funding</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Budget Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProjects.length > 0 ? (
                  paginatedProjects.map((project) => (
                    <TableRow key={project.id} className="hover:bg-muted/10 border-border/30">
                      <TableCell className="text-[10px] py-2.5 px-3 font-medium max-w-[260px] truncate" title={project.title}>
                        {project.title}
                      </TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3 max-w-[220px]">
                        <span className="line-clamp-2" title={formatProjectLeaders(project.proponents)}>
                          {formatProjectLeaders(project.proponents)}
                        </span>
                      </TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">
                        {project.academic_program || "-"}
                      </TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">
                        {formatDurationYears(project.start_date, project.end_date)}
                      </TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">
                        {project.start_date && project.end_date
                          ? `${format(new Date(project.start_date), "MMM d, yyyy")} - ${format(new Date(project.end_date), "MMM d, yyyy")}`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">
                        {project.category || "-"}
                      </TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">
                        {project.funding_source || "-"}
                      </TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3 font-medium whitespace-nowrap">
                        {formatBudgetTotal(getBudgetTotal(project))}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-xs text-muted-foreground">
                      No projects found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>

        {activeItems.length > 0 && (
          <div className="flex items-center justify-between px-2 pt-1">
            <p className="text-[10px] text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(endIndex, activeItems.length)} of{" "}
              {activeItems.length} {activeTab === "accounts" ? "records" : "projects"}
            </p>
            <div className="flex items-center gap-1">
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
