"use client";

import type { LucideIcon } from "lucide-react";
import { X } from "lucide-react";

import { StepIndicator } from "@/components/step-indicator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HeaderItem {
  icon: LucideIcon;
  label: string;
  value: string | number;
  minWidthClassName?: string;
}

interface FullscreenFormHeaderProps {
  title: string;
  currentStep: number;
  totalSteps: number;
  labels?: string[];
  items: HeaderItem[];
  onClose?: () => void;
}

export function FullscreenFormHeader({
  title,
  currentStep,
  totalSteps,
  labels,
  items,
  onClose,
}: FullscreenFormHeaderProps) {
  return (
    <div className="border-b border-border/40 bg-background px-4 py-3 sm:px-6 lg:px-8">
      <div className="flex w-full items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-start gap-2.5">
          <h1 className="shrink-0 pt-1 text-xl font-bold text-foreground">{title}</h1>
          <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-3">
            {items.map((item) => {
              const Icon = item.icon;
              const hasValue =
                typeof item.value === "number" ||
                (typeof item.value === "string" && item.value.trim().length > 0);
              return (
                <div
                  key={item.label}
                  className={cn(
                    "min-w-0 rounded-xl border border-border/40 bg-muted/10 px-2.5 py-2",
                    item.minWidthClassName
                  )}
                >
                  <div className="flex items-start gap-2">
                    <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80">{item.label}</p>
                      <p className="truncate text-[11px] font-medium text-foreground">{hasValue ? item.value : "N/A"}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {onClose ? (
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-full" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      <div className="mt-2 w-full">
        <StepIndicator currentStep={currentStep} totalSteps={totalSteps} labels={labels} />
      </div>
    </div>
  );
}
