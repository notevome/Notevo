"use client";
import {
  type ReactNode,
  memo,
  useRef,
  useEffect,
  useState,
  useCallback,
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
import SearchDialog from "@/components/home-components/SearchDialog";
import { usePathname, useSearchParams } from "next/navigation";
import type { Id } from "@/convex/_generated/dataModel";
import { parseSlug } from "@/lib/parseSlug";
import { useQuery } from "@/cache/useQuery";
import { api } from "@/convex/_generated/api";
import PublicNote from "../PublicNote";
import { motion } from "framer-motion";
import { NOISE_PNG } from "@/lib/data";
import { useTheme } from "next-themes";
import { HomePaneProvider } from "@/components/home-components/HomePaneDrawer";
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
  const noteid = searchParams.get("id") as Id<"notes">;
  const pdfId = searchParams.get("pdfId") as Id<"pdfs"> | null;
  const noteTitle = parseSlug(`${pathSegments[2]}`);
  const isPdfRoute = pathSegments[2] === "pdf";
  const currentPdf = useQuery(
    api.pdfs.getPdfById,
    pdfId ? { _id: pdfId } : "skip",
  );

  const showTopFade = scrollTop > 0;

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
        className={`relative flex min-h-0 flex-col flex-1 border-border bg-background transition-[margin,border-radius] duration-150 ease-linear motion-reduce:transition-none ${
          open && !isMobile ? `rounded-tl-lg border-t border-l mt-3` : ""
        } rounded-none`}
      >
        <div className="z-30 absolute top-0 left-0 w-full flex items-center justify-start gap-3 mx-auto bg-none rounded-tl-lg border-none">
          <div className="flex justify-between items-center w-full px-4 py-2 ">
            <div className="flex justify-start items-center gap-3">
              {(!open || isMobile) && !isPdfRoute && <SidebarTrigger />}
              {!isPdfRoute ? <BreadcrumbWithCustomSeparator /> : null}
            </div>
            <div>
              {!isPdfRoute && noteid && noteTitle && (
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
            </div>
          </div>
        </div>
        <div
          ref={scrollContainerRef}
          className={`scrollbar-gutter-stable min-h-0 flex-1 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar]:w-[0.4rem] [&::-webkit-scrollbar-track]:bg-transparent ${
            isPdfRoute ? "overflow-hidden pt-0" : "overflow-y-auto py-16"
          }`}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: showTopFade ? 1 : 0 }}
            transition={showTopFade ? fadeTransition.show : fadeTransition.hide}
            className="rounded-tl-lg absolute top-0 left-0 w-full h-[4rem] bg-gradient-to-b from-background from-0% via-background/65 via-45% to-100% to-transparent z-20 pointer-events-none -mb-16"
            aria-hidden
          />
          {children}
        </div>
        <MobileWarning />
      </main>
    </div>
  );
});

HomeContent.displayName = "homeContent";

const HomeClientLayout = memo(({ children }: { children: ReactNode }) => {
  return (
    <SidebarProvider>
      <HomePaneProvider>
        <HomeContent>{children}</HomeContent>
      </HomePaneProvider>
    </SidebarProvider>
  );
});

HomeClientLayout.displayName = "homeClientLayout";

export default HomeClientLayout;
