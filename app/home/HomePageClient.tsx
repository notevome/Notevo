"use client";
import {
  Clock,
  FileText,
  Plus,
  ChevronLeft,
  ChevronRight,
  FolderClosed,
  Star,
} from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { useMutation, usePreloadedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import MaxWContainer from "@/components/ui/MaxWContainer";
import WorkingSpaceSettings from "@/components/home-components/WorkingSpaceSettings";
import WorkingSpaceNotFound from "@/components/home-components/WorkingSpaceNotFound";
import LoadingAnimation from "@/components/ui/LoadingAnimation";
import SkeletonTextAnimation from "@/components/ui/SkeletonTextAnimation";
import IntentPrefetchLink from "@/components/ui/IntentPrefetchLink";
import { useHomeData } from "@/components/home-components/HomeDataContext";
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

// ─── Zod Schemas ───────────────────────────────────────────────────────────────

const workspaceNameSchema = z
  .string()
  .min(1, "Name cannot be empty")
  .max(30, "Name must be 30 characters or less");

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function HomePageClient({
  initialRecentNotes,
  initialPinnedNotes,
}: {
  initialRecentNotes: any[];
  initialPinnedNotes: any[];
}) {
  const { preloadedViewer, preloadedRecentWorkspaces } = useHomeData();
  const viewer = usePreloadedQuery(preloadedViewer) as any;
  const recentWorkspaces = usePreloadedQuery(preloadedRecentWorkspaces) as any;
  // Use server-fetched lists to avoid client subscriptions (bandwidth) and
  // eliminate "LoadingFirstPage" skeletons.
  const recentNotes = initialRecentNotes;
  const pinnedNotes = initialPinnedNotes;

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
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-muted from-20% via-transparent via-70% to-muted p-8 mb-8">
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
            <Plus className="h-4 w-4 sm:mr-2 mr-0" />
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

// ─── Skeletons ─────────────────────────────────────────────────────────────────

function WorkspaceCardSkeleton() {
  return (
    <Card className="relative overflow-hidden bg-card/90 backdrop-blur-sm border-border flex-shrink-0 w-[300px] h-fit">
      <CardHeader className="pb-3 relative">
        <div className="h-5 bg-primary/20 rounded-lg w-3/4 animate-pulse"></div>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="h-20 flex items-center justify-center">
          <div className="h-14 w-14 bg-primary/20 rounded-full animate-pulse"></div>
        </div>
      </CardContent>
      <CardFooter className="pt-3 flex justify-between items-center text-xs text-muted-foreground border-t border-border">
        <div className="h-4 bg-primary/20 rounded-lg w-24 animate-pulse"></div>
        <div className="h-7 bg-primary/20 rounded-lg w-16 animate-pulse"></div>
      </CardFooter>
    </Card>
  );
}

function NoteCardSkeleton() {
  return (
    <Card className="relative overflow-hidden bg-card/90 backdrop-blur-sm border-border flex-shrink-0 w-[300px] h-[225px]">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-primary/20 rounded-lg w-3/4 animate-pulse"></div>
            <div className="h-3 bg-primary/20 rounded-lg w-1/2 animate-pulse"></div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-3 space-y-2">
        <div className="h-3 bg-primary/20 rounded-lg w-full animate-pulse"></div>
        <div className="h-3 bg-primary/20 rounded-lg w-5/6 animate-pulse"></div>
        <div className="h-3 bg-primary/20 rounded-lg w-4/6 animate-pulse"></div>
      </CardContent>
      <CardFooter className="pt-3 flex justify-between items-center text-xs text-muted-foreground border-t border-border">
        <div className="h-4 bg-primary/20 rounded-lg w-24 animate-pulse"></div>
        <div className="h-7 bg-primary/20 rounded-lg w-16 animate-pulse"></div>
      </CardFooter>
    </Card>
  );
}

// ─── Slider ────────────────────────────────────────────────────────────────────

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
      {canScrollLeft && (
        <Button
          size="icon"
          variant="ghost"
          className="absolute left-0 top-[40%] -translate-y-1/2 z-10 h-8 w-8 sm:h-10 sm:w-10 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => scroll("left")}
        >
          <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
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
      {canScrollRight && (
        <Button
          size="icon"
          variant="ghost"
          className="absolute right-0 top-[40%] -translate-y-1/2 z-10 h-8 w-8 sm:h-10 sm:w-10 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => scroll("right")}
        >
          <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      )}
    </div>
  );
}

// ─── Workspace Card ────────────────────────────────────────────────────────────

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
  const [nameError, setNameError] = useState<string | null>(null);
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
    setNameError(null);
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
      setNameError(null);
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
    setNameError(null);
  }, [editedName, workspace.name, workspace._id, updateWorkingSpace]);

  const handleNameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        nameInputRef.current?.blur();
      } else if (e.key === "Escape") {
        setIsEditingName(false);
        setEditedName(workspace.name || "Untitled");
        setNameError(null);
      }
    },
    [workspace.name],
  );

  return (
    <Card className="group relative overflow-hidden bg-card/90 backdrop-blur-sm border-border flex-shrink-0 w-[300px] h-fit hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3 relative">
        {isEditingName ? (
          <div className="flex flex-col gap-1 pr-8">
            <Input
              ref={nameInputRef}
              value={editedName}
              onChange={(e) => {
                const val = e.target.value;
                setEditedName(val);
                const result = workspaceNameSchema.safeParse(val.trim());
                setNameError(
                  result.success ? null : result.error.errors[0].message,
                );
              }}
              onBlur={handleNameBlur}
              onKeyDown={handleNameKeyDown}
              className={cn(
                "text-base font-semibold h-auto py-1 px-1 rounded-md bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 w-full",
                nameError
                  ? "border border-destructive"
                  : "border border-primary/20",
              )}
            />
            {nameError && (
              <p className="text-xs text-destructive">{nameError}</p>
            )}
          </div>
        ) : (
          <CardTitle
            className="text-base font-semibold text-foreground line-clamp-2 w-fit cursor-text rounded-md border border-transparent hover:border-primary/20 transition-all duration-300 pr-8"
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

      <CardContent className="pb-3">
        <div className="h-20 flex items-center justify-center">
          <FolderClosed className="h-8 w-8 text-primary" />
        </div>
      </CardContent>

      <CardFooter className="pt-3 flex justify-between items-center text-xs text-muted-foreground border-t border-border">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {typeof window !== "undefined" ? (
            <span>{new Date(workspace.updatedAt).toLocaleDateString()}</span>
          ) : (
            <SkeletonTextAnimation className="w-20" />
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="h-7 px-2 text-xs hover:bg-primary/10"
        >
          <IntentPrefetchLink href={`/home/${workspace._id}`}>Open</IntentPrefetchLink>
        </Button>
      </CardFooter>
    </Card>
  );
}

// ─── Note Card ─────────────────────────────────────────────────────────────────

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
      console.error("Error parsing content:", error);
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
        "group relative overflow-hidden bg-card/90 backdrop-blur-sm border transition-all duration-300 flex-shrink-0 w-[300px] h-[225px] flex flex-col",
        isEmpty ? "border-dashed border-border" : "border-border",
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold text-foreground truncate">
              {note.title || "Untitled"}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              {note.workingSpacesSlug || "Personal Workspace"}
            </CardDescription>
          </div>
          {note.favorite && (
            <Star className="h-4 w-4 text-primary fill-primary flex-shrink-0" />
          )}
        </div>
      </CardHeader>

      <CardContent className="h-full">
        <p
          className={cn(
            "text-sm line-clamp-3",
            isEmpty ? "text-muted-foreground italic" : "text-muted-foreground",
          )}
        >
          {previewText}
        </p>
      </CardContent>

      <CardFooter className="pt-3 flex justify-between items-center text-xs text-muted-foreground border-t border-border">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {typeof window !== "undefined" ? (
            <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
          ) : (
            <SkeletonTextAnimation className="w-20" />
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="h-7 px-2 text-xs hover:bg-primary/10"
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
