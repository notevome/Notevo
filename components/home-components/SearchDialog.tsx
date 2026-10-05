"use client";
import React from "react";
import { useConvex } from "convex/react";
import {
  ArrowDownUp,
  Undo2,
  Clock,
  File,
  FileText,
  Search,
  ChevronRight,
  Folder,
  FolderOpen,
  Globe,
  PanelTop,
  FolderPlus,
  SquarePen,
  Table,
} from "lucide-react";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";

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
import { buildItemSlug } from "@/lib/slug";
import { generateSlug } from "@/lib/generateSlug";
import { prefetchNote } from "@/lib/notePrefetchCache";
import { useHomePane } from "./HomePaneDrawer";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { ShortcutBadge } from "../ui/shortcut-badge";
import IntentPrefetchLink from "@/components/IntentPrefetchLink";
import { usePendingNoteDraftContext } from "@/components/home-components/PendingNoteDraftProvider";

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

  const normalizedQuery = query.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!normalizedQuery) return <>{text}</>;

  const chars = Array.from(text);
  const normalizedChars: string[] = [];
  const originalIndexes: number[] = [];

  chars.forEach((char, index) => {
    const normalizedChar = char.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!normalizedChar) return;
    normalizedChars.push(normalizedChar);
    originalIndexes.push(index);
  });

  const normalizedText = normalizedChars.join("");
  const normalizedIndex = normalizedText.indexOf(normalizedQuery);

  if (normalizedIndex === -1) return <>{text}</>;

  const start = originalIndexes[normalizedIndex];
  const end =
    originalIndexes[normalizedIndex + normalizedQuery.length - 1] ?? start;

  return (
    <>
      {text.slice(0, start)}
      <span className="text-secondary bg-secondary-foreground font-extrabold">
        {text.slice(start, end + 1)}
      </span>
      {text.slice(end + 1)}
    </>
  );
}

function NoteItem({ note, onClick, isSelected, query, indented = false }: any) {
  const href = `/home/${note.workingSpaceId}/${buildItemSlug(note.title || note.slug, note._id)}`;
  return (
    <IntentPrefetchLink
      href={href}
      prefetchNoteId={note._id}
      onClick={onClick}
      data-selected={isSelected}
      className={cn(
        "flex items-center gap-2 mb-px py-1.5 px-2 cursor-pointer app-radius-lg transition-all",
        indented && "ml-7",
        isSelected ? "bg-border" : "hover:bg-border",
      )}
    >
      <FileText size={14} />
      <div className="flex-1 overflow-hidden">
        <p className="text-sm text-foreground font-medium truncate transition-colors">
          <HighlightedText text={note.title || "Untitled"} query={query} />
        </p>
      </div>
      <div className="flex items-center gap-1 text-xs shrink-0 text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>{getRelativeTime(new Date(note.createdAt))}</span>
      </div>
    </IntentPrefetchLink>
  );
}

function buildPdfSlug(title?: string) {
  if (!title) return "untitled-pdf";

  return (
    title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "untitled-pdf"
  );
}

function PdfItem({ pdf, onClick, isSelected, query, indented = false }: any) {
  const pdfSlug = pdf.slug
    ? pdf.slug.startsWith("/")
      ? pdf.slug
      : `/${pdf.slug}`
    : "";
  const href = `/home/${pdf.workingSpaceId}/${buildItemSlug(pdf.title || pdf.slug, pdf._id)}`;
  return (
    <IntentPrefetchLink
      href={href}
      onClick={onClick}
      data-selected={isSelected}
      className={cn(
        "flex items-center gap-2 mb-px py-1.5 px-2 cursor-pointer app-radius-lg transition-all",
        indented && "ml-7",
        isSelected ? "bg-border" : "hover:bg-border",
      )}
    >
      <File size={14} />
      <div className="flex-1 overflow-hidden">
        <p className="text-sm text-foreground font-medium truncate transition-colors">
          <HighlightedText text={pdf.title || "Untitled"} query={query} />
        </p>
      </div>
      <div className="flex items-center gap-1 text-xs shrink-0 text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>{getRelativeTime(new Date(pdf.createdAt))}</span>
      </div>
    </IntentPrefetchLink>
  );
}

function buildWhiteboardSlug(title?: string) {
  if (!title) return "untitled-whiteboard";

  return (
    title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "untitled-whiteboard"
  );
}

function WhiteboardItem({
  whiteboard,
  onClick,
  isSelected,
  query,
  indented = false,
}: any) {
  const whiteboardSlug = whiteboard.slug
    ? whiteboard.slug.startsWith("/")
      ? whiteboard.slug
      : `/${whiteboard.slug}`
    : "";
  const href = `/home/${whiteboard.workingSpaceId}/${buildItemSlug(whiteboard.title || whiteboard.slug, whiteboard._id)}`;
  return (
    <IntentPrefetchLink
      href={href}
      onClick={onClick}
      data-selected={isSelected}
      className={cn(
        "flex items-center gap-2 mb-px py-1.5 px-2 cursor-pointer app-radius-lg transition-all",
        indented && "ml-7",
        isSelected ? "bg-border" : "hover:bg-border",
      )}
    >
      <PanelTop size={14} />
      <div className="flex-1 overflow-hidden">
        <p className="text-sm text-foreground font-medium truncate transition-colors">
          <HighlightedText
            text={whiteboard.title || "Untitled"}
            query={query}
          />
        </p>
      </div>
      <div className="flex items-center gap-1 text-xs shrink-0 text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>{getRelativeTime(new Date(whiteboard.createdAt))}</span>
      </div>
    </IntentPrefetchLink>
  );
}

function getSearchLinkFaviconUrl(url: string): string | null {
  try {
    const domain = new URL(url).hostname.replace(/^www\./, "");
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return null;
  }
}

function SearchLinkFavicon({
  url,
  className,
}: {
  url: string;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);
  const faviconUrl = url ? getSearchLinkFaviconUrl(url) : null;

  if (!faviconUrl || errored) {
    return <Globe className={cn("text-muted-foreground", className)} />;
  }

  return (
    <img
      src={faviconUrl}
      alt=""
      className={cn(
        "object-contain grayscale contrast-125 saturate-0",
        className,
      )}
      onError={() => setErrored(true)}
    />
  );
}

function LinkItem({ link, onClick, isSelected, query, indented = false }: any) {
  return (
    <div
      onClick={onClick}
      data-selected={isSelected}
      className={cn(
        "flex items-center gap-2 mb-px py-1.5 px-2 cursor-pointer app-radius-lg transition-all",
        indented && "ml-7",
        isSelected ? "bg-border" : "hover:bg-border",
      )}
    >
      <SearchLinkFavicon url={link.url} className="h-3.5 w-3.5 shrink-0" />
      <div className="flex-1 overflow-hidden">
        <p className="text-sm text-foreground font-medium truncate transition-colors">
          <HighlightedText
            text={link.title || link.url || "Untitled"}
            query={query}
          />
        </p>
      </div>
      <div className="flex items-center gap-1 text-xs shrink-0 text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>{getRelativeTime(new Date(link.createdAt))}</span>
      </div>
    </div>
  );
}

function getTableItems(table: any, workspaceName?: string) {
  const notes: any[] = table.notes ?? [];
  const pdfs: any[] = table.pdfs ?? [];
  const links: any[] = table.links ?? [];
  const whiteboards: any[] = table.whiteboards ?? [];

  return [
    ...notes.map((note) => ({
      ...note,
      kind: "note" as const,
      workingSpaceName: workspaceName,
      tableName: table.name,
    })),
    ...pdfs.map((pdf) => ({
      ...pdf,
      kind: "pdf" as const,
      slug: buildPdfSlug(pdf.title),
      workingSpaceName: workspaceName,
      tableName: table.name,
    })),
    ...whiteboards.map((whiteboard) => ({
      ...whiteboard,
      kind: "whiteboard" as const,
      slug: buildWhiteboardSlug(whiteboard.title),
      workingSpaceName: workspaceName,
      tableName: table.name,
    })),
    ...links.map((link) => ({
      ...link,
      kind: "link" as const,
      workingSpaceName: workspaceName,
      tableName: table.name,
    })),
  ].sort(
    (a, b) =>
      b.createdAt - a.createdAt || String(a._id).localeCompare(String(b._id)),
  );
}

// Tables are now collapsible — each manages its own open/close state
function TableSection({
  table,
  workspace,
  selectedNoteId,
  query,
  onNoteClick,
}: any) {
  const [isExpanded, setIsExpanded] = useState(true);
  const items = useMemo(
    () => getTableItems(table, workspace?.name),
    [table, workspace?.name],
  );

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
          {items.map((item: any) =>
            item.kind === "pdf" ? (
              <PdfItem
                key={item._id}
                pdf={item}
                onClick={(e: any) => onNoteClick(item, e)}
                isSelected={selectedNoteId === String(item._id)}
                query={query}
                indented
              />
            ) : item.kind === "whiteboard" ? (
              <WhiteboardItem
                key={item._id}
                whiteboard={item}
                onClick={(e: any) => onNoteClick(item, e)}
                isSelected={selectedNoteId === String(item._id)}
                query={query}
                indented
              />
            ) : item.kind === "link" ? (
              <LinkItem
                key={item._id}
                link={item}
                onClick={(e: any) => onNoteClick(item, e)}
                isSelected={selectedNoteId === String(item._id)}
                query={query}
                indented
              />
            ) : (
              <NoteItem
                key={item._id}
                note={item}
                onClick={(e: any) => onNoteClick(item, e)}
                isSelected={selectedNoteId === String(item._id)}
                query={query}
                indented
              />
            ),
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
}: {
  searchTargets: any[];
  expandedWorkspaceIds: string[];
  toggleWorkspace: (id: string) => void;
  onNoteClick: (note: any, e: any) => void;
  selectedNoteId?: string;
  query: string;
}) {
  return (
    <div className="space-y-1">
      {searchTargets.map((workspace) => {
        const workspaceId = String(workspace._id);
        const isExpanded = expandedWorkspaceIds.includes(workspaceId);
        const tables: any[] = workspace.tables ?? [];
        if (tables.length === 0) return null;

        return (
          <div key={workspace._id} className="overflow-hidden app-radius-lg">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-full flex-1 justify-start gap-2 px-2 text-sm font-medium border-0 border-transparent hover:border-2 hover:bg-transparent"
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
                {tables.map((table: any) => (
                  <TableSection
                    key={table._id}
                    table={table}
                    workspace={workspace}
                    selectedNoteId={selectedNoteId}
                    query={query}
                    onNoteClick={onNoteClick}
                  />
                ))}
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
  const [creationKind, setCreationKind] = useState<
    "note" | "whiteboard" | null
  >(null);
  const [creationSelectionIndex, setCreationSelectionIndex] = useState(0);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<
    Id<"workingSpaces"> | ""
  >("");
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [isCreatingItem, setIsCreatingItem] = useState(false);
  const [creatingNotesTableId, setCreatingNotesTableId] = useState<
    Id<"notesTables"> | null
  >(null);
  const router = useRouter();
  const pathname = usePathname();
  const convex = useConvex();
  const { beginNoteDraft } = usePendingNoteDraftContext();
  const { toast } = useToast();
  const createWorkspace = useMutation(api.workingSpaces.createWorkingSpace);
  const getOrCreateNotesTable = useMutation(api.notesTables.getOrCreateTable);
  const createWhiteboard = useMutation(api.whiteboards.createWhiteboard);
  const prefetchedRef = useRef<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsScrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [canScroll, setCanScroll] = useState(false);
  const [hasMoreBelow, setHasMoreBelow] = useState(false);
  const isMobile = useIsMobile();

  const prefetchOnce = useCallback(
    (href: string, noteId?: string) => {
      if (!prefetchedRef.current.has(href)) {
        prefetchedRef.current.add(href);
        router.prefetch(href);
      }
      if (noteId) {
        void prefetchNote(convex, noteId).catch(() => undefined);
      }
    },
    [convex, router],
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const searchTargets = useQuery(api.notes.getWorkspaceTree, {
    searchQuery: debouncedQuery || undefined,
  }) as any[] | undefined;
  const creationWorkspaces = useQuery(
    api.workingSpaces.getRecentWorkingSpaces,
    creationKind ? {} : "skip",
  );
  const creationTables = useQuery(
    api.notesTables.getTables,
    creationKind && selectedWorkspaceId
      ? { workingSpaceId: selectedWorkspaceId }
      : "skip",
  );
  const selectedWorkspace = creationWorkspaces?.find(
    (workspace) => workspace._id === selectedWorkspaceId,
  );

  const allNotes = useMemo<any[]>(() => {
    if (!searchTargets) return [];
    return searchTargets.flatMap((ws) =>
      (ws.tables ?? []).flatMap((t: any) => getTableItems(t, ws.name)),
    );
  }, [searchTargets]);

  const hasResults = allNotes.length > 0;

  useEffect(() => {
    if (
      !creationKind ||
      selectedWorkspaceId ||
      creationWorkspaces?.length !== 1
    ) {
      return;
    }
    setSelectedWorkspaceId(creationWorkspaces[0]._id);
    setCreationSelectionIndex(0);
  }, [creationKind, creationWorkspaces, selectedWorkspaceId]);

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

  const handleCreateWorkspaceFromSearch = useCallback(async () => {
    const name = debouncedQuery.trim();
    if (!name || isCreatingWorkspace) return;

    setIsCreatingWorkspace(true);
    try {
      const workspaceId = await createWorkspace({ name });
      setOpen(false);
      setQuery("");
      router.push(`/home/${workspaceId}`);
    } catch (error) {
      console.error("Failed to create workspace from search:", error);
      toast({
        title: "Could not create workspace",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingWorkspace(false);
    }
  }, [createWorkspace, debouncedQuery, isCreatingWorkspace, router, toast]);

  const handleCreateWorkspaceForItem = useCallback(async () => {
    const title = debouncedQuery.trim();
    if (!title || !creationKind || isCreatingWorkspace) return;

    setIsCreatingWorkspace(true);
    try {
      const workspaceId = await createWorkspace({ name: title });
      const [workspace, notesTableId] = await Promise.all([
        convex.query(api.workingSpaces.getWorkingSpaceById, {
          _id: workspaceId,
        }),
        getOrCreateNotesTable({ name: "Notes", workingSpaceId: workspaceId }),
      ]);

      if (creationKind === "note") {
        const draft = beginNoteDraft({
          workingSpaceId: workspaceId,
          workingSpacesSlug:
            workspace.slug ?? generateSlug(workspace.name || title),
          notesTableId,
          title,
          originPath: pathname,
        });
        setOpen(false);
        setQuery("");
        router.push(`/home/${workspaceId}/draft-${draft.token}`);
        return;
      }

      setCreatingNotesTableId(notesTableId);
      setIsCreatingItem(true);
      const whiteboardId = await createWhiteboard({
        title,
        workingSpaceId: workspaceId,
        notesTableId,
      });
      setOpen(false);
      setQuery("");
      router.push(`/home/${workspaceId}/${buildItemSlug(title, whiteboardId)}`);
    } catch (error) {
      console.error("Failed to create workspace item from search:", error);
      toast({
        title: `Could not create ${creationKind}`,
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingWorkspace(false);
      setIsCreatingItem(false);
      setCreatingNotesTableId(null);
    }
  }, [
    beginNoteDraft,
    convex,
    createWhiteboard,
    createWorkspace,
    creationKind,
    debouncedQuery,
    getOrCreateNotesTable,
    isCreatingWorkspace,
    pathname,
    router,
    toast,
  ]);

  const handleCreateItemFromSearch = useCallback(
    async (notesTableId: Id<"notesTables">) => {
      const title = debouncedQuery.trim();
      if (
        !title ||
        !creationKind ||
        !selectedWorkspaceId ||
        !selectedWorkspace ||
        isCreatingItem
      ) {
        return;
      }

      if (creationKind === "note") {
        const draft = beginNoteDraft({
          workingSpaceId: selectedWorkspaceId,
          workingSpacesSlug:
            selectedWorkspace.slug ?? generateSlug(selectedWorkspace.name),
          notesTableId,
          title,
          originPath: pathname,
        });
        setOpen(false);
        setQuery("");
        router.push(`/home/${selectedWorkspaceId}/draft-${draft.token}`);
        return;
      }

      setCreatingNotesTableId(notesTableId);
      setIsCreatingItem(true);
      try {
        const whiteboardId = await createWhiteboard({
          title,
          workingSpaceId: selectedWorkspaceId,
          notesTableId,
        });
        setOpen(false);
        setQuery("");
        router.push(
          `/home/${selectedWorkspaceId}/${buildItemSlug(title, whiteboardId)}`,
        );
      } catch (error) {
        console.error("Failed to create whiteboard from search:", error);
        toast({
          title: "Could not create whiteboard",
          description: "Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsCreatingItem(false);
        setCreatingNotesTableId(null);
      }
    },
    [
      beginNoteDraft,
      createWhiteboard,
      creationKind,
      debouncedQuery,
      isCreatingItem,
      pathname,
      router,
      selectedWorkspace,
      selectedWorkspaceId,
      toast,
    ],
  );

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setDebouncedQuery("");
    setSelectedIndex(0);
    setCreationKind(null);
    setSelectedWorkspaceId("");
    setCreationSelectionIndex(0);
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
    if (!note || note.kind === "link") return;
    const href = `/home/${note.workingSpaceId}/${buildItemSlug(note.title || note.slug, note._id)}`;
    prefetchOnce(href, note.kind === "note" ? note._id : undefined);
  }, [open, allNotes, selectedIndex, prefetchOnce]);

  useEffect(() => {
    if (!open) return;
    const selectedEl = resultsScrollRef.current?.querySelector(
      '[data-selected="true"]',
    );
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex, open]);

  const toggleWorkspace = (workspaceId: string) => {
    setExpandedWorkspaceIds((prev) =>
      prev.includes(workspaceId)
        ? prev.filter((id) => id !== workspaceId)
        : [...prev, workspaceId],
    );
  };
  const { openPane } = useHomePane();
  const handleNoteClick = (note: any, event: any) => {
    if (note.kind === "link") {
      event.preventDefault();
      setOpen(false);
      if (event.altKey) {
        toast({
          variant: "destructive",
          title: "Cannot open in side pane",
          description: "Links cannot be opened in a side pane.",
        });
      }
      window.open(note.url, "_blank", "noopener,noreferrer");
      return;
    }
    if (event.altKey && !isMobile) {
      event.preventDefault();
      setOpen(false);
      if (note.kind === "pdf") {
        openPane({
          type: "pdf",
          id: note._id,
          title: note.title || "Untitled",
        });
      } else if (note.kind === "whiteboard") {
        toast({
          variant: "destructive",
          title: "Cannot open in side pane",
          description: "Whiteboards cannot be opened in a side pane FOR NOW.",
        });
        router.push(
          `/home/${note.workingSpaceId}/${buildItemSlug(note.title || note.slug, note._id)}`,
        );
      } else if (note.kind === "note") {
        openPane({
          type: "note",
          id: note._id,
          title: note.title || "Untitled",
        });
      } else {
        toast({
          title: "Cannot open in side pane",
          description: "This item cannot be opened in a side pane.",
        });
      }
      return;
    }
    event.preventDefault();
    setOpen(false);
    if (note.kind === "pdf") {
      router.push(
        `/home/${note.workingSpaceId}/${buildItemSlug(note.title || note.slug, note._id)}`,
      );
    } else if (note.kind === "whiteboard") {
      router.push(
        `/home/${note.workingSpaceId}/${buildItemSlug(note.title || note.slug, note._id)}`,
      );
    } else {
      router.push(
        `/home/${note.workingSpaceId}/${buildItemSlug(note.title || note.slug, note._id)}`,
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const showCreationChoices =
      !isLoading && !hasResults && Boolean(debouncedQuery.trim());
    if (showCreationChoices) {
      const options = !creationKind
        ? ["workspace", "note", "whiteboard"]
        : selectedWorkspaceId
          ? (creationTables ?? [])
          : creationWorkspaces === undefined
            ? []
            : creationWorkspaces.length
              ? creationWorkspaces
              : ["create-workspace"];

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (options.length) {
          setCreationSelectionIndex((index) =>
            e.key === "ArrowDown"
              ? (index + 1) % options.length
              : (index - 1 + options.length) % options.length,
          );
        }
        return;
      }

      if (e.key === "Enter") {
        if (!creationKind) {
          e.preventDefault();
          if (creationSelectionIndex === 0) {
            void handleCreateWorkspaceFromSearch();
          } else {
            setCreationKind(
              creationSelectionIndex === 1 ? "note" : "whiteboard",
            );
            setSelectedWorkspaceId("");
            setCreationSelectionIndex(0);
          }
        } else if (!selectedWorkspaceId) {
          if (creationWorkspaces?.length === 0) {
            e.preventDefault();
            void handleCreateWorkspaceForItem();
          } else {
            const workspace = creationWorkspaces?.[creationSelectionIndex];
            if (workspace) {
              e.preventDefault();
              setSelectedWorkspaceId(workspace._id);
              setCreationSelectionIndex(0);
            }
          }
        } else {
          const table = creationTables?.[creationSelectionIndex];
          if (table) {
            e.preventDefault();
            void handleCreateItemFromSearch(table._id);
          }
        }
        return;
      }
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, allNotes.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && allNotes[selectedIndex]) {
      e.preventDefault();
      handleNoteClick(allNotes[selectedIndex], e);
    }
  };

  const isDebouncing = query !== debouncedQuery;
  const isLoading = isDebouncing || searchTargets === undefined;
  const isCreationChooserOpen =
    !isLoading && !hasResults && Boolean(debouncedQuery.trim());

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
                  <kbd className="pointer-events-none border border-border ml-auto inline-flex h-5 select-none items-center gap-1 app-radius-md bg-card px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                    <span className="text-xs">Ctrl</span>
                  </kbd>
                  <kbd className="pointer-events-none border border-border ml-auto inline-flex h-5 select-none items-center gap-1 app-radius-md bg-card px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                    <span className="text-xs">K</span>
                  </kbd>
                </span>
              </div>
            )}
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="p-0 overflow-hidden bg-card border-border sm:h-fit h-dvh w-full max-w-full sm:w-[90vw] sm:max-w-3xl md:max-w-4xl gap-0 shadow-2xl z-[900001]">
        <DialogTitle className="sr-only">
          Search Notes and Whiteboards
        </DialogTitle>
        <DialogDescription className="sr-only">
          Search across workspaces, tables, notes, and whiteboards, then open
          the selected result.
        </DialogDescription>

        <div className="flex items-center border-b border-border px-4 py-2">
          {isDebouncing ? (
            <LoadingAnimation className="h-4 w-4 mr-3 text-muted-foreground shrink-0" />
          ) : (
            <Search className="h-5 w-5 mr-3 text-muted-foreground shrink-0" />
          )}
          <Input
            ref={inputRef}
            placeholder="Search workspaces, tables, notes and whiteboards..."
            className="flex-1 border-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none px-0 text-sm bg-transparent"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div
          ref={resultsScrollRef}
          onScroll={handleResultsScroll}
          className=" sm:min-h-[50vh] sm:max-h-[50vh] min-h-[85dvh]  overflow-y-auto scrollbar-gutter-stable [&::-webkit-scrollbar]:w-[0.4rem] [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent p-3"
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
            !debouncedQuery.trim() ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                <FileText className="mx-auto h-12 w-12 opacity-50 mb-3 text-primary" />
                <p className="font-medium">No items found</p>
                <p className="text-xs mt-1">
                  Search for something or create a new item.
                </p>
              </div>
            ) : creationKind ? (
              <div className="mx-auto max-w-xl space-y-3 py-6">
                <div className="min-w-0 px-2">
                  <p className="text-sm font-medium text-foreground">
                    {selectedWorkspaceId
                      ? `Choose a table in ${selectedWorkspace?.name || "workspace"}`
                      : "Choose a workspace"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Create {creationKind} &quot;{debouncedQuery.trim()}&quot;
                  </p>
                </div>

                {!selectedWorkspaceId ? (
                  creationWorkspaces === undefined ? (
                    <SearchLoadingSkeleton />
                  ) : creationWorkspaces.length ? (
                    <div
                      className="space-y-1"
                      role="listbox"
                      aria-label="Workspaces"
                    >
                      {creationWorkspaces.map((workspace, index) => (
                        <Button
                          key={workspace._id}
                          type="button"
                          role="option"
                          aria-selected={creationSelectionIndex === index}
                          variant="ghost"
                          className={cn(
                            "h-auto w-full justify-start gap-3 px-3 py-3 text-left",
                            creationSelectionIndex === index && "bg-accent",
                          )}
                          onMouseMove={() => setCreationSelectionIndex(index)}
                          onClick={() => {
                            setSelectedWorkspaceId(workspace._id);
                            setCreationSelectionIndex(0);
                          }}
                        >
                          <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="truncate">
                            {workspace.name || "Untitled workspace"}
                          </span>
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-auto w-full justify-start gap-3 px-3 py-3 text-left"
                      disabled={isCreatingWorkspace}
                      onClick={() => void handleCreateWorkspaceForItem()}
                    >
                      {isCreatingWorkspace ? (
                        <LoadingAnimation className="h-4 w-4 shrink-0" />
                      ) : (
                        <FolderPlus className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="truncate">
                        Create workspace and {creationKind} &quot;
                        {debouncedQuery.trim()}&quot;
                      </span>
                    </Button>
                  )
                ) : creationTables === undefined ? (
                  <SearchLoadingSkeleton />
                ) : creationTables.length ? (
                  <div className="space-y-1" role="listbox" aria-label="Tables">
                    {creationTables.map((table, index) => (
                      <Button
                        key={table._id}
                        type="button"
                        role="option"
                        aria-selected={creationSelectionIndex === index}
                        variant="ghost"
                        disabled={isCreatingItem}
                        className={cn(
                          "h-auto w-full justify-start gap-3 px-3 py-3 text-left",
                          creationSelectionIndex === index && "bg-accent",
                        )}
                        onMouseMove={() => setCreationSelectionIndex(index)}
                        onClick={() =>
                          void handleCreateItemFromSearch(table._id)
                        }
                      >
                        {creatingNotesTableId === table._id ? (
                          <LoadingAnimation className="h-4 w-4 shrink-0" />
                        ) : (
                          <Table className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className="truncate">
                          {table.name || "Untitled table"}
                        </span>
                      </Button>
                    ))}
                  </div>
                ) : (
                  <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                    This workspace has no tables. Choose another workspace or
                    create a table first.
                  </p>
                )}
              </div>
            ) : (
              <div className="mx-auto max-w-xl space-y-2 py-6">
                <p className="mb-3 px-2 text-sm text-muted-foreground">
                  No results found for &quot;{debouncedQuery.trim()}&quot;.
                  Create it instead:
                </p>
                <Button
                  type="button"
                  data-selected={creationSelectionIndex === 0}
                  variant="ghost"
                  className={cn(
                    "h-auto w-full justify-start gap-3 px-3 py-3 text-left",
                    creationSelectionIndex === 0 && "bg-accent",
                  )}
                  onMouseMove={() => setCreationSelectionIndex(0)}
                  disabled={isCreatingWorkspace}
                  onClick={() => void handleCreateWorkspaceFromSearch()}
                >
                  {isCreatingWorkspace ? (
                    <LoadingAnimation className="h-4 w-4 shrink-0" />
                  ) : (
                    <FolderPlus className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="truncate">
                    Create workspace &quot;{debouncedQuery.trim()}&quot;
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  data-selected={creationSelectionIndex === 1}
                  className={cn(
                    "h-auto w-full justify-start gap-3 px-3 py-3 text-left",
                    creationSelectionIndex === 1 && "bg-accent",
                  )}
                  onMouseMove={() => setCreationSelectionIndex(1)}
                  onClick={() => {
                    setSelectedWorkspaceId("");
                    setCreationKind("note");
                    setCreationSelectionIndex(0);
                  }}
                >
                  <SquarePen className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">
                    Create note &quot;{debouncedQuery.trim()}&quot;
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  data-selected={creationSelectionIndex === 2}
                  className={cn(
                    "h-auto w-full justify-start gap-3 px-3 py-3 text-left",
                    creationSelectionIndex === 2 && "bg-accent",
                  )}
                  onMouseMove={() => setCreationSelectionIndex(2)}
                  onClick={() => {
                    setSelectedWorkspaceId("");
                    setCreationKind("whiteboard");
                    setCreationSelectionIndex(0);
                  }}
                >
                  <PanelTop className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">
                    Create whiteboard &quot;{debouncedQuery.trim()}&quot;
                  </span>
                </Button>
              </div>
            )
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
            />
          )}
        </div>

        <DialogFooter className="border-t border-border px-4 py-2.5 bg-muted">
          <div className="w-full flex justify-between items-center">
            <span className="flex justify-center items-center gap-2 space-x-2">
              <span className="flex justify-center items-center gap-2">
                <kbd className="pointer-events-none border border-border inline-flex h-6 select-none items-center gap-1.5 app-radius-md bg-background px-2 font-mono text-[11px] font-medium text-muted-foreground">
                  <ArrowDownUp size={14} />
                </kbd>
                <p className="text-foreground font-mono text-xs">Navigate</p>
              </span>
              <span className="flex justify-center items-center gap-2">
                <kbd className="pointer-events-none border border-border inline-flex h-6 select-none items-center gap-1.5 app-radius-md bg-background px-2 font-mono text-[11px] font-medium text-muted-foreground">
                  {isCreationChooserOpen ? "Enter" : <Undo2 size={14} />}
                </kbd>
                <p className="text-foreground text-xs">
                  {isCreationChooserOpen ? "Choose" : "Open"}
                </p>
              </span>
              {!isMobile && (
                <span className="flex justify-center items-center gap-2">
                  <kbd className="pointer-events-none border border-border inline-flex h-6 select-none items-center gap-1.5 app-radius-md bg-background px-2 font-mono text-[11px] font-medium text-muted-foreground">
                    Alt + click
                  </kbd>
                  <p className="text-foreground text-xs">Open in pane</p>
                </span>
              )}
            </span>
            <span className="flex justify-center items-center gap-2">
              <kbd className="pointer-events-none border border-border inline-flex h-6 select-none items-center gap-1.5 app-radius-md bg-background px-2 font-mono text-[11px] font-medium text-muted-foreground">
                ESC
              </kbd>
              <p className="text-foreground  text-xs">Close</p>
            </span>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
