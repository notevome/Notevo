"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Eye,
  EyeClosed,
  Copy,
  CheckSquare,
  Globe2Icon,
  ExternalLink,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useMutation } from "convex/react";
import { useQuery } from "@/cache/useQuery";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import type { Id } from "@/convex/_generated/dataModel";
import Image from "next/image";
import { useTheme } from "next-themes";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";
import { useMediaQuery } from "react-responsive";
import { useHoverTooltip } from "@/hooks/useHoverTooltip";

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const LinkedInIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.75a1.45 1.45 0 1 0 0 2.9 1.45 1.45 0 0 0 0-2.9z" />
  </svg>
);

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const SlackIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.527 2.527 0 0 1 2.52-2.52h6.313A2.528 2.528 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
  </svg>
);

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.99c-.002 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662a11.87 11.87 0 0 0 5.71 1.454h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
  </svg>
);

function TabSlider({ children }: { children: React.ReactNode }) {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const checkScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const hasOverflow = container.scrollWidth > container.clientWidth;
    setCanScrollLeft(container.scrollLeft > 0.5);
    setCanScrollRight(
      hasOverflow &&
        container.scrollLeft <
          container.scrollWidth - container.clientWidth - 0.5,
    );
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    checkScroll();

    const resizeObserver = new ResizeObserver(() => checkScroll());
    const mutationObserver = new MutationObserver(() => checkScroll());

    resizeObserver.observe(container);
    mutationObserver.observe(container, { childList: true, subtree: true });
    container.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      container.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll]);

  const scroll = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollTo({
      left:
        direction === "left"
          ? container.scrollLeft - 100
          : container.scrollLeft + 100,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative w-full group flex items-center">
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-card via-card/90 to-transparent z-[15] pointer-events-none app-radius-l-md" />
      )}

      {canScrollLeft && (
        <Button
          size="icon"
          variant="Trigger"
          type="button"
          className="absolute left-0.5 z-[20] h-7 w-7"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            scroll("left");
          }}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
      )}

      <div
        ref={scrollContainerRef}
        className="w-full overflow-x-auto overflow-y-hidden scroll-smooth select-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>

      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card via-card/90 to-transparent z-[15] pointer-events-none app-radius-r-md" />
      )}

      {canScrollRight && (
        <Button
          size="icon"
          variant="Trigger"
          type="button"
          className="absolute right-0.5 z-[20] h-7 w-7 "
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            scroll("right");
          }}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}

interface PublicNoteProp {
  noteId: Id<"notes">;
  noteTitle: string | any;
  BtnClassName?: string;
}

export default function PublicNote({
  noteId,
  noteTitle,
  BtnClassName,
}: PublicNoteProp) {
  const isMobile = useMediaQuery({ maxWidth: 640 });
  const [open, setOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [ogImageLoaded, setOgImageLoaded] = useState(false);
  const tooltip = useHoverTooltip(100);
  const copyTooltip = useHoverTooltip(100);

  const { theme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark" || theme === "dark";

  const updateNote = useMutation(api.notes.updateNote).withOptimisticUpdate(
    (local, args) => {
      const { _id, title, body, published } = args;

      const note = local.getQuery(api.notes.getNoteById, { _id });
      if (note) {
        local.setQuery(
          api.notes.getNoteById,
          { _id },
          {
            ...note,
            title: title ?? note.title,
            body: body ?? note.body,
            published: published !== undefined ? published : note.published,
            updatedAt: Date.now(),
          },
        );
      }
    },
  );

  const getNote = useQuery(api.notes.getNoteById, { _id: noteId });
  if (!getNote) return null;

  const handlePublished = async () => {
    if (getNote === undefined || getNote === null) {
      return null;
    }
    await updateNote({
      _id: noteId,
      published: !getNote.published,
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        `https://notevo.me/public/document/${noteId}`,
      );
      setIsCopied(true);
      copyTooltip.hide();
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) tooltip.hide();
      }}
    >
      <Tooltip open={tooltip.open}>
        <DropdownMenuTrigger asChild>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className={cn("h-8 px-2 text-sm mt-0.5 gap-1", BtnClassName)}
              {...tooltip.triggerProps}
            >
              {getNote?.published ? (
                <>
                  <EyeClosed size={14} />
                  {!isMobile && "Unpublish"}
                </>
              ) : (
                <>
                  <Eye size={14} />
                  {!isMobile && " Publish"}
                </>
              )}
            </Button>
          </TooltipTrigger>
        </DropdownMenuTrigger>
        <TooltipContent side="bottom" alignOffset={0} align="end">
          {getNote?.published
            ? "Take a look at your published note"
            : "Publish your note to the web"}
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent
        side="bottom"
        alignOffset={0}
        align="end"
        className=" min-w-[18.5rem] max-w-[25rem] px-3 pb-3 pt-2 space-y-4 text-muted-foreground z-[10000]"
      >
        <DropdownMenuGroup className="relative">
          {getNote?.published ? (
            <header className="w-full text-start flex flex-col justify-center items-start gap-3">
              <span className="px-1 space-y-0.5">
                <h1 className="text-base text-foreground font-bold">
                  Open Graph preview
                </h1>
                <p className="text-xs max-w-72 font-medium text-muted-foreground">
                  A quick glimpse of how this webpage appears when shared on
                  social platforms :
                </p>
              </span>

              <Tabs defaultValue="default" className="w-full space-y-2">
                <TabSlider>
                  <TabsList className="flex h-8 w-max justify-start p-1 bg-muted/80 border border-border app-radius-md gap-1 select-none">
                    <TabsTrigger
                      value="default"
                      className="text-[11px] px-2 py-1 gap-1 h-6 shrink-0"
                    >
                      <ImageIcon size={12} />
                      Default
                    </TabsTrigger>
                    <TabsTrigger
                      value="facebook"
                      className="text-[11px] px-2 py-1 gap-1 h-6 shrink-0"
                    >
                      <FacebookIcon className="w-3 h-3 text-[#1877F2]" />
                      Facebook
                    </TabsTrigger>
                    <TabsTrigger
                      value="slack"
                      className="text-[11px] px-2 py-1 gap-1 h-6 shrink-0"
                    >
                      <SlackIcon className="w-3 h-3 text-[#E01E5A]" />
                      Slack
                    </TabsTrigger>
                    <TabsTrigger
                      value="whatsapp"
                      className="text-[11px] px-2 py-1 gap-1 h-6 shrink-0"
                    >
                      <WhatsAppIcon
                        className={cn(
                          "w-3 h-3",
                          isDark ? "text-[#25D366]" : "text-[#128C7E]",
                        )}
                      />
                      WhatsApp
                    </TabsTrigger>
                    <TabsTrigger
                      value="twitter"
                      className="text-[11px] px-2 py-1 gap-1 h-6 shrink-0"
                    >
                      <XIcon className="w-3 h-3 text-foreground" />
                      Twitter / X
                    </TabsTrigger>
                    <TabsTrigger
                      value="linkedin"
                      className="text-[11px] px-2 py-1 gap-1 h-6 shrink-0"
                    >
                      <LinkedInIcon className="w-3 h-3 text-[#0A66C2]" />
                      LinkedIn
                    </TabsTrigger>
                  </TabsList>
                </TabSlider>

                {/* Default OG Image */}
                <TabsContent value="default" className="mt-0">
                  <div className="relative w-full h-48 border border-border aspect-video app-radius-md overflow-hidden bg-muted">
                    <Image
                      src={`/api/og?id=${noteId}`}
                      alt="Open Graph Image"
                      fill
                      unoptimized
                      draggable={false}
                      loading="eager"
                      quality={80}
                      onLoad={() => setOgImageLoaded(true)}
                      onError={() => setOgImageLoaded(false)}
                      className={cn(
                        "object-fill select-none [-webkit-user-drag:none] transition-opacity duration-300",
                        ogImageLoaded ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {!ogImageLoaded && (
                      <div className="absolute inset-0 flex items-center justify-center animate-pulse">
                        <Globe2Icon
                          size={20}
                          className="text-muted-foreground"
                        />
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Facebook Card Preview */}
                <TabsContent value="facebook" className="mt-0">
                  <div className="w-full border border-border app-radius-md overflow-hidden bg-card text-card-foreground shadow-sm">
                    <div className="relative w-full h-48 bg-muted overflow-hidden">
                      <Image
                        src={`/api/og?id=${noteId}`}
                        alt="Facebook OG Preview"
                        fill
                        unoptimized
                        loading="eager"
                        quality={80}
                        className="object-cover"
                      />
                    </div>
                    <div className="p-2.5 bg-muted/40 border-t border-border space-y-0.5">
                      <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                        NOTEVO.ME
                      </p>
                      <p className="text-xs font-bold text-foreground line-clamp-1">
                        {getNote?.title?.trim() || noteTitle || "Untitled note"}{" "}
                        - Notevo
                      </p>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-tight">
                        {getNote?.preview?.trim() ||
                          "No Description. This is a shared note on Notevo. View and read this note on Notevo"}
                      </p>
                    </div>
                  </div>
                </TabsContent>

                {/* LinkedIn Card Preview */}
                <TabsContent value="linkedin" className="mt-0">
                  <div className="w-full border border-border app-radius-md overflow-hidden bg-card text-card-foreground shadow-sm">
                    <div className="relative w-full h-48 bg-muted overflow-hidden">
                      <Image
                        src={`/api/og?id=${noteId}`}
                        alt="LinkedIn OG Preview"
                        fill
                        unoptimized
                        loading="eager"
                        quality={80}
                        className="object-cover"
                      />
                    </div>
                    <div className="p-2.5 bg-muted/40 border-t border-border space-y-0.5">
                      <p className="text-xs font-semibold text-foreground line-clamp-1">
                        {getNote?.title?.trim() || noteTitle || "Untitled note"}{" "}
                        - Notevo
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        notevo.me
                      </p>
                    </div>
                  </div>
                </TabsContent>

                {/* Twitter / X Card Preview */}
                <TabsContent value="twitter" className="mt-0">
                  <div className="w-full border border-border rounded-xl overflow-hidden bg-card text-card-foreground shadow-sm">
                    <div className="relative w-full h-48 bg-muted overflow-hidden">
                      <Image
                        src={`/api/og?id=${noteId}`}
                        alt="Twitter X OG Preview"
                        fill
                        unoptimized
                        loading="eager"
                        quality={80}
                        className="object-cover"
                      />
                    </div>
                    <div className="p-2.5 bg-card space-y-0.5 border-t border-border">
                      <p className="text-[11px] text-muted-foreground">
                        notevo.me
                      </p>
                      <p className="text-xs font-bold text-foreground line-clamp-1">
                        {getNote?.title?.trim() || noteTitle || "Untitled note"}{" "}
                        - Notevo
                      </p>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-tight">
                        {getNote?.preview?.trim() ||
                          "No Description. This is a shared note on Notevo. View and read this note on Notevo"}
                      </p>
                    </div>
                  </div>
                </TabsContent>

                {/* Slack Card Preview */}
                <TabsContent value="slack" className="mt-0">
                  <div className="w-full border border-border app-radius-md p-2.5 bg-card text-card-foreground shadow-sm space-y-1.5">
                    <div className="pl-2.5 border-l-4 border-muted-foreground/40 space-y-1">
                      <p className="text-[11px] font-bold text-muted-foreground">
                        notevo.me
                      </p>
                      <p className="text-xs font-bold text-primary hover:underline cursor-pointer line-clamp-1">
                        {getNote?.title?.trim() || noteTitle || "Untitled note"}{" "}
                        - Notevo
                      </p>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-tight">
                        {getNote?.preview?.trim() ||
                          "No Description. This is a shared note on Notevo. View and read this note on Notevo"}
                      </p>
                      <div className="mt-2 relative w-full h-48 rounded-md border border-border overflow-hidden bg-muted">
                        <Image
                          src={`/api/og?id=${noteId}`}
                          alt="Slack OG Preview"
                          fill
                          unoptimized
                          loading="eager"
                          quality={80}
                          className="object-fill"
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* WhatsApp Card Preview */}
                <TabsContent value="whatsapp" className="mt-0">
                  <div
                    className={cn(
                      "w-full border app-radius-md overflow-hidden shadow-sm transition-colors duration-200",
                      isDark
                        ? "bg-[#07332d] border-[#128c7e]/40"
                        : "bg-[#ebf7ee] border-[#128c7e]/20",
                    )}
                  >
                    <div className="relative w-full h-48 bg-muted overflow-hidden">
                      <Image
                        src={`/api/og?id=${noteId}`}
                        alt="WhatsApp OG Preview"
                        fill
                        unoptimized
                        loading="eager"
                        quality={80}
                        className="object-cover"
                      />
                    </div>
                    <div
                      className={cn(
                        "p-2.5 space-y-0.5 border-t",
                        isDark ? "border-[#128c7e]/30" : "border-[#128c7e]/15",
                      )}
                    >
                      <p
                        className={cn(
                          "text-xs font-bold line-clamp-1",
                          isDark ? "text-emerald-50" : "text-[#084c44]",
                        )}
                      >
                        {getNote?.title?.trim() || noteTitle || "Untitled note"}{" "}
                        - Notevo
                      </p>
                      <p
                        className={cn(
                          "text-[11px] line-clamp-2 leading-tight",
                          isDark ? "text-[#aebac1]" : "text-[#128c7e]/90",
                        )}
                      >
                        {getNote?.preview?.trim() ||
                          "No Description. This is a shared note on Notevo. View and read this note on Notevo"}
                      </p>
                      <p
                        className={cn(
                          "text-[10px] font-medium",
                          isDark ? "text-[#25d366]/80" : "text-[#084c44]/75",
                        )}
                      >
                        notevo.me
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
              <span className="px-1 space-y-0.5">
                <h1 className="text-base text-foreground font-bold">
                  Published to the web
                </h1>
                <p className="text-xs font-medium text-muted-foreground">
                  Copy the link, share notes with the world :
                </p>
              </span>
              <span className="w-full relative">
                <Input
                  type="text"
                  value={`https://notevo.me/public/document/${noteId}`}
                  className="h-9 truncate flex-grow bg-gradient-to-r from-foreground from-70% via-transparent via-90% to-transparent to-95% text-transparent bg-clip-text"
                  disabled
                />
                <Tooltip open={copyTooltip.open}>
                  <TooltipTrigger asChild>
                    <Button
                      onMouseDown={handleCopy}
                      onPointerMove={(e) => e.stopPropagation()}
                      {...copyTooltip.triggerProps}
                      className={`w-fit h-8 absolute top-1/2 -translate-y-1/2 right-0  text-primary hover:text-primary`}
                      disabled={isCopied && true}
                      variant="Trigger"
                    >
                      {isCopied ? (
                        "Copied!"
                      ) : (
                        <Copy size={14} className="text-primary" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent
                    className=" app-radius-sm px-1.5"
                    side="bottom"
                  >
                    Copy link
                  </TooltipContent>
                </Tooltip>
              </span>
              <span className="w-full flex justify-between items-center gap-2">
                <Button
                  onMouseDown={handlePublished}
                  className="w-full h-8 gap-2 bg-transparent"
                  variant="outline"
                >
                  <EyeClosed size={14} />
                  Unpublish
                </Button>
                <Button
                  className="w-full h-8 !app-radius-none "
                  variant="secondary"
                >
                  <Link
                    target="_blank"
                    className="flex justify-center items-center gap-2 "
                    href={`https://notevo.me/public/document/${noteId}`}
                  >
                    <ExternalLink size={14} />
                    View site
                  </Link>
                </Button>
              </span>
            </header>
          ) : (
            <header className="w-full text-start flex flex-col justify-center items-center gap-6">
              <span className="px-1 space-y-2">
                <h1 className="flex justify-start items-center gap-2 text-base text-foreground font-bold">
                  Publish to the web
                </h1>
                <p className="text-xs font-medium text-muted-foreground">
                  Publish a static webpage of this document, read only
                  <br />
                  and anyone with the link can view or duplicate it.
                </p>
              </span>
              <Button
                onMouseDown={handlePublished}
                className="w-full h-8 gap-2"
              >
                <Eye size={14} />
                Publish
              </Button>
            </header>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
