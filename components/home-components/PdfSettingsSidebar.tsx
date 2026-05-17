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

  return (
    <>
        <div
          className={cn(
            "flex justify-end items-center px-1",
            containerClassName,
          )}
        >
          <Tooltip open={pinTooltip.open}>
            <TooltipTrigger asChild>
              <Button
                onClick={handleFavoritePin}
                variant="SidebarMenuButton"
                className="px-2 h-7 hover:bg-card"
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
            <TooltipContent side="right" sideOffset={5}>
              {pdf?.favorite ? "Unpin upload" : "Pin upload"}
            </TooltipContent>
          </Tooltip>

          <Tooltip open={deleteTooltip.open}>
            <TooltipTrigger asChild>
              <Button
                onMouseDown={() => setIsAlertOpen(true)}
                variant="SidebarMenuButton_destructive"
                className="px-2 h-7 hover:bg-card"
                aria-label="delete-upload"
                {...deleteTooltip.triggerProps}
              >
                <X size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={5}>
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
