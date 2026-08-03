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
import { PanelRightClose, X } from "lucide-react";
import NotePageClient from "@/app/home/[id]/[slug]/NotePageClient";
import PdfViewerPageClient from "@/app/home/[id]/pdf/[pdfId]/PdfViewerPageClient";
import WorkingSpacePageClient from "@/app/home/[id]/WorkingSpacePageClient";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerPortal,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useHoverTooltip } from "@/hooks/useHoverTooltip";
import { cn } from "@/lib/utils";
import { parseSlug } from "@/lib/parseSlug";
import type { Id } from "@/convex/_generated/dataModel";

type HomePaneItem =
  | {
      type: "note";
      id: Id<"notes">;
      title?: string;
    }
  | {
      type: "pdf";
      id: Id<"pdfs">;
      title?: string;
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
  const closeTooltip = useHoverTooltip(300);

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
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-border bg-card/80 px-3 backdrop-blur">
            <div className="flex min-w-0 items-center gap-2">
              <PanelRightClose className="h-4 w-4 shrink-0 text-muted-foreground" />
              <DrawerTitle className="truncate text-sm font-medium">
                {getPaneTitle(activeItem)}
              </DrawerTitle>
            </div>
            <DrawerClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label="close-pane"
                {...closeTooltip.triggerProps}
              >
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
          <div
            className={cn(
              "scrollbar-gutter-stable min-h-0 flex-1 bg-background [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:h-[0.4rem] [&::-webkit-scrollbar]:w-[0.4rem]",
              activeItem?.type === "pdf"
                ? "overflow-hidden"
                : "overflow-y-auto py-10",
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

  const openPane = useCallback((item: HomePaneItem) => {
    setActiveItem(item);
  }, []);

  const closePane = useCallback(() => {
    setActiveItem(null);
  }, []);

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
