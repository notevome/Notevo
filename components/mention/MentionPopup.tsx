"use client";

import {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
  Fragment,
} from "react";
import { createPortal } from "react-dom";
import {
  FileText,
  File,
  PanelTop,
  Globe,
  Search,
  Check,
  ArrowDownUp,
  CornerDownLeft,
} from "lucide-react";
import type { EditorInstance } from "novel";
import { useQuery } from "@/cache/useQuery";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  mentionRegistry,
  dismissMention,
  type MentionPluginState,
} from "./mention-extension";
import { cacheItem } from "./mention-cache";
import { LinkFaviconBadge } from "@/components/WorkspacePreviewComponents";
import { cn } from "@/lib/utils";

const SKELETON_ROWS = [
  { title: "w-2/3", subtitle: "w-1/2" },
  { title: "w-3/4", subtitle: "w-2/5" },
  { title: "w-1/2", subtitle: "w-3/5" },
];

function MentionSkeleton() {
  return (
    <div role="status" aria-label="Loading items" aria-busy="true">
      {SKELETON_ROWS.map((row, i) => (
        <div
          key={i}
          className="flex items-center gap-2.5 px-2.5 py-2 animate-pulse"
        >
          <div className="h-6 w-6 shrink-0 flex items-center justify-center">
            <div className="h-4 w-4 app-radius-sm bg-muted" />
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className={cn("h-3 app-radius-sm bg-muted", row.title)} />
            <div
              className={cn("h-2.5 app-radius-sm bg-muted/70", row.subtitle)}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function HighlightText({ text, query }: { text: string; query?: string }) {
  const trimmedQuery = query?.trim();
  if (!trimmedQuery) return <>{text}</>;

  const escaped = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === trimmedQuery.toLowerCase() ? (
          <mark
            key={i}
            className="text-secondary bg-secondary-foreground app-radius-sm px-0.5"
          >
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

interface MentionPopupProps {
  editor: EditorInstance | null;
  workingSpaceId?: Id<"workingSpaces">;
}

type FilterCategory = "all" | "note" | "whiteboard" | "pdf" | "link";

export function MentionPopup({ editor, workingSpaceId }: MentionPopupProps) {
  const [pluginState, setPluginState] = useState<MentionPluginState | null>(
    null,
  );
  const [category, setCategory] = useState<FilterCategory>("all");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const query = pluginState?.query ?? "";

  const items = useQuery(
    api.notes.getMentionItems,
    pluginState?.isOpen
      ? {
          query: query || undefined,
          workingSpaceId: workingSpaceId,
        }
      : "skip",
  );

  const filteredItems = useMemo(() => {
    if (!items) return [];
    if (category === "all") return items;
    return items.filter((item: any) => item.kind === category);
  }, [items, category]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems.length, category]);

  useEffect(() => {
    if (!listRef.current) return;
    const selectedEl = listRef.current.querySelector<HTMLElement>(
      `[data-index="${selectedIndex}"]`,
    );
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const selectItem = useCallback(
    (item: any) => {
      if (!editor || !pluginState) return;

      cacheItem(item);

      const title = item.title || "Untitled";
      const href = item.href;

      editor
        .chain()
        .focus()
        .deleteRange(pluginState.range)
        .insertContent([
          {
            type: "text",
            text: `@${title}`,
            marks: [
              {
                type: "link",
                attrs: {
                  href: href,
                  "data-item-id": item._id,
                  "data-item-kind": item.kind,
                  "data-item-title": title,
                },
              },
            ],
          },
          {
            type: "text",
            text: " ",
          },
        ])
        .run();

      mentionRegistry.notify(null);
    },
    [editor, pluginState],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): boolean => {
      if (!pluginState?.isOpen) return false;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((prev) =>
          filteredItems.length > 0 ? (prev + 1) % filteredItems.length : 0,
        );
        return true;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((prev) =>
          filteredItems.length > 0
            ? (prev - 1 + filteredItems.length) % filteredItems.length
            : 0,
        );
        return true;
      }

      if (event.key === "Enter" || event.key === "Tab") {
        if (filteredItems[selectedIndex]) {
          event.preventDefault();
          selectItem(filteredItems[selectedIndex]);
          return true;
        }
      }

      return false;
    };

    mentionRegistry.setKeyHandler(handleKeyDown);
    return () => {
      mentionRegistry.setKeyHandler(null);
    };
  }, [filteredItems, selectedIndex, pluginState?.isOpen, selectItem]);

  useEffect(() => {
    mentionRegistry.setListener((state) => {
      setPluginState(state);
      if (state) {
        setCategory("all");
      }
    });

    return () => {
      mentionRegistry.setListener(null);
    };
  }, []);

  const isOpen = Boolean(pluginState?.isOpen);
  useEffect(() => {
    if (!isOpen || !editor) return;

    let lastKeyTime = 0;

    const close = () => {
      dismissMention(editor.view);
      mentionRegistry.notify(null);
    };

    const handleKeyDown = () => {
      lastKeyTime = Date.now();
    };

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Node && popupRef.current?.contains(target)) return;
      close();
    };

    const handleScroll = (event: Event) => {
      const target = event.target;
      if (target instanceof Node && popupRef.current?.contains(target)) return;
      if (Date.now() - lastKeyTime < 250) return;
      close();
    };

    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("mousedown", handleMouseDown, true);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("mousedown", handleMouseDown, true);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen, editor]);

  if (!pluginState?.isOpen || !pluginState.clientRect) {
    return null;
  }

  const rect = pluginState.clientRect();
  if (!rect) return null;

  const top = Math.min(rect.bottom + 6, window.innerHeight - 340);
  const left = Math.min(Math.max(rect.left, 16), window.innerWidth - 380);

  return createPortal(
    <div
      ref={popupRef}
      style={{
        position: "fixed",
        top,
        left,
        zIndex: 700000,
      }}
      className="w-[360px] max-w-[92vw] overflow-hidden app-radius-xl border border-border bg-popover text-popover-foreground shadow-2xl animate-in fade-in-0 zoom-in-95 duration-100"
      onMouseDown={(e) => e.preventDefault()} // Prevent editor blur
    >
      <div className="p-2 border-b border-border bg-muted/30 space-y-1.5">
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar text-[11px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {(
            [
              { key: "all", label: "All" },
              { key: "note", label: "Notes" },
              { key: "whiteboard", label: "Whiteboards" },
              { key: "pdf", label: "PDFs" },
              { key: "link", label: "Links" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setCategory(tab.key)}
              className={cn(
                "px-2 py-0.5 font-medium transition-colors shrink-0",
                category === tab.key
                  ? "bg-muted text-foreground border border-border"
                  : "bg-transparent border border-dashed border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={listRef}
        className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 scrollbar-gutter-stable [&::-webkit-scrollbar]:w-[0.35rem] [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-button]:hidden"
      >
        {items === undefined ? (
          <MentionSkeleton />
        ) : filteredItems.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
            {query ? `No items found matching "${query}"` : "No items found"}
          </div>
        ) : (
          filteredItems.map((item: any, idx: number) => {
            const isSelected = idx === selectedIndex;
            return (
              <div
                key={item._id}
                data-index={idx}
                onClick={() => selectItem(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 app-radius-lg cursor-pointer transition-colors text-left",
                  isSelected
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted/70 text-foreground",
                )}
              >
                <div className="shrink-0">
                  {item.kind === "note" && (
                    <div className="h-6 w-6 text-muted-foreground flex items-center justify-center">
                      <FileText className="h-3.5 w-3.5" />
                    </div>
                  )}
                  {item.kind === "whiteboard" && (
                    <div className="h-6 w-6 text-muted-foreground flex items-center justify-center">
                      <PanelTop className="h-3.5 w-3.5" />
                    </div>
                  )}
                  {item.kind === "pdf" && (
                    <div className="h-6 w-6 text-muted-foreground flex items-center justify-center">
                      <File className="h-3.5 w-3.5" />
                    </div>
                  )}
                  {item.kind === "link" && (
                    <div className="h-6 w-6 text-muted-foreground flex items-center justify-center">
                      <LinkFaviconBadge url={item.url} className="h-4 w-4" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate text-foreground">
                    <HighlightText text={item.title} query={query} />
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    <HighlightText
                      text={
                        item.subtitle ||
                        (item.kind === "link"
                          ? item.url
                          : item.tableName || "Workspace")
                      }
                      query={query}
                    />
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-2 border-t border-border bg-muted/40 text-[11px] text-muted-foreground flex items-center justify-between px-3">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <kbd className="pointer-events-none border border-border inline-flex h-5 select-none items-center gap-1 app-radius-md bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <ArrowDownUp size={11} />
            </kbd>
            <span className="text-foreground text-[11px]">Navigate</span>
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="pointer-events-none border border-border inline-flex h-5 select-none items-center gap-1 app-radius-md bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <CornerDownLeft size={11} />
            </kbd>
            <span className="text-foreground text-[11px]">Select</span>
          </span>
        </div>
        <span className="flex items-center gap-1.5">
          <kbd className="pointer-events-none border border-border inline-flex h-5 select-none items-center gap-1 app-radius-md bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
          <span className="text-foreground text-[11px]">Close</span>
        </span>
      </div>
    </div>,
    document.body,
  );
}
