"use client";
import { ThemeProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";

// Filter out the React 19 false-positive warning for next-themes' inline script
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Encountered a script tag while rendering React component")
    ) {
      return;
    }
    originalError.apply(console, args);
  };
}

export function Providers({ children, ...props }: ThemeProviderProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="notevo-theme"
      {...props}
    >
      {children}
    </ThemeProvider>
  );
}
