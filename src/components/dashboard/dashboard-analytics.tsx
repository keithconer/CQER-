import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Wallet, GraduationCap } from "lucide-react";

interface DashboardAnalyticsProps {
  users: number;
  internalFunding: number;
  externalFunding: number;
  trainings: number;
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
  scopeLabel = "Based on your current visibility",
}: DashboardAnalyticsProps) {
  return (
    <Card className="border-border/50 bg-muted/10 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-xs font-semibold">Overview Analytics</CardTitle>
        <p className="text-[10px] text-muted-foreground">{scopeLabel}</p>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
      </CardContent>
    </Card>
  );
}
