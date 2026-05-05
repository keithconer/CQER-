"use client";

import * as React from "react";
import { Check, CheckSquare2, ChevronDown, ListFilter } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild disabled={disabled}>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "min-h-10 h-auto w-full justify-between rounded-xl border-border/60 bg-background/70 px-3 py-2 text-left text-xs font-normal",
            className
          )}
          disabled={disabled}
        >
          <span className="flex min-w-0 items-center gap-2">
            <CheckSquare2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate leading-snug">
              {values.length > 0 ? values.join(", ") : placeholder}
            </span>
          </span>
          <span className="ml-3 flex shrink-0 items-center gap-2">
            {values.length > 0 ? (
              <Badge variant="secondary" className="rounded-full px-2 py-0 text-[10px] font-medium">
                {values.length}
              </Badge>
            ) : null}
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        collisionPadding={16}
        className="z-[70] w-[min(var(--radix-popover-trigger-width),calc(100vw-2rem))] min-w-[18rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border/60 p-0 shadow-lg"
      >
        <div className="border-b border-border/50 bg-muted/20 px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <ListFilter className="h-3.5 w-3.5" />
                {label}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Keep selecting items. The list stays open until you close it.
              </p>
            </div>
            <Badge variant="outline" className="rounded-full text-[10px]">
              {values.length} selected
            </Badge>
          </div>
        </div>
        <ScrollArea className="max-h-[min(18rem,var(--radix-popover-content-available-height))]">
          <div className="space-y-2 p-3">
            {options.map((option) => {
              const checked = values.includes(option);
              return (
                <button
                  type="button"
                  key={option}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => toggleValue(option)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left text-[11px] transition-colors",
                    checked
                      ? "border-primary/40 bg-primary/5"
                      : "border-border/50 bg-background/50 hover:bg-muted/40"
                  )}
                >
                  <Checkbox
                    checked={checked}
                    className="pointer-events-none mt-0.5"
                    aria-hidden="true"
                  />
                  <span className="flex min-w-0 flex-1 items-start justify-between gap-3">
                    <span className="leading-snug">{option}</span>
                    {checked ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
