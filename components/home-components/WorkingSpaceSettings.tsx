"use client";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useMutation } from "convex/react";
import { useQuery } from "@/cache/useQuery";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { FaEllipsis, FaRegTrashCan } from "react-icons/fa6";
import { cn } from "@/lib/utils";
import LoadingAnimation from "../ui/LoadingAnimation";
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
import { Label } from "../ui/label";
import { useHoverTooltip } from "@/hooks/useHoverTooltip";
interface WorkingSpaceSettings {
  workingSpaceId: Id<"workingSpaces">;
  className?: string;
  workingspaceName: string | any;
}

const WORKSPACE_NAME_MAX_LENGTH = 30;

const formatTimestamp = (timestamp?: number) => {
  if (!timestamp) return "";

  return new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function WorkingSpaceSettings({
  className,
  workingSpaceId,
  workingspaceName,
}: WorkingSpaceSettings) {
  const [inputValue, setInputValue] = useState(workingspaceName);
  const [isDeleting, setIsDeleting] = useState(false);
  const [open, setOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const tooltip = useHoverTooltip();
  const inputRef = useRef<HTMLInputElement>(null); // Ref for the input

  useEffect(() => {
    setInputValue(workingspaceName);
  }, [workingspaceName]);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 10);
    }
  }, [open]);

  const tables = useQuery(api.notesTables.getTables, {
    workingSpaceId,
  });
  const workspace = useQuery(api.workingSpaces.getWorkingSpaceById, {
    _id: workingSpaceId,
  });

  const updateWorkingSpace = useMutation(
    api.workingSpaces.updateWorkingSpace,
  ).withOptimisticUpdate((local, args) => {
    const { _id, name } = args;

    // Update in getRecentWorkingSpaces
    const workspaces = local.getQuery(api.workingSpaces.getRecentWorkingSpaces);
    if (workspaces && Array.isArray(workspaces)) {
      const updatedWorkspaces = workspaces.map((ws: any) =>
        ws._id === _id
          ? {
              ...ws,
              name: name ?? ws.name,
              updatedAt: Date.now(),
            }
          : ws,
      );
      local.setQuery(
        api.workingSpaces.getRecentWorkingSpaces,
        {},
        updatedWorkspaces,
      );
    }

    // Update single workspace query
    const workspace = local.getQuery(api.workingSpaces.getWorkingSpaceById, {
      _id,
    });
    if (workspace) {
      local.setQuery(
        api.workingSpaces.getWorkingSpaceById,
        { _id },
        {
          ...workspace,
          name: name ?? workspace.name,
          updatedAt: Date.now(),
        },
      );
    }
  });
  const DeleteWorkingSpace = useMutation(
    api.workingSpaces.deleteWorkingSpace,
  ).withOptimisticUpdate((local, args) => {
    const { _id } = args;

    // Remove from getRecentWorkingSpaces
    const workspaces = local.getQuery(api.workingSpaces.getRecentWorkingSpaces);
    if (workspaces && Array.isArray(workspaces)) {
      const filteredWorkspaces = workspaces.filter((ws: any) => ws._id !== _id);
      local.setQuery(
        api.workingSpaces.getRecentWorkingSpaces,
        {},
        filteredWorkspaces,
      );
    }

    // Remove single workspace query - server will handle the deletion
    const workspace = local.getQuery(api.workingSpaces.getWorkingSpaceById, {
      _id,
    });
    if (workspace) {
      // Can't set to null, but server will handle the deletion
      // The query will update when server confirms deletion
    }
  });

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleBlur();
    }
  };

  const handleBlur = async () => {
    const trimmedValue = inputValue.trim();
    const isValid =
      trimmedValue.length > 0 &&
      trimmedValue.length <= WORKSPACE_NAME_MAX_LENGTH;

    if (!isValid) {
      setInputValue(workingspaceName);
      setOpen(false);
      return;
    }

    if (trimmedValue !== workingspaceName) {
      try {
        updateWorkingSpace({ _id: workingSpaceId, name: trimmedValue });
      } catch (error) {
        console.error("Failed to update workspace name:", error);
        setInputValue(workingspaceName);
      }
    }
    setInputValue(trimmedValue);
    setOpen(false);
  };

  const initiateDelete = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (event.button === 0 && event.shiftKey) {
      event.preventDefault();
      void handleDelete(event);
    } else {
      setOpen(false);
      setIsAlertOpen(true);
    }
  };

  const handleDelete = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsDeleting(true);
    try {
      await DeleteWorkingSpace({ _id: workingSpaceId });
    } catch (error) {
      console.error("Failed to delete workspace:", error);
    } finally {
      setIsDeleting(false);
      setIsAlertOpen(false);
    }
  };

  const tableCount = tables?.length || 0;
  const hasContent = tableCount > 0;
  const createdAtText = formatTimestamp(workspace?.createdAt);
  const updatedAtText = formatTimestamp(workspace?.updatedAt);
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
                className={cn("px-1.5 h-8", className)}
                {...tooltip.triggerProps}
                aria-label="workspace-options"
              >
                <FaEllipsis size={22} />
              </Button>
            </TooltipTrigger>
          </DropdownMenuTrigger>
          <TooltipContent side="bottom" alignOffset={1} align="start">
            Rename, Delete
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent
          side="bottom"
          align="start"
          className="w-48 pb-1.5 px-1.5 pt-0 space-y-4 text-muted-foreground "
        >
          <DropdownMenuGroup className="relative">
            <Label>Rename :</Label>
            <Input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              placeholder="Rename your space"
              className="text-foreground h-9"
              ref={inputRef}
            />
          </DropdownMenuGroup>{" "}
          <DropdownMenuGroup>
            <Button
              variant="SidebarMenuButton_destructive"
              className="w-full h-8 px-2 text-sm"
              onClick={initiateDelete}
              disabled={isDeleting}
              aria-label="delete-workspace"
            >
              {isDeleting ? (
                <>
                  <LoadingAnimation className="text-destructive/10 animate-spin fill-destructive h-3 w-3" />{" "}
                  Deleting...
                </>
              ) : (
                <>
                  <FaRegTrashCan size={14} className=" text-current" /> Delete
                </>
              )}
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
            <AlertDialogTitle>Confirm Workspace Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {hasContent ? (
                <>
                  This workspace contains:
                  <div className="mt-2 space-y-1">
                    {tableCount > 0 && (
                      <span>
                        <span className="font-medium text-foreground">
                          {tableCount}
                        </span>{" "}
                        table{tableCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div className="mt-2">
                    Deleting this workspace will permanently remove all tables,
                    notes, and their data.
                  </div>
                </>
              ) : (
                "Are you sure you want to delete this workspace? This action cannot be undone."
              )}
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
              disabled={isDeleting}
              aria-label="confirm-workspace-deletion"
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
