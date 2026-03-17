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
  scopeLabel = "Based on your current visibility",
}: DashboardAnalyticsProps) {
  const totalBudgetValue = totalBudget || 0;
  const budgetSegments = [
    { label: "Internal", value: internalBudget, color: "bg-[#159E44]" },
    { label: "External", value: externalBudget, color: "bg-[#0F766E]" },
  ];
  const budgetTotalForSegments = Math.max(
    1,
    budgetSegments.reduce((sum, item) => sum + item.value, 0)
  );
  const statusBars = [
    { label: "Existing MOA", value: moaExisting, color: "bg-[#0EA5E9]" },
    { label: "Completed", value: moaCompleted, color: "bg-[#16A34A]" },
    { label: "New", value: moaNew, color: "bg-[#F59E0B]" },
  ];
  const statusMax = Math.max(1, ...statusBars.map((item) => item.value));

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

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

        <div className="grid gap-3 lg:grid-cols-[1.2fr,1fr]">
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
              {statusBars.map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-medium">{item.label}</span>
                    <span className="text-muted-foreground">{item.value}</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/40">
                    <div
                      className={`h-full ${item.color}`}
                      style={{ width: `${(item.value / statusMax) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
