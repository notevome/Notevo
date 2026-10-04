"use client";
import {
  type ReactNode,
  memo,
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import {
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import AppSidebar from "@/components/home-components/AppSidebar";
import BreadcrumbWithCustomSeparator from "@/components/home-components/BreadcrumbWithCustomSeparator";
import GlobalFolderDropUpload from "@/components/home-components/GlobalFolderDropUpload";
import { MobileWarning } from "@/components/ui/mobile-warning";
import NoteSettings from "@/components/home-components/NoteSettings";
import PdfSettings from "@/components/home-components/PdfSettings";
import WhiteboardSettings from "@/components/home-components/WhiteboardSettings";
import SearchDialog from "@/components/home-components/SearchDialog";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Id } from "@/convex/_generated/dataModel";
import { parseSlug } from "@/lib/parseSlug";
import { extractIdFromSlug } from "@/lib/slug";
import { useQuery } from "@/cache/useQuery";
import { api } from "@/convex/_generated/api";
import PublicNote from "../PublicNote";
import { motion } from "framer-motion";
import { NOISE_PNG } from "@/lib/data";
import { useTheme } from "next-themes";
import { HomePaneProvider } from "@/components/home-components/HomePaneDrawer";
import {
  PendingNoteDraftProvider,
  usePendingNoteDraftContext,
} from "@/components/home-components/PendingNoteDraftProvider";
import PendingNoteDraftPageClient from "@/app/home/[id]/[itemId]/PendingNoteDraftPageClient";
import NotePageClient from "@/app/home/[id]/[itemId]/NotePageClient";
import { resolveDraftTokenToRender } from "@/lib/pendingNoteDraft";
import { getPrefetchedNote } from "@/lib/notePrefetchCache";
const fadeTransition = {
  show: { ease: "easeInOut" as const, duration: 0 },
  hide: { ease: "easeInOut" as const, duration: 0 },
};

const HomeContent = memo(({ children }: { children: ReactNode }) => {
  const { open, isMobile } = useSidebar();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [isDark, setIsDark] = useState(false);
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    if (resolvedTheme === "dark") setIsDark(true);
    else setIsDark(false);
  }, [resolvedTheme]);
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setScrollTop(el.scrollTop);
  }, []);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    scrollContainer.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pathSegments = pathname.split("/").filter((segment) => segment);
  const homepage = pathname === "/home";
  const { activeDraftToken, getDraft, finishDraft } =
    usePendingNoteDraftContext();
  const rawNoteId = searchParams.get("id") as Id<"notes"> | null;
  const rawPdfId = searchParams.get("pdfId") as Id<"pdfs"> | null;
  const rawWhiteboardId = searchParams.get(
    "whiteboardId",
  ) as Id<"whiteboards"> | null;

  const currentItemSlug =
    pathSegments.length >= 3 && pathSegments[0] === "home"
      ? pathSegments[2]
      : null;
  const routeDraftToken = currentItemSlug?.startsWith("draft-")
    ? currentItemSlug.slice("draft-".length)
    : null;
  const activeDraft = activeDraftToken ? getDraft(activeDraftToken) : undefined;
  const slugId = currentItemSlug ? extractIdFromSlug(currentItemSlug) : null;
  const activeDraftNoteId =
    activeDraft?.noteId && slugId === String(activeDraft.noteId)
      ? activeDraft.noteId
      : null;
  const cachedRouteNoteId = routeDraftToken
    ? null
    : (rawNoteId ?? (!rawPdfId && !rawWhiteboardId ? slugId : null));
  const cachedRouteNote = cachedRouteNoteId
    ? getPrefetchedNote(String(cachedRouteNoteId))
    : undefined;
  const promotedNote = useQuery(
    api.notes.getNoteById,
    activeDraftNoteId ? { _id: activeDraftNoteId } : "skip",
  );
  const [promotedNoteRoute, setPromotedNoteRoute] = useState<{
    noteId: Id<"notes">;
    note: NonNullable<typeof promotedNote>;
  } | null>(null);
  const draftTokenToRender = resolveDraftTokenToRender({
    routeDraftToken,
    activeDraftToken,
    activeDraftOriginPath: activeDraft?.originPath ?? null,
    activeDraftNoteId: activeDraftNoteId ? String(activeDraftNoteId) : null,
    pathname,
  });

  const draftPromotionState = useMemo(() => {
    if (!activeDraftToken || !activeDraftNoteId || promotedNote === undefined) {
      return null;
    }

    if (pathname === activeDraft?.originPath) {
      return null;
    }

    return { token: activeDraftToken };
  }, [
    activeDraft?.originPath,
    activeDraftNoteId,
    activeDraftToken,
    pathname,
    promotedNote,
  ]);

  useEffect(() => {
    if (!draftPromotionState) {
      return;
    }

    const draft = getDraft(draftPromotionState.token);
    if (draft && promotedNote && activeDraftNoteId) {
      setPromotedNoteRoute({
        noteId: activeDraftNoteId,
        note: promotedNote,
      });
      finishDraft(draftPromotionState.token);
    }
  }, [
    activeDraftNoteId,
    draftPromotionState,
    finishDraft,
    getDraft,
    promotedNote,
  ]);

  const detectedItemType = useQuery(
    api.notes.getItemType,
    !currentItemSlug?.startsWith("draft-") &&
      !cachedRouteNote &&
      !rawNoteId &&
      !rawPdfId &&
      !rawWhiteboardId &&
      slugId
      ? { id: slugId }
      : "skip",
  );

  const whiteboardId =
    rawWhiteboardId ||
    (detectedItemType === "whiteboard" ? (slugId as Id<"whiteboards">) : null);
  const pdfId =
    rawPdfId || (detectedItemType === "pdf" ? (slugId as Id<"pdfs">) : null);
  const noteid =
    rawNoteId ||
    (cachedRouteNote?._id as Id<"notes"> | undefined) ||
    (detectedItemType === "note" ? (slugId as Id<"notes">) : null);
  const promotedNoteRouteIsCurrent =
    promotedNoteRoute && slugId === String(promotedNoteRoute.noteId);
  const cachedNoteRouteIsCurrent = Boolean(
    cachedRouteNote &&
      (slugId === String(cachedRouteNote._id) ||
        rawNoteId === cachedRouteNote._id),
  );

  const noteTitle = parseSlug(`${pathSegments[2] || ""}`);
  const isPdfRoute = Boolean(pdfId);
  const isWhiteboardRoute = Boolean(whiteboardId);

  const showTopFade = isWhiteboardRoute ? true : scrollTop > 0;

  const isNoteDetailRoute =
    /^\/home\/[^/]+\/[^/]+\/?$/.test(pathname) &&
    !isPdfRoute &&
    !isWhiteboardRoute;
  const isPastFadeGrowThreshold = scrollTop > 180;
  const fadeHeight =
    !isNoteDetailRoute && isPastFadeGrowThreshold ? "8rem" : "4rem";

  return (
    <div className="flex h-screen w-full bg-muted overflow-hidden">
      <AppSidebar />
      <GlobalFolderDropUpload />
      <SearchDialog showTrigger={false} enableShortcut={true} />
      <div
        aria-hidden="true"
        className="pointer-events-none select-none absolute inset-0"
        style={{
          backgroundImage: `url(${NOISE_PNG})`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
          opacity: isDark ? 0.03 : 0.02,
          mixBlendMode: "multiply",
          zIndex: 900002,
        }}
      />
      <main
        className={`relative flex min-h-0 flex-col flex-1 border-border bg-background transition-[margin,border-radius] duration-150 ease-linear motion-reduce:transition-none ${open && !isMobile ? "app-radius-lg border-t border-l mt-3" : ""} app-radius-none`}
      >
        <div className="z-30 absolute top-0 left-0 w-full flex items-center justify-start gap-3 mx-auto bg-none app-radius-lg border-none">
          <div className="flex justify-between items-center w-full px-3.5 ">
            <div className="flex justify-start items-center gap-2 py-2.5">
              {isMobile && !isPdfRoute && <SidebarTrigger />}
              {!isPdfRoute && !homepage ? (
                <BreadcrumbWithCustomSeparator />
              ) : null}
            </div>
            <div>
              {!isPdfRoute && !isWhiteboardRoute && noteid && noteTitle && (
                <span className=" flex justify-between items-center gap-2">
                  <PublicNote noteId={noteid} noteTitle={noteTitle} />
                  <NoteSettings
                    noteId={noteid}
                    noteTitle={noteTitle}
                    ShowWidthOp={true}
                    IconVariant="horizontal_icon"
                    DropdownMenuContentAlign="end"
                    TooltipContentAlign="end"
                  />
                </span>
              )}
              {whiteboardId && (
                <WhiteboardSettings
                  whiteboardId={whiteboardId}
                  IconVariant="horizontal_icon"
                  className={`fixed transition-all duration-150 ease-linear motion-reduce:transition-none ${open && !isMobile ? "top-4" : "top-1"} right-2`}
                />
              )}
            </div>
          </div>
        </div>
        <div
          ref={scrollContainerRef}
          className={`scrollbar-gutter-stable min-h-0 flex-1 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar]:w-[0.4rem] [&::-webkit-scrollbar-track]:bg-transparent ${
            isPdfRoute || isWhiteboardRoute
              ? "overflow-hidden py-0"
              : "overflow-y-auto py-12"
          }`}
        >
          <motion.div
            initial={{ opacity: 0, height: "4rem" }}
            animate={{ opacity: showTopFade ? 1 : 0, height: fadeHeight }}
            transition={{
              opacity: showTopFade ? fadeTransition.show : fadeTransition.hide,
              height: { ease: "easeInOut", duration: 0.2 },
            }}
            className="app-radius-lg absolute top-0 left-0 w-full bg-gradient-to-b from-background from-0% via-background/65 via-45% to-100% to-transparent z-20 pointer-events-none -mb-16"
            aria-hidden
          />
          {promotedNoteRouteIsCurrent ? (
            <NotePageClient
              key={promotedNoteRoute.noteId}
              noteId={promotedNoteRoute.noteId}
              initialNote={promotedNoteRoute.note}
            />
          ) : cachedNoteRouteIsCurrent && cachedRouteNote ? (
            <NotePageClient
              key={cachedRouteNote._id}
              noteId={cachedRouteNote._id}
              initialNote={cachedRouteNote}
            />
          ) : draftTokenToRender ? (
            <PendingNoteDraftPageClient
              key={draftTokenToRender}
              token={draftTokenToRender}
            />
          ) : (
            children
          )}
        </div>
        <MobileWarning />
      </main>
    </div>
  );
});

HomeContent.displayName = "homeContent";

const HomeClientLayout = memo(({ children }: { children: ReactNode }) => {
  return (
    <PendingNoteDraftProvider>
      <SidebarProvider>
        <HomePaneProvider>
          <HomeContent>{children}</HomeContent>
        </HomePaneProvider>
      </SidebarProvider>
    </PendingNoteDraftProvider>
  );
});

HomeClientLayout.displayName = "homeClientLayout";

export default HomeClientLayout;
