"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  BriefcaseBusiness,
  BookOpenCheck,
  CalendarRange,
  ClipboardCheck,
  Cpu,
  Factory,
  FolderKanban,
  Landmark,
  Megaphone,
  Newspaper,
  NotepadText,
  Sparkles,
  Trophy,
  Users2,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

type ModuleCount = {
  label: string;
  value: number;
  href: string;
};

type MonthlyActivityPoint = {
  label: string;
  value: number;
  breakdown: { name: string; count: number }[];
};

type ProjectStatusPoint = {
  label: string;
  value: number;
};

type RadarPoint = {
  label: string;
  value: number;
  fullMark: number;
};

type RecentActivity = {
  id: string;
  title: string;
  meta: string;
  href: string;
  createdAt: string | null;
};

type ProjectBudgetDetail = {
  id: string;
  title: string;
  totalBudget: number;
  utilizedBudget: number;
  remainingBudget: number;
};

type FacultyInvolvementSummary = {
  name: string;
  hoursRendered: number;
};

interface ProjectLeaderDashboardProps {
  projectCount: number;
  activeProjectCount: number;
  trainingCount: number;
  totalBudget: number;
  utilizedBudget: number;
  utilizationRate: number;
  moduleCounts: ModuleCount[];
  monthlyActivitySeries: MonthlyActivityPoint[];
  projectStatusShare: ProjectStatusPoint[];
  radarSeries: RadarPoint[];
  recentActivities: RecentActivity[];
  budgetDetails: ProjectBudgetDetail[];
  facultyInvolvement: FacultyInvolvementSummary[];
}

const COLORS = [
  "hsl(142, 72%, 29%)",
  "hsl(142, 71%, 45%)",
  "hsl(142, 60%, 65%)",
  "hsl(142, 50%, 85%)",
];

const moduleIcons: Record<string, LucideIcon> = {
  "Project Registration": FolderKanban,
  "Budget Utilization": Wallet,
  "Ordinance / Resolution": Landmark,
  "Impact / Assessment": ClipboardCheck,
  "Extension Program": Newspaper,
  "Awards": Trophy,
  "Other Activities": NotepadText,
  Trainings: BookOpenCheck,
  Consultancy: BriefcaseBusiness,
  "Technical Advisory": Wrench,
  "Adopters with Enterprise": Factory,
  Technologies: Cpu,
  "IEC Materials": Megaphone,
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const chartTextColor = "var(--foreground)";
const chartGridColor = "var(--border)";

function ChartTooltip({
  active,
  payload,
  label,
  suffix = "",
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string; payload?: MonthlyActivityPoint }>;
  label?: string;
  suffix?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="min-w-[170px] rounded-lg border border-border/50 bg-background/95 p-3 shadow-xl backdrop-blur-sm">
      <p className="mb-2 border-b border-border/50 pb-1 text-[11px] font-bold text-foreground">{label}</p>
      <div className="space-y-2">
        {payload.map((entry, index) => (
          <div key={`${entry.name || "item"}-${index}`} className="space-y-1.5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-[10px] text-muted-foreground">{entry.name}</span>
              </div>
              <span className="text-[10px] font-bold text-foreground">
                {(entry.value || 0).toLocaleString()}
                {suffix}
              </span>
            </div>
            {entry.payload?.breakdown?.length ? (
              <div className="ml-1 space-y-1 border-l border-emerald-500/30 pl-3.5">
                {entry.payload.breakdown.slice(0, 4).map((item) => (
                  <div key={`${item.name}-${item.count}`} className="flex justify-between text-[9px] text-muted-foreground/90">
                    <span className="max-w-[140px] truncate">{item.name}</span>
                    <span className="font-medium">{item.count}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function SimpleChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="min-w-[160px] rounded-lg border border-border/50 bg-background/95 p-3 shadow-xl backdrop-blur-sm">
      {label ? <p className="mb-2 border-b border-border/50 pb-1 text-[11px] font-bold text-foreground">{label}</p> : null}
      <div className="space-y-2">
        {payload.map((entry, index) => (
          <div key={`${entry.name || "item"}-${index}`} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-[10px] text-muted-foreground">{entry.name}</span>
            </div>
            <span className="text-[10px] font-bold text-foreground">{(entry.value || 0).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  icon: Icon,
  href,
  onClick,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: LucideIcon;
  href?: string;
  onClick?: () => void;
}) {
  const content = (
    <Card className="border-border/50 bg-card/50 shadow-sm transition-colors hover:bg-muted/30">
      <CardContent className="flex items-start justify-between p-4">
        <div className="space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold leading-none text-foreground">{value}</p>
          <p className="text-[10px] text-muted-foreground">{sub}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground">
          <Icon className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href} className="block">{content}</Link>;
  }

  return (
    <button type="button" onClick={onClick} className="block w-full text-left">
      {content}
    </button>
  );
}

function BudgetDetailsDialog({
  open,
  onOpenChange,
  title,
  description,
  items,
  mode,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  title: string;
  description: string;
  items: ProjectBudgetDetail[];
  mode: "budget" | "utilized";
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-3">
            {items.length > 0 ? (
              items.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border/50 bg-muted/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Total Budget: {formatCurrency(item.totalBudget)}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {mode === "budget" ? formatCurrency(item.remainingBudget) : formatCurrency(item.utilizedBudget)}
                    </Badge>
                  </div>
                  <Separator className="my-3" />
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="rounded-xl bg-background px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Budget</p>
                      <p className="text-sm font-medium">{formatCurrency(item.totalBudget)}</p>
                    </div>
                    <div className="rounded-xl bg-background px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Utilized</p>
                      <p className="text-sm font-medium">{formatCurrency(item.utilizedBudget)}</p>
                    </div>
                    <div className="rounded-xl bg-background px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Balance</p>
                      <p className="text-sm font-medium">{formatCurrency(item.remainingBudget)}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No project budget records found.</p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function FacultyDialog({
  open,
  onOpenChange,
  items,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  items: FacultyInvolvementSummary[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Faculty Involvement</DialogTitle>
          <DialogDescription>Faculty members and their rendered hours from the recorded involvement data.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-3">
            {items.length > 0 ? (
              items.map((item) => (
                <div key={`${item.name}-${item.hoursRendered}`} className="flex items-center justify-between rounded-2xl border border-border/50 bg-muted/20 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">Hours rendered</p>
                  </div>
                  <Badge variant="outline">{item.hoursRendered.toLocaleString()} hrs</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No faculty involvement records found.</p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export function ProjectLeaderDashboard({
  projectCount,
  activeProjectCount,
  trainingCount,
  totalBudget,
  utilizedBudget,
  utilizationRate,
  moduleCounts,
  monthlyActivitySeries,
  projectStatusShare,
  radarSeries,
  recentActivities,
  budgetDetails,
  facultyInvolvement,
}: ProjectLeaderDashboardProps) {
  const [budgetOpen, setBudgetOpen] = React.useState(false);
  const [utilizedOpen, setUtilizedOpen] = React.useState(false);
  const [facultyOpen, setFacultyOpen] = React.useState(false);
  const populatedModules = moduleCounts.filter((item) => item.value > 0);
  const maxRadar = Math.max(1, ...radarSeries.map((item) => item.fullMark));

  return (
    <>
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryCard
            label="Projects"
            value={projectCount}
            sub={`${activeProjectCount} active or ongoing`}
            icon={FolderKanban}
            href="/dashboard?panel=projects&view=project-registration"
          />
          <SummaryCard
            label="Trainings"
            value={trainingCount}
            sub="Training records created"
            icon={BookOpenCheck}
            href="/dashboard?panel=trainings"
          />
          <SummaryCard
            label="Budget"
            value={formatCurrency(totalBudget)}
            sub="Combined project budget"
            icon={Wallet}
            onClick={() => setBudgetOpen(true)}
          />
          <SummaryCard
            label="Utilized"
            value={formatCurrency(utilizedBudget)}
            sub={`${Math.round(utilizationRate)}% of tracked budget`}
            icon={ArrowUpRight}
            onClick={() => setUtilizedOpen(true)}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-12 lg:grid-rows-2">
          <Card className="border-border/50 bg-card/50 shadow-sm lg:col-span-8">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-[13px] font-bold">
                <CalendarRange className="h-3.5 w-3.5 text-emerald-600" />
                Activity Flow
              </CardTitle>
              <CardDescription className="text-[10px]">
                Monthly movement across project registration and your extension outputs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[240px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyActivitySeries} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="leaderActivityGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={chartGridColor} strokeDasharray="3 3" vertical={false} opacity={0.6} />
                    <XAxis dataKey="label" fontSize={9} tickLine={false} axisLine={false} tick={{ fill: chartTextColor }} tickFormatter={(value) => String(value).split(" ")[0]} />
                    <YAxis fontSize={9} tickLine={false} axisLine={false} tick={{ fill: chartTextColor }} />
                    <RechartsTooltip content={<ChartTooltip suffix=" records" />} />
                    <Area type="monotone" dataKey="value" name="Activity" stroke="hsl(142, 71%, 45%)" strokeWidth={2} fill="url(#leaderActivityGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 shadow-sm lg:col-span-4">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-[13px] font-bold">
                <Activity className="h-3.5 w-3.5 text-emerald-600" />
                Project Mix
              </CardTitle>
              <CardDescription className="text-[10px]">
                Distribution of your registered projects by current category.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={projectStatusShare} dataKey="value" nameKey="label" innerRadius={48} outerRadius={72} paddingAngle={6} stroke="none">
                      {projectStatusShare.map((_, index) => (
                        <Cell key={`project-status-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<SimpleChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                {projectStatusShare.map((item, index) => (
                  <div key={item.label} className="rounded-xl border border-border/50 bg-background/60 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-[9px] text-muted-foreground">{item.label}</span>
                    </div>
                    <p className="mt-1 text-xs font-semibold">{item.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 shadow-sm lg:col-span-5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-[13px] font-bold">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                Output Coverage
              </CardTitle>
              <CardDescription className="text-[10px]">
                How your records are distributed across the modules you manage.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={populatedModules} margin={{ top: 0, right: 0, left: -20, bottom: 20 }}>
                    <CartesianGrid stroke={chartGridColor} strokeDasharray="3 3" vertical={false} opacity={0.5} />
                    <XAxis dataKey="label" angle={-20} textAnchor="end" height={48} interval={0} fontSize={8} tickLine={false} axisLine={false} tick={{ fill: chartTextColor }} />
                    <YAxis fontSize={9} tickLine={false} axisLine={false} allowDecimals={false} tick={{ fill: chartTextColor }} />
                    <RechartsTooltip content={<SimpleChartTooltip />} />
                    <Bar dataKey="value" name="Records" radius={[8, 8, 0, 0]} fill="hsl(142, 71%, 45%)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 shadow-sm lg:col-span-4">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-[13px] font-bold">
                <Activity className="h-3.5 w-3.5 text-emerald-600" />
                Focus Radar
              </CardTitle>
              <CardDescription className="text-[10px]">
                Balance of compliance, delivery, adoption, and recognition work.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarSeries} outerRadius="70%">
                    <PolarGrid stroke={chartGridColor} />
                    <PolarAngleAxis dataKey="label" tick={{ fontSize: 9, fill: chartTextColor }} />
                    <PolarRadiusAxis domain={[0, maxRadar]} tick={false} axisLine={false} />
                    <Radar name="Coverage" dataKey="value" stroke="hsl(142, 71%, 45%)" fill="hsl(142, 71%, 45%)" fillOpacity={0.2} strokeWidth={2} />
                    <RechartsTooltip content={<SimpleChartTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 shadow-sm lg:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-[13px] font-bold">
                <Users2 className="h-3.5 w-3.5 text-emerald-600" />
                Recent Entries
              </CardTitle>
              <CardDescription className="text-[10px]">
                Latest records from your dashboard modules and community access.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border border-border/50 bg-background/60 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-medium text-foreground">Budget utilization progress</p>
                    <p className="text-[9px] text-muted-foreground">Tracked against your registered project budget.</p>
                  </div>
                  <Badge variant="outline" className="text-[9px]">
                    {Math.round(utilizationRate)}%
                  </Badge>
                </div>
                <Progress value={Math.max(0, Math.min(100, utilizationRate))} className="mt-3 h-2" />
              </div>

              <div className="space-y-2">
                {recentActivities.length > 0 ? (
                  recentActivities.map((item) => {
                    const Icon = moduleIcons[item.meta] || Activity;
                    return (
                      <Link key={item.id} href={item.href} className="flex items-start gap-3 rounded-xl border border-border/40 bg-background/60 px-3 py-2 transition-colors hover:bg-muted/40">
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[10px] font-medium text-foreground">{item.title}</p>
                          <p className="text-[9px] text-muted-foreground">{item.meta}</p>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <p className="text-[10px] text-muted-foreground">No recent records yet. Start with project registration or post in CQER Community.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <button type="button" onClick={() => setFacultyOpen(true)} className="block w-full text-left">
          <Card className="border-border/50 bg-card/50 shadow-sm transition-colors hover:bg-muted/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Users2 className="h-4 w-4 text-emerald-600" />
                Faculty Involvement
              </CardTitle>
              <CardDescription className="text-xs">
                View faculty members and the hours they have rendered.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {facultyInvolvement.length > 0 ? (
                facultyInvolvement.slice(0, 4).map((item) => (
                  <div key={`${item.name}-${item.hoursRendered}`} className="flex items-center justify-between rounded-xl border border-border/40 bg-background/60 px-3 py-2">
                    <span className="truncate pr-3 text-sm font-medium text-foreground">{item.name}</span>
                    <Badge variant="outline">{item.hoursRendered.toLocaleString()} hrs</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No faculty involvement records found.</p>
              )}
            </CardContent>
          </Card>
        </button>
      </div>

      <BudgetDetailsDialog
        open={budgetOpen}
        onOpenChange={setBudgetOpen}
        title="Project Budgets"
        description="Project budgets with utilized amounts and remaining balances."
        items={budgetDetails}
        mode="budget"
      />
      <BudgetDetailsDialog
        open={utilizedOpen}
        onOpenChange={setUtilizedOpen}
        title="Utilized Budget"
        description="Utilized budget per project based on recorded budget utilization entries."
        items={budgetDetails}
        mode="utilized"
      />
      <FacultyDialog open={facultyOpen} onOpenChange={setFacultyOpen} items={facultyInvolvement} />
    </>
  );
}
