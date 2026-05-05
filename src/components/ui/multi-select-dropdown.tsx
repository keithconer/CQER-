"use client";

import { CheckSquare2, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
  const toggleValue = (value: string) => {
    const nextValues = values.includes(value)
      ? values.filter((entry) => entry !== value)
      : [...values, value];
    onChange(nextValues);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
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
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-72">
        <DropdownMenuLabel className="text-[10px]">{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option}
            checked={values.includes(option)}
            onCheckedChange={() => toggleValue(option)}
            className="items-start py-2 text-[11px]"
          >
            <span className="leading-snug">{option}</span>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
