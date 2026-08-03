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
import { FaEllipsisVertical, FaRegTrashCan } from "react-icons/fa6";
import { Input } from "@/components/ui/input";
import { useMutation } from "convex/react";
import { useQuery } from "@/cache/useQuery";
import { api } from "@/convex/_generated/api";
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
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Label } from "../ui/label";
import { useHoverTooltip } from "@/hooks/useHoverTooltip";
interface TableSettingsProps {
  notesTableId: Id<"notesTables"> | any; // Strongly typed Id
  tableName: string | any;
}

const TABLE_NAME_MAX_LENGTH = 30;

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

export default function TableSettings({
  notesTableId,
  tableName,
}: TableSettingsProps) {
  const [inputValue, setInputValue] = useState(tableName);
  const [open, setOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false); // Alert Dialog State
  const inputRef = useRef<HTMLInputElement>(null);
  const table = useQuery(api.notesTables.getTableById, { _id: notesTableId });
  const updateTable = useMutation(
    api.notesTables.updateTable,
  ).withOptimisticUpdate((local, args) => {
    const { _id, name } = args;

    // Try to find the table in cached queries to get workingSpaceId
    // This is a best-effort optimization - server will sync correctly regardless
    // We search through common workspace queries
    const workspaces = local.getQuery(api.workingSpaces.getRecentWorkingSpaces);
    if (workspaces && Array.isArray(workspaces)) {
      for (const ws of workspaces) {
        const tables = local.getQuery(api.notesTables.getTables, {
          workingSpaceId: ws._id,
        });
        if (tables && Array.isArray(tables)) {
          const tableIndex = tables.findIndex((t: any) => t._id === _id);
          if (tableIndex !== -1) {
            const updatedTables = tables.map((t: any) =>
              t._id === _id
                ? {
                    ...t,
                    name: name ?? t.name,
                    updatedAt: Date.now(),
                  }
                : t,
            );
            local.setQuery(
              api.notesTables.getTables,
              { workingSpaceId: ws._id },
              updatedTables,
            );
            break;
          }
        }
      }
    }
  });
  const deleteTable = useMutation(
    api.notesTables.deleteTable,
  ).withOptimisticUpdate((local, args) => {
    const { _id } = args;

    // Try to find and remove the table from cached queries
    const workspaces = local.getQuery(api.workingSpaces.getRecentWorkingSpaces);
    if (workspaces && Array.isArray(workspaces)) {
      for (const ws of workspaces) {
        const tables = local.getQuery(api.notesTables.getTables, {
          workingSpaceId: ws._id,
        });
        if (tables && Array.isArray(tables)) {
          if (tables.some((t: any) => t._id === _id)) {
            const filteredTables = tables.filter((t: any) => t._id !== _id);
            local.setQuery(
              api.notesTables.getTables,
              { workingSpaceId: ws._id },
              filteredTables,
            );
            break;
          }
        }
      }
    }
  });

  useEffect(() => {
    setInputValue(tableName);
  }, [tableName]);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 10);
    }
  }, [open]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleBlur();
    }
  };

  const handleBlur = () => {
    const trimmedValue = inputValue.trim();
    const isValid =
      trimmedValue.length > 0 && trimmedValue.length <= TABLE_NAME_MAX_LENGTH;

    if (!isValid) {
      setInputValue(tableName);
      setOpen(false);
      return;
    }

    if (trimmedValue !== tableName) {
      updateTable({ _id: notesTableId, name: trimmedValue });
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
    try {
      await deleteTable({ _id: notesTableId });
    } finally {
      setIsAlertOpen(false); // Close Alert after deletion
    }
  };
  const tooltip = useHoverTooltip(300);
  const createdAtText = formatTimestamp(table?.createdAt);
  const updatedAtText = formatTimestamp(table?.updatedAt);
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
                className="pl-0.5 pr-0 h-9 mb-0.5 opacity-80"
                {...tooltip.triggerProps}
                aria-label="table-options"
              >
                <FaEllipsisVertical size={18} />
              </Button>
            </TooltipTrigger>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="bottom"
            align="end"
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
                className="text-foreground h-8/80"
                ref={inputRef}
              />
            </DropdownMenuGroup>
            <DropdownMenuGroup>
              <Button
                variant="SidebarMenuButton_destructive"
                className="w-full h-8 px-2 text-sm"
                onClick={initiateDelete}
                aria-label="delete-table"
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
          <TooltipContent side="bottom" alignOffset={1} align="end">
            Rename , Delete
          </TooltipContent>
        </Tooltip>
      </DropdownMenu>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent className="bg-card border border-border text-card-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Table Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              "Are you sure you want to delete this table? This action cannot be
              undone."
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
