"use client";

import * as React from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type Project } from "./projects-table";

interface FundingManagementProps {
  projects: Project[];
  title?: string;
  description?: string;
}

type FundingFilter = "internal" | "external";

function getFundingType(project: Project): FundingFilter {
  const source = (project.funding_source || "").toLowerCase();
  if (source.includes("internal")) return "internal";
  return "external";
}

export function FundingManagement({
  projects,
  title = "Funding",
  description = "Filter and view funding fields for reporting.",
}: FundingManagementProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [filter, setFilter] = React.useState<FundingFilter>("internal");

  const records = React.useMemo(() => {
    const term = searchTerm.toLowerCase();
    return projects
      .filter((project) => (project.entry_type || "project") === "project")
      .filter((project) => getFundingType(project) === filter)
      .filter((project) => {
        const fundingData = (project as unknown as { funding_data?: Record<string, unknown> }).funding_data || {};
        return [
          project.title || "",
          String(project.project_no || ""),
          String(project.moa_no || ""),
          String((fundingData?.title as string) || ""),
          String((fundingData?.location as string) || ""),
          String((fundingData?.types_of_clientele as string) || ""),
          String((fundingData?.external_funding_agency as string) || ""),
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);
      });
  }, [filter, projects, searchTerm]);

  return (
    <div className="space-y-4">
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-xs font-semibold">{title}</CardTitle>
              <CardDescription className="text-[10px]">{description}</CardDescription>
            </div>
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-[10px] border-border/50 bg-muted/20">
                  <SlidersHorizontal className="h-3 w-3 mr-1" />
                  Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="text-[10px]">Funding Type</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem className="text-[10px]" checked={filter === "internal"} onCheckedChange={() => setFilter("internal")}>
                  Internal
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem className="text-[10px]" checked={filter === "external"} onCheckedChange={() => setFilter("external")}>
                  External
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="rounded-md border border-border/50 overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="text-[10px] font-semibold h-9">Project No.</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Category of MOA</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Collaborating Agency/ies</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Title</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Location</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">Types of Clientele</TableHead>
                  <TableHead className="text-[10px] font-semibold h-9">No. of Clientele</TableHead>
                  {filter === "external" && <TableHead className="text-[10px] font-semibold h-9">Function/Nature</TableHead>}
                  {filter === "external" && <TableHead className="text-[10px] font-semibold h-9">Total Budget</TableHead>}
                  {filter === "external" && <TableHead className="text-[10px] font-semibold h-9">Funding Agency</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length > 0 ? (
                  records.map((project) => {
                    const fundingData = (project as unknown as { funding_data?: Record<string, unknown> }).funding_data || {};
                    const approved = Number(fundingData.external_approved_budget_cvsu || 0);
                    const counterpart = Number(fundingData.external_counterpart_budget_cvsu || 0);
                    const totalBudget = approved + counterpart;
                    return (
                      <TableRow key={project.id} className="hover:bg-muted/10 border-border/30">
                        <TableCell className="text-[10px] py-2.5 px-3">{String(project.project_no || fundingData.project_no || "-")}</TableCell>
                        <TableCell className="text-[10px] py-2.5 px-3">{String(project.category || "-")}</TableCell>
                        <TableCell className="text-[10px] py-2.5 px-3">{String(project.collaborating_agencies || fundingData.collaborating_agencies || "-")}</TableCell>
                        <TableCell className="text-[10px] py-2.5 px-3">{String(fundingData.title || project.title || "-")}</TableCell>
                        <TableCell className="text-[10px] py-2.5 px-3">{String(fundingData.location || "-")}</TableCell>
                        <TableCell className="text-[10px] py-2.5 px-3">{String(fundingData.types_of_clientele || "-")}</TableCell>
                        <TableCell className="text-[10px] py-2.5 px-3">{String(fundingData.number_of_clientele ?? "-")}</TableCell>
                        {filter === "external" && <TableCell className="text-[10px] py-2.5 px-3">{String(fundingData.external_function_nature || "-")}</TableCell>}
                        {filter === "external" && <TableCell className="text-[10px] py-2.5 px-3">{new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(totalBudget)}</TableCell>}
                        {filter === "external" && <TableCell className="text-[10px] py-2.5 px-3">{String(fundingData.external_funding_agency || "-")}</TableCell>}
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={filter === "external" ? 10 : 7} className="h-24 text-center text-[10px] text-muted-foreground">
                      No funding records found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
