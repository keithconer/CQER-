"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Wallet, GraduationCap } from "lucide-react";

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

function StatCard({
  title,
  value,
  helper,
  icon: Icon,
}: {
  title: string;
  value: number;
  helper: string;
  icon: typeof Users;
}) {
  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-[11px] font-semibold text-foreground/80">
          {title}
        </CardTitle>
        <div className="rounded-md border border-border/60 bg-muted/30 p-1.5 text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        <p className="text-[10px] text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  );
}

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
  scopeLabel = "Based on your current visibility",
}: DashboardAnalyticsProps) {
  const totalBudgetValue = totalBudget || 0;
  const budgetSegments = [
    { label: "Internal", value: internalBudget, color: "bg-[#159E44]" },
    { label: "External", value: externalBudget, color: "bg-emerald-600/80" },
  ];
  const budgetTotalForSegments = Math.max(
    1,
    budgetSegments.reduce((sum, item) => sum + item.value, 0)
  );
  const statusBars = [
    { label: "Existing MOA", value: moaExisting, color: "bg-emerald-600/70" },
    { label: "Completed", value: moaCompleted, color: "bg-emerald-500/60" },
    { label: "New", value: moaNew, color: "bg-emerald-400/60" },
  ];
  const statusMax = Math.max(1, ...statusBars.map((item) => item.value));
  const trainingsPercent = Math.round((trainingsShare / Math.max(1, trainingsShareTotal)) * 100);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const activityPeak = useMemo(() => {
    const peak = activitySeries.reduce(
      (acc, item) => (item.value > acc.value ? item : acc),
      { label: "-", value: 0, breakdown: [] as { name: string; count: number }[] }
    );
    return peak;
  }, [activitySeries]);

  const budgetTrend = useMemo(() => {
    if (budgetSeries.length < 2) return 0;
    const last = budgetSeries[budgetSeries.length - 1].value;
    const prev = budgetSeries[budgetSeries.length - 2].value;
    if (prev === 0) return last > 0 ? 100 : 0;
    return Math.round(((last - prev) / prev) * 100);
  }, [budgetSeries]);

  const fundingLead = useMemo(() => {
    if (fundingShare.length === 0) return "Balanced";
    const sorted = [...fundingShare].sort((a, b) => b.value - a.value);
    if (sorted[0].value === sorted[1]?.value) return "Balanced";
    return sorted[0].label;
  }, [fundingShare]);

  return (
    <Card className="border-border/50 bg-muted/10 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-xs font-semibold">Overview Analytics</CardTitle>
        <p className="text-[10px] text-muted-foreground">{scopeLabel}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Registered Users"
            value={users}
            helper="Active coordinators and admins"
            icon={Users}
          />
          <StatCard
            title="Internal Funding"
            value={internalFunding}
            helper="Projects tagged as internal"
            icon={Wallet}
          />
          <StatCard
            title="External Funding"
            value={externalFunding}
            helper="Projects tagged as external"
            icon={Wallet}
          />
          <StatCard
            title="Trainings"
            value={trainings}
            helper="Training records logged"
            icon={GraduationCap}
          />
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.1fr,1fr]">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-[11px] font-semibold">
                Overall Budget Total
              </CardTitle>
              <p className="text-[10px] text-muted-foreground">
                Combined funding across visible projects
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xl font-semibold tracking-tight">
                {formatCurrency(totalBudgetValue)}
              </p>
              <div className="space-y-2">
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/40">
                  <div className="flex h-full w-full">
                    {budgetSegments.map((segment) => (
                      <div
                        key={segment.label}
                        className={segment.color}
                        style={{
                          width: `${(segment.value / budgetTotalForSegments) * 100}%`,
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                  {budgetSegments.map((segment) => (
                    <span key={segment.label} className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${segment.color}`} />
                      {segment.label}: {formatCurrency(segment.value)}
                    </span>
                  ))}
                </div>
              </div>
              <div className="pt-2">
                <LineChart
                  data={budgetSeries}
                  label="Budget trend"
                  valueFormatter={formatCurrency}
                />
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Budget is {budgetTrend >= 0 ? "up" : "down"} {Math.abs(budgetTrend)}% from last month.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-[11px] font-semibold">
                MOA Status Snapshot
              </CardTitle>
              <p className="text-[10px] text-muted-foreground">
                Existing, completed, and new project agreements
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <BarChart
                data={statusBars.map((item) => ({ label: item.label, value: item.value }))}
                colorClass="bg-emerald-500/70"
              />
              <p className="text-[10px] text-muted-foreground">
                Existing MOAs remain the largest share this period.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.6fr,1fr]">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-[11px] font-semibold">
                Total Project Activity
              </CardTitle>
              <p className="text-[10px] text-muted-foreground">
                Projects created in the last six months
              </p>
            </CardHeader>
            <CardContent>
              <AreaChart
                data={activitySeries}
                breakdownLabel={activityBreakdownLabel}
              />
              <p className="mt-2 text-[10px] text-muted-foreground">
                Peak activity in {activityPeak.label} with {activityPeak.value} projects logged.
              </p>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-[11px] font-semibold">
                  Funding Split
                </CardTitle>
                <p className="text-[10px] text-muted-foreground">
                  Internal vs external projects
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                <PieChart data={fundingShare} />
                <p className="text-[10px] text-muted-foreground">
                  {fundingLead} funding leads the project mix.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-[11px] font-semibold">
                  Training Share
                </CardTitle>
                <p className="text-[10px] text-muted-foreground">
                  Trainings as a share of total activities
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                <RadialChart value={trainingsPercent} />
                <p className="text-[10px] text-muted-foreground">
                  Trainings account for {trainingsPercent}% of logged activity.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr,1fr]">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-[11px] font-semibold">
                Internal vs External Radar
              </CardTitle>
              <p className="text-[10px] text-muted-foreground">
                Project counts by month
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              <RadarChart data={radarSeries} />
              <p className="text-[10px] text-muted-foreground">
                Compare internal and external momentum over time.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-[11px] font-semibold">
                Funding Type Distribution
              </CardTitle>
              <p className="text-[10px] text-muted-foreground">
                Share of internal vs external totals
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              <BarChart
                data={fundingShare.map((item) => ({ label: item.label, value: item.value }))}
                colorClass="bg-emerald-600/60"
                horizontal
              />
              <p className="text-[10px] text-muted-foreground">
                Use this to balance funding pipelines.
              </p>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}

function LineChart({
  data,
  label,
  valueFormatter = (value: number) => String(value),
}: {
  data: { label: string; value: number }[];
  label: string;
  valueFormatter?: (value: number) => string;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const width = 560;
  const height = 160;
  const padding = 24;
  const maxValue = Math.max(1, ...data.map((item) => item.value));
  const points = data.map((item, index) => {
    const x =
      padding +
      (index * (width - padding * 2)) / Math.max(1, data.length - 1);
    const y =
      height -
      padding -
      (item.value / maxValue) * (height - padding * 2);
    return { x, y };
  });
  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const hovered = hoverIndex !== null ? data[hoverIndex] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-36"
        onMouseLeave={() => setHoverIndex(null)}
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const relativeX = event.clientX - rect.left;
          const index = Math.round(
            (relativeX / rect.width) * (data.length - 1)
          );
          const boundedIndex = Math.max(0, Math.min(data.length - 1, index));
          setHoverIndex(boundedIndex);
        }}
      >
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          className="text-emerald-600/80"
          strokeWidth="2"
        />
        {points.map((point, index) => (
          <circle
            key={data[index]?.label}
            cx={point.x}
            cy={point.y}
            r={hoverIndex === index ? 4 : 2.5}
            className="fill-emerald-600"
          />
        ))}
      </svg>
      {hovered && hoverIndex !== null && (
        <div className="absolute left-0 top-2">
          <div className="rounded-md border border-border/60 bg-background px-2 py-1 text-[10px] shadow-sm">
            <p className="font-semibold">{label}</p>
            <p className="text-muted-foreground">{hovered.label}</p>
            <p className="font-medium">{valueFormatter(hovered.value)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function AreaChart({
  data,
  breakdownLabel,
}: {
  data: { label: string; value: number; breakdown: { name: string; count: number }[] }[];
  breakdownLabel: string;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const width = 640;
  const height = 200;
  const padding = 26;
  const maxValue = Math.max(1, ...data.map((item) => item.value));
  const points = data.map((item, index) => {
    const x =
      padding +
      (index * (width - padding * 2)) / Math.max(1, data.length - 1);
    const y =
      height -
      padding -
      (item.value / maxValue) * (height - padding * 2);
    return { x, y };
  });
  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? padding} ${
    height - padding
  } L ${points[0]?.x ?? padding} ${height - padding} Z`;
  const hovered = hoverIndex !== null ? data[hoverIndex] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-44"
        onMouseLeave={() => setHoverIndex(null)}
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const relativeX = event.clientX - rect.left;
          const index = Math.round(
            (relativeX / rect.width) * (data.length - 1)
          );
          const boundedIndex = Math.max(0, Math.min(data.length - 1, index));
          setHoverIndex(boundedIndex);
        }}
      >
        <path
          d={areaPath}
          className="fill-emerald-600/10"
          stroke="none"
        />
        <path
          d={linePath}
          fill="none"
          stroke="currentColor"
          className="text-emerald-600/80"
          strokeWidth="2"
        />
        {points.map((point, index) => (
          <circle
            key={data[index]?.label}
            cx={point.x}
            cy={point.y}
            r={hoverIndex === index ? 4 : 2.5}
            className="fill-emerald-600"
          />
        ))}
      </svg>
      {hovered && hoverIndex !== null && (
        <div className="absolute left-2 top-2 rounded-md border border-border/60 bg-background px-2 py-1 text-[10px] shadow-sm">
          <p className="font-semibold">{hovered.label}</p>
          <p className="text-muted-foreground">
            {hovered.value} projects
          </p>
          <div className="pt-1">
            <p className="text-[9px] text-muted-foreground">
              {breakdownLabel} breakdown
            </p>
            {hovered.breakdown.slice(0, 3).map((entry) => (
              <p key={entry.name} className="text-[9px]">
                {entry.name}: {entry.count}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BarChart({
  data,
  colorClass,
  horizontal = false,
}: {
  data: { label: string; value: number }[];
  colorClass: string;
  horizontal?: boolean;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const maxValue = Math.max(1, ...data.map((item) => item.value));
  return (
    <div className="relative">
      <div className={`grid gap-3 ${horizontal ? "grid-rows-3" : "grid-cols-3"}`}>
        {data.map((item, index) => {
          const percent = (item.value / maxValue) * 100;
          return (
            <div
              key={item.label}
              className="flex flex-col items-center gap-2"
              onMouseEnter={() => setHoverIndex(index)}
              onMouseLeave={() => setHoverIndex(null)}
            >
              <div
                className={`w-full ${horizontal ? "h-3" : "h-24"} rounded-md bg-muted/30 overflow-hidden`}
              >
                <div
                  className={`${colorClass}`}
                  style={
                    horizontal
                      ? { width: `${percent}%`, height: "100%" }
                      : { height: `${percent}%`, width: "100%" }
                  }
                />
              </div>
              <p className="text-[10px] text-muted-foreground text-center">
                {item.label}
              </p>
            </div>
          );
        })}
      </div>
      {hoverIndex !== null && (
        <div className="absolute right-0 top-0 rounded-md border border-border/60 bg-background px-2 py-1 text-[10px] shadow-sm">
          <p className="font-semibold">{data[hoverIndex].label}</p>
          <p className="text-muted-foreground">{data[hoverIndex].value} records</p>
        </div>
      )}
    </div>
  );
}

function PieChart({ data }: { data: { label: string; value: number }[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const total = Math.max(1, data.reduce((sum, item) => sum + item.value, 0));
  const radius = 60;
  const center = 70;
  let startAngle = 0;
  const colors = ["#159E44", "#3B8064", "#4B5563"];

  const segments = data.map((item, index) => {
    const angle = (item.value / total) * 360;
    const endAngle = startAngle + angle;
    const largeArc = angle > 180 ? 1 : 0;
    const start = polarToCartesian(center, center, radius, endAngle);
    const end = polarToCartesian(center, center, radius, startAngle);
    const path = [
      `M ${center} ${center}`,
      `L ${start.x} ${start.y}`,
      `A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y}`,
      "Z",
    ].join(" ");
    const segment = { path, color: colors[index % colors.length], item, startAngle, endAngle };
    startAngle = endAngle;
    return segment;
  });

  return (
    <div className="relative flex items-center gap-4">
      <svg
        viewBox={`0 0 ${center * 2} ${center * 2}`}
        className="h-36 w-36"
      >
        {segments.map((segment, index) => (
          <path
            key={segment.item.label}
            d={segment.path}
            fill={segment.color}
            fillOpacity={hoverIndex === index ? 0.9 : 0.6}
            onMouseEnter={() => setHoverIndex(index)}
            onMouseLeave={() => setHoverIndex(null)}
          />
        ))}
      </svg>
      <div className="space-y-2 text-[10px] text-muted-foreground">
        {data.map((item, index) => (
          <div key={item.label} className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: colors[index % colors.length] }}
            />
            <span>
              {item.label}: {item.value}
            </span>
          </div>
        ))}
      </div>
      {hoverIndex !== null && (
        <div className="absolute left-0 top-0 rounded-md border border-border/60 bg-background px-2 py-1 text-[10px] shadow-sm">
          <p className="font-semibold">{data[hoverIndex].label}</p>
          <p className="text-muted-foreground">{data[hoverIndex].value} projects</p>
        </div>
      )}
    </div>
  );
}

function RadialChart({ value }: { value: number }) {
  const [hovered, setHovered] = useState(false);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, value));
  const offset = circumference - (progress / 100) * circumference;
  return (
    <div
      className="relative flex items-center justify-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <svg className="h-32 w-32" viewBox="0 0 140 140">
        <circle
          cx="70"
          cy="70"
          r={radius}
          stroke="currentColor"
          className="text-muted/30"
          strokeWidth="10"
          fill="none"
        />
        <circle
          cx="70"
          cy="70"
          r={radius}
          stroke="currentColor"
          className="text-emerald-600/80"
          strokeWidth="10"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-lg font-semibold">{progress}%</p>
        <p className="text-[10px] text-muted-foreground">Trainings</p>
      </div>
      {hovered && (
        <div className="absolute -top-2 right-0 rounded-md border border-border/60 bg-background px-2 py-1 text-[10px] shadow-sm">
          Trainings share: {progress}%
        </div>
      )}
    </div>
  );
}

function RadarChart({
  data,
}: {
  data: { label: string; internal: number; external: number }[];
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const size = 240;
  const center = size / 2;
  const radius = 80;
  const maxValue = Math.max(
    1,
    ...data.flatMap((item) => [item.internal, item.external])
  );
  const angleStep = (Math.PI * 2) / data.length;

  const buildPoints = (key: "internal" | "external") =>
    data.map((item, index) => {
      const value = item[key];
      const angle = -Math.PI / 2 + index * angleStep;
      const r = (value / maxValue) * radius;
      return {
        x: center + r * Math.cos(angle),
        y: center + r * Math.sin(angle),
      };
    });

  const internalPoints = buildPoints("internal");
  const externalPoints = buildPoints("external");
  return (
    <div className="relative flex items-center justify-center">
      <svg className="h-52 w-52" viewBox={`0 0 ${size} ${size}`}>
        {[1, 2, 3, 4].map((step) => (
          <polygon
            key={step}
            points={data
              .map((_, index) => {
                const angle = -Math.PI / 2 + index * angleStep;
                const r = (radius * step) / 4;
                return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
              })
              .join(" ")}
            fill="none"
            stroke="currentColor"
            className="text-muted/30"
            strokeWidth="1"
          />
        ))}
        <polygon
          points={internalPoints.map((point) => `${point.x},${point.y}`).join(" ")}
          fill="rgba(21, 158, 68, 0.15)"
          stroke="rgba(21, 158, 68, 0.6)"
          strokeWidth="2"
        />
        <polygon
          points={externalPoints.map((point) => `${point.x},${point.y}`).join(" ")}
          fill="rgba(75, 85, 99, 0.15)"
          stroke="rgba(75, 85, 99, 0.6)"
          strokeWidth="2"
        />
        {data.map((item, index) => {
          const angle = -Math.PI / 2 + index * angleStep;
          const labelX = center + (radius + 18) * Math.cos(angle);
          const labelY = center + (radius + 18) * Math.sin(angle);
          return (
            <text
              key={item.label}
              x={labelX}
              y={labelY}
              textAnchor="middle"
              className="text-[8px] fill-muted-foreground"
            >
              {item.label.split(" ")[0]}
            </text>
          );
        })}
        {data.map((item, index) => (
          <circle
            key={item.label}
            cx={internalPoints[index].x}
            cy={internalPoints[index].y}
            r={3}
            className="fill-emerald-600"
            onMouseEnter={() => setHoverIndex(index)}
            onMouseLeave={() => setHoverIndex(null)}
          />
        ))}
      </svg>
      {hoverIndex !== null && (
        <div className="absolute right-0 top-0 rounded-md border border-border/60 bg-background px-2 py-1 text-[10px] shadow-sm">
          <p className="font-semibold">{data[hoverIndex].label}</p>
          <p className="text-muted-foreground">Internal: {data[hoverIndex].internal}</p>
          <p className="text-muted-foreground">External: {data[hoverIndex].external}</p>
        </div>
      )}
    </div>
  );
}

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const angleRad = ((angle - 90) * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}
