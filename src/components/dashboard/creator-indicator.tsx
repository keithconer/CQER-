"use client";

import { UserRound } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CreatorIndicatorProps {
  name?: string | null;
  avatarUrl?: string | null;
  role?: string | null;
}

function getInitials(name?: string | null) {
  const parts = String(name || "")
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";
}

function formatRole(role?: string | null) {
  if (!role) return "Creator";
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function CreatorIndicator({ name, avatarUrl, role }: CreatorIndicatorProps) {
  const displayName = name?.trim() || "Unknown creator";

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex cursor-default items-center gap-1.5 rounded-md border border-border/50 bg-background px-1.5 py-1">
            <Avatar className="h-5 w-5 border border-border/40">
              <AvatarImage src={avatarUrl || undefined} alt={displayName} />
              <AvatarFallback className="text-[8px]">{getInitials(displayName)}</AvatarFallback>
            </Avatar>
            <UserRound className="h-3 w-3 text-muted-foreground" />
          </div>
        </TooltipTrigger>
        <TooltipContent className="text-[10px]">
          <p className="font-medium">{displayName}</p>
          <p className="text-muted-foreground">{formatRole(role)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
