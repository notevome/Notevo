"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { ChevronRight, Folder, FolderOpen, Plus, Search } from "lucide-react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "@/cache/useQuery";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LoadingAnimation from "@/components/ui/LoadingAnimation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import CreateTableBtn from "./CreateTableBtn";

interface MoveNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: {
    _id: Id<"notes">;
    title?: string;
    slug?: string;
    workingSpaceId?: Id<"workingSpaces">;
    notesTableId?: Id<"notesTables">;
  };
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;

  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return <>{text}</>;

  return (
    <>
      {text.slice(0, index)}
      <span className="bg-primary/15 text-primary font-semibold">
        {text.slice(index, index + query.length)}
      </span>
      {text.slice(index + query.length)}
    </>
  );
}

export default function MoveNoteDialog({
  open,
  onOpenChange,
  note,
}: MoveNoteDialogProps) {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [expandedWorkspaceIds, setExpandedWorkspaceIds] = useState<string[]>(
    [],
  );
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [movingTableId, setMovingTableId] = useState<string | null>(null);

  const moveTargets = useQuery(api.notes.getMoveTargets, {
    searchQuery: debouncedQuery || undefined,
  }) as any[] | undefined;

  const moveNote = useMutation(api.notes.moveNote).withOptimisticUpdate(
    (local, args) => {
      const currentNote = local.getQuery(api.notes.getNoteById, {
        _id: args._id,
      });

      if (!currentNote) return;

      const targets =
        local.getQuery(api.notes.getMoveTargets, {
          searchQuery: undefined,
        }) ?? [];
      const targetWorkspace = targets.find(
        (workspace: any) => workspace._id === args.targetWorkingSpaceId,
      );

      local.setQuery(
        api.notes.getNoteById,
        { _id: args._id },
        {
          ...currentNote,
          workingSpaceId: args.targetWorkingSpaceId,
          notesTableId: args.targetNotesTableId,
          workingSpacesSlug:
            targetWorkspace?.slug ?? currentNote.workingSpacesSlug,
          updatedAt: Date.now(),
        },
      );
    },
  );
  const createWorkingSpace = useMutation(api.workingSpaces.createWorkingSpace);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!open) return;

    setQuery("");
    setDebouncedQuery("");
    setExpandedWorkspaceIds(
      note.workingSpaceId ? [String(note.workingSpaceId)] : [],
    );
    setIsCreatingWorkspace(false);
    setMovingTableId(null);

    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 20);

    return () => clearTimeout(timer);
  }, [open, note.workingSpaceId]);

  useEffect(() => {
    if (!debouncedQuery || !moveTargets) return;
    setExpandedWorkspaceIds(
      moveTargets.map((workspace) => String(workspace._id)),
    );
  }, [debouncedQuery, moveTargets]);

  const hasResults = useMemo(
    () => (moveTargets?.length ?? 0) > 0,
    [moveTargets],
  );

  const toggleWorkspace = (workspaceId: string) => {
    setExpandedWorkspaceIds((prev) =>
      prev.includes(workspaceId)
        ? prev.filter((id) => id !== workspaceId)
        : [...prev, workspaceId],
    );
  };

  const handleCreateWorkspace = async () => {
    try {
      setIsCreatingWorkspace(true);
      const workspaceId = await createWorkingSpace({ name: "Untitled" });
      setExpandedWorkspaceIds((prev) =>
        prev.includes(String(workspaceId))
          ? prev
          : [...prev, String(workspaceId)],
      );
    } catch (error) {
      console.error("Failed to create workspace:", error);
    } finally {
      setIsCreatingWorkspace(false);
    }
  };

  const handleMove = async (
    targetWorkingSpaceId: Id<"workingSpaces">,
    targetNotesTableId: Id<"notesTables">,
  ) => {
    try {
      setMovingTableId(String(targetNotesTableId));
      const result = await moveNote({
        _id: note._id,
        targetWorkingSpaceId,
        targetNotesTableId,
      });

      onOpenChange(false);
      router.push(
        `/home/${result.workingSpaceId}/${result.slug}?id=${note._id}`,
      );
    } catch (error) {
      console.error("Failed to move note:", error);
    } finally {
      setMovingTableId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden bg-card border-border md:min-w-[500px] gap-0 shadow-2xl">
        <DialogHeader className="px-5 pt-4 pb-3 border-b border-border">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-primary/70 mb-1">
            Move note
          </p>
          <DialogTitle className="text-[15px] font-medium text-foreground leading-snug">
            {note.title || "Untitled"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            Select a destination table in this workspace or any other workspace.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-1 bg-card">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Search className="h-4 w-4 shrink-0 text-primary/70" />
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
            onClick={handleCreateWorkspace}
            disabled={isCreatingWorkspace}
            className="gap-1 text-xs px-2 h-8"
          >
            {isCreatingWorkspace ? (
              <LoadingAnimation className="h-4 w-4 text-primary" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Workspace
          </Button>
        </div>

        <div className="min-h-[320px] max-h-[350px] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent p-3 bg-background/50">
          {moveTargets === undefined ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-10 rounded-lg bg-primary/8 animate-pulse"
                />
              ))}
            </div>
          ) : !hasResults ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center text-center text-sm text-muted-foreground">
              <Folder className="mb-4 h-10 w-10 text-primary/50" />
              <p className="font-medium text-foreground">
                {debouncedQuery
                  ? `No targets found for "${debouncedQuery}"`
                  : "No workspaces found"}
              </p>
              <p className="mt-1">
                Create a workspace or table, then move this note there.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {moveTargets.map((workspace) => {
                const workspaceId = String(workspace._id);
                const isExpanded = expandedWorkspaceIds.includes(workspaceId);
                const tables = workspace.tables ?? [];
                return (
                  <div
                    key={workspace._id}
                    className="overflow-hidden rounded-lg transition-colors"
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-full flex-1 justify-start gap-2 px-2 text-sm font-medium hover:bg-primary/10 hover:text-primary"
                      onClick={() => toggleWorkspace(workspaceId)}
                    >
                      <ChevronRight
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 transition-transform text-primary/60",
                          isExpanded && "rotate-90",
                        )}
                      />
                      {isExpanded ? (
                        <FolderOpen className="h-3.5 w-3.5 shrink-0 text-primary/80" />
                      ) : (
                        <Folder className="h-3.5 w-3.5 shrink-0 text-primary/60" />
                      )}
                      <span className="truncate text-sm font-medium text-foreground">
                        <HighlightedText
                          text={workspace.name || "Untitled"}
                          query={debouncedQuery}
                        />
                      </span>
                    </Button>

                    {isExpanded && (
                      <div className="space-y-0.5 px-1 py-1 bg-background/30">
                        {tables.length === 0 ? (
                          <div className=" flex flex-col justify-center items-center gap-2 rounded-lg mx-2 py-3 bg-card text-xs text-muted-foreground/60 text-center">
                            No tables in this workspace yet.
                            <CreateTableBtn
                              workingSpaceId={workspace._id}
                              variant="secondary"
                              size="sm"
                              label="Table"
                              className="h-8 shrink-0 gap-1 px-2 text-muted-foreground"
                              onCreated={() => {
                                setExpandedWorkspaceIds((prev) =>
                                  prev.includes(workspaceId)
                                    ? prev
                                    : [...prev, workspaceId],
                                );
                              }}
                            />
                          </div>
                        ) : (
                          tables.map((table: any) => {
                            const isCurrentTarget =
                              note.workingSpaceId === workspace._id &&
                              note.notesTableId === table._id;
                            const isMoving =
                              movingTableId === String(table._id);

                            return (
                              <button
                                key={table._id}
                                type="button"
                                onClick={() =>
                                  handleMove(workspace._id, table._id)
                                }
                                disabled={isCurrentTarget || isMoving}
                                className={cn(
                                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors",
                                  isCurrentTarget
                                    ? "cursor-not-allowed bg-secondary/50 text-primary"
                                    : " hover:bg-primary/10",
                                )}
                              >
                                <div className="flex min-w-0 items-center gap-2">
                                  <span className="ml-4 h-px w-3 bg-muted-foreground/60" />
                                  <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                                  <span className="truncate text-[13px] font-medium">
                                    <HighlightedText
                                      text={table.name || "Untitled"}
                                      query={debouncedQuery}
                                    />
                                  </span>
                                </div>

                                <span className="shrink-0 text-[11px] text-muted-foreground/60">
                                  {isMoving ? (
                                    <LoadingAnimation className="h-4 w-4 text-primary" />
                                  ) : isCurrentTarget ? (
                                    <span className="text-[10px] font-medium border border-primary/20 bg-primary/5 text-primary/60 px-2 py-0.5 rounded-md">
                                      current
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-muted-foreground/50 group-hover:text-primary/60">
                                      move
                                    </span>
                                  )}
                                </span>
                              </button>
                            );
                          })
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
  );
}
