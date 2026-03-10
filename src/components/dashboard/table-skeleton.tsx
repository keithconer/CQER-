import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export function TableSkeleton() {
  return (
    <div className="space-y-4">
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-8 w-32" />
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <Skeleton className="h-8 w-full max-w-sm" />
            <Skeleton className="h-8 w-20" />
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="rounded-md border border-border/50 overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="h-9"><Skeleton className="h-3 w-16" /></TableHead>
                  <TableHead className="h-9"><Skeleton className="h-3 w-20" /></TableHead>
                  <TableHead className="h-9"><Skeleton className="h-3 w-24" /></TableHead>
                  <TableHead className="h-9"><Skeleton className="h-3 w-16" /></TableHead>
                  <TableHead className="h-9"><Skeleton className="h-3 w-20" /></TableHead>
                  <TableHead className="h-9 text-right"><Skeleton className="h-3 w-16 ml-auto" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-border/30">
                    <TableCell className="py-3 px-3">
                      <div className="space-y-1">
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-2 w-20" />
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-3"><Skeleton className="h-3 w-24" /></TableCell>
                    <TableCell className="py-3 px-3"><Skeleton className="h-3 w-20" /></TableCell>
                    <TableCell className="py-3 px-3"><Skeleton className="h-3 w-16" /></TableCell>
                    <TableCell className="py-3 px-3"><Skeleton className="h-3 w-28" /></TableCell>
                    <TableCell className="py-3 px-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Skeleton className="h-7 w-7 rounded-md" />
                        <Skeleton className="h-7 w-7 rounded-md" />
                        <Skeleton className="h-7 w-7 rounded-md" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
