"use client";

import { useMemo, useState } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  Users, 
  Wallet, 
  GraduationCap, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Info,
  Calendar,
  Layers,
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";

interface DashboardAnalyticsProps {
  users: number;
  internalFunding: number;
  externalFunding: number;
  trainings: number;
  totalBudget: number;
  internalBudget: number;
  externalBudget: number;
  moaExisting: number;
  moaCompleted: number;
  moaNew: number;
  activitySeries: { label: string; value: number; breakdown: { name: string; count: number }[] }[];
  activityBreakdownLabel: string;
  budgetSeries: { label: string; value: number }[];
  radarSeries: { label: string; internal: number; external: number }[];
  fundingShare: { label: string; value: number }[];
  trainingsShare: number;
  trainingsShareTotal: number;
  scopeLabel?: string;
}

// Consistent Monochromatic Palette
const COLORS = [
  "hsl(142, 72%, 29%)", // Dark Emerald
  "hsl(142, 71%, 45%)", // Primary Emerald
  "hsl(142, 60%, 65%)", // Light Emerald
  "hsl(142, 50%, 85%)", // Soft Emerald
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const CustomChartTooltip = ({ active, payload, label, prefix = "", suffix = "" }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border/50 bg-background/95 p-3 shadow-xl backdrop-blur-sm min-w-[160px]">
        <p className="mb-2 text-[11px] font-bold text-foreground border-b border-border/50 pb-1">{label}</p>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="space-y-1.5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5">
                  <div 
                    className="h-2 w-2 rounded-full" 
                    style={{ backgroundColor: entry.color || entry.fill }} 
                  />
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {entry.name}:
                  </span>
                </div>
                <span className="text-[10px] font-bold text-foreground">
                  {prefix}{typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}{suffix}
                </span>
              </div>
              {/* Breakdown Support */}
              {entry.payload?.breakdown && entry.payload.breakdown.length > 0 && (
                <div className="pl-3.5 space-y-1 border-l border-emerald-500/30 ml-1">
                  {entry.payload.breakdown.slice(0, 3).map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-[9px] text-muted-foreground/90">
                      <span className="truncate max-w-[80px]">{item.name}</span>
                      <span className="font-medium">{item.count}</span>
                    </div>
                  ))}
                  {entry.payload.breakdown.length > 3 && (
                    <div className="text-[8px] text-muted-foreground/60 italic">
                      + {entry.payload.breakdown.length - 3} more...
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export function DashboardAnalytics({
  users,
  internalFunding,
  externalFunding,
  trainings,
  totalBudget,
  internalBudget,
  externalBudget,
  moaExisting,
  moaCompleted,
  moaNew,
  activitySeries,
  activityBreakdownLabel,
  budgetSeries,
  radarSeries,
  fundingShare,
  trainingsShare,
  trainingsShareTotal,
  scopeLabel = "Detailed System Analytics",
}: DashboardAnalyticsProps) {

  // Logic: Calculate Trends & Interpretations
  const budgetTrend = useMemo(() => {
    if (budgetSeries.length < 2) return null;
    const current = budgetSeries[budgetSeries.length - 1].value;
    const previous = budgetSeries[budgetSeries.length - 2].value;
    if (previous === 0) return { percent: 100, up: true };
    const diff = ((current - previous) / previous) * 100;
    return { percent: Math.round(Math.abs(diff)), up: diff >= 0 };
  }, [budgetSeries]);

  const activityInsight = useMemo(() => {
    if (activitySeries.length === 0) return "Starting data collection phase.";
    const peak = [...activitySeries].sort((a, b) => b.value - a.value)[0];
    const total = activitySeries.reduce((acc, c) => acc + c.value, 0);
    const avg = total / activitySeries.length;
    if (total === 0) return "No projects recorded in this period.";
    return `Peak output in ${peak.label} (${peak.value} projects). Monthly consistency is ${avg > 5 ? 'high' : 'developing'}.`;
  }, [activitySeries]);

  const fundingAnalysis = useMemo(() => {
    const total = internalFunding + externalFunding;
    if (total === 0) return "Analysis pending project registration.";
    const internalPerc = Math.round((internalFunding / total) * 100);
    if (internalPerc > 70) return "Highly dependent on institutional funding. Expansion of external partnerships recommended.";
    if (internalPerc < 30) return "Strong external funding portfolio. Maintain internal base for stability.";
    return "Balanced distribution between internal and external resources.";
  }, [internalFunding, externalFunding]);

  const moaInsight = useMemo(() => {
    const total = moaExisting + moaCompleted + moaNew;
    if (total === 0) return "No active project lifecycles logged.";
    if (moaCompleted > moaNew) return "Focus on wrapping up existing projects. Increased intake of 'New' projects advised.";
    return "Pipeline is active with new agreements outshining completions.";
  }, [moaExisting, moaCompleted, moaNew]);

  return (
    <TooltipProvider delayDuration={0}>
      <div className="space-y-5">
        {/* KPI Cards */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <CompactStatCard 
            label="Total Personnel" 
            value={users} 
            sub="Active Coordinators"
            icon={Users}
            tooltip="Consolidated count of registered super admins, college and unit coordinators."
          />
          <CompactStatCard 
            label="Monetary Assets" 
            value={formatCurrency(totalBudget)} 
            sub={budgetTrend ? (
              <span className={budgetTrend.up ? "text-emerald-600 flex items-center" : "text-rose-600 flex items-center"}>
                {budgetTrend.up ? <ArrowUpRight className="h-2.5 w-2.5 mr-0.5" /> : <ArrowDownRight className="h-2.5 w-2.5 mr-0.5" />}
                {budgetTrend.percent}% from prev month
              </span>
            ) : "Budget Overview"}
            icon={Wallet}
            tooltip="The comprehensive sum of budgets from all visible projects and active proposals."
          />
          <CompactStatCard 
            label="Project Matrix" 
            value={internalFunding + externalFunding} 
            sub="Live Submissions"
            icon={Activity}
            tooltip="Sum of all project records, excluding historical archived data."
          />
          <CompactStatCard 
            label="Capability Building" 
            value={trainings} 
            sub={`${Math.round((trainingsShare / trainingsShareTotal) * 100)}% Activity Share`}
            icon={GraduationCap}
            tooltip="Number of training and community improvement programs logged in the system."
          />
        </div>

        {/* Analytics Visualization Grid */}
        <div className="grid gap-4 lg:grid-cols-12 lg:grid-rows-2">
          
          {/* Activity Over Time (6 cols) */}
          <Card className="lg:col-span-8 border-border/50 shadow-sm flex flex-col overflow-hidden bg-card/50">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div className="space-y-0.5">
                <CardTitle className="text-[13px] font-bold flex items-center gap-2">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                  Growth Trajectory
                </CardTitle>
                <CardDescription className="text-[10px]">Monthly project generation and {activityBreakdownLabel} activity</CardDescription>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="h-7 w-7 rounded-full bg-emerald-100/50 dark:bg-emerald-900/30 flex items-center justify-center cursor-help">
                    <Info className="h-3.5 w-3.5 text-emerald-600" />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-[200px] p-2">
                  <p className="font-bold text-[9px] uppercase mb-1">Interpretation</p>
                  <p className="text-[10px] leading-relaxed">{activityInsight}</p>
                </TooltipContent>
              </Tooltip>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="h-[240px] w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activitySeries} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="activityGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" opacity={0.4} />
                    <XAxis 
                      dataKey="label" 
                      fontSize={9} 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(val) => val.split(' ')[0]}
                    />
                    <YAxis 
                      fontSize={9} 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <RechartsTooltip content={<CustomChartTooltip suffix=" projects" />} />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      name="Volume"
                      stroke="hsl(142, 71%, 45%)" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#activityGrad)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Funding Pie (4 cols) */}
          <Card className="lg:col-span-4 border-border/50 shadow-sm flex flex-col bg-card/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-[13px] font-bold flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-emerald-600" />
                Funding Profile
              </CardTitle>
              <CardDescription className="text-[10px]">Strategic resource classification</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={fundingShare}
                      cx="50%" cy="50%"
                      innerRadius={50} outerRadius={70}
                      paddingAngle={8}
                      dataKey="value" nameKey="label"
                      stroke="none"
                    >
                      {fundingShare.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CustomChartTooltip suffix=" projects" />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full space-y-2 mt-2">
                {fundingShare.map((item, index) => (
                  <div key={item.label} className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      {item.label}
                    </div>
                    <span className="font-bold">{item.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 w-full p-2.5 rounded-lg border border-border/50 bg-muted/20">
                <p className="text-[10px] italic text-muted-foreground leading-snug">
                  <span className="font-bold text-emerald-600 not-italic mr-1">Insight:</span>
                  {fundingAnalysis}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Budget Bar (6 cols) */}
          <Card className="lg:col-span-6 border-border/50 shadow-sm flex flex-col bg-card/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-[13px] font-bold flex items-center gap-2">
                <Wallet className="h-3.5 w-3.5 text-emerald-600" />
                Allocated Capital Trend
              </CardTitle>
              <CardDescription className="text-[10px]">Funds injected into projects per period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={budgetSeries} margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" opacity={0.3} />
                    <XAxis 
                      dataKey="label" 
                      fontSize={9} 
                      tickLine={false} axisLine={false} 
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(val) => val.split(' ')[0]}
                    />
                    <YAxis 
                      fontSize={9} 
                      tickLine={false} axisLine={false} 
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(val) => `₱${val >= 1000 ? (val/1000).toFixed(0)+'k' : val}`}
                    />
                    <RechartsTooltip content={<CustomChartTooltip prefix="₱" />} />
                    <Bar 
                      dataKey="value" name="Allocation"
                      fill="hsl(142, 71%, 45%)" 
                      radius={[4, 4, 0, 0]} maxBarSize={30}
                    >
                      {budgetSeries.map((_, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={index === budgetSeries.length - 1 ? "hsl(142, 72%, 29%)" : "hsl(142, 71%, 45%)"} 
                          fillOpacity={0.8}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* MOA Radar (6 cols) */}
          <Card className="lg:col-span-6 border-border/50 shadow-sm flex flex-col bg-card/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-[13px] font-bold flex items-center gap-2">
                <Target className="h-3.5 w-3.5 text-emerald-600" />
                Agreement Performance
              </CardTitle>
              <CardDescription className="text-[10px]">Lifecycle distribution of MOA/Project status</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col lg:flex-row items-center gap-4">
              <div className="h-[180px] w-full lg:w-3/5">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={[
                    { subject: 'Historical', value: moaExisting || 0 },
                    { subject: 'Completed', value: moaCompleted || 0 },
                    { subject: 'Propelled', value: moaNew || 0 },
                  ]}>
                    <PolarGrid stroke="hsl(var(--muted))" />
                    <PolarAngleAxis dataKey="subject" fontSize={9} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Radar
                      name="Agreements" dataKey="value"
                      stroke="hsl(142, 71%, 45%)" fill="hsl(142, 71%, 45%)" fillOpacity={0.4}
                    />
                    <RechartsTooltip content={<CustomChartTooltip suffix=" projects" />} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full lg:w-2/5 p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/30">
                <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 mb-1 flex items-center gap-1.5">
                  <Info className="h-3 w-3" />
                  Status Analysis
                </p>
                <p className="text-[10px] leading-relaxed text-emerald-800/80 dark:text-emerald-200/80 font-medium">
                  {moaInsight}
                </p>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </TooltipProvider>
  );
}

function CompactStatCard({ label, value, sub, icon: Icon, tooltip }: any) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card className="border-border/50 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 group bg-card/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-emerald-600 transition-colors">{label}</p>
              <h3 className="text-lg font-bold tracking-tight">{typeof value === 'number' ? value.toLocaleString() : value}</h3>
              <p className="text-[9px] text-muted-foreground/80 font-medium flex items-center">{sub}</p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
              <Icon className="h-4.5 w-4.5" />
            </div>
          </CardContent>
        </Card>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-[10px] bg-foreground text-background border-none px-3 py-1.5 shadow-xl font-medium">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
