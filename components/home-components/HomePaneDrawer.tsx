"use client";

import {
  createContext,
  memo,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChevronsRight, MoveDiagonal2, X } from "lucide-react";
import { useParams, usePathname, useRouter } from "next/navigation";
import NotePageClient from "@/app/home/[id]/[itemId]/NotePageClient";
import PdfViewerPageClient from "@/app/home/[id]/[itemId]/PdfViewerPageClient";
import WorkingSpacePageClient from "@/app/home/[id]/WorkingSpacePageClient";
import { Button } from "@/components/ui/button";
import IntentPrefetchLink from "@/components/IntentPrefetchLink";
import {
  Drawer,
  DrawerClose,
  DrawerPortal,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useHoverTooltip } from "@/hooks/useHoverTooltip";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ShortcutBadge } from "@/components/ui/shortcut-badge";
import { cn } from "@/lib/utils";
import { parseSlug } from "@/lib/parseSlug";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import NoteSettings from "@/components/home-components/NoteSettings";
import PdfSettings from "@/components/home-components/PdfSettings";
import { useIsMobile } from "@/hooks/use-mobile";

type HomePaneItem =
  | {
      type: "note";
      id: Id<"notes">;
      title?: string;
      slug?: string;
      workingSpaceId?: Id<"workingSpaces">;
    }
  | {
      type: "pdf";
      id: Id<"pdfs">;
      title?: string;
      workingSpaceId?: Id<"workingSpaces">;
    }
  | {
      type: "workspace";
      id: Id<"workingSpaces">;
      title?: string;
    };

type HomePaneContextValue = {
  activeItem: HomePaneItem | null;
  openPane: (item: HomePaneItem) => void;
  closePane: () => void;
};

const HomePaneContext = createContext<HomePaneContextValue | null>(null);

const PANE_WIDTH_STORAGE_KEY = "notevo_home_pane_width";
const MIN_PANE_WIDTH = 360;
const MAX_PANE_WIDTH = 960;
const DEFAULT_PANE_WIDTH = 560;

function clampPaneWidth(width: number) {
  if (typeof window === "undefined") return width;
  const maxViewportWidth = Math.max(MIN_PANE_WIDTH, window.innerWidth - 120);
  return Math.min(
    Math.max(width, MIN_PANE_WIDTH),
    Math.min(MAX_PANE_WIDTH, maxViewportWidth),
  );
}

function getPaneTitle(item: HomePaneItem | null) {
  if (!item) return "Pane";
  if (item.title) return parseSlug(item.title);
  if (item.type === "pdf") return "Upload";
  if (item.type === "workspace") return "Workspace";
  return "Note";
}

function HomePaneContent({ item }: { item: HomePaneItem }) {
  if (item.type === "note") {
    return <NotePageClient key={item.id} noteId={item.id} renderedInPane />;
  }

  if (item.type === "pdf") {
    return <PdfViewerPageClient key={item.id} pdfId={item.id} renderedInPane />;
  }

  return (
    <WorkingSpacePageClient
      key={item.id}
      workingSpaceId={item.id}
      renderedInPane
    />
  );
}

function HomePaneDrawer({
  activeItem,
  closePane,
}: {
  activeItem: HomePaneItem | null;
  closePane: () => void;
}) {
  const [paneWidth, setPaneWidth] = useState(DEFAULT_PANE_WIDTH);
  const paneRef = useRef<HTMLDivElement | null>(null);
  const isResizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(DEFAULT_PANE_WIDTH);
  const rafRef = useRef<number>(0);
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ id?: string | string[] }>();
  const workspaceId = useMemo(() => {
    const paramId = params?.id;
    if (paramId) return Array.isArray(paramId) ? paramId[0] : paramId;

    const segments = pathname?.split("/").filter(Boolean) ?? [];
    const homeIndex = segments.indexOf("home");
    if (homeIndex !== -1 && segments[homeIndex + 1]) {
      return segments[homeIndex + 1];
    }
    return undefined;
  }, [params, pathname]);
  const collapseTooltip = useHoverTooltip(150);
  const expandTooltip = useHoverTooltip(150);

  const noteDoc = useQuery(
    api.notes.getNoteById,
    activeItem?.type === "note" ? { _id: activeItem.id } : "skip",
  );
  const pdfDoc = useQuery(
    api.pdfs.getPdfById,
    activeItem?.type === "pdf" ? { _id: activeItem.id } : "skip",
  );

  const fullPageHref = useMemo(() => {
    if (!activeItem) return null;

    if (activeItem.type === "workspace") {
      return `/home/${activeItem.id}`;
    }

    if (activeItem.type === "note") {
      const spaceId =
        activeItem.workingSpaceId ?? noteDoc?.workingSpaceId ?? workspaceId;
      if (!spaceId) return null;

      const slug =
        activeItem.slug ??
        noteDoc?.slug ??
        activeItem.title ??
        noteDoc?.title ??
        activeItem.id;

      return `/home/${spaceId}/${slug}?id=${activeItem.id}`;
    }

    const spaceId =
      activeItem.workingSpaceId ?? pdfDoc?.workingSpaceId ?? workspaceId;
    if (!spaceId) return null;

    const slug = activeItem.title ?? pdfDoc?.title ?? activeItem.id;

    return `/home/${spaceId}/${slug}?pdfId=${activeItem.id}`;
  }, [activeItem, noteDoc, pdfDoc, workspaceId]);

  useEffect(() => {
    if (activeItem && !fullPageHref) {
      // eslint-disable-next-line no-console
      console.warn(
        "[HomePaneDrawer] could not build full-page href — no workspaceId resolved.",
        { activeItem, noteDoc, pdfDoc, pathname, workspaceId },
      );
    }
  }, [activeItem, fullPageHref, noteDoc, pdfDoc, pathname, workspaceId]);

  const openFullPage = useCallback(() => {
    if (!fullPageHref) return;
    router.push(fullPageHref);
    closePane();
  }, [closePane, fullPageHref, router]);

  useEffect(() => {
    if (!activeItem) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        openFullPage();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeItem, openFullPage]);

  useEffect(() => {
    const savedWidth = window.localStorage.getItem(PANE_WIDTH_STORAGE_KEY);
    if (!savedWidth) return;

    const parsedWidth = Number(savedWidth);
    if (Number.isFinite(parsedWidth)) {
      setPaneWidth(clampPaneWidth(parsedWidth));
    }
  }, []);

  const handleResizeStart = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      isResizingRef.current = true;
      startXRef.current = event.clientX;
      startWidthRef.current = paneWidth;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [paneWidth],
  );

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizingRef.current) return;

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        const nextWidth = clampPaneWidth(
          startWidthRef.current + startXRef.current - event.clientX,
        );
        if (paneRef.current) {
          paneRef.current.style.width = `${nextWidth}px`;
        }
      });
    };

    const handleMouseUp = () => {
      if (!isResizingRef.current) return;
      isResizingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      if (!paneRef.current) return;
      const nextWidth = clampPaneWidth(
        paneRef.current.getBoundingClientRect().width,
      );
      setPaneWidth(nextWidth);
      window.localStorage.setItem(
        PANE_WIDTH_STORAGE_KEY,
        String(Math.round(nextWidth)),
      );
      paneRef.current.style.width = "";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return (
    <Drawer
      open={Boolean(activeItem)}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) closePane();
      }}
      direction="right"
      modal={false}
      shouldScaleBackground={false}
    >
      <DrawerPortal>
        <div
          ref={paneRef}
          className={cn(
            "fixed inset-y-0 right-0 z-40 hidden min-h-0 flex-col border-l border-border bg-background text-foreground shadow-2xl md:flex",
            activeItem ? "translate-x-0" : "translate-x-full",
          )}
          style={{ width: paneWidth }}
        >
          <div
            aria-hidden
            className="group/resize absolute inset-y-0 left-0 z-20 w-2 -translate-x-1 cursor-col-resize"
            onMouseDown={handleResizeStart}
          >
            <div className="mx-auto h-full w-px bg-gradient-to-b from-transparent from-5% via-border to-transparent to-95% group-hover/resize:via-primary" />
          </div>
          <div className=" w-full flex h-9 shrink-0 items-center justify-between bg-card border-b border-border p-2">
            <div className="flex min-w-0 items-center gap-2 ">
              <div className="flex items-center gap-0.5">
                <TooltipProvider>
                  <Tooltip
                    open={collapseTooltip.open}
                    onOpenChange={collapseTooltip.setOpen}
                  >
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label="close-pane"
                        onClick={closePane}
                        {...collapseTooltip.triggerProps}
                      >
                        <ChevronsRight size={16} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      className="flex items-center gap-1 px-1 py-0.5 text-xs"
                    >
                      Close <ShortcutBadge keys="Esc" />
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip
                    open={expandTooltip.open}
                    onOpenChange={expandTooltip.setOpen}
                  >
                    <TooltipTrigger asChild>
                      {fullPageHref ? (
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          aria-label="open-full-page"
                          {...expandTooltip.triggerProps}
                        >
                          <IntentPrefetchLink
                            href={fullPageHref}
                            onClick={closePane}
                          >
                            <MoveDiagonal2 size={16} />
                          </IntentPrefetchLink>
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          aria-label="open-full-page"
                          disabled
                        >
                          <MoveDiagonal2 size={16} />
                        </Button>
                      )}
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      className="flex items-center gap-1 px-1 py-0.5 text-xs"
                    >
                      Open in full page <ShortcutBadge keys="Ctrl+Enter" />
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="h-4 w-px shrink-0 bg-border" aria-hidden />
              <DrawerTitle className="truncate text-sm font-medium">
                {getPaneTitle(activeItem)}
              </DrawerTitle>
            </div>
            {activeItem?.type === "note" && (
              <NoteSettings
                noteId={activeItem.id}
                noteTitle={getPaneTitle(activeItem)}
                IconVariant="horizontal_icon"
                ShowWidthOp={false}
                DropdownMenuContentAlign="end"
                TooltipContentAlign="end"
              />
            )}
            {activeItem?.type === "pdf" && (
              <PdfSettings
                pdfId={activeItem.id}
                pdfTitle={getPaneTitle(activeItem)}
                iconVariant="horizontal_icon"
                dropdownMenuContentAlign="end"
                tooltipContentAlign="end"
              />
            )}
          </div>
          <div
            className={cn(
              "scrollbar-gutter-stable min-h-0 flex-1 bg-background [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:h-[0.4rem] [&::-webkit-scrollbar]:w-[0.4rem]",
              activeItem?.type === "pdf"
                ? "overflow-hidden"
                : "overflow-y-auto py-4",
            )}
          >
            {activeItem ? <HomePaneContent item={activeItem} /> : null}
          </div>
        </div>
      </DrawerPortal>
    </Drawer>
  );
}

export const HomePaneProvider = memo(function HomePaneProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [activeItem, setActiveItem] = useState<HomePaneItem | null>(null);
  const isMobile = useIsMobile();

  const openPane = useCallback(
    (item: HomePaneItem) => {
      if (isMobile) return;
      setActiveItem(item);
    },
    [isMobile],
  );

  const closePane = useCallback(() => {
    setActiveItem(null);
  }, []);

  useEffect(() => {
    if (isMobile) closePane();
  }, [isMobile, closePane]);

  const value = useMemo(
    () => ({
      activeItem,
      openPane,
      closePane,
    }),
    [activeItem, closePane, openPane],
  );

  return (
    <HomePaneContext.Provider value={value}>
      {children}
      <HomePaneDrawer activeItem={activeItem} closePane={closePane} />
    </HomePaneContext.Provider>
  );
});

export function useHomePane() {
  const context = useContext(HomePaneContext);
  if (!context) {
    throw new Error("useHomePane must be used within HomePaneProvider.");
  }
  return context;
}
