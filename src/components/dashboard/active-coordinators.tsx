"use client";

import { useState, useMemo } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  Avatar, 
  AvatarFallback, 
  AvatarImage 
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Medal, Search, Filter } from "lucide-react";

export interface CoordinatorActivity {
  id: string;
  name: string;
  department: string;
  role: string;
  projectCount: number;
  avatar_url: string | null;
}

interface ActiveCoordinatorsProps {
  coordinators: CoordinatorActivity[];
  departments: string[];
}

export function ActiveCoordinators({ coordinators, departments }: ActiveCoordinatorsProps) {
  const [filter, setFilter] = useState<string>("all");

  const filteredCoordinators = useMemo(() => {
    let list = coordinators;
    if (filter !== "all") {
      list = list.filter(c => c.department === filter);
    }
    return [...list].sort((a, b) => b.projectCount - a.projectCount);
  }, [coordinators, filter]);

  const sortedDepartments = useMemo(() => {
    return [...departments].sort((a, b) => a.localeCompare(b));
  }, [departments]);

  return (
    <Card className="border-border/50 shadow-sm bg-card/50 overflow-hidden">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-[14px] font-bold flex items-center gap-2">
            <Medal className="h-4 w-4 text-emerald-600" />
            Top Engagement Leaders
          </CardTitle>
          <CardDescription className="text-[11px]">Most active extension coordinators across the university</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="h-8 w-[180px] text-[10px] bg-background/50 border-border/50">
              <Filter className="h-3 w-3 mr-2 opacity-50" />
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
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[400px] overflow-y-auto">
          <div className="divide-y divide-border/30">
            {filteredCoordinators.length > 0 ? (
              filteredCoordinators.map((coordinator, index) => (
                <div 
                  key={coordinator.id} 
                  className="flex items-center justify-between p-3.5 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-9 w-9 border-2 border-background shadow-sm group-hover:border-emerald-500/30 transition-all">
                        <AvatarImage src={coordinator.avatar_url || ""} />
                        <AvatarFallback className="bg-emerald-50 text-emerald-700 font-bold text-[11px] dark:bg-emerald-900/30 dark:text-emerald-400">
                          {coordinator.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {index < 3 && filter === "all" && (
                        <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-emerald-600 flex items-center justify-center border-2 border-background">
                          <span className="text-[8px] font-bold text-white leading-none">{index + 1}</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-bold text-foreground truncate max-w-[150px]">
                          {coordinator.name}
                        </span>
                        <Badge variant="outline" className="text-[8px] py-0 px-1 bg-muted/30 border-muted-foreground/20 text-muted-foreground font-medium uppercase tracking-tighter">
                          {coordinator.role.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate max-w-[200px] font-medium">
                        {coordinator.department || "No Department"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30">
                      <span className="text-[12px] font-bold text-emerald-700 dark:text-emerald-400">{coordinator.projectCount}</span>
                      <span className="text-[9px] text-emerald-600/70 dark:text-emerald-400/70 font-medium">Projects</span>
                    </div>
                    {index === 0 && (
                      <span className="text-[8px] font-bold uppercase tracking-widest text-emerald-600/60 flex items-center gap-0.5">
                        <Medal className="h-2 w-2" /> Top Performer
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center bg-muted/5">
                <Search className="h-8 w-8 mx-auto text-muted-foreground/20 mb-3" />
                <p className="text-[11px] text-muted-foreground font-medium">No active coordinators found for this department.</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
