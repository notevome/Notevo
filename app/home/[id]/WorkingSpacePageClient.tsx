"use client";
import {
  Calendar,
  FileText,
  LayoutGrid,
  List,
  Search,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { useMediaQuery } from "react-responsive";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useMutation } from "convex/react";
import { usePaginatedQuery } from "@/cache/usePaginatedQuery";
import { useQuery } from "@/cache/useQuery";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { z } from "zod";

import MaxWContainer from "@/components/ui/MaxWContainer";
import CreateTableBtn from "@/components/home-components/CreateTableBtn";
import CreateNoteBtn from "@/components/home-components/CreateNoteBtn";
import TableSettings from "@/components/home-components/TableSettings";
import NoteSettings from "@/components/home-components/NoteSettings";
import TablesNotFound from "@/components/home-components/TablesNotFound";
import SkeletonTextAnimation from "@/components/ui/SkeletonTextAnimation";
import LoadingAnimation from "@/components/ui/LoadingAnimation";
import IntentPrefetchLink from "@/components/IntentPrefetchLink";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getContentPreview } from "@/lib/getContentPreview";
import { cn, formatTableName } from "@/lib/utils";

const workspaceNameSchema = z
  .string()
  .min(1, "Name cannot be empty")
  .max(30, "Name must be 30 characters or less");

const noteTitleSchema = z
  .string()
  .min(1, "Title cannot be empty")
  .max(55, "Title must be 55 characters or less");

const tableNameSchema = z
  .string()
  .min(1, "Name cannot be empty")
  .max(30, "Name must be 30 characters or less");

const workspacePageMemoryCache = new Map<
  string,
  { workspace?: any; tables?: any }
>();

const tableNotesMemoryCache = new Map<string, any[]>();

type ViewMode = "grid" | "list";

interface Note {
  _id: Id<"notes">;
  title?: string;
  slug?: string;
  workingSpacesSlug?: string;
  workingSpaceId?: Id<"workingSpaces">;
  userId?: Id<"users">;
  body?: string;
  preview?: string;
  favorite?: boolean;
  createdAt: number;
  updatedAt: number;
  tags?: Id<"tags">[];
  notesTableId?: Id<"notesTables"> | any | undefined;
  order?: number;
}

interface NotesDroppableContainerProps {
  tableId: Id<"notesTables">;
  viewMode: ViewMode;
  notes?: Note[];
  workspaceSlug?: string;
  workspaceId?: Id<"workingSpaces">;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  tables: any[];
  setViewMode: (mode: ViewMode) => void;
}

interface NoteCardProps {
  note: Note;
  workspaceId?: Id<"workingSpaces">;
  onDelete?: (noteId: Id<"notes">) => void;
}

interface EmptySearchResultsProps {
  searchQuery: string;
  onClearSearch: () => void;
}

interface EmptyTableStateProps {
  tableId: Id<"notesTables">;
  workspaceSlug?: string;
  workspaceId?: Id<"workingSpaces">;
}

const STORAGE_KEYS = {
  VIEW_MODE: "notevo_view_mode",
  ACTIVE_TABLE: "notevo_active_table",
};

function TableTab({ table }: { table: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(table.name || "Untitled");
  const [isHovered, setIsHovered] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const updateTable = useMutation(
    api.notesTables.updateTable,
  ).withOptimisticUpdate((local, args) => {
    const { _id, name } = args;
    const workspaces = local.getQuery(api.workingSpaces.getRecentWorkingSpaces);
    if (workspaces && Array.isArray(workspaces)) {
      for (const ws of workspaces) {
        const tables = local.getQuery(api.notesTables.getTables, {
          workingSpaceId: ws._id,
        });
        if (tables && Array.isArray(tables)) {
          const found = tables.some((t: any) => t._id === _id);
          if (found) {
            local.setQuery(
              api.notesTables.getTables,
              { workingSpaceId: ws._id },
              tables.map((t: any) =>
                t._id === _id
                  ? { ...t, name: name ?? t.name, updatedAt: Date.now() }
                  : t,
              ),
            );
            break;
          }
        }
      }
    }
  });
  const deleteTable = useMutation(
    api.notesTables.deleteTable,
  ).withOptimisticUpdate((local, args) => {
    const { _id } = args;
    const workspaces = local.getQuery(api.workingSpaces.getRecentWorkingSpaces);
    if (workspaces && Array.isArray(workspaces)) {
      for (const ws of workspaces) {
        const tables = local.getQuery(api.notesTables.getTables, {
          workingSpaceId: ws._id,
        });
        if (tables && Array.isArray(tables)) {
          if (tables.some((t: any) => t._id === _id)) {
            local.setQuery(
              api.notesTables.getTables,
              { workingSpaceId: ws._id },
              tables.filter((t: any) => t._id !== _id),
            );
            break;
          }
        }
      }
    }
  });

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setEditedName(table.name || "Untitled");
      setIsEditing(true);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    },
    [table.name],
  );

  const handleBlur = useCallback(async () => {
    const result = tableNameSchema.safeParse(editedName.trim());
    if (!result.success) {
      setIsEditing(false);
      setEditedName(table.name || "Untitled");
      return;
    }
    const trimmed = result.data;
    if (trimmed !== (table.name || "Untitled")) {
      try {
        await updateTable({ _id: table._id, name: trimmed });
      } catch (error) {
        console.error("Error updating table name:", error);
        setEditedName(table.name || "Untitled");
      }
    }
    setIsEditing(false);
    setIsHovered(false);
  }, [editedName, table.name, table._id, updateTable]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        inputRef.current?.blur();
      } else if (e.key === "Escape") {
        setIsEditing(false);
        setEditedName(table.name || "Untitled");
        setIsHovered(false);
      }
    },
    [table.name],
  );
  const handleContentMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleContentMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  const textClassName = isHovered
    ? "truncate flex-grow bg-gradient-to-r from-foreground from-75% via-transparent via-85% to-transparent to-95% text-transparent bg-clip-text"
    : "truncate flex-grow";

  const handleDelete = useCallback(async () => {
    try {
      await deleteTable({ _id: table._id });
    } catch (error) {
      console.error("Error deleting table:", error);
    } finally {
      setIsDeleteAlertOpen(false);
    }
  }, [deleteTable, table._id]);

  if (isEditing) {
    return (
      <div className="flex flex-col gap-1 px-1 flex-shrink-0 max-w-[8.1rem] overflow-hidden">
        <Input
          ref={inputRef as any}
          value={editedName}
          onChange={(e) => setEditedName(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className=" w-full border-transparent bg-transparent px-3 h-[3.3rem] text-sm focus-visible:ring-0 focus-visible:outline-none focus-visible:ring-offset-0 "
        />
      </div>
    );
  }

  return (
    <>
      <div
        className="relative flex-shrink-0 overflow-hidden group/tab hover:bg-card app-radius-lg min-w-32"
        onMouseEnter={handleContentMouseEnter}
        onMouseLeave={handleContentMouseLeave}
      >
        <TabsTrigger
          value={table._id}
          data-tab-id={table._id}
          className="px-4 py-2.5 rounded-none rounded-tl-lg w-full text-start whitespace-nowrap flex items-center gap-1.5 border border-transparent border-b-0 data-[state=active]:border-border"
          onDoubleClick={handleDoubleClick}
          title="Double-click to rename"
        >
          <p className={cn(textClassName, "w-full")}>
            {formatTableName(table.name)}
          </p>
        </TabsTrigger>
        <div
          className={cn(
            "absolute inset-y-0 right-2 flex items-center",
            isHovered ? "opacity-100 " : "opacity-0 pointer-events-none",
          )}
        >
          <Button
            type="button"
            variant="ghost"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDeleteAlertOpen(true);
            }}
            className=" px-1 h-6 text-foreground hover:text-destructive"
            title="Delete table"
            aria-label="Delete table"
          >
            <X size={16} />
          </Button>
        </div>
      </div>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="bg-card border border-border text-card-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Table Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete this table? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border border-border hover:bg-accent">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground border-none"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface SliderTabsListProps {
  tables: any[];
  activeTableId: string;
  onTabChange: (id: string) => void;
}

function SliderTabsList({
  tables,
  activeTableId,
  onTabChange,
}: SliderTabsListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const canScroll = canScrollLeft || canScrollRight;

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      ro.disconnect();
    };
  }, [checkScroll, tables]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const activeBtn = el.querySelector(
      `[data-tab-id="${activeTableId}"]`,
    ) as HTMLElement | null;
    if (activeBtn) {
      const btnLeft = activeBtn.offsetLeft;
      const btnRight = btnLeft + activeBtn.offsetWidth;
      const visLeft = el.scrollLeft;
      const visRight = visLeft + el.clientWidth;
      if (btnLeft < visLeft + 16) {
        el.scrollTo({ left: btnLeft - 16, behavior: "smooth" });
      } else if (btnRight > visRight - 16) {
        el.scrollTo({
          left: btnRight - el.clientWidth + 16,
          behavior: "smooth",
        });
      }
    }
  }, [activeTableId]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.6;
    el.scrollBy({
      left: dir === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <div className=" relative py-2.5">
      <div className="absolute -top-6 left-0 w-full">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => scroll("left")}
          aria-label="Scroll tabs left"
          className={cn(
            "absolute left-2 top-1/2 -translate-y-1/2 z-20 h-10 app-radius-md w-7 shadow-sm transition-all duration-200",
            canScrollLeft
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none",
          )}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => scroll("right")}
          aria-label="Scroll tabs right"
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 z-20 h-10 app-radius-md w-7 shadow-sm transition-all duration-200",
            canScrollRight
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none",
          )}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>

        <div
          className="absolute left-1 top-0 bottom-0 w-52 z-10 pointer-events-none transition-opacity duration-200"
          style={{
            opacity: canScrollLeft ? 1 : 0,
            background:
              "linear-gradient(to right, hsl(var(--muted)) 20%, transparent)",
          }}
        />
        <div
          className="absolute right-1 top-0 bottom-0 w-52 z-10 pointer-events-none transition-opacity duration-200"
          style={{
            opacity: canScrollRight ? 1 : 0,
            background:
              "linear-gradient(to left, hsl(var(--muted)) 20%, transparent)",
          }}
        />

        <TabsList
          className="flex justify-start items-center px-1 pt-6 pb-5 bg-muted !rounded-none border border-border border-b-0 w-full"
          style={{ overflow: "clip" } as React.CSSProperties}
        >
          <div
            ref={scrollRef}
            className="flex items-center gap-2 flex-nowrap"
            style={
              {
                overflowX: "auto",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              } as React.CSSProperties
            }
          >
            {tables.map((table) => (
              <TableTab key={table._id} table={table} />
            ))}
          </div>
        </TabsList>
      </div>
    </div>
  );
}

export default function WorkingSpacePageClient({
  workingSpaceId,
}: {
  workingSpaceId: Id<"workingSpaces">;
}) {
  const cached = workspacePageMemoryCache.get(
    workingSpaceId as unknown as string,
  );
  const workspaceQuery = useQuery(api.workingSpaces.getWorkingSpaceById, {
    _id: workingSpaceId,
  }) as any;
  const tablesQuery = useQuery(api.notesTables.getTables, {
    workingSpaceId,
  }) as any;

  const workspace = workspaceQuery ?? cached?.workspace;
  const workingSpacesSlug: string | undefined =
    workspace && (workspace.slug as string);

  const tables = tablesQuery !== undefined ? tablesQuery : cached?.tables;

  useEffect(() => {
    const key = workingSpaceId as unknown as string;
    const prev = workspacePageMemoryCache.get(key) ?? {};
    if (workspaceQuery !== undefined || tablesQuery !== undefined) {
      workspacePageMemoryCache.set(key, {
        workspace:
          workspaceQuery !== undefined ? workspaceQuery : prev.workspace,
        tables: tablesQuery !== undefined ? tablesQuery : prev.tables,
      });
    }
  }, [workingSpaceId, workspaceQuery, tablesQuery]);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  const updateWorkingSpace = useMutation(
    api.workingSpaces.updateWorkingSpace,
  ).withOptimisticUpdate((local, args) => {
    const { _id, name } = args;
    const workspaces = local.getQuery(api.workingSpaces.getRecentWorkingSpaces);
    if (workspaces && Array.isArray(workspaces)) {
      local.setQuery(
        api.workingSpaces.getRecentWorkingSpaces,
        {},
        workspaces.map((ws: any) =>
          ws._id === _id
            ? { ...ws, name: name ?? ws.name, updatedAt: Date.now() }
            : ws,
        ),
      );
    }
    const ws = local.getQuery(api.workingSpaces.getWorkingSpaceById, { _id });
    if (ws) {
      local.setQuery(
        api.workingSpaces.getWorkingSpaceById,
        { _id },
        { ...ws, name: name ?? ws.name, updatedAt: Date.now() },
      );
    }
  });

  const handleNameDoubleClick = useCallback(() => {
    if (!workspace) return;
    setEditedName(workspace.name || "Untitled");
    setIsEditingName(true);
    requestAnimationFrame(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    });
  }, [workspace]);

  const handleNameBlur = useCallback(async () => {
    const result = workspaceNameSchema.safeParse(editedName.trim());
    if (!result.success) {
      setIsEditingName(false);
      setEditedName(workspace?.name || "Untitled");
      return;
    }
    const trimmed = result.data;
    if (trimmed !== (workspace?.name || "Untitled")) {
      try {
        await updateWorkingSpace({ _id: workingSpaceId, name: trimmed });
      } catch (error) {
        console.error("Error updating workspace name:", error);
      }
    }
    setIsEditingName(false);
  }, [editedName, workspace?.name, workingSpaceId, updateWorkingSpace]);

  const handleNameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        nameInputRef.current?.blur();
      } else if (e.key === "Escape") {
        setIsEditingName(false);
        setEditedName(workspace?.name || "Untitled");
      }
    },
    [workspace?.name],
  );

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEYS.VIEW_MODE);
      return stored === "list" || stored === "grid" ? stored : "grid";
    }
    return "grid";
  });

  const [activeTableId, setActiveTableId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem(STORAGE_KEYS.ACTIVE_TABLE) || "";
    }
    return "";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.VIEW_MODE, viewMode);
    }
  }, [viewMode]);

  const defaultTableId = useMemo(() => {
    if (!tables || tables.length === 0) return undefined;
    const storedTableExists =
      activeTableId && tables.some((t: any) => t._id === activeTableId);
    if (storedTableExists) return activeTableId;
    return tables[0]._id;
  }, [tables, activeTableId]);

  const handleTabChange = (tableId: string) => {
    setActiveTableId(tableId);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(STORAGE_KEYS.ACTIVE_TABLE, tableId);
    }
  };

  const prevTableIdsRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!tables) return;
    const currentIds = new Set<string>(tables.map((t: any) => String(t._id)));
    const prevIds = prevTableIdsRef.current;
    prevTableIdsRef.current = currentIds;
    if (prevIds === null) return;
    const newTable = tables.find((t: any) => !prevIds.has(String(t._id)));
    if (newTable) {
      handleTabChange(String(newTable._id));
    }
  }, [tables]);

  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    if (!workspace?.name) return;
    const originalTitle = document.title;
    const metaDescription = document.querySelector('meta[name="description"]');
    const originalContent = metaDescription?.getAttribute("content");

    document.title = `${workspace.name} - Notevo Workspace`;
    const descriptionContent = `${workspace.name} workspace. `;

    if (metaDescription) {
      metaDescription.setAttribute("content", descriptionContent);
    } else {
      const newMeta = document.createElement("meta");
      newMeta.name = "description";
      newMeta.content = descriptionContent;
      document.head.appendChild(newMeta);
    }

    return () => {
      document.title = originalTitle;
      if (metaDescription && originalContent) {
        metaDescription.setAttribute("content", originalContent);
      } else if (!metaDescription) {
        document.querySelector('meta[name="description"]')?.remove();
      }
    };
  }, [workspace?.name, tables?.length]);

  return (
    <MaxWContainer className="my-5">
      <header>
        <div className=" relative flex justify-between items-end w-full">
          <div className="flex-1 px-1.5 border border-border bg-muted rounded-none rounded-tl-lg rounded-br-lg">
            <h1 className="text-3xl md:text-5xl font-bol my-3 h-[3rem]">
              {!workspace ? (
                <div className="bg-border app-radius-md animate-pulse h-10 w-64 inline-block" />
              ) : isEditingName ? (
                <Input
                  ref={nameInputRef as any}
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onBlur={handleNameBlur}
                  onKeyDown={handleNameKeyDown}
                  className="min-w-fit max-w-2xl border-transparent bg-transparent px-2 h-[3.3rem] text-3xl md:text-5xl focus-visible:ring-0 focus-visible:outline-none focus-visible:ring-offset-0 "
                />
              ) : (
                <span
                  onDoubleClick={handleNameDoubleClick}
                  title="Double-click to rename"
                  className="cursor-text app-radius-md border border-transparent px-2 hover:border-muted-foreground/20"
                >
                  {workspace.name}
                </span>
              )}
            </h1>
          </div>
          {workspace && tables?.length !== 0 && (
            <CreateTableBtn
              label="New Table"
              workingSpaceId={workingSpaceId}
              className=" z-50 absolute -bottom-[0.04rem] right-0 h-9 rounded-tr-none rounded-b-none hover:translate-x-[-2px] hover:translate-y-[-2px] hover:rounded-b-none hover:rounded-tr-none hover:shadow-[2px_2px_0px]"
            />
          )}
        </div>
      </header>

      <div>
        {tables?.length ? (
          <Tabs
            value={defaultTableId}
            onValueChange={handleTabChange}
            className="mt-6"
          >
            <div className="mb-6">
              <SliderTabsList
                tables={tables}
                activeTableId={defaultTableId ?? ""}
                onTabChange={handleTabChange}
              />
            </div>

            {tables.map((table: any) => (
              <TabsContent key={table._id} value={table._id}>
                <NotesDroppableContainer
                  tableId={table._id}
                  viewMode={viewMode}
                  workspaceSlug={workingSpacesSlug}
                  workspaceId={workingSpaceId}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  tables={tables}
                  setViewMode={setViewMode}
                />
              </TabsContent>
            ))}
          </Tabs>
        ) : tables ? (
          <TablesNotFound workingSpaceId={workingSpaceId} />
        ) : (
          <TablesSkeleton />
        )}
      </div>
    </MaxWContainer>
  );
}

export function NotesDroppableContainer({
  tableId,
  viewMode,
  notes,
  workspaceSlug,
  workspaceId,
  searchQuery,
  setSearchQuery,
  tables,
  setViewMode,
}: NotesDroppableContainerProps) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.notes.getNotesByTableId,
    { notesTableId: tableId },
    { initialNumItems: 5 },
  );

  const cachedNotes = tableNotesMemoryCache.get(tableId as unknown as string);
  useEffect(() => {
    if (status !== "LoadingFirstPage") {
      tableNotesMemoryCache.set(tableId as unknown as string, results);
    }
  }, [results, status, tableId]);

  const stableResults =
    status === "LoadingFirstPage" && cachedNotes ? cachedNotes : results;

  const [deletedNoteIds, setDeletedNoteIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setDeletedNoteIds(new Set());
  }, [tableId]);

  const filteredNotes = useMemo(() => {
    const notDeletedNotes = stableResults.filter(
      (note) => note && !deletedNoteIds.has(note._id),
    );
    if (!searchQuery.trim()) return notDeletedNotes;
    const q = searchQuery.toLowerCase();
    return notDeletedNotes.filter((note) => {
      const searchableText = (note.preview ?? note.body ?? "").toLowerCase();
      return (
        note.title?.toLowerCase().includes(q) || searchableText.includes(q)
      );
    });
  }, [stableResults, searchQuery, deletedNoteIds]);

  const handleNoteDelete = useCallback((noteId: Id<"notes">) => {
    setDeletedNoteIds((prev) => {
      const newSet = new Set(prev);
      newSet.add(noteId);
      return newSet;
    });
  }, []);
  const isMobile = useMediaQuery({ maxWidth: 640 });

  return (
    <div className="space-y-6">
      <div className="flex gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground" />
            <Input
              type="text"
              placeholder="Search Notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-border h-9 mt-0.5"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-auto justify-end">
          <div className="hidden sm:flex h-9 items-center border border-border app-radius-lg overflow-hidden">
            <Button
              variant="SidebarMenuButton"
              size="sm"
              className={cn(
                "!rounded-none hover:bg-muted",
                viewMode === "grid" && "bg-muted",
              )}
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid
                className={`h-3.5 w-3.5 ${viewMode === "grid" && "text-foreground"}`}
              />
            </Button>
            <Button
              variant="SidebarMenuButton"
              size="sm"
              className={cn(
                "!rounded-none hover:bg-muted",
                viewMode === "list" && "bg-muted",
              )}
              onClick={() => setViewMode("list")}
            >
              <List
                className={`h-3.5 w-3.5 ${viewMode === "list" && !isMobile && "text-foreground"}`}
              />
            </Button>
          </div>
          <CreateNoteBtn
            workingSpaceId={workspaceId}
            workingSpacesSlug={workspaceSlug}
            CNBP_notesTableId={tableId}
          />
          <TableSettings
            notesTableId={tableId}
            tableName={tables?.find((t) => t._id === tableId)?.name}
          />
        </div>
      </div>

      {status === "LoadingFirstPage" && !cachedNotes ? (
        <NotesSkeleton viewMode={viewMode} />
      ) : searchQuery && filteredNotes.length === 0 ? (
        <EmptySearchResults
          searchQuery={searchQuery}
          onClearSearch={() => setSearchQuery("")}
        />
      ) : filteredNotes.length === 0 ? (
        <EmptyTableState
          tableId={tableId}
          workspaceSlug={workspaceSlug}
          workspaceId={workspaceId}
        />
      ) : (
        <>
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
                : "flex flex-col gap-3"
            }
          >
            {filteredNotes.map((note) => (
              <div key={note._id}>
                {viewMode === "grid" ? (
                  <GridNoteCard
                    note={note}
                    workspaceId={workspaceId}
                    onDelete={handleNoteDelete}
                  />
                ) : !isMobile ? (
                  <ListNoteCard
                    note={note}
                    workspaceId={workspaceId}
                    onDelete={handleNoteDelete}
                  />
                ) : (
                  <GridNoteCard
                    note={note}
                    workspaceId={workspaceId}
                    onDelete={handleNoteDelete}
                  />
                )}
              </div>
            ))}
          </div>

          {status === "CanLoadMore" && (
            <div className="flex justify-center mt-6">
              <Button
                variant="outline"
                onClick={() => loadMore(15)}
                className="border-border"
              >
                Show More
              </Button>
            </div>
          )}

          {status === "LoadingMore" && (
            <div className="flex justify-center mt-6">
              <Button variant="outline" disabled className="border-border">
                <LoadingAnimation className="h-4 w-4 mr-2" />
                Loading...
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function GridNoteCard({ note, workspaceId, onDelete }: NoteCardProps) {
  const isEmpty = (note.preview ?? note.body ?? "").trim() === "";

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(note.title || "Untitled");
  const titleInputRef = useRef<HTMLTextAreaElement>(null);

  const updateNote = useMutation(api.notes.updateNote).withOptimisticUpdate(
    (local, args) => {
      const { _id, title } = args;
      const existing = local.getQuery(api.notes.getNoteById, { _id });
      if (existing) {
        local.setQuery(
          api.notes.getNoteById,
          { _id },
          {
            ...existing,
            title: title ?? existing.title,
            updatedAt: Date.now(),
          },
        );
      }
    },
  );

  const handleDoubleClick = useCallback(() => {
    setEditedTitle(note.title || "Untitled");
    setIsEditingTitle(true);
    requestAnimationFrame(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    });
  }, [note.title]);

  const handleTitleBlur = useCallback(async () => {
    const result = noteTitleSchema.safeParse(editedTitle.trim());
    if (!result.success) {
      setIsEditingTitle(false);
      setEditedTitle(note.title || "Untitled");
      return;
    }
    const trimmed = result.data;
    if (trimmed !== (note.title || "Untitled")) {
      try {
        await updateNote({ _id: note._id, title: trimmed });
      } catch (error) {
        console.error("Error updating note title:", error);
        setEditedTitle(note.title || "Untitled");
      }
    }
    setIsEditingTitle(false);
  }, [editedTitle, note.title, note._id, updateNote]);

  const handleTitleKeyDown = useCallback(
    (e: any) => {
      if (e.key === "Enter") {
        titleInputRef.current?.blur();
      } else if (e.key === "Escape") {
        setIsEditingTitle(false);
        setEditedTitle(note.title || "Untitled");
      }
    },
    [note.title],
  );

  return (
    <Card
      className={cn(
        "group relative overflow-hidden bg-card border  flex flex-col min-h-[230px]",
        isEmpty
          ? "border-dashed border-border"
          : "border-border hover:border-border",
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          {isEditingTitle ? (
            <div className="flex-1 flex flex-col gap-1 overflow-hidden">
              <Textarea
                ref={titleInputRef as any}
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={handleTitleKeyDown}
                rows={1}
                style={{ resize: "none", overflow: "hidden" }}
                className="field-sizing-content min-h-0 min-w-0 w-full max-w-full max-h-14 whitespace-pre-wrap  [overflow-wrap:anywhere] border-transparent bg-transparent px-0 py-0 my-0 text-lg font-semibold app-radius-md focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
          ) : (
            <CardTitle
              className="text-lg font-semibold text-foreground line-clamp-2 w-fit cursor-text app-radius-md border border-transparent hover:border-muted-foreground/20"
              onDoubleClick={handleDoubleClick}
              title="Double-click to rename"
            >
              {note.title || "Untitled"}
            </CardTitle>
          )}
          <NoteSettings
            noteId={note._id}
            noteTitle={note.title}
            ShowWidthOp={false}
            IconVariant="vertical_icon"
            DropdownMenuContentAlign="start"
            TooltipContentAlign="start"
            onDelete={onDelete}
            BtnClassName="pt-0"
          />
        </div>
      </CardHeader>

      <CardContent className=" flex-grow flex-1">
        {isEmpty ? (
          <p className="text-sm text-muted-foreground italic">
            No content yet. Click to start writing...
          </p>
        ) : (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {getContentPreview(note.preview ?? note.body)}
          </p>
        )}
      </CardContent>

      <CardFooter className="py-4 flex items-center justify-between border-t border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground ">
          <Calendar className="h-3.5 w-3.5" />
          {typeof window !== "undefined" ? (
            <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
          ) : (
            <SkeletonTextAnimation className="w-20" />
          )}
        </div>
        <Button
          size="sm"
          asChild
          className="hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[2px_2px_0px]  absolute bottom-0 right-0 h-9 px-2 text-xs"
        >
          <IntentPrefetchLink
            href={`/home/${workspaceId}/${note.slug}?id=${note._id}`}
          >
            Open
          </IntentPrefetchLink>
        </Button>
      </CardFooter>
    </Card>
  );
}

function ListNoteCard({ note, workspaceId, onDelete }: NoteCardProps) {
  const isEmpty = (note.preview ?? note.body ?? "").trim() === "";

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(note.title || "Untitled");
  const titleInputRef = useRef<HTMLInputElement>(null);

  const updateNote = useMutation(api.notes.updateNote).withOptimisticUpdate(
    (local, args) => {
      const { _id, title } = args;
      const existing = local.getQuery(api.notes.getNoteById, { _id });
      if (existing) {
        local.setQuery(
          api.notes.getNoteById,
          { _id },
          {
            ...existing,
            title: title ?? existing.title,
            updatedAt: Date.now(),
          },
        );
      }
    },
  );

  const handleDoubleClick = useCallback(() => {
    setEditedTitle(note.title || "Untitled");
    setIsEditingTitle(true);
    requestAnimationFrame(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    });
  }, [note.title]);

  const handleTitleBlur = useCallback(async () => {
    const result = noteTitleSchema.safeParse(editedTitle.trim());
    if (!result.success) {
      setIsEditingTitle(false);
      setEditedTitle(note.title || "Untitled");
      return;
    }
    const trimmed = result.data;
    if (trimmed !== (note.title || "Untitled")) {
      try {
        await updateNote({ _id: note._id, title: trimmed });
      } catch (error) {
        console.error("Error updating note title:", error);
        setEditedTitle(note.title || "Untitled");
      }
    }
    setIsEditingTitle(false);
  }, [editedTitle, note.title, note._id, updateNote]);

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") titleInputRef.current?.blur();
      else if (e.key === "Escape") {
        setIsEditingTitle(false);
        setEditedTitle(note.title || "Untitled");
      }
    },
    [note.title],
  );

  return (
    <Card
      className={cn(
        "group relative overflow-hidden flex justify-center items-center bg-card backdrop-blur-sm border transition-all duration-300 w-full min-h-[100px]",
        isEmpty
          ? "border-dashed border-border"
          : "border-border hover:border-border",
      )}
    >
      <CardContent className="p-3 flex-1">
        <div className="flex items-center justify-center gap-4">
          <div className="h-10 w-10 flex items-center justify-center flex-shrink-0">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className=" relative flex-1 min-w-0 h-[3.5rem] overflow-hidden">
            {isEditingTitle ? (
              <>
                <Input
                  ref={titleInputRef as any}
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onBlur={handleTitleBlur}
                  onKeyDown={handleTitleKeyDown}
                  className="min-w-fit max-w-md border border-transparent bg-transparent h-[1.8rem] px-0 py-3 !text-lg font-semibold focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </>
            ) : (
              <h3
                className="text-lg font-semibold text-foreground line-clamp-2 flex-1 cursor-text app-radius-md border border-transparent hover:border-muted-foreground/20 w-fit"
                onDoubleClick={handleDoubleClick}
                title="Double-click to rename"
              >
                {note.title || "Untitled"}
              </h3>
            )}
            {isEmpty ? (
              <p className="text-sm text-muted-foreground italic">
                No content yet. Click to start writing...
              </p>
            ) : (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {getContentPreview(note.preview ?? note.body)}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className=" relative flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              {typeof window !== "undefined" ? (
                <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
              ) : (
                <SkeletonTextAnimation className="w-20" />
              )}
            </div>
            <NoteSettings
              noteId={note._id}
              noteTitle={note.title}
              ShowWidthOp={false}
              IconVariant="vertical_icon"
              DropdownMenuContentAlign="start"
              TooltipContentAlign="start"
              onDelete={onDelete}
              BtnClassName="pt-0 mr-10 mt-1.5"
            />
            <Button
              size="sm"
              asChild
              className="hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[2px_2px_0px] absolute right-0 bottom-0 h-4/5 px-2 text-xs"
            >
              <IntentPrefetchLink
                href={`/home/${workspaceId}/${note.slug}?id=${note._id}`}
              >
                Open
              </IntentPrefetchLink>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptySearchResults({
  searchQuery,
  onClearSearch,
}: EmptySearchResultsProps) {
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border">
      <CardContent className="pt-12 pb-12 text-center">
        <div className="flex flex-col items-center justify-center">
          <div className="h-10 w-10 flex items-center justify-center mb-4">
            <Search className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2 text-foreground">
            No results found
          </h3>
          <p className="text-muted-foreground mb-6">
            No notes found for "{searchQuery}"
          </p>
          <Button
            variant="outline"
            onClick={onClearSearch}
            className="border-border"
          >
            Clear Search
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyTableState({
  tableId,
  workspaceSlug,
  workspaceId,
}: EmptyTableStateProps) {
  return (
    <Card className=" bg-transparent border-none shadow-none">
      <CardContent className="py-10 text-center">
        <div className="flex flex-col items-center justify-center">
          <div className="h-10 w-10 flex items-center justify-center mb-4">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2 text-foreground">
            No notes yet
          </h3>
          <p className="text-muted-foreground mb-6">
            Create your first note to get started
          </p>
          <CreateNoteBtn
            workingSpaceId={workspaceId}
            workingSpacesSlug={workspaceSlug}
            CNBP_notesTableId={tableId}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function NotesSkeleton({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === "grid") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <Card
            key={index}
            className="bg-card/90 backdrop-blur-sm border-border flex flex-col min-h-[230px]"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="h-5 w-3/4 bg-border rounded animate-pulse" />
                <div className="h-5 w-5 bg-border rounded animate-pulse" />
              </div>
            </CardHeader>
            <CardContent className="flex-grow flex-1">
              <div className="space-y-2">
                <div className="h-4 w-full bg-border rounded animate-pulse" />
                <div className="h-4 w-5/6 bg-border rounded animate-pulse" />
                <div className="h-4 w-4/6 bg-border rounded animate-pulse" />
              </div>
            </CardContent>
            <CardFooter className="py-4 flex items-center justify-between border-t border-border">
              <div className="h-4 w-24 bg-border rounded animate-pulse" />
              <div className="h-9 w-12 bg-border rounded animate-pulse" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <Card key={index} className="bg-card/90 backdrop-blur-sm border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 app-radius-md bg-border animate-pulse flex-shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="h-5 w-2/3 bg-border rounded animate-pulse" />
                <div className="h-4 w-full bg-border rounded animate-pulse" />
              </div>
              <div className="flex items-center gap-3">
                <div className="h-4 w-24 bg-border rounded animate-pulse" />
                <div className="h-5 w-5 bg-border rounded animate-pulse" />
                <div className="h-9 w-12 bg-border rounded animate-pulse" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TablesSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <Card key={index} className="bg-card/50 backdrop-blur-sm border-border">
          <CardHeader className="pb-3">
            <div className="h-5 w-3/4 bg-border rounded animate-pulse" />
          </CardHeader>
          <CardContent className="pb-3">
            <div className="space-y-2">
              <div className="h-4 w-full bg-border rounded animate-pulse" />
              <div className="h-4 w-5/6 bg-border rounded animate-pulse" />
            </div>
          </CardContent>
          <CardFooter className="pt-3 border-t border-border">
            <div className="h-4 w-24 bg-border rounded animate-pulse" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
