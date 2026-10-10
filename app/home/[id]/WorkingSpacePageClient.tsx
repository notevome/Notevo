"use client";
import {
  Calendar,
  Check,
  FileText,
  File as EmptyFileIcon,
  LayoutGrid,
  List,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Link2,
  Globe,
  Layers,
  PanelTop,
  PenTool,
  StickyNote,
  X,
  Filter,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMediaQuery } from "react-responsive";
import {
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useCallback,
  useRef,
  Fragment,
  memo,
} from "react";
import { useMutation } from "convex/react";
import { usePaginatedQuery } from "@/cache/usePaginatedQuery";
import { useQuery } from "@/cache/useQuery";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { z } from "zod";
import { buildItemSlug } from "@/lib/slug";
import { platformLabel, type LinkPlatform } from "@/lib/link-platform";
import MaxWContainer from "@/components/ui/MaxWContainer";
import CreateTableBtn from "@/components/home-components/CreateTableBtn";
import CreateNoteBtn from "@/components/home-components/CreateNoteBtn";
import PdfSettings from "@/components/home-components/PdfSettings";
import TableSettings from "@/components/home-components/TableSettings";
import NoteSettings from "@/components/home-components/NoteSettings";
import LinkSettings from "@/components/home-components/LinkSettings";
import WhiteboardSettings from "@/components/home-components/WhiteboardSettings";
import NoteContextMenu from "@/components/home-components/NoteContextMenu";
import TablesNotFound from "@/components/home-components/TablesNotFound";
import SkeletonTextAnimation from "@/components/ui/SkeletonTextAnimation";
import LoadingAnimation from "@/components/ui/LoadingAnimation";
import IntentPrefetchLink from "@/components/IntentPrefetchLink";
import { useHomePane } from "@/components/home-components/HomePaneDrawer";
import { useToast } from "@/hooks/use-toast";
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
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, formatTableName, formatWorkspaceName } from "@/lib/utils";
import {
  extractTextFromTiptap as parseTiptapContentExtractText,
  truncateText as parseTiptapContentTruncateText,
} from "@/lib/parse-tiptap-content";
import { generateSlug } from "@/lib/generateSlug";
import { useHoverTooltip } from "@/hooks/useHoverTooltip";
import { useDebouncedCallback } from "use-debounce";
import { Separator } from "@/components/ui/separator";

function getMediaQuery() {
  const isMobile = useMediaQuery({ maxWidth: 640 });
  return isMobile;
}

const GRID_MIN_CARD_WIDTH = 380;

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

function useContainerColumnCount(enabled: boolean) {
  const [columns, setColumns] = useState(1);
  const [containerEl, setContainerEl] = useState<HTMLElement | null>(null);

  const containerRef = useCallback((node: HTMLElement | null) => {
    setContainerEl(node);
  }, []);

  useIsomorphicLayoutEffect(() => {
    if (!enabled || !containerEl) {
      return;
    }

    const update = (width: number) => {
      if (!width || width <= 0) return;
      const cols = Math.max(1, Math.floor(width / GRID_MIN_CARD_WIDTH));
      setColumns((prev) => (prev !== cols ? cols : prev));
    };

    update(containerEl.getBoundingClientRect().width);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        update(entry.contentRect.width);
      }
    });
    observer.observe(containerEl);
    return () => observer.disconnect();
  }, [containerEl, enabled]);

  return [columns, containerRef] as const;
}

const EMPTY_CONTENT_MESSAGE = "No content yet. Click to start writing...";

const getContentPreviewFromBody = (body: any) => {
  if (!body) return EMPTY_CONTENT_MESSAGE;
  try {
    const plainText = parseTiptapContentExtractText(body);
    return plainText
      ? parseTiptapContentTruncateText(plainText, 80)
      : EMPTY_CONTENT_MESSAGE;
  } catch (error) {
    return "Unable to display content preview";
  }
};

const whiteboardEmptyCache = new Map<string, boolean>();
function isWhiteboardEmpty(board: {
  _id: string;
  updatedAt: number;
  snapshot?: string;
}): boolean {
  if (!board.snapshot) return true;
  const key = `${board._id}:${board.updatedAt}`;
  const cached = whiteboardEmptyCache.get(key);
  if (cached !== undefined) return cached;
  let empty = false;
  try {
    const scene = JSON.parse(board.snapshot);
    empty =
      !Array.isArray(scene.elements) ||
      scene.elements.filter((el: any) => !el?.isDeleted).length === 0;
  } catch {
    empty = false;
  }
  if (whiteboardEmptyCache.size > 500) whiteboardEmptyCache.clear();
  whiteboardEmptyCache.set(key, empty);
  return empty;
}
const workspaceNameSchema = z
  .string()
  .min(1, "Name cannot be empty")
  .max(30, "Name must be 30 characters or less");

const noteTitleSchema = z
  .string()
  .min(1, "Title cannot be empty")
  .max(60, "Title must be 60 characters or less");

const tableNameSchema = z
  .string()
  .min(1, "Name cannot be empty")
  .max(30, "Name must be 30 characters or less");

const workspacePageMemoryCache = new Map<
  string,
  { workspace?: any; tables?: any }
>();

const tableNotesMemoryCache = new Map<string, any[]>();
const tablePdfsMemoryCache = new Map<string, any[]>();
const tableLinksMemoryCache = new Map<string, any[]>();
const tableWhiteboardsMemoryCache = new Map<string, any[]>();

type ViewMode = "grid" | "list" | "calendar";
type CalendarZoom = "week" | "month" | "quarter" | "year";
type ContentFilter =
  | "all"
  | "note"
  | "pdf"
  | "whiteboard"
  | "youtube"
  | "x"
  | "instagram"
  | "linkedin"
  | "link";

type FilterIconComponent = (props: { className?: string }) => any;

function BrandIcon({ path, className }: { path: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d={path} />
    </svg>
  );
}

const XIcon: FilterIconComponent = ({ className }) => (
  <BrandIcon
    className={className}
    path="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"
  />
);

const YouTubeIcon: FilterIconComponent = ({ className }) => (
  <BrandIcon
    className={className}
    path="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
  />
);

const InstagramIcon: FilterIconComponent = ({ className }) => (
  <BrandIcon
    className={className}
    path="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"
  />
);

const LinkedInIcon: FilterIconComponent = ({ className }) => (
  <BrandIcon
    className={className}
    path="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
  />
);

const CONTENT_FILTER_OPTIONS: {
  value: ContentFilter;
  label: string;
  icon: FilterIconComponent;
}[] = [
  { value: "all", label: "All", icon: Layers },
  { value: "note", label: "Notes", icon: StickyNote },
  { value: "pdf", label: "PDFs", icon: FileText },
  { value: "whiteboard", label: "Whiteboards", icon: PenTool },
  { value: "youtube", label: "YouTube Videos", icon: YouTubeIcon },
  { value: "x", label: "X (twitter) Posts", icon: XIcon },
  { value: "instagram", label: "Instagram Posts", icon: InstagramIcon },
  { value: "linkedin", label: "LinkedIn Posts", icon: LinkedInIcon },
  { value: "link", label: "Sites", icon: Globe },
];

const GROUPABLE_LINK_FILTERS = new Set<ContentFilter>([
  "youtube",
  "x",
  "instagram",
  "linkedin",
  "link",
]);

function isGenericLinkPlatform(
  platform: LinkPlatform | string | undefined,
): boolean {
  if (!platform) return true;
  const p = String(platform).toLowerCase();
  return !(
    p.includes("youtube") ||
    p === "yt" ||
    p === "x" ||
    p.includes("twitter") ||
    p.includes("instagram") ||
    p === "ig" ||
    p.includes("linkedin")
  );
}

function isSocialLinkPlatform(
  platform: LinkPlatform | string | undefined,
): boolean {
  return !isGenericLinkPlatform(platform);
}

function stripImageSizeSuffix(url: string): string {
  return url.replace(
    /_(?:\d+x\d+|normal|bigger|mini|original)(?=\.[a-zA-Z0-9]+(?:\?.*)?$)/i,
    "",
  );
}

function isAvatarFallbackThumbnail(
  thumbnailUrl: string | undefined,
  avatarUrl: string | undefined,
): boolean {
  if (!thumbnailUrl || !avatarUrl) return false;
  if (thumbnailUrl === avatarUrl) return true;
  return stripImageSizeSuffix(thumbnailUrl) === stripImageSizeSuffix(avatarUrl);
}

function matchesLinkPlatform(
  platform: LinkPlatform | string | undefined,
  filter: ContentFilter,
): boolean {
  const p = String(platform ?? "").toLowerCase();
  switch (filter) {
    case "youtube":
      return p.includes("youtube") || p === "yt";
    case "x":
      return p === "x" || p.includes("twitter");
    case "instagram":
      return p.includes("instagram") || p === "ig";
    case "linkedin":
      return p.includes("linkedin");
    case "link":
      return isGenericLinkPlatform(platform);
    default:
      return false;
  }
}

function getLinkGroupKey(link: LinkItem, filter: ContentFilter): string | null {
  if (filter === "link") {
    try {
      return new URL(link.url).hostname.replace(/^www\./, "").toLowerCase();
    } catch {
      return null;
    }
  }
  const handle = link.metadata?.authorHandle?.trim();
  const name = link.metadata?.authorName?.trim();
  return (handle || name || null)?.toLowerCase() ?? null;
}

// Human-readable label for a group key (see getLinkGroupKey).
function getLinkGroupLabel(
  link: LinkItem,
  filter: ContentFilter,
): string | null {
  if (filter === "link") {
    try {
      return new URL(link.url).hostname.replace(/^www\./, "");
    } catch {
      return null;
    }
  }
  return (
    link.metadata?.authorName?.trim() ||
    link.metadata?.authorHandle?.trim() ||
    null
  );
}

interface LinkFilterGroup {
  key: string;
  label: string;
  handle?: string;
  avatarUrl?: string;
  sampleUrl?: string;
  count: number;
}

// Normalizes a raw handle into "@handle" display form.
function formatHandle(handle?: string | null): string | null {
  const trimmed = handle?.trim();
  if (!trimmed) return null;
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

function GroupAvatar({
  avatarUrl,
  label,
  className,
}: {
  avatarUrl?: string;
  label: string;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);
  const src = avatarUrl && !errored ? avatarUrl : null;

  if (!src) {
    return (
      <div
        className={cn(
          "h-6 w-6 app-radius-full bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground shrink-0",
          className,
        )}
      >
        {label.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      key={src}
      src={src}
      alt=""
      draggable={false}
      referrerPolicy="no-referrer"
      loading="lazy"
      className={cn("h-6 w-6 app-radius-full object-cover shrink-0", className)}
      onError={() => setErrored(true)}
    />
  );
}

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

interface PdfItem {
  _id: Id<"pdfs">;
  storageId: Id<"_storage">;
  title?: string;
  favorite?: boolean;
  userId?: Id<"users">;
  workingSpaceId?: Id<"workingSpaces">;
  notesTableId?: Id<"notesTables">;
  fileUrl?: string | null;
  createdAt: number;
  updatedAt: number;
  kind: "pdf";
}

interface LinkItem {
  _id: Id<"links">;
  url: string;
  platform: LinkPlatform;
  metadata?: {
    description?: string;
    thumbnailUrl?: string;
    authorName?: string;
    authorHandle?: string;
    authorAvatarUrl?: string;
    publishedAt?: number;
    viewCount?: string;
    likeCount?: number;
    repostCount?: number;
    commentCount?: number;
    duration?: string;
    embedVideoId?: string;
    siteName?: string;
  };
  title?: string;
  favorite?: boolean;
  userId?: Id<"users">;
  workingSpaceId?: Id<"workingSpaces">;
  notesTableId?: Id<"notesTables">;
  createdAt: number;
  updatedAt: number;
  kind: "link";
}

interface WhiteboardItem {
  _id: Id<"whiteboards">;
  title: string;
  favorite?: boolean;
  snapshot?: string;
  preview?: string;
  userId: Id<"users">;
  workingSpaceId: Id<"workingSpaces">;
  notesTableId: Id<"notesTables">;
  createdAt: number;
  updatedAt: number;
  kind: "whiteboard";
}

type WorkspaceEntry =
  | (Note & { kind: "note" })
  | PdfItem
  | LinkItem
  | WhiteboardItem;

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
  CALENDAR_ZOOM: "notevo_calendar_zoom",
  CUSTOM_ORDER_PREFIX: "notevo_custom_order_",
};

type DropTarget = { id: string; position: "before" | "after" };

// Use the actual card as the drag ghost. Without this the browser drags the
// <a> inside the card and shows its title + URL as a small text tooltip.
// We snapshot a clone (taken before React applies the faded "dragging" style)
// so the ghost looks exactly like the card the user picked up.
function setCardDragImage(
  e: {
    clientX: number;
    clientY: number;
    currentTarget: HTMLElement;
    dataTransfer: DataTransfer;
  },
  id: string,
) {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();

  // Drop the link's own uri/text payload so dropping elsewhere can't navigate.
  e.dataTransfer.clearData();
  e.dataTransfer.setData("text/plain", id);
  e.dataTransfer.effectAllowed = "move";

  const ghost = el.cloneNode(true) as HTMLElement;
  ghost.style.position = "fixed";
  ghost.style.top = "-10000px";
  ghost.style.left = "-10000px";
  ghost.style.width = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;
  ghost.style.margin = "0";
  ghost.style.opacity = "1";
  ghost.style.transform = "none";
  ghost.style.pointerEvents = "none";
  document.body.appendChild(ghost);

  e.dataTransfer.setDragImage(
    ghost,
    e.clientX - rect.left,
    e.clientY - rect.top,
  );
  // The browser has captured the image by the next tick.
  setTimeout(() => ghost.remove(), 0);
}

function useClientSideOrder<T extends { _id: string }>(
  storageKey: string,
  items: T[],
  options?: { newItemPosition?: "start" | "end" },
) {
  const newItemPosition = options?.newItemPosition ?? "end";
  const [sessionOrder, setSessionOrder] = useState<string[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggedSize, setDraggedSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const justDraggedRef = useRef(false);
  const clearJustDraggedTimeoutRef =
    useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setSessionOrder(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      setSessionOrder([]);
    }
  }, [storageKey]);

  useEffect(() => {
    setSessionOrder((prev) => {
      const known = new Set(prev);
      const newIds = items
        .map((item) => item._id)
        .filter((id) => !known.has(id));
      if (newIds.length === 0) return prev;
      return newItemPosition === "start"
        ? [...newIds, ...prev]
        : [...prev, ...newIds];
    });
  }, [items, newItemPosition]);

  const persist = useCallback(
    (ids: string[]) => {
      setSessionOrder(ids);
      try {
        localStorage.setItem(storageKey, JSON.stringify(ids));
      } catch {
        // won't survive a refresh.
      }
    },
    [storageKey],
  );

  const orderedItems = useMemo(() => {
    const itemById = new Map(items.map((item) => [item._id, item]));
    const known = sessionOrder
      .map((id) => itemById.get(id))
      .filter((item): item is T => Boolean(item));
    const knownIds = new Set(known.map((item) => item._id));
    const fresh = items.filter((item) => !knownIds.has(item._id));
    return [...known, ...fresh];
  }, [items, sessionOrder]);

  const handleDragStart = useCallback(
    (id: string, rect?: { width: number; height: number }) => {
      setDraggingId(id);
      setDropTarget(null);
      setDraggedSize(rect ?? null);
      justDraggedRef.current = true;
      if (clearJustDraggedTimeoutRef.current) {
        clearTimeout(clearJustDraggedTimeoutRef.current);
      }
    },
    [],
  );

  const handleDragOverItem = useCallback(
    (
      e: {
        clientY: number;
        currentTarget: HTMLElement;
        preventDefault: () => void;
      },
      id: string,
    ) => {
      e.preventDefault();
      if (!draggingId || draggingId === id) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const isBefore = e.clientY < rect.top + rect.height / 2;
      setDropTarget((prev) =>
        prev?.id === id && prev.position === (isBefore ? "before" : "after")
          ? prev
          : { id, position: isBefore ? "before" : "after" },
      );
    },
    [draggingId],
  );

  const scheduleClearJustDragged = useCallback(() => {
    if (clearJustDraggedTimeoutRef.current) {
      clearTimeout(clearJustDraggedTimeoutRef.current);
    }
    clearJustDraggedTimeoutRef.current = setTimeout(() => {
      justDraggedRef.current = false;
    }, 300);
  }, []);

  const handleDrop = useCallback(() => {
    if (draggingId && dropTarget && dropTarget.id !== draggingId) {
      const ids = orderedItems.map((item) => item._id);
      const withoutDragged = ids.filter((id) => id !== draggingId);
      const targetIndex = withoutDragged.indexOf(dropTarget.id);
      const insertAt =
        dropTarget.position === "before" ? targetIndex : targetIndex + 1;
      withoutDragged.splice(insertAt, 0, draggingId);
      persist(withoutDragged);
    }
    setDraggingId(null);
    setDropTarget(null);
    setDraggedSize(null);
    scheduleClearJustDragged();
  }, [draggingId, dropTarget, orderedItems, persist, scheduleClearJustDragged]);

  const handleDragEnd = useCallback(() => {
    // Fallback cleanup in case the drop lands outside a valid target.
    setDraggingId(null);
    setDropTarget(null);
    setDraggedSize(null);
    scheduleClearJustDragged();
  }, [scheduleClearJustDragged]);

  return {
    orderedItems,
    draggingId,
    dropTarget,
    draggedSize,
    justDraggedRef,
    handleDragStart,
    handleDragOverItem,
    handleDrop,
    handleDragEnd,
  };
}

const DAY_MS = 86400000;
const MONTH_LABELS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

function startOfDay(value: Date | number) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function daysBetween(a: Date, b: Date) {
  return Math.round(
    (startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY_MS,
  );
}

const CALENDAR_ZOOM_CONFIG: Record<
  CalendarZoom,
  { pxPerDay: number; tickStepDays: number; label: string; shortcut: string }
> = {
  week: { pxPerDay: 120, tickStepDays: 1, label: "Week", shortcut: "W" },
  month: { pxPerDay: 40, tickStepDays: 2, label: "Month", shortcut: "M" },
  quarter: { pxPerDay: 16, tickStepDays: 7, label: "Quarter", shortcut: "Q" },
  year: { pxPerDay: 6, tickStepDays: 14, label: "Year", shortcut: "Y" },
};

const CALENDAR_ZOOM_ORDER: CalendarZoom[] = [
  "year",
  "quarter",
  "month",
  "week",
];

const CALENDAR_ZOOM_PADDING_DAYS: Record<CalendarZoom, number> = {
  week: 10,
  month: 20,
  quarter: 45,
  year: 150,
};

function TableTab({ table }: { table: any }) {
  const deleteTooltip = useHoverTooltip(100);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [editedName, setEditedName] = useState(table.name || "Untitled");
  const [isHovered, setIsHovered] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({
    x: 0,
    y: 0,
  });
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
      setIsRenameOpen(true);
    },
    [table.name],
  );

  useEffect(() => {
    setEditedName(table.name || "Untitled");
  }, [table.name]);

  useEffect(() => {
    if (!isRenameOpen) return;
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      input.focus();
      input.select();
      input.scrollLeft = 0;
    });
  }, [isRenameOpen]);

  const handleRenameSave = useCallback(async () => {
    const result = tableNameSchema.safeParse(editedName.trim());
    if (!result.success) {
      setEditedName(table.name || "Untitled");
      setIsRenameOpen(false);
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
    setIsRenameOpen(false);
    setIsHovered(false);
  }, [editedName, table.name, table._id, updateTable]);

  const handleRenameCancel = useCallback(() => {
    setEditedName(table.name || "Untitled");
    setIsRenameOpen(false);
    setIsHovered(false);
  }, [table.name]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        void handleRenameSave();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleRenameCancel();
      }
    },
    [handleRenameCancel, handleRenameSave],
  );
  const handleContentMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleContentMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  const textClassName = isHovered
    ? "truncate flex-grow bg-gradient-to-r from-foreground from-80% via-transparent via-90% to-transparent to-100% text-transparent bg-clip-text"
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

  return (
    <>
      <div
        className=" relative flex-shrink-0 overflow-hidden group/tab hover:bg-card app-radius-lg min-w-44"
        onMouseEnter={handleContentMouseEnter}
        onMouseLeave={handleContentMouseLeave}
      >
        {isRenameOpen ? (
          <div className=" relative flex items-center gap-1.5 px-2 py-2 app-radius-lg w-full border-2 border-border border-b-0 bg-card">
            <Input
              ref={inputRef as any}
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => void handleRenameSave()}
              placeholder="Rename table"
              aria-label="rename-table-input"
              className="h-6 flex-grow border-none bg-transparent px-1 py-0 shadow-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        ) : (
          <TabsTrigger
            value={table._id}
            data-tab-id={table._id}
            className=" px-4 py-2.5 app-radius-lg w-full text-start whitespace-nowrap flex items-center gap-1.5 border-2 border-transparent border-b-0 data-[state=active]:border-border"
            onDoubleClick={handleDoubleClick}
            onContextMenu={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setContextMenuPosition({ x: event.clientX, y: event.clientY });
              setContextMenuOpen(false);
              requestAnimationFrame(() => setContextMenuOpen(true));
            }}
            aria-label="rename-table"
          >
            <p className={cn(textClassName, "w-full")}>
              {formatTableName(table.name)}
            </p>
          </TabsTrigger>
        )}
        <div
          className={cn(
            "absolute inset-y-0 right-2 flex items-center",
            isHovered && !isRenameOpen
              ? "opacity-100 "
              : "opacity-0 pointer-events-none",
          )}
        >
          <Tooltip open={deleteTooltip.open}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                onClick={(e) => {
                  if (e.button === 0 && e.shiftKey) {
                    e.preventDefault();
                    handleDelete();
                  } else {
                    setIsDeleteAlertOpen(true);
                  }
                }}
                className=" px-1.5 h-7 text-foreground hover:text-destructive"
                aria-label="delete-table"
                {...deleteTooltip.triggerProps}
              >
                <X size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              className=" !app-radius-none"
              side="right"
              sideOffset={5}
            >
              Delete table
            </TooltipContent>
          </Tooltip>
        </div>

        <DropdownMenu open={contextMenuOpen} onOpenChange={setContextMenuOpen}>
          <DropdownMenuTrigger asChild>
            <span
              aria-hidden
              style={{
                position: "fixed",
                left: contextMenuPosition.x,
                top: contextMenuPosition.y,
                width: 0,
                height: 0,
                pointerEvents: "none",
              }}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side="bottom"
            className="z-[10000] w-40"
          >
            <DropdownMenuItem
              onClick={() => {
                setEditedName(table.name || "Untitled");
                setIsRenameOpen(true);
                setContextMenuOpen(false);
              }}
            >
              Rename table
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="hover:text-destructive"
              onClick={() => {
                setContextMenuOpen(false);
                setIsDeleteAlertOpen(true);
              }}
            >
              Delete table
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
          <p>
            if you don't wanna see again hold
            <span className=" mx-1 text-xs pointer-events-none border border-border inline-flex h-5 select-none items-center gap-1 app-radius-md bg-card px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              Shift
            </span>
            when you delete and it will be deleted without confirmation.
          </p>
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
          </AlertDialogFooter>{" "}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface SliderTabsListProps {
  tables: any[];
  activeTableId: string;
  onTabChange: (id: string) => void;
  workingSpaceId: string;
}

function SliderTabsList({
  tables,
  activeTableId,
  onTabChange,
  workingSpaceId,
}: SliderTabsListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const canScroll = canScrollLeft || canScrollRight;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const saved = sessionStorage.getItem("slider-tabs-scrollX");
    if (saved) el.scrollLeft = parseInt(saved);
  }, []);

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

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    sessionStorage.setItem("slider-tabs-scrollX", String(el.scrollLeft));
    checkScroll();
  }, [checkScroll]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.6;
    el.scrollBy({
      left: dir === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  const {
    orderedItems: orderedTables,
    draggingId,
    dropTarget,
    draggedSize,
    handleDragStart,
    handleDragOverItem,
    handleDrop,
    handleDragEnd,
  } = useClientSideOrder(
    `${STORAGE_KEYS.CUSTOM_ORDER_PREFIX}tabs_${workingSpaceId}`,
    tables,
  );

  return (
    <div className=" relative py-2.5">
      <div className="absolute -top-6 left-0 w-full">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => scroll("left")}
          aria-label="scroll-tabs-left"
          className={cn(
            "absolute left-1 top-1/2 -translate-y-1/2 z-10 h-8 app-radius-md w-7 shadow-sm transition-all duration-200 !app-radius-none",
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
          aria-label="scroll-tabs-right"
          className={cn(
            "absolute right-1 top-1/2 -translate-y-1/2 z-10 h-8 app-radius-md w-7 shadow-sm transition-all duration-200 !app-radius-none",
            canScrollRight
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none",
          )}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>

        <div
          className="absolute left-0 top-0 bottom-0 w-32 z-[5] pointer-events-none transition-opacity duration-200"
          style={{
            opacity: canScrollLeft ? 1 : 0,
            background:
              "linear-gradient(to right, hsl(var(--muted)) 20%, transparent)",
          }}
        />
        <div
          className="absolute right-0 top-0 bottom-0 w-32 z-[5] pointer-events-none transition-opacity duration-200"
          style={{
            opacity: canScrollRight ? 1 : 0,
            background:
              "linear-gradient(to left, hsl(var(--muted)) 20%, transparent)",
          }}
        />

        <TabsList
          className="flex justify-start items-center px-1 pt-8 pb-5 bg-muted !app-radius-none border border-border border-b-0 w-full"
          style={{ overflow: "clip" } as React.CSSProperties}
        >
          <div className=" z-8000 absolute bottom-0 left-0 w-full h-[2px] bg-border" />
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
            {orderedTables.map((table) => (
              <Fragment key={table._id}>
                {dropTarget?.id === table._id &&
                  dropTarget?.position === "before" && (
                    <div
                      className="self-stretch app-radius-md border border-dashed border-muted-foreground/50 bg-muted shrink-0"
                      style={{ width: draggedSize?.width ?? 128 }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleDrop();
                      }}
                    />
                  )}
                <div
                  draggable
                  onDragStart={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setCardDragImage(e, table._id);
                    handleDragStart(table._id, {
                      width: rect.width,
                      height: rect.height,
                    });
                  }}
                  onDragOver={(e) => handleDragOverItem(e, table._id)}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDrop();
                  }}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "cursor-grab active:cursor-grabbing",
                    draggingId === table._id && "opacity-70 transition-opacity",
                  )}
                >
                  <TableTab data-table-id={table._id} table={table} />
                </div>
                {dropTarget?.id === table._id &&
                  dropTarget?.position === "after" && (
                    <div
                      className="self-stretch app-radius-md border border-dashed border-muted-foreground/50 bg-muted shrink-0"
                      style={{ width: draggedSize?.width ?? 128 }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleDrop();
                      }}
                    />
                  )}
              </Fragment>
            ))}
          </div>
        </TabsList>
      </div>
    </div>
  );
}

export default function WorkingSpacePageClient({
  workingSpaceId,
  renderedInPane = false,
}: {
  workingSpaceId: Id<"workingSpaces">;
  renderedInPane?: boolean;
}) {
  const cached = workspacePageMemoryCache.get(
    workingSpaceId as unknown as string,
  );
  const workspaceQuery = useQuery(
    api.workingSpaces.getWorkingSpaceById,
    workingSpaceId ? { _id: workingSpaceId } : "skip",
  ) as any;
  const tablesQuery = useQuery(
    api.notesTables.getTables,
    workingSpaceId ? { workingSpaceId } : "skip",
  ) as any;

  const workspace = workspaceQuery ?? cached?.workspace;
  const workingSpacesSlug: string | undefined =
    workspace && (workspace.slug as string);

  const tables = tablesQuery !== undefined ? tablesQuery : cached?.tables;
  const { toast } = useToast();
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
      const inputRef = nameInputRef.current;
      if (!inputRef) return;
      inputRef.focus();
      inputRef.select();
      inputRef.scrollLeft = 0;
    });
  }, [workspace]);

  const handleNameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        setIsEditingName(false);
      } else if (e.key === "Escape") {
        setIsEditingName(false);
        setEditedName(workspace?.name || "Untitled");
      }
    },
    [workspace?.name],
  );

  const debouncedUpdateWorkSpaceName = useDebouncedCallback(
    (workspaceName: string) => {
      const currentTitle = workspace?.name || "";
      const result = workspaceNameSchema.safeParse(workspaceName);

      if (!result.success) {
        const issue = result.error.issues[0];
        if (issue.code === "too_small") {
          setEditedName("");
          toast({
            title: "Naming failed",
            description: "Name must not be empty.",
            variant: "destructive",
          });
        } else if (issue.code === "too_big") {
          setEditedName(workspace?.name || "Untitled");
          toast({
            title: "Naming failed",
            description: "Name must be 30 characters or less ",
            variant: "destructive",
          });
        }
        return;
      }

      if (workspaceName !== currentTitle) {
        try {
          updateWorkingSpace({ _id: workingSpaceId, name: workspaceName });
          if (renderedInPane) {
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.set(
              "paneTitle",
              generateSlug(workspaceName),
            );
            window.history.replaceState({}, "", currentUrl.href);
          }
        } catch (error) {
          console.error("Error updating workspace name:", error);
        }
      }
    },
    100,
  );

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEYS.VIEW_MODE);
      return stored === "list" || stored === "grid" || stored === "calendar"
        ? stored
        : "grid";
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

  const isMobile = getMediaQuery();

  useEffect(() => {
    if (isMobile && viewMode === "grid") {
      setViewMode("list");
    }
  }, [isMobile, viewMode]);

  return (
    <MaxWContainer className="grid grid-cols-1 max-w-full">
      <header>
        <div className="border border-border bg-muted app-radius-md flex justify-between items-end w-full">
          <div className="flex-1 px-1.5">
            <h1 className="text-2xl md:text-5xl font-bol my-3 h-[2rem] md:h-[4rem] ">
              {!workspace ? (
                <div className="bg-border app-radius-md animate-pulse h-10 w-64 inline-block" />
              ) : isEditingName ? (
                <Input
                  ref={nameInputRef as any}
                  value={editedName}
                  onChange={(e: any) => {
                    setEditedName(e.target.value);
                    debouncedUpdateWorkSpaceName(e.target.value.trim());
                  }}
                  onKeyDown={handleNameKeyDown}
                  onBlur={() => {
                    setEditedName(editedName);
                    setIsEditingName(false);
                  }}
                  placeholder="Untitled WorkSpace"
                  className="min-w-fit max-w-3xl placeholder:text-muted-foreground/50 border-transparent bg-transparent px-2 h-[2rem] md:h-[4rem] text-2xl md:text-5xl focus-visible:ring-0 focus-visible:outline-none focus-visible:ring-offset-0 "
                />
              ) : (
                <span
                  onDoubleClick={handleNameDoubleClick}
                  className="cursor-text app-radius-md border border-transparent px-2 hover:border-muted-foreground/50 leading-normal md:leading-[4rem]"
                >
                  {workspace.name.length > 20 && isMobile
                    ? `${workspace.name.slice(0, 17)}...`
                    : workspace.name}
                </span>
              )}
            </h1>
          </div>
          {workspace && tables?.length !== 0 && (
            <CreateTableBtn
              label="New Table"
              workingSpaceId={workingSpaceId}
              className=" h-9 app-radius-none "
              aria-label="create-table"
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
                workingSpaceId={workingSpaceId as unknown as string}
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
  const {
    results: noteResults,
    status: notesStatus,
    loadMore: loadMoreNotes,
  } = usePaginatedQuery(
    api.notes.getNotesByTableId,
    { notesTableId: tableId },
    { initialNumItems: 5 },
  );
  const {
    results: pdfResults,
    status: pdfsStatus,
    loadMore: loadMorePdfs,
  } = usePaginatedQuery(
    api.pdfs.getPdfsByTableId,
    { notesTableId: tableId },
    { initialNumItems: 5 },
  ) as {
    results: Array<Omit<PdfItem, "kind"> & { fileUrl?: string | null }>;
    status: "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted";
    loadMore: (numItems: number) => void;
  };
  const {
    results: linkResults,
    status: linksStatus,
    loadMore: loadMoreLinks,
  } = usePaginatedQuery(
    api.links.getLinksByTableId,
    { notesTableId: tableId },
    { initialNumItems: 5 },
  ) as {
    results: Array<Omit<LinkItem, "kind">>;
    status: "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted";
    loadMore: (numItems: number) => void;
  };
  const {
    results: whiteboardResults,
    status: whiteboardsStatus,
    loadMore: loadMoreWhiteboards,
  } = usePaginatedQuery(
    api.whiteboards.getWhiteboardsByTableId,
    { notesTableId: tableId },
    { initialNumItems: 5 },
  ) as {
    results: Array<Omit<WhiteboardItem, "kind">>;
    status: "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted";
    loadMore: (numItems: number) => void;
  };

  const cachedNotes = tableNotesMemoryCache.get(tableId as unknown as string);
  useEffect(() => {
    if (notesStatus !== "LoadingFirstPage") {
      tableNotesMemoryCache.set(tableId as unknown as string, noteResults);
    }
  }, [noteResults, notesStatus, tableId]);
  const stableResults =
    notesStatus === "LoadingFirstPage" && cachedNotes
      ? cachedNotes
      : noteResults;

  const cachedPdfs = tablePdfsMemoryCache.get(tableId as unknown as string);
  useEffect(() => {
    if (pdfsStatus !== "LoadingFirstPage") {
      tablePdfsMemoryCache.set(tableId as unknown as string, pdfResults);
    }
  }, [pdfResults, pdfsStatus, tableId]);
  const stablePdfs =
    pdfsStatus === "LoadingFirstPage" && cachedPdfs ? cachedPdfs : pdfResults;

  const cachedLinks = tableLinksMemoryCache.get(tableId as unknown as string);
  useEffect(() => {
    if (linksStatus !== "LoadingFirstPage") {
      tableLinksMemoryCache.set(tableId as unknown as string, linkResults);
    }
  }, [linkResults, linksStatus, tableId]);
  const stableLinks =
    linksStatus === "LoadingFirstPage" && cachedLinks
      ? cachedLinks
      : linkResults;

  const cachedWhiteboards = tableWhiteboardsMemoryCache.get(
    tableId as unknown as string,
  );
  useEffect(() => {
    if (whiteboardsStatus !== "LoadingFirstPage") {
      tableWhiteboardsMemoryCache.set(
        tableId as unknown as string,
        whiteboardResults,
      );
    }
  }, [tableId, whiteboardResults, whiteboardsStatus]);
  const stableWhiteboards =
    whiteboardsStatus === "LoadingFirstPage" && cachedWhiteboards
      ? cachedWhiteboards
      : whiteboardResults;

  // Single combined pagination state driving one "Show More" button for
  // notes + pdfs + links + whiteboards together.
  const aggregateStatus:
    | "LoadingFirstPage"
    | "CanLoadMore"
    | "LoadingMore"
    | "Exhausted" =
    notesStatus === "LoadingFirstPage" &&
    !cachedNotes &&
    pdfsStatus === "LoadingFirstPage" &&
    !cachedPdfs &&
    linksStatus === "LoadingFirstPage" &&
    !cachedLinks &&
    whiteboardsStatus === "LoadingFirstPage" &&
    !cachedWhiteboards
      ? "LoadingFirstPage"
      : [notesStatus, pdfsStatus, linksStatus, whiteboardsStatus].some(
            (s) => s === "CanLoadMore",
          )
        ? "CanLoadMore"
        : [notesStatus, pdfsStatus, linksStatus, whiteboardsStatus].some(
              (s) => s === "LoadingMore",
            )
          ? "LoadingMore"
          : "Exhausted";

  const handleLoadMore = useCallback(() => {
    if (notesStatus === "CanLoadMore") loadMoreNotes(15);
    if (pdfsStatus === "CanLoadMore") loadMorePdfs(15);
    if (linksStatus === "CanLoadMore") loadMoreLinks(15);
    if (whiteboardsStatus === "CanLoadMore") loadMoreWhiteboards(15);
  }, [
    notesStatus,
    pdfsStatus,
    linksStatus,
    loadMoreNotes,
    loadMorePdfs,
    loadMoreLinks,
    loadMoreWhiteboards,
    whiteboardsStatus,
  ]);

  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (viewMode === "calendar") return;
    if (aggregateStatus !== "CanLoadMore") return;

    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          handleLoadMore();
        }
      },
      { rootMargin: "400px 0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [viewMode, aggregateStatus, handleLoadMore]);

  const [deletedItemIds, setDeletedItemIds] = useState<Set<string>>(new Set());
  const [contentFilter, setContentFilter] = useState<ContentFilter>("all");
  const [subFilterValue, setSubFilterValue] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "/") return;

      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const isTyping =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        target?.isContentEditable ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey;

      if (isTyping) return;

      e.preventDefault();
      searchInputRef.current?.focus();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    setDeletedItemIds(new Set());
    setContentFilter("all");
    setSubFilterValue(null);
  }, [tableId]);

  const linkGroupsByFilter = useMemo(() => {
    const map: Partial<Record<ContentFilter, LinkFilterGroup[]>> = {};

    GROUPABLE_LINK_FILTERS.forEach((filter) => {
      const matched = stableLinks.filter((link) =>
        matchesLinkPlatform((link as LinkItem).platform, filter),
      );

      const counts = new Map<
        string,
        {
          label: string;
          handle?: string;
          avatarUrl?: string;
          sampleUrl: string;
          count: number;
        }
      >();

      matched.forEach((rawLink) => {
        const link = rawLink as LinkItem;
        const key = getLinkGroupKey(link, filter);
        if (!key) return;
        const label = getLinkGroupLabel(link, filter) ?? key;
        const existing = counts.get(key);
        if (existing) {
          existing.count += 1;
          if (!existing.avatarUrl && link.metadata?.authorAvatarUrl) {
            existing.avatarUrl = link.metadata.authorAvatarUrl;
          }
          if (!existing.handle && link.metadata?.authorHandle) {
            existing.handle = link.metadata.authorHandle;
          }
        } else {
          counts.set(key, {
            label,
            handle: filter === "link" ? undefined : link.metadata?.authorHandle,
            avatarUrl:
              filter === "link" ? undefined : link.metadata?.authorAvatarUrl,
            sampleUrl: link.url,
            count: 1,
          });
        }
      });

      const groups = Array.from(counts.entries())
        .map(([key, v]) => ({ key, ...v }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

      if (groups.length > 1) {
        map[filter] = groups;
      }
    });

    return map;
  }, [stableLinks]);

  const filteredItems = useMemo(() => {
    const noteItems = stableResults.map(
      (note) => ({ ...note, kind: "note" }) as WorkspaceEntry,
    );
    const pdfItems = stablePdfs.map(
      (pdf) => ({ ...pdf, kind: "pdf" }) as WorkspaceEntry,
    );
    const linkItems = stableLinks.map(
      (link) => ({ ...link, kind: "link" }) as WorkspaceEntry,
    );
    const whiteboardItems = stableWhiteboards.map(
      (whiteboard) => ({ ...whiteboard, kind: "whiteboard" }) as WorkspaceEntry,
    );
    let items = [...noteItems, ...pdfItems, ...linkItems, ...whiteboardItems]
      .filter((item) => item && !deletedItemIds.has(item._id))
      .sort((a, b) => b.updatedAt - a.updatedAt);

    if (contentFilter !== "all") {
      items = items.filter((item) => {
        if (contentFilter === "note") return item.kind === "note";
        if (contentFilter === "pdf") return item.kind === "pdf";
        if (contentFilter === "whiteboard") return item.kind === "whiteboard";
        if (item.kind !== "link") return false;
        return matchesLinkPlatform(item.platform, contentFilter);
      });

      if (subFilterValue && GROUPABLE_LINK_FILTERS.has(contentFilter)) {
        items = items.filter(
          (item) =>
            item.kind === "link" &&
            getLinkGroupKey(item as LinkItem, contentFilter) === subFilterValue,
        );
      }
    }

    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter((item) => {
      const titleMatches = item.title?.toLowerCase().includes(q);
      if (item.kind === "pdf") return titleMatches;
      if (item.kind === "whiteboard") {
        return titleMatches || item.preview?.toLowerCase().includes(q);
      }
      if (item.kind === "link") {
        if (titleMatches || item.url.toLowerCase().includes(q)) return true;
        const metadata = item.metadata;
        if (!metadata) return false;
        return (
          metadata.authorName?.toLowerCase().includes(q) ||
          metadata.authorHandle?.toLowerCase().includes(q) ||
          metadata.siteName?.toLowerCase().includes(q) ||
          metadata.description?.toLowerCase().includes(q) ||
          false
        );
      }

      const searchableText = (item.preview ?? item.body ?? "").toLowerCase();
      return titleMatches || searchableText.includes(q);
    });
  }, [
    contentFilter,
    subFilterValue,
    deletedItemIds,
    stableLinks,
    stablePdfs,
    stableWhiteboards,
    searchQuery,
    stableResults,
  ]);

  const handleItemDelete = useCallback((itemId: string) => {
    setDeletedItemIds((prev) => {
      const newSet = new Set(prev);
      newSet.add(itemId);
      return newSet;
    });
  }, []);
  const isMobile = getMediaQuery();
  const isGridLayout = viewMode === "grid" || isMobile;
  const [numColumns, gridContainerRef] = useContainerColumnCount(isGridLayout);

  const {
    orderedItems,
    draggingId,
    dropTarget,
    draggedSize,
    justDraggedRef,
    handleDragStart,
    handleDragOverItem,
    handleDrop,
    handleDragEnd,
  } = useClientSideOrder(
    `${STORAGE_KEYS.CUSTOM_ORDER_PREFIX}${tableId}`,
    filteredItems,
    { newItemPosition: "start" },
  );
  const displayItems =
    searchQuery.trim() || contentFilter !== "all" || subFilterValue
      ? filteredItems
      : orderedItems;

  return (
    <div
      ref={gridContainerRef}
      className="grid grid-cols-1 gap-6 w-full max-w-full"
    >
      <div className="flex flex-wrap gap-y-2 gap-x-4 items-start sm:items-center justify-between sticky -top-3.5 z-30">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative flex-1 min-w-0 md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 mt-px text-foreground" />
            <Input
              ref={searchInputRef as any}
              type="text"
              placeholder="Search notes and uploads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              className="pl-10 pr-9 border-border h-[37px] my-0 !app-radius-none bg-background"
              aria-label="search-notes"
            />
            {!isSearchFocused && !searchQuery && (
              <kbd className="pointer-events-none leading-4 absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex h-5 min-w-5 items-center justify-center app-radius-md border border-border bg-muted px-1 font-mono text-[11px] text-muted-foreground">
                /
              </kbd>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 w-auto justify-end">
          <div className="flex h-9 items-center border border-border app-radius-none overflow-hidden">
            {!isMobile && (
              <Button
                variant="SidebarMenuButton"
                size="sm"
                className={cn(
                  "!app-radius-none bg-background hover:bg-muted",
                  viewMode === "grid" && "bg-muted",
                )}
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid
                  className={`h-3.5 w-3.5 ${viewMode === "grid" && "text-foreground"}`}
                />
              </Button>
            )}
            <Button
              variant="SidebarMenuButton"
              size="sm"
              className={cn(
                "!app-radius-none bg-background hover:bg-muted",
                !isMobile && "border border-l-border border-r-border",
                viewMode === "list" && "bg-muted",
              )}
              onClick={() => setViewMode("list")}
            >
              <List
                className={`h-3.5 w-3.5 ${viewMode === "list" && "text-foreground"}`}
              />
            </Button>
            <Button
              variant="SidebarMenuButton"
              size="sm"
              className={cn(
                "!app-radius-none bg-background hover:bg-muted",
                viewMode === "calendar" && "bg-muted",
              )}
              onClick={() => setViewMode("calendar")}
              aria-label="calendar-view"
            >
              <Calendar
                className={`h-3.5 w-3.5 ${viewMode === "calendar" && "text-foreground"}`}
              />
            </Button>
          </div>
          <CreateNoteBtn
            workingSpaceId={workspaceId}
            workingSpacesSlug={workspaceSlug}
            CNBP_notesTableId={tableId}
          />
          <DropdownMenu open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  "h-9 shrink-0 border-border gap-1.5 !app-radius-none",
                  contentFilter !== "all" && "bg-muted",
                )}
                aria-label="filter-content"
              >
                <Filter className="h-3.5 w-3.5" />
                <span className="hidden sm:inline truncate max-w-[9rem] items-center gap-1.5 ">
                  <span className="truncate">
                    {CONTENT_FILTER_OPTIONS.find(
                      (o) => o.value === contentFilter,
                    )?.label ?? "All"}
                    {subFilterValue
                      ? ` · ${
                          linkGroupsByFilter[contentFilter]?.find(
                            (g) => g.key === subFilterValue,
                          )?.label ?? subFilterValue
                        }`
                      : ""}
                  </span>
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {CONTENT_FILTER_OPTIONS.map((option) => {
                const groups = linkGroupsByFilter[option.value];
                const hasGroups = Boolean(groups && groups.length > 0);
                const isActiveCategory = contentFilter === option.value;

                if (!hasGroups) {
                  return (
                    <DropdownMenuItem
                      key={option.value}
                      className={cn(
                        "gap-2",
                        isActiveCategory && !subFilterValue && "bg-muted",
                      )}
                      onSelect={() => {
                        setContentFilter(option.value);
                        setSubFilterValue(null);
                      }}
                    >
                      <option.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{option.label}</span>
                      {isActiveCategory && !subFilterValue ? (
                        <Check className="ml-auto h-3.5 w-3.5 shrink-0" />
                      ) : null}
                    </DropdownMenuItem>
                  );
                }

                return (
                  <DropdownMenuSub key={option.value}>
                    <DropdownMenuSubTrigger
                      className={cn(
                        "gap-2",
                        isActiveCategory && !subFilterValue && "bg-muted",
                      )}
                    >
                      <option.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{option.label}</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-64 max-h-80 overflow-y-auto [&::-webkit-scrollbar]:w-[0.4rem] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border">
                      <DropdownMenuItem
                        className={cn(
                          "gap-2 px-2.5",
                          isActiveCategory && !subFilterValue && "bg-muted",
                        )}
                        onSelect={() => {
                          setContentFilter(option.value);
                          setSubFilterValue(null);
                        }}
                      >
                        <option.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">All {option.label}</span>
                        {isActiveCategory && !subFilterValue ? (
                          <Check className="ml-auto h-3.5 w-3.5 shrink-0" />
                        ) : null}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {groups!.map((group) => {
                        const isActiveGroup =
                          isActiveCategory && subFilterValue === group.key;
                        return (
                          <DropdownMenuItem
                            key={group.key}
                            className={cn(
                              "gap-2 py-1.5",
                              isActiveGroup && "bg-muted",
                            )}
                            onSelect={() => {
                              setContentFilter(option.value);
                              setSubFilterValue(group.key);
                            }}
                          >
                            {option.value === "link" ? (
                              <LinkFaviconBadge
                                url={group.sampleUrl ?? ""}
                                className="h-6 w-6 shrink-0"
                              />
                            ) : (
                              <GroupAvatar
                                avatarUrl={group.avatarUrl}
                                label={group.label}
                              />
                            )}
                            <div className="flex flex-col items-start min-w-0 flex-1">
                              <span className="text-xs font-medium truncate w-full text-left">
                                {group.label}
                              </span>
                              {option.value !== "link" &&
                              formatHandle(group.handle) ? (
                                <span className="text-[10px] text-muted-foreground truncate w-full text-left">
                                  {formatHandle(group.handle)}
                                </span>
                              ) : null}
                            </div>
                            <span className="text-[10px] text-muted-foreground shrink-0 pl-1">
                              {group.count}
                            </span>
                            {isActiveGroup ? (
                              <Check className="h-3 w-3 shrink-0" />
                            ) : null}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          <TableSettings
            notesTableId={tableId}
            tableName={tables?.find((t) => t._id === tableId)?.name}
          />
        </div>
      </div>

      {aggregateStatus === "LoadingFirstPage" ? (
        <NotesSkeleton viewMode={viewMode} />
      ) : (searchQuery || contentFilter !== "all") &&
        filteredItems.length === 0 ? (
        <EmptySearchResults
          searchQuery={
            searchQuery.trim()
              ? searchQuery
              : (subFilterValue &&
                  linkGroupsByFilter[contentFilter]?.find(
                    (g) => g.key === subFilterValue,
                  )?.label) ||
                (CONTENT_FILTER_OPTIONS.find((o) => o.value === contentFilter)
                  ?.label ??
                  "filter")
          }
          onClearSearch={() => {
            setSearchQuery("");
            setContentFilter("all");
            setSubFilterValue(null);
          }}
        />
      ) : filteredItems.length === 0 ? (
        <EmptyTableState
          tableId={tableId}
          workspaceSlug={workspaceSlug}
          workspaceId={workspaceId}
        />
      ) : (
        <>
          {viewMode === "calendar" ? (
            <CalendarTimelineView
              items={filteredItems}
              workspaceId={workspaceId}
              paginationStatus={aggregateStatus}
              onLoadMore={handleLoadMore}
            />
          ) : (
            (() => {
              const renderItem = (item: (typeof displayItems)[number]) => {
                const draggableEnabled =
                  !searchQuery.trim() && contentFilter === "all";
                // List cards are inset with mx-6 md:mx-12 xl:mx-32, so the
                // placeholder needs the same inset (as padding, so the whole
                // row stays a valid drop zone) or it spans edge to edge.
                const dropPlaceholder = (
                  <div
                    className={cn(
                      "w-full shrink-0",
                      !isGridLayout && "px-6 md:px-12 xl:px-32",
                    )}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDrop();
                    }}
                  >
                    <div
                      className="app-radius-md border border-dashed border-muted-foreground/50 bg-muted w-full"
                      style={{ height: draggedSize?.height ?? 96 }}
                    />
                  </div>
                );
                return (
                  <Fragment key={item._id}>
                    {dropTarget?.id === item._id &&
                      dropTarget.position === "before" &&
                      dropPlaceholder}
                    <div
                      draggable={draggableEnabled}
                      onDragStart={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setCardDragImage(e, item._id);
                        handleDragStart(item._id, {
                          width: rect.width,
                          height: rect.height,
                        });
                      }}
                      onDragOver={(e) => handleDragOverItem(e, item._id)}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleDrop();
                      }}
                      onDragEnd={handleDragEnd}
                      onClickCapture={(e) => {
                        // Some browsers fire a stray click/dblclick right
                        // after a drop lands - don't let that also open the
                        // card that was just being reordered.
                        if (justDraggedRef.current) {
                          e.preventDefault();
                          e.stopPropagation();
                        }
                      }}
                      onDoubleClickCapture={(e) => {
                        if (justDraggedRef.current) {
                          e.preventDefault();
                          e.stopPropagation();
                        }
                      }}
                      className={cn(
                        draggableEnabled &&
                          "cursor-grab active:cursor-grabbing",
                        draggingId === item._id &&
                          "opacity-70 transition-opacity",
                      )}
                    >
                      {isGridLayout ? (
                        <WorkspaceGridCard
                          item={item}
                          workspaceId={workspaceId}
                          onDelete={handleItemDelete}
                          searchQuery={searchQuery}
                        />
                      ) : (
                        <div className=" mx-6 md:mx-12 xl:mx-32">
                          <WorkspaceListCard
                            item={item}
                            workspaceId={workspaceId}
                            onDelete={handleItemDelete}
                            searchQuery={searchQuery}
                          />
                        </div>
                      )}
                    </div>
                    {dropTarget?.id === item._id &&
                      dropTarget.position === "after" &&
                      dropPlaceholder}
                  </Fragment>
                );
              };

              if (!isGridLayout) {
                return (
                  <div className="flex flex-col gap-3">
                    {displayItems.map((item) => renderItem(item))}
                  </div>
                );
              }

              const columnItems: (typeof displayItems)[number][][] = Array.from(
                { length: numColumns },
                () => [],
              );
              displayItems.forEach((item, index) => {
                columnItems[index % numColumns].push(item);
              });

              return (
                <div className="flex gap-4 items-start w-full max-w-full">
                  {columnItems.map((column, colIndex) => (
                    <div
                      key={colIndex}
                      className="flex flex-col gap-4 flex-1 min-w-0"
                    >
                      {column.map((item) => renderItem(item))}
                    </div>
                  ))}
                </div>
              );
            })()
          )}

          {viewMode !== "calendar" &&
            (aggregateStatus === "CanLoadMore" ||
              aggregateStatus === "LoadingMore") && (
              <div
                ref={loadMoreSentinelRef}
                className="flex justify-center mt-6 h-9"
                aria-label="load-more-items"
              >
                {aggregateStatus === "LoadingMore" && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <LoadingAnimation className="h-4 w-4" />
                    Loading...
                  </div>
                )}
              </div>
            )}
        </>
      )}
    </div>
  );
}

const CALENDAR_CARD_WIDTH = 168;
const CALENDAR_CLUSTER_GAP = 14;
const CALENDAR_COLLAPSE_EMPTY_DAYS = 6;
const CALENDAR_GAP_MARKER_WIDTH = 28; // matches the w-7 marker button
const CALENDAR_GAP_MIN_SAVINGS = 80; // px a gap must save to be worth collapsing

function CalendarTimelineView({
  items,
  workspaceId,
  paginationStatus,
  onLoadMore,
}: {
  items: WorkspaceEntry[];
  workspaceId?: Id<"workingSpaces">;
  paginationStatus: string;
  onLoadMore: () => void;
}) {
  const [zoom, setZoom] = useState<CalendarZoom>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEYS.CALENDAR_ZOOM);
      if (
        stored === "week" ||
        stored === "month" ||
        stored === "quarter" ||
        stored === "year"
      ) {
        return stored;
      }
    }
    return "year";
  });
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [openClusterId, setOpenClusterId] = useState<string | null>(null);
  const [expandedGapIds, setExpandedGapIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasScrolledOnceRef = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.CALENDAR_ZOOM, zoom);
    }
  }, [zoom]);

  const config = CALENDAR_ZOOM_CONFIG[zoom];
  const today = useMemo(() => startOfDay(Date.now()), []);

  const { startDate, endDate } = useMemo(() => {
    const pad = CALENDAR_ZOOM_PADDING_DAYS[zoom];
    let earliest = today;
    let latest = today;
    for (const item of items) {
      const d = startOfDay(item.createdAt);
      if (d.getTime() < earliest.getTime()) earliest = d;
      if (d.getTime() > latest.getTime()) latest = d;
    }
    const rangeStart = addDays(
      earliest.getTime() < today.getTime() ? earliest : today,
      -pad,
    );
    const rangeEnd = addDays(
      latest.getTime() > today.getTime() ? latest : today,
      pad,
    );
    return { startDate: rangeStart, endDate: rangeEnd };
  }, [items, today, zoom]);

  const totalDays = Math.max(1, daysBetween(startDate, endDate));
  const timelineScale = useMemo(() => {
    const todayDayOffset = daysBetween(startDate, today);
    const itemDayOffsets = Array.from(
      new Set(
        [
          ...items.map((item) =>
            daysBetween(startDate, startOfDay(item.createdAt)),
          ),
          todayDayOffset,
        ].filter((offset) => offset >= 0 && offset <= totalDays),
      ),
    ).sort((a, b) => a - b);

    const collapsedGapWidth = Math.max(
      CALENDAR_CARD_WIDTH +
        CALENDAR_CLUSTER_GAP * 2 +
        CALENDAR_GAP_MARKER_WIDTH,
      config.pxPerDay * 2,
    );

    const largeGaps = itemDayOffsets.flatMap((startDay, index) => {
      const endDay = itemDayOffsets[index + 1];
      if (endDay === undefined) return [];
      const emptyDays = endDay - startDay - 1;
      if (emptyDays < CALENDAR_COLLAPSE_EMPTY_DAYS) return [];
      const naturalWidth = emptyDays * config.pxPerDay;
      if (naturalWidth <= collapsedGapWidth + CALENDAR_GAP_MIN_SAVINGS) {
        return [];
      }
      const id = `${startDay}-${endDay}`;
      return [
        {
          id,
          startDay,
          endDay,
          emptyDays,
          startDate: addDays(startDate, startDay + 1),
          endDate: addDays(startDate, endDay - 1),
          expanded: expandedGapIds.has(id),
        },
      ];
    });

    const collapsedGapsByStart = new Map(
      largeGaps
        .filter((gap) => !gap.expanded)
        .map((gap) => [gap.startDay, gap]),
    );
    const dayX = new Map<number, number>();
    let x = 0;
    let day = 0;
    while (day <= totalDays) {
      dayX.set(day, x);
      const collapsedGap = collapsedGapsByStart.get(day);
      if (collapsedGap) {
        x += collapsedGapWidth;
        day = collapsedGap.endDay;
        dayX.set(day, x);
        continue;
      }
      if (day < totalDays) x += config.pxPerDay;
      day += 1;
    }

    const xForDay = (dayOffset: number) => {
      const rounded = Math.max(0, Math.min(totalDays, Math.round(dayOffset)));
      return dayX.get(rounded) ?? null;
    };

    const gapMarkers = largeGaps.map((gap) => {
      const startX = xForDay(gap.startDay) ?? 0;
      const endX = xForDay(gap.endDay) ?? startX;
      return {
        ...gap,
        x: startX + (endX - startX) / 2,
      };
    });

    return {
      totalWidth: Math.max(x, 640),
      xForDay,
      gapMarkers,
    };
  }, [config.pxPerDay, expandedGapIds, items, startDate, today, totalDays]);
  const totalWidth = timelineScale.totalWidth;
  const todayOffset = timelineScale.xForDay(daysBetween(startDate, today)) ?? 0;

  const dateTicks = useMemo(() => {
    const ticks: { date: Date; x: number; isToday: boolean }[] = [];
    for (let i = 0; i <= totalDays; i += config.tickStepDays) {
      const x = timelineScale.xForDay(i);
      if (x === null) continue;
      const d = addDays(startDate, i);
      ticks.push({
        date: d,
        x,
        isToday: daysBetween(d, today) === 0,
      });
    }
    return ticks;
  }, [startDate, totalDays, config, today, timelineScale]);

  const monthMarkers = useMemo(() => {
    const markers: { label: string; x: number }[] = [];
    let cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    while (cursor.getTime() <= endDate.getTime()) {
      const x = timelineScale.xForDay(
        Math.max(0, daysBetween(startDate, cursor)),
      );
      if (x === null) {
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
        continue;
      }
      const label =
        cursor.getMonth() === 0
          ? `${MONTH_LABELS[cursor.getMonth()]} ${cursor.getFullYear()}`
          : MONTH_LABELS[cursor.getMonth()];
      markers.push({ label, x });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
    return markers;
  }, [startDate, endDate, timelineScale]);

  const clusters = useMemo(() => {
    const sorted = [...items].sort((a, b) => a.createdAt - b.createdAt);
    const minClusterSpacing = CALENDAR_CARD_WIDTH + CALENDAR_CLUSTER_GAP;
    const result: {
      id: string;
      x: number;
      dayOffset: number;
      entries: WorkspaceEntry[];
    }[] = [];
    for (const item of sorted) {
      const dayOffset = daysBetween(startDate, startOfDay(item.createdAt));
      const x = timelineScale.xForDay(dayOffset) ?? 0;
      const last = result[result.length - 1];
      if (last && x - last.x <= minClusterSpacing) {
        last.entries.push(item);
      } else {
        result.push({
          id: String(item._id),
          x,
          dayOffset,
          entries: [item],
        });
      }
    }
    return result;
  }, [items, startDate, timelineScale]);

  const scrollToToday = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const el = scrollRef.current;
      if (!el) return;
      const target = Math.max(0, todayOffset - el.clientWidth * 0.35);
      el.scrollTo({ left: target, behavior });
    },
    [todayOffset],
  );

  const checkTimelineScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkTimelineScroll();
    el.addEventListener("scroll", checkTimelineScroll, { passive: true });
    const ro = new ResizeObserver(checkTimelineScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", checkTimelineScroll);
      ro.disconnect();
    };
  }, [checkTimelineScroll, totalWidth]);

  const scrollTimeline = useCallback((direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({
      left: el.clientWidth * (direction === "left" ? -0.65 : 0.65),
      behavior: "smooth",
    });
  }, []);

  const toggleGap = useCallback((gapId: string) => {
    setExpandedGapIds((current) => {
      const next = new Set(current);
      if (next.has(gapId)) next.delete(gapId);
      else next.add(gapId);
      return next;
    });
  }, []);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      scrollToToday(hasScrolledOnceRef.current ? "smooth" : "auto");
      hasScrolledOnceRef.current = true;
      checkTimelineScroll();
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, totalWidth]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      const key = e.key.toLowerCase();
      if (key === "y") setZoom("year");
      else if (key === "q") setZoom("quarter");
      else if (key === "m") setZoom("month");
      else if (key === "w") setZoom("week");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="grid grid-cols-1 gap-1.5 w-full max-w-full">
      <div className="relative min-w-0 w-full max-w-full">
        <div className="flex flex-wrap items-center justify-end absolute right-2 top-16 z-30 gap-0.5">
          {paginationStatus === "CanLoadMore" && (
            <Button
              variant="Trigger"
              size="sm"
              onClick={onLoadMore}
              className="h-8 border-border text-xs px-1.5"
              aria-label="load-more-notes"
            >
              Show More
            </Button>
          )}
          {paginationStatus === "LoadingMore" && (
            <Button
              variant="Trigger"
              size="sm"
              disabled
              className="h-8 border-border text-xs px-1.5"
              aria-label="loading-more-notes"
            >
              <LoadingAnimation className="h-3.5 w-3.5 mr-1.5" />
              Loading
            </Button>
          )}
          <Button
            variant="Trigger"
            size="sm"
            onClick={() => scrollToToday()}
            className="h-8 border-border text-xs px-1.5"
            aria-label="scroll-to-today"
          >
            Today
          </Button>
          <Popover open={isZoomOpen} onOpenChange={setIsZoomOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="Trigger"
                size="sm"
                className="h-8 border-border text-xs px-1.5 gap-1 !app-radius-none"
                aria-label="calendar-zoom-level"
              >
                {config.label}
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              side="bottom"
              sideOffset={4}
              className="w-32 p-1 border-border"
            >
              {CALENDAR_ZOOM_ORDER.map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => {
                    setZoom(z);
                    setIsZoomOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-2 py-1.5 text-sm app-radius-md hover:bg-muted"
                >
                  <span className="flex items-center gap-2">
                    {CALENDAR_ZOOM_CONFIG[z].label}
                    {zoom === z ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <span className="w-3.5" />
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {CALENDAR_ZOOM_CONFIG[z].shortcut}
                  </span>
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </div>
        <Button
          variant="Trigger"
          size="icon"
          onClick={() => scrollTimeline("left")}
          aria-label="scroll-calendar-left"
          className={cn(
            "absolute left-2 top-36 z-30 h-8 w-8 ",
            canScrollLeft
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none",
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="Trigger"
          size="icon"
          onClick={() => scrollTimeline("right")}
          aria-label="scroll-calendar-right"
          className={cn(
            "absolute right-2 top-36 z-30 h-8 w-8 ",
            canScrollRight
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none",
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div
          className="absolute left-0 top-0 bottom-2 z-20 w-28 pointer-events-none transition-opacity duration-200"
          style={{
            opacity: canScrollLeft ? 1 : 0,
            background:
              "linear-gradient(to right, hsl(var(--background)) 10%, transparent)",
          }}
        />
        <div
          className="absolute right-0 top-0 bottom-2 z-20 w-28 pointer-events-none transition-opacity duration-200"
          style={{
            opacity: canScrollRight ? 1 : 0,
            background:
              "linear-gradient(to left, hsl(var(--background)) 10%, transparent)",
          }}
        />
        <div
          className="min-w-0 w-full max-w-full overflow-x-scroll [&::-webkit-scrollbar]:h-[0.5rem] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border"
          ref={scrollRef}
        >
          <div className="relative" style={{ width: totalWidth, height: 300 }}>
            <div className="relative h-7 border-b border-border">
              {monthMarkers.map((m, i) => (
                <div
                  key={i}
                  className="absolute top-0 h-7 flex items-center text-[11px] font-semibold tracking-wide text-muted-foreground"
                  style={{ left: m.x + 8 }}
                >
                  {m.label}
                </div>
              ))}
            </div>

            <div className="relative h-8 border-b border-border">
              {dateTicks.map((t, i) => (
                <div
                  key={i}
                  className="absolute top-0 h-full"
                  style={{ left: t.x }}
                >
                  <span
                    className={cn(
                      "absolute top-1 left-1.5 text-[11px] whitespace-nowrap",
                      t.isToday
                        ? "text-primary-foreground bg-primary px-1.5 py-0.5 app-radius-md"
                        : "text-muted-foreground",
                    )}
                  >
                    {t.date.getDate()}
                  </span>
                </div>
              ))}
            </div>

            {dateTicks.map((t, i) => (
              <div
                key={`line-${i}`}
                className="absolute w-px bg-border/40"
                style={{ left: t.x, top: 60, bottom: 0 }}
              />
            ))}

            <div
              className="absolute inset-0 w-px bg-primary z-10"
              style={{ left: todayOffset }}
            >
              <div className=" absolute top-0 left-1/2 -translate-x-1/2 mb-1 px-2 py-0.5 app-radius-full bg-primary text-primary-foreground text-[10px] font-semibold whitespace-nowrap">
                Today
              </div>
            </div>

            {timelineScale.gapMarkers.map((gap) => (
              <CalendarGapMarker
                key={gap.id}
                gap={gap}
                onToggle={() => toggleGap(gap.id)}
              />
            ))}

            <div className="absolute left-0 right-0" style={{ top: 64 }}>
              {clusters.map((cluster) => (
                <div
                  key={cluster.id}
                  className="absolute"
                  style={{ left: cluster.x, transform: "translateX(-50%)" }}
                >
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "h-2.5 w-2.5 app-radius-full border-2 border-card",
                        cluster.entries.length > 1
                          ? "bg-primary"
                          : "bg-muted-foreground/60",
                      )}
                    />
                    <div className="w-px h-3 bg-border" />
                    {cluster.entries.length === 1 ? (
                      <TimelineMiniCard
                        item={cluster.entries[0]}
                        workspaceId={workspaceId}
                      />
                    ) : (
                      <Popover
                        open={openClusterId === cluster.id}
                        onOpenChange={(open) =>
                          setOpenClusterId(open ? cluster.id : null)
                        }
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            type="button"
                            className="h-8 px-3 flex items-center gap-1.5  text-xs text-foreground"
                            aria-label="expand-clustered-items"
                          >
                            {cluster.entries.length} items
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          align="center"
                          side="bottom"
                          sideOffset={6}
                          className="w-auto p-0 border-border overflow-hidden"
                        >
                          <TimelineClusterSlider
                            entries={cluster.entries}
                            workspaceId={workspaceId}
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineClusterSlider({
  entries,
  workspaceId,
}: {
  entries: WorkspaceEntry[];
  workspaceId?: Id<"workingSpaces">;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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
    const raf = requestAnimationFrame(checkScroll);
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", checkScroll);
      ro.disconnect();
    };
  }, [checkScroll, entries.length]);

  const scroll = useCallback((direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({
      left: el.clientWidth * (direction === "left" ? -0.65 : 0.65),
      behavior: "smooth",
    });
  }, []);

  return (
    <div className="relative w-auto max-w-[calc(100vw-2rem)] sm:max-w-[546px] overflow-hidden">
      <Button
        variant="Trigger"
        size="icon"
        onClick={() => scroll("left")}
        aria-label="scroll-cards-left"
        className={cn(
          "absolute left-2 top-1/2 -translate-y-1/2 z-30 h-8 w-8 ",
          canScrollLeft
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        )}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Button
        variant="Trigger"
        size="icon"
        onClick={() => scroll("right")}
        aria-label="scroll-cards-right"
        className={cn(
          "absolute right-2 top-1/2 -translate-y-1/2 z-30 h-8 w-8 ",
          canScrollRight
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        )}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      <div
        className="absolute left-0 top-0 bottom-0 z-20 w-16 pointer-events-none transition-opacity duration-200"
        style={{
          opacity: canScrollLeft ? 1 : 0,
          background:
            "linear-gradient(to right, hsl(var(--muted)) 15%, transparent)",
        }}
      />
      <div
        className="absolute right-0 top-0 bottom-0 z-20 w-16 pointer-events-none transition-opacity duration-200"
        style={{
          opacity: canScrollRight ? 1 : 0,
          background:
            "linear-gradient(to left, hsl(var(--muted)) 15%, transparent)",
        }}
      />

      <div
        ref={scrollRef}
        className="flex flex-row items-center gap-2.5 p-2 overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:h-[0.4rem] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40"
        onWheel={(e) => {
          if (e.deltaY !== 0) {
            e.currentTarget.scrollLeft += e.deltaY;
          }
        }}
      >
        {entries.map((entry) => (
          <TimelineMiniCard
            key={entry._id}
            item={entry}
            workspaceId={workspaceId}
          />
        ))}
      </div>
    </div>
  );
}

function CalendarGapMarker({
  gap,
  onToggle,
}: {
  gap: {
    emptyDays: number;
    expanded: boolean;
    startDate: Date;
    endDate: Date;
    x: number;
  };
  onToggle: () => void;
}) {
  const gapTooltip = useHoverTooltip(100);
  const hiddenDaysLabel = `${gap.emptyDays} hidden day${
    gap.emptyDays === 1 ? "" : "s"
  }`;
  const dateRangeLabel = `${gap.startDate.toLocaleDateString()} - ${gap.endDate.toLocaleDateString()}`;

  return (
    <Tooltip open={gapTooltip.open}>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onToggle}
          className={cn(
            "absolute z-10 min-h-16 w-7 -translate-x-1/2 flex-col gap-1 px-1 py-2 text-[10px] font-semibold shadow-sm !app-radius-none",
            gap.expanded ? "top-20" : "top-16",
          )}
          style={{ left: gap.x }}
          aria-label={
            gap.expanded ? "collapse-calendar-gap" : "expand-calendar-gap"
          }
          {...gapTooltip.triggerProps}
        >
          <span className="leading-none">.</span>
          <span className="leading-none">.</span>
          <span className="leading-none">.</span>
          <span className="[writing-mode:vertical-rl]">
            {gap.expanded ? "hide" : `${gap.emptyDays}d`}
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} className="text-xs px-1.5 py-1">
        <div className="grid gap-0.5">
          <span>{hiddenDaysLabel}</span>
          <span className="text-muted-foreground">{dateRangeLabel}</span>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function TimelineHeroBackground({ item }: { item: WorkspaceEntry }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const isLink = item.kind === "link";
  const isWhiteboard = item.kind === "whiteboard";

  if (isLink) {
    const linkItem = item as LinkItem;
    const isSocialLink = isSocialLinkPlatform(linkItem.platform);
    const rawThumbnailUrl = linkItem.metadata?.thumbnailUrl;
    const avatarUrl = linkItem.metadata?.authorAvatarUrl;
    const thumbnailUrl =
      rawThumbnailUrl && !isAvatarFallbackThumbnail(rawThumbnailUrl, avatarUrl)
        ? rawThumbnailUrl
        : undefined;
    const isPending = linkItem.metadata === undefined;
    const showSkeleton = isPending || (Boolean(thumbnailUrl) && !imgLoaded);

    return (
      <div className="relative h-full w-full bg-muted">
        {thumbnailUrl && (
          <img
            src={thumbnailUrl}
            alt=""
            draggable={false}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgLoaded(false)}
            className={cn(
              "h-full w-full object-cover select-none [-webkit-user-drag:none] transition-opacity duration-300",
              imgLoaded ? "opacity-100" : "opacity-0",
            )}
          />
        )}
        {showSkeleton && (
          <div className="absolute inset-0 bg-border/60 animate-pulse" />
        )}
        {!isPending && !thumbnailUrl && (
          <div className="absolute inset-0 flex items-center justify-center">
            {isSocialLink && avatarUrl ? (
              <LinkAuthorAvatar
                avatarUrl={avatarUrl}
                authorName={linkItem.metadata?.authorName}
                className="h-16 w-16"
              />
            ) : (
              <Link2 className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
        )}
      </div>
    );
  }

  if (isWhiteboard) {
    const board = item as WhiteboardItem;
    return (
      <div className="h-full w-full bg-muted">
        <WhiteboardPreview
          snapshot={board.snapshot}
          preview={board.preview}
          fill
        />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-muted">
      <FileText className="h-8 w-8 text-muted-foreground" />
    </div>
  );
}

function TimelineMiniCard({
  item,
  workspaceId,
}: {
  item: WorkspaceEntry;
  workspaceId?: Id<"workingSpaces">;
}) {
  const [contextMenuPosition, setContextMenuPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
  }, []);
  const isPdf = item.kind === "pdf";
  const isLink = item.kind === "link";
  const isWhiteboard = item.kind === "whiteboard";
  const href = isWhiteboard
    ? `/home/${(item as WhiteboardItem).workingSpaceId}/${buildItemSlug(
        (item as WhiteboardItem).title || "untitled-whiteboard",
        item._id,
      )}`
    : isPdf
      ? `/home/${(item as PdfItem).workingSpaceId}/${buildItemSlug(
          (item as PdfItem).title || "untitled-pdf",
          item._id,
        )}`
      : isLink
        ? (item as LinkItem).url
        : `/home/${workspaceId}/${buildItemSlug((item as Note).title || (item as Note).slug, item._id)}`;

  const openLink = () => {
    if (isLink) window.open(href, "_blank", "noopener,noreferrer");
  };

  const isSocialLink =
    isLink && isSocialLinkPlatform((item as LinkItem).platform);
  const authorHandle = isSocialLink
    ? formatHandle((item as LinkItem).metadata?.authorHandle)
    : undefined;
  const authorAvatarUrl = isSocialLink
    ? (item as LinkItem).metadata?.authorAvatarUrl
    : undefined;

  const createdDate = new Date(item.createdAt);
  const updatedDate = new Date(item.updatedAt);
  const isDifferentYear =
    createdDate.getFullYear() !== new Date().getFullYear();
  const hasUpdate =
    Boolean(item.updatedAt) && item.updatedAt !== item.createdAt;
  const publishedAt = isLink
    ? ((item as LinkItem).metadata?.publishedAt ?? item.createdAt)
    : undefined;
  const publishedDate = publishedAt ? new Date(publishedAt) : undefined;

  const formatShort = (date: Date) =>
    date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: isDifferentYear ? "numeric" : undefined,
    });

  const title = isSocialLink
    ? (item as LinkItem).metadata?.authorName?.trim() ||
      item.title ||
      "Untitled"
    : item.title || (isLink ? (item as LinkItem).url : "Untitled");

  // Timeline card — full-bleed thumbnail with an info overlay.
  const cardClassName =
    "group relative flex h-[210px] w-[168px] shrink-0 flex-col overflow-hidden border border-border bg-card transition-colors hover:border-muted-foreground/50 app-radius-lg";

  const cardContent = (
    <>
      <div className="absolute inset-0">
        <TimelineHeroBackground item={item} />
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[65%] bg-gradient-to-t from-background via-background/85 to-transparent" />

      {(isLink || isWhiteboard) && (
        <div className="absolute top-1 right-1 flex h-7 w-7 items-center justify-center">
          {isLink ? (
            <LinkFaviconBadge
              url={(item as LinkItem).url}
              className="h-full w-full p-0.5"
            />
          ) : null}
        </div>
      )}

      <div className="relative z-10 mt-auto p-2.5">
        <div className={cn(isSocialLink && "flex items-start gap-1.5")}>
          {isSocialLink && (
            <LinkAuthorAvatar
              avatarUrl={authorAvatarUrl}
              authorName={title}
              className="mt-0.5 h-6 w-6"
            />
          )}
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground line-clamp-2 leading-tight">
              {title}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {isLink && publishedDate ? (
                <>
                  {authorHandle && <span>{authorHandle} · </span>}
                  {formatLongDateTime(publishedAt as number)}
                </>
              ) : (
                <>
                  Created {formatShort(createdDate)}
                  {hasUpdate ? ` · Updated ${formatShort(updatedDate)}` : ""}
                </>
              )}
            </p>
          </div>
        </div>
      </div>
      {item.kind !== "note" && (
        <div
          className="hidden"
          onClick={(event) => event.stopPropagation()}
        >
          <WorkspaceItemSettings
            item={item}
            contextMenuPosition={contextMenuPosition}
            onContextMenuClose={() => setContextMenuPosition(null)}
          />
        </div>
      )}
    </>
  );

  const { openPane } = useHomePane();
  const { toast } = useToast();

  if (isLink) {
    return (
      <div
        onClick={(e) => {
          if (handleWorkspaceItemAltClick(e, item, openPane, toast)) return;
          openLink();
        }}
        className={cn(cardClassName, "cursor-pointer")}
        onContextMenu={handleContextMenu}
      >
        {cardContent}
      </div>
    );
  }

  const itemCard = (
    <IntentPrefetchLink
      href={href}
      prefetchNoteId={item.kind === "note" ? (item as Note)._id : undefined}
      className={cardClassName}
      onContextMenu={item.kind === "note" ? undefined : handleContextMenu}
      onClick={(e) => {
        handleWorkspaceItemAltClick(e, item, openPane, toast);
      }}
    >
      {cardContent}
    </IntentPrefetchLink>
  );

  return item.kind === "note" ? (
    <NoteContextMenu
      noteId={(item as Note)._id}
      noteTitle={(item as Note).title}
    >
      {itemCard}
    </NoteContextMenu>
  ) : (
    itemCard
  );
}

function getWorkspaceItemDetails(
  item: WorkspaceEntry,
  workspaceId?: Id<"workingSpaces">,
) {
  if (item.kind === "whiteboard") {
    const board = item as WhiteboardItem;
    return {
      title: board.title || "Untitled whiteboard",
      subtitle: isWhiteboardEmpty(board) ? EMPTY_CONTENT_MESSAGE : "",
      href: `/home/${board.workingSpaceId}/${buildItemSlug(board.title || "untitled-whiteboard", board._id)}`,
    };
  }
  if (item.kind === "pdf") {
    const pdf = item as PdfItem;
    return {
      title: pdf.title || "Untitled PDF",
      subtitle: "PDF upload",
      href: `/home/${pdf.workingSpaceId}/${buildItemSlug(pdf.title || "untitled-pdf", pdf._id)}`,
    };
  }
  if (item.kind === "link") {
    const link = item as LinkItem;
    return {
      title:
        link.title ||
        link.metadata?.authorName ||
        link.metadata?.siteName ||
        link.url,
      subtitle: link.metadata ? link.metadata.description : " ",
      href: link.url,
    };
  }
  const note = item as Note;
  return {
    title: note.title || "Untitled",
    subtitle: note.preview
      ? parseTiptapContentTruncateText(note.preview, 80)
      : getContentPreviewFromBody(note.body),
    href: `/home/${workspaceId}/${buildItemSlug(note.title || note.slug, note._id)}`,
  };
}

function WorkspaceItemSettings({
  item,
  onDelete,
  contextMenuPosition,
  onContextMenuClose,
}: {
  item: WorkspaceEntry;
  onDelete?: (id: any) => void;
  contextMenuPosition?: { x: number; y: number } | null;
  onContextMenuClose?: () => void;
}) {
  if (item.kind === "whiteboard")
    return (
      <WhiteboardSettings
        whiteboard={item as WhiteboardItem}
        onDelete={onDelete}
        contextMenuPosition={contextMenuPosition}
        onContextMenuClose={onContextMenuClose}
      />
    );
  if (item.kind === "pdf")
    return (
      <PdfSettings
        pdfId={item._id as Id<"pdfs">}
        pdfTitle={(item as PdfItem).title}
        iconVariant="vertical_icon"
        dropdownMenuContentAlign="start"
        tooltipContentAlign="start"
        onDelete={onDelete}
        contextMenuPosition={contextMenuPosition}
        onContextMenuClose={onContextMenuClose}
      />
    );
  if (item.kind === "link")
    return (
      <LinkSettings
        linkId={item._id as Id<"links">}
        linkUrl={(item as LinkItem).url}
        linkTitle={(item as LinkItem).title}
        favorite={(item as LinkItem).favorite}
        createdAt={item.createdAt}
        updatedAt={item.updatedAt}
        iconVariant="vertical_icon"
        dropdownMenuContentAlign="start"
        tooltipContentAlign="start"
        onDelete={onDelete}
        contextMenuPosition={contextMenuPosition}
        onContextMenuClose={onContextMenuClose}
      />
    );
  const note = item as Note;
  return (
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
  );
}

function WorkspaceItemThumbnail({
  item,
  compact = false,
}: {
  item: WorkspaceEntry;
  compact?: boolean;
}) {
  const size = compact ? " w-52" : "w-full";
  if (item.kind === "whiteboard" && isWhiteboardEmpty(item as WhiteboardItem)) {
    if (!compact) return null;
    return (
      <div className={`${size} flex shrink-0 items-center justify-center`}>
        <PenTool className="h-6 w-6 text-primary" />
      </div>
    );
  }
  if (item.kind === "whiteboard")
    return (
      <div className={`${size} shrink-0 overflow-hidden`}>
        <WhiteboardPreview
          snapshot={(item as WhiteboardItem).snapshot}
          preview={(item as WhiteboardItem).preview}
        />
      </div>
    );
  if (item.kind === "link")
    return (
      <div className={`${size} shrink-0 overflow-hidden`}>
        <LinkThumbnail link={item as LinkItem} showFaviconBadge />
      </div>
    );
  if ((item.kind === "note" || item.kind === "pdf") && !compact) return null;
  return (
    <div className={`${size} flex shrink-0 items-center justify-center`}>
      <FileText className="h-6 w-6 text-primary" />
    </div>
  );
}

function ItemKindIcon({
  item,
  empty = false,
  className,
}: {
  item: WorkspaceEntry;
  empty?: boolean;
  className?: string;
}) {
  if (item.kind === "note") {
    const NoteIcon = empty ? EmptyFileIcon : FileText;
    return (
      <NoteIcon
        aria-label={empty ? "Empty note" : "Note"}
        className={cn("shrink-0 text-muted-foreground", className)}
      />
    );
  }
  if (item.kind === "whiteboard")
    return (
      <PenTool
        aria-label="Whiteboard"
        className={cn("shrink-0 text-muted-foreground", className)}
      />
    );
  return null;
}

function handleWorkspaceItemAltClick(
  event: React.MouseEvent,
  item: WorkspaceEntry,
  openPane: (paneItem: any) => void,
  toast: any,
) {
  if (event.button !== 0 || !event.altKey) return false;
  event.preventDefault();
  event.stopPropagation();

  if (item.kind === "note") {
    openPane({
      type: "note",
      id: item._id,
      title: (item as Note).title || "Untitled",
    });
    return true;
  }
  if (item.kind === "pdf") {
    openPane({
      type: "pdf",
      id: item._id,
      title: (item as PdfItem).title || "Untitled",
    });
    return true;
  }
  if (item.kind === "whiteboard") {
    toast({
      variant: "destructive",
      title: "Cannot open in side pane",
      description: "Whiteboards cannot be opened in a side pane.",
    });
    return true;
  }
  if (item.kind === "link") {
    toast({
      variant: "destructive",
      title: "Cannot open in side pane",
      description: "Links cannot be opened in a side pane.",
    });
    return true;
  }
  return false;
}

const WorkspaceGridCard = memo(function WorkspaceGridCard({
  item,
  workspaceId,
  onDelete,
  searchQuery,
}: {
  item: WorkspaceEntry;
  workspaceId?: Id<"workingSpaces">;
  onDelete?: (id: any) => void;
  searchQuery: string;
}) {
  const details = getWorkspaceItemDetails(item, workspaceId);
  const { openPane } = useHomePane();
  const { toast } = useToast();
  const [contextMenuPosition, setContextMenuPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
  }, []);

  const link = item.kind === "link" ? (item as LinkItem) : null;
  const isSocialLink = Boolean(link && isSocialLinkPlatform(link.platform));
  const authorName = link?.metadata?.authorName?.trim();
  const authorHandle = formatHandle(link?.metadata?.authorHandle);
  const postDate = link?.metadata?.publishedAt ?? link?.createdAt;

  const hasRealThumbnail = Boolean(
    link?.metadata?.thumbnailUrl &&
      !isAvatarFallbackThumbnail(
        link.metadata.thumbnailUrl,
        link.metadata?.authorAvatarUrl,
      ),
  );

  const cardStyles =
    "group relative flex min-h-[230px] w-full cursor-pointer select-none flex-col overflow-hidden border border-border bg-card transition-colors hover:border-muted-foreground/50 app-radius-lg border bg-card text-card-foreground";

  const cardInnerContent = (
    <>
      {isSocialLink && !hasRealThumbnail && link && (
        <LinkFaviconBadge
          url={link.url}
          className="absolute bottom-2 right-2 z-10 h-7 w-7"
        />
      )}
      <CardHeader className="pb-3">
        <div className="flex min-w-0 items-start justify-between gap-2">
          {isSocialLink ? (
            <div className="flex min-w-0 items-start gap-2.5">
              <LinkAuthorAvatar
                avatarUrl={link?.metadata?.authorAvatarUrl}
                authorName={authorName || details.title}
                className="mt-0.5 h-9 w-9"
              />
              <div className="min-w-0">
                <CardTitle className="line-clamp-1 max-w-full break-words text-base font-semibold text-foreground [overflow-wrap:anywhere]">
                  <HighlightText
                    text={authorName || details.title}
                    query={searchQuery}
                  />
                </CardTitle>
                <span className="text-xs text-muted-foreground">
                  {authorHandle}
                  {authorHandle && postDate ? " · " : ""}
                  {postDate ? formatLongDateTime(postDate) : null}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex min-w-0 items-start gap-3">
              <ItemKindIcon
                item={item}
                empty={details.subtitle === EMPTY_CONTENT_MESSAGE}
                className="mt-3 h-6 w-6"
              />
              <CardTitle className="max-w-full break-words text-lg font-semibold leading-[1.4rem] text-foreground [overflow-wrap:anywhere]">
                <HighlightText text={details.title} query={searchQuery} />
                {item.kind !== "link" && (
                  <span className=" block text-xs text-muted-foreground mt-1.5">
                    Created {formatLongDate(item.createdAt)} · Last updated{" "}
                    {formatLongDate(item.updatedAt)}
                  </span>
                )}
              </CardTitle>
            </div>
          )}
          <div
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <WorkspaceItemSettings
              item={item}
              onDelete={onDelete}
              contextMenuPosition={contextMenuPosition}
              onContextMenuClose={() => setContextMenuPosition(null)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent
        className={`flex flex-1 flex-col ${isSocialLink && "gap-2"} `}
      >
        {isSocialLink ? (
          <>
            <p className="line-clamp-4 whitespace-pre-wrap break-words text-sm text-foreground/90">
              <HighlightText
                text={link?.metadata?.description || ""}
                query={searchQuery}
              />
            </p>
            {link?.metadata?.thumbnailUrl &&
              !isAvatarFallbackThumbnail(
                link.metadata.thumbnailUrl,
                link.metadata?.authorAvatarUrl,
              ) && <LinkThumbnail link={link} showFaviconBadge />}
          </>
        ) : (
          <>
            <WorkspaceItemThumbnail item={item} />
            <p
              className={`line-clamp-2 text-sm text-muted-foreground ${details.subtitle && "mt-2"}`}
            >
              <HighlightText
                text={details.subtitle || ""}
                query={searchQuery}
              />
            </p>
          </>
        )}
      </CardContent>
    </>
  );

  if (item.kind === "link") {
    return (
      <div
        onClick={(e) => {
          if (!handleWorkspaceItemAltClick(e, item, openPane, toast)) {
            window.open(details.href, "_blank", "noopener,noreferrer");
          }
        }}
        className={cardStyles}
        onContextMenu={handleContextMenu}
      >
        {cardInnerContent}
      </div>
    );
  }
  const itemCard = (
    <IntentPrefetchLink
      href={details.href}
      prefetchNoteId={item.kind === "note" ? (item as Note)._id : undefined}
      className={cardStyles}
      onContextMenu={item.kind === "note" ? undefined : handleContextMenu}
      onClick={(e) => {
        handleWorkspaceItemAltClick(e, item, openPane, toast);
      }}
    >
      {cardInnerContent}
    </IntentPrefetchLink>
  );

  return item.kind === "note" ? (
    <NoteContextMenu
      noteId={(item as Note)._id}
      noteTitle={(item as Note).title}
    >
      {itemCard}
    </NoteContextMenu>
  ) : (
    itemCard
  );
});

const WorkspaceListCard = memo(function WorkspaceListCard({
  item,
  workspaceId,
  onDelete,
  searchQuery,
}: {
  item: WorkspaceEntry;
  workspaceId?: Id<"workingSpaces">;
  onDelete?: (id: any) => void;
  searchQuery: string;
}) {
  const details = getWorkspaceItemDetails(item, workspaceId);
  const { openPane } = useHomePane();
  const { toast } = useToast();
  const [contextMenuPosition, setContextMenuPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
  }, []);

  const link = item.kind === "link" ? (item as LinkItem) : null;
  const isSocialLink = Boolean(link && isSocialLinkPlatform(link.platform));
  const authorName = link?.metadata?.authorName?.trim();
  const authorHandle = formatHandle(link?.metadata?.authorHandle);
  const postDate = link?.metadata?.publishedAt ?? link?.createdAt;

  const hasRealThumbnail = Boolean(
    link?.metadata?.thumbnailUrl &&
      !isAvatarFallbackThumbnail(
        link.metadata.thumbnailUrl,
        link.metadata?.authorAvatarUrl,
      ),
  );

  const cardStyles =
    "group relative flex min-h-[112px] w-full cursor-pointer select-none items-center overflow-hidden border border-border bg-card transition-colors hover:border-muted-foreground/50 app-radius-lg text-card-foreground shadow";

  const cardInnerContent = (
    <CardContent className="flex w-full items-center gap-4 p-3">
      {isSocialLink && !hasRealThumbnail && link && (
        <LinkFaviconBadge
          url={link.url}
          className="absolute bottom-2 right-2 z-10 h-5 w-5"
        />
      )}
      {isSocialLink ? (
        hasRealThumbnail && <WorkspaceItemThumbnail item={item} compact />
      ) : (
        <WorkspaceItemThumbnail item={item} compact />
      )}
      <div className="min-w-0 flex-1 overflow-hidden">
        <h3 className="flex max-w-full items-center gap-1.5 break-words text-lg font-semibold text-foreground [overflow-wrap:anywhere]">
          {isSocialLink && (
            <LinkAuthorAvatar
              avatarUrl={link?.metadata?.authorAvatarUrl}
              authorName={authorName || details.title}
              className="h-5 w-5 shrink-0"
            />
          )}
          <ItemKindIcon
            item={item}
            empty={details.subtitle === EMPTY_CONTENT_MESSAGE}
            className="h-5 w-5"
          />
          <span className="line-clamp-1 min-w-0">
            <HighlightText
              text={isSocialLink ? authorName || details.title : details.title}
              query={searchQuery}
            />
          </span>
        </h3>
        <p className="text-xs text-muted-foreground">
          {isSocialLink ? (
            <>
              {authorHandle}
              {authorHandle && postDate ? " · " : ""}
              {postDate ? formatLongDateTime(postDate) : null}
            </>
          ) : item.kind === "link" ? (
            formatLongDate(item.updatedAt)
          ) : (
            <>
              Created {formatLongDate(item.createdAt)} · Last updated{" "}
              {formatLongDate(item.updatedAt)}
            </>
          )}
        </p>
        <p className="line-clamp-1 text-sm text-muted-foreground">
          <HighlightText text={details.subtitle || ""} query={searchQuery} />
        </p>
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <WorkspaceItemSettings
          item={item}
          onDelete={onDelete}
          contextMenuPosition={contextMenuPosition}
          onContextMenuClose={() => setContextMenuPosition(null)}
        />
      </div>
    </CardContent>
  );

  if (item.kind === "link") {
    return (
      <div
        onClick={(e) => {
          if (!handleWorkspaceItemAltClick(e, item, openPane, toast)) {
            window.open(details.href, "_blank", "noopener,noreferrer");
          }
        }}
        className={cardStyles}
        onContextMenu={handleContextMenu}
      >
        {cardInnerContent}
      </div>
    );
  }

  const itemCard = (
    <IntentPrefetchLink
      href={details.href}
      prefetchNoteId={item.kind === "note" ? (item as Note)._id : undefined}
      className={cardStyles}
      onContextMenu={item.kind === "note" ? undefined : handleContextMenu}
      onClick={(e) => {
        handleWorkspaceItemAltClick(e, item, openPane, toast);
      }}
    >
      {cardInnerContent}
    </IntentPrefetchLink>
  );

  return item.kind === "note" ? (
    <NoteContextMenu
      noteId={(item as Note)._id}
      noteTitle={(item as Note).title}
    >
      {itemCard}
    </NoteContextMenu>
  ) : (
    itemCard
  );
});

function WhiteboardPreview({
  snapshot,
  preview,
  fill = false,
}: {
  snapshot?: string;
  preview?: string;
  fill?: boolean;
}) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!snapshot) {
      setThumbnailUrl(null);
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    const renderThumbnail = async () => {
      try {
        const scene = JSON.parse(snapshot);
        if (!Array.isArray(scene.elements) || scene.elements.length === 0) {
          if (!cancelled) setThumbnailUrl(null);
          return;
        }
        const { exportToSvg } = await import("@excalidraw/excalidraw");
        const svg = await exportToSvg({
          elements: scene.elements,
          appState: scene.appState,
          files: scene.files,
          exportPadding: 24,
        } as any);
        objectUrl = URL.createObjectURL(
          new Blob([new XMLSerializer().serializeToString(svg)], {
            type: "image/svg+xml",
          }),
        );
        if (!cancelled) setThumbnailUrl(objectUrl);
      } catch {
        if (!cancelled) setThumbnailUrl(null);
      }
    };

    void renderThumbnail();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [snapshot]);

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden",
        fill ? "h-full w-full" : "h-fit w-full",
      )}
    >
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt=" Whiteboard thumbnail"
          draggable={false}
          className={cn(
            "pointer-events-none h-full w-full select-none bg-white [-webkit-user-drag:none]",
            fill ? "object-cover" : "object-contain border border-border",
          )}
        />
      ) : (
        <div className=" min-h-32 w-full flex justify-center items-center">
          <PanelTop className="h-8 w-8 text-primary/70" />
        </div>
      )}
    </div>
  );
}

// Matches "Jul 28, 2026" - used for note created/updated labels and post dates.
function formatLongDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Matches "Jun 25, 2026, 5:36 PM" - used for social post timestamps.
function formatLongDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getLinkFaviconUrl(url: string): string | null {
  try {
    const domain = new URL(url).hostname.replace(/^www\./, "");
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return null;
  }
}

function LinkFavicon({
  url,
  className,
  grayscale = true,
}: {
  url: string;
  className?: string;
  grayscale?: boolean;
}) {
  const [errored, setErrored] = useState(false);
  const faviconUrl = getLinkFaviconUrl(url);

  if (!faviconUrl || errored) {
    return <Link2 className={cn("text-foreground", className)} />;
  }

  return (
    <img
      src={faviconUrl}
      alt="favicon"
      draggable={false}
      className={cn(
        "object-contain select-none [-webkit-user-drag:none]",
        grayscale && "grayscale",
        className,
      )}
      onError={() => setErrored(true)}
    />
  );
}

function LinkFaviconBadge({
  url,
  className,
  grayscale = true,
}: {
  url: string;
  className?: string;
  grayscale?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden",
        className,
      )}
    >
      <LinkFavicon
        url={url}
        className="h-[100%] w-[100%]"
        grayscale={grayscale}
      />
    </div>
  );
}

function LinkThumbnail({
  link,
  showFaviconBadge = false,
}: {
  link: LinkItem;
  showFaviconBadge?: boolean;
}) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const thumbnailUrl = link.metadata?.thumbnailUrl;
  const isPending = link.metadata === undefined;
  const showSkeleton = isPending || (Boolean(thumbnailUrl) && !imgLoaded);

  return (
    <div className="relative w-full aspect-video app-radius-md overflow-hidden bg-muted">
      {thumbnailUrl && (
        <img
          src={thumbnailUrl}
          alt="thumbnail url"
          draggable={false}
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgLoaded(false)}
          className={cn(
            "w-full h-full object-cover select-none [-webkit-user-drag:none] transition-opacity duration-300 ",
            imgLoaded ? "opacity-100" : "opacity-0",
          )}
        />
      )}

      {showSkeleton && (
        <div className="absolute inset-0 bg-border/60 animate-pulse" />
      )}

      {!isPending && !thumbnailUrl && (
        <div className="absolute inset-0 flex items-center gap-3 px-3 text-sm text-muted-foreground">
          <LinkFaviconBadge url={link.url} className="h-10 w-10 shrink-0" />
          <span>{platformLabel(link.platform) || "Site"}</span>
        </div>
      )}

      {showFaviconBadge && thumbnailUrl && imgLoaded && (
        <LinkFaviconBadge
          url={link.url}
          className="absolute bottom-2 right-2 h-8 w-8"
        />
      )}
    </div>
  );
}

function LinkAuthorAvatar({
  avatarUrl,
  authorName,
  className,
}: {
  avatarUrl?: string;
  authorName?: string;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);
  if (!avatarUrl || errored) {
    const initial = authorName?.trim().charAt(0).toUpperCase();
    return (
      <div
        className={cn(
          "rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-sm font-medium text-muted-foreground",
          className,
        )}
      >
        {initial ? (
          initial
        ) : (
          <Link2 className="h-1/2 w-1/2 text-muted-foreground" />
        )}
      </div>
    );
  }
  return (
    <img
      src={avatarUrl}
      alt={authorName || ""}
      draggable={false}
      onError={() => setErrored(true)}
      className={cn(
        "rounded-full object-cover flex-shrink-0 select-none [-webkit-user-drag:none]",
        className,
      )}
    />
  );
}

function EmptySearchResults({
  searchQuery,
  onClearSearch,
}: EmptySearchResultsProps) {
  return (
    <Card className="bg-transparent  border-0">
      <CardContent className="pt-12 pb-12 text-center">
        <div className="flex flex-col items-center justify-center">
          <div className="h-10 w-10 flex items-center justify-center mb-4">
            <Search className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2 text-foreground">
            No results found
          </h3>
          <p className="text-muted-foreground mb-6">
            No items found for "{searchQuery}"
          </p>
          <Button
            variant="outline"
            onClick={onClearSearch}
            aria-label="clear-search"
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
            No notes or uploads yet
          </h3>
          <p className="text-muted-foreground mb-6">
            Create your first note or upload to get started
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
  if (viewMode === "calendar") {
    return (
      <div className="grid grid-cols-1 gap-1.5 w-full max-w-full">
        <div className="relative min-w-0 w-full max-w-full">
          <div className="flex flex-wrap items-center justify-end absolute right-2 top-16 z-30 gap-0.5">
            <div className="h-8 w-16 bg-border app-radius-md animate-pulse" />
            <div className="h-8 w-20 bg-border app-radius-md animate-pulse" />
          </div>
          <div className="min-w-0 w-full max-w-full overflow-hidden">
            <div className="relative w-full" style={{ height: 300 }}>
              <div className="relative h-7 border-b border-border">
                {[2, 34, 66].map((left, i) => (
                  <div
                    key={i}
                    className="absolute top-0 h-7 flex items-center"
                    style={{ left: `${left}%` }}
                  >
                    <div className="h-2.5 w-14 bg-border app-radius-md animate-pulse" />
                  </div>
                ))}
              </div>

              <div className="relative h-8 border-b border-border">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute top-1"
                    style={{ left: `${i * 12.5 + 1}%` }}
                  >
                    <div className="h-2.5 w-4 bg-border app-radius-md animate-pulse" />
                  </div>
                ))}
              </div>

              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={`line-${i}`}
                  className="absolute w-px bg-border/40"
                  style={{ left: `${i * 12.5 + 1}%`, top: 60, bottom: 0 }}
                />
              ))}

              <div className="absolute left-0 right-0" style={{ top: 64 }}>
                {[8, 24, 42, 58, 74, 90].map((left, index) => (
                  <div
                    key={index}
                    className="absolute"
                    style={{ left: `${left}%`, transform: "translateX(-50%)" }}
                  >
                    <div className="flex flex-col items-center">
                      <div className="h-2.5 w-2.5 app-radius-full bg-border animate-pulse" />
                      <div className="w-px h-3 bg-border" />
                      <div className="w-[168px] border border-border bg-card app-radius-md px-2.5 py-2 space-y-1.5">
                        <div className="h-3 w-3/4 bg-border app-radius-md animate-pulse" />
                        <div className="h-2.5 w-1/2 bg-border app-radius-md animate-pulse" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === "grid") {
    return (
      <div className="columns-1 sm:columns-2 md:columns-3 gap-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <Card
            key={index}
            className="bg-card/90 backdrop-blur-sm border-border flex flex-col min-h-[230px] w-full mb-4 break-inside-avoid"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="h-5 w-3/4 bg-border app-radius-md animate-pulse" />
                <div className="h-5 w-5 bg-border app-radius-md animate-pulse" />
              </div>
            </CardHeader>
            <CardContent className="flex-grow flex-1">
              <div className="space-y-2">
                <div className="h-4 w-full bg-border app-radius-md animate-pulse" />
                <div className="h-4 w-5/6 bg-border app-radius-md animate-pulse" />
                <div className="h-4 w-4/6 bg-border app-radius-md animate-pulse" />
              </div>
            </CardContent>
            <CardFooter className="py-2 px-3 flex items-center justify-between border-t border-border">
              <div className="h-4 w-24 bg-border app-radius-md animate-pulse" />
              <div className="h-9 w-16 bg-border app-radius-md animate-pulse" />
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
                <div className="h-5 w-2/3 bg-border app-radius-md animate-pulse" />
                <div className="h-4 w-full bg-border app-radius-md animate-pulse" />
              </div>
              <div className="flex items-center gap-3">
                <div className="h-4 w-24 bg-border app-radius-md animate-pulse" />
                <div className="h-5 w-5 bg-border app-radius-md animate-pulse" />
                <div className="h-9 w-12 bg-border app-radius-md animate-pulse" />
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
    <div>
      {/* Tab bar: simple flow layout sized to match the real ~44px tab strip */}
      <div className="sticky top-0 left-0 mb-6 z-40">
        <div className="flex items-center gap-1 px-1 pt-2 bg-muted border border-border border-b-0">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className={`px-4 py-2.5 min-w-[110px] app-radius-lg border-2 border-b-0 ${
                i === 0 ? "border-border bg-card" : "border-transparent"
              }`}
            >
              <div className="h-4 w-16 bg-border app-radius-md animate-pulse" />
            </div>
          ))}
        </div>
        <div className="h-[2px] bg-border" />
      </div>

      <div className="grid grid-cols-1 gap-6 w-full max-w-full">
        <div className="flex flex-wrap gap-y-2 gap-x-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative flex-1 min-w-0 md:max-w-md">
              <div className="h-9 w-full bg-border app-radius-md animate-pulse" />
            </div>
          </div>

          <div className="flex items-center gap-2 w-auto justify-end">
            <div className="flex h-9 items-center border border-border app-radius-lg overflow-hidden">
              <div className="h-9 w-10 bg-border animate-pulse" />
              <div className="h-9 w-10 bg-border animate-pulse border-l border-r border-border" />
              <div className="h-9 w-10 bg-border animate-pulse" />
            </div>
            <div className="h-9 w-28 bg-border app-radius-lg animate-pulse" />
            <div className="h-9 w-9 bg-border app-radius-lg animate-pulse" />
          </div>
        </div>

        <div className="columns-1 sm:columns-2 md:columns-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card
              key={index}
              className="bg-card/90 backdrop-blur-sm border-border flex flex-col min-h-[230px] w-full mb-4 break-inside-avoid"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="h-5 w-3/4 bg-border app-radius-md animate-pulse" />
                  <div className="h-5 w-5 bg-border app-radius-md animate-pulse" />
                </div>
              </CardHeader>
              <CardContent className="flex-grow flex-1">
                <div className="space-y-2">
                  <div className="h-4 w-full bg-border app-radius-md animate-pulse" />
                  <div className="h-4 w-5/6 bg-border app-radius-md animate-pulse" />
                  <div className="h-4 w-4/6 bg-border app-radius-md animate-pulse" />
                </div>
              </CardContent>
              <CardFooter className="py-4 flex items-center justify-between border-t border-border">
                <div className="h-4 w-24 bg-border app-radius-md animate-pulse" />
                <div className="h-9 w-12 bg-border app-radius-md animate-pulse" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
