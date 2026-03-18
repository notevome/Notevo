"use client";
import { useState, type ComponentProps } from "react";
import { Plus } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import LoadingAnimation from "../ui/LoadingAnimation";

interface CreateTableBtnProps {
  workingSpaceId: Id<"workingSpaces">;
  className?: string;
  label?: string;
  onCreated?: (tableId: Id<"notesTables">) => void | Promise<void>;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
}

export default function CreateTableBtn({
  workingSpaceId,
  className,
  label = "Create Table",
  onCreated,
  variant = "default",
  size = "default",
}: CreateTableBtnProps) {
  const [isCreating, setIsCreating] = useState(false);
  const createTable = useMutation(
    api.notesTables.createTable,
  ).withOptimisticUpdate((local, args) => {
    const { workingSpaceId: wsId, name } = args;
    if (wsId !== workingSpaceId) return;

    const now = Date.now();
    const uuid = crypto.randomUUID();
    const tempId = `${uuid}-${now}` as Id<"notesTables">;

    // Update the getTables query
    const currentTables = local.getQuery(api.notesTables.getTables, {
      workingSpaceId: wsId,
    });
    if (currentTables !== undefined) {
      local.setQuery(api.notesTables.getTables, { workingSpaceId: wsId }, [
        {
          _id: tempId,
          _creationTime: now,
          name: name || "Untitled",
          workingSpaceId: wsId,
          slug: "untitled",
          createdAt: now,
          updatedAt: now,
        },
        ...currentTables,
      ]);
    }
  });

  const handleCreateTable = async () => {
    try {
      setIsCreating(true);
      const tableId = await createTable({
        workingSpaceId: workingSpaceId,
        name: "Untitled",
      });
      await onCreated?.(tableId);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Button
      className={cn("flex items-center justify-between gap-2 ", className)}
      variant={variant}
      size={size}
      onClick={handleCreateTable}
      disabled={isCreating}
    >
      {isCreating ? (
        <LoadingAnimation className="h-4 w-4 text-primary" />
      ) : (
        <Plus size={16} />
      )}
      <p className="hidden sm:block ">{label}</p>
    </Button>
  );
}
