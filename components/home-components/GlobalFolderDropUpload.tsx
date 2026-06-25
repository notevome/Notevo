"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { Upload, FolderOpen, FileUp, Loader2 } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { useQuery } from "@/cache/useQuery";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { generateSlug } from "@/lib/generateSlug";
import { cn } from "@/lib/utils";

type PendingUpload = {
  files: File[];
  folderName: string;
};

type FileSystemHandleLike = {
  kind: "file" | "directory";
  name: string;
  getFile?: () => Promise<File>;
  values?: () => AsyncIterable<FileSystemHandleLike>;
};

type FileSystemEntryLike = {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  file?: (callback: (file: File) => void) => void;
  createReader?: () => {
    readEntries: (callback: (entries: FileSystemEntryLike[]) => void) => void;
  };
};

const DEFAULT_TABLE_NAME = "new uploaded";

function isPdfFile(file: File) {
  return (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  );
}

async function readAllEntries(
  reader: ReturnType<NonNullable<FileSystemEntryLike["createReader"]>>,
): Promise<FileSystemEntryLike[]> {
  const entries: FileSystemEntryLike[] = [];

  while (true) {
    const batch = await new Promise<FileSystemEntryLike[]>((resolve) => {
      reader.readEntries(resolve);
    });

    if (!batch.length) break;
    entries.push(...batch);
  }

  return entries;
}

async function collectFilesFromEntry(
  entry: FileSystemEntryLike,
  files: File[],
): Promise<void> {
  if (entry.isFile && entry.file) {
    const file = await new Promise<File>((resolve, reject) => {
      try {
        entry.file?.(resolve);
      } catch (error) {
        reject(error);
      }
    });

    if (isPdfFile(file)) {
      files.push(file);
    }
    return;
  }

  if (entry.isDirectory && entry.createReader) {
    const reader = entry.createReader();
    const children = await readAllEntries(reader);
    await Promise.all(
      children.map((child) => collectFilesFromEntry(child, files)),
    );
  }
}

async function collectFilesFromHandle(
  handle: FileSystemHandleLike,
  files: File[],
): Promise<void> {
  if (handle.kind === "file" && handle.getFile) {
    const file = await handle.getFile();
    if (isPdfFile(file)) {
      files.push(file);
    }
    return;
  }

  if (handle.kind === "directory" && handle.values) {
    for await (const child of handle.values()) {
      await collectFilesFromHandle(child, files);
    }
  }
}

async function extractPdfFilesFromDrop(dataTransfer: DataTransfer) {
  const files: File[] = [];
  const folderNames: string[] = [];
  const items = Array.from(dataTransfer.items ?? []);

  for (const item of items) {
    if (item.kind !== "file") continue;

    const itemWithHandle = item as DataTransferItem & {
      getAsFileSystemHandle?: () => Promise<FileSystemHandleLike>;
      webkitGetAsEntry?: () => FileSystemEntryLike | null;
    };

    if (itemWithHandle.getAsFileSystemHandle) {
      const handle = await itemWithHandle.getAsFileSystemHandle();
      folderNames.push(handle.name);
      await collectFilesFromHandle(handle, files);
      continue;
    }

    if (itemWithHandle.webkitGetAsEntry) {
      const entry = itemWithHandle.webkitGetAsEntry();
      if (entry) {
        folderNames.push(entry.name);
        await collectFilesFromEntry(entry, files);
        continue;
      }
    }

    const fallbackFile = item.getAsFile();
    if (fallbackFile && isPdfFile(fallbackFile)) {
      folderNames.push(fallbackFile.name);
      files.push(fallbackFile);
    }
  }

  const folderName =
    folderNames.find((name) => !name.toLowerCase().endsWith(".pdf")) ??
    folderNames[0] ??
    "Uploaded folder";

  return {
    files,
    folderName,
  };
}

export default function GlobalFolderDropUpload() {
  const router = useRouter();
  const { toast } = useToast();
  const dragDepthRef = useRef(0);
  const [isDragActive, setIsDragActive] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(
    null,
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isWorkspaceDialogOpen, setIsWorkspaceDialogOpen] = useState(false);

  const workspaces = useQuery(api.workingSpaces.getRecentWorkingSpaces, {}) as
    | Array<{ _id: Id<"workingSpaces">; name: string; slug?: string }>
    | undefined;

  const createWorkingSpace = useMutation(api.workingSpaces.createWorkingSpace);
  const getOrCreateTable = useMutation(api.notesTables.getOrCreateTable);
  const generateUploadUrl = useMutation(api.pdfs.generateUploadUrl);
  const sendPdf = useMutation(api.pdfs.sendPdf);

  const workspaceCount = workspaces?.length ?? 0;
  const hasMultipleWorkspaces = workspaceCount > 1;

  const uploadToWorkspace = useCallback(
    async (
      files: File[],
      folderName: string,
      workingSpaceId: Id<"workingSpaces">,
    ) => {
      setIsUploading(true);
      try {
        const tableId = await getOrCreateTable({
          name: DEFAULT_TABLE_NAME,
          workingSpaceId,
        });

        let firstPdfRoute: string | null = null;

        for (const file of files) {
          const uploadUrl = await generateUploadUrl({});
          const response = await fetch(uploadUrl, {
            method: "POST",
            headers: {
              "Content-Type": file.type || "application/pdf",
            },
            body: file,
          });

          if (!response.ok) {
            throw new Error(`Failed to upload ${file.name}`);
          }

          const { storageId } = (await response.json()) as {
            storageId: Id<"_storage">;
          };

          const pdfId = await sendPdf({
            storageId,
            title: file.name.replace(/\.pdf$/i, ""),
            workingSpaceId,
            notesTableId: tableId,
          });

          if (!firstPdfRoute) {
            const pdfSlug = generateSlug(file.name.replace(/\.pdf$/i, ""));
            firstPdfRoute = `/home/${workingSpaceId}/pdf/${pdfSlug}?pdfId=${pdfId}`;
          }
        }

        toast({
          title: "Folder uploaded",
          description: `${files.length} PDF${files.length > 1 ? "s" : ""} from "${folderName}" added to ${DEFAULT_TABLE_NAME}.`,
        });

        if (firstPdfRoute) {
          router.push(firstPdfRoute);
        } else {
          router.push(`/home/${workingSpaceId}`);
        }
      } catch (error) {
        console.error("Folder upload failed:", error);
        toast({
          title: "Upload failed",
          description: "We couldn't upload that folder.",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
        setPendingUpload(null);
        setIsWorkspaceDialogOpen(false);
      }
    },
    [generateUploadUrl, getOrCreateTable, router, sendPdf, toast],
  );

  const resolveSingleWorkspaceUpload = useCallback(
    async (files: File[], folderName: string) => {
      if (workspaceCount === 0) {
        const newWorkspaceId = await createWorkingSpace({ name: "Untitled" });
        await uploadToWorkspace(files, folderName, newWorkspaceId);
        return;
      }

      const firstWorkspace = workspaces?.[0];
      if (!firstWorkspace) return;
      await uploadToWorkspace(files, folderName, firstWorkspace._id);
    },
    [createWorkingSpace, uploadToWorkspace, workspaceCount, workspaces],
  );

  const handleResolvedDrop = useCallback(
    async (files: File[], folderName: string) => {
      if (!files.length) {
        toast({
          title: "No PDFs found",
          description: "Drop a folder that contains at least one PDF file.",
          variant: "destructive",
        });
        return;
      }

      if (hasMultipleWorkspaces) {
        setPendingUpload({ files, folderName });
        setIsWorkspaceDialogOpen(true);
        return;
      }

      await resolveSingleWorkspaceUpload(files, folderName);
    },
    [hasMultipleWorkspaces, resolveSingleWorkspaceUpload, toast],
  );

  useEffect(() => {
    const hasFiles = (event: DragEvent) =>
      Array.from(event.dataTransfer?.types ?? []).includes("Files");

    const isAvatarPhotoEditorEvent = (event: DragEvent) =>
      event.target instanceof Element &&
      Boolean(event.target.closest("[data-avatar-photo-editor]"));

    const handleDragEnter = (event: DragEvent) => {
      if (isAvatarPhotoEditorEvent(event)) return;
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragDepthRef.current += 1;
      setIsDragActive(true);
    };

    const handleDragOver = (event: DragEvent) => {
      if (isAvatarPhotoEditorEvent(event)) return;
      if (!hasFiles(event)) return;
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "copy";
      }
      setIsDragActive(true);
    };

    const handleDragLeave = (event: DragEvent) => {
      if (isAvatarPhotoEditorEvent(event)) return;
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) {
        setIsDragActive(false);
      }
    };

    const handleDrop = async (event: DragEvent) => {
      if (isAvatarPhotoEditorEvent(event)) return;
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragDepthRef.current = 0;
      setIsDragActive(false);

      if (!event.dataTransfer) return;

      const { files, folderName } = await extractPdfFilesFromDrop(
        event.dataTransfer,
      );
      await handleResolvedDrop(files, folderName);
    };

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, [handleResolvedDrop]);

  const workspaceChoices = useMemo(() => workspaces ?? [], [workspaces]);

  return (
    <>
      {isDragActive ? (
        <div className="pointer-events-none fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm">
          <div className=" w-full h-full rounded-lg border-4 border-dashed border-border bg-card px-4 pb-3 pt-3.5 text-center shadow-2xl">
            <div className=" mb-3 w-full h-full flex flex-col items-center justify-center gap-2 ">
              <FolderOpen size={32} className=" text-muted-foreground mt-0.5" />
              <h3 className="text-xl  font-semibold text-foreground">
                Drop folder to upload PDFs
              </h3>
              <p className="mt-2 max-w-72 text-sm text-center text-muted-foreground">
                We&apos;ll use the "{DEFAULT_TABLE_NAME}" table if it already
                exists, or create it and add the PDFs there.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {isUploading ? (
        <div className="fixed inset-0 z-[100001] flex items-center justify-center bg-background/55 backdrop-blur-sm">
          <div className=" mb-2 flex items-center justify-start gap-2 ">
            <Loader2
              size={20}
              className="animate-spin text-muted-foreground mt-0.5"
            />
            <h3 className="text-xl font-semibold text-foreground">
              Uploading folder...
            </h3>
          </div>
        </div>
      ) : null}

      <Dialog
        open={isWorkspaceDialogOpen}
        onOpenChange={(open) => {
          if (!isUploading) {
            setIsWorkspaceDialogOpen(open);
            if (!open) setPendingUpload(null);
          }
        }}
      >
        <DialogContent className="app-radius-lg px-4 pb-3 pt-4 sm:max-w-md bg-card">
          <DialogHeader className="mb-2 pl-1">
            <DialogTitle>Choose Workspace</DialogTitle>
            <DialogDescription>
              Select where to upload{" "}
              <span className="font-medium text-foreground">
                {pendingUpload?.folderName ?? "this folder"}
              </span>
              <br />
              We&apos;ll use the "{DEFAULT_TABLE_NAME}" table there if it
              already exists, or create it for these PDFs.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {workspaceChoices.map((workspace) => (
              <Button
                key={workspace._id}
                type="button"
                variant="outline"
                className={cn(
                  "h-auto w-full justify-start gap-3 px-4 py-3 text-left",
                )}
                disabled={!pendingUpload || isUploading}
                onClick={() => {
                  if (!pendingUpload) return;
                  void uploadToWorkspace(
                    pendingUpload.files,
                    pendingUpload.folderName,
                    workspace._id,
                  );
                }}
              >
                <FileUp size={16} className="text-muted-foreground" />
                <span className="truncate">{workspace.name}</span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
