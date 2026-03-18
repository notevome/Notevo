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
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Label } from "../ui/label";
import { useNoteWidth } from "@/hooks/useNoteWidth";
import { useNoteDownload } from "@/hooks/useNoteDownload";
import MoveNoteDialog from "./MoveNoteDialog";

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
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);

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

  // ── Download hook ────────────────────────────────────────────────
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
    if (trimmedValue && trimmedValue !== noteTitle && getNote) {
      await updateNote({ _id: noteId, title: trimmedValue });

      if (isViewingThisNote) {
        const newSlug = generateSlug(trimmedValue);
        const pathSegments = pathname.split("/");
        pathSegments[pathSegments.length - 1] = newSlug;
        const newPath = pathSegments.join("/");
        router.replace(`${newPath}?id=${noteId}`);
      }
    }
  };

  const initiateDelete = () => {
    setOpen(false);
    setIsAlertOpen(true);
  };

  const handleDelete = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!getNote) return;

    if (onDelete) onDelete(noteId);
    setIsAlertOpen(false);

    if (isViewingThisNote) {
      router.push(`/home/${getNote.workingSpaceId}`);
    }

    try {
      await deleteNote({ _id: noteId });
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

  const handleTooltipMouseEnter = () => setIsTooltipOpen(true);
  const handleTooltipMouseLeave = () => setIsTooltipOpen(false);

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <TooltipProvider>
          <Tooltip open={isTooltipOpen}>
            <DropdownMenuTrigger asChild>
              <TooltipTrigger asChild>
                <Button
                  variant="Trigger"
                  className={cn("px-0.5 h-8 mt-0.5", BtnClassName)}
                  onMouseEnter={handleTooltipMouseEnter}
                  onMouseLeave={handleTooltipMouseLeave}
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
        </TooltipProvider>

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
              className="text-foreground h-9"
              ref={inputRef}
            />
          </DropdownMenuGroup>

          <DropdownMenuGroup>
            <Button
              variant="SidebarMenuButton"
              className="w-full h-8 px-2 text-sm"
              onClick={handleFavoritePin}
            >
              <Pin size={14} className="text-primary" />
              {getNote?.favorite ? "Unpin Note" : "Pin Note"}
            </Button>

            <Button
              variant="SidebarMenuButton"
              className="w-full h-8 px-2 text-sm"
              onClick={handleMoveDialogOpen}
            >
              <FileOutput size={14} className="text-primary" />
              Move Note
            </Button>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="w-full h-8 px-2 text-sm flex items-center gap-2 text-foreground hover:bg-primary/10">
                <Download size={14} className="text-primary" />
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
                >
                  {noteWidth === "false" ? (
                    <>
                      <ChevronsLeftRightEllipsis
                        size={14}
                        className="text-primary"
                      />
                      Full width
                    </>
                  ) : (
                    <>
                      <ChevronsRightLeft size={14} className="text-primary" />
                      Max width
                    </>
                  )}
                </Button>
              </>
            )}

            <DropdownMenuSeparator />
            <Button
              variant="SidebarMenuButton_destructive"
              className="w-full h-8 px-2 text-sm"
              onClick={initiateDelete}
            >
              <FaRegTrashCan size={14} className="text-primary" />
              Delete
            </Button>
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
