"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { insertAtTop, useAction, useMutation } from "convex/react";
import { ChevronDown, FileUp, FileText, Link2 } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  FaYoutube,
  FaXTwitter,
  FaLinkedin,
  FaInstagram,
  FaLink,
} from "react-icons/fa6";

import {
  detectLinkPlatform,
  normalizeLinkUrl,
  type LinkPlatform,
} from "@/lib/link-platform";

type PreferredAction = "note" | "upload" | "link";

const STORAGE_KEY = "notevo_workspace_primary_create_action";

const PLATFORM_LABELS: Record<LinkPlatform, string> = {
  youtube: "YouTube",
  x: "X (Twitter)",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  generic: "Link",
};

const PLATFORM_COLORS: Record<LinkPlatform, string> = {
  youtube: "text-[#FF0000]",
  x: "text-foreground",
  linkedin: "text-[#0A66C2]",
  instagram: "text-[#E4405F]",
  generic: "text-muted-foreground",
};

function PlatformIcon({
  platform,
  className,
}: {
  platform: LinkPlatform;
  className?: string;
}) {
  const colorClass = PLATFORM_COLORS[platform];
  switch (platform) {
    case "youtube":
      return <FaYoutube className={cn(colorClass, className)} />;
    case "x":
      return <FaXTwitter className={cn(colorClass, className)} />;
    case "linkedin":
      return <FaLinkedin className={cn(colorClass, className)} />;
    case "instagram":
      return <FaInstagram className={cn(colorClass, className)} />;
    default:
      return <FaLink className={cn(colorClass, className)} />;
  }
}

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
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [isInsertingLink, setIsInsertingLink] = useState(false);
  const linkInputRef = useRef<HTMLInputElement>(null);

  const detectedPlatform = useMemo(() => {
    if (!linkUrl.trim()) return null;
    // Only detect if it looks like a URL
    if (!linkUrl.startsWith("http://") && !linkUrl.startsWith("https://")) {
      return null;
    }
    return detectLinkPlatform(linkUrl);
  }, [linkUrl]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedAction = window.localStorage.getItem(STORAGE_KEY);
    if (
      savedAction === "note" ||
      savedAction === "upload" ||
      savedAction === "link"
    ) {
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
  const createLink = useMutation(api.links.createLink);
  const fetchLinkMetadata = useAction(api.Linkmetadata.fetchLinkMetadata);

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

  const handleInsertLink = useCallback(async () => {
    if (!notesTableId || !workingSpaceId) return;

    const trimmedUrl = linkUrl.trim();
    if (!trimmedUrl) {
      toast({
        title: "URL required",
        description: "Please enter a valid URL.",
        variant: "destructive",
      });
      return;
    }

    // Basic URL validation
    const finalUrl = normalizeLinkUrl(trimmedUrl);

    try {
      new URL(finalUrl);
    } catch {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL.",
        variant: "destructive",
      });
      return;
    }

    const platform = detectLinkPlatform(finalUrl);
    const userTitle = linkTitle.trim() || undefined;

    setIsInsertingLink(true);
    try {
      let fetchedTitle: string | undefined;
      let metadata:
        | Awaited<ReturnType<typeof fetchLinkMetadata>>["metadata"]
        | any = undefined;
      try {
        const preview = await fetchLinkMetadata({ url: finalUrl, platform });
        fetchedTitle = preview.title;
        metadata = preview.metadata;
      } catch (metadataError) {
        console.error("Failed to fetch link preview:", metadataError);
      }

      await createLink({
        url: finalUrl,
        platform,
        metadata,
        title: userTitle ?? fetchedTitle,
        workingSpaceId,
        notesTableId,
      });
      setLinkUrl("");
      setLinkTitle("");
      setIsLinkDialogOpen(false);
    } catch (error) {
      console.error("Failed to insert link:", error);
      toast({
        title: "Could not insert link",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsInsertingLink(false);
    }
  }, [
    createLink,
    fetchLinkMetadata,
    linkTitle,
    linkUrl,
    notesTableId,
    toast,
    workingSpaceId,
  ]);

  const handleSelectInsertLink = useCallback(() => {
    persistPreferredAction("link");
    setLinkUrl("");
    setLinkTitle("");
    setIsLinkDialogOpen(true);
    setTimeout(() => {
      linkInputRef.current?.focus();
    }, 100);
  }, [persistPreferredAction]);

  const handlePrimaryAction = useCallback(async () => {
    if (preferredAction === "upload") {
      fileInputRef.current?.click();
      return;
    }

    if (preferredAction === "link") {
      handleSelectInsertLink();
      return;
    }

    await handleCreateNote();
  }, [handleCreateNote, handleSelectInsertLink, preferredAction]);

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

  useEffect(() => {
    const handlerCreateNoteShortcut = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "o"
      ) {
        e.preventDefault();
        e.stopPropagation();
        handleCreateNote();
      }
    };
    window.addEventListener("keydown", handlerCreateNoteShortcut);
    return () =>
      window.removeEventListener("keydown", handlerCreateNoteShortcut);
  }, [handleCreateNote]);

  useEffect(() => {
    const handlerInsertLinkShortcut = (e: KeyboardEvent) => {
      if (
        e.shiftKey &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        e.key.toLowerCase() === "l"
      ) {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName;
        const isEditableTarget =
          tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable;
        if (isEditableTarget) return;

        e.preventDefault();
        e.stopPropagation();
        handleSelectInsertLink();
      }
    };
    window.addEventListener("keydown", handlerInsertLinkShortcut);
    return () =>
      window.removeEventListener("keydown", handlerInsertLinkShortcut);
  }, [handleSelectInsertLink]);

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
          "flex h-9 items-center overflow-hidden !rounded-none",
          className,
        )}
      >
        <Button
          type="button"
          variant="outline"
          onClick={() => void handlePrimaryAction()}
          disabled={isDisabled}
          className="h-9 !rounded-none"
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
          <DropdownMenuContent align="end" className="w-fit">
            <DropdownMenuItem onClick={() => void handleSelectNote()}>
              <FileText className="h-4 w-4 text-muted-foreground" />
              New note
              <span className="inline-flex gap-0.5">
                <kbd className="pointer-events-none border border-border ml-auto inline-flex h-5 select-none items-center gap-1 rounded-md bg-card px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  <span className="text-xs">Ctrl + Shift</span>
                </kbd>
                <kbd className="pointer-events-none border border-border ml-auto inline-flex h-5 select-none items-center gap-1 rounded-md bg-card px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  <span className="text-xs">O</span>
                </kbd>
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSelectUpload}>
              <FileUp className="h-4 w-4 text-muted-foreground" />
              Upload PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSelectInsertLink}>
              <Link2 className="h-4 w-4 text-muted-foreground" />
              Insert Link
              <span className="inline-flex gap-0.5">
                <kbd className="pointer-events-none border border-border ml-auto inline-flex h-5 select-none items-center gap-1 rounded-md bg-card px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  <span className="text-xs">Shift</span>
                </kbd>
                <kbd className="pointer-events-none border border-border ml-auto inline-flex h-5 select-none items-center gap-1 rounded-md bg-card px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  <span className="text-xs">L</span>
                </kbd>
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Insert Link Dialog */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border px-4 pt-4 pb-2.5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              Insert Link
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Paste a link from YouTube, X, LinkedIn, Instagram, or any website.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              URL <span className="text-destructive">*</span>
            </label>
            <Input
              ref={linkInputRef}
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isInsertingLink) {
                  e.preventDefault();
                  void handleInsertLink();
                }
              }}
              placeholder="https://youtube.com/watch?v=..."
              className="border-border h-8"
            />
            {detectedPlatform && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1 px-1">
                <PlatformIcon platform={detectedPlatform} className="h-4 w-4" />
                <span>
                  Detected:{" "}
                  <span className="text-foreground font-medium">
                    {PLATFORM_LABELS[detectedPlatform]}
                  </span>
                </span>
              </div>
            )}
          </div>
          <DialogFooter className=" flex-row-reverse w-full gap-2 pt-2.5">
            <Button
              variant="revDefault"
              onClick={() => void handleInsertLink()}
              disabled={isInsertingLink || !linkUrl.trim()}
              className=" h-8 !rounded-none"
            >
              {isInsertingLink ? "Inserting..." : "Insert Link"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setIsLinkDialogOpen(false)}
              className="border-border h-8"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
