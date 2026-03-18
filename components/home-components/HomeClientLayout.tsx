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
import { MobileWarning } from "@/components/ui/mobile-warning";
import NoteSettings from "@/components/home-components/NoteSettings";
import { usePathname, useSearchParams } from "next/navigation";
import type { Id } from "@/convex/_generated/dataModel";
import { parseSlug } from "@/lib/parseSlug";
import PublicNote from "../PublicNote";
import { motion } from "framer-motion";

const fadeTransition = {
  show: { ease: "easeInOut" as const, duration: 0 },
  hide: { ease: "easeInOut" as const, duration: 0 },
};

const HomeContent = memo(({ children }: { children: ReactNode }) => {
  const { open, isMobile } = useSidebar();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

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
  const noteTitle = parseSlug(`${pathSegments[2]}`);

  const showTopFade = scrollTop > 0;

  return (
    <div className="flex h-screen w-full bg-muted overflow-hidden">
      <AppSidebar />
      <main
        className={`relative flex flex-col flex-1 h-auto border-primary/20 bg-background transition-[margin,border-radius] duration-300 ease-linear motion-reduce:transition-none ${
          open && !isMobile ? `rounded-tl-lg border-t border-l mt-3` : ""
        } rounded-none`}
      >
        <div className="z-[10] relative w-full flex items-center justify-start px-5 gap-3 mx-auto rounded-tl-lg border-none py-2.5 ">
          <div className="flex justify-between items-center w-full">
            <div className="flex justify-start items-center gap-3">
              {(!open || isMobile) && <SidebarTrigger />}
              <BreadcrumbWithCustomSeparator />
            </div>
            <div>
              {noteid && noteTitle && (
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
          className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-primary/50 scrollbar-track-transparent py-6"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: showTopFade ? 1 : 0 }}
            transition={showTopFade ? fadeTransition.show : fadeTransition.hide}
            className="sticky -top-12 left-0 w-full h-28 bg-gradient-to-b from-background from-25% to-transparent to-100% z-[5] pointer-events-none -mb-32"
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

const HomeClientLayout = memo(
  ({
    children,
  }: {
    children: ReactNode;
  }) => {
    return (
      <SidebarProvider>
        <HomeContent>{children}</HomeContent>
      </SidebarProvider>
    );
  },
);

HomeClientLayout.displayName = "homeClientLayout";

export default HomeClientLayout;
