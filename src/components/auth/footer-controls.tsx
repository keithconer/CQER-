"use client";

import * as React from "react";
import { Info, Mail, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

export function FooterControls() {
  const [isDark, setIsDark] = React.useState(false);
  const [isThemeReady, setIsThemeReady] = React.useState(false);

  React.useEffect(() => {
    const root = document.documentElement;
    const savedTheme = window.localStorage.getItem("theme");
    const preferDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const useDark = savedTheme ? savedTheme === "dark" : preferDark;
    root.classList.toggle("dark", useDark);
    setIsDark(useDark);
    setIsThemeReady(true);
  }, []);

  const handleThemeToggle = () => {
    const nextIsDark = !isDark;
    const root = document.documentElement;
    root.classList.toggle("dark", nextIsDark);
    window.localStorage.setItem("theme", nextIsDark ? "dark" : "light");
    setIsDark(nextIsDark);
  };

  return (
    <div className="absolute -top-20 right-0 z-20 flex flex-col items-end gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
        className="h-9 w-9 rounded-full border-border/70 bg-background/90 backdrop-blur-sm cursor-pointer"
        onClick={handleThemeToggle}
        disabled={!isThemeReady}
      >
        {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
      </Button>

      <div className="group relative">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Documentation information"
          className="h-9 w-9 rounded-full border-border/70 bg-background/90 backdrop-blur-sm cursor-pointer"
        >
          <Info className="h-3.5 w-3.5" />
        </Button>
        <div className="pointer-events-none absolute right-0 top-11 w-72 rounded-lg border border-border/70 bg-background/95 p-3 text-[10px] text-foreground shadow-lg opacity-0 transition-opacity group-hover:opacity-100">
          <p className="font-semibold">For documentation and repository</p>
          <p className="mt-2 flex items-center gap-1 text-muted-foreground">
            <Mail className="h-3 w-3 shrink-0" />
            main.keithbrian.coner@cvsu.edu.ph
          </p>
          <p className="mt-1 text-muted-foreground">dit.ojt@cvsu.edu.ph</p>
        </div>
      </div>
    </div>
  );
}

