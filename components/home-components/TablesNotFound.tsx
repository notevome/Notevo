"use client";

import { Button } from "@/components/ui/button";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { FileText, Plus, Table } from "lucide-react";

interface TablesNotFoundProps {
  workingSpaceId: Id<"folders">;
}

export default function TablesNotFound({
  workingSpaceId,
}: TablesNotFoundProps) {
  const createTable = useMutation(
    api.tables.createTable,
  ).withOptimisticUpdate((local, args) => {
    const { folderId: fId, name } = args;
    if (fId && fId !== workingSpaceId) return;
    const now = Date.now();
    const uuid = crypto.randomUUID();
    const tempId = `${uuid}-${now}` as Id<"tables">;

    const currentTables = local.getQuery(api.tables.getTables, {
      folderId: workingSpaceId,
    });
    if (currentTables !== undefined) {
      local.setQuery(api.tables.getTables, { folderId: workingSpaceId }, [
        {
          _id: tempId,
          _creationTime: now,
          name: name || "New Table",
          folderId: workingSpaceId,
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
      await createTable({
        name: "New Table",
        folderId: workingSpaceId,
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="flex my-10 flex-col items-center justify-center">
      <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
        <div className="flex h-20 w-20 items-center justify-center">
          <Table className="h-14 w-14 text-primary" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-foreground">
          No tables found
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Create your first table to start organizing your data.
        </p>
        <Button className="mt-4 gap-1" onClick={handleCreateTable}>
          <Plus className="h-4 w-4" />
          Create Table
        </Button>
      </div>
    </div>
  );
}
