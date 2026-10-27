"use client";
import {
  Clock,
  FileText,
  Plus,
  ChevronLeft,
  ChevronRight,
  FolderClosed,
  FolderOpen,
  Star,
  Pin,
  FolderPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import MaxWContainer from "@/components/ui/MaxWContainer";
import FolderSettings from "@/components/home-components/FolderSettings";
import FolderNotFound from "@/components/home-components/FolderNotFound";
import SkeletonTextAnimation from "@/components/ui/SkeletonTextAnimation";
import IntentPrefetchLink from "@/components/IntentPrefetchLink";
import { buildItemSlug } from "@/lib/slug";
import { useQuery } from "@/cache/useQuery";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  extractTextFromTiptap as parseTiptapContentExtractText,
  truncateText as parseTiptapContentTruncateText,
} from "@/lib/parse-tiptap-content";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { Skeleton } from "@/components/ui/skeleton";
import { useHomePane } from "@/components/home-components/HomePaneDrawer";
import NoteContextMenu from "@/components/home-components/NoteContextMenu";
import LinkSettings from "@/components/home-components/LinkSettings";
import PdfSettings from "@/components/home-components/PdfSettings";
import WhiteboardSettings from "@/components/home-components/WhiteboardSettings";
import {
  FolderItemGridCardContent,
  folderItemGridCardClassName,
  type FolderItemCardItem,
} from "@/components/home-components/FolderItemGridCard";
const homeMemoryCache: {
  viewer?: any;
  recentWorkspaces?: any;
  recentItems?: any[];
} = {};

const workspaceNameSchema = z
  .string()
  .min(1, "Name cannot be empty")
  .max(30, "Name must be 30 characters or less");

export default function HomePageClient() {
  const viewerQuery = useQuery(api.users.viewer, {});
  const recentWorkspacesQuery = useQuery(api.folders.getRecentFolders, {});
  const recentItemsQuery = useQuery(api.home.getRecentItems, {});

  useEffect(() => {
    if (viewerQuery !== undefined) homeMemoryCache.viewer = viewerQuery;
  }, [viewerQuery]);
  useEffect(() => {
    if (recentWorkspacesQuery !== undefined)
      homeMemoryCache.recentWorkspaces = recentWorkspacesQuery;
  }, [recentWorkspacesQuery]);
  useEffect(() => {
    if (recentItemsQuery !== undefined)
      homeMemoryCache.recentItems = recentItemsQuery;
  }, [recentItemsQuery]);

  const viewer = viewerQuery ?? homeMemoryCache.viewer;
  const recentWorkspaces =
    recentWorkspacesQuery ?? homeMemoryCache.recentWorkspaces;
  const recentItems = recentItemsQuery ?? homeMemoryCache.recentItems;

  const createFolder = useMutation(
    api.folders.createFolder,
  ).withOptimisticUpdate((local, args) => {
    const { name } = args;
    const now = Date.now();
    const uuid = crypto.randomUUID();
    const tempId = `${uuid}-${now}` as any as Id<"folders">;

    const currentWorkspaces = local.getQuery(api.folders.getRecentFolders);
    if (currentWorkspaces !== undefined) {
      local.setQuery(api.folders.getRecentFolders, {}, [
        {
          _id: tempId,
          _creationTime: now,
          name: name || "Untitled",
          slug: "untitled",
          userId: "" as any as Id<"users">,
          createdAt: now,
          updatedAt: now,
        },
        ...currentWorkspaces,
      ]);
    }
  });

  const handleCreateFolder = async () => {
    await createFolder({ name: "Untitled" });
  };

  useEffect(() => {
    if (viewer?.name) {
      document.title = `${viewer.name} - Home`;

      const metaDescription = document.querySelector(
        'meta[name="description"]',
      );
      if (metaDescription) {
        metaDescription.setAttribute("content", `${viewer.name}'s Notevo home`);
      } else {
        const newMeta = document.createElement("meta");
        newMeta.name = "description";
        newMeta.content = `${viewer.name}'s Notevo Home`;
        document.head.appendChild(newMeta);
      }
    }
  }, [viewer]);

  return (
    <MaxWContainer className="relative !max-w-[1200px]">
      <div className="overflow-hidden mb-14">
        <header className="flex flex-col justify-center items-start gap-2 relative">
          <h1 className="text-3xl sm:text-5xl font-bold text-primary">
            {viewer?.name ? (
              <>
                Hello,{" "}
                {`${
                  viewer.name.split(" ")[0].length > 10
                    ? `${viewer.name.split(" ")[0].substring(0, 10)}...`
                    : viewer.name.split(" ")[0]
                }${
                  viewer.name.split(" ")[1]
                    ? ` ${viewer.name.split(" ")[1].charAt(0)}.`
                    : "!"
                }`}
              </>
            ) : (
              <span className="flex justify-center items-center gap-0.5">
                <SkeletonTextAnimation className=" mx-0 min-w-20 h-10" />
                ,
                <SkeletonTextAnimation className="!app-radius-none mx-2 min-w-60 h-10" />
              </span>
            )}
          </h1>
          <p className="text-white/90 text-md ">
            Organize your thoughts, and manage your folders,
          </p>
        </header>
      </div>

      <div className="mb-8">
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-foreground text-xl font-semibold">
            Your Folders
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateFolder}
            disabled={recentWorkspaces === undefined}
          >
            <FolderPlus size={16} className="h-4 w-4 sm:mr-2 mr-0" />
            <span className="hidden sm:block">New Folder</span>
          </Button>
        </div>

        {recentWorkspaces === undefined ? (
          <Slider child_type="workSpaceCard">
            {[1, 2, 3, 4].map((i) => (
              <WorkspaceCardSkeleton key={i} />
            ))}
          </Slider>
        ) : recentWorkspaces.length > 0 ? (
          <Slider child_type="workSpaceCard">
            {recentWorkspaces.map((workspace: any) => (
              <WorkspaceCard
                key={workspace._id}
                workspace={workspace}
                handleCreateFolder={handleCreateFolder}
                loading={false}
              />
            ))}
          </Slider>
        ) : (
          <FolderNotFound />
        )}
      </div>

      {recentItems && recentItems.length !== 0 && (
        <div className="mb-8">
          <div className="mb-4">
            <h2 className="text-foreground text-xl font-semibold">Recent</h2>
          </div>

          <Slider child_type="noteCard ">
            {recentItems.map((item) => (
              <RecentItemCard key={`${item.kind}-${item._id}`} item={item} />
            ))}
          </Slider>
        </div>
      )}
    </MaxWContainer>
  );
}

function FolderTab({ interactive = false }: { interactive?: boolean }) {
  const outline =
    "M0.5 24 V9.5 Q0.5 0.5 9.5 0.5 H90 Q95 0.5 98.5 4.5 L112 19 Q115.5 23.5 121 23.5 H130";
  return (
    <svg
      aria-hidden
      width="130"
      height="24"
      viewBox="0 0 130 24"
      className="relative z-[10] -mb-px block shrink-0 self-start"
    >
      <path d={`${outline} V24 H0 Z`} className="fill-card" stroke="none" />
      <path
        d={outline}
        fill="none"
        strokeWidth="1"
        className={cn(
          "stroke-border transition-colors",
          interactive && "group-hover/folder:stroke-muted-foreground/50",
        )}
      />
    </svg>
  );
}

function WorkspaceCardSkeleton() {
  return (
    <div className="relative flex flex-col flex-shrink-0 w-[330px] min-h-[222px]">
      <FolderTab />
      <Card
        className="relative overflow-hidden bg-card border-border flex flex-1 flex-col"
        style={{ borderTopLeftRadius: 0 }}
      >
        <CardHeader className="pb-3 relative">
          <Skeleton className="h-5 w-3/4" />
        </CardHeader>
        <CardContent className="flex-grow flex-1">
          <div className="h-full flex items-center justify-center">
            <Skeleton className="h-8 w-8 app-radius-md" />
          </div>
        </CardContent>
        <CardFooter className="py-2 px-3 flex justify-between items-center border-t border-border">
          <Skeleton className="h-3 w-24" />
        </CardFooter>
      </Card>
    </div>
  );
}

function Slider({
  children,
  child_type,
}: {
  child_type: "noteCard " | "workSpaceCard";
  children: React.ReactNode;
}) {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const checkScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const hasOverflow = container.scrollWidth > container.clientWidth;
    setCanScrollLeft(container.scrollLeft > 0.2);
    setCanScrollRight(
      hasOverflow &&
        container.scrollLeft <
          container.scrollWidth - container.clientWidth - 0.2,
    );
  };

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
  }, [children]);

  const scroll = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollTo({
      left:
        direction === "left"
          ? container.scrollLeft - 320
          : container.scrollLeft + 320,
      behavior: "smooth",
    });
  };

  return (
    <div ref={wrapperRef} className="relative w-full h-[270px] group">
      {canScrollLeft && (
        <div className="absolute -left-1 top-0 bottom-0 w-16 sm:w-20 bg-gradient-to-r from-background via-background/80 to-transparent z-[11] pointer-events-none" />
      )}
      <div
        ref={scrollContainerRef}
        className="absolute inset-0 flex gap-4 h-fit overflow-x-auto scrollbar-hide scroll-smooth"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {children}
      </div>
      {canScrollRight && (
        <div className="absolute -right-1 top-0 bottom-0 w-16 sm:w-20 bg-gradient-to-l from-background via-background/80 to-transparent z-[11] pointer-events-none" />
      )}
      {(canScrollRight || canScrollLeft) && (
        <div
          className={`z-[12] absolute ${child_type === "workSpaceCard" ? "-bottom-[0.4rem]" : "-bottom-14"}  right-0 flex justify-center items-center gap-2`}
        >
          <Button
            size="icon"
            variant={canScrollLeft ? "default" : "outline"}
            className="h-9 w-8"
            onClick={() => scroll("left")}
          >
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <Button
            size="icon"
            variant={canScrollRight ? "default" : "outline"}
            className="h-9 w-8 !app-radius-none"
            onClick={() => scroll("right")}
          >
            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>
      )}
    </div>
  );
}
interface Workspace {
  _id: Id<"folders">;
  name: string;
  slug?: string;
  favorite?: boolean;
  userId: Id<"users">;
  createdAt: number;
  updatedAt: number;
}

interface WorkspaceCardProps {
  workspace: Workspace;
  handleCreateFolder: () => void;
  loading: boolean;
}

function WorkspaceCard({
  workspace,
  handleCreateFolder,
  loading,
}: WorkspaceCardProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [contextMenuPosition, setContextMenuPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const updateWorkingSpace = useMutation(
    api.folders.updateFolder,
  ).withOptimisticUpdate((local, args) => {
    const { _id, name } = args;
    const workspaces = local.getQuery(api.folders.getRecentFolders);
    if (workspaces && Array.isArray(workspaces)) {
      local.setQuery(
        api.folders.getRecentFolders,
        {},
        workspaces.map((ws: any) =>
          ws._id === _id
            ? { ...ws, name: name ?? ws.name, updatedAt: Date.now() }
            : ws,
        ),
      );
    }
    const ws = local.getQuery(api.folders.getFolderById, { _id });
    if (ws) {
      local.setQuery(
        api.folders.getFolderById,
        { _id },
        { ...ws, name: name ?? ws.name, updatedAt: Date.now() },
      );
    }
  });

  const handleNameDoubleClick = useCallback(() => {
    setEditedName(workspace.name || "Untitled");
    setIsEditingName(true);
    requestAnimationFrame(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    });
  }, [workspace.name]);

  const handleNameBlur = useCallback(async () => {
    const result = workspaceNameSchema.safeParse(editedName.trim());
    if (!result.success) {
      setIsEditingName(false);
      setEditedName(workspace.name || "Untitled");
      return;
    }
    const trimmed = result.data;
    if (trimmed !== (workspace.name || "Untitled")) {
      try {
        await updateWorkingSpace({ _id: workspace._id as any, name: trimmed });
      } catch (error) {
        console.error("Error updating workspace name:", error);
        setEditedName(workspace.name || "Untitled");
      }
    }
    setIsEditingName(false);
  }, [editedName, workspace.name, workspace._id, updateWorkingSpace]);

  const handleNameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        nameInputRef.current?.blur();
      } else if (e.key === "Escape") {
        setIsEditingName(false);
        setEditedName(workspace.name || "Untitled");
      }
    },
    [workspace.name],
  );

  return (
    <div
      draggable={false}
      className="group/folder relative flex flex-col flex-shrink-0 w-[330px] min-h-[220px]"
    >
      <FolderTab interactive />
      <Card
        className="flex flex-1 flex-col justify-between items-stretch relative overflow-hidden bg-card border-border cursor-pointer transition-colors group-hover/folder:border-muted-foreground/50"
        style={{ borderTopLeftRadius: 0 }}
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setContextMenuPosition({ x: event.clientX, y: event.clientY });
        }}
      >
        <IntentPrefetchLink
          draggable={false}
          href={`/home/${workspace._id}`}
          aria-label={`Open ${workspace.name || "Untitled"}`}
          className="absolute inset-0 z-[1]"
        />
        <CardHeader className="pb-3 relative">
          {isEditingName ? (
            <div className="relative z-[2] flex flex-col gap-1 pr-8 max-w-sm">
              <Input
                ref={nameInputRef}
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onBlur={handleNameBlur}
                onKeyDown={handleNameKeyDown}
                className="min-w-fit max-w-md !text-lg font-semibold h-[1.9rem] py-0 px-0 my-0 app-radius-md border border-transparent bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
          ) : (
            <CardTitle
              className="relative z-[2] text-lg font-semibold text-foreground line-clamp-2 w-fit cursor-text app-radius-md border border-transparent hover:border-muted-foreground/50"
              onDoubleClick={handleNameDoubleClick}
            >
              {workspace.name || "Untitled"}
            </CardTitle>
          )}
          <div className="absolute top-1.5 right-2 z-[2]">
            <FolderSettings
              workingSpaceId={workspace._id as any}
              workingspaceName={workspace.name}
              contextMenuPosition={contextMenuPosition}
              onContextMenuClose={() => setContextMenuPosition(null)}
            />
          </div>
        </CardHeader>
        <CardContent className="flex-grow flex-1 ">
          <span className=" w-full flex justify-center items-center h-full">
            <FolderClosed className="h-10 w-full text-primary text-center group-hover/folder:hidden" />
            <FolderOpen className="hidden h-10 w-full text-primary text-center group-hover/folder:block" />
          </span>
        </CardContent>
        <CardFooter className="py-3 px-2.5 flex items-center justify-between border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {typeof window !== "undefined" ? (
              <span>{new Date(workspace.updatedAt).toLocaleDateString()}</span>
            ) : (
              <SkeletonTextAnimation className="w-20" />
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

interface Note {
  _id: Id<"documents">;
  title?: string;
  slug?: string;
  workingSpacesSlug?: string;
  workingSpaceId?: Id<"folders">;
  userId?: Id<"users">;
  body?: string;
  preview?: string;
  favorite?: boolean;
  createdAt: number;
  updatedAt: number;
  tags?: Id<"tags">[];
  order?: number;
}

type RecentItem =
  | (Note & { kind: "document" })
  | {
      _id: Id<"links">;
      kind: "link";
      title?: string;
      url: string;
      metadata?: {
        description?: string;
        siteName?: string;
        authorName?: string;
      };
      platform?: string;
      favorite?: boolean;
      createdAt: number;
      updatedAt: number;
    }
  | {
      _id: Id<"pdfs">;
      kind: "pdf";
      title?: string;
      folderId?: Id<"folders">;
      workingSpaceId?: Id<"folders">;
      favorite?: boolean;
      createdAt: number;
      updatedAt: number;
    }
  | {
      _id: Id<"whiteboards">;
      kind: "whiteboard";
      title?: string;
      snapshot?: string;
      preview?: string;
      folderId?: Id<"folders">;
      workingSpaceId?: Id<"folders">;
      favorite?: boolean;
      createdAt: number;
      updatedAt: number;
    };

function isEmptyWhiteboard(snapshot?: string) {
  if (!snapshot) return true;
  try {
    const scene = JSON.parse(snapshot);
    return (
      !Array.isArray(scene.elements) ||
      !scene.elements.some(
        (element: { isDeleted?: boolean }) => !element.isDeleted,
      )
    );
  } catch {
    return true;
  }
}

function RecentItemCard({ item }: { item: RecentItem }) {
  const [contextMenuPosition, setContextMenuPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const isLink = item.kind === "link";
  const workspaceId = isLink
    ? undefined
    : (item.workingSpaceId ?? (item as any).folderId);
  const title = isLink
    ? item.title ||
      item.metadata?.authorName ||
      item.metadata?.siteName ||
      item.url
    : item.title ||
      (item.kind === "pdf"
        ? "Untitled PDF"
        : item.kind === "whiteboard"
          ? "Untitled whiteboard"
          : "Untitled");
  const preview = isLink
    ? item.metadata?.description || item.url
    : item.kind === "pdf"
      ? "PDF upload"
      : item.kind === "whiteboard"
        ? isEmptyWhiteboard(item.snapshot)
          ? "No content yet. Click to start drawing..."
          : ""
        : item.preview
          ? parseTiptapContentTruncateText(item.preview, 80)
          : (() => {
              try {
                const text = parseTiptapContentExtractText(item.body);
                return text
                  ? parseTiptapContentTruncateText(text, 80)
                  : "No content yet. Click to start writing...";
              } catch {
                return "No content yet. Click to start writing...";
              }
            })();
  const href = isLink
    ? item.url
    : `/home/${workspaceId}/${buildItemSlug(title, item._id)}`;
  const cardClassName = `${folderItemGridCardClassName} h-[270px] w-[370px] shrink-0`;
  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
  };
  const settings =
    item.kind === "link" ? (
      <LinkSettings
        linkId={item._id}
        linkUrl={item.url}
        linkTitle={item.title}
        favorite={item.favorite}
        createdAt={item.createdAt}
        updatedAt={item.updatedAt}
        iconVariant="vertical_icon"
        dropdownMenuContentAlign="start"
        tooltipContentAlign="start"
        contextMenuPosition={contextMenuPosition}
        onContextMenuClose={() => setContextMenuPosition(null)}
      />
    ) : item.kind === "pdf" ? (
      <PdfSettings
        pdfId={item._id}
        pdfTitle={item.title}
        iconVariant="vertical_icon"
        dropdownMenuContentAlign="start"
        tooltipContentAlign="start"
        contextMenuPosition={contextMenuPosition}
        onContextMenuClose={() => setContextMenuPosition(null)}
      />
    ) : item.kind === "whiteboard" ? (
      <WhiteboardSettings
        whiteboardId={item._id}
        contextMenuPosition={contextMenuPosition}
        onContextMenuClose={() => setContextMenuPosition(null)}
      />
    ) : null;
  const content = (
    <FolderItemGridCardContent
      item={item as FolderItemCardItem}
      title={title}
      subtitle={preview}
      action={
        <div
          className="flex items-center gap-1"
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
        >
          {item.favorite && (
            <Pin className="h-4 w-4 shrink-0 fill-primary text-primary" />
          )}
          {settings}
        </div>
      }
    />
  );

  const card = isLink ? (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cardClassName}
      onContextMenu={handleContextMenu}
    >
      {content}
    </a>
  ) : (
    <IntentPrefetchLink
      draggable={false}
      href={href}
      prefetchNoteId={item.kind === "document" ? item._id : undefined}
      className={cardClassName}
      onContextMenu={item.kind === "document" ? undefined : handleContextMenu}
    >
      {content}
    </IntentPrefetchLink>
  );

  return item.kind === "document" ? (
    <NoteContextMenu noteId={item._id} noteTitle={item.title}>
      {card}
    </NoteContextMenu>
  ) : (
    card
  );
}
