"use client";

import * as React from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { searchProjectLeaders, type ProjectLeaderOption } from "@/lib/actions/project-leaders";

interface ProjectLeaderInputProps {
  value: string;
  onValueChange: (value: string) => void;
  selectedId: string | null;
  onSelectedIdChange: (id: string | null) => void;
  disabled?: boolean;
  department?: string | null;
  unit?: string | null;
  placeholder?: string;
}

export function ProjectLeaderInput({
  value,
  onValueChange,
  selectedId,
  onSelectedIdChange,
  disabled,
  department,
  unit,
  placeholder = "Type a name...",
}: ProjectLeaderInputProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState(value);
  const [options, setOptions] = React.useState<ProjectLeaderOption[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    setQuery(value);
  }, [value]);

  React.useEffect(() => {
    if (!open || disabled) return;
    const trimmed = query.trim();
    if (!trimmed) {
      setOptions([]);
      return;
    }

    const handle = setTimeout(async () => {
      setLoading(true);
      const result = await searchProjectLeaders({
        query: trimmed,
        department,
        unit,
      });
      if (!("error" in result)) {
        setOptions(result.data || []);
      } else {
        setOptions([]);
      }
      setLoading(false);
    }, 250);

    return () => clearTimeout(handle);
  }, [department, disabled, open, query, unit]);

  const handleValueChange = (nextValue: string) => {
    onValueChange(nextValue);
    onSelectedIdChange(null);
    setQuery(nextValue);
    if (!disabled) setOpen(true);
  };

  const handleSelect = (option: ProjectLeaderOption) => {
    onValueChange(option.name);
    onSelectedIdChange(option.id);
    setQuery(option.name);
    setOpen(false);
  };

  const formatMeta = (option: ProjectLeaderOption) => {
    const pieces = [option.unit, option.department].filter(Boolean);
    return pieces.length > 0 ? pieces.join(" • ") : "No unit";
  };

  return (
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Input
            value={value}
            onChange={(e) => handleValueChange(e.target.value)}
            onFocus={() => !disabled && setOpen(true)}
            placeholder={placeholder}
            className="h-8 text-[10px] placeholder:text-[10px]"
            disabled={disabled}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[--radix-popover-trigger-width] p-0"
      >
        <Command shouldFilter={false}>
          <CommandList>
            {loading ? (
              <div className="flex items-center gap-2 px-3 py-2 text-[10px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading project leaders...
              </div>
            ) : options.length === 0 ? (
              <CommandEmpty className="text-[10px]">
                No project leaders found.
              </CommandEmpty>
            ) : (
              <CommandGroup heading="Project Leaders">
                {options.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={option.id}
                    onSelect={() => handleSelect(option)}
                    className="flex items-center justify-between text-[10px]"
                  >
                    <div className="flex flex-col">
                      <span className="text-[10px] font-medium">{option.name}</span>
                      <span className="text-[9px] text-muted-foreground">
                        {formatMeta(option)}
                      </span>
                    </div>
                    <Check
                      className={cn(
                        "h-3 w-3 text-[#159E44]",
                        selectedId === option.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
