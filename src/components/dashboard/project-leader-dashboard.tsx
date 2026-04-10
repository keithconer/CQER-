"use client";

import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarRange,
  ClipboardCheck,
  Factory,
  FolderKanban,
  Landmark,
  Megaphone,
  Newspaper,
  Trophy,
  Users2,
  Wallet,
  Wrench,
  Cpu,
  BookOpenCheck,
  NotepadText,
  Sparkles,
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

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

interface ProjectLeaderDashboardProps {
  leaderName: string;
  scopeLabel: string;
  projectCount: number;
  activeProjectCount: number;
  outputCount: number;
  totalBudget: number;
  utilizedBudget: number;
  utilizationRate: number;
  moduleCounts: ModuleCount[];
  monthlyActivitySeries: MonthlyActivityPoint[];
  projectStatusShare: ProjectStatusPoint[];
  radarSeries: RadarPoint[];
  recentActivities: RecentActivity[];
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

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="border-border/50 bg-card/50 shadow-sm">
      <CardContent className="flex items-start justify-between p-4">
        <div className="space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold leading-none text-foreground">{value}</p>
          <p className="text-[10px] text-muted-foreground">{sub}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700">
          <Icon className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}

export function ProjectLeaderDashboard({
  leaderName,
  scopeLabel,
  projectCount,
  activeProjectCount,
  outputCount,
  totalBudget,
  utilizedBudget,
  utilizationRate,
  moduleCounts,
  monthlyActivitySeries,
  projectStatusShare,
  radarSeries,
  recentActivities,
}: ProjectLeaderDashboardProps) {
  const populatedModules = moduleCounts.filter((item) => item.value > 0);
  const maxRadar = Math.max(1, ...radarSeries.map((item) => item.fullMark));

  return (
    <div className="space-y-5">
      <Card className="border-border/50 bg-card/50 shadow-sm">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <Badge variant="outline" className="w-fit text-[9px] uppercase tracking-[0.2em]">
              Project Leader Workspace
            </Badge>
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-foreground">Focused dashboard for {leaderName}</h2>
              <p className="max-w-2xl text-[11px] leading-5 text-muted-foreground">{scopeLabel}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" className="h-8 text-[10px]">
              <Link href="/dashboard?panel=projects&view=project-registration">
                <FolderKanban className="mr-1.5 h-3.5 w-3.5" />
                Project Registration
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-8 text-[10px]">
              <Link href="/dashboard?panel=community">
                <Users2 className="mr-1.5 h-3.5 w-3.5" />
                CQER Community
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Projects"
          value={projectCount}
          sub={`${activeProjectCount} active or ongoing`}
          icon={FolderKanban}
        />
        <StatCard
          label="Outputs"
          value={outputCount}
          sub="Across your extension records"
          icon={Sparkles}
        />
        <StatCard
          label="Budget Base"
          value={formatCurrency(totalBudget)}
          sub="Combined project budget"
          icon={Wallet}
        />
        <StatCard
          label="Utilized"
          value={formatCurrency(utilizedBudget)}
          sub={`${Math.round(utilizationRate)}% of tracked budget`}
          icon={ArrowUpRight}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-12 lg:grid-rows-2">
        <Card className="lg:col-span-8 border-border/50 bg-card/50 shadow-sm">
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
                <AreaChart
                  data={monthlyActivitySeries}
                  margin={{ top: 0, right: 10, left: -20, bottom: 0 }}
                  className="[&_.recharts-cartesian-axis-tick-value]:fill-muted-foreground [&_.recharts-cartesian-grid-horizontal-line]:stroke-border [&_.recharts-cartesian-grid-vertical-line]:stroke-border"
                >
                  <defs>
                    <linearGradient id="leaderActivityGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.6} />
                  <XAxis
                    dataKey="label"
                    fontSize={9}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => String(value).split(" ")[0]}
                  />
                  <YAxis fontSize={9} tickLine={false} axisLine={false} />
                  <RechartsTooltip content={<ChartTooltip suffix=" records" />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name="Activity"
                    stroke="hsl(142, 71%, 45%)"
                    strokeWidth={2}
                    fill="url(#leaderActivityGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4 border-border/50 bg-card/50 shadow-sm">
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
                  <Pie
                    data={projectStatusShare}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={6}
                    stroke="none"
                  >
                    {projectStatusShare.map((_, index) => (
                      <Cell key={`project-status-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
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

        <Card className="lg:col-span-5 border-border/50 bg-card/50 shadow-sm">
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
                <BarChart
                  data={populatedModules}
                  margin={{ top: 0, right: 0, left: -20, bottom: 20 }}
                  className="[&_.recharts-cartesian-axis-tick-value]:fill-muted-foreground [&_.recharts-cartesian-grid-horizontal-line]:stroke-border"
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.5} />
                  <XAxis
                    dataKey="label"
                    angle={-20}
                    textAnchor="end"
                    height={48}
                    interval={0}
                    fontSize={8}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis fontSize={9} tickLine={false} axisLine={false} allowDecimals={false} />
                  <RechartsTooltip />
                  <Bar dataKey="value" name="Records" radius={[8, 8, 0, 0]} fill="hsl(142, 71%, 45%)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4 border-border/50 bg-card/50 shadow-sm">
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
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                  <PolarRadiusAxis domain={[0, maxRadar]} tick={false} axisLine={false} />
                  <Radar
                    name="Coverage"
                    dataKey="value"
                    stroke="hsl(142, 71%, 45%)"
                    fill="hsl(142, 71%, 45%)"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                  <RechartsTooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-border/50 bg-card/50 shadow-sm">
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
                    <Link
                      key={item.id}
                      href={item.href}
                      className="flex items-start gap-3 rounded-xl border border-border/40 bg-background/60 px-3 py-2 transition-colors hover:bg-muted/40"
                    >
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700">
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
    </div>
  );
}
