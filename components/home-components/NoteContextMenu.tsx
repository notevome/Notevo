"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useMutation } from "convex/react";
import { useQuery } from "@/cache/useQuery";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
import { generateSlug } from "@/lib/generateSlug";
import { cn } from "@/lib/utils";
import {
  Pin,
  FileText,
  FileJson,
  FileType,
  FileDown,
  FileOutput,
} from "lucide-react";
import { FaRegTrashCan } from "react-icons/fa6";
import MoveNoteDialog from "./MoveNoteDialog";
import { useNoteDownload } from "@/hooks/useNoteDownload";

interface NoteContextMenuProps {
  noteId: Id<"notes">;
  noteTitle: string | any;
  children: React.ReactNode;
}

const NOTE_TITLE_MAX_LENGTH = 55;

const itemClassName =
  "h-8 w-full justify-start gap-2 px-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground";

const formatNoteTimestamp = (timestamp?: number) => {
  if (!timestamp) return "";

  return new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function NoteContextMenu({
  noteId,
  noteTitle,
  children,
}: NoteContextMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [inputValue, setInputValue] = useState(noteTitle);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);

  const updateNote = useMutation(api.notes.updateNote).withOptimisticUpdate(
    (local, args) => {
      const { _id, title, body, favorite } = args;
      const note = local.getQuery(api.notes.getNoteById, { _id });
      if (note) {
        local.setQuery(
          api.notes.getNoteById,
          { _id },
          {
            ...note,
            title: title ?? note.title,
            body: body ?? note.body,
            favorite: favorite !== undefined ? favorite : note.favorite,
            updatedAt: Date.now(),
          },
        );
      }
    },
  );

  const deleteNote = useMutation(api.notes.deleteNote);
  const getNote = useQuery(api.notes.getNoteById, { _id: noteId });

  const currentNoteId = searchParams.get("id");
  const isViewingThisNote = currentNoteId === noteId;

  const { handleDownload } = useNoteDownload({
    noteBody: getNote?.body,
    noteTitle,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setInputValue(noteTitle);
  }, [noteTitle]);

  useEffect(() => {
    if (!open) return;

    const timeoutId = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 10);

    const handlePointerDown = (event: MouseEvent) => {
      if (event.button !== 0) return;
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  if (!getNote) return <>{children}</>;

  const createdAtText = formatNoteTimestamp(getNote.createdAt);
  const updatedAtText = formatNoteTimestamp(getNote.updatedAt);

  const handleContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const menuWidth = 220;
    const menuHeight = 360;
    const maxX = window.innerWidth - menuWidth - 8;
    const maxY = window.innerHeight - menuHeight - 8;

    setPosition({
      x: Math.max(8, Math.min(event.clientX, maxX)),
      y: Math.max(8, Math.min(event.clientY, maxY)),
    });
    setOpen(true);
  };

  const handleBlur = async () => {
    const trimmedValue = inputValue.trim();
    const isValid =
      trimmedValue.length > 0 && trimmedValue.length <= NOTE_TITLE_MAX_LENGTH;

    if (!isValid) {
      setInputValue(noteTitle);
      return;
    }

    if (trimmedValue !== noteTitle) {
      await updateNote({ _id: noteId, title: trimmedValue });

      if (isViewingThisNote) {
        const newSlug = generateSlug(trimmedValue);
        const pathSegments = pathname.split("/");
        pathSegments[pathSegments.length - 1] = newSlug;
        const newPath = pathSegments.join("/");
        router.replace(`${newPath}?id=${noteId}`);
      }
    }

    setInputValue(trimmedValue);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleBlur();
      setOpen(false);
    }
  };

  const handleFavoritePin = async () => {
    await updateNote({
      _id: noteId,
      favorite: !getNote.favorite,
    });
    setOpen(false);
  };

  const handleDelete = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsAlertOpen(false);
    try {
      if (isViewingThisNote) {
        router.push(`/home/${getNote.workingSpaceId}`);
        await new Promise((resolve) => setTimeout(resolve, 300));
        await deleteNote({ _id: noteId });
      } else {
        await deleteNote({ _id: noteId });
      }
    } catch (error) {
      console.error("Failed to delete note:", error);
    }
  };

  return (
    <>
      <div onContextMenu={handleContextMenu}>{children}</div>

      {mounted &&
        open &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[10000] w-[220px] app-radius-md border border-border bg-popover p-1.5 text-popover-foreground shadow-md"
            style={{ left: position.x, top: position.y }}
            onContextMenu={(event) => event.preventDefault()}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="space-y-4">
              <div className="relative">
                <Label>Rename :</Label>
                <Input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  onBlur={() => void handleBlur()}
                  onKeyDown={handleKeyDown}
                  onMouseDown={(event) => event.stopPropagation()}
                  placeholder="Rename your note"
                  className="mt-1 h-8 text-foreground"
                />
              </div>

              <div className="space-y-1 text-muted-foreground">
                <Button
                  variant="ghost"
                  className={itemClassName}
                  onClick={() => void handleFavoritePin()}
                  aria-label="pin-note"
                >
                  <Pin size={14} className="text-muted-foreground" />
                  {getNote.favorite ? "Unpin Note" : "Pin Note"}
                </Button>

                <Button
                  variant="ghost"
                  className={itemClassName}
                  onClick={() => {
                    setOpen(false);
                    setIsMoveDialogOpen(true);
                  }}
                  aria-label="move-note"
                >
                  <FileOutput size={14} className="text-muted-foreground" />
                  Move Note
                </Button>

                <Button
                  variant="ghost"
                  className={itemClassName}
                  onClick={() => {
                    handleDownload("markdown");
                    setOpen(false);
                  }}
                  aria-label="download-markdown"
                >
                  <FileText size={14} className="text-muted-foreground" />
                  Download Markdown (.md)
                </Button>

                <Button
                  variant="ghost"
                  className={itemClassName}
                  onClick={() => {
                    handleDownload("json");
                    setOpen(false);
                  }}
                  aria-label="download-json"
                >
                  <FileJson size={14} className="text-muted-foreground" />
                  Download JSON
                </Button>

                <Button
                  variant="ghost"
                  className={itemClassName}
                  onClick={() => {
                    handleDownload("docx");
                    setOpen(false);
                  }}
                  aria-label="download-docx"
                >
                  <FileType size={14} className="text-muted-foreground" />
                  Download Word (.docx)
                </Button>

                <Button
                  variant="ghost"
                  className={itemClassName}
                  onClick={() => {
                    handleDownload("pdf");
                    setOpen(false);
                  }}
                  aria-label="download-pdf"
                >
                  <FileDown size={14} className="text-muted-foreground" />
                  Download PDF
                </Button>

                <div className="my-1 h-px bg-border" />

                <Button
                  variant="SidebarMenuButton_destructive"
                  className="w-full h-8 px-2 text-sm"
                  onClick={() => {
                    setOpen(false);
                    setIsAlertOpen(true);
                  }}
                  aria-label="delete-note"
                >
                  <FaRegTrashCan size={14} className="text-muted-foreground" />
                  Delete
                </Button>

                <div className="my-1 h-px bg-border" />

                <div className="px-2 pt-1 text-[10px] leading-4 text-muted-foreground/80">
                  <p>Last updated {updatedAtText}</p>
                  <p>Created {createdAtText}</p>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent className="bg-card border border-border text-card-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Note Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete this note? This action cannot be
              undone.
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

      <MoveNoteDialog
        open={isMoveDialogOpen}
        onOpenChange={setIsMoveDialogOpen}
        note={{
          _id: noteId,
          title: getNote?.title,
          slug: getNote?.slug,
          workingSpaceId: getNote?.workingSpaceId,
          notesTableId: getNote?.notesTableId,
        }}
      />
    </>
  );
}
