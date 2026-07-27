"use client";
import {
  Clock,
  FileText,
  Plus,
  ChevronLeft,
  ChevronRight,
  FolderClosed,
  Star,
  Pin,
  FolderPlus,
} from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { useMutation } from "convex/react";
import { usePaginatedQuery } from "@/cache/usePaginatedQuery";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import MaxWContainer from "@/components/ui/MaxWContainer";
import WorkingSpaceSettings from "@/components/home-components/WorkingSpaceSettings";
import WorkingSpaceNotFound from "@/components/home-components/WorkingSpaceNotFound";
import LoadingAnimation from "@/components/ui/LoadingAnimation";
import SkeletonTextAnimation from "@/components/ui/SkeletonTextAnimation";
import IntentPrefetchLink from "@/components/IntentPrefetchLink";
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
const homeMemoryCache: {
  viewer?: any;
  recentWorkspaces?: any;
  recentNotes?: any[];
  pinnedNotes?: any[];
} = {};

const workspaceNameSchema = z
  .string()
  .min(1, "Name cannot be empty")
  .max(30, "Name must be 30 characters or less");

export default function HomePageClient() {
  const viewerQuery = useQuery(api.users.viewer, {});
  const recentWorkspacesQuery = useQuery(
    api.workingSpaces.getRecentWorkingSpaces,
    {},
  );
  const { results: recentNotesResults, status: recentNotesStatus } =
    usePaginatedQuery(api.notes.getNoteByUserId, {}, { initialNumItems: 5 });
  const { results: pinnedNotesResults, status: pinnedNotesStatus } =
    usePaginatedQuery(api.notes.getFavNotes, {}, { initialNumItems: 5 });

  useEffect(() => {
    if (viewerQuery !== undefined) homeMemoryCache.viewer = viewerQuery;
  }, [viewerQuery]);
  useEffect(() => {
    if (recentWorkspacesQuery !== undefined)
      homeMemoryCache.recentWorkspaces = recentWorkspacesQuery;
  }, [recentWorkspacesQuery]);
  useEffect(() => {
    if (recentNotesStatus !== "LoadingFirstPage")
      homeMemoryCache.recentNotes = recentNotesResults;
  }, [recentNotesResults, recentNotesStatus]);
  useEffect(() => {
    if (pinnedNotesStatus !== "LoadingFirstPage")
      homeMemoryCache.pinnedNotes = pinnedNotesResults;
  }, [pinnedNotesResults, pinnedNotesStatus]);

  const viewer = viewerQuery ?? homeMemoryCache.viewer;
  const recentWorkspaces =
    recentWorkspacesQuery ?? homeMemoryCache.recentWorkspaces;
  const recentNotes =
    recentNotesStatus === "LoadingFirstPage" && homeMemoryCache.recentNotes
      ? homeMemoryCache.recentNotes
      : recentNotesResults;
  const pinnedNotes =
    pinnedNotesStatus === "LoadingFirstPage" && homeMemoryCache.pinnedNotes
      ? homeMemoryCache.pinnedNotes
      : pinnedNotesResults;

  const createWorkingSpace = useMutation(
    api.workingSpaces.createWorkingSpace,
  ).withOptimisticUpdate((local, args) => {
    const { name } = args;
    const now = Date.now();
    const uuid = crypto.randomUUID();
    const tempId = `${uuid}-${now}` as any as Id<"workingSpaces">;

    const currentWorkspaces = local.getQuery(
      api.workingSpaces.getRecentWorkingSpaces,
    );
    if (currentWorkspaces !== undefined) {
      local.setQuery(api.workingSpaces.getRecentWorkingSpaces, {}, [
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

  const handleCreateWorkingSpace = async () => {
    await createWorkingSpace({ name: "Untitled" });
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
    <MaxWContainer className="relative my-5">
      {/* Hero Section */}
      <div className="overflow-hidden border border-border app-radius-2xl bg-gradient-to-br from-muted from-20% via-transparent via-70% to-muted p-8 mb-8">
        <header className="relative max-w-3xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4 text-primary">
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
              <SkeletonTextAnimation className="w-full h-10" />
            )}
          </h1>
          <p className="text-white/90 text-md max-w-2xl mx-auto mb-6">
            Organize your thoughts, manage your workspaces, and boost your
            productivity with Notevo.
          </p>
        </header>
      </div>

      {/* Workspaces Slider */}
      <div className="mb-12">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-foreground text-xl font-semibold">
            Your Workspaces
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateWorkingSpace}
            disabled={recentWorkspaces === undefined}
          >
            <FolderPlus size={16} className="h-4 w-4 sm:mr-2 mr-0" />
            <span className="hidden sm:block">New Workspace</span>
          </Button>
        </div>

        {recentWorkspaces === undefined ? (
          <Slider>
            {[1, 2, 3, 4].map((i) => (
              <WorkspaceCardSkeleton key={i} />
            ))}
          </Slider>
        ) : recentWorkspaces.length > 0 ? (
          <Slider>
            {recentWorkspaces.map((workspace: any) => (
              <WorkspaceCard
                key={workspace._id}
                workspace={workspace}
                handleCreateWorkingSpace={handleCreateWorkingSpace}
                loading={false}
              />
            ))}
          </Slider>
        ) : (
          <WorkingSpaceNotFound />
        )}
      </div>

      {/* Pinned Notes Slider */}
      {pinnedNotes.length > 0 && (
        <div className="mb-12">
          <div className="mb-6">
            <h2 className="text-foreground text-xl font-semibold">
              Pinned Notes
            </h2>
          </div>
          <Slider>
            {pinnedNotes.map((note) => (
              <NoteCard key={note._id} note={note} />
            ))}
          </Slider>
        </div>
      )}

      {/* Recent Notes Slider */}
      {recentNotes.length !== 0 && (
        <div className="mb-12">
          <div className="mb-6">
            <h2 className="text-foreground text-xl font-semibold">
              Recent Notes
            </h2>
          </div>

          <Slider>
            {recentNotes.map((note) => (
              <NoteCard key={note._id} note={note} />
            ))}
          </Slider>
        </div>
      )}
    </MaxWContainer>
  );
}

function WorkspaceCardSkeleton() {
  return (
    <Card className="relative overflow-hidden bg-card border-border flex-shrink-0 w-[330px] min-h-[230px] flex flex-col">
      <CardHeader className="pb-3 relative">
        <Skeleton className="h-5 w-3/4" />
      </CardHeader>
      <CardContent className="flex-grow flex-1">
        <div className="h-full flex items-center justify-center">
          <Skeleton className="h-8 w-8 app-radius-md" />
        </div>
      </CardContent>
      <CardFooter className="py-4 flex justify-between items-center border-t border-border">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-12" />
      </CardFooter>
    </Card>
  );
}

function NoteCardSkeleton() {
  return (
    <Card className="relative overflow-hidden bg-card border-border flex-shrink-0 w-[330px] h-[230px] flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex-1 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-4/6" />
      </CardContent>
      <CardFooter className="py-4 flex justify-between items-center border-t border-border mt-auto">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-12" />
      </CardFooter>
    </Card>
  );
}

function Slider({ children }: { children: React.ReactNode }) {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const checkScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const hasOverflow = container.scrollWidth > container.clientWidth;
    setCanScrollLeft(container.scrollLeft > 10);
    setCanScrollRight(
      hasOverflow &&
        container.scrollLeft <
          container.scrollWidth - container.clientWidth - 10,
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
    <div ref={wrapperRef} className="relative w-full h-[250px] group">
      {canScrollLeft && (
        <div className="absolute -left-1 top-0 bottom-0 w-16 sm:w-20 bg-gradient-to-r from-background via-background/80 to-transparent z-[5] pointer-events-none" />
      )}

      <div
        ref={scrollContainerRef}
        className="absolute inset-0 flex gap-4 h-fit overflow-x-auto scrollbar-hide scroll-smooth"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {children}
      </div>

      {canScrollRight && (
        <div className="absolute -right-1 top-0 bottom-0 w-16 sm:w-20 bg-gradient-to-l from-background via-background/80 to-transparent z-[5] pointer-events-none" />
      )}

      {(canScrollRight || canScrollLeft) && (
        <div className="z-10 absolute -bottom-8 right-0 flex justify-center items-center gap-2">
          <Button
            size="icon"
            variant={canScrollLeft ? "revDefault" : "outline"}
            className="h-9 w-8"
            onClick={() => scroll("left")}
          >
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <Button
            size="icon"
            variant={canScrollRight ? "revDefault" : "outline"}
            className="h-9 w-8 !rounded-none"
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
  _id: Id<"workingSpaces">;
  name: string;
  slug?: string;
  favorite?: boolean;
  userId: Id<"users">;
  createdAt: number;
  updatedAt: number;
}

interface WorkspaceCardProps {
  workspace: Workspace;
  handleCreateWorkingSpace: () => void;
  loading: boolean;
}

function WorkspaceCard({
  workspace,
  handleCreateWorkingSpace,
  loading,
}: WorkspaceCardProps) {
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
        await updateWorkingSpace({ _id: workspace._id, name: trimmed });
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
    <Card className=" flex flex-col justify-between items-stretch group relative overflow-hidden bg-card border-border flex-shrink-0 w-[330px] min-h-[230px] ">
      <CardHeader className="pb-3 relative">
        {isEditingName ? (
          <div className="flex flex-col gap-1 pr-8 max-w-sm">
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
            className="text-lg font-semibold text-foreground line-clamp-2 w-fit cursor-text app-radius-md border border-transparent hover:border-muted-foreground/20"
            onDoubleClick={handleNameDoubleClick}
            title="Double-click to rename"
          >
            {workspace.name || "Untitled"}
          </CardTitle>
        )}
        <div className="absolute top-3 right-3">
          <WorkingSpaceSettings
            workingSpaceId={workspace._id}
            workingspaceName={workspace.name}
          />
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex-1 ">
        <span className=" w-full flex justify-center items-center h-full">
          <FolderClosed className=" h-10 w-full text-primary text-center" />
        </span>
      </CardContent>
      <CardFooter className="py-4 flex items-center justify-between border-t border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {typeof window !== "undefined" ? (
            <span>{new Date(workspace.updatedAt).toLocaleDateString()}</span>
          ) : (
            <SkeletonTextAnimation className="w-20" />
          )}
        </div>
        <Button
          size="sm"
          asChild
          className=" absolute bottom-0 right-0 h-9 px-2 text-xs"
        >
          <IntentPrefetchLink href={`/home/${workspace._id}`}>
            Open
          </IntentPrefetchLink>
        </Button>
      </CardFooter>
    </Card>
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
  order?: number;
}

function NoteCard({ note }: { note: Note }) {
  const getContentPreviewFromBody = (body: any) => {
    if (!body) return "No content yet. Click to start writing...";
    try {
      const plainText = parseTiptapContentExtractText(body);
      return plainText
        ? parseTiptapContentTruncateText(plainText, 80)
        : "No content yet. Click to start writing...";
    } catch (error) {
      return "Unable to display content preview";
    }
  };

  // `note.preview` is already plain text (computed server-side). `note.body` is
  // the heavy TipTap JSON string (only present in some contexts).
  const previewText = note.preview
    ? parseTiptapContentTruncateText(note.preview, 80)
    : getContentPreviewFromBody(note.body);

  const isEmpty = !(note.preview || note.body);

  return (
    <Card
      className={cn(
        "group relative overflow-hidden bg-card border transition-all duration-300 flex-shrink-0 w-[330px] h-[230px] flex flex-col",
        isEmpty ? "border-dashed border-border" : "border-border",
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold text-foreground truncate">
              {note.title || "Untitled"}
            </CardTitle>
          </div>
          {note.favorite && (
            <Pin className="h-4 w-4 text-primary fill-primary flex-shrink-0" />
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-grow flex-1">
        <p
          className={cn(
            "text-sm line-clamp-3",
            isEmpty ? "text-muted-foreground italic" : "text-muted-foreground",
          )}
        >
          {previewText}
        </p>
      </CardContent>

      <CardFooter className=" relative py-4 flex justify-between items-center text-xs text-muted-foreground border-t border-border">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {typeof window !== "undefined" ? (
            <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
          ) : (
            <SkeletonTextAnimation className="w-20" />
          )}
        </div>
        <Button
          size="sm"
          asChild
          className="absolute bottom-0 right-0 h-9 px-2 text-xs"
        >
          <IntentPrefetchLink
            href={`/home/${note.workingSpaceId}/${note.slug}?id=${note._id}`}
          >
            Open
          </IntentPrefetchLink>
        </Button>
      </CardFooter>
    </Card>
  );
}
