"use client";

import { api } from "@/convex/_generated/api";
import type { Preloaded } from "convex/react";
import { createContext, useContext, type ReactNode } from "react";

export type HomeDataContextValue = {
  preloadedViewer: Preloaded<typeof api.users.viewer>;
  preloadedRecentWorkspaces: Preloaded<
    typeof api.workingSpaces.getRecentWorkingSpaces
  >;
};

const HomeDataContext = createContext<HomeDataContextValue | null>(null);

export function HomeDataProvider({
  value,
  children,
}: {
  value: HomeDataContextValue;
  children: ReactNode;
}) {
  return (
    <HomeDataContext.Provider value={value}>
      {children}
    </HomeDataContext.Provider>
  );
}

export function useHomeData() {
  const ctx = useContext(HomeDataContext);
  if (!ctx) {
    throw new Error("useHomeData must be used within <HomeDataProvider />");
  }
  return ctx;
}

