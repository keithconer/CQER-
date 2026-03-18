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

function extractTranscript(results: ArrayLike<SpeechRecognitionResultShape>) {
  return Array.from(results)
    .map((result) => result[0]?.transcript || "")
    .join(" ")
    .trim();
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
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    setListening(true);
    setOpen(true);
    setQuery("");

    recognition.onresult = (event) => {
      const transcript = extractTranscript(event.results);

      if (!transcript) return;

      setQuery(transcript);
      const lastResult = event.results[event.results.length - 1];
      const matchedItem = getBestMatch(items, transcript);
      if (lastResult?.isFinal && matchedItem) {
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
          className="flex h-8 w-[8.75rem] items-center gap-2 rounded-md border border-white/10 bg-[#111111] px-2.5 text-left text-white shadow-sm transition-colors hover:bg-[#181818] sm:w-[12rem] md:w-[15rem]"
        >
          <Search className="h-3.5 w-3.5 shrink-0 text-white/60" />
          <span className="truncate text-[10px] text-white/60">
            Search pages or speak...
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[20rem] border border-white/10 bg-[#111111] p-0 text-white shadow-2xl sm:w-[22rem]"
      >
        <div className="flex items-center gap-2 border-b border-white/10 px-2 py-2">
          <Search className="h-3.5 w-3.5 shrink-0 text-white/60" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleSubmitTopMatch();
              }
            }}
            placeholder={listening ? "Listening..." : "Search pages..."}
            className="h-7 border-0 bg-transparent px-0 text-[10px] text-white shadow-none placeholder:text-white/45 focus-visible:ring-0"
            autoFocus
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7 shrink-0 text-white/70 hover:bg-white/10 hover:text-white",
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
        <Command shouldFilter={false} className="bg-[#111111] text-white">
          <CommandList className="max-h-72">
            <CommandEmpty className="py-4 text-[10px] text-white/55">
              No matching pages found.
            </CommandEmpty>
            <CommandGroup heading="Pages" className="[&_[cmdk-group-heading]]:text-[9px] [&_[cmdk-group-heading]]:text-white/45">
              {filteredItems.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.label} ${(item.keywords || []).join(" ")}`}
                  onSelect={() => handleSelect(item)}
                  className="gap-2 px-2 py-2 text-white data-[selected=true]:bg-white/10 data-[selected=true]:text-white"
                >
                  <item.icon className="h-3.5 w-3.5 text-white/60" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-medium">{item.label}</p>
                    {item.description ? (
                      <p className="truncate text-[9px] text-white/50">
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
