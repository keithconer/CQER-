"use client";

import * as React from "react";
import { Check, ChevronDown, ListFilter } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild disabled={disabled}>
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
            <ListFilter className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
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
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                open && "rotate-180"
              )}
            />
          </span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={6}
        collisionPadding={16}
        className="z-[200] w-[var(--radix-dropdown-menu-trigger-width)] min-w-[18rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-border/60 p-0 shadow-xl"
        onCloseAutoFocus={(e) => e.preventDefault()}
        style={{ overflow: "visible" }}
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-10 rounded-t-2xl border-b border-border/50 bg-popover px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <ListFilter className="h-3 w-3" />
              {label}
            </p>
            <Badge variant="outline" className="rounded-full text-[10px]">
              {values.length} selected
            </Badge>
          </div>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Click items to toggle. List stays open.
          </p>
        </div>

        {/* Scrollable options — plain div so scroll actually works */}
        <div className="max-h-64 overflow-y-auto rounded-b-2xl p-2">
          <div className="space-y-1">
            {options.map((option) => {
              const checked = values.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleValue(option);
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border px-3 py-2 text-left text-[11px] transition-colors",
                    checked
                      ? "border-primary/40 bg-primary/5 text-foreground"
                      : "border-border/50 bg-background/50 text-foreground hover:bg-muted/40"
                  )}
                >
                  <Checkbox
                    checked={checked}
                    className="pointer-events-none mt-0.5 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="flex min-w-0 flex-1 items-start justify-between gap-3">
                    <span className="leading-snug">{option}</span>
                    {checked ? (
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
