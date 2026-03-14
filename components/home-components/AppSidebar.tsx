"use client";
import {
  Notebook,
  Plus,
  Pin,
  CircleUserRound,
  LogOut,
  HomeIcon,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FolderClosed,
} from "lucide-react";
import { TbSelector } from "react-icons/tb";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useMutation,
  insertAtBottomIfLoaded,
} from "convex/react";
import { api } from "@/convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
import { useState, useCallback, memo, useRef, useMemo, useEffect } from "react";
import Link from "next/link";
import IntentPrefetchLink from "@/components/ui/IntentPrefetchLink";
import SearchDialog from "./SearchDialog";
import LoadingAnimation from "../ui/LoadingAnimation";
import SkeletonTextAnimation from "../ui/SkeletonTextAnimation";
import SkeletonSmImgAnimation from "../ui/SkeletonSmImgAnimation";
import SkeletonTextAndIconAnimation from "../ui/SkeletonTextAndIconAnimation";
import { redirect, usePathname, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import type { Id } from "@hello-pangea/dnd";
import {
  formatWorkspaceName,
  formatUserName,
  formatUserEmail,
} from "@/lib/utils";
import { Doc } from "@/convex/_generated/dataModel";
import { Input } from "../ui/input";
import NoteSettingsSidbar from "./NoteSettingsSidbar";
import WorkingSpaceSettingsSidbar from "./WorkingSpaceSettingsSidbar";
import React from "react";
import { ThemeToggle } from "../ThemeToggle";
import { UserIcon } from "lucide-react";
import Feedback from "./Feedback";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { usePaginatedQuery } from "@/cache/usePaginatedQuery";
import { date } from "zod";
import { generateSlug } from "@/lib/generateSlug";
import { useQuery } from "@/cache/useQuery";
// --- Skeleton Sidebar Component ---
const SkeletonSidebar = ({
  sidebarWidth,
  open,
}: {
  sidebarWidth: number;
  open: boolean;
}) => {
  return (
    <Sidebar
      variant="inset"
      className="group bg-muted"
      style={{
        width: `${sidebarWidth}px`,
      }}
    >
      <SidebarHeader className=" text-foreground border-b border-border">
        <div className=" w-full flex items-center justify-between p-1.5">
          <div className="flex items-center justify-start gap-2">
            {open ? (
              <>
                <SkeletonTextAnimation className="w-20 h-4 mx-0" />
                <SkeletonTextAnimation className="w-8 h-3 mx-0" />
              </>
            ) : (
              <SkeletonSmImgAnimation className="h-6 w-6" />
            )}
          </div>
          <SkeletonTextAnimation className="w-full mx-0 h-6" />
        </div>
        <div className="my-1">
          {open ? (
            <SkeletonTextAnimation className="w-full mx-0 h-8" />
          ) : (
            <SkeletonTextAnimation className="w-8 mx-0 h-8" />
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="text-foreground transition-all duration-200 ease-in-out scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent group-hover:scrollbar-thumb-primary/20">
        <SidebarGroup>
          <SidebarGroupLabel className="text-primary/20">
            <SkeletonTextAnimation className="w-24 h-3" />
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SkeletonTextAndIconAnimation
                  text_className={open ? "w-full h-5" : "hidden"}
                />
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SkeletonTextAndIconAnimation
                  text_className={open ? "w-full h-5" : "hidden"}
                />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className="text-primary/20">
            <SkeletonTextAnimation className="w-24 h-3" />
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SkeletonTextAndIconAnimation
                  text_className={open ? "w-full h-5" : "hidden"}
                />
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SkeletonTextAndIconAnimation
                  text_className={open ? "w-full h-5" : "hidden"}
                />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="text-foreground">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="my-2">
              <div className="border-none w-full h-15 flex items-center justify-between">
                <SkeletonSmImgAnimation className="h-8 w-8" />
                {open ? (
                  <div className="flex flex-col items-start justify-center">
                    <SkeletonTextAnimation className="w-28 h-4 mx-0" />
                    <SkeletonTextAnimation className="w-20 h-3 mt-1 mx-0" />
                  </div>
                ) : null}
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

interface SidebarHeaderSectionProps {
  getWorkingSpaces: Doc<"workingSpaces">[] | undefined;
  handleCreateNote: (
    workingSpaceId: Id<"workingSpaces">,
    workingSpacesSlug: string,
  ) => Promise<void>;
  handleCreateWorkingSpace: () => Promise<void>;
  loading: boolean;
}

const SidebarHeaderSection = memo(function SidebarHeaderSection({
  getWorkingSpaces,
  handleCreateNote,
  handleCreateWorkingSpace,
  loading,
}: SidebarHeaderSectionProps) {
  return (
    <SidebarHeader className=" text-foreground">
      <div className="flex items-center justify-between p-1.5">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-primary">Notevo</span>
          <Badge variant="secondary" className="text-[0.6rem]">
            BETA
          </Badge>
        </div>
        <SidebarTrigger />
      </div>
      {getWorkingSpaces?.length === 1 ? (
        getWorkingSpaces.map((workingSpace) => (
          <Button
            key={workingSpace._id}
            className="font-medium w-full h-9 flex justify-start items-center gap-2"
            disabled={loading}
            onMouseDown={() =>
              handleCreateNote(
                workingSpace._id as any,
                workingSpace.slug as string,
              )
            }
          >
            {loading ? (
              <>
                <LoadingAnimation className=" h-3 w-3" />
                redirecting...
              </>
            ) : (
              <>
                {" "}
                <Plus size={16} className="font-bold" />
                Create Note
              </>
            )}
          </Button>
        ))
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild className="my-1">
            <Button
              className="font-medium w-full h-9 flex justify-between items-center gap-1"
              disabled={loading}
            >
              {loading ? (
                <>
                  redirecting...
                  <LoadingAnimation className=" h-3 w-3" />
                </>
              ) : (
                <>
                  {" "}
                  Create Note
                  <TbSelector size={16} className="font-bold" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="bottom"
            className="rounded-lg m-2 p-1.5 bg-background/90 backdrop-blur border border-solid border-border w-[--radix-popper-anchor-width]"
          >
            <DropdownMenuLabel className="px-2 py-1 text-sm font-medium opacity-50">
              {getWorkingSpaces?.length
                ? "Select a workspace :"
                : "Create a workspace to add notes:"}
            </DropdownMenuLabel>
            <DropdownMenuGroup className="flex-col">
              {getWorkingSpaces?.length ? (
                getWorkingSpaces.map((workingSpace) => (
                  <DropdownMenuItem
                    key={workingSpace._id}
                    className="relative flex-1 px-2 py-1.5 data-[highlighted]:bg-foreground rounded-lg"
                    onSelect={() =>
                      handleCreateNote(
                        workingSpace._id as any,
                        workingSpace.slug as string,
                      )
                    }
                    disabled={loading}
                  >
                    <FolderClosed size="16" className="mr-2" />
                    <span>{formatWorkspaceName(workingSpace.name)}</span>
                  </DropdownMenuItem>
                ))
              ) : (
                <Button
                  variant="outline"
                  onClick={handleCreateWorkingSpace}
                  className="border-dashed bg-transparent h-9 my-2 w-full"
                >
                  <p className="text-xs w-full flex justify-center items-center gap-2">
                    <Plus size={16} /> Create Workspace
                  </p>
                </Button>
              )}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </SidebarHeader>
  );
});

interface SidebarNavigationProps {
  pathname: string;
  ishome: boolean;
  isMobile: boolean;
  open: boolean;
}

const SidebarNavigation = memo(function SidebarNavigation({
  pathname,
  ishome,
  isMobile,
  open,
}: SidebarNavigationProps) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Navigation</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <Button
              asChild
              variant="SidebarMenuButton"
              className={`px-2 h-8 group ${
                pathname === "/home" ? "bg-primary/10" : ""
              }`}
            >
              <IntentPrefetchLink href="/home">
                <HomeIcon className=" text-primary" size="16" />
                <span>Home</span>
              </IntentPrefetchLink>
            </Button>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SearchDialog
              showTitle={true}
              iconSize={16}
              sidbarMobile={isMobile}
              sidebaraOpen={open}
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
});

interface PinnedNoteItemProps {
  note: Doc<"notes">;
  pathname: string;
  open: boolean;
}

const PinnedNoteItem = memo(
  function PinnedNoteItem({ note, pathname, open }: PinnedNoteItemProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedTitle, setEditedTitle] = useState(note.title || "Untitled");
    const updateNote = useMutation(api.notes.updateNote).withOptimisticUpdate(
      (local, args) => {
        const { _id, title, favorite } = args;

        // Update single note query if it exists
        const note = local.getQuery(api.notes.getNoteById, { _id });
        if (note) {
          local.setQuery(
            api.notes.getNoteById,
            { _id },
            {
              ...note,
              title: title ?? note.title,
              favorite: favorite ?? note.favorite,
              updatedAt: Date.now(),
            },
          );
        }

        // Note: Paginated queries (getFavNotes) will be synced by the server
        // Direct updates to paginated query results are complex and handled server-side
      },
    );
    const inputRef = useRef<HTMLInputElement>(null);

    const notePath = `/home/${note.workingSpaceId}/${note.slug}`;
    const noteHref = `${notePath}?id=${note._id}`;
    const isActive = pathname === notePath;

    const handleContentMouseEnter = useCallback(() => {
      setIsHovered(true);
    }, []);

    const handleContentMouseLeave = useCallback(() => {
      setIsHovered(false);
    }, []);

    const handleDoubleClick = useCallback(() => {
      setIsEditing(true);
      setEditedTitle(note.title || "Untitled");
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }, [note.title]);

    const handleInputChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditedTitle(e.target.value);
      },
      [],
    );

    const handleInputBlur = useCallback(async () => {
      if (editedTitle.trim() !== (note.title || "Untitled")) {
        try {
          await updateNote({
            _id: note._id,
            title: editedTitle.trim(),
          });
        } catch (error) {
          console.error("Error updating note title:", error);
          setEditedTitle(note.title || "Untitled");
        }
      }
      setIsEditing(false);
    }, [editedTitle, note.title, note._id, updateNote]);

    const handleInputKeyPress = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
          inputRef.current?.blur();
        } else if (e.key === "Escape") {
          setIsEditing(false);
          setEditedTitle(note.title || "Untitled");
        }
      },
      [note.title],
    );

    const textClassName = isHovered
      ? "truncate flex-grow bg-gradient-to-r from-foreground from-50% via-transparent via-65% to-transparent to-90% text-transparent bg-clip-text"
      : "truncate flex-grow";

    return (
      <SidebarGroupContent
        className="relative w-full flex justify-between items-center overflow-hidden group/item"
        onMouseEnter={handleContentMouseEnter}
        onMouseLeave={handleContentMouseLeave}
      >
        <SidebarMenu className="flex-1">
          <SidebarMenuItem>
            {isEditing ? (
              <Input
                ref={inputRef}
                value={editedTitle}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                onKeyDown={handleInputKeyPress}
                className="flex-1 h-8 px-2 py-1.5 text-sm focus:outline-none focus:ring-0 focus:border-foreground rounded-lg"
              />
            ) : (
              <TooltipProvider delayDuration={200} skipDelayDuration={0}>
                <Tooltip disableHoverableContent>
                  <TooltipTrigger asChild>
                    <Button
                      variant="SidebarMenuButton"
                      className={`px-2 my-0.5 h-8 group flex-1 ${
                        isActive ? "bg-primary/10" : ""
                      }`}
                      asChild
                      onDoubleClick={handleDoubleClick}
                    >
                      <IntentPrefetchLink
                        href={noteHref}
                        className="flex items-center gap-2 flex-grow min-w-0"
                      >
                        {isHovered || isActive ? (
                          <ChevronRight
                            size="16"
                            className="text-primary flex-shrink-0"
                          />
                        ) : (
                          <Pin
                            size="16"
                            className="text-primary flex-shrink-0"
                          />
                        )}
                        <span className={textClassName}>
                          {formatWorkspaceName(note.title || "Untitled")}
                        </span>
                      </IntentPrefetchLink>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    className="font-medium"
                    sideOffset={5}
                  >
                    {note.title || "Untitled"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
        <div
          className={`absolute right-0 transition-all duration-200 ease-in-out ${isHovered && !isEditing ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2 pointer-events-none"}`}
        >
          <NoteSettingsSidbar
            noteId={note._id}
            noteTitle={note.title}
            ContainerClassName=""
          />
        </div>
      </SidebarGroupContent>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.note.favorite === nextProps.note.favorite &&
      prevProps.pathname === nextProps.pathname &&
      prevProps.open === nextProps.open
    );
  },
);

interface PinnedNotesListProps {
  favoriteNotes: Doc<"notes">[];
  pathname: string;
  open: boolean;
  status: "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted";
  loadMore: (numItems: number) => void;
}

const PinnedNotesList = memo(function PinnedNotesList({
  favoriteNotes,
  pathname,
  open,
  status,
  loadMore,
}: PinnedNotesListProps) {
  if (status === "LoadingFirstPage") {
    return (
      <SidebarGroup>
        <SidebarGroupLabel className="text-muted-foreground flex items-center justify-between">
          <span>Pinned Notes</span>
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SkeletonTextAndIconAnimation
                text_className={open ? "w-full h-5" : "hidden"}
              />
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SkeletonTextAndIconAnimation
                text_className={open ? "w-full h-5" : "hidden"}
              />
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SkeletonTextAndIconAnimation
                text_className={open ? "w-full h-5" : "hidden"}
              />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  if (favoriteNotes.length === 0) {
    return null;
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-muted-foreground flex items-center justify-between">
        <span>Pinned Notes</span>
      </SidebarGroupLabel>
      {favoriteNotes.map((note) => (
        <PinnedNoteItem
          key={note._id}
          note={note}
          pathname={pathname}
          open={open}
        />
      ))}

      {/* Show More Button for Pinned Notes */}
      {favoriteNotes.length > 4 && status === "CanLoadMore" && (
        <SidebarGroupContent>
          <Button
            variant="SidebarMenuButton"
            size="sm"
            onClick={() => loadMore(5)}
            className="px-2 my-0.5 h-8 group flex-1"
          >
            <ChevronDown size="16" className=" text-primary" />
            Show More
          </Button>
        </SidebarGroupContent>
      )}

      {favoriteNotes.length > 4 && status === "LoadingMore" && (
        <SidebarGroupContent>
          <Button
            variant="SidebarMenuButton"
            size="sm"
            disabled
            className="px-2 my-0.5 h-8 group flex-1"
          >
            <LoadingAnimation className="h-3 w-3" />
            Loading...
          </Button>
        </SidebarGroupContent>
      )}
    </SidebarGroup>
  );
});

interface WorkspaceItemProps {
  workingSpace: Doc<"workingSpaces">;
  pathname: string;
  open: boolean;
}

const WorkspaceItem = memo(
  function WorkspaceItem({ workingSpace, pathname, open }: WorkspaceItemProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState(
      workingSpace.name || "Untitled",
    );
    const updateWorkingSpace = useMutation(
      api.workingSpaces.updateWorkingSpace,
    ).withOptimisticUpdate((local, args) => {
      const { _id, name } = args;

      // Update in getRecentWorkingSpaces
      const workspaces = local.getQuery(
        api.workingSpaces.getRecentWorkingSpaces,
      );
      if (workspaces && Array.isArray(workspaces)) {
        const updatedWorkspaces = workspaces.map((ws: any) =>
          ws._id === _id
            ? {
                ...ws,
                name: name ?? ws.name,
                updatedAt: Date.now(),
              }
            : ws,
        );
        local.setQuery(
          api.workingSpaces.getRecentWorkingSpaces,
          {},
          updatedWorkspaces,
        );
      }

      // Update single workspace query if it exists
      const workspace = local.getQuery(api.workingSpaces.getWorkingSpaceById, {
        _id,
      });
      if (workspace) {
        local.setQuery(
          api.workingSpaces.getWorkingSpaceById,
          { _id },
          {
            ...workspace,
            name: name ?? workspace.name,
            updatedAt: Date.now(),
          },
        );
      }
    });
    const inputRef = useRef<HTMLInputElement>(null);

    const workspaceHref = `/home/${workingSpace._id}`;
    const isActive = pathname === workspaceHref;

    const handleContentMouseEnter = useCallback(() => {
      setIsHovered(true);
    }, []);

    const handleContentMouseLeave = useCallback(() => {
      setIsHovered(false);
    }, []);

    const handleDoubleClick = useCallback(() => {
      setIsEditing(true);
      setEditedName(workingSpace.name || "Untitled");
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }, [workingSpace.name]);

    const handleInputChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditedName(e.target.value);
      },
      [],
    );

    const handleInputBlur = useCallback(async () => {
      if (editedName.trim() !== (workingSpace.name || "Untitled")) {
        try {
          await updateWorkingSpace({
            _id: workingSpace._id,
            name: editedName.trim(),
          });
        } catch (error) {
          console.error("Error updating workspace name:", error);
          setEditedName(workingSpace.name || "Untitled");
        }
      }
      setIsEditing(false);
    }, [editedName, workingSpace.name, workingSpace._id, updateWorkingSpace]);

    const handleInputKeyPress = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
          inputRef.current?.blur();
        } else if (e.key === "Escape") {
          setIsEditing(false);
          setEditedName(workingSpace.name || "Untitled");
        }
      },
      [workingSpace.name],
    );

    const textClassName = isHovered
      ? "truncate flex-grow bg-gradient-to-r from-foreground from-50% via-transparent via-65% to-transparent to-90% text-transparent bg-clip-text"
      : "truncate flex-grow";

    return (
      <SidebarGroupContent
        className="relative w-full flex justify-between items-center overflow-hidden group/item"
        onMouseEnter={handleContentMouseEnter}
        onMouseLeave={handleContentMouseLeave}
      >
        <SidebarMenu className="flex-1">
          <SidebarMenuItem>
            {isEditing ? (
              <Input
                ref={inputRef}
                value={editedName}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                onKeyDown={handleInputKeyPress}
                className="flex-1 h-8 px-2 py-1.5 text-sm focus:outline-none focus:ring-0 focus:border-foreground  rounded-lg"
              />
            ) : (
              <TooltipProvider delayDuration={200} skipDelayDuration={0}>
                <Tooltip disableHoverableContent>
                  <TooltipTrigger asChild>
                    <Button
                      variant="SidebarMenuButton"
                      className={`px-2 my-0.5 h-8 group flex-1 justify-start ${
                        isActive ? "bg-primary/10" : ""
                      }`}
                      asChild
                      onDoubleClick={handleDoubleClick}
                    >
                      <IntentPrefetchLink
                        href={workspaceHref}
                        className="flex items-center gap-2 flex-grow min-w-0"
                      >
                        {isHovered || isActive ? (
                          <ChevronRight
                            size="16"
                            className="flex-shrink-0 text-primary"
                          />
                        ) : (
                          <FolderClosed
                            size="16"
                            className="flex-shrink-0 text-primary"
                          />
                        )}
                        <span className={textClassName}>
                          {formatWorkspaceName(workingSpace.name || "Untitled")}
                        </span>
                      </IntentPrefetchLink>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    className="font-medium"
                    sideOffset={5}
                  >
                    {workingSpace.name || "Untitled"}
                  </TooltipContent>
                </Tooltip>{" "}
              </TooltipProvider>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
        <div
          className={`absolute right-0 transition-opacity duration-150 ${isHovered && !isEditing ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
          <WorkingSpaceSettingsSidbar
            workingSpaceId={workingSpace._id}
            workingspaceName={workingSpace.name}
            ContainerClassName=""
          />
        </div>
      </SidebarGroupContent>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.workingSpace._id === nextProps.workingSpace._id &&
      prevProps.workingSpace.name === nextProps.workingSpace.name &&
      prevProps.pathname === nextProps.pathname &&
      prevProps.open === nextProps.open
    );
  },
);

interface WorkspacesListProps {
  getWorkingSpaces: Doc<"workingSpaces">[] | undefined;
  handleCreateWorkingSpace: () => Promise<void>;
  pathname: string;
  open: boolean;
}

const WorkspacesList = memo(function WorkspacesList({
  getWorkingSpaces,
  handleCreateWorkingSpace,
  pathname,
  open,
}: WorkspacesListProps) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-muted-foreground flex items-center justify-between">
        <span>Workspaces</span>
      </SidebarGroupLabel>
      <TooltipProvider delayDuration={200} disableHoverableContent>
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarGroupAction onClick={handleCreateWorkingSpace}>
              <Plus size={16} className=" text-primary" />{" "}
              <span className="sr-only">Add Workspace</span>
            </SidebarGroupAction>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={5}>
            Add Workspace
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {getWorkingSpaces?.length ? (
        getWorkingSpaces.map((workingSpace) => (
          <WorkspaceItem
            key={workingSpace._id}
            workingSpace={workingSpace}
            pathname={pathname}
            open={open}
          />
        ))
      ) : (
        <Button
          variant="outline"
          onClick={handleCreateWorkingSpace}
          className="border-dashed bg-transparent h-9 my-2 w-full"
        >
          <p className="text-xs w-full flex justify-center items-center gap-2">
            <Plus size={16} className=" text-primary" /> Create Workspace
          </p>
        </Button>
      )}
    </SidebarGroup>
  );
});

interface UserAccountSectionProps {
  User: Doc<"users"> | undefined;
  handleSignOut: () => Promise<void>;
  isSigningOut: boolean;
  pathname: string;
}

const UserAccountSection = memo(function UserAccountSection({
  User,
  handleSignOut,
  isSigningOut,
  pathname,
}: UserAccountSectionProps) {
  const settingsHref = "/home/settings/profile";
  const isSettingsActive = pathname === settingsHref;

  return (
    <SidebarFooter className=" text-foreground">
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {isSigningOut ? (
                <Button
                  variant="SidebarMenuButton"
                  className="w-full flex items-center justify-center gap-2"
                  disabled={isSigningOut}
                >
                  <LoadingAnimation />
                  Signing out...
                </Button>
              ) : (
                <Button
                  variant="SidebarMenuButton"
                  className="w-full h-15 flex items-center justify-between"
                  disabled={isSigningOut}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={User?.image || "/placeholder.svg"}
                      className=" rounded-lg"
                      alt={User ? User.name?.charAt(0) : "..."}
                    />
                    <AvatarFallback className="bg-foreground text-foreground">
                      {User?.name ? (
                        User.name.charAt(0)
                      ) : (
                        <SkeletonSmImgAnimation />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start justify-center">
                    <div className="font-medium">
                      {User?.name ? (
                        formatUserName(User.name)
                      ) : (
                        <SkeletonTextAnimation className="w-28 mx-0" />
                      )}
                    </div>
                    <div className="text-xs text-foreground/60">
                      {formatUserEmail(User?.email)}
                    </div>
                  </div>
                  <TbSelector size={16} />
                </Button>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              className="rounded-lg m-2 p-1.5 bg-background backdrop-blur w-[--radix-popper-anchor-width]"
            >
              <DropdownMenuItem
                className=" cursor-default hover:bg-transparent"
                onClick={(e) => e.preventDefault()}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={User?.image || "/placeholder.svg"}
                    alt={User ? User.name?.charAt(0) : "..."}
                  />
                  <AvatarFallback className="bg-foreground text-foreground">
                    {User?.name ? (
                      User.name.charAt(0)
                    ) : (
                      <SkeletonSmImgAnimation />
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start justify-center">
                  <div className="font-medium ">
                    {User?.name ? (
                      User.name
                    ) : (
                      <SkeletonTextAnimation className="w-28 mx-0" />
                    )}
                    <br />
                    {formatUserEmail(User?.email)}
                  </div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="w-full p-1">
                <div className=" flex items-center justify-between">
                  <p className=" text-sm flex items-center flex-1">Theme :</p>
                  <ThemeToggle />
                </div>
              </div>
              <DropdownMenuSeparator />
              <Feedback />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut size="16" className="mr-2 h-4 w-4 text-primary" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
});

// --- Main Component ---

const AppSidebar = React.memo(function AppSidebar() {
  const { open, isMobile, sidebarWidth } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const createWorkingSpace = useMutation(
    api.workingSpaces.createWorkingSpace,
  ).withOptimisticUpdate((local, args) => {
    const { name } = args;
    const now = Date.now();
    const uuid = crypto.randomUUID();
    const tempId = `${uuid}-${now}` as any as Id<"workingSpaces">;

    // Update the getRecentWorkingSpaces query
    const currentWorkspaces = local.getQuery(
      api.workingSpaces.getRecentWorkingSpaces,
    );
    if (currentWorkspaces !== undefined) {
      local.setQuery(api.workingSpaces.getRecentWorkingSpaces, {}, [
        {
          _id: tempId as any,
          _creationTime: now,
          name: name || "Untitled",
          slug: "untitled",
          userId: "" as any, // Will be replaced by server
          createdAt: now,
          updatedAt: now,
        },
        ...currentWorkspaces,
      ] as any);
    }
  });
  const createNote = useMutation(api.notes.createNote).withOptimisticUpdate(
    (local, arg) => {
      const { title, notesTableId, workingSpacesSlug, workingSpaceId } = arg;
      const now = Date.now();
      const uuid = crypto.randomUUID();
      const tempId = `${uuid}-${now}` as any;
      insertAtBottomIfLoaded({
        localQueryStore: local,
        paginatedQuery: api.notes.getNoteByUserId,
        argsToMatch: {},
        item: {
          _id: tempId,
          _creationTime: now,
          title: "New Quick Access Notes",
          body: undefined,
          slug: "untitled",
          workingSpaceId,
          workingSpacesSlug,
          notesTableId,
          createdAt: now,
          updatedAt: now,
        },
      });
    },
  );

  const getWorkingSpaces = useQuery(api.workingSpaces.getRecentWorkingSpaces, {});
  const User = useQuery(api.users.viewer, {});
  const { results, status, loadMore } = usePaginatedQuery(
    api.notes.getFavNotes,
    {},
    { initialNumItems: 5 },
  );
  const createTable = useMutation(
    api.notesTables.createTable,
  ).withOptimisticUpdate((local, args) => {
    const { workingSpaceId: wsId, name } = args;
    const now = Date.now();
    const uuid = crypto.randomUUID();
    const tempId = `${uuid}-${now}` as any;

    // Update the getTables query for all workspaces that might be viewing this
    const currentTables = local.getQuery(api.notesTables.getTables, {
      workingSpaceId: wsId,
    });
    if (currentTables !== undefined) {
      local.setQuery(api.notesTables.getTables, { workingSpaceId: wsId }, [
        {
          _id: tempId,
          _creationTime: now,
          name: name || "Untitled",
          workingSpaceId: wsId,
          slug: "untitled",
          createdAt: now,
          updatedAt: now,
        },
        ...currentTables,
      ]);
    }
  });

  const { signOut } = useAuthActions();

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [loading, setLoading] = useState(false);
  const sidebarContentRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [canScroll, setCanScroll] = useState(false);
  const [hasMoreBelow, setHasMoreBelow] = useState(false);

  const handleSidebarScroll = useCallback(() => {
    const el = sidebarContentRef.current;
    if (!el) return;
    setScrollTop(el.scrollTop);
    const overflow = el.scrollHeight > el.clientHeight;
    setCanScroll(overflow);
    setHasMoreBelow(
      overflow && el.scrollTop + el.clientHeight < el.scrollHeight - 8,
    );
  }, []);

  const ishome = useMemo(() => pathname === "/home", [pathname]);

  useEffect(() => {
    const el = sidebarContentRef.current;
    if (!el) return;
    const overflow = el.scrollHeight > el.clientHeight;
    setCanScroll(overflow);
    setScrollTop(el.scrollTop);
    setHasMoreBelow(
      overflow && el.scrollTop + el.clientHeight < el.scrollHeight - 8,
    );
  }, [results?.length, getWorkingSpaces?.length]);

  const isSidebarLoading = useMemo(
    () => getWorkingSpaces === undefined || User === undefined,
    [getWorkingSpaces, User, results, status],
  );

  const handleCreateWorkingSpace = useCallback(async () => {
    try {
      await createWorkingSpace({ name: "Untitled" });
    } catch (error) {
      console.error("Error creating workspace:", error);
    }
  }, [createWorkingSpace]);

  const handleCreateNote = useCallback(
    async (workingSpaceId: any, workingSpacesSlug: string) => {
      try {
        setLoading(true);
        const tableName = "New Quick Access Notes";

        const tableId = await createTable({
          name: tableName,
          workingSpaceId: workingSpaceId,
        });

        const newNoteId = await createNote({
          workingSpacesSlug: workingSpacesSlug,
          workingSpaceId: workingSpaceId,
          title: tableName,
          notesTableId: tableId,
        });

        if (newNoteId) {
          const newNoteUrl = `/home/${workingSpaceId}/${`new-quick-access-notes`}?id=${newNoteId}`;
          router.push(newNoteUrl);
        }
      } catch (error) {
        console.error("Error creating note:", error);
        router.push(`/home/${workingSpaceId}`);
      } finally {
        setLoading(false);
      }
    },
    [createNote, createTable],
  );

  const handleSignOut = useCallback(async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      router.replace("/");
      router.refresh();
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setIsSigningOut(false);
    }
  }, [signOut]);

  if (isSidebarLoading) {
    return <SkeletonSidebar sidebarWidth={sidebarWidth} open={open} />;
  }

  return (
    <Sidebar
      variant="inset"
      className="group bg-muted"
      style={{
        width: `${sidebarWidth}px`,
      }}
    >
      <SidebarHeaderSection
        getWorkingSpaces={getWorkingSpaces}
        handleCreateNote={handleCreateNote}
        handleCreateWorkingSpace={handleCreateWorkingSpace}
        loading={loading}
      />

      <div className="relative flex min-h-0 flex-1 flex-col">
        {canScroll && scrollTop > 8 && (
          <div
            className="pointer-events-none absolute left-0 right-3 -top-1 z-10 h-20 bg-gradient-to-b from-muted from-20% to-transparent"
            aria-hidden
          />
        )}
        {canScroll && hasMoreBelow && (
          <div
            className="pointer-events-none absolute left-0 right-3 -bottom-1 z-10 h-20 bg-gradient-to-t from-muted from-20% to-transparent"
            aria-hidden
          />
        )}
        <SidebarContent
          ref={sidebarContentRef}
          onScroll={handleSidebarScroll}
          className="relative text-foreground transition-all duration-200 ease-in-out scrollbar-thin scrollbar-thumb-transparent scrollbar-track-transparent group-hover:scrollbar-thumb-primary/20"
        >
          <SidebarNavigation
            pathname={pathname}
            ishome={ishome}
            isMobile={isMobile}
            open={open}
          />

          <PinnedNotesList
            favoriteNotes={results}
            pathname={pathname}
            open={open}
            status={status}
            loadMore={loadMore}
          />
          <WorkspacesList
            getWorkingSpaces={getWorkingSpaces}
            handleCreateWorkingSpace={handleCreateWorkingSpace}
            pathname={pathname}
            open={open}
          />
        </SidebarContent>
      </div>
      <UserAccountSection
        User={User}
        handleSignOut={handleSignOut}
        isSigningOut={isSigningOut}
        pathname={pathname}
      />
    </Sidebar>
  );
});

AppSidebar.displayName = "AppSidebar";

export default AppSidebar;
