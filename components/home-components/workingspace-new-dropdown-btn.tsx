"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { insertAtTop, useMutation } from "convex/react";
import { ChevronDown, FileUp, FileText } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type PreferredAction = "note" | "upload";

const STORAGE_KEY = "notevo_workspace_primary_create_action";

interface WorkingspaceNewDropdownBtnProps {
  notesTableId?: Id<"notesTables">;
  workingSpacesSlug?: string;
  workingSpaceId?: Id<"workingSpaces">;
  className?: string;
}

export default function WorkingspaceNewDropdownBtn({
  notesTableId,
  workingSpacesSlug,
  workingSpaceId,
  className,
}: WorkingspaceNewDropdownBtnProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preferredAction, setPreferredAction] =
    useState<PreferredAction>("note");
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedAction = window.localStorage.getItem(STORAGE_KEY);
    if (savedAction === "note" || savedAction === "upload") {
      setPreferredAction(savedAction);
    }
  }, []);

  const persistPreferredAction = useCallback((action: PreferredAction) => {
    setPreferredAction(action);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, action);
    }
  }, []);

  const createNote = useMutation(api.notes.createNote).withOptimisticUpdate(
    (local, args) => {
      const {
        notesTableId: nextTableId,
        title,
        workingSpacesSlug,
        workingSpaceId,
      } = args;

      if (!notesTableId || nextTableId !== notesTableId) return;

      const now = Date.now();
      const uuid = crypto.randomUUID();
      const tempId = `${uuid}-${now}` as Id<"notes">;

      insertAtTop({
        localQueryStore: local,
        paginatedQuery: api.notes.getNotesByTableId,
        argsToMatch: { notesTableId },
        item: {
          _id: tempId,
          _creationTime: now,
          title: title || "Untitled",
          slug: "untitled",
          workingSpaceId,
          workingSpacesSlug,
          notesTableId,
          favorite: false,
          createdAt: now,
          updatedAt: now,
        },
      });
    },
  );

  const generateUploadUrl = useMutation(api.pdfs.generateUploadUrl);
  const sendPdf = useMutation(api.pdfs.sendPdf);

  const isDisabled = useMemo(
    () => !notesTableId || !workingSpaceId || !workingSpacesSlug || isUploading,
    [isUploading, notesTableId, workingSpaceId, workingSpacesSlug],
  );

  const handleCreateNote = useCallback(async () => {
    if (!notesTableId || !workingSpaceId || !workingSpacesSlug) return;

    try {
      await createNote({
        title: "Untitled",
        notesTableId,
        workingSpacesSlug,
        workingSpaceId,
      });
    } catch (error) {
      console.error("Failed to create note:", error);
      toast({
        title: "Could not create note",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  }, [createNote, notesTableId, toast, workingSpaceId, workingSpacesSlug]);

  const uploadPdfFile = useCallback(
    async (file: File) => {
      if (!notesTableId || !workingSpaceId) return;

      if (file.type !== "application/pdf") {
        toast({
          title: "PDF only",
          description: "Please choose a PDF file.",
          variant: "destructive",
        });
        return;
      }

      setIsUploading(true);
      try {
        const uploadUrl = await generateUploadUrl({});
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            "Content-Type": file.type,
          },
          body: file,
        });

        if (!response.ok) {
          throw new Error("Upload failed");
        }

        const { storageId } = (await response.json()) as {
          storageId: Id<"_storage">;
        };

        await sendPdf({
          storageId,
          title: file.name.replace(/\.pdf$/i, ""),
          workingSpaceId,
          notesTableId,
        });
      } catch (error) {
        console.error("Failed to upload PDF:", error);
        toast({
          title: "Upload failed",
          description: "Your PDF could not be uploaded.",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
      }
    },
    [generateUploadUrl, notesTableId, sendPdf, toast, workingSpaceId],
  );

  const handlePrimaryAction = useCallback(async () => {
    if (preferredAction === "upload") {
      fileInputRef.current?.click();
      return;
    }

    await handleCreateNote();
  }, [handleCreateNote, preferredAction]);

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      await uploadPdfFile(file);
    },
    [uploadPdfFile],
  );

  const handleSelectNote = useCallback(async () => {
    persistPreferredAction("note");
    await handleCreateNote();
  }, [handleCreateNote, persistPreferredAction]);

  const handleSelectUpload = useCallback(() => {
    persistPreferredAction("upload");
    fileInputRef.current?.click();
  }, [persistPreferredAction]);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(event) => void handleFileChange(event)}
      />

      <div
        className={cn(
          "flex h-9 items-center overflow-hidden app-radius-lg",
          className,
        )}
      >
        <Button
          type="button"
          variant="outline"
          onClick={() => void handlePrimaryAction()}
          disabled={isDisabled}
          className="h-9 "
        >
          {isUploading ? "Uploading..." : "New"}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              disabled={isDisabled}
              className="h-9 px-1 border-l-0 !rounded-none"
              aria-label="open-create-menu"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => void handleSelectNote()}>
              <FileText className="h-4 w-4 text-muted-foreground" />
              New note
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSelectUpload}>
              <FileUp className="h-4 w-4 text-muted-foreground" />
              Upload PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
