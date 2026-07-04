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
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useQuery } from "@/cache/useQuery";
import { Button } from "@/components/ui/button";
import { Pin, PinOff, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHoverTooltip } from "@/hooks/useHoverTooltip";

interface PdfSettingsSidebarProps {
  pdfId: Id<"pdfs">;
  containerClassName?: string;
}

export default function PdfSettingsSidebar({
  pdfId,
  containerClassName,
}: PdfSettingsSidebarProps) {
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const updatePdf = useMutation(api.pdfs.updatePdf);
  const deletePdf = useMutation(api.pdfs.deletePdf);
  const pdf = useQuery(api.pdfs.getPdfById, { _id: pdfId });

  const handleFavoritePin = async () => {
    if (!pdf) return;
    await updatePdf({
      _id: pdfId,
      favorite: !pdf.favorite,
    });
  };

  const pinTooltip = useHoverTooltip(200);
  const deleteTooltip = useHoverTooltip(200);

  const handleDelete = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    try {
      await deletePdf({ _id: pdfId });
    } catch (error) {
      console.error("Failed to delete PDF:", error);
    } finally {
      setIsAlertOpen(false);
    }
  };

  const initiateDelete = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (event.button === 0 && event.shiftKey) {
      event.preventDefault();
      void handleDelete(event);
    } else {
      setIsAlertOpen(true);
    }
  };

  return (
    <>
      <div
        className={cn(
          "flex justify-end items-center px-0.5",
          containerClassName,
        )}
      >
        <Tooltip open={pinTooltip.open}>
          <TooltipTrigger asChild>
            <Button
              onClick={handleFavoritePin}
              variant="SidebarMenuButton"
              className="px-1.5 h-7 hover:bg-card"
              aria-label="pin-upload"
              {...pinTooltip.triggerProps}
            >
              {pdf?.favorite ? (
                <PinOff size={16} className="text-muted-foreground" />
              ) : (
                <Pin size={16} className="text-muted-foreground" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            sideOffset={5}
            className=" !rounded-none"
          >
            {pdf?.favorite ? "Unpin upload" : "Pin upload"}
          </TooltipContent>
        </Tooltip>

        <Tooltip open={deleteTooltip.open}>
          <TooltipTrigger asChild>
            <Button
              variant="SidebarMenuButton_destructive"
              className="px-1.5 h-7 hover:bg-card !rounded-none"
              aria-label="delete-upload"
              {...deleteTooltip.triggerProps}
              onMouseDown={initiateDelete}
            >
              <X size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={5} className="!rounded-none">
            Delete upload
          </TooltipContent>
        </Tooltip>
      </div>

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
