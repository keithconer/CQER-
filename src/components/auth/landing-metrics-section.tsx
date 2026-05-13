"use client";

import * as React from "react";
import { Activity, BarChart3, BriefcaseBusiness, GraduationCap, PhilippinePeso, Radar } from "lucide-react";
import { Bar, BarChart, CartesianGrid, PolarAngleAxis, PolarGrid, Radar as ReRadar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatPhpCurrency } from "@/lib/currency";

type YearlyMetric = {
  year: number;
  projects: number;
  trainings: number;
  budget: number;
};

type MonthlyMetric = {
  key: string;
  label: string;
  projects: number;
  trainings: number;
  budget: number;
};

type MetricsPayload = {
  totals: { projects: number; trainings: number; overallBudget: number };
  years: number[];
  yearly: YearlyMetric[];
  monthly: MonthlyMetric[];
};

export function LandingMetricsSection() {
  const [payload, setPayload] = React.useState<MetricsPayload | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedYear, setSelectedYear] = React.useState<string>("all");
  const [timeline, setTimeline] = React.useState<"yearly" | "monthly">("yearly");

  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setIsLoading(true);
        const res = await fetch("/api/public-landing-metrics", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "Unable to load metrics.");
        }
        if (mounted) {
          setPayload(data as MetricsPayload);
          setError(null);
        }
      } catch (e) {
        if (mounted) {
          setError(e instanceof Error ? e.message : "Unable to load metrics.");
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredYearly = React.useMemo(() => {
    if (!payload) return [];
    if (selectedYear === "all") return payload.yearly;
    return payload.yearly.filter((item) => String(item.year) === selectedYear);
  }, [payload, selectedYear]);

  const filteredMonthly = React.useMemo(() => {
    if (!payload) return [];
    if (selectedYear === "all") return payload.monthly.slice(-12);
    return payload.monthly.filter((item) => item.key.startsWith(`${selectedYear}-`));
  }, [payload, selectedYear]);

  const chartData = timeline === "yearly" ? filteredYearly : filteredMonthly;
  const radarData = [
    {
      metric: "Projects",
      value: filteredYearly.reduce((sum, item) => sum + item.projects, 0),
    },
    {
      metric: "Trainings",
      value: filteredYearly.reduce((sum, item) => sum + item.trainings, 0),
    },
    {
      metric: "Budget Index",
      value: Math.round(filteredYearly.reduce((sum, item) => sum + item.budget, 0) / 100000),
    },
  ];

  return (
    <Card className="mt-4 border-border/60 bg-card/92 shadow-md backdrop-blur-sm">
      <CardHeader className="space-y-2 pb-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <BarChart3 className="h-4 w-4 text-[#138A3B]" />
              Landing Overview
            </CardTitle>
            <CardDescription className="text-[11px]">
              Live project, training, and budget summary with compact visual analytics.
            </CardDescription>
          </div>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="flex flex-wrap gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="h-8 w-[120px] text-[11px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {(payload?.years || []).map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={timeline} onValueChange={(value) => setTimeline(value as "yearly" | "monthly")}>
            <SelectTrigger className="h-8 w-[120px] text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yearly">Yearly View</SelectItem>
              <SelectItem value="monthly">Monthly View</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {isLoading && <p className="text-[11px] text-muted-foreground">Loading metrics...</p>}
        {error && <p className="text-[11px] text-destructive">{error}</p>}
        {!isLoading && !error && payload && (
          <>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <CompactMetric icon={BriefcaseBusiness} label="Projects" value={String(payload.totals.projects)} />
              <CompactMetric icon={GraduationCap} label="Trainings" value={String(payload.totals.trainings)} />
              <CompactMetric icon={PhilippinePeso} label="Overall Budget" value={formatPhpCurrency(payload.totals.overallBudget)} />
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <Card className="border-border/50 lg:col-span-2">
                <CardHeader className="pb-2 pt-3">
                  <CardTitle className="text-xs font-semibold">Results Trend</CardTitle>
                </CardHeader>
                <CardContent className="h-44 pb-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.25} />
                      <XAxis
                        dataKey={timeline === "yearly" ? "year" : "label"}
                        tick={{ fontSize: 10 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="projects" fill="#138A3B" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="trainings" fill="#1A6E39" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader className="pb-2 pt-3">
                  <CardTitle className="flex items-center gap-1 text-xs font-semibold">
                    <Radar className="h-3.5 w-3.5 text-[#138A3B]" />
                    Snapshot Radar
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-44 pb-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                      <ReRadar dataKey="value" stroke="#138A3B" fill="#138A3B" fillOpacity={0.3} />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function CompactMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="flex items-center gap-2 px-3 py-2.5">
        <div className="rounded-md bg-[#138A3B]/12 p-1.5">
          <Icon className="h-3.5 w-3.5 text-[#138A3B]" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[10px] text-muted-foreground">{label}</p>
          <p className="truncate text-xs font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
