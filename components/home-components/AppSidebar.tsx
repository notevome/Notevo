"use client";
import {
  Notebook,
  Plus,
  Pin,
  FileText,
  CircleUserRound,
  LogOut,
  HomeIcon,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FolderClosed,
  FolderOpen,
  Globe,
  Pickaxe,
  Scale,
  Gavel,
  FolderPlus,
  SquarePen,
  PanelRightOpen,
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
import { useMutation, insertAtBottomIfLoaded } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
import { useState, useCallback, memo, useRef, useMemo, useEffect } from "react";
import Link from "next/link";
import IntentPrefetchLink from "@/components/IntentPrefetchLink";
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
  formatWorkspaceNameForCreateSideBarBtn,
} from "@/lib/utils";
import { Doc } from "@/convex/_generated/dataModel";
import { Input } from "../ui/input";
import NoteSettingsSidbar from "./NoteSettingsSidbar";
import PdfSettingsSidebar from "./PdfSettingsSidebar";
import WorkingSpaceSettingsSidbar from "./WorkingSpaceSettingsSidbar";
import React from "react";
import { ThemeToggle } from "../ThemeToggle";
import { UserIcon } from "lucide-react";
import Feedback from "./Feedback";
import AccountSettingsDialog from "./AccountSettingsDialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { useHoverTooltip } from "@/hooks/useHoverTooltip";
import { usePaginatedQuery } from "@/cache/usePaginatedQuery";
import { z } from "zod";
import { generateSlug } from "@/lib/generateSlug";
import { useQuery } from "@/cache/useQuery";
import SkeletonSidebar from "../ui/skeleton-sidebar";
import NoteContextMenu from "./NoteContextMenu";
import { FaGithub } from "react-icons/fa6";
import { useHomePane } from "./HomePaneDrawer";
import { ShortcutBadge } from "../ui/shortcut-badge";

interface SidebarHeaderSectionProps {
  getWorkingSpaces: Doc<"workingSpaces">[] | undefined;
  handleCreateNote: (
    workingSpaceId: Id<"workingSpaces">,
    workingSpacesSlug: string,
  ) => Promise<void>;
  handleCreateWorkingSpace: () => Promise<void>;
  loading: boolean;
}

const workspaceNameSchema = z
  .string()
  .min(1, "Name cannot be empty")
  .max(30, "Name must be 30 characters or less");

const noteTitleSchema = z
  .string()
  .min(1, "Title cannot be empty")
  .max(60, "Title must be 60 characters or less");

const CREATE_NOTE_WORKSPACE_STORAGE_KEY = "notevo_create_note_workspace_id";
const PINNED_NOTES_EXPANDED_STORAGE_KEY =
  "notevo_sidebar_pinned_notes_expanded";
const PINNED_UPLOADS_EXPANDED_STORAGE_KEY =
  "notevo_sidebar_pinned_uploads_expanded";

function OpenInPaneButton({
  label,
  onOpen,
}: {
  label: string;
  onOpen: () => void;
}) {
  const tooltip = useHoverTooltip(100);

  return (
    <Tooltip open={tooltip.open}>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="SidebarMenuButton"
          className="px-1.5 h-7 hover:bg-card text-muted-foreground"
          aria-label={label}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onOpen();
            tooltip.hide();
          }}
          {...tooltip.triggerProps}
        >
          <PanelRightOpen size={16} />
        </Button>
      </TooltipTrigger>
      <TooltipContent
        side="right"
        sideOffset={5}
        className="flex justify-center items-center gap-2 !rounded-none"
      >
        Open in Pane
        <ShortcutBadge keys="Alt + Click" />
      </TooltipContent>
    </Tooltip>
  );
}

function useStoredExpandedState(storageKey: string, defaultValue = true) {
  const [isExpanded, setIsExpanded] = useState(defaultValue);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedValue = window.localStorage.getItem(storageKey);
    if (savedValue === "true") {
      setIsExpanded(true);
    } else if (savedValue === "false") {
      setIsExpanded(false);
    }
  }, [storageKey]);

  const setStoredExpanded = useCallback(
    (nextValue: boolean | ((currentValue: boolean) => boolean)) => {
      setIsExpanded((currentValue) => {
        const resolvedValue =
          typeof nextValue === "function" ? nextValue(currentValue) : nextValue;

        if (typeof window !== "undefined") {
          window.localStorage.setItem(storageKey, String(resolvedValue));
        }

        return resolvedValue;
      });
    },
    [storageKey],
  );

  return [isExpanded, setStoredExpanded] as const;
}

const SidebarHeaderSection = memo(function SidebarHeaderSection({
  getWorkingSpaces,
  handleCreateNote,
  handleCreateWorkingSpace,
  loading,
}: SidebarHeaderSectionProps) {
  const [savedWorkspaceId, setSavedWorkspaceId] = useState<
    string | null | undefined
  >(undefined);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setSavedWorkspaceId(
      window.localStorage.getItem(CREATE_NOTE_WORKSPACE_STORAGE_KEY),
    );
  }, []);

  const savedWorkspace = useMemo(() => {
    if (!savedWorkspaceId) return undefined;
    return getWorkingSpaces?.find(
      (workingSpace) => String(workingSpace._id) === savedWorkspaceId,
    );
  }, [getWorkingSpaces, savedWorkspaceId]);

  const firstCreatedWorkspace = useMemo(() => {
    return getWorkingSpaces?.reduce<Doc<"workingSpaces"> | undefined>(
      (oldestWorkspace, workingSpace) => {
        if (!oldestWorkspace) return workingSpace;

        const oldestCreatedAt =
          oldestWorkspace.createdAt ?? oldestWorkspace._creationTime;
        const workingSpaceCreatedAt =
          workingSpace.createdAt ?? workingSpace._creationTime;

        return workingSpaceCreatedAt < oldestCreatedAt
          ? workingSpace
          : oldestWorkspace;
      },
      undefined,
    );
  }, [getWorkingSpaces]);

  const createNoteWorkspace = savedWorkspace ?? firstCreatedWorkspace;
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !savedWorkspaceId ||
      getWorkingSpaces === undefined ||
      savedWorkspace
    ) {
      return;
    }

    window.localStorage.removeItem(CREATE_NOTE_WORKSPACE_STORAGE_KEY);
    setSavedWorkspaceId(null);
  }, [getWorkingSpaces, savedWorkspace, savedWorkspaceId]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      savedWorkspaceId !== null ||
      !firstCreatedWorkspace
    ) {
      return;
    }

    const workspaceId = String(firstCreatedWorkspace._id);
    window.localStorage.setItem(CREATE_NOTE_WORKSPACE_STORAGE_KEY, workspaceId);
    setSavedWorkspaceId(workspaceId);
  }, [firstCreatedWorkspace, savedWorkspaceId]);

  const createNoteInWorkspace = useCallback(
    async (workingSpace: Doc<"workingSpaces">) => {
      const workspaceId = String(workingSpace._id);

      setSavedWorkspaceId(workspaceId);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          CREATE_NOTE_WORKSPACE_STORAGE_KEY,
          workspaceId,
        );
      }

      await handleCreateNote(
        workingSpace._id as any,
        workingSpace.slug as string,
      );
    },
    [handleCreateNote],
  );

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
      {getWorkingSpaces?.length === 0 && (
        <Button
          variant="outline"
          className="font-medium w-full h-9 flex justify-start items-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/80"
          onClick={handleCreateWorkingSpace}
        >
          <FolderPlus size={16} /> Create Workspace
        </Button>
      )}
      {getWorkingSpaces?.length === 1 || getWorkingSpaces?.length === 0
        ? getWorkingSpaces.map((workingSpace) => (
            <Button
              key={workingSpace._id}
              variant="outline"
              className="font-medium w-full h-9 flex justify-start items-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/80"
              disabled={loading}
              onMouseDown={() => void createNoteInWorkspace(workingSpace)}
            >
              {loading ? (
                <>redirecting...</>
              ) : (
                <>
                  <SquarePen size={16} className=" mt-px" /> New Note
                </>
              )}
            </Button>
          ))
        : createNoteWorkspace && (
            <div className="flex h-9 w-full items-center overflow-hidden app-radius-lg">
              <Button
                variant="outline"
                className="font-medium h-9 flex-1 justify-start gap-1.5 !rounded-r-none bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={loading}
                onClick={() => void createNoteInWorkspace(createNoteWorkspace)}
              >
                {loading ? (
                  <>redirecting...</>
                ) : (
                  <>
                    <SquarePen size={16} className=" mt-px" /> New Note
                  </>
                )}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className=" font-medium h-9 px-2 !rounded-l-none border-l-0 bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={loading}
                    aria-label="select-create-note-workspace"
                  >
                    <ChevronDown size={16} className="font-bold" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="bottom"
                  align="end"
                  className="app-radius-xl p-1 bg-background/90 backdrop-blur border border-solid border-border w-52"
                >
                  <DropdownMenuGroup className="flex-col">
                    {getWorkingSpaces?.map((workingSpace) => (
                      <DropdownMenuItem
                        key={workingSpace._id}
                        className="relative flex-1 px-2 h-7 py-1.5 data-[highlighted]:bg-foreground app-radius-lg"
                        onSelect={() =>
                          void createNoteInWorkspace(workingSpace)
                        }
                        disabled={loading}
                      >
                        <FolderClosed size="16" className="mr-2" />
                        <span>
                          {formatWorkspaceNameForCreateSideBarBtn(
                            workingSpace.name,
                          )}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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
      <SidebarGroupContent className=" hover:bg-transparent">
        <SidebarMenu>
          <SidebarMenuItem>
            <Button
              asChild
              variant="SidebarMenuButton"
              className={`px-2 h-8 group ${
                pathname === "/home" ? "bg-border" : ""
              }`}
            >
              <IntentPrefetchLink href="/home">
                <HomeIcon className=" text-muted-foreground" size="16" />
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
              enableShortcut={false}
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
    const titleTooltip = useHoverTooltip(300);
    const { openPane } = useHomePane();
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
    const router = useRouter();
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
        const input = inputRef.current;
        if (!input) return;
        input.focus();
        input.select();
        input.scrollLeft = 0;
      });
    }, [note.title]);

    const handleInputChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditedTitle(e.target.value);
      },
      [note.title],
    );

    const handleInputBlur = useCallback(async () => {
      const currentTitle = note.title || "Untitled";
      const result = noteTitleSchema.safeParse(editedTitle.trim());

      if (!result.success) {
        setEditedTitle(currentTitle);
        setIsEditing(false);
        return;
      }

      const trimmedTitle = result.data;

      if (trimmedTitle !== currentTitle) {
        try {
          await updateNote({
            _id: note._id,
            title: trimmedTitle,
          });
          router.refresh();
        } catch (error) {
          console.error("Error updating note title:", error);
          setEditedTitle(currentTitle);
        }
      }
      setIsEditing(false);
      titleTooltip.hide();
    }, [editedTitle, note.title, note._id, updateNote, titleTooltip.open]);

    const handleInputKeyPress = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
          inputRef.current?.blur();
        } else if (e.key === "Escape") {
          setIsEditing(false);
          setEditedTitle(note.title || "Untitled");
        }
      },
      [note.title, titleTooltip.open],
    );

    const textClassName = isHovered
      ? "truncate flex-grow bg-gradient-to-r from-foreground from-40% via-transparent via-60% to-transparent to-100% text-transparent bg-clip-text"
      : "truncate flex-grow";

    const content = (
      <SidebarGroupContent
        className="relative h-8 my-0.5 w-full flex justify-between items-center overflow-hidden group/item"
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
                aria-label="pinned note title"
                className="flex-1 h-3 pl-8 pr-2 py-0 my-0 text-sm focus-visible:outline-none border-0 border-transparent focus-visible:ring-0 focus-visible:ring-offset-0 app-radius-lg"
              />
            ) : (
              <Tooltip open={titleTooltip.open}>
                <TooltipTrigger asChild>
                  <Button
                    variant="SidebarMenuButton"
                    className={`px-2 my-0.5 h-8 group flex-1 ${
                      isActive ? "bg-border" : ""
                    }`}
                    asChild
                    onDoubleClick={handleDoubleClick}
                    {...titleTooltip.triggerProps}
                  >
                    <IntentPrefetchLink
                      href={noteHref}
                      className="flex items-center gap-2 flex-grow min-w-0"
                      onClick={(event) => {
                        if (event.button === 0 && event.altKey) {
                          event.preventDefault();
                          openPane({
                            type: "note",
                            id: note._id,
                            title: note.title || "Untitled",
                          });
                          titleTooltip.hide();
                        }
                      }}
                    >
                      {isHovered || isActive ? (
                        <ChevronRight
                          size="16"
                          className="text-muted-foreground flex-shrink-0"
                        />
                      ) : (
                        <Pin
                          size="16"
                          className="text-muted-foreground flex-shrink-0"
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
                  sideOffset={5}
                  className="!rounded-none py-[5px]"
                >
                  {note.title || "Untitled"}
                </TooltipContent>
              </Tooltip>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
        <div
          className={`absolute right-0 flex items-center ${isHovered && !isEditing ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2 pointer-events-none"}`}
          onMouseEnter={titleTooltip.hide}
        >
          <OpenInPaneButton
            label="open-note-in-pane"
            onOpen={() =>
              openPane({
                type: "note",
                id: note._id,
                title: note.title || "Untitled",
              })
            }
          />
          <NoteSettingsSidbar
            noteId={note._id}
            noteTitle={note.title}
            ContainerClassName=""
          />
        </div>
      </SidebarGroupContent>
    );

    if (isEditing) return content;

    return (
      <NoteContextMenu noteId={note._id} noteTitle={note.title}>
        {content}
      </NoteContextMenu>
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
  const [isExpanded, setIsExpanded] = useStoredExpandedState(
    PINNED_NOTES_EXPANDED_STORAGE_KEY,
  );

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
      <SidebarGroupLabel>
        <Button
          variant="Trigger"
          size="sm"
          onClick={() => setIsExpanded((currentValue) => !currentValue)}
          className=" px-0 h-6 text-xs gap-0.5 text-muted-foreground flex items-center justify-center"
        >
          <span>Pinned Notes</span>
          {isExpanded ? <ChevronDown size="13" /> : <ChevronRight size="13" />}
        </Button>
      </SidebarGroupLabel>
      {isExpanded &&
        favoriteNotes.map((note) => (
          <PinnedNoteItem
            key={note._id}
            note={note}
            pathname={pathname}
            open={open}
          />
        ))}

      {/* Show More Button for Pinned Notes */}
      {isExpanded && favoriteNotes.length > 4 && status === "CanLoadMore" && (
        <SidebarGroupContent>
          <Button
            variant="SidebarMenuButton"
            size="sm"
            onClick={() => loadMore(5)}
            className="px-2 my-0.5 h-8 group flex-1"
          >
            <ChevronDown size="16" className=" text-muted-foreground" />
            Show More
          </Button>
        </SidebarGroupContent>
      )}

      {isExpanded && favoriteNotes.length > 4 && status === "LoadingMore" && (
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

interface PinnedUploadItemProps {
  pdf: Doc<"pdfs">;
  pathname: string;
  open: boolean;
}

const PinnedUploadItem = memo(
  function PinnedUploadItem({ pdf, pathname, open }: PinnedUploadItemProps) {
    const titleTooltip = useHoverTooltip(300);
    const { openPane } = useHomePane();
    const [isHovered, setIsHovered] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedTitle, setEditedTitle] = useState(pdf.title || "Untitled");
    const updatePdf = useMutation(api.pdfs.updatePdf);
    const inputRef = useRef<HTMLInputElement>(null);

    const pdfSlug = generateSlug(pdf.title || "untitled-pdf");
    const pdfPath = `/home/${pdf.workingSpaceId}/pdf/${pdfSlug}`;
    const pdfHref = `${pdfPath}?pdfId=${pdf._id}`;
    const isActive = pathname === pdfPath;

    const handleContentMouseEnter = useCallback(() => {
      setIsHovered(true);
    }, []);

    const handleContentMouseLeave = useCallback(() => {
      setIsHovered(false);
    }, []);

    const handleDoubleClick = useCallback(() => {
      setIsEditing(true);
      setEditedTitle(pdf.title || "Untitled");
      requestAnimationFrame(() => {
        const input = inputRef.current;
        if (!input) return;
        input.focus();
        input.select();
        input.scrollLeft = 0;
      });
    }, [pdf.title]);

    const handleInputChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditedTitle(e.target.value);
      },
      [],
    );

    const handleInputBlur = useCallback(async () => {
      const currentTitle = pdf.title || "Untitled";
      const result = noteTitleSchema.safeParse(editedTitle.trim());

      if (!result.success) {
        setEditedTitle(currentTitle);
        setIsEditing(false);
        return;
      }

      const trimmedTitle = result.data;

      if (trimmedTitle !== currentTitle) {
        try {
          await updatePdf({
            _id: pdf._id,
            title: trimmedTitle,
          });
        } catch (error) {
          console.error("Error updating PDF title:", error);
          setEditedTitle(currentTitle);
        }
      }
      setIsEditing(false);
      titleTooltip.hide();
    }, [editedTitle, pdf._id, pdf.title, updatePdf, titleTooltip.open]);

    const handleInputKeyPress = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
          inputRef.current?.blur();
        } else if (e.key === "Escape") {
          setIsEditing(false);
          setEditedTitle(pdf.title || "Untitled");
          titleTooltip.hide();
        }
      },
      [pdf.title, titleTooltip.open],
    );

    const textClassName = isHovered
      ? "truncate flex-grow bg-gradient-to-r from-foreground from-40% via-transparent via-60% to-transparent to-100% text-transparent bg-clip-text"
      : "truncate flex-grow";
    return (
      <SidebarGroupContent
        className="relative h-8 my-0.5 w-full flex justify-between items-center overflow-hidden group/item"
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
                aria-label="pinned upload title"
                className="flex-1 h-3 pl-8 pr-2 py-0 my-0 text-sm focus-visible:outline-none border-0 border-transparent focus-visible:ring-0 focus-visible:ring-offset-0 app-radius-lg"
              />
            ) : (
              <Tooltip open={titleTooltip.open}>
                <TooltipTrigger asChild>
                  <Button
                    variant="SidebarMenuButton"
                    className={`px-2 my-0.5 h-8 group flex-1 ${
                      isActive ? "bg-border" : ""
                    }`}
                    asChild
                    onDoubleClick={handleDoubleClick}
                    {...titleTooltip.triggerProps}
                  >
                    <IntentPrefetchLink
                      href={pdfHref}
                      className="flex items-center gap-2 flex-grow min-w-0"
                      onClick={(event) => {
                        if (event.button === 0 && event.altKey) {
                          event.preventDefault();
                          openPane({
                            type: "pdf",
                            id: pdf._id,
                            title: pdf.title || "Untitled",
                          });
                          titleTooltip.hide();
                        }
                      }}
                    >
                      {isHovered || isActive ? (
                        <ChevronRight
                          size="16"
                          className="text-muted-foreground flex-shrink-0"
                        />
                      ) : (
                        <FileText
                          size="16"
                          className="text-muted-foreground flex-shrink-0"
                        />
                      )}
                      <span className={textClassName}>
                        {formatWorkspaceName(pdf.title || "Untitled")}
                      </span>
                    </IntentPrefetchLink>
                  </Button>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  sideOffset={5}
                  className=" !rounded-none py-[5px]"
                >
                  {pdf.title || "Untitled"}
                </TooltipContent>
              </Tooltip>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
        <div
          className={`absolute right-0 flex items-center ${isHovered && !isEditing ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2 pointer-events-none"}`}
          onMouseEnter={titleTooltip.hide}
        >
          <OpenInPaneButton
            label="open-upload-in-pane"
            onOpen={() =>
              openPane({
                type: "pdf",
                id: pdf._id,
                title: pdf.title || "Untitled",
              })
            }
          />
          <PdfSettingsSidebar pdfId={pdf._id} />
        </div>
      </SidebarGroupContent>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.pdf.favorite === nextProps.pdf.favorite &&
      prevProps.pdf.title === nextProps.pdf.title &&
      prevProps.pathname === nextProps.pathname &&
      prevProps.open === nextProps.open
    );
  },
);

interface PinnedUploadsListProps {
  favoritePdfs: Doc<"pdfs">[];
  pathname: string;
  open: boolean;
  status: "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted";
  loadMore: (numItems: number) => void;
}

const PinnedUploadsList = memo(function PinnedUploadsList({
  favoritePdfs,
  pathname,
  open,
  status,
  loadMore,
}: PinnedUploadsListProps) {
  const [isExpanded, setIsExpanded] = useStoredExpandedState(
    PINNED_UPLOADS_EXPANDED_STORAGE_KEY,
  );

  if (status === "LoadingFirstPage") {
    return (
      <SidebarGroup>
        <SidebarGroupLabel className="text-muted-foreground flex items-center justify-between">
          <span>Pinned Uploads</span>
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

  if (favoritePdfs.length === 0) {
    return null;
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>
        <Button
          variant="Trigger"
          size="sm"
          onClick={() => setIsExpanded((currentValue) => !currentValue)}
          className=" px-0 h-6 text-xs gap-0.5 text-muted-foreground flex items-center justify-center"
        >
          <span>Pinned Uploads</span>
          {isExpanded ? <ChevronDown size="13" /> : <ChevronRight size="13" />}
        </Button>
      </SidebarGroupLabel>
      {isExpanded &&
        favoritePdfs.map((pdf) => (
          <PinnedUploadItem
            key={pdf._id}
            pdf={pdf}
            pathname={pathname}
            open={open}
          />
        ))}

      {isExpanded && favoritePdfs.length > 4 && status === "CanLoadMore" && (
        <SidebarGroupContent>
          <Button
            variant="SidebarMenuButton"
            size="sm"
            onClick={() => loadMore(5)}
            className="px-2 my-0.5 h-8 group flex-1"
          >
            <ChevronDown size="16" className=" text-muted-foreground" />
            Show More
          </Button>
        </SidebarGroupContent>
      )}

      {isExpanded && favoritePdfs.length > 4 && status === "LoadingMore" && (
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
    const titleTooltip = useHoverTooltip(300);
    const { openPane } = useHomePane();
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
        const input = inputRef.current;
        if (!input) return;
        input.focus();
        input.select();
        input.scrollLeft = 0;
      });
    }, [workingSpace.name]);

    const handleInputChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditedName(e.target.value);
      },
      [],
    );

    const handleInputBlur = useCallback(async () => {
      const currentName = workingSpace.name || "Untitled";
      const result = workspaceNameSchema.safeParse(editedName.trim());

      if (!result.success) {
        setEditedName(currentName);
        setIsEditing(false);
        return;
      }

      const trimmedName = result.data;

      if (trimmedName !== currentName) {
        try {
          await updateWorkingSpace({
            _id: workingSpace._id,
            name: trimmedName,
          });
        } catch (error) {
          console.error("Error updating workspace name:", error);
          setEditedName(currentName);
        }
      }
      setIsEditing(false);
      titleTooltip.hide();
    }, [
      editedName,
      workingSpace.name,
      workingSpace._id,
      updateWorkingSpace,
      titleTooltip.open,
    ]);

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
      ? "truncate flex-grow bg-gradient-to-r from-foreground from-75% via-transparent via-85% to-transparent to-100% text-transparent bg-clip-text"
      : "truncate flex-grow";

    return (
      <SidebarGroupContent
        className="relative h-8 my-0.5 w-full flex justify-between items-center overflow-hidden group/item"
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
                aria-label="work space name"
                className="flex-1 h-3 pl-8 pr-2 py-0 my-0 text-sm focus-visible:outline-none border-0 border-transparent  focus-visible:ring-0 focus-visible:ring-offset-0 app-radius-lg"
              />
            ) : (
              <Tooltip open={titleTooltip.open}>
                <TooltipTrigger asChild>
                  <Button
                    variant="SidebarMenuButton"
                    className={`px-2 my-0.5 h-8 group flex-1 justify-start ${
                      isActive ? "bg-border" : ""
                    }`}
                    asChild
                    onDoubleClick={handleDoubleClick}
                    {...titleTooltip.triggerProps}
                  >
                    <IntentPrefetchLink
                      href={workspaceHref}
                      className="flex items-center gap-2 flex-grow min-w-0"
                    >
                      {isHovered || isActive ? (
                        <FolderOpen
                          size="16"
                          className="flex-shrink-0 text-muted-foreground"
                        />
                      ) : (
                        <FolderClosed
                          size="16"
                          className="flex-shrink-0 text-muted-foreground"
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
                  sideOffset={5}
                  className="!rounded-none py-[5px]"
                >
                  {workingSpace.name || "Untitled"}
                </TooltipContent>
              </Tooltip>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
        <div
          className={`absolute right-0 flex items-center ${isHovered && !isEditing ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          onMouseEnter={titleTooltip.hide}
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
  const addWorkspaceTooltip = useHoverTooltip(300);

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-muted-foreground flex items-center justify-between">
        <span>Workspaces</span>
      </SidebarGroupLabel>
      <Tooltip open={addWorkspaceTooltip.open}>
        <TooltipTrigger asChild>
          <SidebarGroupAction
            onClick={handleCreateWorkingSpace}
            {...addWorkspaceTooltip.triggerProps}
            className=" !rounded-none"
          >
            <Plus size={16} className=" text-muted-foreground" />{" "}
            <span className="sr-only">Add Workspace</span>
          </SidebarGroupAction>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          sideOffset={5}
          className=" text-xs py-0.5 px-1.5 !rounded-none"
        >
          Add Workspace
        </TooltipContent>
      </Tooltip>
      {getWorkingSpaces?.map((workingSpace) => (
        <WorkspaceItem
          key={workingSpace._id}
          workingSpace={workingSpace}
          pathname={pathname}
          open={open}
        />
      ))}
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
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);

  return (
    <SidebarFooter className=" z-50 text-foreground">
      <AccountSettingsDialog
        open={isAccountSettingsOpen}
        onOpenChange={setIsAccountSettingsOpen}
        user={User}
      />
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
                  className="w-full h-[2.6rem] px-1.5 flex items-center justify-between"
                  disabled={isSigningOut}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={User?.image || "/placeholder.svg"}
                      className=" app-radius-lg"
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
                  <div className="flex flex-col items-start justify-start flex-1">
                    <p className="font-medium">
                      {User?.name ? (
                        formatUserName(User.name)
                      ) : (
                        <SkeletonTextAnimation className="w-28 mx-0" />
                      )}
                    </p>
                  </div>
                  <TbSelector size={16} />
                </Button>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              className="app-radius-lg m-2 p-1.5 bg-background backdrop-blur w-[--radix-popper-anchor-width] z-[90000]"
            >
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  setIsAccountSettingsOpen(true);
                }}
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
              <ThemeToggle />
              <DropdownMenuSeparator />
              <Feedback />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="group flex h-8 w-full min-w-0 items-center justify-start gap-0 px-2 text-sm font-normal text-foreground "
              >
                <LogOut
                  size="16"
                  className="mr-2 h-4 w-4 text-muted-foreground"
                />
                Sign out
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className=" flex flex-col gap-px justify-center items-start px-1.5 pt-0.5 *:text-[10px] leading-4 text-nowrap *:text-muted-foreground/80">
                <span className=" w-full flex justify-between items-center">
                  <Link
                    href="https://github.com/notevome/Notevo"
                    target="_blank"
                    className="hover:underline"
                  >
                    {process.env.NEXT_PUBLIC_APP_VERSION}
                  </Link>
                  <Link
                    href="https://www.mohammedh.dev/"
                    target="_blank"
                    className="hover:underline"
                  >
                    @Mohammed H.
                  </Link>
                </span>

                <span className=" w-full flex justify-between items-center">
                  <Link
                    href="/terms-of-service"
                    target="_blank"
                    className=" hover:underline"
                  >
                    Terms of Service
                  </Link>
                  <Link
                    href="mailto:support@notevo.me"
                    target="_blank"
                    className=" hover:underline"
                  >
                    Help & Support
                  </Link>
                </span>
              </div>
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

  const getWorkingSpaces = useQuery(
    api.workingSpaces.getRecentWorkingSpaces,
    {},
  );
  const User = useQuery(api.users.viewer, {});
  const { results, status, loadMore } = usePaginatedQuery(
    api.notes.getFavNotes,
    {},
    { initialNumItems: 5 },
  );
  const {
    results: favoritePdfs,
    status: favoritePdfsStatus,
    loadMore: loadMorePdfs,
  } = usePaginatedQuery(api.pdfs.getFavPdfs, {}, { initialNumItems: 5 });
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
  }, [results?.length, favoritePdfs?.length, getWorkingSpaces?.length]);

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
      redirect("/");
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
            className="pointer-events-none absolute left-0 right-0 -top-1 z-10 h-20 bg-gradient-to-b from-muted from-20% to-transparent"
            aria-hidden
          />
        )}
        {canScroll && hasMoreBelow && (
          <div
            className="pointer-events-none absolute left-0 right-0 -bottom-1 z-10 h-20 bg-gradient-to-t from-muted from-20% to-transparent"
            aria-hidden
          />
        )}
        <SidebarContent
          ref={sidebarContentRef}
          onScroll={handleSidebarScroll}
          className="scrollbar-gutter-stable pb-16 relative text-foreground transition-all duration-200 ease-in-out [&::-webkit-scrollbar]:w-[0.4rem] [&::-webkit-scrollbar-thumb]:bg-transparent [&::-webkit-scrollbar-track]:bg-transparent group-hover:[&::-webkit-scrollbar-thumb]:bg-border"
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
          <PinnedUploadsList
            favoritePdfs={favoritePdfs}
            pathname={pathname}
            open={open}
            status={favoritePdfsStatus}
            loadMore={loadMorePdfs}
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
