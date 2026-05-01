"use client";
import React from "react";
import {
  ArrowDownUp,
  Undo2,
  Clock,
  FileText,
  Search,
  ChevronRight,
  Folder,
  FolderOpen,
} from "lucide-react";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { useQuery } from "@/cache/useQuery";
import LoadingAnimation from "@/components/ui/LoadingAnimation";
import { cn } from "@/lib/utils";

interface SearchDialogProps {
  variant?: "default" | "SidebarMenuButton";
  showTitle?: boolean;
  iconSize?: number;
  sidebaraOpen?: boolean;
  sidbarMobile?: boolean;
  showTrigger?: boolean;
  enableShortcut?: boolean;
}

const getRelativeTime = (date: Date) => {
  const now = new Date();
  const diffInDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffInDays === 0) return "Today";
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  return `${Math.floor(diffInDays / 30)} months ago`;
};

function SearchLoadingSkeleton() {
  return (
    <div className="space-y-1 p-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 py-2.5 px-3 app-radius-lg"
        >
          <div className="h-8 w-8 bg-border app-radius-lg shrink-0 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-border app-radius-md w-2/3 animate-pulse" />
            <div className="h-2.5 bg-border app-radius-md w-1/3 animate-pulse" />
          </div>
          <div className="h-2.5 bg-border app-radius-md w-16 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <span className="text-secondary bg-secondary-foreground font-extrabold">
        {text.slice(index, index + query.length)}
      </span>
      {text.slice(index + query.length)}
    </>
  );
}

function NoteItem({
  note,
  onClick,
  isSelected,
  query,
  onIntentPrefetch,
  indented = false,
}: any) {
  const href = `/home/${note.workingSpaceId}/${note.slug}?id=${note._id}`;
  return (
    <div
      onClick={onClick}
      onPointerEnter={() => onIntentPrefetch?.(href)}
      onMouseEnter={() => onIntentPrefetch?.(href)}
      onFocus={() => onIntentPrefetch?.(href)}
      onTouchStart={() => onIntentPrefetch?.(href)}
      className={cn(
        "flex items-center gap-3 mb-px py-1.5 px-2 cursor-pointer app-radius-lg transition-all",
        indented && "ml-7",
        isSelected ? "bg-border" : "hover:bg-border",
      )}
    >
      <div className="border-border bg-muted text-muted-foreground flex h-7 w-7 shrink-0 items-center justify-center app-radius-lg border transition-colors">
        <FileText size={14} />
      </div>
      <div className="flex-1 overflow-hidden">
        <p className="text-sm text-foreground font-medium truncate transition-colors">
          <HighlightedText text={note.title || "Untitled"} query={query} />
        </p>
      </div>
      <div className="flex items-center gap-1 text-xs shrink-0 text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>{getRelativeTime(new Date(note.createdAt))}</span>
      </div>
    </div>
  );
}

// Tables are now collapsible — each manages its own open/close state
function TableSection({
  table,
  workspace,
  selectedNoteId,
  query,
  onNoteClick,
  onIntentPrefetch,
}: any) {
  const [isExpanded, setIsExpanded] = useState(true);
  const notes: any[] = table.notes ?? [];

  return (
    <div>
      <Button
        onClick={() => setIsExpanded((v) => !v)}
        variant="ghost"
        className="h-7 w-full flex-1 justify-start gap-2 px-4 mb-px text-sm font-medium border-0 border-transparent hover:border-2 hover:bg-transparent"
      >
        <ChevronRight
          className={cn(
            "h-3 w-3 shrink-0 transition-transform text-muted-foreground/50 group-hover:text-primary/60",
            isExpanded && "rotate-90",
          )}
        />
        {isExpanded ? (
          <FolderOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
        ) : (
          <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
        )}
        <span className="truncate text-[12px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
          <HighlightedText text={table.name || "Untitled"} query={query} />
        </span>
      </Button>

      {isExpanded && (
        <div className=" relative ">
          <div className=" ml-5 absolute top-0 left-0 h-full w-px bg-muted-foreground/30" />
          {notes.length === 0 ? (
            <p className="text-[11px] text-muted-foreground/40 text-center py-2 ml-6">
              {query ? `No notes match "${query}" here.` : "No notes here."}
            </p>
          ) : (
            notes.map((note: any) => (
              <NoteItem
                key={note._id}
                note={{
                  ...note,
                  workingSpaceName: workspace.name,
                  tableName: table.name,
                }}
                onClick={() => onNoteClick(note)}
                isSelected={selectedNoteId === String(note._id)}
                query={query}
                onIntentPrefetch={onIntentPrefetch}
                indented
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function WorkspaceTree({
  searchTargets,
  expandedWorkspaceIds,
  toggleWorkspace,
  onNoteClick,
  selectedNoteId,
  query,
  onIntentPrefetch,
}: {
  searchTargets: any[];
  expandedWorkspaceIds: string[];
  toggleWorkspace: (id: string) => void;
  onNoteClick: (note: any) => void;
  selectedNoteId?: string;
  query: string;
  onIntentPrefetch: (href: string) => void;
}) {
  return (
    <div className="space-y-1">
      {searchTargets.map((workspace) => {
        const workspaceId = String(workspace._id);
        const isExpanded = expandedWorkspaceIds.includes(workspaceId);
        const tables: any[] = workspace.tables ?? [];
        const totalNotes = tables.reduce(
          (acc: number, t: any) => acc + (t.notes?.length ?? 0),
          0,
        );

        return (
          <div key={workspace._id} className="overflow-hidden app-radius-lg">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-full flex-1 justify-start gap-2 px-2 text-sm font-medium border-0 border-border/50 hover:border-2 hover:bg-transparent"
              onClick={() => toggleWorkspace(workspaceId)}
            >
              <ChevronRight
                className={cn(
                  "h-3.5 w-3.5 shrink-0 transition-transform text-muted-foreground",
                  isExpanded && "rotate-90",
                )}
              />
              {isExpanded ? (
                <FolderOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              ) : (
                <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
              <span className="truncate text-sm font-medium text-foreground">
                <HighlightedText
                  text={workspace.name || "Untitled"}
                  query={query}
                />
              </span>
            </Button>

            {isExpanded && (
              <div className="space-y-0.5 px-1 py-1">
                {tables.length === 0 ? (
                  <p className="text-xs text-muted-foreground/50 text-center py-3">
                    No tables in this workspace yet.
                  </p>
                ) : (
                  tables.map((table: any) => (
                    <TableSection
                      key={table._id}
                      table={table}
                      workspace={workspace}
                      selectedNoteId={selectedNoteId}
                      query={query}
                      onNoteClick={onNoteClick}
                      onIntentPrefetch={onIntentPrefetch}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function SearchDialog({
  variant = "SidebarMenuButton",
  showTitle = false,
  iconSize = 16,
  sidebaraOpen,
  sidbarMobile,
  showTrigger = true,
  enableShortcut = true,
}: SearchDialogProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [expandedWorkspaceIds, setExpandedWorkspaceIds] = useState<string[]>(
    [],
  );
  const router = useRouter();
  const prefetchedRef = useRef<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsScrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [canScroll, setCanScroll] = useState(false);
  const [hasMoreBelow, setHasMoreBelow] = useState(false);

  const prefetchOnce = useCallback(
    (href: string) => {
      if (prefetchedRef.current.has(href)) return;
      prefetchedRef.current.add(href);
      router.prefetch(href);
    },
    [router],
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const searchTargets = useQuery(api.notes.getWorkspaceTree, {
    searchQuery: debouncedQuery || undefined,
  }) as any[] | undefined;

  const allNotes = useMemo<any[]>(() => {
    if (!searchTargets) return [];
    return searchTargets.flatMap((ws) =>
      (ws.tables ?? []).flatMap((t: any) =>
        (t.notes ?? []).map((n: any) => ({
          ...n,
          workingSpaceName: ws.name,
          tableName: t.name,
        })),
      ),
    );
  }, [searchTargets]);

  const hasResults = (searchTargets?.length ?? 0) > 0;

  const handleResultsScroll = useCallback(() => {
    const el = resultsScrollRef.current;
    if (!el) return;
    setScrollTop(el.scrollTop);
    const overflow = el.scrollHeight > el.clientHeight;
    setCanScroll(overflow);
    setHasMoreBelow(
      overflow && el.scrollTop + el.clientHeight < el.scrollHeight - 8,
    );
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setDebouncedQuery("");
    setSelectedIndex(0);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    if (!searchTargets) return;
    setExpandedWorkspaceIds(
      searchTargets
        .filter((ws) => (ws.tables?.length ?? 0) > 0)
        .map((ws) => String(ws._id)),
    );
  }, [searchTargets]);

  useEffect(() => {
    if (!enableShortcut) return;

    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        e.stopPropagation();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enableShortcut]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(handleResultsScroll, 50);
    return () => clearTimeout(timer);
  }, [open, handleResultsScroll]);

  useEffect(() => {
    const raf = requestAnimationFrame(handleResultsScroll);
    return () => cancelAnimationFrame(raf);
  }, [handleResultsScroll, allNotes.length]);

  useEffect(() => {
    if (!open) return;
    const note = allNotes[selectedIndex];
    if (!note) return;
    prefetchOnce(`/home/${note.workingSpaceId}/${note.slug}?id=${note._id}`);
  }, [open, allNotes, selectedIndex, prefetchOnce]);

  const toggleWorkspace = (workspaceId: string) => {
    setExpandedWorkspaceIds((prev) =>
      prev.includes(workspaceId)
        ? prev.filter((id) => id !== workspaceId)
        : [...prev, workspaceId],
    );
  };

  const handleNoteClick = (note: any) => {
    setOpen(false);
    router.push(`/home/${note.workingSpaceId}/${note.slug}?id=${note._id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, allNotes.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && allNotes[selectedIndex]) {
      e.preventDefault();
      handleNoteClick(allNotes[selectedIndex]);
    }
  };

  const isDebouncing = query !== debouncedQuery;
  const isLoading = isDebouncing || searchTargets === undefined;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button
            variant="SidebarMenuButton"
            size="sm"
            className="px-2 h-8 group outline-none border-none"
          >
            <Search className="text-muted-foreground" size={iconSize} />
            {showTitle && (
              <div className="w-full flex items-center justify-between gap-1">
                Search
                <span className="inline-flex gap-1">
                  <kbd className="pointer-events-none border border-border ml-auto inline-flex h-5 select-none items-center gap-1 rounded-md bg-card px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                    <span className="text-xs">Ctrl</span>
                  </kbd>
                  <kbd className="pointer-events-none border border-border ml-auto inline-flex h-5 select-none items-center gap-1 rounded-md bg-card px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                    <span className="text-xs">K</span>
                  </kbd>
                </span>
              </div>
            )}
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="p-0 overflow-hidden bg-card border-border md:min-w-[850px] gap-0 shadow-2xl">
        <DialogTitle className="sr-only">Search Notes</DialogTitle>
        <DialogDescription className="sr-only">
          Search across workspaces, tables, and notes, then open the selected
          result.
        </DialogDescription>

        <div className="flex items-center border-b border-border px-4 py-2">
          {isDebouncing ? (
            <LoadingAnimation className="h-4 w-4 mr-3 text-muted-foreground shrink-0" />
          ) : (
            <Search className="h-5 w-5 mr-3 text-muted-foreground shrink-0" />
          )}
          <Input
            ref={inputRef}
            placeholder="Search workspaces, tables and notes..."
            className="flex-1 border-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none px-0 text-sm bg-transparent"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div
          ref={resultsScrollRef}
          onScroll={handleResultsScroll}
          className="min-h-[40vh] max-h-[40vh] overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent p-3"
        >
          {canScroll && scrollTop > 8 && (
            <div
              className="pointer-events-none absolute top-[49px] left-0 right-0 z-10 h-20 bg-gradient-to-b from-card/90 from-20% to-transparent"
              aria-hidden
            />
          )}
          {hasMoreBelow && (
            <div
              className="pointer-events-none absolute bottom-[44px] left-0 right-0 z-10 h-20 bg-gradient-to-t from-card/90 from-20% to-transparent"
              aria-hidden
            />
          )}

          {isLoading ? (
            <SearchLoadingSkeleton />
          ) : !hasResults ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              {!debouncedQuery ? (
                <>
                  <FileText className="mx-auto h-12 w-12 opacity-50 mb-3 text-primary" />
                  <p className="font-medium">No notes found</p>
                  <p className="text-xs mt-1">
                    Create your first note to get started
                  </p>
                </>
              ) : (
                <>
                  <Search className="mx-auto h-12 w-12 opacity-50 text-primary mb-3" />
                  <p className="font-medium">
                    No results found for &quot;{debouncedQuery}&quot;
                  </p>
                  <p className="text-xs mt-1">
                    Try different keywords or check your spelling
                  </p>
                </>
              )}
            </div>
          ) : (
            <WorkspaceTree
              searchTargets={searchTargets!}
              expandedWorkspaceIds={expandedWorkspaceIds}
              toggleWorkspace={toggleWorkspace}
              onNoteClick={handleNoteClick}
              selectedNoteId={
                allNotes[selectedIndex]
                  ? String(allNotes[selectedIndex]._id)
                  : undefined
              }
              query={debouncedQuery}
              onIntentPrefetch={prefetchOnce}
            />
          )}
        </div>

        <DialogFooter className="border-t border-border px-4 py-2.5 bg-muted">
          <div className="w-full flex justify-between items-center">
            <span className="flex justify-center items-center gap-2 space-x-2">
              <span className="flex justify-center items-center gap-2">
                <kbd className="pointer-events-none border border-border inline-flex h-6 select-none items-center gap-1.5 rounded-md bg-background px-2 font-mono text-[11px] font-medium text-muted-foreground">
                  <ArrowDownUp size={14} />
                </kbd>
                <p className="text-foreground font-mono text-xs">Navigate</p>
              </span>
              <span className="flex justify-center items-center gap-2">
                <kbd className="pointer-events-none border border-border inline-flex h-6 select-none items-center gap-1.5 rounded-md bg-background px-2 font-mono text-[11px] font-medium text-muted-foreground">
                  <Undo2 size={14} />
                </kbd>
                <p className="text-foreground font-mono text-xs">Open</p>
              </span>
            </span>
            <span className="flex justify-center items-center gap-2">
              <kbd className="pointer-events-none border border-border inline-flex h-6 select-none items-center gap-1.5 rounded-md bg-background px-2 font-mono text-[11px] font-medium text-muted-foreground">
                ESC
              </kbd>
              <p className="text-foreground font-mono text-xs">Close</p>
            </span>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
