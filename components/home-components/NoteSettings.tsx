"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { FaEllipsisVertical, FaEllipsis, FaRegTrashCan } from "react-icons/fa6";
import {
  Pin,
  ChevronsLeftRightEllipsis,
  ChevronsRightLeft,
  Download,
  FileText,
  FileJson,
  FileType,
  FileDown,
  FileOutput,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useMutation } from "convex/react";
import { useQuery } from "@/cache/useQuery";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
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
import { generateSlug } from "@/lib/generateSlug";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Label } from "../ui/label";
import { useNoteWidth } from "@/hooks/useNoteWidth";
import { useNoteDownload } from "@/hooks/useNoteDownload";
import { useHoverTooltip } from "@/hooks/useHoverTooltip";
import MoveNoteDialog from "./MoveNoteDialog";
import { formatNoteTimestamp } from "@/lib/utils";

interface NoteSettingsProps {
  noteId: Id<"notes">;
  noteTitle: string | any;
  IconVariant: "vertical_icon" | "horizontal_icon";
  BtnClassName?: string;
  ShowWidthOp: boolean;
  DropdownMenuContentAlign: "end" | "start";
  TooltipContentAlign: "end" | "start";
  onDelete?: (noteId: Id<"notes">) => void;
}

const NOTE_TITLE_MAX_LENGTH = 55;

export default function NoteSettings({
  noteId,
  noteTitle,
  IconVariant,
  BtnClassName,
  DropdownMenuContentAlign,
  TooltipContentAlign,
  ShowWidthOp,
  onDelete,
}: NoteSettingsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [inputValue, setInputValue] = useState(noteTitle);
  const [open, setOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const tooltip = useHoverTooltip(150);

  const { noteWidth, toggleWidth } = useNoteWidth();

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
  const inputRef = useRef<HTMLInputElement>(null);

  const currentNoteId = searchParams.get("id");
  const isViewingThisNote = currentNoteId === noteId;

  // Download hook
  const { handleDownload } = useNoteDownload({
    noteBody: getNote?.body,
    noteTitle,
  });

  useEffect(() => {
    setInputValue(noteTitle);
  }, [noteTitle]);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 10);
    }
  }, [open]);

  if (!getNote) return null;

  const createdAtText = formatNoteTimestamp(getNote.createdAt);
  const updatedAtText = formatNoteTimestamp(getNote.updatedAt);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleBlur();
      setOpen(false);
    }
  };

  const handleBlur = async () => {
    const trimmedValue = inputValue.trim();
    const isValid =
      trimmedValue.length > 0 && trimmedValue.length <= NOTE_TITLE_MAX_LENGTH;

    if (!isValid) {
      setInputValue(noteTitle);
      return;
    }

    if (trimmedValue !== noteTitle && getNote) {
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

  const initiateDelete = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (e.button === 0 && e.shiftKey) {
      e.preventDefault();
      handleDelete(e as React.MouseEvent<HTMLButtonElement>);
    } else {
      setOpen(false);
      setIsAlertOpen(true);
    }
  };

  const handleDelete = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!getNote) return;
    if (onDelete) onDelete(noteId);
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

  const handleFavoritePin = async () => {
    if (!getNote) return;
    await updateNote({
      _id: noteId,
      favorite: !getNote.favorite,
    });
  };

  const handleMoveDialogOpen = () => {
    setOpen(false);
    setIsMoveDialogOpen(true);
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
                className={cn("px-0.5 h-8 mt-0.5", BtnClassName)}
                {...tooltip.triggerProps}
                aria-label="note-options"
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
          <TooltipContent
            side="bottom"
            alignOffset={1}
            align={TooltipContentAlign}
          >
            Rename, Pin, Move, Download, Delete{ShowWidthOp && "..."}
          </TooltipContent>
        </Tooltip>

        <DropdownMenuContent
          side="bottom"
          align={DropdownMenuContentAlign}
          alignOffset={1}
          className="w-48 pb-1.5 px-1.5 pt-0 space-y-4 text-muted-foreground z-[10000]"
        >
          <DropdownMenuGroup className="relative">
            <Label>Rename :</Label>
            <Input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              placeholder="Rename your note"
              className="text-foreground h-8"
              ref={inputRef}
            />
          </DropdownMenuGroup>

          <DropdownMenuGroup>
            <Button
              variant="SidebarMenuButton"
              className="w-full h-8 px-2 text-sm"
              onClick={handleFavoritePin}
              aria-label="pin-note"
            >
              <Pin size={14} className="text-muted-foreground" />
              {getNote?.favorite ? "Unpin Note" : "Pin Note"}
            </Button>

            <Button
              variant="SidebarMenuButton"
              className="w-full h-8 px-2 text-sm"
              onClick={handleMoveDialogOpen}
              aria-label="move-note"
            >
              <FileOutput size={14} className="text-muted-foreground" />
              Move Note
            </Button>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="w-full h-8 px-2 text-sm flex items-center gap-2 text-foreground">
                <Download size={14} className="text-muted-foreground" />
                Download
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-48">
                <DropdownMenuItem
                  className="text-sm cursor-pointer flex items-center gap-2"
                  onClick={() => handleDownload("markdown")}
                >
                  <FileText size={16} className="text-muted-foreground" />
                  Markdown (.md)
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-sm cursor-pointer flex items-center gap-2"
                  onClick={() => handleDownload("json")}
                >
                  <FileJson size={16} className="text-muted-foreground" />
                  JSON
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-sm cursor-pointer flex items-center gap-2"
                  onClick={() => handleDownload("docx")}
                >
                  <FileType size={16} className="text-muted-foreground" />
                  Word (.docx)
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-sm cursor-pointer flex items-center gap-2"
                  onClick={() => handleDownload("pdf")}
                >
                  <FileDown size={16} className="text-muted-foreground" />
                  PDF
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            {ShowWidthOp && (
              <>
                <Button
                  variant="SidebarMenuButton"
                  className="w-full h-8 px-2 text-sm"
                  onClick={toggleWidth}
                  aria-label="toggle-note-width"
                >
                  {noteWidth === "false" ? (
                    <>
                      <ChevronsLeftRightEllipsis
                        size={14}
                        className="text-muted-foreground"
                      />
                      Full width
                    </>
                  ) : (
                    <>
                      <ChevronsRightLeft
                        size={14}
                        className="text-muted-foreground"
                      />
                      Max width
                    </>
                  )}
                </Button>
              </>
            )}

            <DropdownMenuSeparator />
            <Button
              variant="SidebarMenuButton_destructive"
              className="w-full h-8 px-2 text-sm text-foreground"
              onClick={initiateDelete}
              aria-label="delete-note"
            >
              <FaRegTrashCan size={14} className="text-muted-foreground" />
              Delete
            </Button>

            <DropdownMenuSeparator />
            <div className="px-2 pt-0.5 text-[10px] leading-4 text-nowrap text-muted-foreground/80">
              <p>Last updated {updatedAtText}</p>
              <p>Created {createdAtText}</p>
            </div>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent className="bg-card border border-border text-card-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Note Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete this note? This action cannot be
              undone.
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
