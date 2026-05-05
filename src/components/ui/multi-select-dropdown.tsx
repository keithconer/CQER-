"use client";

import * as React from "react";
import { CheckSquare2, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type MultiSelectDropdownProps = {
  options: string[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  disabled?: boolean;
  className?: string;
  label?: string;
};

export function MultiSelectDropdown({
  options,
  values,
  onChange,
  placeholder,
  disabled,
  className,
  label = "Select one or more",
}: MultiSelectDropdownProps) {
  const [open, setOpen] = React.useState(false);

  const toggleValue = (value: string) => {
    const nextValues = values.includes(value)
      ? values.filter((entry) => entry !== value)
      : [...values, value];
    onChange(nextValues);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-10 w-full justify-between rounded-xl border-border/60 bg-background/70 px-3 text-left text-xs font-normal",
            className
          )}
          disabled={disabled}
          >
          <span className="flex min-w-0 items-center gap-2">
            <CheckSquare2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">
              {values.length > 0 ? values.join(", ") : placeholder}
            </span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] min-w-72 rounded-2xl p-0"
      >
        <div className="border-b border-border/50 px-3 py-2.5">
          <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
        </div>
        <ScrollArea className="max-h-72">
          <div className="space-y-2 p-3">
            {options.map((option) => {
              const checked = values.includes(option);
              return (
                <label
                  key={option}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 text-[11px] transition-colors",
                    checked
                      ? "border-primary/40 bg-primary/5"
                      : "border-border/50 bg-background/50"
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleValue(option)}
                    className="mt-0.5"
                  />
                  <span className="leading-snug">{option}</span>
                </label>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
