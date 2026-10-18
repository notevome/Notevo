"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export const SETTINGS_MOVE_HINT_COOKIE = "settings:move-hint-seen";
export const SETTINGS_MOVE_HINT_STORAGE = "notevo_settings_move_hint_seen";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export function useSettingsMoveHint() {
  const [hasSeenHint, setHasSeenHint] = React.useState<boolean>(true);

  React.useEffect(() => {
    if (typeof document !== "undefined") {
      const isCookieDismissed = document.cookie
        .split("; ")
        .some((row) => row.startsWith(`${SETTINGS_MOVE_HINT_COOKIE}=true`));
      const isStorageDismissed =
        window.localStorage.getItem(SETTINGS_MOVE_HINT_STORAGE) === "true";
      setHasSeenHint(isCookieDismissed || isStorageDismissed);
    }
  }, []);

  const dismissHint = React.useCallback(() => {
    setHasSeenHint(true);
    if (typeof document !== "undefined") {
      document.cookie = `${SETTINGS_MOVE_HINT_COOKIE}=true; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SETTINGS_MOVE_HINT_STORAGE, "true");
    }
  }, []);

  return { hasSeenHint, dismissHint };
}

interface SettingsMoveHintProps {
  hasSeenHint: boolean;
  dismissHint: () => void;
  className?: string;
  arrowClassName?: string;
}

export function SettingsMoveHint({
  hasSeenHint,
  dismissHint,
  className = "",
  arrowClassName = "",
}: SettingsMoveHintProps) {
  if (hasSeenHint) return null;

  return (
    <AnimatePresence>
      {!hasSeenHint && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{
            opacity: 1,
            y: [0, -6, 0],
          }}
          exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
          transition={{
            opacity: { duration: 0.3 },
            y: {
              repeat: Infinity,
              duration: 2.2,
              ease: "easeInOut",
            },
          }}
          className={`absolute right-0 top-9 z-50 select-none hidden md:flex flex-col items-end pointer-events-auto ${className}`}
        >
          <svg
            width="45"
            height="32"
            viewBox="0 0 45 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`text-muted-foreground overflow-visible mr-3 mb-0.5 ${arrowClassName}`}
            aria-hidden="true"
          >
            <path
              d="M 12 30 C 12 16, 26 12, 34 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="4 3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M 26 7 L 34 5 L 35 13"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="group flex items-center gap-2 border border-border bg-card p-1.5 text-foreground transition-all shadow-md">
            <span className="text-sm font-semibold tracking-tight whitespace-nowrap">
              Move to another folder or table in settings
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                dismissHint();
              }}
              aria-label="Dismiss hint"
              className="text-muted-foreground hover:text-foreground transition-colors p-0.5 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
