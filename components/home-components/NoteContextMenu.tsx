"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useMutation } from "convex/react";
import { useQuery } from "@/cache/useQuery";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { generateSlug } from "@/lib/generateSlug";
import {
  Pin,
  FileText,
  FileJson,
  FileType,
  FileDown,
  FileOutput,
  Download,
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
  const inputRef = useRef<HTMLInputElement>(null);
  // This ref points to the invisible zero-size trigger span
  const triggerRef = useRef<HTMLSpanElement>(null);

  const [inputValue, setInputValue] = useState(noteTitle);
  const [open, setOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  // Cursor position for the virtual trigger anchor
  const [triggerPos, setTriggerPos] = useState({ x: 0, y: 0 });

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
    setInputValue(noteTitle);
  }, [noteTitle]);

  // Focus & select the rename input whenever the menu opens
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
    return () => window.clearTimeout(id);
  }, [open]);

  if (!getNote) return <>{children}</>;

  const createdAtText = formatNoteTimestamp(getNote.createdAt);
  const updatedAtText = formatNoteTimestamp(getNote.updatedAt);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTriggerPos({ x: e.clientX, y: e.clientY });
    // Let the span reposition before Radix measures it
    setOpen(false);
    requestAnimationFrame(() => setOpen(true));
  };

  const handleBlur = async () => {
    const trimmedValue = inputValue.trim();
    const isValid =
      trimmedValue.length > 0 && trimmedValue.length <= NOTE_TITLE_MAX_LENGTH;

    if (!isValid) {
      setInputValue(noteTitle);
      router.refresh();
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
      router.refresh();
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
    await updateNote({ _id: noteId, favorite: !getNote.favorite });
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
      <div onContextMenu={handleContextMenu}>
        {children}

        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <span
              ref={triggerRef}
              style={{
                position: "fixed",
                left: triggerPos.x,
                top: triggerPos.y,
                width: 0,
                height: 0,
                pointerEvents: "none",
              }}
            />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-48 pb-1.5 px-1.5 pt-0 space-y-4 text-muted-foreground z-[10000]"
            onCloseAutoFocus={(e) => e.preventDefault()}
            // Align from the top-left corner of the (zero-size) trigger
            align="start"
            side="bottom"
          >
            <DropdownMenuGroup>
              <Label className="text-xs text-muted-foreground">Rename</Label>
              <Input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onBlur={() => void handleBlur()}
                onKeyDown={handleKeyDown}
                onPointerDown={(e) => e.stopPropagation()}
                placeholder="Rename your note"
                className="text-foreground h-7"
              />
            </DropdownMenuGroup>

            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => void handleFavoritePin()}>
                <Pin size={14} className="mr-2 text-muted-foreground" />
                {getNote.favorite ? "Unpin Note" : "Pin Note"}
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => {
                  setOpen(false);
                  setIsMoveDialogOpen(true);
                }}
              >
                <FileOutput size={14} className="mr-2 text-muted-foreground" />
                Move Note
              </DropdownMenuItem>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Download size={14} className="mr-2 text-muted-foreground" />
                  Download
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-[200px]">
                  <DropdownMenuItem
                    onClick={() => {
                      handleDownload("markdown");
                      setOpen(false);
                    }}
                  >
                    <FileText
                      size={14}
                      className="mr-2 text-muted-foreground"
                    />
                    Markdown (.md)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      handleDownload("json");
                      setOpen(false);
                    }}
                  >
                    <FileJson
                      size={14}
                      className="mr-2 text-muted-foreground"
                    />
                    JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      handleDownload("docx");
                      setOpen(false);
                    }}
                  >
                    <FileType
                      size={14}
                      className="mr-2 text-muted-foreground"
                    />
                    Word (.docx)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      handleDownload("pdf");
                      setOpen(false);
                    }}
                  >
                    <FileDown
                      size={14}
                      className="mr-2 text-muted-foreground"
                    />
                    PDF
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="w-full h-8 px-2 text-sm hover:text-destructive"
                onClick={() => {
                  setOpen(false);
                  setIsAlertOpen(true);
                }}
              >
                <FaRegTrashCan
                  size={14}
                  className="mr-2 text-muted-foreground"
                />
                Delete
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <div className="px-2 py-0.5 text-[10px] leading-5 text-nowrap overflow-hidden text-muted-foreground/80">
                <p>Last updated {updatedAtText}</p>
                <p>Created {createdAtText}</p>
              </div>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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
