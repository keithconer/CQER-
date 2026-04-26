"use client";

import type { LucideIcon } from "lucide-react";
import { X } from "lucide-react";

import { StepIndicator } from "@/components/step-indicator";
import { Button } from "@/components/ui/button";

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
      <div className="flex w-full flex-col gap-3 xl:flex-row xl:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-3 xl:flex-row xl:items-center">
          <h1 className="shrink-0 text-xl font-bold text-foreground">{title}</h1>
          <div className="flex min-w-0 flex-1 flex-wrap gap-2">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className={`${item.minWidthClassName || "min-w-[150px]"} flex-1 rounded-xl border border-border/40 bg-muted/10 px-3 py-2`}
                >
                  <div className="flex items-start gap-2">
                    <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80">{item.label}</p>
                      <p className="truncate text-[11px] font-medium text-foreground">{item.value || "N/A"}</p>
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
      <div className="mt-3 w-full">
        <StepIndicator currentStep={currentStep} totalSteps={totalSteps} labels={labels} />
      </div>
    </div>
  );
}
