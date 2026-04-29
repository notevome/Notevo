"use client";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DesktopIcon, MoonIcon, SunIcon } from "@radix-ui/react-icons";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <ToggleGroup
      type="single"
      size="sm"
      onValueChange={(value) => {
        if (value) {
          setTheme(value);
        }
      }}
      value={theme}
      className="w-full border border-border bg-muted rounded-md px-[3px] h-[31px] justify-center items-center flex-1 gap-1"
      variant="SidebarMenuButton"
    >
      <ToggleGroupItem
        value="light"
        aria-label="Light"
        className="flex-1 px-1 h-6 rounded-md"
      >
        <SunIcon className="h-3 w-3 text-muted-foreground" />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="dark"
        aria-label="Dark"
        className="flex-1 px-1 h-6 rounded-md"
      >
        <MoonIcon className="h-3 w-3 text-muted-foreground " />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="system"
        aria-label="System"
        className="flex-1 px-1 h-6 rounded-md"
      >
        <DesktopIcon className="h-3 w-3 text-muted-foreground " />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
