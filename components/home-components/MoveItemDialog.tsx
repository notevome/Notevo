"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "convex/react";
import {
  ChevronRight,
  Folder,
  FolderOpen,
  Plus,
  Search,
  FileSymlink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "@/cache/useQuery";
import { cn } from "@/lib/utils";
import { buildItemSlug, extractIdFromSlug } from "@/lib/slug";
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
import IntentPrefetchLink from "../IntentPrefetchLink";

export type MoveItemKind =
  | "note"
  | "document"
  | "pdf"
  | "link"
  | "whiteboard"
  | "table";

export interface MoveItemData {
  _id: Id<any>;
  kind: MoveItemKind;
  title?: string;
  slug?: string;
  workingSpaceId?: Id<"folders">;
  notesTableId?: Id<"tables">;
}

interface MoveItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: MoveItemData;
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

const kindLabels: Record<MoveItemKind, { singular: string; title: string }> = {
  note: { singular: "document", title: "Move document" },
  document: { singular: "document", title: "Move document" },
  pdf: { singular: "upload", title: "Move PDF" },
  link: { singular: "link", title: "Move link" },
  whiteboard: { singular: "whiteboard", title: "Move whiteboard" },
  table: { singular: "table", title: "Move table" },
};

export default function MoveItemDialog({
  open,
  onOpenChange,
  item,
}: MoveItemDialogProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [expandedWorkspaceIds, setExpandedWorkspaceIds] = useState<string[]>(
    [],
  );
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [movingTableId, setMovingTableId] = useState<string | null>(null);
  const { toast } = useToast();

  const itemMoveTargets = useQuery(
    api.documents.getWorkspaceTreeForMove,
    item.kind === "table"
      ? "skip"
      : { searchQuery: debouncedQuery || undefined },
  ) as any[] | undefined;
  const tableMoveTargets = useQuery(
    api.tables.getWorkspacesForMove,
    item.kind === "table"
      ? { searchQuery: debouncedQuery || undefined }
      : "skip",
  ) as any[] | undefined;
  const moveTargets =
    item.kind === "table" ? tableMoveTargets : itemMoveTargets;

  const moveNote = useMutation(api.documents.moveNote);
  const movePdf = useMutation(api.pdfs.movePdf);
  const moveLink = useMutation(api.links.moveLink);
  const moveWhiteboard = useMutation(api.whiteboards.moveWhiteboard);
  const moveTable = useMutation(api.tables.moveTable);
  const createWorkingSpace = useMutation(api.folders.createFolder);

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
      item.workingSpaceId ? [String(item.workingSpaceId)] : [],
    );
    setIsCreatingWorkspace(false);
    setMovingTableId(null);

    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 20);

    return () => clearTimeout(timer);
  }, [open, item.workingSpaceId]);

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
      console.error("Failed to create folder:", error);
    } finally {
      setIsCreatingWorkspace(false);
    }
  };

  const handleMove = async (
    targetWorkingSpaceId: Id<"folders">,
    targetNotesTableId?: Id<"tables">,
  ) => {
    const kindInfo = kindLabels[item.kind] || kindLabels.document;
    try {
      if (item.kind !== "table" && !targetNotesTableId) {
        throw new Error("A destination table is required to move this item.");
      }
      setMovingTableId(String(targetNotesTableId ?? targetWorkingSpaceId));

      let destinationHref: string | null = null;
      let prefetchId: Id<"documents"> | undefined;

      if (item.kind === "table") {
        const result = await moveTable({
          _id: item._id as Id<"tables">,
          targetWorkingSpaceId,
        });
        destinationHref = `/home/${result.folderId}?tableId=${item._id}`;
      } else if (item.kind === "note" || item.kind === "document") {
        const result = await moveNote({
          _id: item._id as Id<"documents">,
          targetWorkingSpaceId,
          targetNotesTableId,
        });
        const noteSlug = buildItemSlug(item.title || result.slug, item._id);
        destinationHref = `/home/${result.workingSpaceId}/${noteSlug}`;
        prefetchId = item._id as Id<"documents">;

        const currentItemId =
          searchParams.get("id") ||
          extractIdFromSlug(pathname.split("/").filter(Boolean).pop());
        if (currentItemId === String(item._id)) {
          router.replace(destinationHref);
        }
      } else if (item.kind === "pdf") {
        const result = await movePdf({
          _id: item._id as Id<"pdfs">,
          targetWorkingSpaceId,
          targetNotesTableId,
        });
        const pdfSlug = buildItemSlug(
          result.title || item.title || "untitled-pdf",
          item._id,
        );
        destinationHref = `/home/${result.workingSpaceId}/${pdfSlug}`;

        const currentItemId =
          searchParams.get("pdfId") ||
          extractIdFromSlug(pathname.split("/").filter(Boolean).pop());
        if (currentItemId === String(item._id)) {
          router.replace(destinationHref);
        }
      } else if (item.kind === "link") {
        const result = await moveLink({
          _id: item._id as Id<"links">,
          targetWorkingSpaceId,
          targetNotesTableId,
        });
        destinationHref = `/home/${result.workingSpaceId}?linkId=${item._id}`;
      } else if (item.kind === "whiteboard") {
        await moveWhiteboard({
          _id: item._id as Id<"whiteboards">,
          targetWorkingSpaceId,
          targetNotesTableId,
        });
        const wbSlug = buildItemSlug(
          item.title || "untitled-whiteboard",
          item._id,
        );
        destinationHref = `/home/${targetWorkingSpaceId}/${wbSlug}`;

        const currentItemId =
          searchParams.get("whiteboardId") ||
          extractIdFromSlug(pathname.split("/").filter(Boolean).pop());
        if (currentItemId === String(item._id)) {
          router.replace(destinationHref);
        }
      }

      onOpenChange(false);

      toast({
        variant: "default",
        title: `${kindInfo.singular.charAt(0).toUpperCase() + kindInfo.singular.slice(1)} moved successfully`,
        description: `Your ${kindInfo.singular} is now in its new location.`,
        action: destinationHref ? (
          <Button variant="secondary" className="px-3 h-8" size="sm" asChild>
            <IntentPrefetchLink
              href={destinationHref}
              prefetchNoteId={prefetchId}
              className="flex justify-center items-center gap-2 text-xs"
            >
              <FileSymlink size={16} />
              Checkout
            </IntentPrefetchLink>
          </Button>
        ) : undefined,
      });
    } catch (error) {
      console.error(`Failed to move ${kindInfo.singular}:`, error);
      toast({
        variant: "destructive",
        title: `Failed to move ${kindInfo.singular}`,
        description: "Try again later",
      });
    } finally {
      setMovingTableId(null);
    }
  };

  const kindInfo = kindLabels[item.kind] || kindLabels.document;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden bg-muted border-border md:min-w-[500px] gap-0 shadow-2xl">
        <DialogHeader className="px-5 pt-4 pb-3 border-b border-border">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-foreground mb-1">
            {kindInfo.title}
          </p>
          <DialogTitle className="text-[15px] font-medium text-foreground leading-snug">
            {item.title || "Untitled"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            {item.kind === "table"
              ? "Select a destination folder. Everything in the table moves with it."
              : "Select a destination table in this folder or any other folder."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-1 bg-muted">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                item.kind === "table"
                  ? "Search folders..."
                  : "Search folders and tables..."
              }
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
            Folder
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
          ) : !hasResults ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center text-center text-sm text-muted-foreground">
              <Folder className="mb-4 h-10 w-10 text-muted-foreground" />
              <p className="font-medium text-foreground">
                {debouncedQuery
                  ? `No targets found for "${debouncedQuery}"`
                  : "No folders found"}
              </p>
              <p className="mt-1">
                {item.kind === "table"
                  ? "Create a folder to move this table there."
                  : `Create a folder or table, then move this ${kindInfo.singular} there.`}
              </p>
            </div>
          ) : item.kind === "table" ? (
            <div className="space-y-0.5">
              {moveTargets.map((workspace) => {
                const isCurrentTarget =
                  String(item.workingSpaceId) === String(workspace._id);
                const isMoving = movingTableId === String(workspace._id);

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
          ) : (
            <div className="space-y-1">
              {moveTargets.map((workspace) => {
                const workspaceId = String(workspace._id);
                const isExpanded = expandedWorkspaceIds.includes(workspaceId);
                const tables = workspace.tables ?? [];

                return (
                  <div
                    key={workspace._id}
                    className="relative overflow-hidden app-radius-lg transition-colors"
                  >
                    <div className="absolute left-3.5 top-8 h-full w-px bg-border" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-full flex-1 justify-start gap-2 px-2 text-sm font-medium border-0 border-transparent hover:border-2 hover:bg-transparent"
                      onClick={() => toggleWorkspace(workspaceId)}
                    >
                      <ChevronRight
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 transition-transform text-muted-foreground",
                          isExpanded && "rotate-90",
                        )}
                      />
                      {isExpanded ? (
                        <FolderOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      ) : (
                        <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      )}
                      <span className="truncate text-sm font-medium text-foreground">
                        <HighlightedText
                          text={workspace.name || "Untitled"}
                          query={debouncedQuery}
                        />
                      </span>
                    </Button>

                    {isExpanded && (
                      <div className="space-y-0.5 px-1 py-1">
                        {tables.length === 0 ? (
                          <div className="flex flex-col justify-center items-center gap-2 app-radius-lg mx-2 py-3 bg-card text-xs text-muted-foreground/60 text-center">
                            No tables in this folder yet.
                            <CreateTableBtn
                              workingSpaceId={workspace._id}
                              variant="secondary"
                              size="sm"
                              label="Table"
                              className="h-7 shrink-0 gap-1 px-2 text-muted-foreground"
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
                              item.workingSpaceId === workspace._id &&
                              item.notesTableId === table._id;
                            const isMoving =
                              movingTableId === String(table._id);

                            return (
                              <div
                                key={table._id}
                                className="flex w-full items-center justify-between mx-auto text-left"
                              >
                                <button
                                  key={table._id}
                                  type="button"
                                  onClick={() =>
                                    handleMove(workspace._id, table._id)
                                  }
                                  disabled={isCurrentTarget || isMoving}
                                  aria-label="handle-move-target"
                                  className={cn(
                                    "flex w-full items-center justify-between app-radius-lg mx-4 px-2 py-2 text-left transition-colors",
                                    isCurrentTarget
                                      ? "cursor-not-allowed bg-muted"
                                      : "hover:bg-border",
                                  )}
                                >
                                  <div className="flex min-w-0 items-center gap-2">
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
