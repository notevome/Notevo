"use client";

import { useCallback, useState } from "react";
import { useMutation } from "convex/react";
import { Check, Copy, ExternalLink, FileOutput, Pin } from "lucide-react";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useHoverTooltip } from "@/hooks/useHoverTooltip";
import MoveLinkDialog from "./MoveLinksDialog";

interface LinkSettingsProps {
  linkId: Id<"links">;
  linkUrl: string;
  linkTitle?: string;
  favorite?: boolean;
  createdAt?: number;
  updatedAt?: number;
  iconVariant: "vertical_icon" | "horizontal_icon";
  btnClassName?: string;
  btnVariant?:
    | "outline"
    | "SidebarMenuButton"
    | "SidebarMenuButton_destructive"
    | "Trigger"
    | "ghost";
  dropdownMenuContentAlign: "end" | "start";
  tooltipContentAlign: "end" | "start";
  onDelete?: (linkId: Id<"links">) => void;
}

const formatLinkTimestamp = (timestamp?: number) => {
  if (!timestamp) return "";

  return new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function LinkSettings({
  linkId,
  linkUrl,
  linkTitle,
  favorite,
  createdAt,
  updatedAt,
  iconVariant,
  btnClassName,
  btnVariant,
  dropdownMenuContentAlign,
  tooltipContentAlign,
  onDelete,
}: LinkSettingsProps) {
  const [open, setOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const tooltip = useHoverTooltip(100);

  const updateLink = useMutation(api.links.updateLink);
  const deleteLink = useMutation(api.links.deleteLink);

  const link = useQuery(api.links.getLinkById, { _id: linkId });

  const handleFavoritePin = useCallback(async () => {
    await updateLink({
      _id: linkId,
      favorite: !favorite,
    });
  }, [favorite, linkId, updateLink]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(linkUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error("Failed to copy link:", error);
    }
  }, [linkUrl]);

  const handleDelete = useCallback(async () => {
    if (onDelete) onDelete(linkId);
    setIsAlertOpen(false);
    try {
      await deleteLink({ _id: linkId });
    } catch (error) {
      console.error("Failed to delete link:", error);
    }
  }, [deleteLink, linkId, onDelete]);

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

  const createdAtText = formatLinkTimestamp(createdAt);
  const updatedAtText = formatLinkTimestamp(updatedAt);

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
                aria-label="link-options"
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
            className="text-xs px-1.5 py-1"
          >
            Pin, Open, Copy, Move, Delete
          </TooltipContent>
        </Tooltip>

        <DropdownMenuContent
          side="bottom"
          align={dropdownMenuContentAlign}
          alignOffset={1}
          className="w-48 pb-1.5 px-1.5 pt-1.5 space-y-1 text-muted-foreground z-[10000]"
        >
          <DropdownMenuGroup>
            <Button
              variant="SidebarMenuButton"
              className="w-full h-8 px-2 text-sm"
              onClick={() => void handleFavoritePin()}
              aria-label="pin-link"
            >
              <Pin size={14} className="text-muted-foreground" />
              {favorite ? "Unpin Link" : "Pin Link"}
            </Button>

            <Button
              variant="SidebarMenuButton"
              className="w-full h-8 px-2 text-sm"
              asChild
              aria-label="open-link"
            >
              <a href={linkUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={14} className="text-muted-foreground" />
                Open Link
              </a>
            </Button>

            <Button
              variant="SidebarMenuButton"
              className="w-full h-8 px-2 text-sm"
              onClick={() => void handleCopyLink()}
              aria-label="copy-link"
            >
              {copied ? (
                <Check size={14} className="text-muted-foreground" />
              ) : (
                <Copy size={14} className="text-muted-foreground" />
              )}
              {copied ? "Copied!" : "Copy Link"}
            </Button>

            <Button
              variant="SidebarMenuButton"
              className="w-full h-8 px-2 text-sm"
              onClick={() => {
                setOpen(false);
                setIsMoveDialogOpen(true);
              }}
              aria-label="move-link"
            >
              <FileOutput size={14} className="text-muted-foreground" />
              Move Link
            </Button>

            <DropdownMenuSeparator />
            <Button
              variant="SidebarMenuButton_destructive"
              className="w-full h-8 px-2 text-sm text-foreground"
              onClick={initiateDelete}
              aria-label="delete-link"
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
            <AlertDialogTitle>Confirm Link Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete {linkTitle || "this link"}? This
              action cannot be undone.
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

      <MoveLinkDialog
        open={isMoveDialogOpen}
        onOpenChange={setIsMoveDialogOpen}
        link={{
          _id: linkId,
          title: linkTitle,
          workingSpaceId: link?.workingSpaceId,
          notesTableId: link?.notesTableId,
        }}
      />
    </>
  );
}
