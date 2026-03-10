import { TableSkeleton } from "@/components/dashboard/table-skeleton";

export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="h-5 w-24 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-48 animate-pulse rounded-md bg-muted" />
      </div>
      <TableSkeleton />
    </div>
  );
}
