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
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useQuery } from "@/cache/useQuery";
import { Button } from "@/components/ui/button";

import { SquarePen, X, Pin, PinOff } from "lucide-react";
import { cn } from "@/lib/utils";

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

  const initiateDelete = () => {
    setIsAlertOpen(true);
  };

  const handleDelete = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    try {
      await deleteNote({ _id: noteId });
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

  return (
    <>
      <TooltipProvider delayDuration={200} skipDelayDuration={0}>
        <div
          className={cn(
            "flex justify-end items-center px-1",
            ContainerClassName,
          )}
        >
          <Tooltip disableHoverableContent>
            <TooltipTrigger asChild>
              <Button
                onClick={handleFavoritePin}
                variant="SidebarMenuButton"
                className="px-2 h-7"
              >
                {getNote?.favorite ? (
                  <PinOff size={16} className="text-primary" />
                ) : (
                  <Pin size={16} className="text-primary" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={5}>
              {getNote?.favorite ? "Unpin note" : "Pin note"}
            </TooltipContent>
          </Tooltip>

          <Tooltip disableHoverableContent>
            <TooltipTrigger asChild>
              <Button
                onMouseDown={initiateDelete}
                variant="SidebarMenuButton_destructive"
                className="px-2 h-7"
              >
                <X size={16} className=" text-primary" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={5}>
              Delete note
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent className="bg-card border border-border text-card-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Note Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {`Are you sure you want to delete this note? This action cannot be
              undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
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
