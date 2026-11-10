"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useMutation } from "convex/react";
import { Pin, PinOff, X } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { useQuery } from "@/cache/useQuery";
import { cn } from "@/lib/utils";
import { extractIdFromSlug } from "@/lib/slug";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { useHoverTooltip } from "@/hooks/useHoverTooltip";
import LoadingAnimation from "@/components/ui/LoadingAnimation";

export type SidebarItemKind =
  | "note"
  | "document"
  | "pdf"
  | "link"
  | "whiteboard"
  | "folder";

interface ItemSettingsSidebarProps {
  itemId: Id<any>;
  itemKind: SidebarItemKind;
  itemTitle?: string;
  containerClassName?: string;
  onDeleted?: () => void;
}

export default function ItemSettingsSidebar({
  itemId,
  itemKind,
  itemTitle,
  containerClassName,
  onDeleted,
}: ItemSettingsSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const pinTooltip = useHoverTooltip(100);
  const deleteTooltip = useHoverTooltip(100);

  // Queries for current item favorite status
  const note = useQuery(
    api.documents.getNoteById,
    itemKind === "note" || itemKind === "document" ? { _id: itemId } : "skip",
  );
  const pdf = useQuery(
    api.pdfs.getPdfById,
    itemKind === "pdf" ? { _id: itemId } : "skip",
  );
  const link = useQuery(
    api.links.getLinkById,
    itemKind === "link" ? { _id: itemId } : "skip",
  );
  const whiteboard = useQuery(
    api.whiteboards.getWhiteboardById,
    itemKind === "whiteboard" ? { _id: itemId } : "skip",
  );
  const folderTables = useQuery(
    api.tables.getTables,
    itemKind === "folder" ? { folderId: itemId } : "skip",
  );

  // Mutations
  const updateNote = useMutation(api.documents.updateNote);
  const deleteNote = useMutation(api.documents.deleteNote);
  const updatePdf = useMutation(api.pdfs.updatePdf);
  const deletePdf = useMutation(api.pdfs.deletePdf);
  const updateLink = useMutation(api.links.updateLink);
  const deleteLink = useMutation(api.links.deleteLink);
  const updateWhiteboard = useMutation(api.whiteboards.updateWhiteboard);
  const deleteWhiteboard = useMutation(api.whiteboards.deleteWhiteboard);
  const deleteFolder = useMutation(api.folders.deleteFolder);

  const isFavorite =
    itemKind === "note" || itemKind === "document"
      ? note?.favorite
      : itemKind === "pdf"
        ? pdf?.favorite
        : itemKind === "link"
          ? link?.favorite
          : itemKind === "whiteboard"
            ? whiteboard?.favorite
            : false;

  const currentSlug = pathname.split("/").filter(Boolean).pop();
  const isViewingCurrent =
    (itemKind === "note" || itemKind === "document")
      ? searchParams.get("id") === String(itemId) ||
        searchParams.get("noteId") === String(itemId) ||
        extractIdFromSlug(currentSlug) === String(itemId)
      : itemKind === "pdf"
        ? searchParams.get("pdfId") === String(itemId) ||
          extractIdFromSlug(currentSlug) === String(itemId)
        : itemKind === "whiteboard"
          ? searchParams.get("whiteboardId") === String(itemId) ||
            extractIdFromSlug(currentSlug) === String(itemId)
          : itemKind === "folder"
            ? pathname.includes(String(itemId))
            : false;

  const handleFavoritePin = async () => {
    try {
      if (itemKind === "note" || itemKind === "document") {
        await updateNote({ _id: itemId, favorite: !isFavorite });
      } else if (itemKind === "pdf") {
        await updatePdf({ _id: itemId, favorite: !isFavorite });
      } else if (itemKind === "link") {
        await updateLink({ _id: itemId, favorite: !isFavorite });
      } else if (itemKind === "whiteboard") {
        await updateWhiteboard({ _id: itemId, favorite: !isFavorite });
      }
    } catch (error) {
      console.error("Failed to update favorite status:", error);
    }
  };

  const executeDelete = async () => {
    try {
      setIsDeleting(true);
      if (isViewingCurrent) {
        if (itemKind === "folder") {
          router.push("/home");
        } else {
          router.back();
        }
      }

      if (itemKind === "note" || itemKind === "document") {
        await deleteNote({ _id: itemId });
      } else if (itemKind === "pdf") {
        await deletePdf({ _id: itemId });
      } else if (itemKind === "link") {
        await deleteLink({ _id: itemId });
      } else if (itemKind === "whiteboard") {
        await deleteWhiteboard({ _id: itemId });
      } else if (itemKind === "folder") {
        await deleteFolder({ _id: itemId });
      }

      onDeleted?.();
    } catch (error) {
      console.error(`Failed to delete ${itemKind}:`, error);
    } finally {
      setIsDeleting(false);
      setIsAlertOpen(false);
    }
  };

  const initiateDelete = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (event.button === 0 && event.shiftKey) {
      event.preventDefault();
      void executeDelete();
    } else {
      setIsAlertOpen(true);
    }
  };

  const kindNames: Record<SidebarItemKind, string> = {
    note: "document",
    document: "document",
    pdf: "PDF",
    link: "link",
    whiteboard: "whiteboard",
    folder: "folder",
  };

  const kindName = kindNames[itemKind] || "item";

  return (
    <>
      <div
        className={cn(
          "flex justify-end items-center px-0.5",
          containerClassName,
        )}
      >
        {itemKind !== "folder" && (
          <Tooltip open={pinTooltip.open}>
            <TooltipTrigger asChild>
              <Button
                onClick={handleFavoritePin}
                variant="SidebarMenuButton"
                className="px-1.5 h-7 hover:bg-card"
                aria-label={`pin-${kindName}`}
                {...pinTooltip.triggerProps}
              >
                {isFavorite ? (
                  <PinOff size={16} className="text-muted-foreground" />
                ) : (
                  <Pin size={16} className="text-muted-foreground" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={5}>
              {isFavorite ? `Unpin ${kindName}` : `Pin ${kindName}`}
            </TooltipContent>
          </Tooltip>
        )}

        <Tooltip open={deleteTooltip.open}>
          <TooltipTrigger asChild>
            <Button
              variant="SidebarMenuButton_destructive"
              className="px-1.5 h-7 hover:bg-card"
              aria-label={`delete-${kindName}`}
              {...deleteTooltip.triggerProps}
              onMouseDown={initiateDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <LoadingAnimation className="h-3 w-3" />
              ) : (
                <X size={16} />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={5}>
            Delete {kindName}
          </TooltipContent>
        </Tooltip>
      </div>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent className="bg-card border border-border text-card-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirm {kindName.charAt(0).toUpperCase() + kindName.slice(1)} Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {itemKind === "folder" && (folderTables?.length ?? 0) > 0 ? (
                <>
                  This folder has {folderTables?.length} table(s). Deleting it will permanently remove all tables, documents, and uploads inside.
                </>
              ) : (
                `Are you sure you want to delete this ${kindName}? This action cannot be undone.`
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <p className="text-xs text-muted-foreground">
            If you don&apos;t want to see this again, hold{" "}
            <span className="mx-1 text-xs pointer-events-none border border-border inline-flex h-5 select-none items-center gap-1 app-radius-md bg-card px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              Shift
            </span>{" "}
            when clicking delete.
          </p>

          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border border-border hover:bg-accent">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground border-none"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
