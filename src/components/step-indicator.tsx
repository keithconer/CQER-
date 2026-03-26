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
    <div className="mb-2 w-full overflow-x-auto pb-2">
      <div className="mx-auto flex min-w-max items-start justify-center gap-1 px-2 sm:gap-2">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1;
        const isCompleted = step < currentStep;
        const isActive = step === currentStep;

        return (
          <div key={step} className="flex items-center">
            <div className="flex min-w-[88px] flex-col items-center sm:min-w-[112px]">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-all duration-200 sm:h-10 sm:w-10 sm:text-sm",
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
                    "mt-2 text-center text-[11px] leading-4 whitespace-normal sm:text-xs",
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
                  "mx-1 mt-4 h-[2px] w-8 sm:mx-2 sm:w-12",
                  isCompleted ? "bg-[#159E44]" : "bg-muted"
                )}
              />
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}
