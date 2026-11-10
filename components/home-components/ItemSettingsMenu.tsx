"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { FaEllipsisVertical, FaEllipsis, FaRegTrashCan } from "react-icons/fa6";
import {
  Pin,
  ChevronsLeftRightEllipsis,
  ChevronsRightLeft,
  Download,
  FileText,
  FileJson,
  FileType,
  FileDown,
  FileOutput,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation } from "convex/react";
import { useQuery } from "@/cache/useQuery";
import { api } from "@/convex/_generated/api";
import { cn, formatNoteTimestamp } from "@/lib/utils";
import type { Id } from "@/convex/_generated/dataModel";
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
import { buildItemSlug, extractIdFromSlug } from "@/lib/slug";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useNoteWidth } from "@/hooks/useNoteWidth";
import { useNoteDownload } from "@/hooks/useNoteDownload";
import { useHoverTooltip } from "@/hooks/useHoverTooltip";
import { useToast } from "@/hooks/use-toast";
import {
  SettingsMoveHint,
  useSettingsMoveHint,
} from "@/components/ui/settings-move-hint";
import { ItemPropertiesMenu } from "./ItemProperties";
import MoveItemDialog from "./MoveItemDialog";

export type ItemSettingsKind =
  | "note"
  | "document"
  | "pdf"
  | "link"
  | "whiteboard";

export interface ItemSettingsMenuProps {
  itemId: Id<any>;
  itemKind: ItemSettingsKind;
  itemTitle?: string;
  IconVariant?: "vertical_icon" | "horizontal_icon";
  iconVariant?: "vertical_icon" | "horizontal_icon";
  BtnClassName?: string;
  btnClassName?: string;
  btnVariant?: any;
  ShowWidthOp?: boolean;
  showWidthOption?: boolean;
  DropdownMenuContentAlign?: "end" | "start";
  dropdownMenuContentAlign?: "end" | "start";
  TooltipContentAlign?: "end" | "start";
  tooltipContentAlign?: "end" | "start";
  onDelete?: (id: Id<any>) => void;
  contextMenuPosition?: { x: number; y: number } | null;
  onContextMenuClose?: () => void;
  syncBrowserChrome?: boolean;
  initialData?: any;
}

export default function ItemSettingsMenu({
  itemId,
  itemKind,
  itemTitle: initialTitleProp,
  IconVariant: iconVariantProp,
  iconVariant,
  BtnClassName: btnClassNameProp,
  btnClassName,
  btnVariant,
  ShowWidthOp: showWidthProp,
  showWidthOption,
  DropdownMenuContentAlign: contentAlignProp,
  dropdownMenuContentAlign,
  TooltipContentAlign: tooltipAlignProp,
  tooltipContentAlign,
  onDelete,
  contextMenuPosition,
  onContextMenuClose,
  syncBrowserChrome = false,
  initialData,
}: ItemSettingsMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const resolvedIconVariant = iconVariantProp || iconVariant || "vertical_icon";
  const resolvedBtnClassName = btnClassNameProp || btnClassName;
  const resolvedContentAlign = contentAlignProp || dropdownMenuContentAlign || "end";
  const resolvedTooltipAlign = tooltipAlignProp || tooltipContentAlign || "end";
  const canShowWidth = showWidthProp ?? showWidthOption ?? false;

  // Normalized kind
  const normalizedKind: "note" | "pdf" | "link" | "whiteboard" =
    itemKind === "document" ? "note" : itemKind;

  // Fetch item data if not passed
  const fetchedNote = useQuery(
    api.documents.getNoteById,
    normalizedKind === "note" && !initialData ? { _id: itemId } : "skip",
  );
  const fetchedPdf = useQuery(
    api.pdfs.getPdfById,
    normalizedKind === "pdf" && !initialData ? { _id: itemId } : "skip",
  );
  const fetchedLink = useQuery(
    api.links.getLinkById,
    normalizedKind === "link" && !initialData ? { _id: itemId } : "skip",
  );
  const fetchedWhiteboard = useQuery(
    api.whiteboards.getWhiteboardById,
    normalizedKind === "whiteboard" && !initialData ? { _id: itemId } : "skip",
  );

  const itemData =
    initialData ??
    (normalizedKind === "note"
      ? fetchedNote
      : normalizedKind === "pdf"
        ? fetchedPdf
        : normalizedKind === "link"
          ? fetchedLink
          : fetchedWhiteboard);

  const itemTitle =
    itemData?.title ??
    initialTitleProp ??
    (normalizedKind === "link" ? (itemData as any)?.url : "") ??
    "Untitled";

  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(itemTitle);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const tooltip = useHoverTooltip(100);
  const { hasSeenHint, dismissHint } = useSettingsMoveHint();
  const { noteWidth, toggleWidth } = useNoteWidth();

  // Mutations
  const updateNote = useMutation(api.documents.updateNote);
  const deleteNote = useMutation(api.documents.deleteNote);
  const updatePdf = useMutation(api.pdfs.updatePdf);
  const deletePdf = useMutation(api.pdfs.deletePdf);
  const updateLink = useMutation(api.links.updateLink);
  const deleteLink = useMutation(api.links.deleteLink);
  const updateWhiteboard = useMutation(api.whiteboards.updateWhiteboard);
  const deleteWhiteboard = useMutation(api.whiteboards.deleteWhiteboard);

  const { handleDownload } = useNoteDownload({
    noteBody: itemData?.body,
    noteTitle: itemTitle,
  });

  useEffect(() => {
    setInputValue(itemTitle);
  }, [itemTitle]);

  useEffect(() => {
    if (contextMenuPosition) setOpen(true);
  }, [contextMenuPosition]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 10);
    return () => clearTimeout(timer);
  }, [open]);

  const currentSlug = pathname.split("/").filter(Boolean).pop();
  const isViewingCurrent = useMemo(() => {
    if (typeof window === "undefined") return false;
    if (normalizedKind === "note") {
      const currentNoteId =
        searchParams.get("id") ||
        searchParams.get("noteId") ||
        (currentSlug ? extractIdFromSlug(currentSlug) : null);
      return currentNoteId === String(itemId);
    }
    if (normalizedKind === "pdf") {
      const currentPdfId =
        searchParams.get("pdfId") ||
        (currentSlug ? extractIdFromSlug(currentSlug) : null);
      return currentPdfId === String(itemId);
    }
    if (normalizedKind === "whiteboard") {
      const currentWbId =
        searchParams.get("whiteboardId") ||
        (currentSlug ? extractIdFromSlug(currentSlug) : null);
      return currentWbId === String(itemId);
    }
    return false;
  }, [normalizedKind, searchParams, currentSlug, itemId]);

  // Rename commit
  const commitRename = useCallback(
    async (newTitle: string) => {
      const trimmed = newTitle.trim();
      if (!trimmed || trimmed === itemTitle) return;

      try {
        if (normalizedKind === "note") {
          await updateNote({ _id: itemId, title: trimmed });
          if (syncBrowserChrome && isViewingCurrent) {
            document.title = `${trimmed} - oraizive`;
            const currentUrl = new URL(window.location.href);
            const segments = currentUrl.pathname.split("/");
            segments[segments.length - 1] = buildItemSlug(trimmed, itemId);
            currentUrl.pathname = segments.join("/");
            window.history.replaceState({}, "", currentUrl.href);
          }
        } else if (normalizedKind === "pdf") {
          await updatePdf({ _id: itemId, title: trimmed });
        } else if (normalizedKind === "whiteboard") {
          await updateWhiteboard({ _id: itemId, title: trimmed });
          if (syncBrowserChrome && isViewingCurrent) {
            document.title = `${trimmed} - oraizive`;
            const currentUrl = new URL(window.location.href);
            const segments = currentUrl.pathname.split("/");
            segments[segments.length - 1] = buildItemSlug(trimmed, itemId);
            currentUrl.pathname = segments.join("/");
            window.history.replaceState({}, "", currentUrl.href);
          }
        }
      } catch (error) {
        console.error("Failed to rename item:", error);
        setInputValue(itemTitle);
      }
    },
    [normalizedKind, itemId, itemTitle, updateNote, updatePdf, updateLink, updateWhiteboard, syncBrowserChrome, isViewingCurrent],
  );

  const handleFavoritePin = async () => {
    const nextFavorite = !itemData?.favorite;
    try {
      if (normalizedKind === "note") {
        await updateNote({ _id: itemId, favorite: nextFavorite });
      } else if (normalizedKind === "pdf") {
        await updatePdf({ _id: itemId, favorite: nextFavorite });
      } else if (normalizedKind === "link") {
        await updateLink({ _id: itemId, favorite: nextFavorite });
      } else if (normalizedKind === "whiteboard") {
        await updateWhiteboard({ _id: itemId, favorite: nextFavorite });
      }
    } catch (error) {
      console.error("Failed to toggle pin:", error);
    }
  };

  const handlePropertyChange = (changes: {
    status?: any;
    priority?: any;
    deadline?: any;
  }) => {
    if (normalizedKind === "note") {
      void updateNote({ _id: itemId, ...changes });
    } else if (normalizedKind === "pdf") {
      void updatePdf({ _id: itemId, ...changes });
    } else if (normalizedKind === "whiteboard") {
      void updateWhiteboard({ _id: itemId, ...changes });
    }
  };

  const handleCopyLink = () => {
    const url = (itemData as any)?.url;
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadWhiteboard = () => {
    const blob = new Blob(
      [(itemData as any)?.snapshot || JSON.stringify({ elements: [] })],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${itemTitle || "whiteboard"}.excalidraw`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdfOriginal = async () => {
    const fileUrl = (itemData as any)?.fileUrl;
    if (!fileUrl) return;
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${itemTitle || "document"}.pdf`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to download PDF:", error);
    }
  };

  const executeDelete = async () => {
    try {
      if (onDelete) {
        onDelete(itemId);
      }
      if (isViewingCurrent) {
        router.back();
      }
      if (normalizedKind === "note") {
        await deleteNote({ _id: itemId });
      } else if (normalizedKind === "pdf") {
        await deletePdf({ _id: itemId });
      } else if (normalizedKind === "link") {
        await deleteLink({ _id: itemId });
      } else if (normalizedKind === "whiteboard") {
        await deleteWhiteboard({ _id: itemId });
      }
      setIsAlertOpen(false);
    } catch (error) {
      console.error("Failed to delete item:", error);
    }
  };

  const initiateDelete = (event: React.MouseEvent) => {
    if (event.shiftKey) {
      void executeDelete();
    } else {
      setOpen(false);
      setIsAlertOpen(true);
    }
  };

  const kindLabel =
    normalizedKind === "note"
      ? "Document"
      : normalizedKind === "pdf"
        ? "Upload"
        : normalizedKind === "link"
          ? "Link"
          : "Whiteboard";

  return (
    <>
      <div className="relative inline-flex items-center">
        {syncBrowserChrome && !hasSeenHint && (
          <div
            aria-hidden="true"
            className="absolute -inset-1 pointer-events-none border-2 border-dashed border-muted-foreground bg-muted animate-pulse app-radius-sm z-10"
          />
        )}

        <DropdownMenu
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) onContextMenuClose?.();
            if (next) {
              tooltip.hide();
              dismissHint();
            }
          }}
        >
          {contextMenuPosition &&
            typeof document !== "undefined" &&
            createPortal(
              <DropdownMenuTrigger asChild>
                <span
                  aria-hidden
                  style={{
                    position: "fixed",
                    left: contextMenuPosition.x,
                    top: contextMenuPosition.y,
                    width: 0,
                    height: 0,
                    pointerEvents: "none",
                  }}
                />
              </DropdownMenuTrigger>,
              document.body,
            )}

          <Tooltip open={tooltip.open}>
            {contextMenuPosition ? (
              <TooltipTrigger asChild>
                <Button
                  variant={(btnVariant as any) || "Trigger"}
                  size="icon"
                  className={cn("h-8 w-8", resolvedBtnClassName)}
                  {...tooltip.triggerProps}
                  aria-label={`${kindLabel.toLowerCase()}-options`}
                  onClick={dismissHint}
                >
                  {resolvedIconVariant === "vertical_icon" ? (
                    <FaEllipsisVertical size={18} className="text-muted-foreground" />
                  ) : (
                    <FaEllipsis size={22} className="text-muted-foreground" />
                  )}
                </Button>
              </TooltipTrigger>
            ) : (
              <DropdownMenuTrigger asChild>
                <TooltipTrigger asChild>
                  <Button
                    variant={(btnVariant as any) || "Trigger"}
                    size="icon"
                    className={cn("h-8 w-8", resolvedBtnClassName)}
                    {...tooltip.triggerProps}
                    aria-label={`${kindLabel.toLowerCase()}-options`}
                    onClick={dismissHint}
                  >
                    {resolvedIconVariant === "vertical_icon" ? (
                      <FaEllipsisVertical size={18} className="text-muted-foreground" />
                    ) : (
                      <FaEllipsis size={22} className="text-muted-foreground" />
                    )}
                  </Button>
                </TooltipTrigger>
              </DropdownMenuTrigger>
            )}
            <TooltipContent side="bottom" align={resolvedTooltipAlign}>
              Rename, Pin, Move, Download, Delete
            </TooltipContent>
          </Tooltip>

          <DropdownMenuContent
            align={contextMenuPosition ? "start" : resolvedContentAlign}
            className="z-[10000] w-48 space-y-4 px-1.5 pb-1.5 pt-0 text-foreground"
          >
            {normalizedKind !== "link" && (
              <DropdownMenuGroup className="relative">
                <Label>Rename :</Label>
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onBlur={() => void commitRename(inputValue)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void commitRename(inputValue);
                      setOpen(false);
                    }
                  }}
                  className="h-8 text-foreground"
                  placeholder={`Rename your ${kindLabel.toLowerCase()}`}
                />
              </DropdownMenuGroup>
            )}

            <DropdownMenuGroup>
              <Button
                variant="SidebarMenuButton"
                className="h-8 w-full px-2 text-sm"
                onClick={() => void handleFavoritePin()}
                aria-label={`pin-${kindLabel.toLowerCase()}`}
              >
                <Pin size={14} className="text-muted-foreground" />
                {itemData?.favorite ? `Unpin ${kindLabel}` : `Pin ${kindLabel}`}
              </Button>

              {normalizedKind === "link" && (itemData as any)?.url && (
                <>
                  <Button
                    variant="SidebarMenuButton"
                    className="h-8 w-full px-2 text-sm"
                    asChild
                    aria-label="open-link"
                  >
                    <a
                      href={(itemData as any).url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink size={14} className="text-muted-foreground" />
                      Open Link
                    </a>
                  </Button>

                  <Button
                    variant="SidebarMenuButton"
                    className="h-8 w-full px-2 text-sm"
                    onClick={handleCopyLink}
                    aria-label="copy-link"
                  >
                    {copied ? (
                      <Check size={14} className="text-muted-foreground" />
                    ) : (
                      <Copy size={14} className="text-muted-foreground" />
                    )}
                    {copied ? "Copied!" : "Copy Link"}
                  </Button>
                </>
              )}

              {normalizedKind !== "link" && (
                <ItemPropertiesMenu
                  status={itemData?.status}
                  priority={itemData?.priority}
                  deadline={itemData?.deadline}
                  onChange={handlePropertyChange}
                />
              )}

              <Button
                variant="SidebarMenuButton"
                className="h-8 w-full px-2 text-sm"
                onClick={() => {
                  setOpen(false);
                  setIsMoveDialogOpen(true);
                }}
                aria-label={`move-${kindLabel.toLowerCase()}`}
              >
                <FileOutput size={14} className="text-muted-foreground" />
                Move {kindLabel}
              </Button>

              {/* Download options */}
              {normalizedKind === "note" && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="w-full h-8 px-2 text-sm flex items-center gap-2 text-foreground">
                    <Download size={14} className="text-muted-foreground" />
                    Download
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-48">
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => handleDownload("markdown")}
                    >
                      <FileText size={14} className="text-muted-foreground" />
                      Markdown (.md)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => handleDownload("json")}
                    >
                      <FileJson size={14} className="text-muted-foreground" />
                      JSON
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => handleDownload("docx")}
                    >
                      <FileType size={14} className="text-muted-foreground" />
                      Word (.docx)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => handleDownload("pdf")}
                    >
                      <FileDown size={14} className="text-muted-foreground" />
                      PDF
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}

              {normalizedKind === "whiteboard" && (
                <Button
                  variant="SidebarMenuButton"
                  className="h-8 w-full px-2 text-sm"
                  onClick={downloadWhiteboard}
                >
                  <Download size={14} className="text-muted-foreground" />
                  Download.excalidraw
                </Button>
              )}

              {normalizedKind === "pdf" && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="w-full h-8 px-2 text-sm flex items-center gap-2 text-foreground">
                    <Download size={14} className="text-muted-foreground" />
                    Download
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-48">
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={downloadPdfOriginal}
                    >
                      <FileDown size={14} className="text-muted-foreground" />
                      PDF file
                    </DropdownMenuItem>
                    {(itemData as any)?.fileUrl && (
                      <DropdownMenuItem asChild>
                        <a
                          href={(itemData as any).fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="cursor-pointer"
                        >
                          <ExternalLink size={14} className="text-muted-foreground" />
                          Open original
                        </a>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}

              {canShowWidth && normalizedKind === "note" && (
                <Button
                  variant="SidebarMenuButton"
                  className="h-8 w-full px-2 text-sm"
                  onClick={toggleWidth}
                  aria-label="toggle-note-width"
                >
                  {noteWidth === "false" ? (
                    <>
                      <ChevronsLeftRightEllipsis size={14} className="text-muted-foreground" />
                      Full width
                    </>
                  ) : (
                    <>
                      <ChevronsRightLeft size={14} className="text-muted-foreground" />
                      Default width
                    </>
                  )}
                </Button>
              )}

              <DropdownMenuSeparator />

              <Button
                variant="SidebarMenuButton_destructive"
                className="h-8 w-full px-2 text-sm text-foreground"
                onClick={initiateDelete}
                aria-label={`delete-${kindLabel.toLowerCase()}`}
              >
                <FaRegTrashCan size={14} className="text-muted-foreground" />
                Delete
              </Button>

              {(itemData?.createdAt || itemData?.updatedAt) && (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-2 pt-0.5 text-[10px] leading-4 text-nowrap text-muted-foreground/80">
                    {itemData.updatedAt ? (
                      <p>Last updated {formatNoteTimestamp(itemData.updatedAt)}</p>
                    ) : null}
                    {itemData.createdAt ? (
                      <p>Created {formatNoteTimestamp(itemData.createdAt)}</p>
                    ) : null}
                  </div>
                </>
              )}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {syncBrowserChrome && (
          <SettingsMoveHint
            hasSeenHint={hasSeenHint}
            dismissHint={dismissHint}
          />
        )}
      </div>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent className="bg-card border border-border text-card-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm {kindLabel} Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete this {kindLabel.toLowerCase()}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void executeDelete()}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground border-none"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MoveItemDialog
        open={isMoveDialogOpen}
        onOpenChange={setIsMoveDialogOpen}
        item={{
          _id: itemId,
          kind: normalizedKind,
          title: itemTitle,
          slug: (itemData as any)?.slug,
          workingSpaceId: (itemData as any)?.workingSpaceId,
          notesTableId: (itemData as any)?.notesTableId,
        }}
      />
    </>
  );
}
