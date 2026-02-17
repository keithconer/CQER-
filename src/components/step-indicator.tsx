"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
}

export function StepIndicator({
  currentStep,
  totalSteps,
  labels,
}: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-0 w-full mb-6">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1;
        const isCompleted = step < currentStep;
        const isActive = step === currentStep;

        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200",
                  isCompleted &&
                    "bg-[#159E44] text-white",
                  isActive &&
                    "bg-[#159E44] text-white ring-2 ring-[#159E44]/30",
                  !isCompleted &&
                    !isActive &&
                    "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  step
                )}
              </div>
              {labels && labels[i] && (
                <span
                  className={cn(
                    "text-[10px] mt-1 text-center whitespace-nowrap",
                    isActive
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  {labels[i]}
                </span>
              )}
            </div>
            {step < totalSteps && (
              <div
                className={cn(
                  "w-8 h-[2px] mx-1",
                  isCompleted ? "bg-[#159E44]" : "bg-muted"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
