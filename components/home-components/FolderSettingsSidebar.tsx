"use client";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "@/cache/useQuery";
import { useMutation } from "convex/react";
import { useState } from "react";
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
import LoadingAnimation from "../ui/LoadingAnimation";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { X } from "lucide-react";
import { Settings, Users, Trash2 } from "lucide-react";
import { usePathname, useRouter, redirect } from "next/navigation";
import { useHoverTooltip } from "@/hooks/useHoverTooltip";

interface FolderSettingsSidebarProps {
  workingSpaceId: Id<"folders">;
  ContainerClassName?: string;
  workingspaceName: string | any;
}

export default function FolderSettingsSidebar({
  workingSpaceId,
  ContainerClassName,
  workingspaceName,
}: FolderSettingsSidebarProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const router = useRouter();
  const workspaceHref = `/home/${workingSpaceId}`;
  const PathName = usePathname();
  const tables = useQuery(api.tables.getTables, {
    folderId: workingSpaceId,
  });

  const DeleteWorkingSpace = useMutation(
    api.folders.deleteFolder,
  ).withOptimisticUpdate((local, args) => {
    const { _id } = args;

    // Remove from getRecentWorkingSpaces
    const workspaces = local.getQuery(api.folders.getRecentFolders);
    if (workspaces && Array.isArray(workspaces)) {
      const filteredWorkspaces = workspaces.filter((ws: any) => ws._id !== _id);
      local.setQuery(
        api.folders.getRecentFolders,
        {},
        filteredWorkspaces,
      );
    }

    // Remove single workspace query - server will handle the deletion
    const workspace = local.getQuery(api.folders.getFolderById, {
      _id,
    });
    if (workspace) return;
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
    setIsDeleting(true);
    try {
      if (PathName === workspaceHref) {
        router.push(`/home`);
        await new Promise((resolve) => setTimeout(resolve, 300));
        await DeleteWorkingSpace({ _id: workingSpaceId });
      } else {
        await DeleteWorkingSpace({ _id: workingSpaceId });
      }
    } catch (error) {
      console.error("Failed to delete workspace:", error);
    } finally {
      setIsDeleting(false);
      setIsAlertOpen(false);
    }
  };

  const tableCount = tables?.length || 0;
  const hasContent = tableCount > 0;
  const deleteTooltip = useHoverTooltip(100);

  return (
    <>
      <div
        className={cn(
          "flex justify-end items-center px-0.5",
          ContainerClassName,
        )}
      >
        <Tooltip open={deleteTooltip.open}>
          <TooltipTrigger asChild>
            <Button
              variant="SidebarMenuButton_destructive"
              className="px-1.5 h-7 hover:bg-card"
              aria-label="delete-workspace"
              {...deleteTooltip.triggerProps}
              onMouseDown={initiateDelete}
            >
              <X size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            sideOffset={5}
            className="!app-radius-none"
          >
            Delete folder
          </TooltipContent>
        </Tooltip>
      </div>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent className="bg-card border border-border text-card-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Folder Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {hasContent ? (
                <>
                  This folder contains:
                  <span className="mt-2 block space-y-1">
                    {tableCount > 0 && (
                      <span className="block">
                        <span className="font-medium text-foreground">
                          {tableCount}
                        </span>{" "}
                        table{tableCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </span>
                  <span className="mt-2 block">
                    Deleting this folder will permanently remove all tables,
                    documents, and their data.
                  </span>
                </>
              ) : (
                "Are you sure you want to delete this folder? This action cannot be undone."
              )}
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
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <LoadingAnimation className="h-3 w-3 mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
