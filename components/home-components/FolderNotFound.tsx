"use client";
import { Notebook, Plus, FolderX } from "lucide-react";
import { Button } from "../ui/button";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import LoadingAnimation from "../ui/LoadingAnimation";
import { Card, CardContent } from "../ui/card";
import Link from "next/link";

export default function FolderNotFound() {
  const createWorkingSpace = useMutation(
    api.folders.createFolder,
  ).withOptimisticUpdate((local, args) => {
    const { name } = args;
    const now = Date.now();
    const uuid = crypto.randomUUID();
    const tempId = `${uuid}-${now}` as Id<"folders">;

    const currentWorkspaces = local.getQuery(
      api.folders.getRecentFolders,
    );
    if (currentWorkspaces !== undefined) {
      local.setQuery(api.folders.getRecentFolders, {}, [
        {
          _id: tempId,
          _creationTime: now,
          name: name || "Untitled",
          slug: "untitled",
          userId: "" as Id<"users">,
          createdAt: now,
          updatedAt: now,
        },
        ...currentWorkspaces,
      ]);
    }
  });

  const handleCreateWorkingSpace = async () => {
    try {
      await createWorkingSpace({ name: "Untitled" });
    } catch (error) {
      console.error("Error creating workspace:", error);
    }
  };

  return (
    <Card className="bg-background border-none shadow-none ">
      <CardContent className="pt-6 text-center">
        <div className="flex flex-col items-center justify-center">
          <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
            <div className="flex h-20 w-20 items-center justify-center">
              <FolderX className="h-14 w-14 text-primary" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              Folder not found
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              You don't have any folders yet.
            </p>
            <Button className="mt-4" onClick={handleCreateWorkingSpace}>
              Create a new folder
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
