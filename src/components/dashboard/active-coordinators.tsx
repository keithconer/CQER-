"use client";

import { useMemo, useState } from "react";
import { endOfMonth, endOfWeek, format, isWithinInterval, startOfMonth, startOfQuarter, startOfWeek, subWeeks } from "date-fns";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Filter,
  LineChart as LineChartIcon,
  Medal,
  Projector,
  Search,
  TrendingUp,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toTitleCase } from "@/lib/utils";

export interface CoordinatorActivity {
  id: string;
  name: string;
  department: string;
  role: string;
  projectCount: number;
  projects?: number;
  trainings?: number;
  projectDates?: string[];
  trainingDates?: string[];
  avatar_url: string | null;
}

interface ActiveCoordinatorsProps {
  coordinators: CoordinatorActivity[];
  departments: string[];
}

type ResultsFilter = "all_time" | "month" | "quarter" | "average_per_week";

type Bucket = {
  key: string;
  label: string;
  start: Date;
  end: Date;
};

type DerivedCoordinator = Omit<
  CoordinatorActivity,
  "projects" | "trainings" | "projectCount" | "projectDates" | "trainingDates"
> & {
  projects: number;
  trainings: number;
  projectCount: number;
  projectDates: Date[];
  trainingDates: Date[];
};

const chartTextColor = "var(--foreground)";
const chartGridColor = "var(--border)";
const chartColors = ["#059669", "#0ea5e9", "#f59e0b", "#8b5cf6"];

function toValidDates(values?: string[]) {
  return (values || [])
    .map((value) => new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()));
}

function buildBuckets(filter: ResultsFilter) {
  const now = new Date();

  if (filter === "month") {
    const monthEnd = endOfMonth(now);
    const firstWeekStart = startOfWeek(startOfMonth(now));
    const buckets: Bucket[] = [];
    let cursor = firstWeekStart;

    while (cursor <= monthEnd) {
      const start = cursor;
      buckets.push({
        key: format(start, "yyyy-MM-dd"),
        label: format(start, "MMM d"),
        start,
        end: endOfWeek(start),
      });

      cursor = new Date(start);
      cursor.setDate(cursor.getDate() + 7);
    }

    return buckets;
  }

  if (filter === "quarter") {
    const quarterStart = startOfQuarter(now);
    return Array.from({ length: 3 }, (_, index) => {
      const start = new Date(quarterStart.getFullYear(), quarterStart.getMonth() + index, 1);
      return {
        key: format(start, "yyyy-MM"),
        label: format(start, "MMM"),
        start,
        end: endOfMonth(start),
      };
    });
  }

  if (filter === "average_per_week") {
    return Array.from({ length: 8 }, (_, index) => {
      const start = startOfWeek(subWeeks(now, 7 - index));
      return {
        key: format(start, "yyyy-MM-dd"),
        label: format(start, "MMM d"),
        start,
        end: endOfWeek(start),
      };
    });
  }

  return Array.from({ length: 6 }, (_, index) => {
    const start = startOfMonth(new Date(now.getFullYear(), now.getMonth() - (5 - index), 1));
    return {
      key: format(start, "yyyy-MM"),
      label: format(start, "MMM"),
      start,
      end: endOfMonth(start),
    };
  });
}

function countDatesInRange(dates: Date[], start: Date, end: Date) {
  return dates.filter((date) => isWithinInterval(date, { start, end })).length;
}

function getLeaderboardDescription(filter: ResultsFilter) {
  if (filter === "month") return "Rankings based on records logged this month.";
  if (filter === "quarter") return "Rankings based on records logged this quarter.";
  if (filter === "average_per_week") return "Rankings based on average weekly output across the last 8 weeks.";
  return "Rankings based on combined projects and trainings conducted.";
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-border/50 bg-background/95 p-3 text-[10px] shadow-xl">
      <p className="mb-2 font-semibold text-foreground">{label}</p>
      <div className="space-y-1.5">
        {payload.map((entry) => (
          <div key={entry.name || String(entry.value)} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground">{entry.name}</span>
            </div>
            <span className="font-semibold text-foreground">
              {typeof entry.value === "number" ? entry.value.toFixed(2).replace(/\.00$/, "") : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ActiveCoordinators({ coordinators, departments }: ActiveCoordinatorsProps) {
  const [filter, setFilter] = useState<string>("all");
  const [resultsFilter, setResultsFilter] = useState<ResultsFilter>("all_time");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const buckets = useMemo(() => buildBuckets(resultsFilter), [resultsFilter]);

  const filteredCoordinators = useMemo<DerivedCoordinator[]>(() => {
    const scoped = filter !== "all"
      ? coordinators.filter((coordinator) => coordinator.department === filter)
      : coordinators;

    return scoped
      .map((coordinator) => {
        const projectDates = toValidDates(coordinator.projectDates);
        const trainingDates = toValidDates(coordinator.trainingDates);
        const projects =
          resultsFilter === "all_time"
            ? Number(coordinator.projects || projectDates.length || 0)
            : buckets.reduce((sum, bucket) => sum + countDatesInRange(projectDates, bucket.start, bucket.end), 0);
        const trainings =
          resultsFilter === "all_time"
            ? Number(coordinator.trainings || trainingDates.length || 0)
            : buckets.reduce((sum, bucket) => sum + countDatesInRange(trainingDates, bucket.start, bucket.end), 0);
        const total = projects + trainings;
        const score = resultsFilter === "average_per_week" && buckets.length > 0
          ? Number((total / buckets.length).toFixed(2))
          : total;

        return {
          ...coordinator,
          projects,
          trainings,
          projectCount: score,
          projectDates,
          trainingDates,
        };
      })
      .filter((coordinator) => coordinator.projectCount > 0 || resultsFilter === "all_time")
      .sort((left, right) => right.projectCount - left.projectCount || left.name.localeCompare(right.name));
  }, [buckets, coordinators, filter, resultsFilter]);

  const totalPages = Math.ceil(filteredCoordinators.length / itemsPerPage);

  const paginatedCoordinators = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCoordinators.slice(start, start + itemsPerPage);
  }, [filteredCoordinators, currentPage]);

  const sortedDepartments = useMemo(() => {
    return [...departments].sort((a, b) => a.localeCompare(b));
  }, [departments]);

  const activityBreakdownSeries = useMemo(() => {
    return buckets.map((bucket) => {
      const projects = filteredCoordinators.reduce(
        (sum, coordinator) => sum + countDatesInRange(coordinator.projectDates, bucket.start, bucket.end),
        0
      );
      const trainings = filteredCoordinators.reduce(
        (sum, coordinator) => sum + countDatesInRange(coordinator.trainingDates, bucket.start, bucket.end),
        0
      );

      return {
        label: bucket.label,
        Projects: resultsFilter === "average_per_week" && filteredCoordinators.length > 0
          ? Number((projects / filteredCoordinators.length).toFixed(2))
          : projects,
        Trainings: resultsFilter === "average_per_week" && filteredCoordinators.length > 0
          ? Number((trainings / filteredCoordinators.length).toFixed(2))
          : trainings,
      };
    });
  }, [buckets, filteredCoordinators, resultsFilter]);

  const topCoordinatorSeries = useMemo(() => {
    const leaders = filteredCoordinators.slice(0, 4);

    return buckets.map((bucket) => {
      const entry: Record<string, string | number> = { label: bucket.label };

      leaders.forEach((coordinator) => {
        const total =
          countDatesInRange(coordinator.projectDates, bucket.start, bucket.end) +
          countDatesInRange(coordinator.trainingDates, bucket.start, bucket.end);
        entry[coordinator.name] = total;
      });

      return entry;
    });
  }, [buckets, filteredCoordinators]);

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-border/50 bg-card/50 shadow-sm">
        <CardHeader className="flex flex-col gap-3 pb-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-[14px] font-bold">
              <Medal className="h-4 w-4 text-emerald-600" />
              Engagement Leaderboard
            </CardTitle>
            <CardDescription className="text-[11px]">{getLeaderboardDescription(resultsFilter)}</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select
              value={filter}
              onValueChange={(value) => {
                setFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-full text-[10px] sm:w-[180px]">
                <Filter className="mr-2 h-3 w-3 opacity-50" />
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectItem value="all" className="text-[10px]">All Departments</SelectItem>
                {sortedDepartments.map((dept) => (
                  <SelectItem key={dept} value={dept} className="text-[10px]">
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={resultsFilter}
              onValueChange={(value: ResultsFilter) => {
                setResultsFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-full text-[10px] sm:w-[180px]">
                <TrendingUp className="mr-2 h-3 w-3 opacity-50" />
                <SelectValue placeholder="Results Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_time" className="text-[10px]">All Time</SelectItem>
                <SelectItem value="month" className="text-[10px]">This Month</SelectItem>
                <SelectItem value="quarter" className="text-[10px]">This Quarter</SelectItem>
                <SelectItem value="average_per_week" className="text-[10px]">Average Per Week</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[400px] overflow-y-auto">
            <div className="divide-y divide-border/30">
              {paginatedCoordinators.length > 0 ? (
                paginatedCoordinators.map((coordinator, index) => {
                  const globalIndex = (currentPage - 1) * itemsPerPage + index;
                  return (
                    <div
                      key={coordinator.id}
                      className="group flex items-center justify-between gap-3 p-3.5 transition-colors hover:bg-muted/30"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-9 w-9 border border-border/50 shadow-sm transition-all group-hover:border-emerald-500/50">
                            <AvatarImage src={coordinator.avatar_url || ""} />
                            <AvatarFallback className="bg-muted text-[11px] font-bold text-muted-foreground">
                              {coordinator.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {globalIndex < 3 && filter === "all" ? (
                            <div className="absolute -right-1 -top-1 z-10 flex h-4 w-4 items-center justify-center rounded-full border-2 border-background bg-emerald-600">
                              <span className="text-[8px] font-bold leading-none text-white">{globalIndex + 1}</span>
                            </div>
                          ) : null}
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="max-w-[150px] truncate text-[12px] font-bold text-foreground">
                              {coordinator.name}
                            </span>
                            <Badge variant="outline" className="bg-muted/30 px-1 py-0 text-[8px] font-medium uppercase tracking-tighter text-muted-foreground">
                              {toTitleCase(coordinator.role)}
                            </Badge>
                          </div>
                          <p className="text-[10px] font-medium text-muted-foreground">
                            {coordinator.department || "No Department"}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <TooltipProvider>
                          <Tooltip delayDuration={300}>
                            <TooltipTrigger asChild>
                              <div className="cursor-help rounded-full border border-border/30 bg-muted/20 px-2.5 py-1 transition-colors hover:bg-muted/40">
                                <span className="text-[12px] font-bold text-foreground">
                                  {resultsFilter === "average_per_week"
                                    ? coordinator.projectCount.toFixed(2).replace(/\.00$/, "")
                                    : coordinator.projectCount}
                                </span>
                                <span className="ml-1.5 text-[9px] font-medium text-muted-foreground">
                                  {resultsFilter === "average_per_week" ? "Avg / Week" : "Contributions"}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="border-border/50 bg-background/95 p-2 shadow-xl backdrop-blur-md" side="left">
                              <div className="min-w-[120px] space-y-1.5">
                                <p className="mb-2 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Activity Breakdown</p>
                                <div className="flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-1.5">
                                    <Projector className="h-3 w-3 text-emerald-600" />
                                    <span className="text-[10px] font-medium">Projects</span>
                                  </div>
                                  <span className="text-[10px] font-bold">{coordinator.projects}</span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-1.5">
                                    <BookOpen className="h-3 w-3 text-blue-500" />
                                    <span className="text-[10px] font-medium">Trainings</span>
                                  </div>
                                  <span className="text-[10px] font-bold">{coordinator.trainings}</span>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {globalIndex === 0 ? (
                          <span className="flex items-center gap-0.5 text-[8px] font-bold uppercase tracking-widest text-emerald-600/80">
                            <Medal className="h-2 w-2" /> Most Active Research Extension Employee
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="bg-muted/5 p-8 text-center">
                  <Search className="mx-auto mb-3 h-8 w-8 text-muted-foreground/20" />
                  <p className="text-[11px] font-medium text-muted-foreground">
                    No active coordinators found for this selection.
                  </p>
                </div>
              )}
            </div>
          </div>
          {totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-border/30 bg-muted/5 px-4 py-2">
              <span className="text-[10px] font-medium text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((page) => page - 1)}
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((page) => page + 1)}
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-border/50 bg-card/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-[13px] font-bold">
              <LineChartIcon className="h-3.5 w-3.5 text-emerald-600" />
              Activity Breakdown
            </CardTitle>
            <CardDescription className="text-[10px]">
              Projects and trainings trend based on the selected results filter.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activityBreakdownSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke={chartGridColor} strokeDasharray="3 3" vertical={false} opacity={0.5} />
                  <XAxis dataKey="label" fontSize={9} tickLine={false} axisLine={false} tick={{ fill: chartTextColor }} />
                  <YAxis fontSize={9} tickLine={false} axisLine={false} tick={{ fill: chartTextColor }} />
                  <RechartsTooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: "10px" }} />
                  <Line type="monotone" dataKey="Projects" stroke="#059669" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Trainings" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-[13px] font-bold">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
              User Record Trends
            </CardTitle>
            <CardDescription className="text-[10px]">
              Top performers move with the same filter used by the leaderboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={topCoordinatorSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke={chartGridColor} strokeDasharray="3 3" vertical={false} opacity={0.5} />
                  <XAxis dataKey="label" fontSize={9} tickLine={false} axisLine={false} tick={{ fill: chartTextColor }} />
                  <YAxis fontSize={9} tickLine={false} axisLine={false} tick={{ fill: chartTextColor }} />
                  <RechartsTooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: "10px" }} />
                  {filteredCoordinators.slice(0, 4).map((coordinator, index) => (
                    <Line
                      key={coordinator.id}
                      type="monotone"
                      dataKey={coordinator.name}
                      stroke={chartColors[index % chartColors.length]}
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      activeDot={{ r: 4 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
