"use client";

import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import type { EditorInstance } from "novel";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useQuery } from "@/cache/useQuery";
import { api } from "@/convex/_generated/api";
import {
  ItemHoverCardContent,
  HoverCardSkeleton,
  type ResolvedHoverItem,
} from "@/components/item-hover-card-content";
import { cacheItem, getCachedItem } from "@/components/mention/mention-cache";

type LinkHoverCardProps = {
  editor: EditorInstance | null;
  disabled?: boolean;
};

type HoveredLinkState = {
  href: string;
  itemId?: string;
  kind?: "note" | "whiteboard" | "pdf" | "link";
  rect: { top: number; left: number; width: number; height: number };
  pinned: boolean;
};

const HOVER_INTENT_MS = 50;

const LINK_SELECTOR = "a[href], [data-item-id]";

function findLinkElement(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  const el = target.closest(LINK_SELECTOR);
  return el instanceof HTMLElement ? el : null;
}

function getElementHref(el: HTMLElement): string {
  if (el instanceof HTMLAnchorElement) {
    return el.href || el.getAttribute("href") || "";
  }
  return el.getAttribute("href") || el.getAttribute("data-href") || "";
}

function HoverCardDataResolver({
  hoveredLink,
  onUnlink,
  canUnlink,
}: {
  hoveredLink: HoveredLinkState;
  onUnlink: () => void;
  canUnlink: boolean;
}) {
  const cached =
    getCachedItem(hoveredLink.itemId) || getCachedItem(hoveredLink.href);

  const shouldQuery = hoveredLink.pinned || !cached;

  const queryResult = useQuery(
    api.notes.resolveHoverItem,
    shouldQuery && (hoveredLink.itemId || hoveredLink.href)
      ? {
          itemId: hoveredLink.itemId,
          kind: hoveredLink.kind,
          url: hoveredLink.href,
        }
      : "skip",
  );

  useEffect(() => {
    if (queryResult) {
      cacheItem(queryResult as ResolvedHoverItem);
    }
  }, [queryResult]);

  const resolvedItem =
    (queryResult as ResolvedHoverItem | null) || cached || null;

  if (!resolvedItem && shouldQuery && queryResult === undefined) {
    return <HoverCardSkeleton kind={hoveredLink.kind} />;
  }

  return (
    <ItemHoverCardContent
      item={resolvedItem}
      fallbackUrl={hoveredLink.href}
      onUnlink={onUnlink}
      canUnlink={canUnlink}
    />
  );
}

export function LinkHoverCard({
  editor,
  disabled = false,
}: LinkHoverCardProps) {
  const router = useRouter();
  const [hoveredLink, setHoveredLink] = useState<HoveredLinkState | null>(null);
  const [mounted, setMounted] = useState(false);

  const hoveredAnchorRef = useRef<HTMLElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const isPinnedRef = useRef(false);
  const intentTimerRef = useRef<number | null>(null);

  const clearIntentTimer = useCallback(() => {
    if (intentTimerRef.current !== null) {
      window.clearTimeout(intentTimerRef.current);
      intentTimerRef.current = null;
    }
  }, []);

  const hideCard = useCallback(() => {
    clearIntentTimer();
    isPinnedRef.current = false;
    hoveredAnchorRef.current = null;
    setHoveredLink(null);
  }, [clearIntentTimer]);

  const showCard = useCallback(
    (anchor: HTMLElement, pinned: boolean) => {
      const box = anchor.getBoundingClientRect();
      const href = getElementHref(anchor);

      if (pinned && href) {
        try {
          const parsed = new URL(href, window.location.origin);
          if (parsed.origin === window.location.origin) {
            router.prefetch(parsed.pathname + parsed.search);
          }
        } catch {
          // ignore
        }
      }

      setHoveredLink({
        href,
        itemId: anchor.getAttribute("data-item-id") || undefined,
        kind: (anchor.getAttribute("data-item-kind") as any) || undefined,
        rect: {
          top: box.top,
          left: box.left,
          width: box.width,
          height: box.height,
        },
        pinned,
      });
    },
    [router],
  );

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!editor || disabled) {
      hideCard();
      return;
    }

    const editorElement = editor.view.dom;

    const handleMouseOver = (event: MouseEvent) => {
      if (isPinnedRef.current) return;

      const anchor = findLinkElement(event.target);
      if (!anchor || !editorElement.contains(anchor)) return;
      if (hoveredAnchorRef.current === anchor) return;

      clearIntentTimer();
      hoveredAnchorRef.current = anchor;
      intentTimerRef.current = window.setTimeout(() => {
        intentTimerRef.current = null;
        if (hoveredAnchorRef.current === anchor && !isPinnedRef.current) {
          showCard(anchor, false);
        }
      }, HOVER_INTENT_MS);
    };

    const handleMouseOut = (event: MouseEvent) => {
      if (isPinnedRef.current) return;

      const anchor = findLinkElement(event.target);
      if (!anchor || !editorElement.contains(anchor)) return;

      const related = event.relatedTarget;
      if (related instanceof Node && anchor.contains(related)) return;

      hideCard();
    };

    // Click: pin the card immediately so it becomes interactive.
    const handleClick = (event: MouseEvent) => {
      const anchor = findLinkElement(event.target);
      if (!anchor || !editorElement.contains(anchor)) return;

      if (event.ctrlKey || event.metaKey) {
        const href = getElementHref(anchor);
        if (href) {
          window.open(href, "_blank", "noopener,noreferrer");
          return;
        }
      }

      clearIntentTimer();
      isPinnedRef.current = true;
      hoveredAnchorRef.current = anchor;
      showCard(anchor, true);
    };

    const handleDocumentMouseDown = (event: MouseEvent) => {
      if (!isPinnedRef.current) return;

      const target = event.target;
      if (!(target instanceof Node)) return;

      if (popoverRef.current?.contains(target)) return;
      if (hoveredAnchorRef.current?.contains(target)) return;

      hideCard();
    };

    const handleResize = () => {
      if (!hoveredAnchorRef.current || !isPinnedRef.current) return;
      showCard(hoveredAnchorRef.current, true);
    };

    const handleScroll = () => {
      if (!hoveredAnchorRef.current && intentTimerRef.current === null) return;
      hideCard();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        hideCard();
      }
    };

    editorElement.addEventListener("mouseover", handleMouseOver);
    editorElement.addEventListener("mouseout", handleMouseOut);
    editorElement.addEventListener("click", handleClick);
    document.addEventListener("mousedown", handleDocumentMouseDown, true);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    window.addEventListener("keydown", handleEscape);

    return () => {
      editorElement.removeEventListener("mouseover", handleMouseOver);
      editorElement.removeEventListener("mouseout", handleMouseOut);
      editorElement.removeEventListener("click", handleClick);
      document.removeEventListener("mousedown", handleDocumentMouseDown, true);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleEscape);
      clearIntentTimer();
    };
  }, [clearIntentTimer, disabled, editor, hideCard, showCard]);

  if (!mounted || !hoveredLink || disabled) {
    return null;
  }

  const handleUnlink = () => {
    if (!editor || !hoveredAnchorRef.current) return;

    const pos = editor.view.posAtDOM(hoveredAnchorRef.current, 0);

    editor
      .chain()
      .setTextSelection(pos)
      .extendMarkRange("link")
      .unsetLink()
      .run();

    hideCard();
  };

  return (
    <Popover open modal={false}>
      {createPortal(
        <PopoverAnchor asChild>
          <div
            aria-hidden="true"
            className="fixed pointer-events-none"
            style={{
              top: hoveredLink.rect.top,
              left: hoveredLink.rect.left,
              width: hoveredLink.rect.width,
              height: hoveredLink.rect.height,
            }}
          />
        </PopoverAnchor>,
        document.body,
      )}
      <PopoverContent
        ref={popoverRef}
        align="start"
        side="bottom"
        sideOffset={8}
        collisionPadding={12}
        className={`z-[60000] w-auto max-w-[420px] p-0 border-0 bg-transparent shadow-none ${
          hoveredLink.pinned ? "" : "pointer-events-none"
        }`}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <HoverCardDataResolver
          hoveredLink={hoveredLink}
          onUnlink={handleUnlink}
          canUnlink={editor?.isEditable ?? true}
        />
      </PopoverContent>
    </Popover>
  );
}
