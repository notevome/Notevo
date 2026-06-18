"use client";
import { Toggle } from "@/components/ui/toggle";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const isDarkMode = resolvedTheme === "dark";
  const nextTheme = isDarkMode ? "light" : "dark";

  return (
    <Toggle
      pressed={isDarkMode}
      onPressedChange={() => setTheme(nextTheme)}
      aria-label="Switch Themes"
      className="group flex h-8 w-full min-w-0 items-center justify-between gap-2 px-2 text-sm font-normal text-foreground hover:bg-border data-[state=on]:border-transparent data-[state=on]:bg-transparent data-[state=on]:text-foreground"
    >
      <span className="flex min-w-0 items-center">
        <Moon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate capitalize text-foreground">Dark mode</span>
      </span>
      <span
        className="relative h-5 w-9 shrink-0 rounded-full bg-border/70 transition-colors group-data-[state=on]:bg-primary"
        aria-hidden
      >
        <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-background shadow-sm transition-transform group-data-[state=on]:translate-x-4" />
      </span>
    </Toggle>
  );
}
