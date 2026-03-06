"use client";
import React from "react";
import { ArrowDownUp, Undo2, Clock, FileText, Search } from "lucide-react";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { usePaginatedQuery } from "convex/react";
import LoadingAnimation from "@/components/ui/LoadingAnimation";

interface SearchDialogProps {
  variant?: "default" | "SidebarMenuButton";
  showTitle?: boolean;
  iconSize?: number;
  sidebaraOpen?: boolean;
  sidbarMobile?: boolean;
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

const groupNotesByTime = (notes: any[]) => {
  const now = new Date();
  const today = new Date(now.setHours(0, 0, 0, 0));
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);
  const lastMonth = new Date(today);
  lastMonth.setDate(lastMonth.getDate() - 30);

  return {
    today: notes.filter((note) => new Date(note.createdAt) >= today),
    yesterday: notes.filter(
      (note) =>
        new Date(note.createdAt) >= yesterday &&
        new Date(note.createdAt) < today,
    ),
    pastWeek: notes.filter(
      (note) =>
        new Date(note.createdAt) >= lastWeek &&
        new Date(note.createdAt) < yesterday,
    ),
    pastMonth: notes.filter(
      (note) =>
        new Date(note.createdAt) >= lastMonth &&
        new Date(note.createdAt) < lastWeek,
    ),
    older: notes.filter((note) => new Date(note.createdAt) < lastMonth),
  };
};

function SearchLoadingSkeleton() {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center py-2 px-2">
          <div className="h-8 w-8 bg-primary/20 rounded-lg mr-2 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-primary/20 rounded-lg w-3/4 animate-pulse" />
            <div className="h-3 bg-primary/20 rounded-lg w-1/2 animate-pulse" />
          </div>
          <div className="h-3 bg-primary/20 rounded-lg w-20 animate-pulse" />
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

function NoteItem({ note, onClick, isSelected, query }: any) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center py-2 px-3 cursor-pointer rounded-lg transition-colors ${
        isSelected ? "bg-primary/20" : "hover:bg-primary/10"
      }`}
    >
      <div className="flex w-full items-center">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg mr-3 border border-primary/20">
          <FileText className="text-primary" size={16} />
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="font-medium truncate text-foreground">
            <HighlightedText text={note.title || "Untitled"} query={query} />
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {note.workingSpacesSlug || "Personal"}
          </p>
        </div>
        <div className="flex items-center text-xs text-primary">
          <Clock className="mr-1 h-3 w-3 text-primary" />
          <span>{getRelativeTime(new Date(note.createdAt))}</span>
        </div>
      </div>
    </div>
  );
}

export default function SearchDialog({
  variant = "SidebarMenuButton",
  showTitle = false,
  iconSize = 16,
  sidebaraOpen,
  sidbarMobile,
}: SearchDialogProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsScrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [canScroll, setCanScroll] = useState(false);
  const [hasMoreBelow, setHasMoreBelow] = useState(false);

  // useCallback so the same reference can be used both as the onScroll
  // handler and called manually whenever content changes
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

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { results, status, loadMore } = usePaginatedQuery(
    api.notes.getNoteByUserId,
    { searchQuery: debouncedQuery || undefined },
    { initialNumItems: 12 },
  );

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setQuery("");
      setDebouncedQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        e.stopPropagation();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const filteredNotes = results || [];

  const groupedNotes = useMemo(() => {
    return groupNotesByTime(filteredNotes);
  }, [filteredNotes]);

  const allNotes = useMemo(() => {
    return [
      ...groupedNotes.today,
      ...groupedNotes.yesterday,
      ...groupedNotes.pastWeek,
      ...groupedNotes.pastMonth,
      ...groupedNotes.older,
    ];
  }, [groupedNotes]);

  const handleItemClick = (note: any) => {
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
      handleItemClick(allNotes[selectedIndex]);
    }
  };

  const isDebouncing = query !== debouncedQuery;
  const hasResults = allNotes.length > 0;
  const isLoading = isDebouncing || status === "LoadingFirstPage";
  // When dialog opens, wait for animation then measure
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(handleResultsScroll, 50); // wait for dialog animation
    return () => clearTimeout(timer);
  }, [open, handleResultsScroll]);

  // Re-measure when results change
  useEffect(() => {
    const raf = requestAnimationFrame(handleResultsScroll);
    return () => cancelAnimationFrame(raf);
  }, [handleResultsScroll, filteredNotes.length, isLoading]);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="SidebarMenuButton"
          size="sm"
          className="px-2 h-8 group outline-none border-none"
        >
          <Search className="text-primary" size={iconSize} />
          {showTitle && (
            <div className="w-full flex items-center justify-between gap-1">
              Search
              <span className="inline-flex gap-1">
                <kbd className="pointer-events-none border border-primary/10 ml-auto inline-flex h-5 select-none items-center gap-1 rounded-md bg-mute px-1.5 font-mono text-[10px] font-medium text-primary">
                  <span className="text-xs">Ctrl</span>
                </kbd>
                <kbd className="pointer-events-none border border-primary/10 ml-auto inline-flex h-5 select-none items-center gap-1 rounded-md bg-mute px-1.5 font-mono text-[10px] font-medium text-primary">
                  <span className="text-xs">K</span>
                </kbd>
              </span>
            </div>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent
        aria-describedby={undefined}
        className="p-0 overflow-hidden bg-background md:min-w-[800px] gap-0"
      >
        <DialogTitle className="sr-only">Search Notes</DialogTitle>

        {/* Search Input */}
        <div className="flex items-center border-b border-border px-4 py-1.5">
          {isDebouncing ? (
            <LoadingAnimation className="h-4 w-4 mr-2 text-primary" />
          ) : (
            <Search className="h-4 w-4 mr-2 text-primary" />
          )}
          <Input
            ref={inputRef}
            placeholder="Search for notes by title..."
            className="flex-1 border-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none px-0"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* Results */}
        <div
          ref={resultsScrollRef}
          onScroll={handleResultsScroll}
          className="min-h-[60vh] max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent p-2"
        >
          {canScroll && scrollTop > 8 && (
            <div
              className="pointer-events-none absolute top-[53px] left-0 right-0 z-10 h-20 bg-gradient-to-b from-background/90 from-20% to-transparent"
              aria-hidden
            />
          )}
          {hasMoreBelow && (
            <div
              className="pointer-events-none absolute bottom-[53px] left-0 right-0 z-10 h-20 bg-gradient-to-t from-background/90 from-20% to-transparent"
              aria-hidden
            />
          )}
          {isLoading ? (
            <SearchLoadingSkeleton />
          ) : !hasResults ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {!query ? (
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
                  <p className="font-medium">No results found for "{query}"</p>
                  <p className="text-xs mt-1">
                    Try different keywords or check your spelling
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {groupedNotes.today.length > 0 && (
                <div className="mb-4">
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground">
                    Today
                  </div>
                  {groupedNotes.today.map((note) => (
                    <NoteItem
                      key={note._id}
                      note={note}
                      onClick={() => handleItemClick(note)}
                      isSelected={allNotes.indexOf(note) === selectedIndex}
                      query={debouncedQuery}
                    />
                  ))}
                </div>
              )}

              {groupedNotes.yesterday.length > 0 && (
                <div className="mb-4">
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground">
                    Yesterday
                  </div>
                  {groupedNotes.yesterday.map((note) => (
                    <NoteItem
                      key={note._id}
                      note={note}
                      onClick={() => handleItemClick(note)}
                      isSelected={allNotes.indexOf(note) === selectedIndex}
                      query={debouncedQuery}
                    />
                  ))}
                </div>
              )}

              {groupedNotes.pastWeek.length > 0 && (
                <div className="mb-4">
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground">
                    Past Week
                  </div>
                  {groupedNotes.pastWeek.map((note) => (
                    <NoteItem
                      key={note._id}
                      note={note}
                      onClick={() => handleItemClick(note)}
                      isSelected={allNotes.indexOf(note) === selectedIndex}
                      query={debouncedQuery}
                    />
                  ))}
                </div>
              )}

              {groupedNotes.pastMonth.length > 0 && (
                <div className="mb-4">
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground">
                    Past 30 Days
                  </div>
                  {groupedNotes.pastMonth.map((note) => (
                    <NoteItem
                      key={note._id}
                      note={note}
                      onClick={() => handleItemClick(note)}
                      isSelected={allNotes.indexOf(note) === selectedIndex}
                      query={debouncedQuery}
                    />
                  ))}
                </div>
              )}

              {groupedNotes.older.length > 0 && (
                <div className="mb-4">
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground">
                    Older
                  </div>
                  {groupedNotes.older.map((note) => (
                    <NoteItem
                      key={note._id}
                      note={note}
                      onClick={() => handleItemClick(note)}
                      isSelected={allNotes.indexOf(note) === selectedIndex}
                      query={debouncedQuery}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="border-t border-border px-4 py-3">
          <div className=" w-full flex justify-between items-center">
            <span className=" space-x-2">
              <kbd className="pointer-events-none border border-primary/10 ml-auto inline-flex h-7 select-none items-center gap-1 rounded-lg bg-mute px-1.5 font-mono text-xs font-medium text-primary">
                <ArrowDownUp size={16} /> Navigate
              </kbd>
              <kbd className="pointer-events-none border border-primary/10 ml-auto inline-flex h-7 select-none items-center gap-1 rounded-lg bg-mute px-1.5 font-mono text-xs font-medium text-primary">
                <Undo2 size={16} /> Open
              </kbd>
            </span>
            <span>
              <kbd className="pointer-events-none border border-primary/10 ml-auto inline-flex h-7 select-none items-center gap-1 rounded-lg bg-mute px-1.5 font-mono text-xs font-medium text-primary">
                <p className=" font-extrabold">ESC</p> Close
              </kbd>
            </span>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
