"use client";

import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Loader2, Mic, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export interface NavbarSearchItem {
  id: string;
  label: string;
  href: string;
  keywords?: string[];
  description?: string;
  icon: LucideIcon;
}

type SpeechRecognitionResultShape = {
  readonly isFinal: boolean;
  0: {
    transcript: string;
  };
};

type SpeechRecognitionEventShape = Event & {
  readonly results: ArrayLike<SpeechRecognitionResultShape>;
};

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventShape) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function getBestMatch(items: NavbarSearchItem[], query: string) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return null;

  const terms = normalizedQuery.split(" ").filter(Boolean);
  const ranked = items
    .map((item) => {
      const haystack = normalizeText(
        [item.label, item.description || "", ...(item.keywords || [])].join(" ")
      );
      const allTermsMatch = terms.every((term) => haystack.includes(term));
      const score =
        (haystack.includes(normalizedQuery) ? 4 : 0) +
        terms.filter((term) => haystack.includes(term)).length +
        (normalizeText(item.label).startsWith(normalizedQuery) ? 2 : 0);

      return {
        item,
        allTermsMatch,
        score,
      };
    })
    .filter((entry) => entry.allTermsMatch || entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.label.localeCompare(b.item.label));

  return ranked[0]?.item || null;
}

export function NavbarPageSearch({
  items,
  onNavigate,
}: {
  items: NavbarSearchItem[];
  onNavigate: (href: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [listening, setListening] = useState(false);
  const voiceSupported = useMemo(
    () =>
      typeof window !== "undefined" &&
      Boolean(window.SpeechRecognition || window.webkitSpeechRecognition),
    []
  );

  const filteredItems = useMemo(() => {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) return items;

    const terms = normalizedQuery.split(" ").filter(Boolean);
    return items.filter((item) => {
      const haystack = normalizeText(
        [item.label, item.description || "", ...(item.keywords || [])].join(" ")
      );
      return terms.every((term) => haystack.includes(term));
    });
  }, [items, query]);

  const handleSelect = (item: NavbarSearchItem) => {
    setOpen(false);
    setQuery("");
    onNavigate(item.href);
  };

  const handleSubmitTopMatch = () => {
    const firstMatch = filteredItems[0];
    if (firstMatch) {
      handleSelect(firstMatch);
    }
  };

  const handleVoiceSearch = () => {
    const Recognition =
      typeof window !== "undefined"
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : undefined;

    if (!Recognition || listening) return;

    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setListening(true);
    setOpen(true);

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .trim();

      if (!transcript) return;

      setQuery(transcript);
      const matchedItem = getBestMatch(items, transcript);
      if (matchedItem) {
        handleSelect(matchedItem);
      }
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-8 w-[8.75rem] items-center gap-2 rounded-md border border-border/60 bg-background px-2.5 text-left shadow-sm transition-colors hover:bg-muted/20 sm:w-[12rem] md:w-[15rem]"
        >
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
          <span className="truncate text-[10px] text-muted-foreground">
            Search pages or speak...
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[20rem] p-0 sm:w-[22rem]">
        <div className="flex items-center gap-2 border-b px-2 py-2">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleSubmitTopMatch();
              }
            }}
            placeholder="Search pages..."
            className="h-7 border-0 bg-transparent px-0 text-[10px] shadow-none focus-visible:ring-0"
            autoFocus
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7 shrink-0",
              listening && "text-[#159E44]"
            )}
            onClick={handleVoiceSearch}
            disabled={listening || !voiceSupported}
            title={voiceSupported ? "Voice search" : "Voice search is not supported in this browser"}
          >
            {listening ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Mic className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
        <Command shouldFilter={false}>
          <CommandList className="max-h-72">
            <CommandEmpty className="py-4 text-[10px] text-muted-foreground">
              No matching pages found.
            </CommandEmpty>
            <CommandGroup heading="Pages" className="[&_[cmdk-group-heading]]:text-[9px]">
              {filteredItems.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.label} ${(item.keywords || []).join(" ")}`}
                  onSelect={() => handleSelect(item)}
                  className="gap-2 px-2 py-2"
                >
                  <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-medium">{item.label}</p>
                    {item.description ? (
                      <p className="truncate text-[9px] text-muted-foreground">
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
