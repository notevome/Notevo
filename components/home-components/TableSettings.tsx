"use client";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "../ui/label";
interface TableSettingsProps {
  notesTableId: Id<"notesTables"> | any; // Strongly typed Id
  tableName: string | any;
}

export default function TableSettings({
  notesTableId,
  tableName,
}: TableSettingsProps) {
  const [inputValue, setInputValue] = useState(tableName);
  const [open, setOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false); // Alert Dialog State
  const inputRef = useRef<HTMLInputElement>(null);
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
    updateTable({ _id: notesTableId, name: inputValue });
    setOpen(false);
  };

  const initiateDelete = () => {
    setOpen(false); // Close the dropdown
    setIsAlertOpen(true); // Open the alert dialog
  };

  const handleDelete = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    try {
      await deleteTable({ _id: notesTableId });
    } finally {
      setIsAlertOpen(false); // Close Alert after deletion
    }
  };
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);

  const handleTooltipMouseEnter = () => {
    setIsTooltipOpen(true);
  };

  const handleTooltipMouseLeave = () => {
    setIsTooltipOpen(false);
  };
  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <TooltipProvider>
          <Tooltip open={isTooltipOpen}>
            <DropdownMenuTrigger asChild>
              <TooltipTrigger asChild>
                <Button
                  variant="Trigger"
                  className="pl-0.5 pr-0 h-9 mb-0.5 opacity-80"
                  onMouseEnter={handleTooltipMouseEnter}
                  onMouseLeave={handleTooltipMouseLeave}
                >
                  <FaEllipsisVertical size="18" />
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
                  className="text-foreground h-9"
                  ref={inputRef}
                />
              </DropdownMenuGroup>
              <Button
                variant="SidebarMenuButton_destructive"
                className="w-full h-8 px-2 text-sm"
                onClick={initiateDelete}
              >
                <FaRegTrashCan size="14" />
                Delete
              </Button>
            </DropdownMenuContent>
            <TooltipContent side="bottom" alignOffset={1} align="end">
              Rename , Delete
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
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
