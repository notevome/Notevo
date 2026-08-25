"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { FileSymlink, Folder, Plus, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
import IntentPrefetchLink from "../IntentPrefetchLink";

interface MoveTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table: {
    _id: Id<"notesTables">;
    name?: string;
    workingSpaceId: Id<"workingSpaces">;
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

export default function MoveTableDialog({
  open,
  onOpenChange,
  table,
}: MoveTableDialogProps) {
  const { toast } = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [movingWorkspaceId, setMovingWorkspaceId] = useState<string | null>(
    null,
  );

  // A table's destination is a workspace itself, so this uses a flat
  // workspace list rather than the workspace > table tree used by
  // MoveNoteDialog / MovePdfDialog / MoveLinkDialog.
  const moveTargets = useQuery(api.notesTables.getWorkspacesForMove, {
    searchQuery: debouncedQuery || undefined,
  }) as any[] | undefined;

  const moveTable = useMutation(api.notesTables.moveTable).withOptimisticUpdate(
    (local, args) => {
      const currentTable = local.getQuery(api.notesTables.getTableById, {
        _id: args._id,
      });

      if (!currentTable) return;

      local.setQuery(
        api.notesTables.getTableById,
        { _id: args._id },
        {
          ...currentTable,
          workingSpaceId: args.targetWorkingSpaceId,
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
    setIsCreatingWorkspace(false);
    setMovingWorkspaceId(null);

    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 20);

    return () => clearTimeout(timer);
  }, [open]);

  const hasResults = (moveTargets?.length ?? 0) > 0;

  const handleCreateWorkspace = async () => {
    try {
      setIsCreatingWorkspace(true);
      await createWorkingSpace({ name: "Untitled" });
    } catch (error) {
      console.error("Failed to create workspace:", error);
    } finally {
      setIsCreatingWorkspace(false);
    }
  };

  const handleMove = async (targetWorkingSpaceId: Id<"workingSpaces">) => {
    try {
      setMovingWorkspaceId(String(targetWorkingSpaceId));
      const result = await moveTable({
        _id: table._id,
        targetWorkingSpaceId,
      });
      onOpenChange(false);
      toast({
        variant: "default",
        title: "Table moved successfully",
        description: "Everything inside moved with it.",
        action: (
          <Button variant="secondary" className="px-3 h-8" size="sm" asChild>
            <IntentPrefetchLink
              href={`/home/${result.workingSpaceId}?tableId=${table._id}`}
              className="flex justify-center items-center gap-2 text-xs"
            >
              <FileSymlink size={16} />
              Checkout
            </IntentPrefetchLink>
          </Button>
        ),
      });
    } catch (error) {
      console.error("Failed to move table:", error);
      toast({
        variant: "destructive",
        title: "Failed to move table",
        description: "Try again later",
      });
    } finally {
      setMovingWorkspaceId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden bg-muted border-border md:min-w-[500px] gap-0 shadow-2xl">
        <DialogHeader className="px-5 pt-4 pb-3 border-b border-border">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-foreground mb-1">
            Move table
          </p>
          <DialogTitle className="text-[15px] font-medium text-foreground leading-snug">
            {table.name || "Untitled"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            Select a destination workspace. Notes, uploads, and links inside
            this table move with it.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-1 bg-muted">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search workspaces..."
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

        <div className="min-h-[320px] max-h-[350px] overflow-y-auto [&::-webkit-scrollbar]:w-[0.4rem] scrollbar-gutter-stable [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent p-3 bg-card">
          {moveTargets === undefined ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-10 app-radius-lg bg-border animate-pulse"
                />
              ))}
            </div>
          ) : !hasResults ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center text-center text-sm text-muted-foreground">
              <Folder className="mb-4 h-10 w-10 text-muted-foreground" />
              <p className="font-medium text-foreground">
                {debouncedQuery
                  ? `No workspaces found for "${debouncedQuery}"`
                  : "No workspaces found"}
              </p>
              <p className="mt-1">
                Create a workspace to move this table there.
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {moveTargets!.map((workspace) => {
                const isCurrentTarget = table.workingSpaceId === workspace._id;
                const isMoving = movingWorkspaceId === String(workspace._id);

                return (
                  <button
                    key={workspace._id}
                    type="button"
                    onClick={() => handleMove(workspace._id)}
                    disabled={isCurrentTarget || isMoving}
                    className={cn(
                      "flex w-full items-center justify-between app-radius-lg px-2 py-2 text-left transition-colors",
                      isCurrentTarget
                        ? "cursor-not-allowed bg-muted"
                        : "hover:bg-border",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate text-sm font-medium text-foreground">
                        <HighlightedText
                          text={workspace.name || "Untitled"}
                          query={debouncedQuery}
                        />
                      </span>
                    </div>

                    <span className="shrink-0 text-[11px] text-muted-foreground/60">
                      {isMoving ? (
                        <LoadingAnimation className="h-4 w-4 text-primary" />
                      ) : isCurrentTarget ? (
                        <span className="text-xs font-medium border border-secondary-foreground/20 bg-secondary text-secondary-foreground px-2 py-0.5 app-radius-md">
                          current
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground/50">
                          move
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
