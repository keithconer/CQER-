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
    <div className="mb-1 w-full overflow-x-auto pb-1">
      <div className="mx-auto flex min-w-max items-start justify-center gap-1 px-1.5 sm:gap-1.5">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1;
        const isCompleted = step < currentStep;
        const isActive = step === currentStep;

        return (
          <div key={step} className="flex items-center">
            <div className="flex min-w-[72px] flex-col items-center sm:min-w-[92px]">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-medium transition-all duration-200 sm:h-8 sm:w-8 sm:text-xs",
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
                  <Check className="h-3 w-3" />
                ) : (
                  step
                )}
              </div>
              {labels && labels[i] && (
                <span
                  className={cn(
                    "mt-1.5 text-center text-[10px] leading-3.5 whitespace-normal",
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
                  "mx-1 mt-3.5 h-[2px] w-6 sm:mx-1.5 sm:w-8",
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
