"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import {
  Download,
  ExternalLink,
  FileDown,
  FileOutput,
  Pin,
} from "lucide-react";
import { FaEllipsis, FaEllipsisVertical, FaRegTrashCan } from "react-icons/fa6";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { useQuery } from "@/cache/useQuery";
import { cn } from "@/lib/utils";
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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import MovePdfDialog from "./MovePdfDialog";
import { useHoverTooltip } from "@/hooks/useHoverTooltip";

interface PdfSettingsProps {
  pdfId: Id<"pdfs">;
  pdfTitle?: string;
  iconVariant: "vertical_icon" | "horizontal_icon";
  btnClassName?: string;
  btnVariant?:
    | "outline"
    | "SidebarMenuButton"
    | "SidebarMenuButton_destructive"
    | "Trigger";
  dropdownMenuContentAlign: "end" | "start";
  tooltipContentAlign: "end" | "start";
  onDelete?: (pdfId: Id<"pdfs">) => void;
}

const PDF_TITLE_MAX_LENGTH = 55;

const formatPdfTimestamp = (timestamp?: number) => {
  if (!timestamp) return "";

  return new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function PdfSettings({
  pdfId,
  pdfTitle,
  iconVariant,
  btnClassName,
  btnVariant,
  dropdownMenuContentAlign,
  tooltipContentAlign,
  onDelete,
}: PdfSettingsProps) {
  const [inputValue, setInputValue] = useState(pdfTitle || "Untitled");
  const [open, setOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const tooltip = useHoverTooltip(150);
  const inputRef = useRef<HTMLInputElement>(null);

  const pdf = useQuery(api.pdfs.getPdfById, { _id: pdfId });
  const updatePdf = useMutation(api.pdfs.updatePdf);
  const deletePdf = useMutation(api.pdfs.deletePdf);

  useEffect(() => {
    setInputValue(pdfTitle || "Untitled");
  }, [pdfTitle]);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 10);
    }
  }, [open]);

  const handleBlur = useCallback(async () => {
    const trimmedValue = inputValue.trim();
    const isValid =
      trimmedValue.length > 0 && trimmedValue.length <= PDF_TITLE_MAX_LENGTH;

    if (!isValid) {
      setInputValue(pdfTitle || "Untitled");
      return;
    }

    if (trimmedValue !== (pdfTitle || "Untitled")) {
      try {
        await updatePdf({ _id: pdfId, title: trimmedValue });
      } catch (error) {
        console.error("Error updating PDF title:", error);
        setInputValue(pdfTitle || "Untitled");
      }
    }

    setInputValue(trimmedValue);
  }, [inputValue, pdfId, pdfTitle, updatePdf]);

  const handleDelete = useCallback(async () => {
    if (onDelete) onDelete(pdfId);
    setIsAlertOpen(false);
    try {
      await deletePdf({ _id: pdfId });
    } catch (error) {
      console.error("Failed to delete PDF:", error);
    }
  }, [deletePdf, onDelete, pdfId]);

  const initiateDelete = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (event.button === 0 && event.shiftKey) {
        event.preventDefault();
        void handleDelete();
      } else {
        setOpen(false);
        setIsAlertOpen(true);
      }
    },
    [handleDelete],
  );

  const handleFavoritePin = useCallback(async () => {
    if (!pdf) return;
    await updatePdf({
      _id: pdfId,
      favorite: !pdf.favorite,
    });
  }, [pdf, pdfId, updatePdf]);

  const handleDownloadOriginal = useCallback(() => {
    if (!pdf?.fileUrl) return;

    const link = document.createElement("a");
    link.href = pdf.fileUrl;
    link.download = `${pdf.title || "upload"}.pdf`;
    link.target = "_blank";
    link.rel = "noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [pdf]);

  if (!pdf) return null;

  const createdAtText = formatPdfTimestamp(pdf.createdAt);
  const updatedAtText = formatPdfTimestamp(pdf.updatedAt);

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
                variant={btnVariant || "Trigger"}
                className={cn("px-0.5 h-8 mt-0.5", btnClassName)}
                size="icon"
                {...tooltip.triggerProps}
                aria-label="upload-options"
              >
                {iconVariant === "vertical_icon" ? (
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
            align={tooltipContentAlign}
            className=" text-xs px-1.5 py-1"
          >
            Rename, Pin, Move, Download, Delete
          </TooltipContent>
        </Tooltip>

        <DropdownMenuContent
          side="bottom"
          align={dropdownMenuContentAlign}
          alignOffset={1}
          className="w-48 pb-1.5 px-1.5 pt-0 space-y-4 text-muted-foreground z-[10000]"
        >
          <DropdownMenuGroup className="relative">
            <Label>Rename :</Label>
            <Input
              type="text"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onBlur={() => void handleBlur()}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleBlur();
                  setOpen(false);
                }
              }}
              placeholder="Rename your upload"
              className="text-foreground h-8"
              ref={inputRef}
            />
          </DropdownMenuGroup>

          <DropdownMenuGroup>
            <Button
              variant="SidebarMenuButton"
              className="w-full h-8 px-2 text-sm"
              onClick={() => void handleFavoritePin()}
              aria-label="pin-upload"
            >
              <Pin size={14} className="text-muted-foreground" />
              {pdf.favorite ? "Unpin Upload" : "Pin Upload"}
            </Button>

            <Button
              variant="SidebarMenuButton"
              className="w-full h-8 px-2 text-sm"
              onClick={() => {
                setOpen(false);
                setIsMoveDialogOpen(true);
              }}
              aria-label="move-upload"
            >
              <FileOutput size={14} className="text-muted-foreground" />
              Move Upload
            </Button>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="w-full h-8 px-2 text-sm flex items-center gap-2 text-foreground">
                <Download size={14} className="text-muted-foreground" />
                Download
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-48">
                <DropdownMenuItem
                  className="text-sm cursor-pointer flex items-center gap-2"
                  onClick={handleDownloadOriginal}
                >
                  <FileDown size={16} className="text-muted-foreground" />
                  PDF file
                </DropdownMenuItem>
                {pdf.fileUrl ? (
                  <DropdownMenuItem asChild>
                    <a
                      href={pdf.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm cursor-pointer flex items-center gap-2"
                    >
                      <ExternalLink
                        size={16}
                        className="text-muted-foreground"
                      />
                      Open original
                    </a>
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator />
            <Button
              variant="SidebarMenuButton_destructive"
              className="w-full h-8 px-2 text-sm text-foreground"
              onClick={initiateDelete}
              aria-label="delete-upload"
            >
              <FaRegTrashCan size={14} className="text-muted-foreground" />
              Delete
            </Button>

            <DropdownMenuSeparator />
            <div className="px-2 pt-1 text-[10px] leading-4 text-nowrap text-muted-foreground/80">
              <p>Last updated {updatedAtText}</p>
              <p>Created {createdAtText}</p>
            </div>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent className="bg-card border border-border text-card-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Upload Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete this upload? This action cannot be
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
              onClick={() => void handleDelete()}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground border-none"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MovePdfDialog
        open={isMoveDialogOpen}
        onOpenChange={setIsMoveDialogOpen}
        pdf={{
          _id: pdfId,
          title: pdf.title,
          workingSpaceId: pdf.workingSpaceId,
          notesTableId: pdf.notesTableId,
        }}
      />
    </>
  );
}
