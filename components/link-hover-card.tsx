"use client";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import type { EditorInstance } from "novel";
import { Check, Copy, Globe } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

type LinkHoverCardProps = {
  editor: EditorInstance | null;
  disabled?: boolean;
};

type HoveredLinkState = {
  href: string;
  top: number;
  left: number;
};

const HIDE_DELAY_MS = 120;
const COPY_FEEDBACK_MS = 1600;
const CARD_WIDTH_PX = 320;

export function LinkHoverCard({
  editor,
  disabled = false,
}: LinkHoverCardProps) {
  const [hoveredLink, setHoveredLink] = useState<HoveredLinkState | null>(null);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const hoveredAnchorRef = useRef<HTMLAnchorElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const copiedTimerRef = useRef<number | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const clearCopiedTimer = useCallback(() => {
    if (copiedTimerRef.current !== null) {
      window.clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = null;
    }
  }, []);

  const hideCard = useCallback(() => {
    clearHideTimer();
    hoveredAnchorRef.current = null;
    setCopied(false);
    setHoveredLink(null);
  }, [clearHideTimer]);

  const scheduleHide = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = window.setTimeout(() => {
      hoveredAnchorRef.current = null;
      setCopied(false);
      setHoveredLink(null);
    }, HIDE_DELAY_MS);
  }, [clearHideTimer]);

  const updateCardPosition = useCallback((anchor: HTMLAnchorElement) => {
    const rect = anchor.getBoundingClientRect();
    const maxLeft = Math.max(12, window.innerWidth - CARD_WIDTH_PX - 12);

    setHoveredLink({
      href: anchor.href,
      top: Math.min(rect.bottom + 10, window.innerHeight - 72),
      left: Math.min(Math.max(rect.left, 12), maxLeft),
    });
  }, []);

  const handleCopy = useCallback(async () => {
    if (!hoveredLink?.href) return;

    try {
      await navigator.clipboard.writeText(hoveredLink.href);
      setCopied(true);
      clearCopiedTimer();
      copiedTimerRef.current = window.setTimeout(() => {
        setCopied(false);
      }, COPY_FEEDBACK_MS);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy link");
    }
  }, [clearCopiedTimer, hoveredLink?.href]);

  useEffect(() => {
    setMounted(true);

    return () => {
      setMounted(false);
      clearHideTimer();
      clearCopiedTimer();
    };
  }, [clearCopiedTimer, clearHideTimer]);

  useEffect(() => {
    if (!editor || disabled) {
      hideCard();
      return;
    }

    const editorElement = editor.view.dom;

    const handleMouseOver = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const anchor = target.closest("a.novel-link");
      if (!(anchor instanceof HTMLAnchorElement)) return;

      clearHideTimer();
      hoveredAnchorRef.current = anchor;
      updateCardPosition(anchor);
    };

    const handleMouseOut = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const anchor = target.closest("a.novel-link");
      if (!(anchor instanceof HTMLAnchorElement)) return;

      const relatedTarget = event.relatedTarget;
      if (
        relatedTarget instanceof Node &&
        popoverRef.current?.contains(relatedTarget)
      ) {
        return;
      }

      scheduleHide();
    };

    const handleViewportChange = () => {
      if (!hoveredAnchorRef.current) return;
      updateCardPosition(hoveredAnchorRef.current);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        hideCard();
      }
    };

    editorElement.addEventListener("mouseover", handleMouseOver);
    editorElement.addEventListener("mouseout", handleMouseOut);
    window.addEventListener("scroll", handleViewportChange, true);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("keydown", handleEscape);

    return () => {
      editorElement.removeEventListener("mouseover", handleMouseOver);
      editorElement.removeEventListener("mouseout", handleMouseOut);
      window.removeEventListener("scroll", handleViewportChange, true);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("keydown", handleEscape);
      clearHideTimer();
    };
  }, [
    clearHideTimer,
    disabled,
    editor,
    hideCard,
    scheduleHide,
    updateCardPosition,
  ]);

  if (!mounted || !hoveredLink || disabled) {
    return null;
  }

  return (
    <Popover open modal={false}>
      {createPortal(
        <PopoverAnchor asChild>
          <div
            aria-hidden="true"
            className="fixed h-0 w-0 pointer-events-none"
            style={{
              top: hoveredLink.top,
              left: hoveredLink.left,
            }}
          />
        </PopoverAnchor>,
        document.body,
      )}
      <PopoverContent
        ref={popoverRef}
        align="start"
        side="bottom"
        sideOffset={0}
        className="z-[10002] flex w-[320px] items-center rounded-tl-xl border-border bg-muted p-0.5 text-popover-foreground"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onMouseEnter={clearHideTimer}
        onMouseLeave={scheduleHide}
      >
        <a
          href={hoveredLink.href}
          target="_blank"
          rel="noreferrer noopener"
          className="flex min-w-0 flex-1 items-center gap-1.5 rounded-tl-lg pl-1 py-0 text-xs text-muted-foreground transition-colors hover:text-foreground"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <Globe className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{hoveredLink.href}</span>
        </a>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 px-2 text-xs"
          onMouseDown={(event) => event.preventDefault()}
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
