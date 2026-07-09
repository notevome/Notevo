"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  calculateHighlightRects,
  CanvasLayer,
  HighlightLayer,
  Page,
  Pages,
  Root,
  Search as LectorSearch,
  TextLayer,
  Thumbnail,
  usePdf,
  usePdfJump,
  useSearch,
} from "@anaralabs/lector";
import { GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";
import "pdfjs-dist/web/pdf_viewer.css";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileSearch,
  FileText,
  Search,
  X,
} from "lucide-react";
import { useMutation } from "convex/react";
import { useQuery } from "@/cache/useQuery";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useHoverTooltip } from "@/hooks/useHoverTooltip";
import PdfSettings from "@/components/home-components/PdfSettings";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { useDebouncedCallback } from "use-debounce";
import { useToast } from "@/hooks/use-toast";
import z from "zod";

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/legacy/build/pdf.worker.mjs",
  import.meta.url,
).toString();
const pdfTitleSchema = z
  .string()
  .min(1, "Title cannot be empty")
  .max(60, "Title must be 60 characters or less");

type LectorSearchResult = {
  pageNumber: number;
  text: string;
  score: number;
  matchIndex: number;
  isExactMatch: boolean;
  searchText?: string;
};

const ZOOM_PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];
const PDF_PAGE_GAP = 20;
type PanelMode = "search" | "thumbnails" | null;

function isFiniteRectValue(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function sanitizeHighlightRects<
  T extends { width: number; height: number; top: number; left: number },
>(rects: T[]): T[] {
  return rects.filter(
    (rect) =>
      isFiniteRectValue(rect.width) &&
      isFiniteRectValue(rect.height) &&
      isFiniteRectValue(rect.top) &&
      isFiniteRectValue(rect.left) &&
      rect.width > 0 &&
      rect.height > 0,
  );
}

function SearchPanel({
  query,
  setQuery,
  onClose,
  panelMode,
}: {
  query: string;
  setQuery: (value: string) => void;
  onClose: () => void;
  panelMode: PanelMode;
}) {
  const { searchResults, search } = useSearch();
  const { jumpToHighlightRects } = usePdfJump();
  const getPdfPageProxy = usePdf((state) => state.getPdfPageProxy);
  const setHighlight = usePdf((state) => state.setHighlight);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const inputref = useRef<HTMLInputElement>(null);

  const allResults = useMemo(
    () => [...searchResults.exactMatches, ...searchResults.fuzzyMatches],
    [searchResults.exactMatches, searchResults.fuzzyMatches],
  );

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const trimmed = query.trim();

      if (!trimmed) {
        setActiveKey(null);
        setHighlight([]);
        search("");
        return;
      }

      const nextResults = search(trimmed, {
        limit: 30,
        textSize: 90,
      });

      const rectGroups = await Promise.all(
        [...nextResults.exactMatches, ...nextResults.fuzzyMatches].map(
          async (result) => {
            const proxy = getPdfPageProxy(result.pageNumber);
            const rects = sanitizeHighlightRects(
              await calculateHighlightRects(proxy, result),
            );
            return rects.map((rect) => ({
              ...rect,
              style: () => ({
                background:
                  activeKey ===
                  `${result.pageNumber}-${result.matchIndex}-${result.searchText}`
                    ? "rgba(245, 158, 11, 0.68)"
                    : "rgba(250, 204, 21, 0.42)",
                boxShadow:
                  activeKey ===
                  `${result.pageNumber}-${result.matchIndex}-${result.searchText}`
                    ? "0 0 0 2px rgba(245, 158, 11, 0.95) inset"
                    : "0 0 0 1px rgba(250, 204, 21, 0.6) inset",
                borderRadius: "3px",
              }),
            }));
          },
        ),
      );

      if (cancelled) return;

      const flatRects = rectGroups.flat();
      setHighlight(flatRects);

      const firstResult =
        nextResults.exactMatches[0] ?? nextResults.fuzzyMatches[0];

      if (firstResult) {
        const firstKey = `${firstResult.pageNumber}-${firstResult.matchIndex}-${firstResult.searchText}`;
        const nextActiveKey = activeKey ?? firstKey;
        setActiveKey(nextActiveKey);

        if (!activeKey) {
          const firstRects = sanitizeHighlightRects(
            await calculateHighlightRects(
              getPdfPageProxy(firstResult.pageNumber),
              firstResult,
            ),
          );
          if (!cancelled) {
            jumpToHighlightRects(firstRects, "pixels", "center", -40);
          }
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [
    activeKey,
    getPdfPageProxy,
    jumpToHighlightRects,
    query,
    search,
    setHighlight,
  ]);
  useEffect(() => {
    if (panelMode === "search") {
      inputref.current?.focus();
      inputref.current?.select();
    }
  }, [panelMode]);

  const handleResultClick = async (result: LectorSearchResult) => {
    const rects = sanitizeHighlightRects(
      await calculateHighlightRects(getPdfPageProxy(result.pageNumber), result),
    );
    const nextKey = `${result.pageNumber}-${result.matchIndex}-${result.searchText}`;
    setActiveKey(nextKey);
    jumpToHighlightRects(rects, "pixels", "center", -40);
  };

  return (
    <aside className="flex h-full w-[290px] shrink-0 flex-col border-r border-border bg-card/95 backdrop-blur-sm">
      <div className="border-b border-border p-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputref}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search PDF..."
            className="h-8 border-border bg-background pl-10"
          />
        </div>
      </div>

      <div className="scrollbar-gutter-stable flex-1 overflow-y-auto p-2 transition-all scroll-smooth [&::-webkit-scrollbar]:w-[0.4rem] [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent">
        {!query.trim() ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <FileSearch className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Search inside this PDF and jump straight to highlighted matches.
            </p>
          </div>
        ) : allResults.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <Search className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No matches found for "{query}".
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {allResults.map((result) => {
              const itemKey = `${result.pageNumber}-${result.matchIndex}-${result.searchText}`;

              return (
                <button
                  key={itemKey}
                  type="button"
                  onClick={() => void handleResultClick(result)}
                  className={cn(
                    "w-full rounded-xl border border-border bg-card px-3 py-2 text-left transition-colors hover:bg-muted",
                    activeKey === itemKey && "border-muted-foreground bg-muted",
                  )}
                >
                  <p className="line-clamp-3 text-sm font-medium text-foreground">
                    {result.text}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Page {result.pageNumber}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}

function ThumbnailsPanel({ onClose }: { onClose: () => void }) {
  const currentPage = usePdf((state) => state.currentPage);
  const totalPages = usePdf((state) => state.pdfDocumentProxy.numPages);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const activeThumbnail = panelRef.current?.querySelector(
      `[data-thumbnail-page="${currentPage}"]`,
    );

    if (activeThumbnail instanceof HTMLElement) {
      activeThumbnail.scrollIntoView({
        block: "nearest",
        inline: "nearest",
        behavior: "smooth",
      });
    }
  }, [currentPage]);

  return (
    <aside className="flex h-full w-[150px] shrink-0 flex-col bg-card/95 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-border p-2">
        <p className="text-sm font-medium text-foreground">Pages</p>
      </div>
      <div
        ref={panelRef}
        className="scrollbar-gutter-stable flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 [&::-webkit-scrollbar]:w-[0.4rem] [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent"
      >
        <div className="flex flex-col items-center gap-2">
          {Array.from({ length: totalPages }, (_, index) => {
            const pageNumber = index + 1;
            const isActive = pageNumber === currentPage;

            return (
              <div
                key={pageNumber}
                data-thumbnail-page={pageNumber}
                className="flex w-full items-start gap-2"
              >
                <span className="w-4 pt-1 text-right text-sm font-semibold text-muted-foreground">
                  {pageNumber}
                </span>
                <div>
                  <Thumbnail
                    pageNumber={pageNumber}
                    className={cn(
                      "w-[88px] rounded-[14px] bg-transparent border border-border outline outline-1 outline-border hover:border-muted-foreground/50 hover:outline-muted-foreground/50",
                      isActive &&
                        "border-muted-foreground outline-muted-foreground",
                    )}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

function ZoomDropdown() {
  const zoom = usePdf((state) => state.zoom);
  const updateZoom = usePdf((state) => state.updateZoom);
  const zoomFitWidth = usePdf((state) => state.zoomFitWidth);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-8 gap-2 border-border !border-l-0 !rounded-none"
        >
          <span>{Math.round(zoom * 100)}%</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground " />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-sm font-medium text-foreground">
            {Math.round(zoom * 100)}%
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7 !rounded-full"
              onClick={() =>
                updateZoom((prev) => Number((prev - 0.1).toFixed(2)))
              }
            >
              <span className="text-base">-</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7 !rounded-full"
              onClick={() =>
                updateZoom((prev) => Number((prev + 0.1).toFixed(2)))
              }
            >
              <span className="text-base">+</span>
            </Button>
          </div>
        </div>
        <DropdownMenuItem onClick={() => zoomFitWidth()}>
          Page fit
        </DropdownMenuItem>
        {ZOOM_PRESETS.map((preset) => (
          <DropdownMenuItem key={preset} onClick={() => updateZoom(preset)}>
            {Math.round(preset * 100)}%
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PageNavigator() {
  const pages = usePdf((state) => state.pdfDocumentProxy?.numPages);
  const currentPage = usePdf((state) => state.currentPage);
  const [pageNumber, setPageNumber] = useState<string | number>(currentPage);
  const { jumpToPage } = usePdfJump();

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      jumpToPage(currentPage - 1, { behavior: "auto" });
    }
  };

  const handleNextPage = () => {
    if (currentPage < pages) {
      jumpToPage(currentPage + 1, { behavior: "auto" });
    }
  };

  useEffect(() => {
    setPageNumber(currentPage);
  }, [currentPage, pageNumber]);

  return (
    <div className=" flex items-center gap-0 text-sm text-muted-foreground ">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 border-border !rounded-none"
        onClick={handlePreviousPage}
        disabled={currentPage <= 1}
        aria-label="previous-page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="flex justify-center items-center bg-background border-t border-b border-border h-8 ">
        <Input
          type="number"
          value={pageNumber}
          onChange={(e) => setPageNumber(e.target.value)}
          onBlur={(e) => {
            const value = Number(e.target.value);
            if (value >= 1 && value <= pages && currentPage !== value) {
              jumpToPage(value, { behavior: "auto" });
            } else {
              setPageNumber(currentPage);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
          inputMode="numeric"
          aria-label="current-page-input"
          className="h-7 w-7 p-0 mx-1 mb-0 bg-transparent border-0 text-center text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        <span className=" mr-3"> of {pages || 1}</span>
      </div>

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 border-border !rounded-none"
        onClick={handleNextPage}
        disabled={currentPage >= pages}
        aria-label="next-page"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function PdfViewerContent({
  fileUrl,
  title,
  pdfId,
  pdftitle,
}: {
  fileUrl: string;
  title: string;
  pdfId: Id<"pdfs">;
  pdftitle: string;
}) {
  const { open, isMobile } = useSidebar();
  const [query, setQuery] = useState("");
  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const searchTooltip = useHoverTooltip(100);
  const thumbnailsTooltip = useHoverTooltip(100);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(pdftitle || "");
  const nameInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const updatePdf = useMutation(api.pdfs.updatePdf);

  const handleNameDoubleClick = useCallback(() => {
    setEditedName(pdftitle || "");
    setIsEditingName(true);
  }, [pdftitle]);

  useEffect(() => {
    if (isEditingName) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [isEditingName]);

  const handleNameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        setIsEditingName(false);
      } else if (e.key === "Escape") {
        setIsEditingName(false);
        setEditedName(pdftitle || "");
      }
    },
    [pdftitle],
  );

  const debouncedUpdatePdfTitle = useDebouncedCallback((newTitle: string) => {
    const currentTitle = pdftitle || "";
    const result = pdfTitleSchema.safeParse(newTitle);

    if (!result.success) {
      const issue = result.error.issues[0];
      if (issue.code === "too_small") {
        toast({
          title: "Naming failed",
          description: "Title cannot be empty.",
          variant: "destructive",
        });
      } else if (issue.code === "too_big") {
        setEditedName(pdftitle);
        toast({
          title: "Naming failed",
          description: "Title must be 60 characters or less.",
          variant: "destructive",
        });
      }
      return;
    }

    if (newTitle !== currentTitle) {
      try {
        void updatePdf({ _id: pdfId, title: newTitle });
      } catch (error) {
        console.error("Error updating PDF title:", error);
        toast({
          title: "Naming failed",
          description: "Could not update the PDF title.",
          variant: "destructive",
        });
      }
    }
  }, 300);
  return (
    <LectorSearch
      loading={
        <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
          Preparing PDF search...
        </div>
      }
    >
      <div className=" relative min-w-full min-h-full bg-transparent ">
        <div className=" pointer-events-none absolute inset-x-0 top-1 z-50">
          <div
            className={`pointer-events-auto mx-auto flex w-fit flex-nowrap items-center justify-between gap-1 app-radius-lg border border-border bg-card/95 px-0.5 py-0.5 backdrop-blur-xl`}
          >
            {(!open || isMobile) && (
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 border border-border"
                aria-label="show-search-panel"
              >
                <SidebarTrigger />
              </Button>
            )}
            <div
              className={` px-1.5 h-8 py-0 border border-border bg-background hover:border-muted-foreground/50 ${!open || isMobile ? "!rounded-none" : "app-radius-md"} `}
            >
              <h1
                onDoubleClick={handleNameDoubleClick}
                title="Double-click to rename"
                className=" md:text-lg cursor-text flex justify-start items-center min-w-[16rem] overflow-hidden "
              >
                {isEditingName ? (
                  <Input
                    ref={nameInputRef as any}
                    value={editedName}
                    onChange={(e: any) => {
                      setEditedName(e.target.value);
                      debouncedUpdatePdfTitle(e.target.value.trim());
                    }}
                    onKeyDown={handleNameKeyDown}
                    onBlur={() => {
                      setIsEditingName(false);
                    }}
                    placeholder="Untitled PDF"
                    className=" !w-full placeholder:text-muted-foreground/50 border-transparent bg-transparent px-0 py-0 my-0 md:text-lg font-bol h-8 cursor-text leading-12 focus-visible:ring-0 focus-visible:outline-none focus-visible:ring-offset-0 "
                  />
                ) : (
                  <span className=" w-full overflow-hidden text-nowrap">
                    {pdftitle || "Untitled PDF"}
                  </span>
                )}
              </h1>
            </div>
            <div className="flex items-center gap-0">
              <Tooltip open={searchTooltip.open}>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 border border-border !rounded-none"
                    onClick={() =>
                      setPanelMode((current) =>
                        current === "search" ? null : "search",
                      )
                    }
                    aria-label="show-search-panel"
                    aria-pressed={panelMode === "search"}
                    {...searchTooltip.triggerProps}
                  >
                    {panelMode === "search" ? (
                      <X size={16} />
                    ) : (
                      <FileSearch size={16} />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className=" text-xs px-1.5 py-1">
                  {panelMode === "search" ? "Close Search" : "Open Search"}
                </TooltipContent>
              </Tooltip>
              <Tooltip open={thumbnailsTooltip.open}>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 border-y !border-l-0 border-border !rounded-none"
                    onClick={() =>
                      setPanelMode((current) =>
                        current === "thumbnails" ? null : "thumbnails",
                      )
                    }
                    aria-label="show-thumbnails-panel"
                    aria-pressed={panelMode === "thumbnails"}
                    {...thumbnailsTooltip.triggerProps}
                  >
                    {panelMode === "thumbnails" ? (
                      <X size={16} />
                    ) : (
                      <span className="text-[11px] font-semibold">Pg</span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className=" text-xs px-1.5 py-1">
                  {panelMode === "thumbnails"
                    ? "Close Thumbnails"
                    : "Open Thumbnails"}
                </TooltipContent>
              </Tooltip>
              <ZoomDropdown />
            </div>
            <PageNavigator />
            <PdfSettings
              pdfId={pdfId}
              pdfTitle={pdftitle}
              iconVariant="horizontal_icon"
              dropdownMenuContentAlign="end"
              tooltipContentAlign="end"
              btnVariant="outline"
              btnClassName="h-8 w-8 m-0 px-1 border-border !rounded-none"
            />
          </div>
        </div>

        {panelMode === "search" ? (
          <div className="absolute left-0 top-0 z-50 h-full w-[290px] max-w-[calc(100%-1.5rem)] overflow-hidden border border-border border-l-0 border-t-0">
            <SearchPanel
              query={query}
              setQuery={setQuery}
              panelMode={panelMode}
              onClose={() => setPanelMode(null)}
            />
          </div>
        ) : null}

        {panelMode === "thumbnails" ? (
          <div className="absolute left-0 top-0 z-50 h-full overflow-hidden border border-border border-l-0 border-t-0">
            <ThumbnailsPanel onClose={() => setPanelMode(null)} />
          </div>
        ) : null}

        <div className=" absolute inset-y-0 right-0 z-30 flex h-screen w-full items-center justify-center border-b border-border bg-background">
          <Pages className="scrollbar-gutter-stable [&::-webkit-scrollbar-track]:bg-transparent h-full min-h-0 w-full transition-all scroll-smooth [&::-webkit-scrollbar]:w-[0.4rem] [&::-webkit-scrollbar-thumb]:bg-border">
            <Page>
              <CanvasLayer />
              <TextLayer />
              <HighlightLayer />
            </Page>
          </Pages>
        </div>
      </div>
    </LectorSearch>
  );
}

function PdfViewerShell({
  fileUrl,
  title,
  pdfId,
  pdftitle,
}: {
  fileUrl: string;
  title: string;
  pdfId: Id<"pdfs">;
  pdftitle: string;
}) {
  const { open, isMobile } = useSidebar();

  return (
    <Root
      source={fileUrl}
      isZoomFitWidth
      className={`${open && !isMobile ? `app-radius-lg` : null} pdf-viewer-shell relative h-full w-full overflow-hidden rounded-none border-0 bg-background flex flex-col justify-stretch`}
      loader={
        <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
          Loading PDF...
        </div>
      }
      zoomOptions={{
        minZoom: 0.5,
        maxZoom: 10,
      }}
    >
      <PdfViewerContent
        fileUrl={fileUrl}
        title={title}
        pdfId={pdfId}
        pdftitle={pdftitle}
      />
    </Root>
  );
}

export default function PdfViewerPageClient({ pdfId }: { pdfId: Id<"pdfs"> }) {
  const pdf = useQuery(api.pdfs.getPdfById, { _id: pdfId });
  const [isViewerReady, setIsViewerReady] = useState(false);
  const [hasMeasuredViewport, setHasMeasuredViewport] = useState(false);
  const viewerHostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIsViewerReady(false);
    const frame = window.requestAnimationFrame(() => {
      setIsViewerReady(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [pdfId]);

  useEffect(() => {
    setHasMeasuredViewport(false);
    let frameId = 0;
    let attempts = 0;

    const measureUntilReady = () => {
      const host = viewerHostRef.current;

      if (!host) {
        frameId = window.requestAnimationFrame(measureUntilReady);
        return;
      }

      const rect = host.getBoundingClientRect();
      const hasUsableWidth = rect.width > 0;
      const hasUsableHeight = rect.height > 0;

      if (hasUsableWidth && hasUsableHeight) {
        setHasMeasuredViewport(true);
        return;
      }

      attempts += 1;

      if (attempts >= 20 && hasUsableWidth) {
        setHasMeasuredViewport(true);
        return;
      }

      frameId = window.requestAnimationFrame(measureUntilReady);
    };

    frameId = window.requestAnimationFrame(measureUntilReady);

    return () => window.cancelAnimationFrame(frameId);
  }, [pdfId]);

  if (pdf === undefined) {
    return (
      <div className="flex h-full max-w-full min-h-0 flex-col px-0 py-0 mx-0">
        <div className="flex-1 rounded-none border-none bg-transparent animate-pulse" />
      </div>
    );
  }

  if (!pdf.fileUrl) {
    return (
      <div className="flex h-full max-w-none min-h-0 flex-col ">
        <Card className="border-border bg-card">
          <CardContent className="py-10 text-center">
            <div className="flex flex-col items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <h1 className="text-xl font-semibold text-foreground">
                PDF unavailable
              </h1>
              <p className="text-sm text-muted-foreground">
                We couldn&apos;t generate a view link for this PDF.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      ref={viewerHostRef}
      className="flex h-full min-h-0 w-full flex-1 overflow-hidden"
    >
      {isViewerReady && hasMeasuredViewport ? (
        <PdfViewerShell
          fileUrl={pdf.fileUrl}
          title={pdf.title || "Untitled PDF"}
          pdfId={pdf._id}
          pdftitle={pdf.title || "Untitled PDF"}
        />
      ) : (
        <div className="flex-1 bg-card animate-pulse" />
      )}
    </div>
  );
}
