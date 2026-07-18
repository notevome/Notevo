"use client";

import type { Id } from "@/convex/_generated/dataModel";
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useQuery } from "@/cache/useQuery";
import { Button } from "@/components/ui/button";
import { SquarePen, X, Pin, PinOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHoverTooltip } from "@/hooks/useHoverTooltip";
import {
  redirect,
  useRouter,
  usePathname,
  useSearchParams,
} from "next/navigation";
interface NoteSettingsSidbarProps {
  noteId: Id<"notes"> | any;
  noteTitle: string | any;
  ContainerClassName?: string | any;
}

export default function NoteSettingsSidbar({
  noteId,
  noteTitle,
  ContainerClassName,
}: NoteSettingsSidbarProps) {
  const pathname = usePathname();
  const pathSegments = pathname.split("/").filter((segment) => segment);
  const searchParams = useSearchParams();
  const realPathName = `/home/${pathSegments[1]}/${pathSegments[2]}?id=${searchParams.get("id")}`;
  const noteHref = `/home/${pathSegments[1]}/${pathSegments[2]}?id=${noteId}`;
  const router = useRouter();
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const updateNote = useMutation(api.notes.updateNote).withOptimisticUpdate(
    (local, args) => {
      const { _id, favorite } = args;
      // Update single note query
      const note = local.getQuery(api.notes.getNoteById, { _id });
      if (note && favorite !== undefined) {
        local.setQuery(
          api.notes.getNoteById,
          { _id },
          {
            ...note,
            favorite: favorite,
            updatedAt: Date.now(),
          },
        );
      }
    },
  );
  const deleteNote = useMutation(api.notes.deleteNote).withOptimisticUpdate(
    (local, args) => {
      const { _id } = args;

      // Get the note - for optimistic IDs, this will help identify it
      const note = local.getQuery(api.notes.getNoteById, { _id });
      if (!note) return;

      // For optimistic IDs, the mutation will fail before running
      // For real IDs, the server will handle deletion and sync queries
      // Note: Paginated queries will sync automatically when the server confirms deletion
    },
  );
  const getNote = useQuery(api.notes.getNoteById, { _id: noteId });

  const initiateDelete = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (event.button === 0 && event.shiftKey) {
      event.preventDefault();
      void handleDelete(event);
    } else {
      setIsAlertOpen(true);
    }
  };

  const handleDelete = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    try {
      if (realPathName === noteHref) {
        router.push(`/home/${pathSegments[1]}`);
        await new Promise((resolve) => setTimeout(resolve, 300));
        await deleteNote({ _id: noteId });
      } else {
        await deleteNote({ _id: noteId });
      }
    } catch (error) {
      console.error("Failed to delete note:", error);
    } finally {
      setIsAlertOpen(false);
    }
  };

  const handleFavoritePin = async () => {
    await updateNote({
      _id: noteId,
      favorite: !getNote?.favorite,
    });
  };

  const pinTooltip = useHoverTooltip(200);
  const deleteTooltip = useHoverTooltip(200);

  return (
    <>
      <div
        className={cn(
          "flex justify-end items-center px-0.5",
          ContainerClassName,
        )}
      >
        <Tooltip open={pinTooltip.open}>
          <TooltipTrigger asChild>
            <Button
              onClick={handleFavoritePin}
              variant="SidebarMenuButton"
              className="px-1.5 h-7 hover:bg-card !rounded-none"
              aria-label="pin-note"
              {...pinTooltip.triggerProps}
            >
              {getNote?.favorite ? (
                <PinOff size={16} className="text-muted-foreground" />
              ) : (
                <Pin size={16} className="text-muted-foreground" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={5} className="!rounded-none">
            {getNote?.favorite ? "Unpin note" : "Pin note"}
          </TooltipContent>
        </Tooltip>

        <Tooltip open={deleteTooltip.open}>
          <TooltipTrigger asChild>
            <Button
              variant="SidebarMenuButton_destructive"
              className="px-1.5 h-7 hover:bg-card !rounded-none"
              aria-label="delete-note"
              {...deleteTooltip.triggerProps}
              onMouseDown={initiateDelete}
            >
              <X size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            sideOffset={5}
            className=" !rounded-none"
          >
            Delete note
          </TooltipContent>
        </Tooltip>
      </div>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent className="bg-card border border-border text-card-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Note Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {`Are you sure you want to delete this note? This action cannot be
              undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <p>
            if you don't wanna see again hold
            <span className=" mx-1 text-xs pointer-events-none border border-border inline-flex h-5 select-none items-center gap-1 rounded-md bg-card px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              Shift
            </span>
            when you delete and it will be deleted without confirmation.
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border border-border hover:bg-accent">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground border-none"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
