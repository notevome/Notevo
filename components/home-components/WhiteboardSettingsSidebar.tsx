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
interface WhiteboardSettingsSidebarProps {
  whiteboardId: Id<"whiteboards"> | any;
  whiteboardTitle: string | any;
  ContainerClassName?: string | any;
}

export default function WhiteboardSettingsSidebar({
  whiteboardId,
  whiteboardTitle,
  ContainerClassName,
}: WhiteboardSettingsSidebarProps) {
  const pathname = usePathname();
  const pathSegments = pathname.split("/").filter((segment) => segment);
  const searchParams = useSearchParams();
  const realPathName = `/home/${pathSegments[1]}/${pathSegments[2]}?whiteboardId=${searchParams.get("whiteboardId")}`;
  const whiteboardHref = `/home/${pathSegments[1]}/${pathSegments[2]}?whiteboardId=${whiteboardId}`;
  const router = useRouter();
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const updateWhiteboard = useMutation(
    api.whiteboards.updateWhiteboard,
  ).withOptimisticUpdate((local, args) => {
    const { _id, favorite } = args;
    // Update single whiteboard query
    const whiteboard = local.getQuery(api.whiteboards.getWhiteboardById, {
      _id,
    });
    if (whiteboard && favorite !== undefined) {
      local.setQuery(
        api.whiteboards.getWhiteboardById,
        { _id },
        {
          ...whiteboard,
          favorite: favorite,
          updatedAt: Date.now(),
        },
      );
    }
  });
  const deleteWhiteboard = useMutation(
    api.whiteboards.deleteWhiteboard,
  ).withOptimisticUpdate((local, args) => {
    const { _id } = args;

    // Get the whiteboard - for optimistic IDs, this will help identify it
    const whiteboard = local.getQuery(api.whiteboards.getWhiteboardById, {
      _id,
    });
    if (!whiteboard) return;
  });
  const getWhiteboard = useQuery(api.whiteboards.getWhiteboardById, {
    _id: whiteboardId,
  });

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
      if (realPathName === whiteboardHref) {
        router.push(`/home/${pathSegments[1]}`);
        await new Promise((resolve) => setTimeout(resolve, 300));
        await deleteWhiteboard({ _id: whiteboardId });
      } else {
        await deleteWhiteboard({ _id: whiteboardId });
      }
    } catch (error) {
      console.error("Failed to delete whiteboard:", error);
    } finally {
      setIsAlertOpen(false);
    }
  };

  const handleFavoritePin = async () => {
    await updateWhiteboard({
      _id: whiteboardId,
      favorite: !getWhiteboard?.favorite,
    });
  };

  const pinTooltip = useHoverTooltip(100);
  const deleteTooltip = useHoverTooltip(100);

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
              className="px-1.5 h-7 hover:bg-card !app-radius-none"
              aria-label="pin-whiteboard"
              {...pinTooltip.triggerProps}
            >
              {getWhiteboard?.favorite ? (
                <PinOff size={16} className="text-muted-foreground" />
              ) : (
                <Pin size={16} className="text-muted-foreground" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            sideOffset={5}
            className="!app-radius-none"
          >
            {getWhiteboard?.favorite ? "Unpin whiteboard" : "Pin whiteboard"}
          </TooltipContent>
        </Tooltip>

        <Tooltip open={deleteTooltip.open}>
          <TooltipTrigger asChild>
            <Button
              variant="SidebarMenuButton_destructive"
              className="px-1.5 h-7 hover:bg-card !app-radius-none"
              aria-label="delete-whiteboard"
              {...deleteTooltip.triggerProps}
              onMouseDown={initiateDelete}
            >
              <X size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            sideOffset={5}
            className=" !app-radius-none"
          >
            Delete whiteboard
          </TooltipContent>
        </Tooltip>
      </div>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent className="bg-card border border-border text-card-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Whiteboard Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {`Are you sure you want to delete this whiteboard? This action
              cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <p>
            if you don't wanna see again hold
            <span className=" mx-1 text-xs pointer-events-none border border-border inline-flex h-5 select-none items-center gap-1 app-radius-md bg-card px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
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
