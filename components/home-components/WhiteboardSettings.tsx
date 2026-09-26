"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { useDebouncedCallback } from "use-debounce";
import z from "zod";
import { generateSlug } from "@/lib/generateSlug";
import {
  ChevronRight,
  Download,
  FileOutput,
  Folder,
  FolderOpen,
  Pin,
  Plus,
  Search,
} from "lucide-react";
import { FaEllipsis, FaEllipsisVertical, FaRegTrashCan } from "react-icons/fa6";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { useQuery } from "@/cache/useQuery";
import { cn, formatNoteTimestamp } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useHoverTooltip } from "@/hooks/useHoverTooltip";
import { useToast } from "@/hooks/use-toast";
import LoadingAnimation from "@/components/ui/LoadingAnimation";
import CreateTableBtn from "./CreateTableBtn";

interface WhiteboardSettingsProps {
  whiteboardId?: Id<"whiteboards">;
  whiteboard?: {
    _id: Id<"whiteboards">;
    title: string;
    favorite?: boolean;
    snapshot?: string;
    workingSpaceId: Id<"workingSpaces">;
    notesTableId: Id<"notesTables">;
    createdAt: number;
    updatedAt: number;
  };
  IconVariant?: "vertical_icon" | "horizontal_icon";
  onDelete?: (id: Id<"whiteboards">) => void;
  className?: string;
  syncBrowserChrome?: boolean;
}

const TITLE_MAX_LENGTH = 55;

const whiteboardTitleSchema = z
  .string()
  .min(1, "Title cannot be empty")
  .max(
    TITLE_MAX_LENGTH,
    `Title must be ${TITLE_MAX_LENGTH} characters or less`,
  );

export default function WhiteboardSettings({
  whiteboardId,
  IconVariant = "vertical_icon",
  whiteboard: whiteboardProp,
  onDelete,
  className,
  syncBrowserChrome = true,
}: WhiteboardSettingsProps) {
  const router = useRouter();
  const fetchedWhiteboard = useQuery(
    api.whiteboards.getWhiteboardById,
    whiteboardId ? { _id: whiteboardId } : "skip",
  );
  const whiteboard = whiteboardProp ?? fetchedWhiteboard;

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(whiteboard?.title ?? "");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [expandedWorkspaceIds, setExpandedWorkspaceIds] = useState<string[]>(
    [],
  );
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [movingTableId, setMovingTableId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const tooltip = useHoverTooltip(100);
  const { toast } = useToast();
  const updateWhiteboard = useMutation(api.whiteboards.updateWhiteboard);
  const deleteWhiteboard = useMutation(api.whiteboards.deleteWhiteboard);
  const moveWhiteboard = useMutation(api.whiteboards.moveWhiteboard);
  const createWorkingSpace = useMutation(api.workingSpaces.createWorkingSpace);
  const moveTargets = useQuery(
    api.notes.getWorkspaceTreeForMove,
    moveOpen ? { searchQuery: debouncedQuery || undefined } : "skip",
  ) as
    | Array<{
        _id: Id<"workingSpaces">;
        name?: string;
        tables?: Array<{ _id: Id<"notesTables">; name?: string }>;
      }>
    | undefined;

  const hasMoveTargets = useMemo(
    () => (moveTargets?.length ?? 0) > 0,
    [moveTargets],
  );

  useEffect(() => {
    if (!syncBrowserChrome || !whiteboard?.title) return;
    if (!isOnThisWhiteboardRoute()) return;

    const originalTitle = document.title;
    document.title = `${whiteboard.title} - Notevo`;

    return () => {
      document.title = originalTitle;
    };
  }, [syncBrowserChrome, whiteboard?.title, whiteboard?._id]);

  useEffect(() => {
    if (!moveOpen || !whiteboard) return;
    setQuery("");
    setDebouncedQuery("");
    setExpandedWorkspaceIds([String(whiteboard.workingSpaceId)]);
    setMovingTableId(null);
    const timer = setTimeout(() => searchInputRef.current?.focus(), 20);
    return () => clearTimeout(timer);
  }, [moveOpen, whiteboard?.workingSpaceId]);

  useEffect(() => {
    if (!debouncedQuery || !moveTargets) return;
    setExpandedWorkspaceIds(
      moveTargets.map((workspace) => String(workspace._id)),
    );
  }, [debouncedQuery, moveTargets]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 10);
    return () => clearTimeout(timer);
  }, [open]);

  const isOnThisWhiteboardRoute = () => {
    if (typeof window === "undefined" || !whiteboard) return false;
    const params = new URLSearchParams(window.location.search);
    return params.get("whiteboardId") === String(whiteboard._id);
  };

  const debouncedRenameWhiteboard = useDebouncedCallback(
    (nextTitle: string) => {
      const currentTitle = whiteboard?.title || "";
      const result = whiteboardTitleSchema.safeParse(nextTitle);

      if (!result.success) {
        const issue = result.error.issues[0];
        if (issue.code === "too_small") {
          setTitle("");
          toast({
            title: "Naming failed",
            description: "Title must not be empty.",
            variant: "destructive",
          });
        } else if (issue.code === "too_big") {
          setTitle(currentTitle);
          toast({
            title: "Naming failed",
            description: `Title must be ${TITLE_MAX_LENGTH} characters or less`,
            variant: "destructive",
          });
        }
        return;
      }

      if (syncBrowserChrome && isOnThisWhiteboardRoute()) {
        document.title = `${nextTitle} - Notevo`;
        const currentUrl = new URL(window.location.href);
        const segments = currentUrl.pathname.split("/");
        segments[segments.length - 1] = generateSlug(nextTitle);
        currentUrl.pathname = segments.join("/");
        window.history.replaceState({}, "", currentUrl.href);
      }

      if (nextTitle !== currentTitle) {
        updateWhiteboard({ _id: whiteboard._id, title: nextTitle }).catch(
          (error) => {
            console.error("Error updating whiteboard title:", error);
            setTitle(currentTitle);
          },
        );
      }
    },
    100,
  );

  if (!whiteboard) return null;

  const download = () => {
    const blob = new Blob(
      [whiteboard.snapshot || JSON.stringify({ elements: [] })],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${whiteboard.title || "whiteboard"}.excalidraw`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const remove = async () => {
    if (onDelete) {
      onDelete(whiteboard._id);
    } else {
      router.push(`/home/${whiteboard.workingSpaceId}`);
    }
    await deleteWhiteboard({ _id: whiteboard._id });
    setDeleteOpen(false);
  };

  const toggleWorkspace = (workspaceId: string) => {
    setExpandedWorkspaceIds((previous) =>
      previous.includes(workspaceId)
        ? previous.filter((id) => id !== workspaceId)
        : [...previous, workspaceId],
    );
  };

  const createWorkspace = async () => {
    try {
      setIsCreatingWorkspace(true);
      const workspaceId = await createWorkingSpace({ name: "Untitled" });
      setExpandedWorkspaceIds((previous) => [...previous, String(workspaceId)]);
    } finally {
      setIsCreatingWorkspace(false);
    }
  };

  const move = async (
    targetWorkingSpaceId: Id<"workingSpaces">,
    targetNotesTableId: Id<"notesTables">,
  ) => {
    try {
      setMovingTableId(String(targetNotesTableId));
      await moveWhiteboard({
        _id: whiteboard._id,
        targetWorkingSpaceId,
        targetNotesTableId,
      });
      setMoveOpen(false);
      toast({
        variant: "default",
        title: "Whiteboard moved successfully",
        description: "Your whiteboard is now in its new table.",
      });
    } catch (error) {
      console.error("Failed to move whiteboard:", error);
      toast({
        variant: "destructive",
        title: "Failed to move whiteboard",
        description: "Try again later",
      });
    } finally {
      setMovingTableId(null);
    }
  };

  return (
    <>
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
                variant="Trigger"
                size="icon"
                className={cn("h-8 w-8 ", className)}
                {...tooltip.triggerProps}
                aria-label="whiteboard-options"
              >
                {IconVariant === "vertical_icon" ? (
                  <FaEllipsisVertical
                    size={18}
                    className="text-muted-foreground"
                  />
                ) : (
                  <FaEllipsis size={22} className="text-muted-foreground" />
                )}
              </Button>
            </TooltipTrigger>
          </DropdownMenuTrigger>
          <TooltipContent side="bottom" align="end">
            Rename, Pin, Move, Download, Delete
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent
          align="end"
          className="z-[10000] w-48 space-y-4 px-1.5 pb-1.5 pt-0 text-muted-foreground"
        >
          <DropdownMenuGroup>
            <Label>Rename :</Label>
            <Input
              ref={inputRef}
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                debouncedRenameWhiteboard(event.target.value.trim());
              }}
              onBlur={() => debouncedRenameWhiteboard.flush()}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  debouncedRenameWhiteboard.flush();
                  setOpen(false);
                }
              }}
              className="h-8 text-foreground"
              placeholder="Rename"
            />
          </DropdownMenuGroup>
          <DropdownMenuGroup>
            <Button
              variant="SidebarMenuButton"
              className="h-8 w-full px-2 text-sm"
              onClick={() =>
                void updateWhiteboard({
                  _id: whiteboard._id,
                  favorite: !whiteboard.favorite,
                })
              }
            >
              <Pin size={14} className="text-muted-foreground" />
              {whiteboard.favorite ? "Unpin Whiteboard" : "Pin Whiteboard"}
            </Button>
            <Button
              variant="SidebarMenuButton"
              className="h-8 w-full px-2 text-sm"
              onClick={() => {
                setOpen(false);
                setMoveOpen(true);
              }}
            >
              <FileOutput size={14} className="text-muted-foreground" />
              Move Whiteboard
            </Button>
            <Button
              variant="SidebarMenuButton"
              className="h-8 w-full px-2 text-sm"
              onClick={download}
            >
              <Download size={14} className="text-muted-foreground" />
              Download.excalidraw
            </Button>
            <DropdownMenuSeparator />
            <Button
              variant="SidebarMenuButton_destructive"
              className="h-8 w-full px-2 text-sm text-foreground"
              onClick={(event) => {
                if (event.shiftKey) void remove();
                else {
                  setOpen(false);
                  setDeleteOpen(true);
                }
              }}
            >
              <FaRegTrashCan size={14} className="text-muted-foreground" />
              Delete
            </Button>
            <DropdownMenuSeparator />
            <div className="px-2 pt-0.5 text-[10px] leading-4 text-nowrap text-muted-foreground/80">
              <p>Last updated {formatNoteTimestamp(whiteboard.updatedAt)}</p>
              <p>Created {formatNoteTimestamp(whiteboard.createdAt)}</p>
            </div>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-card border border-border text-card-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Whiteboard Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete this whiteboard? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void remove()}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent className="p-0 overflow-hidden bg-muted border-border md:min-w-[500px] gap-0 shadow-2xl">
          <DialogHeader className="px-5 pt-4 pb-3 border-b border-border">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-foreground mb-1">
              Move whiteboard
            </p>
            <DialogTitle className="text-[15px] font-medium text-foreground leading-snug">
              {whiteboard.title || "Untitled"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Select a destination table in this workspace or any other
              workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-1 bg-muted">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search workspaces and tables..."
                className="border-none px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm bg-transparent"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void createWorkspace()}
              disabled={isCreatingWorkspace}
              className="gap-1 text-xs px-2 h-8"
            >
              {isCreatingWorkspace ? (
                <LoadingAnimation className="h-4 w-4 text-primary" />
              ) : (
                <Plus className="h-4 w-4" />
              )}{" "}
              Workspace
            </Button>
          </div>
          <div className="min-h-[320px] max-h-[350px] overflow-y-auto [&::-webkit-scrollbar]:w-[0.4rem] scrollbar-gutter-stable [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent p-3 bg-card">
            {moveTargets === undefined ? (
              <div className="space-y-2 p-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-10 animate-pulse app-radius-lg bg-border"
                  />
                ))}
              </div>
            ) : !hasMoveTargets ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center text-center text-sm text-muted-foreground">
                <Folder className="mb-4 h-10 w-10 text-muted-foreground" />
                <p className="font-medium text-foreground">
                  {debouncedQuery
                    ? `No targets found for \"${debouncedQuery}\"`
                    : "No workspaces found"}
                </p>
                <p className="mt-1">
                  Create a workspace or table, then move this whiteboard there.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {moveTargets.map((workspace) => {
                  const workspaceId = String(workspace._id);
                  const expanded = expandedWorkspaceIds.includes(workspaceId);
                  return (
                    <div
                      key={workspace._id}
                      className=" relative overflow-hidden app-radius-lg transition-colors"
                    >
                      <div className=" absolute left-3.5 top-8 h-full w-px bg-border" />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-full flex-1 justify-start gap-2 px-2 text-sm font-medium border-0 border-transparent hover:border-2 hover:bg-transparent"
                        onClick={() => toggleWorkspace(workspaceId)}
                      >
                        <ChevronRight
                          className={cn(
                            "h-3.5 w-3.5 shrink-0 transition-transform text-muted-foreground",
                            expanded && "rotate-90",
                          )}
                        />
                        {expanded ? (
                          <FolderOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        ) : (
                          <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        )}
                        <span className="truncate text-sm font-medium text-foreground">
                          {workspace.name || "Untitled"}
                        </span>
                      </Button>
                      {expanded && (
                        <div className="space-y-0.5 px-1 py-1">
                          {workspace.tables?.length ? (
                            workspace.tables.map((table) => {
                              const current =
                                whiteboard.workingSpaceId === workspace._id &&
                                whiteboard.notesTableId === table._id;
                              const moving =
                                movingTableId === String(table._id);
                              return (
                                <div
                                  key={table._id}
                                  className="flex w-full items-center justify-between mx-auto text-left "
                                >
                                  <button
                                    key={table._id}
                                    type="button"
                                    disabled={current || moving}
                                    onClick={() =>
                                      void move(workspace._id, table._id)
                                    }
                                    className={cn(
                                      "flex w-full items-center justify-between app-radius-lg mx-4 px-2 py-2 text-left transition-colors",
                                      current
                                        ? "cursor-not-allowed bg-muted"
                                        : "hover:bg-border",
                                    )}
                                  >
                                    <span className="flex min-w-0 items-center gap-2">
                                      <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                                      <span className="truncate text-[13px] font-medium">
                                        {table.name || "Untitled"}
                                      </span>
                                    </span>
                                    <span className="shrink-0 text-[11px] text-muted-foreground/60">
                                      {moving ? (
                                        <LoadingAnimation className="h-4 w-4 text-primary" />
                                      ) : current ? (
                                        <span className="text-xs font-medium border border-secondary-foreground/20 bg-secondary text-secondary-foreground px-2 py-0.5 app-radius-md">
                                          current
                                        </span>
                                      ) : (
                                        <span className="text-[11px] text-muted-foreground/50 group-hover:text-primary/60">
                                          move
                                        </span>
                                      )}
                                    </span>
                                  </button>
                                </div>
                              );
                            })
                          ) : (
                            <CreateTableBtn
                              workingSpaceId={workspace._id}
                              variant="secondary"
                              size="sm"
                              label="Table"
                              className="ml-6 h-7 text-xs"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
