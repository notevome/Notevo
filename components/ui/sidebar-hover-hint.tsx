"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export const SIDEBAR_HOVER_HINT_COOKIE = "sidebar:hover-hint-seen";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

interface SidebarHoverHintProps {
  revealSidebar: () => void;
  openSidebarFromEdge: () => void;
}

export function SidebarHoverHint({
  revealSidebar,
  openSidebarFromEdge,
}: SidebarHoverHintProps) {
  const [hasSeenHint, setHasSeenHint] = React.useState<boolean>(true);

  React.useEffect(() => {
    if (typeof document !== "undefined") {
      const isDismissed = document.cookie
        .split("; ")
        .some((row) => row.startsWith(`${SIDEBAR_HOVER_HINT_COOKIE}=true`));
      setHasSeenHint(isDismissed);
    }
  }, []);

  const dismissHint = React.useCallback(() => {
    setHasSeenHint(true);
    if (typeof document !== "undefined") {
      document.cookie = `${SIDEBAR_HOVER_HINT_COOKIE}=true; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
    }
  }, []);

  const handleTriggerHover = React.useCallback(() => {
    if (!hasSeenHint) {
      dismissHint();
    }
    revealSidebar();
  }, [hasSeenHint, dismissHint, revealSidebar]);

  const handleTriggerClick = React.useCallback(() => {
    if (!hasSeenHint) {
      dismissHint();
    }
    openSidebarFromEdge();
  }, [hasSeenHint, dismissHint, openSidebarFromEdge]);

  if (hasSeenHint) {
    return (
      <button
        type="button"
        aria-label="Open sidebar"
        className="fixed left-0 top-12 h-[calc(100svh-6rem)] z-30 hidden w-3 cursor-default bg-transparent transition-colors hover:bg-sidebar-border/50 focus-visible:bg-sidebar-border/50 focus-visible:outline-none md:block motion-reduce:transition-none"
        onMouseEnter={revealSidebar}
        onFocus={openSidebarFromEdge}
        onClick={openSidebarFromEdge}
      />
    );
  }

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed left-0 top-12 h-[calc(100svh-6rem)] w-3 z-30 pointer-events-none hidden md:flex items-center justify-center border-2 border-l-0 border-dashed border-muted-foreground bg-muted animate-pulse"
      />

      <button
        type="button"
        aria-label="Hover or click to open sidebar"
        className="fixed left-0 top-12 h-[calc(100svh-6rem)] z-30 hidden w-9 md:w-10 cursor-pointer bg-transparent transition-colors hover:bg-sidebar-border/30 focus-visible:bg-sidebar-border/50 focus-visible:outline-none md:block motion-reduce:transition-none"
        onMouseEnter={handleTriggerHover}
        onFocus={handleTriggerClick}
        onClick={handleTriggerClick}
      />

      <AnimatePresence>
        {!hasSeenHint && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{
              opacity: 1,
              x: [0, -8, 0],
            }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
            transition={{
              opacity: { duration: 0.3 },
              x: {
                repeat: Infinity,
                duration: 2.2,
                ease: "easeInOut",
              },
            }}
            className="fixed left-10 top-1/2 -translate-y-1/2 z-40 select-none hidden md:flex flex-col items-start pointer-events-auto"
          >
            <div className="group flex items-center gap-2 border border-border bg-card p-1.5 text-foreground transition-all">
              <span className="text-sm font-semibold tracking-tight whitespace-nowrap">
                hover to open the sidebar
              </span>
            </div>
            <svg
              width="90"
              height="55"
              viewBox="0 0 90 55"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-muted-foreground overflow-visible mt-0.5 ml-4"
              aria-hidden="true"
            >
              <path
                d="M 60 2 L 60 18 C 60 36, 45 44, 15 44"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="4 3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M 23 37 L 14 44 L 23 51"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
