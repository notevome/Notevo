"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useAction, useMutation } from "convex/react";
import { useQuery } from "@/cache/useQuery";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  FileSymlink,
  FileUp,
  FileText,
  Link2,
  PanelTop,
  SquarePen,
} from "lucide-react";
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
import { usePendingNoteDraftContext } from "@/components/home-components/PendingNoteDraftProvider";
import { buildItemSlug } from "@/lib/slug";
import { getLastVisitedLocation } from "@/lib/last-visited";
import { useSidebar } from "@/components/ui/sidebar";
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

type PreferredAction = "note" | "upload" | "link" | "whiteboard";

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

interface FolderNewDropdownBtnProps {
  notesTableId?: Id<"tables">;
  workingSpacesSlug?: string;
  workingSpaceId?: Id<"folders">;
  className?: string;
  buttonClassName?: string;
  chevronClassName?: string;
  variant?: "outline" | "default";
  showIcon?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function FolderNewDropdownBtn({
  notesTableId,
  workingSpacesSlug,
  workingSpaceId,
  className,
  buttonClassName,
  chevronClassName,
  variant = "outline",
  showIcon = false,
  onOpenChange,
}: FolderNewDropdownBtnProps) {
  const { toast } = useToast();
  const pathname = usePathname();
  const router = useRouter();
  const { beginNoteDraft } = usePendingNoteDraftContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preferredAction, setPreferredAction] =
    useState<PreferredAction>("note");
  const [isUploading, setIsUploading] = useState(false);

  const getWorkingSpaces = useQuery(api.folders.getRecentFolders);
  const getOrCreateTable = useMutation(api.tables.getOrCreateTable);

  const activeWorkingSpace = useMemo(() => {
    if (workingSpaceId && getWorkingSpaces) {
      const match = getWorkingSpaces.find((w) => w._id === workingSpaceId);
      if (match) return match;
    }
    const freshLoc = getLastVisitedLocation();
    if (freshLoc.folderId && getWorkingSpaces) {
      const match = getWorkingSpaces.find(
        (w) => String(w._id) === freshLoc.folderId,
      );
      if (match) return match;
    }
    return getWorkingSpaces?.[0];
  }, [workingSpaceId, getWorkingSpaces]);

  const resolvedWorkingSpaceId = workingSpaceId ?? activeWorkingSpace?._id;
  const resolvedWorkingSpacesSlug =
    workingSpacesSlug ?? activeWorkingSpace?.slug ?? "";

  const tables = useQuery(
    api.tables.getTables,
    resolvedWorkingSpaceId ? { folderId: resolvedWorkingSpaceId } : "skip",
  );

  const resolveTargetTableId = useCallback(async (): Promise<
    Id<"tables"> | undefined
  > => {
    if (notesTableId) return notesTableId;

    const freshLoc = getLastVisitedLocation(resolvedWorkingSpaceId);
    if (freshLoc.tableId && tables && Array.isArray(tables)) {
      const match = tables.find((t: any) => String(t._id) === freshLoc.tableId);
      if (match) return match._id;
    }

    if (tables && tables.length > 0) {
      return tables[0]._id;
    }

    if (resolvedWorkingSpaceId) {
      const created = await getOrCreateTable({
        name: "Documents",
        folderId: resolvedWorkingSpaceId,
      });
      return created;
    }

    return undefined;
  }, [notesTableId, resolvedWorkingSpaceId, tables, getOrCreateTable]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedAction = window.localStorage.getItem(STORAGE_KEY);
    if (
      savedAction === "note" ||
      savedAction === "upload" ||
      savedAction === "link" ||
      savedAction === "whiteboard"
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

  const generateUploadUrl = useMutation(api.pdfs.generateUploadUrl);
  const sendPdf = useMutation(api.pdfs.sendPdf);
  const createWhiteboard = useMutation(api.whiteboards.createWhiteboard);

  const isDisabled = useMemo(
    () => !resolvedWorkingSpaceId || isUploading,
    [isUploading, resolvedWorkingSpaceId],
  );

  const handleCreateNote = useCallback(async () => {
    if (!resolvedWorkingSpaceId) return;
    const targetTableId = await resolveTargetTableId();
    if (!targetTableId) return;

    const { token } = beginNoteDraft({
      notesTableId: targetTableId,
      title: "Untitled",
      workingSpaceId: resolvedWorkingSpaceId,
      workingSpacesSlug: resolvedWorkingSpacesSlug,
      originPath: pathname,
    });
    router.push(`/home/${resolvedWorkingSpaceId}/draft-${token}`);
  }, [
    beginNoteDraft,
    pathname,
    resolveTargetTableId,
    resolvedWorkingSpaceId,
    resolvedWorkingSpacesSlug,
    router,
  ]);

  const handleCreateWhiteboard = useCallback(async () => {
    if (!resolvedWorkingSpaceId) return;
    try {
      const targetTableId = await resolveTargetTableId();
      if (!targetTableId) return;

      const whiteboardId = await createWhiteboard({
        title: "Untitled whiteboard",
        notesTableId: targetTableId,
        workingSpaceId: resolvedWorkingSpaceId,
      });
      router.push(
        `/home/${resolvedWorkingSpaceId}/${buildItemSlug("Untitled whiteboard", whiteboardId)}`,
      );
    } catch (error) {
      console.error("Failed to create whiteboard:", error);
      toast({
        title: "Could not create whiteboard",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  }, [
    createWhiteboard,
    resolveTargetTableId,
    resolvedWorkingSpaceId,
    router,
    toast,
  ]);

  const uploadPdfFile = useCallback(
    async (file: File) => {
      if (!resolvedWorkingSpaceId) return;

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
        const targetTableId = await resolveTargetTableId();
        if (!targetTableId) return;

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
          workingSpaceId: resolvedWorkingSpaceId,
          notesTableId: targetTableId,
        });

        toast({
          variant: "default",
          title: "PDF uploaded successfully",
          description: "hey go and take a look at your stuff !!",
          action: (
            <Button variant="secondary" className="px-3 h-8" size="sm" asChild>
              <Link
                href={`/home/${resolvedWorkingSpaceId}?table=${targetTableId}`}
                className="flex justify-center items-center gap-2 text-xs"
              >
                <FileSymlink size={16} />
                Checkout
              </Link>
            </Button>
          ),
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
    [
      generateUploadUrl,
      resolveTargetTableId,
      resolvedWorkingSpaceId,
      sendPdf,
      toast,
    ],
  );

  const handleSelectInsertLink = useCallback(() => {
    persistPreferredAction("link");
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("notevo:open-insert-link"));
    }
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

    if (preferredAction === "whiteboard") {
      await handleCreateWhiteboard();
      return;
    }

    await handleCreateNote();
  }, [
    handleCreateNote,
    handleCreateWhiteboard,
    handleSelectInsertLink,
    preferredAction,
  ]);

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

  const handleSelectWhiteboard = useCallback(async () => {
    persistPreferredAction("whiteboard");
    await handleCreateWhiteboard();
  }, [handleCreateWhiteboard, persistPreferredAction]);

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
          "flex h-9 items-center overflow-hidden !app-radius-none",
          className,
        )}
      >
        <Button
          type="button"
          variant={variant}
          onClick={() => void handlePrimaryAction()}
          disabled={isDisabled}
          className={cn("h-9 !app-radius-none", buttonClassName)}
        >
          {showIcon && (
            <SquarePen
              strokeWidth={2.3}
              size={16}
              className=" inline-block mr-px shrink-0"
            />
          )}
          {isUploading ? "Uploading..." : "New"}
        </Button>

        <DropdownMenu onOpenChange={onOpenChange}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant={variant}
              disabled={isDisabled}
              className={cn(
                "h-9 px-1 border-l-0 !app-radius-none",
                chevronClassName,
              )}
              aria-label="open-create-menu"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuItem
              className="justify-between cursor-pointer"
              onClick={() => void handleSelectNote()}
            >
              <span className="flex items-center gap-2 whitespace-nowrap">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                New Document
              </span>
              <span className="inline-flex items-center gap-1 shrink-0 ml-auto">
                <kbd className="pointer-events-none border border-border inline-flex h-5 select-none items-center justify-center app-radius-md bg-card px-1.5 font-mono text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                  Ctrl
                </kbd>
                <kbd className="pointer-events-none border border-border inline-flex h-5 select-none items-center justify-center app-radius-md bg-card px-1.5 font-mono text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                  Shift
                </kbd>
                <kbd className="pointer-events-none border border-border inline-flex h-5 select-none items-center justify-center app-radius-md bg-card px-1.5 font-mono text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                  O
                </kbd>
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => void handleSelectWhiteboard()}
            >
              <PanelTop className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="whitespace-nowrap">New Whiteboard</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex items-center gap-2 cursor-pointer"
              onClick={handleSelectUpload}
            >
              <FileUp className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="whitespace-nowrap">New Upload</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="justify-between cursor-pointer"
              onClick={handleSelectInsertLink}
            >
              <span className="flex items-center gap-2 whitespace-nowrap">
                <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                New Link
              </span>
              <span className="inline-flex items-center gap-1 shrink-0 ml-auto">
                <kbd className="pointer-events-none border border-border inline-flex h-5 select-none items-center justify-center app-radius-md bg-card px-1.5 font-mono text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                  Shift
                </kbd>
                <kbd className="pointer-events-none border border-border inline-flex h-5 select-none items-center justify-center app-radius-md bg-card px-1.5 font-mono text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                  L
                </kbd>
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}

export function GlobalCreateHandler() {
  const { toast } = useToast();
  const pathname = usePathname();
  const router = useRouter();
  const { setOpenMobile } = useSidebar();
  const { beginNoteDraft } = usePendingNoteDraftContext();

  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [isInsertingLink, setIsInsertingLink] = useState(false);
  const linkInputRef = useRef<HTMLInputElement>(null);

  const getWorkingSpaces = useQuery(api.folders.getRecentFolders);
  const getOrCreateTable = useMutation(api.tables.getOrCreateTable);
  const createLink = useMutation(api.links.createLink);
  const fetchLinkMetadata = useAction(api.Linkmetadata.fetchLinkMetadata);

  const activeWorkingSpace = useMemo(() => {
    const freshLoc = getLastVisitedLocation();
    const list = getWorkingSpaces;
    if (freshLoc.folderId && list) {
      const match = list.find((w: any) => String(w._id) === freshLoc.folderId);
      if (match) return match;
    }
    return list?.[0];
  }, [getWorkingSpaces]);

  const resolvedWorkingSpaceId = activeWorkingSpace?._id;
  const resolvedWorkingSpacesSlug = activeWorkingSpace?.slug ?? "";

  const tables = useQuery(
    api.tables.getTables,
    resolvedWorkingSpaceId ? { folderId: resolvedWorkingSpaceId } : "skip",
  );

  const resolveTargetTableId = useCallback(async (): Promise<
    Id<"tables"> | undefined
  > => {
    const freshLoc = getLastVisitedLocation(resolvedWorkingSpaceId);
    if (freshLoc.tableId && tables && Array.isArray(tables)) {
      const match = tables.find((t: any) => String(t._id) === freshLoc.tableId);
      if (match) return match._id;
    }

    if (tables && tables.length > 0) {
      return tables[0]._id;
    }

    if (resolvedWorkingSpaceId) {
      const created = await getOrCreateTable({
        name: "Documents",
        folderId: resolvedWorkingSpaceId,
      });
      return created;
    }

    return undefined;
  }, [tables, resolvedWorkingSpaceId, getOrCreateTable]);

  const handleCreateNote = useCallback(async () => {
    if (!resolvedWorkingSpaceId) return;
    const targetTableId = await resolveTargetTableId();
    if (!targetTableId) return;

    const { token } = beginNoteDraft({
      notesTableId: targetTableId,
      title: "Untitled",
      workingSpaceId: resolvedWorkingSpaceId,
      workingSpacesSlug: resolvedWorkingSpacesSlug,
      originPath: pathname,
    });
    setOpenMobile(false);
    router.push(`/home/${resolvedWorkingSpaceId}/draft-${token}`);
  }, [
    beginNoteDraft,
    pathname,
    resolveTargetTableId,
    resolvedWorkingSpaceId,
    resolvedWorkingSpacesSlug,
    router,
    setOpenMobile,
  ]);

  const handleOpenInsertLink = useCallback(() => {
    setLinkUrl("");
    setLinkTitle("");
    setIsLinkDialogOpen(true);
    setTimeout(() => {
      linkInputRef.current?.focus();
    }, 100);
  }, []);

  useEffect(() => {
    const handlerCreateNoteShortcut = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "o"
      ) {
        e.preventDefault();
        e.stopPropagation();
        void handleCreateNote();
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
        handleOpenInsertLink();
      }
    };
    window.addEventListener("keydown", handlerInsertLinkShortcut);
    return () =>
      window.removeEventListener("keydown", handlerInsertLinkShortcut);
  }, [handleOpenInsertLink]);

  useEffect(() => {
    const handleOpenLinkEvent = () => {
      handleOpenInsertLink();
    };
    window.addEventListener("notevo:open-insert-link", handleOpenLinkEvent);
    return () =>
      window.removeEventListener("notevo:open-insert-link", handleOpenLinkEvent);
  }, [handleOpenInsertLink]);

  useEffect(() => {
    const handleCreateNoteEvent = () => {
      void handleCreateNote();
    };
    window.addEventListener("notevo:create-note", handleCreateNoteEvent);
    return () =>
      window.removeEventListener("notevo:create-note", handleCreateNoteEvent);
  }, [handleCreateNote]);

  const detectedPlatform = useMemo(() => {
    if (!linkUrl.trim()) return null;
    if (!linkUrl.startsWith("http://") && !linkUrl.startsWith("https://")) {
      return null;
    }
    return detectLinkPlatform(linkUrl);
  }, [linkUrl]);

  const handleInsertLink = useCallback(async () => {
    if (!resolvedWorkingSpaceId) return;

    const trimmedUrl = linkUrl.trim();
    if (!trimmedUrl) {
      toast({
        title: "URL required",
        description: "Please enter a valid URL.",
        variant: "destructive",
      });
      return;
    }

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
      const targetTableId = await resolveTargetTableId();
      if (!targetTableId) return;

      let fetchedTitle: string | undefined;
      let metadata: any = undefined;
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
        workingSpaceId: resolvedWorkingSpaceId,
        notesTableId: targetTableId,
      });
      setLinkUrl("");
      setLinkTitle("");
      setIsLinkDialogOpen(false);

      toast({
        variant: "default",
        title: "Link added successfully",
        description: "hey go and take a look at your stuff !!",
        action: (
          <Button variant="secondary" className="px-3 h-8" size="sm" asChild>
            <Link
              href={`/home/${resolvedWorkingSpaceId}?table=${targetTableId}`}
              className="flex justify-center items-center gap-2 text-xs"
            >
              <FileSymlink size={16} />
              Checkout
            </Link>
          </Button>
        ),
      });
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
    resolveTargetTableId,
    resolvedWorkingSpaceId,
    toast,
  ]);

  return (
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
            onClick={() => void handleInsertLink()}
            disabled={isInsertingLink || !linkUrl.trim()}
            className=" h-8 !app-radius-none"
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
  );
}
